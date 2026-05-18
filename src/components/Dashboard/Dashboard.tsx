/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import {
  Target,
  MessageCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Brain,
  Zap,
  Play,
  CheckCircle2,
  Users,
  Search,
  BookOpen,
  Plus,
  Flame,
  Minus,
  Wallet,
  FileText,
} from "lucide-react";
import { useStore } from "../../store/useStore";
import { cn } from "../../lib/utils";
import { getLevelProgress, normalizeLegacyXp } from "../../lib/progression";
import React from "react";
import { safeArray, safeFormat } from "../../lib/safeData";
import { ProgressLogComposer } from "../Progress/ProgressLogComposer";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const CircularProgress = ({
  value,
  color,
  strokeWidth = 8,
  size = 96,
  label,
}: {
  value: number;
  color: string;
  strokeWidth?: number;
  size?: number;
  label: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset =
    circumference - ((isNaN(value) ? 0 : value) / 100) * circumference;

  return (
    <div className="bg-card-dark rounded-[2rem] p-6 flex flex-col items-center justify-center gap-4 shadow-sm w-full">
      <span className="text-sm font-semibold text-text-main tracking-wide">
        {label}
      </span>
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} className="rotate-[-90deg]">
          <circle
            stroke="rgba(var(--accent-rgb),0.16)"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute font-bold text-text-main text-2xl tracking-tighter">
          {Math.round(value || 0)}%
        </div>
      </div>
    </div>
  );
};

import { useNavigate } from "react-router-dom";

function FirstVisionPrompt({ onCreate, onFeed }: { onCreate: () => void; onFeed: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[2rem] border-2 border-accent/25 bg-accent/[0.04] p-6 shadow-xl shadow-accent/5 sm:p-8"
    >
      <div className="absolute right-0 top-0 h-48 w-48 translate-x-1/3 -translate-y-1/3 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Start here</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-text-main sm:text-3xl">Start with a Vision</h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-text-secondary">
            A Vision is a goal you are working toward. Break it into tasks and track your progress here.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <button
            onClick={onCreate}
            className="h-12 rounded-2xl bg-accent px-6 text-[10px] font-black uppercase tracking-widest text-accent-contrast shadow-lg shadow-accent/20"
          >
            Create my first Vision
          </button>
          <button
            onClick={onFeed}
            className="h-12 rounded-2xl border border-card-border bg-card px-6 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-accent"
          >
            Explore the Feed
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const {
    visions,
    user,
    circle,
    vitals,
    todos,
    toggleTodo,
    addTodo,
    deleteTodo,
    addNote,
    journalEntries,
    activities,
    isDashboardLoading,
    fetchDashboardData,
    toggleVisionTask,
    updateUser,
    notes,
    userStreak,
    weeklyActivity,
    moneyOverview,
    progressLogs,
    growthTimelineEvents,
    aiInsights,
  } = useStore();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [showProgressComposer, setShowProgressComposer] = React.useState(false);
  const [dayTaskText, setDayTaskText] = React.useState("");
  const [dayNoteTitle, setDayNoteTitle] = React.useState("");
  const [dayNoteText, setDayNoteText] = React.useState("");
  const [dayComposer, setDayComposer] = React.useState<"task" | "note">("task");
  const hasRequestedDashboardData = React.useRef(false);

  React.useEffect(() => {
    if (!hasRequestedDashboardData.current) {
      hasRequestedDashboardData.current = true;
      fetchDashboardData();
    }
  }, [fetchDashboardData]);

  const [focusNote, setFocusNote] = React.useState(user.statusNote || "");
  const [isEditingFocus, setIsEditingFocus] = React.useState(false);

  React.useEffect(() => {
    if (!isEditingFocus) {
      setFocusNote(user.statusNote || "");
    }
  }, [isEditingFocus, user.statusNote]);

  const saveFocusNote = React.useCallback(() => {
    const nextFocusNote = focusNote.trim();
    setFocusNote(nextFocusNote);
    setIsEditingFocus(false);

    if (nextFocusNote !== (user.statusNote || "")) {
      void updateUser({ statusNote: nextFocusNote });
    }
  }, [focusNote, updateUser, user.statusNote]);

  const dateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
  const currentJournalEntry = journalEntries.find((e) => e.date === dateKey);
  const keyForTimestamp = React.useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }, []);
  const selectedDayNotes = React.useMemo(
    () => notes.filter(note => !note.isDeleted && note.note_type === "normal" && keyForTimestamp(note.createdAt) === dateKey),
    [dateKey, keyForTimestamp, notes],
  );
  const selectedDayTasks = React.useMemo(
    () => todos.filter(todo => !todo.deletedAt && todo.scheduledDate === dateKey),
    [dateKey, todos],
  );
  const selectedDayLabel = selectedDate.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  const createCalendarTask = React.useCallback(() => {
    const text = dayTaskText.trim();
    if (!text) return;
    addTodo(text, dateKey);
    setDayTaskText("");
  }, [addTodo, dateKey, dayTaskText]);

  const createCalendarNote = React.useCallback(async () => {
    const content = dayNoteText.trim();
    const title = dayNoteTitle.trim() || `Note for ${selectedDayLabel}`;
    if (!content && !dayNoteTitle.trim()) return;
    const createdAt = new Date(`${dateKey}T12:00:00`).getTime();
    const note = await addNote({
      title,
      content: content || "No content yet.",
      note_type: "normal",
      visibility: "private",
      tags: ["calendar"],
      createdAt,
      updatedAt: createdAt,
    });
    if (note) {
      setDayNoteTitle("");
      setDayNoteText("");
    }
  }, [addNote, dateKey, dayNoteText, dayNoteTitle, selectedDayLabel]);

  const [showAllCircle, setShowAllCircle] = React.useState(false);
  const [showAllTasks, setShowAllTasks] = React.useState(false);

  const activeVisions = visions.filter((v) => v.status === "in-progress");
  const activeVision = activeVisions[0] || visions[0] || null;
  const allTasks = visions.flatMap((v) =>
    (v.tasks || []).map((t, idx) => ({
      ...t,
      reactKey: `${v.id}-${t.id || idx}`,
      vision: v.title,
      visionId: v.id,
    })),
  );

  const pendingTasks = allTasks.filter((t) => !t.completed);
  const displayedTasks = showAllTasks ? pendingTasks : pendingTasks.slice(0, 3);
  const activeVisionPendingTasks = pendingTasks.filter(task => !activeVision || task.visionId === activeVision.id).slice(0, 3);
  const sevenDaysAgo = React.useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.getTime();
  }, []);
  const completedTodosThisWeek = todos
    .filter(todo => todo.completed && todo.completedAt && new Date(todo.completedAt).getTime() >= sevenDaysAgo)
    .map(todo => ({ ...todo, source: 'Dashboard' }));
  const completedVisionTasksThisWeek = allTasks
    .filter(task => task.completed && task.completedAt && new Date(task.completedAt).getTime() >= sevenDaysAgo)
    .map(task => ({ ...task, source: task.vision }));
  const completedTasksThisWeek = [...completedTodosThisWeek, ...completedVisionTasksThisWeek]
    .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());
  const activeTodos = todos.filter(todo => !todo.completed && !todo.deletedAt);
  const totalXp = normalizeLegacyXp(user.level, user.xp);
  const levelProgress = getLevelProgress(totalXp);

  const displayedCircle = showAllCircle ? circle : circle.slice(0, 3);
  const currentStreak = userStreak?.currentStreak ?? user.streak ?? 0;
  const longestStreak = userStreak?.longestStreak ?? currentStreak;
  const activityDateSet = React.useMemo(() => new Set(userStreak?.activityDates || []), [userStreak?.activityDates]);
  const streakHeatmap = React.useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      days.push({
        key,
        label: date.toLocaleDateString([], { weekday: "short" }).slice(0, 1),
        active: activityDateSet.has(key),
      });
    }
    return days;
  }, [activityDateSet]);

  // Dynamic Vitals Calculation
  const now = Date.now();
  const dayStart = new Date().setHours(0, 0, 0, 0);

  const todayActivities = (activities || []).filter(
    (a) => a.timestamp > dayStart,
  );
  const tasksCompletedToday = todayActivities.filter(
    (a) => a.type === "completed",
  ).length;
  const notesAddedToday = todayActivities.filter(
    (a) =>
      a.type === "shared_note" || a.description.toLowerCase().includes("note"),
  ).length;

  const totalTasks = visions.reduce(
    (acc, v) => acc + (v.tasks?.length || 0),
    0,
  );
  const completedTasks = visions.reduce(
    (acc, v) => acc + (v.tasks?.filter((t) => t.completed).length || 0),
    0,
  );

  // Use vitals from store to allow persistence of manual adjustments
  const { focus: focusForce, energy: energyState, sleep: systemLoad } = vitals;
  const formatMoney = (amount: number) => {
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
    } catch {
      return `INR ${Math.round(amount || 0).toLocaleString('en-IN')}`;
    }
  };
  
  // Alignment is calculated from current vision data
  const globalProgress =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 5. Activity Chart Data (Last 7 Days)
  const chartData = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - index));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const day = weeklyActivity.find((item) => item.date === key);
      const output = day
        ? day.taskCount * 10
          + day.todoCount * 5
          + day.postCount * 12
          + day.noteCount * 8
          + day.journalCount * 8
          + day.visionCount * 15
          + day.focusCount * 10
        : 0;

      return {
        name: d.toLocaleDateString([], { weekday: "short" }),
        output,
        focus: Math.min(100, 30 + output * 0.8),
      };
    });
  }, [weeklyActivity]);

  const hasAnyDashboardData = visions.length > 0 || todos.length > 0 || notes.length > 0 || journalEntries.length > 0 || circle.length > 0;
  const weekStart = React.useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.getTime();
  }, []);
  const weeklyProgressLogs = progressLogs.filter(log => log.createdAt >= weekStart);
  const weeklyJournalCount = journalEntries.filter(entry => entry.createdAt >= weekStart).length;
  const weeklyMoneyUpdates = moneyOverview ? (moneyOverview.monthIncome > 0 || moneyOverview.monthExpenses > 0 || moneyOverview.monthSavings > 0 ? 1 : 0) : 0;
  const recentTimeline = growthTimelineEvents.slice(0, 3);

  if (isDashboardLoading && !hasAnyDashboardData) {
    return (
      <div className="max-w-[1400px] mx-auto space-y-5 sm:space-y-8 p-2 sm:p-6 lg:p-10">
        <div className="h-10 w-64 bg-card-dark rounded-xl animate-pulse" />
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="h-36 sm:h-48 bg-card rounded-[1.5rem] sm:rounded-[2.5rem] animate-pulse" />
              <div className="h-36 sm:h-48 bg-card rounded-[1.5rem] sm:rounded-[2.5rem] animate-pulse" />
            </div>
            <div className="h-56 sm:h-64 bg-card rounded-[1.5rem] sm:rounded-[2.5rem] animate-pulse" />
          </div>
          <div className="w-full lg:w-80 space-y-4">
             <div className="h-32 bg-card rounded-[2rem] animate-pulse" />
             <div className="h-32 bg-card rounded-[2rem] animate-pulse" />
             <div className="h-32 bg-card rounded-[2rem] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-5 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20 px-0 sm:px-4 overflow-x-hidden">
      <ProgressLogComposer
        open={showProgressComposer}
        onClose={() => setShowProgressComposer(false)}
        defaultVisionId={activeVision?.id}
      />
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4 px-1 sm:ml-2">
        <div id="dashboard-header">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent opacity-60 mb-1 block">
            System Operational
          </span>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-display tracking-tight text-text-main uppercase font-black break-words">
            HELLO, {(user.name || "Visionary").split(" ")[0]}!
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-warning/10 border border-warning/20 px-4 py-2 rounded-2xl text-warning">
             <Flame size={15} className="fill-warning/20" />
             <span className="text-[10px] font-black uppercase tracking-widest">
               {currentStreak} Day Streak
             </span>
          </div>
        <div className="flex items-center gap-2 bg-card/40 border border-card-border/50 px-4 py-2 rounded-2xl">
           <TrendingUp size={14} className="text-success" />
           <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
             {totalXp} XP - LEVEL {levelProgress.level}
           </span>
        </div>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-6">
          {visions.length === 0 && (
            <FirstVisionPrompt
              onCreate={() => navigate('/visions')}
              onFeed={() => navigate('/feed')}
            />
          )}

          {/* Today's Focus Section */}
          <div className="bg-card rounded-[1.6rem] sm:rounded-[2.5rem] p-4 sm:p-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                  <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-text-secondary opacity-60">
                    Command Center
                  </h3>
                </div>

                <div className="relative">
                  {isEditingFocus ? (
                    <div className="space-y-4">
                      <input
                        autoFocus
                        type="text"
                        value={focusNote}
                        onChange={(e) => setFocusNote(e.target.value)}
                        onBlur={saveFocusNote}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            saveFocusNote();
                          }
                        }}
                        className="text-xl lg:text-3xl font-display font-medium text-text-main bg-transparent border-b-2 border-accent outline-none w-full pb-2"
                        placeholder="What are we hunting today?"
                      />
                      <p className="text-[10px] text-text-secondary opacity-50 uppercase tracking-widest">Press Enter to lock trajectory</p>
                    </div>
                  ) : (
                    <div 
                      onClick={() => setIsEditingFocus(true)}
                      className="cursor-pointer group/focus"
                    >
                      <h2 className="text-xl lg:text-3xl font-display font-medium text-text-main leading-tight group-hover/focus:text-accent transition-colors">
                        {user.statusNote || activeVision?.title || "Choose today’s proof of progress"}
                      </h2>
                      <p className="mt-2 max-w-xl text-xs font-semibold text-text-secondary/70">
                        {activeVision
                          ? "Pick the next action, log proof, and keep this Vision moving."
                          : "Create a Vision so tasks, notes, journals, proof, and Circle activity connect in one loop."}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid gap-2 pt-1 sm:grid-cols-3">
                  {(activeVisionPendingTasks.length > 0 ? activeVisionPendingTasks : pendingTasks.slice(0, 3)).map(task => (
                    <button
                      key={task.reactKey}
                      type="button"
                      onClick={() => navigate('/visions')}
                      className="rounded-2xl border border-card-border bg-app-container/80 p-3 text-left transition-colors hover:border-accent/40"
                    >
                      <p className="text-[8px] font-black uppercase tracking-widest text-text-secondary/45 line-clamp-1">{task.vision}</p>
                      <p className="mt-1.5 line-clamp-2 text-xs font-bold text-text-main">{task.text}</p>
                    </button>
                  ))}
                  {pendingTasks.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-card-border bg-app-container/80 p-3 text-xs font-semibold text-text-secondary sm:col-span-3">
                      Add tasks to a Vision so the command center can suggest your next action.
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProgressComposer(true)}
                    className="flex h-10 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-[9px] font-black uppercase tracking-widest text-accent-contrast shadow-lg shadow-accent/15"
                  >
                    <Plus size={13} />
                    Log Progress
                  </button>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest opacity-40">Trajectory</span>
                    <span className="text-sm font-bold text-text-main">Day {user.streak || 1} - {user.rank || 'Explorer'}</span>
                  </div>
                  <div className="w-px h-8 bg-card-border/50" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest opacity-40">System Efficiency</span>
                    <span className="text-sm font-bold text-text-main">High Performance</span>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-auto shrink-0 bg-card-dark rounded-[1.5rem] sm:rounded-[2rem] p-4 flex flex-col gap-3 md:min-w-[210px] border border-card-border/50">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary mb-1">Streak Fire</p>
                    <p className="text-3xl font-display font-black text-warning">{currentStreak}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-warning/10 border border-warning/20 flex items-center justify-center text-warning">
                    <Flame size={24} className="fill-warning/20" />
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {streakHeatmap.map(day => (
                    <div
                      key={day.key}
                      title={day.key}
                      className={cn(
                        "h-6 rounded-lg border flex items-center justify-center text-[8px] font-black",
                        day.active
                          ? "bg-warning text-white border-warning"
                          : "bg-app-container text-text-secondary/35 border-card-border"
                      )}
                    >
                      {day.label}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                  Longest streak: {longestStreak} days
                </p>
                <div className="flex gap-1.5">
                  {[7, 30, 100].map(milestone => (
                    <div
                      key={milestone}
                      className={cn(
                        "flex-1 h-7 rounded-lg border flex items-center justify-center text-[8px] font-black uppercase tracking-wider",
                        longestStreak >= milestone
                          ? "border-warning bg-warning/10 text-warning"
                          : "border-card-border bg-app-container text-text-secondary/40"
                      )}
                    >
                      {milestone}d
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full md:w-auto shrink-0 bg-card-dark rounded-[1.5rem] sm:rounded-[2rem] p-4 flex flex-col items-center gap-3 md:min-w-[170px] border border-card-border/50">
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary mb-1">Total Progress</p>
                  <p className="text-3xl font-display font-black text-accent">{globalProgress}%</p>
                </div>
                <div className="w-full bg-accent/10 h-2 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${globalProgress}%` }}
                    className="bg-accent h-full shadow-[0_0_15px_rgba(255,106,136,0.3)]" 
                  />
                </div>
                <p className="text-[11px] font-semibold text-text-secondary text-center">
                  {completedTasks} / {totalTasks} Milestones Secured
                </p>
              </div>
            </div>

            <div className="relative z-10 mt-6 rounded-2xl border border-card-border/60 bg-card-dark/80 px-4 py-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-[10px] font-black uppercase tracking-widest text-text-secondary">
                <span>Level {levelProgress.level}</span>
                <span>{totalXp} / {levelProgress.nextThreshold} XP - {levelProgress.xpToNext} XP to next</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-surface-muted overflow-hidden">
                <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${levelProgress.progress}%` }} />
              </div>
            </div>
          </div>

          {/* Top Row: Linked Teachers / Events */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Linked Circle (Teachers in the image) */}
            <div className="bg-card rounded-[2.5rem] p-6 shadow-sm flex flex-col gap-4">
              <h3 className="text-[15px] font-semibold text-text-secondary mb-2">
                Linked Circle
              </h3>
              <div className="space-y-4">
                {displayedCircle.length > 0 ? (
                  displayedCircle.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between"
                    >
                      <div
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() =>
                          useStore.getState().setSelectedProfileId(member.id)
                        }
                      >
                        <div className="relative">
                          <img
                            src={member.avatar || undefined}
                            alt={member.name}
                            className="w-10 h-10 rounded-full object-cover transition-transform group-hover:scale-105"
                          />
                          {member.isGrinding && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-card" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-main leading-tight group-hover:text-accent transition-colors">
                            {member.name}
                          </p>
                          <p className="text-[11px] text-text-secondary mt-0.5">
                            {member.role ||
                              (member.isGrinding ? "Active now" : "Offline")}
                          </p>
                        </div>
                      </div>
                      <div 
                        className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent cursor-pointer hover:bg-accent hover:text-accent-contrast transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          useStore.getState().setSelectedProfileId(member.id);
                        }}
                      >
                        <MessageCircle
                          size={14}
                          className="fill-current bg-transparent"
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <Users
                      size={24}
                      className="text-text-secondary opacity-20 mb-2"
                    />
                    <p className="text-xs font-semibold text-text-secondary opacity-60">
                      No connections yet.
                    </p>
                    <p className="text-[10px] text-accent font-bold mt-1 uppercase tracking-widest cursor-pointer hover:underline">
                      Try making new connections!
                    </p>
                  </div>
                )}
              </div>
              {circle.length > 3 && (
                <button
                  onClick={() => setShowAllCircle(!showAllCircle)}
                  className="text-[11px] font-semibold text-text-main text-right mt-2 hover:text-accent transition-colors flex items-center justify-end gap-1 underline underline-offset-2 opacity-60"
                >
                  {showAllCircle ? "Show less" : "See more"}{" "}
                  <ChevronRight
                    size={12}
                    className={cn(
                      "transition-transform",
                      showAllCircle && "rotate-90",
                    )}
                  />
                </button>
              )}
            </div>

            {/* Upcoming Events / Tasks */}
            <div className="bg-card rounded-[2.5rem] p-6 shadow-sm flex flex-col gap-4">
              <h3 className="text-[15px] font-semibold text-text-secondary mb-2">
                Upcoming Tasks
              </h3>
              <div
                className={cn(
                  "space-y-3 transition-all",
                  showAllTasks
                    ? "max-h-[400px] overflow-y-auto custom-scrollbar pr-2"
                    : "",
                )}
              >
                {displayedTasks.length > 0 ? (
                  displayedTasks.map((task, idx) => (
                    <div
                      key={task.reactKey || `${task.visionId}-${task.id || idx}`}
                      className="bg-app-container rounded-[1.5rem] p-3 flex items-center gap-4 cursor-pointer hover:bg-surface-muted transition-all group"
                      onClick={() =>
                        toggleVisionTask(task.visionId, task.id || "")
                      }
                    >
                      <div
                        className={cn(
                          "w-12 h-12 bg-card rounded-[1.2rem] flex items-center justify-center shrink-0 border border-transparent group-hover:border-accent/10",
                          task.completed ? "bg-success/10" : "",
                        )}
                      >
                        <Zap
                          size={20}
                          className={cn(
                            task.completed
                              ? "text-success fill-success/20"
                              : "text-accent fill-accent/20",
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1 relative">
                        <p
                          className={cn(
                            "text-xs font-semibold text-text-main truncate line-clamp-2 leading-tight",
                            task.completed && "line-through opacity-50",
                          )}
                        >
                          {task.text}
                        </p>
                        <p className="text-[10px] text-text-secondary mt-1 uppercase tracking-wider">
                          {task.vision}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-text-secondary opacity-60">
                    No pending tasks. Great job!
                  </div>
                )}
              </div>
              {pendingTasks.length > 3 && (
                <button
                  onClick={() => setShowAllTasks(!showAllTasks)}
                  className="text-[11px] font-semibold text-text-main text-right mt-auto hover:text-accent transition-colors flex items-center justify-end gap-1 underline underline-offset-2 opacity-60"
                >
                  {showAllTasks ? "Show less" : "See more"}{" "}
                  <ChevronRight
                    size={12}
                    className={cn(
                      "transition-transform",
                      showAllTasks && "rotate-90",
                    )}
                  />
                </button>
              )}
            </div>
          </div>

          {/* Middle Row: Schedule Log */}
          <div className="bg-card rounded-[2.5rem] p-6 shadow-sm flex flex-col md:flex-row gap-10 items-stretch">
            <div className="w-full md:w-auto bg-app-container rounded-[2rem] p-6 shrink-0 flex flex-col gap-4 min-w-[280px]">
              <div className="flex items-center justify-between px-2 text-text-main pb-2">
                <button
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setSelectedDate(newDate);
                  }}
                  className="hover:text-accent transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-bold capitalize tracking-wide">
                  {selectedDate.toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <button
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setSelectedDate(newDate);
                  }}
                  className="hover:text-accent transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-y-3 gap-x-2 text-center text-xs mt-2 relative">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <span
                    key={`header-${i}`}
                    className="font-semibold text-text-secondary/60 mb-2"
                  >
                    {d}
                  </span>
                ))}
                {(() => {
                  const year = selectedDate.getFullYear();
                  const month = selectedDate.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();

                  const days = [];
                  for (let i = 0; i < firstDay; i++) {
                    days.push(
                      <div key={`empty-${i}`} className="aspect-square" />,
                    );
                  }
                  for (let i = 1; i <= daysInMonth; i++) {
                    const dateObj = new Date(year, month, i);
                    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
                    const hasJournal = journalEntries.some(
                      (e) => e.date === dateKey,
                    );
                    const hasNote = notes.some(
                      (note) => !note.isDeleted && note.note_type === "normal" && keyForTimestamp(note.createdAt) === dateKey,
                    );
                    const hasTask = todos.some(
                      (todo) => !todo.deletedAt && todo.scheduledDate === dateKey,
                    );
                    const isSelected = selectedDate.getDate() === i;

                    days.push(
                      <div
                        key={i}
                        onClick={() => setSelectedDate(dateObj)}
                        className={cn(
                          "relative aspect-square flex items-center justify-center font-bold rounded-full cursor-pointer transition-all text-sm",
                          isSelected
                            ? "bg-accent text-accent-contrast shadow-md shadow-accent/30 scale-110"
                            : "text-text-main hover:bg-surface-muted",
                        )}
                      >
                        {i}
                        {(hasJournal || hasNote || hasTask) && !isSelected && (
                          <div className="absolute top-1 right-1.5 flex gap-0.5">
                            {hasTask && <span className="w-1.5 h-1.5 bg-success rounded-full border border-card" />}
                            {hasNote && <span className="w-1.5 h-1.5 bg-accent rounded-full border border-card" />}
                            {hasJournal && <span className="w-1.5 h-1.5 bg-warning rounded-full border border-card" />}
                          </div>
                        )}
                      </div>,
                    );
                  }
                  return days;
                })()}
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-4 w-full h-full min-h-[300px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 ml-2">
                  <Calendar size={18} className="text-text-secondary" />
                  <h3 className="text-[15px] font-semibold text-text-secondary">
                    Day Planner
                  </h3>
                </div>
                <button
                  onClick={() => navigate("/library")}
                  className="text-[10px] font-bold tracking-widest uppercase text-accent bg-accent/10 px-3 py-1 rounded-full hover:bg-accent/20 transition-colors"
                >
                  Open Library
                </button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[minmax(360px,1.25fr)_minmax(260px,0.95fr)] gap-5 h-full flex-1 items-start">
                <div className="bg-app-container rounded-[2rem] p-5 sm:p-6 w-full flex flex-col gap-5 relative overflow-hidden border border-card-border/50 min-h-[260px]">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-accent">Selected Day</p>
                      <h4 className="text-2xl sm:text-3xl font-black text-text-main tracking-tight mt-1 leading-tight break-words">{selectedDayLabel}</h4>
                    </div>
                    <div className="flex w-full sm:w-auto shrink-0 rounded-2xl bg-card border border-card-border p-1">
                      <button
                        onClick={() => setDayComposer("task")}
                        className={cn("h-10 flex-1 sm:flex-none px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", dayComposer === "task" ? "bg-accent text-accent-contrast" : "text-text-secondary hover:text-text-main")}
                      >
                        Task
                      </button>
                      <button
                        onClick={() => setDayComposer("note")}
                        className={cn("h-10 flex-1 sm:flex-none px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", dayComposer === "note" ? "bg-accent text-accent-contrast" : "text-text-secondary hover:text-text-main")}
                      >
                        Note
                      </button>
                    </div>
                  </div>

                  {dayComposer === "task" ? (
                    <div className="space-y-3">
                      <label className="block space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Task for this day</span>
                        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2">
                          <input
                            value={dayTaskText}
                            onChange={(event) => setDayTaskText(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") createCalendarTask();
                            }}
                            placeholder="e.g. Record launch demo"
                            className="min-w-0 h-12 rounded-2xl bg-card border border-card-border px-4 text-sm font-semibold text-text-main outline-none focus:border-accent"
                          />
                          <button
                            onClick={createCalendarTask}
                            disabled={!dayTaskText.trim()}
                            className="h-12 px-5 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest disabled:opacity-40 flex items-center justify-center gap-2 whitespace-nowrap"
                          >
                            <Plus size={14} /> Add
                          </button>
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <input
                        value={dayNoteTitle}
                        onChange={(event) => setDayNoteTitle(event.target.value)}
                        placeholder="Note title"
                        className="w-full h-11 rounded-2xl bg-card border border-card-border px-4 text-sm font-semibold text-text-main outline-none focus:border-accent"
                      />
                      <textarea
                        value={dayNoteText}
                        onChange={(event) => setDayNoteText(event.target.value)}
                        placeholder="Write a note for this day..."
                        className="w-full min-h-24 rounded-2xl bg-card border border-card-border px-4 py-3 text-sm font-medium text-text-main outline-none resize-none focus:border-accent"
                      />
                      <button
                        onClick={createCalendarNote}
                        disabled={!dayNoteTitle.trim() && !dayNoteText.trim()}
                        className="w-full h-12 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest disabled:opacity-40 flex items-center justify-center gap-2"
                      >
                        <Plus size={14} /> Add Note
                      </button>
                    </div>
                  )}

                  <div className="mt-auto pt-2 border-t border-card-border/60">
                    <div className="flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-widest text-text-secondary">
                      <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Task</span>
                      <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" /> Note</span>
                      <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" /> Journal</span>
                    </div>
                  </div>
                </div>

                <div className="w-full bg-app-container rounded-[2rem] p-5 sm:p-6 flex flex-col gap-4 relative overflow-hidden h-auto">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-black text-text-main uppercase tracking-[0.2em] opacity-40">
                      Day Items
                    </h4>
                    <Target size={14} className="text-accent/40" />
                  </div>

                  <div className="flex flex-col gap-3 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                    {selectedDayTasks.length === 0 && selectedDayNotes.length === 0 && !currentJournalEntry ? (
                      <p className="text-[11px] font-medium text-text-secondary leading-relaxed px-1">
                        No tasks or notes planned for this day yet. Add one from the panel beside the calendar.
                      </p>
                    ) : (
                      <>
                        {selectedDayTasks.map((task) => (
                          <div key={task.id} className="flex items-start gap-3 rounded-2xl bg-card border border-card-border p-3">
                            <button
                              onClick={() => toggleTodo(task.id)}
                              disabled={task.completed}
                              className={cn("mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0", task.completed ? "bg-success border-success text-white" : "border-card-border hover:border-accent")}
                              aria-label="Complete task"
                            >
                              {task.completed && <CheckCircle2 size={13} />}
                            </button>
                            <div className="min-w-0">
                              <p className={cn("text-xs font-bold text-text-main leading-snug", task.completed && "line-through opacity-60")}>{task.text}</p>
                              <p className="text-[9px] font-black uppercase tracking-widest text-success mt-1">Task</p>
                            </div>
                          </div>
                        ))}
                        {selectedDayNotes.map((note) => (
                          <button
                            key={note.id}
                            onClick={() => navigate(`/library?tab=notes&note=${note.id}`)}
                            className="text-left rounded-2xl bg-card border border-card-border p-3 hover:border-accent/30 transition-all"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <FileText size={14} className="text-accent" />
                              <p className="text-xs font-bold text-text-main truncate">{note.title}</p>
                            </div>
                            <p className="text-[11px] text-text-secondary line-clamp-2">{note.content || "No content yet."}</p>
                          </button>
                        ))}
                        {currentJournalEntry && (
                          <button
                            onClick={() => navigate("/library?tab=journal")}
                            className="text-left rounded-2xl bg-card border border-warning/20 p-3 hover:border-warning/40 transition-all"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <BookOpen size={14} className="text-warning" />
                              <p className="text-xs font-bold text-text-main truncate">Journal entry</p>
                            </div>
                            <p className="text-[11px] text-text-secondary line-clamp-2">{currentJournalEntry.note}</p>
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => navigate("/library")}
                    className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mt-6 border border-accent/20 rounded-xl py-3 hover:bg-accent/5 transition-all text-center w-full"
                  >
                    Open Library
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row: My Projects (Visions) */}
          {/* Activity Chart Section */}
          <div className="bg-card rounded-[2.5rem] p-6 shadow-sm flex flex-col gap-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <TrendingUp size={18} className="text-text-secondary" />
                <h3 className="text-[15px] font-semibold text-text-secondary">
                  Activity
                </h3>
              </div>
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest bg-accent/5 px-3 py-1 rounded-full">
                Weekly Output
              </div>
            </div>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="colorOutput"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--accent)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--accent)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 10,
                      fontWeight: 700,
                      fill: "var(--text-secondary)",
                      opacity: 0.5,
                    }}
                    dy={10}
                  />
                  <YAxis hide domain={[0, "dataMax + 20"]} />
                  <Area
                    type="monotone"
                    dataKey="output"
                    stroke="var(--accent)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorOutput)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* My Projects (Visions) */}
          <div className="bg-card rounded-[2.5rem] p-6 shadow-sm flex flex-col gap-6">
            <h3 className="text-[15px] font-semibold text-text-secondary ml-2">
              My projects
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {activeVisions.length > 0 ? (
                activeVisions.slice(0, 2).map((vision, i) => (
                  <div
                    key={`${vision.id || 'vision'}-${i}`}
                    className="relative h-[180px] rounded-[2rem] overflow-hidden group cursor-pointer"
                    onClick={() => navigate('/visions')}
                  >
                    <img
                      src={`https://images.unsplash.com/photo-${i % 2 === 0 ? "1542626990-ce4cb81bcf76?q=80&w=600" : "1519389953810-c5eaa819266a?q=80&w=600"}`}
                      alt="Vision Background"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-overlay group-hover:bg-overlay/80 transition-colors" />
                    <div className="absolute bottom-0 left-0 p-5 text-accent-contrast z-10 w-full bg-gradient-to-t from-overlay to-transparent pt-12">
                      <h4 className="font-semibold text-[15px] truncate tracking-wide">
                        {vision.title}
                      </h4>
                      <div className="w-full bg-accent-contrast/30 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div
                          className="bg-accent-contrast h-full transition-all"
                          style={{ width: `${vision.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 h-[180px] rounded-[2rem] border-2 border-dashed border-card-border flex items-center justify-center text-text-secondary opacity-60">
                  Create a Vision to see it here.
                </div>
              )}
            </div>
          </div>

          {/* Recent Notes Section */}
          <div className="bg-card rounded-[2.5rem] p-6 shadow-sm flex flex-col gap-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <BookOpen size={18} className="text-text-secondary" />
                <h3 className="text-[15px] font-semibold text-text-secondary">
                  Recent Notes
                </h3>
              </div>
              <button 
                onClick={() => navigate('/library')}
                className="text-[10px] font-black text-accent uppercase tracking-widest hover:underline"
              >
                View Notes
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {notes.slice(0, 3).map((note) => (
                <div 
                  key={note.id}
                  onClick={() => navigate('/library')}
                  className="bg-app-container rounded-2xl p-4 border border-transparent hover:border-accent/10 transition-all cursor-pointer group"
                >
                  <h4 className="text-[13px] font-bold text-text-main mb-2 truncate group-hover:text-accent transition-colors">
                    {note.title || 'Untitled Note'}
                  </h4>
                  <p className="text-[11px] text-text-secondary line-clamp-3 leading-relaxed">
                    {note.content?.replace(/[#*`]/g, '').slice(0, 100) || 'No content...'}
                  </p>
                </div>
              ))}
              {notes.length === 0 && (
                <div className="col-span-full py-10 flex flex-col items-center justify-center text-center opacity-40">
                  <Brain size={32} className="mb-2 text-text-secondary" />
                  <p className="text-xs font-bold text-text-main uppercase tracking-widest">The vault is empty</p>
                  <p className="text-[10px] text-text-secondary">Capture your insights to build systemic knowledge.</p>
                </div>
              )}
            </div>
          </div>

          {/* Wallet Snapshot */}
          <div className="bg-card rounded-[2.5rem] p-6 shadow-sm flex flex-col gap-5 border border-card-border/40">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-text-main">Wallet</h3>
                    <p className="text-[11px] font-semibold text-text-secondary/65">Spending and savings for your Visions</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/wallet')}
                className="h-10 px-4 rounded-xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest shrink-0"
              >
                Open Wallet
              </button>
            </div>

            {moneyOverview ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-app-container border border-card-border/60 p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/50">Saved this month</p>
                  <p className="mt-2 text-lg font-black text-text-main">{formatMoney(moneyOverview.monthSavings)}</p>
                </div>
                <div className="rounded-2xl bg-app-container border border-card-border/60 p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/50">Income</p>
                  <p className="mt-2 text-lg font-black text-success">{formatMoney(moneyOverview.monthIncome)}</p>
                </div>
                <div className="rounded-2xl bg-app-container border border-card-border/60 p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/50">Expenses</p>
                  <p className="mt-2 text-lg font-black text-danger">{formatMoney(moneyOverview.monthExpenses)}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-app-container border border-dashed border-card-border p-5">
                <p className="text-sm font-semibold text-text-main">Track spending and savings for your Visions.</p>
                <p className="mt-1 text-xs text-text-secondary">Add income, expenses, goals, and subscriptions when you are ready.</p>
              </div>
            )}

            {moneyOverview?.topGoal && (
              <div className="rounded-2xl bg-app-container border border-card-border/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold text-text-secondary truncate">Top Goal: {moneyOverview.topGoal.title}</span>
                  <span className="text-[10px] font-black text-accent">
                    {Math.min(100, Math.round((moneyOverview.topGoal.currentAmount / Math.max(1, moneyOverview.topGoal.targetAmount)) * 100))}%
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.min(100, Math.round((moneyOverview.topGoal.currentAmount / Math.max(1, moneyOverview.topGoal.targetAmount)) * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar stats panel */}
        <div className="w-full lg:w-[300px] shrink-0 flex flex-col gap-4">
          <div className="rounded-[2rem] border border-card-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-accent">Ecosystem Snapshot</p>
                <h3 className="mt-1 text-lg font-black uppercase tracking-tight text-text-main">This Week</h3>
              </div>
              <Brain size={18} className="text-accent" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                ['Proof', weeklyProgressLogs.length],
                ['Tasks', completedTasksThisWeek.length],
                ['Reflect', weeklyJournalCount],
                ['AI', aiInsights.length],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-card-border bg-app-container p-3">
                  <p className="text-xl font-black leading-none text-text-main">{value}</p>
                  <p className="mt-1.5 text-[8px] font-black uppercase tracking-widest text-text-secondary/50">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-2xl border border-card-border bg-app-container p-3">
              <p className="text-[8px] font-black uppercase tracking-widest text-text-secondary/50">Resources</p>
              <p className="mt-1 text-xs font-bold leading-5 text-text-main">
                {weeklyMoneyUpdates ? 'Wallet activity is linked to active resources.' : 'No resource updates linked this week.'}
              </p>
            </div>
            {recentTimeline.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {recentTimeline.map(event => (
                  <div key={event.id} className="flex items-center gap-2 text-[11px] font-semibold text-text-secondary">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    <span className="line-clamp-1">{event.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card rounded-[2rem] p-5 flex flex-col shadow-sm relative">
          <div className="flex flex-col gap-4 w-full h-auto">
            <div className="flex items-center justify-between pb-2 border-b border-card-border/60">
              <h3 className="text-[14px] font-bold text-text-main">
                To-Do List
              </h3>
              <span className="text-[10px] uppercase tracking-wider text-text-secondary/60 font-bold">
                {activeTodos.length} pending
              </span>
            </div>

            <div className="flex flex-col gap-1.5 min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar">
              {activeTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-start gap-3 hover:bg-surface-muted p-2 rounded-xl transition-colors cursor-pointer group"
                  onClick={() => toggleTodo(todo.id)}
                >
                  <div
                    className={cn(
                      "w-4 h-4 mt-0.5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                      todo.completed
                        ? "bg-success border-success text-accent-contrast"
                        : "border-text-secondary/40 group-hover:border-accent",
                    )}
                  >
                    {todo.completed && <CheckCircle2 size={10} />}
                  </div>
                  <span
                    className={cn(
                      "text-[13px] font-medium flex-1 min-w-0",
                      todo.completed
                        ? "text-text-secondary line-through opacity-60"
                        : "text-text-main",
                      "leading-tight",
                    )}
                  >
                    {todo.text}
                  </span>
                  <button
                    type="button"
                    aria-label="Delete task"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteTodo(todo.id);
                    }}
                    className="w-8 h-8 -mt-1 rounded-lg text-text-secondary/35 hover:text-danger hover:bg-danger/10 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all shrink-0"
                  >
                    <Minus size={15} />
                  </button>
                </div>
              ))}
              {activeTodos.length === 0 && (
                <div className="text-center py-6 text-[11px] text-text-secondary opacity-60">
                  No tasks. Press Enter below to add one.
                </div>
              )}
            </div>

            <div className="pt-4 relative">
              <input
                type="text"
                placeholder="Add new task..."
                className="w-full bg-app-container border-2 border-transparent hover:border-card-border rounded-xl px-4 py-3 text-sm font-medium focus:ring-0 focus:border-accent outline-none text-text-main placeholder:text-text-secondary/40 transition-all shadow-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    addTodo(e.currentTarget.value.trim());
                    e.currentTarget.value = "";
                  }
                }}
              />
              <Zap
                size={14}
                className="absolute right-4 top-1/2 mt-1 -translate-y-1/2 text-accent/40"
              />
            </div>

            <div className="pt-4 border-t border-card-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[12px] font-bold text-text-main">Completed This Week</h4>
                <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary/45">
                  {completedTasksThisWeek.length}
                </span>
              </div>
              <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                {completedTasksThisWeek.map(todo => (
                  <div key={todo.id} className="flex items-start gap-2 rounded-xl bg-success/5 border border-success/10 p-2">
                    <CheckCircle2 size={14} className="text-success mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-text-main line-through opacity-75 truncate">{todo.text}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/45">
                        {todo.completedAt ? safeFormat(todo.completedAt, 'MMM d') : 'Completed'} - {todo.source} - +25 XP
                      </p>
                    </div>
                  </div>
                ))}
                {completedTasksThisWeek.length === 0 && (
                  <p className="text-[11px] text-text-secondary/55 text-center py-3">
                    Completed tasks will stay here for 7 days.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <CircularProgress
              value={focusForce}
              color="#FF6A88"
              label="Focus Force"
            />
            <CircularProgress
              value={globalProgress}
              color="#5BDABA"
              label="Alignment"
            />
            <CircularProgress
              value={energyState}
              color="#FFBB5C"
              label="Energy State"
            />
            <CircularProgress
              value={systemLoad}
              color="#FACD4C"
              label="System Load"
            />
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
