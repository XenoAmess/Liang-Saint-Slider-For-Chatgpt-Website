# Chrome Web Store 提交记录

2026-10-16 17:46（Asia/Shanghai）确认：v1.0.10 已提交 Google 审核，后台状态为 **Pending review**，并已勾选 **审核通过后自动发布**。这是本次提交时的状态记录；后续状态以商店后台为准。

| 项目 | 记录 |
| --- | --- |
| Item ID | `gghkhcmbecfllakidknoellieenkbobg` |
| 版本 | `1.0.10` |
| 提交来源 | `d7f2efc`（扩展运行逻辑未改动） |
| 发布方式 | 免费、公开、全部地区；审核通过后自动发布 |
| 分类 / 语言 | Just for Fun / Chinese (China) |
| 上传包 | `dist/chrome-web-store/liang-saint-slider-v1.0.10.zip` |
| 上传包 SHA-256 | `f3e49c8ad4dcf8a85f214d89d40eb516e89a1ebb8bfeacb9d851e873adaec68f` |

- [审核后台](https://chrome.google.com/webstore/devconsole/37184713-1166-4239-82f6-e649b7fea2c7/gghkhcmbecfllakidknoellieenkbobg/edit/status)（需登录开发者账号）。
- [商店详情地址](https://chromewebstore.google.com/detail/gghkhcmbecfllakidknoellieenkbobg)（公开发布后生效）。
- [隐私政策](../PRIVACY.md)。

已上传并保存商店说明、图标、1280×800 真实效果截图和 440×280 宣传图；已填写单一用途、网站访问理由、无远程代码声明、本地网站内容处理及三项数据使用承诺；已验证发布者联系邮箱。审核测试说明已单独保存，说明需要 ChatGPT 原本具备思考强度滑杆，并给出操作步骤与离线模拟页验证方法。

提交前验证：userscript 与生成的 content.js 通过语法检查；模拟页 25 项断言全部通过（`ALL_PASS`）；ZIP 完整性、根目录 manifest、MV3、31 张帧与资源引用检查通过；商店截图和宣传图均为正确尺寸的 RGB PNG。发布素材可用 `npm run package:store` 重新生成；重新压缩后的 ZIP 字节哈希可能因文件时间戳而变化。

本地审核状态截图保存在 `dist/chrome-web-store/submission-status.png`，不随源码提交。只有审核通过并公开发布后，才应将 Chrome Web Store 列为已可安装渠道。
