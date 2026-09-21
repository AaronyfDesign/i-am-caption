// ==UserScript==
// @name         I AM Caption · DeepSeek 中继
// @namespace    iam-caption-relay
// @version      0.3.0
// @description  把 I AM Caption 网页版的配文任务自动转交给已登录的 chat.deepseek.com：纯 API 直调（页面自身 wasm 解 PoW → 上传图片 ref_file_ids → 直发 completion → SSE 流重组取回 JSON），无任何输入框/剪贴板模拟。仅供个人使用。
// @match        https://chat.deepseek.com/*
// @match        https://aaronyfdesign.github.io/i-am-caption/*
// @match        http://localhost/*
// @match        http://127.0.0.1/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        unsafeWindow
// @run-at       document-start
// @noframes
// ==/UserScript==

/*
 * ⚠️ 免责声明（务必阅读）
 * - 本脚本调用 DeepSeek 网页版内部接口，属于未公开协议，可能违反其服务条款，存在封号风险。
 * - 仅限本人已登录账号、个人低频使用。请勿公开分发本文件或用于批量/商业用途。
 * - 协议变更（wasm hash、接口路径、SSE 格式）会导致脚本失效，属预期内。
 *
 * v0.3 变更：Chrome MV3 下油猴脚本运行在隔离世界（USER_SCRIPT world），
 *   页面 JS 与脚本 JS 不共享 window 变量，CustomEvent.detail 跨世界也不可靠。
 *   因此本版本改用「DOM 属性信箱 + 无 detail 的 ping 事件」作为主通道：
 *   DOM 属性是字符串，跨世界 100% 可读；旧版 CustomEvent 通道保留作兼容。
 *
 * 通道（v0.3）：
 *   页面 app ⇄ 本脚本沙箱：#iam-relay-task-box / #iam-relay-result-box 的 data-msg
 *   本脚本沙箱 ⇄ MAIN 引擎：同上（chat.deepseek.com 页内）
 *   本脚本沙箱（web tab）⇄ 本脚本沙箱（DS tab）：GM_setValue / GM_addValueChangeListener
 *   在线标记：document.documentElement 的 data-iam-relay 属性（页面轮询即可见）
 *
 * 排查（F12 控制台，[iam-relay] 前缀）：
 *   - 无任何日志 → 脚本根本没执行（Chrome 需在 chrome://extensions 打开开发者模式）
 *   - 有 "sandbox bridge ready" 无 "engine ready"（DS tab）→ 页面 CSP 拦截了注入
 *
 * 架构（DS tab 内，MAIN-world 引擎直调 API）：
 *   1. sha3 wasm 解 PoW（upload + completion 各一次）
 *   2. POST /api/v0/file/upload_file（FormData）
 *   3. 轮询 /api/v0/file/fetch_files → SUCCESS
 *   4. POST /api/v0/chat_session/create
 *   5. POST /api/v0/chat/completion  prompt + ref_file_ids
 *   6. SSE JSON-patch 状态机重组全文，提取 JSON 回传
 */

(function () {
  'use strict';

  const IS_DS = location.hostname === 'chat.deepseek.com';
  const VER = 'v0.3';

  /* ============ DOM 信箱：跨世界（页面 JS ⇄ 沙箱 JS）可靠的消息通道 ============ */

  function boxEl(id) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.style.display = 'none';
      (document.body || document.documentElement).appendChild(el);
    }
    return el;
  }
  function domSend(boxId, obj) {
    try {
      boxEl(boxId).setAttribute('data-msg', JSON.stringify(obj));
      window.dispatchEvent(new CustomEvent('iam-relay-ping')); // 无 detail，事件本身跨世界可达
    } catch (e) {}
  }
  function domRecv(boxId) {
    try {
      const el = document.getElementById(boxId);
      if (!el) return null;
      const raw = el.getAttribute('data-msg');
      if (!raw) return null;
      el.removeAttribute('data-msg');
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  /* ================= 沙箱侧桥（GM 存储 ⇄ 页面 DOM 信箱） ================= */

  function installBridge() {
    // 在线标记：DOM 属性跨世界可见（window 变量在 MV3 隔离世界里页面看不见）
    try { document.documentElement.setAttribute('data-iam-relay', VER); } catch (e) {}
    try { window.__IAM_RELAY__ = true; } catch (e) {}
    try { if (typeof unsafeWindow !== 'undefined') unsafeWindow.__IAM_RELAY__ = true; } catch (e) {}

    const seen = Object.create(null); // 双通道去重
    function once(k) { if (seen[k]) return false; seen[k] = 1; return true; }

    if (IS_DS) {
      // 任务进来：GM → DOM 信箱 + 兼容旧事件（MAIN 引擎监听）
      GM_addValueChangeListener('iam_task', function (k, ov, nv, remote) {
        if (nv && nv.id && once('t' + nv.id)) {
          domSend('iam-relay-task-box', nv);
          try { window.dispatchEvent(new CustomEvent('iam-relay-task', { detail: nv })); } catch (e) {}
        }
      });
      // 结果出去：MAIN 引擎 → DOM 信箱 / 旧事件 → GM
      window.addEventListener('iam-relay-ping', function () {
        const m = domRecv('iam-relay-result-box');
        if (m && m.id && once('r' + m.id)) GM_setValue('iam_result', m);
      });
      window.addEventListener('iam-relay-result', function (e) {
        if (e.detail && e.detail.id && once('r' + e.detail.id)) GM_setValue('iam_result', e.detail);
      });
    } else {
      // 任务出去：页面 app → DOM 信箱 / 旧事件 → GM
      window.addEventListener('iam-relay-ping', function () {
        const m = domRecv('iam-relay-task-box');
        if (m && m.id && once('t' + m.id)) GM_setValue('iam_task', m);
      });
      window.addEventListener('iam-relay-task', function (e) {
        if (e.detail && e.detail.id && once('t' + e.detail.id)) GM_setValue('iam_task', e.detail);
      });
      // 结果进来：GM → DOM 信箱 + 兼容旧事件（页面 app 监听）
      GM_addValueChangeListener('iam_result', function (k, ov, nv, remote) {
        if (nv && nv.id && once('r' + nv.id)) {
          domSend('iam-relay-result-box', nv);
          try { window.dispatchEvent(new CustomEvent('iam-relay-result', { detail: nv })); } catch (e) {}
        }
      });
    }
    console.info('[iam-relay]', VER, 'sandbox bridge ready:', location.href);
  }

  /* ================= MAIN-world 引擎（注入页面世界执行） ================= */

  function iamRelayMainEngine() {
    'use strict';
    if (location.hostname !== 'chat.deepseek.com') {
      try { window.__IAM_RELAY__ = true; } catch (e) {}
      return;
    }

    const TAG = '[iam-relay]';
    const NL = String.fromCharCode(10);

    /* ---- 引擎自己的 DOM 信箱（与沙箱桥共用元素 id） ---- */
    function domSend2(boxId, obj) {
      try {
        let el = document.getElementById(boxId);
        if (!el) {
          el = document.createElement('div');
          el.id = boxId;
          el.style.display = 'none';
          (document.body || document.documentElement).appendChild(el);
        }
        el.setAttribute('data-msg', JSON.stringify(obj));
        window.dispatchEvent(new CustomEvent('iam-relay-ping'));
      } catch (e) {}
    }
    function domRecv2(boxId) {
      try {
        const el = document.getElementById(boxId);
        if (!el) return null;
        const raw = el.getAttribute('data-msg');
        if (!raw) return null;
        el.removeAttribute('data-msg');
        return JSON.parse(raw);
      } catch (e) { return null; }
    }

    function postResult(detail) {
      domSend2('iam-relay-result-box', detail); // 主通道：DOM 属性（跨世界可靠）
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

    /* ---------- 任务接收（DOM 信箱主通道 + 兼容旧事件，按 id 去重） ---------- */

    const seenTasks = Object.create(null);
    function handleTask(task) {
      if (!task || !task.id || seenTasks[task.id]) return;
      seenTasks[task.id] = 1;
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
    }
    window.addEventListener('iam-relay-task', function (e) { handleTask(e.detail); });
    window.addEventListener('iam-relay-ping', function () {
      const m = domRecv2('iam-relay-task-box');
      if (m && m.id) handleTask(m);
    });

    // 引擎心跳标记（沙箱侧可探测注入是否成功）
    try { document.documentElement.setAttribute('data-iam-engine', '1'); } catch (e) {}

    // 预热 wasm（登录页以外尽早可用）
    if (localStorage.getItem('userToken')) {
      loadWasm().catch(function (e) { console.warn(TAG, e.message); });
    }
    console.info(TAG, 'v0.3 engine ready (pure API relay)');
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
