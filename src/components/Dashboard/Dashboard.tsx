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
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Brain,
  Zap,
  Play,
  CheckCircle2,
  Search,
  BookOpen,
  Plus,
  Flame,
  Minus,
  Wallet,
  FileText,
  Clock3,
  Trash2,
  Target,
  X,
} from "lucide-react";
import { useStore } from "../../store/useStore";
import { cn } from "../../lib/utils";
import { getLevelProgress, normalizeLegacyXp } from "../../lib/progression";
import React from "react";
import { safeArray, safeFormat } from "../../lib/safeData";
import { ProgressLogComposer } from "../Progress/ProgressLogComposer";
import { formatCurrency } from "../../lib/currency";
import { DashboardProgressPulseCard } from "../Growth/DashboardProgressPulseCard";
import { DashboardCircleMomentumCard } from "../Circle/DashboardCircleMomentumCard";
import { MobilePage } from "../mobile/MobileLayout";
import { betaFlags } from "../../lib/betaFlags";

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

function FirstVisionPrompt({ onCreate, onSecondary, secondaryLabel = "Send Feedback" }: { onCreate: () => void; onSecondary: () => void; secondaryLabel?: string }) {
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
            onClick={onSecondary}
            className="h-12 rounded-2xl border border-card-border bg-card px-6 text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-accent"
          >
            {secondaryLabel}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function DashboardActivityChart({ data }: { data: Array<{ name: string; output: number; tasksDone: number }> }) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const width = 420;
  const height = 112;
  const top = 10;
  const bottom = 10;
  const max = Math.max(...data.map((item) => item.output), 1);
  const plotHeight = height - top - bottom;
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const points = data.map((item, index) => {
    const x = index * step;
    const y = top + plotHeight - (Math.max(0, item.output) / max) * plotHeight;
    return { ...item, x, y };
  });
  const linePath = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;

    const previous = points[index - 1];
    const beforePrevious = points[index - 2] || previous;
    const next = points[index + 1] || point;
    const controlOneX = previous.x + (point.x - beforePrevious.x) / 6;
    const controlOneY = previous.y + (point.y - beforePrevious.y) / 6;
    const controlTwoX = point.x - (next.x - previous.x) / 6;
    const controlTwoY = point.y - (next.y - previous.y) / 6;

    return `${path} C ${controlOneX.toFixed(1)} ${controlOneY.toFixed(1)} ${controlTwoX.toFixed(1)} ${controlTwoY.toFixed(1)} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }, "");
  const areaPath = `${linePath} L ${width} ${height - bottom} L 0 ${height - bottom} Z`;
  const activePoint = activeIndex === null ? null : points[activeIndex];

  return (
    <div className="relative flex h-full min-h-0 flex-col" onMouseLeave={() => setActiveIndex(null)}>
      <div className="relative min-h-0 flex-1">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" preserveAspectRatio="none" role="img" aria-label="Weekly output activity chart">
          <defs>
            <linearGradient id="dashboardActivityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1="0"
              x2={width}
              y1={top + plotHeight * ratio}
              y2={top + plotHeight * ratio}
              stroke="var(--card-border)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              opacity="0.55"
            />
          ))}
          <path d={areaPath} fill="url(#dashboardActivityFill)" />
          <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {points.map((point, index) => (
            <circle
              key={point.name}
              cx={point.x}
              cy={point.y}
              r="14"
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              tabIndex={0}
            />
          ))}
        </svg>

        {activePoint && (
          <div
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-2xl border border-card-border bg-card-elevated px-3 py-2 text-xs shadow-xl shadow-black/15"
            style={{
              left: `clamp(56px, ${(activePoint.x / width) * 100}%, calc(100% - 56px))`,
              top: `${Math.max(14, (activePoint.y / height) * 100)}%`,
            }}
          >
            <p className="font-black text-text-main">{activePoint.name}</p>
            <p className="mt-1 whitespace-nowrap font-semibold text-text-secondary">
              {activePoint.tasksDone} {activePoint.tasksDone === 1 ? 'task' : 'tasks'} done
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-7 pt-2">
        {points.map(point => (
          <span key={point.name} className="text-center text-[13px] font-black leading-none tracking-normal text-text-secondary/60">
            {point.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-full bg-surface-muted", className)} />;
}

function DashboardSkeleton() {
  return (
    <div className="w-full max-w-[1440px] mx-auto space-y-5 sm:space-y-8 pb-20 px-0 sm:px-4 overflow-hidden">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-[2rem] sm:rounded-[3rem] border border-card-border bg-card p-5 sm:p-8 shadow-sm">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px_260px]">
            <div className="space-y-5">
              <SkeletonLine className="h-3 w-40 bg-accent/15" />
              <SkeletonLine className="h-12 w-72 max-w-full" />
              <div className="space-y-3">
                <SkeletonLine className="h-4 w-full max-w-md" />
                <SkeletonLine className="h-4 w-3/4 max-w-sm" />
              </div>
              <div className="grid max-w-lg grid-cols-2 gap-4 pt-2">
                <SkeletonLine className="h-12 rounded-2xl" />
                <SkeletonLine className="h-12 rounded-2xl" />
              </div>
              <div className="h-16 rounded-[1.5rem] border border-card-border bg-surface-muted/60 p-4">
                <SkeletonLine className="h-3 w-28" />
                <SkeletonLine className="mt-3 h-2 w-full" />
              </div>
            </div>
            <div className="rounded-[2rem] border border-card-border bg-surface-muted/70 p-5">
              <SkeletonLine className="h-3 w-28" />
              <SkeletonLine className="mt-4 h-11 w-16" />
              <div className="mt-6 grid grid-cols-7 gap-2">
                {Array.from({ length: 14 }).map((_, index) => (
                  <div key={index} className="h-8 rounded-xl bg-card animate-pulse" />
                ))}
              </div>
              <SkeletonLine className="mt-6 h-3 w-40" />
            </div>
            <div className="rounded-[2rem] border border-card-border bg-surface-muted/70 p-5">
              <SkeletonLine className="h-3 w-36" />
              <SkeletonLine className="mt-5 h-14 w-28" />
              <SkeletonLine className="mt-6 h-3 w-full" />
              <SkeletonLine className="mt-4 h-3 w-2/3" />
            </div>
          </div>
          <div className="mt-7 h-20 rounded-[1.5rem] border border-card-border bg-surface-muted/60 p-4">
            <SkeletonLine className="h-3 w-24" />
            <SkeletonLine className="mt-4 h-2 w-full" />
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-[2rem] border border-card-border bg-card p-5 shadow-sm">
            <SkeletonLine className="h-3 w-32 bg-accent/15" />
            <SkeletonLine className="mt-4 h-8 w-52" />
            <SkeletonLine className="mt-4 h-3 w-44" />
            <div className="mt-5 h-16 rounded-2xl bg-surface-muted animate-pulse" />
          </div>
          <div className="rounded-[2rem] border border-card-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <SkeletonLine className="h-6 w-32" />
              <SkeletonLine className="h-4 w-16" />
            </div>
            <div className="mt-6 space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full border border-card-border bg-surface-muted animate-pulse" />
                  <SkeletonLine className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function NextMoveCard({
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  compact?: boolean;
}) {
  return (
    <section className={cn(
      "rounded-[1.6rem] border border-accent/20 bg-accent/[0.06] shadow-sm",
      compact ? "p-3" : "p-4"
    )}>
      <div className={cn("flex gap-3", compact ? "items-center" : "items-start")}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-contrast shadow-lg shadow-accent/15">
          <Zap size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-accent">Next move</p>
          <h3 className={cn("mt-1 font-black tracking-tight text-text-main", compact ? "text-base" : "text-lg")}>{title}</h3>
          <p className={cn("mt-1 font-semibold leading-5 text-text-secondary", compact ? "text-xs" : "text-sm")}>{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onAction}
        className={cn(
          "mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[10px] font-black uppercase tracking-widest text-accent-contrast shadow-lg shadow-accent/15 active:scale-[0.99]",
          compact ? "h-10" : "h-12"
        )}
      >
        <Plus size={14} />
        {actionLabel}
      </button>
    </section>
  );
}

const dateKeyFromDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfWeekMonday = (date: Date) => addDays(date, -((date.getDay() + 6) % 7));

const sameDay = (a: Date, b: Date) => dateKeyFromDate(a) === dateKeyFromDate(b);

const taskPalette = [
  "bg-accent/20 border-accent/25 text-text-main",
  "bg-success/15 border-success/25 text-text-main",
  "bg-warning/20 border-warning/25 text-text-main",
  "bg-info/15 border-info/25 text-text-main",
  "bg-danger/10 border-danger/20 text-text-main",
];

function CalendarWorkspaceModal({
  open,
  selectedDate,
  onClose,
  onSelectDate,
}: {
  open: boolean;
  selectedDate: Date;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
}) {
  const { todos, addTodo, toggleTodo, deleteTodo, user } = useStore();
  const [viewDate, setViewDate] = React.useState(selectedDate);
  const [taskTitle, setTaskTitle] = React.useState("");
  const [taskDate, setTaskDate] = React.useState(dateKeyFromDate(selectedDate));
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setViewDate(selectedDate);
    setTaskDate(dateKeyFromDate(selectedDate));
  }, [open, selectedDate]);

  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const miniCalendarDays = React.useMemo(() => {
    const firstOffset = (monthStart.getDay() + 6) % 7;
    return Array.from({ length: 35 }, (_, index) => addDays(monthStart, index - firstOffset));
  }, [monthStart.getFullYear(), monthStart.getMonth()]);

  const weekStart = React.useMemo(() => startOfWeekMonday(viewDate), [viewDate]);
  const weekDays = React.useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const scheduledTasks = React.useMemo(() => (
    todos
      .filter(task => !task.deletedAt && task.scheduledDate)
      .filter(task => !search.trim() || task.text.toLowerCase().includes(search.trim().toLowerCase()))
  ), [search, todos]);
  const selectedDateKey = dateKeyFromDate(viewDate);
  const selectedTasks = scheduledTasks.filter(task => task.scheduledDate === selectedDateKey);
  const pendingSelected = selectedTasks.filter(task => !task.completed).length;

  const createTask = () => {
    const text = taskTitle.trim();
    if (!text) return;
    addTodo(text, taskDate || selectedDateKey);
    setTaskTitle("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-app-container" role="dialog" aria-modal="true" aria-label="Calendar workspace">
      <div className="flex h-dvh w-dvw overflow-hidden bg-app-container">
        <aside className="hidden min-h-0 w-80 shrink-0 flex-col gap-4 overflow-y-auto border-r border-card-border bg-card/85 p-5 lg:flex">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-accent">Planner</p>
              <h2 className="mt-1 text-2xl font-black text-text-main">Calendar</h2>
            </div>
            <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-muted text-text-secondary hover:text-text-main" aria-label="Close calendar">
              <X size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-card-border bg-app-container px-3 py-2">
            <Search size={15} className="text-text-secondary/60" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search tasks..." className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-text-main outline-none placeholder:text-text-secondary/45" />
          </div>

          <div className="rounded-[1.5rem] border border-card-border bg-app-container p-4">
            <div className="mb-4 flex items-center justify-between">
              <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="rounded-xl p-2 text-text-secondary hover:bg-card hover:text-accent" aria-label="Previous month"><ChevronLeft size={16} /></button>
              <p className="text-sm font-black text-text-main">{viewDate.toLocaleDateString([], { month: "long", year: "numeric" })}</p>
              <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="rounded-xl p-2 text-text-secondary hover:bg-card hover:text-accent" aria-label="Next month"><ChevronRight size={16} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={`${day}-${index}`} className="text-[9px] font-black text-text-secondary/45">{day}</span>)}
              {miniCalendarDays.map(day => {
                const key = dateKeyFromDate(day);
                const hasTask = scheduledTasks.some(task => task.scheduledDate === key);
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setViewDate(day);
                      onSelectDate(day);
                      setTaskDate(key);
                    }}
                    className={cn(
                      "relative flex h-9 items-center justify-center rounded-xl text-xs font-black transition-all",
                      day.getMonth() !== viewDate.getMonth() && "opacity-30",
                      sameDay(day, viewDate) ? "bg-accent text-accent-contrast" : "text-text-main hover:bg-card",
                      sameDay(day, new Date()) && !sameDay(day, viewDate) && "ring-1 ring-accent/30"
                    )}
                  >
                    {day.getDate()}
                    {hasTask && <span className={cn("absolute bottom-1 h-1 w-1 rounded-full", sameDay(day, viewDate) ? "bg-accent-contrast" : "bg-accent")} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-card-border bg-accent p-5 text-accent-contrast shadow-lg shadow-accent/20">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Selected day</p>
            <h3 className="mt-2 text-xl font-black">{viewDate.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}</h3>
            <p className="mt-2 text-sm font-bold opacity-80">{pendingSelected} pending tasks</p>
          </div>

          <form
            onSubmit={event => {
              event.preventDefault();
              createTask();
            }}
            className="rounded-[1.5rem] border border-card-border bg-app-container p-4"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/55">Create task</p>
            <input value={taskTitle} onChange={event => setTaskTitle(event.target.value)} placeholder="Task title" className="mt-3 h-11 w-full rounded-2xl border border-card-border bg-card px-4 text-sm font-bold outline-none focus:border-accent" />
            <input type="date" value={taskDate} onChange={event => setTaskDate(event.target.value)} className="mt-2 h-11 w-full rounded-2xl border border-card-border bg-card px-4 text-sm font-bold outline-none focus:border-accent [color-scheme:inherit]" />
            <button disabled={!taskTitle.trim()} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[10px] font-black uppercase tracking-widest text-accent-contrast disabled:opacity-40">
              <Plus size={14} /> Create Event
            </button>
          </form>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto bg-card p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-4 rounded-[1.5rem] border border-card-border bg-app-container p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setViewDate(addDays(viewDate, -7))} className="rounded-xl p-2 text-text-secondary hover:bg-card hover:text-accent" aria-label="Previous week"><ChevronLeft size={18} /></button>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">Weekly view</p>
                <h2 className="text-2xl font-black text-text-main">{viewDate.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}</h2>
              </div>
              <button onClick={() => setViewDate(addDays(viewDate, 7))} className="rounded-xl p-2 text-text-secondary hover:bg-card hover:text-accent" aria-label="Next week"><ChevronRight size={18} /></button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setViewDate(new Date())} className="h-10 rounded-2xl border border-card-border bg-card px-4 text-[10px] font-black uppercase tracking-widest text-text-main">Today</button>
              <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-muted text-text-secondary hover:text-text-main" aria-label="Close calendar"><X size={18} /></button>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[760px] grid-cols-7 gap-2">
              {weekDays.map(day => (
                <button
                  key={dateKeyFromDate(day)}
                  onClick={() => {
                    setViewDate(day);
                    onSelectDate(day);
                    setTaskDate(dateKeyFromDate(day));
                  }}
                  className={cn(
                    "rounded-2xl border p-4 text-center transition-all",
                    sameDay(day, viewDate) ? "border-accent/40 bg-accent/10" : "border-card-border bg-surface-muted/60 hover:border-accent/25"
                  )}
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/60">{day.toLocaleDateString([], { weekday: "long" })}</p>
                  <p className="mt-1 text-3xl font-black text-text-main">{day.getDate()}</p>
                </button>
              ))}

              {weekDays.map((day, dayIndex) => {
                const key = dateKeyFromDate(day);
                const dayTasks = scheduledTasks.filter(task => task.scheduledDate === key);
                return (
                  <div key={`tasks-${key}`} className="min-h-[520px] space-y-3 border-r border-card-border/50 pr-2 last:border-r-0">
                    {["09 AM", "11 AM", "01 PM", "03 PM"].map((time, index) => (
                      <div key={time} className="min-h-[118px] border-t border-card-border/60 pt-2">
                        <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-text-secondary/40">{time}</p>
                        {dayTasks.filter((_, taskIndex) => taskIndex % 4 === index).map((task, taskIndex) => (
                          <div key={task.id} className={cn("group mb-2 rounded-2xl border p-3 shadow-sm", taskPalette[(dayIndex + taskIndex) % taskPalette.length], task.completed && "opacity-55")}>
                            <div className="flex items-start justify-between gap-2">
                              <button onClick={() => toggleTodo(task.id)} disabled={task.completed} className="min-w-0 text-left">
                                <p className={cn("line-clamp-2 text-sm font-black leading-snug", task.completed && "line-through")}>{task.text}</p>
                                <p className="mt-2 flex items-center gap-1 text-[10px] font-bold opacity-70"><Clock3 size={11} /> Synced task</p>
                              </button>
                              <button onClick={() => deleteTodo(task.id)} className="rounded-lg p-1 text-text-secondary opacity-0 transition-opacity hover:bg-card/60 hover:text-danger group-hover:opacity-100" aria-label="Delete task">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-card-border bg-app-container p-4 lg:hidden">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/55">Create task</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_160px_auto]">
              <input value={taskTitle} onChange={event => setTaskTitle(event.target.value)} placeholder="Task title" className="h-11 rounded-2xl border border-card-border bg-card px-4 text-sm font-bold outline-none focus:border-accent" />
              <input type="date" value={taskDate} onChange={event => setTaskDate(event.target.value)} className="h-11 rounded-2xl border border-card-border bg-card px-4 text-sm font-bold outline-none focus:border-accent [color-scheme:inherit]" />
              <button onClick={createTask} disabled={!taskTitle.trim()} className="h-11 rounded-2xl bg-accent px-5 text-[10px] font-black uppercase tracking-widest text-accent-contrast disabled:opacity-40">Add</button>
            </div>
          </div>

          <p className="mt-4 text-xs font-semibold text-text-secondary/65">
            Tasks created here are saved to your VisNova task data for {user.name || "you"} and appear in Dashboard, Upcoming Tasks, and the Tasks page.
          </p>
        </main>
      </div>
    </div>
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
    financeGoals,
    financeTransactions,
    moneyOverview,
    progressLogs,
    growthTimelineEvents,
    aiInsights,
    session,
  } = useStore();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [showProgressComposer, setShowProgressComposer] = React.useState(false);
  const [dayTaskText, setDayTaskText] = React.useState("");
  const [dayNoteTitle, setDayNoteTitle] = React.useState("");
  const [dayNoteText, setDayNoteText] = React.useState("");
  const [dayComposer, setDayComposer] = React.useState<"task" | "note">("task");
  const [showCalendarWorkspace, setShowCalendarWorkspace] = React.useState(false);
  const lastDashboardDataUserId = React.useRef<string | null>(null);

  React.useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || lastDashboardDataUserId.current === userId) return;
    lastDashboardDataUserId.current = userId;
    fetchDashboardData();
  }, [fetchDashboardData, session?.user?.id]);

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
  const calendarActivityByDate = React.useMemo(() => {
    const activity: Record<string, { task: boolean; note: boolean; journal: boolean }> = {};
    const ensureDay = (key: string) => {
      activity[key] ||= { task: false, note: false, journal: false };
      return activity[key];
    };

    todos.forEach(todo => {
      if (!todo.deletedAt && todo.scheduledDate) ensureDay(todo.scheduledDate).task = true;
    });
    notes.forEach(note => {
      if (!note.isDeleted && note.note_type === "normal") ensureDay(keyForTimestamp(note.createdAt)).note = true;
    });
    journalEntries.forEach(entry => {
      if (entry.date) ensureDay(entry.date).journal = true;
    });

    return activity;
  }, [journalEntries, keyForTimestamp, notes, todos]);

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

  const [showAllTasks, setShowAllTasks] = React.useState(false);

  const activeVisions = visions.filter((v) => v.status === "in-progress");
  const activeVision = activeVisions[0] || visions[0] || null;
  const allTasks = visions.flatMap((v) =>
    (v.tasks || []).map((t, idx) => ({
      ...t,
      reactKey: `${v.id}-${t.id || idx}`,
      sourceType: "vision" as const,
      vision: v.title,
      visionId: v.id,
    })),
  );

  const pendingVisionTasks = allTasks.filter((t) => !t.completed);
  const scheduledTodos = todos
    .filter(todo => !todo.completed && !todo.deletedAt && !!todo.scheduledDate)
    .map(todo => ({
      ...todo,
      sourceType: "todo" as const,
      reactKey: `todo-${todo.id}`,
      vision: todo.scheduledDate
        ? new Date(`${todo.scheduledDate}T00:00:00`).toLocaleDateString([], { month: "short", day: "numeric" })
        : "Calendar",
      visionId: "",
    }))
    .sort((a, b) => (a.scheduledDate || "").localeCompare(b.scheduledDate || ""));
  const pendingTasks = [...scheduledTodos, ...pendingVisionTasks];
  const displayedTasks = showAllTasks ? pendingTasks : pendingTasks.slice(0, 3);
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
  const formatMoney = formatCurrency;
  const defaultCurrency = user.defaultCurrency || 'INR';
  
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
        tasksDone: day ? day.taskCount + day.todoCount : 0,
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
  const weeklyScore = Math.min(100, weeklyProgressLogs.length * 18 + completedTasksThisWeek.length * 10 + weeklyJournalCount * 8 + Math.min(20, currentStreak * 3));
  const weeklyMoneyUpdates = betaFlags.money && moneyOverview ? (moneyOverview.monthIncome > 0 || moneyOverview.monthExpenses > 0 || moneyOverview.monthSavings > 0 ? 1 : 0) : 0;
  const recentTimeline = growthTimelineEvents.slice(0, 3);
  const visionById = React.useMemo(() => new Map(visions.map(vision => [vision.id, vision])), [visions]);
  const activeMoneyGoals = React.useMemo(() => (
    betaFlags.money ? financeGoals
      .filter(goal => goal.status !== 'archived')
      .map(goal => {
        const progress = Math.min(100, Math.round((goal.currentAmount / Math.max(1, goal.targetAmount)) * 100));
        const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
        const linkedVision = goal.linkedVisionId ? visionById.get(goal.linkedVisionId) : null;
        const daysRemaining = goal.deadline
          ? Math.ceil((new Date(`${goal.deadline}T23:59:59`).getTime() - Date.now()) / 86400000)
          : null;
        const status = goal.status === 'completed' || progress >= 100
          ? 'completed'
          : daysRemaining !== null && daysRemaining < 0
            ? 'behind'
            : daysRemaining !== null && daysRemaining <= 7 && progress < 70
              ? 'at risk'
              : 'on track';

        return { ...goal, progress, remaining, linkedVision, daysRemaining, pulseStatus: status };
      })
      .sort((a, b) => {
        const statusWeight = { behind: 0, 'at risk': 1, 'on track': 2, completed: 3 } as Record<string, number>;
        return statusWeight[a.pulseStatus] - statusWeight[b.pulseStatus] || b.remaining - a.remaining;
      }) : []
  ), [financeGoals, visionById]);
  const dashboardResourceGoal = betaFlags.money ? activeMoneyGoals.find(goal => goal.pulseStatus !== 'completed') || activeMoneyGoals[0] || null : null;
  const deadlineCards = React.useMemo(() => (
    visions
      .filter(vision => !!vision.deadline)
      .map(vision => {
        const progress = Math.min(100, Math.round(vision.progress || 0));
        const deadlineDate = new Date(`${vision.deadline}T23:59:59`);
        const daysRemaining = Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000);
        const tasksRemaining = (vision.tasks || []).filter(task => !task.completed && !task.deletedAt).length;
        const status = progress >= 100
          ? 'completed'
          : daysRemaining < 0
            ? 'behind'
            : daysRemaining <= 7 && progress < 70
              ? 'at risk'
              : 'on track';

        return { vision, progress, daysRemaining, tasksRemaining, status };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 3)
  ), [visions]);
  const resourceReadinessCards = React.useMemo(() => (
    visions
      .map(vision => {
        const linkedGoals = activeMoneyGoals.filter(goal => goal.linkedVisionId === vision.id);
        const purchased = linkedGoals.filter(goal => goal.pulseStatus === 'completed').length;
        const saved = linkedGoals.filter(goal => goal.currentAmount > 0 && goal.pulseStatus !== 'completed').length;
        const missing = linkedGoals.filter(goal => goal.currentAmount <= 0 && goal.pulseStatus !== 'completed').length;
        const weightedReady = linkedGoals.reduce((sum, goal) => sum + (goal.pulseStatus === 'completed' ? 1 : goal.currentAmount > 0 ? 0.5 : 0), 0);
        const readiness = linkedGoals.length ? Math.round((weightedReady / linkedGoals.length) * 100) : 0;
        return { vision, linkedGoals, planned: linkedGoals.length, saved, purchased, missing, readiness };
      })
      .filter(card => card.planned > 0)
      .sort((a, b) => b.readiness - a.readiness)
      .slice(0, 2)
  ), [activeMoneyGoals, visions]);
  const daysSinceLastProgress = React.useMemo(() => {
    const latest = progressLogs[0]?.createdAt;
    return latest ? Math.max(0, Math.floor((Date.now() - latest) / 86400000)) : null;
  }, [progressLogs]);
  const mostActiveVision = React.useMemo(() => {
    const counts = weeklyProgressLogs.reduce<Record<string, number>>((acc, log) => {
      if (log.visionId) acc[log.visionId] = (acc[log.visionId] || 0) + 1;
      return acc;
    }, {});
    const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return topId ? visionById.get(topId) : null;
  }, [visionById, weeklyProgressLogs]);
  const progressUpdates = React.useMemo(() => {
    const updates: string[] = [];
    const topGoal = betaFlags.money ? activeMoneyGoals.find(goal => goal.pulseStatus !== 'completed' && goal.remaining > 0) : null;
    if (topGoal) {
      updates.push(`You need ${formatMoney(topGoal.remaining, topGoal.currency)} more to complete ${topGoal.title}.`);
    }
    const nextDeadline = deadlineCards.find(card => card.status !== 'completed');
    if (nextDeadline) {
      updates.push(`${nextDeadline.vision.title} deadline is ${nextDeadline.daysRemaining >= 0 ? `in ${nextDeadline.daysRemaining} days` : `${Math.abs(nextDeadline.daysRemaining)} days behind`}.`);
      if (nextDeadline.tasksRemaining > 0) updates.push(`You have ${nextDeadline.tasksRemaining} tasks left before ${nextDeadline.vision.title} is complete.`);
    }
    if (daysSinceLastProgress !== null && daysSinceLastProgress >= 2) {
      updates.push(`You have not logged progress for ${daysSinceLastProgress} days.`);
    }
    if (mostActiveVision) {
      updates.push(`Your most active Vision this week is ${mostActiveVision.title}.`);
    }
    return updates.slice(0, 4);
  }, [activeMoneyGoals, daysSinceLastProgress, deadlineCards, formatMoney, mostActiveVision]);
  const hasLoggedProgressToday = progressLogs.some(log => log.createdAt >= dayStart);
  const nextMove = React.useMemo(() => {
    if (!activeVision) {
      return {
        title: "Create your first Vision",
        description: "Pick one thing you want to build, learn, or improve. Everything else can connect after that.",
        actionLabel: "Create Vision",
        onAction: () => navigate('/visions'),
      };
    }

    if (!hasLoggedProgressToday) {
      return {
        title: "Log today's proof",
        description: `Add one update for ${activeVision.title}. Private is fine; visible progress starts with the record.`,
        actionLabel: "Log Proof",
        onAction: () => setShowProgressComposer(true),
      };
    }

    const task = pendingTasks[0];
    if (task) {
      return {
        title: "Finish the next task",
        description: task.text,
        actionLabel: "Mark Done",
        onAction: () => {
          if (task.sourceType === "todo") toggleTodo(task.id || "");
          else toggleVisionTask(task.visionId, task.id || "");
        },
      };
    }

    const moneyGoal = betaFlags.money ? activeMoneyGoals.find(goal => goal.pulseStatus !== 'completed') : null;
    if (moneyGoal) {
      return {
        title: "Update your resources",
        description: `You need ${formatMoney(moneyGoal.remaining, moneyGoal.currency)} more for ${moneyGoal.title}.`,
        actionLabel: "Open Wallet",
        onAction: () => navigate('/wallet'),
      };
    }

    return {
      title: "Review your growth",
      description: "Your proof is recorded. Check the tracker and decide tomorrow's next move.",
      actionLabel: "View Tracker",
      onAction: () => navigate('/growth', { state: { section: 'tracker' } }),
    };
  }, [activeMoneyGoals, activeVision, formatMoney, hasLoggedProgressToday, navigate, pendingTasks, toggleTodo, toggleVisionTask]);

  if (isDashboardLoading && !hasAnyDashboardData) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto space-y-5 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20 px-0 sm:px-4 overflow-x-hidden">
      <ProgressLogComposer
        open={showProgressComposer}
        onClose={() => setShowProgressComposer(false)}
        defaultVisionId={activeVision?.id}
      />
      <CalendarWorkspaceModal
        open={showCalendarWorkspace}
        selectedDate={selectedDate}
        onClose={() => setShowCalendarWorkspace(false)}
        onSelectDate={setSelectedDate}
      />
      <MobilePage className="max-w-[430px] gap-3 bg-[#f7fbf8] px-4 py-3 text-[#17211b]">
        <section className="flex items-center justify-between gap-4 pt-1">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-none text-[#69766d]">Good morning,</p>
            <h1 className="mt-1 truncate text-[22px] font-black leading-none tracking-tight text-[#162018]">
              {(user.name || "Visionary").split(" ")[0]}!
            </h1>
            <p className="mt-1 text-[11px] font-semibold text-[#89948c]">Make today visibly productive.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-4 border-white bg-[#eceff1] shadow-lg shadow-[#162018]/10"
            aria-label="Open profile"
          >
            <img
              src={user.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${user.id || 'visnova'}`}
              alt=""
              className="h-full w-full object-cover"
            />
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#34c77b]" />
          </button>
        </section>

        <button
          type="button"
          onClick={() => navigate('/growth', { state: { fromDashboard: true, section: 'tracker' } })}
          className="overflow-hidden rounded-[1.8rem] border border-[#eadcff] bg-[#f0e4ff] p-4 text-left shadow-[0_16px_42px_rgba(116,73,166,0.13)]"
        >
          <div className="grid grid-cols-[1fr_96px] items-center gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-black leading-tight text-[#32223f]">Weekly Progress</p>
              <p className="mt-1 text-[10px] font-semibold text-[#7a6b89]">Your proof sprint</p>
              <p className="mt-2 text-[40px] font-black leading-none tracking-tight text-[#9a6cff]">{Math.round(weeklyScore || 0)}%</p>
              <div className="mt-3 h-2.5 max-w-[150px] overflow-hidden rounded-full bg-white/70">
                <div className="h-full rounded-full bg-[#9a6cff]" style={{ width: `${Math.min(100, Math.round(weeklyScore || 0))}%` }} />
              </div>
              <p className="mt-2 text-[10px] font-bold text-[#7a6b89]">
                {Math.min(7, weeklyProgressLogs.length)} of 7 proof days active
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div
                className="flex h-[86px] w-[86px] items-center justify-center rounded-full p-2 shadow-inner"
                style={{ background: `conic-gradient(#9a6cff ${Math.min(100, Math.round(weeklyScore || 0)) * 3.6}deg, rgba(154,108,255,0.18) 0deg)` }}
              >
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#f7f0ff]">
                  <Zap size={17} className="text-[#9a6cff]" />
                  <span className="mt-1 text-[10px] font-black text-[#32223f]">On Track</span>
                </div>
              </div>
            </div>
          </div>
        </button>

        <section className={cn("grid gap-2.5", betaFlags.money ? "grid-cols-3" : "grid-cols-2")}>
          {[
            { icon: FileText, label: "Proof", value: progressLogs.length, detail: `${weeklyProgressLogs.length} this week`, tint: "bg-[#eaf5ff] text-[#2d9ae8]" },
            { icon: CheckCircle2, label: "Tasks", value: completedTasksThisWeek.length, detail: `${pendingTasks.length} pending`, tint: "bg-[#eef8ef] text-[#34a86b]" },
            ...(betaFlags.money ? [{ icon: Wallet, label: "Resources", value: activeMoneyGoals[0]?.progress ?? 0, detail: activeMoneyGoals[0] ? "funded" : "ready", suffix: activeMoneyGoals[0] ? "%" : "", tint: "bg-[#fff3dc] text-[#e3a12b]" }] : []),
          ].map(item => (
            <button
              key={item.label}
              type="button"
              onClick={() => item.label === 'Resources' ? navigate('/wallet') : navigate(item.label === 'Tasks' ? '/tasks' : '/growth')}
              className="rounded-[1.35rem] border border-[#ecf0ec] bg-white p-3 text-left shadow-[0_10px_26px_rgba(24,32,26,0.06)]"
            >
              <div className={cn("mb-2 flex h-7 w-7 items-center justify-center rounded-full", item.tint)}>
                <item.icon size={14} />
              </div>
              <p className="text-[20px] font-black leading-none text-[#17211b]">{item.value}{item.suffix || ""}</p>
              <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-[#8b958e]">{item.label}</p>
              <p className="mt-0.5 truncate text-[9px] font-semibold text-[#a5aea7]">{item.detail}</p>
            </button>
          ))}
        </section>

        <section className="rounded-[1.8rem] border border-[#ecf0ec] bg-white p-4 shadow-[0_12px_30px_rgba(24,32,26,0.07)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-black text-[#17211b]">
              {new Date().toLocaleDateString([], { month: "long", year: "numeric" })}
            </h2>
            <button
              type="button"
              onClick={() => setShowCalendarWorkspace(true)}
              className="text-[10px] font-black text-[#9a6cff]"
            >
              View calendar
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {chartData.map((day, index) => {
              const date = addDays(new Date(), index - 6);
              const isToday = sameDay(date, new Date());
              return (
                <button
                  key={`${day.name}-${index}`}
                  type="button"
                  onClick={() => {
                    setSelectedDate(date);
                    setShowCalendarWorkspace(true);
                  }}
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-center rounded-2xl text-center transition-colors",
                    isToday ? "bg-[#9a6cff] text-white shadow-lg shadow-[#9a6cff]/25" : "bg-[#f7faf7] text-[#59655d]"
                  )}
                >
                  <span className="text-[8px] font-black uppercase">{day.name.slice(0, 1)}</span>
                  <span className="mt-1 text-[11px] font-black">{date.getDate()}</span>
                  {!isToday && day.output > 0 && <span className="mt-1 h-1 w-1 rounded-full bg-[#9a6cff]" />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-[#ecf0ec] bg-white p-4 shadow-[0_12px_30px_rgba(24,32,26,0.07)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-black text-[#17211b]">Recent Progress</h2>
            <button type="button" onClick={() => betaFlags.publicFeed ? navigate('/feed') : navigate('/growth')} className="text-[10px] font-black text-[#9a6cff]">See all</button>
          </div>
          <div className="space-y-3">
            {progressLogs.slice(0, 3).map((log, index) => (
              <button key={log.id} type="button" onClick={() => navigate('/growth')} className="flex w-full items-center gap-3 text-left">
                <span className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  index === 0 ? "bg-[#f0e4ff] text-[#9a6cff]" : index === 1 ? "bg-[#eaf5ff] text-[#2d9ae8]" : "bg-[#eef8ef] text-[#34a86b]"
                )}>
                  {index === 0 ? <Brain size={15} /> : index === 1 ? <FileText size={15} /> : <CheckCircle2 size={15} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-black text-[#17211b]">{log.content || "Progress logged"}</span>
                  <span className="mt-0.5 block truncate text-[10px] font-semibold text-[#8b958e]">{activeVision?.title || log.visibility}</span>
                </span>
                <span className="shrink-0 text-[9px] font-bold text-[#a5aea7]">{safeFormat(log.createdAt, 'h:mm a')}</span>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f2edff] text-[#9a6cff]">
                  <CheckCircle2 size={12} />
                </span>
              </button>
            ))}
            {progressLogs.length === 0 && (
              <button
                type="button"
                onClick={() => setShowProgressComposer(true)}
                className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-[#dfe7e1] bg-[#f7faf7] p-3 text-left"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0e4ff] text-[#9a6cff]"><Plus size={15} /></span>
                <span>
                  <span className="block text-[12px] font-black text-[#17211b]">Log your first proof</span>
                  <span className="text-[10px] font-semibold text-[#8b958e]">Your progress story starts here.</span>
                </span>
              </button>
            )}
          </div>
        </section>

        <button
          type="button"
          onClick={nextMove.onAction}
          className="overflow-hidden rounded-[1.8rem] border border-[#cdebe1] bg-[#dff5ed] p-4 text-left shadow-[0_14px_34px_rgba(52,168,107,0.13)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#bdebdc] text-[#1e8b5b]">
                <Target size={20} />
              </div>
              <p className="text-[13px] font-black text-[#17211b]">Today's Focus</p>
              <h3 className="mt-1 line-clamp-2 text-[16px] font-black leading-snug text-[#284336]">{nextMove.title}</h3>
              <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-5 text-[#638071]">{nextMove.description}</p>
            </div>
            <span className="rounded-full bg-white/80 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-[#4f826b]">
              {nextMove.actionLabel}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setShowProgressComposer(true)}
          className="sticky bottom-3 z-20 flex min-h-14 w-full items-center justify-center gap-2 rounded-[1.5rem] bg-[#9a6cff] px-4 text-[11px] font-black uppercase tracking-widest text-white shadow-[0_18px_44px_rgba(154,108,255,0.32)] active:scale-[0.99]"
        >
          <Plus size={18} />
          Log Proof
        </button>
      </MobilePage>
      {/* Header section */}
      <div className="hidden lg:flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4 px-1 sm:ml-2">
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
      <div className="hidden min-w-0 flex-col lg:flex lg:flex-row gap-6">
        {/* Main Content Area */}
        <div className="min-w-0 flex-1 flex flex-col gap-6">
          {visions.length === 0 && (
            <FirstVisionPrompt
              onCreate={() => navigate('/visions')}
              onSecondary={() => betaFlags.publicFeed ? navigate('/feed') : navigate('/feedback')}
              secondaryLabel={betaFlags.publicFeed ? 'Explore the Feed' : 'Send Feedback'}
            />
          )}

          {/* Today's Focus Section */}
          <div className="bg-card rounded-[1.6rem] sm:rounded-[2.5rem] p-4 sm:p-5 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
            
            <div className="relative z-10 grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(170px,200px)_minmax(145px,165px)] 2xl:grid-cols-[minmax(0,1fr)_210px_180px] items-start">
              <div className="min-w-0 flex-1 space-y-3">
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
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div 
                      onClick={() => setIsEditingFocus(true)}
                      className="min-w-0 flex-1 cursor-pointer group/focus"
                    >
                      <h2 className="text-xl lg:text-3xl font-display font-medium text-text-main leading-tight group-hover/focus:text-accent transition-colors">
                        {user.statusNote || activeVision?.title || "Choose today’s proof of progress"}
                      </h2>
                      <p className="mt-2 max-w-xl text-xs font-semibold text-text-secondary/70">
                        {activeVision
                          ? "Pick the next action, log proof, and keep this Vision moving."
                          : "Create a Vision so tasks, notes, journals, and proof connect in one loop."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowProgressComposer(true)}
                      className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-[9px] font-black uppercase tracking-widest text-accent-contrast shadow-lg shadow-accent/15"
                    >
                      <Plus size={13} />
                      Log Proof
                    </button>
                    </div>
                  )}
                </div>

                <NextMoveCard
                  title={nextMove.title}
                  description={nextMove.description}
                  actionLabel={nextMove.actionLabel}
                  onAction={nextMove.onAction}
                  compact
                />

                <div className="flex flex-wrap items-center gap-3 pt-1">
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

              <div className="w-full min-w-0 bg-card-dark rounded-[1.5rem] sm:rounded-[2rem] p-4 flex flex-col gap-3 border border-card-border/50">
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

              <div className="w-full min-w-0 bg-card-dark rounded-[1.5rem] sm:rounded-[2rem] p-4 flex flex-col items-center gap-3 border border-card-border/50">
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

          {/* Top Row: Circle momentum / Events */}
          <div className={cn("grid grid-cols-1 gap-6", betaFlags.circle ? "md:grid-cols-2" : "")}>
            {betaFlags.circle && <DashboardCircleMomentumCard />}

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
                      onClick={() => {
                        if (task.sourceType === "todo") {
                          toggleTodo(task.id || "");
                        } else {
                          toggleVisionTask(task.visionId, task.id || "");
                        }
                      }}
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
                          {task.sourceType === "todo" ? `Calendar - ${task.vision}` : task.vision}
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
          <div className="bg-card rounded-[2.5rem] p-4 sm:p-6 shadow-sm grid grid-cols-1 xl:grid-cols-[minmax(280px,380px)_minmax(0,1fr)] gap-6 items-stretch">
            <div className="w-full bg-app-container rounded-[2rem] p-4 sm:p-5 flex flex-col gap-4 min-w-0 border border-card-border/50 shadow-inner shadow-accent/5">
              <div className="flex items-center justify-between gap-3 text-text-main">
                <button
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setSelectedDate(newDate);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-card-border bg-card text-text-secondary transition-colors hover:border-accent/40 hover:text-accent"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex min-w-0 items-center justify-center gap-2">
                  <span className="rounded-2xl border border-card-border bg-card px-4 py-2 text-xs font-black uppercase tracking-widest text-text-main shadow-sm">
                    {selectedDate.toLocaleString("default", { month: "short" })}
                  </span>
                  <span className="rounded-2xl border border-card-border bg-card px-4 py-2 text-xs font-black uppercase tracking-widest text-text-main shadow-sm">
                    {selectedDate.getFullYear()}
                  </span>
                </div>
                <button
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setSelectedDate(newDate);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-card-border bg-card text-text-secondary transition-colors hover:border-accent/40 hover:text-accent"
                  aria-label="Next month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-text-secondary/60">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" />Task</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" />Note</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" />Journal</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 text-center text-xs relative">
                {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d, i) => (
                  <span
                    key={`header-${i}`}
                    className="mb-1 text-[10px] font-black uppercase tracking-widest text-text-secondary/45"
                  >
                    {d}
                  </span>
                ))}
                {(() => {
                  const year = selectedDate.getFullYear();
                  const month = selectedDate.getMonth();
                  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
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
                    const dayActivity = calendarActivityByDate[dateKey];
                    const hasTask = !!dayActivity?.task;
                    const hasNote = !!dayActivity?.note;
                    const hasJournal = !!dayActivity?.journal;
                    const hasActivity = hasTask || hasNote || hasJournal;
                    const isSelected = selectedDate.getDate() === i;
                    const isToday = new Date().toDateString() === dateObj.toDateString();

                    days.push(
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setSelectedDate(dateObj);
                          setShowCalendarWorkspace(true);
                        }}
                        className={cn(
                          "relative aspect-square rounded-xl border text-sm font-black transition-all focus:outline-none focus:ring-2 focus:ring-accent/30",
                          isSelected
                            ? "border-accent bg-accent text-accent-contrast shadow-lg shadow-accent/20"
                            : "border-card-border bg-card text-text-main hover:-translate-y-0.5 hover:border-accent/35 hover:bg-surface-muted",
                          !isSelected && hasTask && !hasNote && !hasJournal && "border-success/35 bg-success/10",
                          !isSelected && hasNote && !hasTask && !hasJournal && "border-accent/35 bg-accent/10",
                          !isSelected && hasJournal && !hasTask && !hasNote && "border-warning/35 bg-warning/10",
                          isToday && !isSelected && "ring-1 ring-accent/30",
                        )}
                      >
                        <span className="relative z-10">{i}</span>
                        {hasActivity && (
                          <div className={cn("absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-0.5", isSelected && "opacity-90")}>
                            {hasTask && <span className={cn("h-1.5 w-1.5 rounded-full", isSelected ? "bg-accent-contrast" : "bg-success")} />}
                            {hasNote && <span className={cn("h-1.5 w-1.5 rounded-full", isSelected ? "bg-accent-contrast" : "bg-accent")} />}
                            {hasJournal && <span className={cn("h-1.5 w-1.5 rounded-full", isSelected ? "bg-accent-contrast" : "bg-warning")} />}
                          </div>
                        )}
                      </button>,
                    );
                  }
                  return days;
                })()}
              </div>
            </div>

            <div className="min-w-0 flex flex-col gap-4 w-full h-full min-h-[300px]">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowCalendarWorkspace(true)}
                  className="ml-2 flex items-center gap-3 rounded-2xl px-2 py-1 text-left transition-colors hover:bg-accent/10"
                >
                  <Calendar size={18} className="text-text-secondary" />
                  <h3 className="text-[15px] font-semibold text-text-secondary">
                    Day Planner
                  </h3>
                </button>
                <button
                  onClick={() => navigate("/library")}
                  className="text-[10px] font-bold tracking-widest uppercase text-accent bg-accent/10 px-3 py-1 rounded-full hover:bg-accent/20 transition-colors"
                >
                  Open Library
                </button>
              </div>

              <div
                onDoubleClick={() => setShowCalendarWorkspace(true)}
                className="bg-app-container rounded-[2rem] p-5 sm:p-6 w-full flex flex-col gap-5 relative overflow-hidden border border-card-border/50 min-h-[260px]"
              >
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

                <div className="pt-4 border-t border-card-border/60">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary/55">Planned for this day</p>
                      <p className="text-[11px] font-semibold text-text-secondary/65">Tasks, notes, and journal entries stay tied to the selected date.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-widest text-text-secondary">
                      <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Task</span>
                      <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" /> Note</span>
                      <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" /> Journal</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {selectedDayTasks.length === 0 && selectedDayNotes.length === 0 && !currentJournalEntry ? (
                      <p className="rounded-2xl border border-dashed border-card-border bg-card/60 p-4 text-[11px] font-medium text-text-secondary leading-relaxed lg:col-span-2">
                        No tasks or notes planned for this day yet. Add one above to send it into Upcoming Tasks and this day view.
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
              <DashboardActivityChart data={chartData} />
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

          {betaFlags.money && (
            <div className="bg-card rounded-[2.5rem] p-6 shadow-sm flex flex-col gap-5 border border-card-border/40">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
                      <Wallet size={20} />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold text-text-main">Wallet</h3>
                      <p className="text-[11px] font-semibold text-text-secondary/65">Money or materials linked to a Vision</p>
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

              {dashboardResourceGoal ? (
                <div className="rounded-2xl bg-app-container border border-card-border/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-black text-text-main">{dashboardResourceGoal.title}</span>
                      <span className="mt-1 block truncate text-[11px] font-semibold text-text-secondary">
                        {dashboardResourceGoal.linkedVision?.title ? `Linked Vision: ${dashboardResourceGoal.linkedVision.title}` : 'Link this to a Vision for clearer progress.'}
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-accent">{dashboardResourceGoal.progress}%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-surface-muted overflow-hidden">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${dashboardResourceGoal.progress}%` }} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-secondary">
                    <span>{formatMoney(dashboardResourceGoal.currentAmount, dashboardResourceGoal.currency)}</span>
                    <span className="text-text-secondary/35">/</span>
                    <span>{formatMoney(dashboardResourceGoal.targetAmount, dashboardResourceGoal.currency)}</span>
                    {dashboardResourceGoal.remaining > 0 && (
                      <span className="rounded-full bg-accent/10 px-2 py-1 text-accent">
                        {formatMoney(dashboardResourceGoal.remaining, dashboardResourceGoal.currency)} left
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-app-container border border-dashed border-card-border p-5">
                  <p className="text-sm font-semibold text-text-main">No resource goal yet.</p>
                  <p className="mt-1 text-xs text-text-secondary">Add a target amount, current amount, currency, and linked Vision when needed.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar stats panel */}
        <div className="min-w-0 w-full lg:w-[300px] shrink-0 flex flex-col gap-4">
          <DashboardProgressPulseCard
            currentStreak={currentStreak}
            totalProofLogs={progressLogs.length}
            weeklyScore={Math.min(100, Math.round(weeklyScore || 0))}
            tasksDone={completedTasksThisWeek.length}
            onOpen={() => navigate('/growth', { state: { fromDashboard: true, section: 'tracker' } })}
          />

          <button
            type="button"
            onClick={() => navigate('/feedback')}
            className="rounded-[1.7rem] border border-card-border bg-card p-4 text-left shadow-sm transition-all hover:border-accent/25 hover:shadow-md"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">Closed beta</p>
            <h3 className="mt-2 text-sm font-black text-text-main">Send feedback</h3>
            <p className="mt-1 text-[11px] font-semibold leading-5 text-text-secondary">
              Tell us what blocks Vision, Task, Proof, or Progress.
            </p>
          </button>

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
