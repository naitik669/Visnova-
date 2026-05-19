import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEventHandler } from 'react';
import { AtSign, Hash, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

type Suggestion =
  | { kind: 'hashtag'; id?: string; tag: string; usage_count?: number; create?: boolean }
  | { kind: 'mention'; id: string; username: string; display_name?: string; full_name?: string; avatar_url?: string; bio?: string; verified?: boolean };

type ActiveToken = {
  kind: 'hashtag' | 'mention';
  query: string;
  start: number;
  end: number;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
  textareaClassName?: string;
  onKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
  onBlur?: () => void;
};

function getActiveToken(value: string, cursor: number): ActiveToken | null {
  const beforeCursor = value.slice(0, cursor);
  const match = beforeCursor.match(/(^|\s)([#@])([a-zA-Z0-9_.]{0,40})$/);
  if (!match) return null;

  const marker = match[2];
  const query = match[3] || '';
  if (marker === '#' && /[.]/.test(query)) return null;
  if (!query) return null;

  const tokenStart = cursor - query.length - 1;
  const charBefore = value[tokenStart - 1];
  if (charBefore && !/\s/.test(charBefore)) return null;

  return {
    kind: marker === '#' ? 'hashtag' : 'mention',
    query: query.toLowerCase(),
    start: tokenStart,
    end: cursor
  };
}

export function MentionHashtagTextarea({
  value,
  onChange,
  placeholder,
  rows,
  maxLength,
  disabled,
  className,
  textareaClassName,
  onKeyDown,
  onBlur
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const requestIdRef = useRef(0);
  const [activeToken, setActiveToken] = useState<ActiveToken | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const hasExactHashtag = useMemo(() => {
    if (activeToken?.kind !== 'hashtag') return true;
    return suggestions.some(item => item.kind === 'hashtag' && item.tag === activeToken.query);
  }, [activeToken, suggestions]);

  const refreshToken = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const nextToken = getActiveToken(value, textarea.selectionStart);
    setActiveToken(nextToken);
    setActiveIndex(0);
    if (!nextToken) setSuggestions([]);
  };

  useEffect(() => {
    if (!activeToken?.query) return;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        if (activeToken.kind === 'hashtag') {
          const { data, error } = await supabase
            .from('hashtags')
            .select('id, tag, usage_count')
            .ilike('tag', `${activeToken.query}%`)
            .order('usage_count', { ascending: false })
            .order('updated_at', { ascending: false })
            .limit(8);

          if (requestIdRef.current !== requestId) return;
          if (error) {
            console.warn('Hashtag suggestions failed:', error);
            setSuggestions([]);
            return;
          }
          setSuggestions((data || []).map(item => ({
            kind: 'hashtag',
            id: item.id,
            tag: item.tag,
            usage_count: item.usage_count || 0
          })));
          return;
        }

        const query = activeToken.query.replace(/[^a-z0-9_.]/g, '');
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, display_name, full_name, avatar_url, bio, verified')
          .or(`username.ilike.${query}%,display_name.ilike.${query}%,full_name.ilike.${query}%`)
          .limit(8);

        if (requestIdRef.current !== requestId) return;
        if (error) {
          console.warn('Mention suggestions failed:', error);
          setSuggestions([]);
          return;
        }
        setSuggestions((data || [])
          .filter(profile => profile.username)
          .map(profile => ({ kind: 'mention', ...profile })));
      } finally {
        if (requestIdRef.current === requestId) setIsLoading(false);
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [activeToken?.kind, activeToken?.query]);

  const visibleSuggestions = useMemo(() => {
    if (!activeToken) return [];
    if (activeToken.kind === 'hashtag' && !hasExactHashtag) {
      return [{ kind: 'hashtag', tag: activeToken.query, create: true } as Suggestion, ...suggestions].slice(0, 9);
    }
    return suggestions;
  }, [activeToken, hasExactHashtag, suggestions]);

  const selectSuggestion = (suggestion: Suggestion) => {
    if (!activeToken) return;
    const inserted = suggestion.kind === 'hashtag' ? `#${suggestion.tag} ` : `@${suggestion.username} `;
    const nextValue = `${value.slice(0, activeToken.start)}${inserted}${value.slice(activeToken.end)}`;
    const nextCursor = activeToken.start + inserted.length;
    onChange(nextValue);
    setActiveToken(null);
    setSuggestions([]);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const dropdownOpen = !!activeToken && (isLoading || visibleSuggestions.length > 0 || activeToken.kind === 'hashtag');

  return (
    <div className={cn('relative', className)}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          requestAnimationFrame(refreshToken);
        }}
        onClick={refreshToken}
        onBlur={onBlur}
        onKeyUp={refreshToken}
        onKeyDown={(event) => {
          if (dropdownOpen && visibleSuggestions.length > 0) {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActiveIndex(index => (index + 1) % visibleSuggestions.length);
              return;
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex(index => (index - 1 + visibleSuggestions.length) % visibleSuggestions.length);
              return;
            }
            if (event.key === 'Enter' || event.key === 'Tab') {
              event.preventDefault();
              selectSuggestion(visibleSuggestions[activeIndex] || visibleSuggestions[0]);
              return;
            }
          }
          if (event.key === 'Escape' && dropdownOpen) {
            event.preventDefault();
            setActiveToken(null);
            setSuggestions([]);
            return;
          }
          onKeyDown?.(event);
        }}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        className={textareaClassName}
      />

      {dropdownOpen && (
        <div className="absolute left-3 right-3 top-[calc(100%+0.5rem)] z-[260] max-h-72 overflow-y-auto rounded-2xl border border-card-border bg-card p-2 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-card-border px-3 py-2 text-[9px] font-black uppercase tracking-widest text-text-secondary/55">
            {activeToken?.kind === 'hashtag' ? <Hash size={13} /> : <AtSign size={13} />}
            {activeToken?.kind === 'hashtag' ? 'Hashtag suggestions' : 'Mention profiles'}
            {isLoading && <Loader2 size={13} className="ml-auto animate-spin" />}
          </div>

          {!isLoading && visibleSuggestions.length === 0 && activeToken?.kind === 'mention' && (
            <div className="px-3 py-4 text-xs font-bold text-text-secondary/60">No matching profiles.</div>
          )}

          {visibleSuggestions.map((suggestion, index) => (
            <button
              key={suggestion.kind === 'hashtag' ? `${suggestion.tag}-${index}` : suggestion.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectSuggestion(suggestion)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                activeIndex === index ? 'bg-accent/10 text-accent' : 'hover:bg-surface-muted'
              )}
            >
              {suggestion.kind === 'hashtag' ? (
                <>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent"><Hash size={16} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-text-main">#{suggestion.tag}</span>
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-text-secondary/45">
                      {suggestion.create ? 'Create on submit' : `${suggestion.usage_count || 0} uses`}
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <img
                    src={suggestion.avatar_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${suggestion.id}`}
                    alt=""
                    className="h-9 w-9 rounded-xl border border-card-border object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-text-main">{suggestion.display_name || suggestion.full_name || suggestion.username}</span>
                    <span className="block truncate text-[10px] font-bold uppercase tracking-widest text-text-secondary/45">@{suggestion.username}</span>
                    {suggestion.bio && <span className="block truncate text-[11px] font-semibold text-text-secondary/55">{suggestion.bio}</span>}
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
