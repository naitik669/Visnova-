import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Edit3, Save, X, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useStore } from '../../store/useStore';

export default function CalendarTracker() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { dateNotes, setDateNote } = useStore();
  const [editingNote, setEditingNote] = useState('');

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth)),
  });

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
    <div className="col-span-12 lg:col-span-6 system-card p-8 bg-card flex flex-col h-full min-h-[450px]">
      <div className="flex items-center justify-between mb-8">
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
            className="p-2 hover:bg-surface-muted rounded-lg transition-colors text-text-secondary"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-xs font-bold uppercase tracking-wider min-w-[100px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-surface-muted rounded-lg transition-colors text-text-secondary"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 flex-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-[10px] font-black uppercase tracking-widest text-text-secondary/40 text-center mb-2">
            {day}
          </div>
        ))}
        {days.map((day, idx) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const hasNote = !!dateNotes[dateKey];
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <motion.button
              key={dateKey}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDateClick(day)}
              className={cn(
                "aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all border",
                !isSameMonth(day, currentMonth) ? "opacity-20 pointer-events-none" : "opacity-100",
                isToday(day) ? "border-accent bg-accent/5 text-accent" : "border-transparent hover:bg-surface-muted text-text-secondary hover:text-text-main",
                isSelected ? "ring-2 ring-accent ring-offset-2" : "",
                hasNote && !isToday(day) ? "bg-accent/10 border-accent/20" : ""
              )}
            >
              <span className="text-sm font-bold">{format(day, 'd')}</span>
              {hasNote && (
                <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-accent" />
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
