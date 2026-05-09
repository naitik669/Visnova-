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
} from "lucide-react";
import { useStore } from "../../store/useStore";
import { cn } from "../../lib/utils";
import React from "react";
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

export default function Dashboard() {
  const {
    visions,
    user,
    circle,
    vitals,
    todos,
    toggleTodo,
    addTodo,
    journalEntries,
    activities,
    isDashboardLoading,
    fetchDashboardData,
    toggleVisionTask,
    notes,
    userStreak,
    weeklyActivity,
  } = useStore();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const hasRequestedDashboardData = React.useRef(false);

  React.useEffect(() => {
    if (!hasRequestedDashboardData.current) {
      hasRequestedDashboardData.current = true;
      fetchDashboardData();
    }
  }, [fetchDashboardData]);

  const [focusNote, setFocusNote] = React.useState(user.statusNote || "");
  const [isEditingFocus, setIsEditingFocus] = React.useState(false);

  const dateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
  const currentJournalEntry = journalEntries.find((e) => e.date === dateKey);

  const [showAllCircle, setShowAllCircle] = React.useState(false);
  const [showAllTasks, setShowAllTasks] = React.useState(false);

  const activeVisions = visions.filter((v) => v.status === "in-progress");
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
             {user.xp} XP • LEVEL {user.level}
           </span>
        </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Today's Focus Section */}
          <div className="bg-card rounded-[1.6rem] sm:rounded-[2.5rem] p-4 sm:p-8 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                  <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-text-secondary opacity-60">
                    Primary Objective
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
                        onBlur={() => {
                          setIsEditingFocus(false);
                          useStore.getState().updateUser({ statusNote: focusNote });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setIsEditingFocus(false);
                            useStore.getState().updateUser({ statusNote: focusNote });
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
                        {user.statusNote || "Define your focus for today..."}
                      </h2>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-6 pt-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest opacity-40">Trajectory</span>
                    <span className="text-sm font-bold text-text-main">Day {user.streak || 1} • {user.rank || 'Explorer'}</span>
                  </div>
                  <div className="w-px h-8 bg-card-border/50" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest opacity-40">System Efficiency</span>
                    <span className="text-sm font-bold text-text-main">High Performance</span>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-auto shrink-0 bg-card-dark rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-5 flex flex-col gap-4 md:min-w-[240px] border border-card-border/50">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary mb-1">Streak Fire</p>
                    <p className="text-3xl font-display font-black text-warning">{currentStreak}</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-warning/10 border border-warning/20 flex items-center justify-center text-warning">
                    <Flame size={28} className="fill-warning/20" />
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {streakHeatmap.map(day => (
                    <div
                      key={day.key}
                      title={day.key}
                      className={cn(
                        "h-7 rounded-lg border flex items-center justify-center text-[8px] font-black",
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

              <div className="w-full md:w-auto shrink-0 bg-card-dark rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 flex flex-col items-center gap-3 md:min-w-[200px] border border-card-border/50">
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
                        {hasJournal && !isSelected && (
                          <div className="absolute top-1 right-2 w-1.5 h-1.5 bg-accent rounded-full border border-card" />
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
                  <BookOpen size={18} className="text-text-secondary" />
                  <h3 className="text-[15px] font-semibold text-text-secondary">
                    Daily Reflection
                  </h3>
                </div>
                <button
                  onClick={() => navigate("/notes?tab=journal")}
                  className="text-[10px] font-bold tracking-widest uppercase text-accent bg-accent/10 px-3 py-1 rounded-full hover:bg-accent/20 transition-colors"
                >
                  Open Journal
                </button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 h-full flex-1 items-start">
                <div
                  onClick={() => navigate("/notes?tab=journal")}
                  className="bg-app-container rounded-[2rem] p-6 w-full flex flex-col gap-4 relative overflow-hidden group border border-transparent hover:border-accent/20 transition-all min-h-[180px] cursor-pointer"
                >
                  {currentJournalEntry ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {currentJournalEntry.mood || "📝"}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">
                          Mood Locked
                        </span>
                      </div>
                      <p className="text-[13px] font-medium text-text-main line-clamp-4 leading-relaxed opacity-80">
                        "{currentJournalEntry.note}"
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-8 text-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-accent/5 flex items-center justify-center text-accent/40">
                        <Plus size={24} />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-text-main">
                          No reflection for today.
                        </p>
                        <p className="text-[11px] text-text-secondary mt-1">
                          Manifest your thoughts into the system.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-auto flex items-center justify-center">
                    <span className="text-[9px] uppercase font-black tracking-[0.25em] text-accent opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                      Enter Reflection Window
                    </span>
                  </div>
                </div>

                <div className="w-full bg-app-container rounded-[2rem] p-6 flex flex-col gap-4 relative overflow-hidden h-auto">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-black text-text-main uppercase tracking-[0.2em] opacity-40">
                      Strategic Context
                    </h4>
                    <Target size={14} className="text-accent/40" />
                  </div>

                  <div className="flex flex-col gap-3">
                    {currentJournalEntry?.visionIds &&
                    currentJournalEntry.visionIds.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {currentJournalEntry.visionIds.map((vid) => {
                          const vision = visions.find((v) => v.id === vid);
                          return vision ? (
                            <span
                              key={vid}
                              className="px-3 py-1.5 rounded-xl bg-card border border-accent/10 text-[10px] font-bold text-text-main"
                            >
                              {vision.title}
                            </span>
                          ) : null;
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] font-medium text-text-secondary leading-relaxed px-1">
                        Today's journal entries are not yet aligned with
                        specific vision trajectories.
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => navigate("/vision")}
                    className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mt-6 border border-accent/20 rounded-xl py-3 hover:bg-accent/5 transition-all text-center w-full"
                  >
                    Align Visions
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
                    onClick={() => navigate('/vision')}
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
                onClick={() => navigate('/notes')}
                className="text-[10px] font-black text-accent uppercase tracking-widest hover:underline"
              >
                View Notes
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {notes.slice(0, 3).map((note) => (
                <div 
                  key={note.id}
                  onClick={() => navigate('/notes')}
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
        </div>

        {/* Right Sidebar stats panel */}
        <div className="w-full lg:w-[300px] shrink-0 bg-card rounded-[2.5rem] p-6 flex flex-col shadow-sm relative pt-8">
          <div className="flex flex-col gap-4 w-full h-auto">
            <div className="flex items-center justify-between pb-2 border-b border-card-border/60">
              <h3 className="text-[14px] font-bold text-text-main">
                To-Do List
              </h3>
              <span className="text-[10px] uppercase tracking-wider text-text-secondary/60 font-bold">
                {todos.filter((t) => !t.completed).length} pending
              </span>
            </div>

            <div className="flex flex-col gap-1.5 min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar">
              {todos.map((todo) => (
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
                      "text-[13px] font-medium flex-1",
                      todo.completed
                        ? "text-text-secondary line-through opacity-60"
                        : "text-text-main",
                      "leading-tight",
                    )}
                  >
                    {todo.text}
                  </span>
                </div>
              ))}
              {todos.length === 0 && (
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
          </div>

          <div className="mt-10 flex flex-col gap-4">
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
  );
}
