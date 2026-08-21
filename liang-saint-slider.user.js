// ==UserScript==
// @name         滑动变祖器 · ChatGPT 思考滑杆 (Liang Saint Slider for ChatGPT)
// @namespace    https://github.com/XenoAmess/Liang-Saint-Slider-For-Chatgpt-Website-Tampermonkey
// @version      1.0.1
// @description  把 chatgpt.com 的思考强度滑杆替换为 31 级「滑动变祖器」：从小难梁一路滑到梁祖。底层仍驱动原生滑杆，功能不丢。
// @author       XenoAmess
// @license      MIT
// @homepageURL  https://github.com/XenoAmess/Liang-Saint-Slider-For-Chatgpt-Website-Tampermonkey
// @updateURL    https://raw.githubusercontent.com/XenoAmess/Liang-Saint-Slider-For-Chatgpt-Website-Tampermonkey/main/liang-saint-slider.user.js
// @downloadURL  https://raw.githubusercontent.com/XenoAmess/Liang-Saint-Slider-For-Chatgpt-Website-Tampermonkey/main/liang-saint-slider.user.js
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      cdn.jsdelivr.net
// @connect      raw.githubusercontent.com
// @connect      lichtspektrum.github.io
// @run-at       document-idle
// @noframes
// ==/UserScript==

/*
 * 滑动变祖器 · ChatGPT 思考滑杆
 * ---------------------------------------------------------------------------
 * 参考项目：
 *   - https://github.com/Lichtspektrum/liang-intensity-calibrator （原版 31 级梁系强度校准器）
 *   - https://github.com/BruzWJ/Liang-Saint-Slider （DeepSeek Harness 版选择器，映射语义沿用本项目）
 *
 * 原理：
 *   1. MutationObserver 等待 chatgpt.com 的思考强度弹层出现，找到其中的原生滑杆
 *      （[role="slider"] 的 Radix 式滑杆，或 input[type="range"]）。
 *   2. 在原生滑杆上方注入「变祖器」面板（人像 + 0–30 滑杆 + 六阶段标注），并隐藏原生滑杆本体。
 *   3. 拖动变祖器时，把 0–30 的位置按比例映射到原生滑杆的档位，并通过
 *      键盘事件（Radix）/ 原生 setter + input 事件（range input）驱动它，
 *      因此 ChatGPT 自身的状态逻辑完全不受影响。
 *
 * 若 ChatGPT 改版导致脚本失效，通常只需调整下方 CONFIG 里的选择器。
 * 控制台里可用 window.__liang.rescan() 手动重扫、window.__liang.CONFIG 查看配置。
 */
(function () {
  'use strict';

  /** ------------------------------------------------------------------------
   * 配置区（ChatGPT 改版后优先改这里）
   * ---------------------------------------------------------------------- */
  const CONFIG = {
    // 帧素材来源，按顺序尝试，成功后粘住。把本仓库 push 到 GitHub 后，
    // 第一项即可命中；未公开时会自动回退到上游项目的 GitHub Pages。
    // 本地开发时可在加载本脚本前设置 window.__LIANG_FRAME_BASE__ 覆盖（见 dev/mock.html）。
    FRAME_BASES: [
      'https://cdn.jsdelivr.net/gh/XenoAmess/Liang-Saint-Slider-For-Chatgpt-Website-Tampermonkey@main/frames/',
      'https://raw.githubusercontent.com/XenoAmess/Liang-Saint-Slider-For-Chatgpt-Website-Tampermonkey/main/frames/',
      'https://lichtspektrum.github.io/liang-intensity-calibrator/frames/',
      'https://raw.githubusercontent.com/Lichtspektrum/liang-intensity-calibrator/main/public/frames/',
    ],
    // 弹层容器特征：思考滑杆只会出现在这类浮层里
    POPOVER_SELECTOR: [
      '[data-radix-popper-content-wrapper]',
      '[role="menu"]',
      '[role="dialog"]',
      '[role="listbox"]',
      '[class*="popover" i]',
      '[class*="popup" i]',
    ].join(', '),
    // 滑杆特征
    SLIDER_SELECTOR: '[role="slider"], input[type="range"]',
    // 弹层宽度上限（px），大于它的浮层（设置对话框等）不碰
    MAX_POPOVER_WIDTH: 520,
    // 轮询/MutationObserver 的去抖间隔（ms）
    SCAN_DEBOUNCE: 60,
  };
  if (typeof window !== 'undefined' && typeof window.__LIANG_FRAME_BASE__ === 'string') {
    CONFIG.FRAME_BASES.unshift(window.__LIANG_FRAME_BASE__);
  }

  /** ------------------------------------------------------------------------
   * 梁系常量（与上游一致）
   * ---------------------------------------------------------------------- */
  const LIANG_MAX_LEVEL = 30;
  const LIANG_STAGE_SPAN = 5;
  const LIANG_STAGES = ['小难梁', '牢梁', '梁子', '梁圣', '梁神', '梁祖'];
  const TAG = '[滑动变祖器]';

  const clampLevel = (level) => Math.max(0, Math.min(LIANG_MAX_LEVEL, level));
  const stageForLevel = (level) =>
    LIANG_STAGES[Math.min(LIANG_STAGES.length - 1, Math.floor(clampLevel(level) / LIANG_STAGE_SPAN))];
  const frameFile = (level) => `frame-${String(clampLevel(Math.round(level))).padStart(2, '0')}.webp`;

  // 0–30 轨道按比例切分到 N 个原生档位（沿用 Liang-Saint-Slider 的映射语义）
  const stopIndexForLevel = (level, stops) =>
    Math.max(0, Math.min(stops - 1, Math.floor((level * stops) / (LIANG_MAX_LEVEL + 1))));
  const levelForStopIndex = (index, stops) =>
    index <= 0 ? 0 : index >= stops - 1 ? LIANG_MAX_LEVEL : Math.round((index * LIANG_MAX_LEVEL) / (stops - 1));

  /** ------------------------------------------------------------------------
   * 样式（一次性注入）
   * ---------------------------------------------------------------------- */
  const CSS = `
.liangc-root{display:flex;flex-direction:column;gap:7px;padding:6px 6px 8px;width:100%;max-width:260px;box-sizing:border-box;color:inherit;font-family:inherit}
.liangc-canvasWrap{position:relative;border-radius:10px;overflow:hidden;border:1px solid rgb(128 128 128/35%);background:#1d1918}
.liangc-canvas{width:100%;aspect-ratio:1/1;display:block}
.liangc-canvasWrap::after{content:"";position:absolute;inset:0;pointer-events:none;background-image:repeating-linear-gradient(0deg,rgb(255 255 255/2.5%) 0 1px,transparent 1px 4px),radial-gradient(circle at 22% 18%,rgb(255 255 255/8%) 0 1px,transparent 1.5px);background-size:auto,7px 7px;mix-blend-mode:soft-light;opacity:.35}
.liangc-load{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#b8b4a9;font-size:12px;line-height:18px}
.liangc-readout{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:0 2px}
.liangc-id{display:flex;flex-direction:column;align-items:flex-start;min-width:0}
.liangc-stage{font-family:"Songti SC",STSong,"SimSun",serif;font-size:22px;font-weight:700;line-height:28px}
.liangc-level{opacity:.65;font-family:"SFMono-Regular",Consolas,monospace;font-size:12px;line-height:18px;flex:none}
.liangc-range{width:100%;margin:0;accent-color:#4d6bfe;cursor:pointer}
.liangc-markers{display:flex;justify-content:space-between;gap:4px;opacity:.65;font-size:11px;line-height:16px;padding:0 2px}
.liangc-marker{white-space:nowrap}
.liangc-marker.is-current{color:#4d6bfe;font-weight:700;opacity:1}
.liangc-native-hidden{display:none !important}
`;

  let stylesInjected = false;
  function ensureStyles() {
    if (stylesInjected || typeof document === 'undefined') return;
    stylesInjected = true;
    // Tampermonkey 沙箱里优先用 GM_addStyle（不受页面 style-src CSP 约束）
    if (typeof GM_addStyle === 'function') {
      GM_addStyle(CSS);
      return;
    }
    for (const stale of document.querySelectorAll('style[data-liangc]')) stale.remove();
    const tag = document.createElement('style');
    tag.dataset.liangc = '';
    tag.textContent = CSS;
    document.head.appendChild(tag);
  }

  /** ------------------------------------------------------------------------
   * 帧加载：GM_xmlhttpRequest（绕开页面 img-src/connect-src CSP）+ 多源回退
   * + 成功源粘滞 + 邻帧预载 + 闲时全量预载
   * ---------------------------------------------------------------------- */
  const frameCache = new Map(); // level -> HTMLImageElement（可能仍在加载）
  let workingBaseIndex = 0;
  const canGMXhr = typeof GM_xmlhttpRequest === 'function';

  const gmFetchObjectUrl = (url) =>
    new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        responseType: 'blob',
        onload: (res) => {
          if (res.status >= 200 && res.status < 300 && res.response) {
            resolve(URL.createObjectURL(res.response));
          } else {
            reject(new Error(`HTTP ${res.status}`));
          }
        },
        onerror: () => reject(new Error('network error')),
        ontimeout: () => reject(new Error('timeout')),
      });
    });

  function ensureFrame(level, onReady) {
    const clamped = clampLevel(Math.round(level));
    const cached = frameCache.get(clamped);
    if (cached) {
      if (cached.complete && cached.naturalWidth > 0) onReady(cached);
      else cached.addEventListener('load', () => onReady(cached), { once: true });
      return cached;
    }
    const img = new Image();
    img.decoding = 'async';
    frameCache.set(clamped, img);
    let baseIndex = workingBaseIndex;
    const tryBase = async () => {
      if (baseIndex >= CONFIG.FRAME_BASES.length) {
        console.warn(TAG, '所有帧源均加载失败：', frameFile(clamped));
        return;
      }
      const url = CONFIG.FRAME_BASES[baseIndex] + frameFile(clamped);
      try {
        // 沙箱内走 GM_xhr 取 blob，绕开页面 CSP；无 GM（如 dev/mock.html 直引）则直接加载
        img.src = canGMXhr ? await gmFetchObjectUrl(url) : url;
      } catch {
        baseIndex += 1;
        void tryBase();
      }
    };
    img.addEventListener('load', () => {
      workingBaseIndex = baseIndex; // 粘住可用的源
      onReady(img);
    });
    img.addEventListener('error', () => {
      baseIndex += 1;
      void tryBase();
    });
    void tryBase();
    return img;
  }

  function preloadNeighbors(level) {
    for (const near of [level - 1, level + 1, level - 2, level + 2]) {
      if (near < 0 || near > LIANG_MAX_LEVEL) continue;
      ensureFrame(near, () => {});
    }
  }

  let idlePreloadStarted = false;
  function preloadAllWhenIdle() {
    if (idlePreloadStarted) return;
    idlePreloadStarted = true;
    let next = 0;
    const step = () => {
      while (next <= LIANG_MAX_LEVEL && frameCache.has(next)) next += 1;
      if (next > LIANG_MAX_LEVEL) return;
      ensureFrame(next, () => {});
      next += 1;
      (window.requestIdleCallback || ((fn) => setTimeout(fn, 120)))(step);
    };
    (window.requestIdleCallback || ((fn) => setTimeout(fn, 120)))(step);
  }

  /** ------------------------------------------------------------------------
   * 原生滑杆抽象：读取档位、回写档位
   * ---------------------------------------------------------------------- */
  const num = (raw, fallback) => {
    const v = parseFloat(raw);
    return Number.isFinite(v) ? v : fallback;
  };

  // 返回 { min, max, step, stops, read(), write(v) } 或 null
  function describeNativeSlider(el) {
    if (el instanceof HTMLInputElement && el.type === 'range') {
      const min = num(el.min, 0);
      const max = num(el.max, 100);
      const step = num(el.step, 1) > 0 ? num(el.step, 1) : 1;
      const stops = (max - min) / step <= 64 ? Math.round((max - min) / step) + 1 : 0;
      return {
        min, max, step, stops,
        read: () => num(el.value, min),
        write: (v) => {
          if (num(el.value, min) === v) return true; // 值未变不发事件，避免无谓打扰宿主逻辑
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
          setter.call(el, String(v));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return num(el.value, min) === v;
        },
      };
    }
    if (el.getAttribute && el.getAttribute('role') === 'slider') {
      const min = num(el.getAttribute('aria-valuemin'), 0);
      const max = num(el.getAttribute('aria-valuemax'), 100);
      const step = 1;
      const stops = max - min <= 64 ? Math.round(max - min) + 1 : 0;
      const read = () => num(el.getAttribute('aria-valuenow'), min);
      const press = (key) =>
        el.dispatchEvent(new KeyboardEvent('keydown', { key, code: key, bubbles: true, cancelable: true, view: window }));
      return {
        min, max, step, stops,
        read,
        write: (target) => {
          // Radix 式滑杆：聚焦 thumb 后用键盘步进（Home/End 粗跳 + 方向键微调）
          try {
            el.focus({ preventScroll: true });
          } catch {
            el.focus();
          }
          let guard = 0;
          let current = read();
          if (current === target) return true;
          if (target === min) {
            press('Home');
            if (read() === target) return true;
          } else if (target === max) {
            press('End');
            if (read() === target) return true;
          }
          while (guard++ < 96) {
            current = read();
            if (current === target) return true;
            press(current < target ? 'ArrowRight' : 'ArrowLeft');
            let after = read();
            if (after === current) {
              press(current < target ? 'ArrowUp' : 'ArrowDown');
              after = read();
              if (after === current) return false; // 键盘驱动无效
            }
          }
          return read() === target;
        },
      };
    }
    return null;
  }

  /** ------------------------------------------------------------------------
   * 变祖器面板
   * ---------------------------------------------------------------------- */
  function buildPanel(native) {
    ensureStyles();

    const root = document.createElement('div');
    root.className = 'liangc-root';

    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'liangc-canvasWrap';
    const canvas = document.createElement('canvas');
    canvas.className = 'liangc-canvas';
    canvas.setAttribute('role', 'img');
    const loading = document.createElement('span');
    loading.className = 'liangc-load';
    loading.textContent = '载入连续祖力…';
    canvasWrap.append(canvas, loading);

    const readout = document.createElement('div');
    readout.className = 'liangc-readout';
    const idBox = document.createElement('span');
    idBox.className = 'liangc-id';
    const stageEl = document.createElement('span');
    stageEl.className = 'liangc-stage';
    idBox.append(stageEl);
    const levelEl = document.createElement('span');
    levelEl.className = 'liangc-level';
    readout.append(idBox, levelEl);

    const range = document.createElement('input');
    range.type = 'range';
    range.min = '0';
    range.max = String(LIANG_MAX_LEVEL);
    range.step = '1';
    range.className = 'liangc-range';
    range.setAttribute('aria-label', '梁系强度');

    const markers = document.createElement('div');
    markers.className = 'liangc-markers';
    const markerEls = LIANG_STAGES.map((name) => {
      const marker = document.createElement('span');
      marker.className = 'liangc-marker';
      marker.textContent = name;
      markers.appendChild(marker);
      return marker;
    });

    root.append(canvasWrap, readout, range, markers);

    // ---- 状态与绘制 ----
    const draw = (img) => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const cssSize = Math.max(1, Math.round(canvas.clientWidth || 220));
      const size = cssSize * ratio;
      if (canvas.width !== size || canvas.height !== size) {
        canvas.width = size;
        canvas.height = size;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
    };

    let level = 0;
    let firstFrameShown = false;
    const api = {
      root,
      setLevel(next, { commit }) {
        level = clampLevel(Math.round(next));
        range.value = String(level);
        const stage = stageForLevel(level);
        stageEl.textContent = stage;
        canvas.setAttribute('aria-label', `梁系强度：${stage}`);
        levelEl.textContent = `${String(level).padStart(2, '0')} / ${LIANG_MAX_LEVEL}`;
        const stageIndex = LIANG_STAGES.indexOf(stage);
        markerEls.forEach((marker, i) => marker.classList.toggle('is-current', i === stageIndex));
        ensureFrame(level, (img) => {
          if (clampLevel(Math.round(level)) !== clampLevel(Math.round(Number(range.value)))) return;
          draw(img);
          if (!firstFrameShown) {
            firstFrameShown = true;
            loading.remove();
          }
        });
        preloadNeighbors(level);
        if (commit) api.commit();
      },
      commit() {
        // 0–30 → 原生档位
        let target;
        if (native.stops > 0) {
          target = native.min + stopIndexForLevel(level, native.stops) * native.step;
        } else {
          target = native.min + (level / LIANG_MAX_LEVEL) * (native.max - native.min);
        }
        const ok = native.write(target);
        if (!ok) console.warn(TAG, '驱动原生滑杆失败，已跳过本次写入');
        return ok;
      },
      syncFromNative() {
        const value = native.read();
        if (native.stops > 0) {
          const index = Math.round((value - native.min) / native.step);
          api.setLevel(levelForStopIndex(index, native.stops), { commit: false });
        } else {
          const ratio = (value - native.min) / (native.max - native.min);
          api.setLevel(Math.round(ratio * LIANG_MAX_LEVEL), { commit: false });
        }
      },
    };

    range.addEventListener('input', () => api.setLevel(Number(range.value), { commit: true }));
    range.addEventListener('pointerdown', (event) => event.stopPropagation());

    api.syncFromNative();
    preloadAllWhenIdle();
    return api;
  }

  /** ------------------------------------------------------------------------
   * 注入与增强
   * ---------------------------------------------------------------------- */
  const enhancedSliders = new WeakSet();

  // 找到要隐藏/替换的原生滑杆根节点（Radix：thumb 的父节点即 Slider 根）
  function nativeRootOf(sliderEl) {
    if (sliderEl instanceof HTMLInputElement) return sliderEl;
    return sliderEl.parentElement || sliderEl;
  }

  function enhance(sliderEl) {
    const native = describeNativeSlider(sliderEl);
    if (!native) return;

    const nativeRoot = nativeRootOf(sliderEl);
    if (!nativeRoot.parentElement) return;

    const panel = buildPanel(native);
    nativeRoot.parentElement.insertBefore(panel.root, nativeRoot);
    nativeRoot.classList.add('liangc-native-hidden');

    // 写一次与原生当前值相同的位置做自检；失败则回滚，免得把功能藏没
    if (!native.write(native.read())) {
      console.warn(TAG, '原生滑杆不可驱动，已还原原样', sliderEl);
      nativeRoot.classList.remove('liangc-native-hidden');
      panel.root.remove();
      return;
    }
    console.debug(TAG, '已接管思考滑杆', sliderEl);
  }

  function scan() {
    let candidates;
    try {
      candidates = document.querySelectorAll(CONFIG.SLIDER_SELECTOR);
    } catch {
      return;
    }
    for (const el of candidates) {
      if (enhancedSliders.has(el)) continue;
      if (el.closest('.liangc-root')) continue; // 跳过自己注入的梁系滑杆，防止级联增强
      const popover = el.closest(CONFIG.POPOVER_SELECTOR);
      if (!popover) continue;
      const width = popover.getBoundingClientRect().width;
      if (width > CONFIG.MAX_POPOVER_WIDTH) continue; // 大对话框不碰；宽度为 0 视为未布局完成，放行
      enhancedSliders.add(el);
      try {
        enhance(el);
      } catch (err) {
        console.warn(TAG, '增强失败', err);
      }
    }
  }

  /** ------------------------------------------------------------------------
   * 启动：MutationObserver + 兜底轮询（ChatGPT 是 SPA）
   * ---------------------------------------------------------------------- */
  let scanTimer = null;
  function scheduleScan() {
    if (scanTimer !== null) return;
    scanTimer = setTimeout(() => {
      scanTimer = null;
      scan();
    }, CONFIG.SCAN_DEBOUNCE);
  }

  function start() {
    ensureStyles();
    scan();
    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.body, { childList: true, subtree: true });
    // 兜底：某些极端情况下 observer 错过（如 shadow/portal 怪癖），低频轮询
    setInterval(scan, 2500);
  }

  // 沙箱里 window 是隔离世界的，调试接口挂到页面 window 上才能在控制台访问
  const debugHost = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  debugHost.__liang = {
    CONFIG,
    rescan: scan,
    restoreAll() {
      for (const el of document.querySelectorAll('.liangc-native-hidden')) el.classList.remove('liangc-native-hidden');
      for (const el of document.querySelectorAll('.liangc-root')) el.remove();
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
