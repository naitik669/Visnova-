/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { format, subDays, isSameDay, startOfDay } from 'date-fns';
import { Book, ChevronLeft, ChevronRight, Edit3, Save, Trash2, Calendar, History, Sparkles, Layout, Target, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';

export default function DailyJournal() {
  const { dateNotes, setDateNote } = useStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);
  const [entryText, setEntryText] = useState('');

  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const currentNote = dateNotes[dateKey] || '';

  // Get last 7 days for the quick selector
  const recentDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => subDays(new Date(), i)).reverse();
  }, []);

  const handleDaySelect = (date: Date) => {
    setSelectedDate(date);
    setIsEditing(false);
    setEntryText(dateNotes[format(date, 'yyyy-MM-dd')] || '');
  };

  const handleStartEditing = () => {
    setEntryText(currentNote);
    setIsEditing(true);
  };

  const handleSave = () => {
    setDateNote(dateKey, entryText);
    setIsEditing(false);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to delete this journal entry?')) {
      setDateNote(dateKey, '');
      setEntryText('');
      setIsEditing(false);
    }
  };

  return (
    <div className="w-full space-y-8 mt-24 px-12">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-accent/60">
            <div className="w-12 h-px bg-accent/30" />
            <Book size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Daily Ledger</span>
          </div>
          <h2 className="text-3xl font-black text-text-main tracking-tighter uppercase">Goal Reflection</h2>
          <p className="text-text-secondary/70 font-medium max-w-xl text-base border-l-2 border-accent/20 pl-6">
            Document your daily progress, mental shifts, and strategic pivots. The journal anchors your vision in daily action.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-surface-muted/50 p-2 rounded-2xl border border-card-border">
          {recentDays.map((day) => (
            <button
              key={day.toISOString()}
              onClick={() => handleDaySelect(day)}
              className={cn(
                "w-12 h-14 rounded-xl flex flex-col items-center justify-center transition-all",
                isSameDay(day, selectedDate)
                  ? "bg-text-main text-bg-base shadow-lg scale-105"
                  : "hover:bg-accent/5 text-text-secondary"
              )}
            >
              <span className="text-[8px] font-black uppercase tracking-widest">{format(day, 'EEE')}</span>
              <span className="text-lg font-black">{format(day, 'd')}</span>
            </button>
          ))}
          <div className="w-px h-6 bg-card-border mx-2" />
          <button 
            className="w-12 h-12 flex items-center justify-center text-text-secondary hover:text-accent transition-colors"
            title="Full Calendar"
          >
            <Calendar size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <div className="system-card bg-card p-10 min-h-[400px] flex flex-col group relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <History size={150} className="text-accent" />
            </div>

            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="space-y-1">
                <h3 className="text-sm font-black uppercase tracking-widest text-accent/60">{format(selectedDate, 'EEEE')}</h3>
                <h4 className="text-2xl font-black text-text-main tracking-tight uppercase">{format(selectedDate, 'MMMM do, yyyy')}</h4>
              </div>

              {!isEditing && (
                <button
                  onClick={handleStartEditing}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/20 hover:scale-105 transition-all"
                >
                  <Edit3 size={14} /> {currentNote ? 'Edit Entry' : 'New Entry'}
                </button>
              )}
            </div>

            <div className="flex-1 relative z-10">
              <AnimatePresence mode="wait">
                {isEditing ? (
                  <motion.div
                    key="editing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col space-y-6"
                  >
                    <textarea
                      autoFocus
                      value={entryText}
                      onChange={(e) => setEntryText(e.target.value)}
                      placeholder="What breakthroughs happened today? What obstacles did you encounter? Reflect on your momentum..."
                      className="w-full flex-1 bg-accent/5 p-8 rounded-3xl text-lg font-medium text-text-main focus:outline-none border border-accent/10 focus:border-accent/40 resize-none transition-all placeholder:text-text-secondary/30 leading-relaxed"
                    />
                    <div className="flex items-center justify-between">
                      <button
                        onClick={handleClear}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-danger hover:underline"
                      >
                        <Trash2 size={14} /> Delete Entry
                      </button>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-surface-muted transition-all"
                        >
                          Discard
                        </button>
                        <button
                          onClick={handleSave}
                          className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-text-main text-bg-base text-[10px] font-black uppercase tracking-widest shadow-xl shadow-text-main/10 hover:scale-105 transition-all"
                        >
                          <Save size={14} /> Seal Entry
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="display"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full"
                  >
                    {currentNote ? (
                      <div className="prose prose-accent max-w-none">
                         <p className="text-xl text-text-main leading-relaxed font-medium whitespace-pre-wrap">
                           {currentNote}
                         </p>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-card-border rounded-3xl bg-surface-muted/30">
                        <div className="w-16 h-16 rounded-full bg-accent/5 flex items-center justify-center text-accent/40 mb-6">
                            <Edit3 size={32} />
                        </div>
                        <h5 className="text-lg font-black text-text-main tracking-tight uppercase">Moment of Reflection</h5>
                        <p className="text-text-secondary max-w-xs text-sm font-medium mt-2">
                          You haven't recorded anything for this date yet. Take a moment to sync your thoughts.
                        </p>
                        <button 
                          onClick={handleStartEditing}
                          className="mt-8 text-[10px] font-black uppercase tracking-widest text-accent border-b-2 border-accent/20 hover:border-accent transition-all pb-1"
                        >
                          Initialize Journal Node
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="system-card bg-accent text-accent-contrast p-10 relative overflow-hidden h-full group">
             <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                <Sparkles size={120} />
             </div>
             
             <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">Reflection Advice</h3>
             <h4 className="text-3xl font-black tracking-tight uppercase leading-none mb-6">Intentional<br/>Analysis</h4>
             
             <ul className="space-y-6 relative z-10">
                {[
                  { q: "What was my highest leverage action today?", icon: Zap },
                  { q: "Did my environment support my focus?", icon: Layout },
                  { q: "What is one thing I will improve tomorrow?", icon: Target }
                ].map((item, i) => (
                  <li key={i} className="flex gap-4">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <item.icon size={16} />
                    </div>
                    <p className="text-sm font-medium text-accent-contrast/80 leading-snug">{item.q}</p>
                  </li>
                ))}
             </ul>

             <div className="mt-12 pt-8 border-t border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Consistency Streak</p>
                <div className="flex items-center gap-1 mt-2">
                  {Array.from({length: 12}).map((_, i) => (
                    <div key={i} className={cn("h-1.5 flex-1 rounded-full", i < 4 ? "bg-white" : "bg-white/10")} />
                  ))}
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mt-3 text-right">4 Days Synchronized</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
