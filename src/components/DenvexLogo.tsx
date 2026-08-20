import React from 'react';

interface DenvexLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  variant?: 'light' | 'dark';
}

export const DenvexLogo: React.FC<DenvexLogoProps> = ({
  size = 36,
  className = '',
  showText = false,
  variant = 'light',
}) => {
  const isDarkBg = variant === 'dark';

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
          borderRadius: `${Math.round(size * 0.24)}px`,
          boxShadow: isDarkBg ? '0 2px 8px rgba(0, 0, 0, 0.4)' : '0 2px 8px rgba(8, 24, 50, 0.25)',
          flexShrink: 0,
        }}
      >
        <rect width="100" height="100" rx="20" fill={isDarkBg ? '#132a4e' : '#081832'} />
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
            fontSize: '1.3rem',
            letterSpacing: '-0.03em',
            display: 'flex',
            alignItems: 'center',
            color: isDarkBg ? '#ffffff' : 'var(--slate-900)',
          }}
        >
          <span>Denve</span>
          <span style={{ color: isDarkBg ? '#60a5fa' : 'var(--primary-600)' }}>X</span>
        </span>
      )}
    </div>
  );
};
