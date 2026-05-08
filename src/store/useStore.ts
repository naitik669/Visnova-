/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { AppState, Vision, Activity, CircleMember, Folder, Note, Task, Post, JournalEntry, DailyActivitySource, DailyActivitySummary } from '../types';
import { rankPosts } from '../services/feedRankingService';
import { notificationService } from '../services/notificationService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { format } from 'date-fns';

function isDbId(id: string | undefined): id is string {
  return typeof id === 'string' && id.length > 0;
}

function normalizePostTag(tag: string) {
  return tag.replace(/^#/, '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

function normalizeUsernameInput(username: string) {
  return username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '').slice(0, 24);
}

function extractMentionUsernames(text: string) {
  return Array.from(new Set((text.match(/@([a-z0-9_]{3,24})/gi) || [])
    .map(match => normalizeUsernameInput(match.replace('@', '')))
    .filter(Boolean)));
}

function extractStoragePathFromUrl(url: string | undefined, bucket: string) {
  if (!url) return '';
  const marker = `/storage/v1/object/public/${bucket}/`;
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return '';
  return decodeURIComponent(url.slice(markerIndex + marker.length).split('?')[0]);
}

function toDateKey(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function yesterdayDateKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return toDateKey(date);
}

const dailyActivityColumns: Record<DailyActivitySource, keyof Omit<DailyActivitySummary, 'date' | 'totalCount'>> = {
  task: 'taskCount',
  todo: 'todoCount',
  post: 'postCount',
  note: 'noteCount',
  journal: 'journalCount',
  vision: 'visionCount',
  focus: 'focusCount'
};

function emptyDailyActivity(date: string): DailyActivitySummary {
  return {
    date,
    taskCount: 0,
    todoCount: 0,
    postCount: 0,
    noteCount: 0,
    journalCount: 0,
    visionCount: 0,
    focusCount: 0,
    totalCount: 0
  };
}

function toDailyActivitySummary(row: any): DailyActivitySummary {
  return {
    date: row.activity_date,
    taskCount: row.task_count || 0,
    todoCount: row.todo_count || 0,
    postCount: row.post_count || 0,
    noteCount: row.note_count || 0,
    journalCount: row.journal_count || 0,
    visionCount: row.vision_count || 0,
    focusCount: row.focus_count || 0,
    totalCount: row.total_count || 0
  };
}

function lastSevenDateKeys() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return toDateKey(date);
  });
}

async function notifyMentionedUsers({
  actorId,
  postId,
  commentId,
  mentions,
  message
}: {
  actorId: string;
  postId?: string;
  commentId?: string;
  mentions: Array<{ userId?: string; username?: string }>;
  message: string;
}) {
  const mentionedIds = new Set(mentions.map(mention => mention.userId).filter(Boolean) as string[]);
  const missingUsernames = Array.from(new Set(
    mentions
      .filter(mention => !mention.userId && mention.username)
      .map(mention => normalizeUsernameInput(mention.username || ''))
      .filter(Boolean)
  ));

  if (missingUsernames.length > 0) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username')
      .in('username', missingUsernames);
    if (error) {
      console.error('Failed to resolve mention notifications:', error);
    } else {
      (data || []).forEach((profile: any) => mentionedIds.add(profile.id));
    }
  }

  await notificationService.sendMany(Array.from(mentionedIds).map(userId => ({
    userId,
    actorId,
    type: 'mention',
    postId,
    commentId,
    message
  })));
}

const defaultUser: AppState['user'] = {
  id: undefined,
  name: 'Explorer',
  email: '',
  avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=Explorer&backgroundColor=d1d5db',
  gender: 'male',
  rank: 'Explorer',
  level: 1,
  xp: 0,
  streak: 0,
  dailyIntention: '',
  isGrinding: false,
};

const AUTH_BOOTSTRAP_TIMEOUT_MS = 12000;
const PROFILE_QUERY_TIMEOUT_MS = 12000;
const DASHBOARD_CORE_TIMEOUT_MS = 5000;

function runBackground(label: string, action: () => Promise<any>) {
  action().catch(error => console.error(`${label} failed:`, error));
}

function toProfileUser(profile: any, fallbackEmail = ''): AppState['user'] {
  return {
    ...defaultUser,
    id: profile.id,
    name: profile.display_name || profile.full_name || 'Explorer',
    email: profile.email || fallbackEmail,
    username: profile.username || undefined,
    avatar: profile.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${profile.id}`,
    rank: profile.role || 'Explorer',
    level: profile.level || 1,
    xp: profile.xp || 0,
    streak: profile.streak || 0,
    isGrinding: profile.is_grinding || false,
    bio: profile.bio || '',
    statusNote: profile.status_note || '',
    role: profile.role || 'Explorer',
    mainGoal: profile.main_goal || '',
    interests: profile.interests || [],
    verified: !!profile.verified,
  };
}

function privateStateReset() {
  return {
    authUser: null,
    profile: null,
    isProfileReady: false,
    user: defaultUser,
    hasCompletedOnboarding: false,
    session: null,
    visions: [],
    sharedVisions: [],
    activities: [],
    circle: [],
    folders: [],
    notes: [],
    todos: [],
    posts: [],
    journalEntries: [],
    userInterests: {},
    userCircles: {},
    followingIds: [],
    followerCounts: {},
    followingCounts: {},
    userStreak: null,
    weeklyActivity: [],
    notifications: [],
    unreadNotificationCount: 0,
  };
}

let authSubscription: { unsubscribe: () => void } | null = null;
let circleDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const scheduleCircleRefresh = (get: () => AppState) => {
  if (circleDebounceTimer) clearTimeout(circleDebounceTimer);
  circleDebounceTimer = setTimeout(() => {
    get().fetchCircleData().catch(error => console.error('Failed to refresh circle:', error));
    circleDebounceTimer = null;
  }, 500);
};

function toLocalPost(row: any, draft: any, author: AppState['user']): Post {
  const createdAt = row.created_at ? new Date(row.created_at).getTime() : Date.now();
  return {
    id: row.id,
    userId: row.user_id,
    author: {
      id: row.user_id,
      name: author.name || 'Explorer',
      avatar: author.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${row.user_id}`,
      handle: `@${author.username || 'user'}`,
      verified: author.verified
    },
    caption: row.caption ?? draft.caption,
    content: row.content ?? draft.content ?? '',
    timestamp: format(new Date(createdAt), 'MMM d, yyyy'),
    createdAt,
    likes: 0,
    comments: 0,
    saves: 0,
    isLiked: false,
    isSaved: false,
    type: row.type || draft.type || 'update',
    visibility: row.visibility || draft.visibility || 'public',
    archived: !!row.archived,
    archivedAt: row.archived_at || null,
    deletedAt: row.deleted_at || null,
    media: draft.media?.map((m: any) => ({
      id: m.id || m.storagePath || m.url,
      url: m.url,
      type: m.type
    })) || [],
    tags: draft.tags || [],
    mentions: draft.mentions || [],
    stats: row.stats || {},
    metadata: row.metadata || draft.metadata || {}
  };
}

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out. Please try again.`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

export const useStore = create<AppState>((set, get) => ({
  authUser: null,
  profile: null,
  user: defaultUser,
  circle: [],
  visions: [],
  activities: [],
  sharedVisions: [],
  vitals: {
    focus: 85,
    energy: 72,
    mood: 90,
    sleep: 64,
  },
  folders: [],
  notes: [],
  todos: [],
  posts: [],
  focusPresets: [
    { id: 'p1', label: 'Deep Work', duration: 25, type: 'work' },
    { id: 'p2', label: 'Hyper Focus', duration: 50, type: 'work' },
    { id: 'p3', label: 'Quick Rest', duration: 5, type: 'rest' },
    { id: 'p4', label: 'Power Nap', duration: 20, type: 'rest' },
  ],
  dateNotes: {},
  journalEntries: [],
  userInterests: {},
  userCircles: {},
  followingIds: [],
  followerCounts: {},
  followingCounts: {},
  userStreak: null,
  weeklyActivity: [],
  notifications: [],
  unreadNotificationCount: 0,
  achievements: [],
  milestones: [],
  authLoading: true,
  profileLoading: false,
  isProfileReady: false,
  hasCompletedOnboarding: false,
  tutorialCompleted: localStorage.getItem('visnova_tour_completed') === 'true',
  isFocusMode: false,
  toasts: [],
  focusSession: {
    isActive: false,
    isRunning: false,
    timeLeft: 0,
    totalTime: 0,
    label: '',
  },
    theme: (localStorage.getItem('theme') as 'light' | 'dark' | 'midnight' | 'graphite' | 'forest-dark' | 'plum-dark' | 'pastel' | 'green' | 'yellow' | 'sage') || 'sage',
  session: null,
  selectedProfileId: null,
  isDashboardLoading: false,
  isAuthInitialized: false,

  setSelectedProfileId: (id) => set({ selectedProfileId: id }),
  setSession: (session) => {
    set({ session, authUser: session?.user || null, isAuthInitialized: true });
    if (session?.user) {
      get().loadUserProfile(session.user.id);
    }
  },

  initializeAuth: async () => {
    const existingState = get();
    if (existingState.isAuthInitialized && existingState.session?.user && existingState.isProfileReady) {
      get().loadUserProfile(existingState.session.user.id).catch(error => console.error('Background profile refresh failed:', error));
      return;
    }

    authSubscription?.unsubscribe();
    authSubscription = null;
    set((state) => ({
      authLoading: !state.isAuthInitialized,
      profileLoading: false,
      isProfileReady: state.session?.user && state.isProfileReady ? true : false
    }));
    try {
      const { data: { session } } = await withTimeout(
        supabase.auth.getSession(),
        AUTH_BOOTSTRAP_TIMEOUT_MS,
        'Starting VisNova'
      );
      if (!session?.user) {
        set({ ...privateStateReset(), authLoading: false, profileLoading: false, isProfileReady: true, isAuthInitialized: true });
      } else {
        set({ session, authUser: session.user, isAuthInitialized: true, isProfileReady: false });
        await get().ensureCurrentUserProfile();
        await get().loadUserProfile(session.user.id);
      }
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (event === 'SIGNED_OUT' || !newSession?.user) {
          set({ ...privateStateReset(), authLoading: false, profileLoading: false, isProfileReady: true, isAuthInitialized: true });
          return;
        }

        const currentState = get();
        const hasUsableProfile = !!currentState.profile || currentState.hasCompletedOnboarding || currentState.isProfileReady;
        const shouldBlockForProfile = event === 'SIGNED_IN' && !hasUsableProfile;

        set((state) => ({
          session: newSession,
          authUser: newSession.user,
          isAuthInitialized: true,
          profileLoading: true,
          isProfileReady: shouldBlockForProfile ? false : state.isProfileReady || hasUsableProfile
        }));

        if (event === 'SIGNED_IN') {
          try {
            await withTimeout(get().ensureCurrentUserProfile(), PROFILE_QUERY_TIMEOUT_MS, 'Preparing your profile');
            await get().loadUserProfile(newSession.user.id);
          } catch (error) {
            console.error('Signed-in profile refresh failed:', error);
            set({ profileLoading: false, isProfileReady: true });
          }
          return;
        }

        if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
          get().loadUserProfile(newSession.user.id).catch(error => {
            console.error('Background auth profile refresh failed:', error);
            set({ profileLoading: false, isProfileReady: true });
          });
          return;
        }

        set({ profileLoading: false, isProfileReady: true });
      });
      authSubscription = subscription;
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ ...privateStateReset(), authLoading: false, profileLoading: false, isProfileReady: true, isAuthInitialized: true });
    } finally {
      set({ authLoading: false });
    }
  },

  fetchDashboardData: async () => {
    const userId = get().session?.user?.id;
    if (!userId) return;

    set({ isDashboardLoading: true });
    try {
      await withTimeout(
        Promise.allSettled([
          get().fetchVisions(),
          get().fetchTodos(),
          get().fetchJournalEntries(),
          get().fetchUserStreak(),
          get().fetchWeeklyActivity(),
        ]),
        DASHBOARD_CORE_TIMEOUT_MS,
        'Loading dashboard'
      );
    } catch (error) {
      console.error('Dashboard core data was slow:', error);
    } finally {
      set({ isDashboardLoading: false });
    }

    runBackground('Dashboard profile refresh', () => get().loadUserProfile(userId));
    runBackground('Dashboard notes refresh', () => get().fetchNotes());
    runBackground('Dashboard feed context refresh', () => get().fetchFeedContext());
    runBackground('Dashboard circle refresh', () => get().fetchCircleData());
    runBackground('Dashboard notifications refresh', () => get().fetchNotifications());
  },

  loadUserProfile: async (userId: string) => {
    const wasProfileReady = get().isProfileReady;
    set({ profileLoading: true, isProfileReady: wasProfileReady });
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        PROFILE_QUERY_TIMEOUT_MS,
        'Loading your profile'
      );
      
      if (error) throw error;
      
      if (data) {
        set((state) => ({
          profile: data,
          user: toProfileUser(data, state.session?.user?.email || state.user.email),
          vitals: {
            focus: data.focus ?? 85,
            energy: data.energy ?? 72,
            mood: data.mood ?? 90,
            sleep: data.sleep ?? 64,
          },
          hasCompletedOnboarding: !!data.onboarded
        }));
        get().fetchProfileStats(userId).catch(error => console.error('Failed to load profile stats:', error));
        get().fetchUserStreak().catch(error => console.error('Failed to load streak:', error));
      } else {
        const newProfile = await get().ensureCurrentUserProfile();
        if (newProfile) {
          // Recursive call or just update state here. Recursive is safer to ensure consistency.
          await get().loadUserProfile(userId);
          return;
        }
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    } finally {
      set({ profileLoading: false, isProfileReady: true });
    }
  },

  fetchVisions: async () => {
    const userId = get().session?.user?.id;
    if (!userId) return;

    try {
      const { data: visionsData, error: visionsError } = await supabase
        .from('visions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (visionsError) throw visionsError;

      // Extract vision IDs for task fetching
      const visionIds = visionsData.map(v => v.id);
      let tasksData: any[] = [];
      if (visionIds.length > 0) {
        const { data: fetchedTasks, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .in('vision_id', visionIds)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });
        if (tasksError) throw tasksError;
        tasksData = fetchedTasks || [];
      }

      const formattedVisions: Vision[] = visionsData.map((v: any) => {
        const visionTasks = (tasksData || [])
          .filter(t => t.vision_id === v.id)
          .map(t => ({
            id: t.id,
            text: t.text,
            completed: t.completed,
            priority: t.priority || 'low',
            subTasks: t.sub_tasks || []
          }));
          
        return {
          id: v.id,
          title: v.title,
          description: v.description,
          progress: v.progress || 0,
          status: v.status || 'idea',
          tasks: visionTasks as Task[],
          notes: v.notes || '',
          proof: v.proof || [],
          tags: v.tags || [],
          category: v.category,
          elements: v.elements || [],
          createdAt: new Date(v.created_at).getTime(),
          visibility: v.visibility,
          deadline: v.deadline,
        };
      });

      set({ visions: formattedVisions });
    } catch (error) {
      console.error('Failed to fetch visions:', error);
    }
  },

  fetchTodos: async () => {
    const userId = get().session?.user?.id;
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTodos: Task[] = data.map((t: any) => ({
        id: t.id,
        text: t.text,
        completed: t.completed,
      }));

      set({ todos: formattedTodos });
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    }
  },

  toggleVisionTask: async (visionId, taskId) => {
    const userId = get().session?.user?.id;
    if (!userId) {
      get().addToast({ type: 'error', title: 'Login required', description: 'Sign in to update tasks.' });
      return;
    }
    const { visions } = get();
    const vision = visions.find(v => v.id === visionId);
    if (!vision) {
      get().addToast({ type: 'error', title: 'Vision unavailable', description: 'Refresh the dashboard and try again.' });
      return;
    }

    const task = vision.tasks.find(t => t.id === taskId);
    if (!task) {
      get().addToast({ type: 'error', title: 'Task unavailable', description: 'Refresh the dashboard and try again.' });
      return;
    }

    const newCompleted = !task.completed;
    const newTasks = vision.tasks.map(t => t.id === taskId ? { ...t, completed: newCompleted } : t);
    
    const completedCount = newTasks.filter(t => t.completed).length;
    const progress = newTasks.length > 0 ? Math.round((completedCount / newTasks.length) * 100) : 0;

    // Optimistic UI
    set((state) => ({
      visions: state.visions.map(v => v.id === visionId ? { ...v, tasks: newTasks, progress } : v)
    }));

    try {
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ completed: newCompleted })
        .eq('id', taskId)
        .eq('user_id', userId);

      if (taskError) throw taskError;

      // Update vision progress in DB
      const { error: visionError } = await supabase
        .from('visions')
        .update({ progress })
        .eq('id', visionId)
        .eq('user_id', userId);
      
      if (visionError) throw visionError;
      
      if (newCompleted) {
        get().addXp(15);
        get().recordDailyActivity('task');
        get().addActivity({
          type: 'completed',
          description: `Completed task: ${task.text} in ${vision.title}`,
          visionId
        });
      }
    } catch (error) {
      console.error('Failed to toggle vision task:', error);
      // Rollback
      set((state) => ({
        visions: state.visions.map(v => v.id === visionId ? { ...v, tasks: vision.tasks, progress: vision.progress } : v)
      }));
      get().addToast({ type: 'error', title: 'Task failed', description: 'Could not save progress.' });
    }
  },

  updateVitals: async (newVitals) => {
    set((state) => ({
      vitals: { ...state.vitals, ...newVitals }
    }));

    const userId = get().session?.user?.id;
    if (userId) {
      try {
        await supabase.from('profiles').update(newVitals).eq('id', userId);
      } catch (error) {
        console.error('Failed to update vitals in DB:', error);
      }
    }
  },

  addToast: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set((state) => ({
      toasts: [...state.toasts.slice(-3), { id, ...toast }],
    }));
  },

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((toast) => toast.id !== id),
  })),

  addVision: async (vision) => {
    const userId = get().session?.user?.id;
    if (!userId) {
      get().addToast({ type: 'error', title: 'Action required', description: 'Please sign in to create visions.' });
      throw new Error('Not authenticated');
    }

    const tempId = Math.random().toString(36).substring(7);
    const newVision: Vision = {
      id: tempId,
      title: vision.title || 'Untitled Vision',
      description: vision.description || '',
      progress: 0,
      status: 'idea',
      tasks: [],
      notes: '',
      proof: [],
      tags: vision.tags || [],
      createdAt: Date.now(),
      ...vision,
    } as Vision;

    set((state) => ({ visions: [...state.visions, newVision] }));

    try {
      const { data, error } = await supabase
        .from('visions')
        .insert({
          user_id: userId,
          title: newVision.title,
          description: newVision.description,
          status: newVision.status,
          category: newVision.category,
          tags: newVision.tags,
          notes: newVision.notes,
          proof: newVision.proof,
          elements: newVision.elements || [],
          visibility: newVision.visibility || 'private',
          deadline: newVision.deadline || null
        })
        .select()
        .single();

      if (error) throw error;
      
      set((state) => ({
        visions: state.visions.map(v => v.id === tempId ? { ...v, id: data.id } : v)
      }));
      
      get().addToast({ type: 'success', title: 'Vision created', description: `"${newVision.title}" is ready.` });
      get().recordDailyActivity('vision');
      return { ...newVision, id: data.id };
    } catch (error: any) {
      console.error('Failed to create vision:', error);
      set((state) => ({ visions: state.visions.filter(v => v.id !== tempId) }));
      get().addToast({ type: 'error', title: 'Vision failed', description: error.message });
      throw error;
    }
  },

  updateVision: async (id, updates) => {
    const previousVisions = get().visions;
    set((state) => ({
      visions: state.visions.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    }));

    try {
      const dbUpdates: any = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.proof !== undefined) dbUpdates.proof = updates.proof;
      if (updates.elements !== undefined) dbUpdates.elements = updates.elements;
      if (updates.visibility !== undefined) dbUpdates.visibility = updates.visibility;
      if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
      dbUpdates.updated_at = new Date().toISOString();
      const userId = get().session?.user?.id;
      const query = supabase.from('visions').update(dbUpdates).eq('id', id);
      const { error } = userId ? await query.eq('user_id', userId) : await query;
      if (error) throw error;
    } catch (error: any) {
      console.error('Failed to update vision:', error);
      set({ visions: previousVisions });
      get().addToast({ type: 'error', title: 'Vision update failed', description: error.message || 'Could not save vision.' });
    }
  },

  deleteVision: async (id) => {
    set((state) => ({
      visions: state.visions.filter((v) => v.id !== id),
    }));

    try {
      const userId = get().session?.user?.id;
      const query = supabase.from('visions').delete().eq('id', id);
      const { error } = userId ? await query.eq('user_id', userId) : await query;
      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete vision:', error);
    }
  },

  moveVision: async (id, newStatus) => {
    set((state) => ({
      visions: state.visions.map((v) => (v.id === id ? { ...v, status: newStatus } : v)),
    }));

    try {
      await supabase.from('visions').update({ status: newStatus }).eq('id', id);
    } catch (error) {
      console.error('Failed to move vision:', error);
    }
  },

  reorderVisions: (visions) => set({ visions }),

  addActivity: async (activity) => {
    const userId = get().session?.user?.id;
    const newActivity: Activity = {
      ...activity,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      userId: userId || 'anonymous'
    };

    set((state) => ({
      activities: [newActivity, ...state.activities],
    }));

    if (userId) {
      try {
        await supabase.from('activities').insert({
          user_id: userId,
          type: activity.type,
          description: activity.description
        });
      } catch (error) {
        console.error('Failed to log activity:', error);
      }
    }
  },
  
  signInWithGoogle: async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      get().addToast({ type: 'error', title: 'Sign-in failed', description: err.message });
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      set({ ...privateStateReset(), isProfileReady: true, authLoading: false, profileLoading: false });
      window.location.href = '/';
    } catch (err: any) {
      console.error('Sign-Out Error:', err);
      get().addToast({ type: 'error', title: 'Sign-out failed', description: err.message });
    }
  },

  updateOnboardingStep: async (step: number) => {
    const userId = get().session?.user?.id;
    if (!userId) return;

    try {
      await supabase.from('profiles').update({ onboarding_step: step }).eq('id', userId);
      // Local state update if needed, but usually the store's user.onboardingStep is enough
    } catch (err) {
      console.error('Failed to update onboarding step:', err);
    }
  },
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
  completeTutorial: () => {
    localStorage.setItem('visnova_tour_completed', 'true');
    set({ tutorialCompleted: true });
  },
  restartTutorial: () => {
    localStorage.removeItem('visnova_tour_completed');
    set({ tutorialCompleted: false });
  },
  updateUser: async (updates) => {
    const userId = get().session?.user?.id;
    if (!userId) {
      get().addToast({ type: 'error', title: 'Login required', description: 'Sign in before editing your profile.' });
      return false;
    }

    const previousUser = get().user;
    const previousProfile = get().profile;

    try {
      const dbUpdates: any = {};
      const nextUserUpdates: Partial<AppState['user']> = {};

      if (updates.name !== undefined) {
        const displayName = String(updates.name || '').trim();
        if (!displayName) throw new Error('Display name is required.');
        dbUpdates.display_name = displayName;
        dbUpdates.full_name = displayName;
        nextUserUpdates.name = displayName;
      }

      if (updates.username !== undefined) {
        const normalizedUsername = normalizeUsernameInput(String(updates.username || ''));
        if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
          throw new Error('Use 3-24 lowercase letters, numbers, or underscores for your username.');
        }

        if (normalizedUsername !== previousUser.username) {
          const { data: available, error: availabilityError } = await supabase.rpc('is_username_available', {
            candidate_username: normalizedUsername,
            current_user_id: userId
          });
          if (availabilityError) throw availabilityError;
          if (!available) throw new Error('Username is already taken.');
        }

        dbUpdates.username = normalizedUsername;
        nextUserUpdates.username = normalizedUsername;
      }

      if (updates.avatar !== undefined) {
        dbUpdates.avatar_url = updates.avatar || null;
        nextUserUpdates.avatar = updates.avatar;
      }
      if (updates.bio !== undefined) {
        dbUpdates.bio = updates.bio || '';
        nextUserUpdates.bio = updates.bio || '';
      }
      if (updates.role !== undefined) {
        dbUpdates.role = updates.role || null;
        nextUserUpdates.role = updates.role || '';
        nextUserUpdates.rank = updates.role || previousUser.rank;
      }
      if (updates.mainGoal !== undefined) {
        dbUpdates.main_goal = updates.mainGoal || '';
        nextUserUpdates.mainGoal = updates.mainGoal || '';
      }
      if (updates.interests !== undefined) {
        dbUpdates.interests = updates.interests || [];
        nextUserUpdates.interests = updates.interests || [];
      }

      dbUpdates.updated_at = new Date().toISOString();

      if (Object.keys(dbUpdates).length <= 1) return true;

      set((state) => ({
        user: { ...state.user, ...nextUserUpdates },
        profile: state.profile ? { ...state.profile, ...dbUpdates } : state.profile
      }));

      const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', userId);
      if (error) throw error;

      await get().loadUserProfile(userId);
      get().addToast({ type: 'success', title: 'Profile updated', description: 'Your profile changes were saved.' });
      return true;
    } catch (error: any) {
      console.error('Failed to update user profile:', error);
      set({ user: previousUser, profile: previousProfile });
      get().addToast({ type: 'error', title: 'Profile update failed', description: error.message || 'Could not save profile.' });
      return false;
    }
  },
  toggleGrinding: async () => {
    const { user } = get();
    const newIsGrinding = !user.isGrinding;
    set((state) => ({
      user: { ...state.user, isGrinding: newIsGrinding }
    }));
    
    const userId = get().session?.user?.id;
    if (userId) {
      try {
        await supabase.from('profiles').update({ is_grinding: newIsGrinding }).eq('id', userId);
      } catch (error) {
        console.error('Failed to toggle grinding:', error);
      }
    }
  },
  updateCircleMember: (id, updates) => set((state) => ({
    circle: state.circle.map(m => m.id === id ? { ...m, ...updates } : m)
  })),
  addXp: async (amount) => {
    const { user } = get();
    let newXpData: any = null;

    set((state) => {
      const newXp = state.user.xp + amount;
      const nextLevelXp = state.user.level * 1000;

      if (newXp >= nextLevelXp) {
        newXpData = {
          xp: newXp - nextLevelXp,
          level: state.user.level + 1,
          rank: state.user.level + 1 > 25 ? 'Master' : state.user.rank
        };
      } else {
        newXpData = { xp: newXp };
      }

      return {
        user: { ...state.user, ...newXpData }
      };
    });

    const userId = get().session?.user?.id;
    if (userId && newXpData) {
      try {
        await supabase.from('profiles').update(newXpData).eq('id', userId);
      } catch (error) {
        console.error('Failed to update XP:', error);
      }
    }
  },
  toggleFocusMode: () => set((state) => ({ isFocusMode: !state.isFocusMode })),

  toggleFocusSession: () => set((state) => ({
    focusSession: { ...state.focusSession, isRunning: !state.focusSession.isRunning }
  })),

  startFocusSession: (duration, label) => set((state) => ({
    focusSession: {
      isActive: true,
      isRunning: true,
      timeLeft: duration * 60,
      totalTime: duration * 60,
      label: label || 'Deep Sprint',
    },
    isFocusMode: true
  })),

  updateFocusTime: (timeLeft) => set((state) => ({
    focusSession: { ...state.focusSession, timeLeft }
  })),

  endFocusSession: async () => {
    const { user, focusSession, vitals } = get();
    const timeSpentMinutes = Math.floor((focusSession.totalTime - focusSession.timeLeft) / 60);
    const xpReward = timeSpentMinutes * 10;
    const focusGain = Math.floor(timeSpentMinutes / 5);

    set((state) => ({
      focusSession: { ...state.focusSession, isActive: false, isRunning: false, timeLeft: 0 },
      isFocusMode: false
    }));

    if (xpReward > 0) {
      get().addXp(xpReward);
      get().recordDailyActivity('focus');
    }

    if (focusGain > 0) {
      get().updateVitals({
        focus: Math.min(100, vitals.focus + focusGain),
        energy: Math.max(0, vitals.energy - focusGain * 2)
      });
    }
  },

  setDateNote: async (date, note) => {
    const userId = get().session?.user?.id;
    if (!userId) return;

    // Optimistic UI
    set((state) => ({
      dateNotes: { ...state.dateNotes, [date]: note }
    }));

    try {
      if (!note.trim()) {
        await supabase.from('date_notes').delete().eq('user_id', userId).eq('date_str', date);
      } else {
        await supabase.from('date_notes').upsert({
          user_id: userId,
          date_str: date,
          note: note,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,date_str' });
      }
    } catch (error) {
      console.error('Failed to set date note:', error);
      get().addToast({ type: 'error', title: 'Library Sync Error', description: 'Could not preserve date note.' });
    }
  },

  addJournalEntry: async (entry) => {
    const userId = get().session?.user?.id;
    if (!userId) return;

    try {
      await get().addNote({
        title: `Journal: ${entry.date}`,
        content: entry.note,
        note_type: 'journal',
        mood: entry.mood,
        journal_date: entry.date,
        createdAt: new Date(entry.date).getTime()
      });
      get().addXp(25);
    } catch (error) {
       console.error('Failed to add journal entry:', error);
    }
  },

  updateJournalEntry: async (id, updates) => {
    try {
      // Find the note id if it's different, but assuming id matches for now
      // Or just update the note system
      await get().updateNote(id, {
        content: updates.note,
        mood: updates.mood,
        updatedAt: Date.now()
      });
      await get().fetchJournalEntries();
    } catch (error) {
      console.error('Failed to update journal entry:', error);
    }
  },

  deleteJournalEntry: async (id) => {
    try {
      await get().deleteNote(id);
      await get().fetchJournalEntries();
    } catch (error) {
      console.error('Failed to delete journal entry:', error);
    }
  },

  fetchJournalEntries: async () => {
    const userId = get().session?.user?.id;
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .eq('note_type', 'journal')
        .order('journal_date', { ascending: false, nullsFirst: false });

      if (error) throw error;
      
      const entries: JournalEntry[] = data.map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        date: n.journal_date || format(new Date(n.created_at), 'yyyy-MM-dd'),
        note: n.content,
        visionIds: [],
        mood: n.mood,
        createdAt: new Date(n.created_at).getTime(),
        updatedAt: new Date(n.updated_at).getTime()
      }));

      set({ journalEntries: entries });
    } catch (error) {
      console.error('Failed to fetch journal entries:', error);
    }
  },

  addFocusPreset: (preset) => set((state) => ({
    focusPresets: [
      ...state.focusPresets,
      { ...preset, id: Math.random().toString(36).substring(7) }
    ]
  })),

  deleteFocusPreset: (id) => set((state) => ({
    focusPresets: state.focusPresets.filter(p => p.id !== id)
  })),

  fetchFolders: async () => {
    const userId = get().session?.user?.id;
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const formattedFolders: Folder[] = data.map((f: any) => ({
        id: f.id,
        name: f.name,
        parentId: f.parent_id || null,
        color: f.color,
        expanded: f.expanded ?? true,
      }));

      set({ folders: formattedFolders });
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    }
  },

  addFolder: async (folder) => {
    const userId = get().session?.user?.id;
    if (!userId) {
      get().addToast({ type: 'error', title: 'Login required', description: 'Sign in to create folders.' });
      return;
    }
    const tempId = Math.random().toString(36).substring(7);

    const newFolder = {
      id: tempId,
      name: folder.name || 'New Folder',
      parentId: folder.parentId || null,
      color: folder.color,
      expanded: folder.expanded ?? true,
      ...folder,
    };

    set((state) => ({ folders: [...state.folders, newFolder] }));

    try {
      const { id: _, ...folderData } = newFolder;
      const { data, error } = await supabase.from('folders').insert({
        name: folderData.name,
        parent_id: folderData.parentId,
        color: folderData.color,
        expanded: folderData.expanded,
        user_id: userId
      }).select().single();
      if (error) throw error;
      set((state) => ({
        folders: state.folders.map(f => f.id === tempId ? { ...f, id: data.id } : f)
      }));
    } catch (error: any) {
      console.error('Failed to create folder:', error);
      set((state) => ({ folders: state.folders.filter(f => f.id !== tempId) }));
      get().addToast({ type: 'error', title: 'Folder failed', description: error.message || 'Could not create folder.' });
    }
  },

  updateFolder: async (id, updates) => {
    set((state) => ({
      folders: state.folders.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));

    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.parentId !== undefined) dbUpdates.parent_id = updates.parentId;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.expanded !== undefined) dbUpdates.expanded = updates.expanded;

      await supabase.from('folders').update(dbUpdates).eq('id', id);
    } catch (error) {
      console.error('Failed to update folder:', error);
    }
  },

  deleteFolder: async (id) => {
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
      notes: state.notes.map(n => n.folderId === id ? { ...n, folderId: null } : n),
    }));

    try {
      await supabase.from('folders').delete().eq('id', id);
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  },

  addNote: async (note) => {
    const userId = get().session?.user?.id;
    if (!userId) {
      get().addToast({ type: 'error', title: 'Login required', description: 'Sign in to create notes.' });
      return false;
    }
    const tempId = Math.random().toString(36).substring(7);

    const newNote: Note = {
      id: tempId,
      title: note.title || 'Untitled Note',
      content: note.content || '',
      note_type: note.note_type || 'normal',
      folderId: note.folderId || null,
      tags: note.tags || [],
      linkedVisionId: note.linkedVisionId || null,
      visibility: note.visibility || 'private',
      isPinned: note.isPinned || false,
      isFavorite: note.isFavorite || false,
      isDeleted: false,
      mood: note.mood,
      journal_date: note.journal_date,
      location: note.location,
      image_url: note.image_url,
      audio_url: note.audio_url,
      audio_path: note.audio_path,
      audio_duration: note.audio_duration,
      audio_mime_type: note.audio_mime_type,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...note,
    };

    set((state) => ({ notes: [newNote, ...state.notes] }));

    try {
      const { id: _, ...noteData } = newNote;
      const { data, error } = await supabase.from('notes').insert({
        title: noteData.title,
        content: noteData.content,
        note_type: noteData.note_type,
        folder_id: noteData.folderId,
        tags: noteData.tags,
        visibility: noteData.visibility,
        linked_vision_id: noteData.linkedVisionId,
        is_pinned: noteData.isPinned,
        is_favorite: noteData.isFavorite,
        is_deleted: false,
        mood: noteData.mood,
        journal_date: noteData.journal_date,
        location: noteData.location,
        image_url: noteData.image_url,
        audio_url: noteData.audio_url,
        audio_path: noteData.audio_path,
        audio_duration: noteData.audio_duration,
        audio_mime_type: noteData.audio_mime_type,
        user_id: userId,
        created_at: new Date(noteData.createdAt).toISOString()
      }).select().single();
      if (error) throw error;
      set((state) => ({
        notes: state.notes.map(n => n.id === tempId ? { ...n, id: data.id } : n)
      }));
      get().recordDailyActivity(noteData.note_type === 'journal' ? 'journal' : 'note');
      return { ...newNote, id: data.id };
    } catch (error: any) {
      console.error('Failed to add note:', error);
      set((state) => ({ notes: state.notes.filter(n => n.id !== tempId) }));
      get().addToast({ type: 'error', title: 'Note failed', description: error.message || 'Could not save note.' });
      return false;
    }
  },

  updateNote: async (id, updates) => {
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n)),
    }));

    try {
      const dbUpdates: any = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.folderId !== undefined) dbUpdates.folder_id = updates.folderId;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.isPinned !== undefined) dbUpdates.is_pinned = updates.isPinned;
      if (updates.isFavorite !== undefined) dbUpdates.is_favorite = updates.isFavorite;
      if (updates.isDeleted !== undefined) dbUpdates.is_deleted = updates.isDeleted;
      if (updates.mood !== undefined) dbUpdates.mood = updates.mood;
      if (updates.journal_date !== undefined) dbUpdates.journal_date = updates.journal_date;
      if (updates.location !== undefined) dbUpdates.location = updates.location;
      if (updates.image_url !== undefined) dbUpdates.image_url = updates.image_url;
      if (updates.audio_url !== undefined) dbUpdates.audio_url = updates.audio_url;
      if (updates.audio_path !== undefined) dbUpdates.audio_path = updates.audio_path;
      if (updates.audio_duration !== undefined) dbUpdates.audio_duration = updates.audio_duration;
      if (updates.audio_mime_type !== undefined) dbUpdates.audio_mime_type = updates.audio_mime_type;
      dbUpdates.updated_at = new Date().toISOString();

      await supabase.from('notes').update(dbUpdates).eq('id', id);
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  },

  fetchNotes: async () => {
    const userId = get().session?.user?.id;
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedNotes: Note[] = data.map((n: any) => {
        const audioPath = n.audio_path || extractStoragePathFromUrl(n.audio_url, 'note-audio');
        return {
          id: n.id,
          title: n.title,
          content: n.content,
          note_type: n.note_type === 'library' || n.note_type === 'vault' ? 'normal' : n.note_type,
          folderId: n.folder_id,
          tags: n.tags || [],
          linkedVisionId: n.linked_vision_id || null,
          visibility: n.visibility || 'private',
          isPinned: n.is_pinned,
          isFavorite: n.is_favorite,
          isDeleted: n.is_deleted || false,
          mood: n.mood,
          journal_date: n.journal_date,
          location: n.location,
          image_url: n.image_url,
          audio_url: n.audio_url || '',
          audio_path: audioPath,
          audio_duration: n.audio_duration,
          audio_mime_type: n.audio_mime_type,
          createdAt: new Date(n.created_at).getTime(),
          updatedAt: new Date(n.updated_at).getTime()
        };
      });

      set({ notes: formattedNotes });
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    }
  },

  deleteNote: async (id) => {
    // Soft delete by default
    const note = get().notes.find(n => n.id === id);
    if (note?.isDeleted) {
      // Actually delete if already in trash
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
      }));

      try {
        await supabase.from('notes').delete().eq('id', id);
      } catch (error) {
        console.error('Failed to permanent delete note:', error);
      }
    } else {
      // Move to trash
      get().updateNote(id, { isDeleted: true });
    }
  },

  addTodo: async (text) => {
    const userId = get().session?.user?.id;
    const tempId = Math.random().toString(36).substring(7);
    const newTodo = { id: tempId, text, completed: false };

    set((state) => ({
      todos: [newTodo, ...state.todos]
    }));

    if (userId) {
      try {
        await supabase.from('todos').insert({ user_id: userId, text, completed: false, created_at: new Date().toISOString() });
      } catch (error) {
        console.error('Failed to add todo:', error);
      }
    }
  },

  toggleTodo: async (id) => {
    const { todos } = get();
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const wasCompleted = todo.completed;

    set((state) => ({
      todos: state.todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    }));

    if (!wasCompleted) {
      get().addXp(20);
      get().recordDailyActivity('todo');
    }

    try {
      await supabase.from('todos').update({ completed: !wasCompleted }).eq('id', id);
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  },

  deleteTodo: async (id) => {
    set((state) => ({
      todos: state.todos.filter(t => t.id !== id)
    }));

    try {
      await supabase.from('todos').delete().eq('id', id);
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  },
  
  addPost: async (post: any) => {
    const session = get().session;
    const userId = session?.user?.id;
    const clientPostId = `post_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const postMetadata = {
      ...(post.metadata || {}),
      client_post_id: clientPostId
    };
    
    if (!userId) {
      get().addToast({
        type: 'error',
        title: 'Login required',
        description: 'You need to be signed in to post.'
      });
      return false;
    }

    try {
      console.log('Attempting to add post for user:', userId);
      // 0. Try to ensure the profile exists, but do not block posting on a slow profile read.
      try {
        await withTimeout(get().ensureCurrentUserProfile(), 4000, 'Preparing your profile');
      } catch (profileError) {
        console.warn('Profile preparation was slow; continuing with post insert:', profileError);
      }

      // 1. Insert core post data
      console.log('Inserting post data...', post);
      const insertPost = () => supabase
        .from('posts')
        .insert({
          user_id: userId,
          type: post.type,
          caption: post.caption,
          content: post.content || '',
          visibility: post.visibility || 'public',
          metadata: postMetadata
        })
        .select('id, user_id, type, caption, content, visibility, metadata, stats, created_at, updated_at')
        .single();

      let postResult: any;
      try {
        postResult = await withTimeout<any>(insertPost(), 30000, 'Creating post');
      } catch (insertError: any) {
        if (!insertError?.message?.includes('timed out')) throw insertError;
        console.warn('Post insert response timed out; attempting to recover created post:', insertError);
        await new Promise(resolve => setTimeout(resolve, 1500));
        postResult = await withTimeout<any>(
          supabase
            .from('posts')
            .select('id, user_id, type, caption, content, visibility, metadata, stats, created_at, updated_at')
            .eq('user_id', userId)
            .filter('metadata->>client_post_id', 'eq', clientPostId)
            .maybeSingle(),
          10000,
          'Confirming post'
        );
      }

      const { data: postData, error: postError } = postResult;

      if (postError) {
        if (postError.message.includes('public.posts')) {
          throw new Error('Community Feed is not yet initialized in the database. Please ensure the "posts" table exists.');
        }
        console.error('Post insertion error:', postError);
        throw postError;
      }
      if (!postData?.id) {
        throw new Error('Post could not be confirmed. Please refresh the feed before trying again.');
      }
      const postId = postData.id;
      console.log('Post inserted with ID:', postId);

      // 2. Insert Media
      if (post.media && post.media.length > 0) {
        console.log('Inserting media...', post.media);
        const { error: mediaError } = await withTimeout<any>(
          supabase
            .from('post_media')
            .insert(post.media.map((m: any) => ({
              post_id: postId,
              media_url: m.url,
              media_type: m.type,
              storage_path: m.storagePath || null
            }))),
          10000,
          'Attaching media'
        );
        if (mediaError) {
          console.error('Media insertion error:', mediaError);
          get().addToast({ type: 'error', title: 'Media warning', description: 'Post was created, but some media could not be attached.' });
        }
      }

      // 3. Insert Tags
      if (post.tags && post.tags.length > 0) {
        const uniqueTags = Array.from(new Set(post.tags.map((t: string) => normalizePostTag(t)).filter(Boolean)));
        if (uniqueTags.length > 0) {
          console.log('Inserting tags...', uniqueTags);
          const { error: tagsError } = await withTimeout<any>(
            supabase
              .from('post_tags')
              .insert(uniqueTags.map((t: string) => ({
                post_id: postId,
                tag: t
              }))),
            10000,
            'Saving hashtags'
          );
          if (tagsError) {
            console.error('Tags insertion error:', tagsError);
             // Not critical, but good to know
          }
        }
      }

      const textMentions = extractMentionUsernames(`${post.caption || ''} ${post.content || ''}`)
        .map(username => ({ username }));
      const notificationMentions = [...(post.mentions || []), ...textMentions];

      // 4. Insert Mentions
      if (post.mentions && post.mentions.length > 0) {
        console.log('Inserting mentions...', post.mentions);
        const { error: mentionsError } = await withTimeout<any>(
          supabase
            .from('post_mentions')
            .insert(post.mentions.map((m: any) => ({
              post_id: postId,
              mentioned_user_id: m.userId
            }))),
          10000,
          'Saving mentions'
        );
        if (mentionsError) {
          console.error('Mentions insertion error:', mentionsError);
        }
      }

      if (notificationMentions.length > 0) {
        await notifyMentionedUsers({
          actorId: userId,
          postId,
          mentions: notificationMentions,
          message: 'mentioned you in a post'
        });
      }

      const localPost = toLocalPost(postData, { ...post, metadata: postMetadata }, get().user);
      set((state) => ({
        posts: [localPost, ...state.posts.filter(p => p.id !== localPost.id)]
      }));

      // 5. XP and Reward
      get().addXp(50);
      get().recordDailyActivity('post');
      get().addActivity({
        type: 'social',
        description: `Shared a new ${post.type} with the community.`
      });

      get().fetchPosts().catch((error) => {
        console.error('Failed to refresh feed after posting:', error);
      });
      
      get().addToast({
        type: 'success',
        title: 'Post shared',
        description: 'Your post is live.'
      });
      return true;
    } catch (err: any) {
      console.error('Failed to create post (full trace):', err);
      get().addToast({ type: 'error', title: 'Post failed', description: err.message || 'Could not save post.' });
      return false;
    }
  },

  updatePost: async (id: string, updates: Partial<Post>) => {
    const userId = get().session?.user?.id;
    if (!userId) {
      get().addToast({ type: 'error', title: 'Login required', description: 'You need to be signed in to edit posts.' });
      return false;
    }

    const previousPosts = get().posts;
    const nextTags = Array.from(new Set((updates.tags || []).map(normalizePostTag).filter(Boolean)));
    const nextMentions = Array.from(
      new Map((updates.mentions || []).filter(m => m.userId).map(m => [m.userId, m])).values()
    );
    const postUpdates: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.caption !== undefined) postUpdates.caption = updates.caption;
    if (updates.content !== undefined) postUpdates.content = updates.content;
    if (updates.type !== undefined) postUpdates.type = updates.type;
    if (updates.metadata !== undefined) postUpdates.metadata = updates.metadata;
    if (updates.visibility !== undefined) postUpdates.visibility = updates.visibility;

    set((state) => ({
      posts: state.posts.map(post => post.id === id ? {
        ...post,
        ...updates,
        tags: updates.tags !== undefined ? nextTags : post.tags,
        mentions: updates.mentions !== undefined ? nextMentions : post.mentions
      } : post)
    }));

    try {
      const { data, error } = await supabase
        .from('posts')
        .update(postUpdates)
        .eq('id', id)
        .eq('user_id', userId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data?.id) throw new Error('Post was not updated. Please refresh and try again.');

      if (updates.tags !== undefined) {
        const { error: deleteTagsError } = await supabase.from('post_tags').delete().eq('post_id', id);
        if (deleteTagsError) throw deleteTagsError;
        if (nextTags.length > 0) {
          const { error: insertTagsError } = await supabase
            .from('post_tags')
            .insert(nextTags.map(tag => ({ post_id: id, tag })));
          if (insertTagsError) throw insertTagsError;
        }
      }

      if (updates.mentions !== undefined) {
        const { error: deleteMentionsError } = await supabase.from('post_mentions').delete().eq('post_id', id);
        if (deleteMentionsError) throw deleteMentionsError;
        if (nextMentions.length > 0) {
          const { error: insertMentionsError } = await supabase
            .from('post_mentions')
            .insert(nextMentions.map(mention => ({ post_id: id, mentioned_user_id: mention.userId })));
          if (insertMentionsError) throw insertMentionsError;
        }

        const textMentions = extractMentionUsernames(`${updates.caption || ''} ${updates.content || ''}`)
          .map(username => ({ username }));
        await notifyMentionedUsers({
          actorId: userId,
          postId: id,
          mentions: [...nextMentions, ...textMentions],
          message: 'mentioned you in an updated post'
        });
      }

      get().addToast({ type: 'success', title: 'Post updated', description: 'Your changes are live.' });
      return true;
    } catch (err) {
      console.error('Failed to update post:', err);
      set({ posts: previousPosts });
      get().addToast({ type: 'error', title: 'Update failed', description: 'Could not update this post. Please try again.' });
      return false;
    }
  },

  archivePost: async (id: string) => {
    const userId = get().session?.user?.id;
    if (!userId) {
      get().addToast({ type: 'error', title: 'Login required', description: 'You need to be signed in to archive posts.' });
      return false;
    }

    const previousPosts = get().posts;
    const post = previousPosts.find(item => item.id === id);
    if (post && post.userId !== userId) {
      get().addToast({ type: 'error', title: 'Not allowed', description: 'You can only archive your own posts.' });
      return false;
    }
    set((state) => ({ posts: state.posts.filter(post => post.id !== id) }));

    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('posts')
        .update({ archived: true, archived_at: now, updated_at: now })
        .eq('id', id)
        .eq('user_id', userId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data?.id) throw new Error('Post was not archived. Please refresh and try again.');

      get().addToast({ type: 'success', title: 'Post archived', description: 'You can view it from your profile archive.' });
      return true;
    } catch (err) {
      console.error('Failed to archive post:', err);
      set({ posts: previousPosts });
      get().addToast({ type: 'error', title: 'Archive failed', description: 'Could not archive this post. Please try again.' });
      return false;
    }
  },

  restorePost: async (id: string) => {
    const userId = get().session?.user?.id;
    if (!userId) {
      get().addToast({ type: 'error', title: 'Login required', description: 'You need to be signed in to restore posts.' });
      return false;
    }

    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('posts')
        .update({ archived: false, archived_at: null, updated_at: now })
        .eq('id', id)
        .eq('user_id', userId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data?.id) throw new Error('Post was not restored. Please refresh and try again.');

      set((state) => ({
        posts: state.posts.map(post => post.id === id ? { ...post, archived: false, archivedAt: null } : post)
      }));
      get().addToast({ type: 'success', title: 'Post restored', description: 'Your post can appear publicly again.' });
      return true;
    } catch (err) {
      console.error('Failed to restore post:', err);
      get().addToast({ type: 'error', title: 'Restore failed', description: 'Could not restore post. Try again.' });
      return false;
    }
  },

  fetchArchivedPosts: async () => {
    const userId = get().session?.user?.id;
    if (!userId) {
      get().addToast({ type: 'error', title: 'Login required', description: 'Sign in to view archived posts.' });
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_user_id_fkey(*),
          likes:post_likes(count),
          saves:saved_posts(count),
          comment_count:comments(count),
          media:post_media(*),
          post_tags(*),
          mentions:post_mentions(*, user:profiles(username))
        `)
        .eq('user_id', userId)
        .eq('archived', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((p: any) => ({
        id: p.id,
        userId: p.user_id,
        author: {
          id: p.author?.id || p.user_id,
          name: p.author?.display_name || p.author?.full_name || 'Explorer',
          avatar: p.author?.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${p.user_id}`,
          handle: `@${p.author?.username || 'user'}`,
          verified: !!p.author?.verified
        },
        caption: p.caption,
        content: p.content || '',
        timestamp: format(new Date(p.created_at), 'MMM d, yyyy'),
        createdAt: new Date(p.created_at).getTime(),
        likes: p.likes?.[0]?.count || 0,
        comments: p.comment_count?.[0]?.count || 0,
        saves: p.saves?.[0]?.count || 0,
        isLiked: false,
        isSaved: false,
        type: p.type || 'update',
        visibility: p.visibility || 'public',
        archived: !!p.archived,
        archivedAt: p.archived_at || null,
        deletedAt: p.deleted_at || null,
        media: p.media?.map((m: any) => ({ id: m.id, url: m.media_url, type: m.media_type })) || [],
        tags: p.post_tags?.map((t: any) => t.tag) || [],
        mentions: p.mentions?.map((m: any) => ({ userId: m.mentioned_user_id, username: m.user?.username || 'user' })) || [],
        stats: p.stats,
        metadata: p.metadata
      }));
    } catch (err) {
      console.error('Failed to fetch archived posts:', err);
      get().addToast({ type: 'error', title: 'Archive failed', description: 'Could not load archived posts.' });
      return [];
    }
  },

  deletePost: async (id: string) => {
    const userId = get().session?.user?.id;

    if (!userId) {
      get().addToast({ type: 'error', title: 'Delete unavailable', description: 'You can only delete your own posts.' });
      return false;
    }

    const previousPosts = get().posts;
    set((state) => ({ posts: state.posts.filter(p => p.id !== id) }));

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      get().addToast({ type: 'success', title: 'Post deleted', description: 'Your post was removed from the feed.' });
      return true;
    } catch (err) {
      console.error('Failed to delete post:', err);
      set({ posts: previousPosts });
      get().addToast({ type: 'error', title: 'Delete failed', description: 'Could not remove this post. Please try again.' });
      return false;
    }
  },

  muteUserPosts: async (mutedUserId: string) => {
    const userId = get().session?.user?.id;
    if (!userId || userId === mutedUserId) return false;

    const previousPosts = get().posts;
    set((state) => ({ posts: state.posts.filter(p => p.userId !== mutedUserId) }));

    try {
      const { error } = await supabase
        .from('blocked_users')
        .upsert({ blocker_id: userId, blocked_id: mutedUserId }, { onConflict: 'blocker_id,blocked_id' });

      if (error) throw error;

      get().addToast({ type: 'success', title: 'Posts muted', description: 'You will no longer see posts from this user.' });
      return true;
    } catch (err) {
      console.error('Failed to mute posts:', err);
      set({ posts: previousPosts });
      get().addToast({ type: 'error', title: 'Mute failed', description: 'Could not mute this user right now.' });
      return false;
    }
  },

  ensureCurrentUserProfile: async () => {
    const { data: { session } } = await withTimeout(
      supabase.auth.getSession(),
      AUTH_BOOTSTRAP_TIMEOUT_MS,
      'Checking your session'
    );
    if (!session?.user) return null;

    const userId = session.user.id;

    try {
      // 1. Initial check
      let { data: profile, error } = await withTimeout(
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        PROFILE_QUERY_TIMEOUT_MS,
        'Checking your profile'
      );

      if (error) {
        console.error('Error checking profile:', error);
      }

      // 2. If not found, upsert immediately. The database trigger handles normal signup sync;
      // this is a fast fallback for older accounts or delayed auth events.
      if (!profile) {
        console.log('Profile not found, upserting fallback profile for:', userId);
        const userMetadata = session.user.user_metadata || {};
        const displayName = userMetadata.display_name || userMetadata.full_name || userMetadata.name || 'Explorer';
        const avatarUrl = userMetadata.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${userId}`;
        const emailPrefix = (session.user.email || '').split('@')[0] || 'user';
        const usernameSeed = normalizeUsernameInput(userMetadata.preferred_username || userMetadata.user_name || emailPrefix);
        const fallbackUsername = usernameSeed.length >= 3 ? `${usernameSeed.slice(0, 18)}_${userId.slice(0, 4)}` : null;
        
        const { data: newProfile, error: insertError } = await withTimeout(
          supabase
            .from('profiles')
            .upsert({
              id: userId,
              email: session.user.email || '',
              full_name: displayName,
              display_name: displayName,
              username: fallbackUsername,
              avatar_url: avatarUrl,
              onboarded: false,
              onboarding_step: 0,
              xp: 0,
              level: 1,
              streak: 0
            }, { onConflict: 'id' })
            .select()
            .single(),
          PROFILE_QUERY_TIMEOUT_MS,
          'Creating your profile'
        );
        
        if (insertError) {
          console.error('Upsert profile failed:', insertError);
          throw insertError;
        }
        return newProfile;
      }
      return profile;
    } catch (error) {
      console.error('Failed to ensure user profile:', error);
      return null;
    }
  },

  fetchFeedContext: async () => {
    const userId = get().session?.user?.id;
    if (!userId) return;

    try {
      // Fetch Following
      const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
      const followingIds = follows?.map(f => f.following_id) || [];

      // Fetch Interests
      const { data: interests } = await supabase.from('user_interests').select('tag, weight').eq('user_id', userId);
      const interestMap = interests?.reduce((acc: any, curr) => ({ ...acc, [curr.tag]: curr.weight }), {}) || {};

      set({ 
        followingIds,
        userInterests: interestMap
      });
    } catch (err) {
      console.error('Failed to fetch feed context:', err);
    }
  },

  fetchProfileStats: async (profileId: string) => {
    const currentUserId = get().session?.user?.id;
    try {
      const [followersRes, followingRes, followingStatusRes] = await Promise.all([
        withTimeout(
          supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', profileId),
          PROFILE_QUERY_TIMEOUT_MS,
          'Loading follower count'
        ),
        withTimeout(
          supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', profileId),
          PROFILE_QUERY_TIMEOUT_MS,
          'Loading following count'
        ),
        currentUserId && currentUserId !== profileId
          ? withTimeout(
              supabase.from('follows').select('following_id').match({ follower_id: currentUserId, following_id: profileId }).maybeSingle(),
              PROFILE_QUERY_TIMEOUT_MS,
              'Checking follow state'
            )
          : Promise.resolve({ data: null, error: null })
      ]);

      if (followersRes.error) throw followersRes.error;
      if (followingRes.error) throw followingRes.error;
      if ((followingStatusRes as any).error) throw (followingStatusRes as any).error;

      const followersCount = followersRes.count || 0;
      const followingCount = followingRes.count || 0;
      const isFollowing = !!(followingStatusRes as any).data;

      set((state) => ({
        followerCounts: { ...state.followerCounts, [profileId]: followersCount },
        followingCounts: { ...state.followingCounts, [profileId]: followingCount }
      }));

      return { followersCount, followingCount, isFollowing };
    } catch (error) {
      console.error('Failed to fetch profile stats:', error);
      return { followersCount: get().followerCounts[profileId] || 0, followingCount: get().followingCounts[profileId] || 0, isFollowing: get().followingIds.includes(profileId) };
    }
  },

  fetchPosts: async (tab?: 'recommended' | 'following' | 'latest' | 'saved') => {
    try {
      const session = get().session;
      const userId = session?.user?.id;

      if (tab === 'saved') {
        if (!userId) {
          set({ posts: [] });
          get().addToast({ type: 'error', title: 'Login required', description: 'Sign in to view saved posts.' });
          return;
        }

        const { data: savedRows, error: savedError } = await supabase
          .from('saved_posts')
          .select(`
            post:posts(
              *,
              author:profiles!posts_user_id_fkey(*),
              likes:post_likes(count),
              saves:saved_posts(count),
              comment_count:comments(count),
              media:post_media(*),
              post_tags(*),
              mentions:post_mentions(*, user:profiles(username))
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (savedError) throw savedError;

        const savedPosts = (savedRows || [])
          .map((row: any) => row.post)
          .filter((p: any) => p && (!p.archived || p.user_id === userId) && !p.deleted_at);

        const formattedSavedPosts: Post[] = savedPosts.map((p: any) => ({
          id: p.id,
          userId: p.user_id,
          author: {
            id: p.author?.id || p.user_id,
            name: p.author?.display_name || p.author?.full_name || 'Explorer',
            avatar: p.author?.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${p.user_id}`,
            handle: `@${p.author?.username || 'user'}`,
            verified: !!p.author?.verified
          },
          caption: p.caption,
          content: p.content || '',
          timestamp: format(new Date(p.created_at), 'MMM d, yyyy'),
          createdAt: new Date(p.created_at).getTime(),
          likes: p.likes?.[0]?.count || 0,
          comments: p.comment_count?.[0]?.count || 0,
          saves: p.saves?.[0]?.count || 0,
          isLiked: false,
          isSaved: true,
          type: p.type || 'update',
          visibility: p.visibility || 'public',
          archived: !!p.archived,
          archivedAt: p.archived_at || null,
          deletedAt: p.deleted_at || null,
          media: p.media?.map((m: any) => ({
            id: m.id,
            url: m.media_url,
            type: m.media_type
          })) || [],
          tags: p.post_tags?.map((t: any) => t.tag) || [],
          mentions: p.mentions?.map((m: any) => ({
            userId: m.mentioned_user_id,
            username: m.user?.username || 'user'
          })) || [],
          stats: p.stats,
          metadata: p.metadata
        }));

        if (formattedSavedPosts.length > 0) {
          const postIds = formattedSavedPosts.map(p => p.id);
          const { data: likesData } = await supabase
            .from('post_likes')
            .select('post_id')
            .eq('user_id', userId)
            .in('post_id', postIds);
          const myLikes = likesData?.map(l => l.post_id) || [];
          formattedSavedPosts.forEach(post => {
            post.isLiked = myLikes.includes(post.id);
          });
        }

        set({ posts: formattedSavedPosts });
        return;
      }

      let query = supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_user_id_fkey(*),
          likes:post_likes(count),
          saves:saved_posts(count),
          comment_count:comments(count),
          media:post_media(*),
          post_tags(*),
          mentions:post_mentions(*, user:profiles(username))
        `)
        .eq('visibility', 'public')
        .eq('archived', false)
        .is('deleted_at', null);

      if (userId) {
        const { data: mutedUsers } = await supabase
          .from('blocked_users')
          .select('blocked_id')
          .eq('blocker_id', userId);
        const mutedIds = mutedUsers?.map((block: any) => block.blocked_id).filter(Boolean) || [];
        if (mutedIds.length > 0) {
          query = query.not('user_id', 'in', `(${mutedIds.join(',')})`);
        }
      }

      if (tab === 'latest') {
        query = query.order('created_at', { ascending: false }).limit(20);
      } else if (tab === 'following') {
        if (!userId) {
          set({ posts: [] });
          return;
        }
        
        let followingIds = get().followingIds;
        if (followingIds.length === 0) {
           // Try to fetch context first if empty
           await get().fetchFeedContext();
           followingIds = get().followingIds;
        }

        if (followingIds.length > 0) {
          query = query.in('user_id', followingIds).order('created_at', { ascending: false }).limit(20);
        } else {
          set({ posts: [] });
          return;
        }
      } else {
        // Recommended or default - fetch more for frontend ranking
        query = query.order('created_at', { ascending: false }).limit(50);
      }

      const { data, error } = await query;
      if (error) {
        if (error.message.includes('public.posts') || error.code === 'PGRST116') {
          console.warn('Posts table not found in schema cache. Feed might be empty.');
          set({ posts: [] });
          return;
        }
        throw error;
      }

      let myLikes: string[] = [];
      let mySaves: string[] = [];

      if (userId && data.length > 0) {
        const postIds = data.map((p: any) => p.id);
        const [likesRes, savesRes] = await Promise.all([
          supabase.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', postIds),
          supabase.from('saved_posts').select('post_id').eq('user_id', userId).in('post_id', postIds)
        ]);
        
        myLikes = likesRes.data?.map(l => l.post_id) || [];
        mySaves = savesRes.data?.map(s => s.post_id) || [];
      }

      const formattedPosts: Post[] = data.map((p: any) => ({
        id: p.id,
        userId: p.user_id,
        author: {
          id: p.author?.id,
          name: p.author?.display_name || p.author?.full_name || 'Explorer',
          avatar: p.author?.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${p.user_id}`,
          handle: `@${p.author?.username || 'user'}`,
          verified: !!p.author?.verified
        },
        caption: p.caption,
        content: p.content || '',
        timestamp: format(new Date(p.created_at), 'MMM d, yyyy'),
        createdAt: new Date(p.created_at).getTime(),
        likes: p.likes?.[0]?.count || 0,
        comments: p.comment_count?.[0]?.count || 0,
        saves: p.saves?.[0]?.count || 0,
        isLiked: myLikes.includes(p.id),
        isSaved: mySaves.includes(p.id),
        type: p.type,
        visibility: p.visibility,
        archived: !!p.archived,
        archivedAt: p.archived_at || null,
        deletedAt: p.deleted_at || null,
        media: p.media?.map((m: any) => ({
          id: m.id,
          url: m.media_url,
          type: m.media_type
        })) || [],
        tags: p.post_tags?.map((t: any) => t.tag) || [],
        mentions: p.mentions?.map((m: any) => ({
          userId: m.mentioned_user_id,
          username: m.user?.username || 'user'
        })) || [],
        stats: p.stats,
        metadata: p.metadata
      }));

      let finalPosts = formattedPosts;
      if (tab === 'recommended' || !tab) {
        // Ensure we have context for ranking
        const state = get();
        if (Object.keys(state.userInterests).length === 0 && userId) {
          await get().fetchFeedContext();
        }
        
        finalPosts = rankPosts(formattedPosts, {
          userId: userId || null,
          followingIds: get().followingIds,
          circleIds: {},
          userInterests: get().userInterests
        });
      }

      set({ posts: finalPosts });
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    }
  },

  trackInteraction: async (postId, type) => {
    const userId = get().session?.user?.id;
    if (!userId) return;

    const post = get().posts.find(p => p.id === postId);
    if (!post || !post.tags || post.tags.length === 0) return;

    const weights: Record<string, number> = {
      view: 0.1,
      like: 1.0,
      comment: 2.0,
      save: 3.0,
      follow: 4.0
    };

    const weightIncrease = weights[type] || 0.1;

    try {
      // Analytics Logging
      if (isSupabaseConfigured()) {
        supabase.from('analytics_events').insert({
          user_id: userId,
          event_type: type,
          entity_id: postId,
          metadata: { timestamp: new Date().toISOString() }
        }).then(); // Fire and forget
      }

      // Update local state first for speed
      set(state => {
        const newInterests = { ...state.userInterests };
        post.tags!.forEach(tag => {
          const t = tag.toLowerCase();
          const current = newInterests[t] || 0;
          newInterests[t] = Number((current + weightIncrease).toFixed(2));
        });
        return { userInterests: newInterests };
      });

      // Update Supabase - Batch read-then-upsert to be more efficient than one-by-one update
      const { data: existing } = await supabase
        .from('user_interests')
        .select('tag, weight')
        .eq('user_id', userId)
        .in('tag', post.tags.map(t => t.toLowerCase()));

      const existingMap: Record<string, number> = {};
      existing?.forEach(info => {
        existingMap[info.tag] = Number(info.weight);
      });

      const upserts = post.tags.map(tag => {
        const t = tag.toLowerCase();
        const oldWeight = existingMap[t] || 0;
        return {
          user_id: userId,
          tag: t,
          weight: Number((oldWeight + weightIncrease).toFixed(2)),
          updated_at: new Date().toISOString()
        };
      });

      await supabase.from('user_interests').upsert(upserts);
    } catch (err) {
      console.error('Failed to track interaction:', err);
    }
  },

  updateUserInterests: async (interests) => {
    const userId = get().session?.user?.id;
    if (!userId) return;

    try {
      const inserts = interests.map(tag => ({
        user_id: userId,
        tag: tag.toLowerCase(),
        weight: 2.0 // Initial weight for preferred interests
      }));

      await supabase.from('user_interests').upsert(inserts, { onConflict: 'user_id,tag' });
      
      const interestMap = interests.reduce((acc, tag) => ({ ...acc, [tag.toLowerCase()]: 2.0 }), {});
      set({ userInterests: interestMap });
    } catch (err) {
      console.error('Failed to update interests:', err);
    }
  },

  addToCircle: async (targetUserId, type) => {
    const userId = get().session?.user?.id;
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('user_circles')
        .upsert({ user_id: userId, circle_user_id: targetUserId, relation_type: type }, { onConflict: 'user_id,circle_user_id' });
      if (error) throw error;
      
      set(state => ({
        userCircles: { ...state.userCircles, [targetUserId]: type }
      }));
      await get().fetchCircleData();
    } catch (err) {
      console.error('Failed to add to circle:', err);
      get().addToast({ type: 'error', title: 'Circle failed', description: 'Could not update this circle relationship.' });
    }
  },

  removeFromCircle: async (targetUserId) => {
    const userId = get().session?.user?.id;
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('user_circles')
        .delete()
        .match({ user_id: userId, circle_user_id: targetUserId });
      if (error) throw error;
      
      set(state => {
        const next = { ...state.userCircles };
        delete next[targetUserId];
        return { userCircles: next };
      });
      await get().fetchCircleData();
    } catch (err) {
      console.error('Failed to remove from circle:', err);
      get().addToast({ type: 'error', title: 'Circle failed', description: 'Could not remove this circle relationship.' });
    }
  },

  fetchCircleData: async () => {
    const userId = get().session?.user?.id;
    if (!userId) {
      set({ circle: [], userCircles: {} });
      return;
    }
    if ((get() as any)._isFetchingCircle) return;
    set({ _isFetchingCircle: true } as any);

    try {
      const [followingRes, followersRes, circleRes] = await Promise.all([
        supabase
          .from('follows')
          .select('following:profiles!follows_following_id_fkey(id, display_name, full_name, username, avatar_url, role, streak, is_grinding, status_note, verified)')
          .eq('follower_id', userId),
        supabase
          .from('follows')
          .select('follower:profiles!follows_follower_id_fkey(id, display_name, full_name, username, avatar_url, role, streak, is_grinding, status_note, verified)')
          .eq('following_id', userId),
        supabase
          .from('user_circles')
          .select('relation_type, profile:profiles!user_circles_circle_user_id_fkey(id, display_name, full_name, username, avatar_url, role, streak, is_grinding, status_note, verified)')
          .eq('user_id', userId)
      ]);

      if (followingRes.error) throw followingRes.error;
      if (followersRes.error) throw followersRes.error;
      if (circleRes.error) throw circleRes.error;

      const followingIds = new Set((followingRes.data || []).map((row: any) => row.following?.id).filter(Boolean));
      const followerIds = new Set((followersRes.data || []).map((row: any) => row.follower?.id).filter(Boolean));
      const relationMap: Record<string, 'friend' | 'close_friend' | 'collaborator'> = {};
      (circleRes.data || []).forEach((row: any) => {
        if (row.profile?.id) relationMap[row.profile.id] = row.relation_type;
      });

      const byId = new Map<string, any>();
      (followingRes.data || []).forEach((row: any) => {
        if (row.following?.id) byId.set(row.following.id, row.following);
      });
      (followersRes.data || []).forEach((row: any) => {
        if (row.follower?.id) byId.set(row.follower.id, row.follower);
      });
      (circleRes.data || []).forEach((row: any) => {
        if (row.profile?.id) byId.set(row.profile.id, row.profile);
      });

      const formattedCircle: CircleMember[] = Array.from(byId.values()).map((profile: any) => {
        const isFollowing = followingIds.has(profile.id);
        const isFollower = followerIds.has(profile.id);
        const labeledRelation = relationMap[profile.id];
        const relation = labeledRelation || (isFollowing && isFollower ? 'mutual' : isFollowing ? 'following' : 'follower');
        return {
          id: profile.id,
          name: profile.display_name || profile.full_name || profile.username || 'Explorer',
          username: profile.username || 'user',
          avatar: profile.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${profile.id}`,
          count: 0,
          isGrinding: !!profile.is_grinding,
          streak: profile.streak || 0,
          statusNote: profile.status_note || '',
          role: profile.role || 'Explorer',
          verified: !!profile.verified,
          relation
        };
      });

      set({
        circle: formattedCircle,
        userCircles: relationMap,
        followingIds: Array.from(followingIds)
      });
    } catch (err) {
      console.error('Failed to fetch circle data:', err);
      get().addToast({ type: 'error', title: 'Circle failed', description: 'Could not load your circle.' });
    } finally {
      set({ _isFetchingCircle: false } as any);
    }
  },

  fetchNotifications: async () => {
    const userId = get().session?.user?.id;
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          actor:actor_id (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      set({ 
        notifications: data || [],
        unreadNotificationCount: (data || []).filter((n: any) => !n.is_read).length
      });
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  },

  markNotificationRead: async (id: string) => {
    await notificationService.markAsRead(id);
    set(state => ({
      notifications: state.notifications.map(n => n.id === id ? { ...n, is_read: true } : n),
      unreadNotificationCount: Math.max(0, state.unreadNotificationCount - 1)
    }));
  },

  markAllNotificationsRead: async () => {
    const userId = get().session?.user?.id;
    if (!userId) return;

    await notificationService.markAllAsRead(userId);
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, is_read: true })),
      unreadNotificationCount: 0
    }));
  },

  fetchUserStreak: async () => {
    const userId = get().session?.user?.id;
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      const streak = data ? {
        currentStreak: data.current_streak || 0,
        longestStreak: data.longest_streak || 0,
        lastActiveDate: data.last_active_date || null,
        streakStartDate: data.streak_start_date || null,
        activityDates: data.activity_dates || []
      } : {
        currentStreak: get().user.streak || 0,
        longestStreak: get().user.streak || 0,
        lastActiveDate: null,
        streakStartDate: null,
        activityDates: []
      };

      set((state) => ({
        userStreak: streak,
        user: { ...state.user, streak: streak.currentStreak }
      }));
    } catch (error) {
      console.error('Failed to fetch streak:', error);
    }
  },

  fetchWeeklyActivity: async () => {
    const userId = get().session?.user?.id;
    if (!userId) {
      set({ weeklyActivity: [] });
      return;
    }

    const dates = lastSevenDateKeys();

    try {
      const { data, error } = await supabase
        .from('user_daily_activity')
        .select('*')
        .eq('user_id', userId)
        .gte('activity_date', dates[0])
        .lte('activity_date', dates[dates.length - 1])
        .order('activity_date', { ascending: true });

      if (error) throw error;

      const byDate = new Map((data || []).map((row: any) => [row.activity_date, toDailyActivitySummary(row)]));
      set({ weeklyActivity: dates.map((date) => byDate.get(date) || emptyDailyActivity(date)) });
    } catch (error) {
      console.error('Failed to fetch weekly activity:', error);
      set({ weeklyActivity: dates.map(emptyDailyActivity) });
    }
  },

  recordDailyActivity: async (source) => {
    const userId = get().session?.user?.id;
    if (!userId) return;

    const today = toDateKey(new Date());
    const yesterday = yesterdayDateKey();
    const existing = get().userStreak;

    try {
      const { data: dailyRow, error: dailyFetchError } = await supabase
        .from('user_daily_activity')
        .select('*')
        .eq('user_id', userId)
        .eq('activity_date', today)
        .maybeSingle();

      if (dailyFetchError) throw dailyFetchError;

      const currentDaily = dailyRow ? toDailyActivitySummary(dailyRow) : emptyDailyActivity(today);
      const column = dailyActivityColumns[source];
      const nextDaily = {
        ...currentDaily,
        [column]: currentDaily[column] + 1,
        totalCount: currentDaily.totalCount + 1
      };

      const { error: dailyUpsertError } = await supabase
        .from('user_daily_activity')
        .upsert({
          user_id: userId,
          activity_date: today,
          task_count: nextDaily.taskCount,
          todo_count: nextDaily.todoCount,
          post_count: nextDaily.postCount,
          note_count: nextDaily.noteCount,
          journal_count: nextDaily.journalCount,
          vision_count: nextDaily.visionCount,
          focus_count: nextDaily.focusCount,
          total_count: nextDaily.totalCount,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,activity_date' });

      if (dailyUpsertError) throw dailyUpsertError;

      set((state) => {
        const existingWeek = state.weeklyActivity.length ? state.weeklyActivity : lastSevenDateKeys().map(emptyDailyActivity);
        const hasToday = existingWeek.some((day) => day.date === today);
        return {
          weeklyActivity: (hasToday ? existingWeek : [...existingWeek.slice(1), emptyDailyActivity(today)])
            .map((day) => day.date === today ? nextDaily : day)
        };
      });
    } catch (error) {
      console.error('Failed to record weekly activity:', error);
    }

    if (existing?.lastActiveDate === today) {
      if (source === 'post' || source === 'vision') {
        await supabase.from('user_achievements').upsert({
          user_id: userId,
          achievement_id: source === 'post' ? 'first_post' : 'first_vision',
          metadata: { source }
        }, { onConflict: 'user_id,achievement_id' });
      }
      return;
    }

    try {
      const { data: dbStreak, error: fetchError } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const lastActiveDate = dbStreak?.last_active_date || existing?.lastActiveDate || null;
      const previousCurrent = dbStreak?.current_streak ?? existing?.currentStreak ?? get().user.streak ?? 0;
      const previousLongest = dbStreak?.longest_streak ?? existing?.longestStreak ?? previousCurrent;
      const activityDates = Array.from(new Set([...(dbStreak?.activity_dates || existing?.activityDates || []), today])).slice(-180);
      const continues = lastActiveDate === yesterday;
      const currentStreak = lastActiveDate === today ? previousCurrent : continues ? previousCurrent + 1 : 1;
      const longestStreak = Math.max(previousLongest, currentStreak);
      const streakStartDate = continues ? (dbStreak?.streak_start_date || existing?.streakStartDate || today) : today;
      const updatedAt = new Date().toISOString();

      const payload = {
        user_id: userId,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_active_date: today,
        streak_start_date: streakStartDate,
        activity_dates: activityDates,
        updated_at: updatedAt
      };

      const { error: upsertError } = await supabase
        .from('user_streaks')
        .upsert(payload, { onConflict: 'user_id' });

      if (upsertError) throw upsertError;

      await supabase.from('profiles').update({ streak: currentStreak }).eq('id', userId);

      set((state) => ({
        userStreak: {
          currentStreak,
          longestStreak,
          lastActiveDate: today,
          streakStartDate,
          activityDates
        },
        user: { ...state.user, streak: currentStreak }
      }));

      if ([7, 30, 100].includes(currentStreak)) {
        const achievementId = currentStreak === 7 ? 'week_streak' : currentStreak === 30 ? 'month_streak' : 'centurion';
        await supabase.from('user_achievements').upsert({
          user_id: userId,
          achievement_id: achievementId,
          metadata: { current_streak: currentStreak }
        }, { onConflict: 'user_id,achievement_id' });
        get().addToast({
          type: 'success',
          title: `${currentStreak}-day streak`,
          description: `You kept your VisNova streak alive with ${source}.`
        });
        await notificationService.send({
          userId,
          actorId: userId,
          type: 'achievement',
          message: `reached a ${currentStreak}-day streak`
        });
      }

      if (source === 'post' || source === 'vision') {
        await supabase.from('user_achievements').upsert({
          user_id: userId,
          achievement_id: source === 'post' ? 'first_post' : 'first_vision',
          metadata: { source }
        }, { onConflict: 'user_id,achievement_id' });
      }
    } catch (error) {
      console.error('Failed to record daily activity:', error);
    }
  },

  toggleLikePost: async (id: string) => {
    const userId = get().session?.user?.id;
    if (!userId) {
      get().addToast({ type: 'error', title: 'Login required', description: 'Sign in to like posts.' });
      return;
    }

    const { posts } = get();
    const post = posts.find(p => p.id === id);
    if (!post) {
      get().addToast({ type: 'error', title: 'Post unavailable', description: 'Refresh the feed and try again.' });
      return;
    }

    const isLiked = post.isLiked;

    // Optimistic Update
    set((state) => ({
      posts: state.posts.map(p => p.id === id ? {
        ...p,
        isLiked: !isLiked,
        likes: isLiked ? p.likes - 1 : p.likes + 1
      } : p)
    }));

    try {
      if (isLiked) {
        const { error } = await supabase.from('post_likes').delete().match({ post_id: id, user_id: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('post_likes').insert({ post_id: id, user_id: userId });
        if (error) throw error;
        // Send Notification
        if (post.userId !== userId) {
          await notificationService.send({
            userId: post.userId,
            actorId: userId,
            type: 'like',
            postId: id,
            message: 'liked your post'
          });
        }
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
      // Revert if failed
      set((state) => ({
        posts: state.posts.map(p => p.id === id ? {
          ...p,
          isLiked: isLiked,
          likes: isLiked ? p.likes + 1 : p.likes - 1
        } : p)
      }));
      get().addToast({ type: 'error', title: 'Like failed', description: 'Could not save your like. Please try again.' });
    }
  },

  toggleSavePost: async (id: string) => {
    const userId = get().session?.user?.id;
    if (!userId) {
      get().addToast({ type: 'error', title: 'Login required', description: 'Sign in to save posts.' });
      return;
    }

    const { posts } = get();
    const post = posts.find(p => p.id === id);
    if (!post) {
      get().addToast({ type: 'error', title: 'Post unavailable', description: 'Refresh the feed and try again.' });
      return;
    }

    const isSaved = post.isSaved;

    // Optimistic Update
    set((state) => ({
      posts: state.posts.map(p => p.id === id ? { ...p, isSaved: !isSaved } : p)
    }));

    try {
      if (isSaved) {
        const { error } = await supabase.from('saved_posts').delete().match({ post_id: id, user_id: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('saved_posts').insert({ post_id: id, user_id: userId });
        if (error) throw error;
        if (post.userId !== userId) {
          await notificationService.send({
            userId: post.userId,
            actorId: userId,
            type: 'save',
            postId: id,
            message: 'saved your post'
          });
        }
      }
    } catch (err) {
      console.error('Failed to toggle save:', err);
      set((state) => ({
        posts: state.posts.map(p => p.id === id ? { ...p, isSaved: isSaved } : p)
      }));
      get().addToast({ type: 'error', title: 'Save failed', description: 'Could not update saved posts. Please try again.' });
    }
  },

  addComment: async (postId: string, content: string, parentId?: string) => {
    const userId = get().session?.user?.id;
    if (!userId) {
      get().addToast({ type: 'error', title: 'Login required', description: 'Sign in to comment.' });
      return null;
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      get().addToast({ type: 'error', title: 'Comment required', description: 'Write a comment before posting.' });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: userId,
          content: trimmedContent,
          parent_comment_id: parentId
        })
        .select(`
          *,
          author:profiles!comments_user_id_fkey(*)
        `)
        .single();

      if (error) throw error;
      
      // Notify post owner
      const { posts } = get();
      const post = posts.find(p => p.id === postId);
      if (post && post.userId !== userId) {
        await notificationService.send({
          userId: post.userId,
          actorId: userId,
          type: parentId ? 'reply' : 'comment',
          postId,
          commentId: data.id,
          message: parentId ? 'replied to your comment' : 'commented on your post'
        });
      }

      const mentionUsernames = extractMentionUsernames(trimmedContent);
      if (mentionUsernames.length > 0) {
        await notifyMentionedUsers({
          actorId: userId,
          postId,
          commentId: data.id,
          mentions: mentionUsernames.map(username => ({ username })),
          message: 'mentioned you in a comment'
        });
      }

      set((state) => ({
        posts: state.posts.map(p => p.id === postId ? { ...p, comments: p.comments + 1 } : p)
      }));
      return data;
    } catch (err) {
      console.error('Failed to add comment:', err);
      get().addToast({ type: 'error', title: 'Comment failed', description: 'Could not save your comment. Please try again.' });
      return null;
    }
  },

  toggleFollow: async (followingId: string) => {
    const userId = get().session?.user?.id;
    if (!userId) {
      get().addToast({ type: 'error', title: 'Login required', description: 'Sign in to follow people.' });
      return null;
    }
    if (userId === followingId) {
      get().addToast({ type: 'info', title: 'That is you', description: 'You cannot follow your own profile.' });
      return null;
    }

    try {
      const { data: existingFollow, error: checkError } = await supabase
        .from('follows')
        .select('*')
        .match({ follower_id: userId, following_id: followingId })
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingFollow) {
        const { error } = await supabase.from('follows').delete().match({ follower_id: userId, following_id: followingId });
        if (error) throw error;
        set(state => ({
          followingIds: state.followingIds.filter(id => id !== followingId),
          followerCounts: {
            ...state.followerCounts,
            [followingId]: Math.max(0, (state.followerCounts[followingId] || 1) - 1)
          }
        }));
        get().fetchProfileStats(followingId).catch(error => console.error('Failed to refresh follow stats:', error));
        get().fetchProfileStats(userId).catch(error => console.error('Failed to refresh own follow stats:', error));
        scheduleCircleRefresh(get);
        return false;
      } else {
        const { error } = await supabase.from('follows').insert({ follower_id: userId, following_id: followingId });
        if (error) throw error;
        set(state => ({
          followingIds: state.followingIds.includes(followingId) ? state.followingIds : [...state.followingIds, followingId],
          followerCounts: {
            ...state.followerCounts,
            [followingId]: (state.followerCounts[followingId] || 0) + 1
          }
        }));
        // Notify
        await notificationService.send({
          userId: followingId,
          actorId: userId,
          type: 'follow',
          message: 'started following you'
        });
        get().fetchProfileStats(followingId).catch(error => console.error('Failed to refresh follow stats:', error));
        get().fetchProfileStats(userId).catch(error => console.error('Failed to refresh own follow stats:', error));
        scheduleCircleRefresh(get);
        return true;
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
      get().addToast({ type: 'error', title: 'Follow failed', description: 'Could not update this follow. Please try again.' });
      return null;
    }
  },

  shareVision: async (visionId, receiverEmail) => {
    const userId = get().session?.user?.id;
    if (!userId) return;

    try {
      const { error } = await supabase.from('vision_shares').insert({
        vision_id: visionId,
        sender_email: get().user.email,
        receiver_email: receiverEmail,
        status: 'pending'
      });
      if (error) throw error;
      
      get().addToast({ type: 'success', title: 'Vision shared', description: `Request sent to ${receiverEmail}` });
    } catch (error) {
      console.error('Failed to share vision:', error);
      get().addToast({ type: 'error', title: 'Share failed', description: 'Could not send vision sharing request.' });
    }
  },

  completeOnboarding: async (data: any) => {
    const { name, email, interests, intent, commitment, username, bio, avatar, role, gender } = data;
    const session = get().session;
    const userId = session?.user?.id;

    if (!userId) {
      get().addToast({ type: 'error', title: 'Login required', description: 'Sign in before finishing onboarding.' });
      return;
    }

    const normalizedUsername = String(username || '').toLowerCase().trim().replace(/[^a-z0-9_]/g, '').slice(0, 24);
    if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
      get().addToast({ type: 'error', title: 'Invalid username', description: 'Use 3-24 lowercase letters, numbers, or underscores.' });
      return;
    }

    try {
      await get().ensureCurrentUserProfile();

      const { data: usernameAvailable, error: usernameError } = await supabase.rpc('is_username_available', {
        candidate_username: normalizedUsername,
        current_user_id: userId
      });
      if (usernameError) throw usernameError;
      if (!usernameAvailable) {
        get().addToast({ type: 'error', title: 'Username taken', description: 'Choose a different username.' });
        return;
      }

      const profilePayload = {
        id: userId,
        email: email || session.user.email || '',
        full_name: name || 'Explorer',
        display_name: name || 'Explorer',
        username: normalizedUsername,
        bio: bio || '',
        avatar_url: avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${userId}`,
        role: role || 'Explorer',
        gender: gender || 'custom',
        onboarded: true,
        onboarding_step: 999,
        onboarding_completed_at: new Date().toISOString(),
        main_goal: intent || '',
        interests: interests || [],
        updated_at: new Date().toISOString()
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' });

      if (profileError) throw profileError;

      if (intent?.trim()) {
        const { data: vision, error: visionError } = await supabase
          .from('visions')
          .insert({
            user_id: userId,
            title: intent.trim(),
            description: commitment ? `Commitment level: ${commitment}` : '',
            status: 'idea',
            tags: interests || [],
            progress: 0,
            notes: '',
            proof: [],
            elements: [],
            visibility: 'private'
          })
          .select()
          .single();

        if (visionError) throw visionError;

        await supabase.from('tasks').insert({
          user_id: userId,
          vision_id: vision.id,
          text: 'Define the first milestone',
          completed: false
        });
      }

      if (interests?.length > 0) {
        const interestData = interests.map((tag: string) => ({
          user_id: userId,
          tag: String(tag).toLowerCase(),
          weight: 1.0,
          updated_at: new Date().toISOString()
        }));
        const { error: interestsError } = await supabase.from('user_interests').upsert(interestData, { onConflict: 'user_id,tag' });
        if (interestsError) throw interestsError;
      }

      await get().loadUserProfile(userId);
      await get().fetchDashboardData();
      get().addToast({ type: 'success', title: 'Onboarding complete', description: 'Welcome to VisNova.' });
    } catch (err: any) {
      console.error('Onboarding finalization failed:', err);
      get().addToast({ type: 'error', title: 'Onboarding failed', description: err.message || 'Could not finish onboarding.' });
    }
  },

  acceptVision: async (visionId) => {
    const userId = get().session?.user?.id;
    const userEmail = get().session?.user?.email;
    if (!userId || !userEmail) return;

    try {
      const { error } = await supabase
        .from('vision_shares')
        .update({ status: 'accepted' })
        .match({ vision_id: visionId, receiver_email: userEmail });

      if (error) throw error;

      set((state) => ({
        sharedVisions: state.sharedVisions.filter(v => v.id !== visionId)
      }));
      
      get().addToast({ type: 'success', title: 'Vision accepted', description: 'The shared vision is now yours.' });
    } catch (err) {
      console.error('Failed to accept vision:', err);
    }
  },

  fetchUser: async () => {
    const session = get().session;
    if (!session?.user) return;
    
    const userId = session.user.id;
    const userEmail = session.user.email;
    
    const state = get();
    if ((state as any)._isFetchingUser === userId) return;
    set({ _isFetchingUser: userId } as any);

    try {
      // 1. Fetch Profile (Supabase)
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        set((state) => ({
          profile,
          user: toProfileUser(profile, userEmail || state.user.email),
          hasCompletedOnboarding: !!profile.onboarded
        }));
      }

      // Load User Data
      get().fetchFolders();
      get().fetchNotes();
      get().fetchJournalEntries();

      // 2. Fetch Notifications (Initial)
      get().fetchNotifications();
      get().fetchCircleData();

      // 3. Setup Supabase Real-time Sync for Social & Auth
      const syncSocial = async () => {
        // Fetch Follows
        const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
        if (follows) set({ followingIds: follows.map(f => f.following_id) });
        await get().fetchCircleData();
      };
      
      syncSocial();

      // Realtime Notifications
      supabase
        .channel('notifications')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${userId}` 
        }, () => {
          get().fetchNotifications();
        })
        .subscribe();

    } catch (err) {
      console.error('Failed to initialize Supabase profile:', err);
    } finally {
      set({ _isFetchingUser: null } as any);
    }
  },
}));
