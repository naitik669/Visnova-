import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, Brain, Save, Target, Plus, Trash2, Check, Maximize2, Minimize2, Image as ImageIcon, Music2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { ResponsiveModal } from '../ui/ResponsiveModal';

const FOCUS_BACKGROUND_KEY = 'visnova_focus_background';

const focusBackgrounds = [
  {
    id: 'none',
    label: 'Clean',
    url: ''
  },
  {
    id: 'forest',
    label: 'Forest',
    url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80'
  },
  {
    id: 'lake',
    label: 'Lake',
    url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80'
  },
  {
    id: 'ocean',
    label: 'Ocean',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80'
  },
  {
    id: 'mountain',
    label: 'Mountain',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80'
  }
];

export default function FocusOverlay() {
  const {
    toggleFocusMode,
    visions,
    focusPresets,
    addFocusPreset,
    deleteFocusPreset,
    user,
    toggleGrinding,
    circle,
    focusSession,
    updateFocusTime,
    startFocusSession,
    endFocusSession,
    toggleFocusSession
  } = useStore();

  const [sessionState, setSessionState] = useState<'active' | 'reflection'>('active');
  const [reflectionText, setReflectionText] = useState('');
  const [showAddPreset, setShowAddPreset] = useState(false);
  const [newPresetLabel, setNewPresetLabel] = useState('');
  const [newPresetDuration, setNewPresetDuration] = useState('25');
  const [activePresetId, setActivePresetId] = useState<string | null>(focusPresets[0]?.id || null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPersonalize, setShowPersonalize] = useState(false);
  const [focusBackground, setFocusBackground] = useState(() => {
    if (typeof window === 'undefined') return focusBackgrounds[0];
    const saved = window.localStorage.getItem(FOCUS_BACKGROUND_KEY);
    if (!saved) return focusBackgrounds[0];
    try {
      const parsed = JSON.parse(saved);
      return {
        id: parsed.id || 'custom',
        label: parsed.label || 'Custom',
        url: parsed.url || ''
      };
    } catch {
      return focusBackgrounds[0];
    }
  });

  const saveFocusBackground = (background: { id: string; label: string; url: string }) => {
    setFocusBackground(background);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(FOCUS_BACKGROUND_KEY, JSON.stringify(background));
      } catch {
        // Large custom images may exceed local browser storage; keep the preview for this session.
      }
    }
  };

  const handleCustomBackground = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : '';
      if (url) saveFocusBackground({ id: 'custom', label: 'Custom', url });
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    // If opening focus mode and no session is active, start one
    if (!focusSession.isActive) {
      startFocusSession(25, 'Deep Sprint');
      setActivePresetId(focusPresets[0]?.id);
    }
  }, [focusSession.isActive, startFocusSession, focusPresets]);

  useEffect(() => {
    // Sync session state for reflection
    if (focusSession.isActive && focusSession.timeLeft === 0) {
      setSessionState('reflection');
    } else if (focusSession.isActive && focusSession.timeLeft > 0) {
      setSessionState('active');
    }
  }, [focusSession.isActive, focusSession.timeLeft]);

  const handleToggleActive = () => {
    toggleFocusSession();
  };

  const handleClose = () => {
    if (user.isGrinding && focusSession.isRunning) toggleGrinding();
    toggleFocusMode();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectPreset = (id: string, duration: number, label: string) => {
    setActivePresetId(id);
    startFocusSession(duration, label);
  };

  const handleAddPreset = () => {
    if (newPresetLabel && newPresetDuration) {
      addFocusPreset({
        label: newPresetLabel,
        duration: parseInt(newPresetDuration),
        type: 'custom'
      });
      setNewPresetLabel('');
      setNewPresetDuration('25');
      setShowAddPreset(false);
    }
  };

  const activeVision = visions.find(v => v.status === 'in-progress');
  const primaryTask = activeVision?.tasks.find(t => !t.completed);

  return (
    <ResponsiveModal
      open
      onClose={handleClose}
      size={isExpanded ? 'fullscreen' : 'xl'}
      className={isExpanded ? 'sm:h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-2rem)]' : undefined}
      title={sessionState === 'reflection' ? 'Focus Reflection' : focusSession.label || 'Focus Timer'}
      subtitle={sessionState === 'reflection' ? 'Log what you finished before ending the sprint.' : primaryTask ? primaryTask.text : 'Choose a preset and run a focused sprint.'}
      contentClassName="relative bg-card"
      zIndexClassName="z-[210]"
    >
          {focusBackground.url && (
            <div
              className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-100"
              style={{ backgroundImage: `url(${focusBackground.url})` }}
            />
          )}
          {focusBackground.url && (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-app-container/40 via-accent/15 to-card/45 backdrop-blur-[0.5px]" />
          )}

          <div className={cn(
            "relative p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6",
            isExpanded && "mx-auto flex min-h-full w-full max-w-7xl flex-col"
          )}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-card-border bg-app-container/80 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-text-secondary">
                <ImageIcon size={12} className="text-accent" />
                {focusBackground.label} focus room
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPersonalize(value => !value)}
                  className={cn(
                    "h-10 rounded-xl border px-3 text-[9px] font-black uppercase tracking-widest transition-all",
                    showPersonalize ? "border-accent bg-accent text-accent-contrast" : "border-card-border bg-app-container/80 text-text-secondary hover:text-text-main"
                  )}
                >
                  Personalize
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpanded(value => !value)}
                  aria-label={isExpanded ? 'Exit expanded Deep Sprint' : 'Expand Deep Sprint'}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-card-border bg-app-container/80 text-text-secondary transition-all hover:text-text-main"
                >
                  {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showPersonalize && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-[2rem] border border-accent/20 bg-app-container/85 p-4 shadow-sm shadow-accent/10 backdrop-blur-md"
                >
                  <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-text-secondary/60">Focus background</p>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                        {focusBackgrounds.map(background => (
                          <button
                            key={background.id}
                            type="button"
                            onClick={() => saveFocusBackground(background)}
                            className={cn(
                              "group overflow-hidden rounded-2xl border text-left transition-all",
                              focusBackground.id === background.id ? "border-accent ring-2 ring-accent/20" : "border-card-border hover:border-accent/40"
                            )}
                          >
                            <div
                              className={cn("h-16 bg-surface-muted bg-cover bg-center", background.id === 'none' && "bg-gradient-to-br from-card to-surface-muted")}
                              style={background.url ? { backgroundImage: `url(${background.url})` } : undefined}
                            />
                            <div className="bg-card px-3 py-2 text-[9px] font-black uppercase tracking-widest text-text-secondary group-hover:text-text-main">
                              {background.label}
                            </div>
                          </button>
                        ))}
                      </div>
                      <label className="mt-3 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-accent/25 bg-card/80 text-[9px] font-black uppercase tracking-widest text-text-secondary transition-all hover:border-accent/50 hover:text-accent">
                        <ImageIcon size={14} />
                        Use my image
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(event) => handleCustomBackground(event.target.files?.[0])}
                        />
                      </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {sessionState === 'active' && (
              <div className={cn("space-y-5 sm:space-y-6", isExpanded && "grid flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:space-y-0")}>
                <div className={cn("space-y-5 sm:space-y-6", isExpanded && "flex min-h-[560px] flex-col justify-center")}>
                {/* Social Pulse in Focus */}
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-4 px-4 py-2 rounded-full bg-accent/[0.03] border border-accent/10">
                    <div className="flex -space-x-2">
                       {circle.filter(m => m.isGrinding).slice(0, 3).map(m => (
                         <img key={m.id} src={m.avatar} className="w-6 h-6 rounded-full border-2 border-card" alt={m.name} />
                       ))}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-accent">
                      {circle.filter(m => m.isGrinding).length} circle members grinding with you
                    </span>
                  </div>
                </div>

                {/* Header Info */}
                <div className="space-y-4 text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-[9px] font-bold uppercase tracking-widest leading-none">
                    <Target size={12} /> execution in progress
                  </div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-text-main line-clamp-2">
                    "{primaryTask ? primaryTask.text : 'Calibrating Focus State...'}"
                  </h1>
                </div>

                {/* Preset Selector */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary/60">Presets</span>
                    <button
                      onClick={() => setShowAddPreset(!showAddPreset)}
                      className="text-accent text-[10px] font-bold uppercase tracking-wider hover:underline"
                    >
                      {showAddPreset ? 'Cancel' : 'Add Custom'}
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {showAddPreset ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 rounded-3xl bg-accent/[0.03] border border-accent/20 flex flex-col gap-4"
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold uppercase tracking-wider text-text-secondary ml-1">Label</label>
                            <input
                              type="text"
                              value={newPresetLabel}
                              onChange={(e) => setNewPresetLabel(e.target.value)}
                              placeholder="Study, Read, etc"
                              className="w-full bg-card border border-card-border rounded-xl px-3 py-2 text-sm focus:border-accent/40 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold uppercase tracking-wider text-text-secondary ml-1">Mins</label>
                            <input
                              type="number"
                              value={newPresetDuration}
                              onChange={(e) => setNewPresetDuration(e.target.value)}
                              className="w-full bg-card border border-card-border rounded-xl px-3 py-2 text-sm focus:border-accent/40 focus:outline-none"
                            />
                          </div>
                        </div>
                        <button
                          onClick={handleAddPreset}
                          className="w-full h-10 bg-accent text-accent-contrast rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-accent/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <Plus size={14} /> Create Preset
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-2 overflow-x-auto sm:flex-wrap custom-scrollbar pb-1"
                      >
                        {focusPresets.map((preset) => (
                          <div key={preset.id} className="group relative">
                            <button
                              onClick={() => handleSelectPreset(preset.id, preset.duration, preset.label)}
                              className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 border",
                                activePresetId === preset.id
                                  ? "bg-accent border-accent text-accent-contrast shadow-lg shadow-accent/20"
                                  : "bg-card border-card-border text-text-secondary hover:border-accent/30 hover:text-text-main"
                              )}
                            >
                              {preset.label} <span className="opacity-60 tabular-nums">{preset.duration}m</span>
                            </button>
                            {preset.type === 'custom' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteFocusPreset(preset.id); }}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-danger text-accent-contrast rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={8} />
                              </button>
                            )}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Main Timer Area */}
                <div className="flex flex-col items-center justify-center py-2 sm:py-4">
                  <div className="relative group">
                    <motion.div
                      animate={{
                        scale: focusSession.isRunning ? [1, 1.02, 1] : 1,
                        rotate: focusSession.isRunning ? [0, 1, -1, 0] : 0
                      }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="font-medium tracking-tighter leading-none select-none text-text-main tabular-nums relative z-10"
                      style={{ fontSize: isExpanded ? 'clamp(5rem, 17vw, 13rem)' : 'clamp(3.5rem, 12vw, 8rem)' }}
                    >
                      {formatTime(focusSession.timeLeft)}
                    </motion.div>
                    <div className={cn(
                      "absolute inset-0 bg-accent/5 blur-3xl rounded-full transition-all duration-1000",
                      focusSession.isRunning ? "scale-150 opacity-100" : "scale-100 opacity-0"
                    )} />
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-4 sm:gap-6 mt-5 sm:mt-7">
                    <button
                      onClick={handleToggleActive}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-accent text-accent-contrast flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-accent/20"
                    >
                      {focusSession.isRunning ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                    </button>

                    <button
                      onClick={() => { updateFocusTime(focusSession.totalTime); }}
                      className="w-12 h-12 rounded-xl border border-card-border flex items-center justify-center hover:bg-surface-muted text-text-secondary hover:text-text-main transition-all"
                    >
                      <RotateCcw size={18} />
                    </button>

                    <button
                      onClick={() => setSessionState('reflection')}
                      className="w-12 h-12 rounded-xl border border-card-border flex items-center justify-center hover:bg-surface-muted text-text-secondary hover:text-text-main transition-all"
                    >
                      <Save size={18} />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-6 w-full max-w-xl rounded-[2rem] border border-accent/20 bg-app-container/85 p-3 shadow-xl shadow-accent/10 backdrop-blur-md">
                      <div className="mb-3 flex items-center justify-center gap-2">
                        <Music2 size={15} className="text-accent" />
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-text-secondary/70">Lo-fi focus</p>
                      </div>
                      <iframe
                        title="Spotify lo-fi focus playlist"
                        src="https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn?utm_source=generator&theme=0"
                        width="100%"
                        height="152"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        className="rounded-2xl border border-card-border"
                      />
                    </div>
                  )}
                </div>
                </div>

                {/* Cognitive Anchor */}
                <div className={cn(
                  "bg-bg-base/60 p-4 sm:p-5 rounded-3xl border border-card-border flex items-start gap-4 backdrop-blur-sm",
                  isExpanded && "xl:sticky xl:top-4 xl:flex-col"
                )}>
                  <div className="w-10 h-10 rounded-xl bg-accent/5 flex items-center justify-center text-accent shrink-0">
                    <Brain size={20} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-main">Core Strategy</h4>
                    <p className="text-[11px] text-text-secondary leading-relaxed opacity-80">
                      Eliminate all external variables. Your physical body is a tool for alignment. Execute the singular task ahead.
                    </p>
                    <div className="pt-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/45">Room setup</p>
                      <p className="mt-1 text-xs font-semibold text-text-main">{focusBackground.label} background - Lo-fi playlist ready</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {sessionState === 'reflection' && (
              <div className="space-y-6 sm:space-y-8">
                <div className="space-y-4 text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-[9px] font-bold uppercase tracking-widest leading-none">
                    <Check size={12} /> protocol concluded
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-text-main leading-tight">Evidence of Alignment</h2>
                  <p className="text-sm text-text-secondary font-medium leading-relaxed opacity-80 max-w-sm mx-auto">
                    Passive timers don't build discipline. Honest reflection does. Log your physical output.
                  </p>
                </div>

                <div className="space-y-6">
                  <textarea
                    value={reflectionText}
                    onChange={(e) => setReflectionText(e.target.value)}
                    placeholder="I executed..."
                    className="w-full min-h-36 max-h-64 bg-bg-base/30 rounded-3xl border border-card-border focus:border-accent/40 focus:outline-none transition-colors text-base sm:text-lg p-5 sm:p-6 text-text-main font-medium placeholder:text-text-main/10 resize-y"
                    autoFocus
                  />

                  <button
                    onClick={() => {
                      endFocusSession();
                    }}
                    disabled={!reflectionText.trim()}
                    className="w-full h-14 rounded-2xl bg-accent text-accent-contrast text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-accent/20"
                  >
                    Solidify Strategy Path
                  </button>
                </div>
              </div>
            )}
          </div>
    </ResponsiveModal>
  );
}
