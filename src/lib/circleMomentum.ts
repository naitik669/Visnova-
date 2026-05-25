import type { AppState, CircleMember, ProgressLog, Task, Vision } from '../types';

export type CircleMomentumRange = 'week' | 'month' | 'all';

export type CircleMomentumEntry = {
  userId: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  momentumScore: number;
  progressLogsCount: number;
  completedTasksCount: number;
  proofUploadsCount: number;
  activeVisionsCount: number;
  visiblePostsCount: number;
  resourceUpdatesCount: number;
  weeklySprintProgress: number;
  currentStreak: number;
  topBadge: string;
  rank: number;
  changeFromLastWeek: number;
  isCurrentUser?: boolean;
};

export type VisiblePost = {
  id: string;
  userId: string;
  createdAt?: number;
  visibility?: 'public' | 'circle' | 'private';
};

export type VisibleTask = Task & {
  userId?: string;
  user_id?: string;
  created_at?: string;
  completed_at?: string | null;
  updated_at?: string;
};

export type VisibleVision = Vision & {
  userId?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
};

type BuildCircleMomentumInput = {
  user: AppState['user'];
  circle: CircleMember[];
  progressLogs: ProgressLog[];
  tasks: VisibleTask[];
  visions: VisibleVision[];
  posts: VisiblePost[];
  previousProgressLogs?: ProgressLog[];
  previousTasks?: VisibleTask[];
  previousVisions?: VisibleVision[];
  previousPosts?: VisiblePost[];
  weeklySprintProgressByUser?: Record<string, number>;
  includeCurrentUser?: boolean;
};

export const getCircleMomentumWindow = (range: CircleMomentumRange) => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (range === 'week') {
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);
  } else if (range === 'month') {
    start.setDate(1);
  } else {
    start.setFullYear(2000, 0, 1);
  }

  const previousStart = new Date(start);
  const previousEnd = new Date(start);
  if (range === 'week') previousStart.setDate(previousStart.getDate() - 7);
  else if (range === 'month') previousStart.setMonth(previousStart.getMonth() - 1);
  else previousStart.setFullYear(1990, 0, 1);

  return {
    startMs: start.getTime(),
    startIso: start.toISOString(),
    previousStartMs: previousStart.getTime(),
    previousStartIso: previousStart.toISOString(),
    previousEndMs: previousEnd.getTime(),
    previousEndIso: previousEnd.toISOString()
  };
};

const safeTime = (value: unknown) => {
  const time = typeof value === 'number' ? value : new Date(String(value || '')).getTime();
  return Number.isFinite(time) ? time : 0;
};

const streakBonus = (streak: number) => {
  if (streak >= 7) return 15;
  if (streak >= 5) return 10;
  if (streak >= 3) return 5;
  return 0;
};

const getExecutionWeight = (entry: Pick<CircleMomentumEntry, 'progressLogsCount' | 'completedTasksCount' | 'proofUploadsCount'>) =>
  entry.progressLogsCount * 100 + entry.completedTasksCount * 65 + entry.proofUploadsCount * 20;

const scoreMomentum = (entry: Omit<CircleMomentumEntry, 'momentumScore' | 'rank' | 'topBadge' | 'changeFromLastWeek'>) => {
  const executionPoints =
    entry.progressLogsCount * 30
    + entry.completedTasksCount * 20
    + entry.proofUploadsCount * 10;
  const sprintPoints = entry.weeklySprintProgress > 0 ? Math.round((entry.weeklySprintProgress / 100) * 10) : 0;
  const hasExecution = executionPoints > 0 || sprintPoints > 0;
  return Math.min(100, executionPoints + sprintPoints + (hasExecution ? streakBonus(entry.currentStreak) : 0));
};

const getBadge = (entry: CircleMomentumEntry) => {
  if (entry.currentStreak >= 5) return 'Most consistent';
  if (entry.progressLogsCount >= 3) return 'Proof builder';
  if (entry.completedTasksCount >= 3) return 'Task crusher';
  if (entry.activeVisionsCount >= 2) return 'Vision builder';
  if (entry.changeFromLastWeek > 15) return 'Comeback energy';
  return 'Building momentum';
};

const countProofUploads = (logs: ProgressLog[]) => logs.reduce((sum, log) => sum + (Array.isArray(log.attachments) && log.attachments.length > 0 ? 1 : 0), 0);

const rowUserId = (row: { userId?: string; user_id?: string }) => row.userId || row.user_id || '';

const buildRawEntry = (
  userId: string,
  profile: Pick<CircleMomentumEntry, 'displayName' | 'username' | 'avatarUrl' | 'currentStreak' | 'isCurrentUser'>,
  data: Pick<BuildCircleMomentumInput, 'progressLogs' | 'tasks' | 'visions' | 'posts'>
) => {
  const logs = data.progressLogs.filter(log => log.userId === userId && log.visibility !== 'private');
  const tasks = data.tasks.filter(task => rowUserId(task) === userId && Boolean(task.completed) && task.visibility !== 'private');
  const visions = data.visions.filter(vision => rowUserId(vision) === userId && vision.status !== 'completed' && vision.visibility !== 'private');
  const posts = data.posts.filter(post => post.userId === userId && post.visibility !== 'private');

  const base = {
    userId,
    displayName: profile.displayName,
    username: profile.username,
    avatarUrl: profile.avatarUrl,
    progressLogsCount: logs.length,
    completedTasksCount: tasks.length,
    proofUploadsCount: countProofUploads(logs),
    activeVisionsCount: visions.filter(vision => vision.id && (profile.isCurrentUser || vision.visibility !== 'private')).length,
    visiblePostsCount: posts.length,
    resourceUpdatesCount: 0,
    weeklySprintProgress: 0,
    currentStreak: profile.currentStreak || 0,
    isCurrentUser: profile.isCurrentUser
  };

  return {
    ...base,
    momentumScore: scoreMomentum(base),
    topBadge: 'Building momentum',
    rank: 0,
    changeFromLastWeek: 0
  } satisfies CircleMomentumEntry;
};

export function buildCircleMomentum(input: BuildCircleMomentumInput): CircleMomentumEntry[] {
  const users = new Map<string, Pick<CircleMomentumEntry, 'displayName' | 'username' | 'avatarUrl' | 'currentStreak' | 'isCurrentUser'>>();
  if (input.includeCurrentUser !== false && input.user.id) {
    users.set(input.user.id, {
      displayName: input.user.name || 'You',
      username: input.user.username,
      avatarUrl: input.user.avatar,
      currentStreak: input.user.streak || 0,
      isCurrentUser: true
    });
  }
  input.circle.forEach(member => users.set(member.id, {
    displayName: member.name || member.username || 'Builder',
    username: member.username,
    avatarUrl: member.avatar,
    currentStreak: member.streak || 0
  }));

  const entries = Array.from(users.entries()).map(([userId, profile]) => {
    const entry = buildRawEntry(userId, profile, input);
    entry.weeklySprintProgress = Math.max(0, Math.min(100, input.weeklySprintProgressByUser?.[userId] || 0));
    entry.momentumScore = scoreMomentum(entry);
    const previous = buildRawEntry(userId, profile, {
      progressLogs: input.previousProgressLogs || [],
      tasks: input.previousTasks || [],
      visions: input.previousVisions || [],
      posts: input.previousPosts || []
    });
    return { ...entry, changeFromLastWeek: entry.momentumScore - previous.momentumScore };
  });

  return entries
    .sort((a, b) =>
      getExecutionWeight(b) - getExecutionWeight(a)
      || b.momentumScore - a.momentumScore
      || b.weeklySprintProgress - a.weeklySprintProgress
      || b.currentStreak - a.currentStreak
      || a.displayName.localeCompare(b.displayName)
    )
    .map((entry, index, sorted) => {
      const withRank = { ...entry, rank: index + 1 };
      const highestLogs = Math.max(...sorted.map(item => item.progressLogsCount), 0);
      const highestTasks = Math.max(...sorted.map(item => item.completedTasksCount), 0);
      const topBadge = entry.progressLogsCount > 0 && entry.progressLogsCount === highestLogs
        ? 'Most proof logged'
        : entry.completedTasksCount > 0 && entry.completedTasksCount === highestTasks
          ? 'Task crusher'
          : getBadge(withRank);
      return { ...withRank, topBadge };
    });
}

export const splitRowsByMomentumWindow = <T extends { created_at?: string; createdAt?: number; completed_at?: string; completedAt?: string | null; updated_at?: string; updatedAt?: number }>(
  rows: T[],
  range: CircleMomentumRange
) => {
  const window = getCircleMomentumWindow(range);
  const getRowTime = (row: T) => safeTime(row.completedAt || row.completed_at || row.updatedAt || row.updated_at || row.createdAt || row.created_at);
  return {
    current: rows.filter(row => getRowTime(row) >= window.startMs),
    previous: rows.filter(row => getRowTime(row) >= window.previousStartMs && getRowTime(row) < window.previousEndMs),
    window
  };
};
