/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
  subTasks?: Task[];
}

export interface VisionElement {
  id: string;
  type: 'image' | 'text' | 'link' | 'emoji' | 'note' | 'quote' | 'shape' | 'connector' | 'sticky' | 'section' | 'heading';
  content: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  scale?: number;
  rotation?: number;
  zIndex?: number;
  metadata?: {
    title?: string;
    description?: string;
    source?: string;
    noteId?: string;
    color?: string;
    author?: string;
    shapeType?: 'rectangle' | 'circle' | 'diamond' | 'arrow' | 'line';
    fromElementId?: string;
    toElementId?: string;
    label?: string;
    checklist?: { id: string, text: string, completed: boolean }[];
    url?: string;
    favicon?: string;
  };
}

export interface Vision {
  id: string;
  title: string;
  description: string;
  progress: number;
  status: 'idea' | 'planning' | 'in-progress' | 'completed';
  tasks: Task[];
  notes: string;
  proof: string[];
  tags: string[];
  color?: string;
  createdAt: number;
  elements?: VisionElement[];
  collaborators?: {
    id: string;
    name: string;
    avatar: string;
    role: 'owner' | 'editor' | 'commenter' | 'viewer';
    online?: boolean;
    cursor?: { x: number, y: number };
  }[];
  isPublished?: boolean;
  publishSettings?: {
    visibility: 'private' | 'friends' | 'public';
    allowComments: boolean;
    allowRemix: boolean;
    showInFeed?: boolean;
  };
}

export interface Activity {
  id: string;
  userId: string;
  type: 'created' | 'updated' | 'completed' | 'unlocked' | 'shared_note' | 'social';
  visionId?: string;
  noteId?: string;
  timestamp: number;
  description: string;
}

export interface FutureDrop {
  id: string;
  title: string;
  content: string;
  unlockDate: number;
  isUnlocked: boolean;
}

export interface Folder {
  id: string;
  name: string;
  color?: string;
  parentId: string | null;
  expanded?: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  tags: string[];
  linkedVisionId: string | null;
  visibility: 'private' | 'connections' | 'public';
  createdAt: number;
  updatedAt: number;
}

export interface Vitals {
  focus: number;
  energy: number;
  mood: number;
  sleep: number;
}

export interface FocusPreset {
  id: string;
  label: string;
  duration: number; // in minutes
  type: 'work' | 'rest' | 'custom';
}

export interface CircleMember {
  id: string;
  name: string;
  avatar: string;
  count: number; // sessions completed today
  isGrinding: boolean;
  streak: number;
  statusNote?: string;
  role?: string;
}

export interface FocusSession {
  isActive: boolean;
  isRunning: boolean;
  timeLeft: number;
  totalTime: number;
  label?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

export interface AppState {
  user: {
    name: string;
    email: string;
    avatar?: string;
    username?: string;
    gender?: 'male' | 'female' | 'custom';
    bio?: string;
    tags?: string[];
    role?: string;
    rank: string;
    level: number;
    xp: number;
    streak: number;
    dailyIntention?: string;
    isGrinding: boolean;
    statusNote?: string;
  };
  visions: Vision[];
  sharedVisions: Vision[];
  activities: Activity[];
  circle: CircleMember[];
  vitals: Vitals;
  folders: Folder[];
  notes: Note[];
  todos: Task[];
  focusPresets: FocusPreset[];
  dateNotes: Record<string, string>;
  posts: Post[];
  userInterests: Record<string, number>;
  userCircles: Record<string, 'friend' | 'close_friend' | 'collaborator'>;
  followingIds: string[];
  notifications: any[];
  unreadNotificationCount: number;
  trackInteraction: (postId: string, type: 'view' | 'like' | 'comment' | 'save' | 'follow') => Promise<void>;
  updateUserInterests: (interests: string[]) => Promise<void>;
  addToCircle: (targetUserId: string, type: 'friend' | 'close_friend' | 'collaborator') => Promise<void>;
  removeFromCircle: (targetUserId: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  hasCompletedOnboarding: boolean;
  tutorialCompleted: boolean;
  isFocusMode: boolean;
  focusSession: FocusSession;
  toasts: ToastMessage[];
  theme: 'light' | 'dark' | 'pastel' | 'green' | 'yellow';
  selectedProfileId: string | null;
  setSelectedProfileId: (id: string | null) => void;
  updateUser: (updates: Partial<AppState['user']>) => void;
  toggleGrinding: () => void;
  updateCircleMember: (id: string, updates: Partial<CircleMember>) => void;
  addVision: (vision: Partial<Vision>) => Promise<Vision>;
  updateVision: (id: string, updates: Partial<Vision>) => void;
  deleteVision: (id: string) => void;
  moveVision: (id: string, newStatus: Vision['status']) => void;
  reorderVisions: (visions: Vision[]) => void;
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp' | 'userId'> & { userId?: string }) => void;
  setTheme: (theme: 'light' | 'dark' | 'pastel' | 'green' | 'yellow') => void;
  completeTutorial: () => void;
  restartTutorial: () => void;
  updateVitals: (vitals: Partial<Vitals>) => void;
  addXp: (amount: number) => void;
  toggleFocusMode: () => void;
  toggleFocusSession: () => void;
  startFocusSession: (duration: number, label?: string) => void;
  updateFocusTime: (timeLeft: number) => void;
  endFocusSession: () => void;
  setDateNote: (date: string, note: string) => void;
  addFocusPreset: (preset: Omit<FocusPreset, 'id'>) => void;
  deleteFocusPreset: (id: string) => void;
  addFolder: (folder: Partial<Folder>) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;
  addNote: (note: Partial<Note>) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  addPost: (post: any) => Promise<void>;
  toggleLikePost: (id: string) => Promise<void>;
  toggleSavePost: (id: string) => Promise<void>;
  fetchPosts: (tab?: 'recommended' | 'following' | 'latest') => Promise<void>;
  addComment: (postId: string, content: string, parentId?: string) => Promise<any>;
  toggleFollow: (followingId: string) => Promise<void>;
  achievements: Achievement[];
  milestones: Milestone[];
  shareVision: (visionId: string, receiverEmail: string) => Promise<void>;
  toggleVisionTask: (visionId: string, taskId: string) => void;
  acceptVision: (visionId: string) => Promise<void>;
  fetchUser: (email: string) => Promise<void>;
  completeOnboarding: (data: { name: string, email: string, interests: string[], intent: string, commitment: string, username?: string, gender?: 'male' | 'female' | 'custom', bio?: string, tags?: string[], avatar?: string, role?: string, password?: string }) => void;
  session: any | null;
  setSession: (session: any | null) => void;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

export interface Post {
  id: string;
  userId: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    handle: string;
  };
  caption?: string;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  saves: number;
  isSaved?: boolean;
  isLiked?: boolean;
  type: 'sprint' | 'insight' | 'milestone' | 'update' | 'achievement';
  visibility: 'public' | 'private' | 'friends';
  media?: {
    id: string;
    url: string;
    type: 'image' | 'video';
  }[];
  tags?: string[];
  mentions?: {
    userId: string;
    username: string;
  }[];
  stats?: {
    focusTime?: number;
    sessions?: number;
  };
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  author: {
    name: string;
    avatar: string;
    handle: string;
  };
  content: string;
  timestamp: string;
  replies?: Comment[];
}

export interface Achievement {
  id: string;
  userId: string;
  title: string;
  description: string;
  imageUrl?: string;
  achievedAt: number;
}

export interface Milestone {
  id: string;
  userId: string;
  title: string;
  description: string;
  targetDate?: string;
  completedAt?: number;
  progress: number;
}

export interface VisionShare {
  id: string;
  visionId: string;
  senderEmail: string;
  receiverEmail: string;
  status: 'pending' | 'accepted';
}
