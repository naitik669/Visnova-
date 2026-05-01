/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { AppState, Vision, Activity, CircleMember, Folder, Note, Task, Post } from '../types';
import { rankPosts } from '../services/feedRankingService';
import { notificationService } from '../services/notificationService';
import { supabase } from '../lib/supabase';


export const useStore = create<AppState>((set, get) => ({
  user: {
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
  },
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
  userInterests: {},
  userCircles: {},
  followingIds: [],
  notifications: [],
  unreadNotificationCount: 0,
  achievements: [],
  milestones: [],
  hasCompletedOnboarding: localStorage.getItem('visnova_onboarded_v2') === 'true',
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
  theme: (localStorage.getItem('theme') as 'light' | 'dark' | 'pastel' | 'green' | 'yellow') || 'light',
  session: null,
  selectedProfileId: null,
  setSelectedProfileId: (id) => set({ selectedProfileId: id }),

  setSession: (session) => set({ session }),

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

    const newVision: Vision = {
      id: Math.random().toString(36).substring(7),
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
    };

    set((state) => ({ visions: [...state.visions, newVision] }));

    if (userId) {
      try {
        const { id: _, ...visionData } = newVision;
        const { data, error } = await supabase
          .from('visions')
          .insert({ ...visionData, user_id: userId })
          .select()
          .single();

        if (error) throw error;
        
        set((state) => ({
          visions: state.visions.map(v => v.id === newVision.id ? { ...v, id: data.id } : v)
        }));
        return { ...newVision, id: data.id };
      } catch (error) {
        console.error('Failed to create vision:', error);
      }
    }
    return newVision;
  },

  updateVision: async (id, updates) => {
    set((state) => ({
      visions: state.visions.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    }));

    try {
      await supabase.from('visions').update(updates).eq('id', id);
    } catch (error) {
      console.error('Failed to update vision:', error);
    }
  },

  deleteVision: async (id) => {
    set((state) => ({
      visions: state.visions.filter((v) => v.id !== id),
    }));

    try {
      await supabase.from('visions').delete().eq('id', id);
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
          content: activity.content,
          metadata: activity.metadata || {}
        });
      } catch (error) {
        console.error('Failed to log activity:', error);
      }
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
    set((state) => ({
      user: { ...state.user, ...updates }
    }));

    const userId = get().session?.user?.id;
    if (userId) {
      try {
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.display_name = updates.name;
        if (updates.username) dbUpdates.username = updates.username;
        if (updates.avatar) dbUpdates.avatar_url = updates.avatar;
        if (updates.bio) dbUpdates.bio = updates.bio;
        
        await supabase.from('profiles').update(dbUpdates).eq('id', userId);
      } catch (error) {
        console.error('Failed to update user profile:', error);
      }
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
  updateVitals: async (vitals) => {
    set((state) => ({
      vitals: { ...state.vitals, ...vitals }
    }));
  },
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

    set((state) => ({
      dateNotes: { ...state.dateNotes, [date]: note }
    }));

    if (userId) {
      try {
        const journalId = `${userId}_${date}`;
        if (!note.trim()) {
          await supabase.from('journal').delete().eq('userId', userId).eq('date', date);
        } else {
          const { error } = await supabase.from('journal').upsert({
            userId,
            date,
            note,
            updatedAt: Date.now()
          });
          if (error) throw error;
        }
      } catch (error) {
        console.error('Failed to set date note:', error);
      }
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

  addFolder: async (folder) => {
    const userId = get().session?.user?.id;
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

    if (userId) {
      try {
        const { id: _, ...folderData } = newFolder;
        const { data, error } = await supabase.from('folders').insert({ ...folderData, userId }).select().single();
        if (error) throw error;
        set((state) => ({
          folders: state.folders.map(f => f.id === tempId ? { ...f, id: data.id } : f)
        }));
      } catch (error) {
        console.error('Failed to create folder:', error);
      }
    }
  },

  updateFolder: async (id, updates) => {
    set((state) => ({
      folders: state.folders.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));

    try {
      await supabase.from('folders').update(updates).eq('id', id);
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
    const tempId = Math.random().toString(36).substring(7);

    const newNote = {
      id: tempId,
      title: note.title || 'Untitled Note',
      content: note.content || '',
      folderId: note.folderId || null,
      tags: note.tags || [],
      linkedVisionId: note.linkedVisionId || null,
      visibility: note.visibility || 'private',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...note,
    };

    set((state) => ({ notes: [...state.notes, newNote] }));

    if (userId) {
      try {
        const { id: _, ...noteData } = newNote;
        const { data, error } = await supabase.from('notes').insert({ ...noteData, userId }).select().single();
        if (error) throw error;
        set((state) => ({
          notes: state.notes.map(n => n.id === tempId ? { ...n, id: data.id } : n)
        }));
      } catch (error) {
        console.error('Failed to add note:', error);
      }
    }
  },

  updateNote: async (id, updates) => {
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n)),
    }));

    try {
      await supabase.from('notes').update({ ...updates, updatedAt: Date.now() }).eq('id', id);
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  },

  deleteNote: async (id) => {
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
    }));

    try {
      await supabase.from('notes').delete().eq('id', id);
    } catch (error) {
      console.error('Failed to delete note:', error);
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
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      // 1. Insert post
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          type: post.type,
          caption: post.caption,
          content: post.content,
          media: post.media || [],
          tags: post.tags || [],
          stats: post.stats || {},
          visibility: post.visibility || 'public'
        })
        .select()
        .single();

      if (postError) throw postError;

      // 2. Extra achievement/milestone logic (optional profiling)
      if (post.type === 'achievement' || post.type === 'milestone') {
         // Could track in global achievements table if needed
      }

      // Refresh feed
      get().fetchPosts('latest');
      
      get().addToast({
        type: 'success',
        title: 'Post shared',
        description: 'Successfully broadcast to the community.'
      });
    } catch (err) {
      console.error('Failed to create post:', err);
      get().addToast({ type: 'error', title: 'Post failed', description: 'Could not synchronize post with Supabase.' });
    }
  },

  fetchPosts: async (tab?: 'recommended' | 'following' | 'latest') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      let query = supabase
        .from('posts')
        .select(`
          *,
          author:profiles(*),
          likes:post_likes(user_id),
          saves:saved_posts(user_id),
          comment_count:comments(count)
        `)
        .limit(20);

      if (tab === 'latest') {
        query = query.order('created_at', { ascending: false });
      } else if (tab === 'following' && userId) {
        const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
        const followingIds = follows?.map(f => f.following_id) || [];
        query = query.in('user_id', followingIds).order('created_at', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      const formattedPosts: Post[] = data.map((p: any) => ({
        id: p.id,
        userId: p.user_id,
        author: {
          id: p.author?.id,
          name: p.author?.display_name || p.author?.full_name || 'Explorer',
          avatar: p.author?.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${p.user_id}`,
          handle: `@${p.author?.username || 'user'}`
        },
        caption: p.caption,
        content: p.content,
        timestamp: new Date(p.created_at).toLocaleDateString(),
        createdAt: p.created_at, // Keep raw for ranking
        likes: p.likes?.length || 0,
        comments: p.comment_count?.[0]?.count || 0,
        saves: p.saves?.length || 0,
        isLiked: userId ? p.likes?.some((l: any) => l.user_id === userId) : false,
        isSaved: userId ? p.saves?.some((s: any) => s.user_id === userId) : false,
        type: p.type,
        visibility: p.visibility,
        media: p.media || [],
        tags: p.tags || []
      }));

      let finalPosts = formattedPosts;
      if (tab === 'recommended' || !tab) {
        const state = get();
        finalPosts = rankPosts(formattedPosts, {
          userId: userId || null,
          followingIds: state.followingIds,
          circleIds: state.userCircles,
          userInterests: state.userInterests
        });
      }

      set({ posts: finalPosts });
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    }
  },

  trackInteraction: async (postId, type) => {
    const userId = auth.currentUser?.uid;
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
      if (isSupabaseConfigured) {
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
    const userId = auth.currentUser?.uid;
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
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      await supabase
        .from('user_circles')
        .upsert({ user_id: userId, circle_user_id: targetUserId, relation_type: type }, { onConflict: 'user_id,circle_user_id' });
      
      set(state => ({
        userCircles: { ...state.userCircles, [targetUserId]: type }
      }));
    } catch (err) {
      console.error('Failed to add to circle:', err);
    }
  },

  removeFromCircle: async (targetUserId) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      await supabase
        .from('user_circles')
        .delete()
        .match({ user_id: userId, circle_user_id: targetUserId });
      
      set(state => {
        const next = { ...state.userCircles };
        delete next[targetUserId];
        return { userCircles: next };
      });
    } catch (err) {
      console.error('Failed to remove from circle:', err);
    }
  },

  fetchNotifications: async () => {
    const userId = auth.currentUser?.uid;
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

  toggleLikePost: async (id: string) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const { posts } = get();
    const post = posts.find(p => p.id === id);
    if (!post) return;

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
        await supabase.from('post_likes').delete().match({ post_id: id, user_id: userId });
      } else {
        await supabase.from('post_likes').insert({ post_id: id, user_id: userId });
        // Send Notification
        if (post.userId !== userId) {
          notificationService.send({
            userId: post.userId,
            actorId: userId,
            type: 'like',
            entityId: id,
            content: 'liked your post'
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
    }
  },

  toggleSavePost: async (id: string) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const { posts } = get();
    const post = posts.find(p => p.id === id);
    if (!post) return;

    const isSaved = post.isSaved;

    // Optimistic Update
    set((state) => ({
      posts: state.posts.map(p => p.id === id ? { ...p, isSaved: !isSaved } : p)
    }));

    try {
      if (isSaved) {
        await supabase.from('saved_posts').delete().match({ post_id: id, user_id: userId });
      } else {
        await supabase.from('saved_posts').insert({ post_id: id, user_id: userId });
      }
    } catch (err) {
      console.error('Failed to toggle save:', err);
      set((state) => ({
        posts: state.posts.map(p => p.id === id ? { ...p, isSaved: isSaved } : p)
      }));
    }
  },

  addComment: async (postId: string, content: string, parentId?: string) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: userId,
          content,
          parent_comment_id: parentId
        })
        .select(`
          *,
          author:profiles(*)
        `)
        .single();

      if (error) throw error;
      
      // Notify post owner
      const { posts } = get();
      const post = posts.find(p => p.id === postId);
      if (post && post.userId !== userId) {
        notificationService.send({
          userId: post.userId,
          actorId: userId,
          type: parentId ? 'reply' : 'comment',
          entityId: postId,
          content: parentId ? 'replied to your comment' : 'commented on your post'
        });
      }

      get().fetchPosts();
      return data;
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  },

  toggleFollow: async (followingId: string) => {
    const userId = auth.currentUser?.uid;
    if (!userId || userId === followingId) return;

    try {
      const { data: existingFollow, error: checkError } = await supabase
        .from('follows')
        .select('*')
        .match({ follower_id: userId, following_id: followingId })
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingFollow) {
        await supabase.from('follows').delete().match({ follower_id: userId, following_id: followingId });
        set(state => ({
          followingIds: state.followingIds.filter(id => id !== followingId)
        }));
      } else {
        await supabase.from('follows').insert({ follower_id: userId, following_id: followingId });
        set(state => ({
          followingIds: [...state.followingIds, followingId]
        }));
        // Notify
        notificationService.send({
          userId: followingId,
          actorId: userId,
          type: 'follow',
          content: 'started following you'
        });
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    }
  },

  shareVision: async (visionId, receiverEmail) => {
    const userId = auth.currentUser?.uid;
    if (!userId || !isDbId(visionId)) return;

    try {
      await addDoc(collection(db, 'sharedVisions'), {
        visionId,
        senderId: userId,
        receiverEmail,
        status: 'pending',
        createdAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sharedVisions');
    }
  },

  toggleVisionTask: async (visionId, taskId) => {
    const { visions } = get();
    const vision = visions.find(v => v.id === visionId);
    if (!vision) return;

    const task = vision.tasks.find(t => t.id === taskId);
    const wasCompleted = task?.completed;

    const updatedTasks = vision.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
    const completedCount = updatedTasks.filter(t => t.completed).length;
    const progress = Math.round((completedCount / updatedTasks.length) * 100);

    set((state) => ({
      visions: state.visions.map(v => v.id === visionId ? { ...v, tasks: updatedTasks, progress } : v)
    }));

    if (!wasCompleted) {
      get().addXp(50);
      get().updateVitals({
        focus: Math.min(100, get().vitals.focus + 2),
        energy: Math.max(0, get().vitals.energy - 5)
      });
      get().addActivity({
        type: 'completed',
        userId: auth.currentUser?.uid || 'me',
        description: `Strategic component of ${vision.title} successfully executed.`
      });
    }

    if (isDbId(visionId)) {
      try {
        await updateDoc(doc(db, 'visions', visionId), { tasks: updatedTasks, progress });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `visions/${visionId}`);
      }
    }
  },

  completeOnboarding: async (data: any) => {
    const { name, email, interests, intent, commitment, username, bio, tags, avatar, role, gender } = data;

    const initialId = Math.random().toString(36).substring(7);
    const initialVision: Vision = {
      id: initialId,
      title: intent || 'Primary Vision',
      status: 'in-progress' as const,
      description: `Commitment level: ${commitment}`,
      tags: interests || [],
      progress: 0,
      notes: '',
      proof: [],
      createdAt: Date.now(),
      tasks: [
        { id: Math.random().toString(36).substring(7), text: 'Establish system baseline', completed: false },
        { id: Math.random().toString(36).substring(7), text: 'Verify core objectives', completed: false },
        { id: Math.random().toString(36).substring(7), text: 'Execute initial sprint', completed: false }
      ]
    };

    // Optimistic Update
    set((state: any) => ({
      user: {
        ...state.user,
        name,
        email,
        username: username || '',
        bio: bio || '',
        avatar: avatar || state.user.avatar,
        gender: gender || state.user.gender,
        role: role || state.user.role
      },
      visions: [initialVision],
      hasCompletedOnboarding: true
    }));
    localStorage.setItem('visnova_onboarded_v2', 'true');
    localStorage.setItem('visnova_onboarding_data', JSON.stringify({ ...data, visionId: initialId }));

    const userId = auth.currentUser?.uid;
    if (userId) {
      try {
        const batch = writeBatch(db);
        
        // 1. Create User Profile
        const userRef = doc(db, 'users', userId);
        batch.set(userRef, {
          name,
          email,
          username: username || '',
          bio: bio || '',
          avatar: avatar || 'https://api.dicebear.com/7.x/shapes/svg?seed=User',
          role: role || 'Explorer',
          gender: gender || 'custom',
          hasCompletedOnboarding: true,
          vitals: { focus: 85, energy: 72, mood: 90, sleep: 64 },
          xp: 0,
          level: 1,
          rank: 'Explorer',
          streak: 0,
          createdAt: Date.now()
        });

        // 2. Create Initial Vision
        const visionRef = doc(collection(db, 'visions'));
        const { id: _, ...visionData } = initialVision;
        batch.set(visionRef, { ...visionData, userId });

        await batch.commit();

        // 3. Sync to Supabase for Social Features
        await supabase.from('profiles').upsert({
          id: userId,
          display_name: name,
          avatar_url: avatar,
          bio: bio,
          role: role,
          updated_at: new Date().toISOString()
        });

        if (interests && interests.length > 0) {
          const interestEntries = interests.map((tag: string) => ({
            user_id: userId,
            tag: tag.toLowerCase(),
            weight: 1.0,
            updated_at: new Date().toISOString()
          }));
          await supabase.from('user_interests').upsert(interestEntries);
        }

        set(state => ({
          visions: state.visions.map(v => v.id === initialId ? { ...v, id: visionRef.id } : v)
        }));
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'onboarding');
      }
    }
  },

  acceptVision: async (visionId) => {
    const userId = auth.currentUser?.uid;

    try {
      const q = query(
        collection(db, 'sharedVisions'), 
        where('visionId', '==', visionId), 
        where('receiverEmail', '==', auth.currentUser?.email)
      );
      const docs = await getDocs(q);
      if (!docs.empty) {
        await updateDoc(doc(db, 'sharedVisions', docs.docs[0].id), { status: 'accepted' });
        set((state) => ({
          sharedVisions: state.sharedVisions.filter(v => v.id !== visionId)
        }));
      }
    } catch (err) {
      console.error('Failed to accept vision:', err);
    }
  },

  fetchUser: async (email) => {
    if (!email) return;
    
    const state = get();
    if ((state as any)._isFetchingUser === email) return;
    set({ _isFetchingUser: email } as any);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
       set({ _isFetchingUser: null } as any);
       return;
    }

    const userId = user.id;

    try {
      // 1. Fetch Profile (Supabase)
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        set((state) => ({
          user: { 
            ...state.user, 
            name: profile.display_name || profile.full_name || 'Explorer',
            email: user.email || '',
            avatar: profile.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${userId}`,
            bio: profile.bio,
            username: profile.username,
            role: profile.role,
            xp: profile.xp || 0,
            level: profile.level || 1,
            streak: profile.streak || 0,
            isGrinding: profile.is_grinding || false
          },
          hasCompletedOnboarding: profile.has_completed_onboarding ?? state.hasCompletedOnboarding
        }));
      }

      // 2. Fetch Notifications (Initial)
      get().fetchNotifications();

      // 3. Setup Supabase Real-time Sync for Social & Auth
      const syncSocial = async () => {
        // Fetch Follows
        const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
        if (follows) set({ followingIds: follows.map(f => f.following_id) });

        // Fetch Circles (Mocked legacy logic - keep for UI compatibility)
        // In real prod, this should use a separate table
        const { data: circleMembers } = await supabase.from('profiles').select('*').limit(15);
        if (circleMembers) {
           const formattedCircle = circleMembers
             .filter(m => m.id !== userId)
             .map(m => ({
               id: m.id,
               name: m.display_name || m.full_name || 'Explorer',
               avatar: m.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${m.id}`,
               count: m.xp || 0,
               isGrinding: m.is_grinding || false,
               streak: m.streak || 0,
               role: m.role || 'Explorer'
             }));
           set({ circle: formattedCircle as CircleMember[] });
        }
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
