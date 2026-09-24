import React, { useState, useRef, useEffect } from 'react';
import { Zap, ShieldCheck, ArrowUpRight, CheckCircle2, Sparkles } from 'lucide-react';

interface ThreeDMatrixCardProps {
  unitPrice: number;
  onJoinClick?: () => void;
}

export const ThreeDMatrixCard: React.FC<ThreeDMatrixCardProps> = ({ unitPrice, onJoinClick }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState<number>(0);
  const [rotateY, setRotateY] = useState<number>(0);
  const [glarePosition, setGlarePosition] = useState<{ x: number; y: number; opacity: number }>({ x: 50, y: 50, opacity: 0 });
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [livePulse, setLivePulse] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth < 768 || 
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
      );
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLivePulse((prev) => (prev + 1) % 3);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only apply 3D tilt on desktop (non-touch) viewports
    if (isMobile || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Controlled subtle tilt angles (limit to -10deg to +10deg)
    const rotX = -((y - centerY) / centerY) * 10;
    const rotY = ((x - centerX) / centerX) * 12;
    
    setRotateX(rotX);
    setRotateY(rotY);
    setGlarePosition({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.2
    });
  };

  const handleMouseEnter = () => {
    if (!isMobile) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
    setGlarePosition((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div 
      className={`${!isMobile ? 'md:perspective-1000' : ''} w-full max-w-[460px] mx-auto select-none`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        ref={cardRef}
        style={{
          transform: (!isMobile && isHovered) 
            ? `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)` 
            : undefined
        }}
        className={`relative rounded-[28px] sm:rounded-[32px] p-5 sm:p-7 bg-gradient-to-br from-[#0c121e] via-[#080d16] to-[#050810] border border-amber-500/30 card-3d-glow transition-transform duration-200 ease-out cursor-pointer ${
          !isMobile ? 'md:preserve-3d animate-float-3d' : ''
        }`}
        onClick={onJoinClick}
      >
        {/* Dynamic 3D Glare Light Reflection on Desktop */}
        {!isMobile && (
          <div 
            className="absolute inset-0 rounded-[32px] pointer-events-none transition-opacity duration-300"
            style={{
              opacity: glarePosition.opacity,
              background: `radial-gradient(circle 300px at ${glarePosition.x}% ${glarePosition.y}%, rgba(246, 203, 86, 0.3), transparent 70%)`
            }}
          />
        )}

        {/* Ambient Corner Glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 blur-3xl pointer-events-none" />

        {/* Card Header Layer */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#1c2639]">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Rotating Golden Badge */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-[#dfa938] via-[#ffd269] to-[#c99326] p-0.5 shadow-md shadow-amber-500/25 shrink-0">
              <div className="w-full h-full bg-[#07090e] rounded-[13px] flex items-center justify-center animate-coin-3d">
                <span className="font-extrabold text-[11px] sm:text-xs text-amber-400 font-display tracking-tight">UP</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-sm sm:text-base font-extrabold text-white font-display tracking-wide">
                  Ultra<span className="gold-gradient-text">Pay</span>
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                  LIVE PROTOCOL
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono">100% Peer-to-Peer Smart Settlement</span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] sm:text-[11px] font-mono text-amber-400/90 font-semibold block">2-Up Matrix</span>
            <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono">Zero Middleman</span>
          </div>
        </div>

        {/* Main Balance & Settlement Depth */}
        <div className="my-4 sm:my-5 p-4 sm:p-5 rounded-2xl bg-[#070b14]/90 border border-amber-500/25 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Instant P2P Payout</span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Direct UPI
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <div className="text-2xl sm:text-4xl font-extrabold font-display gold-gradient-text tracking-tight tabular-nums">
              ₹{unitPrice.toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] sm:text-xs font-mono text-slate-400">/ per direct sale</span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <span className="text-slate-500 text-[10px] block">Downline Pass-Ups</span>
              <span className="text-amber-300 font-bold text-[11px] sm:text-xs">1st & 3rd Sales</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Direct Retention</span>
              <span className="text-emerald-400 font-bold text-[11px] sm:text-xs">100% on #2, #4+</span>
            </div>
          </div>
        </div>

        {/* Pipeline Simulation */}
        <div className="space-y-2">
          <div className="text-[10px] sm:text-[11px] font-mono text-slate-400 flex justify-between items-center px-1">
            <span>Autonomous Ledger Flow</span>
            <span className="text-amber-400 text-[10px] font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Real-time Verification
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center text-xs font-mono">
            <div className={`p-2 sm:p-2.5 rounded-xl border transition-all duration-300 ${
              livePulse === 0 
                ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md shadow-amber-500/20' 
                : 'bg-[#060a12] border-slate-800 text-slate-400'
            }`}>
              <div className="text-[9px] sm:text-[10px] text-slate-500">Node #1</div>
              <div className="font-bold text-[11px] sm:text-xs mt-0.5">Sale #1</div>
              <div className="text-[8px] sm:text-[9px] text-amber-400 mt-0.5">Pass-Up</div>
            </div>

            <div className={`p-2 sm:p-2.5 rounded-xl border transition-all duration-300 ${
              livePulse === 1 
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-md shadow-emerald-500/20' 
                : 'bg-[#060a12] border-slate-800 text-slate-400'
            }`}>
              <div className="text-[9px] sm:text-[10px] text-slate-500">Node #2</div>
              <div className="font-bold text-[11px] sm:text-xs mt-0.5">Sale #2</div>
              <div className="text-[8px] sm:text-[9px] text-emerald-400 mt-0.5">Keep 100%</div>
            </div>

            <div className={`p-2 sm:p-2.5 rounded-xl border transition-all duration-300 ${
              livePulse === 2 
                ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md shadow-amber-500/20' 
                : 'bg-[#060a12] border-slate-800 text-slate-400'
            }`}>
              <div className="text-[9px] sm:text-[10px] text-slate-500">Node #3</div>
              <div className="font-bold text-[11px] sm:text-xs mt-0.5">Sale #3</div>
              <div className="text-[8px] sm:text-[9px] text-amber-400 mt-0.5">Pass-Up</div>
            </div>
          </div>
        </div>

        {/* Footer Action Layer */}
        <div className="mt-4 sm:mt-5 pt-3.5 border-t border-[#1c2639] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>ZapUPI Powered</span>
          </div>

          <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 group-hover:text-amber-300 transition-colors">
            <span>{isMobile ? '⚡ Direct Earning ID' : 'Hover to Tilt 3D'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
