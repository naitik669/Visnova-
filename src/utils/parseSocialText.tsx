import type { ReactNode } from 'react';

export type SocialMention = {
  userId?: string;
  username?: string;
};

export function normalizeHashtagToken(tag: string) {
  return tag.replace(/^#/, '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 40);
}

export function normalizeMentionToken(username: string) {
  return username.replace(/^@/, '').trim().toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 30);
}

export function extractHashtags(text = '') {
  const tags = Array.from(text.matchAll(/(^|\s)#([a-zA-Z0-9_]{1,40})/g))
    .map(match => normalizeHashtagToken(match[2]))
    .filter(Boolean);
  return Array.from(new Set(tags));
}

export function extractMentions(text = '') {
  const mentions = Array.from(text.matchAll(/(^|\s)@([a-zA-Z0-9_.]{2,30})/g))
    .map(match => normalizeMentionToken(match[2]))
    .filter(Boolean);
  return Array.from(new Set(mentions));
}

export function renderSocialText(
  text = '',
  mentions: SocialMention[] = [],
  options: {
    onHashtagClick?: (tag: string) => void;
    onMentionClick?: (userId: string) => void;
    onMentionUsernameClick?: (username: string) => void;
  } = {}
): ReactNode[] {
  const parts = text.split(/(@[a-zA-Z0-9_.]{2,30}|#[a-zA-Z0-9_]{1,40})/g);

  return parts.map((part, index) => {
    if (part.startsWith('#')) {
      const tag = normalizeHashtagToken(part);
      if (!tag) return part;
      return (
        <button
          key={`${part}-${index}`}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            options.onHashtagClick?.(tag);
          }}
          className="font-bold text-accent transition-all hover:underline"
        >
          {part}
        </button>
      );
    }

    if (part.startsWith('@')) {
      const username = normalizeMentionToken(part);
      const mention = mentions.find(item => normalizeMentionToken(item.username || '') === username);
      if (!username) return part;
      return (
        <button
          key={`${part}-${index}`}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (mention?.userId) {
              options.onMentionClick?.(mention.userId);
              return;
            }
            options.onMentionUsernameClick?.(username);
          }}
          className="font-bold text-accent transition-all hover:underline"
        >
          {part}
        </button>
      );
    }

    return part;
  });
}
