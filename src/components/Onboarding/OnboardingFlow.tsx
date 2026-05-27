import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { ArrowLeft, CheckCircle2, KeyRound, Mail, Zap, Eye, EyeOff, Image as ImageIcon, Users, Plus, Sparkles, Target } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { getAuthRedirectUrl, supabase, uploadAvatar } from '../../lib/supabase';
import { checkClientRateLimit, formatRetryAfter, sanitizeText } from '../../lib/security';
import { trackBetaEvent } from '../../lib/betaAnalytics';
import { getRandomVisNovaAvatar } from '../../lib/avatarLibrary';
import { PROFILE_ROLE_CATEGORIES } from '../../lib/profileRoles';
import { BrandLogo } from '../BrandLogo';

type ProfileChoice = 'male' | 'female' | 'custom';

const DEFAULT_PROFILE_AVATARS: Record<ProfileChoice, string> = {
  male: getRandomVisNovaAvatar('visnova-default-male'),
  female: getRandomVisNovaAvatar('visnova-default-female'),
  custom: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 128 128%22%3E%3Crect width=%22128%22 height=%22128%22 rx=%2240%22 fill=%22%23f9fafb%22/%3E%3Cpath d=%22M64 40v48M40 64h48%22 stroke=%22%239ca3af%22 stroke-width=%228%22 stroke-linecap=%22round%22/%3E%3C/svg%3E',
};

const AVATAR_LIBRARY = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Félix&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jovan&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Sasha&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Toby&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Gizmo&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Beeper&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/identicon/svg?seed=Zen&backgroundColor=f1f5f9',
  'https://api.dicebear.com/7.x/shapes/svg?seed=Inspire&backgroundColor=ecfdf5',
  'https://api.dicebear.com/7.x/big-smile/svg?seed=Joy&backgroundColor=fff7ed',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=VisNova&backgroundColor=f0f9ff',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Creative&backgroundColor=fdf2f8',
];

const DEFAULT_AVATAR_VALUES = Object.values(DEFAULT_PROFILE_AVATARS);

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-.8 2.3-1.7 3-1 .8-2.2 1.3-3.8 1.3-2.9 0-5.4-2.4-5.4-5.4S9.1 7.6 12 7.6c1.6 0 2.8.6 3.7 1.4l2.7-2.7C16.8 4.8 14.7 4 12 4 6.9 4 2.8 8.1 2.8 13.2s4.1 9.2 9.2 9.2c2.7 0 4.9-.9 6.5-2.5 1.7-1.7 2.2-4 2.2-5.9 0-.6-.1-1.2-.1-1.6H12Z" />
      <path fill="#34A853" d="M3.9 8.7 7.1 11c.9-2 2.7-3.4 4.9-3.4 1.6 0 2.8.6 3.7 1.4l2.7-2.7C16.8 4.8 14.7 4 12 4 8.4 4 5.3 5.9 3.9 8.7Z" />
      <path fill="#FBBC05" d="M12 22.4c2.5 0 4.7-.8 6.3-2.3l-3-2.5c-.8.5-1.9.9-3.3.9-2.2 0-4.1-1.5-4.8-3.5l-3.2 2.5c1.5 2.9 4.5 4.9 8 4.9Z" />
      <path fill="#4285F4" d="M20.7 14c0-.6-.1-1.2-.1-1.6H12v3.9h5.5c-.2 1.3-.8 2.3-1.7 3l3 2.5c1.7-1.6 1.9-4 1.9-7.8Z" />
    </svg>
  );
}

function ScreenLogin({ email, setEmail, nextStep, switchToSignup, setStep, handleGoogleLogin, verifiedMessage }: any) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const addToast = useStore((state) => state.addToast);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Credentials required.');
      addToast({ type: 'error', title: 'Credentials required', description: 'Enter your email and password to continue.' });
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const normalizedEmail = sanitizeText(email, 254).toLowerCase();
      const limit = checkClientRateLimit(normalizedEmail || 'unknown', 'auth_login', 5, 15);
      if (!limit.allowed) throw new Error(formatRetryAfter(limit.retryAfterMs));
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      if (loginError) throw loginError;
      const user = data.user;

      if (user) {
        addToast({ type: 'success', title: 'Login successful', description: 'Accessing your dashboard...' });
        await useStore.getState().ensureCurrentUserProfile();
        // Correctly logged in, check if onboarded via profile
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarded, onboarding_step')
            .eq('id', user.id)
            .maybeSingle();

          if (profile) {
             // Existing account found - skip onboarding or resume
             await useStore.getState().loadUserProfile(user.id);
             if (profile.onboarded) {
                setStep(10);
             } else {
                nextStep(profile.onboarding_step && profile.onboarding_step > 0 ? profile.onboarding_step : 3);
             }
          } else {
            const fallbackProfile = await useStore.getState().ensureCurrentUserProfile();
            if (fallbackProfile?.onboarded) {
              setStep(10);
            } else {
              nextStep(3);
            }
          }
        } catch (profileErr) {
          console.error('Profile fetch during login failed:', profileErr);
          nextStep(3);
        }
      }
    } catch (err: any) {
      const message = err.message || 'Login failed. Please try again.';
      setError(message);
      addToast({ type: 'error', title: 'Login failed', description: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center max-w-sm mx-auto space-y-5 w-full">
      <div className="space-y-3">
        <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-2">
          <CheckCircle2 size={24} />
        </div>
        <h2 className="text-3xl font-extrabold text-text-main tracking-tight leading-none">Welcome Back</h2>
        <p className="text-sm text-text-secondary font-medium">Continue where you left off.</p>
      </div>

      <div className="space-y-3">
        {verifiedMessage && (
          <div className="p-3 bg-success/10 border border-success/20 rounded-xl text-success text-[10px] font-black uppercase tracking-widest text-center animate-in fade-in slide-in-from-top-1">
            Email verified. You can now log in.
          </div>
        )}
        {error && (
          <div className="p-3 bg-accent/5 border border-accent/10 rounded-xl text-accent text-[10px] font-bold uppercase tracking-widest text-center animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50 ml-1">Email</label>
          <input
            type="email"
            placeholder="strategist@visnova.ai"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            className="w-full h-12 px-4 rounded-2xl bg-card border border-card-border text-text-main focus:outline-none focus:border-accent transition-all font-medium"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50">Password</label>
            <button
              onClick={() => setStep(12)}
              className="text-[9px] font-black uppercase tracking-widest text-accent hover:underline"
            >
              Forgot?
            </button>
          </div>
          <div className="relative group">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') void handleLogin();
              }}
              autoComplete="current-password"
              className="w-full h-12 px-4 rounded-2xl bg-card border border-card-border text-text-main focus:outline-none focus:border-accent transition-all font-medium pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-text-secondary opacity-50 transition-opacity hover:opacity-100"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full h-12 rounded-2xl border border-card-border bg-card text-text-main font-black uppercase tracking-widest text-[11px] transition-all hover:border-accent/40 hover:bg-surface-muted active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
        >
          <GoogleIcon />
          Continue with Google
        </button>
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-card-border" />
          <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary/40">or</span>
          <span className="h-px flex-1 bg-card-border" />
        </div>
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full h-12 bg-text-main text-bg-base font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-accent/10"
        >
          {isLoading ? 'Loading...' : 'Login'}
        </button>
        <div className="flex flex-col gap-2">
          <button
            onClick={switchToSignup}
            className="w-full text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-60 hover:opacity-100 transition-all py-1"
          >
            Don't have an account? Sign up
          </button>
        </div>
      </div>
    </div>
  );
}

function ScreenForgotPassword({ email, setEmail, backToLogin }: any) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const addToast = useStore((state) => state.addToast);

  const handleReset = async () => {
    if (!email) {
      setError('Entry point (email) required.');
      addToast({ type: 'error', title: 'Email required', description: 'Enter the account email first.' });
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const normalizedEmail = sanitizeText(email, 254).toLowerCase();
      const limit = checkClientRateLimit(normalizedEmail || 'unknown', 'auth_reset', 5, 15);
      if (!limit.allowed) throw new Error(formatRetryAfter(limit.retryAfterMs));
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: getAuthRedirectUrl()
      });
      if (resetError) throw resetError;
      setSuccess('Recovery dispatch sent. Check your inbox.');
      addToast({ type: 'success', title: 'Recovery sent', description: 'Check your inbox for the reset link.' });
    } catch (resetError: any) {
      setError(resetError.message);
      addToast({ type: 'error', title: 'Recovery failed', description: resetError.message });
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col justify-center max-w-sm mx-auto space-y-5 w-full">
      <div className="space-y-3">
        <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-2">
          <Mail size={24} />
        </div>
        <h2 className="text-3xl font-extrabold text-text-main tracking-tight leading-none">Recover Account</h2>
        <p className="text-sm text-text-secondary font-medium">We'll help you get back in.</p>
      </div>

      <div className="space-y-3">
        {error && <div className="p-3 bg-accent/5 border border-accent/10 rounded-xl text-accent text-[10px] font-bold uppercase tracking-widest text-center animate-in fade-in slide-in-from-top-1">{error}</div>}
        {success && <div className="p-3 bg-success/10 border border-success/20 rounded-xl text-success text-[10px] font-bold uppercase tracking-widest text-center animate-in fade-in slide-in-from-top-1">{success}</div>}

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50 ml-1">Account Email</label>
          <input
            type="email"
            placeholder="strategist@visnova.ai"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full h-12 px-4 rounded-2xl bg-card border border-card-border text-text-main focus:outline-none focus:border-accent transition-all font-medium"
          />
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleReset}
          disabled={isLoading}
          className="w-full h-12 bg-accent text-accent-contrast font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {isLoading ? 'Sending...' : 'Send Recovery Link'}
        </button>
        <button
          onClick={backToLogin}
          className="w-full text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-60 hover:opacity-100 transition-all py-2"
        >
          Return to login
        </button>
      </div>
    </div>
  );
}

function ScreenResetPassword({ nextStep }: any) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const addToast = useStore((state) => state.addToast);

  const handleUpdatePassword = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      
      sessionStorage.removeItem('visnova-auth-link-mode');
      window.history.replaceState({}, document.title, '/onboarding');
      addToast({ type: 'success', title: 'Password updated', description: 'Continue your VisNova setup.' });
      nextStep(3);
    } catch (updateError: any) {
      setError(updateError.message);
      addToast({ type: 'error', title: 'Password update failed', description: updateError.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center max-w-sm mx-auto space-y-5 w-full">
      <div className="space-y-3">
        <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-2">
          <KeyRound size={24} />
        </div>
        <h2 className="text-3xl font-extrabold text-text-main tracking-tight leading-none">Set New Password</h2>
        <p className="text-sm text-text-secondary font-medium">Your recovery link is verified. Lock in fresh credentials.</p>
      </div>

      <div className="space-y-3">
        {error && (
          <div className="p-3 bg-accent/5 border border-accent/10 rounded-xl text-accent text-[10px] font-bold uppercase tracking-widest text-center animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50 ml-1">New Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl bg-card border border-card-border text-text-main focus:outline-none focus:border-accent transition-all font-medium pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-40 hover:opacity-100 transition-opacity"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50 ml-1">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl bg-card border border-card-border text-text-main focus:outline-none focus:border-accent transition-all font-medium pr-12"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-40 hover:opacity-100 transition-opacity"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={handleUpdatePassword}
        disabled={isLoading}
        className="w-full h-12 bg-accent text-accent-contrast font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
      >
        {isLoading ? 'Updating...' : 'Update Password'}
      </button>
    </div>
  );
}

// Components for the screens
function Screen1({ name, setName, email, setEmail, password, setPassword, nextStep, handleGoogleLogin }: any) {
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addToast = useStore((state) => state.addToast);

  const validatePassword = (pass: string) => {
    // At least one lowercase, uppercase, symbol, and number
    const hasSmall = /[a-z]/.test(pass);
    const hasCapital = /[A-Z]/.test(pass);
    const hasNumber = /\d/.test(pass);
    const hasSymbol = /[^a-zA-Z0-9\s]/.test(pass);
    const hasLength = pass.length >= 8;

    if (!hasLength) return 'At least 8 characters required';
    if (!hasSmall) return 'Add a lowercase letter';
    if (!hasCapital) return 'Add an uppercase letter';
    if (!hasNumber) return 'Add a number';
    if (!hasSymbol) return 'Add a special character';

    return '';
  };

  const handleManualNext = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setGeneralError('All fields are required.');
      addToast({ type: 'error', title: 'Missing fields', description: 'Name, email, and password confirmation are required.' });
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      addToast({ type: 'error', title: 'Mismatch', description: 'Passwords must be identical.' });
      return;
    }
    const pError = validatePassword(password);
    if (pError) {
      setPasswordError(pError);
      addToast({ type: 'error', title: 'Password needs work', description: pError });
      return;
    }

    setIsSubmitting(true);
    setGeneralError('');
    setPasswordError('');

    // Trigger signup
    try {
      const normalizedEmail = sanitizeText(email, 254).toLowerCase();
      const limit = checkClientRateLimit(normalizedEmail || 'unknown', 'auth_signup', 5, 15);
      if (!limit.allowed) throw new Error(formatRetryAfter(limit.retryAfterMs));
      const defaultAvatar = getRandomVisNovaAvatar(`${normalizedEmail}-${Date.now()}`);
      
      const redirectUrl = getAuthRedirectUrl();
      const { data, error: signupError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: name,
            display_name: name,
            username: normalizedEmail.split('@')[0],
            avatar_url: defaultAvatar
          }
        }
      });

      if (signupError) throw signupError;
      if (data.user) {
        await useStore.getState().ensureCurrentUserProfile();
      }
      
      addToast({
        type: 'success',
        title: 'Account created',
        description: data.user?.identities?.length === 0 
          ? 'This email is already registered. Please login.'
          : 'Verification email sent. Please check your inbox.',
      });
      
      if (data.user?.identities?.length === 0) {
        nextStep(11); // Already registered, go to login
      } else {
        nextStep(2);
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      const message = err.message || 'Signup failed';
      if (message.includes('already registered')) {
        setGeneralError('Email already registered. Redirecting to login...');
        addToast({ type: 'info', title: 'Account exists', description: 'Redirecting to login page.' });
        setTimeout(() => nextStep(11), 1000);
      } else {
        setGeneralError(message);
        addToast({ type: 'error', title: 'Signup failed', description: message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col justify-center max-w-sm mx-auto space-y-5 w-full">
      <div className="space-y-3">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="mb-4 flex items-center gap-3">
            <BrandLogo className="h-12 w-12 rounded-2xl shadow-lg shadow-accent/15" />
            <h1 className="text-4xl font-extrabold tracking-tight text-text-main">VisNova</h1>
          </div>
          <p className="text-text-secondary font-medium  opacity-70">Your Visionary Planner.</p>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-text-main leading-tight"
        >
          Start building your future
        </motion.h2>
      </div>

      <div className="space-y-3">
        {generalError && (
          <div className="p-3 bg-accent/5 border border-accent/10 rounded-xl text-accent text-[10px] font-bold uppercase tracking-widest text-center animate-in fade-in slide-in-from-top-1">
            {generalError}
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50 ml-1">Name</label>
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoComplete="name"
            className="w-full h-12 px-4 rounded-2xl bg-card border border-card-border text-text-main placeholder:text-text-secondary/30 focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50 ml-1">Email</label>
          <input
            type="email"
            placeholder="yourmail@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            className="w-full h-12 px-4 rounded-2xl bg-card border border-card-border text-text-main placeholder:text-text-secondary/30 focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50 ml-1">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError('');
              }}
              autoComplete="new-password"
              className={cn(
                "w-full h-12 px-4 pr-12 rounded-2xl bg-card border text-text-main placeholder:text-text-secondary/30 focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all",
                passwordError ? "border-accent/40 bg-accent/[0.02]" : "border-card-border focus:border-accent"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-text-secondary opacity-50 transition-opacity hover:opacity-100"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50 ml-1">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={e => {
                setConfirmPassword(e.target.value);
                if (passwordError) setPasswordError('');
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') void handleManualNext();
              }}
              autoComplete="new-password"
              className={cn(
                "w-full h-12 px-4 pr-12 rounded-2xl bg-card border text-text-main placeholder:text-text-secondary/30 focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all",
                passwordError ? "border-accent/40 bg-accent/[0.02]" : "border-card-border focus:border-accent"
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-text-secondary opacity-50 transition-opacity hover:opacity-100"
              aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {passwordError && (
            <p className="text-[9px] font-bold text-text-secondary/60 ml-1 mt-1 uppercase tracking-widest opacity-80">
              {passwordError}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3 pt-1">
        <button
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
          className="w-full h-12 rounded-2xl border border-card-border bg-card text-text-main font-black uppercase tracking-widest text-[11px] transition-all hover:border-accent/40 hover:bg-surface-muted active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
        >
          <GoogleIcon />
          Continue with Google
        </button>
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-card-border" />
          <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary/40">or</span>
          <span className="h-px flex-1 bg-card-border" />
        </div>
        <button
          onClick={handleManualNext}
          disabled={isSubmitting}
          className="w-full h-12 bg-accent text-accent-contrast font-bold rounded-2xl transition-all hover:shadow-lg hover:shadow-accent/10 active:scale-95"
        >
          {isSubmitting ? 'Loading...' : 'Create account'}
        </button>
      </div>

      <div className="space-y-4 text-center">
        <p className="text-sm text-text-secondary font-medium">
          Already have an account? <button onClick={() => nextStep(11)} className="text-accent hover:underline font-bold">Login</button>
        </p>
      </div>
    </div>
  );
}

function ScreenVerify({ email, nextStep, onChangeEmail }: any) {
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');
  const [isResending, setIsResending] = useState(false);
  const { session } = useStore();

  const checkVerification = async () => {
    setIsChecking(true);
    setError('');

    try {
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      const user = updatedUser;

      if (user?.email_confirmed_at) {
        nextStep();
      } else if (user) {
        setError('Verification pending. Please check your email and click the link.');
      } else {
        setError('Try clicking the verification link in your email again.');
      }
    } catch (err) {
      setError('Connection timeout. Please check your internet and try again.');
    } finally {
      setIsChecking(false);
    }
  };

  // Poll for verification status every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.email_confirmed_at) {
          nextStep();
        }
      });
    }, 5000 * 3); // 15 seconds
    return () => clearInterval(timer);
  }, [nextStep]);

  const handleResend = async () => {
    setIsResending(true);
    setError('');
    try {
      const normalizedEmail = sanitizeText(session?.user?.email || email, 254).toLowerCase();
      if (!normalizedEmail) throw new Error('Enter your email first.');
      const limit = checkClientRateLimit(normalizedEmail || 'unknown', 'auth_resend', 5, 15);
      if (!limit.allowed) throw new Error(formatRetryAfter(limit.retryAfterMs));
      await supabase.auth.resend({
        type: 'signup',
        email: normalizedEmail,
        options: { emailRedirectTo: getAuthRedirectUrl() }
      });
      setError('A new verification link has been dispatched to your inbox.');
    } catch (err: any) {
      setError(err.message || 'Resend failed.');
    } finally {
      setIsResending(false);
    }
  };

  const getMailProviderLink = () => {
    if (email.includes('gmail.com')) return 'https://mail.google.com';
    if (email.includes('outlook.com') || email.includes('hotmail.com')) return 'https://outlook.live.com';
    return null;
  };

  const mailLink = getMailProviderLink();

  return (
    <div className="flex flex-col justify-center max-w-sm mx-auto space-y-5 w-full">
      <div className="space-y-4 text-center">
        <div className="w-20 h-20 bg-accent/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-accent animate-pulse">
          <Mail size={40} />
        </div>
        <h2 className="text-4xl font-extrabold text-text-main tracking-tight">Check Your Inbox</h2>
        <p className="text-sm text-text-secondary font-medium leading-relaxed">
          We've sent a <span className="text-text-main font-bold">verification link</span> to <span className="text-accent underline font-bold">{email}</span>.
        </p>

        {mailLink && (
          <a
            href={mailLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-card-border rounded-xl text-[10px] font-black uppercase tracking-widest text-text-main hover:border-accent transition-all mt-2"
          >
            Open {email.includes('gmail') ? 'Gmail' : 'Outlook'}
          </a>
        )}
      </div>

      <div className="space-y-3">
        {error && (
          <div className="p-4 bg-accent/5 border border-accent/10 rounded-2xl text-accent text-[9px] font-black uppercase tracking-widest text-center leading-normal animate-in fade-in slide-in-from-bottom-1">
            {error}
          </div>
        )}

        <button
          onClick={checkVerification}
          disabled={isChecking}
          className="w-full h-16 bg-accent text-accent-contrast font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {isChecking ? 'Verifying...' : 'I have clicked the link'}
        </button>

        <div className="p-5 bg-card border border-card-border rounded-2xl space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary opacity-40">Still nothing?</span>
              <button
                onClick={handleResend}
                disabled={isResending}
                className="text-[9px] font-black uppercase tracking-widest text-accent hover:underline disabled:opacity-40"
              >
                {isResending ? 'Sending...' : 'Resend link'}
              </button>
            </div>
            <div className="flex flex-col gap-2 border-t border-card-border pt-3">
              <button
                onClick={onChangeEmail}
                className="text-[9px] font-black uppercase tracking-widest text-text-secondary hover:text-text-main opacity-40 hover:opacity-100 transition-all text-left flex items-center gap-1"
              >
                <ArrowLeft size={10} /> Change email address
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Screen2({ interests, toggleInterest, interestOptions, nextStep }: any) {
  return (
    <div className="flex flex-col justify-center max-w-sm mx-auto space-y-5 w-full">
      <div className="space-y-2 text-center md:text-left">
        <h2 className="text-4xl font-bold text-text-main leading-tight tracking-tight">What drives you?</h2>
        <p className="text-sm text-text-secondary font-medium tracking-tight">Select your focus areas.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
         {interestOptions.map((opt: string) => {
           const isSelected = interests.includes(opt);
           return (
             <button
               key={opt}
               onClick={() => toggleInterest(opt)}
               className={cn(
                 "h-14 px-5 rounded-2xl text-sm font-bold transition-all duration-300 border shadow-sm flex items-center justify-center gap-2",
                 isSelected
                   ? "bg-accent text-accent-contrast border-accent scale-[1.02] shadow-lg shadow-accent/20"
                   : "bg-card border-card-border text-text-secondary hover:border-accent/30 hover:text-text-main"
               )}
             >
               {opt}
             </button>
           );
         })}
      </div>

      <div className="pt-6">
        <button
          onClick={nextStep}
          disabled={interests.length < 2}
          className="w-full h-12 bg-accent text-accent-contrast font-bold rounded-2xl disabled:opacity-50 disabled:bg-text-secondary transition-all hover:shadow-lg hover:shadow-accent/10 active:scale-95"
        >
          {interests.length < 2 ? `Select ${2 - interests.length} more` : 'Proceed to Alignment'}
        </button>
      </div>
    </div>
  );
}

function Screen3({ intent, setIntent, nextStep }: any) {
  return (
    <div className="flex flex-col justify-center max-w-sm mx-auto space-y-5 w-full">
      <div className="space-y-2">
        <h2 className="text-4xl font-bold text-text-main leading-tight tracking-tight">Your Goal</h2>
        <p className="text-sm text-text-secondary font-medium">What is the most important thing you are building right now?</p>
      </div>

      <div className="space-y-5">
        <div className="relative group">
          <textarea
            value={intent}
            onChange={e => setIntent(e.target.value)}
            placeholder="Example: Launch a profitable SaaS business by Q4..."
            className="w-full h-40 p-6 rounded-3xl bg-card border border-card-border text-text-main placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all resize-none text-lg font-medium leading-relaxed"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60 ml-1">Suggestions</label>
          <div className="flex flex-wrap gap-2">
            {["Master Full-Stack Dev", "Run a Marathon", "Learn UI Design", "Write a Book"].map(sugg => (
              <button
                key={sugg}
                onClick={() => setIntent(sugg)}
                className="px-4 py-2 rounded-full bg-card border border-card-border text-[11px] font-bold text-text-secondary hover:border-accent hover:text-accent transition-all"
              >
                {sugg}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-4">
        <button
          onClick={nextStep}
          disabled={!intent.trim()}
          className="w-full h-12 bg-accent text-accent-contrast font-bold rounded-2xl disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-accent/10 active:scale-95"
        >
          Anchor Objective
        </button>
      </div>
    </div>
  );
}

function Screen4({ commitment, setCommitment, nextStep }: any) {
  const commitments = [
    { id: 'casual', title: 'Casual Exploration', desc: 'Minimal pressure, exploring new horizons.' },
    { id: 'consistent', title: 'Disciplined Growth', desc: "Daily commitment to progress and learning." },
    { id: 'all-in', title: 'Absolute Mastery', desc: "Radical focus. Execution is the only option." },
  ];

  return (
    <div className="flex flex-col justify-center max-w-sm mx-auto space-y-5 w-full">
      <div className="space-y-2">
        <h2 className="text-4xl font-bold text-text-main leading-tight tracking-tight">Level of Ambition</h2>
        <p className="text-sm text-text-secondary font-medium">How intense should your feedback loops be?</p>
      </div>

      <div className="space-y-3">
        {commitments.map(c => {
          const isSelected = commitment === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setCommitment(c.id)}
              className={cn(
                "w-full text-left p-6 rounded-3xl transition-all duration-300 border flex items-center justify-between group",
                isSelected
                  ? "bg-accent text-accent-contrast border-accent scale-[1.02] shadow-xl shadow-accent/10"
                  : "bg-card border-card-border hover:border-accent/30"
              )}
            >
              <div className="space-y-1">
                <h4 className={cn("font-bold text-lg", isSelected ? "text-accent-contrast" : "text-text-main")}>{c.title}</h4>
                <p className={cn("text-xs font-medium", isSelected ? "text-accent-contrast/70" : "text-text-secondary/60")}>{c.desc}</p>
              </div>
              {isSelected && <CheckCircle2 size={24} className="text-accent-contrast bg-accent-contrast/20 rounded-full p-1" />}
            </button>
          )
        })}
      </div>

      <div className="pt-6">
        <button
          onClick={nextStep}
          disabled={!commitment}
          className="w-full h-12 bg-accent text-accent-contrast font-bold rounded-2xl disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-accent/10 active:scale-95"
        >
          Confirm Trajectory
        </button>
      </div>
    </div>
  );
}

function Screen5({ interests, intent, nextStep }: any) {
  return (
    <div className="flex flex-col justify-center max-w-sm mx-auto space-y-5 w-full">
      <div className="space-y-2">
        <h2 className="text-4xl font-bold text-text-main leading-tight tracking-tight">The Blueprint</h2>
        <p className="text-sm text-text-secondary font-medium">Your initial strategy has been generated.</p>
      </div>

      <div className="space-y-3">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-6 rounded-3xl bg-card space-y-4 border border-card-border shadow-xl shadow-accent/5"
        >
           <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent px-2.5 py-1.5 bg-accent/5 rounded-lg border border-accent/10">
                 GOAL: {interests[0] || 'Goal'}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs text-text-secondary font-black">ACTIVE</span>
              </div>
           </div>
           <h3 className="font-bold text-text-main text-2xl leading-tight">{intent}</h3>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-3xl bg-card space-y-4 border border-card-border shadow-xl shadow-accent/5"
        >
          <h4 className="text-[10px] font-black text-text-secondary/60 uppercase tracking-widest">Next Steps</h4>
          <ul className="space-y-3">
             {["Plan your daily tasks", "Review your progress", "Stay aligned"].map((task, i) => (
                <li key={i} className="flex items-center gap-4 text-sm text-text-main font-bold">
                   <div className="w-6 h-6 rounded-lg border-2 border-card-border flex items-center justify-center bg-bg-base" />
                   {task}
                </li>
             ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-3xl bg-accent text-accent-contrast flex items-center gap-4 shadow-2xl shadow-accent/20"
        >
           <div className="w-12 h-12 rounded-2xl bg-accent-contrast/10 backdrop-blur-md border border-accent-contrast/20 flex items-center justify-center shrink-0">
             <CheckCircle2 size={24} className="text-accent-contrast" />
           </div>
           <div>
            <p className="text-sm font-bold">Commitment Verified</p>
            <p className="text-[10px] text-accent-contrast/70 font-medium uppercase tracking-widest mt-0.5">Ready for deployment</p>
           </div>
        </motion.div>
      </div>

      <div className="pt-4">
        <button
          onClick={nextStep}
          className="w-full h-12 bg-accent text-accent-contrast font-bold rounded-2xl hover:opacity-90 transition-all shadow-lg active:scale-95"
        >
          Finalize Identity
        </button>
      </div>
    </div>
  );
}

function Screen6({ nextStep }: any) {
  return (
    <div className="flex flex-col h-full justify-center max-w-md mx-auto w-full text-center space-y-12 py-10">
      <div className="space-y-6">
        <motion.div
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           transition={{ type: 'spring', damping: 12 }}
           className="w-24 h-24 bg-accent rounded-full mx-auto flex items-center justify-center shadow-2xl shadow-accent/30"
        >
          <CheckCircle2 size={48} className="text-accent-contrast" />
        </motion.div>
        <div className="space-y-3">
          <h2 className="text-6xl font-black text-text-main tracking-tighter leading-none">NOW PROVE IT.</h2>
          <p className="text-xl text-accent font-bold  tracking-tight opacity-80">Execution is the final authority.</p>
        </div>
      </div>

      <button
        onClick={nextStep}
        className="mx-auto px-12 h-16 bg-text-main text-bg-base font-black uppercase tracking-[0.25em] text-xs rounded-full hover:scale-105 active:scale-95 transition-all shadow-2xl"
      >
        Personalize Identity
      </button>
    </div>
  );
}
function Screen7({ avatar, setAvatar, name, setName, username, setUsername, bio, setBio, gender, setGender, currentUserId, nextStep }: any) {
  const [showLibrary, setShowLibrary] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const addToast = useStore((state) => state.addToast);

  const normalizeUsername = (val: string) => {
    return val.toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 20);
  };

  useEffect(() => {
    if (!avatar) {
      setAvatar(DEFAULT_PROFILE_AVATARS.male);
    }
  }, []);

  const handleGenderToggle = (newGender: 'male' | 'female') => {
    setGender(newGender);
    // Auto-update avatar to default for gender if user hasn't explicitly picked a non-default one
    if (!avatar || avatar.includes('dicebear.com/7.x/shapes/svg?seed=neutral-')) {
       setAvatar(DEFAULT_PROFILE_AVATARS[newGender as ProfileChoice]);
    }
  };

  const handleProceed = async () => {
    const cleanUsername = normalizeUsername(username);
    setUsername(cleanUsername);

    if (!name || !username) {
       addToast({ type: 'error', title: 'Profile required', description: 'Name and username are required.' });
       return;
    }

    if (!/^[a-z0-9_]{3,24}$/.test(cleanUsername)) {
      setUsernameError('Use 3-24 lowercase letters, numbers, or underscores.');
      return;
    }

    setIsCheckingUsername(true);
    try {
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (existingUser && existingUser.id !== currentUserId) {
        setUsernameError('Username is already taken.');
        setIsCheckingUsername(false);
        return;
      }

      nextStep();
    } catch (err: any) {
      nextStep();
    } finally {
      setIsCheckingUsername(false);
    }
  };

  return (
    <div className="flex flex-col justify-center max-w-sm mx-auto space-y-6 w-full pb-10">
      <div className="space-y-2">
        <h2 className="text-4xl font-bold text-text-main leading-tight tracking-tight">Identity</h2>
        <p className="text-sm text-text-secondary font-medium">Finalize your profile settings.</p>
      </div>

      {/* Avatar Integration */}
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-1">
          <div className="relative group cursor-pointer" onClick={() => setShowLibrary(!showLibrary)}>
             <div className="w-20 h-20 rounded-3xl border-4 border-bg-base overflow-hidden bg-card shadow-2xl transition-transform hover:scale-105 active:scale-95">
                <img src={avatar || DEFAULT_PROFILE_AVATARS.male} className="w-full h-full object-cover" alt="User" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                   <ImageIcon size={20} />
                </div>
             </div>
             <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-accent text-accent-contrast rounded-xl border-2 border-white flex items-center justify-center shadow-lg">
                <Plus size={14} />
             </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60">Profile Visualization</p>
            <button 
              type="button"
              onClick={() => setShowLibrary(!showLibrary)}
              className="text-xs font-bold text-accent hover:underline"
            >
              {showLibrary ? 'Lock Identity' : 'Expand Library'}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showLibrary && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="w-full bg-card border border-card-border rounded-3xl p-6 shadow-2xl relative z-20"
            >
              <div className="grid grid-cols-4 gap-3">
                {[...AVATAR_LIBRARY].map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => { setAvatar(url); setShowLibrary(false); }}
                    className={cn(
                      "aspect-square rounded-2xl overflow-hidden border-2 transition-all hover:scale-110 shadow-sm",
                      avatar === url ? "border-accent ring-2 ring-accent/20" : "border-card-border opacity-60 hover:opacity-100"
                    )}
                  >
                    <img src={url} className="w-full h-full object-cover" alt="" />
                  </button>
                ))}
                <label className="aspect-square rounded-2xl border-2 border-dashed border-card-border flex items-center justify-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-all group">
                   <Zap size={20} className="text-text-secondary/40 group-hover:text-accent transition-colors" />
                   <input
                     type="file"
                     accept="image/png,image/jpeg,image/webp"
                     className="hidden"
                     disabled={isUploadingAvatar}
                     onChange={async (e) => {
                       const file = e.target.files?.[0];
                       e.target.value = '';
                       if (!file) return;

                       setIsUploadingAvatar(true);
                       try {
                         const { publicUrl } = await uploadAvatar(file, currentUserId);
                         setAvatar(publicUrl);
                         setShowLibrary(false);
                       } catch (error: any) {
                         console.error('Onboarding avatar upload failed:', error);
                         addToast({ type: 'error', title: 'Photo failed', description: error.message || 'Could not upload your profile photo.' });
                       } finally {
                         setIsUploadingAvatar(false);
                       }
                     }}
                   />
                </label>
              </div>
              {isUploadingAvatar && (
                <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-accent">Uploading photo...</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-6">
        <div className="flex gap-2">
           {(['male', 'female'] as const).map(opt => (
             <button
               key={opt}
               type="button"
               onClick={() => handleGenderToggle(opt)}
               className={cn(
                 "flex-1 h-14 rounded-2xl flex flex-col items-center justify-center border-2 transition-all active:scale-95",
                 gender === opt 
                   ? "bg-accent/5 border-accent shadow-premium" 
                   : "bg-surface border-card-border opacity-40 hover:opacity-100"
               )}
             >
               <span className="text-[10px] font-black uppercase tracking-widest">{opt}</span>
             </button>
           ))}
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60 ml-1">Display Name</label>
          <input
            type="text"
            placeholder="How should we call you?"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full h-12 px-4 rounded-xl bg-card border border-card-border text-text-main placeholder:text-text-secondary/30 focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all font-bold"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60 ml-1">Username</label>
          <div className="relative group">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-text-secondary/40 font-black text-sm">@</span>
            <input
              type="text"
              placeholder="unique_id"
              value={username}
              onChange={e => {
                setUsername(normalizeUsername(e.target.value));
                setUsernameError('');
              }}
              className="w-full h-14 pl-10 pr-5 rounded-xl bg-card border border-card-border text-text-main placeholder:text-text-secondary/20 focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all font-bold tracking-tight"
            />
          </div>
          {usernameError && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-accent ml-1 animate-in fade-in slide-in-from-left-1">{usernameError}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60 ml-1">Bio</label>
          <textarea
            placeholder="Tell the architect who you are..."
            value={bio}
            onChange={e => setBio(e.target.value)}
            className="w-full h-24 p-5 rounded-xl bg-card border border-card-border text-text-main placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all resize-none custom-scrollbar text-sm font-medium leading-relaxed"
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={handleProceed}
          disabled={!name || !username || isCheckingUsername}
          className="w-full h-14 bg-text-main text-bg-base font-black uppercase tracking-widest text-[11px] rounded-xl disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xl"
        >
          {isCheckingUsername ? 'Loading...' : 'Select your role'}
        </button>
      </div>
    </div>
  );
}

const ROLE_CATEGORIES = [
  'Growth', 'Lifestyle', 'Career', 'Wallet', 'Creativity', 'Coding', 'Study', 'Business', 'Fitness', 'Mindset', 'Productivity'
];

function ScreenInterests({ selectedInterests, setSelectedInterests, nextStep }: any) {
  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i: string) => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  return (
    <div className="flex flex-col items-center text-center max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-3xl bg-accent/10 flex items-center justify-center text-accent mb-8">
        <Sparkles size={32} />
      </div>
      <h2 className="text-4xl font-black text-text-main mb-4 uppercase tracking-tight">Select Interests</h2>
      <p className="text-text-secondary font-medium mb-12 uppercase tracking-widest text-[11px] opacity-60">Personalize your feed</p>
      
      <div className="grid grid-cols-2 gap-3 w-full mb-12">
        {ROLE_CATEGORIES.map(interest => (
          <button
            key={interest}
            onClick={() => toggleInterest(interest)}
            className={cn(
              "p-4 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest",
              selectedInterests.includes(interest) 
                ? "bg-accent border-accent text-white shadow-xl shadow-accent/20" 
                : "bg-surface-muted border-card-border text-text-secondary hover:border-accent/40"
            )}
          >
            {interest}
          </button>
        ))}
      </div>
      
      <button
        onClick={() => nextStep()}
        disabled={selectedInterests.length === 0}
        className="w-full h-16 rounded-2xl bg-accent text-accent-contrast text-xs font-black uppercase tracking-widest shadow-2xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
      >
        Sync & Initialize
      </button>
    </div>
  );
}

function Screen8({ role, setRole, ROLE_CATEGORIES, nextStep }: any) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCategories = ROLE_CATEGORIES.map((category: any) => ({
    ...category,
    roles: category.roles.filter((r: string) => r.toLowerCase().includes(searchTerm.toLowerCase()))
  })).filter((category: any) => category.roles.length > 0);

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto w-full pt-10">
      <div className="space-y-2 mb-8 shrink-0">
        <h2 className="text-4xl font-bold text-text-main leading-tight tracking-tight">Identity Role</h2>
        <p className="text-sm text-text-secondary font-medium">How do you define your current trajectory?</p>
      </div>

      <div className="sticky top-0 bg-bg-base z-10 py-4 mb-6">
        <div className="relative group">
          <input
            type="text"
            placeholder="Search roles (e.g. Developer, Founder...)"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-14 px-6 pr-12 rounded-2xl bg-card border border-card-border text-text-main placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all font-medium shadow-sm"
          />
          <div className="absolute right-5 top-1/2 -translate-y-1/2 text-text-secondary/60">
             <CheckCircle2 size={20} className={cn("transition-colors", searchTerm ? "text-accent" : "opacity-20")} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-10 pb-40 px-1">
        {filteredCategories.map((category: any) => (
          <div key={category.name} className="space-y-3">
            <h4 className="text-[10px] font-black text-text-secondary/60 uppercase tracking-[0.2em] ml-1">{category.name}</h4>
            <div className="flex flex-wrap gap-2.5">
              {category.roles.map((r: string, rIdx: number) => {
                const isSelected = role === r;
                return (
                  <button
                    key={`${category.name}-${r}-${rIdx}`}
                    onClick={() => setRole(r)}
                    className={cn(
                      "flex items-center gap-2.5 h-12 px-6 rounded-2xl text-sm font-bold transition-all duration-300 border shadow-sm",
                      isSelected
                        ? "bg-accent text-accent-contrast border-accent scale-[1.05] shadow-xl shadow-accent/20 z-10"
                        : "bg-card border-card-border text-text-secondary hover:border-accent/30 hover:text-text-main"
                    )}
                  >
                    {isSelected && <CheckCircle2 size={16} />}
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {filteredCategories.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 px-10 border-2 border-dashed border-card-border rounded-3xl"
          >
             <p className="text-text-secondary/60 font-bold mb-4">No VisNova mappings found for "{searchTerm}"</p>
             <button
               onClick={() => setRole(searchTerm)}
               className="px-6 py-3 bg-accent text-accent-contrast font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all"
             >
                Initialize Custom Role: {searchTerm}
             </button>
          </motion.div>
        )}
      </div>

      <div className="fixed bottom-10 left-0 right-0 px-6 flex justify-center pointer-events-none z-50">
        <button
          onClick={() => nextStep()}
          disabled={!role}
          className="w-full max-w-sm h-16 bg-accent text-accent-contrast font-black uppercase tracking-[0.25em] text-xs rounded-2xl disabled:opacity-50 disabled:bg-text-secondary transition-all shadow-2xl shadow-accent/40 pointer-events-auto active:scale-95"
        >
          CONTINUE
        </button>
      </div>
    </div>
  );
}

function ScreenCreateFirstVision({ onCreate, onSkip }: { onCreate: (title: string) => Promise<void>; onSkip: () => void }) {
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const submit = async () => {
    const nextTitle = title.trim();
    if (!nextTitle || isCreating) return;
    setIsCreating(true);
    try {
      await onCreate(nextTitle);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex h-full w-full max-w-sm flex-col justify-center space-y-7 py-10 mx-auto">
      <div className="space-y-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Target size={26} />
        </div>
        <h2 className="text-4xl font-bold leading-tight tracking-tight text-text-main">Create your first Vision</h2>
        <p className="text-sm font-medium text-text-secondary">What are you working toward?</p>
      </div>
      <div className="space-y-3">
        <input
          autoFocus
          maxLength={120}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Launch my portfolio, master DSA, build a startup..."
          className="h-14 w-full rounded-2xl border border-card-border bg-card px-5 text-sm font-bold text-text-main outline-none transition-all placeholder:text-text-secondary/40 focus:border-accent focus:ring-4 focus:ring-accent/10"
        />
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/40">{title.length}/120</p>
      </div>
      <button
        onClick={submit}
        disabled={!title.trim() || isCreating}
        className="h-14 rounded-2xl bg-accent text-xs font-black uppercase tracking-widest text-accent-contrast shadow-2xl shadow-accent/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
      >
        {isCreating ? 'Creating...' : 'Create Vision & Start'}
      </button>
      <button onClick={onSkip} disabled={isCreating} className="text-xs font-black uppercase tracking-widest text-text-secondary/50 hover:text-accent">
        Skip for now
      </button>
    </div>
  );
}

function Screen9({ handleForceStart }: { handleForceStart: () => void }) {
  const [showFailsafe, setShowFailsafe] = useState(false);
  const { hasCompletedOnboarding } = useStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasCompletedOnboarding) {
        setShowFailsafe(true);
      }
    }, 4500); // Show failsafe after 4.5 seconds (reduced from 8)
    return () => clearTimeout(timer);
  }, [hasCompletedOnboarding]);

  return (
    <div className="flex flex-col h-full justify-center max-w-sm mx-auto w-full text-center space-y-10 py-10">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        className="mx-auto w-16 h-16 border-[6px] border-accent/5 border-t-accent rounded-full shadow-2xl shadow-accent/20"
      />
      <div className="space-y-3">
        <h2 className="text-2xl font-black text-text-main tracking-tight uppercase">Setting up VisNova</h2>
        <p className="text-sm text-text-secondary font-medium tracking-tight">Getting things ready...</p>
      </div>

      <div className="w-full bg-accent/5 rounded-full h-1.5 overflow-hidden">
         <motion.div
           initial={{ width: 0 }}
           animate={{ width: "100%" }}
           transition={{ duration: 1.5 }}
           className="h-full bg-accent"
         />
      </div>

      <AnimatePresence>
        {showFailsafe && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 pt-10"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-40">Connection seems sluggish</p>
            <button
              onClick={handleForceStart}
              className="px-6 py-3 bg-text-main text-bg-base text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:scale-105 transition-all shadow-xl"
            >
              Skip to Dashboard
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OnboardingFlow() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const { completeOnboarding, addToast, session, signOut, addVision } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const verifiedLogin = searchParams.get('verified') === 'true';

  const handleForceStart = async () => {
    if (!username) {
        setStep(8);
        addToast({ type: 'info', title: 'Finalization required', description: 'Please set your identity handle first.' });
        return;
    }
    await handleComplete();
  };

  // Save step to backend (removed localStorage sync)

  useEffect(() => {
    if (verifiedLogin || location.pathname === '/login') {
      setStep(11);
      if (verifiedLogin) {
        addToast({ type: 'success', title: 'Email verified', description: 'Email verified. You can now log in.' });
      }
    }
  }, [addToast, location.pathname, verifiedLogin]);

  // State
  const [name, setName] = useState(session?.user?.user_metadata?.full_name || '');
  const [email, setEmail] = useState(session?.user?.email || '');
  const [password, setPassword] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [intent, setIntent] = useState('');
  const [commitment, setCommitment] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState<ProfileChoice>('male');
  const [role, setRole] = useState('');
  const [avatar, setAvatar] = useState(() => getRandomVisNovaAvatar());

  // Sync state from session
  useEffect(() => {
    if (session?.user) {
      setName(prev => prev || session.user.user_metadata?.full_name || '');
      setEmail(prev => prev || session.user.email || '');
    }
  }, [session?.user]);

  // Handle session-based redirection
  useEffect(() => {
    const syncOnboardingStep = async () => {
      const params = new URLSearchParams(window.location.search);
      const isRecoveryMode = params.get('mode') === 'reset-password' || sessionStorage.getItem('visnova-auth-link-mode') === 'recovery';
      if (isRecoveryMode) {
        setStep(13);
        return;
      }

      const userId = session?.user?.id;
      if (userId) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_step, onboarded')
            .eq('id', userId)
            .maybeSingle();
            
          if (profile?.onboarded) {
             const today = new Date().toISOString().slice(0, 10);
             trackBetaEvent(userId, 'returning_user_login', { day: today });
             addToast({ type: 'success', title: 'Session restored', description: 'Returning to dashboard.' });
             navigate('/');
             return;
          }
          
          if (profile && profile.onboarding_step > 0 && profile.onboarding_step < 10) {
             setStep(profile.onboarding_step);
          } else if (step === 1 || step === 11) {
             // Only auto-advance if we're on the start screens and a session just appeared
             setStep(3);
          }
        } catch (err) {
          console.error('Failed to sync onboarding step:', err);
        }
      }
    };

    syncOnboardingStep();
  }, [session?.user?.id]);

  // Automatic progression for email confirmation
  useEffect(() => {
    if (session?.user?.email_confirmed_at && step === 2) {
      nextStep();
    }
  }, [session?.user, step]);

  const handleGoogleLogin = async () => {
    await useStore.getState().signInWithGoogle();
  };

  const nextStep = useCallback((targetStep?: number) => {
    setDirection(1);
    const nextS = typeof targetStep === 'number' ? targetStep : step + 1;
    setStep(nextS);
    
    // Persist to DB if logged in
    const userId = session?.user?.id;
    if (userId && Number.isInteger(nextS) && nextS < 10) {
      supabase.from('profiles').update({ onboarding_step: nextS }).eq('id', userId)
        .then(({ error }) => {
          if (error) console.error('Failed to save onboarding progress:', error);
        });
    }
  }, [step, session?.user?.id]);

  const prevStep = useCallback(() => {
    setDirection(-1);
    // If we're on Login (11) or ForgotPassword (12), go back to signup (1)
    setStep((prev) => {
      if (prev === 11 || prev === 12 || prev === 13) return 1;
      if (prev <= 1) return 1;
      return prev - 1;
    });
  }, []);

  const handleComplete = async (hasInitialVision = false) => {
    if (!username || username.trim().length === 0) {
        if (step !== 8) setStep(8);
        addToast({ type: 'info', title: 'Username required', description: 'Please choose a unique identifying handle before proceeding.' });
        return;
    }
    
    setStep(9.5);

    try {
      const currentUser = session?.user;

      await completeOnboarding({
        name: name || 'Visionary Explorer',
        email: email || currentUser?.email || 'explorer@visnova.ai',
        interests,
        intent,
        commitment,
        username,
        bio,
        gender,
        role,
        avatar,
        hasInitialVision
      });
    } catch (err) {
      console.error('Finalization failed:', err);
      addToast({ type: 'error', title: 'Setup interrupted', description: 'Something went wrong during final sync.' });
    }
  };

  const handleCreateFirstVision = async (visionTitle: string) => {
    try {
      const cleanTitle = sanitizeText(visionTitle).slice(0, 120) || 'My first Vision';
      await addVision({
        title: cleanTitle,
        description: commitment ? `Commitment level: ${commitment}` : '',
        progress: 0,
        status: 'planning',
        tags: interests,
        tasks: [],
        notes: '',
        proof: [],
        elements: [],
        visibility: 'private'
      });
      await handleComplete(true);
    } catch (err) {
      console.error('Failed to create first Vision:', err);
      addToast({
        type: 'error',
        title: 'Vision failed',
        description: err instanceof Error ? err.message : 'Could not create your first Vision.'
      });
    }
  };


  const slideVariants: Variants = {
    initial: (direction: number) => ({
      x: direction > 0 ? '5%' : '-5%',
      opacity: 0,
      scale: 0.98
    }),
    animate: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, ease: "easeOut" },
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '5%' : '-5%',
      opacity: 0,
      scale: 0.98,
      transition: { duration: 0.3, ease: 'easeIn' },
    }),
  };

  const interestOptions = ['Tech', 'Business', 'Study', 'Growth', 'Health', 'Creative', 'Lifestyle'];
  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 1: return <Screen1 name={name} setName={setName} email={email} setEmail={setEmail} password={password} setPassword={setPassword} nextStep={nextStep} handleGoogleLogin={handleGoogleLogin} />;
      case 11:
        return <ScreenLogin
          email={email} setEmail={setEmail}
          nextStep={nextStep}
          switchToSignup={() => nextStep(1)}
          setStep={setStep}
          handleGoogleLogin={handleGoogleLogin}
          verifiedMessage={verifiedLogin}
        />;
      case 12:
        return <ScreenForgotPassword
          email={email} setEmail={setEmail}
          backToLogin={() => nextStep(11)}
        />;
      case 13: return <ScreenResetPassword nextStep={nextStep} />;
      case 2: return <ScreenVerify email={email} nextStep={nextStep} onChangeEmail={() => nextStep(1)} />;
      case 3: return <Screen2 interests={interests} toggleInterest={toggleInterest} interestOptions={interestOptions} nextStep={nextStep} />;
      case 4: return <Screen3 intent={intent} setIntent={setIntent} nextStep={nextStep} />;
      case 5: return <Screen4 commitment={commitment} setCommitment={setCommitment} nextStep={nextStep} />;
      case 6: return <Screen5 interests={interests} intent={intent} nextStep={nextStep} />;
      case 7: return <Screen6 nextStep={nextStep} />;
      case 8: return <Screen7 avatar={avatar} setAvatar={setAvatar} name={name} setName={setName} username={username} setUsername={setUsername} bio={bio} setBio={setBio} gender={gender} setGender={setGender} currentUserId={session?.user?.id} nextStep={nextStep} />;
      case 9: return <Screen8 role={role} setRole={setRole} ROLE_CATEGORIES={PROFILE_ROLE_CATEGORIES} nextStep={() => nextStep(9.25)} />;
      case 9.25: return <ScreenCreateFirstVision onCreate={handleCreateFirstVision} onSkip={() => handleComplete(false)} />;
      case 9.5: return <Screen9 handleForceStart={handleForceStart} />;
      case 10: return null; 
      default:
        console.warn('Unknown step encountered:', step);
        return (
          <div className="flex flex-col items-center justify-center flex-1 space-y-6 text-center">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center text-accent">
              <Zap size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-text-main tracking-tight">System Out of Sync</h3>
              <p className="text-sm text-text-secondary max-w-[200px] mx-auto">We couldn't determine your current setup step.</p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="px-8 h-12 bg-accent text-accent-contrast font-bold rounded-xl shadow-lg shadow-accent/20 transition-all hover:scale-105 active:scale-95"
            >
              Reset Session
            </button>
          </div>
        );
    }
  };

  const usesIntroCard = [1, 2, 3, 11, 12, 13].includes(step);

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-hidden bg-bg-base p-2 pt-[calc(0.5rem+env(safe-area-inset-top))] font-sans sm:p-4">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      {/* Top Header */}
      <div className="relative z-10 flex min-h-14 shrink-0 items-center justify-between px-2 py-2 sm:h-16 sm:px-5 sm:py-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
             <div className="w-2 h-2 bg-card rounded-full animate-pulse" />
          </div>
          <span className="text-sm font-black uppercase tracking-[0.3em] text-text-main">VisNova</span>
        </div>

        {step < 10 && (
          <div className="flex items-center gap-2 sm:gap-4">
            {session?.user && (
              <button
                onClick={async () => {
                  await signOut();
                  navigate('/');
                }}
                className="rounded-lg border border-accent/10 bg-accent/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-accent/60 transition-all hover:text-accent"
              >
                Sign Out
              </button>
            )}
            <button
              onClick={prevStep}
              className="group flex h-10 items-center gap-1.5 rounded-xl px-2 text-[10px] font-black uppercase tracking-widest text-text-secondary/60 transition-colors hover:text-text-main sm:gap-2"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Back
            </button>
          </div>
        )}

        <div className="ml-auto hidden md:flex items-center gap-5">
            {step < 10 && (step >= 8 || username) && (
              <button
                onClick={handleForceStart}
                className="text-[9px] font-black uppercase tracking-widest text-accent/40 hover:text-accent transition-all hover:scale-105 active:scale-95 px-3 py-1.5 rounded-lg border border-accent/10 hover:bg-accent/5"
              >
                Skip to Dashboard
              </button>
            )}
           {step < 10 && (
             <div className="flex gap-1">
               {[1,2,3,4,5,6,7,8,9].map(s => (
                 <div
                   key={s}
                   className={cn(
                     "h-1 transition-all duration-500",
                     step === s ? "w-8 bg-accent" : s < step ? "w-4 bg-accent/20" : "w-4 bg-card-border"
                   )}
                 />
               ))}
             </div>
           )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative flex min-h-0 flex-1 items-stretch justify-center sm:items-center">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 flex items-stretch justify-center overflow-hidden p-0 sm:items-center sm:p-3"
          >
            <div
              className={cn(
                "w-full overflow-y-auto custom-scrollbar",
                usesIntroCard
                  ? "max-h-full max-w-[520px] rounded-[1.5rem] border border-card-border bg-card/95 p-4 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-2xl shadow-accent/10 backdrop-blur-xl sm:rounded-[2rem] sm:p-7"
                  : "max-h-full max-w-[1180px] p-1 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:p-6"
              )}
            >
              {renderCurrentStep()}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Meta */}
      <div className="hidden h-8 shrink-0 flex-wrap items-center justify-center gap-3 px-4 opacity-50 sm:flex sm:h-10">
         <span className="text-[10px] font-bold text-text-secondary/60 uppercase tracking-widest">VisNova setup</span>
         <Link to="/cookie-policy" className="text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-accent">Cookie Policy</Link>
         <Link to="/privacy-policy" className="text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-accent">Privacy</Link>
         <Link to="/terms-of-service" className="text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-accent">Terms</Link>
      </div>
    </div>
  );
}
