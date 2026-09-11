import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastContainer } from './components/Toast';
import { LandingPage } from './pages/LandingPage';
import { SignUpPage } from './pages/SignUpPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CheckoutPage } from './pages/CheckoutPage';

type ViewRoute = 'landing' | 'signup' | 'login' | 'dashboard' | 'checkout';

function AppContent() {
  const { user, loading, authUser } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<ViewRoute>('landing');
  const [dashboardTab, setDashboardTab] = useState<string>('overview');
  const [initialReferralCode, setInitialReferralCode] = useState<string>('');

  // URL Path and Clean Referral Detection on Load
  useEffect(() => {
    const rawPath = window.location.pathname.replace(/^\/+|\/+$/g, '');
    const searchParams = new URLSearchParams(window.location.search);
    
    // Check various query param variants: ?ref=..., ?sponsor=..., ?code=..., ?r=...
    const refParam = searchParams.get('ref') || searchParams.get('sponsor') || searchParams.get('code') || searchParams.get('r');

    let detectedCode = '';

    if (refParam) {
      detectedCode = refParam.trim().toUpperCase();
    } else if (rawPath) {
      const lower = rawPath.toLowerCase();
      if (lower === 'login') {
        setCurrentRoute('login');
        return;
      } else if (lower === 'signup' || lower === 'register') {
        setCurrentRoute('signup');
        // Check if there was previously stored sponsor code
        const stored = sessionStorage.getItem('mo_sponsor_code');
        if (stored) setInitialReferralCode(stored);
        return;
      } else if (lower === 'dashboard') {
        setCurrentRoute('dashboard');
        return;
      } else if (lower === 'checkout') {
        setCurrentRoute('checkout');
        return;
      } else if (lower.startsWith('ref/') || lower.startsWith('r/') || lower.startsWith('join/') || lower.startsWith('signup/')) {
        // e.g. /ref/1CBBBEFC or /join/1CBBBEFC
        const parts = rawPath.split('/');
        if (parts.length >= 2 && parts[1]) {
          detectedCode = parts[1].trim().toUpperCase();
        }
      } else if (rawPath.length >= 3 && !rawPath.includes('/')) {
        // Clean direct path e.g. /1CBBBEFC or /MO123456
        detectedCode = rawPath.trim().toUpperCase();
      }
    }

    if (detectedCode) {
      setInitialReferralCode(detectedCode);
      sessionStorage.setItem('mo_sponsor_code', detectedCode);
      setCurrentRoute('signup');
    }
  }, []);

  // Handle Protected Redirects & Sign-out Navigation
  useEffect(() => {
    if (!loading) {
      if (authUser && (currentRoute === 'login' || (currentRoute === 'signup' && user?.is_active))) {
        setCurrentRoute('dashboard');
      } else if (!authUser && !user && (currentRoute === 'dashboard' || currentRoute === 'checkout')) {
        setCurrentRoute('landing');
      }
    }
  }, [authUser, user, loading, currentRoute]);

  const navigateTo = (route: ViewRoute, tab?: string, refCode?: string) => {
    if (refCode) {
      setInitialReferralCode(refCode);
    }
    if (tab) {
      setDashboardTab(tab);
    }
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-cyan-500 selection:text-slate-950">
      <ToastContainer />

      {/* Main View Router */}
      {currentRoute === 'landing' && (
        <LandingPage
          onNavigate={(route) => navigateTo(route as ViewRoute)}
        />
      )}

      {currentRoute === 'signup' && (
        <SignUpPage
          prefilledReferralCode={initialReferralCode}
          onNavigate={(route) => navigateTo(route as ViewRoute)}
        />
      )}

      {currentRoute === 'login' && (
        <LoginPage
          onNavigate={(route) => navigateTo(route as ViewRoute)}
        />
      )}

      {currentRoute === 'dashboard' && (
        <DashboardPage
          initialTab={dashboardTab}
          onNavigateHome={() => navigateTo('landing')}
          onNavigateCheckout={() => navigateTo('checkout')}
        />
      )}

      {currentRoute === 'checkout' && (
        <CheckoutPage
          onNavigateDashboard={() => navigateTo('dashboard')}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
