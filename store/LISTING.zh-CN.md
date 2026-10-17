# Chrome Web Store 上架材料

这些是待填写的商店材料，不代表已经提交审核或上架。运行 `npm run package:store` 后，上传材料位于 `dist/chrome-web-store/`；只上传其中的版本 ZIP 作为扩展包，图片在后台单独上传。

## 基本字段

| 字段 | 内容 |
| --- | --- |
| 名称（取自 manifest） | 滑动变祖器 · ChatGPT 思考滑杆 (Liang Saint Slider) |
| 简短说明（取自 manifest） | 把 chatgpt.com 的思考强度滑杆替换为 31 级滑动变祖器（小难梁→梁祖）。 |
| 语言 | 中文（简体） / Chinese (Simplified) |
| 类别 | 趣味休闲 / Just for fun（按后台当前选项选择） |
| 主页 | https://github.com/XenoAmess/Liang-Saint-Slider-For-Chatgpt-Website |
| 支持网址 | https://github.com/XenoAmess/Liang-Saint-Slider-For-Chatgpt-Website/issues |
| 隐私政策 | https://github.com/XenoAmess/Liang-Saint-Slider-For-Chatgpt-Website/blob/main/PRIVACY.md |
| 商店图标 | icon-128.png（128 × 128） |
| 截图 | screenshot-1280x800.png（1280 × 800，来自仓库真实效果图） |
| 小型宣传图 | promo-440x280.png（440 × 280） |
| 价格 / 可见性 | 免费 / 公开 |

## 详细说明（复制下文）

为 ChatGPT 已有的思考强度控件添加人像动画和自定义滑杆。拖动时，人像随位置变化，选择会按比例映射到网站提供的实际思考强度档位。

使用方法：
1. 安装后刷新 chatgpt.com。
2. 打开输入框附近的模型 / 思考强度弹层。
3. 拖动人像下方的滑杆，面板会同步显示当前位置。

使用条件：账号和当前模型需要原本就有思考强度滑杆。0–30 是视觉刻度，实际档位数量由网站决定；扩展不解锁付费模型或额外推理档位。

图片随扩展打包，滑杆数据在本机处理。本地图片无法加载时可能请求外部静态图片源；手动调试结果由你自行决定是否分享。详情见隐私政策。

本扩展由独立开发者制作，与 OpenAI 无隶属或背书关系。素材来源及代码许可见项目主页；人像素材不包含在代码的 MIT 授权范围内。

## 隐私实践字段

### 单一用途（Single purpose）

将 ChatGPT 已有的思考强度控件显示为带人像动画的自定义滑杆，并将用户选择同步到网站提供的原生档位。

### 网站访问权限说明（Host permission justification）

仅在 https://chatgpt.com/* 和旧域名 https://chat.openai.com/* 注入本地 content script 与 CSS，以识别思考强度弹层、显示替代滑杆并同步原生档位。打包的人像帧仅对这两个站点开放。无需其他网站访问权限或浏览器 API 权限，不读取其他标签页的内容。

### 远程代码（Remote code）

选择 No：全部可执行 JavaScript 和 CSS 随扩展打包，不加载或执行远程代码。图片失败时的外部请求仅下载静态 WebP 素材。

### 数据使用（Data usage）

披露在设备本地处理的 Website content（网站内容）：读取思考滑杆的数值、范围和相关弹层 DOM；手动调试可在本机输出弹层 HTML / 文字。用途仅为扩展的单一功能及用户主动发起的故障排查，不传输给开发者、不出售、不用于广告、征信或贷款。

其余个人身份、健康、财务、身份验证、私人通信、位置和浏览历史类别不由扩展主动采集。后台的声明需与 PRIVACY.md 一致；涉及本地处理也应如实披露。

## 测试说明（给审核人员）

1. 安装扩展，登录 https://chatgpt.com 并刷新页面。
2. 使用已提供思考强度滑杆的账号和模型，打开输入框附近的思考强度弹层。扩展不提供 ChatGPT 订阅，也不绕过账号权限。
3. 弹层中应出现人像、0–30 滑杆、六阶段标注；拖动后原生思考强度标签随实际档位更新。关闭并重新打开弹层，面板应继续可用。
4. 扩展无需独立账号。若测试账号没有原生思考强度滑杆，扩展将保持页面原状。
5. 源码仓库的 `dev/mock.html?autotest=1` 可通过 `npm run dev` 离线验证驱动、弹层布局与节点替换行为。商店扩展仅匹配 ChatGPT 域名，因此本地模拟页默认以源码直引方式测试，不是安装后可访问的额外功能。

## 提交顺序

1. 开发者后台选择 New item，上传版本 ZIP。
2. 填写 Store listing：详细说明、语言、类别、图标、截图、小型宣传图及相关链接。
3. 填写 Privacy practices：单一用途、权限理由、无远程代码、数据使用及隐私政策链接。
4. Distribution 选择免费、公开及希望覆盖的地区；Test instructions 填写上述测试说明。
5. 补齐后台指出的账号验证或其他必填信息，再选择 Submit for review；若希望审核通过后自动发布，保留相应选项。
6. 记录后台分配的 item ID 与审核状态。审核通过前不要在 README 中声称已经上架。

商店说明应直接描述功能与使用条件，不逐项罗列界面中的阶段名称，也不重复堆放品牌或主题词。2026-10-17 的 Yellow Argon 拒审针对旧说明中的阶段名称枚举；处理记录见 [提交记录](SUBMISSION.md)。

## 官方参考

- https://developer.chrome.com/docs/webstore/publish
- https://developer.chrome.com/docs/webstore/images
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
- https://developer.chrome.com/docs/webstore/program-policies/listing-requirements/
