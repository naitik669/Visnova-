import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { motion } from 'motion/react';
import { BrandLogo } from '../BrandLogo';

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
            let shouldContinueToLogin = false;

            if (code) {
              setStatus('Completing secure sign-in...');
              const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
              if (exchangeError) {
                const message = exchangeError.message || '';
                const isMissingVerifier = /code verifier|verifier.*storage|pkce/i.test(message);
                if (!isMissingVerifier) throw exchangeError;
                shouldContinueToLogin = true;
              }
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
            if (!session || shouldContinueToLogin) {
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
      <div className="flex min-h-[100dvh] w-screen items-center justify-center bg-bg-base p-4 text-center">
        <div className="w-full max-w-md rounded-[1.75rem] border border-card-border bg-card p-5 shadow-2xl sm:p-6">
          <BrandLogo className="mx-auto h-14 w-14 rounded-2xl shadow-lg shadow-accent/15" />
          <h1 className="mt-5 text-xl font-black text-text-main">Verification issue</h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-text-secondary">{error}</p>
          <button
            onClick={() => navigate('/login?verified=true', { replace: true })}
            className="mt-5 h-12 w-full rounded-2xl bg-accent px-5 text-[10px] font-black uppercase tracking-widest text-accent-contrast sm:w-auto"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] w-screen flex-col items-center justify-center bg-bg-base p-6 text-center">
      <BrandLogo className="mb-7 h-14 w-14 rounded-2xl shadow-lg shadow-accent/15" />
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        className="mb-8 h-12 w-12 rounded-full border-4 border-accent/10 border-t-accent"
      />
      <div className="space-y-2 animate-pulse">
        <h2 className="text-sm font-black uppercase tracking-[0.28em] text-text-main sm:tracking-[0.4em]">Setting up your workspace...</h2>
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">{status}</p>
      </div>
    </div>
  );
}
