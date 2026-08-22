// ==UserScript==
// @name         滑动变祖器 · ChatGPT 思考滑杆 (Liang Saint Slider for ChatGPT)
// @namespace    https://github.com/XenoAmess/Liang-Saint-Slider-For-Chatgpt-Website
// @version      1.0.10
// @description  把 chatgpt.com 的思考强度滑杆替换为 31 级「滑动变祖器」：从小难梁一路滑到梁祖。底层仍驱动原生滑杆，功能不丢。
// @author       XenoAmess
// @license      MIT
// @homepageURL  https://github.com/XenoAmess/Liang-Saint-Slider-For-Chatgpt-Website
// @updateURL    https://raw.githubusercontent.com/XenoAmess/Liang-Saint-Slider-For-Chatgpt-Website/main/liang-saint-slider.user.js
// @downloadURL  https://raw.githubusercontent.com/XenoAmess/Liang-Saint-Slider-For-Chatgpt-Website/main/liang-saint-slider.user.js
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      cdn.jsdelivr.net
// @connect      raw.githubusercontent.com
// @connect      lichtspektrum.github.io
// @run-at       document-start
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
      'https://cdn.jsdelivr.net/gh/XenoAmess/Liang-Saint-Slider-For-Chatgpt-Website@main/frames/',
      'https://raw.githubusercontent.com/XenoAmess/Liang-Saint-Slider-For-Chatgpt-Website/main/frames/',
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
    // 注入成功后在页面右下角闪现一个徽章（调试期确认脚本真的跑了；嫌烦改 false）
    SHOW_BOOT_BADGE: true,
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
  const VERSION = '1.0.10';

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
.liangc-root{display:flex;flex-direction:column;gap:7px;padding:6px 6px 8px;width:232px;max-width:82vw;box-sizing:border-box;color:inherit;font-family:inherit;flex:none;margin:0 auto}
.liangc-root>*{flex:none}
.liangc-canvasWrap{position:relative;border-radius:10px;overflow:hidden;border:1px solid rgb(128 128 128/35%);background:#1d1918;flex:none}
.liangc-canvas{width:100%;aspect-ratio:1/1;display:block}
.liangc-canvasWrap::after{content:"";position:absolute;inset:0;pointer-events:none;background-image:repeating-linear-gradient(0deg,rgb(255 255 255/2.5%) 0 1px,transparent 1px 4px),radial-gradient(circle at 22% 18%,rgb(255 255 255/8%) 0 1px,transparent 1.5px);background-size:auto,7px 7px;mix-blend-mode:soft-light;opacity:.35}
.liangc-load{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#b8b4a9;font-size:12px;line-height:18px}
.liangc-readout{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:0 2px}
.liangc-id{display:flex;flex-direction:column;align-items:flex-start;min-width:0}
.liangc-stage{font-family:"Songti SC",STSong,"SimSun",serif;font-size:22px;font-weight:700;line-height:28px}
.liangc-level{opacity:.65;font-family:"SFMono-Regular",Consolas,monospace;font-size:12px;line-height:18px;flex:none}
/* 双段选择器压过 ChatGPT 可能对裸 input[type=range] 下的全局样式（优先级 0,1,1） */
input[type="range"].liangc-range{width:100%;margin:0;accent-color:#4d6bfe;cursor:pointer;position:static;appearance:auto;background:none;border:none;padding:0}
.liangc-markers{display:flex;justify-content:space-between;gap:4px;opacity:.65;font-size:11px;line-height:16px;padding:0 2px}
.liangc-marker{white-space:nowrap}
.liangc-marker.is-current{color:#4d6bfe;font-weight:700;opacity:1}
.liangc-native-hidden{opacity:0 !important;pointer-events:none !important}
/* ChatGPT 弹层常用 flex + 固定高度/overflow 裁剪内容，会把面板压成一条横带；
   注入后给弹层祖先链打上这个类放宽限制，让完整人像露出来；
   min-width 负责把弹层卡片撑到能装下 232px 面板，避免内容探出右边框 */
.liangc-relaxed{height:auto !important;max-height:calc(100vh - 16px) !important;overflow:visible !important;min-width:264px !important}
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

  // 以当前档位为中心向外全量预载（面板一建成就开始，拖动时帧基本都已就位）
  function preloadAll(center) {
    for (let d = 0; d <= LIANG_MAX_LEVEL; d += 1) {
      for (const n of [center - d, center + d]) {
        if (n < 0 || n > LIANG_MAX_LEVEL) continue;
        ensureFrame(n, () => {});
      }
    }
  }

  // 离 level 最近的已加载帧（拖动期间先画邻帧近似，精确帧加载完再换，视觉上零延迟）
  function nearestLoadedFrame(level) {
    for (let d = 0; d <= LIANG_MAX_LEVEL; d += 1) {
      const down = frameCache.get(level - d);
      if (down && down.complete && down.naturalWidth > 0) return down;
      const up = frameCache.get(level + d);
      if (up && up.complete && up.naturalWidth > 0) return up;
    }
    return null;
  }

  /** ------------------------------------------------------------------------
   * 原生滑杆抽象：惰性解析 + 读取档位、回写档位
   *
   * 关键：ChatGPT 是 React 应用，拖动导致的状态变化会触发弹层重渲染，
   * 原生滑杆节点会被整个换掉。若死抱增强那一刻的节点引用，后续读写都会
   * 打在已脱离文档的旧节点上（表现为「驱动原生滑杆失败」+ 新节点裸奔可见）。
   * 因此 read/write 每次调用都重新在弹层内解析当前节点。
   * ---------------------------------------------------------------------- */
  const num = (raw, fallback) => {
    const v = parseFloat(raw);
    return Number.isFinite(v) ? v : fallback;
  };

  // 弹层内当前的原生滑杆节点（排除我们自己注入的梁系滑杆）
  function resolveNativeSlider(popover) {
    for (const el of popover.querySelectorAll('[role="slider"], input[type="range"]')) {
      if (!el.closest('.liangc-root')) return el;
    }
    return null;
  }

  // 返回 { min, max, step, stops, read(), write(v) } 或 null（量程在增强时读一次，读写按调用时实时解析节点）
  function describeNativeSlider(popover) {
    const first = resolveNativeSlider(popover);
    if (!first) return null;

    if (first instanceof HTMLInputElement && first.type === 'range') {
      const min = num(first.min, 0);
      const max = num(first.max, 100);
      const rawStep = num(first.step, 1);
      const step = rawStep > 0 ? rawStep : 1;
      const stops = (max - min) / step <= 64 ? Math.round((max - min) / step) + 1 : 0;
      return {
        min, max, step, stops,
        _strategies: null, // input 型只有 setter 一条路，无需分策略实测
        read: () => {
          const el = resolveNativeSlider(popover);
          return el instanceof HTMLInputElement ? num(el.value, min) : min;
        },
        write: (v) => {
          const el = resolveNativeSlider(popover);
          if (!(el instanceof HTMLInputElement) || !el.isConnected) return Promise.resolve(false);
          if (num(el.value, min) === v) return Promise.resolve(true); // 值未变不发事件，避免无谓打扰宿主逻辑
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
          setter.call(el, String(v));
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return Promise.resolve(num(el.value, min) === v);
        },
      };
    }

    if (first.getAttribute && first.getAttribute('role') === 'slider') {
      const min = num(first.getAttribute('aria-valuemin'), 0);
      const max = num(first.getAttribute('aria-valuemax'), 100);
      const step = 1;
      const stops = max - min <= 64 ? Math.round(max - min) + 1 : 0;
      const readFrom = (el) => num(el.getAttribute('aria-valuenow'), min);
      // React 换节点后一切读值都要走最新节点
      const readNow = () => {
        const el = resolveNativeSlider(popover);
        return el ? readFrom(el) : min;
      };
      // React 18+ 的状态更新是批量异步落地的：派事件/调 props 后必须让出一个
      // 宏任务再读回，否则读到旧值误判策略失败（真实站点教训：误判会让瀑布
      // 继续乱锤后面的策略，焦点反复横跳、拖动被打断）
      const settle = () => new Promise((r) => setTimeout(r, 0));

      /** ---------- 驱动工具 ---------- */

      // 键盘宿主：thumb 可能是 aria-hidden 的纯摆设（ChatGPT 就是），真正的
      // 键盘监听挂在带 aria-keyshortcuts 的 menuitem 祖先上
      const findShortcutHost = (el) => {
        let node = el;
        while (node && node !== popover) {
          if (node.getAttribute && node.getAttribute('aria-keyshortcuts')) return node;
          node = node.parentElement;
        }
        const item = el.closest('[role="menuitem"]');
        return item && popover.contains(item) ? item : null;
      };

      // 统一步进骨架：fire(Home/End/方向键) → settle → 读回；一步不动即判死
      const driveBySteps = async (fire, target) => {
        if (target === min) {
          await fire('Home');
          await settle();
          if (readNow() === target) return true;
        } else if (target === max) {
          await fire('End');
          await settle();
          if (readNow() === target) return true;
        }
        let guard = 0;
        while (guard++ < max - min + 2) {
          const current = readNow();
          if (current === target) return true;
          await fire(current < target ? 'ArrowRight' : 'ArrowLeft');
          await settle();
          if (readNow() === current) return false; // 该策略一步都走不动 → 无效
        }
        return readNow() === target;
      };

      const keyFireOn = (targetEl) => (key) => {
        targetEl.dispatchEvent(new KeyboardEvent('keydown', { key, code: key, bubbles: true, cancelable: true, view: window }));
        return Promise.resolve();
      };

      // React fiber 直调：合成事件若被 isTrusted / 焦点门控拦掉，就跳过事件系统，
      // 直接调元素 __reactProps$ 上的 onKeyDown（不抢焦点，绝大多数实现不查 isTrusted）
      const reactPropsOf = (el) => {
        for (const key of Object.keys(el)) {
          if (key.startsWith('__reactProps$')) return el[key];
        }
        return null;
      };
      const fakeKeyEvent = (key, el) => ({
        type: 'keydown', key, code: key, bubbles: true, cancelable: true, isTrusted: true,
        target: el, currentTarget: el, nativeEvent: { key, code: key, bubbles: true, cancelable: true },
        preventDefault() {}, stopPropagation() {}, persist() {},
        defaultPrevented: false, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
      });
      const reactFireOn = (el) => {
        const props = reactPropsOf(el);
        if (!props || typeof props.onKeyDown !== 'function') return null;
        return (key) => {
          try {
            props.onKeyDown(fakeKeyEvent(key, el));
          } catch {
            /* 处理器内部引用缺失字段时由读回判死 */
          }
          return Promise.resolve();
        };
      };

      // 指针模拟：轨道比例位置点击跳跃 → thumb 拖拽。pointer/mouse 成对派发。
      const firePointer = (el, type, x, y, buttons) => {
        const init = {
          bubbles: true, cancelable: true, composed: true, view: window,
          pointerId: 1, pointerType: 'mouse', isPrimary: true,
          clientX: x, clientY: y, button: 0, buttons,
        };
        el.dispatchEvent(new PointerEvent(type, init));
        el.dispatchEvent(new MouseEvent(type.replace('pointer', 'mouse'), init));
      };
      const pickTrack = (el) => {
        // 从 thumb 向上找第一条「像轨道」的宽祖先（不越过弹层）
        let node = el;
        while (node.parentElement && node.parentElement !== popover) {
          if (node.parentElement.getBoundingClientRect().width >= 100) return node.parentElement;
          node = node.parentElement;
        }
        return el.parentElement || el;
      };
      const driveByPointer = async (el, target) => {
        const track = pickTrack(el);
        const rect = track.getBoundingClientRect();
        if (rect.width < 10) return false;
        const ratio = Math.max(0, Math.min(1, (target - min) / (max - min)));
        const x = rect.left + ratio * rect.width;
        const y = rect.top + rect.height / 2;
        // 试 1：轨道上直接点
        firePointer(track, 'pointerdown', x, y, 1);
        firePointer(track, 'pointerup', x, y, 0);
        await settle();
        if (readNow() === target) return true;
        // 试 2：按住 thumb 拖到目标位置
        const thumbRect = el.getBoundingClientRect();
        const sx = thumbRect.left + thumbRect.width / 2;
        const sy = thumbRect.top + thumbRect.height / 2;
        firePointer(el, 'pointerdown', sx, sy, 1);
        for (let i = 1; i <= 4; i += 1) {
          firePointer(el, 'pointermove', sx + ((x - sx) * i) / 4, sy, 1);
        }
        firePointer(el, 'pointerup', x, sy, 0);
        await settle();
        return readNow() === target;
      };

      /** ---------- 策略瀑布（reactProps 不抢焦点排最前，指针垫底） ---------- */
      const strategies = [
        {
          name: 'ReactProps.onKeyDown@快捷键宿主',
          available: (el) => {
            const host = findShortcutHost(el);
            return !!(host && reactFireOn(host));
          },
          run: (el, target) => driveBySteps(reactFireOn(findShortcutHost(el)), target),
        },
        {
          name: '键盘@快捷键宿主',
          available: (el) => !!findShortcutHost(el),
          run: (el, target) => {
            const host = findShortcutHost(el);
            try {
              host.focus({ preventScroll: true });
            } catch {
              host.focus();
            }
            return driveBySteps(keyFireOn(host), target);
          },
        },
        {
          name: 'ReactProps.onKeyDown@thumb',
          available: (el) => !!reactFireOn(el),
          run: (el, target) => driveBySteps(reactFireOn(el), target),
        },
        {
          name: '键盘@thumb',
          available: () => true,
          run: (el, target) => driveBySteps(keyFireOn(el), target),
        },
        {
          name: '指针@轨道',
          available: () => true,
          run: (el, target) => driveByPointer(el, target),
        },
      ];

      const desc = {
        min, max, step, stops,
        _strategies: strategies, // testDrive 用
        _memo: null, // 上次成功的策略，拖动时优先复用
        read: readNow,
        write: (target) => {
          const el = resolveNativeSlider(popover);
          if (!el || !el.isConnected) return Promise.resolve(false);
          if (readNow() === target) return Promise.resolve(true);
          return (async () => {
            const tryOne = async (s) => {
              if (!s.available(el)) return false;
              try {
                return await s.run(el, target);
              } catch {
                return false;
              }
            };
            if (desc._memo && (await tryOne(desc._memo))) return true;
            for (const s of strategies) {
              if (s === desc._memo) continue;
              if (await tryOne(s)) {
                desc._memo = s;
                return true;
              }
            }
            return readNow() === target;
          })();
        },
      };
      return desc;
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
    let driveWarned = false; // 驱动失败告警只报一次，避免刷屏
    let pendingTarget = null; // 拖动中合并写入：只记最新目标值
    let commitInFlight = false;
    const showFrame = (img) => {
      draw(img);
      if (!firstFrameShown) {
        firstFrameShown = true;
        loading.remove();
      }
    };
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
        // 先同步画最近的已缓存帧（拖动跟手），精确帧就绪后再换上
        const instant = nearestLoadedFrame(level);
        if (instant) showFrame(instant);
        ensureFrame(level, (img) => {
          if (clampLevel(Math.round(level)) !== clampLevel(Math.round(Number(range.value)))) return;
          showFrame(img);
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
        pendingTarget = target;
        if (commitInFlight) return true; // 在飞的写完会接着写最新目标，不堆叠
        commitInFlight = true;
        // 驱动策略可能 focus 别的元素（键盘宿主需要焦点），写完必须还回来，
        // 否则我们 range 的拖动被焦点抢断（真实站点教训：滑到档边界就失焦）
        const focusOwner = document.activeElement;
        (async () => {
          try {
            while (pendingTarget !== null) {
              const t = pendingTarget;
              pendingTarget = null;
              const ok = await native.write(t);
              if (!ok && !driveWarned) {
                driveWarned = true;
                console.warn(TAG, '驱动原生滑杆失败，已跳过本次写入（后续拖动会自动重试）');
              } else if (ok) {
                driveWarned = false;
              }
            }
          } finally {
            commitInFlight = false;
            if (
              focusOwner &&
              root.contains(focusOwner) &&
              document.activeElement !== focusOwner &&
              focusOwner.isConnected
            ) {
              try {
                focusOwner.focus({ preventScroll: true });
              } catch {
                /* 焦点归还不影响功能 */
              }
            }
          }
        })();
        return true;
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
    // 我们的滑杆事件绝不能冒泡到弹层宿主（它的 menuitem 也监听方向键/点击）
    range.addEventListener('pointerdown', (event) => event.stopPropagation());
    range.addEventListener('keydown', (event) => event.stopPropagation());

    api.syncFromNative();
    preloadAll(level);
    return api;
  }

  /** ------------------------------------------------------------------------
   * 注入与增强（带自愈）
   *
   * React 在原生滑杆值变化后会重渲染弹层，把滑杆换成全新节点（没有我们的
   * 隐藏类），甚至可能把我们的面板也摘掉。因此增强状态按「弹层」记录，
   * 每次扫描都会校验：原生滑杆是否又被换节点裸奔、面板是否还挂在弹层里，
   * 发现异常就地修复。
   * ---------------------------------------------------------------------- */
  const popoverStates = new WeakMap(); // popover -> { native, panel }
  const managedPopovers = new Set(); // restoreAll 用（WeakMap 不可遍历）
  const failedPopovers = new WeakSet(); // 自检失败的弹层，不再反复尝试

  // 找到要隐藏的原生滑杆组件根：thumb 外常被裹多层定位包装（只藏第一层会留下
  // 可见的轨道/可视 thumb 残影——真实站点教训），向上爬过纯结构节点，
  // 把整个滑杆组件一起藏掉。爬升守卫：子节点少、无文字内容、不含滑杆以外的
  // 交互控件、不越过弹层容器——宁可少藏不可误伤。
  function nativeRootOf(sliderEl, popover) {
    let root = sliderEl instanceof HTMLInputElement ? sliderEl : sliderEl.parentElement || sliderEl;
    let node = root.parentElement;
    let guard = 0;
    const hasOtherControls = (container) =>
      [...container.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="link"]')].some(
        (el) => el !== sliderEl && !sliderEl.contains(el),
      );
    while (node && node !== popover && node !== document.body && guard < 4) {
      if (node.children.length > 3) break; // 并列内容太多，再爬可能误伤
      // 键盘宿主/菜单项是功能容器，藏了会把键盘监听和我们的面板一起埋了
      const role = node.getAttribute && node.getAttribute('role');
      if (role === 'menuitem' || role === 'menu' || role === 'menuitemcheckbox' || role === 'menuitemradio') break;
      if (node.getAttribute && node.getAttribute('aria-keyshortcuts')) break;
      if ((node.textContent || '').trim().length > 0) break; // 带文字的容器里还有别的信息
      if (hasOtherControls(node)) break; // 还有别的按钮/链接等控件
      root = node;
      node = node.parentElement;
      guard += 1;
    }
    return root;
  }

  // 隐藏当前原生滑杆 + 保证面板挂得正确 + 放宽弹层祖先链限制（enhance/heal 共用）
  function hideNativeAndRelax(popover, sliderEl, panelRoot) {
    const nativeRoot = nativeRootOf(sliderEl, popover);
    nativeRoot.classList.add('liangc-native-hidden');

    // 面板必须落在「未被隐藏的块级容器」里——塞进 inline span 必然布局歪掉
    // （真实站点教训：面板曾被插进 inline 的滑杆根 span，整行排版崩坏）
    let host = nativeRoot.parentElement;
    while (host && host !== popover && host !== document.body) {
      const display = host.getBoundingClientRect && getComputedStyle(host).display;
      const inline = display === 'inline' || display === 'inline-flex' || display === 'contents';
      if (!inline && !host.closest('.liangc-native-hidden')) break;
      host = host.parentElement;
    }
    if (!host || host === document.body) host = popover;
    // 在 host 内插到「包含原生根的那条链」的最顶层节点之前
    let before = nativeRoot;
    while (before.parentElement && before.parentElement !== host) before = before.parentElement;
    if (panelRoot.parentElement !== host || panelRoot.nextElementSibling !== before) {
      host.insertBefore(panelRoot, before);
    }

    let ancestor = panelRoot.parentElement;
    while (ancestor) {
      ancestor.classList.add('liangc-relaxed');
      if (ancestor === popover) break;
      ancestor = ancestor.parentElement;
    }
    return nativeRoot;
  }

  function enhance(sliderEl, popover) {
    const native = describeNativeSlider(popover);
    if (!native) return;

    const nativeRoot = nativeRootOf(sliderEl, popover);
    if (!nativeRoot.parentElement) return;

    const panel = buildPanel(native);
    hideNativeAndRelax(popover, sliderEl, panel.root);

    // 写一次与原生当前值相同的位置做自检（异步）；失败则回滚，免得把功能藏没
    Promise.resolve(native.write(native.read())).then((ok) => {
      if (ok) {
        popoverStates.set(popover, { native, panel });
        managedPopovers.add(popover);
        console.debug(TAG, '已接管思考滑杆', sliderEl);
      } else {
        console.warn(TAG, '原生滑杆不可驱动，已还原原样', sliderEl);
        nativeRoot.classList.remove('liangc-native-hidden');
        panel.root.remove();
        failedPopovers.add(popover);
      }
    });
  }

  // 自愈：React 重渲染换了滑杆节点后重新隐藏；面板被摘掉则重新挂回
  function heal(popover, state, sliderEl) {
    hideNativeAndRelax(popover, sliderEl, state.panel.root);
  }

  function scan() {
    let candidates;
    try {
      candidates = document.querySelectorAll(CONFIG.SLIDER_SELECTOR);
    } catch {
      return;
    }
    for (const el of candidates) {
      if (el.closest('.liangc-root')) continue; // 跳过自己注入的梁系滑杆，防止级联增强
      const popover = el.closest(CONFIG.POPOVER_SELECTOR);
      if (!popover || failedPopovers.has(popover)) continue;
      const width = popover.getBoundingClientRect().width;
      if (width > CONFIG.MAX_POPOVER_WIDTH) continue; // 大对话框不碰；宽度为 0 视为未布局完成，放行
      const state = popoverStates.get(popover);
      try {
        if (state) heal(popover, state, el);
        else enhance(el, popover);
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
    showBootBadge();
  }

  // 注入信标：右下角闪现徽章，用来一眼区分「脚本没跑」和「跑了但没匹配到滑杆」
  function showBootBadge() {
    if (!CONFIG.SHOW_BOOT_BADGE) return;
    try {
      const badge = document.createElement('div');
      badge.textContent = `滑动变祖器 v${VERSION} 已注入`;
      badge.style.cssText =
        'position:fixed;right:12px;bottom:12px;z-index:2147483647;background:#1d1918;color:#d8d4c9;' +
        'font:12px/1.5 -apple-system,"Segoe UI",sans-serif;padding:6px 10px;border-radius:8px;' +
        'box-shadow:0 2px 10px rgb(0 0 0/25%);opacity:.9;pointer-events:none;transition:opacity .4s';
      (document.body || document.documentElement).appendChild(badge);
      setTimeout(() => {
        badge.style.opacity = '0';
        setTimeout(() => badge.remove(), 500);
      }, 2400);
    } catch {
      /* 徽章只是调试信标，失败不影响主流程 */
    }
  }

  /** ------------------------------------------------------------------------
   * 调试接口：DOM 命令桥（主路径）+ 隔离世界 __liang（备用）
   *
   * 扩展的 content script 跑在隔离世界，__liang 挂在隔离 window 上，
   * 主世界控制台访问不到；且每次重载扩展都会留下僵尸上下文，上下文下拉里
   * 根本分不清死活。DOM 事件天然穿透所有世界，所以主路径走 CustomEvent 桥：
   *   document.dispatchEvent(new CustomEvent('liang-command', {detail:'dump'}))
   * 支持命令：dump / probe / testDrive / restore。结果同时进控制台和页面浮层。
   * ---------------------------------------------------------------------- */

  // 探测当前页面所有滑杆候选及其状态
  function probeReport() {
    const report = [...document.querySelectorAll(CONFIG.SLIDER_SELECTOR)].map((el, i) => ({
      i,
      kind: el.getAttribute('role') === 'slider' ? 'aria-slider' : el.tagName.toLowerCase(),
      min: el.getAttribute('aria-valuemin') ?? el.min ?? null,
      max: el.getAttribute('aria-valuemax') ?? el.max ?? null,
      now: el.getAttribute('aria-valuenow') ?? el.value ?? null,
      inPopover: !!el.closest(CONFIG.POPOVER_SELECTOR),
      enhanced: popoverStates.has(el.closest(CONFIG.POPOVER_SELECTOR)),
      hidden: !!el.closest('.liangc-native-hidden'),
      isOurs: !!el.closest('.liangc-root'),
      parentHTML: (el.parentElement?.outerHTML || '').slice(0, 300),
    }));
    console.log(`${TAG} 探测到 ${report.length} 个滑杆候选：`);
    if (console.table) console.table(report);
    else console.log(report);
    return report;
  }

  // 导出全部弹层候选的 DOM 结构（在弹层打开状态下执行）
  function dumpPopovers() {
    const pops = [...document.querySelectorAll(CONFIG.POPOVER_SELECTOR)].filter((el) => el.isConnected);
    if (!pops.length) return null;
    const html = pops.map((el, i) => `---- 弹层候选 ${i} ----\n${el.outerHTML}`).join('\n\n');
    console.log(html);
    return html;
  }

  function restoreAll() {
    for (const el of document.querySelectorAll('.liangc-native-hidden')) el.classList.remove('liangc-native-hidden');
    for (const el of document.querySelectorAll('.liangc-relaxed')) el.classList.remove('liangc-relaxed');
    for (const el of document.querySelectorAll('.liangc-root')) el.remove();
    for (const popover of managedPopovers) popoverStates.delete(popover);
    managedPopovers.clear();
  }

  // 在真实滑杆上逐个实测驱动策略（往反方向打一个值再还原），直接回答它吃哪种事件
  async function testDrive() {
    let popover = null;
    for (const p of managedPopovers) {
      if (p.isConnected && resolveNativeSlider(p)) { popover = p; break; }
    }
    if (!popover) {
      for (const p of document.querySelectorAll(CONFIG.POPOVER_SELECTOR)) {
        if (resolveNativeSlider(p)) { popover = p; break; }
      }
    }
    if (!popover) return '未找到含滑杆的弹层。请先点开「思考强度」弹层，再执行 testDrive。';
    const el = resolveNativeSlider(popover);
    const native = describeNativeSlider(popover);
    if (!el || !native) return '弹层内未找到原生滑杆节点。';

    const lines = [];
    lines.push(`版本: v${VERSION}`);
    lines.push(`量程: min=${native.min} max=${native.max} stops=${native.stops} step=${native.step}`);
    lines.push(`节点: ${el.outerHTML.slice(0, 300)}`);
    const chain = [];
    let p = el.parentElement;
    while (p && chain.length < 5) {
      chain.push(`${p.tagName.toLowerCase()}${p.id ? '#' + p.id : ''} class=${String(p.className).slice(0, 80)}`);
      p = p.parentElement;
    }
    lines.push(`父链:\n  ${chain.join('\n  ')}`);
    const original = native.read();
    lines.push(`原值: ${original}`);
    const target = original >= (native.min + native.max) / 2 ? native.min : native.max;
    lines.push(`试验目标值: ${target}`);

    if (el instanceof HTMLInputElement && el.type === 'range') {
      const ok = await native.write(target);
      lines.push(`input setter 驱动: ${ok ? 'PASS' : 'FAIL'}（试后读回=${native.read()}）`);
    } else if (native._strategies) {
      for (const s of native._strategies) {
        if (!s.available(el)) {
          lines.push(`${s.name}: SKIP（条件不满足）`);
          continue;
        }
        let ok = false;
        try {
          ok = await s.run(el, target);
        } catch (err) {
          lines.push(`${s.name}: ERROR ${err && err.message}`);
          continue;
        }
        lines.push(`${s.name}: ${ok ? 'PASS ✓' : 'FAIL ✗'}（试后读回=${native.read()}）`);
        // 每个策略试完都还原，互不污染
        if (native.read() !== original) {
          const r = await native.write(original);
          if (!r) {
            lines.push(`  还原到 ${original} 失败，中止后续策略——请手动把滑杆拨回原位`);
            return lines.join('\n');
          }
        }
      }
    }
    const restoreOk = await native.write(original);
    lines.push(`最终还原 ${original}: ${restoreOk ? 'OK' : 'FAILED——请手动拨回'}`);
    return lines.join('\n');
  }

  // 结果浮层：控制台之外再给一份可一键复制的页面面板
  function showResultOverlay(title, text) {
    document.getElementById('liangc-result')?.remove();
    const wrap = document.createElement('div');
    wrap.id = 'liangc-result';
    wrap.style.cssText =
      'position:fixed;right:16px;bottom:16px;z-index:2147483647;width:min(620px,calc(100vw - 32px));' +
      'max-height:80vh;overflow:auto;background:#1d1918;color:#e8e4d9;border-radius:12px;' +
      'box-shadow:0 8px 40px rgb(0 0 0/45%);padding:12px;font:13px/1.5 -apple-system,"Segoe UI",sans-serif';
    const head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;font-weight:600';
    const titleEl = document.createElement('span');
    titleEl.textContent = title;
    const copyBtn = document.createElement('button');
    copyBtn.textContent = '复制';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭';
    for (const btn of [copyBtn, closeBtn]) {
      btn.style.cssText = 'border:1px solid #555;background:#2a2625;color:#e8e4d9;border-radius:6px;padding:4px 12px;cursor:pointer;font-size:12px';
    }
    const btnBox = document.createElement('span');
    btnBox.style.cssText = 'display:flex;gap:6px;flex:none';
    btnBox.append(copyBtn, closeBtn);
    head.append(titleEl, btnBox);
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.readOnly = true;
    ta.style.cssText =
      'width:100%;height:min(300px,50vh);box-sizing:border-box;font:11px/1.45 SFMono-Regular,Consolas,monospace;' +
      'white-space:pre;overflow:auto;background:#12100f;color:#d8d4c9;border:1px solid #444;border-radius:8px;padding:8px';
    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(ta.value);
      } catch {
        ta.select();
        document.execCommand('copy');
      }
      copyBtn.textContent = '已复制 ✓';
    };
    closeBtn.onclick = () => wrap.remove();
    wrap.append(head, ta);
    (document.body || document.documentElement).appendChild(wrap);
  }

  function handleCommand(cmd) {
    const stamp = `${TAG} v${VERSION} 命令「${cmd}」`;
    console.log(stamp);
    switch (cmd) {
      case 'dump': {
        const html = dumpPopovers();
        if (html === null) {
          showResultOverlay(stamp, '未找到弹层。请先点开「思考强度」弹层，再执行 dump。');
          return;
        }
        showResultOverlay(`${stamp}（点「复制」后发给作者）`, html);
        break;
      }
      case 'probe': {
        const report = probeReport();
        showResultOverlay(stamp, JSON.stringify(report, null, 2));
        break;
      }
      case 'testDrive': {
        // 实测全程不能弹浮层抢焦点——Radix 菜单失焦即关，节点会被拆掉（真实站点教训：
        // 提前弹层导致还原阶段菜单已关闭，写入打在死节点上，误判「还原失败」）
        testDrive().then((out) => {
          console.log(out);
          showResultOverlay(`${stamp}（点「复制」后发给作者）`, out);
        });
        break;
      }
      case 'restore': {
        restoreAll();
        showResultOverlay(stamp, '已还原所有被替换的原生滑杆。');
        break;
      }
      default:
        showResultOverlay(stamp, '未知命令。可用：dump / probe / testDrive / restore');
    }
  }

  // 命令桥：document 在所有世界间共享，任何控制台上下文派发都会到达
  document.addEventListener('liang-command', (event) => {
    const cmd = typeof event.detail === 'string' ? event.detail : event.detail && event.detail.cmd;
    try {
      handleCommand(cmd || 'help');
    } catch (err) {
      console.warn(TAG, '命令执行出错', err);
    }
  });

  // 备用路径：隔离世界 window（Tampermonkey 下经 unsafeWindow 穿透到页面）
  const debugHost = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  debugHost.__liang = {
    version: VERSION,
    CONFIG,
    rescan: scan,
    probe: probeReport,
    dump: dumpPopovers,
    testDrive,
    restoreAll,
  };

  console.log(`${TAG} 已注入 v${VERSION}，等待思考弹层出现…（控制台一行命令自检：document.dispatchEvent(new CustomEvent('liang-command',{detail:'testDrive'}))）`);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
