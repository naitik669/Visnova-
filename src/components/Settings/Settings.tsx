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
  Settings as SettingsIcon
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import {
  defaultAppPreferences,
  defaultNotificationPreferences,
  getAppPreferences,
  getNotificationPreferences,
  playInteractionSound,
  setAppPreferences,
  setNotificationPreferences
} from '../../lib/appPreferences';

type SettingsSection = 'profile' | 'themes' | 'security' | 'notifications' | 'preferences';

const themes = [
  { id: 'light', icon: Sun, label: 'Light', desc: 'High contrast clarity', color: 'bg-card text-text-main' },
  { id: 'dark', icon: Moon, label: 'Dark', desc: 'Optimized for deep work', color: 'bg-[#18191C] text-[#fafaf9]' },
  { id: 'midnight', icon: Moon, label: 'Midnight', desc: 'Deep navy focus', color: 'bg-[#0f172a] text-[#38bdf8]' },
  { id: 'graphite', icon: Palette, label: 'Graphite', desc: 'Neutral dark workspace', color: 'bg-[#262626] text-[#fafaf9]' },
  { id: 'forest-dark', icon: Sparkles, label: 'Forest', desc: 'Dark green calm', color: 'bg-[#102719] text-[#86efac]' },
  { id: 'plum-dark', icon: Palette, label: 'Plum', desc: 'Soft creative mode', color: 'bg-[#2f173d] text-[#f0abfc]' },
  { id: 'green', icon: Sparkles, label: 'Green', desc: 'Organic growth focus', color: 'bg-[#4ade80] text-[#064e3b]' },
  { id: 'yellow', icon: Zap, label: 'Yellow', desc: 'Optimistic energy', color: 'bg-[#eab308] text-[#422006]' },
  { id: 'pastel', icon: Palette, label: 'Pastel', desc: 'Creative soft mood', color: 'bg-[#5D4361] text-[#FFF7F0]' },
  { id: 'sage', icon: Sparkles, label: 'Sage', desc: 'Natural and focused', color: 'bg-[#8da482] text-white' },
] as const;

export default function Settings() {
  const { theme, setTheme, user, updateUser, restartTutorial, signOut, addToast } = useStore();
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

  const updateNotificationPrefs = (next: typeof notificationPrefs) => {
    setNotificationPrefsState(next);
    setNotificationPreferences(next);
    playInteractionSound('click');
  };

  const updatePreferencePrefs = (next: typeof preferencePrefs) => {
    setPreferencePrefsState(next);
    setAppPreferences(next);
    playInteractionSound('click');
  };

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
    { id: 'security' as const, icon: Shield, label: 'Security', desc: 'Password and session' },
    { id: 'notifications' as const, icon: Bell, label: 'Notifications', desc: 'Alerts and reminders' },
    { id: 'preferences' as const, icon: SettingsIcon, label: 'Preferences', desc: 'Defaults and beta tools' },
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
              Manage your profile, theme, security, notifications, and beta preferences.
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
                  <p className="mt-4 max-w-40 text-[10px] font-bold uppercase tracking-widest text-text-secondary/45">
                    Avatar upload lives on Profile for now.
                  </p>
                </div>
                <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2">
                  <SettingsField label="Display name">
                    <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} className="settings-input" />
                  </SettingsField>
                  <SettingsField label="Role title">
                    <input value={editData.role} onChange={e => setEditData({ ...editData, role: e.target.value })} className="settings-input" />
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {themes.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setTheme(item.id);
                      playInteractionSound('click');
                    }}
                    className={cn(
                      'group relative min-h-44 rounded-3xl border-2 p-5 text-left transition-all',
                      theme === item.id ? 'border-accent bg-accent/5 shadow-xl shadow-accent/10' : 'border-card-border bg-card hover:border-accent/30'
                    )}
                  >
                    <div className={cn('mb-8 flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg transition-transform group-hover:rotate-6', item.color)}>
                      <item.icon size={24} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-text-main">{item.label}</h3>
                    <p className="mt-1 text-xs font-semibold text-text-secondary">{item.desc}</p>
                    {theme === item.id && <span className="absolute right-4 top-4 rounded-full bg-accent px-2 py-1 text-[9px] font-black uppercase tracking-widest text-accent-contrast">Active</span>}
                  </button>
                ))}
              </div>
            </SettingsPanel>
          )}

          {activeSection === 'security' && (
            <SettingsPanel title="Security" subtitle="Keep your account access clean and recoverable.">
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <div className="rounded-3xl border border-card-border bg-app-container p-5">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent"><Lock size={18} /></div>
                    <div>
                      <h3 className="text-sm font-black text-text-main">Update Password</h3>
                      <p className="text-xs font-semibold text-text-secondary/60">Requires your current session.</p>
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
                      <p className="text-xs font-semibold text-text-secondary/60">Sign out on this device.</p>
                    </div>
                  </div>
                  <button onClick={signOut} className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-card-border bg-card text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-danger">
                    <LogOut size={14} /> Logout
                  </button>
                </div>
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
                  <select value={preferencePrefs.defaultVisibility} onChange={e => updatePreferencePrefs({ ...preferencePrefs, defaultVisibility: e.target.value as any })} className="settings-input">
                    <option value="private">Private</option>
                    <option value="connections">Connections</option>
                    <option value="public">Public</option>
                  </select>
                </SettingsField>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <ToggleRow label="Reduce motion" desc="Lower animation intensity." checked={preferencePrefs.reduceMotion} onChange={value => updatePreferencePrefs({ ...preferencePrefs, reduceMotion: value })} />
                  <ToggleRow label="Compact cards" desc="Use denser surfaces where supported." checked={preferencePrefs.compactCards} onChange={value => updatePreferencePrefs({ ...preferencePrefs, compactCards: value })} />
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
