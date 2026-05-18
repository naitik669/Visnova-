import { useMemo, useState } from 'react';
import { ArrowUpRight, BookOpen, ChevronLeft, ChevronRight, FileText, Link as LinkIcon, StickyNote } from 'lucide-react';
import { cn } from '../../lib/utils';
import { safeArray, safeString } from '../../lib/safeData';
import { safeFormat } from '../../lib/dateUtils';
import { Post, VisionElement } from '../../types';

const PAGE_SIZE = 760;

const chunkPages = (value: string) => {
  const text = safeString(value).trim();
  if (!text) return ['No content was added to this page.'];
  const pages: string[] = [];
  for (let index = 0; index < text.length; index += PAGE_SIZE) {
    pages.push(text.slice(index, index + PAGE_SIZE).trim());
  }
  return pages.length ? pages : ['No content was added to this page.'];
};

const boardElementPreview = (element: VisionElement, index: number) => {
  const type = safeString(element.type, 'text');
  const label = safeString(element.content || element.metadata?.title || element.metadata?.url, type);
  const imageUrl = safeString(element.metadata?.imageUrl || element.content);

  return (
    <div
      key={element.id || index}
      className={cn(
        'absolute overflow-hidden rounded-xl border border-card-border bg-card shadow-sm',
        type === 'sticky' && 'bg-warning/10',
        type === 'link' && 'bg-accent/5',
        type === 'checklist' && 'bg-success/5'
      )}
      style={{
        left: `${10 + (index % 4) * 22}%`,
        top: `${14 + Math.floor(index / 4) * 26}%`,
        width: type === 'image' ? '23%' : '25%',
        height: type === 'image' ? '30%' : '22%',
        transform: `rotate(${[-3, 2, -1, 3][index % 4]}deg)`
      }}
    >
      {type === 'image' && imageUrl ? (
        <img src={imageUrl} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full flex-col justify-between p-3">
          <div className="flex items-center gap-1.5 text-accent">
            {type === 'link' ? <LinkIcon size={12} /> : type === 'sticky' ? <StickyNote size={12} /> : <FileText size={12} />}
            <span className="text-[7px] font-black uppercase tracking-widest">{type}</span>
          </div>
          <p className="line-clamp-2 text-[10px] font-black leading-tight text-text-main">{label}</p>
        </div>
      )}
    </div>
  );
};

export function SharedPostEmbed({ post }: { post: Post }) {
  const embed = post.metadata?.shared_embed;
  const [page, setPage] = useState(0);

  const pages = useMemo(() => chunkPages(embed?.content), [embed?.content]);
  if (!embed?.kind) return null;

  if (embed.kind === 'journal') {
    return (
      <div className="mt-5 rounded-[2rem] border border-card-border bg-app-container p-3 sm:p-4">
        <div className="overflow-hidden rounded-[1.5rem] border border-card-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-card-border/70 px-5 py-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-accent">Journal Page</p>
              <h4 className="mt-1 text-base font-black text-text-main">{safeString(embed.title, 'Journal Entry')}</h4>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/45">{safeFormat(embed.date || embed.createdAt, 'MMM dd, yyyy')}</p>
          </div>
          <div className="grid gap-0 md:grid-cols-[0.82fr_1.18fr]">
            <div className="min-h-64 border-b border-card-border/70 bg-surface-muted/30 p-5 md:border-b-0 md:border-r">
              {embed.imageUrl ? (
                <img src={embed.imageUrl} alt={safeString(embed.title, 'Journal image')} className="h-52 w-full rounded-2xl object-cover shadow-sm" />
              ) : (
                <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed border-card-border bg-card text-text-secondary/35">
                  <BookOpen size={28} />
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 gap-3 text-[9px] font-black uppercase tracking-widest text-text-secondary/50">
                <div className="rounded-xl border border-card-border bg-card px-3 py-2">Mood: {safeString(embed.mood, 'None')}</div>
                <div className="rounded-xl border border-card-border bg-card px-3 py-2">Pages: {pages.length}</div>
              </div>
            </div>
            <div
              className="min-h-64 p-5"
              style={{
                backgroundImage: 'linear-gradient(transparent, transparent 31px, rgba(120,120,120,0.13) 31px)',
                backgroundSize: '100% 32px'
              }}
            >
              <p className="whitespace-pre-wrap text-sm font-semibold leading-8 text-text-secondary">{pages[page]}</p>
              {pages.length > 1 && (
                <div className="mt-5 flex items-center justify-between border-t border-card-border/60 pt-4">
                  <button
                    onClick={() => setPage(value => Math.max(0, value - 1))}
                    disabled={page === 0}
                    className="flex h-10 items-center gap-2 rounded-xl border border-card-border bg-card px-3 text-[9px] font-black uppercase tracking-widest text-text-secondary disabled:opacity-35"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary/45">{page + 1} / {pages.length}</span>
                  <button
                    onClick={() => setPage(value => Math.min(pages.length - 1, value + 1))}
                    disabled={page === pages.length - 1}
                    className="flex h-10 items-center gap-2 rounded-xl border border-card-border bg-card px-3 text-[9px] font-black uppercase tracking-widest text-text-secondary disabled:opacity-35"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (embed.kind === 'vision_board') {
    const elements = safeArray<VisionElement>(embed.elements).slice(0, 10);
    return (
      <div className="mt-5 overflow-hidden rounded-[2rem] border border-card-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-card-border px-5 py-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-accent">Vision Board Embed</p>
            <h4 className="mt-1 text-base font-black text-text-main">{safeString(embed.title, 'Vision Board')}</h4>
          </div>
          <div className="rounded-full bg-surface-muted px-3 py-1 text-[9px] font-black uppercase tracking-widest text-text-secondary/50">{elements.length} items</div>
        </div>
        <div className="relative h-72 bg-bg-base">
          <div className="absolute inset-0 opacity-70" style={{ backgroundImage: 'radial-gradient(circle, rgba(120,120,120,0.24) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
          {elements.length ? elements.map(boardElementPreview) : (
            <div className="absolute inset-0 flex items-center justify-center text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/40">This board has no shared items yet.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (embed.kind === 'note') {
    return (
      <div className="mt-5 rounded-[2rem] border border-card-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10 text-accent">
              <FileText size={19} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-accent">Note Embed</p>
              <h4 className="text-base font-black text-text-main">{safeString(embed.title, 'Untitled Note')}</h4>
            </div>
          </div>
          <ArrowUpRight size={16} className="text-text-secondary/35" />
        </div>
        <div className="rounded-2xl border border-card-border bg-app-container p-4">
          <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-text-secondary">{safeString(embed.content, 'No content yet.')}</p>
        </div>
      </div>
    );
  }

  return null;
}
