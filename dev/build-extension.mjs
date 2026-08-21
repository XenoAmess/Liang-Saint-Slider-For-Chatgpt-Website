// 从 liang-saint-slider.user.js 生成未打包 MV3 扩展到 dist/extension/
// 用法：npm run build:extension
// 设计：userscript 是唯一事实来源——manifest 版本号取自 @version，
// content.css 取自脚本内的 CSS 模板串（经 manifest 注入，不受页面 style-src CSP 约束），
// content.js 只多一行帧基址（指向扩展内打包的帧，无需联网、不受 img-src CSP 约束）。
import { readFileSync, writeFileSync, cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'liang-saint-slider.user.js');
const OUT = join(ROOT, 'dist', 'extension');

const source = readFileSync(SRC, 'utf8');

const version = source.match(/@version\s+(\S+)/)?.[1];
if (!version) throw new Error('无法在 userscript 里找到 @version');

const cssMatch = source.match(/const CSS = `([^`]*)`;/);
if (!cssMatch) throw new Error('无法在 userscript 里找到 CSS 模板串');

const body = source.replace(/^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\s*/, '');
if (body === source) throw new Error('未能剥离 userscript 元数据块');

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

writeFileSync(
  join(OUT, 'content.js'),
  `// 本文件由 dev/build-extension.mjs 从 liang-saint-slider.user.js 生成，请勿手改
window.__LIANG_FRAME_BASE__ = chrome.runtime.getURL('frames/');
${body}`,
);

writeFileSync(join(OUT, 'content.css'), cssMatch[1].trim() + '\n');

const manifest = {
  manifest_version: 3,
  name: '滑动变祖器 · ChatGPT 思考滑杆 (Liang Saint Slider)',
  version,
  description: '把 chatgpt.com 的思考强度滑杆替换为 31 级滑动变祖器（小难梁→梁祖）。',
  content_scripts: [
    {
      matches: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
      js: ['content.js'],
      css: ['content.css'],
      run_at: 'document_start',
      all_frames: false,
    },
  ],
  web_accessible_resources: [
    {
      resources: ['frames/*.webp'],
      matches: ['https://chatgpt.com/*', 'https://chat.openai.com/*'],
    },
  ],
};
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

cpSync(join(ROOT, 'frames'), join(OUT, 'frames'), { recursive: true });

console.log(`已生成 dist/extension/（v${version}）。`);
console.log('到 chrome://extensions 开启「开发者模式」→「加载未打包的扩展程序」→ 选择 dist/extension 目录。');
