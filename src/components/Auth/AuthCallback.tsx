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
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session) {
          setSession(session);
          
          const store = useStore.getState();
          // Ensure profile exists
          const profile = await store.ensureCurrentUserProfile();
          
          if (profile) {
            await store.loadUserProfile(session.user.id);
            
            if (profile.onboarded) {
              addToast({ type: 'success', title: 'Welcome back', description: 'Redirecting to your dashboard...' });
              navigate('/');
            } else {
              navigate('/onboarding');
            }
          } else {
             // Fallback if profile creation failed
             navigate('/onboarding');
          }
        } else {
          navigate('/');
        }
      } catch (err: any) {
        console.error('Auth Callback Error:', err);
        addToast({ type: 'error', title: 'Authentication failed', description: err.message });
        navigate('/');
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
        <h2 className="text-sm font-black uppercase tracking-[0.4em] text-text-main">Securing Connection</h2>
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">Establishing session...</p>
      </div>
    </div>
  );
}
