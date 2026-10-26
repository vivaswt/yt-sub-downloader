(() => {
  'use strict';

  const titleEl = document.getElementById('title');
  const statusEl = document.getElementById('status');
  const saveEl = document.getElementById('save');
  let tabId = null;
  let current = null;

  function setStatus(text, className = '') {
    statusEl.textContent = text;
    statusEl.className = className;
  }

  function sanitizeFilename(name) {
    const cleaned = name
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/[\u0000-\u001F]/g, '_')
      .trim();
    return (cleaned || 'youtube-video').slice(0, 180);
  }

  function parseVideoId(url) {
    try {
      const u = new URL(url);
      return u.pathname === '/watch' ? u.searchParams.get('v') : null;
    } catch {
      return null;
    }
  }

  async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  }

  async function refresh() {
    const tab = await getActiveTab();
    if (!tab || !tab.id || !tab.url || !tab.url.startsWith('https://www.youtube.com/')) {
      titleEl.textContent = 'Not a YouTube tab';
      setStatus('Open a YouTube watch page first.', 'warn');
      saveEl.disabled = true;
      return;
    }

    tabId = tab.id;
    const videoId = parseVideoId(tab.url);
    if (!videoId) {
      titleEl.textContent = 'No video';
      setStatus('Open a YouTube video (/watch?v=…).', 'warn');
      saveEl.disabled = true;
      return;
    }

    try {
      const response = await chrome.tabs.sendMessage(tabId, { type: 'GET_STATUS' });
      current = response;
      render(response.status);
    } catch (error) {
      titleEl.textContent = tab.title || 'YouTube video';
      setStatus('The content script is not ready. Reload the YouTube tab once.', 'warn');
      saveEl.disabled = true;
    }
  }

  function render(status) {
    titleEl.textContent = status?.title || 'YouTube video';

    if (status?.available) {
      const when = status.capturedAt ? new Date(status.capturedAt).toLocaleTimeString() : '';
      setStatus(`English auto-generated captions captured${when ? ` at ${when}` : ''}.`, 'ok');
      saveEl.disabled = false;
      return;
    }

    if (status?.error) {
      setStatus(status.error, 'error');
      saveEl.disabled = false;
      return;
    }

    setStatus('No English auto-generated subtitle request captured yet.\nPlay/enable English auto-subtitles, then open this popup again.', 'warn');
    saveEl.disabled = true;
  }

  async function saveSrv2() {
    if (!tabId) return;

    saveEl.disabled = true;
    saveEl.textContent = 'Preparing…';

    try {
      const response = await chrome.tabs.sendMessage(tabId, { type: 'GET_CAPTION' });
      if (!response?.srv2) {
        throw new Error(response?.status?.error || 'No SRV2 payload is available.');
      }

      const title = sanitizeFilename(response.status?.title || 'youtube-video');
      const videoId = sanitizeFilename(response.status?.videoId || 'unknown');
      const filename = `${title}.srv2`;

      const blob = new Blob([response.srv2], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setStatus(`Saved: ${filename}`, 'ok');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), 'error');
    } finally {
      saveEl.disabled = false;
      saveEl.textContent = 'Save .srv2';
    }
  }

  saveEl.addEventListener('click', saveSrv2);
  refresh();
})();
