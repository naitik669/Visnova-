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
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';

type GrowthStatus = 'saved' | 'learning' | 'completed' | 'applied' | 'archived';
type SourceType = 'youtube' | 'article' | 'course' | 'book' | 'podcast' | 'pdf' | 'website' | 'other';
type GrowthTab = 'library' | 'active' | 'applied' | 'paths' | 'skills';

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

const parseLines = (value: string) => value.split('\n').map(line => line.trim()).filter(Boolean);
const stringifyLines = (value?: string[] | null) => (value || []).join('\n');
const parseTags = (value: string) => value.split(',').map(tag => tag.trim().replace(/^#/, '').toLowerCase()).filter(Boolean);
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
  const { session, visions, fetchVisions, addToast, addNote, addPost } = useStore();
  const userId = session?.user?.id;
  const [resources, setResources] = useState<GrowthResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<GrowthTab>('library');
  const [statusFilter, setStatusFilter] = useState<GrowthStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceType | 'all'>('all');
  const [visionFilter, setVisionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<GrowthResource | null>(null);
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
    fetchGrowthResources();
  }, [userId]);

  const visionById = useMemo(() => new Map(visions.map(vision => [vision.id, vision])), [visions]);

  const stats = useMemo(() => ({
    learning: resources.filter(item => item.status === 'learning').length,
    saved: resources.filter(item => item.status === 'saved').length,
    completed: resources.filter(item => item.status === 'completed').length,
    applied: resources.filter(item => item.status === 'applied').length,
    linked: resources.filter(item => !!item.linked_vision_id).length
  }), [resources]);

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

    setIsSaving(true);
    const { data, error } = await supabase
      .from('growth_resources')
      .insert({
        user_id: userId,
        title: payload.title.trim(),
        url: payload.url || null,
        video_id: payload.video_id || null,
        source_type: payload.source_type || 'other',
        source_name: payload.source_name || null,
        thumbnail_url: payload.thumbnail_url || null,
        category: payload.category || null,
        status: payload.status || 'saved',
        purpose: payload.purpose || null,
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
    const videoId = getYouTubeVideoId(youtubeUrl);
    if (!videoId) {
      addToast({ type: 'error', title: 'Invalid YouTube link', description: 'Paste a valid YouTube link.' });
      return;
    }

    const created = await createGrowthResource({
      title: 'YouTube Video',
      url: youtubeUrl.trim(),
      video_id: videoId,
      source_type: 'youtube',
      source_name: 'YouTube',
      thumbnail_url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
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
    if (!window.confirm(`Delete "${resource.title}" from Growth?`)) return;
    const { error } = await supabase.from('growth_resources').delete().eq('id', resource.id).eq('user_id', userId);
    if (error) {
      console.error('Failed to delete Growth resource:', error);
      addToast({ type: 'error', title: 'Delete failed', description: error.message });
      return;
    }
    setResources(current => current.filter(item => item.id !== resource.id));
    setSelectedResource(null);
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
        text: taskText.trim(),
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
    const confirmed = window.confirm('Share this learning as an insight post?');
    if (!confirmed) return;

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
  };

  return (
    <div className="w-full max-w-[1700px] mx-auto pb-20 animate-in fade-in duration-700 space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-accent mb-3">Learning to action</p>
          <h1 className="text-3xl sm:text-4xl font-black text-text-main tracking-tight font-display uppercase">Growth</h1>
          <p className="text-sm text-text-secondary/70 mt-3 max-w-2xl font-medium">Learn with purpose. Turn resources into action.</p>
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
        <OverviewCard label="Active Learning" value={stats.learning} icon={PlayCircle} />
        <OverviewCard label="Resources Saved" value={stats.saved} icon={BookOpen} />
        <OverviewCard label="Completed" value={stats.completed} icon={CheckCircle2} />
        <OverviewCard label="Applied" value={stats.applied} icon={Check} />
        <OverviewCard label="Linked to Visions" value={stats.linked} icon={Target} />
      </div>

      <section className="bg-card border border-card-border rounded-[2rem] shadow-soft overflow-hidden">
        <div className="p-4 lg:p-5 border-b border-card-border space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'library', label: 'Learning Library' },
              { id: 'active', label: 'Active Learning' },
              { id: 'applied', label: 'Applied' },
              { id: 'paths', label: 'Learning Paths' },
              { id: 'skills', label: 'Skills' }
            ].map(tab => (
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
    <label className="h-11 rounded-xl bg-surface-muted border border-card-border px-3 flex items-center gap-2">
      <Filter size={14} className="text-text-secondary/40" />
      <select value={value} onChange={event => onChange(event.target.value)} className="bg-transparent outline-none text-xs font-black uppercase tracking-widest text-text-secondary min-w-36">
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-overlay/80 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }} className="relative w-full max-w-xl bg-app-container rounded-[2rem] border border-card-border shadow-2xl p-6">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-black uppercase tracking-tight text-text-main">{title}</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-text-secondary hover:text-text-main"><X size={18} /></button>
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
          <select value={form.source_type} onChange={event => setForm(current => ({ ...current, source_type: event.target.value as SourceType }))} className="h-12 rounded-2xl bg-surface-muted border border-card-border px-4 text-sm font-semibold outline-none focus:border-accent">
            {sourceTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          <input value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value }))} placeholder="Category" className="h-12 rounded-2xl bg-surface-muted border border-card-border px-4 text-sm font-semibold outline-none focus:border-accent" />
        </div>
        <select value={form.linked_vision_id} onChange={event => setForm(current => ({ ...current, linked_vision_id: event.target.value }))} className="w-full h-12 rounded-2xl bg-surface-muted border border-card-border px-4 text-sm font-semibold outline-none focus:border-accent">
          <option value="">Link to Vision optional</option>
          {visions.map(vision => <option key={vision.id} value={vision.id}>{vision.title}</option>)}
        </select>
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
  const [title, setTitle] = useState(resource.title);
  const [purpose, setPurpose] = useState(resource.purpose || '');
  const [linkedVisionId, setLinkedVisionId] = useState(resource.linked_vision_id || '');
  const [notes, setNotes] = useState(resource.notes || '');
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

  const saveResourceFields = async () => {
    if (!requireSessionUser()) return false;
    setIsSaving(true);
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
    if (saved) addToast({ type: 'success', title: 'Learning saved', description: 'Your session notes were saved.' });
    return !!saved;
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
        content: timestampContent.trim()
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
      .update({ content, updated_at: new Date().toISOString() })
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
    const nextTakeaways = [...takeaways, takeawayInput.trim()];
    setTakeaways(nextTakeaways);
    setTakeawayInput('');
    await onUpdate(resource.id, { key_takeaways: nextTakeaways });
  };

  const updateTakeaway = async (index: number, value: string) => {
    const nextTakeaways = takeaways.map((item, itemIndex) => itemIndex === index ? value : item).filter(Boolean);
    setTakeaways(nextTakeaways);
    await onUpdate(resource.id, { key_takeaways: nextTakeaways });
  };

  const deleteTakeaway = async (index: number) => {
    const nextTakeaways = takeaways.filter((_, itemIndex) => itemIndex !== index);
    setTakeaways(nextTakeaways);
    await onUpdate(resource.id, { key_takeaways: nextTakeaways });
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
        text: actionText.trim(),
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
    const { data, error } = await supabase
      .from('growth_action_points')
      .update({ ...updates, updated_at: new Date().toISOString() })
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

    const saved = await saveResourceFields();
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
        text: actionPoint.text,
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
    await saveResourceFields();
    onStatus(resource, 'completed');
  };

  const markApplied = async () => {
    if (!appliedNote.trim()) {
      addToast({ type: 'error', title: 'Applied note required', description: 'Describe how you applied the learning.' });
      return;
    }
    await saveResourceFields();
    onStatus(resource, 'applied', { applied_note: appliedNote });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-overlay/80 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.97, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 16 }} className="relative w-full max-w-[1500px] max-h-[94vh] overflow-hidden bg-app-container rounded-[2rem] border border-card-border shadow-2xl flex flex-col">
        <div className="shrink-0 bg-app-container/95 backdrop-blur border-b border-card-border p-4 lg:p-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-accent">Learning Session</p>
            <h2 className="text-lg lg:text-xl font-black text-text-main uppercase tracking-tight mt-1 truncate">{title}</h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-text-secondary hover:text-text-main shrink-0"><X size={18} /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 lg:p-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)] gap-5">
          <section className="space-y-4">
            <div className="bg-card border border-card-border rounded-[1.5rem] overflow-hidden shadow-sm">
              {videoId ? (
                <iframe
                  title={title}
                  src={`https://www.youtube.com/embed/${videoId}`}
                  className="w-full aspect-video bg-black"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="w-full aspect-video bg-surface-muted flex items-center justify-center text-center p-6">
                  <p className="text-xs font-black uppercase tracking-widest text-text-secondary/50">Paste a valid YouTube link to play this resource.</p>
                </div>
              )}
            </div>

            <div className="bg-card border border-card-border rounded-[1.5rem] p-4 space-y-3">
              <QuestionTitle number="1" title="What am I learning?" />
              <input value={title} onChange={event => setTitle(event.target.value)} className="w-full h-11 rounded-xl bg-surface-muted border border-card-border px-3 text-sm font-black outline-none focus:border-accent" />
              <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
                <span className={cn('px-3 py-1 rounded-full border', statusStyles[resource.status])}>{resource.status}</span>
                <span className="px-3 py-1 rounded-full border border-card-border bg-surface-muted text-text-secondary">YouTube</span>
                {resource.url && <a href={resource.url} target="_blank" rel="noreferrer" className="px-3 py-1 rounded-full border border-card-border bg-surface-muted text-accent inline-flex items-center gap-1"><ExternalLink size={11} /> Open on YouTube</a>}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="bg-card border border-card-border rounded-[1.5rem] p-4 space-y-3">
              <QuestionTitle number="2" title="Why am I learning it?" />
              <textarea value={purpose} onChange={event => setPurpose(event.target.value)} placeholder="Why is this resource useful for your growth?" className="w-full h-20 rounded-xl bg-surface-muted border border-card-border p-3 text-sm font-medium outline-none focus:border-accent resize-none" />
            </div>

            <div className="bg-card border border-card-border rounded-[1.5rem] p-4 space-y-3">
              <QuestionTitle number="3" title="How does it connect to my Visions?" />
              <select value={linkedVisionId} onChange={event => setLinkedVisionId(event.target.value)} className="w-full h-11 rounded-xl bg-surface-muted border border-card-border px-3 text-sm font-semibold outline-none focus:border-accent">
                <option value="">No Vision linked</option>
                {visions.map(vision => <option key={vision.id} value={vision.id}>{vision.title}</option>)}
              </select>
              {!linkedVisionId && <p className="text-xs font-semibold text-text-secondary/50">No Vision linked. Connect this resource to a Vision.</p>}
              {visionTitle && <p className="text-[10px] font-black uppercase tracking-widest text-accent">Currently linked to {visionTitle}</p>}
            </div>

            <div className="bg-card border border-card-border rounded-[1.5rem] p-4 space-y-3">
              <QuestionTitle number="4" title="What did I learn from it?" />
              <textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="No notes yet. Write what you learn." className="w-full h-28 rounded-xl bg-surface-muted border border-card-border p-3 text-sm font-medium outline-none focus:border-accent resize-none" />

              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/50">Timestamp Notes</p>
                <div className="grid grid-cols-[95px_minmax(0,1fr)_auto] gap-2">
                  <input value={timestampSeconds} onChange={event => setTimestampSeconds(event.target.value)} inputMode="numeric" placeholder="Seconds" className="h-10 rounded-xl bg-surface-muted border border-card-border px-3 text-xs font-semibold outline-none focus:border-accent" />
                  <input value={timestampContent} onChange={event => setTimestampContent(event.target.value)} placeholder="Add timestamp note" className="h-10 rounded-xl bg-surface-muted border border-card-border px-3 text-xs font-semibold outline-none focus:border-accent" />
                  <button onClick={addTimestampNote} className="h-10 px-3 rounded-xl bg-accent text-accent-contrast text-[9px] font-black uppercase tracking-widest">Add</button>
                </div>
                {isLoadingSession ? <Loader2 size={18} className="animate-spin text-accent" /> : timestampNotes.length === 0 ? (
                  <p className="text-xs font-semibold text-text-secondary/45">No notes yet. Write what you learn.</p>
                ) : (
                  <div className="space-y-2">
                    {timestampNotes.map(note => (
                      <div key={note.id} className="grid grid-cols-[72px_minmax(0,1fr)_auto] gap-2 items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-accent">{formatTimestamp(note.timestamp_seconds)}</span>
                        <input value={note.content} onChange={event => updateTimestampNote(note, event.target.value)} className="h-9 rounded-xl bg-surface-muted border border-card-border px-3 text-xs font-semibold outline-none focus:border-accent" />
                        <button onClick={() => deleteTimestampNote(note.id)} className="w-9 h-9 rounded-xl bg-danger/10 text-danger flex items-center justify-center"><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/50">Key Takeaways</p>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <input value={takeawayInput} onChange={event => setTakeawayInput(event.target.value)} placeholder="Add takeaway" className="h-10 rounded-xl bg-surface-muted border border-card-border px-3 text-xs font-semibold outline-none focus:border-accent" />
                  <button onClick={addTakeaway} className="h-10 px-3 rounded-xl bg-accent text-accent-contrast text-[9px] font-black uppercase tracking-widest">Add</button>
                </div>
                {takeaways.length === 0 ? <p className="text-xs font-semibold text-text-secondary/45">Add key takeaways from the video.</p> : (
                  <div className="space-y-2">
                    {takeaways.map((takeaway, index) => (
                      <div key={`${takeaway}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                        <input value={takeaway} onChange={event => updateTakeaway(index, event.target.value)} className="h-9 rounded-xl bg-surface-muted border border-card-border px-3 text-xs font-semibold outline-none focus:border-accent" />
                        <button onClick={() => deleteTakeaway(index)} className="w-9 h-9 rounded-xl bg-danger/10 text-danger flex items-center justify-center"><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card border border-card-border rounded-[1.5rem] p-4 space-y-3">
              <QuestionTitle number="5" title="Did I apply it?" />
              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/50">Action Points</p>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <input value={actionText} onChange={event => setActionText(event.target.value)} placeholder="No action points yet. Turn learning into action." className="h-10 rounded-xl bg-surface-muted border border-card-border px-3 text-xs font-semibold outline-none focus:border-accent" />
                  <button onClick={addActionPoint} className="h-10 px-3 rounded-xl bg-accent text-accent-contrast text-[9px] font-black uppercase tracking-widest">Add</button>
                </div>
                {actionPoints.length === 0 ? <p className="text-xs font-semibold text-text-secondary/45">No action points yet. Turn learning into action.</p> : (
                  <div className="space-y-2">
                    {actionPoints.map(actionPoint => (
                      <div key={actionPoint.id} className="rounded-xl bg-surface-muted border border-card-border p-3 space-y-2">
                        <input value={actionPoint.text} onChange={event => updateActionPoint(actionPoint, { text: event.target.value })} className="w-full h-9 rounded-lg bg-card border border-card-border px-3 text-xs font-semibold outline-none focus:border-accent" />
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => updateActionPoint(actionPoint, { completed: !actionPoint.completed })} className={cn('h-8 px-3 rounded-lg text-[8px] font-black uppercase tracking-widest', actionPoint.completed ? 'bg-success text-white' : 'bg-card border border-card-border text-text-secondary')}>{actionPoint.completed ? 'Complete' : 'Mark Complete'}</button>
                          <button onClick={() => convertActionPointToTask(actionPoint)} disabled={!!actionPoint.converted_task_id} className="h-8 px-3 rounded-lg bg-card border border-card-border text-[8px] font-black uppercase tracking-widest text-text-secondary disabled:opacity-50">{actionPoint.converted_task_id ? 'Task Created' : 'Convert to Task'}</button>
                          <button onClick={() => deleteActionPoint(actionPoint.id)} className="h-8 px-3 rounded-lg bg-danger/10 text-danger text-[8px] font-black uppercase tracking-widest">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <textarea value={appliedNote} onChange={event => setAppliedNote(event.target.value)} placeholder="How did you apply this?" className="w-full h-20 rounded-xl bg-surface-muted border border-card-border p-3 text-sm font-medium outline-none focus:border-accent resize-none" />
            </div>
          </aside>
        </div>

        <div className="shrink-0 border-t border-card-border bg-app-container/95 backdrop-blur p-4 flex flex-wrap gap-2 justify-end">
          <button onClick={saveResourceFields} disabled={isSaving || !title.trim()} className="h-10 px-4 rounded-xl bg-accent text-accent-contrast text-[9px] font-black uppercase tracking-widest disabled:opacity-50">{isSaving ? 'Saving...' : 'Save Session'}</button>
          <button onClick={markCompleted} className="h-10 px-4 rounded-xl bg-card border border-card-border text-[9px] font-black uppercase tracking-widest text-text-secondary">Mark Completed</button>
          <button onClick={markApplied} className="h-10 px-4 rounded-xl bg-success text-white text-[9px] font-black uppercase tracking-widest">Mark Applied</button>
          <button onClick={() => onShareInsight({ ...resource, notes, applied_note: appliedNote })} className="h-10 px-4 rounded-xl bg-card border border-card-border text-[9px] font-black uppercase tracking-widest text-text-secondary">Share Insight</button>
          <button onClick={() => onDelete(resource)} className="h-10 px-4 rounded-xl bg-danger/10 border border-danger/20 text-[9px] font-black uppercase tracking-widest text-danger">Delete</button>
        </div>
      </motion.div>
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-overlay/80 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }} className="relative w-full max-w-6xl max-h-[92vh] overflow-y-auto custom-scrollbar bg-app-container rounded-[2rem] border border-card-border shadow-2xl">
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
              <select value={linkedVisionId} onChange={event => setLinkedVisionId(event.target.value)} className="w-full h-12 rounded-2xl bg-card border border-card-border px-4 text-sm font-semibold outline-none focus:border-accent">
                <option value="">No Vision linked</option>
                {visions.map(vision => <option key={vision.id} value={vision.id}>{vision.title}</option>)}
              </select>
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
