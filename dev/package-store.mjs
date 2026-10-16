// 生成 Chrome Web Store 上传 ZIP，以及单独上传的截图、宣传图和文案。
// 需要 zip 和 Chrome；可通过 CHROME_BIN 指定浏览器路径。
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const EXTENSION = join(ROOT, 'dist', 'extension');
const OUT = join(ROOT, 'dist', 'chrome-web-store');

execFileSync(process.execPath, [join(ROOT, 'dev', 'build-extension.mjs')], { stdio: 'inherit' });
const manifest = JSON.parse(readFileSync(join(EXTENSION, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.version, pkg.version, 'package.json 版本必须与 userscript 一致');
execFileSync(process.execPath, ['--check', join(EXTENSION, 'content.js')]);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const archive = join(OUT, `liang-saint-slider-v${manifest.version}.zip`);
// manifest.json 必须在 ZIP 根目录，不能连同 extension/ 外层目录一起压缩。
execFileSync('zip', ['-q', '-r', archive, 'manifest.json', 'content.js', 'content.css', 'frames', 'icons'], {
  cwd: EXTENSION,
});
execFileSync('unzip', ['-tq', archive]);
copyFileSync(join(ROOT, 'icons', 'icon-128.png'), join(OUT, 'icon-128.png'));
copyFileSync(join(ROOT, 'store', 'LISTING.zh-CN.md'), join(OUT, 'LISTING.zh-CN.md'));
copyFileSync(join(ROOT, 'PRIVACY.md'), join(OUT, 'PRIVACY.md'));

const profile = mkdtempSync(join(tmpdir(), 'liang-store-assets-'));
try {
  for (const [asset, width, height, filename] of [
    ['screenshot', 1280, 800, 'screenshot-1280x800.png'],
    ['promo', 440, 280, 'promo-440x280.png'],
  ]) {
    const page = pathToFileURL(join(ROOT, 'dev', 'store-assets.html'));
    page.searchParams.set('asset', asset);
    execFileSync(process.env.CHROME_BIN || 'google-chrome', [
      '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
      '--no-default-browser-check', '--hide-scrollbars', '--force-device-scale-factor=1',
      `--user-data-dir=${profile}`, `--window-size=${width},${height}`,
      '--virtual-time-budget=2000', '--run-all-compositor-stages-before-draw',
      `--screenshot=${join(OUT, filename)}`, page.href,
    ], { stdio: 'pipe', timeout: 30000 });
    const png = readFileSync(join(OUT, filename));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), width, `${filename} 宽度不正确`);
    assert.equal(png.readUInt32BE(20), height, `${filename} 高度不正确`);
    assert.equal(png[25], 2, `${filename} 必须为不含透明通道的 RGB PNG`);
  }
} finally {
  rmSync(profile, { recursive: true, force: true });
}
console.log(`Chrome Web Store 上传包：${archive}`);
console.log('同目录内的图标、截图、宣传图和文案需在商店后台分别上传/填写，不包含在 ZIP 内。');
