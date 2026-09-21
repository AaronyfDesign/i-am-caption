# I AM Caption · DeepSeek 中继脚本（可选增强）

`i-am-caption-relay.user.js`（v0.2）是一个 **可选的** 油猴（Tampermonkey）脚本。装上它之后，[Web 版](https://aaronyfdesign.github.io/i-am-caption/web/)的 AI 配文从「复制提示词 → 去 DeepSeek 网页版粘贴 → 复制结果回来」变成**点一下全自动**：照片自动上传、宣言自动生成、排版参数自动回填。不装它，Web 版的手动中继流程照常可用。

## ⚠️ 务必先读

- 脚本调用 **DeepSeek 网页版的未公开内部接口**（自动解 PoW、上传图片、发送会话），属于对网页会话的自动化，**可能违反 DeepSeek 服务条款，存在账号限制/封禁风险**；
- 它只在你自己的浏览器里运行，只借用**你自己已登录的账号**，不含、也不上传任何凭证给第三方；照片只发往 DeepSeek 官方接口；
- 仅建议低频个人使用；任何后果（含账号风险）由安装者自行承担；
- DeepSeek 前端改版（接口路径 / PoW 算法 / SSE 格式变化）会让脚本失效，属预期内，需等更新。

## 安装

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/)（Chrome / Edge / Safari 均可）；
2. 点击 [这个安装链接](https://cdn.jsdelivr.net/gh/AaronyfDesign/i-am-caption@main/relay/i-am-caption-relay.user.js)（jsDelivr CDN，国内可达），浏览器会自动弹出 Tampermonkey 安装页，点「安装」即可；链接打不开时改用 [GitHub raw 直链](https://raw.githubusercontent.com/AaronyfDesign/i-am-caption/main/relay/i-am-caption-relay.user.js)（需网络可达）或从 [Release relay-v0.2.0](https://github.com/AaronyfDesign/i-am-caption/releases/tag/relay-v0.2.0) 下载后，在 Tampermonkey 管理面板 → 实用工具 → 「导入」，或新建脚本粘贴文件内容；
3. **Chrome 用户必读**：MV3 之后 Tampermonkey 默认不执行用户脚本，安装后必须在 `chrome://extensions` 打开右上角「**开发者模式**」开关，否则脚本装了也不生效（Edge/Safari 无此限制）；
3. 保持 [chat.deepseek.com](https://chat.deepseek.com/) 处于登录状态（新开一个标签页即可，无需停在页面上）；
4. 回到 Web 版上传照片——AI 配文面板会出现绿色的「⚡ 全自动」按钮。

## 工作原理（v0.2 · 纯 API 直调）

```
Web 版页面                          你的 DeepSeek 标签页
────────────                        ─────────────────────────────
派发任务 {prompt, 照片}
   │ GM 存储（跨标签） ─────────►  MAIN-world 引擎：
   │                                1. 用 DeepSeek 自家 sha3 wasm 解 PoW 挑战
   │                                2. POST /api/v0/file/upload_file 上传照片
   │                                3. 轮询 /api/v0/file/fetch_files → SUCCESS
   │                                4. POST /api/v0/chat_session/create
   │                                5. POST /api/v0/chat/completion（prompt + ref_file_ids）
   │                                6. SSE JSON-patch 流重组 → 提取 JSON
   │ ◄─────── GM 存储（跨标签） ──┘
自动填充宣言与排版参数
```

- **零 UI 模拟**：没有剪贴板读写、没有输入框填充、没有文件控件模拟，全部在请求层面完成；
- 每次任务会在你的 DeepSeek 侧栏新建一个会话，可手动清理；
- 登录凭证（`userToken`）只从本页 localStorage 读取、仅用于同源请求，不离开你的浏览器。
