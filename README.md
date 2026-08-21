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

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展。
2. 新建脚本，把 [`liang-saint-slider.user.js`](liang-saint-slider.user.js) 全文粘贴进去保存；
   或在本仓库 push 到 GitHub 后，直接访问 raw 链接由 Tampermonkey 自动识别安装：
   `https://raw.githubusercontent.com/XenoAmess/Liang-Saint-Slider-For-Chatgpt-Website-Tampermonkey/main/liang-saint-slider.user.js`
3. 打开 chatgpt.com，点开思考强度弹层即可看到变祖器。

## 工作原理

1. `MutationObserver` 等待思考强度弹层出现，在其中寻找原生滑杆（Radix 式 `[role="slider"]` 或 `input[type="range"]`）。
2. 在原生滑杆上方注入变祖器面板并隐藏原生滑杆本体；弹层其余部分（高级 ›、应用按钮等）保持原样。
3. 拖动变祖器时按比例映射到原生档位，并通过**键盘事件**（Radix 滑杆）或**原生 setter + input/change 事件**（range input）驱动真实滑杆，ChatGPT 自身状态逻辑零改动。
4. 自检失败（原生滑杆不可驱动）时自动回滚还原，不会把功能藏没。
5. 帧素材默认从本仓库的 jsDelivr / raw 加载，失败时自动回退到上游项目的 GitHub Pages。

ChatGPT 改版导致失效时，通常只需修改脚本顶部 `CONFIG` 里的选择器。控制台提供调试接口：

```js
window.__liang.rescan()      // 手动重扫
window.__liang.probe()       // 列出页面全部滑杆候选及状态（校准选择器时反馈给作者）
window.__liang.restoreAll()  // 还原所有被替换的原生滑杆
window.__liang.CONFIG        // 查看/修改配置（选择器、帧源、徽章开关等）
```

## 故障排查

Tampermonkey 菜单显示「此脚本还未被执行」时，按顺序排查：

1. **整页硬刷新（Ctrl+Shift+R）**。chatgpt.com 是单页应用，脚本安装/更新后已打开的标签页不会补注入，只在站内点来点去（SPA 跳转）也不会触发——这是最常见的原因。
2. **确认 Chrome 允许运行用户脚本**：`chrome://extensions` 打开「开发者模式」（MV3 版 Tampermonkey 必需；部分版本是 Tampermonkey 详情页里的「允许用户脚本」开关）。**没开的话 Tampermonkey 只能用内联 `<script>` 兜底注入，会被 chatgpt.com 的 CSP 直接拦截**——控制台里出现来自 `content.js` 的 `Executing inline script violates ... script-src-elem` 报错就是这个症状。
3. **确认脚本版本 ≥ 1.0.1**（管理面板里看 `@version`）：v1.0.0 是 `@grant none`，必然走页面内联注入，同样撞 CSP。最稳妥的做法是删掉旧脚本，用 [raw 安装链接](https://raw.githubusercontent.com/XenoAmess/Liang-Saint-Slider-For-Chatgpt-Website-Tampermonkey/main/liang-saint-slider.user.js) 重装（还能获得自动更新）。
4. **看注入信标**（v1.0.2+）：刷新后页面右下角应闪现「滑动变祖器 vX.X.X 已注入」徽章，控制台（F12）过滤 `滑动变祖器` 应看到 `已注入` 日志。两者都没有 → 注入层面被拦，回到第 1~3 步。
5. **徽章有但滑杆没变** → ChatGPT 的实际 DOM 与选择器不匹配。控制台执行 `__liang.probe()`，把输出截图发给作者即可校准。

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
