# AGENTS.md

## 铁律（用户明确要求）

**每当用户让你做完任何改动之后，必须立刻 `git commit` + `git push` 到远端 main 分支，无需再征求确认。**

- commit message 用简洁的中文或英文描述改动，与仓库历史风格一致
- push 目标：origin/main（GitHub 公开仓库）
- 每次任务结束前确认工作区干净（`git status` 无遗留改动）

## 项目简介

**滑动变祖器 · ChatGPT 思考滑杆**（Liang Saint Slider for ChatGPT）— Tampermonkey 用户脚本，把 chatgpt.com 的思考强度滑杆替换为 31 级梁系强度校准器（小难梁→梁祖），底层仍驱动原生滑杆，功能不丢。

参考项目：

- [Lichtspektrum/liang-intensity-calibrator](https://github.com/Lichtspektrum/liang-intensity-calibrator) — 原版「滑动变祖器」，31 张人像帧素材来源
- [BruzWJ/Liang-Saint-Slider](https://github.com/BruzWJ/Liang-Saint-Slider) — DeepSeek Harness 版，0–30 → N 档位的映射语义沿用本项目

## 项目结构

| 路径 | 说明 |
| --- | --- |
| `liang-saint-slider.user.js` | 主脚本，单文件 userscript，无构建、无运行时依赖。顶部 `CONFIG` 集中了弹层/滑杆选择器与帧源列表，ChatGPT 改版后优先改这里 |
| `frames/frame-00.webp … frame-30.webp` | 31 张关键帧。**素材不随 MIT 共享**（见 README「素材与致谢」），不要声称拥有其权利 |
| `dev/mock.html` | ChatGPT 弹层模拟页。`?open=1` 自动开弹层；`?autotest=1` 自动断言并把结果写进 `document.title`（`ALL_PASS` / `SOME_FAIL`）与 `#results` 节点；`?noembed=1` 不自引脚本（配合扩展版冒烟） |
| `dev/server.js` | 极简静态服务器，`npm run dev` → http://localhost:8787/dev/mock.html |
| `dev/build-extension.mjs` | `npm run build:extension` → 从 userscript 生成 MV3 未打包扩展到 `dist/extension/`（版本号、CSS、逻辑同一事实来源；帧打进扩展内）。`dist/` 已 gitignore |

## 关键设计约束

- 脚本在 Tampermonkey 沙箱运行（`@grant GM_addStyle / GM_xmlhttpRequest`），**不要改回 `@grant none`**——chatgpt.com 的 CSP 会拦截页面上下文注入
- 帧加载走 `GM_xmlhttpRequest`（blob），无 GM 环境（mock 页直引）自动回退 `<img>` 直链；两条路径都要保持可用
- 注入的梁系滑杆必须带 `.liangc-root` 祖先标记，`scan()` 靠它跳过自身，去掉会导致级联增强死循环
- 驱动原生滑杆有两条策略（Radix 键盘步进 / range input 原生 setter），修改后两种都要在 mock 页验证
- 元数据里的 `@updateURL` / `@downloadURL` / 帧源 URL 指向 `main` 分支，分支不要改名

## 验证流程（改动后必做）

```sh
node --check liang-saint-slider.user.js
npm run dev &  # 起服务器后：
google-chrome --headless=new --disable-gpu --no-sandbox --virtual-time-budget=10000 \
  --dump-dom 'http://localhost:8787/dev/mock.html?autotest=1' | grep -oE '<title>[^<]*</title>'
# 期望输出 <title>ALL_PASS</title>
```

真实站点无登录态无法自测；选择器问题靠用户在 chatgpt.com 控制台用 `window.__liang.rescan()` / `__liang.restoreAll()` 反馈校准。

## 扩展版冒烟（改动构建脚本后做）

**品牌版 Google Chrome 的无头模式拒绝 `--load-extension`**（`--load-extension is not allowed in Google Chrome, ignoring`），需用 Chrome for Testing：

```sh
npx @puppeteer/browsers install chrome@stable   # 一次性，装到 CWD 下
npm run build:extension
# 把 dist/extension 复制一份并将 manifest 的 matches 改为 http://localhost:8787/*，然后：
<chrome-for-testing>/chrome --headless=new --no-sandbox --load-extension=<改过的副本> \
  --virtual-time-budget=10000 --dump-dom 'http://localhost:8787/dev/mock.html?autotest=1&noembed=1' \
  | grep -oE '<title>[^<]*</title>'   # 期望 <title>ALL_PASS</title>
```
