import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Archive,
  Calendar,
  CheckSquare,
  Clock,
  FileText,
  Image as ImageIcon,
  Loader2,
  Lock,
  Plus,
  Trash2,
  Unlock,
  X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase, uploadCapsuleImage } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { NovaCapsule, NovaCapsuleItem, NovaCapsuleItemType } from '../../types';

type CapsuleTab = 'upcoming' | 'unlocked' | 'opened' | 'draft';
type BuilderMode = 'create' | 'edit';
type PickerKind = 'note' | 'journal' | 'task' | 'vision';

const itemLabels: Record<NovaCapsuleItemType, string> = {
  note: 'Note',
  journal: 'Journal',
  task: 'Task',
  vision: 'Vision',
  milestone: 'Milestone',
  achievement: 'Achievement',
  image: 'Image',
  file: 'File',
  text: 'Text'
};

const defaultUnlockValues = () => {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return {
    date: date.toISOString().slice(0, 10),
    time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  };
};

const toLocalCapsule = (row: any): NovaCapsule => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  message: row.message || '',
  status: row.status || 'draft',
  unlockAt: row.unlock_at,
  notify: row.notify ?? true,
  openedAt: row.opened_at,
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at || row.created_at).getTime(),
  items: (row.items || []).map((item: any) => ({
    id: item.id,
    capsuleId: item.capsule_id,
    userId: item.user_id,
    itemType: item.item_type,
    sourceId: item.source_id,
    title: item.title,
    content: item.content,
    mediaUrl: item.media_url,
    storagePath: item.storage_path,
    metadata: item.metadata || {},
    createdAt: new Date(item.created_at).getTime()
  }))
});

export default function NovaClock() {
  const { session, addToast } = useStore();
  const userId = session?.user?.id;
  const [capsules, setCapsules] = useState<NovaCapsule[]>([]);
  const [activeTab, setActiveTab] = useState<CapsuleTab>('upcoming');
  const [isLoading, setIsLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderMode, setBuilderMode] = useState<BuilderMode>('create');
  const [editingCapsule, setEditingCapsule] = useState<NovaCapsule | null>(null);
  const [detailCapsule, setDetailCapsule] = useState<NovaCapsule | null>(null);

  const loadCapsules = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('nova_capsules')
      .select('*, items:nova_capsule_items(*)')
      .eq('user_id', userId)
      .order('unlock_at', { ascending: true });

    if (error) {
      console.error('Failed to load NovaCapsules:', error);
      addToast({ type: 'error', title: 'Nova Clock failed', description: 'Could not load NovaCapsules.' });
      setCapsules([]);
    } else {
      const localCapsules = (data || []).map(toLocalCapsule);
      const refreshedCapsules = await Promise.all(localCapsules.map(async capsule => ({
        ...capsule,
        items: await Promise.all(capsule.items.map(async item => {
          if (!item.storagePath) return item;
          const { data: signed } = await supabase.storage.from('nova-capsules').createSignedUrl(item.storagePath, 60 * 60 * 24 * 7);
          return { ...item, mediaUrl: signed?.signedUrl || item.mediaUrl };
        }))
      })));
      setCapsules(refreshedCapsules);
    }
    setIsLoading(false);
  };

  const checkUnlockedCapsules = async () => {
    if (!userId) return;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('nova_capsules')
      .update({ status: 'unlocked', updated_at: now })
      .eq('user_id', userId)
      .eq('status', 'locked')
      .lte('unlock_at', now)
      .select('id,title,notify');

    if (error) {
      console.error('Failed to unlock NovaCapsules:', error);
      return;
    }

    const unlocked = data || [];
    if (unlocked.length > 0) {
      const notifications = unlocked
        .filter((capsule: any) => capsule.notify)
        .map((capsule: any) => ({
          user_id: userId,
          actor_id: userId,
          type: 'nova_capsule_unlocked',
          message: `Your NovaCapsule "${capsule.title}" is ready to open.`,
          is_read: false
        }));

      if (notifications.length > 0) {
        const { error: notificationError } = await supabase.from('notifications').insert(notifications);
        if (notificationError) console.error('Failed to create NovaCapsule notifications:', notificationError);
      }
    }
  };

  useEffect(() => {
    checkUnlockedCapsules().then(loadCapsules);
  }, [userId]);

  const categorized = useMemo(() => ({
    upcoming: capsules.filter(capsule => capsule.status === 'locked'),
    unlocked: capsules.filter(capsule => capsule.status === 'unlocked'),
    opened: capsules.filter(capsule => capsule.status === 'opened'),
    draft: capsules.filter(capsule => capsule.status === 'draft')
  }), [capsules]);

  const openBuilder = (capsule?: NovaCapsule) => {
    setEditingCapsule(capsule || null);
    setBuilderMode(capsule ? 'edit' : 'create');
    setBuilderOpen(true);
  };

  const deleteCapsule = async (capsule: NovaCapsule) => {
    if (!userId || !confirm(`Delete "${capsule.title}"?`)) return;
    const paths = capsule.items.map(item => item.storagePath).filter(Boolean) as string[];
    if (paths.length > 0) {
      const { error } = await supabase.storage.from('nova-capsules').remove(paths);
      if (error) console.error('Failed to delete NovaCapsule files:', error);
    }

    const { error } = await supabase.from('nova_capsules').delete().eq('id', capsule.id).eq('user_id', userId);
    if (error) {
      console.error('Failed to delete NovaCapsule:', error);
      addToast({ type: 'error', title: 'Delete failed', description: 'Could not delete this NovaCapsule.' });
      return;
    }
    setCapsules(current => current.filter(item => item.id !== capsule.id));
    addToast({ type: 'success', title: 'NovaCapsule deleted', description: 'The NovaCapsule was removed.' });
  };

  const openCapsule = async (capsule: NovaCapsule) => {
    if (capsule.status === 'locked') return;
    if (capsule.status === 'unlocked') {
      const openedAt = new Date().toISOString();
      const { error } = await supabase
        .from('nova_capsules')
        .update({ status: 'opened', opened_at: openedAt, updated_at: openedAt })
        .eq('id', capsule.id)
        .eq('user_id', userId);
      if (error) {
        console.error('Failed to open NovaCapsule:', error);
        addToast({ type: 'error', title: 'Open failed', description: 'Could not open this NovaCapsule.' });
        return;
      }
      const nextCapsule = { ...capsule, status: 'opened' as const, openedAt };
      setCapsules(current => current.map(item => item.id === capsule.id ? nextCapsule : item));
      setDetailCapsule(nextCapsule);
      return;
    }
    setDetailCapsule(capsule);
  };

  const activeCapsules = categorized[activeTab];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-[10px] font-black uppercase tracking-widest">
            <Clock size={14} /> Nova Clock
          </div>
          <div>
            <h1 className="text-5xl font-black tracking-tight text-text-main">Nova Clock</h1>
            <p className="text-text-secondary font-medium mt-2">Create NovaCapsules for your future self.</p>
          </div>
        </div>
        <button
          onClick={() => openBuilder()}
          className="h-12 px-6 rounded-2xl bg-accent text-accent-contrast flex items-center gap-3 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/10 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Plus size={18} /> New NovaCapsule
        </button>
      </header>

      <div className="flex flex-wrap gap-2 bg-card border border-card-border rounded-2xl p-2">
        {([
          ['upcoming', 'Upcoming NovaCapsules'],
          ['unlocked', 'Unlocked NovaCapsules'],
          ['opened', 'Opened NovaCapsules'],
          ['draft', 'Draft NovaCapsules']
        ] as [CapsuleTab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "h-11 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === id ? "bg-accent text-accent-contrast shadow-sm" : "text-text-secondary hover:bg-surface-muted"
            )}
          >
            {label} ({categorized[id].length})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-96 flex items-center justify-center">
          <Loader2 className="animate-spin text-accent" size={32} />
        </div>
      ) : activeCapsules.length === 0 ? (
        <EmptyState tab={activeTab} onCreate={() => openBuilder()} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {activeCapsules.map(capsule => (
            <NovaCapsuleCard
              key={capsule.id}
              capsule={capsule}
              onContinue={() => openBuilder(capsule)}
              onOpen={() => openCapsule(capsule)}
              onDelete={() => deleteCapsule(capsule)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {builderOpen && (
          <NovaCapsuleBuilder
            mode={builderMode}
            capsule={editingCapsule}
            onClose={() => setBuilderOpen(false)}
            onChanged={() => {
              setBuilderOpen(false);
              loadCapsules();
            }}
          />
        )}
        {detailCapsule && (
          <NovaCapsuleDetail capsule={detailCapsule} onClose={() => setDetailCapsule(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ tab, onCreate }: { tab: CapsuleTab; onCreate: () => void }) {
  const copy: Record<CapsuleTab, string> = {
    upcoming: 'No locked NovaCapsules yet.',
    unlocked: 'Nothing ready to open yet.',
    opened: 'Opened NovaCapsules will appear here.',
    draft: 'Create your first NovaCapsule.'
  };

  return (
    <div className="h-96 rounded-[2rem] border border-dashed border-card-border bg-card flex flex-col items-center justify-center gap-5 text-center">
      <Archive size={40} className="text-text-secondary/25" />
      <p className="text-sm font-bold text-text-secondary">{copy[tab]}</p>
      <button onClick={onCreate} className="h-11 px-5 rounded-xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest">
        New NovaCapsule
      </button>
    </div>
  );
}

function NovaCapsuleCard({ capsule, onContinue, onOpen, onDelete }: {
  capsule: NovaCapsule;
  onContinue: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const locked = capsule.status === 'locked';
  const actionLabel = capsule.status === 'draft' ? 'Continue Draft' : capsule.status === 'locked' ? 'Locked' : capsule.status === 'unlocked' ? 'Open NovaCapsule' : 'View Again';

  return (
    <motion.div layout className="bg-card border border-card-border rounded-[2rem] p-6 space-y-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <h3 className="text-lg font-black text-text-main tracking-tight truncate">{capsule.title}</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50 flex items-center gap-2">
            <Calendar size={12} /> Opens on {new Date(capsule.unlockAt).toLocaleString()}
          </p>
        </div>
        <span className={cn(
          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
          capsule.status === 'locked' && "bg-accent/10 text-accent",
          capsule.status === 'unlocked' && "bg-success/10 text-success",
          capsule.status === 'opened' && "bg-surface-muted text-text-secondary",
          capsule.status === 'draft' && "bg-warning/10 text-warning"
        )}>
          {capsule.status}
        </span>
      </div>

      <div className="rounded-2xl bg-surface-muted border border-card-border/50 p-5 flex items-center justify-between">
        <div>
          <p className="text-2xl font-black text-text-main">{capsule.items.length}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/50">Capsule Items</p>
        </div>
        {locked ? <Lock className="text-accent" /> : <Unlock className="text-success" />}
      </div>

      <div className="flex gap-2">
        <button
          onClick={capsule.status === 'draft' ? onContinue : onOpen}
          disabled={locked}
          className="flex-1 h-11 rounded-xl bg-accent text-accent-contrast disabled:bg-surface-muted disabled:text-text-secondary/40 text-[10px] font-black uppercase tracking-widest"
        >
          {actionLabel}
        </button>
        <button onClick={onDelete} className="w-11 h-11 rounded-xl border border-card-border text-text-secondary hover:text-danger hover:border-danger/30 flex items-center justify-center">
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );
}

function NovaCapsuleBuilder({ mode, capsule, onClose, onChanged }: {
  mode: BuilderMode;
  capsule: NovaCapsule | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { session, addToast } = useStore();
  const userId = session?.user?.id;
  const defaults = defaultUnlockValues();
  const [capsuleId, setCapsuleId] = useState(capsule?.id || '');
  const [title, setTitle] = useState(capsule?.title || '');
  const [message, setMessage] = useState(capsule?.message || '');
  const [unlockDate, setUnlockDate] = useState(capsule?.unlockAt ? capsule.unlockAt.slice(0, 10) : defaults.date);
  const [unlockTime, setUnlockTime] = useState(capsule?.unlockAt ? new Date(capsule.unlockAt).toTimeString().slice(0, 5) : defaults.time);
  const [notify, setNotify] = useState(capsule?.notify ?? true);
  const [items, setItems] = useState<NovaCapsuleItem[]>(capsule?.items || []);
  const [pickerKind, setPickerKind] = useState<PickerKind | null>(null);
  const [pickerItems, setPickerItems] = useState<any[]>([]);
  const [isPickerLoading, setIsPickerLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const unlockAt = () => new Date(`${unlockDate}T${unlockTime}`).toISOString();

  const ensureDraft = async () => {
    if (capsuleId) return capsuleId;
    if (!userId) throw new Error('Sign in to create a NovaCapsule.');

    const { data, error } = await supabase
      .from('nova_capsules')
      .insert({
        user_id: userId,
        title: title.trim() || 'Untitled NovaCapsule',
        message,
        status: 'draft',
        unlock_at: unlockAt(),
        notify
      })
      .select('*')
      .single();

    if (error) throw error;
    setCapsuleId(data.id);
    return data.id;
  };

  const saveDraft = async () => {
    if (!userId) return false;
    setIsSaving(true);
    try {
      const id = await ensureDraft();
      const { error } = await supabase
        .from('nova_capsules')
        .update({
          title: title.trim() || 'Untitled NovaCapsule',
          message,
          unlock_at: unlockAt(),
          notify,
          status: 'draft',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      addToast({ type: 'success', title: 'Draft saved', description: 'Your NovaCapsule draft was saved.' });
      onChanged();
      return true;
    } catch (error: any) {
      console.error('Failed to save NovaCapsule draft:', error);
      addToast({ type: 'error', title: 'Draft failed', description: error.message || 'Could not save this draft.' });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const insertItem = async (item: Omit<NovaCapsuleItem, 'id' | 'capsuleId' | 'userId' | 'createdAt'>) => {
    const id = await ensureDraft();
    const { data, error } = await supabase
      .from('nova_capsule_items')
      .insert({
        capsule_id: id,
        user_id: userId,
        item_type: item.itemType,
        source_id: item.sourceId || null,
        title: item.title || null,
        content: item.content || null,
        media_url: item.mediaUrl || null,
        storage_path: item.storagePath || null,
        metadata: item.metadata || {}
      })
      .select('*')
      .single();

    if (error) throw error;
    const localItem = toLocalCapsule({ id, user_id: userId, title: '', unlock_at: new Date().toISOString(), items: [data] }).items[0];
    setItems(current => [...current, localItem]);
  };

  const removeItem = async (item: NovaCapsuleItem) => {
    setItems(current => current.filter(existing => existing.id !== item.id));
    const { error } = await supabase.from('nova_capsule_items').delete().eq('id', item.id).eq('user_id', userId);
    if (error) {
      console.error('Failed to remove NovaCapsule item:', error);
      addToast({ type: 'error', title: 'Remove failed', description: 'Could not remove this item.' });
    }
    if (item.storagePath) {
      await supabase.storage.from('nova-capsules').remove([item.storagePath]);
    }
  };

  const addTextItem = async () => {
    const text = window.prompt('Add a custom text item');
    if (!text?.trim()) return;
    await insertItem({ itemType: 'text', title: 'Custom Text', content: text.trim(), metadata: {} });
  };

  const loadPicker = async (kind: PickerKind) => {
    if (!userId) return;
    setPickerKind(kind);
    setIsPickerLoading(true);
    try {
      if (kind === 'note' || kind === 'journal') {
        const noteType = kind === 'note' ? 'vault' : 'journal';
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', userId)
          .eq('note_type', noteType)
          .eq('is_deleted', false)
          .order('updated_at', { ascending: false })
          .limit(40);
        if (error) throw error;
        setPickerItems(data || []);
      } else if (kind === 'task') {
        const [{ data: tasks, error: taskError }, { data: todos, error: todoError }] = await Promise.all([
          supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
          supabase.from('todos').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30)
        ]);
        if (taskError) throw taskError;
        if (todoError) throw todoError;
        setPickerItems([...(tasks || []), ...(todos || []).map((todo: any) => ({ ...todo, is_todo: true }))]);
      } else {
        const { data, error } = await supabase
          .from('visions')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(30);
        if (error) throw error;
        setPickerItems(data || []);
      }
    } catch (error) {
      console.error('Failed to load NovaCapsule picker:', error);
      addToast({ type: 'error', title: 'Items failed', description: 'Could not load these items.' });
    } finally {
      setIsPickerLoading(false);
    }
  };

  const addPickedItem = async (row: any) => {
    if (!pickerKind) return;
    const snapshots: Record<PickerKind, Omit<NovaCapsuleItem, 'id' | 'capsuleId' | 'userId' | 'createdAt'>> = {
      note: {
        itemType: 'note',
        sourceId: row.id,
        title: row.title,
        content: row.content,
        metadata: { tags: row.tags, note_type: row.note_type, created_at: row.created_at }
      },
      journal: {
        itemType: 'journal',
        sourceId: row.id,
        title: row.title || `Journal ${row.journal_date || ''}`,
        content: row.content,
        metadata: { journal_date: row.journal_date, mood: row.mood, tags: row.tags }
      },
      task: {
        itemType: 'task',
        sourceId: row.id,
        title: row.text,
        content: row.text,
        metadata: { completed: row.completed, vision_id: row.vision_id, is_todo: !!row.is_todo, created_at: row.created_at }
      },
      vision: {
        itemType: 'vision',
        sourceId: row.id,
        title: row.title,
        content: row.description,
        metadata: { progress: row.progress, status: row.status, category: row.category, tags: row.tags }
      }
    };
    await insertItem(snapshots[pickerKind]);
  };

  const importImage = async (file: File) => {
    if (!userId) return;
    setIsUploading(true);
    try {
      const id = await ensureDraft();
      const { signedUrl, filePath } = await uploadCapsuleImage(file, id, userId);
      await insertItem({
        itemType: 'image',
        title: file.name,
        mediaUrl: signedUrl,
        storagePath: filePath,
        metadata: { size: file.size, type: file.type }
      });
      addToast({ type: 'success', title: 'Image added', description: 'Image was added to the NovaCapsule.' });
    } catch (error: any) {
      console.error('Failed to import NovaCapsule image:', error);
      addToast({ type: 'error', title: 'Import failed', description: error.message || 'Could not import this image.' });
    } finally {
      setIsUploading(false);
    }
  };

  const lockCapsule = async () => {
    const chosenUnlock = new Date(`${unlockDate}T${unlockTime}`);
    if (!title.trim()) {
      addToast({ type: 'error', title: 'Add a title.', description: 'NovaCapsules need a title before locking.' });
      return;
    }
    if (Number.isNaN(chosenUnlock.getTime()) || chosenUnlock <= new Date()) {
      addToast({ type: 'error', title: 'Choose a future unlock date.', description: 'Unlock Date and Unlock Time must be in the future.' });
      return;
    }
    if (!message.trim() && items.length === 0) {
      addToast({ type: 'error', title: 'Add a message or at least one item.', description: 'NovaCapsules cannot be locked empty.' });
      return;
    }
    if (isUploading) {
      addToast({ type: 'error', title: 'Finish uploading files before locking.', description: 'Wait for imports to complete.' });
      return;
    }

    setIsSaving(true);
    try {
      const id = await ensureDraft();
      const { error } = await supabase
        .from('nova_capsules')
        .update({
          title: title.trim(),
          message,
          unlock_at: chosenUnlock.toISOString(),
          notify,
          status: 'locked',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      addToast({ type: 'success', title: 'NovaCapsule locked', description: `It opens on ${chosenUnlock.toLocaleString()}.` });
      onChanged();
    } catch (error: any) {
      console.error('Failed to lock NovaCapsule:', error);
      addToast({ type: 'error', title: 'Lock failed', description: error.message || 'Could not lock this NovaCapsule.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-overlay/70 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.96 }} className="relative w-full max-w-6xl max-h-[92vh] overflow-hidden bg-app-container border border-card-border rounded-[2rem] shadow-2xl flex flex-col">
        <div className="p-6 border-b border-card-border flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-text-main tracking-tight">{mode === 'edit' ? 'Draft NovaCapsule' : 'New NovaCapsule'}</h2>
            <p className="text-xs text-text-secondary mt-1">Capture something now, lock it, and open it later.</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-surface-muted text-text-secondary hover:text-text-main flex items-center justify-center">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <div className="space-y-5">
            <input value={title} onChange={event => setTitle(event.target.value)} placeholder="NovaCapsule title" className="w-full h-14 rounded-2xl bg-card border border-card-border px-5 text-lg font-black text-text-main focus:outline-none focus:border-accent" />
            <textarea value={message} onChange={event => setMessage(event.target.value)} placeholder="Personal message for your future self..." className="w-full h-36 rounded-2xl bg-card border border-card-border p-5 text-sm font-medium text-text-secondary focus:outline-none focus:border-accent resize-none" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50">Unlock Date</span>
                <input type="date" value={unlockDate} onChange={event => setUnlockDate(event.target.value)} className="w-full h-12 rounded-xl bg-card border border-card-border px-4 text-sm font-bold" />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50">Unlock Time</span>
                <input type="time" value={unlockTime} onChange={event => setUnlockTime(event.target.value)} className="w-full h-12 rounded-xl bg-card border border-card-border px-4 text-sm font-bold" />
              </label>
              <label className="h-full pt-6 flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={notify} onChange={event => setNotify(event.target.checked)} className="w-5 h-5 accent-accent" />
                <span className="text-xs font-black uppercase tracking-widest text-text-secondary">Notify me</span>
              </label>
            </div>

            <div
              onDragOver={event => event.preventDefault()}
              onDrop={event => {
                event.preventDefault();
                const file = Array.from(event.dataTransfer.files || []).find(item => item.type.startsWith('image/'));
                if (file) importImage(file);
              }}
              className="rounded-[2rem] border border-dashed border-card-border bg-card p-8 text-center space-y-4"
            >
              <ImageIcon className="mx-auto text-text-secondary/30" size={32} />
              <p className="text-xs font-bold text-text-secondary">Drop images here or import from device.</p>
              <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="h-10 px-5 rounded-xl bg-surface-muted text-text-secondary hover:text-accent text-[10px] font-black uppercase tracking-widest">
                {isUploading ? 'Uploading...' : 'Import from Device'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event => {
                const file = event.target.files?.[0];
                if (file) importImage(file);
                event.target.value = '';
              }} />
            </div>

            <section className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50">Capsule Items</h3>
              {items.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-card-border text-center text-xs font-bold text-text-secondary/40">Add notes, tasks, journal entries, images, or a message.</div>
              ) : (
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="p-4 rounded-2xl bg-card border border-card-border flex items-center gap-3">
                      <ItemIcon type={item.itemType} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-text-main truncate">{item.title || itemLabels[item.itemType]}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/40">{itemLabels[item.itemType]}</p>
                      </div>
                      <button onClick={() => removeItem(item)} className="w-9 h-9 rounded-xl text-text-secondary hover:text-danger hover:bg-danger/10 flex items-center justify-center">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[2rem] bg-card border border-card-border p-5 space-y-3">
              <h3 className="text-sm font-black text-text-main">Add Items</h3>
              <div className="grid grid-cols-2 gap-2">
                <AddButton label="Add from Notes" onClick={() => loadPicker('note')} />
                <AddButton label="Add from Journal" onClick={() => loadPicker('journal')} />
                <AddButton label="Add Tasks" onClick={() => loadPicker('task')} />
                <AddButton label="Add Vision" onClick={() => loadPicker('vision')} />
                <AddButton label="Add Text" onClick={addTextItem} />
                <AddButton label="Add Images" onClick={() => fileInputRef.current?.click()} />
              </div>
            </div>

            {pickerKind && (
              <div className="rounded-[2rem] bg-card border border-card-border p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-text-main">Choose {pickerKind}</h3>
                  <button onClick={() => setPickerKind(null)} className="text-text-secondary"><X size={16} /></button>
                </div>
                <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-2">
                  {isPickerLoading ? <Loader2 className="animate-spin text-accent mx-auto my-8" /> : pickerItems.length === 0 ? (
                    <p className="text-xs font-bold text-text-secondary/40 text-center py-8">No items found.</p>
                  ) : pickerItems.map(row => (
                    <button key={`${pickerKind}-${row.id}`} onClick={() => addPickedItem(row)} className="w-full p-3 rounded-xl bg-surface-muted text-left hover:bg-accent/5 transition-all">
                      <p className="text-xs font-bold text-text-main truncate">{row.title || row.text || 'Untitled'}</p>
                      <p className="text-[10px] text-text-secondary/50 truncate">{row.content || row.description || row.text || 'Snapshot item'}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        <div className="p-6 border-t border-card-border flex justify-end gap-3">
          <button onClick={saveDraft} disabled={isSaving} className="h-12 px-6 rounded-xl bg-surface-muted text-text-secondary text-[10px] font-black uppercase tracking-widest">Save Draft</button>
          <button onClick={lockCapsule} disabled={isSaving || isUploading} className="h-12 px-7 rounded-xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            Lock NovaCapsule
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick} className="h-11 rounded-xl bg-surface-muted text-text-secondary hover:text-accent text-[9px] font-black uppercase tracking-widest">{label}</button>;
}

function ItemIcon({ type }: { type: NovaCapsuleItemType }) {
  const icon = type === 'image' ? <ImageIcon size={16} /> : type === 'task' ? <CheckSquare size={16} /> : <FileText size={16} />;
  return <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">{icon}</div>;
}

function NovaCapsuleDetail({ capsule, onClose }: { capsule: NovaCapsule; onClose: () => void }) {
  const locked = capsule.status === 'locked';

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-overlay/75 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar bg-app-container border border-card-border rounded-[2rem] shadow-2xl p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-text-main">{capsule.title}</h2>
            <p className="text-xs font-bold text-text-secondary mt-2">Opens on {new Date(capsule.unlockAt).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-surface-muted text-text-secondary hover:text-text-main flex items-center justify-center"><X size={18} /></button>
        </div>

        {locked ? (
          <div className="py-24 rounded-[2rem] bg-card border border-dashed border-card-border text-center space-y-4">
            <Lock className="mx-auto text-accent" size={42} />
            <p className="text-sm font-bold text-text-main">This NovaCapsule opens on {new Date(capsule.unlockAt).toLocaleString()}.</p>
          </div>
        ) : (
          <>
            {capsule.message && <div className="p-6 rounded-[2rem] bg-card border border-card-border text-text-main font-medium leading-relaxed whitespace-pre-wrap">{capsule.message}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {capsule.items.map(item => (
                <div key={item.id} className="p-5 rounded-2xl bg-card border border-card-border space-y-3">
                  <div className="flex items-center gap-3">
                    <ItemIcon type={item.itemType} />
                    <div className="min-w-0">
                      <p className="text-sm font-black text-text-main truncate">{item.title || itemLabels[item.itemType]}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/40">{itemLabels[item.itemType]}</p>
                    </div>
                  </div>
                  {item.mediaUrl && <img src={item.mediaUrl} alt={item.title || 'NovaCapsule item'} className="w-full rounded-xl border border-card-border" />}
                  {item.content && <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap line-clamp-6">{item.content}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
