/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Task {
  id: string;
  text: string;
  description?: string;
  completed: boolean;
  status?: 'planned' | 'today' | 'in_progress' | 'proof_needed' | 'done';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string | null;
  progressPercent?: number;
  tags?: string[];
  checklist?: { id: string; text: string; completed: boolean }[];
  sortOrder?: number;
  visibility?: 'private' | 'circle' | 'public';
  subTasks?: Task[];
  completedAt?: string | null;
  xpAwarded?: boolean;
  xpAwardedAt?: string | null;
  deletedAt?: string | null;
  scheduledDate?: string | null;
}

export interface VisionElement {
  id: string;
  type: 'image' | 'text' | 'link' | 'emoji' | 'note' | 'quote' | 'shape' | 'connector' | 'sticky' | 'drawing' | 'section' | 'heading' | 'checklist' | 'task' | 'flowchartNode';
  content: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  scale?: number;
  rotation?: number;
  zIndex?: number;
  createdAt?: number;
  updatedAt?: number;
  metadata?: {
    title?: string;
    description?: string;
    source?: string;
    noteId?: string;
    taskId?: string;
    visionId?: string;
    color?: string;
    author?: string;
    shapeType?: 'rectangle' | 'circle' | 'diamond' | 'arrow' | 'line';
    fromElementId?: string;
    toElementId?: string;
    label?: string;
    checklist?: { id: string, text: string, completed: boolean }[];
    url?: string;
    favicon?: string;
    image?: string;
    provider?: string;
    previewStatus?: 'ready' | 'fallback' | 'unavailable';
    fontSize?: string;
    fontFamily?: string;
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right';
    strokeColor?: string;
    fillColor?: string;
    borderStyle?: string;
    arrowType?: string;
    imageUrl?: string;
    storagePath?: string;
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
  category?: string;
  visibility?: 'private' | 'circle' | 'public';
  deadline?: string | null;
  createdAt: number;
  updatedAt?: number;
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
    visibility: 'private' | 'circle' | 'public';
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
  note_type: 'normal' | 'audio' | 'journal';
  icon?: string;
  folderId: string | null;
  tags: string[];
  linkedVisionId: string | null;
  visibility: 'private' | 'circle' | 'public';
  mood?: string;
  isPinned?: boolean;
  isFavorite?: boolean;
  isDeleted?: boolean;
  journal_date?: string; // yyyy-MM-dd
  location?: string;
  image_url?: string;
  journal_canvas?: JournalCanvasElement[];
  audio_url?: string;
  audio_path?: string;
  audio_duration?: number;
  audio_mime_type?: string;
  transcript?: string;
  transcript_status?: 'none' | 'pending' | 'completed' | 'failed';
  transcribed_at?: string | null;
  createdAt: number;
  updatedAt: number;
}

export type NovaCapsuleStatus = 'draft' | 'locked' | 'unlocked' | 'opened';
export type NovaCapsuleItemType = 'note' | 'journal' | 'task' | 'vision' | 'milestone' | 'achievement' | 'image' | 'file' | 'text';

export interface NovaCapsuleItem {
  id: string;
  capsuleId: string;
  userId: string;
  itemType: NovaCapsuleItemType;
  sourceId?: string | null;
  title?: string | null;
  content?: string | null;
  mediaUrl?: string | null;
  storagePath?: string | null;
  metadata?: Record<string, any>;
  createdAt: number;
}

export interface NovaCapsule {
  id: string;
  userId: string;
  title: string;
  message?: string | null;
  status: NovaCapsuleStatus;
  unlockAt: string;
  notify: boolean;
  openedAt?: string | null;
  createdAt: number;
  updatedAt: number;
  items: NovaCapsuleItem[];
}

export type FinanceTransactionType = 'income' | 'expense' | 'transfer' | 'saving';
export type FinanceGoalStatus = 'active' | 'completed' | 'paused' | 'archived';
export type FinanceGoalPriority = 'low' | 'medium' | 'high';
export type FinanceBillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD' | 'SGD' | 'AED';

export interface FinanceTransaction {
  id: string;
  userId: string;
  type: FinanceTransactionType;
  amount: number;
  currency: CurrencyCode;
  category?: string | null;
  title: string;
  note?: string | null;
  transactionDate: string;
  paymentMethod?: string | null;
  linkedVisionId?: string | null;
  linkedGoalId?: string | null;
  receiptUrl?: string | null;
  receiptPath?: string | null;
  isRecurring?: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt?: string | null;
}

export interface FinanceGoal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  currency: CurrencyCode;
  deadline?: string | null;
  linkedVisionId?: string | null;
  priority: FinanceGoalPriority;
  status: FinanceGoalStatus;
  createdAt: number;
  updatedAt: number;
}

export interface FinanceBudget {
  id: string;
  userId: string;
  month: number;
  year: number;
  category: string;
  limitAmount: number;
  spentAmount: number;
  currency: CurrencyCode;
  createdAt: number;
  updatedAt: number;
}

export interface FinanceSubscription {
  id: string;
  userId: string;
  name: string;
  amount: number;
  currency: CurrencyCode;
  billingCycle: FinanceBillingCycle;
  nextBillingDate?: string | null;
  category?: string | null;
  linkedVisionId?: string | null;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface FinanceReview {
  id: string;
  userId: string;
  periodType: 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;
  incomeTotal: number;
  expenseTotal: number;
  savingsTotal: number;
  reflection?: string | null;
  improvement?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface MoneyOverview {
  monthIncome: number;
  monthExpenses: number;
  monthSavings: number;
  budgetLeft: number;
  currencyBreakdown?: Partial<Record<CurrencyCode, {
    income: number;
    expenses: number;
    savings: number;
    budgetLeft: number;
  }>>;
  topSpendingCategory: string | null;
  activeGoals: number;
  upcomingSubscriptions: FinanceSubscription[];
  topGoal: FinanceGoal | null;
}

export type StoreProductType =
  | 'physical_product'
  | 'digital_template'
  | 'course'
  | 'book'
  | 'software'
  | 'creator_tool'
  | 'study_resource'
  | 'startup_tool'
  | 'productivity_kit';

export type StoreFulfillmentType =
  | 'affiliate_external'
  | 'digital_external'
  | 'digital_internal_future'
  | 'dropship_future'
  | 'manual_partner_future';

export interface StoreProduct {
  id: string;
  title: string;
  description?: string;
  shortDescription?: string;
  imageUrl?: string;
  galleryUrls: string[];
  price?: number | null;
  compareAtPrice?: number | null;
  currency: CurrencyCode;
  partnerName?: string;
  partnerUrl?: string;
  affiliateUrl?: string;
  externalCheckoutUrl?: string;
  digitalDeliveryUrl?: string;
  productType: StoreProductType;
  fulfillmentType: StoreFulfillmentType;
  category?: string;
  tags: string[];
  visionCategories: string[];
  stockStatus?: string;
  minBudget?: number | null;
  maxBudget?: number | null;
  isDigital: boolean;
  recommendationPriority?: number;
  recommendationReason?: string;
  score?: number;
}

export type EcosystemVisibility = 'private' | 'circle' | 'public';

export type ProgressLogType =
  | 'progress'
  | 'milestone'
  | 'lesson'
  | 'build_update'
  | 'reflection'
  | 'help_request'
  | 'win'
  | 'blocker';

export interface ProgressLog {
  id: string;
  userId: string;
  visionId: string | null;
  taskId?: string | null;
  postId?: string | null;
  logType: ProgressLogType;
  content: string;
  visibility: EcosystemVisibility;
  attachments: any[];
  linkedItems: Record<string, any>;
  metadata: Record<string, any>;
  timeSpentMinutes?: number | null;
  blocker?: string | null;
  lesson?: string | null;
  createdAt: number;
  updatedAt: number;
}

export type AccountabilityVisibility = 'private' | 'circle' | 'public';
export type WeeklyProofSprintStatus = 'active' | 'completed' | 'almost_there' | 'missed' | 'restarted';
export type NudgeType = 'encouragement' | 'ask_update' | 'sprint_reminder' | 'offer_help' | 'celebrate_progress';

export interface AccountabilityPreferences {
  userId: string;
  showInCircleMomentum: boolean;
  momentumVisibility: 'circle' | 'public' | 'hidden';
  momentumDetailLevel: 'score_only' | 'counts';
  allowNudges: boolean;
  allowProofRequests: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WeeklyProofSprint {
  id: string;
  userId: string;
  linkedVisionId?: string | null;
  targetLogs: number;
  targetTasks: number;
  visibility: AccountabilityVisibility;
  weekStart: string;
  weekEnd: string;
  currentLogs: number;
  currentTasks: number;
  status: WeeklyProofSprintStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AccountabilityNudge {
  id: string;
  fromUserId: string;
  toUserId: string;
  nudgeType: NudgeType;
  message?: string | null;
  linkedVisionId?: string | null;
  linkedTaskId?: string | null;
  createdAt: string;
  readAt?: string | null;
  dismissedAt?: string | null;
}

export interface GrowthTimelineEvent {
  id: string;
  userId: string;
  visionId: string | null;
  taskId?: string | null;
  progressLogId?: string | null;
  sourceTable?: string | null;
  sourceId?: string | null;
  eventType: string;
  title: string;
  summary?: string | null;
  visibility: EcosystemVisibility;
  metadata: Record<string, any>;
  createdAt: number;
}

export interface AIInsight {
  id: string;
  userId: string;
  visionId: string | null;
  taskId?: string | null;
  type: string;
  title: string;
  content: string;
  actionSuggestions: any[];
  visibility: EcosystemVisibility;
  metadata: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface Vitals {
  focus: number;
  energy: number;
  mood: number;
  sleep: number;
}

export interface JournalEntry {
  id: string;
  userId: string;
  date: string; // yyyy-MM-dd
  note: string;
  visionIds: string[];
  mood?: string;
  createdAt: number;
  updatedAt: number;
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
  username?: string;
  verified?: boolean;
  relation?: 'following' | 'follower' | 'mutual' | 'friend' | 'close_friend' | 'collaborator';
}

export interface FocusSession {
  isActive: boolean;
  isRunning: boolean;
  timeLeft: number;
  totalTime: number;
  label?: string;
}

export interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  streakStartDate: string | null;
  activityDates: string[];
}

export type DailyActivitySource = 'task' | 'todo' | 'post' | 'note' | 'journal' | 'vision' | 'focus';

export interface DailyActivitySummary {
  date: string;
  taskCount: number;
  todoCount: number;
  postCount: number;
  noteCount: number;
  journalCount: number;
  visionCount: number;
  focusCount: number;
  totalCount: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

export interface AppState {
  authUser: any | null;
  profile: any | null;
  user: {
    id?: string;
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
    mainGoal?: string;
    interests?: string[];
    verified?: boolean;
    defaultCurrency?: CurrencyCode;
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
  journalEntries: JournalEntry[];
  posts: Post[];
  progressLogs: ProgressLog[];
  weeklyProofSprint: WeeklyProofSprint | null;
  accountabilityPreferences: AccountabilityPreferences | null;
  nudges: AccountabilityNudge[];
  growthTimelineEvents: GrowthTimelineEvent[];
  aiInsights: AIInsight[];
  userInterests: Record<string, number>;
  userCircles: Record<string, 'friend' | 'close_friend' | 'collaborator'>;
  followingIds: string[];
  followerCounts: Record<string, number>;
  followingCounts: Record<string, number>;
  userStreak: UserStreak | null;
  weeklyActivity: DailyActivitySummary[];
  financeTransactions: FinanceTransaction[];
  financeGoals: FinanceGoal[];
  financeBudgets: FinanceBudget[];
  financeSubscriptions: FinanceSubscription[];
  financeReviews: FinanceReview[];
  moneyOverview: MoneyOverview | null;
  isMoneyLoading: boolean;
  isVisionsLoading: boolean;
  notifications: any[];
  unreadNotificationCount: number;
  authLoading: boolean;
  profileLoading: boolean;
  isProfileReady: boolean;
  initializeAuth: () => Promise<void>;
  trackInteraction: (postId: string, type: 'view' | 'like' | 'comment' | 'save' | 'follow') => Promise<void>;
  updateUserInterests: (interests: string[]) => Promise<void>;
  addToCircle: (targetUserId: string, type: 'friend' | 'close_friend' | 'collaborator') => Promise<void>;
  removeFromCircle: (targetUserId: string) => Promise<void>;
  fetchCircleData: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  fetchUserStreak: () => Promise<void>;
  fetchWeeklyActivity: () => Promise<void>;
  recordDailyActivity: (source: DailyActivitySource) => Promise<void>;
  hasCompletedOnboarding: boolean;
  tutorialCompleted: boolean;
  isDashboardLoading: boolean;
  isAuthInitialized: boolean;
  selectedProfileId: string | null;
  fetchDashboardData: () => Promise<void>;
  fetchProgressLogs: (visionId?: string) => Promise<void>;
  createProgressLog: (log: Partial<ProgressLog> & { content: string }) => Promise<ProgressLog | false>;
  fetchAccountabilityPreferences: () => Promise<void>;
  updateAccountabilityPreferences: (updates: Partial<AccountabilityPreferences>) => Promise<boolean>;
  fetchWeeklyProofSprint: () => Promise<WeeklyProofSprint | null>;
  createWeeklyProofSprint: (input?: Partial<WeeklyProofSprint>) => Promise<WeeklyProofSprint | false>;
  refreshWeeklyProofSprintProgress: () => Promise<WeeklyProofSprint | null>;
  fetchNudges: () => Promise<void>;
  sendNudge: (toUserId: string, type?: NudgeType, message?: string) => Promise<boolean>;
  dismissNudge: (id: string) => Promise<boolean>;
  fetchGrowthTimeline: (visionId?: string) => Promise<void>;
  fetchAIInsights: (visionId?: string) => Promise<void>;
  fetchMoneyOverview: () => Promise<void>;
  fetchFinanceTransactions: () => Promise<void>;
  createFinanceTransaction: (transaction: Partial<FinanceTransaction> & Record<string, any>) => Promise<FinanceTransaction | false>;
  updateFinanceTransaction: (id: string, updates: Partial<FinanceTransaction> & Record<string, any>) => Promise<boolean>;
  deleteFinanceTransaction: (id: string) => Promise<boolean>;
  fetchFinanceGoals: () => Promise<void>;
  createFinanceGoal: (goal: Partial<FinanceGoal> & Record<string, any>) => Promise<FinanceGoal | false>;
  updateFinanceGoal: (id: string, updates: Partial<FinanceGoal> & Record<string, any>) => Promise<boolean>;
  deleteFinanceGoal: (id: string) => Promise<boolean>;
  contributeToFinanceGoal: (goalId: string, amount: number, title?: string) => Promise<boolean>;
  fetchFinanceBudgets: () => Promise<void>;
  createFinanceBudget: (budget: Partial<FinanceBudget> & Record<string, any>) => Promise<FinanceBudget | false>;
  updateFinanceBudget: (id: string, updates: Partial<FinanceBudget> & Record<string, any>) => Promise<boolean>;
  deleteFinanceBudget: (id: string) => Promise<boolean>;
  fetchFinanceSubscriptions: () => Promise<void>;
  createFinanceSubscription: (subscription: Partial<FinanceSubscription> & Record<string, any>) => Promise<FinanceSubscription | false>;
  updateFinanceSubscription: (id: string, updates: Partial<FinanceSubscription> & Record<string, any>) => Promise<boolean>;
  deleteFinanceSubscription: (id: string) => Promise<boolean>;
  fetchFinanceReviews: () => Promise<void>;
  createFinanceReview: (review: Partial<FinanceReview> & Record<string, any>) => Promise<FinanceReview | false>;
  fetchVisionFinanceSummary: (visionId: string) => Promise<{ goals: FinanceGoal[]; transactions: FinanceTransaction[]; saved: number; expenses: number; target: number }>;
  fetchVisions: () => Promise<void>;
  fetchTodos: () => Promise<void>;
  loadUserProfile: (userId: string) => Promise<void>;
  setSelectedProfileId: (id: string | null) => void;
  setSession: (session: any | null) => void;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  updateUser: (updates: Partial<AppState['user']>) => Promise<boolean>;
  toggleGrinding: () => void;
  updateCircleMember: (id: string, updates: Partial<CircleMember>) => void;
  addVision: (vision: Partial<Vision>) => Promise<Vision>;
  updateVision: (id: string, updates: Partial<Vision>) => Promise<boolean>;
  deleteVision: (id: string) => void;
  moveVision: (id: string, newStatus: Vision['status']) => void;
  reorderVisions: (visions: Vision[]) => void;
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp' | 'userId'> & { userId?: string }) => void;
  setTheme: (theme: 'light' | 'dark' | 'midnight' | 'graphite' | 'forest-dark' | 'plum-dark' | 'flare' | 'pastel' | 'green' | 'yellow' | 'sage' | 'ember') => void;
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
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => Promise<void>;
  deleteJournalEntry: (id: string) => Promise<void>;
  fetchJournalEntries: () => Promise<void>;
  fetchFolders: () => Promise<void>;
  fetchNotes: () => Promise<void>;
  addFocusPreset: (preset: Omit<FocusPreset, 'id'>) => void;
  deleteFocusPreset: (id: string) => void;
  addFolder: (folder: Partial<Folder>) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;
  addNote: (note: Partial<Note>) => Promise<Note | false>;
  updateNote: (id: string, updates: Partial<Note>) => void;
  moveNoteToFolder: (noteId: string, folderId: string | null) => Promise<boolean>;
  deleteNote: (id: string) => void;
  addTodo: (text: string, scheduledDate?: string | null) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  addPost: (post: any) => Promise<boolean>;
  updatePost: (id: string, updates: Partial<Post>) => Promise<boolean>;
  archivePost: (id: string) => Promise<boolean>;
  restorePost: (id: string) => Promise<boolean>;
  fetchArchivedPosts: () => Promise<Post[]>;
  deletePost: (id: string) => Promise<boolean>;
  reportPost: (id: string, reason: string, details?: string) => Promise<boolean>;
  deleteComment: (id: string) => Promise<boolean>;
  reportComment: (id: string, reason: string, details?: string) => Promise<boolean>;
  reportUser: (id: string, reason: string, details?: string) => Promise<boolean>;
  muteUserPosts: (userId: string) => Promise<boolean>;
  toggleLikePost: (id: string) => Promise<void>;
  toggleSavePost: (id: string) => Promise<void>;
  fetchPosts: (tab?: 'recommended' | 'following' | 'latest' | 'saved') => Promise<void>;
  fetchFeedContext: () => Promise<void>;
  fetchProfileStats: (profileId: string) => Promise<{ followersCount: number; followingCount: number; isFollowing: boolean }>;
  ensureCurrentUserProfile: () => Promise<any>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateOnboardingStep: (step: number) => Promise<void>;
  addComment: (postId: string, content: string, parentId?: string) => Promise<any>;
  toggleFollow: (followingId: string) => Promise<boolean | null>;
  achievements: Achievement[];
  milestones: Milestone[];
  shareVision: (visionId: string, receiverEmail: string) => Promise<void>;
  toggleVisionTask: (visionId: string, taskId: string) => void;
  addVisionTask: (visionId: string, task: Partial<Task> & { text: string }) => Promise<Task | false>;
  updateVisionTask: (visionId: string, taskId: string, updates: Partial<Task>) => Promise<boolean>;
  deleteVisionTask: (visionId: string, taskId: string) => Promise<boolean>;
  acceptVision: (visionId: string) => Promise<void>;
  fetchUser: () => Promise<void>;
  completeOnboarding: (data: { name: string, email: string, interests: string[], intent: string, commitment: string, username?: string, gender?: 'male' | 'female' | 'custom', bio?: string, tags?: string[], avatar?: string, role?: string, password?: string, hasInitialVision?: boolean }) => Promise<void>;
  session: any | null;
  isFocusMode: boolean;
  focusSession: FocusSession;
  toasts: ToastMessage[];
  theme: 'light' | 'dark' | 'midnight' | 'graphite' | 'forest-dark' | 'plum-dark' | 'flare' | 'pastel' | 'green' | 'yellow' | 'sage' | 'ember';
}

export interface Post {
  id: string;
  userId: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    handle: string;
    verified?: boolean;
  };
  caption?: string;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  saves: number;
  isSaved?: boolean;
  isLiked?: boolean;
  type: 'sprint' | 'insight' | 'milestone' | 'update' | 'achievement' | 'status' | 'help_request';
  visibility: 'public' | 'private' | 'circle';
  visionId?: string | null;
  taskId?: string | null;
  progressLogId?: string | null;
  proofSummary?: string | null;
  archived?: boolean;
  archivedAt?: string | null;
  deletedAt?: string | null;
  editedAt?: string | null;
  createdAt?: number;
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
  metadata?: any;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  author: {
    name: string;
    avatar: string;
    handle: string;
    verified?: boolean;
  };
  content: string;
  timestamp: string;
  parentCommentId?: string | null;
  deletedAt?: string | null;
  likes?: number;
  isLiked?: boolean;
  isPinned?: boolean;
  pinnedAt?: string | null;
  pinnedBy?: string | null;
  tags?: string[];
  mentions?: {
    userId: string;
    username: string;
  }[];
  replies?: Comment[];
}

export interface JournalCanvasElement {
  id: string;
  type: 'image' | 'sticky' | 'text' | 'promptCard' | 'checklist' | 'visionLink';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  content: string;
  zIndex?: number;
  metadata?: {
    imageUrl?: string;
    storagePath?: string;
    caption?: string;
    color?: string;
    prompt?: string;
    response?: string;
    visionId?: string;
    visionTitle?: string;
    progress?: number;
    items?: { id: string; text: string; completed: boolean }[];
  };
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
