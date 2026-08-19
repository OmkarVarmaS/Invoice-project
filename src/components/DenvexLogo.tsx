import React from 'react';

interface DenvexLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const DenvexLogo: React.FC<DenvexLogoProps> = ({
  size = 36,
  className = '',
  showText = false,
}) => {
  return (
    <div
      className={`denvex-logo-wrapper ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          borderRadius: `${Math.round(size * 0.22)}px`,
          boxShadow: '0 2px 8px rgba(8, 24, 50, 0.25)',
          flexShrink: 0,
        }}
      >
        <rect width="100" height="100" rx="20" fill="#081832" />
        {/* Top Right Crossing Slash */}
        <line
          x1="68"
          y1="19"
          x2="53"
          y2="38"
          stroke="#ffffff"
          strokeWidth="6.5"
          strokeLinecap="round"
        />
        {/* Main Monogram D/X Loop */}
        <path
          d="M34 26 L67 26 C79 26 84 38 74 50 C66 59 52 59 40 59"
          stroke="#ffffff"
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Left Arrow Notch */}
        <path
          d="M31 38 L42 48 L35 59"
          stroke="#ffffff"
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Bottom Divergent Legs */}
        <path
          d="M40 59 L27 80 M52 59 L76 80"
          stroke="#ffffff"
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {showText && (
        <span
          style={{
            fontWeight: 800,
            fontSize: '1.25rem',
            color: 'var(--slate-900)',
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#081832' }}>Denvex</span>
          <span style={{ color: 'var(--primary-600)' }}>Invoice</span>
        </span>
      )}
    </div>
  );
};
