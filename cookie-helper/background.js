chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'GET_COOKIES') {
    return;
  }
  const url = message.url || (sender.tab && sender.tab.url);
  if (!url) {
    sendResponse({ error: '无 URL' });
    return true;
  }
  chrome.cookies.getAll({ url }, (cookies) => {
    if (chrome.runtime.lastError) {
      sendResponse({ error: chrome.runtime.lastError.message });
      return;
    }
    sendResponse({ cookies });
  });
  return true;
});
