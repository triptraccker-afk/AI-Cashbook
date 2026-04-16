import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import { Loader2 } from 'lucide-react';
import { cn } from './lib/utils';

function NavigationHandler({ 
  session, 
  setSession, 
  setLoading 
}: { 
  session: any; 
  setSession: (s: any) => void; 
  setLoading: (l: boolean) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      
      // If we have a recovery token in the hash, ensure we are on the reset page
      const hash = window.location.hash;
      if (hash && (hash.includes('type=recovery') || hash.includes('access_token='))) {
        if (location.pathname !== '/resetpassword') {
          navigate('/resetpassword' + hash, { replace: true });
        }
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Password recovery event detected');
        if (location.pathname !== '/resetpassword') {
          navigate('/resetpassword', { replace: true });
        }
      } else if (event === 'SIGNED_IN' && location.pathname === '/login') {
        navigate('/', { replace: true });
      } else if (event === 'SIGNED_OUT') {
        navigate('/login', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname, setSession, setLoading]);

  return null;
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Theme handling
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.style.colorScheme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  // PWA Install Prompt handling
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      console.log('PWA install prompt available');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  return (
    <Router>
      <NavigationHandler 
        session={session} 
        setSession={setSession} 
        setLoading={setLoading} 
      />
      
      {loading ? (
        <div className="min-h-screen bg-[#f3f7ff] dark:bg-slate-950 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 size={40} className="text-indigo-600 animate-spin mx-auto" />
            <p className={cn(
              "font-medium transition-colors duration-300",
              theme === 'dark' ? "text-slate-400" : "text-black"
            )}>Loading Track Book...</p>
          </div>
        </div>
      ) : (
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login theme={theme} />} />
          <Route path="/resetpassword" element={<ResetPassword />} />

          {/* Protected Routes */}
          <Route 
            path="/" 
            element={
              session ? (
                <Dashboard session={session} theme={theme} setTheme={setTheme} />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </Router>
  );
}
