import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  ExternalLink, 
  X, 
  Eye, 
  Loader2, 
  Copy, 
  Check, 
  Sparkles 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { showToast } from './Toast';

interface MarketingPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  customPdfUrl?: string;
}

export const MarketingPlanModal: React.FC<MarketingPlanModalProps> = ({
  isOpen,
  onClose,
  customPdfUrl
}) => {
  const { platformConfig } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Dynamic PDF URL resolution strictly from platform_configs via platformConfig or fallback
  const defaultFallback = 'https://gedbbysyehtdaqgkrmqk.supabase.co/storage/v1/object/public/marketing%20plan/moneyoceantop.pdf';
  const pdfUrl = (customPdfUrl || platformConfig?.marketing_plan_pdf_url || defaultFallback).trim();

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset iframe loading on modal open
  useEffect(() => {
    if (isOpen) {
      setIframeLoading(true);
      setCopiedLink(false);
    }
  }, [isOpen, pdfUrl]);

  if (!isOpen) return null;

  // Direct Blob Download Handler
  const handleDownload = async () => {
    try {
      setDownloading(true);
      const response = await fetch(pdfUrl, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'MoneyOcean_Marketing_Plan.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      showToast('success', 'Download Complete', 'Marketing presentation saved to your device.');
    } catch (err) {
      console.warn('Direct blob fetch failed, falling back to window download:', err);
      // Fallback: direct anchor trigger
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.target = '_blank';
      link.download = 'MoneyOcean_Marketing_Plan.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(pdfUrl);
    setCopiedLink(true);
    showToast('info', 'Link Copied', 'Direct presentation PDF link copied to clipboard.');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#0b0e14] border border-[#1e2738] w-full max-w-5xl h-[92vh] sm:h-[88vh] rounded-[24px] sm:rounded-[28px] shadow-2xl shadow-black/90 flex flex-col overflow-hidden relative selection:bg-[#e5a93c] selection:text-slate-950">
        {/* Top ambient gold accent */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-32 bg-amber-500/10 blur-[130px] pointer-events-none" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#182130] flex items-center justify-between gap-3 relative z-10 bg-[#0c1017]/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#e5a93c] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold font-display text-white truncate">
                  MoneyOcean Marketing Plan
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-mono font-semibold">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  OFFICIAL PDF
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                Decentralized 100% P2P Affiliate Architecture & Compensation Matrix
              </p>
            </div>
          </div>

          {/* Action controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Direct Download Button */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-3 sm:px-4 py-2 rounded-xl gold-btn-gradient text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 hover:scale-[1.02] transition-all disabled:opacity-50"
              title="Download PDF to device"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Download PDF</span>
            </button>

            {/* Open in New Tab */}
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-[#121824] hover:bg-[#182133] border border-[#222f47] text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open full presentation in a new browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#e5a93c]" />
              <span className="hidden md:inline">Open New Tab</span>
            </a>

            {/* Copy direct link */}
            <button
              onClick={handleCopyLink}
              className="p-2 rounded-xl bg-[#121824] hover:bg-[#182133] border border-[#222f47] text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              title="Copy PDF link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Embedded PDF IFrame with Loading State */}
        <div className="flex-1 relative bg-[#07090e] overflow-hidden flex flex-col">
          {iframeLoading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#07090e]/95 space-y-3">
              <Loader2 className="w-8 h-8 text-[#e5a93c] animate-spin" />
              <p className="text-xs font-mono tracking-wider text-slate-400">Loading MoneyOcean Presentation PDF...</p>
            </div>
          )}

          <iframe
            src={`${pdfUrl}#toolbar=0`}
            title="MoneyOcean Marketing Plan PDF"
            className="w-full h-full border-0 bg-[#07090e]"
            onLoad={() => setIframeLoading(false)}
          />
        </div>

        {/* Modal Footer / Mobile Fallback Bar */}
        <div className="px-4 py-3 border-t border-[#182130] bg-[#0c1017] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Official Platform Presentation Slides</span>
          </div>

          <div className="flex items-center gap-3">
            <span>Can't view the PDF preview?</span>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#e5a93c] hover:underline font-bold inline-flex items-center gap-1"
            >
              <span>Direct Link</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
