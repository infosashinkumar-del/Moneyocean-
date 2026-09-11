import React, { useState, useEffect, useMemo } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badge?: string;
  badgeType?: 'success' | 'info' | 'warning';
  trend?: string;
  variant?: 'cyan' | 'emerald' | 'purple' | 'amber';
}

function useAnimatedValue(targetValue: string | number, duration: number = 1000): string {
  // Parse numeric component and prefix/suffix
  const { prefix, numericTarget, suffix, isNumeric } = useMemo(() => {
    if (typeof targetValue === 'number') {
      return { prefix: '', numericTarget: targetValue, suffix: '', isNumeric: true };
    }
    const str = String(targetValue).trim();
    // Check if contains currency like ₹ or $
    const match = str.match(/^([^\d-]*)([\d,]+(?:\.\d+)?)(.*)$/);
    if (match) {
      const p = match[1];
      const num = parseFloat(match[2].replace(/,/g, ''));
      const s = match[3];
      if (!isNaN(num)) {
        return { prefix: p, numericTarget: num, suffix: s, isNumeric: true };
      }
    }
    return { prefix: '', numericTarget: 0, suffix: '', isNumeric: false };
  }, [targetValue]);

  const [currentNumber, setCurrentNumber] = useState<number>(0);

  useEffect(() => {
    if (!isNumeric) return;
    if (numericTarget === 0) {
      setCurrentNumber(0);
      return;
    }

    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Cubic ease-out
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const val = easeOut * numericTarget;
      setCurrentNumber(Math.round(val));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCurrentNumber(numericTarget);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [numericTarget, duration, isNumeric]);

  if (!isNumeric) {
    return String(targetValue);
  }

  return `${prefix}${currentNumber.toLocaleString('en-IN')}${suffix}`;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  badgeType = 'success',
  variant = 'cyan'
}) => {
  const animatedDisplayValue = useAnimatedValue(value, 1100);

  const variantStyles = {
    cyan: {
      border: 'border-[#1e2a40] hover:border-cyan-500/50',
      iconBg: 'bg-cyan-950/60 border-cyan-500/30 text-cyan-400',
      glow: 'shadow-cyan-950/20',
      textAccent: 'text-cyan-400'
    },
    emerald: {
      border: 'border-emerald-500/30 hover:border-emerald-400/60',
      iconBg: 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400',
      glow: 'shadow-emerald-950/30',
      textAccent: 'text-emerald-400'
    },
    purple: {
      border: 'border-purple-500/25 hover:border-purple-400/50',
      iconBg: 'bg-purple-950/60 border-purple-500/30 text-purple-400',
      glow: 'shadow-purple-950/20',
      textAccent: 'text-purple-400'
    },
    amber: {
      border: 'border-amber-500/35 hover:border-amber-400/60',
      iconBg: 'bg-amber-950/60 border-amber-500/40 text-amber-400',
      glow: 'shadow-amber-950/30',
      textAccent: 'text-amber-400'
    }
  };

  const style = variantStyles[variant];

  return (
    <div className={`p-5 rounded-3xl bg-[#0c1017]/90 backdrop-blur-xl border ${style.border} shadow-xl ${style.glow} transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
            {title}
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-display text-white mt-1 tracking-tight tabular-nums">
            {animatedDisplayValue}
          </div>
        </div>

        <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${style.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[#1c2436] text-xs text-slate-400">
        <span>{subtitle || 'Real-time ledger sync'}</span>
        {badge && (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
            badgeType === 'success' 
              ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-500/40' 
              : badgeType === 'warning'
              ? 'bg-amber-950/90 text-amber-300 border border-amber-500/40'
              : 'bg-cyan-950/90 text-cyan-400 border border-cyan-500/40'
          }`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
};
