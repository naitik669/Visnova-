import { useState, useEffect, useCallback, useRef, type ComponentProps, type ReactNode } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Mail,
  Zap,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Users,
  Plus,
  Sparkles,
  Target,
  Lock,
  Palette,
  ShieldCheck,
  ListChecks,
  Activity,
  CircleDot,
  NotebookPen,
  WandSparkles,
  ChevronRight,
  AlertTriangle,
  type LucideIcon
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { getAuthRedirectUrl, supabase, uploadAvatar } from '../../lib/supabase';
import { checkClientRateLimit, formatRetryAfter, sanitizeText } from '../../lib/security';
import { trackBetaEvent } from '../../lib/betaAnalytics';
import { getRandomVisNovaAvatar } from '../../lib/avatarLibrary';
import { PROFILE_ROLE_CATEGORIES } from '../../lib/profileRoles';
import { BrandLogo } from '../BrandLogo';
import { getOnboardingPath, ONBOARDING_FEATURE_CHIPS, ONBOARDING_PATHS, type OnboardingPathId } from '../../lib/onboardingConfig';

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

type RocketStageId = 'form' | 'anticipation' | 'failed_launch' | 'crashing' | 'error_idle' | 'launching';

const rocketStages = {
  form: {
    name: "Standard Idle Bobbing",
    animate: {
      y: [0, -9, 0],
      scaleY: [1, 1.025, 1],
      scaleX: [1, 0.985, 1],
      rotate: 0,
    },
    transition: {
      y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
      scaleY: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
      scaleX: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
      rotate: { duration: 0.8, ease: "easeInOut" },
    },
  },
  anticipation: {
    name: "Pre-Launch Compression & Tremor",
    animate: {
      y: 35,
      scaleY: 0.74,
      scaleX: 1.2,
      rotate: [-1.5, 1.5, -1.8, 1.8, -1.5, 1.5, -1],
    },
    transition: {
      rotate: { duration: 0.08, repeat: Infinity, ease: "linear" },
      y: { type: "spring", stiffness: 180, damping: 15 },
      scaleY: { type: "spring", stiffness: 180, damping: 15 },
      scaleX: { type: "spring", stiffness: 180, damping: 15 },
    },
  },
  failed_launch: {
    name: "Mid-Air Sputter & Axis Tilting",
    animate: {
      y: -120,
      scaleY: 1.15,
      scaleX: 0.88,
      rotate: [12, 16, 12],
    },
    transition: {
      rotate: { duration: 0.25, repeat: Infinity, ease: "linear" },
      y: { duration: 0.5, ease: "easeOut" },
      scaleY: { duration: 0.3, ease: "easeOut" },
      scaleX: { duration: 0.3, ease: "easeOut" },
    },
  },
  crashing: {
    name: "Soft Retro Descent Bounce",
    animate: {
      y: 0,
      scaleY: 1,
      scaleX: 1,
      rotate: 12.5,
    },
    transition: {
      y: { type: "spring", stiffness: 160, damping: 9 },
      scaleY: { type: "spring", stiffness: 180, damping: 8 },
      scaleX: { type: "spring", stiffness: 180, damping: 8 },
      rotate: { duration: 0.5, ease: "easeOut" },
    },
  },
  error_idle: {
    name: "Tilted Malfunction Warning Loop",
    animate: {
      y: [0, -5, 0],
      scaleY: [1, 1.015, 1],
      scaleX: [1, 0.99, 1],
      rotate: [11.5, 13.5, 11.5],
    },
    transition: {
      y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
      rotate: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
      scaleY: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
      scaleX: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
    },
  },
  launching: {
    name: "High-Velocity Vertical Thrust",
    animate: {
      y: -920,
      scaleY: [0.74, 1.38, 1.1],
      scaleX: [1.2, 0.78, 0.95],
    },
    transition: {
      y: { duration: 1.2, ease: "easeIn" },
      scaleY: { duration: 0.35, ease: "easeOut" },
      scaleX: { duration: 0.35, ease: "easeOut" },
    },
  },
} satisfies Record<RocketStageId, { name: string; animate: Record<string, unknown>; transition: Record<string, unknown> }>;

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
    <div className="flex w-full max-w-sm flex-col justify-center space-y-3.5 mx-auto">
      <div className="space-y-2">
        <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-2">
          <CheckCircle2 size={24} />
        </div>
        <h2 className="text-3xl font-extrabold text-text-main tracking-tight leading-none">Welcome Back</h2>
        <p className="text-sm text-text-secondary font-medium">Continue where you left off.</p>
      </div>

      <div className="space-y-2.5">
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
              className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-text-secondary opacity-50 transition-opacity hover:opacity-100"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full h-11 rounded-2xl border border-card-border bg-card text-text-main font-black uppercase tracking-widest text-[11px] transition-all hover:border-accent/40 hover:bg-surface-muted active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
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
      <div className="space-y-2.5">
        <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-2">
          <Mail size={24} />
        </div>
        <h2 className="text-3xl font-extrabold text-text-main tracking-tight leading-none">Recover Account</h2>
        <p className="text-sm text-text-secondary font-medium">We'll help you get back in.</p>
      </div>

      <div className="space-y-2.5">
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

      <div className="space-y-2.5">
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
      <div className="space-y-2.5">
        <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-2">
          <KeyRound size={24} />
        </div>
        <h2 className="text-3xl font-extrabold text-text-main tracking-tight leading-none">Set New Password</h2>
        <p className="text-sm text-text-secondary font-medium">Your recovery link is verified. Lock in fresh credentials.</p>
      </div>

      <div className="space-y-2.5">
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
function Screen1({ name, setName, email, setEmail, password, setPassword, nextStep, handleGoogleLogin, setRocketStage, rocketStage = 'form' }: any) {
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

  const resetRocketAfterEdit = () => {
    if (generalError || passwordError) {
      setRocketStage?.('form');
    }
  };

  const handleManualNext = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setRocketStage?.('error_idle');
      setGeneralError('All fields are required.');
      addToast({ type: 'error', title: 'Missing fields', description: 'Name, email, and password confirmation are required.' });
      return;
    }
    if (password !== confirmPassword) {
      setRocketStage?.('error_idle');
      setPasswordError('Passwords do not match');
      addToast({ type: 'error', title: 'Mismatch', description: 'Passwords must be identical.' });
      return;
    }
    const pError = validatePassword(password);
    if (pError) {
      setRocketStage?.('error_idle');
      setPasswordError(pError);
      addToast({ type: 'error', title: 'Password needs work', description: pError });
      return;
    }

    setIsSubmitting(true);
    setGeneralError('');
    setPasswordError('');
    setRocketStage?.('anticipation');

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
        setRocketStage?.('error_idle');
        window.setTimeout(() => nextStep(11), 650); // Already registered, go to login
      } else {
        setRocketStage?.('launching');
        window.setTimeout(() => nextStep(2), 650);
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      const message = err.message || 'Signup failed';
      setRocketStage?.('failed_launch');
      window.setTimeout(() => setRocketStage?.('crashing'), 450);
      window.setTimeout(() => setRocketStage?.('error_idle'), 1000);
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
      <div className="space-y-2.5">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="mb-2 flex items-center gap-3">
            <BrandLogo className="h-10 w-10 rounded-2xl shadow-lg shadow-accent/15" />
            <h1 className="text-3xl font-extrabold tracking-tight text-text-main">VisNova</h1>
          </div>
          <p className="text-sm text-text-secondary font-medium opacity-70">Your Visionary Planner.</p>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-text-main leading-tight"
        >
          Start building your future
        </motion.h2>

        <div className="relative mx-auto flex h-44 max-w-[300px] justify-center overflow-hidden rounded-[1.9rem] border border-card-border bg-gradient-to-b from-[#F7F2FF] via-[#FDFBFF] to-[#F6F7FF] shadow-xl shadow-accent/10 lg:hidden">
          <div className="-mt-[58px] scale-[0.68]">
            <RocketMascot stage={rocketStage} />
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
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
            onChange={e => {
              setName(e.target.value);
              resetRocketAfterEdit();
            }}
            autoComplete="name"
            className="w-full h-11 px-4 rounded-2xl bg-card border border-card-border text-text-main placeholder:text-text-secondary/30 focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-50 ml-1">Email</label>
          <input
            type="email"
            placeholder="yourmail@example.com"
            value={email}
            onChange={e => {
              setEmail(e.target.value);
              resetRocketAfterEdit();
            }}
            autoComplete="email"
            inputMode="email"
            className="w-full h-11 px-4 rounded-2xl bg-card border border-card-border text-text-main placeholder:text-text-secondary/30 focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all"
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
                resetRocketAfterEdit();
              }}
              autoComplete="new-password"
              className={cn(
                "w-full h-11 px-4 pr-12 rounded-2xl bg-card border text-text-main placeholder:text-text-secondary/30 focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all",
                passwordError ? "border-accent/40 bg-accent/[0.02]" : "border-card-border focus:border-accent"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-text-secondary opacity-50 transition-opacity hover:opacity-100"
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
                resetRocketAfterEdit();
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') void handleManualNext();
              }}
              autoComplete="new-password"
              className={cn(
                "w-full h-11 px-4 pr-12 rounded-2xl bg-card border text-text-main placeholder:text-text-secondary/30 focus:outline-none focus:ring-2 focus:ring-accent/10 transition-all",
                passwordError ? "border-accent/40 bg-accent/[0.02]" : "border-card-border focus:border-accent"
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-text-secondary opacity-50 transition-opacity hover:opacity-100"
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

      <div className="space-y-2.5 pt-1">
        <button
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
          className="w-full h-11 rounded-2xl border border-card-border bg-card text-text-main font-black uppercase tracking-widest text-[11px] transition-all hover:border-accent/40 hover:bg-surface-muted active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
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
          className="w-full h-11 bg-accent text-accent-contrast font-bold rounded-2xl transition-all hover:shadow-lg hover:shadow-accent/10 active:scale-95"
        >
          {isSubmitting ? 'Loading...' : 'Create account'}
        </button>
      </div>

      <div className="text-center">
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
      <div className="text-center">
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

      <div className="space-y-2.5">
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

type SetupStepId = 'welcome' | 'path' | 'vision' | 'task' | 'privacy' | 'theme' | 'proof' | 'complete';

const SETUP_STEPS: Array<{ id: SetupStepId; label: string; icon: LucideIcon }> = [
  { id: 'welcome', label: 'Start', icon: Sparkles },
  { id: 'path', label: 'Path', icon: CircleDot },
  { id: 'vision', label: 'Vision', icon: Target },
  { id: 'task', label: 'Action', icon: ListChecks },
  { id: 'privacy', label: 'Privacy', icon: ShieldCheck },
  { id: 'theme', label: 'Theme', icon: Palette },
  { id: 'proof', label: 'Proof', icon: Activity },
  { id: 'complete', label: 'Ready', icon: CheckCircle2 }
];

const SETUP_STEP_TO_INDEX: Record<number, number> = {
  3: 0,
  4: 1,
  5: 2,
  6: 3,
  7: 4,
  8: 5,
  9: 6,
  9.35: 7
};

const THEME_OPTIONS = [
  { id: 'lavender', label: 'Lavender Focus', desc: 'Clean, premium, and calm.', accent: '#6D5DF6', bg: '#F7F7FB' },
  { id: 'dark', label: 'Dark Dream', desc: 'Low-light focus mode.', accent: '#818CF8', bg: '#111827' },
  { id: 'sage', label: 'Sage Calm', desc: 'Soft green clarity.', accent: '#8DA482', bg: '#F4F7F1' },
  { id: 'pastel', label: 'Soft Cream', desc: 'Warm creative planning.', accent: '#5D4361', bg: '#FFF7F0' }
] as const;

const PRIVACY_OPTIONS = [
  { id: 'private', title: 'Private', desc: 'Only you.', icon: Lock },
  { id: 'circle', title: 'Circle', desc: 'Trusted accountability partners.', icon: Users },
  { id: 'public', title: 'Public', desc: 'Visible on profile and feed.', icon: Sparkles }
] as const;

function SetupProgressRail({ activeIndex }: { activeIndex: number }) {
  const percent = Math.round(((activeIndex + 1) / SETUP_STEPS.length) * 100);
  return (
    <aside className="hidden w-48 shrink-0 rounded-[2rem] border border-white/70 bg-white/62 p-4 shadow-[0_20px_70px_rgba(109,93,246,0.12)] backdrop-blur-2xl lg:block">
      <div>
        <div className="flex items-center gap-3">
          <BrandLogo className="h-10 w-10 rounded-2xl shadow-lg shadow-accent/15" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-accent">Setup</p>
            <p className="text-sm font-black text-text-main">{percent}% ready</p>
          </div>
        </div>
        <div className="mt-6 space-y-2">
          {SETUP_STEPS.map((item, index) => {
            const Icon = item.icon;
            const isActive = index === activeIndex;
            const isDone = index < activeIndex;
            return (
              <div
                key={item.id}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black transition-all',
                  isActive ? 'bg-accent text-accent-contrast shadow-lg shadow-accent/20' : isDone ? 'bg-accent/10 text-accent' : 'text-text-secondary/55'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function MobileSetupProgress({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="mb-4 lg:hidden">
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-text-secondary/60">
        <span>Step {activeIndex + 1} of {SETUP_STEPS.length}</span>
        <span>{SETUP_STEPS[activeIndex]?.label}</span>
      </div>
      <div className="mt-3 flex gap-1.5">
        {SETUP_STEPS.map((step, index) => (
          <span
            key={step.id}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              index <= activeIndex ? 'bg-accent' : 'bg-card-border'
            )}
          />
        ))}
      </div>
    </div>
  );
}

function FeatureBriefChips() {
  const icons = [Target, ListChecks, Activity, Sparkles, Users, NotebookPen];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {ONBOARDING_FEATURE_CHIPS.map((chip, index) => {
        const Icon = icons[index] || Sparkles;
        return (
          <motion.div
            key={chip.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.35 }}
            className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm backdrop-blur-xl"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon className="h-4 w-4" />
              </span>
              <p className="text-xs font-black text-text-main">{chip.label}</p>
            </div>
            <p className="mt-2 text-[11px] font-semibold leading-4 text-text-secondary">{chip.copy}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

type RocketColor = "lavender" | "sunset" | "mint" | "cosmic";
type RocketMood = "excited" | "determined" | "wink" | "sleepy" | "cool";

const getColorMetadata = (theme: RocketColor) => {
  switch (theme) {
    case "lavender":
      return {
        primary: "from-[#A78BFA] to-[#7C3AED]",
        glow: "linear-gradient(to top, #A78BFA, #7C3AED)",
        secondary: "#DDD6FE",
        accent: "#4C1D95",
        highlight: "rgba(255, 255, 255, 0.45)",
        booster: "from-[#8B5CF6] to-[#6D28D9]",
      };
    case "sunset":
      return {
        primary: "from-[#F43F5E] to-[#BE123C]",
        glow: "linear-gradient(to top, #F43F5E, #BE123C)",
        secondary: "#FECDD3",
        accent: "#4C0519",
        highlight: "rgba(255, 255, 255, 0.5)",
        booster: "from-[#E11D48] to-[#9F1239]",
      };
    case "mint":
      return {
        primary: "from-[#10B981] to-[#047857]",
        glow: "linear-gradient(to top, #10B981, #047857)",
        secondary: "#A7F3D0",
        accent: "#064E3B",
        highlight: "rgba(255, 255, 255, 0.45)",
        booster: "from-[#059669] to-[#065F46]",
      };
    case "cosmic":
      return {
        primary: "from-[#3B82F6] to-[#1D4ED8]",
        glow: "linear-gradient(to top, #3B82F6, #1D4ED8)",
        secondary: "#BFDBFE",
        accent: "#1E3A8A",
        highlight: "rgba(255, 255, 255, 0.5)",
        booster: "from-[#2563EB] to-[#1E40AF]",
      };
  }
};

function RocketMascot({
  stage,
  selectedColor = "lavender",
  selectedMood = "excited",
  isWiggling = false,
  onClick,
}: {
  stage: RocketStageId;
  selectedColor?: RocketColor;
  selectedMood?: RocketMood;
  isWiggling?: boolean;
  onClick?: () => void;
}) {
  const rocketRef = useRef<HTMLDivElement | null>(null);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const currentColors = getColorMetadata(selectedColor);

  useEffect(() => {
    let frame = 0;

    const handlePointerMove = (event: PointerEvent) => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = rocketRef.current?.getBoundingClientRect();
        if (!rect) return;
        const faceCenterX = rect.left + rect.width * 0.5;
        const faceCenterY = rect.top + rect.height * 0.38;
        const angle = Math.atan2(event.clientY - faceCenterY, event.clientX - faceCenterX);
        const distance = Math.min(1, Math.hypot(event.clientX - faceCenterX, event.clientY - faceCenterY) / 160);
        setEyeOffset({
          x: Math.cos(angle) * 7 * distance,
          y: Math.sin(angle) * 6 * distance,
        });
      });
    };

    const handlePointerLeave = () => setEyeOffset({ x: 0, y: 0 });

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('blur', handlePointerLeave);
    document.addEventListener('mouseleave', handlePointerLeave);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('blur', handlePointerLeave);
      document.removeEventListener('mouseleave', handlePointerLeave);
    };
  }, []);

  useEffect(() => {
    if (stage !== 'form') return;
    const interval = window.setInterval(() => {
      setIsBlinking(true);
      window.setTimeout(() => setIsBlinking(false), 130);
    }, 4300);
    return () => window.clearInterval(interval);
  }, [stage]);

  return (
    <motion.div
      ref={rocketRef}
      style={{ originY: 1 }}
      className="relative cursor-pointer select-none"
      onClick={onClick}
      animate={
        stage === "form"
          ? {
              y: [0, -9, 0],
              scaleY: [1, 1.025, 1],
              scaleX: [1, 0.985, 1],
              rotate: isWiggling ? [-4, 4, -4, 4, 0] : 0,
            }
          : stage === "anticipation"
            ? {
                y: 35,
                scaleY: 0.74,
                scaleX: 1.2,
                rotate: [-1.5, 1.5, -1.8, 1.8, -1.5, 1.5, -1],
              }
            : stage === "failed_launch"
              ? {
                  y: -120,
                  scaleY: 1.15,
                  scaleX: 0.88,
                  rotate: [12, 16, 12],
                }
              : stage === "crashing"
                ? {
                    y: 0,
                    scaleY: 1,
                    scaleX: 1,
                    rotate: 12.5,
                  }
                : stage === "error_idle"
                  ? {
                      y: [0, -5, 0],
                      rotate: [11.5, 13.5, 11.5],
                      scaleY: [1, 1.015, 1],
                      scaleX: [1, 0.99, 1],
                    }
                  : stage === "launching"
                    ? {
                        y: -920,
                        scaleY: [0.74, 1.38, 1.1],
                        scaleX: [1.2, 0.78, 0.95],
                      }
                    : {}
      }
      transition={
        stage === "form"
          ? {
              y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
              scaleY: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
              scaleX: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
              rotate: isWiggling ? { duration: 0.4 } : { duration: 0.8, ease: "easeInOut" },
            }
          : stage === "anticipation"
            ? {
                rotate: { duration: 0.08, repeat: Infinity, ease: "linear" },
                y: { type: "spring", stiffness: 180, damping: 15 },
                scaleY: { type: "spring", stiffness: 180, damping: 15 },
                scaleX: { type: "spring", stiffness: 180, damping: 15 },
              }
            : stage === "failed_launch"
              ? {
                  rotate: { duration: 0.25, repeat: Infinity, ease: "linear" },
                  y: { duration: 0.5, ease: "easeOut" },
                  scaleY: { duration: 0.3, ease: "easeOut" },
                  scaleX: { duration: 0.3, ease: "easeOut" },
                }
              : stage === "crashing"
                ? {
                    y: { type: "spring", stiffness: 160, damping: 9 },
                    scaleY: { type: "spring", stiffness: 180, damping: 8 },
                    scaleX: { type: "spring", stiffness: 180, damping: 8 },
                    rotate: { duration: 0.5, ease: "easeOut" },
                  }
                : stage === "error_idle"
                  ? {
                      y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
                      rotate: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
                      scaleY: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
                      scaleX: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
                    }
                  : stage === "launching"
                    ? {
                        y: { duration: 1.2, ease: "easeIn" },
                        scaleY: { duration: 0.35, ease: "easeOut" },
                        scaleX: { duration: 0.35, ease: "easeOut" },
                      }
                    : {}
      }
    >
      <div className="relative group/mascot">
        <div
          className="pointer-events-none absolute -inset-6 rounded-full opacity-15 blur-xl"
          style={{ background: currentColors.glow }}
        />

        <svg width="200" height="300" viewBox="0 0 200 300" className="relative z-10 drop-shadow-[0_12px_24px_rgba(76,29,149,0.06)]" aria-hidden="true">
          <motion.path
            d="M 45 200 L 15 240 Q 8 265 25 265 L 55 240 Z"
            fill="url(#fuselage-booster-grad)"
            animate={stage === "anticipation" ? { rotate: -8 } : { rotate: 0 }}
            style={{ transformOrigin: "45px 200px" }}
          />
          <motion.path
            d="M 155 200 L 185 240 Q 192 265 175 265 L 145 240 Z"
            fill="url(#fuselage-booster-grad)"
            animate={stage === "anticipation" ? { rotate: 8 } : { rotate: 0 }}
            style={{ transformOrigin: "155px 200px" }}
          />

          <g className="flame-layer">
            {stage === "form" ? (
              <motion.ellipse
                cx="100"
                cy="265"
                rx="12"
                ry="16"
                fill="#FFD23F"
                animate={{ ry: [12, 22, 12], rx: [10, 13, 10], opacity: [0.7, 0.95, 0.7] }}
                transition={{ duration: 0.12, repeat: Infinity }}
              />
            ) : stage === "anticipation" ? (
              <>
                <motion.ellipse
                  cx="100"
                  cy="268"
                  rx="18"
                  ry="25"
                  fill="#FF4D00"
                  animate={{ ry: [20, 35, 20], rx: [16, 22, 16] }}
                  transition={{ duration: 0.08, repeat: Infinity }}
                />
                <motion.ellipse
                  cx="100"
                  cy="266"
                  rx="12"
                  ry="18"
                  fill="#FFE600"
                  animate={{ ry: [14, 24, 14] }}
                  transition={{ duration: 0.05, repeat: Infinity }}
                />
              </>
            ) : stage === "failed_launch" ? (
              <>
                <motion.ellipse
                  cx="100"
                  cy="268"
                  rx="14"
                  ry="25"
                  fill="#FF5500"
                  animate={{ ry: [15, 5, 28, 8, 22], rx: [10, 6, 15, 8, 12], opacity: [0.8, 0.3, 0.95, 0.4, 0.85] }}
                  transition={{ duration: 0.25, repeat: Infinity, ease: "linear" }}
                />
                <motion.ellipse
                  cx="100"
                  cy="265"
                  rx="8"
                  ry="14"
                  fill="#FFE100"
                  animate={{ ry: [8, 3, 16, 5, 12], opacity: [0.9, 0.2, 0.95, 0.3, 0.85] }}
                  transition={{ duration: 0.15, repeat: Infinity, ease: "linear" }}
                />
              </>
            ) : stage === "crashing" || stage === "error_idle" ? null : (
              <>
                <motion.path
                  d="M 75 255 L 100 320 L 125 255 Z"
                  fill="url(#launch-beam-grad)"
                  animate={{ scaleX: [0.9, 1.25, 0.9], scaleY: [1, 1.4, 1] }}
                  transition={{ duration: 0.06, repeat: Infinity }}
                  style={{ transformOrigin: "100px 255px" }}
                />
                <motion.ellipse
                  cx="100"
                  cy="258"
                  rx="24"
                  ry="30"
                  fill="#FFFFFF"
                  animate={{ opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 0.05, repeat: Infinity }}
                />
              </>
            )}
          </g>

          <path
            d="M 100 25 C 145 60 162 165 150 245 C 150 255 132 260 100 260 C 68 260 50 255 50 245 C 38 165 55 60 100 25 Z"
            fill="url(#fuselage-body-grad)"
          />
          <path
            d="M 66 50 Q 72 140 60 225"
            stroke={currentColors.highlight}
            strokeWidth="8.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.8"
          />
          <path
            d="M 100 168 L 104 175 L 112 175 L 106 180 L 109 188 L 100 183 L 91 188 L 94 180 L 88 175 L 96 175 Z"
            fill="#FFF"
            opacity="0.25"
          />
          <circle cx="100" cy="115" r="32" fill="#1E1B4B" stroke={currentColors.secondary} strokeWidth="6" />

          <g className="mascot-face">
            {stage === "failed_launch" || stage === "crashing" || stage === "error_idle" ? (
              <>
                <path d="M 82 106 Q 89 101 93 108" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M 118 106 Q 111 101 107 108" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <circle cx="89" cy="115" r="4.5" fill="#FFF" />
                <circle cx="111" cy="115" r="4.5" fill="#FFF" />
                <motion.g animate={{ x: eyeOffset.x * 0.3, y: eyeOffset.y * 0.3 }} transition={{ type: "spring", stiffness: 150, damping: 20 }}>
                  <circle cx="89" cy="115" r="1.5" fill="#4C1D95" />
                  <circle cx="111" cy="115" r="1.5" fill="#4C1D95" />
                </motion.g>
                <path d="M 94 125 Q 100 120 106 125" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </>
            ) : isBlinking ? (
              <>
                <line x1="85" y1="115" x2="95" y2="115" stroke="white" strokeWidth="5" strokeLinecap="round" />
                <line x1="105" y1="115" x2="115" y2="115" stroke="white" strokeWidth="5" strokeLinecap="round" />
              </>
            ) : selectedMood === "excited" ? (
              <>
                <circle cx="90" cy="115" r="6" fill="#FFF" />
                <circle cx="110" cy="115" r="6" fill="#FFF" />
                <motion.g animate={{ x: eyeOffset.x * 0.45, y: eyeOffset.y * 0.45 }} transition={{ type: "spring", stiffness: 150, damping: 20 }}>
                  <circle cx="91.5" cy="112.5" r="2" fill="#4C1D95" />
                  <circle cx="111.5" cy="112.5" r="2" fill="#4C1D95" />
                </motion.g>
                <path d="M 94 121 Q 100 129 106 121" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M 83 103 Q 90 99 94 104" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M 117 103 Q 110 99 106 104" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </>
            ) : selectedMood === "determined" ? (
              <>
                <path d="M 84 109 L 95 113" stroke="white" strokeWidth="4.5" strokeLinecap="round" />
                <path d="M 116 109 L 105 113" stroke="white" strokeWidth="4.5" strokeLinecap="round" />
                <motion.g animate={{ x: eyeOffset.x * 0.8, y: eyeOffset.y * 0.8 }}>
                  <circle cx="89.5" cy="116.5" r="3.5" fill="#FFF" />
                  <circle cx="110.5" cy="116.5" r="3.5" fill="#FFF" />
                </motion.g>
                <path d="M 95 125 L 105 125" stroke="white" strokeWidth="3" strokeLinecap="round" />
              </>
            ) : selectedMood === "wink" ? (
              <>
                <path d="M 83 116 Q 90 120 95 114" stroke="white" strokeWidth="4.5" strokeLinecap="round" fill="none" />
                <circle cx="110" cy="114" r="6" fill="#FFF" />
                <motion.g animate={{ x: eyeOffset.x * 0.45, y: eyeOffset.y * 0.45 }}>
                  <circle cx="111" cy="111.5" r="2" fill="#4C1D95" />
                </motion.g>
                <path d="M 95 123 Q 102 126 105 120" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
              </>
            ) : selectedMood === "sleepy" ? (
              <>
                <path d="M 83 115 Q 90 121 95 115" stroke="white" strokeWidth="4.5" strokeLinecap="round" fill="none" />
                <path d="M 105 115 Q 112 121 119 115" stroke="white" strokeWidth="4.5" strokeLinecap="round" fill="none" />
                <path d="M 96 123 Q 100 126 104 123" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </>
            ) : (
              <>
                <path d="M 76 110 L 124 110 L 120 119 C 114 126 104 126 100 119 C 96 126 86 126 80 119 Z" fill="#7C3AED" stroke="white" strokeWidth="2.5" />
                <motion.g animate={{ x: eyeOffset.x * 0.5, y: eyeOffset.y * 0.5 }}>
                  <line x1="84.5" y1="113" x2="94" y2="122" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
                  <line x1="105.5" y1="113" x2="114" y2="122" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
                </motion.g>
                <path d="M 96 124 L 104 124" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </>
            )}
            <circle cx="81" cy="123" r="3.5" fill="#FFAEC9" opacity="0.65" />
            <circle cx="119" cy="123" r="3.5" fill="#FFAEC9" opacity="0.65" />
          </g>

          <defs>
            <linearGradient id="fuselage-body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={currentColors.secondary} />
              <stop offset="35%" stopColor={selectedColor === "lavender" ? "#A78BFA" : selectedColor === "sunset" ? "#F43F5E" : selectedColor === "mint" ? "#10B981" : "#3B82F6"} />
              <stop offset="100%" stopColor={selectedColor === "lavender" ? "#7C3AED" : selectedColor === "sunset" ? "#BE123C" : selectedColor === "mint" ? "#047857" : "#1D4ED8"} />
            </linearGradient>

            <linearGradient id="fuselage-booster-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={selectedColor === "lavender" ? "#8B5CF6" : selectedColor === "sunset" ? "#E11D48" : selectedColor === "mint" ? "#059669" : "#2563EB"} />
              <stop offset="100%" stopColor={currentColors.accent} />
            </linearGradient>

            <linearGradient id="launch-beam-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="25%" stopColor="#FDE047" />
              <stop offset="60%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="rgba(239, 68, 68, 0)" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </motion.div>
  );
}

function AuthPreviewPanel({ mode, rocketStage = 'form' }: { mode: 'signup' | 'login'; rocketStage?: RocketStageId }) {
  return (
    <div className="relative hidden h-full min-h-[520px] overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-white via-[#F8F6FF] to-[#EAF1FF] p-7 shadow-[0_28px_90px_rgba(109,93,246,0.16)] lg:block">
      <motion.div
        aria-hidden="true"
        className="absolute -left-16 top-10 h-48 w-48 rounded-full bg-[#DDE7FF]/80 blur-3xl"
        animate={{ y: [0, 16, 0], x: [0, 10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute -right-16 bottom-10 h-56 w-56 rounded-full bg-[#E9D8FF]/80 blur-3xl"
        animate={{ y: [0, -18, 0], x: [0, -10, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-accent">See it. Plan it. Prove it.</p>
          <h2 className="mx-auto max-w-xs text-3xl font-black tracking-tight text-text-main">
            {mode === 'signup' ? 'Launch your first Vision.' : 'Welcome back.'}
          </h2>
          <p className="mx-auto max-w-xs text-sm font-semibold leading-6 text-text-secondary">
            {mode === 'signup'
              ? 'Create a goal, add your next move, and start logging proof.'
              : 'Pick up where your progress left off.'}
          </p>
        </div>

        <div className="relative mt-8 flex h-[430px] w-full max-w-[470px] justify-center overflow-hidden rounded-[2.5rem] border border-white/80 bg-gradient-to-b from-[#F7F2FF] via-[#FDFBFF] to-[#F6F7FF] p-3 shadow-[0_32px_70px_rgba(37,22,61,0.13)] backdrop-blur-2xl">
          <div className="scale-[1.28]">
            <RocketMascot stage={rocketStage} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthShell({ mode, rocketStage = 'form', children }: { mode: 'signup' | 'login'; rocketStage?: RocketStageId; children: ReactNode }) {
  return (
    <div className="grid h-full w-full max-w-[1120px] gap-5 lg:grid-cols-[minmax(0,1fr)_430px]">
      <AuthPreviewPanel mode={mode} rocketStage={rocketStage} />
      <div className="flex min-h-0 items-center rounded-[2rem] border border-card-border bg-card/95 p-4 shadow-2xl shadow-accent/10 backdrop-blur-xl sm:p-6">
        {children}
      </div>
    </div>
  );
}

function OnboardingVisualScene({ variant, title, subtitle, selectedPath, visionTitle, taskTitle, selectedTheme }: {
  variant: SetupStepId;
  title?: string;
  subtitle?: string;
  selectedPath?: OnboardingPathId;
  visionTitle?: string;
  taskTitle?: string;
  selectedTheme?: string;
}) {
  const path = getOnboardingPath(selectedPath);
  const theme = THEME_OPTIONS.find(item => item.id === selectedTheme) || THEME_OPTIONS[0];
  const orbitItems = ['Vision', 'Action', 'Proof', 'Pulse'];
  const cards = [
    { label: 'Vision', text: visionTitle || 'Launch your first system', icon: Target },
    { label: 'Action', text: taskTitle || 'Pick one next move', icon: ListChecks },
    { label: 'Proof', text: 'Log what changed today', icon: Activity }
  ];

  return (
    <div className="relative min-h-[170px] overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-white/90 via-[#F8F6FF]/90 to-[#EAF7FF]/80 p-4 shadow-[0_30px_90px_rgba(109,93,246,0.18)] sm:min-h-[360px] sm:p-5 lg:min-h-0">
      <motion.div
        aria-hidden="true"
        className="absolute -left-14 -top-12 h-44 w-44 rounded-full bg-[#C9EFFF]/70 blur-3xl"
        animate={{ x: [0, 18, 0], y: [0, 12, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute -right-16 top-12 h-52 w-52 rounded-full bg-[#F2C6FF]/70 blur-3xl"
        animate={{ x: [0, -14, 0], y: [0, 16, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">{title || 'VisNova setup'}</p>
            <h3 className="mt-2 max-w-sm text-2xl font-black tracking-tight text-text-main sm:text-4xl">{subtitle || path.tone}</h3>
          </div>
          <motion.div
            className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-accent shadow-xl sm:flex"
            animate={{ rotate: variant === 'path' ? [0, 8, -8, 0] : 0 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <WandSparkles className="h-6 w-6" />
          </motion.div>
        </div>

        <div className="relative mx-auto my-4 flex w-full max-w-sm justify-center sm:my-6 lg:my-7">
          <motion.div
            className="relative h-[180px] w-[126px] rounded-[1.8rem] border-[6px] border-white bg-white shadow-[0_30px_70px_rgba(37,22,61,0.18)] sm:h-[280px] sm:w-[180px] lg:h-[320px] lg:w-[210px]"
            initial={{ y: 18, opacity: 0, rotate: -2 }}
            animate={{ y: 0, opacity: 1, rotate: variant === 'complete' ? 0 : -1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="absolute left-1/2 top-2 h-3 w-12 -translate-x-1/2 rounded-full bg-text-main sm:top-3 sm:h-4 sm:w-14" />
            <div
              className="h-full overflow-hidden rounded-[1.35rem] p-3 sm:rounded-[1.55rem] sm:p-4"
              style={{ background: `linear-gradient(160deg, ${theme.bg}, #ffffff 58%, rgba(var(--accent-rgb),0.12))` }}
            >
              <div className="mt-5 space-y-2 sm:mt-8 sm:space-y-3">
                {variant === 'path' ? (
                  <div className="text-center">
                    <path.icon className="mx-auto h-12 w-12 text-accent" />
                    <p className="mt-4 text-xl font-black text-text-main">{path.label}</p>
                    <p className="mt-2 text-xs font-bold leading-5 text-text-secondary">{path.description}</p>
                  </div>
                ) : variant === 'privacy' ? (
                  <div className="flex h-48 flex-col items-center justify-center rounded-[1.5rem] bg-white/80">
                    <ShieldCheck className="h-16 w-16 text-accent" />
                    <p className="mt-4 text-center text-sm font-black text-text-main">Private by default</p>
                    <p className="mt-2 text-center text-xs font-bold text-text-secondary">Shared by choice.</p>
                  </div>
                ) : variant === 'proof' ? (
                  <div className="space-y-5 pt-4">
                    <div className="rounded-2xl bg-accent p-4 text-accent-contrast">
                      <p className="text-[10px] font-black uppercase tracking-widest">Proof</p>
                      <p className="mt-2 text-sm font-black">Updated my first move today.</p>
                    </div>
                    <div className="relative h-24">
                      <div className="absolute left-5 top-0 h-full w-1 rounded-full bg-accent/15" />
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          className="absolute left-3 flex items-center gap-3"
                          style={{ top: i * 34 }}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.12 }}
                        >
                          <span className="h-5 w-5 rounded-full border-4 border-white bg-accent shadow" />
                          <span className="text-xs font-bold text-text-secondary">Progress dot</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {cards.map((card, index) => {
                      const Icon = card.icon;
                      return (
                        <motion.div
                          key={card.label}
                          initial={{ opacity: 0, x: index % 2 ? 16 : -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="rounded-2xl border border-card-border bg-white/85 p-3 shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                              <Icon className="h-4 w-4" />
                            </span>
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-accent">{card.label}</p>
                              <p className="line-clamp-2 text-xs font-black text-text-main">{card.text}</p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {orbitItems.map((item, index) => (
            <motion.div
              key={item}
              className="absolute hidden rounded-full border border-white/80 bg-white/90 px-3 py-2 text-[10px] font-black text-text-main shadow-lg sm:block"
              style={{
                left: index % 2 === 0 ? '2%' : '70%',
                top: `${18 + index * 20}%`
              }}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3 + index * 0.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              {item}
            </motion.div>
          ))}
        </div>

        <div className="relative z-10 hidden sm:block">
          <FeatureBriefChips />
        </div>
      </div>
    </div>
  );
}

function SetupCard({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 rounded-[2rem] border border-white/80 bg-white/82 p-4 shadow-[0_24px_80px_rgba(109,93,246,0.14)] backdrop-blur-2xl sm:p-5">
      {children}
    </div>
  );
}

function SetupShell({ step, children, visualProps }: { step: number; children: ReactNode; visualProps: ComponentProps<typeof OnboardingVisualScene> }) {
  const activeIndex = SETUP_STEP_TO_INDEX[step] ?? 0;
  return (
    <div className="h-full w-full">
      <MobileSetupProgress activeIndex={activeIndex} />
      <div className="flex h-full w-full gap-5">
        <SetupProgressRail activeIndex={activeIndex} />
        <div className="grid min-h-0 flex-1 gap-4 lg:h-[min(760px,calc(100dvh-5.25rem))] lg:grid-cols-[minmax(360px,0.82fr)_minmax(460px,1fr)]">
          <OnboardingVisualScene {...visualProps} />
          <SetupCard>{children}</SetupCard>
        </div>
      </div>
    </div>
  );
}

function SetupWelcomeScreen({ nextStep }: { nextStep: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col justify-center space-y-4 lg:space-y-5">
      <div className="space-y-2.5">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">90-second setup</p>
        <h2 className="text-4xl font-black tracking-tight text-text-main sm:text-5xl">Let&apos;s build your growth system.</h2>
        <p className="text-base font-semibold leading-7 text-text-secondary">VisNova works best when your Vision, actions, proof, and progress live in one place.</p>
      </div>
      <div className="grid gap-2.5">
        {[
          ['Vision', 'Choose what you are building.'],
          ['Action', 'Pick one move small enough for today.'],
          ['Proof', 'Log what actually changed.']
        ].map(([title, copy], index) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="rounded-2xl border border-card-border bg-surface-muted p-4"
          >
            <p className="text-sm font-black text-text-main">{title}</p>
            <p className="mt-1 text-xs font-semibold text-text-secondary">{copy}</p>
          </motion.div>
        ))}
      </div>
      <button onClick={nextStep} className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-accent text-xs font-black uppercase tracking-widest text-accent-contrast shadow-2xl shadow-accent/20 transition-transform active:scale-[0.98]">
        Start setup <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function SetupPathScreen({ selectedPath, setSelectedPath, nextStep }: { selectedPath: OnboardingPathId; setSelectedPath: (path: OnboardingPathId) => void; nextStep: () => void }) {
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-4">
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">Choose your path</p>
        <h2 className="text-3xl font-black tracking-tight text-text-main sm:text-[2.35rem] sm:leading-[1.02]">What are you building right now?</h2>
        <p className="text-sm font-semibold leading-6 text-text-secondary">Your path tunes examples, suggestions, and dashboard copy.</p>
      </div>
      <div className="grid min-h-0 content-start gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
        {ONBOARDING_PATHS.map(path => {
          const Icon = path.icon;
          const selected = selectedPath === path.id;
          return (
            <button
              key={path.id}
              onClick={() => setSelectedPath(path.id)}
              className={cn(
                'rounded-2xl border p-3 text-left transition-all active:scale-[0.98]',
                selected ? 'border-accent bg-accent text-accent-contrast shadow-xl shadow-accent/20' : 'border-card-border bg-card hover:border-accent/35'
              )}
            >
              <Icon className="h-5 w-5" />
              <p className="mt-2 text-sm font-black">{path.label}</p>
              <p className={cn('mt-1 text-xs font-semibold leading-5', selected ? 'text-accent-contrast/80' : 'text-text-secondary')}>{path.description}</p>
            </button>
          );
        })}
      </div>
      <button onClick={nextStep} className="h-14 rounded-2xl bg-accent text-xs font-black uppercase tracking-widest text-accent-contrast shadow-2xl shadow-accent/20 active:scale-[0.98]">
        Continue
      </button>
    </div>
  );
}

function SetupVisionScreen({ selectedPath, title, setTitle, nextStep }: { selectedPath: OnboardingPathId; title: string; setTitle: (value: string) => void; nextStep: () => void }) {
  const path = getOnboardingPath(selectedPath);
  const cleanTitle = String(title || '').trim();
  return (
    <div className="flex h-full min-h-0 flex-col justify-center space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">First Vision</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-text-main sm:text-4xl">What Vision should move first?</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-text-secondary">Start with one thing. You can add more later.</p>
      </div>
      <input
        autoFocus
        maxLength={120}
        value={title}
        onChange={event => setTitle(event.target.value)}
        placeholder="Launch beta, learn coding, improve focus..."
        className="h-14 rounded-2xl border border-card-border bg-card px-5 text-sm font-black text-text-main outline-none transition-all placeholder:text-text-secondary/40 focus:border-accent focus:ring-4 focus:ring-accent/10"
      />
      <div className="flex flex-wrap gap-2">
        {path.visionSuggestions.map(suggestion => (
          <button
            key={suggestion}
            onClick={() => setTitle(suggestion)}
            className="rounded-full border border-card-border bg-surface-muted px-4 py-2 text-[11px] font-black text-text-secondary transition-colors hover:border-accent hover:text-accent"
          >
            {suggestion}
          </button>
        ))}
      </div>
      <button onClick={() => nextStep()} disabled={!cleanTitle} className="h-14 rounded-2xl bg-accent text-xs font-black uppercase tracking-widest text-accent-contrast shadow-2xl shadow-accent/20 disabled:opacity-45 active:scale-[0.98]">
        Create Vision
      </button>
    </div>
  );
}

function SetupTaskScreen({ selectedPath, taskTitle, setTaskTitle, nextStep }: { selectedPath: OnboardingPathId; taskTitle: string; setTaskTitle: (value: string) => void; nextStep: () => void }) {
  const path = getOnboardingPath(selectedPath);
  const cleanTaskTitle = String(taskTitle || '').trim();
  return (
    <div className="flex h-full min-h-0 flex-col justify-center space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">Next move</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-text-main sm:text-4xl">What is small enough to do today?</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-text-secondary">A tiny next action beats a perfect plan.</p>
      </div>
      <input
        autoFocus
        maxLength={160}
        value={taskTitle}
        onChange={event => setTaskTitle(event.target.value)}
        placeholder="Write first draft, fix one bug, study 25 minutes..."
        className="h-14 rounded-2xl border border-card-border bg-card px-5 text-sm font-black text-text-main outline-none transition-all placeholder:text-text-secondary/40 focus:border-accent focus:ring-4 focus:ring-accent/10"
      />
      <div className="space-y-2">
        {path.taskSuggestions.slice(0, 4).map(suggestion => (
          <button
            key={suggestion}
            onClick={() => setTaskTitle(suggestion)}
            className="flex w-full items-center gap-3 rounded-2xl border border-card-border bg-surface-muted p-2.5 text-left text-sm font-bold text-text-main transition-colors hover:border-accent"
          >
            <span className="h-5 w-5 rounded-lg border-2 border-accent/25 bg-card" />
            {suggestion}
          </button>
        ))}
      </div>
      <button onClick={nextStep} disabled={!cleanTaskTitle} className="h-14 rounded-2xl bg-accent text-xs font-black uppercase tracking-widest text-accent-contrast shadow-2xl shadow-accent/20 disabled:opacity-45 active:scale-[0.98]">
        Add Action
      </button>
    </div>
  );
}

function SetupPrivacyScreen({ visibility, setVisibility, nextStep }: { visibility: 'private' | 'circle' | 'public'; setVisibility: (value: 'private' | 'circle' | 'public') => void; nextStep: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col justify-center space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">Privacy default</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-text-main sm:text-4xl">Who should see your progress?</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-text-secondary">Private journals, notes, messages, and private logs stay private unless you choose to share them.</p>
      </div>
      <div className="space-y-2.5">
        {PRIVACY_OPTIONS.map(option => {
          const Icon = option.icon;
          const selected = visibility === option.id;
          return (
            <button
              key={option.id}
              onClick={() => setVisibility(option.id)}
              className={cn('flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all', selected ? 'border-accent bg-accent/10 shadow-lg shadow-accent/10' : 'border-card-border bg-card')}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent"><Icon className="h-5 w-5" /></span>
              <span>
                <span className="block text-sm font-black text-text-main">{option.title}</span>
                <span className="block text-xs font-semibold text-text-secondary">{option.desc}</span>
              </span>
              {selected && <CheckCircle2 className="ml-auto h-5 w-5 text-accent" />}
            </button>
          );
        })}
      </div>
      <button onClick={nextStep} className="h-14 rounded-2xl bg-accent text-xs font-black uppercase tracking-widest text-accent-contrast shadow-2xl shadow-accent/20 active:scale-[0.98]">
        Save Privacy
      </button>
    </div>
  );
}

function SetupThemeScreen({ selectedTheme, setSelectedTheme, nextStep }: { selectedTheme: string; setSelectedTheme: (value: string) => void; nextStep: () => void }) {
  return (
    <div className="flex h-full min-h-0 flex-col justify-center space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">Theme</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-text-main sm:text-4xl">Make VisNova feel like yours.</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-text-secondary">Lavender Focus is the VisNova default.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {THEME_OPTIONS.map(theme => {
          const selected = selectedTheme === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => setSelectedTheme(theme.id)}
              className={cn('rounded-2xl border p-4 text-left transition-all', selected ? 'border-accent bg-accent/10 shadow-lg shadow-accent/10' : 'border-card-border bg-card')}
            >
              <div className="mb-4 flex gap-2 rounded-2xl border border-card-border bg-white p-2">
                <span className="h-10 flex-1 rounded-xl" style={{ background: theme.bg }} />
                <span className="h-10 w-12 rounded-xl" style={{ background: theme.accent }} />
              </div>
              <p className="text-sm font-black text-text-main">{theme.label}</p>
              <p className="mt-1 text-xs font-semibold text-text-secondary">{theme.desc}</p>
            </button>
          );
        })}
      </div>
      <button onClick={nextStep} className="h-14 rounded-2xl bg-accent text-xs font-black uppercase tracking-widest text-accent-contrast shadow-2xl shadow-accent/20 active:scale-[0.98]">
        Apply Theme
      </button>
    </div>
  );
}

function SetupProofScreen({ proofContent, setProofContent, onLogProof, onSkip, isSaving }: { proofContent: string; setProofContent: (value: string) => void; onLogProof: () => void; onSkip: () => void; isSaving: boolean }) {
  const cleanProof = String(proofContent || '').trim();
  return (
    <div className="flex h-full min-h-0 flex-col justify-center space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">Log proof</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-text-main sm:text-4xl">Progress starts when you log proof.</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-text-secondary">Tasks show intention. Proof shows movement.</p>
      </div>
      <div className="rounded-3xl border border-card-border bg-surface-muted p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60">Example</p>
        <p className="mt-2 text-sm font-black text-text-main">Updated hero, CTA, and onboarding copy.</p>
      </div>
      <textarea
        value={proofContent}
        onChange={event => setProofContent(event.target.value)}
        placeholder="What did you do today? You can keep it private."
        className="min-h-28 rounded-2xl border border-card-border bg-card p-4 text-sm font-bold leading-6 text-text-main outline-none transition-all placeholder:text-text-secondary/40 focus:border-accent focus:ring-4 focus:ring-accent/10"
      />
      <button onClick={onLogProof} disabled={!cleanProof || isSaving} className="h-14 rounded-2xl bg-accent text-xs font-black uppercase tracking-widest text-accent-contrast shadow-2xl shadow-accent/20 disabled:opacity-45 active:scale-[0.98]">
        {isSaving ? 'Logging...' : 'Log First Proof'}
      </button>
      <button onClick={onSkip} disabled={isSaving} className="text-xs font-black uppercase tracking-widest text-text-secondary/55 hover:text-accent">
        I&apos;ll do this later
      </button>
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

      <div className="space-y-2.5">
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

      <div className="space-y-2.5">
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
          <ul className="space-y-2.5">
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
        <div className="space-y-2.5">
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
          <div key={category.name} className="space-y-2.5">
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
      <div className="space-y-2.5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Target size={26} />
        </div>
        <h2 className="text-4xl font-bold leading-tight tracking-tight text-text-main">Create your first Vision</h2>
        <p className="text-sm font-medium text-text-secondary">What are you working toward?</p>
      </div>
      <div className="space-y-2.5">
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
      <div className="space-y-2.5">
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
  const { completeOnboarding, addToast, session, signOut, addVision, addVisionTask, createProgressLog, setTheme } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const verifiedLogin = searchParams.get('verified') === 'true';

  const handleForceStart = async () => {
    await handleComplete(false);
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
  const [onboardingPath, setOnboardingPath] = useState<OnboardingPathId>('builder');
  const [firstVisionTitle, setFirstVisionTitle] = useState('');
  const [firstTaskTitle, setFirstTaskTitle] = useState('');
  const [defaultVisibility, setDefaultVisibility] = useState<'private' | 'circle' | 'public'>('private');
  const [selectedTheme, setSelectedTheme] = useState('lavender');
  const [proofContent, setProofContent] = useState('');
  const [firstVisionId, setFirstVisionId] = useState<string | null>(null);
  const [firstTaskId, setFirstTaskId] = useState<string | null>(null);
  const [hasLoggedFirstProof, setHasLoggedFirstProof] = useState(false);
  const [isOnboardingSaving, setIsOnboardingSaving] = useState(false);
  const [authRocketStage, setAuthRocketStage] = useState<RocketStageId>('form');

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

  const getGeneratedUsername = () => {
    const base = (username || email.split('@')[0] || name || 'visionary')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 16) || 'visionary';
    const suffix = session?.user?.id?.replace(/-/g, '').slice(0, 6) || Math.random().toString(36).slice(2, 8);
    return `${base}_${suffix}`.slice(0, 24);
  };

  const handleComplete = async (hasInitialVision = Boolean(firstVisionId)) => {
    setStep(9.5);

    try {
      const currentUser = session?.user;

      await completeOnboarding({
        name: name || 'Visionary Explorer',
        email: email || currentUser?.email || 'explorer@visnova.ai',
        interests: Array.from(new Set([onboardingPath, ...interests])).filter(Boolean),
        intent: firstVisionTitle || intent,
        commitment,
        username: getGeneratedUsername(),
        bio,
        gender,
        role: role || getOnboardingPath(onboardingPath).label,
        avatar,
        hasInitialVision,
        userType: onboardingPath,
        defaultVisibility,
        selectedTheme,
        firstVisionId,
        firstTaskId,
        hasLoggedFirstProof
      });
    } catch (err) {
      console.error('Finalization failed:', err);
      addToast({ type: 'error', title: 'Setup interrupted', description: 'Something went wrong during final sync.' });
    }
  };

  const coerceVisionTitle = (value: unknown) => {
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof (value as any)?.target?.value === 'string') return (value as any).target.value;
    if (typeof (value as any)?.currentTarget?.value === 'string') return (value as any).currentTarget.value;
    if (typeof (value as any)?.title === 'string') return (value as any).title;
    return '';
  };

  const createFirstVisionIfNeeded = async (overrideTitle?: unknown) => {
    if (firstVisionId) return firstVisionId;
    const rawTitle = coerceVisionTitle(overrideTitle) || firstVisionTitle || intent || 'My first Vision';
    const cleanTitle = sanitizeText(rawTitle, 120).trim() || 'My first Vision';
    const vision = await addVision({
      title: cleanTitle,
      description: getOnboardingPath(onboardingPath).tone,
      progress: 0,
      status: 'planning',
      category: onboardingPath,
      tags: Array.from(new Set([onboardingPath, ...interests])).filter(Boolean),
      tasks: [],
      notes: '',
      proof: [],
      elements: [],
      visibility: defaultVisibility
    });
    setFirstVisionId(vision.id);
    trackBetaEvent(session?.user?.id, 'onboarding_vision_created', { path: onboardingPath });
    return vision.id;
  };

  const handleCreateFirstVision = async (overrideTitle?: unknown) => {
    try {
      const nextTitle = (coerceVisionTitle(overrideTitle) || firstVisionTitle || '').trim();
      if (!nextTitle) return;
      if (overrideTitle !== undefined) setFirstVisionTitle(nextTitle);
      await createFirstVisionIfNeeded(nextTitle);
      nextStep(6);
    } catch (err) {
      console.error('Failed to create first Vision:', err);
      addToast({
        type: 'error',
        title: 'Vision failed',
        description: err instanceof Error ? err.message : 'Could not create your first Vision.'
      });
    }
  };

  const handleCreateFirstTask = async () => {
    const cleanTaskTitle = String(firstTaskTitle || '').trim();
    if (!cleanTaskTitle) return;
    setIsOnboardingSaving(true);
    try {
      const visionId = await createFirstVisionIfNeeded();
      if (!firstTaskId) {
        const task = await addVisionTask(visionId, {
          text: sanitizeText(cleanTaskTitle, 160),
          description: 'Created during onboarding.',
          status: 'today',
          priority: 'medium',
          progressPercent: 0,
          tags: [onboardingPath],
          checklist: [],
          visibility: defaultVisibility
        } as any);
        if (task && typeof task !== 'boolean') {
          setFirstTaskId(task.id);
          trackBetaEvent(session?.user?.id, 'onboarding_task_created', { path: onboardingPath });
        }
      }
      nextStep(7);
    } catch (err) {
      console.error('Failed to create first task:', err);
      addToast({ type: 'error', title: 'Action failed', description: 'Could not create your first next move.' });
    } finally {
      setIsOnboardingSaving(false);
    }
  };

  const handlePrivacyContinue = () => {
    trackBetaEvent(session?.user?.id, 'onboarding_privacy_selected', { visibility: defaultVisibility });
    nextStep(8);
  };

  const handleThemeContinue = () => {
    setTheme(selectedTheme as any);
    trackBetaEvent(session?.user?.id, 'onboarding_theme_selected', { theme: selectedTheme });
    nextStep(9);
  };

  const handleLogFirstProof = async () => {
    const cleanProof = String(proofContent || '').trim();
    if (!cleanProof) return;
    setIsOnboardingSaving(true);
    try {
      const visionId = await createFirstVisionIfNeeded();
      const saved = await createProgressLog({
        content: cleanProof,
        visionId,
        taskId: firstTaskId || undefined,
        visibility: defaultVisibility,
        logType: 'progress',
        metadata: { source: 'onboarding_first_proof', path: onboardingPath }
      } as any);
      if (saved) {
        setHasLoggedFirstProof(true);
        trackBetaEvent(session?.user?.id, 'onboarding_first_proof_logged', { path: onboardingPath });
      }
      nextStep(9.35);
    } finally {
      setIsOnboardingSaving(false);
    }
  };

  const setupVisualBase = {
    selectedPath: onboardingPath,
    visionTitle: firstVisionTitle,
    taskTitle: firstTaskTitle,
    selectedTheme
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
      case 1:
        return (
          <AuthShell mode="signup" rocketStage={authRocketStage}>
            <Screen1 name={name} setName={setName} email={email} setEmail={setEmail} password={password} setPassword={setPassword} nextStep={nextStep} handleGoogleLogin={handleGoogleLogin} setRocketStage={setAuthRocketStage} rocketStage={authRocketStage} />
          </AuthShell>
        );
      case 11:
        return (
          <AuthShell mode="login" rocketStage="form">
            <ScreenLogin
              email={email} setEmail={setEmail}
              nextStep={nextStep}
              switchToSignup={() => nextStep(1)}
              setStep={setStep}
              handleGoogleLogin={handleGoogleLogin}
              verifiedMessage={verifiedLogin}
            />
          </AuthShell>
        );
      case 12:
        return <ScreenForgotPassword
          email={email} setEmail={setEmail}
          backToLogin={() => nextStep(11)}
        />;
      case 13: return <ScreenResetPassword nextStep={nextStep} />;
      case 2: return <ScreenVerify email={email} nextStep={nextStep} onChangeEmail={() => nextStep(1)} />;
      case 3:
        return (
          <SetupShell step={step} visualProps={{ ...setupVisualBase, variant: 'welcome', title: 'Start small', subtitle: 'Build your system one proof log at a time.' }}>
            <SetupWelcomeScreen nextStep={() => {
              trackBetaEvent(session?.user?.id, 'onboarding_started', { source: 'setup_welcome' });
              nextStep(4);
            }} />
          </SetupShell>
        );
      case 4:
        return (
          <SetupShell step={step} visualProps={{ ...setupVisualBase, variant: 'path', title: 'Personalize', subtitle: getOnboardingPath(onboardingPath).tone }}>
            <SetupPathScreen selectedPath={onboardingPath} setSelectedPath={(path) => {
              setOnboardingPath(path);
              trackBetaEvent(session?.user?.id, 'onboarding_path_selected', { path });
            }} nextStep={() => nextStep(5)} />
          </SetupShell>
        );
      case 5:
        return (
          <SetupShell step={step} visualProps={{ ...setupVisualBase, variant: 'vision', title: 'Your Vision', subtitle: firstVisionTitle || 'Name the future you want to move first.' }}>
            <SetupVisionScreen selectedPath={onboardingPath} title={firstVisionTitle} setTitle={setFirstVisionTitle} nextStep={handleCreateFirstVision} />
          </SetupShell>
        );
      case 6:
        return (
          <SetupShell step={step} visualProps={{ ...setupVisualBase, variant: 'task', title: 'Your next move', subtitle: firstTaskTitle || 'Make it small enough to do today.' }}>
            <SetupTaskScreen selectedPath={onboardingPath} taskTitle={firstTaskTitle} setTaskTitle={setFirstTaskTitle} nextStep={handleCreateFirstTask} />
          </SetupShell>
        );
      case 7:
        return (
          <SetupShell step={step} visualProps={{ ...setupVisualBase, variant: 'privacy', title: 'Private by default', subtitle: 'You control what becomes visible.' }}>
            <SetupPrivacyScreen visibility={defaultVisibility} setVisibility={setDefaultVisibility} nextStep={handlePrivacyContinue} />
          </SetupShell>
        );
      case 8:
        return (
          <SetupShell step={step} visualProps={{ ...setupVisualBase, variant: 'theme', title: 'Your workspace', subtitle: 'A calm interface for repeat progress.' }}>
            <SetupThemeScreen selectedTheme={selectedTheme} setSelectedTheme={setSelectedTheme} nextStep={handleThemeContinue} />
          </SetupShell>
        );
      case 9:
        return (
          <SetupShell step={step} visualProps={{ ...setupVisualBase, variant: 'proof', title: 'Proof habit', subtitle: 'Tasks show intention. Proof shows movement.' }}>
            <SetupProofScreen
              proofContent={proofContent}
              setProofContent={setProofContent}
              onLogProof={handleLogFirstProof}
              onSkip={() => {
                trackBetaEvent(session?.user?.id, 'onboarding_first_proof_prompt_seen', { skipped: true, path: onboardingPath });
                nextStep(9.35);
              }}
              isSaving={isOnboardingSaving}
            />
          </SetupShell>
        );
      case 9.25: return <ScreenCreateFirstVision onCreate={(title) => handleCreateFirstVision(title)} onSkip={() => handleComplete(false)} />;
      case 9.35:
        return (
          <SetupShell step={step} visualProps={{ ...setupVisualBase, variant: 'complete', title: 'You are set', subtitle: 'Your first growth system is ready.' }}>
            <div className="flex h-full flex-col justify-center space-y-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">Ready</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-text-main sm:text-4xl">Your system is ready.</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-text-secondary">Go to Dashboard and keep today&apos;s proof visible.</p>
              </div>
              <div className="space-y-2.5">
                {[
                  ['Vision created', firstVisionTitle || 'Your first Vision'],
                  ['Next move ready', firstTaskTitle || 'Your first action'],
                  ['Proof habit', hasLoggedFirstProof ? 'First proof logged' : "Log today's proof from Dashboard"]
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center gap-3 rounded-2xl border border-card-border bg-surface-muted p-4">
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-accent">{label}</p>
                      <p className="text-sm font-black text-text-main">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => handleComplete(true)} className="h-14 rounded-2xl bg-accent text-xs font-black uppercase tracking-widest text-accent-contrast shadow-2xl shadow-accent/20 active:scale-[0.98]">
                Go to Dashboard
              </button>
            </div>
          </SetupShell>
        );
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

  const usesIntroCard = [2, 12, 13].includes(step);

  const progressSteps = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-bg-base p-0 font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      {step < 10 && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-8">
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={prevStep}
              className="group flex h-10 items-center gap-2 rounded-2xl border border-card-border bg-card/85 px-3 text-[10px] font-black uppercase tracking-widest text-text-secondary/70 shadow-sm backdrop-blur-xl transition-colors hover:text-text-main"
            >
              <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
              Back
            </button>
            {session?.user && (
              <button
                onClick={async () => {
                  await signOut();
                  navigate('/');
                }}
                className="rounded-2xl border border-accent/10 bg-card/80 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-accent/60 shadow-sm backdrop-blur-xl transition-all hover:text-accent"
              >
                Sign Out
              </button>
            )}
          </div>

          <div className="pointer-events-auto flex items-center gap-3">
            {step >= 8 || username ? (
              <button
                onClick={handleForceStart}
                className="hidden rounded-2xl border border-accent/10 bg-card/80 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-accent/45 shadow-sm backdrop-blur-xl transition-all hover:text-accent sm:block"
              >
                Skip
              </button>
            ) : null}
            <div className="flex gap-1.5 rounded-full border border-card-border bg-card/80 px-2.5 py-2 shadow-sm backdrop-blur-xl">
              {progressSteps.map(s => (
                <div
                  key={s}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    step === s ? "w-8 bg-accent" : s < step ? "w-4 bg-accent/25" : "w-4 bg-card-border"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      )}

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
            className="absolute inset-0 flex items-stretch justify-center overflow-hidden px-3 pb-2 pt-[calc(3.75rem+env(safe-area-inset-top))] sm:items-center sm:px-5 sm:pb-3 sm:pt-[calc(4rem+env(safe-area-inset-top))]"
          >
            <div
              className={cn(
                "w-full overflow-y-auto custom-scrollbar",
                usesIntroCard
                  ? "h-full max-h-full max-w-[520px] rounded-[1.5rem] border border-card-border bg-card/95 p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-2xl shadow-accent/10 backdrop-blur-xl sm:rounded-[2rem] sm:p-6"
                  : "h-full max-h-full max-w-[1180px] p-0 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
              )}
            >
              {renderCurrentStep()}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

