# AGENTS.md

## 铁律（用户明确要求）

**每当用户让你做完任何改动之后，必须立刻 `git commit` + `git push` 到远端 main 分支，无需再征求确认。**

- commit message 用简洁的中文或英文描述改动，与仓库历史风格一致
- push 目标：origin/main（GitHub 公开仓库）
- 每次任务结束前确认工作区干净（`git status` 无遗留改动）

## 项目简介

**滑动变祖器 · ChatGPT 思考滑杆**（Liang Saint Slider for ChatGPT）— 浏览器扩展（MV3），把 chatgpt.com 的思考强度滑杆替换为 31 级梁系强度校准器（小难梁→梁祖），底层仍驱动原生滑杆，功能不丢。核心逻辑在单文件 `liang-saint-slider.user.js`（同时也是合法用户脚本，作为扩展的构建源与唯一事实来源）。

参考项目：

- [Lichtspektrum/liang-intensity-calibrator](https://github.com/Lichtspektrum/liang-intensity-calibrator) — 原版「滑动变祖器」，31 张人像帧素材来源
- [BruzWJ/Liang-Saint-Slider](https://github.com/BruzWJ/Liang-Saint-Slider) — DeepSeek Harness 版，0–30 → N 档位的映射语义沿用本项目

## 项目结构

| 路径 | 说明 |
| --- | --- |
| `liang-saint-slider.user.js` | 主脚本，单文件，无构建、无运行时依赖。顶部 `CONFIG` 集中了弹层/滑杆选择器与帧源列表，ChatGPT 改版后优先改这里 |
| `frames/frame-00.webp … frame-30.webp` | 31 张关键帧。**素材不随 MIT 共享**（见 README「素材与致谢」），不要声称拥有其权利 |
| `icons/` | 扩展图标（小难梁帧缩略图 16/32/48/128 PNG） |
| `dev/mock.html` | ChatGPT 弹层模拟页。`?open=1` 自动开弹层；`?autotest=1` 自动断言并把结果写进 `document.title`（`ALL_PASS` / `SOME_FAIL`）与 `#results` 节点；`?noembed=1` 不自引脚本（配合扩展版冒烟）。断言是异步的（驱动自 v1.0.9 起异步落地，setLiang 后必须 await tick） |
| `dev/server.js` | 极简静态服务器，`npm run dev` → http://localhost:8787/dev/mock.html |
| `dev/build-extension.mjs` | `npm run build:extension` → 从 userscript 生成 MV3 未打包扩展到 `dist/extension/`（版本号、CSS、逻辑同一事实来源；帧与图标打进扩展内）。`dist/` 已 gitignore |

## 关键设计约束

- 脚本保留 `@grant GM_addStyle / GM_xmlhttpRequest`（兼容脚本管理器沙箱），**不要改回 `@grant none`**——chatgpt.com 的 CSP 会拦截页面上下文注入
- 帧加载走 `GM_xmlhttpRequest`（blob），无 GM 环境（扩展 content script / mock 页直引）自动回退 `<img>` 直链；两条路径都要保持可用
- 注入的梁系滑杆必须带 `.liangc-root` 祖先标记，`scan()` 靠它跳过自身，去掉会导致级联增强死循环
- 驱动原生滑杆是**异步策略瀑布**（ReactProps 直调 / 键盘@快捷键宿主 / 键盘@thumb / 指针@轨道），读回必须等 `settle()` 宏任务——同步读回必读旧值，会误判策略失败引发连锁灾难
- commit 写入有合并（pendingTarget + inFlight），驱动结束后焦点必须归还我们的 range（键盘宿主策略会抢焦点）
- 弹层增强按弹层记状态并自愈（React 换节点后重隐藏/重挂面板/惰性解析新节点）
- 元数据里的 `@updateURL` / `@downloadURL` / 帧源 URL 指向 `main` 分支，分支不要改名

## 验证流程（改动后必做）

```sh
node --check liang-saint-slider.user.js
npm run dev &  # 起服务器后：
google-chrome --headless=new --disable-gpu --no-sandbox --virtual-time-budget=20000 \
  --dump-dom 'http://localhost:8787/dev/mock.html?autotest=1' | grep -oE '<title>[^<]*</title>'
# 期望输出 <title>ALL_PASS</title>
```

真实站点无登录态无法自测；选择器/驱动问题靠用户在 chatgpt.com 控制台用命令桥反馈校准：

```js
document.dispatchEvent(new CustomEvent('liang-command', {detail:'dump'}))      // 弹层 DOM
document.dispatchEvent(new CustomEvent('liang-command', {detail:'testDrive'})) // 逐策略实测驱动
```

## 扩展版冒烟（改动构建脚本后做）

**品牌版 Google Chrome 的无头模式拒绝 `--load-extension`**（`--load-extension is not allowed in Google Chrome, ignoring`），需用 Chrome for Testing：

```sh
npx @puppeteer/browsers install chrome@stable   # 一次性，装到 CWD 下
npm run build:extension
# 把 dist/extension 复制一份并将 manifest 的 matches 改为 http://localhost:8787/*，然后：
<chrome-for-testing>/chrome --headless=new --no-sandbox --load-extension=<改过的副本> \
  --virtual-time-budget=20000 --dump-dom 'http://localhost:8787/dev/mock.html?autotest=1&noembed=1' \
  | grep -oE '<title>[^<]*</title>'   # 期望 <title>ALL_PASS</title>
```

## 发布 Release

```sh
npm run build:extension
mkdir -p /tmp/release && cp -r dist/extension /tmp/release/liang-saint-slider-extension
cd /tmp/release && zip -qr liang-saint-slider-extension-vX.X.X.zip liang-saint-slider-extension
gh release create vX.X.X /tmp/release/liang-saint-slider-extension-vX.X.X.zip --title "vX.X.X" --notes "..."
# 版本号与 userscript 的 @version 保持一致；先 push 再打 release（tag 落在 main HEAD）
```
