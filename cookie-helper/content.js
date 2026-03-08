(function () {
  'use strict';

  const PANEL_ID = 'cookie-helper-panel';
  const BTN_ID = 'cookie-helper-btn';

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
    btn.addEventListener('click', onButtonClick);
    document.body.appendChild(btn);
  }

  function formatCookiesForCopy(cookies) {
    return cookies
      .map((c) => `${encodeURIComponent(c.name)}=${encodeURIComponent(c.value)}`)
      .join('; ');
  }

  function formatCookiesForDisplay(cookies) {
    return cookies
      .map((c) => {
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

  function showPanel(cookies, copyText, displayText) {
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.cssText = `
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
      <span style="font-weight:600; color:#333;">Cookie（含 HttpOnly）</span>
      <div>
        <button type="button" id="cookie-helper-copy" style="margin-right:6px; padding:4px 10px; border-radius:4px; border:1px solid #ccc; background:#fff; cursor:pointer;">复制全部</button>
        <button type="button" id="cookie-helper-close" style="padding:4px 10px; border-radius:4px; border:1px solid #ccc; background:#fff; cursor:pointer;">关闭</button>
      </div>
    `;

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
    pre.textContent = displayText;

    panel.appendChild(header);
    panel.appendChild(pre);

    header.querySelector('#cookie-helper-close').addEventListener('click', () => panel.remove());

    header.querySelector('#cookie-helper-copy').addEventListener('click', () => {
      navigator.clipboard.writeText(copyText).then(
        () => {
          const b = $('cookie-helper-copy');
          if (b) {
            b.textContent = '已复制';
            setTimeout(() => { b.textContent = '复制全部'; }, 1500);
          }
        },
        () => {
          const b = $('cookie-helper-copy');
          if (b) b.textContent = '复制失败';
        }
      );
    });

    document.body.appendChild(panel);
  }

  function onButtonClick() {
    if ($(PANEL_ID)) {
      $(PANEL_ID).remove();
      return;
    }
    chrome.runtime.sendMessage(
      { type: 'GET_COOKIES', url: location.href },
      (response) => {
        if (chrome.runtime.lastError) {
          showPanel([], '', '获取失败: ' + chrome.runtime.lastError.message);
          return;
        }
        if (response && response.error) {
          showPanel([], '', '错误: ' + response.error);
          return;
        }
        const cookies = (response && response.cookies) || [];
        const copyText = formatCookiesForCopy(cookies);
        const displayText = formatCookiesForDisplay(cookies) || '(无 Cookie)';
        showPanel(cookies, copyText, displayText);
      }
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createButton);
  } else {
    createButton();
  }
})();
