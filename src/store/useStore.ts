/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { AppState, Vision, Activity, CircleMember, Folder, Note, Task, Post } from '../types';
import { rankPosts } from '../services/feedRankingService';
import { notificationService } from '../services/notificationService';
import { db, auth } from '../lib/firebase';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  orderBy, 
  limit,
  Timestamp,
  serverTimestamp,
  increment,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

const isDbId = (id?: string | null) => Boolean(id && id.length > 5); // Firebase IDs can be shorter than UUIDs

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
  visions: [
    {
      id: 'example-vision-1',
      title: 'Neural Architecture Mastery',
      description: 'Master the principles of biological and artificial neural networks through dedicated research and implementation.',
      status: 'in-progress',
      progress: 65,
      tasks: [
        { id: 'v1t1', text: 'Complete advanced calculus refresher', completed: true },
        { id: 'v1t2', text: 'Build bio-realistic neuron simulation', completed: true },
        { id: 'v1t3', text: 'Analyze cortical column patterns', completed: false }
      ],
      tags: ['AI', 'Neuroscience', 'Strategy'],
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
      notes: '',
      proof: [],
      elements: [
        {
          id: 'e1',
          type: 'heading',
          content: 'Mastering the Mind-Machine Interface',
          x: 2500,
          y: 2400,
        },
        {
          id: 'e2',
          type: 'quote',
          content: 'The best way to predict the future is to invent it.',
          metadata: { author: 'Alan Kay' },
          x: 2400,
          y: 2600,
        }
      ]
    },
    {
      id: 'example-vision-2',
      title: 'Global Exploration 2026',
      description: 'Document the cultural evolution across 12 unique biomes while maintaining professional output.',
      status: 'planning',
      progress: 15,
      tasks: [
        { id: 'v2t1', text: 'Define priority nodes', completed: true },
        { id: 'v2t2', text: 'Optimize lightweight gear setup', completed: false }
      ],
      tags: ['Travel', 'Documentation', 'Freedom'],
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
      notes: '',
      proof: [],
    },
    {
      id: 'example-vision-3',
      title: 'Physical Prime Protocol',
      description: 'Systematic optimization of biological performance through biomechanics and nutritional precision.',
      status: 'idea',
      progress: 0,
      tasks: [
        { id: 'v3t1', text: 'Baseline VO2 max testing', completed: false },
        { id: 'v3t2', text: 'Calibrate micronutrient stack', completed: false }
      ],
      tags: ['Health', 'Biohacking'],
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
      notes: '',
      proof: [],
    }
  ],
  activities: [],
  sharedVisions: [],
  vitals: {
    focus: 85,
    energy: 72,
    mood: 90,
    sleep: 64,
  },
  folders: [
    { id: 'f1', name: 'Strategic Insights', parentId: null, expanded: true },
    { id: 'f2', name: 'Neural Models', parentId: 'f1', expanded: true }
  ],
  notes: [
    {
      id: 'n1',
      title: 'The Compound Effect of Focus',
      content: 'Small, consistent focus sessions yield exponential results in domain mastery. Prioritize deep sprints over shallow work.',
      folderId: 'f1',
      tags: ['System', 'Productivity'],
      linkedVisionId: 'example-vision-1',
      visibility: 'private',
      createdAt: Date.now() - 1000 * 60 * 60 * 5,
      updatedAt: Date.now() - 1000 * 60 * 60 * 5
    },
    {
      id: 'n2',
      title: 'Biome-Specific Adaptation',
      content: 'When traveling between biomes, allow 72 hours for hormonal stabilization. Hydration protocols must be adjusted for altitude.',
      folderId: 'f1',
      tags: ['Travel', 'Biology'],
      linkedVisionId: 'example-vision-2',
      visibility: 'connections',
      createdAt: Date.now() - 1000 * 60 * 60 * 24,
      updatedAt: Date.now() - 1000 * 60 * 60 * 24
    }
  ],
  todos: [],
  posts: [
    {
      id: '1',
      userId: 'u1',
      author: {
        id: 'u1',
        name: 'Alex Rivera',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
        handle: '@arivera'
      },
      content: 'Just finished a 90min Deep Sprint. Found a new mental model for handling async execution in high-load scenarios. Focus session was incredibly productive.',
      timestamp: '2h ago',
      likes: 24,
      comments: 5,
      saves: 3,
      type: 'sprint',
      visibility: 'public',
      stats: { focusTime: 90 }
    },
    {
      id: '2',
      userId: 'u2',
      author: {
        id: 'u2',
        name: 'Sarah Chen',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
        handle: '@schen_dev'
      },
      content: 'Consistency is a flywheel. The first 10 days are friction. The next 10 are momentum. Today is Day 31 of my 100 Day streak. Progress updated!',
      timestamp: '4h ago',
      likes: 89,
      comments: 12,
      saves: 10,
      type: 'milestone',
      visibility: 'public'
    },
    {
      id: '3',
      userId: 'u3',
      author: {
        id: 'u3',
        name: 'Craziematez',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Craziematez',
        handle: '@craziematez'
      },
      content: 'Visualizing goals isn\'t enough. We need to build systems that force us to see them even when we don\'t want to. That\'s why I use Visnova. Session complete.',
      timestamp: '1d ago',
      likes: 156,
      comments: 20,
      saves: 20,
      type: 'insight',
      visibility: 'public',
      isSaved: true
    }
  ],
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
    const userId = auth.currentUser?.uid;

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
        const docRef = await addDoc(collection(db, 'visions'), { ...visionData, userId });
        // ID is already in state, but we could sync it if we want the actual doc ID
        // For simplicity, we'll keep the random ID for local UI and maybe use doc ID if needed.
        // Actually, it's better to use the doc ID.
        set((state) => ({
          visions: state.visions.map(v => v.id === newVision.id ? { ...v, id: docRef.id } : v)
        }));
        return { ...newVision, id: docRef.id };
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'visions');
      }
    }
    return newVision;
  },

  updateVision: async (id, updates) => {
    set((state) => ({
      visions: state.visions.map((v) => (v.id === id ? { ...v, ...updates } : v)),
    }));

    if (isDbId(id)) {
      try {
        await updateDoc(doc(db, 'visions', id), updates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `visions/${id}`);
      }
    }
  },

  deleteVision: async (id) => {
    set((state) => ({
      visions: state.visions.filter((v) => v.id !== id),
    }));

    if (isDbId(id)) {
      try {
        await deleteDoc(doc(db, 'visions', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `visions/${id}`);
      }
    }
  },

  moveVision: async (id, newStatus) => {
    set((state) => ({
      visions: state.visions.map((v) => (v.id === id ? { ...v, status: newStatus } : v)),
    }));

    if (isDbId(id)) {
      try {
        await updateDoc(doc(db, 'visions', id), { status: newStatus });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `visions/${id}`);
      }
    }
  },

  reorderVisions: (visions) => set({ visions }),

  addActivity: async (activity) => {
    const userId = auth.currentUser?.uid;
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
        await addDoc(collection(db, 'activities'), newActivity);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'activities');
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

    const userId = auth.currentUser?.uid;
    if (userId) {
      try {
        const userRef = doc(db, 'users', userId);
        const dbUpdates: any = { ...updates };
        // Map any field names if they differ from AppState['user']
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.email) dbUpdates.email = updates.email;
        
        await updateDoc(userRef, dbUpdates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      }
    }
  },
  toggleGrinding: async () => {
    const { user } = get();
    const newIsGrinding = !user.isGrinding;
    set((state) => ({
      user: { ...state.user, isGrinding: newIsGrinding }
    }));
    
    const userId = auth.currentUser?.uid;
    if (userId) {
      try {
        await updateDoc(doc(db, 'users', userId), { isGrinding: newIsGrinding });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
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
    
    const userId = auth.currentUser?.uid;
    if (userId) {
      try {
        await updateDoc(doc(db, 'users', userId), { vitals: { ...get().vitals, ...vitals } });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      }
    }
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
          rank: state.user.level + 1 > 25 ? 'System Sovereignty' : state.user.rank
        };
      } else {
        newXpData = { xp: newXp };
      }

      return {
        user: { ...state.user, ...newXpData }
      };
    });

    const userId = auth.currentUser?.uid;
    if (userId && newXpData) {
      try {
        await updateDoc(doc(db, 'users', userId), newXpData);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
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
    const userId = auth.currentUser?.uid;

    set((state) => ({
      dateNotes: { ...state.dateNotes, [date]: note }
    }));

    if (userId) {
      try {
        const journalId = `${userId}_${date}`;
        if (!note.trim()) {
          await deleteDoc(doc(db, 'journal', journalId));
        } else {
          await setDoc(doc(db, 'journal', journalId), {
            userId,
            date,
            note,
            updatedAt: Date.now()
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `journal/${userId}_${date}`);
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
    const userId = auth.currentUser?.uid;
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
        const docRef = await addDoc(collection(db, 'folders'), { ...folderData, userId });
        set((state) => ({
          folders: state.folders.map(f => f.id === tempId ? { ...f, id: docRef.id } : f)
        }));
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'folders');
      }
    }
  },

  updateFolder: async (id, updates) => {
    set((state) => ({
      folders: state.folders.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));

    if (isDbId(id)) {
      try {
        await updateDoc(doc(db, 'folders', id), updates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `folders/${id}`);
      }
    }
  },

  deleteFolder: async (id) => {
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
      notes: state.notes.map(n => n.folderId === id ? { ...n, folderId: null } : n),
    }));

    if (isDbId(id)) {
      try {
        await deleteDoc(doc(db, 'folders', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `folders/${id}`);
      }
    }
  },

  addNote: async (note) => {
    const userId = auth.currentUser?.uid;
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
        const docRef = await addDoc(collection(db, 'notes'), { ...noteData, userId });
        set((state) => ({
          notes: state.notes.map(n => n.id === tempId ? { ...n, id: docRef.id } : n)
        }));
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'notes');
      }
    }
  },

  updateNote: async (id, updates) => {
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n)),
    }));

    if (isDbId(id)) {
      try {
        await updateDoc(doc(db, 'notes', id), { ...updates, updatedAt: Date.now() });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `notes/${id}`);
      }
    }
  },

  deleteNote: async (id) => {
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
    }));

    if (isDbId(id)) {
      try {
        await deleteDoc(doc(db, 'notes', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `notes/${id}`);
      }
    }
  },

  addTodo: async (text) => {
    const userId = auth.currentUser?.uid;
    const tempId = Math.random().toString(36).substring(7);
    const newTodo = { id: tempId, text, completed: false };

    set((state) => ({
      todos: [newTodo, ...state.todos]
    }));

    if (userId) {
      try {
        await addDoc(collection(db, 'todos'), { userId, text, completed: false, createdAt: Date.now() });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'todos');
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
      get().updateVitals({
        mood: Math.min(100, get().vitals.mood + 2),
        energy: Math.max(0, get().vitals.energy - 2)
      });
    }

    if (isDbId(id)) {
      try {
        await updateDoc(doc(db, 'todos', id), { completed: !wasCompleted });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `todos/${id}`);
      }
    }
  },

  deleteTodo: async (id) => {
    set((state) => ({
      todos: state.todos.filter(t => t.id !== id)
    }));

    if (isDbId(id)) {
      try {
        await deleteDoc(doc(db, 'todos', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `todos/${id}`);
      }
    }
  },
  
  addPost: async (post: any) => {
    const userId = auth.currentUser?.uid;
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
          visibility: post.visibility || 'public'
        })
        .select()
        .single();

      if (postError) throw postError;

      // Special handling for Achievement/Milestone
      if (post.type === 'achievement' && post.metadata) {
        await supabase.from('achievements').insert({
          user_id: userId,
          title: post.metadata.title,
          description: post.content,
          image_url: post.media?.[0]?.url,
          achieved_at: post.metadata.date ? new Date(post.metadata.date).toISOString() : new Date().toISOString()
        });
      }

      if (post.type === 'milestone' && post.metadata) {
        await supabase.from('milestones').insert({
          user_id: userId,
          title: post.metadata.title,
          description: post.content,
          target_date: post.metadata.date,
          progress: post.metadata.progress || 0
        });
      }

      // 2. Handle media if any
      if (post.media && post.media.length > 0) {
        const mediaToInsert = post.media.map((m: any) => ({
          post_id: postData.id,
          media_url: m.url,
          media_type: m.type,
          storage_path: m.storagePath
        }));
        await supabase.from('post_media').insert(mediaToInsert);
      }

      // 3. Handle tags
      if (post.tags && post.tags.length > 0) {
        const tagsToInsert = post.tags.map((tag: string) => ({
          post_id: postData.id,
          tag
        }));
        await supabase.from('post_tags').insert(tagsToInsert);
      }

      // 4. Handle mentions
      if (post.mentions && post.mentions.length > 0) {
        const mentionsToInsert = post.mentions.map((m: any) => ({
          post_id: postData.id,
          mentioned_user_id: m.userId
        }));
        await supabase.from('post_mentions').insert(mentionsToInsert);
      }

      // Refresh feed
      get().fetchPosts();
      
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
    const userId = auth.currentUser?.uid;
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles(*),
          media:post_media(*),
          tags:post_tags(tag),
          mentions:post_mentions(mentioned_user_id),
          likes:post_likes(user_id),
          saves:saved_posts(user_id),
          comment_count:comments(count)
        `)
        .order('created_at', { ascending: false });

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
        likes: p.likes?.length || 0,
        comments: p.comment_count?.[0]?.count || 0,
        saves: p.saves?.length || 0,
        isLiked: p.likes?.some((l: any) => l.user_id === userId),
        isSaved: p.saves?.some((s: any) => s.user_id === userId),
        type: p.type,
        visibility: p.visibility,
        media: p.media?.map((m: any) => ({ id: m.id, url: m.media_url, type: m.media_type })),
        tags: p.tags?.map((t: any) => t.tag)
      }));

      const state = get();
      let finalPosts = formattedPosts;

      if (tab === 'following') {
        finalPosts = formattedPosts.filter(p => state.followingIds.includes(p.userId));
      } else if (tab === 'recommended' || !tab) {
        finalPosts = rankPosts(formattedPosts, {
          userId: userId || null,
          followingIds: state.followingIds,
          circleIds: state.userCircles,
          userInterests: state.userInterests
        });
      }
      // 'latest' is already sorted by created_at in the query

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

    const userId = auth.currentUser?.uid;
    if (!userId) {
       set({ _isFetchingUser: null } as any);
       return;
    }

    try {
      // 1. Setup real-time listener for User Profile
      const userRef = doc(db, 'users', userId);
      onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const profile = snapshot.data();
          set((state) => ({
            user: { ...state.user, ...profile },
            vitals: profile.vitals || state.vitals,
            hasCompletedOnboarding: profile.hasCompletedOnboarding ?? state.hasCompletedOnboarding
          }));
        }
      }, (error) => handleFirestoreError(error, OperationType.GET, `users/${userId}`));

      // 2. Setup Visions listener
      const visionsQuery = query(collection(db, 'visions'), where('userId', '==', userId));
      onSnapshot(visionsQuery, (snapshot) => {
        const visionsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Vision));
        set({ visions: visionsData });
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'visions'));

      // 3. Setup Circle listener
      const circleQuery = query(collection(db, 'users'), limit(15));
      onSnapshot(circleQuery, (snapshot) => {
        const circleData = snapshot.docs
          .filter(d => d.id !== userId)
          .map(d => {
            const data = d.data();
            return {
               id: d.id,
               name: data.name || data.username || data.email?.split('@')[0] || 'Explorer',
               avatar: data.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${d.id}`,
               count: data.xp || 0,
               isGrinding: data.isGrinding || false,
               streak: data.streak || 0,
               role: data.role || 'Explorer',
               statusNote: data.statusNote || ''
            };
          });
        set({ circle: circleData as CircleMember[] });
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

      // 4. Setup Activities listener
      const activitiesQuery = query(
        collection(db, 'activities'), 
        where('userId', '==', userId), 
        orderBy('timestamp', 'desc'), 
        limit(20)
      );
      onSnapshot(activitiesQuery, (snapshot) => {
        const activitiesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity));
        set({ activities: activitiesData });
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'activities'));

      // 5. Setup Notifications Real-time (via Supabase)
      if (isSupabaseConfigured) {
        get().fetchNotifications(); // Initial fetch

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
      }

      // 5. Setup Journal Entry listener
      const journalQuery = query(collection(db, 'journal'), where('userId', '==', userId));
      onSnapshot(journalQuery, (snapshot) => {
        const dateNotesObj: Record<string, string> = {};
        snapshot.docs.forEach(d => {
          const data = d.data();
          dateNotesObj[data.date] = data.note;
        });
        set({ dateNotes: dateNotesObj });
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'journal'));

      // 6. Setup Notes & Folders listener
      const notesQuery = query(collection(db, 'notes'), where('userId', '==', userId));
      onSnapshot(notesQuery, (snapshot) => {
        const notesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
        set({ notes: notesData });
      });

      // 7. Supabase Real-time Sync for Social
      const syncSocial = async () => {
        // Fetch Follows
        const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
        if (follows) set({ followingIds: follows.map(f => f.following_id) });

        // Fetch Circles
        const { data: circles } = await supabase.from('user_circles').select('circle_user_id, relation_type').eq('user_id', userId);
        if (circles) {
          const circleMap = circles.reduce((acc: any, c: any) => {
            acc[c.circle_user_id] = c.relation_type;
            return acc;
          }, {});
          set({ userCircles: circleMap });
        }

        // Fetch Interests
        const { data: interests } = await supabase.from('user_interests').select('tag, weight').eq('user_id', userId);
        if (interests) {
          const interestMap = interests.reduce((acc: any, i: any) => {
            acc[i.tag] = i.weight;
            return acc;
          }, {});
          set({ userInterests: interestMap });
        }
      };
      syncSocial();

      const foldersQuery = query(collection(db, 'folders'), where('userId', '==', userId));
      onSnapshot(foldersQuery, (snapshot) => {
        const foldersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
        set({ folders: foldersData });
      });

      // 7. Todos listener
      const todosQuery = query(collection(db, 'todos'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
      onSnapshot(todosQuery, (snapshot) => {
        const todosData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
        set({ todos: todosData });
      });

    } catch (err) {
      console.error('Failed to initialize Firestore listeners:', err);
    } finally {
      set({ _isFetchingUser: null } as any);
    }
  },
}));
