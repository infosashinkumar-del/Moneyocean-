import React, { useState } from 'react';
import { ArrowRight, Menu, X, ChevronRight, User as UserIcon, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MarketingPlanModal } from './MarketingPlanModal';
import { UltraPayLogo } from './UltraPayLogo';

interface NavbarProps {
  onNavigate: (route: string) => void;
  currentRoute: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentRoute }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMarketingModal, setShowMarketingModal] = useState(false);
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
          className="cursor-pointer"
        >
          <UltraPayLogo size="md" subtitle="Har Second Settlement, Seedha Bank Account Mein." />
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
          <button
            onClick={() => setShowMarketingModal(true)}
            className="text-sm font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-[#e5a93c]" />
            <span>Marketing Plan (PDF)</span>
          </button>
        </nav>

        {/* Action Buttons: Visible on both Desktop and Mobile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {authUser ? (
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-xl gold-btn-gradient font-bold text-xs sm:text-sm cursor-pointer shadow-md shadow-amber-500/15"
            >
              <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Dashboard</span>
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          ) : (
            <>
              {/* Direct Sign In Button visible on mobile & desktop */}
              <button
                onClick={() => onNavigate('login')}
                className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-slate-200 hover:text-[#e5a93c] bg-[#111726]/80 hover:bg-[#161f33] border border-slate-700/60 rounded-xl transition-all cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => onNavigate('signup')}
                className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-xl gold-btn-gradient font-bold text-xs sm:text-sm cursor-pointer shadow-md shadow-amber-500/20"
              >
                <span>Join <span className="hidden xs:inline">UltraPay</span></span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-[#0e131c] border border-slate-800 text-slate-400 hover:text-white"
            aria-label="Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setShowMarketingModal(true);
            }}
            className="flex items-center gap-2 w-full text-left py-2 text-base font-semibold text-amber-400 hover:text-amber-300"
          >
            <FileText className="w-4 h-4 text-[#e5a93c]" />
            <span>Marketing Plan (PDF)</span>
          </button>
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
      {/* Marketing Plan Presentation Modal */}
      <MarketingPlanModal 
        isOpen={showMarketingModal} 
        onClose={() => setShowMarketingModal(false)} 
      />
    </header>
  );
};
