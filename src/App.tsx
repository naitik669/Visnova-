/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Home, Target, Zap, Users, Bell, Compass, Clock, X, LibraryBig, MoreHorizontal, GraduationCap, Wallet, Plus, User, FileText, BookOpen, CheckCircle2, MessageSquare } from 'lucide-react';
import { lazy, Suspense, useId, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './components/Dashboard/Dashboard';
import Squad from './components/Mentors/Squad';
import Circle from './components/Circle/Circle';
import OnboardingFlow from './components/Onboarding/OnboardingFlow';
import AuthCallback from './components/Auth/AuthCallback';
import { InteractiveTour } from './components/Onboarding/InteractiveTour';
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
import {
  AffiliateDisclosurePage,
  CommunityGuidelinesPage,
  ContactPage,
  CookiePolicyPage,
  DataRightsPage,
  PrivacyPolicyPage,
  SupportPage,
  TermsPage,
  TrustIndexPage
} from './components/Legal/LegalPages';
import { isSupabaseConfigured, supabase, supabaseConfigError } from './lib/supabase';
import { trackBetaEvent } from './lib/betaAnalytics';
import { XpToast } from './components/ui/XpToast';
import { VisNovaMotion } from './components/ui/VisNovaMotion';
import { BrandLogo } from './components/BrandLogo';
import { ProgressLogComposer } from './components/Progress/ProgressLogComposer';
import { useCookieConsent } from './hooks/useCookieConsent';
import { identifyAnalyticsUser, resetAnalyticsUser, trackPageView } from './lib/analytics';
import { isLikelyNetworkError, VISNOVA_NETWORK_ERROR_EVENT } from './lib/networkState';

const loadVisionBoard = () => import('./components/VisionBoard/VisionBoard');
const loadNovaClock = () => import('./components/Nova/NovaClock');
const loadMindVisualizer = () => import('./components/Mind/MindVisualizer');
const loadCommunityFeed = () => import('./components/Feed/CommunityFeed');
const loadCircleMomentumPage = () => import('./components/Circle/CircleMomentumPage');
const loadPostThreadPage = () => import('./components/Feed/PostThreadPage');
const loadStoreRedirectPage = () => import('./components/Feed/StoreRedirectPage');
const loadStoreResourcesPage = () => import('./components/Feed/StoreResourcesPage');
const loadNotesSystem = () => import('./components/Notes/NotesSystem');
const loadTasksPage = () => import('./components/Tasks/TasksPage');
const loadProfilePage = () => import('./components/Social/ProfilePage');
const loadSettings = () => import('./components/Settings/Settings');
const loadFeedbackPage = () => import('./components/Support/FeedbackPage');
const loadMoneyPage = () => import('./components/Money/MoneyPage');
const loadJoinVisionTeamPage = () => import('./components/VisionTeam/JoinVisionTeamPage');

const VisionBoard = lazy(loadVisionBoard);
const NovaClock = lazy(loadNovaClock);
const MindVisualizer = lazy(loadMindVisualizer);
const CommunityFeed = lazy(loadCommunityFeed);
const CircleMomentumPage = lazy(loadCircleMomentumPage);
const PostThreadPage = lazy(loadPostThreadPage);
const StoreRedirectPage = lazy(loadStoreRedirectPage);
const StoreResourcesPage = lazy(loadStoreResourcesPage);
const NotesSystem = lazy(loadNotesSystem);
const TasksPage = lazy(loadTasksPage);
const ProfilePage = lazy(loadProfilePage);
const Settings = lazy(loadSettings);
const FeedbackPage = lazy(loadFeedbackPage);
const MoneyPage = lazy(loadMoneyPage);
const JoinVisionTeamPage = lazy(loadJoinVisionTeamPage);

const routePreloaders: Array<{ match: (path: string) => boolean; load: () => Promise<unknown> }> = [
  { match: path => path === '/feed', load: loadCommunityFeed },
  { match: path => path === '/circle/momentum', load: loadCircleMomentumPage },
  { match: path => path.startsWith('/post/'), load: loadPostThreadPage },
  { match: path => path.startsWith('/store/redirect/'), load: loadStoreRedirectPage },
  { match: path => path === '/store' || path === '/resources/store', load: loadStoreResourcesPage },
  { match: path => path === '/visions' || path === '/vision', load: loadVisionBoard },
  { match: path => path.startsWith('/join/vision-team/'), load: loadJoinVisionTeamPage },
  { match: path => path === '/tasks', load: loadTasksPage },
  { match: path => path === '/library' || path === '/notes' || path === '/journal', load: loadNotesSystem },
  { match: path => path === '/profile' || path.startsWith('/profile/'), load: loadProfilePage },
  { match: path => path === '/settings', load: loadSettings },
  { match: path => path === '/feedback', load: loadFeedbackPage },
  { match: path => path === '/wallet' || path === '/money', load: loadMoneyPage },
  { match: path => path === '/nova-clock' || path === '/nova' || path === '/timeline', load: loadNovaClock },
  { match: path => path === '/growth' || path === '/mind-map', load: loadMindVisualizer },
];

const preloadedRoutes = new Set<string>();

function preloadRoute(path: string) {
  const route = routePreloaders.find(item => item.match(path));
  if (!route || preloadedRoutes.has(path)) return;
  preloadedRoutes.add(path);
  route.load().catch(error => {
    preloadedRoutes.delete(path);
    console.error('Route preload failed:', path, error);
  });
}

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
  { icon: Users, label: 'Circle', path: '/circle' },
  { icon: Target, label: 'Visions', path: '/visions', id: 'nav-vision' },
  { icon: CheckCircle2, label: 'Tasks', path: '/tasks' },
  { icon: LibraryBig, label: 'Library', path: '/library' },
  { icon: GraduationCap, label: 'Growth', path: '/growth' },
  { icon: Wallet, label: 'Wallet', path: '/wallet' },
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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/20 shadow-lg shadow-accent/10">
            <div className="h-2 w-2 rounded-full bg-accent" />
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
              onMouseEnter={() => preloadRoute(item.path)}
              onFocus={() => preloadRoute(item.path)}
              onTouchStart={() => preloadRoute(item.path)}
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
          title={!isExpanded ? "Deep Sprint" : undefined}
          aria-label="Deep Sprint"
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
            Deep Sprint
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
              onError={(event) => {
                event.currentTarget.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${user?.id || 'visnova'}`;
              }}
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
  const navigate = useNavigate();
  const unreadMessageCount = useUnreadMessageCount();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const createSheetPanelId = useId();
  const createSheetTitleId = useId();

  const primaryItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Compass, label: 'Feed', path: '/feed' },
    { icon: Users, label: 'Circle', path: '/circle', badge: unreadMessageCount },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  const closeCreate = () => setIsCreateOpen(false);
  const go = (path: string) => {
    closeCreate();
    navigate(path);
  };

  const primaryCreateAction = {
    icon: Zap,
    title: 'Log Progress',
    description: 'Record what moved today and attach it to a Vision.',
    onClick: () => {
      closeCreate();
      setIsProgressOpen(true);
    }
  };

  const createActions = [
    {
      icon: Target,
      title: 'Create Vision',
      description: 'Start a goal.',
      onClick: () => {
        go('/visions');
        window.setTimeout(() => window.dispatchEvent(new Event('visnova-create-vision')), 120);
      }
    },
    {
      icon: CheckCircle2,
      title: 'Add Task',
      description: 'Plan one action.',
      onClick: () => go('/tasks')
    },
    {
      icon: MessageSquare,
      title: 'Post Update',
      description: 'Share a check-in.',
      onClick: () => {
        sessionStorage.setItem('visnova-open-feed-composer', 'update');
        go('/feed');
      }
    },
    {
      icon: BookOpen,
      title: 'Write Journal',
      description: 'Reflect privately.',
      onClick: () => go('/library?tab=journal')
    },
    {
      icon: FileText,
      title: 'Add Note',
      description: 'Capture an idea.',
      onClick: () => go('/library')
    },
    {
      icon: Wallet,
      title: 'Add Resource',
      description: 'Save goal material.',
      onClick: () => go('/wallet')
    }
  ];

  const supportCreateAction = {
    icon: Bell,
    title: 'Help Request',
    description: 'Ask your Circle for support or accountability.',
    onClick: () => {
      sessionStorage.setItem('visnova-open-feed-composer', 'help_request');
      go('/feed');
    }
  };
  const PrimaryCreateIcon = primaryCreateAction.icon;

  useEffect(() => {
    if (!isCreateOpen) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCreate();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isCreateOpen]);

  useEffect(() => {
    closeCreate();
  }, [location.pathname]);

  return (
    <>
      <ProgressLogComposer open={isProgressOpen} onClose={() => setIsProgressOpen(false)} />

      <AnimatePresence>
        {isCreateOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[210] bg-overlay/70 backdrop-blur-sm lg:hidden"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeCreate();
            }}
          >
            <motion.div
              initial={{ y: 42, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 42, opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              id={createSheetPanelId}
              className="absolute bottom-0 left-0 right-0 max-h-[min(82dvh,36rem)] overflow-y-auto overscroll-contain rounded-t-[2rem] border-t border-card-border bg-app-container p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby={createSheetTitleId}
            >
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-card-border" />
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">Create</p>
                  <h2 id={createSheetTitleId} className="mt-1 text-xl font-black tracking-tight text-text-main">What do you need next?</h2>
                </div>
                <button
                  type="button"
                  onClick={closeCreate}
                  className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-2xl bg-card text-text-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 active:bg-surface-muted"
                  aria-label="Close create menu"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={primaryCreateAction.onClick}
                  className="flex min-h-20 w-full items-center gap-3 rounded-[1.7rem] border border-accent bg-accent p-4 text-left text-accent-contrast shadow-lg shadow-accent/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 active:scale-[0.99]"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-contrast/15">
                    <PrimaryCreateIcon size={21} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-black tracking-tight">{primaryCreateAction.title}</span>
                    <span className="mt-0.5 block text-xs font-semibold leading-relaxed text-accent-contrast/75">{primaryCreateAction.description}</span>
                  </span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  {createActions.map(action => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.title}
                        type="button"
                        onClick={action.onClick}
                        className="flex min-h-28 w-full flex-col justify-between rounded-2xl border border-card-border bg-card p-3 text-left text-text-main transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 active:scale-[0.99]"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                          <Icon size={19} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-black leading-tight tracking-tight">{action.title}</span>
                          <span className="mt-1 block text-[11px] font-semibold leading-snug text-text-secondary">{action.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {(() => {
                  const Icon = supportCreateAction.icon;
                  return (
                    <button
                      type="button"
                      onClick={supportCreateAction.onClick}
                      className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-card-border bg-surface-muted/60 p-3 text-left text-text-main transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 active:scale-[0.99]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-card text-accent">
                        <Icon size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black tracking-tight">{supportCreateAction.title}</span>
                        <span className="mt-0.5 block text-xs font-semibold text-text-secondary">{supportCreateAction.description}</span>
                      </span>
                    </button>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 z-[80] grid min-h-[5rem] grid-cols-5 gap-1 border-t border-card-border bg-sidebar/95 px-2 pb-[calc(0.6rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl transition-colors duration-500 lg:hidden">
        {primaryItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const active = isRouteActive(location.pathname, item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onMouseEnter={() => preloadRoute(item.path)}
              onFocus={() => preloadRoute(item.path)}
              onTouchStart={() => preloadRoute(item.path)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                "relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black tracking-wide transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25",
                active ? "text-accent bg-accent/10" : "text-text-secondary/60 active:bg-surface-muted"
              )}
            >
              <Icon size={21} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="relative -mt-5 mx-auto flex h-16 w-16 flex-col items-center justify-center rounded-[1.4rem] bg-accent text-accent-contrast shadow-xl shadow-accent/25 ring-4 ring-app-container transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/30 active:scale-95"
          aria-label="Create"
          aria-expanded={isCreateOpen}
          aria-controls={isCreateOpen ? createSheetPanelId : undefined}
        >
          <Plus size={26} strokeWidth={2.8} />
          <span className="mt-0.5 text-[8px] font-black uppercase tracking-widest">Create</span>
        </button>

        {primaryItems.slice(2).map((item) => {
          const Icon = item.icon;
          const active = isRouteActive(location.pathname, item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onMouseEnter={() => preloadRoute(item.path)}
              onFocus={() => preloadRoute(item.path)}
              onTouchStart={() => preloadRoute(item.path)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                "relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black tracking-wide transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25",
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
    </>
  );
}

const pageContext: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Your daily progress space' },
  '/feed': { title: 'Feed', subtitle: 'Share progress and support others' },
  '/visions': { title: 'Visions', subtitle: 'Plan goals and move tasks forward' },
  '/vision': { title: 'Visions', subtitle: 'Plan goals and move tasks forward' },
  '/tasks': { title: 'Tasks', subtitle: 'Plan next moves and turn them into proof' },
  '/library': { title: 'Library', subtitle: 'Notes, audio, and journal' },
  '/notes': { title: 'Library', subtitle: 'Notes, audio, and journal' },
  '/journal': { title: 'Library', subtitle: 'Notes, audio, and journal' },
  '/circle': { title: 'Circle', subtitle: 'Messages, connections, communities, requests, and activity' },
  '/circle/momentum': { title: 'Circle Momentum', subtitle: 'Friendly progress across your accountability circle' },
  '/communities': { title: 'Circle', subtitle: 'Messages, connections, communities, requests, and activity' },
  '/growth': { title: 'Growth', subtitle: 'Learn with purpose and turn resources into action' },
  '/money': { title: 'Wallet', subtitle: 'Track spending, subscriptions, and savings for your Visions' },
  '/wallet': { title: 'Wallet', subtitle: 'Track spending, subscriptions, and savings for your Visions' },
  '/nova-clock': { title: 'Nova Clock', subtitle: 'NovaCapsules for your future self' },
  '/settings': { title: 'Settings', subtitle: 'Manage your workspace' },
  '/profile': { title: 'Profile', subtitle: 'Your public progress page' },
  '/privacy': { title: 'Privacy', subtitle: 'How VisNova handles data' },
  '/privacy-policy': { title: 'Privacy', subtitle: 'How VisNova handles data' },
  '/terms': { title: 'Terms', subtitle: 'Rules for using VisNova' },
  '/terms-of-service': { title: 'Terms', subtitle: 'Rules for using VisNova' },
  '/cookies': { title: 'Cookies', subtitle: 'Browser storage and cookies' },
  '/cookie-policy': { title: 'Cookie Policy', subtitle: 'Browser storage and optional tracking choices' },
  '/affiliate-disclosure': { title: 'Affiliate Disclosure', subtitle: 'Resource and partner link transparency' },
  '/data-rights': { title: 'Data Rights', subtitle: 'Export, deletion, and privacy requests' },
  '/community-guidelines': { title: 'Guidelines', subtitle: 'Healthy accountability and community rules' },
  '/contact': { title: 'Contact', subtitle: 'Support, privacy, and account help' },
  '/trust': { title: 'Trust Center', subtitle: 'Legal and privacy pages' },
  '/support': { title: 'Support', subtitle: 'Legal, account, and help requests' },
  '/feedback': { title: 'Feedback', subtitle: 'Report bugs and beta feedback' },
  '/store': { title: 'Resources', subtitle: 'Useful tools for your current Vision' },
  '/resources/store': { title: 'Resources', subtitle: 'Useful tools for your current Vision' },
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
        animate={{ rotate: 360, scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20"
      >
        <div className="h-2 w-2 animate-ping rounded-full bg-accent" />
      </motion.div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary/50">Loading workspace</p>
    </div>
  );
}

function SupabaseConfigScreen() {
  return (
    <div className="flex min-h-[100dvh] w-screen items-center justify-center bg-bg-base p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
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
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col items-center justify-center gap-4 p-6 pb-[calc(6rem+env(safe-area-inset-bottom))] text-center sm:p-8 sm:pb-8">
      <VisNovaMotion variant="notFound" className="max-w-2xl" />
      <h2 className="text-2xl font-black tracking-tight text-text-main">Lost in the Vision space?</h2>
      <p className="max-w-xs text-sm font-semibold text-text-secondary">Let's get you back.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          onClick={() => navigate('/')}
          className="rounded-2xl bg-accent px-6 py-3 text-xs font-black uppercase tracking-widest text-accent-contrast transition-opacity hover:opacity-90"
        >
          Go to Dashboard
        </button>
        <button
          onClick={() => window.location.reload()}
          className="rounded-2xl border border-card-border bg-card px-6 py-3 text-xs font-black uppercase tracking-widest text-text-secondary transition-colors hover:text-accent"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

function useBrowserOnline() {
  const [isBrowserOnline, setIsBrowserOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [hasNetworkIssue, setHasNetworkIssue] = useState(false);

  useEffect(() => {
    const updateOnlineStatus = () => {
      const nextOnline = navigator.onLine;
      setIsBrowserOnline(nextOnline);
      if (nextOnline) setHasNetworkIssue(false);
    };
    const showNetworkIssue = () => setHasNetworkIssue(true);
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isLikelyNetworkError(event.reason)) showNetworkIssue();
    };
    const handleWindowError = (event: ErrorEvent) => {
      if (isLikelyNetworkError(event.error) || isLikelyNetworkError(event.message)) showNetworkIssue();
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    window.addEventListener(VISNOVA_NETWORK_ERROR_EVENT, showNetworkIssue);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleWindowError);
    updateOnlineStatus();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener(VISNOVA_NETWORK_ERROR_EVENT, showNetworkIssue);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleWindowError);
    };
  }, []);

  return { isOnline: isBrowserOnline && !hasNetworkIssue, hasNetworkIssue };
}

function useIsMobileViewport() {
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const updateViewport = () => setIsMobileViewport(media.matches);
    updateViewport();
    media.addEventListener('change', updateViewport);
    return () => media.removeEventListener('change', updateViewport);
  }, []);

  return isMobileViewport;
}

function OfflinePage({ hasNetworkIssue = false }: { hasNetworkIssue?: boolean }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-[100dvh] w-screen bg-bg-base px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] text-center text-text-main">
      <div className="mx-auto flex min-h-[calc(100dvh_-_2.5rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] w-full max-w-5xl flex-col items-center justify-center">
        <VisNovaMotion variant="error" size="lg" className="w-full max-w-3xl" ariaLabel="Connection interrupted animation" />
        <div className="mt-[-1rem] flex w-full max-w-xl flex-col items-center gap-3 pb-[env(safe-area-inset-bottom)]">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Something didn't load right.</h1>
          <p className="text-sm font-semibold leading-6 text-text-secondary sm:text-base">
            {hasNetworkIssue
              ? 'Your connection dropped while VisNova was syncing. Check your internet, then try again.'
              : 'You are offline. Check your internet connection, then try again.'}
          </p>
          <div className="mt-5 grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              onClick={() => window.location.reload()}
              className="min-h-11 rounded-2xl bg-accent px-6 py-3 text-xs font-black uppercase tracking-widest text-accent-contrast transition-opacity hover:opacity-90"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="min-h-11 rounded-2xl border border-card-border bg-card px-6 py-3 text-xs font-black uppercase tracking-widest text-text-secondary transition-colors hover:text-accent"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
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
  const { isOnline, hasNetworkIssue } = useBrowserOnline();
  const isMobileViewport = useIsMobileViewport();
  const { canUseAnalytics } = useCookieConsent();
  const theme = useStore(state => state.theme);
  const isFocusMode = useStore(state => state.isFocusMode);
  const hasCompletedOnboarding = useStore(state => state.hasCompletedOnboarding);
  const profile = useStore(state => state.profile);
  const authLoading = useStore(state => state.authLoading);
  const isProfileReady = useStore(state => state.isProfileReady);
  const isAuthInitialized = useStore(state => state.isAuthInitialized);
  const initializeAuth = useStore(state => state.initializeAuth);
  const tutorialCompleted = useStore(state => state.tutorialCompleted);
  const session = useStore(state => state.session);
  const signOut = useStore(state => state.signOut);
  const toasts = useStore(state => state.toasts);
  const removeToast = useStore(state => state.removeToast);
  const [profileWaitTimedOut, setProfileWaitTimedOut] = useState(false);
  const location = useLocation();
  const isLibraryRoute = location.pathname === '/library' || location.pathname === '/notes' || location.pathname === '/journal';
  
  const isPasswordRecovery = sessionStorage.getItem('visnova-auth-link-mode') === 'recovery' || new URLSearchParams(window.location.search).get('mode') === 'reset-password';
  const isAuthCallbackPath = location.pathname === '/auth/callback';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!isOnline || !canUseAnalytics) return;
    trackPageView(location.pathname);
  }, [canUseAnalytics, isOnline, location.pathname]);

  useEffect(() => {
    if (!isOnline || !canUseAnalytics) {
      resetAnalyticsUser();
      return;
    }

    if (!session?.user?.id) {
      resetAnalyticsUser();
      return;
    }

    identifyAnalyticsUser(session.user.id, {
      role: profile?.role,
      onboarding_completed: hasCompletedOnboarding,
      theme
    });
  }, [
    canUseAnalytics,
    hasCompletedOnboarding,
    isOnline,
    profile?.role,
    session?.user?.id,
    theme
  ]);

  useEffect(() => {
    if (isOnline || !toasts.length) return;
    toasts.forEach((toast) => removeToast(toast.id));
  }, [isOnline, removeToast, toasts]);

  // Auth Initialization
  useEffect(() => {
    if (isOnline && isSupabaseConfigured()) initializeAuth();
  }, [initializeAuth, isOnline]);

  useEffect(() => {
    if (!session || isProfileReady || profile) {
      setProfileWaitTimedOut(false);
      return;
    }

    const timer = window.setTimeout(() => setProfileWaitTimedOut(true), 15000);
    return () => window.clearTimeout(timer);
  }, [isProfileReady, profile, session]);

  useEffect(() => {
    if (!isOnline || !session?.user?.id || !isSupabaseConfigured()) return;
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
  }, [isOnline, session?.user?.id]);

  useEffect(() => {
    if (!isOnline || !session?.user?.id || !hasCompletedOnboarding || !isProfileReady || isPasswordRecovery || isAuthCallbackPath) return;

    const commonRoutes = isMobileViewport
      ? ['/feed', '/circle']
      : ['/feed', '/circle', '/visions', '/library'];
    const secondaryRoutes = isMobileViewport
      ? ['/profile', '/settings']
      : ['/growth', '/wallet', '/nova-clock', '/profile', '/settings', '/feedback'];

    const commonRouteTimer = window.setTimeout(() => {
      commonRoutes.forEach(preloadRoute);
    }, isMobileViewport ? 900 : 350);

    const secondaryRouteTimer = window.setTimeout(() => {
      secondaryRoutes.forEach(preloadRoute);
    }, isMobileViewport ? 2600 : 1600);

    return () => {
      window.clearTimeout(commonRouteTimer);
      window.clearTimeout(secondaryRouteTimer);
    };
  }, [isOnline, session?.user?.id, hasCompletedOnboarding, isProfileReady, isPasswordRecovery, isAuthCallbackPath, isMobileViewport]);

  if (!isSupabaseConfigured()) {
    return <SupabaseConfigScreen />;
  }

  if (!isOnline) {
    return <OfflinePage hasNetworkIssue={hasNetworkIssue} />;
  }

  if (authLoading && !isAuthInitialized && !isAuthCallbackPath) {
    return (
      <div className="flex min-h-[100dvh] w-screen flex-col items-center justify-center space-y-6 bg-bg-base px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] text-center">
         <VisNovaMotion variant="progressLoader" className="max-w-xs" />
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
      <div className="flex min-h-[100dvh] w-screen flex-col items-center justify-center space-y-6 bg-bg-base px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] text-center">
         <VisNovaMotion variant={profileWaitTimedOut ? 'error' : 'progressLoader'} className="max-w-xs" />
         <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-main opacity-80">Loading</span>
            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-text-secondary opacity-40">Loading your profile data...</span>
            {profileWaitTimedOut && (
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => initializeAuth()}
                  className="rounded-2xl bg-accent px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-accent/20"
                >
                  Retry
                </button>
                <button
                  onClick={() => signOut()}
                  className="rounded-2xl border border-card-border bg-card px-5 py-3 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-accent"
                >
                  Sign out
                </button>
              </div>
            )}
         </div>
      </div>
    );
  }

  const showOnboarding = !session || (isProfileReady && !hasCompletedOnboarding) || isPasswordRecovery;
  const isPublicLegalPath = [
    '/privacy',
    '/privacy-policy',
    '/terms',
    '/terms-of-service',
    '/cookies',
    '/cookie-policy',
    '/affiliate-disclosure',
    '/data-rights',
    '/community-guidelines',
    '/contact',
    '/trust',
    '/support'
  ].includes(location.pathname);
  const isJoinVisionTeamPath = location.pathname.startsWith('/join/vision-team/');

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
        ) : isJoinVisionTeamPath ? (
          <motion.div
            key="join-vision-team"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98, filter: 'blur(5px)' }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="min-h-screen bg-bg-base overflow-y-auto"
          >
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/join/vision-team/:token" element={<JoinVisionTeamPage />} />
              </Routes>
            </Suspense>
          </motion.div>
        ) : isPublicLegalPath ? (
          <motion.div
            key="public-legal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98, filter: 'blur(5px)' }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="min-h-screen bg-bg-base p-5 sm:p-8 overflow-y-auto"
          >
            <Routes>
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/terms-of-service" element={<TermsPage />} />
              <Route path="/cookies" element={<CookiePolicyPage />} />
              <Route path="/cookie-policy" element={<CookiePolicyPage />} />
              <Route path="/affiliate-disclosure" element={<AffiliateDisclosurePage />} />
              <Route path="/data-rights" element={<DataRightsPage />} />
              <Route path="/community-guidelines" element={<CommunityGuidelinesPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/trust" element={<TrustIndexPage />} />
              <Route path="/support" element={<SupportPage />} />
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
              <main className="flex-1 min-w-0 lg:pl-16 h-full flex flex-col relative transition-all duration-500 overflow-hidden">
                <PageContextHeader />
                <div
                  className={cn(
                    "flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar",
                    isLibraryRoute
                      ? "p-0 pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:pb-0"
                      : "p-3 sm:p-4 lg:p-5 xl:p-6 pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:pb-6"
                  )}
                >
                  <Suspense fallback={<RouteFallback />}>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/dashboard" element={<Navigate to="/" replace />} />
                      <Route path="/feed" element={<CommunityFeed />} />
                      <Route path="/post/:postId" element={<PostThreadPage />} />
                      <Route path="/store" element={<StoreResourcesPage />} />
                      <Route path="/resources/store" element={<StoreResourcesPage />} />
                      <Route path="/store/redirect/:productId" element={<StoreRedirectPage />} />
                      <Route path="/visions" element={<VisionBoard />} />
                      <Route path="/join/vision-team/:token" element={<JoinVisionTeamPage />} />
                      <Route path="/vision" element={<Navigate to="/visions" replace />} />
                      <Route path="/tasks" element={<TasksPage />} />
                      <Route path="/circle/momentum" element={<CircleMomentumPage />} />
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
                      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                      <Route path="/terms" element={<TermsPage />} />
                      <Route path="/terms-of-service" element={<TermsPage />} />
                      <Route path="/cookies" element={<CookiePolicyPage />} />
                      <Route path="/cookie-policy" element={<CookiePolicyPage />} />
                      <Route path="/affiliate-disclosure" element={<AffiliateDisclosurePage />} />
                      <Route path="/data-rights" element={<DataRightsPage />} />
                      <Route path="/community-guidelines" element={<CommunityGuidelinesPage />} />
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="/trust" element={<TrustIndexPage />} />
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
