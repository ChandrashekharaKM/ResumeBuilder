import React from 'react';
import logoUrl from '../assets/logo.jpg';

interface LogoProps {
  size?: number;
  full?: boolean;
  style?: React.CSSProperties;
}

export default function Logo({ size = 36, full = false, style }: LogoProps) {
  if (full) {
    // Render the complete brand image (landscape)
    return (
      <img 
        src={logoUrl} 
        alt="HoldMyResume Logo" 
        style={{ 
          height: size, 
          width: 'auto', 
          objectFit: 'contain',
          display: 'inline-block',
          ...style 
        }} 
      />
    );
  }

  // Render ONLY the circular graphic emblem cropped from the logo image.
  // The circle diameter is ~43.4% of the height and centered at (50%, 37%).
  // Applying scale parameters: height 230%, width 434%, top -35%, left -167%.
  return (
    <div 
      style={{ 
        width: size, 
        height: size, 
        borderRadius: '50%', 
        overflow: 'hidden', 
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.08)',
        flexShrink: 0,
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
        ...style
      }}
    >
      <img 
        src={logoUrl} 
        alt="HoldMyResume Icon" 
        style={{ 
          position: 'absolute',
          top: '-35%', 
          left: '-167%', 
          width: '434%', 
          height: '230%',
          maxWidth: 'none',
          objectFit: 'fill'
        }} 
      />
    </div>
  );
}
