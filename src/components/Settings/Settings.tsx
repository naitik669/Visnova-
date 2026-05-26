import { motion } from 'motion/react';
import {
  Sun,
  Moon,
  Palette,
  Shield,
  User,
  Bell,
  Globe,
  Check,
  X,
  Camera,
  Sparkles,
  Zap,
  Key,
  Lock,
  LogOut,
  Monitor,
  RotateCcw,
  Settings as SettingsIcon,
  Cookie
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import {
  defaultAppPreferences,
  defaultNotificationPreferences,
  getAppPreferences,
  getVisibilityLabel,
  getNotificationPreferences,
  playInteractionSound,
  setAppPreferences,
  setNotificationPreferences
} from '../../lib/appPreferences';
import { SelectMenu } from '../ui/SelectMenu';
import { CookiePreferencesModal } from '../Legal/CookiePreferencesModal';
import { useCookieConsent } from '../../hooks/useCookieConsent';
import { VISNOVA_PROFILE_AVATARS } from '../../lib/avatarLibrary';
import { CURRENCY_OPTIONS } from '../../lib/currency';
import { ProfileRoleSelect } from '../ProfileRoleSelect';
import { VisNovaMotion } from '../ui/VisNovaMotion';

type SettingsSection = 'profile' | 'themes' | 'notifications' | 'preferences' | 'privacy';

const themes = [
  { id: 'light', icon: Sun, label: 'Light', desc: 'High contrast clarity', color: 'bg-card text-text-main', preview: { bg: '#f8f5f1', card: '#ffffff', accent: '#111827', text: '#1f2937', muted: '#e7e2da' } },
  { id: 'ember', icon: Zap, label: 'Ember', desc: 'Clean light orange accent', color: 'bg-[#fb5a12] text-white', preview: { bg: '#f6f4f1', card: '#ffffff', accent: '#fb5a12', text: '#1f130c', muted: '#f3f0eb' } },
  { id: 'dark', icon: Moon, label: 'Dark', desc: 'Optimized for deep work', color: 'bg-[#18191C] text-[#fafaf9]', preview: { bg: '#101114', card: '#18191c', accent: '#818cf8', text: '#fafaf9', muted: '#292b31' } },
  { id: 'midnight', icon: Moon, label: 'Midnight', desc: 'Deep navy focus', color: 'bg-[#0f172a] text-[#38bdf8]', preview: { bg: '#07111f', card: '#0f172a', accent: '#38bdf8', text: '#dbeafe', muted: '#1e293b' } },
  { id: 'graphite', icon: Palette, label: 'Graphite', desc: 'Neutral dark workspace', color: 'bg-[#262626] text-[#fafaf9]', preview: { bg: '#171717', card: '#262626', accent: '#f5f5f4', text: '#fafaf9', muted: '#404040' } },
  { id: 'forest-dark', icon: Sparkles, label: 'Forest', desc: 'Dark green calm', color: 'bg-[#102719] text-[#86efac]', preview: { bg: '#07150d', card: '#102719', accent: '#86efac', text: '#dcfce7', muted: '#1c3b28' } },
  { id: 'plum-dark', icon: Palette, label: 'Plum', desc: 'Soft creative mode', color: 'bg-[#2f173d] text-[#f0abfc]', preview: { bg: '#1d1026', card: '#2f173d', accent: '#f0abfc', text: '#fae8ff', muted: '#4a255f' } },
  { id: 'flare', icon: Zap, label: 'Flare', desc: 'Dark orange focus', color: 'bg-[#2a1810] text-[#fb5a12]', preview: { bg: '#140b07', card: '#2a1810', accent: '#fb5a12', text: '#fff7ed', muted: '#4a2716' } },
  { id: 'green', icon: Sparkles, label: 'Green', desc: 'Organic growth focus', color: 'bg-[#4ade80] text-[#064e3b]', preview: { bg: '#edfdf3', card: '#ffffff', accent: '#4ade80', text: '#064e3b', muted: '#bbf7d0' } },
  { id: 'yellow', icon: Zap, label: 'Yellow', desc: 'Optimistic energy', color: 'bg-[#eab308] text-[#422006]', preview: { bg: '#fff8db', card: '#fffdf2', accent: '#eab308', text: '#422006', muted: '#fde68a' } },
  { id: 'pastel', icon: Palette, label: 'Pastel', desc: 'Creative soft mood', color: 'bg-[#5D4361] text-[#FFF7F0]', preview: { bg: '#f3edf4', card: '#fff7f0', accent: '#5d4361', text: '#2f2033', muted: '#ded0df' } },
  { id: 'sage', icon: Sparkles, label: 'Sage', desc: 'Natural and focused', color: 'bg-[#8da482] text-white', preview: { bg: '#f2f5ef', card: '#ffffff', accent: '#8da482', text: '#263326', muted: '#dbe4d4' } },
] as const;

export default function Settings() {
  const { theme, setTheme, user, updateUser, restartTutorial, signOut, addToast, fetchAccountabilityPreferences, updateAccountabilityPreferences } = useStore();
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [editData, setEditData] = useState({
    name: user.name,
    username: user.username || '',
    bio: user.bio || '',
    role: user.role || user.rank || '',
    avatar: user.avatar
  });
  const [notificationPrefs, setNotificationPrefsState] = useState(getNotificationPreferences);
  const [preferencePrefs, setPreferencePrefsState] = useState(getAppPreferences);
  const {
    consent,
    preferencesOpen,
    openPreferences,
    closePreferences,
    canUseAnalytics,
    canUsePersonalization,
    canUseResourceRecommendations
  } = useCookieConsent();

  const updateNotificationPrefs = (next: typeof notificationPrefs) => {
    setNotificationPrefsState(next);
    setNotificationPreferences(next);
    playInteractionSound('click');
  };

  const updatePreferencePrefs = (next: typeof preferencePrefs) => {
    const shouldSyncAccountability =
      next.circleMomentumVisibility !== preferencePrefs.circleMomentumVisibility ||
      next.circleMomentumDetail !== preferencePrefs.circleMomentumDetail;
    setPreferencePrefsState(next);
    setAppPreferences(next);
    if (shouldSyncAccountability) {
      updateAccountabilityPreferences({
        showInCircleMomentum: next.circleMomentumVisibility !== 'hidden',
        momentumVisibility: next.circleMomentumVisibility,
        momentumDetailLevel: next.circleMomentumDetail === 'counts' ? 'counts' : 'score_only'
      }).catch(error => console.error('Failed to sync accountability preferences:', error));
    }
    playInteractionSound('click');
  };

  useEffect(() => {
    fetchAccountabilityPreferences().catch(error => console.error('Failed to load accountability settings:', error));
  }, [fetchAccountabilityPreferences]);

  useEffect(() => {
    setEditData({
      name: user.name,
      username: user.username || '',
      bio: user.bio || '',
      role: user.role || user.rank || '',
      avatar: user.avatar
    });
  }, [user.avatar, user.bio, user.name, user.rank, user.role, user.username]);

  const sections = useMemo(() => [
    { id: 'profile' as const, icon: User, label: 'Profile', desc: 'Identity and public profile' },
    { id: 'themes' as const, icon: Palette, label: 'Themes', desc: 'Visual appearance' },
    { id: 'notifications' as const, icon: Bell, label: 'Notifications', desc: 'Alerts and reminders' },
    { id: 'preferences' as const, icon: SettingsIcon, label: 'Preferences', desc: 'Defaults and beta tools' },
    { id: 'privacy' as const, icon: Shield, label: 'Privacy & Security', desc: 'Access, sharing, cookies' },
  ], []);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    await updateUser(editData);
    setIsSavingProfile(false);
  };

  const handlePasswordUpdate = async () => {
    if (password.length < 8) {
      addToast({ type: 'error', title: 'Password too short', description: 'Use at least 8 characters.' });
      return;
    }
    if (password !== confirmPassword) {
      addToast({ type: 'error', title: 'Passwords do not match', description: 'Confirm the same password.' });
      return;
    }
    setIsUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsUpdatingPassword(false);
    if (error) {
      addToast({ type: 'error', title: 'Password failed', description: error.message });
      return;
    }
    setPassword('');
    setConfirmPassword('');
    addToast({ type: 'success', title: 'Password updated', description: 'Use your new password next time you sign in.' });
  };

  const handleResetLocalPrefs = () => {
    localStorage.removeItem('visnova-notification-settings');
    localStorage.removeItem('visnova-preference-settings');
    setNotificationPrefsState(defaultNotificationPreferences);
    setPreferencePrefsState(defaultAppPreferences);
    setNotificationPreferences(defaultNotificationPreferences);
    setAppPreferences(defaultAppPreferences);
    addToast({ type: 'success', title: 'Preferences reset', description: 'Local settings were restored to defaults.' });
  };

  const requestBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      addToast({ type: 'info', title: 'Not supported', description: 'This browser does not support notification permission.' });
      return;
    }
    const permission = await Notification.requestPermission();
    addToast({
      type: permission === 'granted' ? 'success' : 'info',
      title: permission === 'granted' ? 'Notifications enabled' : 'Notifications not enabled',
      description: permission === 'granted' ? 'Browser permission is ready for future reminders.' : 'You can allow notifications from browser settings later.'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-7xl space-y-8 pb-32 pt-6"
    >
      <section className="px-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-accent">Settings</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-text-main">Account Controls</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-text-secondary">
              Manage your profile, theme, notifications, privacy, security, and beta preferences.
            </p>
          </div>
          <div className="rounded-2xl border border-card-border bg-card px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-secondary/55">
            VisNova Beta Settings
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 px-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="system-card h-fit bg-card p-3">
          <div className="space-y-1">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all',
                  activeSection === section.id ? 'bg-accent text-accent-contrast shadow-lg shadow-accent/10' : 'text-text-secondary hover:bg-surface-muted hover:text-text-main'
                )}
              >
                <section.icon size={18} />
                <span className="min-w-0">
                  <span className="block text-xs font-black uppercase tracking-widest">{section.label}</span>
                  <span className={cn('block text-[10px] font-semibold', activeSection === section.id ? 'text-accent-contrast/70' : 'text-text-secondary/55')}>{section.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main className="min-w-0">
          {activeSection === 'profile' && (
            <SettingsPanel title="Profile" subtitle="Your public identity across VisNova.">
              <div className="flex flex-col gap-8 lg:flex-row">
                <div className="shrink-0">
                  <div className="relative">
                    <img src={editData.avatar} className="h-32 w-32 rounded-3xl border-4 border-card-border object-cover shadow-xl" alt="Profile" />
                    <div className="absolute -bottom-3 -right-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-contrast shadow-lg">
                      <Camera size={18} />
                    </div>
                  </div>
                  <p className="mt-4 max-w-44 text-[10px] font-bold uppercase tracking-widest text-text-secondary/45">
                    Choose from VisNova's profile library or upload from Profile.
                  </p>
                  <div className="mt-4 grid max-w-44 grid-cols-4 gap-2">
                    {VISNOVA_PROFILE_AVATARS.map(avatarUrl => (
                      <button
                        key={avatarUrl}
                        type="button"
                        onClick={() => setEditData(data => ({ ...data, avatar: avatarUrl }))}
                        className={cn(
                          'aspect-square overflow-hidden rounded-xl border-2 bg-surface-muted transition-all hover:scale-105',
                          editData.avatar === avatarUrl ? 'border-accent ring-2 ring-accent/20' : 'border-card-border opacity-70 hover:opacity-100'
                        )}
                        aria-label="Choose VisNova profile avatar"
                      >
                        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2">
                  <SettingsField label="Display name">
                    <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} className="settings-input" />
                  </SettingsField>
                  <SettingsField label="Role title">
                    <ProfileRoleSelect value={editData.role} onChange={role => setEditData({ ...editData, role })} />
                  </SettingsField>
                  <SettingsField label="Username">
                    <input value={editData.username} onChange={e => setEditData({ ...editData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} className="settings-input" />
                  </SettingsField>
                  <div className="md:col-span-2">
                    <SettingsField label="Bio">
                      <textarea value={editData.bio} onChange={e => setEditData({ ...editData, bio: e.target.value })} className="settings-input min-h-28 resize-none py-3" />
                    </SettingsField>
                  </div>
                  <div className="md:col-span-2">
                    <button onClick={handleSaveProfile} disabled={isSavingProfile} className="h-12 rounded-2xl bg-accent px-6 text-[10px] font-black uppercase tracking-widest text-accent-contrast disabled:opacity-50">
                      {isSavingProfile ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </div>
              </div>
            </SettingsPanel>
          )}

          {activeSection === 'themes' && (
            <SettingsPanel title="Themes" subtitle="Choose the mood of your workspace.">
              <div className="mb-5 grid gap-5 rounded-[2rem] border border-card-border bg-card p-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-accent">Theme Studio</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-text-main">Make VisNova yours.</h3>
                  <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-text-secondary">
                    Switch themes anytime. Your workspace keeps the same structure while the mood adapts to how you like to build.
                  </p>
                </div>
                <VisNovaMotion variant="theme" className="max-w-[220px]" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {themes.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setTheme(item.id);
                      playInteractionSound('click');
                    }}
                    style={{
                      '--theme-preview-bg': item.preview.bg,
                      '--theme-preview-card': item.preview.card,
                      '--theme-preview-accent': item.preview.accent,
                      '--theme-preview-text': item.preview.text,
                      '--theme-preview-muted': item.preview.muted
                    } as CSSProperties}
                    className={cn(
                      'group relative min-h-52 overflow-hidden rounded-3xl border-2 p-0 text-left transition-all duration-500',
                      theme === item.id ? 'border-accent shadow-2xl shadow-accent/10' : 'border-card-border bg-card opacity-80 hover:opacity-100 hover:border-accent/30'
                    )}
                  >
                    {theme === item.id && (
                      <motion.div
                        layoutId="active-theme-card"
                        className="absolute inset-0 z-0 rounded-[1.35rem] border-2 border-accent bg-accent/5"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    )}
                    <div className="absolute inset-0 z-0 bg-mesh opacity-10 transition-opacity duration-500 group-hover:opacity-30" />
                    <div
                      className="absolute inset-0 z-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      style={{
                        background: `linear-gradient(145deg, ${item.preview.bg}, ${item.preview.card} 48%, ${item.preview.muted})`
                      }}
                    />

                    <div className="relative z-10 flex min-h-52 flex-col justify-between p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl shadow-xl transition-transform duration-500 group-hover:rotate-12 group-hover:scale-105', item.color)}>
                          <item.icon size={26} />
                        </div>
                        {theme === item.id && (
                          <motion.span layoutId="active-theme-pill" className="rounded-full bg-accent px-3 py-1 text-[9px] font-black uppercase tracking-widest text-accent-contrast">
                            Active
                          </motion.span>
                        )}
                      </div>

                      <div className="pointer-events-none absolute right-5 top-20 w-24 rounded-2xl border border-white/20 p-2 opacity-70 shadow-xl transition-all duration-500 group-hover:translate-y-1 group-hover:opacity-100" style={{ backgroundColor: item.preview.card }}>
                        <div className="mb-2 h-2 w-10 rounded-full" style={{ backgroundColor: item.preview.accent }} />
                        <div className="mb-1 h-1.5 w-16 rounded-full" style={{ backgroundColor: item.preview.muted }} />
                        <div className="h-1.5 w-12 rounded-full" style={{ backgroundColor: item.preview.muted }} />
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xs font-black uppercase tracking-[0.22em] text-text-main transition-colors duration-500 group-hover:text-[var(--theme-preview-text)]">{item.label}</h3>
                        <p className="max-w-[13rem] text-sm font-semibold leading-snug text-text-secondary transition-colors duration-500 group-hover:text-[color-mix(in_srgb,var(--theme-preview-text)_76%,transparent)]">{item.desc}</p>
                        <div className="flex gap-2 pt-2">
                          <span className="h-2.5 w-8 rounded-full transition-transform duration-500 group-hover:scale-x-125" style={{ backgroundColor: item.preview.accent }} />
                          <span className="h-2.5 w-5 rounded-full" style={{ backgroundColor: item.preview.muted }} />
                          <span className="h-2.5 w-5 rounded-full" style={{ backgroundColor: item.preview.card, border: `1px solid ${item.preview.muted}` }} />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </SettingsPanel>
          )}

          {activeSection === 'notifications' && (
            <SettingsPanel title="Notifications" subtitle="Control product, social, and reminder signals on this browser.">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <ToggleRow label="Product updates" desc="Beta changes, important notices." checked={notificationPrefs.product} onChange={value => updateNotificationPrefs({ ...notificationPrefs, product: value })} />
                <ToggleRow label="Social activity" desc="Follows, messages, comments." checked={notificationPrefs.social} onChange={value => updateNotificationPrefs({ ...notificationPrefs, social: value })} />
                <ToggleRow label="Vision reminders" desc="Gentle nudges for tasks and habits." checked={notificationPrefs.reminders} onChange={value => updateNotificationPrefs({ ...notificationPrefs, reminders: value })} />
                <ToggleRow label="Subtle sounds" desc="Play soft sounds for toasts and setting interactions." checked={notificationPrefs.sound} onChange={value => updateNotificationPrefs({ ...notificationPrefs, sound: value })} />
              </div>
              <div className="mt-5 flex flex-wrap gap-3 border-t border-card-border pt-5">
                <button onClick={requestBrowserNotifications} className="h-11 rounded-2xl bg-accent px-5 text-[10px] font-black uppercase tracking-widest text-accent-contrast">
                  Enable Browser Permission
                </button>
                <button onClick={() => playInteractionSound('message')} className="h-11 rounded-2xl border border-card-border bg-card px-5 text-[10px] font-black uppercase tracking-widest text-text-secondary">
                  Test Sound
                </button>
              </div>
            </SettingsPanel>
          )}

          {activeSection === 'preferences' && (
            <SettingsPanel title="Preferences" subtitle="Defaults for this browser and beta workspace.">
              <div className="space-y-5">
                <SettingsField label="Default visibility">
                  <SelectMenu
                    value={preferencePrefs.defaultVisibility}
                    onChange={value => updatePreferencePrefs({ ...preferencePrefs, defaultVisibility: value as any })}
                    options={[
                      { value: 'private', label: 'Private' },
                      { value: 'circle', label: 'Circle' },
                      { value: 'public', label: 'Public' }
                    ]}
                  />
                </SettingsField>
                <SettingsField label="Default Wallet currency">
                  <SelectMenu
                    value={user.defaultCurrency || 'INR'}
                    onChange={value => {
                      void updateUser({ defaultCurrency: value as any });
                      playInteractionSound('click');
                    }}
                    options={CURRENCY_OPTIONS}
                  />
                </SettingsField>
                <SettingsField label="Workspace scale">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      { id: 'compact', label: 'Compact', desc: 'Smaller cards and tighter boards. Best for daily use.' },
                      { id: 'comfortable', label: 'Comfortable', desc: 'Larger cards with more breathing room.' }
                    ].map(option => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => updatePreferencePrefs({ ...preferencePrefs, workspaceScale: option.id as any, compactCards: option.id === 'compact' })}
                        className={cn(
                          "rounded-3xl border p-4 text-left transition-all",
                          preferencePrefs.workspaceScale === option.id
                            ? "border-accent bg-accent/10 shadow-lg shadow-accent/10"
                            : "border-card-border bg-card hover:border-accent/35"
                        )}
                      >
                        <WorkspaceScalePreview scale={option.id as 'compact' | 'comfortable'} active={preferencePrefs.workspaceScale === option.id} />
                        <span className="mt-4 block text-sm font-black text-text-main">{option.label}</span>
                        <span className="mt-1 block text-xs font-semibold leading-relaxed text-text-secondary/65">{option.desc}</span>
                      </button>
                    ))}
                  </div>
                </SettingsField>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <ToggleRow label="Reduce motion" desc="Lower animation intensity." checked={preferencePrefs.reduceMotion} onChange={value => updatePreferencePrefs({ ...preferencePrefs, reduceMotion: value })} />
                  <ToggleRow label="Beta tips" desc="Show guidance for unfinished beta flows." checked={preferencePrefs.betaTips} onChange={value => updatePreferencePrefs({ ...preferencePrefs, betaTips: value })} />
                </div>
                <div className="flex flex-wrap gap-3 border-t border-card-border pt-5">
                  <button onClick={restartTutorial} className="flex h-11 items-center gap-2 rounded-2xl bg-accent px-5 text-[10px] font-black uppercase tracking-widest text-accent-contrast">
                    <Monitor size={14} /> Restart Tour
                  </button>
                  <button onClick={handleResetLocalPrefs} className="flex h-11 items-center gap-2 rounded-2xl border border-card-border bg-card px-5 text-[10px] font-black uppercase tracking-widest text-text-secondary">
                    <RotateCcw size={14} /> Reset Local Preferences
                  </button>
                </div>
              </div>
            </SettingsPanel>
          )}

          {activeSection === 'privacy' && (
            <SettingsPanel title="Privacy & Security" subtitle="Account access, sharing defaults, cookies, and legal controls in one place.">
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  <div className="rounded-3xl border border-card-border bg-app-container p-5">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent"><Lock size={18} /></div>
                      <div>
                        <h3 className="text-sm font-black text-text-main">Update Password</h3>
                        <p className="text-xs font-semibold text-text-secondary/60">Requires your current signed-in session.</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" className="settings-input" />
                      <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm password" className="settings-input" />
                      <button onClick={handlePasswordUpdate} disabled={isUpdatingPassword || !password || !confirmPassword} className="h-11 w-full rounded-2xl bg-accent text-[10px] font-black uppercase tracking-widest text-accent-contrast disabled:opacity-50">
                        {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </div>
                  <div className="rounded-3xl border border-card-border bg-app-container p-5">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-muted text-text-secondary"><Key size={18} /></div>
                      <div>
                        <h3 className="text-sm font-black text-text-main">Session</h3>
                        <p className="text-xs font-semibold text-text-secondary/60">Sign out on this device when you are done.</p>
                      </div>
                    </div>
                    <button onClick={signOut} className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-card-border bg-card text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-danger">
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                </div>

                <div className="rounded-3xl border border-card-border bg-app-container p-5">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                      <Lock size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-text-main">Sharing defaults</h3>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-text-secondary/65">
                        Private notes, journals, progress logs, money/resource entries, and messages stay private unless you intentionally share them.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <SettingsField label="Default visibility">
                      <SelectMenu
                        value={preferencePrefs.defaultVisibility}
                        onChange={value => updatePreferencePrefs({ ...preferencePrefs, defaultVisibility: value as any })}
                        options={[
                          { value: 'private', label: 'Private · Only you' },
                          { value: 'circle', label: 'Circle · People you choose' },
                          { value: 'public', label: 'Public · Feed and profile' }
                        ]}
                      />
                      <p className="mt-2 text-[11px] font-semibold text-text-secondary/60">{getVisibilityLabel(preferencePrefs.defaultVisibility)}</p>
                    </SettingsField>
                    <SettingsField label="Progress log default">
                      <SelectMenu
                        value={preferencePrefs.progressLogVisibility}
                        onChange={value => updatePreferencePrefs({ ...preferencePrefs, progressLogVisibility: value as any })}
                        options={[
                          { value: 'private', label: 'Private · Only you' },
                          { value: 'circle', label: 'Circle · People you choose' },
                          { value: 'public', label: 'Public · Feed and profile' }
                        ]}
                      />
                      <p className="mt-2 text-[11px] font-semibold text-text-secondary/60">Private logs do not appear in Feed, public profile, recommendations, or analytics.</p>
                    </SettingsField>
                    <SettingsField label="Profile visibility">
                      <SelectMenu
                        value={preferencePrefs.profileVisibility}
                        onChange={value => updatePreferencePrefs({ ...preferencePrefs, profileVisibility: value as any })}
                        options={[
                          { value: 'public', label: 'Public profile' },
                          { value: 'circle', label: 'Circle only' },
                          { value: 'minimal', label: 'Minimal/private' }
                        ]}
                      />
                    </SettingsField>
                    <SettingsField label="Message permissions">
                      <SelectMenu
                        value={preferencePrefs.messagePermissions}
                        onChange={value => updatePreferencePrefs({ ...preferencePrefs, messagePermissions: value as any })}
                        options={[
                          { value: 'circle', label: 'Circle only' },
                          { value: 'everyone', label: 'Everyone' },
                          { value: 'none', label: 'Requests only' }
                        ]}
                      />
                    </SettingsField>
                    <SettingsField label="Mention permissions">
                      <SelectMenu
                        value={preferencePrefs.mentionPermissions}
                        onChange={value => updatePreferencePrefs({ ...preferencePrefs, mentionPermissions: value as any })}
                        options={[
                          { value: 'everyone', label: 'Everyone' },
                          { value: 'circle', label: 'Circle only' },
                          { value: 'none', label: 'No one' }
                        ]}
                      />
                    </SettingsField>
                    <SettingsField label="Circle Momentum">
                      <SelectMenu
                        value={preferencePrefs.circleMomentumVisibility}
                        onChange={value => updatePreferencePrefs({ ...preferencePrefs, circleMomentumVisibility: value as any })}
                        options={[
                          { value: 'circle', label: 'On - Circle only' },
                          { value: 'public', label: 'On - Public profile too' },
                          { value: 'hidden', label: 'Hidden from board' }
                        ]}
                      />
                      <p className="mt-2 text-[11px] font-semibold text-text-secondary/60">
                        Circle Momentum only uses progress you choose to share with your Circle. Private logs stay yours only.
                      </p>
                    </SettingsField>
                    <SettingsField label="Momentum detail">
                      <SelectMenu
                        value={preferencePrefs.circleMomentumDetail}
                        onChange={value => updatePreferencePrefs({ ...preferencePrefs, circleMomentumDetail: value as any })}
                        options={[
                          { value: 'counts', label: 'Score + visible activity counts' },
                          { value: 'score', label: 'Score only' }
                        ]}
                      />
                    </SettingsField>
                    <ToggleRow
                      label="Personalized recommendations"
                      desc="Use allowed interests, public/circle vision categories, and saved resources. Private messages, journals, notes, and logs are never used."
                      checked={preferencePrefs.personalizedRecommendations}
                      onChange={value => updatePreferencePrefs({ ...preferencePrefs, personalizedRecommendations: value })}
                    />
                  </div>
                </div>

                <div className="rounded-3xl border border-card-border bg-app-container p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                          <Cookie size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-text-main">Cookie preferences</h3>
                          <p className="text-xs font-semibold text-text-secondary/60">Essential cookies/storage stay active for login, security, and app functionality.</p>
                        </div>
                      </div>
                      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-card-border bg-card p-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/50">Analytics</p>
                          <p className={cn('mt-2 text-sm font-black', canUseAnalytics ? 'text-success' : 'text-text-secondary')}>{canUseAnalytics ? 'On' : 'Off'}</p>
                        </div>
                        <div className="rounded-2xl border border-card-border bg-card p-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/50">Personalization</p>
                          <p className={cn('mt-2 text-sm font-black', canUsePersonalization ? 'text-success' : 'text-text-secondary')}>{canUsePersonalization ? 'On' : 'Off'}</p>
                        </div>
                        <div className="rounded-2xl border border-card-border bg-card p-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/50">Recommendations</p>
                          <p className={cn('mt-2 text-sm font-black', canUseResourceRecommendations ? 'text-success' : 'text-text-secondary')}>{canUseResourceRecommendations ? 'On' : 'Off'}</p>
                        </div>
                      </div>
                      {consent?.updatedAt && (
                        <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-text-secondary/45">
                          Last updated {new Date(consent.updatedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <button onClick={openPreferences} className="h-11 shrink-0 rounded-2xl bg-accent px-5 text-[10px] font-black uppercase tracking-widest text-accent-contrast">
                      Manage cookie preferences
                    </button>
                  </div>
                </div>

                <div className="rounded-3xl border border-card-border bg-card p-5">
                  <h3 className="text-sm font-black text-text-main">Legal and data controls</h3>
                  <p className="mt-1 text-xs font-semibold text-text-secondary/60">Cookie choices can be changed anytime. Export and delete-account requests are handled through support during beta.</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link to="/cookie-policy" className="rounded-2xl border border-card-border bg-app-container px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-accent">Cookie Policy</Link>
                    <Link to="/privacy-policy" className="rounded-2xl border border-card-border bg-app-container px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-accent">Privacy Policy</Link>
                    <Link to="/terms-of-service" className="rounded-2xl border border-card-border bg-app-container px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-accent">Terms of Service</Link>
                    <Link to="/affiliate-disclosure" className="rounded-2xl border border-card-border bg-app-container px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-accent">Affiliate Disclosure</Link>
                    <Link to="/community-guidelines" className="rounded-2xl border border-card-border bg-app-container px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-accent">Community Guidelines</Link>
                    <Link to="/data-rights" className="rounded-2xl border border-card-border bg-app-container px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-accent">Data Rights</Link>
                    <Link to="/contact" className="rounded-2xl border border-card-border bg-app-container px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-accent">Contact Support</Link>
                  </div>
                </div>
              </div>
            </SettingsPanel>
          )}
        </main>
      </section>

      <section className="px-4">
        <div className="rounded-[2rem] border border-danger/15 bg-danger/5 p-6">
          <div className="flex items-start gap-4">
            <Shield size={24} className="mt-1 text-danger" />
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-danger">Danger Zone</h2>
              <p className="mt-1 text-sm font-semibold text-danger/70">
                Data deletion and account deactivation should be handled through a confirmed support flow during beta. No fake destructive buttons are shown here.
              </p>
            </div>
          </div>
        </div>
      </section>
      <CookiePreferencesModal
        open={preferencesOpen}
        onClose={closePreferences}
        onSaved={() => addToast({ type: 'success', title: 'Cookie preferences updated', description: 'Your choices were saved on this browser.' })}
      />
    </motion.div>
  );
}

function SettingsPanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <motion.section
      key={title}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="system-card bg-card p-5 sm:p-7"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight text-text-main">{title}</h2>
        <p className="mt-1 text-sm font-semibold text-text-secondary">{subtitle}</p>
      </div>
      {children}
    </motion.section>
  );
}

function WorkspaceScalePreview({ scale, active }: { scale: 'compact' | 'comfortable'; active: boolean }) {
  const compact = scale === 'compact';
  return (
    <div className={cn(
      "overflow-hidden rounded-2xl border bg-bg-base shadow-inner transition-all",
      active ? "border-accent/40" : "border-card-border"
    )}>
      <div className="flex h-28">
        <div className={cn(
          "border-r border-card-border bg-surface-muted/70",
          compact ? "w-12 p-1.5" : "w-16 p-2"
        )}>
          <div className={cn("rounded-lg bg-accent", compact ? "mb-3 h-6 w-6" : "mb-4 h-8 w-8")} />
          <div className="space-y-1.5">
            {[0, 1, 2].map(item => (
              <div key={item} className={cn("rounded-full bg-text-secondary/20", compact ? "h-1.5 w-7" : "h-2 w-10")} />
            ))}
          </div>
        </div>
        <div className={cn("flex-1", compact ? "p-2" : "p-3")}>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className={cn("rounded-full bg-text-main", compact ? "mb-1 h-2 w-16" : "mb-1.5 h-2.5 w-20")} />
              <div className={cn("rounded-full bg-text-secondary/20", compact ? "h-1.5 w-10" : "h-2 w-12")} />
            </div>
            <div className={cn("rounded-lg bg-accent/20", compact ? "h-5 w-12" : "h-7 w-16")} />
          </div>
          <div className={cn("grid gap-1.5", compact ? "grid-cols-3" : "grid-cols-2")}>
            {(compact ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3]).map(item => (
              <div key={item} className={cn("rounded-xl border border-card-border bg-card", compact ? "h-8 p-1" : "h-12 p-1.5")}>
                <div className={cn("mb-1 rounded-full bg-accent/35", compact ? "h-1.5 w-7" : "h-2 w-10")} />
                <div className={cn("rounded-full bg-text-secondary/15", compact ? "h-1 w-10" : "h-1.5 w-14")} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary/55">{label}</span>
      {children}
    </label>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-4 rounded-3xl border border-card-border bg-app-container p-5 text-left transition-all hover:border-accent/30"
    >
      <span>
        <span className="block text-sm font-black text-text-main">{label}</span>
        <span className="mt-1 block text-xs font-semibold text-text-secondary/65">{desc}</span>
      </span>
      <span className={cn('relative h-7 w-12 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-surface-muted')}>
        <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
      </span>
    </button>
  );
}
