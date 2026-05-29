const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAGS = /<[^>]*>/g;

export type RateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
};

const getRateLimitStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const hashIdentifier = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(36);
};

export const sanitizeText = (input: unknown, maxLength = 2000) => {
  return String(input ?? '')
    .replace(CONTROL_CHARS, '')
    .replace(HTML_TAGS, '')
    .trim()
    .slice(0, maxLength);
};

export const sanitizePlainText = (input: unknown, maxLength = 50000) => {
  return String(input ?? '')
    .replace(CONTROL_CHARS, '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .trim()
    .slice(0, maxLength);
};

export const normalizeUsername = (username: string) => {
  return sanitizeText(username, 24).toLowerCase().replace(/[^a-z0-9_]/g, '');
};

export const validateUsername = (username: string) => {
  const normalized = normalizeUsername(username);
  if (!/^[a-z0-9_]{3,24}$/.test(normalized)) {
    throw new Error('Use 3-24 lowercase letters, numbers, or underscores for your username.');
  }
  return normalized;
};

export const validateDisplayName = (name: string) => {
  const value = sanitizeText(name, 60);
  if (!value) throw new Error('Display name is required.');
  return value;
};

export const isSafeUrl = (url: string) => {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const validateYouTubeUrl = (url: string) => {
  const value = sanitizeText(url, 300);
  if (!isSafeUrl(value)) throw new Error('Paste a valid YouTube link.');

  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{6,})/,
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/
  ];
  const match = patterns.map(pattern => value.match(pattern)).find(Boolean);
  if (!match?.[1]) throw new Error('Paste a valid YouTube link.');
  return { url: value, videoId: match[1] };
};

export const validatePostPayload = (post: any) => {
  const type = post?.type || 'update';
  const allowedTypes = ['sprint', 'insight', 'milestone', 'update', 'achievement', 'status'];
  if (!allowedTypes.includes(type)) throw new Error('Invalid post type.');

  const captionLimit = type === 'status' ? 160 : 2000;
  const caption = sanitizePlainText(post?.caption || '', captionLimit);
  const content = sanitizePlainText(post?.content || '', 2000);
  const media = Array.isArray(post?.media) ? post.media.slice(0, 10) : [];
  if (!caption && !content && media.length === 0) throw new Error('Write something or attach media before posting.');

  const tags = Array.isArray(post?.tags)
    ? Array.from(new Set(post.tags.map((tag: string) => sanitizeText(tag, 30).toLowerCase().replace(/^#/, '').replace(/[^a-z0-9_-]/g, '')).filter(Boolean))).slice(0, 10)
    : [];
  const mentions = Array.isArray(post?.mentions)
    ? post.mentions.filter((mention: any) => typeof mention?.userId === 'string').slice(0, 10)
    : [];

  return { ...post, type, caption, content, media, tags, mentions };
};

export const validateCommentPayload = (content: string) => {
  const value = sanitizePlainText(content, 1000);
  if (!value) throw new Error('Write a comment before posting.');
  return value;
};

export const validateNotePayload = (note: any) => {
  const noteType = ['normal', 'audio', 'journal'].includes(note?.note_type) ? note.note_type : 'normal';
  return {
    ...note,
    title: sanitizeText(note?.title || 'Untitled Note', 120) || 'Untitled Note',
    content: sanitizePlainText(note?.content || '', noteType === 'journal' ? 20000 : 50000),
    note_type: noteType,
    tags: Array.isArray(note?.tags) ? note.tags.map((tag: string) => sanitizeText(tag, 30)).filter(Boolean).slice(0, 20) : []
  };
};

export const validateVisionElements = (elements: any[]) => {
  const allowedTypes = new Set(['text', 'image', 'shape', 'sticky', 'flowchartNode', 'connector', 'checklist', 'note', 'task', 'link', 'emoji', 'quote', 'section', 'heading', 'drawing']);
  if (!Array.isArray(elements)) throw new Error('Vision board data is malformed.');
  if (elements.length > 500) throw new Error('Vision Board limit reached. Remove some elements before adding more.');

  return elements.map((element) => {
    if (!allowedTypes.has(element?.type)) throw new Error('Vision Board contains an unsupported element.');
    const contentLimit = element?.type === 'drawing' ? 50000 : 5000;
    return {
      ...element,
      content: sanitizePlainText(element?.content || '', contentLimit),
      x: Number.isFinite(Number(element?.x)) ? Number(element.x) : 0,
      y: Number.isFinite(Number(element?.y)) ? Number(element.y) : 0,
      width: element?.width === undefined ? undefined : Math.max(20, Math.min(Number(element.width) || 120, 4000)),
      height: element?.height === undefined ? undefined : Math.max(20, Math.min(Number(element.height) || 120, 4000)),
      metadata: typeof element?.metadata === 'object' && element.metadata ? element.metadata : {}
    };
  });
};

export const validateVisionPayload = (updates: any) => {
  const next = { ...updates };
  if (next.title !== undefined) next.title = sanitizeText(String(next.title ?? ''), 120).trim();
  if (next.description !== undefined) next.description = sanitizePlainText(next.description, 2000);
  if (next.notes !== undefined) next.notes = sanitizePlainText(next.notes, 20000);
  if (next.tags !== undefined) next.tags = Array.isArray(next.tags) ? next.tags.map((tag: string) => sanitizeText(String(tag ?? ''), 30).trim()).filter(Boolean).slice(0, 20) : [];
  if (next.elements !== undefined) next.elements = validateVisionElements(next.elements);
  return next;
};

export const validateFile = (file: File, allowedTypes: string[], maxSizeBytes: number, label: string) => {
  const normalizedType = (file.type || '').split(';')[0].toLowerCase();
  if (!allowedTypes.includes(normalizedType)) {
    throw new Error(`Unsupported ${label} type.`);
  }
  if (file.size > maxSizeBytes) {
    throw new Error(`${label} is too large.`);
  }
  const safeExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
  return { normalizedType, safeExt };
};

export const checkClientRateLimit = (identifier: string, action: string, maxAttempts: number, windowMinutes: number): RateLimitResult => {
  const storage = getRateLimitStorage();
  if (!storage) return { allowed: true, retryAfterMs: 0 };

  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  const key = `visnova_rate_${action}_${hashIdentifier(identifier.toLowerCase())}`;
  const raw = storage.getItem(key);
  const state = raw ? JSON.parse(raw) as { count: number; windowStart: number } : { count: 0, windowStart: now };
  const expired = now - state.windowStart >= windowMs;
  const next = expired ? { count: 1, windowStart: now } : { count: state.count + 1, windowStart: state.windowStart };
  storage.setItem(key, JSON.stringify(next));

  if (next.count > maxAttempts) {
    return { allowed: false, retryAfterMs: Math.max(0, windowMs - (now - next.windowStart)) };
  }

  return { allowed: true, retryAfterMs: 0 };
};

export const formatRetryAfter = (retryAfterMs: number) => {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60000));
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
};
