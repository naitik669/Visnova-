/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { format, subDays, isSameDay, startOfDay } from 'date-fns';
import { 
  Book, ChevronLeft, ChevronRight, Edit3, Save, Trash2, 
  Calendar, History, Sparkles, Layout, Target, Zap, 
  Tag, Filter, Search, Plus, List, Grid, SlidersHorizontal,
  Smile, Frown, Meh, Brain, Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { safeDate, safeFormat } from '../../lib/dateUtils';
import { JournalEntry, Vision } from '../../types';
import { SelectMenu } from '../ui/SelectMenu';

const moods = [
  { id: 'ecstatic', icon: Flame, color: 'text-orange-500', label: 'Ecstatic' },
  { id: 'good', icon: Smile, color: 'text-green-500', label: 'Good' },
  { id: 'neutral', icon: Meh, color: 'text-yellow-500', label: 'Neutral' },
  { id: 'tired', icon: Brain, color: 'text-purple-500', label: 'Tired' },
  { id: 'low', icon: Frown, color: 'text-red-500', label: 'Low' },
];

export default function DailyJournal() {
  const { 
    journalEntries, visions, addJournalEntry, 
    updateJournalEntry, deleteJournalEntry, fetchJournalEntries 
  } = useStore();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);
  const [entryText, setEntryText] = useState('');
  const [selectedVisions, setSelectedVisions] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisionId, setFilterVisionId] = useState<string | 'all'>('all');
  const [viewMode, setViewMode] = useState<'daily' | 'timeline'>('daily');

  useEffect(() => {
    fetchJournalEntries();
  }, []);

  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const currentEntry = useMemo(() => 
    journalEntries.find(e => e.date === dateKey),
  [journalEntries, dateKey]);

  useEffect(() => {
    if (currentEntry) {
      setEntryText(currentEntry.note);
      setSelectedVisions(currentEntry.visionIds || []);
      setSelectedMood(currentEntry.mood);
    } else {
      setEntryText('');
      setSelectedVisions([]);
      setSelectedMood(undefined);
    }
  }, [currentEntry, dateKey]);

  // Get last 7 days for the quick selector
  const recentDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => subDays(new Date(), i)).reverse();
  }, []);

  const handleDaySelect = (date: Date) => {
    setSelectedDate(date);
    setIsEditing(false);
    setViewMode('daily');
  };

  const handleSave = async () => {
    if (currentEntry) {
      await updateJournalEntry(currentEntry.id, {
        note: entryText,
        visionIds: selectedVisions,
        mood: selectedMood
      });
    } else {
      await addJournalEntry({
        date: dateKey,
        note: entryText,
        visionIds: selectedVisions,
        mood: selectedMood
      });
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (currentEntry && confirm('Permanently erase this reflection?')) {
      await deleteJournalEntry(currentEntry.id);
      setIsEditing(false);
    }
  };

  const toggleVisionTag = (id: string) => {
    setSelectedVisions(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const filteredEntries = useMemo(() => {
    return (journalEntries || []).filter(entry => {
      const matchesSearch = (entry.note || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesVision = filterVisionId === 'all' || entry.visionIds?.includes(filterVisionId);
      return matchesSearch && matchesVision;
    });
  }, [journalEntries, searchQuery, filterVisionId]);

  return (
    <div className="w-full min-h-screen bg-bg-base/30 pt-24 pb-12 px-6 lg:px-12">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-accent/60">
              <div className="w-12 h-px bg-accent/30" />
              <Book size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.4em]">Journal</span>
            </div>
            <h2 className="text-4xl font-black text-text-main tracking-tighter uppercase leading-none">
              Daily <span className="text-accent underline decoration-accent/20">Journal</span>
            </h2>
            <p className="text-text-secondary/70 font-medium max-w-xl text-lg border-l-2 border-accent/20 pl-6">
              Connect your daily habits to your long-term visions. Track progress through intentional documentation.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-card/50 backdrop-blur-sm p-1.5 rounded-2xl border border-card-border shadow-soft">
            <button 
              onClick={() => setViewMode('daily')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                viewMode === 'daily' ? "bg-text-main text-bg-base" : "text-text-secondary hover:bg-surface-muted"
              )}
            >
              Daily View
            </button>
            <button 
              onClick={() => setViewMode('timeline')}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                viewMode === 'timeline' ? "bg-text-main text-bg-base" : "text-text-secondary hover:bg-surface-muted"
              )}
            >
              Timeline
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {viewMode === 'daily' ? (
            <motion.div
              key="daily"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Sidebar Calendars/Quick Selector */}
              <div className="lg:col-span-3 space-y-6">
                <div className="system-card bg-card p-6 border-accent/10">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-accent mb-6">Recent History</h3>
                   <div className="space-y-2">
                     {recentDays.map((day) => {
                       const hasEntry = journalEntries.some(e => e.date === format(day, 'yyyy-MM-dd'));
                       return (
                         <button
                           key={day.toISOString()}
                           onClick={() => handleDaySelect(day)}
                           className={cn(
                             "w-full flex items-center justify-between p-3 rounded-xl transition-all group",
                             isSameDay(day, selectedDate)
                               ? "bg-accent text-accent-contrast shadow-lg shadow-accent/20"
                               : "hover:bg-surface-muted text-text-secondary"
                           )}
                         >
                           <div className="flex flex-col items-start">
                             <span className={cn("text-[9px] font-bold uppercase tracking-widest", isSameDay(day, selectedDate) ? "opacity-70" : "opacity-40")}>
                               {format(day, 'EEEE')}
                             </span>
                             <span className="text-sm font-black tracking-tight">{format(day, 'MMM d, yyyy')}</span>
                           </div>
                           {hasEntry && (
                             <div className={cn("w-1.5 h-1.5 rounded-full", isSameDay(day, selectedDate) ? "bg-white" : "bg-accent")} />
                           )}
                         </button>
                       );
                     })}
                   </div>
                </div>

                <div className="system-card bg-accent/5 p-6 border-accent/10">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-accent mb-4">Filtering</h3>
                   <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/40" size={14} />
                      <input 
                        type="text" 
                        placeholder="Search thoughts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-card border border-card-border rounded-xl py-2.5 pl-10 pr-4 text-xs focus:ring-1 focus:ring-accent outline-none"
                      />
                   </div>
                   <div className="mt-4 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/40 px-2">By Vision</p>
                      <SelectMenu
                        value={filterVisionId}
                        onChange={setFilterVisionId}
                        options={[{ value: 'all', label: 'All Visions' }, ...visions.map(v => ({ value: v.id, label: v.title }))]}
                        triggerClassName="h-11 rounded-xl bg-card text-xs"
                      />
                   </div>
                </div>
              </div>

              {/* Main Journal Editor/View */}
              <div className="lg:col-span-9 space-y-6">
                <div className="system-card bg-card p-0 overflow-hidden border-accent/5 shadow-2xl shadow-accent/5">
                   <div className="p-8 lg:p-12 border-b border-card-border bg-surface-muted/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                           <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">{format(selectedDate, 'EEEE')}</h3>
                           <div className="w-1.5 h-1.5 rounded-full bg-accent/20" />
                           <span className="text-[10px] font-bold text-text-secondary/40 uppercase tracking-widest">{format(selectedDate, 'yyyy')}</span>
                        </div>
                        <h4 className="text-4xl font-black text-text-main tracking-tighter uppercase">{format(selectedDate, 'MMMM do')}</h4>
                      </div>

                      <div className="flex items-center gap-3">
                         {moods.map((mood) => (
                           <button
                             key={mood.id}
                             onClick={() => isEditing && setSelectedMood(mood.id)}
                             disabled={!isEditing}
                             className={cn(
                               "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border-2",
                               selectedMood === mood.id 
                                 ? "bg-card border-accent shadow-lg scale-110" 
                                 : "bg-surface-muted border-transparent opacity-40 hover:opacity-100",
                               !isEditing && "cursor-default"
                             )}
                             title={mood.label}
                           >
                             <mood.icon size={20} className={selectedMood === mood.id ? mood.color : "text-text-main"} />
                           </button>
                         ))}
                      </div>
                   </div>

                   <div className="p-8 lg:p-12 min-h-[500px] flex flex-col">
                      <AnimatePresence mode="wait">
                        {isEditing ? (
                          <motion.div
                            key="editing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 flex flex-col gap-8"
                          >
                            <div className="space-y-4">
                               <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/40">Associated Visions</p>
                               <div className="flex flex-wrap gap-2">
                                  {visions.map(vision => (
                                    <button
                                      key={vision.id}
                                      onClick={() => toggleVisionTag(vision.id)}
                                      className={cn(
                                        "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all",
                                        selectedVisions.includes(vision.id)
                                          ? "bg-accent border-accent text-accent-contrast shadow-md"
                                          : "bg-card border-card-border text-text-secondary hover:border-accent/40"
                                      )}
                                    >
                                      {vision.title}
                                    </button>
                                  ))}
                                  {visions.length === 0 && (
                                    <p className="text-xs text-text-secondary">No visions active. Create some in the Vision Board.</p>
                                  )}
                               </div>
                            </div>

                            <textarea
                              autoFocus
                              value={entryText}
                              onChange={(e) => setEntryText(e.target.value)}
                              placeholder="Describe your breakthrough or sync with your vision..."
                              className="w-full flex-1 bg-accent/5 p-8 rounded-[40px] text-xl font-medium text-text-main focus:outline-none border border-accent/10 focus:border-accent/40 resize-none transition-all placeholder:text-text-secondary/20 leading-relaxed min-h-[300px]"
                            />

                            <div className="flex items-center justify-between pt-6 border-t border-card-border">
                              <button
                                onClick={handleDelete}
                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-danger hover:underline p-2"
                              >
                                <Trash2 size={14} /> Delete Entry
                              </button>
                              
                              <div className="flex items-center gap-4">
                                <button
                                  onClick={() => setIsEditing(false)}
                                  className="px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-secondary hover:bg-surface-muted transition-all"
                                >
                                  Abandon
                                </button>
                                <button
                                  onClick={handleSave}
                                  className="flex items-center gap-3 px-10 py-3 rounded-2xl bg-text-main text-bg-base text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-text-main/20 hover:scale-105 active:scale-95 transition-all"
                                >
                                  <Save size={16} /> Save Entry
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
                            className="flex-1 flex flex-col"
                          >
                            {currentEntry ? (
                              <div className="space-y-12">
                                <div className="flex flex-wrap gap-3">
                                  {currentEntry.visionIds?.map(vid => {
                                    const v = visions.find(vis => vis.id === vid);
                                    return (
                                      <div key={vid} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/5 border border-accent/10 text-accent text-[10px] font-black uppercase tracking-widest">
                                        <Target size={12} /> {v?.title || 'Unknown Vision'}
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="prose prose-xl prose-accent max-w-none">
                                  <p className="text-2xl text-text-main leading-[1.6] font-medium whitespace-pre-wrap tracking-tight">
                                    {currentEntry.note}
                                  </p>
                                </div>

                                <div className="pt-12 flex items-center justify-between">
                                  <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-3 px-8 py-3 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest shadow-xl shadow-accent/20 hover:translate-y-[-2px] transition-all"
                                  >
                                    <Edit3 size={16} /> Update Entry
                                  </button>
                                  <span className="text-[10px] font-bold text-text-secondary/30 uppercase tracking-[0.2em]">
                                    Synchronized: {safeFormat(currentEntry.updatedAt || Date.now(), 'HH:mm:ss')}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-card-border rounded-[50px] bg-surface-muted/10 opacity-60">
                                <div className="w-24 h-24 rounded-full bg-accent/5 flex items-center justify-center text-accent/20 mb-8 border border-accent/10">
                                    <Edit3 size={40} />
                                </div>
                                <h5 className="text-2xl font-black text-text-main tracking-tight uppercase">No Entry</h5>
                                <p className="text-text-secondary max-w-md text-base mt-2 font-medium">
                                  No entries found for this date. Document your progress below.
                                </p>
                                <button 
                                  onClick={() => setIsEditing(true)}
                                  className="mt-12 px-12 py-4 bg-text-main text-bg-base rounded-full text-xs font-black uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-text-main/10"
                                >
                                  Start Journaling
                                </button>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                   </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-12"
            >
              {filteredEntries.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredEntries.map((entry, i) => (
                    <motion.button
                      key={entry.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
                      onClick={() => {
                        setSelectedDate(safeDate(entry.date));
                        setViewMode('daily');
                      }}
                      className="system-card bg-card p-8 group hover:border-accent/40 transition-all text-left flex flex-col h-full"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className="text-[10px] font-black uppercase tracking-widest text-accent/60">
                          {safeFormat(entry.date, 'MMM d, yyyy')}
                        </div>
                        {entry.mood && moods.find(m => m.id === entry.mood) && (
                          <div className={cn("p-2 rounded-xl bg-surface-muted", moods.find(m => m.id === entry.mood)?.color)}>
                             {(() => {
                               const M = moods.find(m => m.id === entry.mood);
                               return M ? <M.icon size={14} /> : null;
                             })()}
                          </div>
                        )}
                      </div>
                      
                      <p className="text-lg font-medium text-text-main leading-relaxed line-clamp-4 flex-1">
                        {entry.note || 'No content yet.'}
                      </p>

                      <div className="mt-8 pt-6 border-t border-card-border flex flex-wrap gap-2">
                         {entry.visionIds?.slice(0, 3).map(vid => (
                           <span key={vid} className="text-[8px] font-black uppercase tracking-widest text-accent bg-accent/5 px-2 py-1 rounded-md">
                             {visions.find(v => v.id === vid)?.title || 'Vision'}
                           </span>
                         ))}
                         {entry.visionIds && entry.visionIds.length > 3 && (
                           <span className="text-[8px] font-black text-text-secondary/40">+{entry.visionIds.length - 3}</span>
                         )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="h-[60vh] flex flex-col items-center justify-center text-center opacity-40">
                   <History size={100} className="mb-8" />
                   <h3 className="text-2xl font-black uppercase tracking-widest">No matching entries</h3>
                   <p className="text-base font-medium mt-2">Adjust your filters or start drafting your journal.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
