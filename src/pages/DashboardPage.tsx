import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { DashboardHeader } from '../components/DashboardHeader';
import { DashboardOverview } from './DashboardOverview';
import { ReferralToolkit } from './ReferralToolkit';
import { TeamGenealogy } from './TeamGenealogy';
import { TransactionHistory } from './TransactionHistory';
import { PassupLogs } from './PassupLogs';
import { ProfileSettings } from './ProfileSettings';
import { AdminDashboard } from './AdminDashboard';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Zap, ArrowRight } from 'lucide-react';

interface DashboardPageProps {
  initialTab?: string;
  onNavigateHome: () => void;
  onNavigateCheckout: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  initialTab = 'overview',
  onNavigateHome,
  onNavigateCheckout
}) => {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setDesktopSidebarCollapsed(!desktopSidebarCollapsed);
    }
  };

  const tabMeta: Record<string, { title: string; subtitle: string }> = {
    overview: { title: 'Dashboard Overview', subtitle: 'Real-time ID Activity & Peer Ledger' },
    referral: { title: 'Referral Toolkit', subtitle: 'Your High-Converting Affiliate Links & Marketing Tools' },
    team: { title: 'Team Genealogy', subtitle: 'Direct Matrix & 2-Up Pass-Up Genealogy' },
    transactions: { title: 'Transaction History', subtitle: 'Audited P2P Settlements & Verification Proofs' },
    'passup-logs': { title: 'Pass-Up Audit Logs', subtitle: 'Transparent 2nd & 4th Sale Pass-Up Routing Record' },
    profile: { title: 'Profile & ZapKey', subtitle: 'Manage UPI Virtual Payment Address & Security' },
    admin: { title: 'Master Admin Portal', subtitle: 'Platform Governance, User Approvals & System Controls' },
  };

  const currentMeta = tabMeta[activeTab] || tabMeta.overview;

  return (
    <div className="h-screen h-[100dvh] bg-[#07090e] text-slate-100 flex flex-col selection:bg-[#e5a93c] selection:text-slate-950 gold-stars-bg overflow-hidden">
      {/* Dashboard Header - Always Fixed at Top */}
      <DashboardHeader
        title={currentMeta.title}
        subtitle={currentMeta.subtitle}
        onToggleSidebar={handleToggleSidebar}
        isSidebarCollapsed={desktopSidebarCollapsed}
        onNavigateHome={onNavigateHome}
        onNavigateCheckout={onNavigateCheckout}
        onNavigateProfile={() => setActiveTab('profile')}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Responsive Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setMobileSidebarOpen(false);
          }}
          isOpenMobile={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          isCollapsedDesktop={desktopSidebarCollapsed}
          onToggleCollapseDesktop={() => setDesktopSidebarCollapsed(!desktopSidebarCollapsed)}
          onNavigateCheckout={onNavigateCheckout}
          onNavigateHome={onNavigateHome}
          isAdmin={isAdmin}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto relative pb-20 bg-[#07090e]/60 transition-all duration-300 w-full">
          {/* Sub-Tab Routing */}
          <div className="transition-all duration-300">
            {activeTab === 'overview' && (
              <DashboardOverview
                onNavigateTab={(tab) => setActiveTab(tab)}
                onNavigateCheckout={onNavigateCheckout}
              />
            )}

            {activeTab === 'referral' && (
              <ReferralToolkit 
                onNavigateCheckout={onNavigateCheckout} 
              />
            )}

            {activeTab === 'team' && <TeamGenealogy />}

            {activeTab === 'transactions' && <TransactionHistory />}

            {activeTab === 'passup-logs' && <PassupLogs />}

            {activeTab === 'profile' && (
              <ProfileSettings
                onNavigate={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'admin' && (
              isAdmin ? (
                <AdminDashboard />
              ) : (
                <DashboardOverview
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onNavigateCheckout={onNavigateCheckout}
                />
              )
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
