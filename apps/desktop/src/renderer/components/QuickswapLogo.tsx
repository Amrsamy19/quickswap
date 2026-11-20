import React from 'react';

interface QuickswapLogoProps {
  className?: string;
}

export const QuickswapLogo: React.FC<QuickswapLogoProps> = ({
  className = 'w-8 h-8',
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={className}
      fill="none"
    >
      <defs>
        <radialGradient id="qsBgGrad" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#162032" />
          <stop offset="70%" stopColor="#0B0F17" />
          <stop offset="100%" stopColor="#06090E" />
        </radialGradient>

        <linearGradient id="qsShieldStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>

        <linearGradient id="qsSwapCyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>

        <linearGradient id="qsSwapBlue" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>

        <filter id="qsGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        <filter id="qsSubtleGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Container Squircle */}
      <rect x="24" y="24" width="464" height="464" rx="108" fill="url(#qsBgGrad)" stroke="#1E293B" strokeWidth="4" />
      
      {/* Outer Glow Arc Accent */}
      <rect x="28" y="28" width="456" height="456" rx="104" fill="none" stroke="url(#qsShieldStroke)" strokeWidth="2" opacity="0.4" />

      {/* Security Shield Outer Shell */}
      <path
        d="M 256 78 C 342 78 402 108 402 108 C 402 248 358 358 256 424 C 154 358 110 248 110 108 C 110 108 170 78 256 78 Z"
        fill="#0D1524"
        stroke="url(#qsShieldStroke)"
        strokeWidth="12"
        strokeLinejoin="round"
        filter="url(#qsSubtleGlow)"
      />

      {/* Shield Inner Contour */}
      <path
        d="M 256 98 C 328 98 380 124 380 124 C 380 242 342 338 256 398 C 170 338 132 242 132 124 C 132 124 184 98 256 98 Z"
        fill="#080D17"
        opacity="0.9"
      />

      {/* TOP-RIGHT SWAP CHEVRON (Fast Right-Down Arrow) */}
      <path
        d="M 216 160 L 316 160 C 334 160 348 174 348 192 L 348 244 L 374 244 L 326 304 L 278 244 L 304 244 L 304 204 L 216 204 Z"
        fill="url(#qsSwapCyan)"
        filter="url(#qsGlow)"
      />

      {/* BOTTOM-LEFT SWAP CHEVRON (Fast Left-Up Arrow) */}
      <path
        d="M 296 344 L 196 344 C 178 344 164 330 164 312 L 164 260 L 138 260 L 186 200 L 234 260 L 208 260 L 208 300 L 296 300 Z"
        fill="url(#qsSwapBlue)"
        filter="url(#qsGlow)"
      />

      {/* Central Security Keyhole / Vault Core */}
      <circle cx="256" cy="242" r="14" fill="#38BDF8" filter="url(#qsGlow)" />
      <polygon points="251,250 261,250 264,272 248,272" fill="#38BDF8" filter="url(#qsGlow)" />
    </svg>
  );
};
