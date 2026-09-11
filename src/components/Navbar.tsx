import React, { useState } from 'react';
import { Waves, ArrowRight, Menu, X, ChevronRight, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onNavigate: (route: string) => void;
  currentRoute: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentRoute }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { authUser } = useAuth();

  const navLinks = [
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'Pass-Up System', id: 'how-it-works' },
    { label: 'Mission & Vision', id: 'mission-vision' },
    { label: 'FAQ', id: 'faq' }
  ];

  const handleScrollTo = (sectionId: string) => {
    setMobileMenuOpen(false);
    if (currentRoute !== 'landing') {
      onNavigate('landing');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } else {
      const el = document.getElementById(sectionId);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#07090e]/95 border-b border-[#1b2230]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo */}
        <div 
          onClick={() => onNavigate('landing')} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#d8a83d] via-[#f1c550] to-[#c89228] p-0.5 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-all">
            <div className="w-full h-full bg-[#07090e] rounded-[10px] flex items-center justify-center">
              <Waves className="w-6 h-6 text-[#e5a93c] group-hover:text-amber-300 transition-colors" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-1.5">
              Money<span className="text-[#e5a93c]">Ocean</span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-[#e5a93c] border border-amber-500/30 font-mono font-semibold">P2P</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium tracking-wide">Autonomous Wealth Protocol</span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link, idx) => (
            <button
              key={idx}
              onClick={() => handleScrollTo(link.id)}
              className="text-sm font-medium text-slate-300 hover:text-[#e5a93c] transition-colors cursor-pointer"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          {authUser ? (
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl gold-btn-gradient font-bold text-sm cursor-pointer"
            >
              <UserIcon className="w-4 h-4" />
              <span>Go to Dashboard</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                onClick={() => onNavigate('login')}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => onNavigate('signup')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl gold-btn-gradient font-bold text-sm cursor-pointer"
              >
                <span>Join MoneyOcean</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-[#0e131c] border border-slate-800 text-slate-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0a0e16] border-b border-[#1b2230] px-4 pt-3 pb-6 space-y-3">
          {navLinks.map((link, idx) => (
            <button
              key={idx}
              onClick={() => handleScrollTo(link.id)}
              className="block w-full text-left py-2 text-base font-medium text-slate-200 hover:text-[#e5a93c]"
            >
              {link.label}
            </button>
          ))}
          <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
            {authUser ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('dashboard');
                }}
                className="w-full py-3 rounded-xl gold-btn-gradient font-bold text-center"
              >
                Open Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('login');
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#111722] border border-slate-700 text-white font-medium text-center"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('signup');
                  }}
                  className="w-full py-3 rounded-xl gold-btn-gradient font-bold text-center"
                >
                  Create Account
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
