'use client';

import React from 'react';
import { DENVEX_LOGO_DATA_URI } from '@/lib/logoData';

interface DenvexLogoProps {
  className?: string;
  size?: number | string;
  style?: React.CSSProperties;
}

export default function DenvexLogo({ className = 'w-10 h-10', size, style }: DenvexLogoProps) {
  const inlineStyle: React.CSSProperties = {
    borderRadius: '12px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: '#0B2A5B',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    ...style,
    ...(size ? { width: size, height: size } : {}),
  };

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-xl bg-[#0B2A5B] flex items-center justify-center ${className}`}
      style={inlineStyle}
    >
      <img
        src={DENVEX_LOGO_DATA_URI}
        alt="DenveX Logo"
        className="w-full h-full object-cover block"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  );
}
