import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { showToast } from './Toast';

interface ReferralCardProps {
  onNavigateCheckout?: () => void;
  className?: string;
}

export const ReferralCard: React.FC<ReferralCardProps> = ({
  onNavigateCheckout,
  className = ''
}) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const referralUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/register?ref=${user.referral_code || ''}`
    : `https://moneyocean.live/register?ref=${user.referral_code || ''}`;

  const handleCopy = () => {
    if (!user.referral_code) return;
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    showToast('success', 'Referral link copied!', referralUrl);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleActivateClick = () => {
    if (onNavigateCheckout) {
      onNavigateCheckout();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/checkout';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {user.is_active ? (
        // Agar ID ACTIVE hai: Asli link dikhao aur copy karne do
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Aapka Referral Link (Active)</span>
            </p>
            <span className="text-[10px] font-mono text-emerald-300/80 bg-emerald-900/40 px-2 py-0.5 rounded border border-emerald-500/20">
              Code: #{user.referral_code}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              readOnly 
              value={referralUrl}
              className="bg-black/50 border border-emerald-500/20 px-3 py-2 rounded-xl text-sm w-full text-white font-mono focus:outline-none select-all"
            />
            <button 
              onClick={handleCopy}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-md shadow-emerald-500/20 active:scale-95"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>
      ) : (
        // Agar ID INACTIVE hai: Lock dikhao aur Activate button do
        <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-2xl flex flex-col gap-3 shadow-lg">
          <div className="flex items-center gap-2 text-amber-400">
            <span className="text-xl">🔒</span>
            <p className="text-sm font-medium">
              Referral Link Locked: Aage refer karne ke liye pehle apni ID activate karein.
            </p>
          </div>
          <button 
            onClick={handleActivateClick}
            className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-bold py-2.5 px-4 rounded-xl text-sm w-full transition-all cursor-pointer shadow-md shadow-amber-500/20 active:scale-[0.99]"
          >
            Pay & Activate Now
          </button>
        </div>
      )}
    </div>
  );
};
