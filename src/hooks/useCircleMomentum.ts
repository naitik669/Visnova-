import { useEffect, useMemo, useState } from 'react';
import { getAppPreferences } from '../lib/appPreferences';
import {
  buildCircleMomentum,
  CircleMomentumEntry,
  CircleMomentumRange,
  getCircleMomentumWindow,
  splitRowsByMomentumWindow,
  VisiblePost,
  VisibleTask,
  VisibleVision
} from '../lib/circleMomentum';
import { accountabilityFlags } from '../lib/accountabilityFlags';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import type { ProgressLog } from '../types';

const normalizeRemoteLog = (row: any): ProgressLog => ({
  id: String(row?.id || ''),
  userId: String(row?.user_id || ''),
  visionId: row?.vision_id || null,
  taskId: row?.task_id || null,
  postId: row?.post_id || null,
  logType: row?.log_type || 'progress',
  content: '',
  visibility: row?.visibility === 'public' || row?.visibility === 'circle' ? row.visibility : 'private',
  attachments: Array.isArray(row?.attachments) ? row.attachments : [],
  linkedItems: {},
  metadata: {},
  createdAt: new Date(row?.created_at || 0).getTime(),
  updatedAt: new Date(row?.updated_at || row?.created_at || 0).getTime()
});

const normalizeRemotePost = (row: any): VisiblePost => ({
  id: String(row?.id || ''),
  userId: String(row?.user_id || ''),
  visibility: row?.visibility === 'circle' ? 'circle' : row?.visibility === 'public' ? 'public' : 'private',
  createdAt: new Date(row?.created_at || row?.timestamp || 0).getTime()
});

const normalizeRemoteTask = (row: any): VisibleTask => ({
  id: String(row?.id || ''),
  text: String(row?.text || row?.title || 'Task'),
  completed: row?.completed === true || row?.status === 'done',
  status: row?.status || (row?.completed ? 'done' : 'planned'),
  visibility: row?.visibility === 'circle' ? 'circle' : row?.visibility === 'public' ? 'public' : 'private',
  completedAt: row?.completed_at || row?.completedAt || null,
  userId: String(row?.user_id || ''),
  user_id: String(row?.user_id || ''),
  created_at: row?.created_at,
  completed_at: row?.completed_at,
  updated_at: row?.updated_at
});

const normalizeRemoteVision = (row: any): VisibleVision => ({
  id: String(row?.id || ''),
  title: String(row?.title || 'Vision'),
  description: '',
  progress: Number(row?.progress || 0),
  status: row?.status || 'planning',
  tasks: [],
  notes: '',
  proof: [],
  tags: [],
  visibility: row?.visibility === 'circle' ? 'circle' : row?.visibility === 'public' ? 'public' : 'private',
  createdAt: new Date(row?.created_at || 0).getTime(),
  updatedAt: new Date(row?.updated_at || row?.created_at || 0).getTime(),
  userId: String(row?.user_id || ''),
  user_id: String(row?.user_id || ''),
  created_at: row?.created_at,
  updated_at: row?.updated_at
});

const visibleOnly = <T extends { visibility?: string }>(rows: T[]) =>
  rows.filter(row => row.visibility === 'public' || row.visibility === 'circle');

export function useCircleMomentum(initialRange: CircleMomentumRange = 'week') {
  const user = useStore(state => state.user);
  const circle = useStore(state => state.circle);
  const fetchCircleData = useStore(state => state.fetchCircleData);
  const fetchAccountabilityPreferences = useStore(state => state.fetchAccountabilityPreferences);
  const fetchWeeklyProofSprint = useStore(state => state.fetchWeeklyProofSprint);
  const accountabilityPreferences = useStore(state => state.accountabilityPreferences);
  const weeklyProofSprint = useStore(state => state.weeklyProofSprint);
  const localProgressLogs = useStore(state => state.progressLogs);
  const localVisions = useStore(state => state.visions);
  const localTodos = useStore(state => state.todos);
  const localPosts = useStore(state => state.posts);

  const [range, setRange] = useState<CircleMomentumRange>(initialRange);
  const [remoteLogs, setRemoteLogs] = useState<ProgressLog[]>([]);
  const [remoteTasks, setRemoteTasks] = useState<VisibleTask[]>([]);
  const [remoteVisions, setRemoteVisions] = useState<VisibleVision[]>([]);
  const [remotePosts, setRemotePosts] = useState<VisiblePost[]>([]);
  const [remoteSprintProgress, setRemoteSprintProgress] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userIds = useMemo(() => {
    const ids = new Set<string>();
    if (user.id) ids.add(user.id);
    circle.forEach(member => member.id && ids.add(member.id));
    return Array.from(ids);
  }, [circle, user.id]);

  const prefs = getAppPreferences();
  const dbVisibility = accountabilityPreferences?.momentumVisibility;
  const dbDetail = accountabilityPreferences?.momentumDetailLevel;
  const isHidden = (dbVisibility || prefs.circleMomentumVisibility) === 'hidden' || accountabilityPreferences?.showInCircleMomentum === false;
  const detailMode = dbDetail === 'score_only' ? 'score' : prefs.circleMomentumDetail;

  useEffect(() => {
    if (!user.id) return;
    fetchCircleData().catch(error => console.error('Failed to load Circle Momentum members:', error));
    if (accountabilityFlags.accountability) fetchAccountabilityPreferences().catch(error => console.error('Failed to load accountability preferences:', error));
    if (accountabilityFlags.weeklySprints) fetchWeeklyProofSprint().catch(error => console.error('Failed to load Weekly Proof Sprint:', error));
  }, [fetchAccountabilityPreferences, fetchCircleData, fetchWeeklyProofSprint, user.id]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user.id || userIds.length === 0 || !isSupabaseConfigured()) return;
      setIsLoading(true);
      setError(null);
      const window = getCircleMomentumWindow(range);
      const since = range === 'all' ? '2000-01-01T00:00:00.000Z' : window.previousStartIso;

      const [logsResult, tasksResult, visionsResult, postsResult, sprintsResult] = await Promise.allSettled([
        supabase
          .from('progress_logs')
          .select('id,user_id,vision_id,task_id,post_id,log_type,visibility,attachments,created_at,updated_at')
          .in('user_id', userIds)
          .in('visibility', ['public', 'circle'])
          .gte('created_at', since),
        supabase
          .from('tasks')
          .select('id,user_id,text,title,completed,status,visibility,completed_at,created_at,updated_at')
          .in('user_id', userIds)
          .in('visibility', ['public', 'circle'])
          .gte('updated_at', since),
        supabase
          .from('visions')
          .select('id,user_id,title,status,progress,visibility,created_at,updated_at')
          .in('user_id', userIds)
          .in('visibility', ['public', 'circle'])
          .gte('updated_at', since),
        supabase
          .from('posts')
          .select('id,user_id,visibility,created_at,timestamp')
          .in('user_id', userIds)
          .in('visibility', ['public', 'circle'])
          .eq('archived', false)
          .is('deleted_at', null)
          .gte('created_at', since),
        supabase
          .from('weekly_proof_sprints')
          .select('id,user_id,target_logs,target_tasks,current_logs,current_tasks,visibility,week_start,week_end,status')
          .in('user_id', userIds)
          .in('visibility', ['public', 'circle'])
          .gte('created_at', since)
      ]);

      if (cancelled) return;

      const nextLogs = logsResult.status === 'fulfilled' && !logsResult.value.error
        ? (logsResult.value.data || []).map(normalizeRemoteLog)
        : [];
      const nextTasks = tasksResult.status === 'fulfilled' && !tasksResult.value.error
        ? (tasksResult.value.data || []).map(normalizeRemoteTask)
        : [];
      const nextVisions = visionsResult.status === 'fulfilled' && !visionsResult.value.error
        ? (visionsResult.value.data || []).map(normalizeRemoteVision)
        : [];
      const nextPosts = postsResult.status === 'fulfilled' && !postsResult.value.error
        ? (postsResult.value.data || []).map(normalizeRemotePost)
        : [];
      const nextSprintProgress = sprintsResult.status === 'fulfilled' && !sprintsResult.value.error
        ? Object.fromEntries((sprintsResult.value.data || []).map((row: any) => {
          const target = Math.max(1, Number(row.target_logs || 3) + Number(row.target_tasks || 0));
          const current = Number(row.current_logs || 0) + Number(row.current_tasks || 0);
          return [String(row.user_id), Math.min(100, Math.round((current / target) * 100))];
        }))
        : {};

      const failed = [logsResult, tasksResult, visionsResult, postsResult, sprintsResult].some(result =>
        result.status === 'rejected' || (result.status === 'fulfilled' && Boolean(result.value.error))
      );
      setRemoteLogs(nextLogs);
      setRemoteTasks(nextTasks);
      setRemoteVisions(nextVisions);
      setRemotePosts(nextPosts);
      setRemoteSprintProgress(nextSprintProgress);
      setError(failed ? 'Some Circle activity could not be loaded.' : null);
      setIsLoading(false);
    };

    load().catch(err => {
      if (cancelled) return;
      console.error('Failed to load Circle Momentum:', err);
      setError('Circle Momentum could not load right now.');
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [range, user.id, userIds.join('|')]);

  const entries = useMemo<CircleMomentumEntry[]>(() => {
    const localVisionTasks: VisibleTask[] = localVisions.flatMap(vision =>
      (vision.tasks || []).map(task => ({
        ...task,
        userId: user.id,
        user_id: user.id,
        visibility: task.visibility || vision.visibility || 'private'
      }))
    );
    const localData = {
      logs: visibleOnly(localProgressLogs),
      tasks: visibleOnly([...localTodos.map(task => ({ ...task, userId: user.id, user_id: user.id })), ...localVisionTasks]),
      visions: visibleOnly(localVisions.map(vision => ({ ...vision, userId: user.id, user_id: user.id }))),
      posts: visibleOnly(localPosts.map(post => ({
        id: post.id,
        userId: post.userId,
        visibility: post.visibility,
        createdAt: post.createdAt || new Date(post.timestamp).getTime()
      })))
    };

    const logs = [...remoteLogs, ...localData.logs].filter((row, index, all) => all.findIndex(item => item.id === row.id) === index);
    const tasks = [...remoteTasks, ...localData.tasks].filter((row, index, all) => all.findIndex(item => item.id === row.id) === index);
    const visions = [...remoteVisions, ...localData.visions].filter((row, index, all) => all.findIndex(item => item.id === row.id) === index);
    const posts = [...remotePosts, ...localData.posts].filter((row, index, all) => all.findIndex(item => item.id === row.id) === index);

    const logWindow = splitRowsByMomentumWindow(logs, range);
    const taskWindow = splitRowsByMomentumWindow(tasks, range);
    const visionWindow = splitRowsByMomentumWindow(visions, range);
    const postWindow = splitRowsByMomentumWindow(posts, range);

    const currentSprintProgress = weeklyProofSprint
      ? Math.min(100, Math.round(((weeklyProofSprint.currentLogs + weeklyProofSprint.currentTasks) / Math.max(1, weeklyProofSprint.targetLogs + weeklyProofSprint.targetTasks)) * 100))
      : 0;

    return buildCircleMomentum({
      user,
      circle,
      progressLogs: logWindow.current,
      tasks: taskWindow.current,
      visions: visionWindow.current,
      posts: postWindow.current,
      previousProgressLogs: logWindow.previous,
      previousTasks: taskWindow.previous,
      previousVisions: visionWindow.previous,
      previousPosts: postWindow.previous,
      weeklySprintProgressByUser: {
        ...remoteSprintProgress,
        ...(user.id ? { [user.id]: currentSprintProgress } : {})
      }
    });
  }, [circle, localPosts, localProgressLogs, localTodos, localVisions, range, remoteLogs, remotePosts, remoteSprintProgress, remoteTasks, remoteVisions, user, weeklyProofSprint]);

  const currentUserEntry = entries.find(entry => entry.isCurrentUser);

  return {
    entries,
    topEntries: entries.slice(0, 5),
    currentUserEntry,
    range,
    setRange,
    isLoading,
    error,
    isHidden,
    detailMode
  };
}
