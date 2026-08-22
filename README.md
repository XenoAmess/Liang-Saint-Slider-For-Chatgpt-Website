# 滑动变祖器 · ChatGPT 思考滑杆

**Liang Saint Slider for ChatGPT** — 一个 Tampermonkey 用户脚本，把 [chatgpt.com](https://chatgpt.com) 的思考强度滑杆替换为 31 级「滑动变祖器」。拖动滑杆，人像会从「小难梁」一路变化到戴上帝冕的「梁祖」；底层仍然驱动 ChatGPT 原生滑杆，思考强度功能完全保留。

灵感与素材来自：

- [liang-intensity-calibrator](https://github.com/Lichtspektrum/liang-intensity-calibrator) — 原版「滑动变祖器」网页小玩具（31 级梁系强度校准器）
- [Liang-Saint-Slider](https://github.com/BruzWJ/Liang-Saint-Slider) — DeepSeek Harness 版选择器，本项目的映射语义与其一致

## 效果

点开输入框旁的「模型 · 思考强度」弹层（如 `5.6 Sol 高`），原生蓝色滑杆会被替换为：

- 随档位连续变化的梁系人像（31 张关键帧）
- 0–30 的梁系强度滑杆与 `NN / 30` 读数
- 六阶段标注：小难梁 / 牢梁 / 梁子 / 梁圣 / 梁神 / 梁祖

0–30 轨道按比例切分到 ChatGPT 原生滑杆的实际档位数（与 Liang-Saint-Slider 同一套映射：档位 i = `floor(pos·N/31)`，反向端点取 0/30、中间均分）。

## 安装

### 方案 A：Tampermonkey（首选）

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展。
2. 新建脚本，把 [`liang-saint-slider.user.js`](liang-saint-slider.user.js) 全文粘贴进去保存；
   或直接访问 raw 链接由 Tampermonkey 自动识别安装（带自动更新）：
   `https://raw.githubusercontent.com/XenoAmess/Liang-Saint-Slider-For-Chatgpt-Website-Tampermonkey/main/liang-saint-slider.user.js`
3. 打开 chatgpt.com，点开思考强度弹层即可看到变祖器。

### 方案 B：未打包扩展（Tampermonkey 注入失败时的兜底，推荐 Chrome 用户）

MV3 下 Tampermonkey 的注入链路易被「网站访问权限 / 用户脚本开关 / CSP」三重夹击。本方案不走 Tampermonkey，content script 直连，帧素材打包在扩展内（不联网、不受页面 CSP 约束）：

```sh
npm run build:extension   # 生成 dist/extension/
```

1. 打开 `chrome://extensions`，开启「开发者模式」；
2. 点「加载未打包的扩展程序」，选择 `dist/extension/` 目录；
3. 硬刷新（Ctrl+Shift+R）chatgpt.com。

扩展由 `dev/build-extension.mjs` 从 userscript 自动生成（版本号、CSS、逻辑同一事实来源），重新构建即可同步脚本改动。

## 工作原理

1. `MutationObserver` 等待思考强度弹层出现，在其中寻找原生滑杆（Radix 式 `[role="slider"]` 或 `input[type="range"]`）。
2. 在原生滑杆上方注入变祖器面板并隐藏原生滑杆本体；弹层其余部分（高级 ›、应用按钮等）保持原样。
3. 拖动变祖器时按比例映射到原生档位，并通过**键盘事件**（Radix 滑杆）或**原生 setter + input/change 事件**（range input）驱动真实滑杆，ChatGPT 自身状态逻辑零改动。
4. 自检失败（原生滑杆不可驱动）时自动回滚还原，不会把功能藏没。
5. 帧素材默认从本仓库的 jsDelivr / raw 加载，失败时自动回退到上游项目的 GitHub Pages。

ChatGPT 改版导致失效时，通常只需修改脚本顶部 `CONFIG` 里的选择器。

**控制台调试（v1.0.7+，任意控制台上下文直接执行，无需切换）**：

```js
document.dispatchEvent(new CustomEvent('liang-command', {detail:'dump'}))
```

支持命令：`dump`（导出弹层 DOM）/ `probe`（滑杆候选表）/ `testDrive`（实测真实滑杆吃哪种驱动事件，自动还原原值）/ `restore`（还原全部原生滑杆）。结果除控制台输出外还会弹出带「复制」按钮的页面浮层。

## 故障排查

Tampermonkey 菜单显示「此脚本还未被执行」时，按顺序排查：

1. **整页硬刷新（Ctrl+Shift+R）**。chatgpt.com 是单页应用，脚本安装/更新后已打开的标签页不会补注入，只在站内点来点去（SPA 跳转）也不会触发——这是最常见的原因。
2. **确认 Chrome 允许运行用户脚本**：`chrome://extensions` 打开「开发者模式」（MV3 版 Tampermonkey 必需；部分版本是 Tampermonkey 详情页里的「允许用户脚本」开关）。**没开的话 Tampermonkey 只能用内联 `<script>` 兜底注入，会被 chatgpt.com 的 CSP 直接拦截**——控制台里出现来自 `content.js` 的 `Executing inline script violates ... script-src-elem` 报错就是这个症状。
3. **确认脚本版本 ≥ 1.0.1**（管理面板里看 `@version`）：v1.0.0 是 `@grant none`，必然走页面内联注入，同样撞 CSP。最稳妥的做法是删掉旧脚本，用 [raw 安装链接](https://raw.githubusercontent.com/XenoAmess/Liang-Saint-Slider-For-Chatgpt-Website-Tampermonkey/main/liang-saint-slider.user.js) 重装（还能获得自动更新）。
4. **以上都试过仍无注入** → 放弃 Tampermonkey，改用[方案 B：未打包扩展](#方案-b未打包扩展tampermonkey-注入失败时的兜底推荐-chrome-用户)。MV3 下扩展的「网站访问」权限（chrome://extensions → Tampermonkey → 详情）被改成「点击时」也会导致这种静默不注入。
5. **徽章有但滑杆没变** → ChatGPT 的实际 DOM 与选择器不匹配。控制台执行上面那条 `liang-command` 命令（`dump` / `testDrive`），把浮层内容复制发给作者即可校准。

## 本地开发

```sh
npm run dev
# 打开 http://localhost:8787/dev/mock.html
```

`dev/mock.html` 模拟了 ChatGPT 弹层结构（Radix 风格 `role="slider"` 变体 + `input[type=range]` 变体），无需登录 ChatGPT、无需安装 Tampermonkey，即可离线验证脚本逻辑。

## 素材与致谢

本项目**源代码**以 [MIT 协议](LICENSE) 发布。

`frames/` 目录下的 31 张人像帧来自 [liang-intensity-calibrator](https://github.com/Lichtspektrum/liang-intensity-calibrator) 项目的 `public/frames`，**素材不随 MIT 协议共享**，仅用于趣味演示；复用或二次发布前，请确认你拥有相关肖像与素材的使用权（见原项目 README）。

## License

MIT（仅代码；人像素材权利归原作者所有，见上节）。
