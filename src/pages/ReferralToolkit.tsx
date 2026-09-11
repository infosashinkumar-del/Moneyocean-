import React, { useState } from 'react';
import { 
  Share2, 
  Copy, 
  Check, 
  Send, 
  QrCode, 
  MessageSquare, 
  Sparkles 
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';
import { getLiveReferralUrl } from '../lib/supabase';
import { ReferralCard } from '../components/ReferralCard';

interface ReferralToolkitProps {
  onNavigateCheckout?: () => void;
}

export const ReferralToolkit: React.FC<ReferralToolkitProps> = ({ onNavigateCheckout }) => {
  const { user, packagePrice } = useAuth();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCopyIndex, setCopiedCopyIndex] = useState<number | null>(null);
  
  const unitPrice = packagePrice;
  const referralCode = user?.referral_code || '';
  const cleanReferralUrl = getLiveReferralUrl(referralCode);

  const handleCopy = (text: string, isMainLink = false, index?: number) => {
    navigator.clipboard.writeText(text);
    if (isMainLink) {
      setCopiedLink(true);
      showToast('success', 'Referral Link Copied!', text);
      setTimeout(() => setCopiedLink(false), 2500);
    } else if (typeof index === 'number') {
      setCopiedCopyIndex(index);
      showToast('success', 'Swipe Copy Copied!', 'Ready to paste in your chat or status.');
      setTimeout(() => setCopiedCopyIndex(null), 2500);
    }
  };

  const promoCopies = [
    {
      title: 'High-Conversion Direct WhatsApp Pitch',
      badge: 'Highest ROI',
      text: `🚀 *MoneyOcean - P2P Wealth Generation Protocol* 🌊\n\nI just started with MoneyOcean and earned direct ₹${unitPrice.toLocaleString('en-IN')} P2P payments settled in seconds straight to my UPI!\n\n🔹 100% Peer-to-Peer Direct Payments\n🔹 1st & 3rd Pass-Up Downline Multiplier\n🔹 No company holding funds — direct UPI\n\n👉 *Join my team today and activate your earning node:* ${cleanReferralUrl}\n\nLet's grow community wealth together! 🤝`
    },
    {
      title: 'Telegram & Social Community Broadcast',
      badge: 'Viral Broadcast',
      text: `🌊 *New Decentralized P2P Affiliate System: MoneyOcean*\n\nStop relying on delayed company payouts. MoneyOcean settles ₹${unitPrice.toLocaleString('en-IN')} per package instantly into your bank account via UPI.\n\n💎 100% Direct ₹${unitPrice.toLocaleString('en-IN')} Payouts\n⚡ Automated 1st & 3rd Pass-Up Algorithm\n🛡️ Transparent Ledger\n\nJoin with my referral link: ${cleanReferralUrl}`
    },
    {
      title: 'Short & Punchy Status / Story Swipe',
      badge: 'Quick Story',
      text: `Earn ₹${unitPrice.toLocaleString('en-IN')} per direct referral straight into your UPI account with MoneyOcean P2P. Instant settlements, 0 middlemen. Join here: ${cleanReferralUrl}`
    }
  ];

  const handleShareWhatsApp = (customText?: string) => {
    const textToShare = customText || promoCopies[0].text;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(textToShare)}`;
    window.open(url, '_blank');
  };

  const handleShareTelegram = (customText?: string) => {
    const textToShare = customText || promoCopies[1].text;
    const url = `https://t.me/share/url?url=${encodeURIComponent(cleanReferralUrl)}&text=${encodeURIComponent(textToShare)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-8">
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0b0f19] via-[#101726] to-[#07090e] border border-[#1e2a40] shadow-2xl relative overflow-hidden">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-300 text-xs font-mono font-semibold">
            <Share2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Referral Acceleration Engine</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-white tracking-tight">
            Your Personal Affiliate Toolkit
          </h2>
          <p className="text-sm text-slate-300">
            Share your unique clean link, auto-capture referral landing leads, and broadcast proven high-conversion copy.
          </p>
        </div>
      </div>

      {/* Referral Status & Link Activation Card */}
      <ReferralCard onNavigateCheckout={onNavigateCheckout} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-6 sm:p-8 rounded-3xl bg-[#0c1017]/90 backdrop-blur-xl border border-[#1c2436] shadow-xl space-y-6">
          <div>
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#e5a93c]">
              Live Clean Referral Link Format
            </span>
            <h3 className="text-xl font-bold font-display text-white mt-1">
              Direct Community Invite URL
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Anyone visiting this link has your referral code <span className="text-amber-300 font-mono font-bold">#{referralCode}</span> automatically captured during registration.
            </p>
          </div>

          <div className="p-2 sm:p-3 rounded-2xl bg-[#07090e] border border-amber-500/40 flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              readOnly
              value={cleanReferralUrl}
              className="w-full px-3 py-2 bg-transparent text-sm sm:text-base font-mono text-amber-300 focus:outline-none select-all"
            />
            <button
              onClick={() => handleCopy(cleanReferralUrl, true)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl gold-btn-gradient text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shrink-0 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Copied!' : 'Copy Live Link'}</span>
            </button>
          </div>

          <div className="pt-2">
            <p className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">1-Click Instant Broadcast</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => handleShareWhatsApp()}
                className="p-4 rounded-2xl bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 flex items-center justify-center gap-3 font-semibold text-sm transition-all hover:scale-102 shadow-lg cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                </div>
                <span>Share on WhatsApp</span>
              </button>
              <button
                onClick={() => handleShareTelegram()}
                className="p-4 rounded-2xl bg-[#111928] hover:bg-[#162136] border border-[#23334d] text-cyan-200 flex items-center justify-center gap-3 font-semibold text-sm transition-all hover:scale-102 shadow-lg cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Send className="w-4 h-4 text-cyan-400" />
                </div>
                <span>Share on Telegram</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-[#0c1017]/90 backdrop-blur-xl border border-[#1c2436] shadow-xl flex flex-col items-center justify-between text-center space-y-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#e5a93c] font-semibold mb-1">
              <QrCode className="w-4 h-4" />
              <span>Instant Scan QR</span>
            </div>
            <h3 className="text-base font-bold text-white">Share In-Person</h3>
            <p className="text-xs text-slate-400">Scan to open registration with your sponsor code pre-filled</p>
          </div>

          <div className="p-4 rounded-2xl bg-white shadow-2xl border-4 border-amber-500/40 inline-block">
            <QRCodeSVG
              value={cleanReferralUrl}
              size={160}
              level="H"
              includeMargin={false}
            />
          </div>
          <p className="text-xs font-mono text-amber-300 font-bold">Code: #{referralCode}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#e5a93c]" />
            <span>High-Conversion Swipe Copy</span>
          </h3>
          <p className="text-xs text-slate-400">Copy pre-tested marketing copy designed for high conversion rates</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {promoCopies.map((copy, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-[#0c1017]/90 backdrop-blur-xl border border-[#1c2436] hover:border-amber-500/40 shadow-xl flex flex-col justify-between space-y-4 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-400 border border-amber-500/40">
                    {copy.badge}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">Template #{idx + 1}</span>
                </div>
                <h4 className="text-sm font-bold text-white mb-2">{copy.title}</h4>
                <div className="p-3 rounded-xl bg-[#07090e] border border-[#1c2436] text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                  {copy.text}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-[#1c2436]">
                <button
                  onClick={() => handleCopy(copy.text, false, idx)}
                  className="flex-1 py-2.5 rounded-xl bg-[#141b27] hover:bg-[#1c2638] text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedCopyIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCopyIndex === idx ? 'Copied' : 'Copy Text'}</span>
                </button>
                <button
                  onClick={() => handleShareWhatsApp(copy.text)}
                  className="p-2.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 text-amber-400 border border-amber-500/30 transition-all cursor-pointer"
                  title="Send via WhatsApp"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};