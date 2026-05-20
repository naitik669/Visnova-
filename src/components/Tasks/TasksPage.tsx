import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Circle, Clock3, Filter, Flag, Link2, Plus, Search, Sparkles, Trash2, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../store/useStore';
import type { Task, Vision } from '../../types';
import { cn } from '../../lib/utils';
import { safeArray, safeString } from '../../lib/safeData';
import { safeFormat } from '../../lib/dateUtils';
import { SelectMenu } from '../ui/SelectMenu';
import { ResponsiveModal } from '../ui/ResponsiveModal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ProgressLogComposer } from '../Progress/ProgressLogComposer';

type TaskStatus = NonNullable<Task['status']>;
type BoardTask = Task & { visionId: string; visionTitle: string; visionCategory?: string; reactKey: string };

const COLUMNS: Array<{ id: TaskStatus; label: string; empty: string }> = [
  { id: 'planned', label: 'Planned', empty: 'Break a Vision into the next small move.' },
  { id: 'today', label: 'Today', empty: 'Nothing planned for today.' },
  { id: 'in_progress', label: 'Doing', empty: 'Start one useful move.' },
  { id: 'proof_needed', label: 'Proof Needed', empty: 'All clear. Completed work has proof.' },
  { id: 'done', label: 'Done', empty: 'Complete your first task and turn it into proof.' }
];

const PRIORITY_COLORS = {
  low: 'bg-[#E7F0FF] border-[#C8DAFF] text-[#315A9C]',
  medium: 'bg-[#F3E9FF] border-[#DDC8FF] text-[#6D3C9B]',
  high: 'bg-[#FFE4E5] border-[#F6C4C8] text-[#9B3C45]'
} satisfies Record<NonNullable<Task['priority']>, string>;

function normalizeTaskStatus(task: Task): TaskStatus {
  if (task.status) return task.status;
  if (task.completed) return 'done';
  return task.scheduledDate && safeFormat(task.scheduledDate, 'yyyy-MM-dd') === safeFormat(new Date(), 'yyyy-MM-dd') ? 'today' : 'planned';
}

function getTaskProgress(task: Task) {
  if (task.completed) return 100;
  if (typeof task.progressPercent === 'number') return Math.max(0, Math.min(100, task.progressPercent));
  const checklist = safeArray(task.checklist || task.subTasks);
  if (checklist.length) return Math.round((checklist.filter((item: any) => item.completed).length / checklist.length) * 100);
  return normalizeTaskStatus(task) === 'in_progress' ? 45 : normalizeTaskStatus(task) === 'proof_needed' ? 90 : 15;
}

export default function TasksPage() {
  const visions = useStore(state => state.visions);
  const fetchVisions = useStore(state => state.fetchVisions);
  const addVisionTask = useStore(state => state.addVisionTask);
  const updateVisionTask = useStore(state => state.updateVisionTask);
  const deleteVisionTask = useStore(state => state.deleteVisionTask);
  const addToast = useStore(state => state.addToast);
  const [query, setQuery] = useState('');
  const [visionFilter, setVisionFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [mobileStatus, setMobileStatus] = useState<TaskStatus>('today');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<BoardTask | null>(null);
  const [proofVisionId, setProofVisionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BoardTask | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (visions.length === 0) fetchVisions().catch(error => console.error('Tasks page vision load failed:', error));
  }, [fetchVisions, visions.length]);

  const tasks = useMemo<BoardTask[]>(() => {
    return safeArray<Vision>(visions).flatMap(vision =>
      safeArray<Task>(vision.tasks)
        .filter(task => !task.deletedAt)
        .map(task => ({
          ...task,
          status: normalizeTaskStatus(task),
          priority: task.priority || 'medium',
          visionId: vision.id,
          visionTitle: vision.title,
          visionCategory: vision.category,
          reactKey: `${vision.id}-${task.id}`
        }))
    );
  }, [visions]);

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter(task => {
      if (visionFilter !== 'all' && task.visionId !== visionFilter) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (q) {
        const haystack = [
          task.text,
          task.description,
          task.visionTitle,
          task.visionCategory,
          ...safeArray<string>(task.tags)
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [priorityFilter, query, tasks, visionFilter]);

  const columnTasks = useMemo(() => {
    const map = new Map<TaskStatus, BoardTask[]>();
    COLUMNS.forEach(column => map.set(column.id, []));
    filteredTasks.forEach(task => map.get(normalizeTaskStatus(task))?.push(task));
    return map;
  }, [filteredTasks]);

  const handleStatusChange = async (task: BoardTask, status: TaskStatus) => {
    if (status === 'done' && !task.completed) {
      setDetailTask(task);
      addToast({ type: 'info', title: 'Proof check', description: 'Use Log Proof if this completed task has visible progress.' });
    }
    await updateVisionTask(task.visionId, task.id, { status });
  };

  const handleCreate = async (payload: Partial<Task> & { text: string; visionId: string }) => {
    const created = await addVisionTask(payload.visionId, payload);
    if (created) setCreateOpen(false);
  };

  const visionOptions = [
    { value: 'all', label: 'All Visions' },
    ...safeArray<Vision>(visions).map(vision => ({ value: vision.id, label: vision.title }))
  ];

  return (
    <div className="mx-auto flex h-full max-w-[1600px] flex-col gap-4 overflow-hidden">
      <div className="rounded-[2rem] border border-card-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-accent">Tasks</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-text-main">Next moves</h1>
            <p className="mt-1 text-sm font-semibold text-text-secondary">Plan your tasks, connect them to Visions, and turn completed work into proof.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/40" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search tasks, visions, tags..."
                className="h-11 w-full rounded-2xl border border-card-border bg-bg-base pl-9 pr-3 text-xs font-bold text-text-main outline-none transition-colors focus:border-accent sm:w-72"
              />
            </div>
            <div className="w-full sm:w-44">
              <SelectMenu value={visionFilter} onChange={setVisionFilter} options={visionOptions} triggerClassName="h-11 rounded-2xl bg-bg-base" />
            </div>
            <button className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-card-border bg-bg-base px-4 text-[10px] font-black uppercase tracking-widest text-text-secondary">
              <Filter size={14} /> Filters
            </button>
            <button onClick={() => setCreateOpen(true)} className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-text-main px-5 text-[10px] font-black uppercase tracking-widest text-bg-base shadow-lg shadow-text-main/10">
              <Plus size={15} /> Create Task
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {COLUMNS.map(column => (
          <button
            key={column.id}
            onClick={() => setMobileStatus(column.id)}
            className={cn(
              "h-10 shrink-0 rounded-2xl px-4 text-[10px] font-black uppercase tracking-widest transition-all",
              mobileStatus === column.id ? "bg-accent text-accent-contrast" : "border border-card-border bg-card text-text-secondary"
            )}
          >
            {column.label} · {columnTasks.get(column.id)?.length || 0}
          </button>
        ))}
      </div>

      <div className="hidden min-h-0 flex-1 gap-4 overflow-x-auto pb-3 custom-scrollbar lg:flex">
        {COLUMNS.map(column => (
          <TaskColumn
            key={column.id}
            column={column}
            tasks={columnTasks.get(column.id) || []}
            draggingTaskId={draggingTaskId}
            onDropTask={(task) => handleStatusChange(task, column.id)}
            onOpenTask={setDetailTask}
            onLogProof={(task) => setProofVisionId(task.visionId)}
            onStatusChange={handleStatusChange}
            onDelete={setDeleteTarget}
            onDragStart={setDraggingTaskId}
            onDragEnd={() => setDraggingTaskId(null)}
          />
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar lg:hidden">
        <div className="space-y-3">
          {(columnTasks.get(mobileStatus) || []).map(task => (
            <TaskCard
              key={task.reactKey}
              task={task}
              onOpen={() => setDetailTask(task)}
              onLogProof={() => setProofVisionId(task.visionId)}
              onStatusChange={(status) => handleStatusChange(task, status)}
              onDelete={() => setDeleteTarget(task)}
              onDragStart={() => undefined}
              onDragEnd={() => undefined}
            />
          ))}
          {(columnTasks.get(mobileStatus) || []).length === 0 && <TaskEmptyState message={COLUMNS.find(c => c.id === mobileStatus)?.empty || 'No tasks here.'} />}
        </div>
      </div>

      <TaskCreateModal open={createOpen} visions={visions} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
      <TaskDetailDrawer
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onLogProof={(task) => setProofVisionId(task.visionId)}
        onStatusChange={handleStatusChange}
        onDelete={setDeleteTarget}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this task?"
        description={deleteTarget ? `This removes "${deleteTarget.text}" from ${deleteTarget.visionTitle}.` : ''}
        confirmLabel="Delete Task"
        tone="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteVisionTask(deleteTarget.visionId, deleteTarget.id);
          setDeleteTarget(null);
          setDetailTask(null);
        }}
      />
      <ProgressLogComposer open={!!proofVisionId} onClose={() => setProofVisionId(null)} defaultVisionId={proofVisionId} />
    </div>
  );
}

function TaskColumn({
  column,
  tasks,
  draggingTaskId,
  onDropTask,
  onOpenTask,
  onLogProof,
  onStatusChange,
  onDelete,
  onDragStart,
  onDragEnd
}: {
  column: typeof COLUMNS[number];
  tasks: BoardTask[];
  draggingTaskId: string | null;
  onDropTask: (task: BoardTask) => void;
  onOpenTask: (task: BoardTask) => void;
  onLogProof: (task: BoardTask) => void;
  onStatusChange: (task: BoardTask, status: TaskStatus) => void;
  onDelete: (task: BoardTask) => void;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
}) {
  const [isOver, setIsOver] = useState(false);
  return (
    <div
      onDragOver={event => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={event => {
        event.preventDefault();
        setIsOver(false);
        const raw = event.dataTransfer.getData('application/json');
        if (!raw) return;
        onDropTask(JSON.parse(raw));
      }}
      className={cn(
        "flex h-full min-w-[268px] max-w-[292px] flex-1 flex-col rounded-[1.5rem] border border-card-border bg-card p-3 shadow-sm transition-all",
        isOver && "border-accent bg-accent/5 ring-2 ring-accent/15",
        draggingTaskId && !isOver && "opacity-80"
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent/60" />
          <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-text-main">{column.label}</h3>
          <span className="rounded-full bg-bg-base px-2 py-1 text-[9px] font-black text-text-secondary">{tasks.length}</span>
        </div>
        <Plus size={14} className="text-text-secondary/35" />
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
        {tasks.map(task => (
          <TaskCard
            key={task.reactKey}
            task={task}
            onOpen={() => onOpenTask(task)}
            onLogProof={() => onLogProof(task)}
            onStatusChange={(status) => onStatusChange(task, status)}
            onDelete={() => onDelete(task)}
            onDragStart={() => onDragStart(task.id)}
            onDragEnd={onDragEnd}
          />
        ))}
        {tasks.length === 0 && <TaskEmptyState message={column.empty} />}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  onOpen,
  onLogProof,
  onStatusChange,
  onDelete,
  onDragStart,
  onDragEnd
}: {
  task: BoardTask;
  onOpen: () => void;
  onLogProof: () => void;
  onStatusChange: (status: TaskStatus) => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const priority = task.priority || 'medium';
  const progress = getTaskProgress(task);
  const checklist = safeArray(task.checklist || task.subTasks);
  const dots = Array.from({ length: 10 }, (_, index) => index < Math.round(progress / 10));

  return (
    <motion.div
      layout
      draggable
      onDragStart={event => {
        const dragEvent = event as unknown as DragEvent;
        dragEvent.dataTransfer?.setData('application/json', JSON.stringify(task));
        if (dragEvent.dataTransfer) dragEvent.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn("cursor-grab rounded-[1.35rem] border p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg active:cursor-grabbing", PRIORITY_COLORS[priority])}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          <span className="rounded-md bg-white/55 px-2 py-1 text-[8px] font-black uppercase tracking-widest">#{priority}</span>
          {safeArray<string>(task.tags).slice(0, 1).map(tag => (
            <span key={tag} className="rounded-md bg-white/55 px-2 py-1 text-[8px] font-black uppercase tracking-widest">#{tag}</span>
          ))}
        </div>
        <button onClick={(event) => { event.stopPropagation(); onDelete(); }} className="rounded-lg p-1 opacity-45 hover:bg-white/55 hover:opacity-100">
          <Trash2 size={13} />
        </button>
      </div>
      <button onClick={onOpen} className="mt-3 block w-full text-left">
        <h4 className="line-clamp-2 text-[14px] font-black leading-tight">{task.text}</h4>
        {task.description && <p className="mt-2 line-clamp-2 text-[10px] font-semibold leading-relaxed opacity-70">{task.description}</p>}
      </button>
      <div className="mt-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest opacity-70">
        <Link2 size={11} />
        <span className="truncate">{task.visionTitle}</span>
      </div>
      {checklist.length > 0 && (
        <div className="mt-3 space-y-1">
          {checklist.slice(0, 3).map((item: any) => (
            <div key={item.id || item.text} className="flex items-center gap-2 text-[10px] font-bold opacity-80">
              {item.completed ? <CheckCircle2 size={12} /> : <Circle size={12} />}
              <span className={cn("line-clamp-1", item.completed && "line-through opacity-60")}>{item.text}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[9px] font-black uppercase tracking-widest opacity-70">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="flex gap-1">
          {dots.map((filled, index) => <span key={index} className={cn("h-2 flex-1 rounded-full bg-white/50", filled && "bg-current")} />)}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest opacity-65">
          <CalendarDays size={11} />
          <span>{task.dueDate ? safeFormat(task.dueDate, 'MMM d') : 'No date'}</span>
        </div>
        <div className="flex gap-1">
          {normalizeTaskStatus(task) === 'proof_needed' && (
            <button onClick={(event) => { event.stopPropagation(); onLogProof(); }} className="rounded-lg bg-white/70 px-2 py-1 text-[8px] font-black uppercase tracking-widest">
              Log Proof
            </button>
          )}
          <SelectMenu
            value={normalizeTaskStatus(task)}
            onChange={value => onStatusChange(value as TaskStatus)}
            options={COLUMNS.map(column => ({ value: column.id, label: column.label }))}
            triggerClassName="h-7 rounded-lg bg-white/70 px-2 text-[8px]"
            menuClassName="sm:w-44"
          />
        </div>
      </div>
    </motion.div>
  );
}

function TaskCreateModal({ open, visions, onClose, onCreate }: { open: boolean; visions: Vision[]; onClose: () => void; onCreate: (payload: Partial<Task> & { text: string; visionId: string }) => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [visionId, setVisionId] = useState('');
  const [status, setStatus] = useState<TaskStatus>('planned');
  const [priority, setPriority] = useState<NonNullable<Task['priority']>>('medium');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && !visionId && visions[0]) setVisionId(visions[0].id);
  }, [open, visionId, visions]);

  const submit = async () => {
    if (!title.trim() || !visionId || saving) return;
    setSaving(true);
    await onCreate({ text: title, visionId, status, priority, dueDate: dueDate || null, description });
    setSaving(false);
    setTitle('');
    setDescription('');
    setDueDate('');
  };

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title="Create Task"
      subtitle="Make one concrete next move."
      size="md"
      footer={(
        <>
          <button onClick={onClose} className="h-11 rounded-2xl border border-card-border bg-card px-5 text-[10px] font-black uppercase tracking-widest text-text-secondary">Cancel</button>
          <button onClick={submit} disabled={!title.trim() || !visionId || saving} className="h-11 rounded-2xl bg-accent px-6 text-[10px] font-black uppercase tracking-widest text-accent-contrast disabled:opacity-50">
            {saving ? 'Creating...' : 'Create Task'}
          </button>
        </>
      )}
    >
      <div className="space-y-4 p-5">
        <input value={title} onChange={event => setTitle(event.target.value)} placeholder="Task title" className="h-12 w-full rounded-2xl border border-card-border bg-bg-base px-4 text-sm font-bold outline-none focus:border-accent" />
        <SelectMenu value={visionId} onChange={setVisionId} options={visions.map(vision => ({ value: vision.id, label: vision.title }))} placeholder="Link Vision" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SelectMenu value={status} onChange={value => setStatus(value as TaskStatus)} options={COLUMNS.map(column => ({ value: column.id, label: column.label }))} />
          <SelectMenu value={priority} onChange={value => setPriority(value as any)} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />
          <input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} className="h-11 rounded-xl border border-card-border bg-bg-base px-3 text-xs font-bold text-text-main outline-none focus:border-accent" />
        </div>
        <textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Description or checklist notes..." className="min-h-24 w-full resize-none rounded-2xl border border-card-border bg-bg-base p-4 text-sm font-semibold text-text-secondary outline-none focus:border-accent" />
        {visions.length === 0 && (
          <div className="rounded-2xl border border-warning/20 bg-warning/10 p-4 text-xs font-bold text-text-secondary">
            Link this task to a Vision to track progress better. Create a Vision first if none exist.
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
}

function TaskDetailDrawer({ task, onClose, onLogProof, onStatusChange, onDelete }: { task: BoardTask | null; onClose: () => void; onLogProof: (task: BoardTask) => void; onStatusChange: (task: BoardTask, status: TaskStatus) => void; onDelete: (task: BoardTask) => void }) {
  return (
    <AnimatePresence>
      {task && (
        <motion.div className="fixed inset-0 z-[220] flex justify-end bg-overlay/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.aside initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }} transition={{ type: 'spring', damping: 30, stiffness: 260 }} onClick={event => event.stopPropagation()} className="h-full w-full max-w-md overflow-y-auto bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-accent">Task Detail</p>
                <h2 className="mt-2 text-2xl font-black leading-tight text-text-main">{task.text}</h2>
              </div>
              <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-card-border text-text-secondary"><X size={17} /></button>
            </div>
            <div className="mt-6 space-y-4">
              <InfoRow icon={Link2} label="Vision" value={task.visionTitle} />
              <InfoRow icon={Flag} label="Priority" value={task.priority || 'medium'} />
              <InfoRow icon={Clock3} label="Status" value={COLUMNS.find(column => column.id === normalizeTaskStatus(task))?.label || 'Planned'} />
              <InfoRow icon={CalendarDays} label="Due" value={task.dueDate ? safeFormat(task.dueDate, 'MMM d, yyyy') : 'No deadline'} />
              {task.description && <p className="rounded-3xl border border-card-border bg-bg-base p-4 text-sm font-semibold leading-relaxed text-text-secondary">{task.description}</p>}
              <div className="rounded-3xl border border-card-border bg-bg-base p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50">Checklist</p>
                <div className="mt-3 space-y-2">
                  {safeArray(task.checklist || task.subTasks).length ? safeArray<any>(task.checklist || task.subTasks).map(item => (
                    <div key={item.id || item.text} className="flex items-center gap-2 text-sm font-bold text-text-main">
                      {item.completed ? <CheckCircle2 size={15} className="text-success" /> : <Circle size={15} className="text-text-secondary/40" />}
                      <span>{item.text}</span>
                    </div>
                  )) : <p className="text-xs font-semibold text-text-secondary/45">No checklist yet.</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => onLogProof(task)} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-accent text-[10px] font-black uppercase tracking-widest text-accent-contrast"><Zap size={14} /> Log Proof</button>
                <button onClick={() => onStatusChange(task, 'done')} className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-card-border bg-bg-base text-[10px] font-black uppercase tracking-widest text-text-secondary"><CheckCircle2 size={14} /> Mark Done</button>
              </div>
              <button onClick={() => onDelete(task)} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-danger/20 bg-danger/5 text-[10px] font-black uppercase tracking-widest text-danger"><Trash2 size={14} /> Delete Task</button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Sparkles; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-card-border bg-bg-base p-3">
      <Icon size={15} className="text-accent" />
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/45">{label}</p>
        <p className="text-sm font-black text-text-main">{value}</p>
      </div>
    </div>
  );
}

function TaskEmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-[1.35rem] border border-dashed border-card-border bg-bg-base/45 p-5 text-center">
      <Sparkles size={20} className="text-accent/55" />
      <p className="mt-3 text-xs font-bold leading-relaxed text-text-secondary/55">{message}</p>
    </div>
  );
}
