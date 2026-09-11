import React from 'react';
import { Menu, Zap, RefreshCw, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DashboardHeaderProps {
  onToggleSidebar: () => void;
  onNavigateCheckout: () => void;
  onNavigateHome?: () => void;
  onNavigateProfile?: () => void;
  title?: string;
  subtitle?: string;
  isSidebarCollapsed?: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onToggleSidebar,
  onNavigateCheckout,
  title = 'Dashboard Overview',
  subtitle,
  isSidebarCollapsed = false
}) => {
  const { user, refreshUserData, loading } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshUserData();
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <header className="w-full shrink-0 sticky top-0 z-30 bg-[#0b0e14]/95 backdrop-blur-md border-b border-[#1c2436]">
      {/* Top bar for current view */}
      <div className="h-16 sm:h-18 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-[#151c2a] border border-[#232f45] cursor-pointer transition-all flex items-center gap-1.5 group"
            title={isSidebarCollapsed ? "Expand Sidebar" : "Toggle Full View (Collapse Sidebar)"}
          >
            {isSidebarCollapsed ? (
              <>
                <PanelLeftOpen className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-mono font-semibold hidden md:inline text-amber-400">Expand Menu</span>
              </>
            ) : (
              <>
                <PanelLeftClose className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                <span className="text-xs font-mono font-medium hidden md:inline text-slate-400 group-hover:text-slate-200">Full View</span>
              </>
            )}
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold font-display text-white tracking-tight flex items-center gap-2">
              {title}
            </h1>
          </div>
        </div>

        {/* Right side status and controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#111722] border border-[#212c40] text-slate-300 hover:text-[#f3c368] hover:border-amber-500/40 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            title="Refresh balance and network data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#e5a93c]' : 'text-amber-400'}`} />
            <span className="hidden sm:inline">Sync Ledger</span>
          </button>
        </div>
      </div>
    </header>
  );
};
