import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Lock, 
  Check, 
  Zap, 
  X, 
  ShieldCheck, 
  Users, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { 
  getSlotPackages, 
  getUserActiveSlots, 
  getActiveUsersCount, 
  DEFAULT_SLOT_PACKAGES 
} from '../lib/supabase';
import { SlotPackage, UserSlot, User } from '../types';

interface OceanMatrixSlotsGridProps {
  user: User | null;
  onNavigateCheckout: (slotNumber?: number) => void;
}

// Custom 3D SVGs matching the reference image icons
const TridentLogo = () => (
  <svg viewBox="0 0 48 48" className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-[0_0_16px_rgba(245,158,11,0.7)]" fill="none">
    <path d="M24 3L27 12H21L24 3Z" fill="#fde047" />
    <path d="M11 9L14.5 17H8.5L11 9Z" fill="#f59e0b" />
    <path d="M37 9L39.5 17H33.5L37 9Z" fill="#f59e0b" />
    <path d="M11 17C11 25.5 21 28.5 21 34H27C27 28.5 37 25.5 37 17H31.5C31.5 22 26.5 24 24 24C21.5 24 16.5 22 16.5 17H11Z" fill="url(#trident-grad)" />
    <rect x="22" y="32" width="4" height="13" rx="1.5" fill="#f59e0b" />
    <circle cx="24" cy="46" r="2" fill="#ffd700" />
    <defs>
      <linearGradient id="trident-grad" x1="11" y1="9" x2="37" y2="34" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fef08a" />
        <stop offset="0.5" stopColor="#f59e0b" />
        <stop offset="1" stopColor="#b45309" />
      </linearGradient>
    </defs>
  </svg>
);

const SailingShip = () => (
  <svg viewBox="0 0 160 110" className="w-32 h-24 sm:w-40 sm:h-28 opacity-85 pointer-events-none drop-shadow-[0_0_12px_rgba(251,191,36,0.25)]" fill="currentColor">
    {/* Hull */}
    <path d="M25 82 C45 92, 120 92, 142 79 C147 75, 140 88, 120 91 C80 97, 30 94, 20 86 C18 84, 20 80, 25 82 Z" fill="#080e1a" />
    {/* Masts */}
    <rect x="52" y="26" width="3" height="58" fill="#040811" />
    <rect x="82" y="16" width="3.5" height="68" fill="#040811" />
    <rect x="112" y="30" width="2.5" height="54" fill="#040811" />
    {/* Sails backlit by sunset gold */}
    <path d="M53 30 C68 35, 68 50, 53 55 Z" fill="#0d172a" opacity="0.95" />
    <path d="M53 57 C70 63, 70 75, 53 80 Z" fill="#0d172a" opacity="0.95" />
    <path d="M83 20 C103 27, 103 45, 83 53 Z" fill="#14213d" opacity="0.95" />
    <path d="M83 55 C106 63, 106 77, 83 81 Z" fill="#14213d" opacity="0.95" />
    <path d="M113 35 C127 41, 127 55, 113 61 Z" fill="#0d172a" opacity="0.95" />
    <path d="M113 63 C125 69, 125 77, 113 81 Z" fill="#0d172a" opacity="0.95" />
    {/* Front Jib Sails */}
    <path d="M82 20 L145 76 L82 76 Z" fill="#081020" opacity="0.75" />
    {/* Rigging Lines */}
    <line x1="52" y1="26" x2="25" y2="82" stroke="#1e293b" strokeWidth="0.8" opacity="0.7" />
    <line x1="112" y1="30" x2="142" y2="79" stroke="#1e293b" strokeWidth="0.8" opacity="0.7" />
    {/* Pennant Flag */}
    <path d="M82 14 L73 18 L82 20 Z" fill="#f59e0b" />
  </svg>
);

// Slot 1: Teal Cyan Waves
const WaveIconCyan = () => (
  <svg viewBox="0 0 64 36" className="w-13 h-8 sm:w-15 sm:h-9 drop-shadow-[0_0_12px_#00f5d4]">
    <path d="M6 25 C14 13, 24 13, 32 23 C40 33, 50 31, 58 17 C54 19, 46 22, 40 17 C34 11, 24 11, 16 21 C12 25, 8 25, 6 25 Z" fill="#00f5d4" />
    <path d="M14 15 C20 7, 28 7, 34 14 C30 14, 24 11, 18 17 Z" fill="#5eead4" />
    <circle cx="28" cy="8" r="1.5" fill="#a7f3d0" />
    <circle cx="50" cy="13" r="1.2" fill="#5eead4" />
  </svg>
);

// Slot 2: Bronze Golden Waves
const WaveIconBronze = () => (
  <svg viewBox="0 0 64 36" className="w-13 h-8 sm:w-15 sm:h-9 drop-shadow-[0_0_12px_#f59e0b]">
    <path d="M6 25 C14 13, 24 13, 32 23 C40 33, 50 31, 58 17 C54 19, 46 22, 40 17 C34 11, 24 11, 16 21 C12 25, 8 25, 6 25 Z" fill="url(#bronze-fill)" />
    <path d="M14 15 C20 7, 28 7, 34 14 C30 14, 24 11, 18 17 Z" fill="#fde68a" />
    <circle cx="28" cy="8" r="1.5" fill="#fef08a" />
    <defs>
      <linearGradient id="bronze-fill" x1="0" y1="0" x2="64" y2="36" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fbbf24" />
        <stop offset="0.6" stopColor="#d97706" />
        <stop offset="1" stopColor="#92400e" />
      </linearGradient>
    </defs>
  </svg>
);

// Slot 3: Silver Oceanic Crest
const WaveIconSilver = () => (
  <svg viewBox="0 0 64 36" className="w-13 h-8 sm:w-15 sm:h-9 drop-shadow-[0_0_14px_#38bdf8]">
    <path d="M6 25 C14 13, 24 13, 32 23 C40 33, 50 31, 58 17 C54 19, 46 22, 40 17 C34 11, 24 11, 16 21 C12 25, 8 25, 6 25 Z" fill="url(#silver-fill)" />
    <path d="M14 15 C20 7, 28 7, 34 14 C30 14, 24 11, 18 17 Z" fill="#ffffff" />
    <circle cx="28" cy="8" r="1.5" fill="#ffffff" />
    <circle cx="48" cy="12" r="1.2" fill="#93c5fd" />
    <defs>
      <linearGradient id="silver-fill" x1="0" y1="0" x2="64" y2="36" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ffffff" />
        <stop offset="0.5" stopColor="#93c5fd" />
        <stop offset="1" stopColor="#475569" />
      </linearGradient>
    </defs>
  </svg>
);

// Slot 4: Coral Reef Wave
const CoralReefIcon = () => (
  <svg viewBox="0 0 64 38" className="w-13 h-8 sm:w-15 sm:h-9 drop-shadow-[0_0_14px_#f43f5e]">
    <path d="M6 26 C12 14, 22 14, 30 24 C38 34, 48 32, 58 18 C54 20, 46 23, 40 18 C34 12, 24 12, 16 22 C12 26, 8 26, 6 26 Z" fill="url(#coral-fill)" />
    <path d="M16 16 C22 8, 30 8, 36 15 C32 15, 26 12, 20 18 Z" fill="#fecdd3" />
    <circle cx="28" cy="8" r="1.5" fill="#fda4af" />
    <circle cx="48" cy="12" r="1.2" fill="#f43f5e" />
    <defs>
      <linearGradient id="coral-fill" x1="0" y1="0" x2="64" y2="38" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fb7185" />
        <stop offset="0.5" stopColor="#f43f5e" />
        <stop offset="1" stopColor="#be123c" />
      </linearGradient>
    </defs>
  </svg>
);

// Slot 5: 3D Stack of Gold Bars
const GoldBarsIcon = () => (
  <svg viewBox="0 0 64 46" className="w-13 h-9 sm:w-15 sm:h-10 drop-shadow-[0_0_14px_#fbbf24]">
    <path d="M8 30 L22 22 L48 22 L34 30 Z" fill="#fde047" />
    <path d="M8 30 L34 30 L34 38 L8 38 Z" fill="#ca8a04" />
    <path d="M34 30 L48 22 L48 30 L34 38 Z" fill="#a16207" />
    <path d="M22 30 L36 22 L58 22 L44 30 Z" fill="#fef08a" />
    <path d="M44 30 L58 22 L58 30 L44 38 Z" fill="#854d0e" />
    <path d="M16 18 L30 10 L52 10 L38 18 Z" fill="#fef9c3" />
    <path d="M16 18 L38 18 L38 26 L16 26 Z" fill="#eab308" />
    <path d="M38 18 L52 10 L52 18 L38 26 Z" fill="#ca8a04" />
  </svg>
);

// Slot 5: 3D Platinum Shimmering Pearl
const PearlIcon = () => (
  <svg viewBox="0 0 54 54" className="w-12 h-12 drop-shadow-[0_0_16px_rgba(255,255,255,0.8)]">
    <circle cx="27" cy="27" r="20" fill="url(#pearl-grad-disc)" />
    <ellipse cx="22" cy="19" rx="6" ry="3.5" fill="#ffffff" opacity="0.9" transform="rotate(-30 22 19)" />
    <circle cx="20" cy="17" r="1.8" fill="#ffffff" />
    <defs>
      <radialGradient id="pearl-grad-disc" cx="35%" cy="30%" r="70%">
        <stop stopColor="#ffffff" />
        <stop offset="0.35" stopColor="#e2e8f0" />
        <stop offset="0.7" stopColor="#94a3b8" />
        <stop offset="1" stopColor="#334155" />
      </radialGradient>
    </defs>
  </svg>
);

// Slot 6: 3D Sparkling Brilliant Diamond
const DiamondIcon = () => (
  <svg viewBox="0 0 56 46" className="w-12 h-10 drop-shadow-[0_0_16px_#c084fc]">
    <path d="M16 8 L40 8 L50 18 L28 40 L6 18 Z" fill="#a855f7" />
    <path d="M16 8 L40 8 L34 18 L22 18 Z" fill="#f3e8ff" />
    <path d="M16 8 L22 18 L6 18 Z" fill="#c084fc" />
    <path d="M40 8 L50 18 L34 18 Z" fill="#c084fc" />
    <path d="M6 18 L22 18 L28 40 Z" fill="#9333ea" />
    <path d="M22 18 L34 18 L28 40 Z" fill="#ffffff" />
    <path d="M34 18 L50 18 L28 40 Z" fill="#7e22ce" />
    <path d="M20 12 L22 8 L24 12 L28 14 L24 16 L22 20 L20 16 L16 14 Z" fill="#ffffff" opacity="0.95" />
  </svg>
);

// Slot 7: 3D Royal Imperial Crown
const CrownIcon = () => (
  <svg viewBox="0 0 56 44" className="w-13 h-10 drop-shadow-[0_0_18px_#facc15]">
    <path d="M6 32 L12 10 L22 22 L28 6 L34 22 L44 10 L50 32 Z" fill="url(#crown-gold-disc)" />
    <rect x="6" y="32" width="44" height="6" rx="2" fill="#d97706" />
    <circle cx="12" cy="9" r="2.5" fill="#fef08a" />
    <circle cx="28" cy="5" r="3" fill="#ffffff" />
    <circle cx="44" cy="9" r="2.5" fill="#fef08a" />
    <circle cx="16" cy="35" r="1.5" fill="#ef4444" />
    <circle cx="28" cy="35" r="2" fill="#38bdf8" />
    <circle cx="40" cy="35" r="1.5" fill="#10b981" />
    <defs>
      <linearGradient id="crown-gold-disc" x1="6" y1="6" x2="50" y2="36" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fef08a" />
        <stop offset="0.5" stopColor="#eab308" />
        <stop offset="1" stopColor="#b45309" />
      </linearGradient>
    </defs>
  </svg>
);

export const OceanMatrixSlotsGrid: React.FC<OceanMatrixSlotsGridProps> = ({
  user,
  onNavigateCheckout
}) => {
  const [slotPackages, setSlotPackages] = useState<SlotPackage[]>(DEFAULT_SLOT_PACKAGES);
  const [userSlots, setUserSlots] = useState<UserSlot[]>([]);
  const [activeUsersCount, setActiveUsersCount] = useState<number>(0);
  const [showHowItWorks, setShowHowItWorks] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    try {
      const [slots, uSlots, count] = await Promise.all([
        getSlotPackages(),
        user?.id ? getUserActiveSlots(user.id) : Promise.resolve([]),
        getActiveUsersCount()
      ]);

      if (slots && slots.length > 0) {
        setSlotPackages(slots);
      }
      setUserSlots(uSlots);
      setActiveUsersCount(count);
    } catch (err) {
      console.warn('Error loading slot data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id, user?.is_active]);

  const activeSlotSet = new Set<number>();
  if (userSlots && userSlots.length > 0) {
    userSlots.forEach((s) => {
      // ANY active slot (1 through 8) in user_slots is added to activeSlotSet
      if (s.is_active) activeSlotSet.add(Number(s.slot_number));
    });
  } else if (user?.is_active) {
    // If user is active in users table, they have initial Slot 1 activated
    activeSlotSet.add(1);
  }

  // Scroll handler for updating track bar
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) {
      setScrollProgress(0);
    } else {
      setScrollProgress(Math.min(100, Math.max(0, (scrollLeft / maxScroll) * 100)));
    }
  };

  const scrollLeft = () => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollBy({ left: -260, behavior: 'smooth' });
  };

  const scrollRight = () => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollBy({ left: 260, behavior: 'smooth' });
  };

  // Live 8-Slot Prices fallback (Slot 1: 500 to Slot 8: 50,000)
  const defaultSlotPrices: Record<number, number> = {
    1: 500,
    2: 1000,
    3: 1500,
    4: 2000,
    5: 5000,
    6: 10000,
    7: 25000,
    8: 50000
  };

  const getSlotPrice = (slotNum: number) => {
    const pkg = slotPackages.find((p) => p.slot_number === slotNum);
    return Number(pkg?.price || defaultSlotPrices[slotNum] || 500);
  };

  // Config mapping for each of the 8 live unlocked slots
  const slotDesigns = [
    {
      slot_number: 1,
      name: 'Starter Ocean',
      price: getSlotPrice(1),
      icon: <WaveIconCyan />,
      pillBorder: 'border-[#00e5ff]',
      pillText: 'text-[#00e5ff]',
      pillBg: 'bg-[#002d33]/90',
      ringGradient: 'from-[#00f5d4] via-[#00b4d8] to-[#0077b6]',
      glowShadow: 'shadow-[0_0_35px_rgba(0,245,212,0.45)]',
      centerBg: 'bg-gradient-to-b from-[#02181f] via-[#040e14] to-[#02060a]',
      btnActiveBg: 'bg-[#00382b] border-[#00f5d4] text-[#00f5d4] shadow-[0_0_18px_rgba(0,245,212,0.5)]',
      btnInactiveBg: 'bg-gradient-to-r from-[#00f5d4] to-[#00b4d8] text-slate-950 shadow-[0_0_20px_rgba(0,245,212,0.4)]',
      phase: 1
    },
    {
      slot_number: 2,
      name: 'Bronze Wave',
      price: getSlotPrice(2),
      icon: <WaveIconBronze />,
      pillBorder: 'border-[#10b981]',
      pillText: 'text-[#10b981]',
      pillBg: 'bg-[#022c22]/90',
      ringGradient: 'from-[#10b981] via-[#d97706] to-[#047857]',
      glowShadow: 'shadow-[0_0_35px_rgba(16,185,129,0.45)]',
      centerBg: 'bg-gradient-to-b from-[#1c1204] via-[#0c0d08] to-[#030604]',
      btnActiveBg: 'bg-[#02311f] border-[#10b981] text-[#34d399] shadow-[0_0_18px_rgba(16,185,129,0.5)]',
      btnInactiveBg: 'bg-gradient-to-r from-[#f59e0b] to-[#10b981] text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)]',
      phase: 1
    },
    {
      slot_number: 3,
      name: 'Silver Tide',
      price: getSlotPrice(3),
      icon: <WaveIconSilver />,
      pillBorder: 'border-[#38bdf8]',
      pillText: 'text-[#38bdf8]',
      pillBg: 'bg-[#082f49]/90',
      ringGradient: 'from-[#38bdf8] via-[#60a5fa] to-[#1d4ed8]',
      glowShadow: 'shadow-[0_0_35px_rgba(56,189,248,0.45)]',
      centerBg: 'bg-gradient-to-b from-[#08182b] via-[#060e1c] to-[#02050d]',
      btnActiveBg: 'bg-[#0c2e4e] border-[#38bdf8] text-[#38bdf8] shadow-[0_0_18px_rgba(56,189,248,0.5)]',
      btnInactiveBg: 'bg-gradient-to-r from-[#38bdf8] to-[#60a5fa] text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.4)]',
      phase: 1
    },
    {
      slot_number: 4,
      name: 'Coral Reef',
      price: getSlotPrice(4),
      icon: <CoralReefIcon />,
      pillBorder: 'border-[#f43f5e]',
      pillText: 'text-[#f43f5e]',
      pillBg: 'bg-[#4c0519]/90',
      ringGradient: 'from-[#fb7185] via-[#f43f5e] to-[#be123c]',
      glowShadow: 'shadow-[0_0_35px_rgba(244,63,94,0.45)]',
      centerBg: 'bg-gradient-to-b from-[#24060e] via-[#140307] to-[#080103]',
      btnActiveBg: 'bg-[#3e0816] border-[#f43f5e] text-[#fda4af] shadow-[0_0_18px_rgba(244,63,94,0.5)]',
      btnInactiveBg: 'bg-gradient-to-r from-[#fb7185] to-[#f43f5e] text-slate-950 shadow-[0_0_20px_rgba(244,63,94,0.4)]',
      phase: 1
    },
    {
      slot_number: 5,
      name: 'Gold Current',
      price: getSlotPrice(5),
      icon: <GoldBarsIcon />,
      pillBorder: 'border-[#fbbf24]',
      pillText: 'text-[#fbbf24]',
      pillBg: 'bg-[#451a03]/90',
      ringGradient: 'from-[#fbbf24] via-[#f59e0b] to-[#b45309]',
      glowShadow: 'shadow-[0_0_35px_rgba(251,191,36,0.45)]',
      centerBg: 'bg-gradient-to-b from-[#261504] via-[#140b02] to-[#070401]',
      btnActiveBg: 'bg-[#3b2306] border-[#fbbf24] text-[#fbbf24] shadow-[0_0_18px_rgba(251,191,36,0.5)]',
      btnInactiveBg: 'bg-gradient-to-r from-[#fde047] via-[#f59e0b] to-[#d97706] text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.5)]',
      phase: 1
    },
    {
      slot_number: 6,
      name: 'Platinum Pearl',
      price: getSlotPrice(6),
      icon: <PearlIcon />,
      pillBorder: 'border-[#3b82f6]',
      pillText: 'text-[#60a5fa]',
      pillBg: 'bg-[#172554]/90',
      ringGradient: 'from-[#60a5fa] via-[#2563eb] to-[#1e3a8a]',
      glowShadow: 'shadow-[0_0_35px_rgba(59,130,246,0.45)]',
      centerBg: 'bg-gradient-to-b from-[#0c1938] via-[#080f24] to-[#030612]',
      btnActiveBg: 'bg-[#0f2759] border-[#60a5fa] text-[#60a5fa] shadow-[0_0_18px_rgba(96,165,250,0.5)]',
      btnInactiveBg: 'bg-gradient-to-r from-[#38bdf8] via-[#2563eb] to-[#1d4ed8] text-white shadow-[0_0_20px_rgba(37,99,235,0.5)]',
      phase: 1
    },
    {
      slot_number: 7,
      name: 'Diamond Tsunami',
      price: getSlotPrice(7),
      icon: <DiamondIcon />,
      pillBorder: 'border-[#c084fc]',
      pillText: 'text-[#c084fc]',
      pillBg: 'bg-[#3b0764]/90',
      ringGradient: 'from-[#c084fc] via-[#a855f7] to-[#6b21a8]',
      glowShadow: 'shadow-[0_0_35px_rgba(192,132,252,0.45)]',
      centerBg: 'bg-gradient-to-b from-[#220738] via-[#120420] to-[#07010d]',
      btnActiveBg: 'bg-[#370c57] border-[#c084fc] text-[#c084fc] shadow-[0_0_18px_rgba(192,132,252,0.5)]',
      btnInactiveBg: 'bg-gradient-to-r from-[#e879f9] via-[#a855f7] to-[#7e22ce] text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]',
      phase: 1
    },
    {
      slot_number: 8,
      name: 'Crown Ocean',
      price: getSlotPrice(8),
      icon: <CrownIcon />,
      pillBorder: 'border-[#facc15]',
      pillText: 'text-[#facc15]',
      pillBg: 'bg-[#422006]/90',
      ringGradient: 'from-[#fef08a] via-[#eab308] to-[#854d0e]',
      glowShadow: 'shadow-[0_0_35px_rgba(250,204,21,0.45)]',
      centerBg: 'bg-gradient-to-b from-[#291703] via-[#170c01] to-[#080400]',
      btnActiveBg: 'bg-[#3d2407] border-[#facc15] text-[#facc15] shadow-[0_0_18px_rgba(250,204,21,0.5)]',
      btnInactiveBg: 'bg-gradient-to-r from-[#fef08a] via-[#f59e0b] to-[#b45309] text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)]',
      phase: 1
    }
  ];

  return (
    <div className="w-full rounded-3xl overflow-hidden relative border border-amber-500/40 shadow-2xl bg-[#040812]">
      {/* Cinematic Oceanic Sunset Background Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Ocean sky gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1528] via-[#07101f] to-[#02050b]" />

        {/* Golden Sunset Glow & Sunburst on the Right */}
        <div className="absolute -top-10 right-10 sm:right-32 w-72 sm:w-96 h-60 bg-gradient-to-b from-amber-400/25 via-amber-500/15 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-12 right-24 sm:right-48 w-8 h-8 rounded-full bg-[#fff4cc] shadow-[0_0_40px_20px_rgba(251,191,36,0.6)]" />

        {/* Sailing Galleon Ship Silhouette */}
        <div className="absolute top-4 right-6 sm:right-16 z-10 hidden sm:block">
          <SailingShip />
        </div>

        {/* Dramatic Ocean Waves Artwork Overlay */}
        <div className="absolute inset-x-0 bottom-0 h-40 opacity-35 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-cyan-900/40 via-blue-950/20 to-transparent" />
        <svg 
          className="absolute inset-x-0 bottom-0 w-full h-28 opacity-25 pointer-events-none" 
          preserveAspectRatio="none" 
          viewBox="0 0 1440 280"
        >
          <path 
            fill="#0ea5e9" 
            fillOpacity="0.4" 
            d="M0,160L48,176C96,192,192,224,288,218.7C384,213,480,171,576,165.3C672,160,768,192,864,208C960,224,1056,224,1152,197.3C1248,171,1344,117,1392,90.7L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
          <path 
            fill="#d97706" 
            fillOpacity="0.25" 
            d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,218.7C672,235,768,245,864,229.3C960,213,1056,171,1152,160C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
        </svg>

        {/* Light reflections & stars */}
        <div className="absolute bottom-2 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent blur-sm" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 p-5 sm:p-7 md:p-8 space-y-6">
        {/* Header Bar matching image */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <TridentLogo />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight font-display text-white">
                  OCEAN <span className="text-[#ffd000] drop-shadow-[0_0_15px_rgba(255,208,0,0.5)]">MATRIX SLOTS</span>
                </h2>
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-300 mt-0.5 flex items-center gap-1.5 font-sans">
                <span>8-Tier Multi-Slot System</span>
                <span className="text-amber-400">•</span>
                <span className="text-slate-300">Slide to explore all slots →</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            {/* "How It Works ?" pill button with neon cyan border */}
            <button
              onClick={() => setShowHowItWorks(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#07172b]/80 hover:bg-[#0b223d] border-2 border-[#00e5ff] text-white hover:text-[#00e5ff] text-xs sm:text-sm font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(0,229,255,0.35)] cursor-pointer backdrop-blur-md"
            >
              <div className="w-5 h-5 rounded-full bg-[#00e5ff] flex items-center justify-center text-slate-950">
                <Play className="w-2.5 h-2.5 fill-slate-950 ml-0.5" />
              </div>
              <span>How It Works ?</span>
            </button>
          </div>
        </div>

        {/* Carousel Container with Floating Left / Right Buttons */}
        <div className="relative group">
          {/* Left Arrow Button */}
          <button
            onClick={scrollLeft}
            aria-label="Previous slots"
            className="absolute -left-2 sm:-left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#071324]/90 hover:bg-[#0b1c36] border border-amber-500/50 text-white flex items-center justify-center shadow-xl shadow-black/80 transition-all hover:scale-105 cursor-pointer backdrop-blur-md"
          >
            <ChevronLeft className="w-6 h-6 text-amber-400" />
          </button>

          {/* Right Arrow Button */}
          <button
            onClick={scrollRight}
            aria-label="Next slots"
            className="absolute -right-2 sm:-right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#071324]/90 hover:bg-[#0b1c36] border border-amber-500/50 text-white flex items-center justify-center shadow-xl shadow-black/80 transition-all hover:scale-105 cursor-pointer backdrop-blur-md"
          >
            <ChevronRight className="w-6 h-6 text-amber-400" />
          </button>

          {/* Horizontal Scroll Track */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex items-stretch gap-4 sm:gap-5 overflow-x-auto no-scrollbar scroll-smooth py-3 px-1"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {slotDesigns.map((slot) => {
              const isActive = activeSlotSet.has(slot.slot_number);
              const isEligible = slot.slot_number === 1 || activeSlotSet.has(slot.slot_number - 1);
              const prerequisiteSlot = slot.slot_number - 1;

              return (
                <div
                  key={slot.slot_number}
                  style={{ scrollSnapAlign: 'start' }}
                  className={`flex-shrink-0 w-[215px] sm:w-[225px] flex flex-col items-center select-none ${
                    !isActive && !isEligible ? 'opacity-85' : 'opacity-100'
                  }`}
                >
                  {/* Top Pill Badge (e.g. "SLOT 1", "SLOT 2") */}
                  <div className={`px-4 py-1 rounded-full border-2 ${slot.pillBorder} ${slot.pillBg} ${slot.pillText} text-[11px] font-black tracking-wider uppercase font-mono shadow-lg relative z-20 -mb-3`}>
                    SLOT {slot.slot_number}
                  </div>

                  {/* Circular Concentric Glowing Portal / Disc */}
                  <div className={`w-[200px] h-[200px] sm:w-[210px] sm:h-[210px] rounded-full p-[3.5px] bg-gradient-to-b ${slot.ringGradient} ${
                    isActive || isEligible ? slot.glowShadow : 'shadow-none'
                  } flex items-center justify-center relative transition-transform duration-300 ${isEligible && !isActive ? 'hover:scale-[1.03]' : ''}`}>
                    {/* Inner Disc with Metallic Border & Dark Depth */}
                    <div className={`w-full h-full rounded-full ${slot.centerBg} border border-white/20 p-3 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-inner`}>
                      {/* Subtle Radial Specular Highlight at Top of Circle */}
                      <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-white/15 to-transparent rounded-t-full pointer-events-none" />

                      {/* Center Custom Icon */}
                      <div className="mb-1 flex items-center justify-center">
                        {slot.icon}
                      </div>

                      {/* Price from DB */}
                      <div className="text-xl sm:text-2xl font-black font-display text-white tracking-tight leading-none drop-shadow-md">
                        ₹{slot.price.toLocaleString('en-IN')}
                      </div>

                      {/* Slot Name */}
                      <div className="text-xs font-bold text-slate-300 mt-1 tracking-tight font-display">
                        {slot.name}
                      </div>

                      {/* Status indicator */}
                      {isActive ? (
                        <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 mt-1 uppercase tracking-wider">
                          <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                          <span>ACTIVE</span>
                        </div>
                      ) : isEligible ? (
                        <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-400 mt-1 uppercase tracking-wider">
                          <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span>UNLOCKED</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-400 mt-1 uppercase tracking-wider">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>LOCKED</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button Underneath Medallion */}
                  <div className="w-full px-2 mt-2.5">
                    {isActive ? (
                      <div className={`w-full py-2 rounded-full ${slot.btnActiveBg} border text-xs font-black tracking-wider uppercase font-mono flex items-center justify-center gap-1.5 shadow-lg`}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>ACTIVE ✅</span>
                      </div>
                    ) : isEligible ? (
                      <button
                        onClick={() => onNavigateCheckout(slot.slot_number)}
                        className={`w-full py-2 rounded-full ${slot.btnInactiveBg} font-black text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-95 transition-all cursor-pointer`}
                      >
                        <Zap className="w-3.5 h-3.5 fill-slate-950" />
                        <span>BUY / UNLOCK</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full py-2 rounded-full bg-slate-900/90 border border-slate-700/60 text-slate-400 font-bold text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-1.5 opacity-70 cursor-not-allowed shadow-none"
                        title={`Unlock Slot #${prerequisiteSlot} First`}
                      >
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>🔒 Unlock Slot #{prerequisiteSlot} First</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Carousel Slider Indicator & Progress Track */}
        <div className="pt-2 flex flex-col items-center gap-2.5">
          {/* Glowing Track Bar */}
          <div className="w-full max-w-xl h-2 rounded-full bg-[#06101d] border border-[#12253f] overflow-hidden p-0.5 shadow-inner">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-[#00e5ff] via-[#38bdf8] to-[#00f5d4] transition-all duration-300 shadow-[0_0_12px_#00e5ff]"
              style={{ 
                width: `${Math.max(15, scrollProgress)}%`,
                marginLeft: `${(scrollProgress * 0.85)}%` 
              }}
            />
          </div>

          {/* Dot Pagination */}
          <div className="flex items-center gap-2">
            {[0, 20, 40, 60, 80, 100].map((step, idx) => (
              <span
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  Math.abs(scrollProgress - step) < 18 
                    ? 'bg-[#00e5ff] scale-125 shadow-[0_0_6px_#00e5ff]' 
                    : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* "How It Works ?" Modal */}
      {showHowItWorks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-2xl bg-gradient-to-b from-[#0b121e] to-[#050912] border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 relative shadow-2xl space-y-6 text-white max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setShowHowItWorks(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <TridentLogo />
              <div>
                <h3 className="text-xl sm:text-2xl font-black font-display text-white">
                  Ocean Matrix 8-Tier Protocol
                </h3>
                <p className="text-xs sm:text-sm text-amber-300 font-mono">
                  Autonomous Peer-to-Peer 100% Direct Payouts
                </p>
              </div>
            </div>

            {/* 8 Slots Price & Payout Table */}
            <div className="space-y-2 font-mono text-xs">
              <div className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                8-Slot Pricing & Direct P2P Yield Table
              </div>
              <div className="rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800/80 bg-[#070b14]">
                {slotDesigns.map((s) => (
                  <div key={s.slot_number} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.pillBg} ${s.pillText} border ${s.pillBorder}`}>
                        SLOT #{s.slot_number}
                      </span>
                      <span className="font-bold text-white">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-amber-300 font-black text-sm">₹{s.price.toLocaleString('en-IN')}</span>
                      {activeSlotSet.has(s.slot_number) ? (
                        <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40">
                          Active ✅
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setShowHowItWorks(false);
                            onNavigateCheckout(s.slot_number);
                          }}
                          className="text-[10px] text-amber-300 font-bold px-2.5 py-1 rounded bg-amber-950/80 border border-amber-500/40 hover:bg-amber-900 transition-colors"
                        >
                          BUY / UNLOCK
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                onClick={() => setShowHowItWorks(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowHowItWorks(false);
                  onNavigateCheckout(1);
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl gold-btn-gradient text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                Go to Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
