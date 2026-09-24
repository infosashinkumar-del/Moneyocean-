import React from 'react';

interface UltraPayLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showSubtitle?: boolean;
  subtitle?: string;
  className?: string;
  variant?: 'horizontal' | 'vertical';
}

export const UltraPayLogo: React.FC<UltraPayLogoProps> = ({
  size = 'md',
  showText = true,
  showSubtitle = true,
  subtitle = 'Har Second Settlement, Seedha Bank Account Mein.',
  className = '',
  variant = 'horizontal'
}) => {
  const iconSizeClasses = {
    xs: 'w-7 h-7 rounded-lg',
    sm: 'w-9 h-9 rounded-xl',
    md: 'w-11 h-11 rounded-[14px]',
    lg: 'w-14 h-14 rounded-2xl',
    xl: 'w-16 h-16 rounded-[22px]'
  };

  const svgDimensions = {
    xs: 20,
    sm: 24,
    md: 28,
    lg: 36,
    xl: 42
  };

  const titleSizeClasses = {
    xs: 'text-sm',
    sm: 'text-base',
    md: 'text-xl sm:text-2xl',
    lg: 'text-2xl sm:text-3xl',
    xl: 'text-3xl sm:text-4xl'
  };

  const subtitleSizeClasses = {
    xs: 'text-[8.5px]',
    sm: 'text-[9.5px]',
    md: 'text-[11px] sm:text-xs',
    lg: 'text-xs sm:text-sm',
    xl: 'text-sm'
  };

  const badgeSizeClasses = {
    xs: 'text-[8px] px-1 py-0.2',
    sm: 'text-[8.5px] px-1.5 py-0.5',
    md: 'text-[9px] px-2 py-0.5',
    lg: 'text-[10px] px-2.5 py-0.5',
    xl: 'text-xs px-3 py-1'
  };

  return (
    <div 
      className={`select-none group ${
        variant === 'vertical' 
          ? 'flex flex-col items-center text-center gap-3' 
          : 'flex items-center gap-3'
      } ${className}`}
    >
      {/* Precision Modern Luxury Fintech Emblem */}
      <div 
        className={`${iconSizeClasses[size]} relative p-[1.5px] bg-gradient-to-br from-[#FFF4CC] via-[#F59E0B] to-[#78350F] shadow-lg shadow-amber-500/25 group-hover:shadow-amber-500/40 group-hover:scale-105 transition-all duration-300 shrink-0`}
      >
        <div className="w-full h-full bg-gradient-to-br from-[#0c121e] via-[#080d16] to-[#04060b] rounded-[inherit] flex items-center justify-center relative overflow-hidden">
          {/* Subtle Ambient Radial Backlight */}
          <div className="absolute inset-0 bg-radial from-amber-400/30 via-amber-500/5 to-transparent pointer-events-none" />

          {/* Precision SVG Monogram: Interlocking Modern 'U' Shield + Lightning Settlement Bolt + Direct Bank Arrow */}
          <svg
            width={svgDimensions[size]}
            height={svgDimensions[size]}
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="relative z-10 transition-transform duration-300 group-hover:scale-105"
          >
            <defs>
              {/* Premium 24K Gold Gradient */}
              <linearGradient id="upGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="25%" stopColor="#FDE68A" />
                <stop offset="65%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>

              {/* High Velocity Electric Settlement Bolt Gradient */}
              <linearGradient id="upBoltSpeedGrad" x1="10%" y1="0%" x2="90%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="35%" stopColor="#FEF08A" />
                <stop offset="70%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>

              {/* Subtle Bank Flow Emerald Gradient */}
              <linearGradient id="upEmeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6EE7B7" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>

              {/* Specular Glow Filter */}
              <filter id="upGoldenGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#F59E0B" floodOpacity="0.5" />
              </filter>
            </defs>

            {/* Stylized Modern Outer 'U' Crest & Flow Ribbon */}
            <path
              d="M8 8V20C8 26.6274 13.3726 32 20 32C26.6274 32 32 26.6274 32 20V8"
              stroke="url(#upGoldGrad)"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.95"
            />

            {/* Dual Crown Notches */}
            <path
              d="M11 8H14M26 8H29"
              stroke="url(#upGoldGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Lightning Fast Direct Settlement Bolt */}
            <path
              d="M21.5 5.5L12 19.5H19.5L16.5 32.5L28.5 16.5H20.5L21.5 5.5Z"
              fill="url(#upBoltSpeedGrad)"
              filter="url(#upGoldenGlow)"
            />

            {/* Realtime Bank Settlement Success Node */}
            <circle cx="29.5" cy="10.5" r="2.2" fill="url(#upEmeraldGrad)" />
            <circle cx="29.5" cy="10.5" r="3.2" stroke="#10B981" strokeWidth="0.8" opacity="0.6" />
          </svg>
        </div>
      </div>

      {/* Brand Typography & Tagline Lockup */}
      {showText && (
        <div className={`flex flex-col leading-tight min-w-0 ${variant === 'vertical' ? 'items-center' : ''}`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`${titleSizeClasses[size]} font-black font-display tracking-tight text-white flex items-center`}>
              Ultra<span className="bg-gradient-to-r from-[#FFE58F] via-[#F59E0B] to-[#E5A93C] bg-clip-text text-transparent ml-0.5">Pay</span>
            </span>
            
            {/* Live Instant P2P Tag */}
            <span className={`inline-flex items-center gap-1 rounded-md bg-amber-500/15 text-[#E5A93C] border border-amber-500/35 font-mono font-bold tracking-wide uppercase ${badgeSizeClasses[size]}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Instant P2P</span>
            </span>
          </div>

          {/* Official Tagline: "Har Second Settlement, Seedha Bank Account Mein." */}
          {showSubtitle && subtitle && (
            <p className={`${subtitleSizeClasses[size]} font-medium text-amber-200/90 tracking-wide mt-1 line-clamp-1`}>
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
