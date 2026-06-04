import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDown,
  ArrowUp,
  Brush,
  Check,
  Copy,
  Eraser,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  ListChecks,
  Loader2,
  Layers3,
  Maximize2,
  Minus,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Save,
  Square,
  StickyNote,
  Target,
  Trash2,
  Type,
  Upload,
  X
} from 'lucide-react';
import { Note, Task, Vision, VisionElement } from '../../types';
import { cn } from '../../lib/utils';
import { uploadVisionBoardImage } from '../../lib/supabase';
import { useStore } from '../../store/useStore';
import { safeArray, safeNumber, safeObject, safeString, safeTime } from '../../lib/safeData';

interface CreativeCanvasProps {
  vision: Vision;
  updateVision: (id: string, updates: Partial<Vision>) => void | boolean | Promise<void | boolean>;
  onActiveChange?: (active: boolean) => void;
  readOnly?: boolean;
}

type SaveStatus = 'saved' | 'dirty' | 'saving' | 'failed';
type BoardTool = 'select' | 'pen' | 'eraser';
type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';
type ChecklistItem = NonNullable<NonNullable<VisionElement['metadata']>['checklist']>[number];
type BoardTemplateId = 'classic' | 'project' | 'creator' | 'study' | 'custom';

const CANVAS_SIZE = 6500;
const CANVAS_CENTER = 3250;
const BOARD_SURFACE = {
  x: CANVAS_CENTER - 1950,
  y: CANVAS_CENTER - 1320,
  width: 3900,
  height: 2640
};
const BOARD_INNER_SURFACE = {
  x: CANVAS_CENTER - 1800,
  y: CANVAS_CENTER - 1200,
  width: 3600,
  height: 2400
};
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;
const WHEEL_ZOOM_SPEED = 0.0048;
const SECTION_LAYER_FLOOR = 10;
const ITEM_LAYER_FLOOR = 1200;
const SAVE_DELAY_MS = 850;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const STABLE_TYPES = new Set<VisionElement['type']>(['text', 'image', 'sticky', 'checklist', 'shape', 'connector', 'link', 'drawing', 'heading', 'flowchartNode', 'section', 'task', 'note', 'quote']);
const RESIZABLE_TYPES = new Set<VisionElement['type']>(['text', 'image', 'sticky', 'checklist', 'shape', 'link', 'section', 'task', 'note', 'quote']);

const SECTION_COLORS = {
  lavender: { fill: 'rgba(139, 92, 246, 0.11)', border: 'rgba(139, 92, 246, 0.32)' },
  blue: { fill: 'rgba(96, 165, 250, 0.12)', border: 'rgba(96, 165, 250, 0.32)' },
  cobalt: { fill: 'rgba(59, 87, 214, 0.92)', border: 'rgba(255, 255, 255, 0.35)' },
  pink: { fill: 'rgba(244, 114, 182, 0.12)', border: 'rgba(244, 114, 182, 0.30)' },
  rose: { fill: 'rgba(252, 165, 165, 0.42)', border: 'rgba(248, 113, 113, 0.35)' },
  yellow: { fill: 'rgba(250, 204, 21, 0.13)', border: 'rgba(202, 138, 4, 0.26)' },
  gold: { fill: 'rgba(250, 204, 21, 0.72)', border: 'rgba(202, 138, 4, 0.32)' },
  mint: { fill: 'rgba(52, 211, 153, 0.12)', border: 'rgba(16, 185, 129, 0.30)' },
  cream: { fill: 'rgba(255, 247, 237, 0.72)', border: 'rgba(251, 191, 36, 0.30)' }
};

const ELEMENT_COLORS = ['#fef3c7', '#fce7f3', '#ede9fe', '#dbeafe', '#dcfce7', '#fee2e2', '#ffffff', '#8b5cf6'];

const newId = (prefix = 'el') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const defaultSize = (type: VisionElement['type']) => {
  if (type === 'section') return { width: 780, height: 470 };
  if (type === 'image') return { width: 360, height: 240 };
  if (type === 'sticky') return { width: 260, height: 220 };
  if (type === 'checklist') return { width: 320, height: 260 };
  if (type === 'link') return { width: 330, height: 210 };
  if (type === 'task') return { width: 320, height: 118 };
  if (type === 'note' || type === 'quote') return { width: 300, height: 180 };
  if (type === 'shape' || type === 'flowchartNode') return { width: 170, height: 120 };
  if (type === 'heading') return { width: 420, height: 100 };
  return { width: 280, height: 100 };
};

const minSize = (type: VisionElement['type']) => {
  if (type === 'section') return { width: 340, height: 220 };
  if (type === 'image') return { width: 120, height: 90 };
  if (type === 'sticky') return { width: 160, height: 120 };
  if (type === 'checklist') return { width: 190, height: 150 };
  if (type === 'link') return { width: 230, height: 145 };
  if (type === 'task') return { width: 230, height: 90 };
  if (type === 'shape') return { width: 80, height: 80 };
  return { width: 120, height: 60 };
};

const normalizeType = (type: unknown): VisionElement['type'] => {
  if (type === 'heading') return 'text';
  if (type === 'flowchartNode') return 'shape';
  if (STABLE_TYPES.has(type as VisionElement['type'])) return type as VisionElement['type'];
  return 'text';
};

const normalizeChecklist = (value: unknown): ChecklistItem[] => safeArray<any>(value)
  .map((item, index) => ({
    id: safeString(item?.id, newId('item')),
    text: safeString(item?.text, `Item ${index + 1}`),
    completed: Boolean(item?.completed)
  }))
  .filter(item => item.id);

const normalizeElement = (raw: unknown, index: number): VisionElement => {
  const row = safeObject<any>(raw);
  const type = normalizeType(row.type);
  const size = defaultSize(type);
  const metadata = safeObject<NonNullable<VisionElement['metadata']>>(row.metadata);
  const createdAt = safeTime(row.createdAt || row.created_at, Date.now());
  return {
    id: safeString(row.id, newId(`board-${index}`)),
    type,
    content: safeString(row.content, type === 'sticky' ? 'Idea or reminder' : type === 'checklist' ? 'Checklist' : type === 'section' ? 'Board Section' : type === 'task' ? 'Next task' : ''),
    x: safeNumber(row.x, CANVAS_CENTER + (index % 4) * 140),
    y: safeNumber(row.y, CANVAS_CENTER + Math.floor(index / 4) * 140),
    width: Math.max(48, safeNumber(row.width, size.width)),
    height: Math.max(40, safeNumber(row.height, size.height)),
    rotation: safeNumber(row.rotation, 0),
    zIndex: safeNumber(row.zIndex, index + 1),
    createdAt,
    updatedAt: safeTime(row.updatedAt || row.updated_at, createdAt),
    metadata: {
      ...metadata,
      checklist: type === 'checklist' ? normalizeChecklist(metadata.checklist) : metadata.checklist,
      imageUrl: type === 'image' ? safeString(metadata.imageUrl || row.content) : metadata.imageUrl,
      url: type === 'link' ? safeString(metadata.url || row.content, 'https://example.com') : metadata.url,
      shapeType: type === 'shape' ? (metadata.shapeType || 'rectangle') : metadata.shapeType
    }
  };
};

const templateElement = (
  type: VisionElement['type'],
  content: string,
  x: number,
  y: number,
  width: number,
  height: number,
  zIndex: number,
  metadata: VisionElement['metadata'] = {}
): VisionElement => {
  const now = Date.now();
  return {
    id: newId(type),
    type,
    content,
    x,
    y,
    width,
    height,
    rotation: 0,
    zIndex,
    createdAt: now,
    updatedAt: now,
    metadata
  };
};

const sectionElement = (
  title: string,
  x: number,
  y: number,
  width: number,
  height: number,
  color: keyof typeof SECTION_COLORS,
  zIndex: number,
  description?: string,
  source?: string
) => templateElement('section', title, x, y, width, height, zIndex, {
  title,
  description,
  fillColor: SECTION_COLORS[color].fill,
  strokeColor: SECTION_COLORS[color].border,
  color,
  source
} as VisionElement['metadata']);

const createTemplateElements = (template: BoardTemplateId, vision: Vision): VisionElement[] => {
  const left = template === 'classic' ? CANVAS_CENTER - 1280 : CANVAS_CENTER - 1300;
  const top = template === 'classic' ? CANVAS_CENTER - 610 : CANVAS_CENTER - 900;
  const visionTitle = safeString(vision.title, 'My Vision');
  const baseSections = {
    classic: [
      sectionElement('Step 1', left, top, 410, 280, 'cream', 10, 'Set the stage and name the real outcome.'),
      sectionElement('Step 2', left, top + 330, 410, 280, 'cream', 11, 'Demonstrate by doing. Choose the smallest visible action.'),
      sectionElement('Step 3', left, top + 660, 410, 280, 'cream', 12, 'Fill in the proof map with wins, blockers, and receipts.'),
      sectionElement('Think and feel?', left + 470, top, 1570, 720, 'cobalt', 13, 'Collect the ideas, visuals, resources, and emotions behind this Vision.', 'hero'),
      sectionElement('Step 4', left + 2100, top, 410, 280, 'cream', 14, 'Present progress and share what changed.'),
      sectionElement('Step 5', left + 2100, top + 330, 410, 280, 'cream', 15, 'Determine next steps and turn clarity into action.'),
      sectionElement('Pain', left + 470, top + 790, 750, 420, 'rose', 16, 'What is hard, risky, confusing, or slowing this down?'),
      sectionElement('Gain', left + 1280, top + 790, 760, 420, 'gold', 17, 'What improves when this Vision becomes real?'),
      sectionElement('Thoughts, comments, actions', left + 2100, top + 660, 410, 550, 'cream', 18, 'Small decisions, notes, and next actions.')
    ],
    project: [
      sectionElement('Big Goal', left + 420, top, 760, 350, 'lavender', 10),
      sectionElement('Tasks', left, top + 420, 620, 760, 'mint', 11),
      sectionElement('Deadlines', left + 680, top + 420, 560, 360, 'yellow', 12),
      sectionElement('Resources', left + 1300, top + 420, 620, 360, 'blue', 13),
      sectionElement('Blockers', left + 680, top + 840, 560, 340, 'pink', 14),
      sectionElement('Proof Logs', left + 1300, top + 840, 620, 340, 'cream', 15)
    ],
    creator: [
      sectionElement('Content Ideas', left, top, 620, 520, 'yellow', 10),
      sectionElement('References', left + 680, top, 620, 520, 'blue', 11),
      sectionElement('Scripts', left + 1360, top, 620, 520, 'cream', 12),
      sectionElement('Assets', left, top + 590, 620, 520, 'pink', 13),
      sectionElement('Progress', left + 680, top + 590, 620, 520, 'mint', 14),
      sectionElement('Publish Plan', left + 1360, top + 590, 620, 520, 'lavender', 15)
    ],
    study: [
      sectionElement('Exam Goal', left + 420, top, 760, 340, 'lavender', 10),
      sectionElement('Subjects', left, top + 410, 620, 470, 'blue', 11),
      sectionElement('Weak Areas', left + 680, top + 410, 620, 470, 'pink', 12),
      sectionElement('Resources', left + 1360, top + 410, 620, 470, 'yellow', 13),
      sectionElement('Deadlines', left + 340, top + 950, 620, 390, 'cream', 14),
      sectionElement('Progress Logs', left + 1020, top + 950, 620, 390, 'mint', 15)
    ],
    custom: [
      sectionElement('Main Vision', left + 360, top + 80, 820, 420, 'lavender', 10),
      sectionElement('Plan', left + 80, top + 580, 700, 460, 'mint', 11),
      sectionElement('Proof', left + 860, top + 580, 700, 460, 'blue', 12)
    ]
  } satisfies Record<BoardTemplateId, VisionElement[]>;

  const sections = baseSections[template];
  const starterCards: VisionElement[] = [
    templateElement('text', visionTitle, left + 820, top + 105, 840, 92, 1200, { fontSize: '42px', fontWeight: '900', textAlign: 'center' }),
    templateElement('sticky', 'What does success feel like?', left + 700, top + 250, 285, 170, 1201, { color: '#fef3c7' }),
    templateElement('sticky', 'What habits will this require?', left + 1060, top + 190, 280, 165, 1202, { color: '#fce7f3' }),
    templateElement('sticky', 'Who is helped by this?', left + 1390, top + 310, 280, 165, 1203, { color: '#ede9fe' }),
    templateElement('sticky', 'What must I learn?', left + 1710, top + 190, 250, 165, 1204, { color: '#dcfce7' }),
    templateElement('checklist', 'First moves', left + 85, top + 690, 305, 230, 1205, {
      checklist: [
        { id: newId('item'), text: 'Define the next milestone', completed: false },
        { id: newId('item'), text: 'Collect one strong reference', completed: false },
        { id: newId('item'), text: 'Log first proof', completed: false }
      ]
    }),
    templateElement('link', 'https://example.com', left + 2150, top + 1015, 310, 170, 1206, {
      url: 'https://example.com',
      title: 'Resource or reference',
      description: 'Drop tools, courses, products, docs, or inspiration here.',
      provider: 'Resource'
    }),
    templateElement('task', 'Next concrete task', left + 2168, top + 430, 310, 120, 1207, { title: 'Next concrete task', description: 'Turn one board idea into execution.' } as VisionElement['metadata']),
    templateElement('shape', 'Proof goes here', left + 610, top + 910, 290, 155, 1208, {
      title: 'Proof goes here',
      description: 'Screenshots, wins, updates, and receipts of progress.',
      shapeType: 'rectangle',
      fillColor: 'rgba(244, 114, 182, 0.16)',
      strokeColor: 'rgba(244, 114, 182, 0.35)',
      source: 'proof'
    }),
    templateElement('sticky', 'Big blocker', left + 960, top + 905, 220, 145, 1209, { color: '#fee2e2' }),
    templateElement('sticky', 'New capability', left + 1455, top + 910, 225, 145, 1210, { color: '#fef9c3' }),
    templateElement('sticky', 'Lovely memory / win', left + 1745, top + 910, 225, 145, 1211, { color: '#fef9c3' }),
    templateElement('sticky', 'Share one proof update', left + 2170, top + 760, 300, 130, 1212, { color: '#dbeafe' })
  ];

  return [...sections, ...starterCards];
};

const normalizeElements = (value: unknown): VisionElement[] => safeArray(value).slice(0, 500).map(normalizeElement);
const cloneElements = (items: VisionElement[]) => items.map(item => ({
  ...item,
  metadata: item.metadata ? JSON.parse(JSON.stringify(item.metadata)) : item.metadata
}));

const centerClassicTemplate = (items: VisionElement[]) => {
  const hero = items.find(item => item.type === 'section' && item.metadata?.source === 'hero');
  if (!hero || hero.metadata?.provider === 'classic-centered-v3') return items;
  const visible = items.filter(item => item.type !== 'connector' && item.type !== 'drawing');
  if (visible.length === 0 || visible.length > 40) return items;
  const bounds = visible.reduce((acc, element) => {
    const size = defaultSize(element.type);
    const width = element.width || size.width;
    const height = element.height || size.height;
    return {
      minX: Math.min(acc.minX, element.x),
      minY: Math.min(acc.minY, element.y),
      maxX: Math.max(acc.maxX, element.x + width),
      maxY: Math.max(acc.maxY, element.y + height)
    };
  }, { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY });
  const currentCenter = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2
  };
  const scaleUp = 1.12;
  return items.map(item => {
    if (item.type === 'connector' || item.type === 'drawing') return item;
    const width = item.width || defaultSize(item.type).width;
    const height = item.height || defaultSize(item.type).height;
    const nextWidth = width * scaleUp;
    const nextHeight = height * scaleUp;
    const itemCenter = {
      x: item.x + width / 2,
      y: item.y + height / 2
    };
    return {
      ...item,
      x: CANVAS_CENTER + (itemCenter.x - currentCenter.x) * scaleUp - nextWidth / 2,
      y: CANVAS_CENTER + (itemCenter.y - currentCenter.y) * scaleUp - nextHeight / 2,
      width: nextWidth,
      height: nextHeight,
      updatedAt: Date.now(),
      metadata: item.id === hero.id ? { ...(item.metadata || {}), provider: 'classic-centered-v3' } : item.metadata
    };
  });
};

const centerOf = (element: VisionElement) => ({
  x: element.x + (element.width || defaultSize(element.type).width) / 2,
  y: element.y + (element.height || defaultSize(element.type).height) / 2
});

const getDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Resource';
  }
};

const getYoutubeId = (url: string) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.replace('/', '');
    if (parsed.hostname.includes('youtube.com')) return parsed.searchParams.get('v') || '';
  } catch {
    return '';
  }
  return '';
};

const createResourceMetadata = (url: string): VisionElement['metadata'] => {
  const domain = getDomain(url);
  const youtubeId = getYoutubeId(url);
  return {
    url,
    title: youtubeId ? 'YouTube video' : domain,
    description: youtubeId ? 'Open this video resource on YouTube.' : url,
    source: domain,
    provider: youtubeId ? 'YouTube' : domain,
    image: youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : undefined,
    previewStatus: youtubeId ? 'ready' : 'fallback'
  };
};

const normalizeResourceUrl = (rawUrl: string) => {
  const parsed = new URL(safeString(rawUrl).trim());
  if (parsed.protocol !== 'https:') throw new Error('Use a valid https:// link.');
  return parsed.toString();
};

export const CreativeCanvas: React.FC<CreativeCanvasProps> = ({ vision, updateVision, onActiveChange, readOnly = false }) => {
  const addToast = useStore(state => state.addToast);
  const session = useStore(state => state.session);
  const notes = useStore(state => state.notes);
  const fetchNotes = useStore(state => state.fetchNotes);

  const [elements, setElements] = useState<VisionElement[]>(() => normalizeElements(vision.elements));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<BoardTool>('select');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [scale, setScale] = useState(0.45);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [moreToolsOpen, setMoreToolsOpen] = useState(false);
  const [importPanelOpen, setImportPanelOpen] = useState(false);
  const [linkPanelOpen, setLinkPanelOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [penColor, setPenColor] = useState('var(--accent)');

  const viewportRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const currentVisionIdRef = useRef(vision.id);
  const autoTemplateVisionRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingElementsRef = useRef<VisionElement[]>(normalizeElements(vision.elements));
  const localVersionRef = useRef(0);
  const savingRef = useRef(false);
  const resaveRef = useRef(false);
  const dirtyRef = useRef(false);
  const undoStackRef = useRef<VisionElement[][]>([]);
  const redoStackRef = useRef<VisionElement[][]>([]);
  const panRef = useRef<{ pointerId: number; x: number; y: number; ox: number; oy: number } | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const drawingRef = useRef<{ id: string; pointerId: number; points: Array<{ x: number; y: number }> } | null>(null);

  const selectedElement = useMemo(() => elements.find(element => element.id === selectedId) || null, [elements, selectedId]);
  const visibleElements = useMemo(() => elements.filter(element => element.type !== 'connector' && element.type !== 'drawing'), [elements]);
  const contentBounds = useMemo(() => {
    if (visibleElements.length === 0) {
      return { minX: CANVAS_CENTER - 600, minY: CANVAS_CENTER - 360, maxX: CANVAS_CENTER + 600, maxY: CANVAS_CENTER + 360 };
    }
    return visibleElements.reduce((acc, element) => {
      const size = defaultSize(element.type);
      const width = element.width || size.width;
      const height = element.height || size.height;
      return {
        minX: Math.min(acc.minX, element.x),
        minY: Math.min(acc.minY, element.y),
        maxX: Math.max(acc.maxX, element.x + width),
        maxY: Math.max(acc.maxY, element.y + height)
      };
    }, { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY });
  }, [visibleElements]);

  const viewportToCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    const left = rect?.left || 0;
    const top = rect?.top || 0;
    return {
      x: (clientX - left - offset.x) / scale,
      y: (clientY - top - offset.y) / scale
    };
  }, [offset.x, offset.y, scale]);

  const explainReadOnly = useCallback(() => {
    addToast({
      type: 'info',
      title: 'View-only access',
      description: 'Ask the owner for edit permission to change this board.'
    });
  }, [addToast]);

  const fitToContent = useCallback((animate = false) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    const width = Math.max(320, rect?.width || window.innerWidth);
    const height = Math.max(260, rect?.height || window.innerHeight);
    const contentWidth = Math.max(420, contentBounds.maxX - contentBounds.minX);
    const contentHeight = Math.max(300, contentBounds.maxY - contentBounds.minY);
    const nextScale = clamp(Math.min((width - 220) / contentWidth, (height - 220) / contentHeight), MIN_ZOOM, 1);
    const centerX = (contentBounds.minX + contentBounds.maxX) / 2;
    const centerY = (contentBounds.minY + contentBounds.maxY) / 2;
    setScale(nextScale);
    setOffset({
      x: width / 2 - centerX * nextScale,
      y: height / 2 - centerY * nextScale
    });
    if (animate) onActiveChange?.(true);
  }, [contentBounds.maxX, contentBounds.maxY, contentBounds.minX, contentBounds.minY, onActiveChange]);

  const zoomTo = useCallback((nextScale: number, anchor?: { x: number; y: number }) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    const viewportAnchor = anchor || { x: (rect?.width || window.innerWidth) / 2, y: (rect?.height || window.innerHeight) / 2 };
    const canvasPoint = {
      x: (viewportAnchor.x - offset.x) / scale,
      y: (viewportAnchor.y - offset.y) / scale
    };
    const clamped = clamp(nextScale, MIN_ZOOM, MAX_ZOOM);
    setScale(clamped);
    setOffset({
      x: viewportAnchor.x - canvasPoint.x * clamped,
      y: viewportAnchor.y - canvasPoint.y * clamped
    });
  }, [offset.x, offset.y, scale]);

  const persistNow = useCallback(async (nextElements?: VisionElement[], version = localVersionRef.current) => {
    if (readOnly) {
      setSaveStatus('saved');
      return;
    }
    const payload = nextElements || pendingElementsRef.current;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (savingRef.current) {
      resaveRef.current = true;
      setSaveStatus('saving');
      return;
    }
    savingRef.current = true;
    setSaveStatus('saving');
    try {
      const result = await Promise.resolve(updateVision(vision.id, { elements: payload }));
      if (result === false) throw new Error('Could not save this board change.');
      if (version === localVersionRef.current) {
        dirtyRef.current = false;
        setSaveStatus('saved');
        setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else {
        dirtyRef.current = true;
        setSaveStatus('dirty');
      }
    } catch (error) {
      console.error('Vision Board save failed:', error);
      setSaveStatus('failed');
      addToast({ type: 'error', title: 'Board save failed', description: 'Could not save this board change.' });
    } finally {
      savingRef.current = false;
      if (resaveRef.current || version < localVersionRef.current) {
        resaveRef.current = false;
        void persistNow(pendingElementsRef.current, localVersionRef.current);
      }
    }
  }, [addToast, readOnly, updateVision, vision.id]);

  const scheduleSave = useCallback((nextElements: VisionElement[]) => {
    if (readOnly) return;
    pendingElementsRef.current = nextElements;
    dirtyRef.current = true;
    localVersionRef.current += 1;
    const version = localVersionRef.current;
    setSaveStatus('dirty');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => persistNow(nextElements, version), SAVE_DELAY_MS);
  }, [persistNow, readOnly]);

  const applyElements = useCallback((updater: VisionElement[] | ((current: VisionElement[]) => VisionElement[]), save = true, history = save) => {
    if (readOnly) {
      explainReadOnly();
      return;
    }
    setElements(current => {
      const rawNext = typeof updater === 'function' ? updater(current) : updater;
      const next = save ? normalizeElements(rawNext) : rawNext;
      if (history) {
        undoStackRef.current = [...undoStackRef.current.slice(-49), cloneElements(current)];
        redoStackRef.current = [];
      }
      pendingElementsRef.current = next;
      if (save) scheduleSave(next);
      return next;
    });
  }, [explainReadOnly, readOnly, scheduleSave]);

  const updateElement = useCallback((id: string, updates: Partial<VisionElement>, save = true, history = save) => {
    if (readOnly) return;
    applyElements(current => current.map(element => element.id === id ? {
      ...element,
      ...updates,
      metadata: updates.metadata ? { ...(element.metadata || {}), ...updates.metadata } : element.metadata,
      updatedAt: Date.now()
    } : element), save, history);
  }, [applyElements, readOnly]);

  const createElement = useCallback((
    type: VisionElement['type'],
    content: string,
    metadata: VisionElement['metadata'] = {},
    x?: number,
    y?: number
  ) => {
    if (readOnly) {
      explainReadOnly();
      return null;
    }
    const size = defaultSize(type);
    const rect = viewportRef.current?.getBoundingClientRect();
    const point = x !== undefined && y !== undefined
      ? { x, y }
      : viewportToCanvas((rect?.left || 0) + (rect?.width || 900) / 2, (rect?.top || 0) + (rect?.height || 600) / 2);
    const now = Date.now();
    const element: VisionElement = {
      id: newId(type),
      type,
      content,
      x: point.x - size.width / 2,
      y: point.y - size.height / 2,
      width: size.width,
      height: size.height,
      rotation: 0,
      zIndex: type === 'section' ? 20 : now,
      createdAt: now,
      updatedAt: now,
      metadata
    };
    applyElements(current => [...current, element], true, true);
    setSelectedId(element.id);
    setActiveTool('select');
    setMobileToolsOpen(false);
    setMoreToolsOpen(false);
    setImportPanelOpen(false);
    return element;
  }, [applyElements, explainReadOnly, readOnly, viewportToCanvas]);

  const applyTemplate = useCallback((template: BoardTemplateId, mode: 'replace' | 'append' = 'replace') => {
    const templateElements = createTemplateElements(template, vision);
    applyElements(current => mode === 'append' ? [...current, ...templateElements] : templateElements, true, true);
    setSelectedId(null);
    setMoreToolsOpen(false);
    setMobileToolsOpen(false);
    window.setTimeout(() => fitToContent(true), 50);
  }, [applyElements, fitToContent, vision]);

  const deleteElement = useCallback((id: string) => {
    if (readOnly) {
      explainReadOnly();
      return;
    }
    applyElements(current => current.filter(element => (
      element.id !== id &&
      element.metadata?.fromElementId !== id &&
      element.metadata?.toElementId !== id
    )), true, true);
    setSelectedId(current => current === id ? null : current);
  }, [applyElements, explainReadOnly, readOnly]);

  const duplicateElement = useCallback((id: string) => {
    if (readOnly) {
      explainReadOnly();
      return;
    }
    const source = elements.find(element => element.id === id);
    if (!source) return;
    const now = Date.now();
    const duplicate = {
      ...source,
      id: newId('copy'),
      x: source.x + 42,
      y: source.y + 42,
      zIndex: now,
      createdAt: now,
      updatedAt: now,
      metadata: safeObject(source.metadata)
    };
    applyElements(current => [...current, duplicate], true, true);
    setSelectedId(duplicate.id);
  }, [applyElements, elements, explainReadOnly, readOnly]);

  const moveLayer = useCallback((id: string, direction: 'forward' | 'backward') => {
    const target = elements.find(element => element.id === id);
    if (!target) return;
    const layerFloor = target.type === 'section' ? SECTION_LAYER_FLOOR : ITEM_LAYER_FLOOR;
    const layerCeiling = elements
      .filter(element => target.type === 'section' ? element.type === 'section' : element.type !== 'section')
      .reduce((max, element) => Math.max(max, safeNumber(element.zIndex, 1)), layerFloor);
    const currentLayer = Math.max(layerFloor, safeNumber(target.zIndex, layerFloor));
    updateElement(id, {
      zIndex: direction === 'forward'
        ? layerCeiling + 25
        : Math.max(layerFloor, currentLayer - 25)
    });
  }, [elements, updateElement]);

  const eraseAtPoint = useCallback((clientX: number, clientY: number) => {
    if (readOnly) {
      explainReadOnly();
      return false;
    }
    const point = viewportToCanvas(clientX, clientY);
    const hit = [...elements]
      .sort((a, b) => safeNumber(b.zIndex, 1) - safeNumber(a.zIndex, 1))
      .find(element => {
        if (element.type === 'connector') return false;
        if (element.type === 'drawing') {
          const points = safeString(element.content)
            .split(/[ML]\s*/g)
            .map(part => part.trim())
            .filter(Boolean)
            .map(part => {
              const [x, y] = part.split(/\s+/).map(Number);
              return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
            })
            .filter(Boolean) as Array<{ x: number; y: number }>;
          return points.some(item => Math.hypot(item.x - point.x, item.y - point.y) <= 28 / scale);
        }
        const width = element.width || defaultSize(element.type).width;
        const height = element.height || defaultSize(element.type).height;
        return point.x >= element.x && point.x <= element.x + width && point.y >= element.y && point.y <= element.y + height;
      });
    if (!hit) return false;
    deleteElement(hit.id);
    setActiveTool('select');
    return true;
  }, [deleteElement, elements, explainReadOnly, readOnly, scale, viewportToCanvas]);

  const restoreHistory = useCallback((direction: 'undo' | 'redo') => {
    const source = direction === 'undo' ? undoStackRef.current : redoStackRef.current;
    const target = direction === 'undo' ? redoStackRef.current : undoStackRef.current;
    const snapshot = source.pop();
    if (!snapshot) return;
    setElements(current => {
      target.push(cloneElements(current));
      const restored = cloneElements(snapshot);
      pendingElementsRef.current = restored;
      scheduleSave(restored);
      setSelectedId(null);
      return restored;
    });
  }, [scheduleSave]);

  const importImageFile = useCallback(async (file: File, x?: number, y?: number) => {
    if (readOnly) {
      explainReadOnly();
      return;
    }
    const normalizedType = (file.type || '').toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(normalizedType)) {
      addToast({ type: 'error', title: 'Unsupported image', description: 'Use a PNG, JPG, or WebP image.' });
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      addToast({ type: 'error', title: 'Image too large', description: 'Keep board images under 10MB.' });
      return;
    }
    const userId = session?.user?.id;
    if (!userId) {
      addToast({ type: 'error', title: 'Sign in required', description: 'Please sign in before uploading images.' });
      return;
    }
    setIsUploading(true);
    try {
      const uploaded = await uploadVisionBoardImage(file, vision.id, userId);
      createElement('image', uploaded.publicUrl, { imageUrl: uploaded.publicUrl, storagePath: uploaded.filePath }, x, y);
      addToast({ type: 'success', title: 'Image added', description: 'Image uploaded to your Vision Board.' });
    } catch (error: any) {
      console.error('Vision Board image upload failed:', error);
      addToast({ type: 'error', title: 'Image upload failed', description: error.message || 'Could not upload this image.' });
    } finally {
      setIsUploading(false);
    }
  }, [addToast, createElement, explainReadOnly, readOnly, session?.user?.id, vision.id]);

  const addResourceLink = useCallback(() => {
    try {
      const url = normalizeResourceUrl(linkDraft);
      createElement('link', url, createResourceMetadata(url));
      setLinkDraft('');
      setLinkPanelOpen(false);
      addToast({ type: 'success', title: 'Resource added', description: 'Link preview added to the board.' });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Invalid link', description: error.message || 'Use a valid https:// URL.' });
    }
  }, [addToast, createElement, linkDraft]);

  const importNote = useCallback((note: Note) => {
    createElement('sticky', safeString(note.content, 'Imported note'), {
      noteId: note.id,
      title: safeString(note.title, 'Untitled Note'),
      color: '#fef3c7'
    });
    setImportPanelOpen(false);
  }, [createElement]);

  const importVisionTasks = useCallback(() => {
    const taskItems = safeArray<Task>(vision.tasks).slice(0, 12).map(task => ({
      id: task.id,
      text: safeString(task.text, 'Untitled task'),
      completed: Boolean(task.completed)
    }));
    createElement('checklist', 'Vision Tasks', { checklist: taskItems });
    setImportPanelOpen(false);
  }, [createElement, vision.tasks]);

  const addChecklistItem = useCallback((element: VisionElement, text: string) => {
    const next = [...normalizeChecklist(element.metadata?.checklist), { id: newId('item'), text, completed: false }];
    updateElement(element.id, { metadata: { checklist: next } });
  }, [updateElement]);

  useEffect(() => {
    const rawNormalized = normalizeElements(vision.elements);
    const normalized = centerClassicTemplate(rawNormalized);
    const visionChanged = currentVisionIdRef.current !== vision.id;
    currentVisionIdRef.current = vision.id;
    if (!visionChanged && dirtyRef.current) return;
    setElements(normalized);
    pendingElementsRef.current = normalized;
    localVersionRef.current = 0;
    dirtyRef.current = false;
    savingRef.current = false;
    resaveRef.current = false;
    undoStackRef.current = [];
    redoStackRef.current = [];
    if (visionChanged) {
      setSelectedId(null);
      setEditingId(null);
      setImportPanelOpen(false);
      setLinkPanelOpen(false);
      setMobileToolsOpen(false);
      setMoreToolsOpen(false);
    }
    setSaveStatus('saved');
    if (normalized !== rawNormalized) {
      localVersionRef.current = 1;
      dirtyRef.current = true;
      scheduleSave(normalized);
    }
  }, [scheduleSave, vision.elements, vision.id]);

  useEffect(() => {
    if (readOnly) return;
    const persistedElements = normalizeElements(vision.elements);
    if (persistedElements.length > 0 || elements.length > 0) return;
    if (autoTemplateVisionRef.current === vision.id) return;
    autoTemplateVisionRef.current = vision.id;
    applyTemplate('classic', 'replace');
  }, [applyTemplate, elements.length, readOnly, vision.elements, vision.id]);

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    if (!viewportSize.width || !viewportSize.height) return;
    fitToContent();
  // Fit on vision open/viewport ready. Element edits should not keep recentering the board.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vision.id, viewportSize.width, viewportSize.height]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const onNativeWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = node.getBoundingClientRect();
      const normalizedDelta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * 80 : event.deltaY;
      const factor = Math.exp(-normalizedDelta * WHEEL_ZOOM_SPEED);
      zoomTo(scale * factor, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
    };
    node.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => node.removeEventListener('wheel', onNativeWheel);
  }, [scale, zoomTo]);

  useEffect(() => {
    if (importPanelOpen) fetchNotes().catch(error => console.error('Failed to load notes for Vision Board import:', error));
  }, [fetchNotes, importPanelOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isTyping) return;
      const key = event.key.toLowerCase();
      if (readOnly && (event.key === 'Delete' || event.key === 'Backspace' || ((event.ctrlKey || event.metaKey) && ['d', 's', 'z', 'y'].includes(key)))) {
        event.preventDefault();
        explainReadOnly();
        return;
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        event.preventDefault();
        deleteElement(selectedId);
      }
      if ((event.ctrlKey || event.metaKey) && key === 'd' && selectedId) {
        event.preventDefault();
        duplicateElement(selectedId);
      }
      if ((event.ctrlKey || event.metaKey) && key === 's') {
        event.preventDefault();
        void persistNow();
      }
      if ((event.ctrlKey || event.metaKey) && key === 'z') {
        event.preventDefault();
        restoreHistory(event.shiftKey ? 'redo' : 'undo');
      }
      if ((event.ctrlKey || event.metaKey) && key === 'y') {
        event.preventDefault();
        restoreHistory('redo');
      }
      if ((event.ctrlKey || event.metaKey) && (key === '+' || key === '=')) {
        event.preventDefault();
        zoomTo(scale + (scale < 0.25 ? 0.03 : 0.12));
      }
      if ((event.ctrlKey || event.metaKey) && (key === '-' || key === '_')) {
        event.preventDefault();
        zoomTo(scale - (scale <= 0.25 ? 0.03 : 0.12));
      }
      if ((event.ctrlKey || event.metaKey) && key === '0') {
        event.preventDefault();
        fitToContent(true);
      }
      if (event.key === 'Escape') {
        setEditingId(null);
        setSelectedId(null);
        setActiveTool('select');
        setMobileToolsOpen(false);
        setMoreToolsOpen(false);
        setImportPanelOpen(false);
        setLinkPanelOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteElement, duplicateElement, explainReadOnly, fitToContent, persistNow, readOnly, restoreHistory, scale, selectedId, zoomTo]);

  const startDrawing = (event: React.PointerEvent<HTMLDivElement>) => {
    if (readOnly) return false;
    if (activeTool !== 'pen' || event.button !== 0) return false;
    event.preventDefault();
    event.stopPropagation();
    const point = viewportToCanvas(event.clientX, event.clientY);
    const now = Date.now();
    const drawing: VisionElement = {
      id: newId('drawing'),
      type: 'drawing',
      content: `M ${Math.round(point.x)} ${Math.round(point.y)}`,
      x: 0,
      y: 0,
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      zIndex: now,
      createdAt: now,
      updatedAt: now,
      metadata: { strokeColor: penColor }
    };
    drawingRef.current = { id: drawing.id, pointerId: event.pointerId, points: [point] };
    setIsDraggingElement(true);
    setSelectedId(null);
    applyElements(current => [...current, drawing], false, false);
    return true;
  };

  const continueDrawing = (event: React.PointerEvent<HTMLDivElement>) => {
    const drawing = drawingRef.current;
    if (!drawing || drawing.pointerId !== event.pointerId) return false;
    event.preventDefault();
    event.stopPropagation();
    const point = viewportToCanvas(event.clientX, event.clientY);
    drawing.points.push(point);
    const content = drawing.points.map((item, index) => `${index === 0 ? 'M' : 'L'} ${Math.round(item.x)} ${Math.round(item.y)}`).join(' ');
    applyElements(current => current.map(element => element.id === drawing.id ? { ...element, content, updatedAt: Date.now() } : element), false, false);
    return true;
  };

  const stopDrawing = (event: React.PointerEvent<HTMLDivElement>) => {
    const drawing = drawingRef.current;
    if (!drawing || drawing.pointerId !== event.pointerId) return false;
    event.preventDefault();
    event.stopPropagation();
    const content = drawing.points.map((item, index) => `${index === 0 ? 'M' : 'L'} ${Math.round(item.x)} ${Math.round(item.y)}`).join(' ');
    drawingRef.current = null;
    setIsDraggingElement(false);
    updateElement(drawing.id, { content }, true, true);
    return true;
  };

  const handleViewportPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      const points = Array.from(pointersRef.current.values());
      pinchRef.current = { distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y), scale };
      return;
    }
    if (startDrawing(event)) return;
    if ((event.target as HTMLElement).closest('[data-no-pan], [data-control], input, textarea, button, a')) return;
    if (activeTool === 'eraser' && event.button === 0) {
      event.preventDefault();
      event.stopPropagation();
      eraseAtPoint(event.clientX, event.clientY);
      return;
    }
    setSelectedId(null);
    setMobileToolsOpen(false);
    setMoreToolsOpen(false);
    if (activeTool !== 'select' || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
    setIsPanning(true);
    onActiveChange?.(true);
  };

  const handleViewportPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pinchRef.current && pointersRef.current.size >= 2) {
        const points = Array.from(pointersRef.current.values());
        const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        zoomTo(pinchRef.current.scale * (distance / Math.max(1, pinchRef.current.distance)));
        return;
      }
    }
    if (continueDrawing(event)) return;
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    event.preventDefault();
    setOffset({ x: pan.ox + event.clientX - pan.x, y: pan.oy + event.clientY - pan.y });
  };

  const handleViewportPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (stopDrawing(event)) return;
    if (panRef.current?.pointerId === event.pointerId) {
      panRef.current = null;
      setIsPanning(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = Array.from(event.dataTransfer.files || []).find(item => item.type.startsWith('image/'));
    if (!file) return;
    const point = viewportToCanvas(event.clientX, event.clientY);
    void importImageFile(file, point.x, point.y);
  };

  const addMenuOptions = (
    <>
      <CanvasToolButton icon={<Layers3 size={18} />} label="Section" onClick={() => createElement('section', 'New Section', { title: 'New Section', fillColor: SECTION_COLORS.lavender.fill, strokeColor: SECTION_COLORS.lavender.border } as VisionElement['metadata'])} />
      <CanvasToolButton icon={<Type size={18} />} label="Text" onClick={() => createElement('text', 'Write anything', { fontSize: '22px' })} />
      <CanvasToolButton icon={<StickyNote size={18} />} label="Sticky" onClick={() => createElement('sticky', 'Idea or reminder', { color: '#fef08a' })} />
      <CanvasToolButton icon={<FileText size={18} />} label="Checklist" onClick={() => createElement('checklist', 'Checklist', { checklist: [{ id: newId('item'), text: 'First item', completed: false }] })} />
      <CanvasToolButton icon={<Target size={18} />} label="Task" onClick={() => createElement('task', 'Next task', { title: 'Next task', description: 'Move this Vision forward.' } as VisionElement['metadata'])} />
      <CanvasToolButton icon={<ImageIcon size={18} />} label="Image" onClick={() => imageInputRef.current?.click()} loading={isUploading} />
      <CanvasToolButton icon={<Square size={18} />} label="Shape" onClick={() => createElement('shape', 'Label', { shapeType: 'rectangle', fillColor: '#8b5cf622', strokeColor: 'var(--accent)' })} />
      <CanvasToolButton icon={<LinkIcon size={18} />} label="Link" onClick={() => { setMobileToolsOpen(false); setLinkPanelOpen(true); }} />
      <CanvasToolButton icon={<Upload size={18} />} label="Import" onClick={() => setImportPanelOpen(true)} />
    </>
  );

  const primaryTools = (
    <>
      <CanvasQuickButton icon={<Brush size={17} />} label="Pen" onClick={() => setActiveTool(activeTool === 'pen' ? 'select' : 'pen')} active={activeTool === 'pen'} />
      <CanvasQuickButton icon={<Eraser size={17} />} label="Eraser" onClick={() => setActiveTool(activeTool === 'eraser' ? 'select' : 'eraser')} active={activeTool === 'eraser'} />
      <div className="mx-1 h-7 w-px shrink-0 bg-card-border" />
      <CanvasQuickButton icon={<Layers3 size={17} />} label="Section" onClick={() => createElement('section', 'New Section', { title: 'New Section', fillColor: SECTION_COLORS.lavender.fill, strokeColor: SECTION_COLORS.lavender.border } as VisionElement['metadata'])} />
      <CanvasQuickButton icon={<Type size={17} />} label="Text" onClick={() => createElement('text', 'Write anything', { fontSize: '22px' })} />
      <CanvasQuickButton icon={<StickyNote size={17} />} label="Sticky" onClick={() => createElement('sticky', 'Idea or reminder', { color: '#fef08a' })} />
      <CanvasQuickButton icon={<FileText size={17} />} label="Checklist" onClick={() => createElement('checklist', 'Checklist', { checklist: [{ id: newId('item'), text: 'First item', completed: false }] })} />
      <CanvasQuickButton icon={<ImageIcon size={17} />} label="Image" onClick={() => imageInputRef.current?.click()} loading={isUploading} />
      <CanvasQuickButton icon={<LinkIcon size={17} />} label="Link" onClick={() => setLinkPanelOpen(true)} />
      <CanvasQuickButton icon={<MoreHorizontal size={18} />} label="More" onClick={() => setMoreToolsOpen(value => !value)} active={moreToolsOpen} />
    </>
  );

  return (
    <div
      ref={viewportRef}
      className={cn(
        'relative h-full min-h-[520px] w-full overflow-hidden bg-bg-base/20 select-none',
        activeTool === 'pen' && 'cursor-crosshair',
        activeTool === 'eraser' && 'cursor-crosshair',
        isPanning && 'cursor-grabbing'
      )}
      onPointerDown={handleViewportPointerDown}
      onPointerMove={handleViewportPointerMove}
      onPointerUp={handleViewportPointerUp}
      onPointerCancel={handleViewportPointerUp}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="absolute left-1/2 top-4 z-[165] hidden -translate-x-1/2 items-center gap-1 rounded-full border border-card-border bg-card/95 p-1.5 shadow-2xl shadow-accent/10 ring-4 ring-bg-base/70 backdrop-blur-xl md:flex">
        {primaryTools}
      </div>

      <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-1/2 z-[165] flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full border border-card-border bg-card/95 p-1.5 shadow-2xl shadow-accent/10 ring-4 ring-bg-base/70 backdrop-blur-xl md:hidden">
        <CanvasQuickButton icon={<Brush size={17} />} label="Pen" onClick={() => setActiveTool(activeTool === 'pen' ? 'select' : 'pen')} active={activeTool === 'pen'} compact />
        <CanvasQuickButton icon={<Eraser size={17} />} label="Eraser" onClick={() => setActiveTool(activeTool === 'eraser' ? 'select' : 'eraser')} active={activeTool === 'eraser'} compact />
        <CanvasQuickButton icon={<Type size={17} />} label="Text" onClick={() => createElement('text', 'Write anything', { fontSize: '22px' })} compact />
        <CanvasQuickButton icon={<StickyNote size={17} />} label="Sticky" onClick={() => createElement('sticky', 'Idea or reminder', { color: '#fef08a' })} compact />
        <CanvasQuickButton icon={<MoreHorizontal size={18} />} label="More" onClick={() => setMobileToolsOpen(value => !value)} active={mobileToolsOpen} compact />
      </div>

      <AnimatePresence>
        {moreToolsOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute left-1/2 top-[5.5rem] z-[170] hidden w-[360px] -translate-x-1/2 grid-cols-3 gap-2 rounded-3xl border border-card-border bg-card/95 p-3 shadow-2xl backdrop-blur-xl md:grid"
            data-no-pan
          >
            <CanvasToolButton icon={<Layers3 size={18} />} label="Add Section" onClick={() => createElement('section', 'New Section', { title: 'New Section', fillColor: SECTION_COLORS.blue.fill, strokeColor: SECTION_COLORS.blue.border } as VisionElement['metadata'])} />
            <CanvasToolButton icon={<Target size={18} />} label="Task Card" onClick={() => createElement('task', 'Next task', { title: 'Next task', description: 'Move this Vision forward.' } as VisionElement['metadata'])} />
            <CanvasToolButton icon={<Square size={18} />} label="Shape" onClick={() => createElement('shape', 'Label', { shapeType: 'rectangle', fillColor: '#8b5cf622', strokeColor: 'var(--accent)' })} />
            <CanvasToolButton icon={<Upload size={18} />} label="Import" onClick={() => setImportPanelOpen(true)} />
            <CanvasToolButton icon={<Maximize2 size={18} />} label="Fit" onClick={() => fitToContent(true)} />
            <div className="col-span-3 rounded-2xl bg-bg-base/60 p-3">
              <p className="mb-2 text-[8px] font-black uppercase tracking-widest text-text-secondary">Pen color</p>
              <div className="flex flex-wrap gap-2">
                {ELEMENT_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setPenColor(color)}
                    className={cn('h-7 w-7 rounded-full border-2 shadow-sm transition-transform hover:scale-110', penColor === color ? 'border-text-main' : 'border-card')}
                    style={{ background: color }}
                    aria-label={`Use pen color ${color}`}
                    data-no-pan
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importImageFile(file);
          event.target.value = '';
        }}
      />

      <SavePill status={saveStatus} lastSavedAt={lastSavedAt} onRetry={() => void persistNow()} />

      <div
        className="absolute left-0 top-0 h-full w-full origin-top-left will-change-transform"
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
          width: CANVAS_SIZE,
          height: CANVAS_SIZE
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(120,120,120,0.18)_1px,transparent_1px)] [background-size:24px_24px]" />
        <div
          className="pointer-events-none absolute rounded-[72px] border border-card-border/60 bg-card/45 shadow-2xl shadow-accent/10"
          style={{ left: BOARD_SURFACE.x, top: BOARD_SURFACE.y, width: BOARD_SURFACE.width, height: BOARD_SURFACE.height }}
        />
        <div
          className="pointer-events-none absolute overflow-hidden rounded-[72px]"
          style={{ left: BOARD_SURFACE.x, top: BOARD_SURFACE.y, width: BOARD_SURFACE.width, height: BOARD_SURFACE.height }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(139,92,246,0.12),transparent_30%),radial-gradient(circle_at_85%_22%,rgba(96,165,250,0.10),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.62),rgba(241,236,255,0.34))]" />
        </div>
        <div
          className="pointer-events-none absolute rounded-[64px] border-2 border-dashed border-accent/18 bg-card/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.34)]"
          style={{ left: BOARD_INNER_SURFACE.x, top: BOARD_INNER_SURFACE.y, width: BOARD_INNER_SURFACE.width, height: BOARD_INNER_SURFACE.height }}
        />

        <svg className="absolute inset-0 h-full w-full overflow-visible pointer-events-none">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orientation="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" className="text-accent" />
            </marker>
          </defs>
          {elements.filter(element => element.type === 'connector').map(connector => (
            <ConnectorLine key={connector.id} connector={connector} elements={elements} />
          ))}
          {elements.filter(element => element.type === 'drawing').map(drawing => (
            <path
              key={drawing.id}
              d={safeString(drawing.content)}
              fill="none"
              stroke={drawing.metadata?.strokeColor || 'var(--accent)'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>

        {elements.filter(element => element.type !== 'connector' && element.type !== 'drawing').map(element => (
          <BoardElement
            key={element.id}
            element={element}
            selected={selectedId === element.id}
            editing={editingId === element.id}
            activeTool={activeTool}
            scale={scale}
            onSelect={() => setSelectedId(element.id)}
            onEdit={() => setEditingId(element.id)}
            onEditingDone={() => setEditingId(null)}
            onUpdate={(updates, save, history) => updateElement(element.id, updates, save, history)}
            onDelete={() => deleteElement(element.id)}
            onCopy={() => duplicateElement(element.id)}
            onBringForward={() => moveLayer(element.id, 'forward')}
            onSendBackward={() => moveLayer(element.id, 'backward')}
            onDeselect={() => setSelectedId(null)}
            onDragStateChange={setIsDraggingElement}
            onResizeStateChange={setIsResizing}
          />
        ))}
      </div>

      <div className="absolute bottom-[calc(10.25rem+env(safe-area-inset-bottom))] right-3 z-[170] w-60 rounded-2xl border border-card-border bg-card/95 p-2 shadow-2xl shadow-accent/10 ring-4 ring-bg-base/70 backdrop-blur-xl md:bottom-5 md:right-5" data-no-pan>
        <div className="grid h-14 grid-cols-[44px_1fr_44px] items-center rounded-xl bg-bg-base/50">
          <ControlButton onClick={() => zoomTo(scale - (scale <= 0.25 ? 0.03 : 0.12))} icon={<Minus size={22} />} label="Zoom Out" compact />
          <span className="text-center text-lg font-black tabular-nums text-text-main">{Math.round(scale * 100)}%</span>
          <ControlButton onClick={() => zoomTo(scale + (scale < 0.25 ? 0.03 : 0.12))} icon={<Plus size={24} />} label="Zoom In" compact />
        </div>
        <div className="mt-2 flex items-center gap-2 px-1">
          <span className="w-8 text-[9px] font-black tabular-nums text-text-secondary">{Math.round(MIN_ZOOM * 100)}%</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={scale}
            onChange={(event) => zoomTo(Number(event.target.value))}
            className="min-w-0 flex-1 accent-[var(--accent)]"
            aria-label="Zoom level"
          />
          <span className="w-9 text-right text-[9px] font-black tabular-nums text-text-secondary">{Math.round(MAX_ZOOM * 100)}%</span>
        </div>
        <div className="mt-2 flex items-center justify-end gap-2 px-1">
          <ControlButton onClick={() => fitToContent(true)} icon={<Maximize2 size={14} />} label="Fit Board" compact />
          <ControlButton onClick={() => { setScale(1); fitToContent(true); }} icon={<RotateCcw size={14} />} label="Center" compact />
        </div>
      </div>

      {elements.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center px-5 text-center">
          <div className="rounded-[2rem] border border-card-border bg-card/90 px-6 py-5 shadow-2xl shadow-accent/10 ring-4 ring-bg-base/60 backdrop-blur-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-accent">Vision Board</p>
            <p className="mt-2 text-sm font-bold text-text-secondary">Preparing your Classic Vision Board...</p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {mobileToolsOpen && (
          <MobileToolsSheet onClose={() => setMobileToolsOpen(false)}>
            {addMenuOptions}
          </MobileToolsSheet>
        )}
        {selectedElement && (
          <ElementEditor
            element={selectedElement}
            onUpdate={(updates) => updateElement(selectedElement.id, updates)}
            onBringForward={() => moveLayer(selectedElement.id, 'forward')}
            onSendBackward={() => moveLayer(selectedElement.id, 'backward')}
            onDelete={() => deleteElement(selectedElement.id)}
            onClose={() => setSelectedId(null)}
            onAddChecklistItem={(text) => addChecklistItem(selectedElement, text)}
          />
        )}
        {importPanelOpen && (
          <ImportPanel
            notes={notes}
            tasks={safeArray(vision.tasks)}
            isUploading={isUploading}
            onClose={() => setImportPanelOpen(false)}
            onUploadImage={() => imageInputRef.current?.click()}
            onImportNote={importNote}
            onImportTasks={importVisionTasks}
          />
        )}
        {linkPanelOpen && (
          <ResourceLinkPanel
            value={linkDraft}
            onChange={setLinkDraft}
            onClose={() => setLinkPanelOpen(false)}
            onSubmit={addResourceLink}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

type BoardElementProps = {
  element: VisionElement;
  selected: boolean;
  editing: boolean;
  activeTool: BoardTool;
  scale: number;
  onSelect: () => void;
  onEdit: () => void;
  onEditingDone: () => void;
  onUpdate: (updates: Partial<VisionElement>, save?: boolean, history?: boolean) => void;
  onDelete: () => void;
  onCopy: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onDeselect: () => void;
  onDragStateChange: (active: boolean) => void;
  onResizeStateChange: (active: boolean) => void;
};

const BoardElement = React.memo(({
  element,
  selected,
  editing,
  activeTool,
  scale,
  onSelect,
  onEdit,
  onEditingDone,
  onUpdate,
  onDelete,
  onCopy,
  onBringForward,
  onSendBackward,
  onDeselect,
  onDragStateChange,
  onResizeStateChange
}: BoardElementProps) => {
  const dragRef = useRef<{ pointerId: number; sx: number; sy: number; x: number; y: number } | null>(null);
  const width = element.width || defaultSize(element.type).width;
  const height = element.height || defaultSize(element.type).height;

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[data-control], input, textarea, button, a')) {
      event.stopPropagation();
      return;
    }
    if (activeTool === 'eraser') {
      event.stopPropagation();
      event.preventDefault();
      onDelete();
      return;
    }
    if (activeTool !== 'select' || event.button !== 0 || editing) return;
    event.stopPropagation();
    event.preventDefault();
    onSelect();
    onDragStateChange(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, sx: event.clientX, sy: event.clientY, x: element.x, y: element.y };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const nextX = drag.x + (event.clientX - drag.sx) / scale;
    const nextY = drag.y + (event.clientY - drag.sy) / scale;
    onUpdate({ x: nextX, y: nextY }, false, false);
  };

  const stopDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const nextX = drag.x + (event.clientX - drag.sx) / scale;
    const nextY = drag.y + (event.clientY - drag.sy) / scale;
    dragRef.current = null;
    onDragStateChange(false);
    onUpdate({ x: nextX, y: nextY }, true, true);
  };

  return (
    <div
      className={cn(
        'absolute touch-none will-change-transform',
        editing ? 'cursor-text' : 'cursor-grab active:cursor-grabbing',
        activeTool === 'eraser' && 'cursor-crosshair',
        selected && 'z-[200]'
      )}
      style={{
        transform: `translate3d(${element.x}px, ${element.y}px, 0)`,
        width,
        height,
        zIndex: selected ? 200000 : element.zIndex || 1
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        if (['text', 'sticky', 'checklist', 'shape', 'link', 'section', 'task', 'note', 'quote'].includes(element.type)) onEdit();
      }}
      data-no-pan
    >
      {selected && (
        <SelectedElementActions
          onCopy={onCopy}
          onBringForward={onBringForward}
          onSendBackward={onSendBackward}
          onDelete={onDelete}
          onClose={onDeselect}
        />
      )}
      <ElementContent element={element} selected={selected} editing={editing} onEdit={onEdit} onDone={onEditingDone} onUpdate={onUpdate} />
      {selected && RESIZABLE_TYPES.has(element.type) && (
        <ResizeHandles element={element} scale={scale} onUpdate={onUpdate} onResizeStateChange={onResizeStateChange} />
      )}
    </div>
  );
});

function ElementContent({
  element,
  selected,
  editing,
  onEdit,
  onDone,
  onUpdate
}: {
  element: VisionElement;
  selected: boolean;
  editing: boolean;
  onEdit: () => void;
  onDone: () => void;
  onUpdate: (updates: Partial<VisionElement>, save?: boolean, history?: boolean) => void;
}) {
  const width = element.width || defaultSize(element.type).width;
  const height = element.height || defaultSize(element.type).height;
  const baseClass = cn(
    'h-full w-full overflow-hidden rounded-2xl border bg-card shadow-xl transition-colors',
    selected ? 'border-accent ring-4 ring-accent/10' : 'border-card-border'
  );

  if (element.type === 'section') {
    const isHeroSection = element.metadata?.source === 'hero';
    return (
      <div
        className={cn(
          'relative h-full w-full overflow-hidden rounded-[2rem] border-2 p-5 shadow-[0_24px_70px_rgba(37,22,61,0.10)] backdrop-blur-sm',
          selected && 'ring-4 ring-accent/12'
        )}
        style={{
          background: element.metadata?.fillColor || SECTION_COLORS.lavender.fill,
          borderColor: element.metadata?.strokeColor || SECTION_COLORS.lavender.border
        }}
      >
        <div className={cn('absolute inset-0 bg-[radial-gradient(circle_at_18px_18px,rgba(255,255,255,0.55)_1px,transparent_1px)] [background-size:28px_28px]', isHeroSection && 'opacity-30')} />
        {isHeroSection && (
          <>
            <div className="absolute left-1/2 top-0 h-full w-px -rotate-[28deg] bg-white/12" />
            <div className="absolute left-1/2 top-0 h-full w-px rotate-[28deg] bg-white/12" />
            <div className="absolute left-0 top-1/2 h-px w-full bg-white/10" />
          </>
        )}
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className={cn('text-[10px] font-black uppercase tracking-[0.35em] text-text-secondary/70', isHeroSection && 'text-white/70')}>Board Section</p>
            <EditableBlock
              className={cn('mt-1 min-h-10 w-full resize-none bg-transparent p-0 text-2xl font-black leading-tight text-text-main outline-none', isHeroSection && 'text-white')}
              value={element.content || element.metadata?.title || 'Board Section'}
              editing={editing}
              onEdit={onEdit}
              onDone={(value) => {
                onUpdate({ content: value || 'Board Section', metadata: { title: value || 'Board Section' } }, true, true);
                onDone();
              }}
            />
            {element.metadata?.description && (
              <p className={cn('mt-2 max-w-sm text-sm font-semibold leading-relaxed text-text-secondary', isHeroSection && 'text-white/75')}>{element.metadata.description}</p>
            )}
          </div>
          <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-card/70 text-accent shadow-sm', isHeroSection && 'bg-white/18 text-white')}>
            <Layers3 size={18} />
          </span>
        </div>
      </div>
    );
  }

  if (element.type === 'image') {
    const src = element.metadata?.imageUrl || element.content;
    return (
      <div className={cn(baseClass, 'bg-surface-muted')}>
        {src ? <img src={src} alt="" className="h-full w-full object-cover" draggable={false} /> : <div className="grid h-full place-items-center text-xs font-black text-text-secondary">Image unavailable</div>}
      </div>
    );
  }

  if (element.type === 'sticky') {
    return (
      <EditableBlock
        className={cn(baseClass, 'p-4 text-text-main')}
        style={{ background: element.metadata?.color || '#fef08a', fontSize: element.metadata?.fontSize || '20px' }}
        value={element.content || 'Idea or reminder'}
        editing={editing}
        onEdit={onEdit}
        onDone={(value) => {
          onUpdate({ content: value || 'Idea or reminder' }, true, true);
          onDone();
        }}
      />
    );
  }

  if (element.type === 'text') {
    return (
      <EditableBlock
        className={cn('h-full w-full rounded-xl p-3 text-text-main', selected && 'bg-card/70')}
        style={{
          fontSize: element.metadata?.fontSize || '22px',
          fontWeight: element.metadata?.fontWeight || '800',
          textAlign: element.metadata?.textAlign || 'center',
          color: element.metadata?.color || undefined
        }}
        value={element.content || 'Write anything'}
        editing={editing}
        onEdit={onEdit}
        onDone={(value) => {
          onUpdate({ content: value || 'Write anything' }, true, true);
          onDone();
        }}
      />
    );
  }

  if (element.type === 'task') {
    const metadata = safeObject<any>(element.metadata);
    const completed = Boolean(metadata.completed);
    const toggleComplete = () => onUpdate({ metadata: { completed: !completed } as VisionElement['metadata'] }, true, true);
    return (
      <div className={cn(baseClass, 'flex items-center gap-4 p-4')} style={{ background: metadata.color || undefined }}>
        <button
          type="button"
          onClick={toggleComplete}
          className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-2xl border-2 transition-colors', completed ? 'border-accent bg-accent text-accent-contrast' : 'border-card-border bg-bg-base text-text-secondary')}
          data-control
          aria-label={completed ? 'Mark task incomplete' : 'Mark task complete'}
        >
          {completed && <Check size={16} />}
        </button>
        <div className="min-w-0 flex-1">
          <EditableBlock
            className={cn('min-h-7 w-full bg-transparent p-0 text-base font-black leading-tight text-text-main outline-none', completed && 'line-through opacity-60')}
            value={element.content || metadata.title || 'Next task'}
            editing={editing}
            onEdit={onEdit}
            onDone={(value) => {
              onUpdate({ content: value || 'Next task', metadata: { title: value || 'Next task' } }, true, true);
              onDone();
            }}
          />
          <p className="mt-1 line-clamp-2 text-xs font-semibold text-text-secondary">{metadata.description || 'Move this Vision forward.'}</p>
        </div>
      </div>
    );
  }

  if (element.type === 'checklist') {
    const checklist = normalizeChecklist(element.metadata?.checklist);
    const updateChecklist = (next: ChecklistItem[]) => onUpdate({ metadata: { checklist: next } }, true, true);
    return (
      <div className={cn(baseClass, 'p-4')}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-black text-text-main">{safeString(element.content, 'Checklist')}</p>
          <ListChecks size={16} className="text-accent" />
        </div>
        <div className="space-y-2">
          {checklist.map(item => (
            <label key={item.id} className="flex items-center gap-2 text-sm font-semibold text-text-secondary" data-control>
              <input
                type="checkbox"
                checked={item.completed}
                onChange={(event) => updateChecklist(checklist.map(row => row.id === item.id ? { ...row, completed: event.target.checked } : row))}
                className="accent-[var(--accent)]"
              />
              <input
                value={item.text}
                onChange={(event) => updateChecklist(checklist.map(row => row.id === item.id ? { ...row, text: event.target.value } : row))}
                className="min-w-0 flex-1 bg-transparent outline-none"
              />
              <button type="button" onClick={() => updateChecklist(checklist.filter(row => row.id !== item.id))} className="text-text-secondary/50 hover:text-danger" aria-label="Delete checklist item">
                <X size={12} />
              </button>
            </label>
          ))}
          <button
            type="button"
            onClick={() => updateChecklist([...checklist, { id: newId('item'), text: `Item ${checklist.length + 1}`, completed: false }])}
            className="mt-2 rounded-xl bg-accent/10 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-accent"
            data-control
          >
            Add item
          </button>
        </div>
      </div>
    );
  }

  if (element.type === 'link') {
    const url = element.metadata?.url || element.content;
    return (
      <div className={cn(baseClass, 'bg-card')}>
        {element.metadata?.image && (
          <div className="h-[48%] bg-surface-muted">
            <img src={element.metadata.image} alt="" className="h-full w-full object-cover" draggable={false} />
          </div>
        )}
        <div className="flex h-full flex-col justify-between gap-3 p-4">
          <div className="space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-accent">{element.metadata?.provider || getDomain(url)}</p>
            <p className="line-clamp-2 text-sm font-black text-text-main">{element.metadata?.title || getDomain(url)}</p>
            <p className="line-clamp-2 text-xs font-semibold text-text-secondary">{element.metadata?.description || url}</p>
          </div>
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent" data-control aria-label="Open resource">
            <ExternalLink size={15} />
          </a>
        </div>
      </div>
    );
  }

  if (element.type === 'shape') {
    const isCircle = element.metadata?.shapeType === 'circle';
    if (element.metadata?.source === 'proof') {
      return (
        <div
          className={cn(baseClass, 'flex flex-col justify-between p-4')}
          style={{
            background: element.metadata?.fillColor || 'rgba(244,114,182,0.13)',
            borderColor: element.metadata?.strokeColor || 'rgba(244,114,182,0.35)'
          }}
        >
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-text-secondary">Progress Proof</p>
            <p className="mt-2 text-lg font-black text-text-main">{element.content || 'Proof goes here'}</p>
          </div>
          <p className="text-xs font-semibold text-text-secondary">Drop screenshots, wins, updates, and receipts of progress here.</p>
        </div>
      );
    }
    return (
      <EditableBlock
        className={cn(
          'grid h-full w-full place-items-center border-2 p-3 text-center font-black text-text-main shadow-lg',
          isCircle ? 'rounded-full' : 'rounded-2xl'
        )}
        style={{
          background: element.metadata?.fillColor || 'rgba(139,92,246,0.14)',
          borderColor: element.metadata?.strokeColor || 'var(--accent)'
        }}
        value={element.content || 'Label'}
        editing={editing}
        onEdit={onEdit}
        onDone={(value) => {
          onUpdate({ content: value || 'Label' }, true, true);
          onDone();
        }}
      />
    );
  }

  return (
    <div className={baseClass} style={{ width, height }}>
      <div className="grid h-full place-items-center p-4 text-sm font-black text-text-main">{element.content || element.type}</div>
    </div>
  );
}

function EditableBlock({
  value,
  editing,
  className,
  style,
  onEdit,
  onDone
}: {
  value: string;
  editing: boolean;
  className?: string;
  style?: React.CSSProperties;
  onEdit: () => void;
  onDone: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  if (editing) {
    return (
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => onDone(draft)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onDone(draft);
        }}
        className={cn(className, 'resize-none outline-none')}
        style={style}
        autoFocus
        data-control
      />
    );
  }

  return (
    <div className={cn(className, 'whitespace-pre-wrap break-words')} style={style} onDoubleClick={onEdit}>
      {value}
    </div>
  );
}

function ResizeHandles({
  element,
  scale,
  onUpdate,
  onResizeStateChange
}: {
  element: VisionElement;
  scale: number;
  onUpdate: (updates: Partial<VisionElement>, save?: boolean, history?: boolean) => void;
  onResizeStateChange: (active: boolean) => void;
}) {
  const startRef = useRef<{ x: number; y: number; width: number; height: number; left: number; top: number; corner: ResizeCorner } | null>(null);
  const width = element.width || defaultSize(element.type).width;
  const height = element.height || defaultSize(element.type).height;
  const corners: ResizeCorner[] = ['nw', 'ne', 'sw', 'se'];

  const resize = (corner: ResizeCorner, event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    onResizeStateChange(true);
    startRef.current = { x: event.clientX, y: event.clientY, width, height, left: element.x, top: element.y, corner };

    const move = (moveEvent: PointerEvent) => {
      if (!startRef.current) return;
      const dx = (moveEvent.clientX - startRef.current.x) / scale;
      const dy = (moveEvent.clientY - startRef.current.y) / scale;
      const leftEdge = startRef.current.corner.includes('w');
      const topEdge = startRef.current.corner.includes('n');
      const minimum = minSize(element.type);
      const nextWidth = Math.max(minimum.width, startRef.current.width + (leftEdge ? -dx : dx));
      const nextHeight = Math.max(minimum.height, startRef.current.height + (topEdge ? -dy : dy));
      onUpdate({
        width: nextWidth,
        height: nextHeight,
        x: leftEdge ? startRef.current.left + (startRef.current.width - nextWidth) : startRef.current.left,
        y: topEdge ? startRef.current.top + (startRef.current.height - nextHeight) : startRef.current.top
      }, false, false);
    };
    const up = (upEvent: PointerEvent) => {
      if (startRef.current) {
        const dx = (upEvent.clientX - startRef.current.x) / scale;
        const dy = (upEvent.clientY - startRef.current.y) / scale;
        const leftEdge = startRef.current.corner.includes('w');
        const topEdge = startRef.current.corner.includes('n');
        const minimum = minSize(element.type);
        const nextWidth = Math.max(minimum.width, startRef.current.width + (leftEdge ? -dx : dx));
        const nextHeight = Math.max(minimum.height, startRef.current.height + (topEdge ? -dy : dy));
        onUpdate({
          width: nextWidth,
          height: nextHeight,
          x: leftEdge ? startRef.current.left + (startRef.current.width - nextWidth) : startRef.current.left,
          y: topEdge ? startRef.current.top + (startRef.current.height - nextHeight) : startRef.current.top
        }, true, true);
      }
      startRef.current = null;
      onResizeStateChange(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <>
      {corners.map(corner => (
        <button
          key={corner}
          onPointerDown={(event) => resize(corner, event)}
          className={cn(
            'absolute z-40 h-4 w-4 rounded-full border-2 border-card bg-accent shadow-lg',
            corner.includes('n') ? '-top-2' : '-bottom-2',
            corner.includes('w') ? '-left-2' : '-right-2'
          )}
          data-control
          aria-label={`Resize ${corner}`}
        />
      ))}
    </>
  );
}

function SelectedElementActions({
  onCopy,
  onBringForward,
  onSendBackward,
  onDelete,
  onClose
}: {
  onCopy: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute left-1/2 top-0 z-50 flex -translate-x-1/2 -translate-y-[calc(100%+10px)] items-center gap-1 rounded-2xl border border-card-border bg-card/95 p-1.5 shadow-xl backdrop-blur-xl" data-control>
      <MiniAction icon={<Copy size={15} />} label="Copy" onClick={onCopy} />
      <MiniAction icon={<ArrowUp size={15} />} label="Forward" onClick={onBringForward} />
      <MiniAction icon={<ArrowDown size={15} />} label="Back" onClick={onSendBackward} />
      <MiniAction icon={<Trash2 size={15} />} label="Delete" onClick={onDelete} danger />
      <MiniAction icon={<X size={15} />} label="Deselect" onClick={onClose} />
    </div>
  );
}

function MiniAction({ icon, label, onClick, danger = false }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn('grid h-9 w-9 place-items-center rounded-xl text-text-secondary hover:bg-accent/10 hover:text-accent', danger && 'text-danger hover:bg-danger/10 hover:text-danger')}
      title={label}
      aria-label={label}
      data-control
    >
      {icon}
    </button>
  );
}

function ConnectorLine({ connector, elements }: { connector: VisionElement; elements: VisionElement[] }) {
  const from = elements.find(element => element.id === connector.metadata?.fromElementId);
  const to = elements.find(element => element.id === connector.metadata?.toElementId);
  if (!from || !to) return null;
  const start = centerOf(from);
  const end = centerOf(to);
  return (
    <line
      x1={start.x}
      y1={start.y}
      x2={end.x}
      y2={end.y}
      stroke="currentColor"
      strokeWidth={3}
      markerEnd="url(#arrowhead)"
      className="text-accent"
    />
  );
}

function ElementEditor({
  element,
  onUpdate,
  onBringForward,
  onSendBackward,
  onDelete,
  onClose,
  onAddChecklistItem
}: {
  element: VisionElement;
  onUpdate: (updates: Partial<VisionElement>) => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onDelete: () => void;
  onClose: () => void;
  onAddChecklistItem: (text: string) => void;
}) {
  const [itemText, setItemText] = useState('');
  const fontSize = parseInt(safeString(element.metadata?.fontSize, '22px'), 10) || 22;
  const applyElementColor = (color: string) => {
    if (element.type === 'section') {
      onUpdate({ metadata: { fillColor: color, strokeColor: color } });
      return;
    }
    if (element.type === 'sticky' || element.type === 'task') {
      onUpdate({ metadata: { color } });
      return;
    }
    if (element.type === 'shape') {
      onUpdate({ metadata: { fillColor: color, strokeColor: color } });
      return;
    }
    if (element.type === 'text') {
      onUpdate({ metadata: { color } });
    }
  };
  const canColorElement = ['section', 'sticky', 'task', 'shape', 'text'].includes(element.type);
  return (
    <motion.div
      initial={{ opacity: 0, x: 22 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 22 }}
      className="absolute right-3 top-[5rem] z-[175] max-h-[calc(100dvh-11rem)] w-[min(360px,calc(100vw-1.5rem))] overflow-y-auto rounded-3xl border border-card-border bg-card/95 p-4 shadow-2xl shadow-accent/10 ring-4 ring-bg-base/70 backdrop-blur-xl md:right-5 md:top-[6rem]"
      data-no-pan
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-accent">Selected</p>
          <h3 className="text-sm font-black capitalize text-text-main">{element.type}</h3>
        </div>
        <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-surface-muted text-text-secondary" aria-label="Close element editor">
          <X size={15} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onBringForward} className="rounded-2xl bg-surface-muted px-3 py-3 text-[9px] font-black uppercase tracking-widest text-text-secondary">Bring forward</button>
        <button onClick={onSendBackward} className="rounded-2xl bg-surface-muted px-3 py-3 text-[9px] font-black uppercase tracking-widest text-text-secondary">Send back</button>
      </div>
      {(element.type === 'text' || element.type === 'sticky' || element.type === 'note' || element.type === 'quote') && (
        <div className="mt-3 rounded-2xl bg-bg-base/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[8px] font-black uppercase tracking-widest text-text-secondary">Text size</p>
            <span className="text-[10px] font-black tabular-nums text-text-main">{fontSize}px</span>
          </div>
          <input
            type="range"
            min={14}
            max={40}
            step={1}
            value={fontSize}
            onChange={(event) => onUpdate({ metadata: { fontSize: `${event.target.value}px` } })}
            className="w-full accent-[var(--accent)]"
            data-control
          />
        </div>
      )}
      {element.type === 'shape' && (
        <div className="mt-3 rounded-2xl bg-bg-base/60 p-3">
          <p className="mb-2 text-[8px] font-black uppercase tracking-widest text-text-secondary">Shape</p>
          <div className="grid grid-cols-3 gap-2">
            {(['rectangle', 'circle', 'diamond'] as const).map(shapeType => (
              <button
                key={shapeType}
                type="button"
                onClick={() => onUpdate({ metadata: { shapeType } })}
                className={cn(
                  'rounded-xl border px-2 py-2 text-[9px] font-black uppercase tracking-widest transition-colors',
                  element.metadata?.shapeType === shapeType ? 'border-accent bg-accent/10 text-accent' : 'border-card-border bg-card text-text-secondary'
                )}
                data-control
              >
                {shapeType}
              </button>
            ))}
          </div>
        </div>
      )}
      {canColorElement && (
        <div className="mt-3 rounded-2xl bg-bg-base/60 p-3">
          <p className="mb-2 text-[8px] font-black uppercase tracking-widest text-text-secondary">Color</p>
          <div className="flex flex-wrap gap-2">
            {ELEMENT_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => applyElementColor(color)}
                className="h-8 w-8 rounded-full border-2 border-card shadow-sm transition-transform hover:scale-110"
                style={{ background: color }}
                aria-label={`Apply color ${color}`}
                data-control
              />
            ))}
          </div>
        </div>
      )}
      {element.type === 'checklist' && (
        <div className="mt-3 flex gap-2">
          <input
            value={itemText}
            onChange={(event) => setItemText(event.target.value)}
            placeholder="New checklist item"
            className="min-w-0 flex-1 rounded-2xl border border-card-border bg-surface-muted px-3 text-sm font-semibold text-text-main outline-none"
          />
          <button
            onClick={() => {
              const value = itemText.trim();
              if (!value) return;
              onAddChecklistItem(value);
              setItemText('');
            }}
            className="rounded-2xl bg-accent px-4 text-[9px] font-black uppercase tracking-widest text-accent-contrast"
          >
            Add
          </button>
        </div>
      )}
      <button onClick={onDelete} className="mt-3 w-full rounded-2xl border border-danger/20 bg-danger/10 px-3 py-3 text-[9px] font-black uppercase tracking-widest text-danger">
        Delete element
      </button>
    </motion.div>
  );
}

function SavePill({ status, lastSavedAt, onRetry }: { status: SaveStatus; lastSavedAt: string | null; onRetry: () => void }) {
  const label = status === 'saving' ? 'Saving...' : status === 'dirty' ? 'Unsaved changes' : status === 'failed' ? 'Failed to save' : lastSavedAt ? `Saved ${lastSavedAt}` : 'Saved';
  return (
    <div className={cn(
      'absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-[180] flex items-center gap-2 rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-widest shadow-lg backdrop-blur-md md:top-3',
      status === 'saving' && 'border-accent/20 bg-accent/10 text-accent',
      status === 'dirty' && 'border-warning/20 bg-warning/10 text-warning',
      status === 'failed' && 'border-danger/20 bg-danger/10 text-danger',
      status === 'saved' && 'border-card-border bg-card/90 text-text-secondary/60'
    )} data-no-pan>
      {status === 'saving' ? <Loader2 size={13} className="animate-spin" /> : status === 'saved' ? <Save size={13} /> : null}
      {label}
      {status === 'failed' && <button onClick={onRetry} className="ml-1 underline">Retry</button>}
    </div>
  );
}

function ControlButton({ onClick, icon, label, compact = false }: { onClick: () => void; icon: React.ReactNode; label: string; compact?: boolean }) {
  return (
    <button onClick={onClick} className={cn('rounded-full text-text-secondary transition-all hover:bg-accent/5 hover:text-accent', compact ? 'grid h-9 w-9 place-items-center' : 'min-h-11 min-w-11 p-3')} title={label} aria-label={label} data-no-pan>
      {icon}
    </button>
  );
}

function CanvasQuickButton({
  icon,
  label,
  onClick,
  loading = false,
  active = false,
  compact = false
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  loading?: boolean;
  active?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-black uppercase tracking-widest transition-all disabled:opacity-50',
        compact ? 'h-11 min-w-11 gap-1 px-3 text-[7px]' : 'h-9 gap-1 px-2.5 text-[7px]',
        active ? 'bg-accent text-accent-contrast shadow-lg shadow-accent/20' : 'text-text-secondary hover:bg-accent/10 hover:text-accent'
      )}
      title={label}
      aria-label={label}
      aria-pressed={active}
      data-no-pan
    >
      {loading ? <Loader2 size={17} className="animate-spin" /> : icon}
      <span>{label}</span>
    </button>
  );
}

function CanvasToolButton({ icon, label, onClick, loading = false }: { icon: React.ReactNode; label: string; onClick: () => void; loading?: boolean }) {
  return (
    <button onClick={onClick} disabled={loading} className="flex h-16 min-w-20 flex-col items-center justify-center gap-1 rounded-2xl text-text-secondary transition-all hover:bg-accent/10 hover:text-accent disabled:opacity-50" title={label} aria-label={label} data-no-pan>
      {loading ? <Loader2 size={18} className="animate-spin" /> : icon}
      <span className="text-center text-[8px] font-black uppercase leading-tight tracking-widest">{label}</span>
    </button>
  );
}

function QuickStartAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="h-11 rounded-xl border border-card-border bg-card px-4 text-[10px] font-black uppercase tracking-widest text-text-secondary shadow-lg hover:border-accent/30 hover:text-accent">
      {label}
    </button>
  );
}

function MobileToolsSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[190] md:hidden">
      <button className="absolute inset-0 bg-overlay/60" onClick={onClose} aria-label="Close tools" />
      <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} className="absolute inset-x-0 bottom-0 rounded-t-[2rem] border border-card-border bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-widest text-text-secondary">Add to board</p>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-surface-muted text-text-secondary"><X size={16} /></button>
        </div>
        <div className="grid grid-cols-3 gap-2">{children}</div>
      </motion.div>
    </motion.div>
  );
}

function ResourceLinkPanel({ value, onChange, onClose, onSubmit }: { value: string; onChange: (value: string) => void; onClose: () => void; onSubmit: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200]">
      <button className="absolute inset-0 bg-overlay/45" onClick={onClose} aria-label="Close resource link" />
      <motion.aside initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} className="absolute inset-x-3 bottom-3 rounded-[2rem] border border-card-border bg-card p-5 shadow-2xl md:bottom-24 md:left-1/2 md:right-auto md:w-[420px] md:-translate-x-1/2">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-accent">Resource Link</p>
            <h3 className="text-base font-black text-text-main">Embed a preview card</h3>
          </div>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-surface-muted text-text-secondary" aria-label="Close resource link"><X size={16} /></button>
        </div>
        <label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">HTTPS URL</span>
          <input value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onSubmit(); }} placeholder="https://youtube.com/watch?v=..." className="h-12 w-full rounded-2xl border border-card-border bg-surface-muted px-4 text-sm font-semibold text-text-main outline-none focus:border-accent/50" autoFocus />
        </label>
        <p className="mt-3 text-xs font-semibold text-text-secondary/60">YouTube links show thumbnails automatically. Other links use a clean domain fallback.</p>
        <button onClick={onSubmit} className="mt-5 h-12 w-full rounded-2xl bg-accent text-[10px] font-black uppercase tracking-widest text-accent-contrast">Add Resource</button>
      </motion.aside>
    </motion.div>
  );
}

function ImportPanel({
  notes,
  tasks,
  isUploading,
  onClose,
  onUploadImage,
  onImportNote,
  onImportTasks
}: {
  notes: Note[];
  tasks: Task[];
  isUploading: boolean;
  onClose: () => void;
  onUploadImage: () => void;
  onImportNote: (note: Note) => void;
  onImportTasks: () => void;
}) {
  const recentNotes = safeArray<Note>(notes).filter(note => !note.isDeleted).slice(0, 8);
  const taskCount = safeArray<Task>(tasks).length;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200]">
      <button className="absolute inset-0 bg-overlay/45" onClick={onClose} aria-label="Close import panel" />
      <motion.aside initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} className="absolute inset-x-3 bottom-3 flex max-h-[calc(100dvh-24px)] flex-col overflow-hidden rounded-[2rem] border border-card-border bg-card shadow-2xl md:inset-x-auto md:bottom-5 md:right-5 md:top-5 md:w-[380px]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-card-border p-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-accent">Vision Board</p>
            <h3 className="text-base font-black text-text-main">Import</h3>
          </div>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-surface-muted text-text-secondary" aria-label="Close import panel"><X size={16} /></button>
        </div>
        <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <button onClick={onUploadImage} disabled={isUploading} className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-card-border bg-surface-muted px-4 text-left hover:border-accent/40 disabled:opacity-60">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">{isUploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}</span>
            <span className="min-w-0"><span className="block text-sm font-black text-text-main">Upload image</span><span className="block text-xs font-semibold text-text-secondary">PNG, JPG, or WebP under 10MB</span></span>
          </button>
          <button onClick={onImportTasks} disabled={taskCount === 0} className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-card-border bg-surface-muted px-4 text-left hover:border-accent/40 disabled:opacity-50">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success"><ListChecks size={18} /></span>
            <span className="min-w-0"><span className="block text-sm font-black text-text-main">Import vision tasks</span><span className="block text-xs font-semibold text-text-secondary">{taskCount ? `${taskCount} task${taskCount === 1 ? '' : 's'} as checklist` : 'No tasks in this vision yet'}</span></span>
          </button>
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Recent notes</p>
            {recentNotes.length > 0 ? recentNotes.map(note => (
              <button key={note.id} onClick={() => onImportNote(note)} className="w-full rounded-2xl border border-card-border bg-bg-base/35 p-3 text-left hover:border-accent/40">
                <span className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning"><FileText size={16} /></span>
                  <span className="min-w-0"><span className="block truncate text-sm font-black text-text-main">{safeString(note.title, 'Untitled Note')}</span><span className="line-clamp-2 block text-xs font-semibold text-text-secondary">{safeString(note.content, 'No content yet.')}</span></span>
                </span>
              </button>
            )) : <div className="rounded-2xl border border-dashed border-card-border p-4 text-sm font-semibold text-text-secondary">No notes to import yet.</div>}
          </div>
        </div>
      </motion.aside>
    </motion.div>
  );
}
