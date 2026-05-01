/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Target, Zap, Activity, Users, Settings, Plus, Search, Bell, Menu, Compass, Sun, Moon, Palette, Brain, Clock, Globe, X, BookOpen, User, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import VisionBoard from './components/VisionBoard/VisionBoard';
import Dashboard from './components/Dashboard/Dashboard';
import Squad from './components/Mentors/Squad';
import NovaClock from './components/Nova/NovaClock';
import MindVisualizer from './components/Mind/MindVisualizer';
import Circle from './components/Circle/Circle';
import CommunityFeed from './components/Feed/CommunityFeed';
import NotesSystem from './components/Notes/NotesSystem';
import OnboardingFlow from './components/Onboarding/OnboardingFlow';
import { InteractiveTour } from './components/Onboarding/InteractiveTour';
import VisionAssistant from './components/AI/VisionAssistant';
import FloatingTimer from './components/Dashboard/FloatingTimer';
import UserProfileModal from './components/Social/UserProfileModal';
import NotificationCenter from './components/Social/NotificationCenter';
import ProfilePage from './components/Social/ProfilePage';
import ProfileDropdown from './components/ProfileDropdown';
import ToastViewport from './components/ToastViewport';
import { cn } from './lib/utils';
import { useStore } from './store/useStore';
import FocusOverlay from './components/Dashboard/FocusOverlay';
import { auth, db } from './lib/firebase';

function AccountabilityNudge() {
  const [visible, setVisible] = useState(false);
  const { visions } = useStore();

  useEffect(() => {
    // Only show if there's an uncompleted primary task
    const hasUncompleted = (visions || []).some(v =>
      v &&
      v.status === 'in-progress' &&
      v.tasks &&
      Array.isArray(v.tasks) &&
      v.tasks.some(t => t && !t.completed)
    );
    if (hasUncompleted) {
      const timer = setTimeout(() => {
        setVisible(true);
      }, 5000); // Simulate notification appearing after 5 seconds of session
      return () => clearTimeout(timer);
    }
  }, [visions]);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed bottom-24 right-8 lg:bottom-12 z-[200] max-w-sm w-full bg-card border-2 border-accent text-text-main p-6 shadow-2xl shadow-accent/20"
    >
      <button onClick={() => setVisible(false)} className="absolute top-4 right-4 text-text-secondary/50 hover:text-text-main transition-colors">
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
              onClick={() => setVisible(false)}
              className="text-[10px] font-black uppercase tracking-widest text-accent hover:text-accent/80 transition-colors"
            >
              Acknowledge
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Sidebar() {
  const location = useLocation();
  const { toggleFocusMode } = useStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/', id: 'nav-dashboard' },
    { icon: Compass, label: 'Feed', path: '/feed' },
    { icon: Users, label: 'Circle', path: '/circle' },
    { icon: Target, label: 'Visions', path: '/vision', id: 'nav-vision' },
    { icon: BookOpen, label: 'Vault', path: '/notes' },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Clock, label: 'Timeline', path: '/nova' },
    { icon: Activity, label: 'Growth', path: '/mind-map' },
  ];

  return (
    <aside
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className={cn(
        "absolute left-0 top-0 h-full bg-sidebar border-r border-card-border flex flex-col z-50 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden hidden lg:flex",
        isExpanded ? "w-60 shadow-[20px_0_60px_rgba(0,0,0,0.03)]" : "w-16 px-1"
      )}
    >
      <div className="p-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shrink-0 shadow-lg shadow-accent/10">
             <div className="w-1.5 h-1.5 bg-accent-contrast rounded-full animate-pulse" />
          </div>
          <span className={cn(
            "text-base font-display font-semibold tracking-tight text-text-main transition-all duration-500 uppercase",
            isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
          )}>
            Vis<span className="text-accent/30 font-light">nova</span>
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 mt-6 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              id={item.id}
              to={item.path}
              className={cn(
                'flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 group relative',
                isActive
                  ? 'bg-accent/5 text-accent font-semibold'
                  : 'text-text-secondary hover:text-text-main hover:bg-surface-muted'
              )}
            >
              <Icon size={18} className={cn('shrink-0 transition-all duration-500', isActive ? 'text-accent' : 'text-text-secondary/60 group-hover:text-text-main')} />
              <span className={cn(
                "font-semibold text-[10px] uppercase tracking-wider transition-all duration-500 whitespace-nowrap",
                isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
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

        <div className="pt-8 px-1">
          <button
            id="nav-focus"
            onClick={toggleFocusMode}
            className="w-full h-11 rounded-xl bg-accent text-accent-contrast transition-all shadow-lg shadow-accent/10 flex items-center gap-4 overflow-hidden px-3.5 group active:scale-95"
          >
             <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                <Zap size={16} className="fill-accent-contrast" />
             </div>
             <span className={cn(
                "font-semibold text-[10px] uppercase tracking-wider transition-all duration-500 whitespace-nowrap",
                isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
              )}>
                Deep Sprint
              </span>
          </button>
        </div>
      </nav>

      {/* User Section */}
      <div className="p-4 mb-2">
        <Link
          to="/profile?tab=settings"
          className={cn(
            "flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-500 group",
            location.pathname === '/profile' && new URLSearchParams(location.search).get('tab') === 'settings' ? "text-accent bg-accent/5" : "text-text-secondary hover:text-text-main hover:bg-surface-muted"
          )}
        >
          <Settings size={18} className="shrink-0 group-hover:rotate-90 transition-transform duration-700" />
          <span className={cn(
            "text-[10px] font-semibold uppercase tracking-wider transition-all duration-500 whitespace-nowrap",
            isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
          )}>
            Settings
          </span>
        </Link>
      </div>
    </aside>

  );
}

function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, unreadNotificationCount } = useStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const nextLevelXp = (user?.level || 1) * 1000;
  const xpProgress = Math.min(100, ((user?.xp || 0) / nextLevelXp) * 100);

  const getSub = () => {
    if (location.pathname === '/') return 'Dashbord Pulse';
    if (location.pathname === '/vision') return 'Goal Ecosystem';
    if (location.pathname === '/notes') return 'Vault';
    if (location.pathname === '/circle') return 'Circle Pulse';
    if (location.pathname === '/profile') return 'User Identity';
    if (location.pathname === '/nova') return 'Temporal Horizon';
    if (location.pathname === '/mind-map') return 'Strategic Growth';
    return 'Peripheral';
  };

  return (
    <header className="h-20 sticky top-0 bg-app-container/80 backdrop-blur-xl z-40 px-8 flex items-center justify-between border-b border-card-border">
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-wider text-accent">{getSub()}</span>
      </div>

      <div className="flex items-center gap-8">
        <div className="hidden lg:flex items-center relative group w-[360px]">
          <Search size={16} className="absolute left-5 text-text-secondary/50 transition-colors group-focus-within:text-accent" />
          <input
            type="text"
            placeholder="Search Intelligence..."
            className="w-full h-11 pl-12 pr-6 rounded-full bg-card hover:bg-card-elevated border border-card-border/50 shadow-sm text-sm focus:outline-none focus:border-accent/30 focus:shadow-md transition-all font-medium text-text-main placeholder:text-text-secondary/40"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="w-11 h-11 bg-surface-muted border border-card-border rounded-xl flex items-center justify-center text-text-secondary hover:text-text-main transition-all relative group"
            >
              <Bell size={18} />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-accent text-accent-contrast text-[8px] font-black rounded-full flex items-center justify-center border-2 border-app-container animate-in zoom-in duration-300">
                  {unreadNotificationCount}
                </span>
              )}
            </button>
            <NotificationCenter isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
          </div>

          <div className="flex items-center gap-4 pl-8 border-l border-card-border ml-4 relative">
            <div className="text-right hidden xl:flex flex-col items-end gap-1.5">
               <div className="flex items-center gap-2">
                 <p className="text-sm font-semibold text-text-main leading-none">{user?.name}</p>
                 <span className="px-1.5 py-0.5 rounded bg-accent/10 text-accent text-[8px] font-black uppercase">LVL {user?.level}</span>
               </div>
               <div className="w-24 h-1 bg-card-border rounded-full overflow-hidden">
                 <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress}%` }}
                    className="h-full bg-accent rounded-full"
                 />
               </div>
            </div>
            <div className="relative group cursor-pointer" onClick={() => setIsProfileOpen(!isProfileOpen)}>
              <img
                src={user?.avatar || undefined}
                className="w-10 h-10 rounded-xl object-cover border border-card-border shadow-sm transition-transform group-hover:scale-105"
                alt="Avatar"
              />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-app-container shadow-sm outline border-transparent z-10" />
              <ProfileDropdown isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function MobileNav() {
  const location = useLocation();
  return (
    <nav className="absolute bottom-0 left-0 right-0 h-20 bg-sidebar border-t border-card-border lg:hidden flex items-center justify-around px-8 z-50 transition-colors duration-500">
      <Link to="/" className={cn(location.pathname === '/' ? "text-accent" : "text-text-secondary/50")}>
        <Home size={22} />
      </Link>
      <Link to="/feed" className={cn(location.pathname === '/feed' ? "text-accent" : "text-text-secondary/50")}>
        <Compass size={22} />
      </Link>
      <Link to="/vision" className={cn(location.pathname === '/vision' ? "text-accent" : "text-text-secondary/50")}>
        <Target size={22} />
      </Link>
      <Link to="/circle" className={cn(location.pathname === '/circle' ? "text-accent" : "text-text-secondary/50")}>
        <Users size={22} />
      </Link>
      <Link to="/profile" className={cn(location.pathname === '/profile' ? "text-accent" : "text-text-secondary/50")}>
        <User size={22} />
      </Link>
    </nav>
  );
}


export default function App() {
  const { theme, isFocusMode, hasCompletedOnboarding, fetchUser, user, setSession, addToast, tutorialCompleted } = useStore();
  const [isInitializingAuth, setIsInitializingAuth] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const isPasswordRecovery = sessionStorage.getItem('visnova-auth-link-mode') === 'recovery' || new URLSearchParams(window.location.search).get('mode') === 'reset-password';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Handle Session Persistence & Firebase Listener
  useEffect(() => {
    if (authInitialized) return;
    let cancelled = false;
    let isFetching = false;

    // Failsafe timer to guarantee loading screen disappears
    const failSafe = setTimeout(() => {
      if (!cancelled) {
        setIsInitializingAuth(false);
        setAuthInitialized(true);
      }
    }, 3000);

    const safeFetchUser = async (email: string) => {
      if (isFetching || !email) return;
      isFetching = true;
      try {
        await fetchUser(email);
      } finally {
        isFetching = false;
      }
    };

    // 1. Setup Auth Listener
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (cancelled) return;
      
      try {
        if (firebaseUser) {
          // Firebase user confirmed, fetch profile
          if (firebaseUser.email) {
            await safeFetchUser(firebaseUser.email);
          }
          
          if (!authInitialized) {
            addToast({ type: 'success', title: 'Welcome back', description: "We're loading your workspace." });
          }
        } else {
          // No user, reset state or whatever
        }
      } catch (err) {
        console.error('Auth handler error:', err);
      } finally {
        if (!cancelled && !authInitialized) {
           setIsInitializingAuth(false);
           setAuthInitialized(true);
        }
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(failSafe);
      unsubscribe();
    };
  }, [fetchUser, addToast, authInitialized]);

  if (isInitializingAuth) {
    return (
      <div className="h-screen w-screen bg-bg-base flex flex-col items-center justify-center space-y-6">
         <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-accent/10 border-t-accent rounded-full mb-4"
         />
         <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-main opacity-80">VisNova</span>
            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-text-secondary opacity-40">Taking you to your dashbord...</span>
         </div>
      </div>
    );
  }

  return (
    <Router>
      <ToastViewport />
      <AnimatePresence mode="wait">
        {(!hasCompletedOnboarding || isPasswordRecovery) ? (
          <motion.div
            key="onboarding"
            exit={{ opacity: 0, scale: 0.98, filter: 'blur(5px)' }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 z-50 bg-bg-base"
          >
            <Routes>
              <Route path="*" element={<OnboardingFlow />} />
            </Routes>
          </motion.div>
        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0, scale: 1.02, filter: 'blur(5px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="min-h-screen bg-bg-base lg:p-6 flex items-center justify-center font-sans selection:bg-accent selection:text-accent-contrast relative z-0"
          >
           <div className="w-full max-w-[1600px] h-screen lg:h-[94vh] bg-app-container lg:rounded-[2rem] shadow-2xl overflow-hidden relative flex">
            <AnimatePresence>
              {isFocusMode && <FocusOverlay />}
              <AccountabilityNudge />
              <UserProfileModal />
            </AnimatePresence>

            {!tutorialCompleted && hasCompletedOnboarding && !isPasswordRecovery && <InteractiveTour />}
            <Sidebar />
            <FloatingTimer />
            <VisionAssistant />
            <main className="flex-1 lg:pl-16 h-full flex flex-col relative transition-all duration-500 overflow-hidden">
              <Topbar />
              <div className="flex-1 p-6 lg:p-10 overflow-y-auto overflow-x-hidden custom-scrollbar">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/feed" element={<CommunityFeed />} />
                  <Route path="/vision" element={<VisionBoard />} />
                  <Route path="/circle" element={<Circle />} />
                  <Route path="/notes" element={<NotesSystem />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/nova" element={<NovaClock />} />
                  <Route path="/mind-map" element={<MindVisualizer />} />
                  <Route path="*" element={<div className="p-20 text-center text-[10px] font-black text-text-secondary opacity-30 uppercase tracking-[0.4em]">Encypted Path // Access Denied</div>} />
                </Routes>
              </div>
            </main>
            <MobileNav />
           </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Router>
  );
}
