import React from 'react';

/**
 * AppLogo — Official Aegis helpdeskAI Brand Icon & Logo
 * Designed with a high-tech Aegis Shield, dual-tone gradient, and an AI Quantum Core.
 * Optimized for crisp rendering across 16px, 24px, 32px, 48px, and 64px scales.
 */
export default function AppLogo({ 
  size = 32, 
  className = '', 
  glow = true,
  variant = 'icon' // 'icon' | 'badge'
}) {
  const pixelSize = typeof size === 'number' ? size : parseInt(size, 10) || 32;

  const svgContent = (
    <svg 
      width={pixelSize} 
      height={pixelSize} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-300 group-hover:scale-105"
    >
      <defs>
        {/* Main Shield Gradient: Deep Indigo to Electric Cyan */}
        <linearGradient id="aegisPrimaryGrad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="45%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>

        {/* Inner Core Bright Gradient */}
        <linearGradient id="aegisCoreGrad" x1="16" y1="12" x2="32" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#c3c0ff" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>

        {/* Ambient Dark Surface Backdrop */}
        <linearGradient id="aegisInnerDark" x1="24" y1="8" x2="24" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0b1326" stopOpacity="0.95" />
        </linearGradient>

        {/* Glow Filter */}
        <filter id="aegisGlow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Outer Aegis Shield Body */}
      <path 
        d="M24 3 L42 9.5 C42 27.5 33.5 39.5 24 45 C14.5 39.5 6 27.5 6 9.5 Z" 
        fill="url(#aegisPrimaryGrad)" 
      />

      {/* Inner Shield Inset */}
      <path 
        d="M24 6.8 L38.5 12.2 C38.5 26.8 31.4 36.8 24 41.5 C16.6 36.8 9.5 26.8 9.5 12.2 Z" 
        fill="url(#aegisInnerDark)" 
      />

      {/* Futuristic AI Quantum Nexus Motif */}
      {/* Upper AI Delta / Wing */}
      <path 
        d="M24 13 L31 20 L27 21 L24 17 L21 21 L17 20 Z" 
        fill="url(#aegisCoreGrad)" 
      />

      {/* Central Quantum Core Diamond */}
      <path 
        d="M24 19 L30 25 L24 31 L18 25 Z" 
        fill="url(#aegisPrimaryGrad)"
      />

      {/* Inner Bright Spark */}
      <path 
        d="M24 21.5 L27.5 25 L24 28.5 L20.5 25 Z" 
        fill="#ffffff" 
        filter="url(#aegisGlow)"
      />

      {/* Lower Shield Anchor Chevron */}
      <path 
        d="M24 36 L29 30 L27 29 L24 32.5 L21 29 L19 30 Z" 
        fill="url(#aegisCoreGrad)" 
      />
    </svg>
  );

  if (variant === 'badge') {
    return (
      <div 
        className={`group relative flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/15 via-primary/10 to-cyan-500/15 border border-indigo-500/30 shadow-[0_0_15px_rgba(79,70,229,0.2)] transition-all duration-300 hover:border-indigo-400/50 hover:shadow-[0_0_20px_rgba(79,70,229,0.35)] ${className}`}
        style={{ width: pixelSize + 16, height: pixelSize + 16 }}
      >
        {glow && (
          <div 
            className="absolute inset-0 rounded-xl bg-indigo-500/20 blur-md pointer-events-none -z-10 group-hover:bg-indigo-500/30 transition-colors" 
          />
        )}
        {svgContent}
      </div>
    );
  }

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {glow && (
        <div 
          className="absolute inset-0 rounded-full bg-primary/25 blur-sm pointer-events-none -z-10" 
        />
      )}
      {svgContent}
    </div>
  );
}
