import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Archive,
  BookOpen,
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  Filter,
  GraduationCap,
  Layers,
  Loader2,
  Maximize2,
  Minimize2,
  NotebookPen,
  PlayCircle,
  Plus,
  Search,
  Send,
  Target,
  Trash2,
  X,
  Youtube,
  type LucideIcon
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { checkClientRateLimit, sanitizePlainText, sanitizeText, validateYouTubeUrl } from '../../lib/security';
import { SelectMenu } from '../ui/SelectMenu';
import { formatCurrency } from '../../lib/currency';
import { ProgressPulsePage } from '../Growth/ProgressPulsePage';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { betaFlags } from '../../lib/betaFlags';

type GrowthStatus = 'saved' | 'learning' | 'completed' | 'applied' | 'archived';
type SourceType = 'youtube' | 'article' | 'course' | 'book' | 'podcast' | 'pdf' | 'website' | 'other';
type GrowthTab = 'library' | 'active' | 'applied' | 'paths' | 'skills';
type GrowthSection = 'resources' | 'tracker';

const growthTabs: { id: GrowthTab; label: string }[] = [
  { id: 'library', label: 'Learning Library' },
  { id: 'active', label: 'Active Learning' },
  { id: 'applied', label: 'Applied' },
  { id: 'paths', label: 'Learning Paths' },
  { id: 'skills', label: 'Skills' }
];

type GrowthResource = {
  id: string;
  user_id: string;
  title: string;
  url?: string | null;
  video_id?: string | null;
  source_type: SourceType;
  source_name?: string | null;
  thumbnail_url?: string | null;
  category?: string | null;
  status: GrowthStatus;
  purpose?: string | null;
  linked_vision_id?: string | null;
  notes?: string | null;
  key_takeaways: string[];
  action_points: string[];
  tags: string[];
  applied_note?: string | null;
  linked_task_id?: string | null;
  watch_progress?: number | null;
  last_watched_at?: string | null;
  completed_at?: string | null;
  applied_at?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
};

type ConfirmAction = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'danger' | 'warning' | 'info';
  run: () => Promise<void>;
};

type TimestampNote = {
  id: string;
  resource_id: string;
  user_id: string;
  timestamp_seconds?: number | null;
  content: string;
  created_at: string;
  updated_at: string;
};

type GrowthActionPoint = {
  id: string;
  resource_id: string;
  user_id: string;
  text: string;
  converted_task_id?: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

type ResourceForm = {
  title: string;
  url: string;
  source_type: SourceType;
  category: string;
  purpose: string;
  linked_vision_id: string;
  tags: string;
};

const sourceTypes: SourceType[] = ['youtube', 'article', 'course', 'book', 'podcast', 'pdf', 'website', 'other'];
const statuses: Array<GrowthStatus | 'all'> = ['all', 'saved', 'learning', 'completed', 'applied', 'archived'];

const emptyForm: ResourceForm = {
  title: '',
  url: '',
  source_type: 'other',
  category: '',
  purpose: '',
  linked_vision_id: '',
  tags: ''
};

const statusStyles: Record<GrowthStatus, string> = {
  saved: 'bg-surface-muted text-text-secondary border-card-border',
  learning: 'bg-accent/10 text-accent border-accent/20',
  completed: 'bg-success/10 text-success border-success/20',
  applied: 'bg-success text-white border-success',
  archived: 'bg-overlay/10 text-text-secondary/40 border-card-border'
};

const sourceIcons: Record<SourceType, LucideIcon> = {
  youtube: Youtube,
  article: FileText,
  course: GraduationCap,
  book: BookOpen,
  podcast: PlayCircle,
  pdf: FileText,
  website: ExternalLink,
  other: Layers
};

const parseLines = (value: string) => value.split('\n').map(line => sanitizeText(line, 500)).filter(Boolean).slice(0, 50);
const stringifyLines = (value?: string[] | null) => (value || []).join('\n');
const parseTags = (value: string) => value.split(',').map(tag => sanitizeText(tag, 30).replace(/^#/, '').toLowerCase().replace(/[^a-z0-9_-]/g, '')).filter(Boolean).slice(0, 20);
const formatTimestamp = (seconds?: number | null) => {
  if (seconds === null || seconds === undefined) return 'No time';
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
};

const getYouTubeVideoId = (value: string) => {
  try {
    const url = new URL(value.trim());
    if (url.hostname.includes('youtu.be')) return url.pathname.split('/').filter(Boolean)[0] || null;
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname.startsWith('/watch')) return url.searchParams.get('v');
      if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2] || null;
      if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2] || null;
    }
  } catch {
    return null;
  }
  return null;
};

export default function MindVisualizer() {
  const {
    session,
    visions,
    todos,
    journalEntries,
    progressLogs,
    growthTimelineEvents,
    weeklyActivity,
    userStreak,
    user,
    financeGoals,
    fetchDashboardData,
    fetchVisions,
    addToast,
    addNote,
    addPost
  } = useStore();
  const userId = session?.user?.id;
  const location = useLocation();
  const navigate = useNavigate();
  const [resources, setResources] = useState<GrowthResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [growthSection, setGrowthSection] = useState<GrowthSection>(
    betaFlags.growthResources && (location.state as any)?.section === 'resources' ? 'resources' : 'tracker'
  );
  const [activeTab, setActiveTab] = useState<GrowthTab>('library');
  const [statusFilter, setStatusFilter] = useState<GrowthStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceType | 'all'>('all');
  const [visionFilter, setVisionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<GrowthResource | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const [form, setForm] = useState<ResourceForm>(emptyForm);
  const [youtubeUrl, setYoutubeUrl] = useState('');

  const fetchGrowthResources = async () => {
    if (!userId) {
      setResources([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('growth_resources')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to load Growth resources:', error);
      addToast({ type: 'error', title: 'Growth failed', description: 'Could not load learning resources.' });
      setResources([]);
    } else {
      setResources((data || []) as GrowthResource[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (userId && visions.length === 0) fetchVisions();
    if (userId) fetchDashboardData().catch(error => console.error('Failed to load Growth Tracker data:', error));
    if (betaFlags.growthResources) {
      fetchGrowthResources();
    } else {
      setResources([]);
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const requestedSection = (location.state as any)?.section;
    if (requestedSection === 'resources' && betaFlags.growthResources) {
      setGrowthSection('resources');
    } else if (requestedSection === 'tracker' || (location.state as any)?.fromDashboard || !betaFlags.growthResources) {
      setGrowthSection('tracker');
    }
  }, [location.state]);

  const visionById = useMemo(() => new Map(visions.map(vision => [vision.id, vision])), [visions]);

  const resourceStats = useMemo(() => ({
    learning: resources.filter(item => item.status === 'learning').length,
    saved: resources.filter(item => item.status === 'saved').length,
    completed: resources.filter(item => item.status === 'completed').length,
    applied: resources.filter(item => item.status === 'applied').length,
    linked: resources.filter(item => !!item.linked_vision_id).length
  }), [resources]);

  const pulse = useMemo(() => {
    const now = Date.now();
    const weekStart = now - 7 * 86400000;
    const firstVision = [...visions].sort((a, b) => a.createdAt - b.createdAt)[0] || null;
    const firstLog = [...progressLogs].sort((a, b) => a.createdAt - b.createdAt)[0] || null;
    const completedTasks = visions.reduce((sum, vision) => sum + (vision.tasks || []).filter(task => task.completed).length, 0)
      + todos.filter(todo => todo.completed && !todo.deletedAt).length;
    const tasksCompletedThisWeek = visions.reduce((sum, vision) => sum + (vision.tasks || []).filter(task => task.completed && task.completedAt && new Date(task.completedAt).getTime() >= weekStart).length, 0)
      + todos.filter(todo => todo.completed && !todo.deletedAt && todo.completedAt && new Date(todo.completedAt).getTime() >= weekStart).length;
    const weeklyLogs = progressLogs.filter(log => log.createdAt >= weekStart);
    const weeklyJournals = journalEntries.filter(entry => entry.createdAt >= weekStart);
    const weeklyScore = Math.min(100, weeklyLogs.length * 18 + tasksCompletedThisWeek * 10 + weeklyJournals.length * 8 + Math.min(20, (userStreak?.currentStreak || user.streak || 0) * 3));
    const activityChart = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      const activity = weeklyActivity.find(item => item.date === key);
      return {
        day: date.toLocaleDateString([], { weekday: 'short' }),
        logs: weeklyLogs.filter(log => new Date(log.createdAt).toISOString().slice(0, 10) === key).length,
        tasks: activity ? activity.taskCount + activity.todoCount : 0,
        journal: activity?.journalCount || weeklyJournals.filter(entry => entry.date === key).length,
      };
    });
    const activitySet = new Set(userStreak?.activityDates || []);
    const heatmap = Array.from({ length: 30 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - index));
      const key = date.toISOString().slice(0, 10);
      const activity = weeklyActivity.find(item => item.date === key);
      const total = activity?.totalCount || (activitySet.has(key) ? 1 : 0);
      return { key, total, label: date.toLocaleDateString([], { month: 'short', day: 'numeric' }) };
    });
    const visionBreakdown = visions
      .filter(vision => vision.status !== 'completed')
      .map(vision => {
        const logs = progressLogs.filter(log => log.visionId === vision.id);
        const completed = (vision.tasks || []).filter(task => task.completed).length;
        const lastActivity = Math.max(vision.updatedAt || vision.createdAt, logs[0]?.createdAt || 0);
        return {
          vision,
          logs: logs.length,
          completed,
          totalTasks: (vision.tasks || []).length,
          lastActivity,
        };
      })
      .sort((a, b) => b.lastActivity - a.lastActivity)
      .slice(0, 5);
    const goals = financeGoals
      .filter(goal => goal.status !== 'archived')
      .map(goal => {
        const progress = Math.min(100, Math.round((goal.currentAmount / Math.max(1, goal.targetAmount)) * 100));
        const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
        const linkedVision = goal.linkedVisionId ? visionById.get(goal.linkedVisionId) : null;
        return { ...goal, progress, remaining, linkedVision };
      })
      .sort((a, b) => b.remaining - a.remaining)
      .slice(0, 5);
    const deadlines = visions
      .filter(vision => !!vision.deadline)
      .map(vision => {
        const progress = Math.min(100, Math.round(vision.progress || 0));
        const daysRemaining = Math.ceil((new Date(`${vision.deadline}T23:59:59`).getTime() - now) / 86400000);
        const tasksRemaining = (vision.tasks || []).filter(task => !task.completed && !task.deletedAt).length;
        const status = (progress >= 100
          ? 'completed'
          : daysRemaining < 0
            ? 'behind'
            : daysRemaining <= 7 && progress < 70
              ? 'at risk'
              : 'on track') as 'completed' | 'behind' | 'at risk' | 'on track';
        return { vision, progress, daysRemaining, tasksRemaining, status };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
    const lastProgress = progressLogs[0]?.createdAt || null;
    const daysSinceLastProgress = lastProgress ? Math.floor((now - lastProgress) / 86400000) : null;
    const activeCounts = weeklyLogs.reduce<Record<string, number>>((acc, log) => {
      if (log.visionId) acc[log.visionId] = (acc[log.visionId] || 0) + 1;
      return acc;
    }, {});
    const mostActiveVisionId = Object.entries(activeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const mostActiveVision = mostActiveVisionId ? visionById.get(mostActiveVisionId) : null;
    const updates: string[] = [];
    const topGoal = goals.find(goal => goal.remaining > 0);
    if (topGoal) updates.push(`You need ${formatCurrency(topGoal.remaining, topGoal.currency)} more to complete ${topGoal.title}.`);
    const nextDeadline = deadlines.find(item => item.status !== 'completed');
    if (nextDeadline) updates.push(`${nextDeadline.vision.title} deadline is ${nextDeadline.daysRemaining >= 0 ? `in ${nextDeadline.daysRemaining} days` : `${Math.abs(nextDeadline.daysRemaining)} days behind`}.`);
    if (daysSinceLastProgress !== null && daysSinceLastProgress >= 2) updates.push(`You have not logged progress for ${daysSinceLastProgress} days.`);
    if (mostActiveVision) updates.push(`Your most active Vision this week is ${mostActiveVision.title}.`);

    return {
      totalLogs: progressLogs.length,
      currentStreak: userStreak?.currentStreak || user.streak || 0,
      weeklyScore,
      completedTasks,
      tasksCompletedThisWeek,
      activityChart,
      heatmap,
      visionBreakdown,
      goals,
      deadlines,
      firstVision,
      firstLog,
      updates,
    };
  }, [financeGoals, journalEntries, progressLogs, todos, user.streak, userStreak, visionById, visions, weeklyActivity]);

  const visibleResources = useMemo(() => {
    return resources.filter(resource => {
      const tabMatch =
        activeTab === 'library' ||
        (activeTab === 'active' && resource.status === 'learning') ||
        (activeTab === 'applied' && resource.status === 'applied');
      if (!tabMatch) return false;
      if (statusFilter !== 'all' && resource.status !== statusFilter) return false;
      if (sourceFilter !== 'all' && resource.source_type !== sourceFilter) return false;
      if (visionFilter !== 'all' && resource.linked_vision_id !== visionFilter) return false;

      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      return [
        resource.title,
        resource.purpose,
        resource.notes,
        resource.category,
        ...(resource.tags || [])
      ].filter(Boolean).some(value => String(value).toLowerCase().includes(query));
    });
  }, [resources, activeTab, statusFilter, sourceFilter, visionFilter, searchQuery]);

  const requireUser = () => {
    if (!userId) {
      addToast({ type: 'error', title: 'Login required', description: 'Sign in to use Growth.' });
      return false;
    }
    return true;
  };

  const createGrowthResource = async (payload: Partial<GrowthResource>) => {
    if (!requireUser()) return false;
    if (!payload.title?.trim()) {
      addToast({ type: 'error', title: 'Title required', description: 'Add a resource title.' });
      return false;
    }
    const limit = checkClientRateLimit(userId!, 'growth_resource_create', 50, 24 * 60);
    if (!limit.allowed) {
      addToast({ type: 'error', title: 'Slow down', description: 'Growth resource imports are limited for closed beta.' });
      return false;
    }

    setIsSaving(true);
    const { data, error } = await supabase
      .from('growth_resources')
      .insert({
        user_id: userId,
        title: sanitizeText(payload.title, 160),
        url: payload.url && /^https:\/\//i.test(payload.url) ? payload.url : null,
        video_id: payload.video_id || null,
        source_type: payload.source_type || 'other',
        source_name: sanitizeText(payload.source_name || '', 60) || null,
        thumbnail_url: payload.thumbnail_url || null,
        category: sanitizeText(payload.category || '', 80) || null,
        status: payload.status || 'saved',
        purpose: sanitizePlainText(payload.purpose || '', 1000) || null,
        linked_vision_id: payload.linked_vision_id || null,
        tags: payload.tags || [],
        key_takeaways: [],
        action_points: []
      })
      .select('*')
      .single();
    setIsSaving(false);

    if (error) {
      console.error('Failed to create Growth resource:', error);
      addToast({ type: 'error', title: 'Resource failed', description: error.message });
      return false;
    }

    setResources(current => [data as GrowthResource, ...current]);
    addToast({ type: 'success', title: 'Resource saved', description: 'Now link it to a Vision and turn it into action.' });
    return data as GrowthResource;
  };

  const openAddResource = () => {
    setForm(emptyForm);
    setIsResourceModalOpen(true);
  };

  const submitManualResource = async () => {
    const created = await createGrowthResource({
      title: form.title,
      url: form.url || null,
      source_type: form.source_type,
      category: form.category || null,
      purpose: form.purpose || null,
      linked_vision_id: form.linked_vision_id || null,
      tags: parseTags(form.tags)
    });
    if (created) {
      setIsResourceModalOpen(false);
      setForm(emptyForm);
      setSelectedResource(created);
    }
  };

  const importYouTubeResource = async () => {
    let parsed: { url: string; videoId: string };
    try {
      parsed = validateYouTubeUrl(youtubeUrl);
    } catch {
      addToast({ type: 'error', title: 'Invalid YouTube link', description: 'Paste a valid YouTube link.' });
      return;
    }

    const created = await createGrowthResource({
      title: 'YouTube Video',
      url: parsed.url,
      video_id: parsed.videoId,
      source_type: 'youtube',
      source_name: 'YouTube',
      thumbnail_url: `https://img.youtube.com/vi/${parsed.videoId}/hqdefault.jpg`,
      status: 'saved',
      tags: []
    });

    if (created) {
      setYoutubeUrl('');
      setIsYouTubeModalOpen(false);
      setSelectedResource(created);
    }
  };

  const updateGrowthResource = async (resourceId: string, updates: Partial<GrowthResource>) => {
    if (!requireUser()) return false;
    const payload: Record<string, any> = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    if (payload.title !== undefined) payload.title = sanitizeText(payload.title, 160);
    if (payload.purpose !== undefined) payload.purpose = sanitizePlainText(payload.purpose, 1000);
    if (payload.notes !== undefined) payload.notes = sanitizePlainText(payload.notes, 20000);
    if (payload.applied_note !== undefined) payload.applied_note = sanitizePlainText(payload.applied_note, 2000);
    if (payload.category !== undefined) payload.category = sanitizeText(payload.category, 80);
    if (payload.key_takeaways !== undefined) payload.key_takeaways = Array.isArray(payload.key_takeaways) ? payload.key_takeaways.map((item: string) => sanitizeText(item, 500)).filter(Boolean).slice(0, 50) : [];
    if (payload.action_points !== undefined) payload.action_points = Array.isArray(payload.action_points) ? payload.action_points.map((item: string) => sanitizeText(item, 500)).filter(Boolean).slice(0, 50) : [];
    if (payload.tags !== undefined) payload.tags = Array.isArray(payload.tags) ? payload.tags.map((item: string) => sanitizeText(item, 30).toLowerCase().replace(/[^a-z0-9_-]/g, '')).filter(Boolean).slice(0, 20) : [];
    delete payload.id;
    delete payload.user_id;
    delete payload.created_at;

    const { data, error } = await supabase
      .from('growth_resources')
      .update(payload)
      .eq('id', resourceId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      console.error('Failed to update Growth resource:', error);
      addToast({ type: 'error', title: 'Update failed', description: error.message });
      return false;
    }

    setResources(current => current.map(item => item.id === resourceId ? data as GrowthResource : item));
    setSelectedResource(current => current?.id === resourceId ? data as GrowthResource : current);
    return data as GrowthResource;
  };

  const setResourceStatus = async (resource: GrowthResource, status: GrowthStatus, extra: Partial<GrowthResource> = {}) => {
    const now = new Date().toISOString();
    const updates: Partial<GrowthResource> = { status, ...extra };
    if (status === 'completed') updates.completed_at = now;
    if (status === 'applied') updates.applied_at = now;
    if (status === 'archived') updates.archived_at = now;
    const saved = await updateGrowthResource(resource.id, updates);
    if (saved) addToast({ type: 'success', title: 'Growth updated', description: `Resource marked ${status}.` });
  };

  const deleteGrowthResource = async (resource: GrowthResource) => {
    if (!requireUser()) return;
    setConfirmAction({
      title: 'Delete this resource?',
      description: `"${resource.title}" will be removed from Growth. Notes and tasks you already created from it will stay.`,
      confirmLabel: 'Delete',
      tone: 'danger',
      run: async () => {
        const { error } = await supabase.from('growth_resources').delete().eq('id', resource.id).eq('user_id', userId);
        if (error) {
          console.error('Failed to delete Growth resource:', error);
          addToast({ type: 'error', title: 'Delete failed', description: error.message });
          return;
        }
        setResources(current => current.filter(item => item.id !== resource.id));
        setSelectedResource(null);
      }
    });
  };

  const openResource = async (resource: GrowthResource) => {
    setSelectedResource(resource);
    if (resource.source_type === 'youtube') {
      await updateGrowthResource(resource.id, {
        status: resource.status === 'saved' ? 'learning' : resource.status,
        last_watched_at: new Date().toISOString()
      });
    }
  };

  const convertResourceToTask = async (resource: GrowthResource, taskText: string, visionId: string) => {
    if (!requireUser()) return false;
    if (!visionId) {
      addToast({ type: 'error', title: 'Vision required', description: 'Link or choose a Vision before creating a task.' });
      return false;
    }
    if (!taskText.trim()) {
      addToast({ type: 'error', title: 'Task required', description: 'Add task text first.' });
      return false;
    }

    const { data: vision, error: visionError } = await supabase
      .from('visions')
      .select('id')
      .eq('id', visionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (visionError || !vision) {
      console.error('Vision ownership check failed:', visionError);
      addToast({ type: 'error', title: 'Vision unavailable', description: 'Choose one of your own Visions.' });
      return false;
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        vision_id: visionId,
        text: sanitizeText(taskText, 500),
        completed: false,
        sub_tasks: (resource.action_points || []).map(text => ({ text, completed: false }))
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to convert Growth resource to task:', error);
      addToast({ type: 'error', title: 'Task failed', description: error.message });
      return false;
    }

    await updateGrowthResource(resource.id, { linked_task_id: task.id, linked_vision_id: visionId });
    addToast({ type: 'success', title: 'Task created', description: 'The learning resource is now tied to execution.' });
    return true;
  };

  const saveResourceAsNote = async (resource: GrowthResource) => {
    const content = [
      resource.purpose ? `Purpose:\n${resource.purpose}` : '',
      resource.notes ? `Notes:\n${resource.notes}` : '',
      resource.key_takeaways?.length ? `Key takeaways:\n${resource.key_takeaways.map(item => `- ${item}`).join('\n')}` : '',
      resource.action_points?.length ? `Action points:\n${resource.action_points.map(item => `- ${item}`).join('\n')}` : '',
      resource.url ? `Source:\n${resource.url}` : ''
    ].filter(Boolean).join('\n\n');

    const note = await addNote({
      title: `Learning: ${resource.title}`,
      content: content || resource.title,
      note_type: 'normal',
      linkedVisionId: resource.linked_vision_id || null,
      tags: ['growth', ...(resource.tags || [])]
    });

    if (note) addToast({ type: 'success', title: 'Saved as note', description: 'Learning notes were added to Library.' });
  };

  const shareInsight = async (resource: GrowthResource) => {
    if (!resource.applied_note && !resource.notes) {
      addToast({ type: 'error', title: 'Insight needed', description: 'Add an applied note or learning notes before sharing.' });
      return;
    }
    setConfirmAction({
      title: 'Share this insight?',
      description: 'This creates a public Feed post from your learning notes. Private notes stay private unless you choose to share them.',
      confirmLabel: 'Share',
      tone: 'info',
      run: async () => {
        const success = await addPost({
          type: 'insight',
          caption: `Applied learning from ${resource.title}`,
          content: resource.applied_note || resource.notes || '',
          visibility: 'public',
          tags: ['growth', ...(resource.tags || [])],
          mentions: [],
          media: [],
          metadata: {
            growth_resource_id: resource.id,
            linked_vision_id: resource.linked_vision_id || null
          }
        });

        if (success) addToast({ type: 'success', title: 'Insight shared', description: 'Your applied learning is now on Feed.' });
      }
    });
  };

  return (
    <div className="w-full max-w-[1700px] mx-auto pb-20 animate-in fade-in duration-700 space-y-6">
      {betaFlags.growthResources && (
        <section className="rounded-[2rem] border border-card-border bg-card p-3 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'tracker', label: 'Progress Pulse', desc: 'Proof, streaks, goals' },
              { id: 'resources', label: 'Resources', desc: 'Learning and saved material' },
            ] as const).map(section => (
              <button
                key={section.id}
                onClick={() => setGrowthSection(section.id)}
                className={cn(
                  'rounded-[1.25rem] px-4 py-2.5 text-left transition-all',
                  growthSection === section.id ? 'bg-accent text-accent-contrast shadow-lg shadow-accent/15' : 'bg-app-container text-text-secondary hover:text-text-main'
                )}
              >
                <span className="block text-xs font-black uppercase tracking-widest">{section.label}</span>
                <span className={cn('mt-1 block text-[10px] font-semibold', growthSection === section.id ? 'text-accent-contrast/70' : 'text-text-secondary/55')}>{section.desc}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {growthSection === 'tracker' && (
        <ProgressPulsePage
          pulse={pulse}
          visions={visions}
          progressLogs={progressLogs}
          growthTimelineEvents={growthTimelineEvents}
          onClose={() => {
            if ((location.state as any)?.fromDashboard) navigate('/');
            else if (window.history.length > 1) navigate(-1);
            else navigate('/');
          }}
        />
      )}

      {growthSection === 'resources' && (
      <>
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[9px] font-black uppercase tracking-[0.3em] text-accent">Learning to action</p>
          <h2 className="text-2xl font-black tracking-tight text-text-main sm:text-3xl">Growth Resources</h2>
          <p className="mt-2 max-w-2xl text-xs font-semibold text-text-secondary/70 sm:text-sm">Learn with purpose. Turn resources into action.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={openAddResource} className="h-12 px-5 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-accent/20">
            <Plus size={16} /> Add Resource
          </button>
          <button onClick={() => setIsYouTubeModalOpen(true)} className="h-12 px-5 rounded-2xl bg-card border border-card-border text-text-main text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <Youtube size={16} /> Import YouTube Link
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <OverviewCard label="Active Learning" value={resourceStats.learning} icon={PlayCircle} />
        <OverviewCard label="Resources Saved" value={resourceStats.saved} icon={BookOpen} />
        <OverviewCard label="Completed" value={resourceStats.completed} icon={CheckCircle2} />
        <OverviewCard label="Applied" value={resourceStats.applied} icon={Check} />
        <OverviewCard label="Linked to Visions" value={resourceStats.linked} icon={Target} />
      </div>

      <section className="bg-card border border-card-border rounded-[2rem] shadow-soft overflow-hidden">
        <div className="p-4 lg:p-5 border-b border-card-border space-y-4">
          <div className="flex flex-wrap gap-2">
            {growthTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'h-10 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all',
                  activeTab === tab.id ? 'bg-accent text-accent-contrast' : 'bg-surface-muted text-text-secondary/60 hover:text-text-main'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-3">
            <label className="h-11 rounded-xl bg-surface-muted border border-card-border px-3 flex items-center gap-2 focus-within:border-accent">
              <Search size={15} className="text-text-secondary/50 shrink-0" />
              <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search title, notes, tags..." className="min-w-0 flex-1 bg-transparent outline-none text-xs font-semibold text-text-main placeholder:text-text-secondary/40" />
            </label>
            <Select value={statusFilter} onChange={value => setStatusFilter(value as GrowthStatus | 'all')} options={statuses.map(status => ({ value: status, label: status === 'all' ? 'All statuses' : status }))} />
            <Select value={sourceFilter} onChange={value => setSourceFilter(value as SourceType | 'all')} options={[{ value: 'all', label: 'All sources' }, ...sourceTypes.map(type => ({ value: type, label: type }))]} />
            <Select value={visionFilter} onChange={setVisionFilter} options={[{ value: 'all', label: 'All visions' }, ...visions.map(vision => ({ value: vision.id, label: vision.title }))]} />
          </div>
        </div>

        {activeTab === 'paths' || activeTab === 'skills' ? (
          <PreparedSection type={activeTab} />
        ) : isLoading ? (
          <div className="min-h-96 flex items-center justify-center">
            <Loader2 size={26} className="animate-spin text-accent" />
          </div>
        ) : visibleResources.length === 0 ? (
          <EmptyState activeTab={activeTab} onAdd={openAddResource} />
        ) : (
          <div className="p-4 lg:p-6 grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
            {visibleResources.map(resource => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                visionTitle={resource.linked_vision_id ? visionById.get(resource.linked_vision_id)?.title : undefined}
                onOpen={() => openResource(resource)}
                onStatus={setResourceStatus}
                onConvert={() => convertResourceToTask(resource, `Apply learning from: ${resource.title}`, resource.linked_vision_id || '')}
              />
            ))}
          </div>
        )}
      </section>
      </>
      )}

      <AnimatePresence>
        {isResourceModalOpen && (
          <ResourceCreateModal
            form={form}
            setForm={setForm}
            visions={visions}
            isSaving={isSaving}
            onSave={submitManualResource}
            onClose={() => setIsResourceModalOpen(false)}
          />
        )}
        {isYouTubeModalOpen && (
          <SimpleModal title="Import YouTube Link" onClose={() => setIsYouTubeModalOpen(false)}>
            <div className="space-y-4">
              <input value={youtubeUrl} onChange={event => setYoutubeUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="w-full h-12 rounded-2xl bg-surface-muted border border-card-border px-4 text-sm font-semibold outline-none focus:border-accent" />
              <p className="text-xs text-text-secondary/60 font-medium">We will save the link, video thumbnail, and let you add notes, purpose, Vision, and action steps.</p>
              <button onClick={importYouTubeResource} disabled={isSaving || !youtubeUrl.trim()} className="w-full h-12 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest disabled:opacity-50">
                {isSaving ? 'Importing...' : 'Import YouTube Link'}
              </button>
            </div>
          </SimpleModal>
        )}
        {selectedResource && (selectedResource.source_type === 'youtube' ? (
          <LearningSessionModal
            resource={selectedResource}
            visions={visions}
            visionTitle={selectedResource.linked_vision_id ? visionById.get(selectedResource.linked_vision_id)?.title : undefined}
            userId={userId}
            onClose={() => setSelectedResource(null)}
            onUpdate={updateGrowthResource}
            onStatus={setResourceStatus}
            onDelete={deleteGrowthResource}
            onShareInsight={shareInsight}
            addToast={addToast}
          />
        ) : (
          <ResourceDetailModal
            resource={selectedResource}
            visions={visions}
            visionTitle={selectedResource.linked_vision_id ? visionById.get(selectedResource.linked_vision_id)?.title : undefined}
            onClose={() => setSelectedResource(null)}
            onUpdate={updateGrowthResource}
            onStatus={setResourceStatus}
            onDelete={deleteGrowthResource}
            onConvert={convertResourceToTask}
            onSaveAsNote={saveResourceAsNote}
            onShareInsight={shareInsight}
          />
        ))}
      </AnimatePresence>
      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.title || ''}
        description={confirmAction?.description || ''}
        confirmLabel={confirmAction?.confirmLabel || 'Confirm'}
        tone={confirmAction?.tone || 'danger'}
        isLoading={isConfirmingAction}
        onCancel={() => {
          if (!isConfirmingAction) setConfirmAction(null);
        }}
        onConfirm={async () => {
          if (!confirmAction) return;
          setIsConfirmingAction(true);
          try {
            await confirmAction.run();
            setConfirmAction(null);
          } finally {
            setIsConfirmingAction(false);
          }
        }}
      />
    </div>
  );
}

function OverviewCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="bg-card border border-card-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/50">{label}</p>
        <Icon size={16} className="text-accent" />
      </div>
      <p className="mt-4 text-3xl font-black text-text-main tabular-nums">{value}</p>
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <SelectMenu
      value={value}
      onChange={onChange}
      options={options}
      icon={<Filter size={14} />}
      className="min-w-44"
      triggerClassName="h-11 rounded-xl text-xs uppercase tracking-widest"
    />
  );
}

function EmptyState({ activeTab, onAdd }: { activeTab: string; onAdd: () => void }) {
  const text = activeTab === 'active'
    ? 'Nothing active right now. Start learning from a saved resource.'
    : activeTab === 'applied'
      ? 'Applied resources will appear here once you use what you learn.'
      : 'You have not saved any learning resources yet.';

  return (
    <div className="min-h-96 flex flex-col items-center justify-center text-center p-8">
      <BookOpen size={34} className="text-text-secondary/30 mb-4" />
      <p className="text-xs font-black uppercase tracking-[0.25em] text-text-secondary/50 max-w-md">{text}</p>
      <button onClick={onAdd} className="mt-6 h-11 px-5 rounded-xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest">Add your first resource</button>
    </div>
  );
}

function PreparedSection({ type }: { type: 'paths' | 'skills' }) {
  return (
    <div className="min-h-96 flex flex-col items-center justify-center text-center p-8">
      {type === 'paths' ? <Layers size={34} className="text-text-secondary/30 mb-4" /> : <GraduationCap size={34} className="text-text-secondary/30 mb-4" />}
      <p className="text-sm font-black uppercase tracking-widest text-text-main">{type === 'paths' ? 'Learning Paths' : 'Skills'}</p>
      <p className="mt-3 text-xs font-semibold text-text-secondary/60 max-w-md">
        {type === 'paths'
          ? 'Paths will organize resources into step-by-step learning sequences. The resource library is ready first.'
          : 'Skills will group resources by area and progress. For now, use categories and Vision links on resources.'}
      </p>
    </div>
  );
}

function ResourceCard({ resource, visionTitle, onOpen, onStatus, onConvert }: {
  resource: GrowthResource;
  visionTitle?: string;
  onOpen: () => void;
  onStatus: (resource: GrowthResource, status: GrowthStatus, extra?: Partial<GrowthResource>) => void;
  onConvert: () => void;
}) {
  const Icon = sourceIcons[resource.source_type] || Layers;
  return (
    <article className="bg-card border border-card-border rounded-[1.75rem] overflow-hidden shadow-sm flex flex-col">
      <button onClick={onOpen} className="text-left">
        {resource.thumbnail_url ? (
          <img src={resource.thumbnail_url} alt={resource.title} className="w-full aspect-video object-cover bg-surface-muted" />
        ) : (
          <div className="w-full aspect-video bg-surface-muted flex items-center justify-center text-accent">
            <Icon size={36} />
          </div>
        )}
      </button>
      <div className="p-5 space-y-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <button onClick={onOpen} className="text-left min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-accent">{resource.source_type}</p>
            <h3 className="mt-1 text-base font-black text-text-main leading-tight line-clamp-2">{resource.title}</h3>
          </button>
          <span className={cn('px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest shrink-0', statusStyles[resource.status])}>{resource.status}</span>
        </div>

        <div className="space-y-2 text-xs font-semibold text-text-secondary/65">
          <p className="line-clamp-2">{resource.purpose || 'Why are you learning this?'}</p>
          <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-secondary/45">
            <Target size={12} /> {visionTitle || 'No Vision linked'}
          </p>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2">
          {resource.status === 'saved' && <ActionButton label="Start" onClick={() => onStatus(resource, 'learning')} />}
          {resource.status !== 'completed' && resource.status !== 'applied' && <ActionButton label="Complete" onClick={() => onStatus(resource, 'completed')} />}
          {resource.status !== 'applied' && <ActionButton label="Apply" onClick={() => onOpen()} />}
          <ActionButton label="Task" onClick={onConvert} />
        </div>
      </div>
    </article>
  );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="h-9 rounded-xl bg-surface-muted border border-card-border text-[9px] font-black uppercase tracking-widest text-text-secondary hover:text-accent hover:border-accent/30">
      {label}
    </button>
  );
}

function SimpleModal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-overlay/80 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }} className="relative w-full max-w-xl max-h-[100dvh] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto custom-scrollbar bg-app-container rounded-t-[2rem] sm:rounded-[2rem] border border-card-border shadow-2xl p-4 sm:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="sticky -top-4 sm:-top-6 z-10 bg-app-container/95 backdrop-blur flex items-center justify-between gap-4 mb-6 py-2">
          <h2 className="text-lg font-black uppercase tracking-tight text-text-main">{title}</h2>
          <button onClick={onClose} className="w-11 h-11 rounded-xl bg-surface-muted flex items-center justify-center text-text-secondary hover:text-text-main"><X size={18} /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

function ResourceCreateModal({ form, setForm, visions, isSaving, onSave, onClose }: {
  form: ResourceForm;
  setForm: (value: ResourceForm | ((current: ResourceForm) => ResourceForm)) => void;
  visions: any[];
  isSaving: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <SimpleModal title="Add Resource" onClose={onClose}>
      <div className="space-y-4">
        <input value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} placeholder="What are you learning?" className="w-full h-12 rounded-2xl bg-surface-muted border border-card-border px-4 text-sm font-semibold outline-none focus:border-accent" />
        <input value={form.url} onChange={event => setForm(current => ({ ...current, url: event.target.value }))} placeholder="Resource URL optional" className="w-full h-12 rounded-2xl bg-surface-muted border border-card-border px-4 text-sm font-semibold outline-none focus:border-accent" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SelectMenu value={form.source_type} onChange={value => setForm(current => ({ ...current, source_type: value as SourceType }))} options={sourceTypes.map(type => ({ value: type, label: type }))} placeholder="Source type" />
          <input value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value }))} placeholder="Category" className="h-12 rounded-2xl bg-surface-muted border border-card-border px-4 text-sm font-semibold outline-none focus:border-accent" />
        </div>
        <SelectMenu value={form.linked_vision_id} onChange={value => setForm(current => ({ ...current, linked_vision_id: value }))} options={[{ value: '', label: 'Link to Vision optional' }, ...visions.map(vision => ({ value: vision.id, label: vision.title }))]} />
        <textarea value={form.purpose} onChange={event => setForm(current => ({ ...current, purpose: event.target.value }))} placeholder="Why are you learning this?" className="w-full h-24 rounded-2xl bg-surface-muted border border-card-border p-4 text-sm font-medium outline-none focus:border-accent resize-none" />
        <input value={form.tags} onChange={event => setForm(current => ({ ...current, tags: event.target.value }))} placeholder="Tags, comma separated" className="w-full h-12 rounded-2xl bg-surface-muted border border-card-border px-4 text-sm font-semibold outline-none focus:border-accent" />
        <button onClick={onSave} disabled={isSaving || !form.title.trim()} className="w-full h-12 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest disabled:opacity-50">
          {isSaving ? 'Saving...' : 'Save Resource'}
        </button>
      </div>
    </SimpleModal>
  );
}

function LearningSessionModal({ resource, visions, visionTitle, userId, onClose, onUpdate, onStatus, onDelete, onShareInsight, addToast }: {
  resource: GrowthResource;
  visions: any[];
  visionTitle?: string;
  userId?: string;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<GrowthResource>) => Promise<GrowthResource | false>;
  onStatus: (resource: GrowthResource, status: GrowthStatus, extra?: Partial<GrowthResource>) => void;
  onDelete: (resource: GrowthResource) => void;
  onShareInsight: (resource: GrowthResource) => void;
  addToast: (toast: { type: 'success' | 'error' | 'info'; title: string; description?: string }) => void;
}) {
  const videoId = resource.video_id || (resource.url ? getYouTubeVideoId(resource.url) : null);
  const tabs = [
    { id: 'purpose', label: 'Purpose' },
    { id: 'notes', label: 'Notes' },
    { id: 'takeaways', label: 'Takeaways' },
    { id: 'actions', label: 'Actions' },
    { id: 'apply', label: 'Apply' }
  ] as const;
  const [title, setTitle] = useState(resource.title);
  const [purpose, setPurpose] = useState(resource.purpose || '');
  const [linkedVisionId, setLinkedVisionId] = useState(resource.linked_vision_id || '');
  const [notes, setNotes] = useState(resource.notes || '');
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('notes');
  const [takeawayInput, setTakeawayInput] = useState('');
  const [takeaways, setTakeaways] = useState<string[]>(resource.key_takeaways || []);
  const [appliedNote, setAppliedNote] = useState(resource.applied_note || '');
  const [timestampNotes, setTimestampNotes] = useState<TimestampNote[]>([]);
  const [timestampSeconds, setTimestampSeconds] = useState('');
  const [timestampContent, setTimestampContent] = useState('');
  const [actionPoints, setActionPoints] = useState<GrowthActionPoint[]>([]);
  const [actionText, setActionText] = useState('');
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'failed'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const markDirty = () => {
    setIsDirty(true);
    setSaveState('saved');
  };

  const requireSessionUser = () => {
    if (!userId) {
      addToast({ type: 'error', title: 'Login required', description: 'Sign in to use Learning Session.' });
      return false;
    }
    return true;
  };

  const fetchSessionData = async () => {
    if (!userId) return;
    setIsLoadingSession(true);
    const [notesResult, actionsResult] = await Promise.all([
      supabase
        .from('growth_resource_notes')
        .select('*')
        .eq('resource_id', resource.id)
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
      supabase
        .from('growth_action_points')
        .select('*')
        .eq('resource_id', resource.id)
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
    ]);

    if (notesResult.error) {
      console.error('Failed to load timestamp notes:', notesResult.error);
      addToast({ type: 'error', title: 'Notes failed', description: 'Could not load timestamp notes.' });
    } else {
      setTimestampNotes((notesResult.data || []) as TimestampNote[]);
    }

    if (actionsResult.error) {
      console.error('Failed to load action points:', actionsResult.error);
      addToast({ type: 'error', title: 'Actions failed', description: 'Could not load action points.' });
    } else {
      setActionPoints((actionsResult.data || []) as GrowthActionPoint[]);
    }
    setIsLoadingSession(false);
  };

  useEffect(() => {
    fetchSessionData();
  }, [resource.id, userId]);

  const saveResourceFields = async (silent = false) => {
    if (!requireSessionUser()) return false;
    setIsSaving(true);
    setSaveState('saving');
    const saved = await onUpdate(resource.id, {
      title,
      purpose,
      linked_vision_id: linkedVisionId || null,
      notes,
      key_takeaways: takeaways,
      applied_note: appliedNote,
      video_id: videoId || null,
      last_watched_at: new Date().toISOString()
    });
    setIsSaving(false);
    if (saved) {
      setIsDirty(false);
      setSaveState('saved');
      setLastSavedAt(new Date());
      if (!silent) addToast({ type: 'success', title: 'Learning saved', description: 'Your session notes were saved.' });
    } else {
      setSaveState('failed');
      if (!silent) addToast({ type: 'error', title: 'Could not save session', description: 'Try again.' });
    }
    return !!saved;
  };

  useEffect(() => {
    if (!isDirty) return;
    const timer = window.setTimeout(() => {
      saveResourceFields(true);
    }, 850);
    return () => window.clearTimeout(timer);
  }, [isDirty, title, purpose, linkedVisionId, notes, takeaways, appliedNote]);

  const handleClose = async () => {
    if (isDirty) await saveResourceFields(true);
    onClose();
  };

  const addTimestampNote = async () => {
    if (!requireSessionUser()) return;
    if (!timestampContent.trim()) {
      addToast({ type: 'error', title: 'Note required', description: 'Write a timestamp note first.' });
      return;
    }

    const parsedTimestamp = timestampSeconds.trim() ? Number(timestampSeconds) : null;
    if (parsedTimestamp !== null && (!Number.isFinite(parsedTimestamp) || parsedTimestamp < 0)) {
      addToast({ type: 'error', title: 'Invalid timestamp', description: 'Use seconds from the start of the video.' });
      return;
    }

    const { data, error } = await supabase
      .from('growth_resource_notes')
      .insert({
        resource_id: resource.id,
        user_id: userId,
        timestamp_seconds: parsedTimestamp,
        content: sanitizePlainText(timestampContent, 1000)
      })
      .select('*')
      .single();

    if (error) {
      console.error('Failed to add timestamp note:', error);
      addToast({ type: 'error', title: 'Note failed', description: error.message });
      return;
    }

    setTimestampNotes(current => [...current, data as TimestampNote]);
    setTimestampSeconds('');
    setTimestampContent('');
  };

  const updateTimestampNote = async (note: TimestampNote, content: string) => {
    if (!requireSessionUser()) return;
    const { data, error } = await supabase
      .from('growth_resource_notes')
      .update({ content: sanitizePlainText(content, 1000), updated_at: new Date().toISOString() })
      .eq('id', note.id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      console.error('Failed to update timestamp note:', error);
      addToast({ type: 'error', title: 'Note update failed', description: error.message });
      return;
    }
    setTimestampNotes(current => current.map(item => item.id === note.id ? data as TimestampNote : item));
  };

  const deleteTimestampNote = async (noteId: string) => {
    if (!requireSessionUser()) return;
    const { error } = await supabase.from('growth_resource_notes').delete().eq('id', noteId).eq('user_id', userId);
    if (error) {
      console.error('Failed to delete timestamp note:', error);
      addToast({ type: 'error', title: 'Delete failed', description: error.message });
      return;
    }
    setTimestampNotes(current => current.filter(item => item.id !== noteId));
  };

  const addTakeaway = async () => {
    if (!takeawayInput.trim()) return;
    const nextTakeaways = [...takeaways, sanitizeText(takeawayInput, 500)].filter(Boolean).slice(0, 50);
    setTakeaways(nextTakeaways);
    setTakeawayInput('');
    markDirty();
  };

  const updateTakeaway = async (index: number, value: string) => {
    const nextTakeaways = takeaways.map((item, itemIndex) => itemIndex === index ? sanitizeText(value, 500) : item).filter(Boolean);
    setTakeaways(nextTakeaways);
    markDirty();
  };

  const deleteTakeaway = async (index: number) => {
    const nextTakeaways = takeaways.filter((_, itemIndex) => itemIndex !== index);
    setTakeaways(nextTakeaways);
    markDirty();
  };

  const addActionPoint = async () => {
    if (!requireSessionUser()) return;
    if (!actionText.trim()) {
      addToast({ type: 'error', title: 'Action required', description: 'Write an action point first.' });
      return;
    }

    const { data, error } = await supabase
      .from('growth_action_points')
      .insert({
        resource_id: resource.id,
        user_id: userId,
        text: sanitizeText(actionText, 500),
        completed: false
      })
      .select('*')
      .single();

    if (error) {
      console.error('Failed to add action point:', error);
      addToast({ type: 'error', title: 'Action failed', description: error.message });
      return;
    }
    setActionPoints(current => [...current, data as GrowthActionPoint]);
    setActionText('');
  };

  const updateActionPoint = async (actionPoint: GrowthActionPoint, updates: Partial<GrowthActionPoint>) => {
    if (!requireSessionUser()) return false;
    const safeUpdates = { ...updates };
    if (safeUpdates.text !== undefined) safeUpdates.text = sanitizeText(safeUpdates.text, 500);
    const { data, error } = await supabase
      .from('growth_action_points')
      .update({ ...safeUpdates, updated_at: new Date().toISOString() })
      .eq('id', actionPoint.id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      console.error('Failed to update action point:', error);
      addToast({ type: 'error', title: 'Action update failed', description: error.message });
      return false;
    }
    setActionPoints(current => current.map(item => item.id === actionPoint.id ? data as GrowthActionPoint : item));
    return data as GrowthActionPoint;
  };

  const deleteActionPoint = async (actionPointId: string) => {
    if (!requireSessionUser()) return;
    const { error } = await supabase.from('growth_action_points').delete().eq('id', actionPointId).eq('user_id', userId);
    if (error) {
      console.error('Failed to delete action point:', error);
      addToast({ type: 'error', title: 'Delete failed', description: error.message });
      return;
    }
    setActionPoints(current => current.filter(item => item.id !== actionPointId));
  };

  const convertActionPointToTask = async (actionPoint: GrowthActionPoint) => {
    if (!requireSessionUser()) return;
    if (!linkedVisionId) {
      addToast({ type: 'error', title: 'Vision required', description: 'Select a Vision before converting this action point.' });
      return;
    }

    const saved = await saveResourceFields(true);
    if (!saved) return;

    const { data: vision, error: visionError } = await supabase
      .from('visions')
      .select('id')
      .eq('id', linkedVisionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (visionError || !vision) {
      console.error('Vision ownership check failed:', visionError);
      addToast({ type: 'error', title: 'Vision unavailable', description: 'Choose one of your own Visions.' });
      return;
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        vision_id: linkedVisionId,
        text: sanitizeText(actionPoint.text, 500),
        completed: false
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to convert action point to task:', error);
      addToast({ type: 'error', title: 'Task failed', description: error.message });
      return;
    }

    await updateActionPoint(actionPoint, { converted_task_id: task.id });
    await onUpdate(resource.id, { linked_task_id: task.id, linked_vision_id: linkedVisionId || null });
    addToast({ type: 'success', title: 'Task created', description: 'The action point is now tied to your Vision.' });
  };

  const markCompleted = async () => {
    await saveResourceFields(true);
    onStatus(resource, 'completed');
  };

  const markApplied = async () => {
    if (!appliedNote.trim()) {
      addToast({ type: 'error', title: 'Applied note required', description: 'Describe how you applied the learning.' });
      return;
    }
    await saveResourceFields(true);
    onStatus(resource, 'applied', { applied_note: appliedNote });
  };

  const updateField = <T,>(setter: (value: T) => void, value: T) => {
    setter(value);
    markDirty();
  };

  const saveLabel = saveState === 'saving'
    ? 'Saving...'
    : saveState === 'failed'
      ? 'Could not save session'
      : isDirty
        ? 'Unsaved changes'
        : lastSavedAt
          ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : 'Saved';

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose} className="absolute inset-0 bg-overlay/75 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.98, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 12 }} className="relative w-full max-w-[1380px] h-[100dvh] sm:h-[min(calc(100dvh-2rem),900px)] overflow-hidden bg-app-container rounded-t-[1.75rem] sm:rounded-xl border border-card-border shadow-2xl flex flex-col">
        <header className="shrink-0 bg-app-container/95 backdrop-blur border-b border-card-border px-4 lg:px-5 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-accent">Learning Session</p>
            <h2 className="text-base lg:text-lg font-black text-text-main tracking-tight mt-1 truncate">{title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-widest">
              <span className="px-2.5 py-1 rounded-full border border-card-border bg-surface-muted text-text-secondary">YouTube</span>
              <span className={cn('px-2.5 py-1 rounded-full border', statusStyles[resource.status])}>{resource.status}</span>
              {linkedVisionId && <span className="px-2.5 py-1 rounded-full border border-accent/20 bg-accent/10 text-accent max-w-[260px] truncate">Linked to {visionTitle || visions.find(vision => vision.id === linkedVisionId)?.title || 'Vision'}</span>}
              <span className={cn('px-2.5 py-1 rounded-full border', saveState === 'failed' ? 'border-danger/20 bg-danger/10 text-danger' : 'border-card-border bg-surface-muted text-text-secondary/60')}>{saveLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {resource.url && <a href={resource.url} target="_blank" rel="noreferrer" className="hidden sm:inline-flex h-10 px-3 rounded-xl bg-card border border-card-border text-[9px] font-black uppercase tracking-widest text-text-secondary hover:text-accent items-center gap-2"><ExternalLink size={13} /> YouTube</a>}
            <button onClick={() => saveResourceFields(false)} disabled={isSaving || !title.trim()} className="hidden sm:inline-flex h-10 px-3 rounded-xl bg-accent text-accent-contrast text-[9px] font-black uppercase tracking-widest disabled:opacity-50">{isSaving ? 'Saving...' : 'Save'}</button>
            <button onClick={handleClose} aria-label="Close Learning Session" className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-text-secondary hover:text-text-main shrink-0 focus:outline-none focus:ring-2 focus:ring-accent"><X size={18} /></button>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto xl:overflow-hidden grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(430px,0.75fr)]">
          <section className="min-h-0 overflow-visible xl:overflow-y-auto custom-scrollbar p-3 sm:p-4 lg:p-5 space-y-4 border-b xl:border-b-0 xl:border-r border-card-border">
            <div className="xl:sticky xl:top-0 space-y-4">
              <div className="bg-card border border-card-border rounded-xl overflow-hidden shadow-sm">
                {videoId ? (
                  <iframe
                    title={title}
                    src={`https://www.youtube.com/embed/${videoId}`}
                    className="w-full aspect-video max-h-[430px] bg-black"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <div className="w-full aspect-video max-h-[430px] bg-surface-muted flex items-center justify-center text-center p-6">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-text-main">Video preview unavailable.</p>
                      {resource.url && <a href={resource.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-[10px] font-black uppercase tracking-widest text-accent">Open it on YouTube</a>}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-card border border-card-border rounded-xl p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-accent">What am I learning?</p>
                    <input value={title} onChange={event => updateField(setTitle, event.target.value)} className="mt-2 w-full bg-transparent text-lg font-black text-text-main outline-none focus:text-accent" aria-label="Learning resource title" />
                  </div>
                  {resource.thumbnail_url && <img src={resource.thumbnail_url} alt="" className="w-20 aspect-video rounded-xl object-cover border border-card-border hidden sm:block" />}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <SessionMetric label="Status" value={resource.status} />
                  <SessionMetric label="Vision" value={linkedVisionId ? 'Linked' : 'None'} />
                  <SessionMetric label="Notes" value={String(timestampNotes.length)} />
                  <SessionMetric label="Actions" value={String(actionPoints.length)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => onStatus(resource, 'learning')} className="h-9 px-3 rounded-xl bg-surface-muted border border-card-border text-[9px] font-black uppercase tracking-widest text-text-secondary hover:text-accent">Mark Learning</button>
                  <button onClick={markCompleted} className="h-9 px-3 rounded-xl bg-surface-muted border border-card-border text-[9px] font-black uppercase tracking-widest text-text-secondary hover:text-success">Complete</button>
                  {resource.url && <a href={resource.url} target="_blank" rel="noreferrer" className="h-9 px-3 rounded-xl bg-surface-muted border border-card-border text-[9px] font-black uppercase tracking-widest text-text-secondary hover:text-accent inline-flex items-center gap-2"><ExternalLink size={12} /> Open on YouTube</a>}
                </div>
              </div>
            </div>
          </section>

          <aside className="min-h-0 flex flex-col">
            <div className="shrink-0 border-b border-card-border p-3 bg-app-container/95 sticky top-0 z-10 xl:static">
              <div role="tablist" aria-label="Learning Session sections" className="flex sm:grid sm:grid-cols-5 gap-1 rounded-2xl bg-surface-muted p-1 overflow-x-auto custom-scrollbar">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn('h-10 min-w-24 sm:min-w-0 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-accent', activeTab === tab.id ? 'bg-card text-accent shadow-sm' : 'text-text-secondary/55 hover:text-text-main')}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 lg:p-5">
              {activeTab === 'purpose' && (
                <div className="space-y-4">
                  <WorkspacePanel number="2" title="Why am I learning it?" subtitle="Keep the reason close so this does not become passive watching.">
                    <textarea value={purpose} onChange={event => updateField(setPurpose, event.target.value)} placeholder="Why is this resource useful for your growth?" className="w-full h-40 rounded-xl bg-surface-muted border border-card-border p-3 text-sm font-medium outline-none focus:border-accent resize-none" />
                  </WorkspacePanel>
                  <WorkspacePanel number="3" title="How does it connect to my Visions?" subtitle="Link the session to one active Vision before turning learning into tasks.">
                    <SelectMenu value={linkedVisionId} onChange={value => updateField(setLinkedVisionId, value)} options={[{ value: '', label: 'No Vision linked' }, ...visions.map(vision => ({ value: vision.id, label: vision.title }))]} triggerClassName="h-11 rounded-xl" />
                    {!linkedVisionId && <p className="text-xs font-semibold text-text-secondary/50">Link this resource to a Vision so learning becomes progress.</p>}
                  </WorkspacePanel>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="space-y-4">
                  <WorkspacePanel number="4" title="Notes while watching" subtitle="Write what you learn while watching. These notes autosave to the resource.">
                    <div className="flex justify-end">
                      <button onClick={() => setIsNotesExpanded(true)} className="h-9 px-3 rounded-lg bg-surface-muted border border-card-border text-[9px] font-black uppercase tracking-widest text-text-secondary hover:text-accent flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-accent">
                        <Maximize2 size={13} /> Expand
                      </button>
                    </div>
                    <textarea value={notes} onChange={event => updateField(setNotes, event.target.value)} placeholder="Write what you learn while watching." className="w-full h-64 rounded-lg bg-surface-muted border border-card-border p-3 text-sm font-medium outline-none focus:border-accent resize-none" />
                  </WorkspacePanel>
                  <WorkspacePanel title="Timestamp notes" subtitle="Use manual seconds for now. Current-time capture can come later with the YouTube player API.">
                    <div className="grid grid-cols-1 sm:grid-cols-[90px_minmax(0,1fr)_auto] gap-2">
                      <input value={timestampSeconds} onChange={event => setTimestampSeconds(event.target.value)} inputMode="numeric" placeholder="Seconds" className="h-10 rounded-xl bg-surface-muted border border-card-border px-3 text-xs font-semibold outline-none focus:border-accent" />
                      <input value={timestampContent} onChange={event => setTimestampContent(event.target.value)} placeholder="Add timestamp note" className="h-10 rounded-xl bg-surface-muted border border-card-border px-3 text-xs font-semibold outline-none focus:border-accent" />
                      <button onClick={addTimestampNote} className="h-10 px-3 rounded-xl bg-accent text-accent-contrast text-[9px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-accent">Add</button>
                    </div>
                    {isLoadingSession ? <Loader2 size={18} className="animate-spin text-accent" /> : timestampNotes.length === 0 ? (
                      <EmptyInline text="Write what you learn while watching." />
                    ) : (
                      <div className="space-y-2">
                        {timestampNotes.map(note => (
                          <div key={note.id} className="grid grid-cols-1 sm:grid-cols-[68px_minmax(0,1fr)_auto] gap-2 items-center rounded-xl bg-surface-muted/60 border border-card-border p-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-accent">{formatTimestamp(note.timestamp_seconds)}</span>
                            <input value={note.content} onChange={event => updateTimestampNote(note, event.target.value)} className="h-9 rounded-lg bg-card border border-card-border px-3 text-xs font-semibold outline-none focus:border-accent" />
                            <button aria-label="Delete timestamp note" onClick={() => deleteTimestampNote(note.id)} className="w-9 h-9 rounded-lg bg-danger/10 text-danger flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-danger/30"><Trash2 size={13} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </WorkspacePanel>
                </div>
              )}

              {activeTab === 'takeaways' && (
                <WorkspacePanel number="4" title="Key takeaways" subtitle="Capture the ideas worth remembering. Keep each takeaway short and reusable.">
                  <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <input value={takeawayInput} onChange={event => setTakeawayInput(event.target.value)} placeholder="Add the idea worth remembering" className="h-10 rounded-xl bg-surface-muted border border-card-border px-3 text-xs font-semibold outline-none focus:border-accent" />
                    <button onClick={addTakeaway} className="h-10 px-3 rounded-xl bg-accent text-accent-contrast text-[9px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-accent">Add</button>
                  </div>
                  {takeaways.length === 0 ? <EmptyInline text="Add the ideas worth remembering." /> : (
                    <div className="space-y-2">
                      {takeaways.map((takeaway, index) => (
                        <div key={`${takeaway}-${index}`} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-xl bg-surface-muted/60 border border-card-border p-2">
                          <input value={takeaway} onChange={event => updateTakeaway(index, event.target.value)} className="h-9 rounded-lg bg-card border border-card-border px-3 text-xs font-semibold outline-none focus:border-accent" />
                          <button aria-label="Delete takeaway" onClick={() => deleteTakeaway(index)} className="w-9 h-9 rounded-lg bg-danger/10 text-danger flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-danger/30"><Trash2 size={13} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </WorkspacePanel>
              )}

              {activeTab === 'actions' && (
                <WorkspacePanel number="5" title="Action points" subtitle="Turn the session into practical steps, then convert the useful ones to Vision tasks.">
                  <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <input value={actionText} onChange={event => setActionText(event.target.value)} placeholder="Turn what you learned into action" className="h-10 rounded-xl bg-surface-muted border border-card-border px-3 text-xs font-semibold outline-none focus:border-accent" />
                    <button onClick={addActionPoint} className="h-10 px-3 rounded-xl bg-accent text-accent-contrast text-[9px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-accent">Add</button>
                  </div>
                  {!linkedVisionId && <p className="text-xs font-semibold text-text-secondary/50">Select a Vision in Purpose before converting action points to tasks.</p>}
                  {actionPoints.length === 0 ? <EmptyInline text="Turn what you learned into action." /> : (
                    <div className="space-y-2">
                      {actionPoints.map(actionPoint => (
                        <div key={actionPoint.id} className="rounded-xl bg-surface-muted/60 border border-card-border p-3 space-y-2">
                          <input value={actionPoint.text} onChange={event => updateActionPoint(actionPoint, { text: event.target.value })} className="w-full h-9 rounded-lg bg-card border border-card-border px-3 text-xs font-semibold outline-none focus:border-accent" />
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => updateActionPoint(actionPoint, { completed: !actionPoint.completed })} className={cn('h-8 px-3 rounded-lg text-[8px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-accent', actionPoint.completed ? 'bg-success text-white' : 'bg-card border border-card-border text-text-secondary')}>{actionPoint.completed ? 'Done' : 'Mark Done'}</button>
                            <button onClick={() => convertActionPointToTask(actionPoint)} disabled={!!actionPoint.converted_task_id} className="h-8 px-3 rounded-lg bg-card border border-card-border text-[8px] font-black uppercase tracking-widest text-text-secondary disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent">{actionPoint.converted_task_id ? 'Task Created' : 'Convert to Task'}</button>
                            <button onClick={() => deleteActionPoint(actionPoint.id)} className="h-8 px-3 rounded-lg bg-danger/10 text-danger text-[8px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-danger/30">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </WorkspacePanel>
              )}

              {activeTab === 'apply' && (
                <div className="space-y-4">
                  <WorkspacePanel number="5" title="Applied learning" subtitle="Close the loop by writing exactly how you used this learning.">
                    <textarea value={appliedNote} onChange={event => updateField(setAppliedNote, event.target.value)} placeholder="Describe how you used this learning." className="w-full h-36 rounded-xl bg-surface-muted border border-card-border p-3 text-sm font-medium outline-none focus:border-accent resize-none" />
                    {!appliedNote.trim() && <p className="text-xs font-semibold text-text-secondary/45">Describe how you used this learning.</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button onClick={markCompleted} className="h-10 rounded-xl bg-card border border-card-border text-[9px] font-black uppercase tracking-widest text-text-secondary hover:text-success focus:outline-none focus:ring-2 focus:ring-accent">Mark Completed</button>
                      <button onClick={markApplied} className="h-10 rounded-xl bg-success text-white text-[9px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-success/40">Mark Applied</button>
                      <button onClick={() => onShareInsight({ ...resource, notes, applied_note: appliedNote })} className="h-10 rounded-xl bg-card border border-card-border text-[9px] font-black uppercase tracking-widest text-text-secondary hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent">Share Insight</button>
                    </div>
                  </WorkspacePanel>
                  <WorkspacePanel title="Danger zone" subtitle="Delete only removes this Growth resource and session notes. It does not delete linked Visions or tasks.">
                    <button onClick={() => onDelete(resource)} className="h-10 px-4 rounded-xl bg-danger/10 border border-danger/20 text-[9px] font-black uppercase tracking-widest text-danger focus:outline-none focus:ring-2 focus:ring-danger/30">Delete Resource</button>
                  </WorkspacePanel>
                </div>
              )}
            </div>
          </aside>
        </div>

        <footer className="shrink-0 border-t border-card-border bg-app-container/95 backdrop-blur px-4 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className={cn('text-[10px] font-black uppercase tracking-widest text-center sm:text-left', saveState === 'failed' ? 'text-danger' : saveState === 'saving' ? 'text-accent' : 'text-text-secondary/55')}>{saveLabel}</p>
          <button onClick={() => saveResourceFields(false)} disabled={isSaving || !title.trim()} className="h-10 sm:h-9 w-full sm:w-auto px-4 rounded-xl bg-accent text-accent-contrast text-[9px] font-black uppercase tracking-widest disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent">{isSaving ? 'Saving...' : 'Save Session'}</button>
        </footer>

        <AnimatePresence>
          {isNotesExpanded && (
            <motion.div className="absolute inset-0 z-20 bg-app-container flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="shrink-0 border-b border-card-border px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.28em] text-accent">Expanded Notes</p>
                  <h3 className="text-sm font-black text-text-main mt-1">Write while the idea is fresh</h3>
                </div>
                <button onClick={() => setIsNotesExpanded(false)} className="h-10 px-3 rounded-lg bg-surface-muted border border-card-border text-[9px] font-black uppercase tracking-widest text-text-secondary hover:text-accent flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-accent">
                  <Minimize2 size={13} /> Collapse
                </button>
              </div>
              <div className="flex-1 min-h-0 p-4">
                <textarea
                  value={notes}
                  onChange={event => updateField(setNotes, event.target.value)}
                  placeholder="Write what you learn while watching."
                  className="w-full h-full rounded-lg bg-surface-muted border border-card-border p-4 text-sm font-medium leading-relaxed outline-none focus:border-accent resize-none"
                  autoFocus
                />
              </div>
              <div className="shrink-0 border-t border-card-border px-4 py-2.5 flex items-center justify-between">
                <p className={cn('text-[10px] font-black uppercase tracking-widest', saveState === 'failed' ? 'text-danger' : saveState === 'saving' ? 'text-accent' : 'text-text-secondary/55')}>{saveLabel}</p>
                <button onClick={() => saveResourceFields(false)} disabled={isSaving || !title.trim()} className="h-9 px-4 rounded-xl bg-accent text-accent-contrast text-[9px] font-black uppercase tracking-widest disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent">{isSaving ? 'Saving...' : 'Save Notes'}</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function SessionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-muted border border-card-border p-3 min-w-0">
      <p className="text-[8px] font-black uppercase tracking-widest text-text-secondary/45">{label}</p>
      <p className="mt-1 text-xs font-black text-text-main truncate">{value}</p>
    </div>
  );
}

function WorkspacePanel({ number, title, subtitle, children }: { number?: string; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="bg-card border border-card-border rounded-xl p-4 space-y-4">
      <div className="flex items-start gap-3">
        {number && <span className="w-7 h-7 rounded-xl bg-accent text-accent-contrast text-[10px] font-black flex items-center justify-center shrink-0">{number}</span>}
        <div className="min-w-0">
          <h3 className="text-xs font-black uppercase tracking-widest text-text-main">{title}</h3>
          {subtitle && <p className="mt-1 text-xs font-semibold text-text-secondary/55 leading-relaxed">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyInline({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-card-border bg-surface-muted/40 p-4">
      <p className="text-xs font-semibold text-text-secondary/50">{text}</p>
    </div>
  );
}

function ResourceDetailModal({ resource, visions, visionTitle, onClose, onUpdate, onStatus, onDelete, onConvert, onSaveAsNote, onShareInsight }: {
  resource: GrowthResource;
  visions: any[];
  visionTitle?: string;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<GrowthResource>) => Promise<GrowthResource | false>;
  onStatus: (resource: GrowthResource, status: GrowthStatus, extra?: Partial<GrowthResource>) => void;
  onDelete: (resource: GrowthResource) => void;
  onConvert: (resource: GrowthResource, taskText: string, visionId: string) => Promise<boolean>;
  onSaveAsNote: (resource: GrowthResource) => void;
  onShareInsight: (resource: GrowthResource) => void;
}) {
  const [title, setTitle] = useState(resource.title);
  const [purpose, setPurpose] = useState(resource.purpose || '');
  const [linkedVisionId, setLinkedVisionId] = useState(resource.linked_vision_id || '');
  const [notes, setNotes] = useState(resource.notes || '');
  const [takeaways, setTakeaways] = useState(stringifyLines(resource.key_takeaways));
  const [actions, setActions] = useState(stringifyLines(resource.action_points));
  const [appliedNote, setAppliedNote] = useState(resource.applied_note || '');
  const [taskText, setTaskText] = useState(`Apply learning from: ${resource.title}`);
  const [isSaving, setIsSaving] = useState(false);

  const saveEdits = async () => {
    setIsSaving(true);
    await onUpdate(resource.id, {
      title,
      purpose,
      linked_vision_id: linkedVisionId || null,
      notes,
      key_takeaways: parseLines(takeaways),
      action_points: parseLines(actions),
      applied_note: appliedNote
    });
    setIsSaving(false);
  };

  const markApplied = async () => {
    if (!appliedNote.trim()) return;
    await onUpdate(resource.id, { applied_note: appliedNote });
    onStatus(resource, 'applied', { applied_note: appliedNote });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-5 overflow-hidden">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-overlay/80 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }} className="relative w-full max-w-6xl max-h-[100dvh] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto custom-scrollbar bg-app-container rounded-t-[2rem] sm:rounded-[2rem] border border-card-border shadow-2xl">
        <div className="sticky top-0 z-10 bg-app-container/95 backdrop-blur border-b border-card-border p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-accent">Growth Resource</p>
            <h2 className="text-xl font-black text-text-main uppercase tracking-tight mt-1">{resource.title}</h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-text-secondary hover:text-text-main"><X size={18} /></button>
        </div>

        <div className="p-5 lg:p-7 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <div className="space-y-5">
            <QuestionBlock number="1" title="What am I learning?">
              <input value={title} onChange={event => setTitle(event.target.value)} className="w-full h-12 rounded-2xl bg-card border border-card-border px-4 text-sm font-black outline-none focus:border-accent" />
              <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
                <span className={cn('px-3 py-1 rounded-full border', statusStyles[resource.status])}>{resource.status}</span>
                <span className="px-3 py-1 rounded-full border border-card-border bg-surface-muted text-text-secondary">{resource.source_type}</span>
                {resource.url && <a href={resource.url} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-full border border-card-border bg-surface-muted text-accent inline-flex items-center gap-1"><ExternalLink size={11} /> Open source</a>}
              </div>
            </QuestionBlock>

            <QuestionBlock number="2" title="Why am I learning it?">
              <textarea value={purpose} onChange={event => setPurpose(event.target.value)} placeholder="Why is this resource useful for your growth?" className="w-full h-24 rounded-2xl bg-card border border-card-border p-4 text-sm font-medium outline-none focus:border-accent resize-none" />
            </QuestionBlock>

            <QuestionBlock number="3" title="How does it connect to my Visions?">
              <SelectMenu value={linkedVisionId} onChange={setLinkedVisionId} options={[{ value: '', label: 'No Vision linked' }, ...visions.map(vision => ({ value: vision.id, label: vision.title }))]} triggerClassName="bg-card" />
              {!linkedVisionId && <p className="text-xs font-semibold text-text-secondary/50">Link this resource to a Vision so it becomes part of your progress.</p>}
              {visionTitle && <p className="text-xs font-black uppercase tracking-widest text-accent">Currently linked to {visionTitle}</p>}
            </QuestionBlock>

            <QuestionBlock number="4" title="What did I learn from it?">
              <textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="What did you learn from this?" className="w-full h-32 rounded-2xl bg-card border border-card-border p-4 text-sm font-medium outline-none focus:border-accent resize-none" />
              <textarea value={takeaways} onChange={event => setTakeaways(event.target.value)} placeholder="Key takeaways, one per line" className="w-full h-28 rounded-2xl bg-card border border-card-border p-4 text-sm font-medium outline-none focus:border-accent resize-none" />
              <textarea value={actions} onChange={event => setActions(event.target.value)} placeholder="Action points, one per line" className="w-full h-28 rounded-2xl bg-card border border-card-border p-4 text-sm font-medium outline-none focus:border-accent resize-none" />
            </QuestionBlock>

            <QuestionBlock number="5" title="Did I apply it?">
              <textarea value={appliedNote} onChange={event => setAppliedNote(event.target.value)} placeholder="How did you apply this?" className="w-full h-24 rounded-2xl bg-card border border-card-border p-4 text-sm font-medium outline-none focus:border-accent resize-none" />
              <div className="flex flex-wrap gap-2">
                <button onClick={markApplied} disabled={!appliedNote.trim()} className="h-10 px-4 rounded-xl bg-success text-white text-[9px] font-black uppercase tracking-widest disabled:opacity-50">Mark as Applied</button>
                <button onClick={() => onStatus(resource, 'completed')} className="h-10 px-4 rounded-xl bg-surface-muted border border-card-border text-[9px] font-black uppercase tracking-widest text-text-secondary">Mark Completed</button>
              </div>
            </QuestionBlock>
          </div>

          <aside className="space-y-4">
            {resource.thumbnail_url && <img src={resource.thumbnail_url} alt={resource.title} className="w-full rounded-2xl border border-card-border bg-surface-muted" />}
            <button onClick={saveEdits} disabled={isSaving || !title.trim()} className="w-full h-12 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest disabled:opacity-50">{isSaving ? 'Saving...' : 'Save Changes'}</button>
            <button onClick={() => onStatus(resource, 'learning')} className="w-full h-11 rounded-2xl bg-card border border-card-border text-[10px] font-black uppercase tracking-widest text-text-secondary">Start Learning</button>
            <button onClick={() => onSaveAsNote(resource)} className="w-full h-11 rounded-2xl bg-card border border-card-border text-[10px] font-black uppercase tracking-widest text-text-secondary flex items-center justify-center gap-2"><NotebookPen size={14} /> Save as Note</button>

            <div className="bg-card border border-card-border rounded-2xl p-4 space-y-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/50">Convert to Task</p>
              <input value={taskText} onChange={event => setTaskText(event.target.value)} className="w-full h-10 rounded-xl bg-surface-muted border border-card-border px-3 text-xs font-semibold outline-none focus:border-accent" />
              <button onClick={() => onConvert(resource, taskText, linkedVisionId)} className="w-full h-10 rounded-xl bg-accent text-accent-contrast text-[9px] font-black uppercase tracking-widest">Convert to Task</button>
            </div>

            <button onClick={() => onShareInsight(resource)} className="w-full h-11 rounded-2xl bg-card border border-card-border text-[10px] font-black uppercase tracking-widest text-text-secondary flex items-center justify-center gap-2"><Send size={14} /> Share Insight</button>
            <button onClick={() => onStatus(resource, 'archived')} className="w-full h-11 rounded-2xl bg-card border border-card-border text-[10px] font-black uppercase tracking-widest text-text-secondary flex items-center justify-center gap-2"><Archive size={14} /> Archive</button>
            <button onClick={() => onDelete(resource)} className="w-full h-11 rounded-2xl bg-danger/10 border border-danger/20 text-[10px] font-black uppercase tracking-widest text-danger flex items-center justify-center gap-2"><Trash2 size={14} /> Delete</button>
          </aside>
        </div>
      </motion.div>
    </div>
  );
}

function QuestionBlock({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <section className="bg-surface-muted/50 border border-card-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className="w-7 h-7 rounded-xl bg-accent text-accent-contrast text-[10px] font-black flex items-center justify-center">{number}</span>
        <h3 className="text-xs font-black uppercase tracking-widest text-text-main">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function QuestionTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-7 h-7 rounded-xl bg-accent text-accent-contrast text-[10px] font-black flex items-center justify-center">{number}</span>
      <h3 className="text-xs font-black uppercase tracking-widest text-text-main">{title}</h3>
    </div>
  );
}
