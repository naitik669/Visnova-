import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Link2, Lock, Radio, Sparkles } from 'lucide-react';
import { ResponsiveModal } from '../ui/ResponsiveModal';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import type { EcosystemVisibility, ProgressLogType } from '../../types';
import { SelectMenu } from '../ui/SelectMenu';

const LOG_TYPES: Array<{ value: ProgressLogType; label: string }> = [
  { value: 'progress', label: 'Progress Log' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'lesson', label: 'Lesson Learned' },
  { value: 'build_update', label: 'Build Update' },
  { value: 'reflection', label: 'Reflection' },
  { value: 'help_request', label: 'Help Request' },
  { value: 'win', label: 'Win' },
  { value: 'blocker', label: 'Blocker' }
];

const VISIBILITY_OPTIONS: Array<{ value: EcosystemVisibility; label: string; icon: typeof Lock }> = [
  { value: 'private', label: 'Private', icon: Lock },
  { value: 'circle', label: 'Circle', icon: Link2 },
  { value: 'public', label: 'Public', icon: Radio }
];

export function ProgressLogComposer({ open, onClose, defaultVisionId }: { open: boolean; onClose: () => void; defaultVisionId?: string | null }) {
  const { visions, createProgressLog } = useStore();
  const [visionId, setVisionId] = useState(defaultVisionId || '');
  const [logType, setLogType] = useState<ProgressLogType>('progress');
  const [visibility, setVisibility] = useState<EcosystemVisibility>('private');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedVision = useMemo(() => visions.find(vision => vision.id === visionId), [visionId, visions]);

  useEffect(() => {
    if (open) setVisionId(defaultVisionId || '');
  }, [defaultVisionId, open]);

  const resetAndClose = () => {
    setContent('');
    setLogType('progress');
    setVisibility('private');
    setVisionId(defaultVisionId || '');
    onClose();
  };

  const submit = async () => {
    if (!content.trim() || isSaving) return;
    setIsSaving(true);
    const saved = await createProgressLog({
      content,
      logType,
      visibility,
      visionId: visionId || null,
      metadata: {
        composer: 'progress_log',
        vision_title: selectedVision?.title || null
      }
    });
    setIsSaving(false);
    if (saved) resetAndClose();
  };

  return (
    <ResponsiveModal
      open={open}
      onClose={resetAndClose}
      title="Log Progress"
      subtitle="Turn today’s action into proof connected to a Vision."
      size="md"
      footer={
        <>
          <button type="button" onClick={resetAndClose} className="h-11 rounded-2xl border border-card-border bg-card px-5 text-[10px] font-black uppercase tracking-widest text-text-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!content.trim() || isSaving}
            className="h-11 rounded-2xl bg-accent px-5 text-[10px] font-black uppercase tracking-widest text-accent-contrast disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Proof'}
          </button>
        </>
      }
    >
      <div className="space-y-5 p-5 sm:p-6">
        <div className="rounded-2xl border border-card-border bg-card p-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Connected Vision</label>
          <SelectMenu
            value={visionId}
            onChange={setVisionId}
            options={[{ value: '', label: 'No Vision link yet' }, ...visions.map(vision => ({ value: vision.id, label: vision.title }))]}
            triggerClassName="mt-2 rounded-xl bg-app-container"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LOG_TYPES.map(type => (
            <button
              key={type.value}
              type="button"
              onClick={() => setLogType(type.value)}
              className={cn(
                'min-h-12 rounded-2xl border px-3 py-2 text-[9px] font-black uppercase tracking-widest transition-colors',
                logType === type.value
                  ? 'border-accent bg-accent text-accent-contrast'
                  : 'border-card-border bg-card text-text-secondary hover:text-accent'
              )}
            >
              {type.label}
            </button>
          ))}
        </div>

        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="What did you prove today? Mention the task, blocker, lesson, or win."
          rows={7}
          maxLength={8000}
          className="w-full resize-none rounded-[1.5rem] border border-card-border bg-card p-4 text-sm font-semibold leading-6 text-text-main outline-none placeholder:text-text-secondary/45 focus:border-accent focus:ring-4 focus:ring-accent/10"
        />

        <div className="grid grid-cols-3 gap-2">
          {VISIBILITY_OPTIONS.map(option => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setVisibility(option.value)}
                className={cn(
                  'flex h-12 items-center justify-center gap-2 rounded-2xl border text-[9px] font-black uppercase tracking-widest',
                  visibility === option.value
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-card-border bg-card text-text-secondary'
                )}
              >
                <Icon size={14} />
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-success/20 bg-success/5 p-4 text-xs font-semibold text-text-secondary">
          <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-success" />
          <p>
            Private logs stay in your Growth Timeline. Circle/Public logs can also become proof in Feed.
          </p>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-secondary/50">
          <Sparkles size={12} />
          Vision = why. Progress Log = what you proved.
        </div>
      </div>
    </ResponsiveModal>
  );
}
