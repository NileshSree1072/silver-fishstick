import React from 'react';

/**
 * AppLogo — Aegis shield mark.
 * Flat, single brand colour so it reads cleanly at 16–64px in both themes.
 * `glow` is accepted for backwards compatibility and ignored.
 */
export default function AppLogo({ size = 32, className = '', glow, variant = 'icon' }) {
  const pixelSize = typeof size === 'number' ? size : parseInt(size, 10) || 32;

  const mark = (
    <svg width={pixelSize} height={pixelSize} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0" aria-hidden="true">
      <path d="M24 3 L42 9.5 C42 27.5 33.5 39.5 24 45 C14.5 39.5 6 27.5 6 9.5 Z" fill="var(--brand)" />
      <path d="M24 13 L31 20 L27 21 L24 17 L21 21 L17 20 Z" fill="#ffffff" />
      <path d="M24 21 L28 25 L24 29 L20 25 Z" fill="#ffffff" />
      <path d="M24 36 L29 30 L27 29 L24 32.5 L21 29 L19 30 Z" fill="#ffffff" fillOpacity="0.75" />
    </svg>
  );

  if (variant === 'badge') {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-outline-variant bg-surface-container-low shadow-[var(--shadow-xs)] ${className}`}
        style={{ width: pixelSize + 8, height: pixelSize + 8 }}
      >
        {mark}
      </div>
    );
  }

  return <div className={`inline-flex items-center justify-center ${className}`}>{mark}</div>;
}
