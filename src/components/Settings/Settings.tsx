import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, Palette, Shield, User, Bell, Globe, ChevronRight, Check, X, Camera, Sparkles, Zap, Smartphone, Key } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { useState } from 'react';

export default function Settings() {
  const { theme, setTheme, user, updateUser } = useStore();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editData, setEditData] = useState({
    name: user.name,
    username: user.username || '',
    bio: user.bio || '',
    role: user.role || user.rank || '',
    avatar: user.avatar
  });

  const handleSaveProfile = async () => {
    await updateUser(editData);
    setIsEditingProfile(false);
  };

  const themes = [
    {
      id: 'light',
      icon: Sun,
      label: 'Light',
      desc: 'High contrast clarity',
      color: 'bg-card text-text-main'
    },
    {
      id: 'dark',
      icon: Moon,
      label: 'Dark',
      desc: 'Optimized for deep work',
      color: 'bg-[#18191C] text-accent-contrast'
    },
    {
      id: 'green',
      icon: Sparkles,
      label: 'Green',
      desc: 'Organic growth focus',
      color: 'bg-[#2d4a3e] text-accent-contrast'
    },
    {
      id: 'yellow',
      icon: Zap,
      label: 'Yellow',
      desc: 'Optimistic energy',
      color: 'bg-[#7a6a2a] text-accent-contrast'
    },
    {
      id: 'pastel',
      icon: Palette,
      label: 'Pastel',
      desc: 'Creative & Soft mood',
      color: 'bg-[#5D4361] text-[#FFF7F0]'
    },
  ] as const;

  const sections = [
    { icon: Key, label: 'Advanced Security', desc: 'Manage access keys and authentication protocols' },
    { icon: Bell, label: 'Sensory Notifications', desc: 'Configure threshold and urgency limits' },
    { icon: Smartphone, label: 'Device Integration', desc: 'Sync across mobile and desktop nodes' },
    { icon: Globe, label: 'Regional Protocols', desc: 'Language and localization standards' },
    { icon: Sparkles, label: 'System Tutorial', desc: 'Re-run the interactive orientation sequence', action: 'restart' },
  ];

  const { restartTutorial } = useStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-5xl mx-auto space-y-16 pb-32 pt-8"
    >
      {/* Dynamic Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-6 bg-accent rounded-full" />
             <h1 className="text-5xl font-black tracking-tighter text-text-main">SYSTEM CONFIG</h1>
          </div>
          <p className="text-text-secondary font-medium max-w-md leading-relaxed">
            Calibrate your Vision interface and adjust environmental aesthetics to optimize for maximum cognitive output.
          </p>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary opacity-50 pb-2">
           <Zap size={14} className="text-warning" />
           Latency: 12ms // VisNova Protocol v4.1
        </div>
      </section>

      {/* Identity Core */}
      <section className="relative px-4">
        <div className="system-card relative overflow-hidden group">
          {/* Background Mesh */}
          <div className="absolute inset-0 bg-mesh opacity-20 pointer-events-none" />

          <div className="relative p-8 md:p-12 space-y-10">
            <div className="flex flex-col md:flex-row items-start gap-10">
              <div className="relative shrink-0">
                <img
                   src={editData.avatar}
                   className="w-32 h-32 rounded-3xl object-cover border-4 border-card-border shadow-2xl transition-transform duration-700 group-hover:scale-105"
                   alt="Profile"
                />
                <button className="absolute -bottom-3 -right-3 w-10 h-10 bg-accent text-accent-contrast rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95">
                   <Camera size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-6 pt-2 w-full">
                {!isEditingProfile ? (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-4xl font-bold text-text-main tracking-tight">{user.name}</h2>
                      <p className="text-text-secondary font-medium mt-1 uppercase tracking-[0.15em] text-[10px]">@{user.username || 'user'} // STATUS: ONLINE</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <span className="px-4 py-2 bg-accent text-accent-contrast font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-accent/20">
                          {user.role || user.rank}
                        </span>
                        <span className="px-4 py-2 bg-success/10 text-success font-black text-[10px] uppercase tracking-widest rounded-xl border border-success/10">
                          LEVEL {user.level} ARCHITECT
                        </span>
                    </div>

                    <p className="text-sm text-text-secondary leading-relaxed max-w-xl italic font-medium">
                      "{user.bio || 'Your destiny is being written in these pathways. Define your bio to anchor your identity.'}"
                    </p>

                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="px-8 py-3 bg-accent text-accent-contrast text-[11px] font-black uppercase tracking-widest rounded-xl hover:shadow-2xl hover:shadow-accent/20 active:scale-95 transition-all"
                    >
                      Update Identity Profile
                    </button>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6 bg-bg-base/50 p-6 rounded-3xl border border-card-border"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1">Full Name</label>
                        <input
                          type="text"
                          value={editData.name}
                          onChange={e => setEditData({...editData, name: e.target.value})}
                          className="w-full h-12 px-4 rounded-2xl bg-card border border-card-border text-text-main focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1">Role Title</label>
                        <input
                          type="text"
                          value={editData.role}
                          onChange={e => setEditData({...editData, role: e.target.value})}
                          className="w-full h-12 px-4 rounded-2xl bg-card border border-card-border text-text-main focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all font-bold"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary ml-1">Identity Bio</label>
                      <textarea
                        value={editData.bio}
                        onChange={e => setEditData({...editData, bio: e.target.value})}
                        className="w-full h-24 p-4 rounded-2xl bg-card border border-card-border text-text-main focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all resize-none font-medium text-sm leading-relaxed"
                      />
                    </div>
                    <div className="flex gap-4 pt-2">
                      <button
                        onClick={handleSaveProfile}
                        className="flex-1 h-12 bg-accent text-accent-contrast text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:shadow-accent/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Check size={16} /> Save Changes
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingProfile(false);
                          setEditData({
                            name: user.name,
                            username: user.username || '',
                            bio: user.bio || '',
                            role: user.role || user.rank || '',
                            avatar: user.avatar
                          });
                        }}
                        className="h-12 px-6 bg-card border border-card-border text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-surface-muted transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <X size={16} /> Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid Appearance */}
      <section className="space-y-8 px-4">
        <div className="flex items-center gap-4">
           <h2 className="text-2xl font-bold tracking-tight text-text-main">Environmental Aesthetics</h2>
           <div className="flex-1 h-px bg-card-border" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={cn(
                "group relative h-72 rounded-[2rem] overflow-hidden border-2 transition-all duration-700 text-left",
                theme === t.id
                  ? "border-accent scale-[1.02] shadow-2xl shadow-accent/10"
                  : "border-card-border bg-card opacity-70 hover:opacity-100 hover:border-accent/30"
              )}
            >
              <div className="absolute inset-0 bg-mesh opacity-10 group-hover:opacity-20 transition-opacity" />

              <div className="relative h-full p-8 flex flex-col justify-between">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-transform duration-500 group-hover:rotate-12", t.color)}>
                  <t.icon size={28} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-black text-xs uppercase tracking-[0.2em]">{t.label}</h3>
                    {theme === t.id && (
                      <motion.div layoutId="active-theme" className="px-2 py-0.5 bg-accent text-[9px] font-black text-accent-contrast uppercase tracking-widest rounded-full">Active</motion.div>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary font-medium leading-tight">{t.desc}</p>
                </div>
              </div>

              {/* Decorative Sample */}
              <div className="absolute top-8 right-8 space-y-1.5 pointer-events-none">
                 <div className="w-12 h-1 bg-accent/20 rounded-full" />
                 <div className="w-8 h-1 bg-accent/10 rounded-full" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Account Parameters */}
      <section className="space-y-8 px-4">
        <div className="flex items-center gap-4">
           <h2 className="text-2xl font-bold tracking-tight text-text-main">Protocol Parameters</h2>
           <div className="flex-1 h-px bg-card-border" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((item) => (
            <div
              key={item.label}
              onClick={() => {
                if ('action' in item && item.action === 'restart') {
                  restartTutorial();
                }
              }}
              className="group p-8 rounded-3xl bg-card border border-card-border flex items-center justify-between cursor-pointer hover:border-accent/20 hover:shadow-xl hover:shadow-accent/5 transition-all duration-300"
            >
              <div className="flex items-center gap-8">
                <div className="w-16 h-16 rounded-3xl bg-bg-base flex items-center justify-center text-text-secondary group-hover:text-accent group-hover:scale-110 transition-all duration-500 group-hover:bg-accent-soft">
                  <item.icon size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-text-main uppercase tracking-widest text-xs">{item.label}</h4>
                  <p className="text-sm text-text-secondary font-medium tracking-tight">{item.desc}</p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-bg-base flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                <ChevronRight size={18} className="text-accent" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* System Override */}
      <section className="px-4">
        <div className="bg-danger/5 border border-danger/10 p-10 rounded-[3rem] space-y-10">
          <div className="flex items-center gap-4">
            <Shield size={32} className="text-danger" />
            <div>
              <h2 className="text-2xl font-black tracking-tight text-danger uppercase">System Override</h2>
              <p className="text-danger/70 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Danger Zone // Irreversible Procedures</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <button className="px-10 py-4 bg-card text-danger border border-danger/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-danger/5 transition-all active:scale-95 shadow-lg shadow-danger/5">
              Reset Neural Data
            </button>
            <button className="px-10 py-4 bg-danger text-accent-contrast rounded-2xl font-black text-[10px] uppercase tracking-widest hover:brightness-95 shadow-2xl shadow-danger/20 transition-all active:scale-95">
              Deactivate Identity
            </button>
          </div>

          <div className="pt-4 border-t border-danger/10">
             <p className="text-[10px] font-medium text-danger/60 uppercase tracking-[0.1em]">VisNova Secure Wipe v1.0.2 // Zero Retention Policy</p>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
