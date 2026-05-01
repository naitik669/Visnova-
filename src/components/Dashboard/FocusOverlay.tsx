import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Pause, RotateCcw, Brain, Save, Wind, Zap, Target, Plus, Trash2, Clock, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-overlay backdrop-blur-md flex items-center justify-center p-4 md:p-8"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-card border border-card-border w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col"
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center hover:bg-surface-muted rounded-full transition-colors text-text-secondary hover:text-text-main z-20"
          >
            <X size={20} />
          </button>

          <div className="p-8 md:p-12 space-y-8">
            {sessionState === 'active' && (
              <div className="space-y-8">
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
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-text-main italic line-clamp-2">
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
                        className="flex flex-wrap gap-2"
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
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="relative group">
                    <motion.div
                      animate={{
                        scale: focusSession.isRunning ? [1, 1.02, 1] : 1,
                        rotate: focusSession.isRunning ? [0, 1, -1, 0] : 0
                      }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="text-[6rem] md:text-[8rem] font-medium tracking-tighter leading-none select-none text-text-main tabular-nums relative z-10"
                    >
                      {formatTime(focusSession.timeLeft)}
                    </motion.div>
                    <div className={cn(
                      "absolute inset-0 bg-accent/5 blur-3xl rounded-full transition-all duration-1000",
                      focusSession.isRunning ? "scale-150 opacity-100" : "scale-100 opacity-0"
                    )} />
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-6 mt-8">
                    <button
                      onClick={handleToggleActive}
                      className="w-16 h-16 rounded-2xl bg-accent text-accent-contrast flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-accent/20"
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
                </div>

                {/* Cognitive Anchor */}
                <div className="bg-bg-base/50 p-6 rounded-3xl border border-card-border flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/5 flex items-center justify-center text-accent shrink-0">
                    <Brain size={20} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-main">Core Strategy</h4>
                    <p className="text-[11px] text-text-secondary leading-relaxed opacity-80">
                      Eliminate all external variables. Your physical body is a tool for alignment. Execute the singular task ahead.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {sessionState === 'reflection' && (
              <div className="space-y-10">
                <div className="space-y-4 text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-[9px] font-bold uppercase tracking-widest leading-none">
                    <Check size={12} /> protocol concluded
                  </div>
                  <h2 className="text-3xl font-semibold tracking-tight text-text-main leading-tight">Evidence of Alignment</h2>
                  <p className="text-sm text-text-secondary font-medium leading-relaxed opacity-80 max-w-sm mx-auto">
                    Passive timers don't build discipline. Honest reflection does. Log your physical output.
                  </p>
                </div>

                <div className="space-y-6">
                  <textarea
                    value={reflectionText}
                    onChange={(e) => setReflectionText(e.target.value)}
                    placeholder="I executed..."
                    className="w-full h-40 bg-bg-base/30 rounded-3xl border border-card-border focus:border-accent/40 focus:outline-none transition-colors text-lg p-6 text-text-main font-medium placeholder:text-text-main/10 resize-none"
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
