# 隐私政策 / Privacy Policy

适用产品：滑动变祖器 · ChatGPT 思考滑杆（Liang Saint Slider for ChatGPT）浏览器扩展。

更新日期：2026-10-16。开发者：XenoAmess。

## 在本机处理的信息

扩展在 `chatgpt.com` 和 `chat.openai.com` 内识别思考强度弹层，读取滑杆的范围、当前值及相关 DOM 结构，并将你的滑动操作映射回原生滑杆。这些页面内容和设置只在当前页面的内存中处理，用于显示面板、同步档位与适配页面重绘。

扩展不向开发者发送对话、账号信息、浏览记录或使用统计，不提供自己的登录、广告或分析服务，也不将这些信息出售或交给第三方。扩展不使用 cookies、localStorage、浏览器同步存储或开发者服务器持久保存用户数据；ChatGPT 自身对思考强度设置和对话的处理由其服务政策决定。

## 图片请求

31 张人像帧随扩展打包，首先从扩展本地读取。如果本地图片无法加载，现有图片加载器会依次尝试 jsDelivr、GitHub 的 `raw.githubusercontent.com` 和 `lichtspektrum.github.io` 图片源。这些请求只用于下载静态图片，不上传对话或滑杆设置；图片服务可能收到浏览器通常发送的 IP 地址、请求头等请求信息，其处理方式由相应服务的隐私政策决定。扩展不下载或执行远程 JavaScript。

## 手动调试与分享

只有执行 `liang-command` 调试命令时，扩展才会把诊断信息显示到本机控制台和页面浮层。`dump` 可能包含当前页面弹层中的 HTML 和文字；`probe` 和 `testDrive` 包含滑杆节点、当前值等信息。诊断信息不会自动上传。点击“复制”会把你选择分享的诊断结果写入系统剪贴板；请在发送给他人前检查内容。你主动提交到公开 GitHub Issues 的内容将公开可见。

## 保存、删除与联系

关闭或刷新页面后，扩展的页面内状态和帧缓存会被清除；卸载可移除扩展。已复制到剪贴板或由你主动发布到其他服务的内容，应在对应位置管理。

如有隐私问题，请通过 [项目 Issues](https://github.com/XenoAmess/Liang-Saint-Slider-For-Chatgpt-Website/issues) 联系开发者，避免在公开问题中附上私人对话、凭据或其他敏感信息。未来若处理方式改变，会在此更新政策。

## English

This policy applies to the Liang Saint Slider for ChatGPT browser extension, developed by XenoAmess. Last updated: October 16, 2026.

The extension processes slider values, ranges, relevant popover DOM and your slider input locally in the current ChatGPT page to display its interface and synchronize the native thinking control. It does not transmit conversations, account information, browsing history or usage analytics to the developer, sell user data, or operate advertising or analytics services. It does not persist user data in cookies, localStorage, browser sync storage or developer servers. ChatGPT's own settings and conversations are subject to that service's policies.

Portrait frames are bundled with the extension. If a local image fails, the image loader may request static frames from jsDelivr, raw.githubusercontent.com or lichtspektrum.github.io. Image services may receive normal network metadata, including your IP address and browser request headers, under their respective policies. These requests do not upload conversations or slider settings. No remote JavaScript is downloaded or executed.

Manually invoked diagnostic commands display popover HTML, page text and/or slider information locally in the console and an on-page panel. Diagnostics are never uploaded automatically. Clicking Copy writes the result to your system clipboard. Review it before sharing; anything you submit to public GitHub Issues is public.

Refreshing or closing the page clears the extension's in-page state and frame cache. Copied or voluntarily shared information must be managed in the destination where you placed it. Privacy questions can be raised through the [project issue tracker](https://github.com/XenoAmess/Liang-Saint-Slider-For-Chatgpt-Website/issues); do not include private conversations or credentials in public issues. Changes to these practices will be reflected in this policy.
