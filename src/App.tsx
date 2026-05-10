/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Home, Target, Zap, Users, Bell, Compass, Clock, Globe, X, LibraryBig, MoreHorizontal, GraduationCap, Settings as SettingsIcon, LogOut, Wallet, HelpCircle, MessageCircleWarning } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import VisionBoard from './components/VisionBoard/VisionBoard';
import Dashboard from './components/Dashboard/Dashboard';
import Squad from './components/Mentors/Squad';
import NovaClock from './components/Nova/NovaClock';
import MindVisualizer from './components/Mind/MindVisualizer';
import Circle from './components/Circle/Circle';
import CommunityFeed from './components/Feed/CommunityFeed';
import PostThreadPage from './components/Feed/PostThreadPage';
import NotesSystem from './components/Notes/NotesSystem';
import OnboardingFlow from './components/Onboarding/OnboardingFlow';
import AuthCallback from './components/Auth/AuthCallback';
import { InteractiveTour } from './components/Onboarding/InteractiveTour';
import VisionAssistant from './components/AI/VisionAssistant';
import FloatingTimer from './components/Dashboard/FloatingTimer';
import UserProfileModal from './components/Social/UserProfileModal';
import NotificationCenter from './components/Social/NotificationCenter';
import ProfilePage from './components/Social/ProfilePage';
import CommunitySpaces from './components/Community/CommunitySpaces';
import ProfileDropdown from './components/ProfileDropdown';
import ToastViewport from './components/ToastViewport';
import { cn } from './lib/utils';
import { useStore } from './store/useStore';
import FocusOverlay from './components/Dashboard/FocusOverlay';
import Settings from './components/Settings/Settings';
import ErrorBoundary from './components/ErrorBoundary';
import CookieNotice from './components/CookieNotice';
import FeedbackPage from './components/Support/FeedbackPage';
import { CookiePolicyPage, PrivacyPolicyPage, SupportPage, TermsPage } from './components/Legal/LegalPages';
import MoneyPage from './components/Money/MoneyPage';
import { supabase } from './lib/supabase';

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
  { icon: Wallet, label: 'Money', path: '/money' },
  { icon: Users, label: 'Circle', path: '/circle' },
  { icon: Clock, label: 'Nova Clock', path: '/nova-clock' },
];

const moreItems: NavItem[] = [
  { icon: Globe, label: 'Communities', path: '/communities' },
  { icon: SettingsIcon, label: 'Settings', path: '/settings' },
  { icon: MessageCircleWarning, label: 'Feedback', path: '/feedback' },
  { icon: HelpCircle, label: 'Help', path: '/support' },
];

const isRouteActive = (pathname: string, path: string) => (
  path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`)
);

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
        .is('read_at', null);

      if (cancelled) return;
      if (unreadError) {
        console.error('Failed to load unread messages:', unreadError);
        setCount(0);
        return;
      }

      setCount(unreadCount || 0);
    };

    loadCount();
    const channelId = `nav-message-badge:${currentUserId || 'guest'}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, loadCount)
      .subscribe();

    return () => {
      cancelled = true;
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
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const openNotifications = () => setIsNotificationsOpen(true);
    window.addEventListener('open-visnova-notifications', openNotifications);
    return () => window.removeEventListener('open-visnova-notifications', openNotifications);
  }, []);

  useEffect(() => {
    const closeMore = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMoreOpen(false);
    };
    if (isMoreOpen) {
      document.addEventListener('mousedown', closeMore);
      document.addEventListener('keydown', closeOnEscape);
    }
    return () => {
      document.removeEventListener('mousedown', closeMore);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMoreOpen]);

  const navItems = mainNavBase.map(item => (
    item.path === '/circle' ? { ...item, badge: unreadMessageCount } : item
  ));
  const moreActive = moreItems.some(item => isRouteActive(location.pathname, item.path));

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
        <div ref={moreRef} className="relative">
          <button
            type="button"
            onClick={() => setIsMoreOpen(open => !open)}
            title={!isExpanded ? 'More' : undefined}
            aria-haspopup="menu"
            aria-expanded={isMoreOpen}
            className={cn(
              'w-full flex items-center h-11 rounded-xl transition-all duration-300 group relative',
              isExpanded ? 'justify-start gap-4 px-3' : 'justify-center px-0',
              moreActive || isMoreOpen
                ? 'bg-accent/5 text-accent font-semibold'
                : 'text-text-secondary hover:text-text-main hover:bg-surface-muted'
            )}
          >
            <MoreHorizontal size={18} className={cn('shrink-0 transition-all duration-500', moreActive || isMoreOpen ? 'text-accent' : '[data-theme=sage]:text-white/70 text-text-secondary/60 group-hover:text-text-main')} />
            <span className={cn(
              "font-semibold text-[10px] uppercase tracking-wider transition-all duration-500 whitespace-nowrap overflow-hidden",
              isExpanded ? "w-auto opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-2",
              moreActive || isMoreOpen ? "text-accent" : "[data-theme=sage]:text-white/80 text-text-secondary"
            )}>
              More
            </span>
            {moreActive && <motion.div layoutId="sidebar-active" className="absolute left-0 w-1 h-8 bg-accent rounded-r-full" />}
          </button>
          <AnimatePresence>
            {isMoreOpen && (
              <motion.div
                initial={{ opacity: 0, x: -8, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -8, scale: 0.98 }}
                role="menu"
                className={cn(
                  "visnova-menu absolute top-0 max-h-[min(22rem,calc(100vh-8rem))] overflow-y-auto custom-scrollbar p-2 z-[120]",
                  isExpanded ? "left-full ml-2 w-64" : "left-[calc(100%+0.5rem)] w-60"
                )}
              >
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const active = isRouteActive(location.pathname, item.path);
                  return (
                    <button
                      key={item.path}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsMoreOpen(false);
                        navigate(item.path);
                      }}
                      className={cn("visnova-menu-item group", active && "visnova-menu-item-active")}
                    >
                      <Icon size={16} className="text-text-secondary/60 group-hover:text-accent transition-colors" />
                      <span className="text-sm font-semibold">{item.label}</span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
          {isExpanded && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                setIsProfileOpen(open => !open);
              }}
              className="mr-2 w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary/50 hover:text-accent hover:bg-accent/5 transition-colors"
              aria-label="Open profile menu"
            >
              <MoreHorizontal size={16} />
            </button>
          )}
          <ProfileDropdown isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        </div>
      </div>
    </aside>

  );
}

function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useStore();
  const unreadMessageCount = useUnreadMessageCount();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const primaryItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Compass, label: 'Feed', path: '/feed' },
    { icon: Target, label: 'Visions', path: '/visions' },
    { icon: LibraryBig, label: 'Library', path: '/library' },
  ];

  const mobileMoreItems = [
    { icon: GraduationCap, label: 'Growth', path: '/growth' },
    { icon: Wallet, label: 'Money', path: '/money' },
    { icon: Users, label: 'Circle', path: '/circle', badge: unreadMessageCount },
    { icon: Clock, label: 'Nova Clock', path: '/nova-clock' },
    { icon: Globe, label: 'Communities', path: '/communities' },
    { icon: SettingsIcon, label: 'Settings', path: '/settings' },
    { icon: MessageCircleWarning, label: 'Feedback', path: '/feedback' },
    { icon: HelpCircle, label: 'Help', path: '/support' },
  ];

  const goTo = (path: string) => {
    setIsMoreOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    await signOut();
    setIsMoreOpen(false);
    navigate('/');
  };

  return (
    <>
      <AnimatePresence>
        {isMoreOpen && (
          <>
            <motion.button
              aria-label="Close menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
              className="fixed inset-0 bg-overlay z-[88] lg:hidden"
            />
            <motion.div
              initial={{ y: 320, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 320, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
              className="fixed inset-x-0 bottom-0 z-[90] lg:hidden bg-card border-t border-card-border rounded-t-[2rem] shadow-2xl px-4 pt-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))]"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-text-secondary/20" />
              <div className="flex items-center gap-3 px-2 pb-4 border-b border-card-border/60">
                <img
                  src={user?.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${user?.id || 'visnova'}`}
                  alt="Profile"
                  className="h-11 w-11 rounded-2xl object-cover border border-card-border"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-text-main truncate">{user?.name || 'Profile'}</p>
                  <p className="text-[11px] font-semibold text-text-secondary/60 truncate">@{user?.username || 'user'}</p>
                </div>
                <button
                  onClick={() => goTo('/profile')}
                  className="h-11 px-4 rounded-xl bg-accent text-accent-contrast text-[11px] font-black uppercase tracking-wider"
                >
                  Profile
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 py-4 max-h-[45dvh] overflow-y-auto custom-scrollbar">
                {mobileMoreItems.map((item) => {
                  const Icon = item.icon;
                  const active = isRouteActive(location.pathname, item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => goTo(item.path)}
                      className={cn(
                        "h-12 rounded-2xl border flex items-center gap-3 px-3 text-left transition-all relative",
                        active ? "bg-accent/10 border-accent/20 text-accent" : "bg-surface-muted border-card-border/50 text-text-secondary"
                      )}
                    >
                      <Icon size={18} />
                      <span className="text-[11px] font-black uppercase tracking-wider truncate">{item.label}</span>
                      {!!item.badge && (
                        <span className="ml-auto min-w-5 h-5 px-1 rounded-full bg-accent text-accent-contrast text-[9px] font-black flex items-center justify-center">
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
                <button
                  onClick={() => goTo('/profile')}
                  className={cn(
                    "h-12 rounded-2xl border flex items-center gap-3 px-3 text-left transition-all",
                    isRouteActive(location.pathname, '/profile') ? "bg-accent/10 border-accent/20 text-accent" : "bg-surface-muted border-card-border/50 text-text-secondary"
                  )}
                >
                  <img
                    src={user?.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${user?.id || 'visnova'}`}
                    alt=""
                    className="h-6 w-6 rounded-lg object-cover border border-card-border"
                  />
                  <span className="text-[11px] font-black uppercase tracking-wider truncate">Profile</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-card-border/60 pt-3">
                <button
                  onClick={() => {
                    window.dispatchEvent(new Event('open-visnova-notifications'));
                    setIsMoreOpen(false);
                  }}
                  className="h-11 rounded-2xl bg-surface-muted text-text-secondary flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-wider"
                >
                  <Bell size={16} /> Alerts
                </button>
                <button
                  onClick={handleLogout}
                  className="h-11 rounded-2xl bg-danger/10 text-danger flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-wider"
                >
                  <LogOut size={16} /> Log out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <nav className="fixed bottom-0 left-0 right-0 min-h-[4.75rem] bg-sidebar/95 backdrop-blur-xl border-t border-card-border lg:hidden grid grid-cols-5 gap-1 px-2 pt-2 pb-[calc(0.55rem+env(safe-area-inset-bottom))] z-[80] transition-colors duration-500">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const active = isRouteActive(location.pathname, item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "min-h-12 rounded-2xl flex flex-col items-center justify-center gap-1 text-[10px] font-black tracking-wide transition-all",
                active ? "text-accent bg-accent/10" : "text-text-secondary/60 active:bg-surface-muted"
              )}
            >
              <Icon size={21} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setIsMoreOpen(true)}
          className={cn(
            "min-h-12 rounded-2xl flex flex-col items-center justify-center gap-1 text-[10px] font-black tracking-wide transition-all",
            isMoreOpen || mobileMoreItems.some(item => isRouteActive(location.pathname, item.path)) || isRouteActive(location.pathname, '/profile') ? "text-accent bg-accent/10" : "text-text-secondary/60 active:bg-surface-muted"
          )}
        >
          <MoreHorizontal size={22} />
          <span>More</span>
        </button>
      </nav>
    </>
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
  '/circle': { title: 'Circle', subtitle: 'Connections, messages, requests, and activity' },
  '/communities': { title: 'Communities', subtitle: 'Threads for builders' },
  '/growth': { title: 'Growth', subtitle: 'Learn with purpose and turn resources into action' },
  '/money': { title: 'Money', subtitle: 'Track spending and fund your Visions' },
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
  const meta = pageContext[location.pathname] || (location.pathname.startsWith('/post/') ? { title: 'Thread', subtitle: 'Post comments' } : null);
  if (!meta) return null;

  return (
    <div className="flex xl:hidden px-4 pt-[calc(0.85rem+env(safe-area-inset-top))] md:pt-4 pb-2 items-center justify-between border-b border-card-border/60 bg-app-container/95">
      <div>
        <h1 className="text-sm md:text-sm font-black uppercase tracking-[0.18em] md:tracking-[0.22em] text-text-main">{meta.title}</h1>
        {meta.subtitle && <p className="hidden sm:block text-[10px] font-semibold text-text-secondary mt-1">{meta.subtitle}</p>}
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
    initializeAuth();
  }, [initializeAuth]);

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
              </AnimatePresence>

              {!tutorialCompleted && hasCompletedOnboarding && !isPasswordRecovery && <InteractiveTour />}
              <Sidebar />
              <FloatingTimer />
              <VisionAssistant />
              <main className="flex-1 min-w-0 lg:pl-16 h-full flex flex-col relative transition-all duration-500 overflow-hidden">
                <PageContextHeader />
                <div className="flex-1 p-3 sm:p-4 lg:p-5 xl:p-6 pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:pb-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Navigate to="/" replace />} />
                    <Route path="/feed" element={<CommunityFeed />} />
                    <Route path="/post/:postId" element={<PostThreadPage />} />
                    <Route path="/visions" element={<VisionBoard />} />
                    <Route path="/vision" element={<Navigate to="/visions" replace />} />
                    <Route path="/circle" element={<Circle />} />
                    <Route path="/communities" element={<CommunitySpaces />} />
                    <Route path="/messages" element={<MessagesRedirect />} />
                    <Route path="/library" element={<NotesSystem />} />
                    <Route path="/notes" element={<NotesRedirect />} />
                    <Route path="/journal" element={<Navigate to="/library?tab=journal" replace />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/profile/:profileId" element={<ProfilePage />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/money" element={<MoneyPage />} />
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
                    <Route path="*" element={<div className="p-20 text-center text-[10px] font-black text-text-secondary opacity-30 uppercase tracking-[0.4em]">Page Not Found</div>} />
                  </Routes>
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
