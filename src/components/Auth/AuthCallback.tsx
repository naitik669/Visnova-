import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { motion } from 'motion/react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setSession, addToast } = useStore();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
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

        const hasOAuthCode = params.has('code');
        const hashAccessToken = hashParams.get('access_token');
        const hashRefreshToken = hashParams.get('refresh_token');
        const result = hasOAuthCode
          ? await supabase.auth.exchangeCodeForSession(window.location.href)
          : hashAccessToken && hashRefreshToken
            ? await supabase.auth.setSession({ access_token: hashAccessToken, refresh_token: hashRefreshToken })
            : await supabase.auth.getSession();
        const { data: { session }, error } = result;
        if (error) throw error;

        if (!session) {
          addToast({
            type: 'error',
            title: 'Auth link invalid',
            description: 'Auth link expired or invalid. Please request a new login link.'
          });
          navigate('/', { replace: true });
          return;
        }

        const store = useStore.getState();
        setSession(session);
        const profile = await store.ensureCurrentUserProfile();

        if (profile) {
          await store.loadUserProfile(session.user.id);
          if (profile.onboarded) {
            addToast({ type: 'success', title: 'Welcome back', description: 'Redirecting to your dashboard...' });
          }
        }
        navigate('/', { replace: true });
      } catch (err: any) {
        console.error('Auth Callback Error:', err);
        addToast({
          type: 'error',
          title: 'Authentication failed',
          description: err.message || 'Auth link expired or invalid. Please request a new login link.'
        });
        navigate('/', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate, setSession, addToast]);

  return (
    <div className="h-screen w-screen bg-bg-base flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-4 border-accent/10 border-t-accent rounded-full mb-8"
      />
      <div className="space-y-2 animate-pulse">
        <h2 className="text-sm font-black uppercase tracking-[0.4em] text-text-main">Setting up your workspace...</h2>
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">Loading your session</p>
      </div>
    </div>
  );
}
