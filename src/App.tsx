/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Home, Target, Zap, Users, Bell, Compass, Clock, X, LibraryBig, MoreHorizontal, GraduationCap, Wallet } from 'lucide-react';
import { lazy, Suspense, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './components/Dashboard/Dashboard';
import Squad from './components/Mentors/Squad';
import Circle from './components/Circle/Circle';
import OnboardingFlow from './components/Onboarding/OnboardingFlow';
import AuthCallback from './components/Auth/AuthCallback';
import { InteractiveTour } from './components/Onboarding/InteractiveTour';
import VisionAssistant from './components/AI/VisionAssistant';
import FloatingTimer from './components/Dashboard/FloatingTimer';
import UserProfileModal from './components/Social/UserProfileModal';
import NotificationCenter from './components/Social/NotificationCenter';
import ProfileDropdown from './components/ProfileDropdown';
import ToastViewport from './components/ToastViewport';
import { cn } from './lib/utils';
import { useStore } from './store/useStore';
import FocusOverlay from './components/Dashboard/FocusOverlay';
import ErrorBoundary from './components/ErrorBoundary';
import CookieNotice from './components/CookieNotice';
import { CookiePolicyPage, PrivacyPolicyPage, SupportPage, TermsPage } from './components/Legal/LegalPages';
import { isSupabaseConfigured, supabase, supabaseConfigError } from './lib/supabase';
import { trackBetaEvent } from './lib/betaAnalytics';
import { XpToast } from './components/ui/XpToast';

const VisionBoard = lazy(() => import('./components/VisionBoard/VisionBoard'));
const NovaClock = lazy(() => import('./components/Nova/NovaClock'));
const MindVisualizer = lazy(() => import('./components/Mind/MindVisualizer'));
const CommunityFeed = lazy(() => import('./components/Feed/CommunityFeed'));
const PostThreadPage = lazy(() => import('./components/Feed/PostThreadPage'));
const NotesSystem = lazy(() => import('./components/Notes/NotesSystem'));
const ProfilePage = lazy(() => import('./components/Social/ProfilePage'));
const Settings = lazy(() => import('./components/Settings/Settings'));
const FeedbackPage = lazy(() => import('./components/Support/FeedbackPage'));
const MoneyPage = lazy(() => import('./components/Money/MoneyPage'));

function AccountabilityNudge() {
  const [visible, setVisible] = useState(false);
  const { visions } = useStore();
  const todayDismissKey = `visnova_nudge_dismissed_${new Date().toISOString().slice(0, 10)}`;

  useEffect(() => {
    setVisible(false);
    if (typeof window !== 'undefined' && localStorage.getItem(todayDismissKey) === 'true') {
      return;
    }

    const hasUncompleted = (visions || []).some(v =>
      v &&
      v.status === 'in-progress' &&
      v.tasks &&
      Array.isArray(v.tasks) &&
      v.tasks.some(t => t && !t.completed)
    );
    if (hasUncompleted) {
      const timer = setTimeout(() => {
        if (localStorage.getItem(todayDismissKey) !== 'true') {
          setVisible(true);
        }
      }, 10 * 60 * 1000);
      return () => clearTimeout(timer);
    }
  }, [visions, todayDismissKey]);

  const dismissForToday = () => {
    localStorage.setItem(todayDismissKey, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed bottom-24 right-8 lg:bottom-12 z-[200] max-w-sm w-full bg-card border-2 border-accent text-text-main p-6 shadow-2xl shadow-accent/20"
    >
      <button onClick={dismissForToday} className="absolute top-4 right-4 text-text-secondary/50 hover:text-text-main transition-colors">
         <X size={16} />
      </button>
      <div className="flex gap-4">
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0 border border-accent/20">
          <Zap size={18} className="text-accent" />
        </div>
        <div className="space-y-3">
          <h4 className="text-sm font-bold tracking-tight">Daily Goal</h4>
          <p className="text-xs text-text-secondary font-medium leading-relaxed">
            You planned to work on your goals today. Ready to make some progress?
          </p>
          <div className="pt-2">
            <button
              onClick={dismissForToday}
              className="text-[10px] font-black uppercase tracking-widest text-accent hover:text-accent/80 transition-colors"
            >
              Dismiss today
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

type NavItem = {
  icon: typeof Home;
  label: string;
  path: string;
  id?: string;
  badge?: number;
};

const mainNavBase: NavItem[] = [
  { icon: Home, label: 'Dashboard', path: '/', id: 'nav-dashboard' },
  { icon: Compass, label: 'Feed', path: '/feed' },
  { icon: Target, label: 'Visions', path: '/visions', id: 'nav-vision' },
  { icon: LibraryBig, label: 'Library', path: '/library' },
  { icon: GraduationCap, label: 'Growth', path: '/growth' },
  { icon: Wallet, label: 'Wallet', path: '/wallet' },
  { icon: Users, label: 'Circle', path: '/circle' },
  { icon: Clock, label: 'Nova Clock', path: '/nova-clock' },
];

const isRouteActive = (pathname: string, path: string) => {
  if (path === '/') return pathname === '/';
  if (path === '/wallet') return pathname === '/wallet' || pathname === '/money';
  return pathname === path || pathname.startsWith(`${path}/`);
};

function useUnreadMessageCount() {
  const session = useStore(state => state.session);
  const [count, setCount] = useState(0);
  const currentUserId = session?.user?.id;

  useEffect(() => {
    let cancelled = false;

    const loadCount = async () => {
      if (!currentUserId) {
        setCount(0);
        return;
      }

      const { data: participantRows, error: participantError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId);

      if (cancelled || participantError) {
        if (participantError) console.error('Failed to load message badge:', participantError);
        setCount(0);
        return;
      }

      const conversationIds = Array.from(new Set((participantRows || []).map((row: any) => row.conversation_id)));
      if (conversationIds.length === 0) {
        setCount(0);
        return;
      }

      const { count: unreadCount, error: unreadError } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .neq('user_id', currentUserId)
        .is('read_at', null)
        .is('deleted_at', null);

      if (cancelled) return;
      if (unreadError) {
        console.error('Failed to load unread messages:', unreadError);
        setCount(0);
        return;
      }

      setCount(unreadCount || 0);
    };

    const refreshCount = () => loadCount();
    window.addEventListener('visnova-messages-read', refreshCount);
    loadCount();
    const channelId = `nav-message-badge:${currentUserId || 'guest'}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, loadCount)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, loadCount)
      .subscribe();

    return () => {
      cancelled = true;
      window.removeEventListener('visnova-messages-read', refreshCount);
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return count;
}

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleFocusMode, user, unreadNotificationCount } = useStore();
  const unreadMessageCount = useUnreadMessageCount();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    const openNotifications = () => setIsNotificationsOpen(true);
    window.addEventListener('open-visnova-notifications', openNotifications);
    return () => window.removeEventListener('open-visnova-notifications', openNotifications);
  }, []);

  const navItems = mainNavBase.map(item => (
    item.path === '/circle' ? { ...item, badge: unreadMessageCount } : item
  ));

  return (
    <aside
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className={cn(
        "absolute left-0 top-0 h-full bg-sidebar border-r border-card-border flex-col z-50 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-visible hidden lg:flex",
        isExpanded ? "w-60 shadow-[20px_0_60px_rgba(0,0,0,0.03)]" : "w-16"
      )}
    >
      <div className={cn("p-4 mb-2", !isExpanded && "px-3")}>
        <div className={cn("flex items-center", isExpanded ? "gap-3" : "justify-center")}>
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shrink-0 shadow-lg shadow-accent/10">
             <div className="w-1.5 h-1.5 bg-accent-contrast rounded-full animate-pulse" />
          </div>
          <span className={cn(
            "text-base font-display font-semibold tracking-tight text-text-main transition-all duration-500 uppercase overflow-hidden whitespace-nowrap",
            isExpanded ? "w-auto opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-2"
          )}>
            <span className="text-text-main">Vis</span><span className="text-accent font-semibold">Nova</span>
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 mt-6 overflow-y-auto scrollbar-hide min-h-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isRouteActive(location.pathname, item.path);
          return (
            <Link
              key={item.label}
              id={item.id}
              to={item.path}
              title={!isExpanded ? item.label : undefined}
              className={cn(
                'flex items-center h-11 rounded-xl transition-all duration-300 group relative',
                isExpanded ? 'justify-start gap-4 px-3' : 'justify-center px-0',
                isActive
                  ? 'bg-accent/5 text-accent font-semibold'
                  : 'text-text-secondary hover:text-text-main hover:bg-surface-muted'
              )}
            >
              <Icon size={18} className={cn('shrink-0 transition-all duration-500', isActive ? 'text-accent' : '[data-theme=sage]:text-white/70 text-text-secondary/60 group-hover:text-text-main group-hover:[data-theme=sage]:text-white')} />
              {!!item.badge && (
                <span className={cn("absolute top-1.5 min-w-4 h-4 px-1 bg-accent text-accent-contrast text-[8px] font-black rounded-full flex items-center justify-center border-2 border-sidebar", isExpanded ? "right-3" : "right-1.5")}>
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
              <span className={cn(
                "font-semibold text-[10px] uppercase tracking-wider transition-all duration-500 whitespace-nowrap overflow-hidden",
                isExpanded ? "w-auto opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-2",
                isActive ? "text-accent" : "[data-theme=sage]:text-white/80 text-text-secondary"
              )}>
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 w-1 h-8 bg-accent rounded-r-full"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className={cn("shrink-0 border-t border-card-border/50 p-3 mb-2 space-y-2", isExpanded ? "px-4" : "px-3")}>
        <button
          id="nav-focus"
          onClick={toggleFocusMode}
          title={!isExpanded ? "Start Focus" : undefined}
          aria-label="Start Focus"
          className={cn(
            "w-full h-11 rounded-xl bg-accent text-accent-contrast transition-all shadow-lg shadow-accent/10 flex items-center overflow-hidden group active:scale-95",
            isExpanded ? "justify-start gap-4 px-3.5" : "justify-center px-0"
          )}
        >
           <div className="w-5 h-5 shrink-0 flex items-center justify-center">
              <Zap size={16} className="fill-accent-contrast" />
           </div>
           <span className={cn(
              "font-semibold text-[10px] uppercase tracking-wider transition-all duration-500 whitespace-nowrap",
              isExpanded ? "opacity-100 translate-x-0" : "sr-only"
            )}>
              Start Focus
            </span>
        </button>

        <div className="relative">
          <button
            onClick={() => setIsNotificationsOpen(open => !open)}
            className={cn(
              "w-full h-11 flex items-center rounded-xl transition-all duration-500 group relative",
              isExpanded ? "justify-start gap-4 px-3" : "justify-center px-0",
              isNotificationsOpen ? "text-accent bg-accent/5" : "text-text-secondary hover:text-text-main hover:bg-surface-muted"
            )}
            aria-label="Open notifications"
            title={!isExpanded ? "Notifications" : undefined}
          >
            <Bell size={18} className="shrink-0" />
            {unreadNotificationCount > 0 && (
              <span className={cn("absolute top-1.5 min-w-4 h-4 px-1 bg-accent text-accent-contrast text-[8px] font-black rounded-full flex items-center justify-center border-2 border-sidebar", isExpanded ? "left-7" : "right-1.5")}>
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
            <span className={cn(
              "text-[10px] font-semibold uppercase tracking-wider transition-all duration-500 whitespace-nowrap overflow-hidden",
              isExpanded ? "w-auto opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-2"
            )}>
              Notifications
            </span>
          </button>
          <NotificationCenter isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
        </div>

        <div className={cn("relative flex items-center rounded-xl transition-all duration-500 group", location.pathname === '/profile' ? "bg-accent/5 text-accent" : "text-text-secondary hover:text-text-main hover:bg-surface-muted")}>
          <button
            onClick={() => {
              setIsProfileOpen(false);
              navigate('/profile');
            }}
            className={cn(
              "min-w-0 h-12 flex items-center rounded-xl transition-all duration-500",
              isExpanded ? "flex-1 justify-start gap-3 px-3" : "w-full justify-center px-0"
            )}
            aria-label="View profile"
            title={!isExpanded ? "Profile" : undefined}
          >
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${user?.id || 'visnova'}`}
              className="w-8 h-8 rounded-xl object-cover border border-card-border shrink-0"
              alt="Profile"
            />
            {isExpanded && (
              <span className="flex flex-col min-w-0 text-left">
                <span className="text-[10px] font-semibold uppercase tracking-wider truncate">{user?.name || 'Profile'}</span>
                <span className="text-[9px] font-medium text-text-secondary/60 truncate">@{user?.username || 'user'}</span>
              </span>
            )}
          </button>
          <button
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setIsProfileOpen(open => !open);
            }}
            className={cn(
              "rounded-lg flex items-center justify-center text-text-secondary/50 hover:text-accent hover:bg-accent/5 transition-colors",
              isExpanded ? "mr-2 w-8 h-8" : "absolute -right-1 -bottom-1 w-5 h-5 bg-card border border-card-border"
            )}
            aria-label="Open profile menu"
            title={!isExpanded ? "Profile menu" : undefined}
          >
            <MoreHorizontal size={isExpanded ? 16 : 12} />
          </button>
          <ProfileDropdown isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        </div>
      </div>
    </aside>

  );
}

function MobileNav() {
  const location = useLocation();
  const unreadMessageCount = useUnreadMessageCount();

  const primaryItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Compass, label: 'Feed', path: '/feed' },
    { icon: Target, label: 'Visions', path: '/visions' },
    { icon: LibraryBig, label: 'Library', path: '/library' },
    { icon: Users, label: 'Circle', path: '/circle', badge: unreadMessageCount },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 min-h-[4.75rem] bg-sidebar/95 backdrop-blur-xl border-t border-card-border lg:hidden grid grid-cols-5 gap-1 px-2 pt-2 pb-[calc(0.55rem+env(safe-area-inset-bottom))] z-[80] transition-colors duration-500">
      {primaryItems.map((item) => {
        const Icon = item.icon;
        const active = isRouteActive(location.pathname, item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "min-h-12 rounded-2xl flex flex-col items-center justify-center gap-1 text-[10px] font-black tracking-wide transition-all relative",
              active ? "text-accent bg-accent/10" : "text-text-secondary/60 active:bg-surface-muted"
            )}
          >
            <Icon size={21} />
            {!!item.badge && (
              <span className="absolute top-1.5 right-3 min-w-4 h-4 px-1 bg-accent text-accent-contrast text-[8px] font-black rounded-full flex items-center justify-center">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

const pageContext: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Your daily progress space' },
  '/feed': { title: 'Feed', subtitle: 'Share progress and support others' },
  '/visions': { title: 'Visions', subtitle: 'Plan goals and move tasks forward' },
  '/vision': { title: 'Visions', subtitle: 'Plan goals and move tasks forward' },
  '/library': { title: 'Library', subtitle: 'Notes, audio, and journal' },
  '/notes': { title: 'Library', subtitle: 'Notes, audio, and journal' },
  '/journal': { title: 'Library', subtitle: 'Notes, audio, and journal' },
  '/circle': { title: 'Circle', subtitle: 'Messages, connections, communities, requests, and activity' },
  '/communities': { title: 'Circle', subtitle: 'Messages, connections, communities, requests, and activity' },
  '/growth': { title: 'Growth', subtitle: 'Learn with purpose and turn resources into action' },
  '/money': { title: 'Wallet', subtitle: 'Track spending, subscriptions, and savings for your Visions' },
  '/wallet': { title: 'Wallet', subtitle: 'Track spending, subscriptions, and savings for your Visions' },
  '/nova-clock': { title: 'Nova Clock', subtitle: 'NovaCapsules for your future self' },
  '/settings': { title: 'Settings', subtitle: 'Manage your workspace' },
  '/profile': { title: 'Profile', subtitle: 'Your public progress page' },
  '/privacy': { title: 'Privacy', subtitle: 'How VisNova handles data' },
  '/terms': { title: 'Terms', subtitle: 'Rules for using VisNova' },
  '/cookies': { title: 'Cookies', subtitle: 'Browser storage and cookies' },
  '/support': { title: 'Support', subtitle: 'Legal, account, and help requests' },
  '/feedback': { title: 'Feedback', subtitle: 'Report bugs and beta feedback' },
};

function PageContextHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  if (location.pathname === '/circle' || location.pathname === '/communities') return null;
  const meta = pageContext[location.pathname] || (location.pathname.startsWith('/post/') ? { title: 'Thread', subtitle: 'Post comments' } : null);
  if (!meta) return null;

  return (
    <div className="flex xl:hidden px-4 pt-[calc(0.85rem+env(safe-area-inset-top))] md:pt-4 pb-2 items-center justify-between border-b border-card-border/60 bg-app-container/95">
      <div>
        <h1 className="text-sm md:text-sm font-black uppercase tracking-[0.18em] md:tracking-[0.22em] text-text-main">{meta.title}</h1>
        {meta.subtitle && <p className="hidden sm:block text-[10px] font-semibold text-text-secondary mt-1">{meta.subtitle}</p>}
      </div>
      <div className="relative flex items-center gap-2">
        <button
          onClick={() => {
            setIsProfileOpen(false);
            navigate('/profile');
          }}
          className="h-10 w-10 rounded-2xl border border-card-border bg-card overflow-hidden flex items-center justify-center active:scale-95 transition-transform"
          aria-label="View profile"
        >
          <img
            src={user?.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${user?.id || 'visnova'}`}
            className="h-full w-full object-cover"
            alt="Profile"
          />
        </button>
        <button
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => setIsProfileOpen(open => !open)}
          className="h-10 w-10 rounded-2xl border border-card-border bg-card text-text-secondary flex items-center justify-center active:scale-95 transition-colors hover:text-accent"
          aria-label="Open profile menu"
        >
          <MoreHorizontal size={18} />
        </button>
        <ProfileDropdown isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} placement="header" />
      </div>
    </div>
  );
}


function MessagesRedirect() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  searchParams.set('tab', 'messages');
  return <Navigate to={`/circle?${searchParams.toString()}`} replace />;
}

function NotesRedirect() {
  const location = useLocation();
  return <Navigate to={`/library${location.search || ''}`} replace />;
}

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
        className="h-10 w-10 rounded-full border-4 border-accent/10 border-t-accent"
      />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary/50">Loading workspace</p>
    </div>
  );
}

function SupabaseConfigScreen() {
  return (
    <div className="h-screen w-screen bg-bg-base flex items-center justify-center p-6">
      <div className="max-w-lg rounded-[2rem] border border-card-border bg-card p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <X size={22} />
        </div>
        <h1 className="text-lg font-black uppercase tracking-widest text-text-main">Supabase env required</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-text-secondary">
          VisNova is not connected because the Supabase environment variables are missing or invalid.
        </p>
        <p className="mt-4 rounded-2xl bg-surface-muted p-4 text-left text-xs font-bold text-text-secondary">
          {supabaseConfigError || 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before deployment.'}
        </p>
      </div>
    </div>
  );
}

function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="text-6xl font-black text-text-main/10">404</div>
      <h2 className="text-xl font-black uppercase tracking-widest text-text-main">Page not found</h2>
      <p className="max-w-xs text-sm text-text-secondary">
        This page does not exist or was moved. Head back to your dashboard.
      </p>
      <button
        onClick={() => navigate('/')}
        className="rounded-2xl bg-accent px-6 py-3 text-xs font-black uppercase tracking-widest text-accent-contrast transition-opacity hover:opacity-90"
      >
        Go to Dashboard
      </button>
    </div>
  );
}

export function DeletedContentPage({ label = 'content' }: { label?: string }) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-surface-muted text-text-secondary">
        <X size={26} />
      </div>
      <h2 className="text-lg font-black uppercase tracking-widest text-text-main">Unavailable {label}</h2>
      <p className="max-w-xs text-sm font-semibold text-text-secondary">
        This {label} may have been deleted, archived, or made private.
      </p>
      <button onClick={() => navigate('/')} className="rounded-2xl border border-card-border bg-card px-5 py-3 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-accent">
        Back to Dashboard
      </button>
    </div>
  );
}

function AppContent() {
  const { 
    theme, 
    isFocusMode, 
    hasCompletedOnboarding, 
    profile,
    authLoading, 
    isProfileReady,
    isAuthInitialized,
    initializeAuth, 
    tutorialCompleted, 
    session 
  } = useStore();
  const location = useLocation();
  
  const isPasswordRecovery = sessionStorage.getItem('visnova-auth-link-mode') === 'recovery' || new URLSearchParams(window.location.search).get('mode') === 'reset-password';
  const isAuthCallbackPath = location.pathname === '/auth/callback';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Auth Initialization
  useEffect(() => {
    if (isSupabaseConfigured()) initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (!session?.user?.id || !isSupabaseConfigured()) return;
    const today = new Date().toISOString().slice(0, 10);
    const sessionKey = `visnova_session_started_${session.user.id}_${today}`;
    const returnKey = `visnova_day_return_${session.user.id}_${today}`;

    if (sessionStorage.getItem(sessionKey) !== 'true') {
      sessionStorage.setItem(sessionKey, 'true');
      trackBetaEvent(session.user.id, 'session_started', { beta: true });
    }

    if (localStorage.getItem(returnKey) !== 'true') {
      localStorage.setItem(returnKey, 'true');
      trackBetaEvent(session.user.id, 'day_return', { date: today });
    }

    const signupDateKey = `visnova_signup_date_${session.user.id}`;
    if (!localStorage.getItem(signupDateKey)) {
      localStorage.setItem(signupDateKey, today);
    }
    const signupDate = localStorage.getItem(signupDateKey);
    const daysSinceSignup = signupDate ? Math.floor((Date.now() - new Date(signupDate).getTime()) / 86400000) : 0;
    const day7Key = `visnova_day_7_return_${session.user.id}`;
    if (daysSinceSignup === 7 && localStorage.getItem(day7Key) !== 'true') {
      localStorage.setItem(day7Key, 'true');
      trackBetaEvent(session.user.id, 'day_7_return', { day: 7 });
    }
  }, [session?.user?.id]);

  if (!isSupabaseConfigured()) {
    return <SupabaseConfigScreen />;
  }

  if (authLoading && !isAuthInitialized && !isAuthCallbackPath) {
    return (
      <div className="h-screen w-screen bg-bg-base flex flex-col items-center justify-center space-y-6">
         <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-accent/10 border-t-accent rounded-full mb-4"
         />
         <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-main opacity-80">VisNova</span>
            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-text-secondary opacity-40">Setting up your workspace...</span>
         </div>
      </div>
    );
  }

  // Only block the whole app during the first profile bootstrap. Later profile
  // refreshes happen in the background so the app never blanks mid-session.
  if (session && !isProfileReady && !profile) {
    return (
      <div className="h-screen w-screen bg-bg-base flex flex-col items-center justify-center space-y-6">
         <motion.div 
            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center"
         >
            <div className="w-2 h-2 bg-accent rounded-full animate-ping" />
         </motion.div>
         <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-main opacity-80">Loading</span>
            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-text-secondary opacity-40">Loading your profile data...</span>
         </div>
      </div>
    );
  }

  const showOnboarding = !session || (isProfileReady && !hasCompletedOnboarding) || isPasswordRecovery;

  return (
    <>
      <ToastViewport />
      <CookieNotice />
      <AnimatePresence mode="wait">
        {isAuthCallbackPath ? (
          <motion.div
            key="auth-callback"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98, filter: 'blur(5px)' }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 z-50 bg-bg-base"
          >
            <Routes>
              <Route path="/auth/callback" element={<AuthCallback />} />
            </Routes>
          </motion.div>
        ) : showOnboarding ? (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98, filter: 'blur(5px)' }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 z-50 bg-bg-base"
          >
            <Routes>
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="*" element={<OnboardingFlow />} />
            </Routes>
          </motion.div>
        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0, scale: 1.02, filter: 'blur(5px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="min-h-screen bg-bg-base flex items-center justify-center font-sans selection:bg-accent selection:text-accent-contrast relative z-0"
          >
            <div className="w-full h-screen bg-app-container shadow-2xl overflow-hidden relative flex">
              <AnimatePresence>
                {isFocusMode && <FocusOverlay />}
                <AccountabilityNudge />
                <UserProfileModal />
                <XpToast />
              </AnimatePresence>

              {!tutorialCompleted && hasCompletedOnboarding && !isPasswordRecovery && <InteractiveTour />}
              <Sidebar />
              <FloatingTimer />
              <VisionAssistant />
              <main className="flex-1 min-w-0 lg:pl-16 h-full flex flex-col relative transition-all duration-500 overflow-hidden">
                <PageContextHeader />
                <div className="flex-1 p-3 sm:p-4 lg:p-5 xl:p-6 pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:pb-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
                  <Suspense fallback={<RouteFallback />}>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/dashboard" element={<Navigate to="/" replace />} />
                      <Route path="/feed" element={<CommunityFeed />} />
                      <Route path="/post/:postId" element={<PostThreadPage />} />
                      <Route path="/visions" element={<VisionBoard />} />
                      <Route path="/vision" element={<Navigate to="/visions" replace />} />
                      <Route path="/circle" element={<Circle />} />
                      <Route path="/communities" element={<Navigate to="/circle?tab=communities" replace />} />
                      <Route path="/messages" element={<MessagesRedirect />} />
                      <Route path="/library" element={<NotesSystem />} />
                      <Route path="/notes" element={<NotesRedirect />} />
                      <Route path="/journal" element={<Navigate to="/library?tab=journal" replace />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/profile/:profileId" element={<ProfilePage />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/money" element={<MoneyPage />} />
                      <Route path="/wallet" element={<MoneyPage />} />
                      <Route path="/nova-clock" element={<NovaClock />} />
                      <Route path="/nova" element={<Navigate to="/nova-clock" replace />} />
                      <Route path="/timeline" element={<Navigate to="/nova-clock" replace />} />
                      <Route path="/growth" element={<MindVisualizer />} />
                      <Route path="/mind-map" element={<Navigate to="/growth" replace />} />
                      <Route path="/privacy" element={<PrivacyPolicyPage />} />
                      <Route path="/terms" element={<TermsPage />} />
                      <Route path="/cookies" element={<CookiePolicyPage />} />
                      <Route path="/support" element={<SupportPage />} />
                      <Route path="/feedback" element={<FeedbackPage />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </Suspense>
                </div>
              </main>
              <MobileNav />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
}
