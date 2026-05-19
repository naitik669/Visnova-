import type { FinanceGoal, GrowthTimelineEvent, ProgressLog, Vision } from '../types';

export type WeeklyActivityPoint = {
  day: string;
  logs: number;
  tasks: number;
  journal: number;
};

export type HeatmapPoint = {
  key: string;
  total: number;
  label: string;
};

export type VisionProgressItem = {
  vision: Vision;
  logs: number;
  completed: number;
  totalTasks: number;
  lastActivity: number;
};

export type MoneyGoalProgressItem = FinanceGoal & {
  progress: number;
  remaining: number;
  linkedVision: Vision | null;
};

export type DeadlineProgressItem = {
  vision: Vision;
  progress: number;
  daysRemaining: number;
  tasksRemaining: number;
  status: 'on track' | 'at risk' | 'behind' | 'completed';
};

export type ProgressPulseData = {
  totalLogs: number;
  currentStreak: number;
  weeklyScore: number;
  completedTasks: number;
  tasksCompletedThisWeek: number;
  activityChart: WeeklyActivityPoint[];
  heatmap: HeatmapPoint[];
  visionBreakdown: VisionProgressItem[];
  goals: MoneyGoalProgressItem[];
  deadlines: DeadlineProgressItem[];
  firstVision: Vision | null;
  firstLog: ProgressLog | null;
  updates: string[];
};

export type ProgressTimelineItem = {
  id: string;
  title: string;
  meta: string;
};

export type GrowthTrackerTimelineSource = {
  progressLogs: ProgressLog[];
  growthTimelineEvents: GrowthTimelineEvent[];
};
