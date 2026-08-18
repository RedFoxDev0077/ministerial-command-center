/**
 * Copy text to clipboard.
 * Works in both secure (HTTPS) and non-secure (HTTP) contexts.
 * When a modal/dialog is open, appends the temporary textarea inside it
 * to avoid focus-trap interference.
 */
export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }

  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '-9999px';
    ta.style.opacity = '0';
    ta.setAttribute('readonly', '');

    // Append inside the open dialog/sheet so the focus trap doesn't block it
    const container = document.querySelector('[role="dialog"]') ?? document.body;
    container.appendChild(ta);

    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);

    const ok = document.execCommand('copy');
    container.removeChild(ta);

    if (ok) {
      resolve();
    } else {
      reject(new Error('execCommand returned false'));
    }
  });
}
