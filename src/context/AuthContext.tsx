import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, getUserProfile, getUserDashboard, getPlatformConfigs } from '../lib/supabase';
import { User, DashboardData, PlatformConfig } from '../types';
import { showToast } from '../components/Toast';

interface AuthContextType {
  user: User | null;
  authUser: any | null;
  dashboardData: DashboardData | null;
  platformConfig: PlatformConfig | null;
  packagePrice: number;
  loading: boolean;
  isAdmin: boolean;
  refreshUserData: () => Promise<void>;
  refreshPlatformConfig: () => Promise<void>;
  signOut: () => Promise<void>;
  loginWithEmail: (email: string) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<any | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null);
  const [packagePrice, setPackagePrice] = useState<number>(5000);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPlatformConfig = async () => {
    try {
      const cfg = await getPlatformConfigs();
      if (cfg) {
        setPlatformConfig(cfg);
        if (cfg.package_price !== undefined && !isNaN(Number(cfg.package_price))) {
          setPackagePrice(Number(cfg.package_price));
        }
      }
    } catch (err) {
      console.warn('Error fetching platform config:', err);
    }
  };

  const fetchFullUserData = async (userId: string) => {
    try {
      const [profile, dData] = await Promise.all([
        getUserProfile(userId),
        getUserDashboard(userId)
      ]);
      if (profile) {
        setUser(profile);
      }
      if (dData) {
        setDashboardData(dData);
      }
    } catch (err) {
      console.error('Error fetching full user data:', err);
    }
  };

  const refreshUserData = async () => {
    const activeId = user?.id || authUser?.id;
    if (activeId) {
      await fetchFullUserData(activeId);
    }
  };

  const refreshPlatformConfig = async () => {
    await fetchPlatformConfig();
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        await fetchPlatformConfig();

        // Check active Supabase session
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Get session notice:', error.message);
        }

        if (!mounted) return;

        if (data?.session?.user) {
          const sessionUser = data.session.user;
          setAuthUser(sessionUser);

          // Look up user in database by ID or email
          const { data: dbUser, error: dbErr } = await supabase
            .from('users')
            .select('*')
            .or(`id.eq.${sessionUser.id},email.eq.${sessionUser.email}`)
            .maybeSingle();

          if (dbErr) {
            console.warn('DB User lookup notice:', dbErr.message);
          }

          if (dbUser) {
            setUser(dbUser as User);
            await fetchFullUserData(dbUser.id);
          } else {
            await fetchFullUserData(sessionUser.id);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    try {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          if (!mounted) return;
          if (session?.user) {
            setAuthUser(session.user);
            const { data: dbUser } = await supabase
              .from('users')
              .select('*')
              .or(`id.eq.${session.user.id},email.eq.${session.user.email}`)
              .maybeSingle();

            if (dbUser) {
              setUser(dbUser as User);
              await fetchFullUserData(dbUser.id);
            } else {
              await fetchFullUserData(session.user.id);
            }
          } else {
            setAuthUser(null);
            setUser(null);
            setDashboardData(null);
          }
        }
      );

      return () => {
        mounted = false;
        authListener?.subscription?.unsubscribe();
      };
    } catch {
      return () => {
        mounted = false;
      };
    }
  }, []);

  const loginWithEmail = async (email: string): Promise<User> => {
    const cleanEmail = email.trim().toLowerCase();
    
    // Direct real Supabase search
    const { data: realUser, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (error || !realUser) {
      throw new Error('No registered account found with this email address. Please register or verify your credentials.');
    }

    setUser(realUser as User);
    setAuthUser({ id: realUser.id, email: realUser.email });
    const dData = await getUserDashboard(realUser.id);
    if (dData) {
      setDashboardData(dData);
    }
    return realUser as User;
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut().catch(() => {});
    } catch {}
    setUser(null);
    setAuthUser(null);
    setDashboardData(null);
    showToast('info', 'Signed Out', 'You have been signed out successfully.');
  };

  // Check if Master Admin: only specific master admin emails, referral codes, or explicit admin roles
  const isAdmin = Boolean(
    user && (
      user.email === 'infosashinkumar@gmail.com' || 
      user.email === 'admin@moneyocean.com' || 
      user.referral_code === 'ADMIN100' ||
      user.referral_code === 'MO_GENESIS' ||
      user.role === 'admin' ||
      user.is_admin === true
    )
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        authUser,
        dashboardData,
        platformConfig,
        packagePrice,
        loading,
        isAdmin,
        refreshUserData,
        refreshPlatformConfig,
        signOut,
        loginWithEmail
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
