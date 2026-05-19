import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Edit3, Save, X, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useStore } from '../../store/useStore';
import { safeFormat } from '../../lib/dateUtils';

export default function CalendarTracker() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { dateNotes, setDateNote, todos, notes, journalEntries } = useStore();
  const [editingNote, setEditingNote] = useState('');

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth)),
  });
  const activityByDate = useMemo(() => {
    const activity: Record<string, { task: boolean; note: boolean; journal: boolean }> = {};
    const ensureDay = (key: string) => {
      activity[key] ||= { task: false, note: false, journal: false };
      return activity[key];
    };

    Object.keys(dateNotes).forEach(key => {
      if (dateNotes[key]) ensureDay(key).note = true;
    });
    todos.forEach(todo => {
      if (!todo.deletedAt && todo.scheduledDate) ensureDay(todo.scheduledDate).task = true;
    });
    notes.forEach(note => {
      if (!note.isDeleted && note.note_type === 'normal') {
        const noteDateKey = safeFormat(note.createdAt, 'yyyy-MM-dd', '');
        if (noteDateKey) ensureDay(noteDateKey).note = true;
      }
    });
    journalEntries.forEach(entry => {
      if (entry.date) ensureDay(entry.date).journal = true;
    });

    return activity;
  }, [dateNotes, journalEntries, notes, todos]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dateKey = format(date, 'yyyy-MM-dd');
    setEditingNote(dateNotes[dateKey] || '');
  };

  const saveNote = () => {
    if (selectedDate) {
      setDateNote(format(selectedDate, 'yyyy-MM-dd'), editingNote);
      setSelectedDate(null);
    }
  };

  return (
    <div className="col-span-12 lg:col-span-6 system-card p-5 sm:p-6 bg-card flex flex-col h-full min-h-[430px]">
      <div className="flex flex-col gap-4 mb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/5 flex items-center justify-center text-accent">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-text-main">Strategy Calendar</h3>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">Temporal Alignment Ledger</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-card-border bg-app-container text-text-secondary transition-colors hover:border-accent/40 hover:text-accent"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="rounded-2xl border border-card-border bg-app-container px-4 py-2 text-xs font-black uppercase tracking-widest text-text-main shadow-sm">
            {format(currentMonth, 'MMM')}
          </span>
          <span className="rounded-2xl border border-card-border bg-app-container px-4 py-2 text-xs font-black uppercase tracking-widest text-text-main shadow-sm">
            {format(currentMonth, 'yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-card-border bg-app-container text-text-secondary transition-colors hover:border-accent/40 hover:text-accent"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-center gap-3 text-[9px] font-black uppercase tracking-widest text-text-secondary/60">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" />Task</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" />Note</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" />Journal</span>
      </div>

      <div className="grid grid-cols-7 gap-1.5 flex-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-[10px] font-black uppercase tracking-widest text-text-secondary/40 text-center mb-1">
            {day}
          </div>
        ))}
        {days.map((day, idx) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayActivity = activityByDate[dateKey];
          const hasTask = !!dayActivity?.task;
          const hasNote = !!dayActivity?.note;
          const hasJournal = !!dayActivity?.journal;
          const hasActivity = hasTask || hasNote || hasJournal;
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <motion.button
              key={dateKey}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDateClick(day)}
              className={cn(
                "aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all border font-black focus:outline-none focus:ring-2 focus:ring-accent/30",
                !isSameMonth(day, currentMonth) ? "opacity-20 pointer-events-none" : "opacity-100",
                isSelected
                  ? "border-accent bg-accent text-accent-contrast shadow-lg shadow-accent/20"
                  : "border-card-border bg-app-container text-text-main hover:-translate-y-0.5 hover:border-accent/35 hover:bg-surface-muted",
                !isSelected && hasTask && !hasNote && !hasJournal && "border-success/35 bg-success/10",
                !isSelected && hasNote && !hasTask && !hasJournal && "border-accent/35 bg-accent/10",
                !isSelected && hasJournal && !hasTask && !hasNote && "border-warning/35 bg-warning/10",
                isToday(day) && !isSelected && "ring-1 ring-accent/30"
              )}
            >
              <span className="text-sm font-bold">{format(day, 'd')}</span>
              {hasActivity && (
                <div className={cn("absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-0.5", isSelected && "opacity-90")}>
                  {hasTask && <span className={cn("h-1.5 w-1.5 rounded-full", isSelected ? "bg-accent-contrast" : "bg-success")} />}
                  {hasNote && <span className={cn("h-1.5 w-1.5 rounded-full", isSelected ? "bg-accent-contrast" : "bg-accent")} />}
                  {hasJournal && <span className={cn("h-1.5 w-1.5 rounded-full", isSelected ? "bg-accent-contrast" : "bg-warning")} />}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute inset-0 bg-card/95 backdrop-blur-sm z-50 p-8 flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-xl font-bold tracking-tight text-text-main">
                  {format(selectedDate, 'MMMM do, yyyy')}
                </h4>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">Journaling Node</p>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-2 hover:bg-surface-muted rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <textarea
              value={editingNote}
              onChange={(e) => setEditingNote(e.target.value)}
              placeholder="Record your tactical breakthroughs or mental blockers..."
              className="flex-1 w-full bg-bg-base/50 rounded-3xl p-6 text-sm font-medium focus:outline-none border border-card-border focus:border-accent/30 resize-none transition-colors"
              autoFocus
            />

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setSelectedDate(null)}
                className="flex-1 h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest text-text-secondary hover:bg-surface-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveNote}
                className="flex-1 h-12 rounded-xl bg-text-main text-accent-contrast text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-accent/10 flex items-center justify-center gap-2"
              >
                <Save size={14} /> Solidify Note
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
