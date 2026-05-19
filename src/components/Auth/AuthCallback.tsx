import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { motion } from 'motion/react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setSession, initializeAuth, addToast } = useStore();
  const [status, setStatus] = useState('Verifying your email...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const handleAuthCallback = async () => {
      const timeout = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error('Verification took too long. Please log in.')), 10000);
      });

      try {
        await Promise.race([
          (async () => {
            if (import.meta.env.DEV) {
              console.log('Auth callback URL:', window.location.href);
              console.log('Auth code exists:', Boolean(searchParams.get('code')));
            }

            const params = new URLSearchParams(window.location.search);
            const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
            const oauthError = params.get('error') || params.get('error_code') || hashParams.get('error') || hashParams.get('error_code');
            if (oauthError) {
              throw new Error(params.get('error_description') || hashParams.get('error_description') || oauthError);
            }

            const authType = params.get('type') || hashParams.get('type');
            if (authType === 'recovery') {
              sessionStorage.setItem('visnova-auth-link-mode', 'recovery');
            }

            const code = searchParams.get('code');
            const hashAccessToken = hashParams.get('access_token');
            const hashRefreshToken = hashParams.get('refresh_token');

            if (code) {
              setStatus('Completing secure sign-in...');
              const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
              if (exchangeError) throw exchangeError;
            } else if (hashAccessToken && hashRefreshToken) {
              setStatus('Restoring secure session...');
              const { error: setSessionError } = await supabase.auth.setSession({
                access_token: hashAccessToken,
                refresh_token: hashRefreshToken
              });
              if (setSessionError) throw setSessionError;
            }

            setStatus('Checking session...');
            const { data, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw sessionError;

            const session = data.session;
            if (!session) {
              if (!mounted) return;
              setStatus('Email verified. Please log in.');
              addToast({
                type: 'success',
                title: 'Email verified',
                description: 'Email verified. Please log in.'
              });
              window.setTimeout(() => {
                if (mounted) navigate('/login?verified=true', { replace: true });
              }, 1000);
              return;
            }

            setStatus('Loading your account...');
            const store = useStore.getState();
            setSession(session);
            const profile = await store.ensureCurrentUserProfile();
            await initializeAuth();

            if (!mounted) return;
            if (profile?.onboarded) {
              addToast({ type: 'success', title: 'Welcome back', description: 'Redirecting to your dashboard...' });
            }
            navigate('/', { replace: true });
          })(),
          timeout
        ]);
      } catch (err: any) {
        console.error('Auth Callback Error:', err);
        if (!mounted) return;
        const message = err.message || 'Auth link expired or invalid. Please request a new login link.';
        setError(message);
        addToast({ type: 'error', title: 'Verification issue', description: message });
      }
    };

    handleAuthCallback();
    return () => {
      mounted = false;
    };
  }, [navigate, searchParams, setSession, initializeAuth, addToast]);

  if (error) {
    return (
      <div className="min-h-screen w-screen bg-bg-base flex items-center justify-center p-6 text-center">
        <div className="max-w-md rounded-3xl border border-card-border bg-card p-6 shadow-2xl">
          <h1 className="text-xl font-black text-text-main">Verification issue</h1>
          <p className="mt-2 text-sm font-semibold text-text-secondary">{error}</p>
          <button
            onClick={() => navigate('/login?verified=true', { replace: true })}
            className="mt-5 rounded-2xl bg-accent px-5 py-3 text-[10px] font-black uppercase tracking-widest text-accent-contrast"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-bg-base flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-4 border-accent/10 border-t-accent rounded-full mb-8"
      />
      <div className="space-y-2 animate-pulse">
        <h2 className="text-sm font-black uppercase tracking-[0.4em] text-text-main">Setting up your workspace...</h2>
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">{status}</p>
      </div>
    </div>
  );
}
