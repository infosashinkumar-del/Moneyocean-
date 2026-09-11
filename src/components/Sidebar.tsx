import React from 'react';
import { 
  LayoutDashboard, 
  Share2, 
  Users, 
  Receipt, 
  GitFork, 
  Settings, 
  ShieldCheck, 
  LogOut, 
  Waves, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  PanelLeftClose,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab?: string;
  currentTab?: string;
  onTabChange?: (tab: string) => void;
  onSelectTab?: (tab: string) => void;
  isOpenMobile: boolean;
  onCloseMobile?: () => void;
  setIsOpenMobile?: (open: boolean) => void;
  isCollapsedDesktop?: boolean;
  onToggleCollapseDesktop?: () => void;
  onNavigateCheckout?: () => void;
  onNavigateHome?: () => void;
  isAdmin?: boolean;
  adminUnlocked?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab,
  currentTab, 
  onTabChange,
  onSelectTab, 
  isOpenMobile, 
  onCloseMobile,
  setIsOpenMobile,
  isCollapsedDesktop = false,
  onToggleCollapseDesktop,
  onNavigateCheckout,
  onNavigateHome,
  isAdmin: propIsAdmin,
  adminUnlocked = false
}) => {
  const { user, signOut, isAdmin: authIsAdmin, packagePrice } = useAuth();
  const isAdmin = propIsAdmin ?? authIsAdmin;
  const effectiveTab = activeTab || currentTab || 'overview';

  const navItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'referral', label: 'Referral Toolkit', icon: Share2 },
    { id: 'team', label: 'Team Genealogy', icon: Users },
    { id: 'transactions', label: 'Transaction History', icon: Receipt },
    { id: 'passup-logs', label: 'Pass-Up Audit Logs', icon: GitFork },
    { id: 'profile', label: 'Profile & ZapKey', icon: Settings },
  ];

  const handleClose = () => {
    if (onCloseMobile) {
      onCloseMobile();
    }
    if (setIsOpenMobile) {
      setIsOpenMobile(false);
    }
  };

  const handleNavigate = (tabId: string) => {
    if (tabId === 'checkout' && onNavigateCheckout) {
      onNavigateCheckout();
      handleClose();
      return;
    }
    if (onTabChange) {
      onTabChange(tabId);
    } else if (onSelectTab) {
      onSelectTab(tabId);
    }
    handleClose();
  };

  const handleSignOut = async () => {
    handleClose();
    await signOut();
    if (onNavigateHome) {
      onNavigateHome();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          onClick={handleClose}
          className="fixed inset-0 z-40 bg-[#050811]/90 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed lg:static top-0 left-0 bottom-0 z-50 bg-[#0b0e14]/95 lg:bg-[#0b0e14]/90 lg:backdrop-blur-xl border-r border-[#1c2436] flex flex-col justify-between transition-all duration-300 ease-in-out shrink-0 overflow-hidden
        ${isOpenMobile 
          ? 'translate-x-0 w-72' 
          : isCollapsedDesktop 
            ? '-translate-x-full lg:translate-x-0 w-0 lg:w-0 border-r-0 opacity-0 pointer-events-none' 
            : '-translate-x-full lg:translate-x-0 w-72 opacity-100'
        }
      `}>
        {/* Top brand */}
        <div className="p-5 border-b border-[#1c2436] w-72">
          <div className="flex items-center justify-between">
            <div 
              onClick={() => handleNavigate('overview')}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl gold-btn-gradient p-0.5 shadow-lg shadow-amber-500/20">
                <div className="w-full h-full bg-[#07090e] rounded-[10px] flex items-center justify-center">
                  <Waves className="w-4.5 h-4.5 text-[#e5a93c]" />
                </div>
              </div>
              <div>
                <span className="text-base font-bold font-display tracking-tight text-white flex items-center gap-1.5">
                  Money<span className="gold-gradient-text">Ocean</span>
                </span>
                <span className="text-[9px] text-slate-400 font-mono">P2P AFFILIATE NODE</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Desktop Collapse button */}
              {onToggleCollapseDesktop && (
                <button
                  onClick={onToggleCollapseDesktop}
                  className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#151c2a] border border-transparent hover:border-[#232f45] cursor-pointer transition-colors"
                  title="Collapse Sidebar (Full View)"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              )}
              {/* Mobile close */}
              <button
                onClick={handleClose}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#151c2a] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* User quick badge */}
          {user && (
            <div className="mt-4 p-3 rounded-2xl bg-[#111722] border border-[#212c40] flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{user.full_name}</p>
                <p className="text-[11px] text-[#e5a93c] font-mono tracking-wider">#{user.referral_code}</p>
              </div>
              <div className="shrink-0 ml-2">
                {user.is_active ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-400 border border-emerald-500/40 shadow-sm">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/90 text-amber-400 border border-amber-500/40 shadow-sm">
                    <AlertCircle className="w-3 h-3" /> Inactive
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 w-72">
          <div className="px-3 pb-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
            Main Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = effectiveTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 via-[#151e2e] to-[#101724] text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-950/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#121824]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#e5a93c]' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Admin link for verified Master Admin */}
          {isAdmin && (
            <div className="pt-4 mt-2 border-t border-[#1c2436]">
              <div className="px-3 pb-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-purple-400">
                Administration
              </div>
              <button
                onClick={() => handleNavigate('admin')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all text-left cursor-pointer ${
                  effectiveTab === 'admin'
                    ? 'bg-purple-950/80 text-purple-300 border border-purple-500/30 shadow-lg shadow-purple-950/50'
                    : 'text-purple-400/80 hover:text-purple-300 hover:bg-purple-950/30'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Master Admin Portal</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="p-4 border-t border-[#1c2436] space-y-2 w-72">
          {/* Quick Activate CTA if inactive */}
          {user && !user.is_active && (
            <button
              onClick={() => handleNavigate('checkout')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl gold-btn-gradient text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all hover:scale-101 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Activate Node (₹{(packagePrice || 5000).toLocaleString('en-IN')})</span>
            </button>
          )}

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
