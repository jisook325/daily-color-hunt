console.log('[PROBE] loaded');
const b = document.createElement('div');
b.id = 'probe-banner';
b.textContent = 'PROBE LOADED';
b.style.cssText = 'position:fixed;left:8px;bottom:8px;padding:4px 8px;font:12px/1.4 system-ui;background:#000;color:#0f0;z-index:99999;border-radius:4px;opacity:.8';
document.body.appendChild(b);
