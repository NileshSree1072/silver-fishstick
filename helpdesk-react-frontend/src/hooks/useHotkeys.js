import { useEffect, useRef } from 'react';

const isTyping = (el) =>
  el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

/**
 * Keyboard shortcuts.
 *   'j'        single key (ignored while typing in a field)
 *   'g d'      two-key sequence, second key within 800 ms
 *   'mod+k'    Ctrl (or Cmd) + key — works even while typing
 * Handlers are read from a ref, so passing a fresh object each render is fine.
 */
export default function useHotkeys(bindings, enabled = true) {
  const bindingsRef = useRef(bindings);
  useEffect(() => { bindingsRef.current = bindings; });

  useEffect(() => {
    if (!enabled) return undefined;
    let pending = null;
    let timer = null;

    const onKeyDown = (e) => {
      const b = bindingsRef.current;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      if (e.ctrlKey || e.metaKey) {
        const handler = b[`mod+${key}`];
        if (handler) { e.preventDefault(); handler(e); }
        return;
      }
      if (e.altKey || isTyping(e.target) || e.defaultPrevented) return;

      if (pending) {
        const handler = b[`${pending} ${key}`];
        pending = null;
        clearTimeout(timer);
        if (handler) { e.preventDefault(); handler(e); return; }
      }

      if (Object.keys(b).some(k => k.startsWith(`${key} `))) {
        pending = key;
        timer = setTimeout(() => { pending = null; }, 800);
        return;
      }

      const handler = b[key];
      if (handler) { e.preventDefault(); handler(e); }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(timer);
    };
  }, [enabled]);
}
