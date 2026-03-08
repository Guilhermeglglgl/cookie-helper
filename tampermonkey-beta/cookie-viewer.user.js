// ==UserScript==
// @name         网页完整 Cookie 查看与复制
// @namespace    https://github.com/
// @version      1.0.0
// @description 在页面左上角显示小按钮，点击可查看当前站点的全部 Cookie（含 HttpOnly），支持一键复制
// @author       You
// @match        *://*/*
// @grant        GM.cookie
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const PANEL_ID = 'cookie-viewer-panel';
  const BTN_ID = 'cookie-viewer-btn';

  function $(id) {
    return document.getElementById(id);
  }

  function createButton() {
    if ($(BTN_ID)) return;
    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.textContent = '🍪';
    btn.title = '查看/复制本页 Cookie';
    btn.style.cssText = `
      position: fixed;
      top: 8px;
      left: 8px;
      z-index: 2147483646;
      width: 32px;
      height: 32px;
      padding: 0;
      border: 1px solid rgba(0,0,0,0.2);
      border-radius: 6px;
      background: #fff;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      box-shadow: 0 1px 4px rgba(0,0,0,0.15);
      opacity: 0.85;
    `;
    btn.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
    btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.85'; });
    btn.addEventListener('click', togglePanel);
    document.body.appendChild(btn);
  }

  function getCookiesViaGM() {
    // 必须传入对象；url 不传则默认为当前文档 URL
    return GM.cookie.list({ url: location.href });
  }

  function getCookiesViaDocument() {
    return document.cookie
      .split('; ')
      .filter(Boolean)
      .map(s => {
        const i = s.indexOf('=');
        return { name: s.slice(0, i), value: s.slice(i + 1) };
      });
  }

  function formatCookiesForCopy(cookies) {
    return cookies
      .map(c => `${encodeURIComponent(c.name)}=${encodeURIComponent(c.value)}`)
      .join('; ');
  }

  function formatCookiesForDisplay(cookies) {
    return cookies
      .map(c => {
        const name = c.name || '(empty name)';
        const value = String(c.value ?? '').slice(0, 200);
        const extra = [];
        if (c.httpOnly) extra.push('HttpOnly');
        if (c.secure) extra.push('Secure');
        if (c.sameSite) extra.push(`SameSite=${c.sameSite}`);
        const suffix = extra.length ? ` [${extra.join(', ')}]` : '';
        return `${name}=${value}${suffix}`;
      })
      .join('\n');
  }

  async function loadCookies() {
    let cookies = [];
    let source = '';
    try {
      cookies = await getCookiesViaGM();
      source = 'GM.cookie（含 HttpOnly）';
    } catch (e) {
      try {
        cookies = getCookiesViaDocument();
        source = 'document.cookie（仅非 HttpOnly）';
      } catch (e2) {
        source = '获取失败';
      }
    }
    return { cookies, source };
  }

  function togglePanel() {
    const panel = $(PANEL_ID);
    if (panel) {
      panel.remove();
      return;
    }

    const box = document.createElement('div');
    box.id = PANEL_ID;
    box.style.cssText = `
      position: fixed;
      top: 48px;
      left: 8px;
      z-index: 2147483646;
      width: min(90vw, 480px);
      max-height: 70vh;
      background: #fff;
      border: 1px solid rgba(0,0,0,0.2);
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      font: 13px/1.5 system-ui, sans-serif;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      padding: 10px 12px;
      background: #f5f5f5;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    `;
    header.innerHTML = `
      <span style="font-weight:600; color:#333;">Cookie</span>
      <div>
        <button type="button" id="cookie-viewer-copy" style="margin-right:6px; padding:4px 10px; border-radius:4px; border:1px solid #ccc; background:#fff; cursor:pointer;">复制全部</button>
        <button type="button" id="cookie-viewer-close" style="padding:4px 10px; border-radius:4px; border:1px solid #ccc; background:#fff; cursor:pointer;">关闭</button>
      </div>
    `;

    const sourceLabel = document.createElement('div');
    sourceLabel.style.cssText = 'padding: 4px 12px; font-size: 11px; color: #666; flex-shrink: 0;';
    sourceLabel.id = 'cookie-viewer-source';

    const pre = document.createElement('pre');
    pre.style.cssText = `
      margin: 0;
      padding: 12px;
      overflow: auto;
      flex: 1;
      min-height: 80px;
      max-height: 50vh;
      white-space: pre-wrap;
      word-break: break-all;
      font-size: 12px;
      color: #333;
      background: #fafafa;
    `;
    pre.textContent = '加载中…';

    box.appendChild(header);
    box.appendChild(sourceLabel);
    box.appendChild(pre);

    header.querySelector('#cookie-viewer-close').addEventListener('click', () => box.remove());

    header.querySelector('#cookie-viewer-copy').addEventListener('click', async () => {
      const text = pre.getAttribute('data-copy') || pre.textContent;
      try {
        await new Promise((res, rej) => {
          if (typeof GM_setClipboard !== 'undefined') {
            GM_setClipboard(text, 'text');
            res();
          } else {
            navigator.clipboard.writeText(text).then(res).catch(rej);
          }
        });
        const btn = $('cookie-viewer-copy');
        if (btn) { btn.textContent = '已复制'; setTimeout(() => { btn.textContent = '复制全部'; }, 1500); }
      } catch (e) {
        const btn = $('cookie-viewer-copy');
        if (btn) btn.textContent = '复制失败';
      }
    });

    document.body.appendChild(box);

    (async () => {
      const { cookies, source } = await loadCookies();
      sourceLabel.textContent = source;
      const copyText = formatCookiesForCopy(cookies);
      const displayText = formatCookiesForDisplay(cookies) || '(无 Cookie)';
      pre.textContent = displayText;
      pre.setAttribute('data-copy', copyText);
    })();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createButton);
  } else {
    createButton();
  }
})();
