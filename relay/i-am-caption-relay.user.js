// ==UserScript==
// @name         I AM Caption · DeepSeek 中继
// @namespace    iam-caption-relay
// @version      0.2.0
// @description  把 I AM Caption 网页版的配文任务转交给已登录的 chat.deepseek.com：纯 API 直调（页面自身 wasm 解 PoW → 上传图片 ref_file_ids → 直发 completion → SSE 流重组取回 JSON），无任何输入框/剪贴板模拟。仅供个人使用。
// @match        https://chat.deepseek.com/*
// @match        https://aaronyfdesign.github.io/i-am-caption/*
// @match        http://localhost*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

/*
 * ⚠️ 免责声明（务必阅读）
 * - 本脚本调用 DeepSeek 网页版内部接口，属于未公开协议，可能违反其服务条款，存在封号风险。
 * - 仅限本人已登录账号、个人低频使用。请勿公开分发本文件或用于批量/商业用途。
 * - 协议变更（wasm hash、接口路径、SSE 格式）会导致脚本失效，属预期内。
 *
 * 架构（参考 dtw request_body_injection.md 的"钩子在请求层面做事"思想，本脚本更进一步：
 * 直接以页面身份发出自己的请求，因此整条 SSE 流都在掌控中）：
 *
 *   页面 tab (github.io)                      DeepSeek tab (chat.deepseek.com)
 *   ─────────────────────                     ─────────────────────────────────
 *   index.html 派发 CustomEvent
 *   'iam-relay-task' {id,prompt,imageDataUrl}
 *        │ (isolated) GM_setValue('iam_task') ────► (isolated) GM 监听 → CustomEvent
 *                                                        │
 *                                                        ▼
 *                                                 MAIN-world 引擎（本文件注入）
 *                                                 1. sha3 wasm 解 PoW（upload+completion 各一次）
 *                                                 2. POST /api/v0/file/upload_file（FormData）
 *                                                 3. 轮询 /api/v0/file/fetch_files → SUCCESS
 *                                                 4. POST /api/v0/chat_session/create
 *                                                 5. POST /api/v0/chat/completion
 *                                                    prompt + ref_file_ids, thinking/search off
 *                                                 6. SSE JSON-patch 状态机重组全文
 *        │ (isolated) GM 监听 ◄──────── GM_setValue('iam_result') ◄──┘
 *        ▼
 *   CustomEvent 'iam-relay-result' → 编辑器回填
 */

(function () {
  'use strict';

  /* ================= 通道协议（与 v0.1 兼容，web/index.html 无需改动） ================= */

  const IS_DS = location.hostname === 'chat.deepseek.com';

  function installBridge() {
    if (IS_DS) {
      // 任务进来：GM → window 事件（MAIN 引擎监听）
      GM_addValueChangeListener('iam_task', function (k, ov, nv, remote) {
        if (nv && nv.id) {
          window.dispatchEvent(new CustomEvent('iam-relay-task', { detail: nv }));
        }
      });
      // 结果出去：MAIN 引擎 → window 事件 → GM
      window.addEventListener('iam-relay-result', function (e) {
        const d = e.detail;
        if (d && d.id) GM_setValue('iam_result', d);
      });
    } else {
      // 任务出去：页面 app → window 事件 → GM
      window.addEventListener('iam-relay-task', function (e) {
        const d = e.detail;
        if (d && d.id) GM_setValue('iam_task', d);
      });
      // 结果进来：GM → window 事件（页面 app 监听）
      GM_addValueChangeListener('iam_result', function (k, ov, nv, remote) {
        if (nv && nv.id) {
          window.dispatchEvent(new CustomEvent('iam-relay-result', { detail: nv }));
        }
      });
      // 页面 app 探测脚本在线
      window.__IAM_RELAY__ = true;
    }
  }

  /* ================= MAIN-world 引擎（注入页面世界执行） ================= */

  function iamRelayMainEngine() {
    'use strict';
    if (location.hostname !== 'chat.deepseek.com') {
      window.__IAM_RELAY__ = true;
      return;
    }

    const TAG = '[iam-relay]';
    const NL = String.fromCharCode(10);

    function postResult(detail) {
      try { window.dispatchEvent(new CustomEvent('iam-relay-result', { detail: detail })); } catch (e) {}
    }
    function fail(taskId, msg) {
      console.warn(TAG, 'task failed:', msg);
      postResult({ id: taskId, error: String(msg).slice(0, 300) });
    }

    /* ---------- 凭证 ---------- */

    function creds() {
      let token = null;
      try { token = JSON.parse(localStorage.getItem('userToken')).value; } catch (e) {}
      if (!token) throw new Error('未登录：localStorage 无 userToken，请先在网页版登录');
      let dev = null;
      try { dev = localStorage.getItem('deepseek-device-id:chat'); } catch (e) {}
      if (!dev) {
        dev = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        try { localStorage.setItem('deepseek-device-id:chat', dev); } catch (e) {}
      }
      return {
        token: token,
        base: {
          'authorization': 'Bearer ' + token,
          'x-device-id': dev,
          'x-client-bundle-id': 'com.deepseek.chat',
          'x-client-platform': 'web',
          'x-client-version': '2.5.0',
          'x-client-locale': 'zh_CN',
          'x-client-timezone-offset': String(-new Date().getTimezoneOffset())
        }
      };
    }

    /* ---------- PoW：加载页面同款 sha3 wasm 并求解 ---------- */

    let wasmEx = null; // 缓存 exports

    function findExportBySig(ex, names, paramCount) {
      const keys = Object.keys(ex);
      for (let i = 0; i < names.length; i++) {
        if (keys.indexOf(names[i]) > -1 && typeof ex[names[i]] === 'function' && ex[names[i]].length === paramCount) {
          return names[i];
        }
      }
      // 按唯一签名探测（wasm_solve: 5×i32 + f64 → 参数长度 6）
      const uniq = [];
      for (const k of keys) {
        try {
          if (typeof ex[k] === 'function' && ex[k].length === paramCount) uniq.push(k);
        } catch (e) {}
      }
      return uniq.length === 1 ? uniq[0] : null;
    }

    async function loadWasm() {
      if (wasmEx) return wasmEx;
      const urls = ['https://fe-static.deepseek.com/chat/static/sha3_wasm_bg.7b9ca65ddd.wasm'];
      // 兜底 1：本页已加载的 .wasm 资源
      try {
        performance.getEntriesByType('resource').forEach(function (e) {
          if (e.name.indexOf('sha3_wasm') > -1) urls.unshift(e.name);
        });
      } catch (e) {}
      let buf = null;
      for (const u of urls) {
        try {
          const r = await fetch(u);
          if (r.ok) { buf = await r.arrayBuffer(); break; }
        } catch (e) {}
      }
      // 兜底 2：扫本页 JS bundle 里的 wasm 直链
      if (!buf) {
        const jsRes = performance.getEntriesByType('resource').filter(function (e) { return /\.js($|\?)/.test(e.name); });
        for (const j of jsRes.slice(0, 30)) {
          try {
            const t = await fetch(j.name).then(function (x) { return x.text(); });
            const m = t.match(/https:[^"']+sha3_wasm_bg[^"']*\.wasm/);
            if (m) { buf = await fetch(m[0]).then(function (x) { return x.arrayBuffer(); }); break; }
          } catch (e) {}
        }
      }
      if (!buf) throw new Error('sha3 wasm 加载失败（协议可能已变更）');
      const inst = await WebAssembly.instantiate(buf, {});
      const ex = inst.instance.exports;
      const stackName = findExportBySig(ex, ['__wbindgen_add_to_stack_pointer'], 1);
      const allocName = findExportBySig(ex, ['__wbindgen_malloc', '__wbindgen_export_0'], 2);
      const solveName = findExportBySig(ex, ['wasm_solve'], 6);
      if (!stackName || !allocName || !solveName) throw new Error('wasm 导出符号探测失败');
      wasmEx = { ex: ex, stack: stackName, alloc: allocName, solve: solveName, memory: ex.memory };
      return wasmEx;
    }

    function writeStr(w, str) {
      const bytes = new TextEncoder().encode(str);
      const p = w.ex[w.alloc](bytes.length, 1);
      new Uint8Array(w.memory.buffer).set(bytes, p);
      return [p, bytes.length];
    }

    function solvePow(ch) {
      if (ch.algorithm !== 'DeepSeekHashV1') throw new Error('未知 PoW 算法: ' + ch.algorithm);
      const w = wasmEx; // loadWasm 必须先完成
      const prefix = ch.salt + '_' + ch.expire_at + '_';
      const retptr = w.ex[w.stack](-16);
      const a = writeStr(w, ch.challenge);
      const b = writeStr(w, prefix);
      w.ex[w.solve](retptr, a[0], a[1], b[0], b[1], ch.difficulty);
      const dv = new DataView(w.memory.buffer);
      const status = dv.getInt32(retptr, true);
      const value = dv.getFloat64(retptr + 8, true);
      w.ex[w.stack](16);
      if (!status) throw new Error('PoW 无解');
      return Math.round(value);
    }

    function powHeader(ch, answer) {
      const obj = {
        algorithm: ch.algorithm, challenge: ch.challenge, salt: ch.salt,
        answer: answer, signature: ch.signature, target_path: ch.target_path
      };
      return btoa(JSON.stringify(obj));
    }

    async function getChallenge(base, target) {
      const r = await fetch('/api/v0/chat/create_pow_challenge', {
        method: 'POST',
        headers: Object.assign({ 'content-type': 'application/json' }, base),
        body: JSON.stringify({ target_path: target })
      });
      const j = await r.json();
      const d = j && j.data;
      const ch = (d && ((d.biz_data && d.biz_data.challenge) || d.challenge)) || j.challenge;
      if (!ch) throw new Error('拿不到 PoW 挑战: ' + JSON.stringify(j).slice(0, 150));
      return ch;
    }

    /* ---------- API 步骤 ---------- */

    async function uploadImage(base, blob) {
      const ch = await getChallenge(base, '/api/v0/file/upload_file');
      const answer = solvePow(ch);
      const fd = new FormData();
      fd.append('file', new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' }));
      fd.append('purpose', '');
      const h = Object.assign({}, base);
      h['x-ds-pow-response'] = powHeader(ch, answer);
      h['x-file-size'] = String(blob.size);
      h['x-model-type'] = 'default';
      h['x-thinking-enabled'] = '0';
      const r = await fetch('/api/v0/file/upload_file', { method: 'POST', headers: h, body: fd });
      const j = await r.json();
      const id = j && j.data && j.data.biz_data && j.data.biz_data.id;
      if (!id) throw new Error('上传失败: ' + JSON.stringify(j).slice(0, 150));
      // 轮询直到 SUCCESS（VISION 模型扫描）
      for (let i = 0; i < 40; i++) {
        await new Promise(function (res) { setTimeout(res, 500); });
        const fr = await fetch('/api/v0/file/fetch_files?file_ids=' + id, { headers: base });
        const fj = await fr.json();
        const bd = fj && fj.data && fj.data.biz_data;
        const it = (bd && (bd.files || bd)[0]) || bd;
        if (it && it.status === 'SUCCESS') return id;
        if (it && it.error_code) throw new Error('文件处理失败: ' + it.error_code);
      }
      throw new Error('文件处理超时');
    }

    async function createSession(base) {
      const r = await fetch('/api/v0/chat_session/create', {
        method: 'POST',
        headers: Object.assign({ 'content-type': 'application/json' }, base),
        body: '{}'
      });
      const j = await r.json();
      const d = j && j.data;
      const sess = d && ((d.biz_data && d.biz_data.chat_session) || d.chat_session);
      const id = sess && sess.id;
      if (!id) throw new Error('建会话失败: ' + JSON.stringify(j).slice(0, 150));
      return id;
    }

    /* ---------- SSE JSON-patch 状态机（实测语义，见文件头注释） ---------- */

    function makeStreamState() {
      const st = { response: null, lastPath: null, lastO: null, finished: false };

      function deepMerge(a, b) {
        for (const k in b) {
          if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) deepMerge(a[k], b[k]);
          else a[k] = b[k];
        }
        return a;
      }
      function getPath(obj, path) {
        let cur = obj;
        for (const seg of path.split('/')) {
          if (cur == null) return undefined;
          cur = cur[seg];
        }
        return cur;
      }
      function ensureParent(obj, path) {
        const segs = path.split('/');
        let cur = obj;
        for (let q = 0; q < segs.length - 1; q++) {
          const k = segs[q];
          if (cur[k] == null) cur[k] = (/^\d+$/.test(segs[q + 1])) ? [] : {};
          cur = cur[k];
        }
        return { parent: cur, key: segs[segs.length - 1] };
      }
      function applyOp(op) {
        let p = op.p, o = op.o, v = op.v;
        if (p == null && v != null && st.lastPath) { p = st.lastPath; o = o || st.lastO; }
        if (p == null) {
          // 无路径的对象值：完整快照，合并进 response
          if (v && typeof v === 'object' && v.response && st.response) deepMerge(st.response, v.response);
          return;
        }
        st.lastPath = p; st.lastO = o;
        if (p.slice(0, 9) === 'response/') p = p.slice(9);
        if (o === 'BATCH' && Array.isArray(v)) { v.forEach(function (sub) { applyOp(sub); }); return; }
        // "-1" = 数组末元素
        if (/\/-\d+(\/|$)/.test(p)) {
          const segs = p.split('/');
          for (let q = 0; q < segs.length; q++) {
            if (/^-\d+$/.test(segs[q])) {
              const pp = segs.slice(0, q).join('/');
              const arr = pp ? getPath(st.response, pp) : st.response;
              if (Array.isArray(arr)) segs[q] = String(arr.length - 1);
            }
          }
          p = segs.join('/');
        }
        const loc = ensureParent(st.response, p);
        const cur = loc.parent[loc.key];
        if (o === 'APPEND' || (o == null && typeof v === 'string' && typeof cur === 'string')) {
          if (typeof cur === 'string') loc.parent[loc.key] = cur + v;
          else if (Array.isArray(cur)) cur.push(v);
          else loc.parent[loc.key] = v;
        } else {
          if (cur && typeof cur === 'object' && v && typeof v === 'object' && !Array.isArray(v)) deepMerge(cur, v);
          else loc.parent[loc.key] = v;
        }
        if (p === 'status' && v === 'FINISHED') st.finished = true;
      }
      return {
        get state() { return st; },
        feed(eventText) {
          // eventText = 一个完整 SSE 事件块（不含结尾空行）
          let evName = null, dataStr = null;
          eventText.split(NL).forEach(function (l) {
            if (l.indexOf('event:') === 0) evName = l.slice(6).trim();
            else if (l.indexOf('data:') === 0) dataStr = l.slice(5).trim();
          });
          if (!dataStr) return;
          let d; try { d = JSON.parse(dataStr); } catch (e) { return; }
          if (!st.response && d && d.v && d.v.response) { st.response = d.v.response; return; }
          if (d && (d.p != null || d.v !== undefined)) applyOp(d);
          if (evName === 'close') st.finished = true;
        },
        fragmentsText() {
          const frags = (st.response && st.response.fragments) || [];
          let text = '';
          for (const f of frags) {
            if (f && f.type === 'RESPONSE' && typeof f.content === 'string') text += f.content;
          }
          return text;
        }
      };
    }

    async function runCompletion(base, sid, prompt, fileId, signal) {
      const ch = await getChallenge(base, '/api/v0/chat/completion');
      const answer = solvePow(ch);
      const h = Object.assign({ 'content-type': 'application/json', accept: 'text/event-stream' }, base);
      h['x-ds-pow-response'] = powHeader(ch, answer);
      const body = {
        chat_session_id: sid,
        parent_message_id: null,
        model_type: 'default',
        prompt: prompt,
        ref_file_ids: fileId ? [fileId] : [],
        thinking_enabled: false,
        search_enabled: false
      };
      const r = await fetch('/api/v0/chat/completion', { method: 'POST', headers: h, body: JSON.stringify(body), signal: signal });
      if (!r.ok) throw new Error('completion HTTP ' + r.status + ': ' + (await r.text()).slice(0, 200));
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      const state = makeStreamState();
      let buf = '';
      while (true) {
        const rd = await reader.read();
        if (rd.done) break;
        buf += dec.decode(rd.value, { stream: true });
        let idx;
        while ((idx = buf.indexOf(NL + NL)) > -1) {
          state.feed(buf.slice(0, idx));
          buf = buf.slice(idx + 2);
        }
        if (state.state.finished) { try { reader.cancel(); } catch (e) {} break; }
      }
      return state;
    }

    /* ---------- 任务调度 ---------- */

    let busy = null; // {abort, taskId}

    async function dataUrlToBlob(dataUrl) {
      const r = await fetch(dataUrl);
      return r.blob();
    }

    async function runTask(task) {
      const base = creds().base;
      await loadWasm();
      const blob = await dataUrlToBlob(task.imageDataUrl);
      const fileId = await uploadImage(base, blob);
      const sid = await createSession(base);
      const state = await runCompletion(base, sid, task.prompt, fileId, busy.abort.signal);
      const text = state.fragmentsText();
      if (!text) throw new Error('回复为空（流重组失败）');
      const a = text.indexOf('{');
      const b = text.lastIndexOf('}');
      if (a < 0 || b <= a) throw new Error('回复不是 JSON: ' + text.slice(0, 120));
      let obj;
      try { obj = JSON.parse(text.slice(a, b + 1)); } catch (e) { throw new Error('JSON 解析失败: ' + String(e)); }
      postResult({ id: task.id, text: JSON.stringify(obj) });
    }

    window.addEventListener('iam-relay-task', function (e) {
      const task = e.detail;
      if (!task || !task.id) return;
      // 同一时间只跑一个任务：新任务打断旧任务
      if (busy) {
        try { busy.abort.abort(); } catch (err) {}
        if (busy.taskId !== task.id) fail(busy.taskId, '被新任务打断');
      }
      const abort = new AbortController();
      busy = { abort: abort, taskId: task.id };
      console.info(TAG, 'task start', task.id);
      runTask(task)
        .then(function () { console.info(TAG, 'task done', task.id); })
        .catch(function (err) {
          if (err && err.name === 'AbortError') return;
          fail(task.id, (err && err.message) || err);
        })
        .finally(function () { if (busy && busy.taskId === task.id) busy = null; });
    });

    // 预热 wasm（登录页以外尽早可用）
    if (localStorage.getItem('userToken')) {
      loadWasm().catch(function (e) { console.warn(TAG, e.message); });
    }
    console.info(TAG, 'v0.2 ready (pure API relay)');
  }

  /* ================= 装配 ================= */

  installBridge();

  // 注入 MAIN-world 引擎（页面世界：能读 localStorage、带登录态发同源请求）
  try {
    const s = document.createElement('script');
    s.textContent = '(' + iamRelayMainEngine.toString() + ')();';
    (document.head || document.documentElement).appendChild(s);
    s.remove();
  } catch (e) {
    console.warn('[iam-relay] MAIN world injection failed:', e);
  }
})();
