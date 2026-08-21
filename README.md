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
window.__liang.restoreAll()  // 还原所有被替换的原生滑杆
window.__liang.CONFIG        // 查看/修改配置
```

## 故障排查

- **Tampermonkey 菜单显示「此脚本还未被执行」**：多半是脚本安装/更新后标签页没刷新，按 F5 重新加载 chatgpt.com 即可。chatgpt.com 的 CSP 很严格，因此本脚本（≥1.0.1）通过 `GM_addStyle` / `GM_xmlhttpRequest` 在 Tampermonkey 沙箱中运行并加载帧素材，绕开页面 `script-src` / `img-src` 限制——请确认 Tampermonkey 里脚本是用 v1.0.1+ 的完整头部重新保存的。
- **弹层打开了但滑杆没变化**：ChatGPT 可能改了 DOM。打开控制台执行 `window.__liang.rescan()` 手动重扫；仍无效就把弹层结构反馈给作者，调整脚本顶部 `CONFIG` 的选择器即可。

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
