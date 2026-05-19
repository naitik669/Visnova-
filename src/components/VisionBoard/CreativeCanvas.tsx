import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowDown,
  ArrowUp,
  Brush,
  Check,
  Copy,
  Eraser,
  FileText,
  ExternalLink,
  Image as ImageIcon,
  Link as LinkIcon,
  ListChecks,
  Loader2,
  Maximize2,
  Minus,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Save,
  Square,
  StickyNote,
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
}

type SaveStatus = 'saved' | 'dirty' | 'saving' | 'failed';
type ChecklistItem = NonNullable<NonNullable<VisionElement['metadata']>['checklist']>[number];
type ResizeCorner = 'se' | 'sw' | 'ne' | 'nw';
type BoardTool = 'select' | 'pen' | 'eraser';
type InteractionMode = 'idle' | 'canvas-pan' | 'element-drag' | 'resize' | 'text-edit' | 'draw';

const CANVAS_SIZE = 9000;
const LEGACY_CANVAS_CENTER = 2600;
const MIN_ZOOM_FLOOR = 0.04;
const MAX_ZOOM = 2.5;
const SAVE_DELAY_MS = 850;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const STABLE_BOARD_TYPES = new Set<VisionElement['type']>(['text', 'image', 'sticky', 'checklist', 'shape', 'connector', 'link', 'drawing']);
const RESIZABLE_TYPES = new Set<VisionElement['type']>(['text', 'image', 'sticky', 'checklist', 'shape', 'link']);

const newId = (prefix = 'el') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const defaultSize = (type: VisionElement['type']) => {
  if (type === 'image') return { width: 360, height: 240 };
  if (type === 'sticky') return { width: 260, height: 220 };
  if (type === 'checklist') return { width: 300, height: 250 };
  if (type === 'link') return { width: 320, height: 210 };
  if (type === 'flowchartNode') return { width: 190, height: 96 };
  if (type === 'shape') return { width: 150, height: 110 };
  if (type === 'heading') return { width: 360, height: 90 };
  return { width: 260, height: 90 };
};

const centerOf = (element: VisionElement) => ({
  x: element.x + (element.width || defaultSize(element.type).width) / 2,
  y: element.y + (element.height || defaultSize(element.type).height) / 2
});

const normalizeElementType = (type: unknown): VisionElement['type'] => {
  if (type === 'heading') return 'text';
  if (type === 'flowchartNode') return 'shape';
  if (STABLE_BOARD_TYPES.has(type as VisionElement['type'])) return type as VisionElement['type'];
  return 'text';
};

const minSize = (type: VisionElement['type']) => {
  if (type === 'image') return { width: 120, height: 90 };
  if (type === 'sticky') return { width: 160, height: 120 };
  if (type === 'checklist') return { width: 180, height: 140 };
  if (type === 'link') return { width: 220, height: 140 };
  if (type === 'shape') return { width: 80, height: 80 };
  return { width: 120, height: 60 };
};

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
    if (parsed.hostname.includes('youtube.com')) return parsed.searchParams.get('v') || parsed.pathname.split('/').pop() || '';
  } catch {
    return '';
  }
  return '';
};

const normalizeResourceUrl = (rawUrl: string) => {
  const trimmed = safeString(rawUrl).trim();
  const parsed = new URL(trimmed);
  if (parsed.protocol !== 'https:') throw new Error('Use a valid https:// link.');
  return parsed.toString();
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

const normalizeChecklist = (value: unknown): ChecklistItem[] => safeArray<any>(value)
  .map((item, index) => ({
    id: safeString(item?.id, newId('item')),
    text: safeString(item?.text, `Item ${index + 1}`),
    completed: Boolean(item?.completed)
  }))
  .filter(item => item.id);

const normalizeBoardElement = (raw: unknown, index: number): VisionElement => {
  const row = safeObject<any>(raw);
  const type = normalizeElementType(row.type);
  const size = defaultSize(type);
  const metadata = safeObject<NonNullable<VisionElement['metadata']>>(row.metadata);
  const createdAt = safeTime(row.createdAt || row.created_at, Date.now());
  const normalizedMetadata: VisionElement['metadata'] = {
    ...metadata,
    checklist: type === 'checklist' ? normalizeChecklist(metadata.checklist) : metadata.checklist,
    imageUrl: type === 'image' ? safeString(metadata.imageUrl || row.content) : metadata.imageUrl,
    url: type === 'link' ? safeString(metadata.url || row.content, 'https://example.com') : metadata.url,
    shapeType: type === 'shape' ? (metadata.shapeType || 'rectangle') : metadata.shapeType
  };

  return {
    id: safeString(row.id, newId(`board-${index}`)),
    type,
    content: safeString(row.content, type === 'checklist' ? 'Checklist' : type === 'sticky' ? 'Idea or reminder' : ''),
    x: safeNumber(row.x, LEGACY_CANVAS_CENTER),
    y: safeNumber(row.y, LEGACY_CANVAS_CENTER),
    width: Math.max(48, safeNumber(row.width, size.width)),
    height: Math.max(40, safeNumber(row.height, size.height)),
    rotation: safeNumber(row.rotation, 0),
    zIndex: safeNumber(row.zIndex, index + 1),
    metadata: normalizedMetadata,
    createdAt,
    updatedAt: safeTime(row.updatedAt || row.updated_at, createdAt)
  };
};

const normalizeBoardElements = (value: unknown): VisionElement[] => safeArray(value)
  .slice(0, 500)
  .map(normalizeBoardElement);

const cloneBoardElements = (items: VisionElement[]): VisionElement[] => items.map(element => ({
  ...element,
  metadata: element.metadata ? JSON.parse(JSON.stringify(element.metadata)) : element.metadata
}));

export const CreativeCanvas: React.FC<CreativeCanvasProps> = ({ vision, updateVision, onActiveChange }) => {
  const [elements, setElements] = useState<VisionElement[]>(() => normalizeBoardElements(vision.elements));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkingFromId, setLinkingFromId] = useState<string | null>(null);
  const [tempConnectorEnd, setTempConnectorEnd] = useState<{ x: number; y: number } | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [isUploading, setIsUploading] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [importPanelOpen, setImportPanelOpen] = useState(false);
  const [linkPanelOpen, setLinkPanelOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [isResizingElement, setIsResizingElement] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [activeTool, setActiveTool] = useState<BoardTool>('select');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const transformWrapperRef = useRef<any>(null);
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const centeredVisionRef = useRef<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingElementsRef = useRef<VisionElement[]>(normalizeBoardElements(vision.elements));
  const interactionModeRef = useRef<InteractionMode>('idle');
  const [interactionMode, setInteractionModeState] = useState<InteractionMode>('idle');
  const currentVisionIdRef = useRef(vision.id);
  const isDirtyRef = useRef(false);
  const localVersionRef = useRef(0);
  const isSavingRef = useRef(false);
  const resaveAfterCurrentRef = useRef(false);
  const undoStackRef = useRef<VisionElement[][]>([]);
  const redoStackRef = useRef<VisionElement[][]>([]);
  const drawingRef = useRef<{ id: string; pointerId: number; points: Array<{ x: number; y: number }>; frame: number | null } | null>(null);
  const { session, addToast, notes, fetchNotes } = useStore();

  const selectedElement = useMemo(
    () => elements.find(element => element.id === selectedId) || null,
    [elements, selectedId]
  );
  const boardFocusCenter = useMemo(() => {
    const visibleElements = elements.filter(element => element.type !== 'connector' && element.type !== 'drawing');
    if (visibleElements.length === 0) return { x: LEGACY_CANVAS_CENTER, y: LEGACY_CANVAS_CENTER };

    const bounds = visibleElements.reduce(
      (acc, element) => {
        const size = defaultSize(element.type);
        const width = Math.max(20, element.width || size.width);
        const height = Math.max(20, element.height || size.height);
        return {
          minX: Math.min(acc.minX, element.x),
          minY: Math.min(acc.minY, element.y),
          maxX: Math.max(acc.maxX, element.x + width),
          maxY: Math.max(acc.maxY, element.y + height)
        };
      },
      { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY }
    );

    return {
      x: Math.min(CANVAS_SIZE, Math.max(0, (bounds.minX + bounds.maxX) / 2)),
      y: Math.min(CANVAS_SIZE, Math.max(0, (bounds.minY + bounds.maxY) / 2))
    };
  }, [elements]);
  const setInteractionMode = useCallback((mode: InteractionMode) => {
    interactionModeRef.current = mode;
    setInteractionModeState(mode);
  }, []);

  const canvasInteractionLocked = isDraggingElement || isResizingElement || isEditingText || activeTool !== 'select' || interactionMode !== 'idle';
  const minZoom = useMemo(() => {
    if (!viewportSize.width || !viewportSize.height) return MIN_ZOOM_FLOOR;
    const fitScale = Math.min(
      Math.max(viewportSize.width - 96, 320) / CANVAS_SIZE,
      Math.max(viewportSize.height - 96, 320) / CANVAS_SIZE
    );
    return Math.max(MIN_ZOOM_FLOOR, Math.min(1, fitScale));
  }, [viewportSize.height, viewportSize.width]);

  useEffect(() => {
    const normalized = normalizeBoardElements(vision.elements);
    const visionChanged = currentVisionIdRef.current !== vision.id;
    currentVisionIdRef.current = vision.id;
    if (!visionChanged && isDirtyRef.current) return;
    setElements(normalized);
    pendingElementsRef.current = normalized;
    localVersionRef.current = 0;
    isSavingRef.current = false;
    resaveAfterCurrentRef.current = false;
    undoStackRef.current = [];
    redoStackRef.current = [];
    if (visionChanged) {
      setSelectedId(null);
      setLinkingFromId(null);
      setTempConnectorEnd(null);
      setMobileToolsOpen(false);
      setImportPanelOpen(false);
      setLinkPanelOpen(false);
      setInteractionMode('idle');
    }
    isDirtyRef.current = false;
    setSaveStatus('saved');
    if (centeredVisionRef.current !== vision.id) centeredVisionRef.current = null;
  }, [setInteractionMode, vision.id, vision.elements]);

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  useEffect(() => {
    const node = canvasViewportRef.current;
    if (!node) return;

    const updateSize = () => {
      const bounds = node.getBoundingClientRect();
      setViewportSize({ width: bounds.width, height: bounds.height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  useEffect(() => {
    if (importPanelOpen) {
      fetchNotes().catch(error => console.error('Failed to load notes for Vision Board import:', error));
    }
  }, [fetchNotes, importPanelOpen]);

  const persistNow = useCallback(async (nextElements?: VisionElement[], requestedVersion = localVersionRef.current) => {
    const payload = nextElements || pendingElementsRef.current;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (isSavingRef.current) {
      resaveAfterCurrentRef.current = true;
      setSaveStatus('saving');
      return;
    }
    isSavingRef.current = true;
    setSaveStatus('saving');
    try {
      const result = await Promise.resolve(updateVision(vision.id, { elements: payload }));
      if (result === false) throw new Error('Could not save this board change.');
      if (requestedVersion === localVersionRef.current) {
        isDirtyRef.current = false;
        setSaveStatus('saved');
        setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else {
        isDirtyRef.current = true;
        setSaveStatus('dirty');
      }
    } catch (error) {
      console.error('Vision Board save failed:', error);
      setSaveStatus('failed');
      addToast({ type: 'error', title: 'Board save failed', description: 'Could not save this board change.' });
    } finally {
      isSavingRef.current = false;
      if (resaveAfterCurrentRef.current || requestedVersion < localVersionRef.current) {
        resaveAfterCurrentRef.current = false;
        void persistNow(pendingElementsRef.current, localVersionRef.current);
      }
    }
  }, [addToast, updateVision, vision.id]);

  const scheduleSave = useCallback((nextElements: VisionElement[]) => {
    pendingElementsRef.current = nextElements;
    isDirtyRef.current = true;
    localVersionRef.current += 1;
    const versionToSave = localVersionRef.current;
    setSaveStatus('dirty');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persistNow(nextElements, versionToSave);
    }, SAVE_DELAY_MS);
  }, [persistNow]);

  const applyElements = useCallback((updater: VisionElement[] | ((current: VisionElement[]) => VisionElement[]), save = true) => {
    setElements(current => {
      const rawNext = typeof updater === 'function' ? updater(current) : updater;
      const next = save ? normalizeBoardElements(rawNext) : rawNext;
      if (save) {
        undoStackRef.current = [...undoStackRef.current.slice(-49), cloneBoardElements(current)];
        redoStackRef.current = [];
      }
      pendingElementsRef.current = next;
      if (save) scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const restoreElementsFromHistory = useCallback((direction: 'undo' | 'redo') => {
    const source = direction === 'undo' ? undoStackRef.current : redoStackRef.current;
    const target = direction === 'undo' ? redoStackRef.current : undoStackRef.current;
    const snapshot = source.pop();
    if (!snapshot) return;

    setElements(current => {
      target.push(cloneBoardElements(current));
      if (target.length > 50) target.shift();
      const restored = cloneBoardElements(snapshot);
      pendingElementsRef.current = restored;
      scheduleSave(restored);
      setSelectedId(null);
      return restored;
    });
  }, [scheduleSave]);

  const getCurrentScale = () => {
    const transformState = transformWrapperRef.current?.instance?.transformState || transformWrapperRef.current?.state;
    return transformState?.scale || 1;
  };

  const getCanvasPointFromEvent = (event: React.DragEvent | React.MouseEvent) => {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const transformState = transformWrapperRef.current?.instance?.transformState || transformWrapperRef.current?.state;
    const scale = transformState?.scale || 1;
    const positionX = transformState?.positionX || 0;
    const positionY = transformState?.positionY || 0;

    return {
      x: (event.clientX - bounds.left - positionX) / scale,
      y: (event.clientY - bounds.top - positionY) / scale
    };
  };

  const getCanvasPointFromPointer = (event: React.PointerEvent<HTMLElement>) => {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const transformState = transformWrapperRef.current?.instance?.transformState || transformWrapperRef.current?.state;
    const scale = transformState?.scale || 1;
    const positionX = transformState?.positionX || 0;
    const positionY = transformState?.positionY || 0;

    return {
      x: (event.clientX - bounds.left - positionX) / scale,
      y: (event.clientY - bounds.top - positionY) / scale
    };
  };

  const pathFromPoints = (points: Array<{ x: number; y: number }>) => {
    if (points.length === 0) return '';
    return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${Math.round(point.x)} ${Math.round(point.y)}`).join(' ');
  };

  const setTransformAroundPoint = useCallback((point: { x: number; y: number }, nextScale: number, animationTime = 120) => {
    const scale = Math.min(MAX_ZOOM, Math.max(minZoom, nextScale));
    const bounds = canvasViewportRef.current?.getBoundingClientRect();
    const viewportCenterX = (bounds?.width || window.innerWidth) / 2;
    const viewportCenterY = (bounds?.height || window.innerHeight) / 2;
    const nextX = viewportCenterX - point.x * scale;
    const nextY = viewportCenterY - point.y * scale;
    transformWrapperRef.current?.setTransform?.(nextX, nextY, scale, animationTime);
    setZoomLevel(scale);
  }, [minZoom]);

  const zoomAroundViewportCenter = useCallback((nextScale: number, animationTime = 120) => {
    const transformState = transformWrapperRef.current?.instance?.transformState || transformWrapperRef.current?.state;
    const currentScale = transformState?.scale || zoomLevel || 1;
    const positionX = transformState?.positionX || 0;
    const positionY = transformState?.positionY || 0;
    const bounds = canvasViewportRef.current?.getBoundingClientRect();
    const viewportCenterX = (bounds?.width || window.innerWidth) / 2;
    const viewportCenterY = (bounds?.height || window.innerHeight) / 2;
    const currentCenter = {
      x: (viewportCenterX - positionX) / currentScale,
      y: (viewportCenterY - positionY) / currentScale
    };
    setTransformAroundPoint(currentCenter, nextScale, animationTime);
  }, [setTransformAroundPoint, zoomLevel]);

  const fitBoardToViewport = useCallback((nextScale = minZoom, animationTime = 120) => {
    setTransformAroundPoint(boardFocusCenter, nextScale, animationTime);
  }, [boardFocusCenter, minZoom, setTransformAroundPoint]);

  const zoomByWheelDelta = useCallback((deltaY: number, animationTime = 0) => {
    const transformState = transformWrapperRef.current?.instance?.transformState || transformWrapperRef.current?.state;
    const currentScale = transformState?.scale || zoomLevel || 1;
    const zoomFactor = Math.exp(-deltaY * 0.0018);
    zoomAroundViewportCenter(currentScale * zoomFactor, animationTime);
  }, [zoomAroundViewportCenter, zoomLevel]);

  useEffect(() => {
    if (zoomLevel < minZoom - 0.001) {
      zoomAroundViewportCenter(minZoom, 0);
    }
  }, [minZoom, zoomAroundViewportCenter, zoomLevel]);

  useEffect(() => {
    if (!viewportSize.width || !viewportSize.height) return;
    if (centeredVisionRef.current === vision.id) return;
    centeredVisionRef.current = vision.id;
    window.requestAnimationFrame(() => fitBoardToViewport(1, 0));
  }, [fitBoardToViewport, viewportSize.height, viewportSize.width, vision.id]);

  useEffect(() => {
    const node = canvasViewportRef.current;
    if (!node) return;

    const handleNativeWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      if (isEditingText) return;
      event.preventDefault();
      event.stopPropagation();
      zoomByWheelDelta(event.deltaY, 0);
    };

    node.addEventListener('wheel', handleNativeWheel, { capture: true, passive: false });
    return () => node.removeEventListener('wheel', handleNativeWheel, { capture: true } as AddEventListenerOptions);
  }, [isEditingText, zoomByWheelDelta]);

  const createElement = useCallback((
    type: VisionElement['type'],
    content: string,
    metadata: VisionElement['metadata'] = {},
    x = boardFocusCenter.x + Math.random() * 180 - 90,
    y = boardFocusCenter.y + Math.random() * 120 - 60
  ) => {
    const size = defaultSize(type);
    const now = Date.now();
    const element: VisionElement = {
      id: newId(type),
      type,
      content,
      x,
      y,
      width: size.width,
      height: size.height,
      rotation: 0,
      zIndex: now,
      createdAt: now,
      updatedAt: now,
      metadata
    };
    applyElements(current => [...current, element]);
    setSelectedId(element.id);
    setActiveTool('select');
    setMobileToolsOpen(false);
    setImportPanelOpen(false);
    setLinkPanelOpen(false);
  }, [applyElements, boardFocusCenter.x, boardFocusCenter.y]);

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

  const insertImportedElements = useCallback((items: Array<Pick<VisionElement, 'type' | 'content' | 'metadata' | 'width' | 'height'>>) => {
    if (items.length === 0) return;
    const now = Date.now();
    const imported = items.map((item, index): VisionElement => {
      const size = { ...defaultSize(item.type), width: item.width || defaultSize(item.type).width, height: item.height || defaultSize(item.type).height };
      return {
        id: newId('import'),
        type: item.type,
        content: safeString(item.content),
        x: boardFocusCenter.x + (index % 3) * 340 - 340,
        y: boardFocusCenter.y + Math.floor(index / 3) * 250 - 120,
        width: size.width,
        height: size.height,
        rotation: 0,
        zIndex: now + index,
        createdAt: now,
        updatedAt: now,
        metadata: safeObject(item.metadata)
      };
    });

    applyElements(current => [...current, ...imported]);
    setSelectedId(imported[0]?.id || null);
    setImportPanelOpen(false);
    setMobileToolsOpen(false);
    addToast({ type: 'success', title: 'Imported to board', description: `${imported.length} item${imported.length === 1 ? '' : 's'} added.` });
  }, [addToast, applyElements, boardFocusCenter.x, boardFocusCenter.y]);

  const importNote = useCallback((note: Note) => {
    insertImportedElements([{
      type: 'sticky',
      content: `${safeString(note.title, 'Untitled Note')}\n\n${safeString(note.content, 'No content yet.')}`.slice(0, 1200),
      width: 300,
      height: 240,
      metadata: { noteId: note.id, title: safeString(note.title, 'Untitled Note'), color: '#fef08a' }
    }]);
  }, [insertImportedElements]);

  const importVisionTasks = useCallback(() => {
    const taskItems = safeArray<Task>(vision.tasks).slice(0, 12).map(task => ({
      id: task.id,
      text: safeString(task.text, 'Untitled task'),
      completed: Boolean(task.completed)
    }));
    insertImportedElements([{
      type: 'checklist',
      content: 'Vision Tasks',
      width: 340,
      height: 280,
      metadata: { checklist: taskItems }
    }]);
  }, [insertImportedElements, vision.tasks]);

  const updateElement = useCallback((id: string, updates: Partial<VisionElement>, save = true) => {
    applyElements(current => current.map(element => (
      element.id === id
        ? {
            ...element,
            ...updates,
            metadata: updates.metadata
              ? { ...(element.metadata || {}), ...updates.metadata }
              : element.metadata,
            updatedAt: Date.now()
          }
        : element
    )), save);
  }, [applyElements]);

  const deleteElement = useCallback((id: string) => {
    applyElements(current => current.filter(element => (
      element.id !== id &&
      element.metadata?.fromElementId !== id &&
      element.metadata?.toElementId !== id
    )));
    setSelectedId(current => current === id ? null : current);
  }, [applyElements]);

  const duplicateElement = useCallback((id: string) => {
    const source = elements.find(element => element.id === id);
    if (!source) return;
    const now = Date.now();
    const duplicate: VisionElement = {
      ...source,
      id: newId('copy'),
      x: source.x + 36,
      y: source.y + 36,
      zIndex: now,
      createdAt: now,
      updatedAt: now,
      metadata: safeObject(source.metadata)
    };
    applyElements(current => [...current, duplicate]);
    setSelectedId(duplicate.id);
    addToast({ type: 'success', title: 'Copied', description: 'Element duplicated on the board.' });
  }, [addToast, applyElements, elements]);

  const moveElementLayer = useCallback((id: string, direction: 'forward' | 'backward') => {
    const now = Date.now();
    updateElement(id, { zIndex: direction === 'forward' ? now : -now });
  }, [updateElement]);

  const importImageFile = useCallback(async (file: File, x?: number, y?: number) => {
    const normalizedType = (file.type || '').toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(normalizedType)) {
      addToast({ type: 'error', title: 'Unsupported image', description: 'Use a PNG, JPG, or WebP image.' });
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      addToast({ type: 'error', title: 'Image too large', description: 'Use an image under 10MB.' });
      return;
    }

    setIsUploading(true);
    try {
      const { publicUrl, filePath } = await uploadVisionBoardImage(file, vision.id, session?.user?.id);
      createElement('image', publicUrl, { title: file.name, imageUrl: publicUrl, storagePath: filePath }, x, y);
      addToast({ type: 'success', title: 'Image added', description: 'Vision Board image uploaded.' });
    } catch (error: any) {
      console.error('Vision Board image import failed:', error);
      addToast({ type: 'error', title: 'Image failed', description: error.message || 'Could not add this image.' });
    } finally {
      setIsUploading(false);
    }
  }, [addToast, createElement, session?.user?.id, vision.id]);

  const handleCanvasDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const dropPoint = getCanvasPointFromEvent(event);
    const file = Array.from<File>(event.dataTransfer.files || []).find(item => ALLOWED_IMAGE_TYPES.has((item.type || '').toLowerCase()));
    if (file) importImageFile(file, dropPoint.x - 180, dropPoint.y - 120);
  };

  const finishLinking = useCallback((toId: string) => {
    if (!linkingFromId || linkingFromId === toId) {
      setLinkingFromId(null);
      setTempConnectorEnd(null);
      return;
    }
    const exists = elements.some(element =>
      element.type === 'connector' &&
      element.metadata?.fromElementId === linkingFromId &&
      element.metadata?.toElementId === toId
    );
    if (!exists) {
      applyElements(current => [...current, {
        id: newId('connector'),
        type: 'connector',
        content: '',
        x: 0,
        y: 0,
        metadata: { fromElementId: linkingFromId, toElementId: toId, arrowType: 'arrow' }
      }]);
    }
    setLinkingFromId(null);
    setTempConnectorEnd(null);
  }, [applyElements, elements, linkingFromId]);

  const addChecklistItem = (element: VisionElement, text: string) => {
    const checklist = [...normalizeChecklist(element.metadata?.checklist), { id: newId('item'), text, completed: false }];
    updateElement(element.id, { metadata: { checklist } });
  };

  const startDrawing = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activeTool !== 'pen' || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const point = getCanvasPointFromPointer(event);
    const now = Date.now();
    const drawing: VisionElement = {
      id: newId('drawing'),
      type: 'drawing',
      content: pathFromPoints([point]),
      x: 0,
      y: 0,
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      zIndex: now,
      createdAt: now,
      updatedAt: now,
      metadata: { strokeColor: 'var(--accent)' }
    };
    drawingRef.current = { id: drawing.id, pointerId: event.pointerId, points: [point], frame: null };
    setInteractionMode('draw');
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(null);
    setIsDraggingElement(true);
    applyElements(current => [...current, drawing], false);
  };

  const continueDrawing = (event: React.PointerEvent<HTMLDivElement>) => {
    const drawing = drawingRef.current;
    if (!drawing || drawing.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const point = getCanvasPointFromPointer(event);
    drawing.points.push(point);
    if (drawing.frame) return;
    drawing.frame = requestAnimationFrame(() => {
      const active = drawingRef.current;
      if (!active) return;
      active.frame = null;
      const content = pathFromPoints(active.points);
      applyElements(current => current.map(element => element.id === active.id ? { ...element, content, updatedAt: Date.now() } : element), false);
    });
  };

  const stopDrawing = (event: React.PointerEvent<HTMLDivElement>) => {
    const drawing = drawingRef.current;
    if (!drawing || drawing.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    if (drawing.frame) cancelAnimationFrame(drawing.frame);
    const content = pathFromPoints(drawing.points);
    drawingRef.current = null;
    setInteractionMode('idle');
    setIsDraggingElement(false);
    applyElements(current => current.map(element => element.id === drawing.id ? { ...element, content, updatedAt: Date.now() } : element), true);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isTyping) return;
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        event.preventDefault();
        deleteElement(selectedId);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd' && selectedId) {
        event.preventDefault();
        duplicateElement(selectedId);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        persistNow();
      }
      if (event.ctrlKey || event.metaKey) {
        const key = event.key.toLowerCase();
        const currentScale = (transformWrapperRef.current?.instance?.transformState || transformWrapperRef.current?.state)?.scale || zoomLevel;
        if (key === 'z') {
          event.preventDefault();
          restoreElementsFromHistory(event.shiftKey ? 'redo' : 'undo');
          return;
        }
        if (key === 'y') {
          event.preventDefault();
          restoreElementsFromHistory('redo');
          return;
        }
        if (key === '+' || key === '=') {
          event.preventDefault();
          zoomAroundViewportCenter(currentScale + (currentScale < 0.2 ? 0.02 : 0.1));
        }
        if (key === '-' || key === '_') {
          event.preventDefault();
          zoomAroundViewportCenter(currentScale - (currentScale <= 0.2 ? 0.02 : 0.1));
        }
        if (key === '0') {
          event.preventDefault();
          fitBoardToViewport(1);
        }
      }
      if (event.key === 'Escape') {
        setSelectedId(null);
        setActiveTool('select');
        setMobileToolsOpen(false);
        setImportPanelOpen(false);
        setLinkPanelOpen(false);
        setLinkingFromId(null);
        setTempConnectorEnd(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteElement, duplicateElement, fitBoardToViewport, persistNow, restoreElementsFromHistory, selectedId, zoomAroundViewportCenter, zoomLevel]);

  const addMenuOptions = (
    <>
      <CanvasToolButton icon={<Type size={18} />} label="Text" onClick={() => createElement('text', 'Write anything', { fontSize: '22px' })} />
      <CanvasToolButton icon={<StickyNote size={18} />} label="Sticky" onClick={() => createElement('sticky', 'Idea or reminder', { color: '#fef08a' })} />
      <CanvasToolButton icon={<FileText size={18} />} label="Checklist" onClick={() => createElement('checklist', 'Checklist', { checklist: [{ id: newId('item'), text: 'First item', completed: false }] })} />
      <CanvasToolButton icon={<ImageIcon size={18} />} label="Image" onClick={() => imageInputRef.current?.click()} loading={isUploading} />
      <CanvasToolButton icon={<Square size={18} />} label="Shape" onClick={() => createElement('shape', 'Label', { shapeType: 'rectangle', fillColor: '#3b82f622', strokeColor: '#3b82f6' })} />
      <CanvasToolButton icon={<LinkIcon size={18} />} label="Resource Link" onClick={() => { setMobileToolsOpen(false); setLinkPanelOpen(true); }} />
      <CanvasToolButton icon={<Upload size={18} />} label="Import" onClick={() => setImportPanelOpen(true)} />
    </>
  );

  const primaryTools = (
    <>
      <CanvasQuickButton icon={<Type size={17} />} label="Text" onClick={() => createElement('text', 'Write anything', { fontSize: '22px' })} />
      <CanvasQuickButton icon={<StickyNote size={17} />} label="Sticky" onClick={() => createElement('sticky', 'Idea or reminder', { color: '#fef08a' })} />
      <CanvasQuickButton icon={<FileText size={17} />} label="Checklist" onClick={() => createElement('checklist', 'Checklist', { checklist: [{ id: newId('item'), text: 'First item', completed: false }] })} />
      <CanvasQuickButton icon={<ImageIcon size={17} />} label="Image" onClick={() => imageInputRef.current?.click()} loading={isUploading} />
      <CanvasQuickButton icon={<LinkIcon size={17} />} label="Link" onClick={() => { setMobileToolsOpen(false); setLinkPanelOpen(true); }} />
    </>
  );

  const secondaryTools = (
    <>
      <CanvasToolButton icon={<Square size={18} />} label="Shape" onClick={() => createElement('shape', 'Label', { shapeType: 'rectangle', fillColor: '#3b82f622', strokeColor: '#3b82f6' })} />
      <CanvasToolButton icon={<Upload size={18} />} label="Import" onClick={() => setImportPanelOpen(true)} />
    </>
  );

  return (
    <div
      ref={canvasViewportRef}
      className={cn(
        "flex-1 relative overflow-hidden bg-bg-base/20 group/canvas select-none",
        activeTool === 'pen' && "cursor-crosshair",
        activeTool === 'eraser' && "cursor-not-allowed"
      )}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleCanvasDrop}
    >
      <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-[165] hidden max-w-[calc(100vw-22rem)] -translate-x-1/2 items-center gap-0.5 rounded-full border border-card-border bg-card/95 p-1.5 shadow-2xl shadow-accent/10 ring-4 ring-bg-base/70 backdrop-blur-xl md:flex">
        <CanvasQuickButton icon={<Brush size={17} />} label="Pen" onClick={() => setActiveTool(activeTool === 'pen' ? 'select' : 'pen')} active={activeTool === 'pen'} />
        <CanvasQuickButton icon={<Eraser size={17} />} label="Eraser" onClick={() => setActiveTool(activeTool === 'eraser' ? 'select' : 'eraser')} active={activeTool === 'eraser'} />
        <div className="mx-0.5 h-7 w-px shrink-0 bg-card-border" />
        {primaryTools}
        <div className="mx-0.5 h-7 w-px shrink-0 bg-card-border" />
        <CanvasQuickButton
          icon={<MoreHorizontal size={18} />}
          label="More"
          onClick={() => setMobileToolsOpen(open => !open)}
          active={mobileToolsOpen}
        />
      </div>

      <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[165] flex max-w-[calc(100vw-1rem)] items-center gap-1 rounded-full border border-card-border bg-card/95 p-1.5 shadow-2xl shadow-accent/10 ring-4 ring-bg-base/70 backdrop-blur-xl md:hidden">
        <CanvasQuickButton icon={<Brush size={17} />} label="Pen" onClick={() => setActiveTool(activeTool === 'pen' ? 'select' : 'pen')} active={activeTool === 'pen'} compact />
        <CanvasQuickButton icon={<Eraser size={17} />} label="Eraser" onClick={() => setActiveTool(activeTool === 'eraser' ? 'select' : 'eraser')} active={activeTool === 'eraser'} compact />
        <CanvasQuickButton icon={<Type size={17} />} label="Text" onClick={() => createElement('text', 'Write anything', { fontSize: '22px' })} compact />
        <CanvasQuickButton icon={<StickyNote size={17} />} label="Sticky" onClick={() => createElement('sticky', 'Idea or reminder', { color: '#fef08a' })} compact />
        <CanvasQuickButton
          icon={<MoreHorizontal size={18} />}
          label="More"
          onClick={() => setMobileToolsOpen(open => !open)}
          active={mobileToolsOpen}
          compact
        />
      </div>

      <AnimatePresence>
        {mobileToolsOpen && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.96 }}
            className="hidden md:grid fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 translate-x-[6rem] z-[165] grid-cols-2 gap-2 rounded-3xl border border-card-border bg-card/95 p-3 shadow-2xl backdrop-blur-xl"
          >
            {secondaryTools}
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
          if (file) importImageFile(file);
          event.target.value = '';
        }}
      />

      <SavePill status={saveStatus} lastSavedAt={lastSavedAt} onRetry={() => persistNow()} />

      <TransformWrapper
        ref={transformWrapperRef}
        initialScale={1}
        minScale={minZoom}
        maxScale={MAX_ZOOM}
        centerOnInit
        limitToBounds={false}
        centerZoomedOut={false}
        smooth
        onTransform={(ref) => {
          setZoomLevel(current => Math.abs(current - ref.state.scale) > 0.005 ? ref.state.scale : current);
          onActiveChange?.(ref.state.scale > 1.05);
        }}
        onPanningStart={() => onActiveChange?.(true)}
        doubleClick={{ disabled: true }}
        panning={{ disabled: canvasInteractionLocked, velocityDisabled: true, excluded: ['input', 'textarea', 'button', '[data-no-pan]', '[contenteditable="true"]'] }}
        wheel={{ disabled: isEditingText, wheelDisabled: true, touchPadDisabled: false, step: 0.08 }}
        pinch={{ disabled: isEditingText, step: 8, allowPanning: true }}
        trackPadPanning={{ disabled: canvasInteractionLocked, velocityDisabled: true, excluded: ['input', 'textarea', 'button', '[data-no-pan]', '[contenteditable="true"]'] }}
      >
        {() => (
          <>
            <TransformComponent
              wrapperStyle={{ width: '100%', height: '100%' }}
              contentStyle={{ width: `${CANVAS_SIZE}px`, height: `${CANVAS_SIZE}px` }}
            >
              <div
                className="relative w-full h-full overflow-hidden bg-[radial-gradient(circle,rgba(120,120,120,0.22)_1px,transparent_1px)] [background-size:24px_24px]"
                onPointerDown={startDrawing}
                onPointerMove={continueDrawing}
                onPointerUp={stopDrawing}
                onPointerCancel={stopDrawing}
                onClick={() => {
                  setSelectedId(null);
                  setLinkingFromId(null);
                  setTempConnectorEnd(null);
                  setMobileToolsOpen(false);
                }}
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  const point = getCanvasPointFromEvent(event);
                  createElement('text', 'New idea', { fontSize: '22px' }, point.x, point.y);
                }}
              >
                <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible z-0">
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orientation="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" className="text-accent" />
                    </marker>
                  </defs>
                  {elements.filter(element => element.type === 'connector').map(connector => (
                    <ConnectorLine
                      key={connector.id}
                      connector={connector}
                      elements={elements}
                      onDelete={() => deleteElement(connector.id)}
                    />
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
                  {linkingFromId && tempConnectorEnd && <TempConnectorLine fromId={linkingFromId} toPos={tempConnectorEnd} elements={elements} />}
                </svg>

                {elements.filter(element => element.type !== 'connector' && element.type !== 'drawing').map(element => (
                  <CanvasElement
                    key={element.id}
                    element={element}
                    isSelected={selectedId === element.id}
                    isLinking={linkingFromId !== null}
                    isLinkingFrom={linkingFromId === element.id}
                    getScale={getCurrentScale}
                    onSelect={() => linkingFromId ? finishLinking(element.id) : setSelectedId(element.id)}
                    onUpdate={(updates, save) => updateElement(element.id, updates, save)}
                    onDelete={() => deleteElement(element.id)}
                    onCopy={() => duplicateElement(element.id)}
                    onBringForward={() => moveElementLayer(element.id, 'forward')}
                    onSendBackward={() => moveElementLayer(element.id, 'backward')}
                    onClose={() => setSelectedId(null)}
                    activeTool={activeTool}
                    onDragStateChange={setIsDraggingElement}
                    onResizeStateChange={setIsResizingElement}
                    onEditingStateChange={setIsEditingText}
                    setInteractionMode={setInteractionMode}
                    onHover={() => {
                      if (linkingFromId) setTempConnectorEnd(centerOf(element));
                    }}
                  />
                ))}
              </div>
            </TransformComponent>

            <div className="absolute bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 z-[170] w-60 rounded-2xl border border-card-border bg-card/95 p-2 shadow-2xl shadow-accent/10 ring-4 ring-bg-base/70 backdrop-blur-xl md:bottom-[calc(1rem+env(safe-area-inset-bottom))] md:right-5">
              <div className="grid h-14 grid-cols-[44px_1fr_44px] items-center rounded-xl bg-bg-base/50">
                <ControlButton onClick={() => zoomAroundViewportCenter(zoomLevel - (zoomLevel <= 0.2 ? 0.02 : 0.1))} icon={<Minus size={22} />} label="Zoom Out" compact />
                <span className="text-center text-lg font-black tabular-nums text-text-main">{Math.round(zoomLevel * 100)}%</span>
                <ControlButton onClick={() => zoomAroundViewportCenter(zoomLevel + (zoomLevel < 0.2 ? 0.02 : 0.1))} icon={<Plus size={24} />} label="Zoom In" compact />
              </div>
              <div className="mt-2 flex items-center gap-2 px-1">
                <span className="w-8 text-[9px] font-black tabular-nums text-text-secondary">{Math.round(minZoom * 100)}%</span>
                <input
                  type="range"
                  min={minZoom}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={zoomLevel}
                  onChange={(event) => zoomAroundViewportCenter(Number(event.target.value), 0)}
                  className="min-w-0 flex-1 accent-[var(--accent)]"
                  aria-label="Zoom level"
                />
                <span className="w-9 text-right text-[9px] font-black tabular-nums text-text-secondary">{Math.round(MAX_ZOOM * 100)}%</span>
              </div>
              <div className="mt-2 flex items-center justify-end gap-2 px-1">
                <ControlButton onClick={() => fitBoardToViewport(1)} icon={<RotateCcw size={14} />} label="Reset View" compact />
                <ControlButton onClick={() => fitBoardToViewport(minZoom)} icon={<Maximize2 size={14} />} label="Fit Board" compact />
              </div>
            </div>
          </>
        )}
      </TransformWrapper>

      <AnimatePresence>
        {selectedElement && (
          <ElementEditor
            element={selectedElement}
            onUpdate={(updates) => updateElement(selectedElement.id, updates)}
            onDelete={() => deleteElement(selectedElement.id)}
            onClose={() => setSelectedId(null)}
            onAddChecklistItem={(text) => addChecklistItem(selectedElement, text)}
          />
        )}
        {mobileToolsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[180] md:hidden"
          >
            <button className="absolute inset-0 bg-overlay/60" onClick={() => setMobileToolsOpen(false)} aria-label="Close tools" />
            <motion.div
              initial={{ y: 80 }}
              animate={{ y: 0 }}
              exit={{ y: 80 }}
              className="absolute inset-x-0 bottom-0 md:left-24 md:right-auto md:bottom-8 md:w-[360px] rounded-t-[2rem] md:rounded-[2rem] border border-card-border bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-black uppercase tracking-widest text-text-secondary">Add to board</p>
                <button onClick={() => setMobileToolsOpen(false)} className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-text-secondary"><X size={16} /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">{addMenuOptions}</div>
            </motion.div>
          </motion.div>
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

      {elements.length === 0 && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-6 z-10 px-6 text-center">
          <div className="max-w-md space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-text-main/25">Start building your vision.</h2>
            <p className="text-sm sm:text-base font-semibold text-text-secondary/50">Add text, images, shapes, or a checklist. Everything saves back to this Vision Board.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pointer-events-auto">
            <QuickStartAction label="Text" onClick={() => createElement('text', 'Main Goal', { fontSize: '46px', color: 'var(--text-main)', fontWeight: '900' })} />
            <QuickStartAction label="Image" onClick={() => imageInputRef.current?.click()} />
            <QuickStartAction label="Checklist" onClick={() => createElement('checklist', 'Checklist', { checklist: [{ id: newId('item'), text: 'First item', completed: false }] })} />
            <QuickStartAction label="Sticky" onClick={() => createElement('sticky', 'Idea or reminder', { color: '#fef08a' })} />
          </div>
        </div>
      )}
    </div>
  );
};

function QuickStartAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="h-11 px-4 rounded-xl bg-card border border-card-border text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-accent hover:border-accent/30 shadow-lg">
      {label}
    </button>
  );
}

function ResourceLinkPanel({
  value,
  onChange,
  onClose,
  onSubmit
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[190]"
    >
      <button className="absolute inset-0 bg-overlay/45" onClick={onClose} aria-label="Close resource link" />
      <motion.aside
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        className="absolute inset-x-3 bottom-3 md:left-1/2 md:right-auto md:bottom-24 md:w-[420px] md:-translate-x-1/2 rounded-[2rem] border border-card-border bg-card p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-accent">Resource Link</p>
            <h3 className="text-base font-black text-text-main">Embed a preview card</h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-surface-muted text-text-secondary flex items-center justify-center" aria-label="Close resource link">
            <X size={16} />
          </button>
        </div>
        <label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">HTTPS URL</span>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onSubmit();
            }}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full h-12 rounded-2xl border border-card-border bg-surface-muted px-4 text-sm font-semibold text-text-main outline-none focus:border-accent/50"
            autoFocus
          />
        </label>
        <p className="mt-3 text-xs font-semibold text-text-secondary/60">YouTube links show thumbnails automatically. Other links use a clean domain fallback.</p>
        <button onClick={onSubmit} className="mt-5 w-full h-12 rounded-2xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest">
          Add Resource
        </button>
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
  const recentNotes = safeArray<Note>(notes)
    .filter(note => !note.isDeleted)
    .slice(0, 8);
  const taskCount = safeArray<Task>(tasks).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[190]"
    >
      <button className="absolute inset-0 bg-overlay/45" onClick={onClose} aria-label="Close import panel" />
      <motion.aside
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        className="absolute inset-x-3 bottom-3 md:inset-x-auto md:right-5 md:top-5 md:bottom-5 md:w-[380px] max-h-[calc(100dvh-24px)] overflow-hidden rounded-[2rem] border border-card-border bg-card shadow-2xl flex flex-col"
      >
        <div className="shrink-0 flex items-center justify-between gap-3 border-b border-card-border p-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-accent">Vision Board</p>
            <h3 className="text-base font-black text-text-main">Import</h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-surface-muted text-text-secondary flex items-center justify-center" aria-label="Close import panel">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          <button
            onClick={onUploadImage}
            disabled={isUploading}
            className="w-full min-h-14 rounded-2xl border border-card-border bg-surface-muted px-4 text-left flex items-center gap-3 hover:border-accent/40 disabled:opacity-60"
          >
            <span className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
              {isUploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black text-text-main">Upload image</span>
              <span className="block text-xs font-semibold text-text-secondary">PNG, JPG, or WebP under 10MB</span>
            </span>
          </button>

          <button
            onClick={onImportTasks}
            disabled={taskCount === 0}
            className="w-full min-h-14 rounded-2xl border border-card-border bg-surface-muted px-4 text-left flex items-center gap-3 hover:border-accent/40 disabled:opacity-50"
          >
            <span className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
              <ListChecks size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black text-text-main">Import vision tasks</span>
              <span className="block text-xs font-semibold text-text-secondary">{taskCount ? `${taskCount} task${taskCount === 1 ? '' : 's'} as checklist` : 'No tasks in this vision yet'}</span>
            </span>
          </button>

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Recent notes</p>
            {recentNotes.length > 0 ? recentNotes.map(note => (
              <button
                key={note.id}
                onClick={() => onImportNote(note)}
                className="w-full rounded-2xl border border-card-border bg-bg-base/35 p-3 text-left hover:border-accent/40"
              >
                <span className="flex items-start gap-3">
                  <span className="mt-0.5 w-9 h-9 rounded-xl bg-warning/10 text-warning flex items-center justify-center shrink-0">
                    <FileText size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-text-main truncate">{safeString(note.title, 'Untitled Note')}</span>
                    <span className="block text-xs font-semibold text-text-secondary line-clamp-2">{safeString(note.content, 'No content yet.')}</span>
                  </span>
                </span>
              </button>
            )) : (
              <div className="rounded-2xl border border-dashed border-card-border p-4 text-sm font-semibold text-text-secondary">
                No notes to import yet.
              </div>
            )}
          </div>
        </div>
      </motion.aside>
    </motion.div>
  );
}

function SavePill({ status, lastSavedAt, onRetry }: { status: SaveStatus; lastSavedAt: string | null; onRetry: () => void }) {
  const label = status === 'saving' ? 'Saving...' : status === 'dirty' ? 'Unsaved changes' : status === 'failed' ? 'Failed to save' : lastSavedAt ? `Saved ${lastSavedAt}` : 'Saved';
  return (
    <div className={cn(
      'absolute right-3 top-3 z-40 rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-widest shadow-lg backdrop-blur-md flex items-center gap-2',
      status === 'saving' && 'bg-accent/10 border-accent/20 text-accent',
      status === 'dirty' && 'bg-warning/10 border-warning/20 text-warning',
      status === 'failed' && 'bg-danger/10 border-danger/20 text-danger',
      status === 'saved' && 'bg-card/90 border-card-border text-text-secondary/60'
    )}>
      {status === 'saving' ? <Loader2 size={13} className="animate-spin" /> : status === 'saved' ? <Save size={13} /> : null}
      {label}
      {status === 'failed' && <button onClick={onRetry} className="ml-1 underline">Retry</button>}
    </div>
  );
}

function ControlButton({ onClick, icon, label, compact = false }: { onClick: () => void; icon: React.ReactNode; label: string; compact?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-text-secondary hover:text-accent hover:bg-accent/5 rounded-full transition-all",
        compact ? "grid h-9 w-9 place-items-center" : "min-w-11 min-h-11 p-3 rounded-xl"
      )}
      title={label}
      aria-label={label}
    >
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
        "flex shrink-0 items-center justify-center rounded-full font-black uppercase tracking-widest transition-all disabled:opacity-50",
        compact ? "h-10 gap-1 px-2 text-[7px]" : "h-9 gap-1 px-2.5 text-[7px]",
        active
          ? "bg-accent text-accent-contrast shadow-lg shadow-accent/20"
          : "text-text-secondary hover:bg-accent/10 hover:text-accent"
      )}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      {loading ? <Loader2 size={17} className="animate-spin" /> : icon}
      <span>{label}</span>
    </button>
  );
}

function CanvasToolButton({ icon, label, onClick, loading = false }: { icon: React.ReactNode; label: string; onClick: () => void; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="min-w-20 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 text-text-secondary hover:text-accent hover:bg-accent/10 transition-all group relative disabled:opacity-50"
      title={label}
      aria-label={label}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : icon}
      <span className="text-[8px] font-black uppercase tracking-widest text-center leading-tight">{label}</span>
    </button>
  );
}

type CanvasElementProps = {
  element: VisionElement;
  isSelected: boolean;
  isLinking: boolean;
  isLinkingFrom: boolean;
  activeTool: BoardTool;
  getScale: () => number;
  onSelect: () => void;
  onUpdate: (updates: Partial<VisionElement>, save?: boolean) => void;
  onDelete: () => void;
  onCopy: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onClose: () => void;
  onDragStateChange: (active: boolean) => void;
  onResizeStateChange: (active: boolean) => void;
  onEditingStateChange: (active: boolean) => void;
  setInteractionMode: (mode: InteractionMode) => void;
  onHover: () => void;
};

const CanvasElement = React.memo(({
  element,
  isSelected,
  isLinking,
  isLinkingFrom,
  activeTool,
  getScale,
  onSelect,
  onUpdate,
  onDelete,
  onCopy,
  onBringForward,
  onSendBackward,
  onClose,
  onDragStateChange,
  onResizeStateChange,
  onEditingStateChange,
  setInteractionMode,
  onHover
}: CanvasElementProps) => {
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    lastClientX: number;
    lastClientY: number;
    frame: number | null;
  } | null>(null);

  const stopDrag = useCallback(() => {
    const activeDrag = dragRef.current;
    if (!activeDrag) return;
    if (activeDrag.frame) cancelAnimationFrame(activeDrag.frame);
    const scale = getScale();
    const nextX = activeDrag.startX + (activeDrag.lastClientX - activeDrag.startClientX) / scale;
    const nextY = activeDrag.startY + (activeDrag.lastClientY - activeDrag.startClientY) / scale;
    dragRef.current = null;
    setInteractionMode('idle');
    onDragStateChange(false);
    onUpdate({ x: nextX, y: nextY }, true);
  }, [getScale, onDragStateChange, onUpdate]);

  useEffect(() => () => {
    if (dragRef.current?.frame) cancelAnimationFrame(dragRef.current.frame);
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activeTool === 'eraser') {
      event.stopPropagation();
      event.preventDefault();
      onDelete();
      return;
    }
    const clickCount = (event.nativeEvent as PointerEvent & { detail?: number }).detail || 0;
    if ((event.target as HTMLElement).closest('[data-text-content]') && clickCount > 1) {
      event.stopPropagation();
      event.preventDefault();
      return;
    }
    if (activeTool !== 'select') return;
    if (isLinking || event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    onSelect();
    setInteractionMode('element-drag');
    onDragStateChange(true);

    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: element.x,
      startY: element.y,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      frame: null
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const activeDrag = dragRef.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    activeDrag.lastClientX = event.clientX;
    activeDrag.lastClientY = event.clientY;
    if (activeDrag.frame) return;

    activeDrag.frame = requestAnimationFrame(() => {
      const currentDrag = dragRef.current;
      if (!currentDrag) return;
      currentDrag.frame = null;
      const scale = getScale();
      onUpdate({
        x: currentDrag.startX + (currentDrag.lastClientX - currentDrag.startClientX) / scale,
        y: currentDrag.startY + (currentDrag.lastClientY - currentDrag.startClientY) / scale
      }, false);
    });
  };

  return (
    <motion.div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onMouseMove={() => {
        if (isLinking && !isLinkingFrom) onHover();
      }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, x: element.x, y: element.y, zIndex: isSelected ? 120 : (element.zIndex || 1) }}
      className={cn(
        'absolute cursor-grab active:cursor-grabbing touch-none will-change-transform',
        activeTool === 'eraser' && 'cursor-crosshair active:cursor-crosshair',
        isSelected && !isLinking && 'ring-2 ring-accent ring-offset-4 ring-offset-bg-base/50 rounded-xl',
        isLinking && !isLinkingFrom && 'hover:ring-2 hover:ring-accent/50 hover:ring-offset-2 rounded-xl transition-all'
      )}
      onClick={(event) => {
        event.stopPropagation();
        if (activeTool === 'eraser') return;
        onSelect();
      }}
      data-no-pan
    >
      <div className="relative group/content">
        {isSelected && !isLinking && (
          <SelectedElementActions
            onCopy={onCopy}
            onBringForward={onBringForward}
            onSendBackward={onSendBackward}
            onDelete={onDelete}
            onClose={onClose}
          />
        )}
        {isLinkingFrom && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent text-accent-contrast rounded-full text-[8px] font-black uppercase tracking-widest">
            Pick target
          </div>
        )}
        <ElementContent element={element} isSelected={isSelected} onSelect={onSelect} onUpdate={(updates) => onUpdate(updates, true)} onEditingStateChange={onEditingStateChange} setInteractionMode={setInteractionMode} />
        {isSelected && RESIZABLE_TYPES.has(element.type) && (
          <ResizeHandles element={element} getScale={getScale} onUpdate={onUpdate} onResizeStateChange={onResizeStateChange} setInteractionMode={setInteractionMode} />
        )}
      </div>
    </motion.div>
  );
}, (prev, next) => (
  prev.element === next.element &&
  prev.isSelected === next.isSelected &&
  prev.isLinking === next.isLinking &&
  prev.isLinkingFrom === next.isLinkingFrom &&
  prev.activeTool === next.activeTool
));

function ResizeHandles({
  element,
  getScale,
  onUpdate,
  onResizeStateChange,
  setInteractionMode
}: {
  element: VisionElement;
  getScale: () => number;
  onUpdate: (updates: Partial<VisionElement>, save?: boolean) => void;
  onResizeStateChange: (active: boolean) => void;
  setInteractionMode: (mode: InteractionMode) => void;
}) {
  const startRef = useRef<{ x: number; y: number; width: number; height: number; left: number; top: number; frame: number | null; lastX: number; lastY: number; corner: ResizeCorner } | null>(null);
  const width = element.width || defaultSize(element.type).width;
  const height = element.height || defaultSize(element.type).height;
  const corners: ResizeCorner[] = ['nw', 'ne', 'sw', 'se'];

  const onPointerDown = (corner: ResizeCorner, event: React.PointerEvent) => {
    event.stopPropagation();
    event.preventDefault();
    setInteractionMode('resize');
    onResizeStateChange(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    startRef.current = { x: event.clientX, y: event.clientY, width, height, left: element.x, top: element.y, frame: null, lastX: event.clientX, lastY: event.clientY, corner };

    const move = (moveEvent: PointerEvent) => {
      if (!startRef.current) return;
      startRef.current.lastX = moveEvent.clientX;
      startRef.current.lastY = moveEvent.clientY;
      if (startRef.current.frame) return;
      startRef.current.frame = requestAnimationFrame(() => {
        if (!startRef.current) return;
        startRef.current.frame = null;
        const scale = getScale();
        const dx = (startRef.current.lastX - startRef.current.x) / scale;
        const dy = (startRef.current.lastY - startRef.current.y) / scale;
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
        }, false);
      });
    };

    const up = () => {
      if (startRef.current) {
        if (startRef.current.frame) cancelAnimationFrame(startRef.current.frame);
        startRef.current = null;
        onUpdate({}, true);
      }
      setInteractionMode('idle');
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
          onPointerDown={(event) => onPointerDown(corner, event)}
          className={cn(
            'absolute w-4 h-4 rounded-full bg-accent border-2 border-card shadow-lg z-30',
            corner.includes('n') ? '-top-2' : '-bottom-2',
            corner.includes('w') ? '-left-2' : '-right-2'
          )}
          aria-label={`Resize ${corner}`}
        />
      ))}
    </>
  );
}

function ConnectorLine({ connector, elements, onDelete }: { connector: VisionElement; elements: VisionElement[]; onDelete: () => void }) {
  const fromEl = elements.find(element => element.id === connector.metadata?.fromElementId);
  const toEl = elements.find(element => element.id === connector.metadata?.toElementId);
  if (!fromEl || !toEl) return null;
  const from = centerOf(fromEl);
  const to = centerOf(toEl);
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const curve = `M ${from.x} ${from.y} Q ${midX} ${from.y} ${to.x} ${to.y}`;

  return (
    <g className="group/line">
      <path d={curve} fill="none" stroke="currentColor" strokeWidth="3" className="text-accent/45 transition-all group-hover/line:text-accent" markerEnd="url(#arrowhead)" />
      <path d={curve} fill="none" stroke="transparent" strokeWidth="24" className="pointer-events-auto cursor-pointer" onClick={(event) => { event.stopPropagation(); onDelete(); }} />
      <foreignObject x={midX - 12} y={midY - 12} width="24" height="24" className="opacity-0 group-hover/line:opacity-100 transition-opacity">
        <button onClick={onDelete} className="w-6 h-6 rounded-full bg-danger text-white flex items-center justify-center shadow-lg pointer-events-auto" aria-label="Delete connector">
          <X size={12} />
        </button>
      </foreignObject>
    </g>
  );
}

function TempConnectorLine({ fromId, toPos, elements }: { fromId: string; toPos: { x: number; y: number }; elements: VisionElement[] }) {
  const fromEl = elements.find(element => element.id === fromId);
  if (!fromEl) return null;
  const from = centerOf(fromEl);
  return <path d={`M ${from.x} ${from.y} L ${toPos.x} ${toPos.y}`} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-accent animate-pulse" />;
}

const ElementContent: React.FC<{
  element: VisionElement;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<VisionElement>) => void;
  onEditingStateChange: (active: boolean) => void;
  setInteractionMode: (mode: InteractionMode) => void;
}> = ({ element, isSelected, onSelect, onUpdate, onEditingStateChange, setInteractionMode }) => {
  const width = element.width || defaultSize(element.type).width;
  const height = element.height || defaultSize(element.type).height;
  const [isTextEditing, setIsTextEditing] = useState(false);

  const enterTextEdit = () => {
    if (element.type !== 'text' && element.type !== 'heading') return;
    onSelect();
    setIsTextEditing(true);
    onEditingStateChange(true);
    setInteractionMode('text-edit');
  };

  const exitTextEdit = () => {
    setIsTextEditing(false);
    onEditingStateChange(false);
    setInteractionMode('idle');
  };

  if (element.type === 'text' || element.type === 'heading') {
    return (
      <div
        data-text-content
        data-no-pan
        contentEditable={isTextEditing}
        suppressContentEditableWarning
        onDoubleClick={(event) => {
          event.stopPropagation();
          enterTextEdit();
          window.requestAnimationFrame(() => (event.currentTarget as HTMLDivElement).focus());
        }}
        onPointerDown={(event) => {
          if (isTextEditing) event.stopPropagation();
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            event.preventDefault();
            (event.currentTarget as HTMLDivElement).blur();
          }
        }}
        onFocus={() => {
          if (!isTextEditing) enterTextEdit();
        }}
        onBlur={(event) => {
          exitTextEdit();
          onUpdate({ content: event.currentTarget.textContent || '' });
        }}
        className={cn(
          'outline-none whitespace-pre-wrap break-words',
          !isTextEditing && 'cursor-grab select-none',
          isSelected && !isTextEditing && 'rounded-lg bg-accent/5',
          isTextEditing && 'cursor-text select-text ring-2 ring-accent/25',
          element.type === 'heading' ? 'font-black tracking-tight' : 'font-bold'
        )}
        style={{
          width,
          minHeight: height,
          color: element.metadata?.color || (element.type === 'heading' ? 'var(--text-main)' : 'var(--text-secondary)'),
          fontSize: element.metadata?.fontSize || (element.type === 'heading' ? '46px' : '22px'),
          fontFamily: element.metadata?.fontFamily,
          fontWeight: element.metadata?.fontWeight,
          textAlign: element.metadata?.textAlign || 'left'
        }}
      >
        {safeString(element.content, 'Write anything')}
      </div>
    );
  }

  if (element.type === 'sticky') {
    return (
      <div
        className="overflow-hidden rounded-2xl border border-black/5 shadow-2xl"
        style={{ width, height, backgroundColor: element.metadata?.color || '#fef08a' }}
      >
        <div className="h-8 cursor-grab border-b border-black/5 bg-white/25 px-4 text-[9px] font-black uppercase tracking-widest text-black/35 flex items-center">
          Drag sticky
        </div>
        <textarea
          value={safeString(element.content)}
          onPointerDown={(event) => event.stopPropagation()}
          onFocus={() => {
            onEditingStateChange(true);
            setInteractionMode('text-edit');
          }}
          onBlur={() => {
            onEditingStateChange(false);
            setInteractionMode('idle');
          }}
          onChange={(event) => onUpdate({ content: event.target.value })}
          className="h-[calc(100%-2rem)] w-full resize-none border-none bg-transparent outline-none p-5 pt-4 text-base font-bold text-black/80 leading-tight"
          data-no-pan
        />
      </div>
    );
  }

  if (element.type === 'image') {
    const imageUrl = safeString(element.metadata?.imageUrl || element.content);
    return (
      <div className="bg-card rounded-2xl overflow-hidden shadow-2xl border border-card-border" style={{ width, height }}>
        {imageUrl ? (
          <img src={imageUrl} className="w-full h-full object-cover" alt={safeString(element.metadata?.title, 'Board asset')} draggable={false} />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-4 text-xs font-bold text-text-secondary">Image unavailable</div>
        )}
      </div>
    );
  }

  if (element.type === 'drawing') {
    return (
      <svg
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
        className="pointer-events-none overflow-visible"
        aria-hidden="true"
      >
        <path
          d={safeString(element.content)}
          fill="none"
          stroke={element.metadata?.strokeColor || 'var(--accent)'}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (element.type === 'shape' || element.type === 'flowchartNode') {
    const shapeType = element.metadata?.shapeType || 'rectangle';
    return (
      <div
        className="flex items-center justify-center border-4 shadow-xl"
        style={{
          width,
          height,
          backgroundColor: element.metadata?.fillColor || element.metadata?.color || 'var(--accent-soft)',
          borderColor: element.metadata?.strokeColor || element.metadata?.color || 'var(--accent)',
          borderRadius: shapeType === 'circle' ? '50%' : '14px',
          transform: shapeType === 'diamond' ? 'rotate(45deg)' : undefined
        }}
      >
        <textarea
          value={safeString(element.content)}
          onPointerDown={(event) => event.stopPropagation()}
          onFocus={() => {
            onEditingStateChange(true);
            setInteractionMode('text-edit');
          }}
          onBlur={() => {
            onEditingStateChange(false);
            setInteractionMode('idle');
          }}
          onChange={(event) => onUpdate({ content: event.target.value })}
          className="w-full bg-transparent resize-none border-none outline-none text-center font-bold text-text-main px-4"
          style={{ transform: shapeType === 'diamond' ? 'rotate(-45deg)' : undefined }}
          data-no-pan
        />
      </div>
    );
  }

  if (element.type === 'checklist') {
    const checklist = normalizeChecklist(element.metadata?.checklist);
    return (
      <div className="bg-card p-5 rounded-3xl border border-card-border shadow-2xl space-y-4" style={{ width, minHeight: height }}>
        <input
          value={safeString(element.content, 'Checklist')}
          onPointerDown={(event) => event.stopPropagation()}
          onFocus={() => {
            onEditingStateChange(true);
            setInteractionMode('text-edit');
          }}
          onBlur={() => {
            onEditingStateChange(false);
            setInteractionMode('idle');
          }}
          onChange={(event) => onUpdate({ content: event.target.value })}
          className="w-full bg-transparent border-none outline-none font-black text-text-main"
          data-no-pan
        />
        <div className="space-y-2">
          {checklist.map(item => (
            <ChecklistRow key={item.id} item={item} checklist={checklist} onUpdate={(next) => onUpdate({ metadata: { checklist: next } })} />
          ))}
        </div>
      </div>
    );
  }

  if (element.type === 'link') {
    const url = safeString(element.metadata?.url || element.content, 'https://example.com');
    const domain = safeString(element.metadata?.source || getDomain(url), 'Resource');
    const title = safeString(element.metadata?.title, domain);
    const description = safeString(element.metadata?.description, url);
    const image = safeString(element.metadata?.image);
    const provider = safeString(element.metadata?.provider, domain);
    return (
      <div className="bg-card border border-card-border rounded-[2rem] overflow-hidden shadow-2xl" style={{ width, minHeight: height }}>
        {image ? (
          <img src={image} alt="" className="w-full h-28 object-cover bg-surface-muted" draggable={false} />
        ) : (
          <div className="w-full h-20 bg-accent/10 text-accent flex items-center justify-center">
            <LinkIcon size={24} />
          </div>
        )}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 text-[9px] font-black uppercase tracking-widest text-accent truncate">{provider}</span>
            <a href={url} target="_blank" rel="noreferrer" onPointerDown={(event) => event.stopPropagation()} className="shrink-0 w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center" aria-label="Open resource">
              <ExternalLink size={14} />
            </a>
          </div>
          <input
            value={title}
            onPointerDown={(event) => event.stopPropagation()}
            onFocus={() => {
              onEditingStateChange(true);
              setInteractionMode('text-edit');
            }}
            onBlur={() => {
              onEditingStateChange(false);
              setInteractionMode('idle');
            }}
            onChange={(event) => onUpdate({ metadata: { title: event.target.value } })}
            className="w-full bg-transparent outline-none font-black text-text-main text-sm"
            data-no-pan
          />
          <p className="text-xs font-semibold text-text-secondary line-clamp-2">{description}</p>
          <p className="text-[9px] font-bold text-text-secondary/45 truncate">{domain}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-card border border-card-border rounded-xl shadow-xl" style={{ width, minHeight: height }}>
      {safeString(element.content, 'Board item')}
    </div>
  );
};

function ChecklistRow({ item, checklist, onUpdate }: { item: ChecklistItem; checklist: ChecklistItem[]; onUpdate: (items: ChecklistItem[]) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onUpdate(checklist.map(entry => entry.id === item.id ? { ...entry, completed: !entry.completed } : entry));
        }}
        className={cn('w-5 h-5 rounded-lg border flex items-center justify-center shrink-0', item.completed ? 'bg-success border-success text-white' : 'border-card-border')}
      >
        {item.completed && <Check size={12} />}
      </button>
      <input
        value={item.text}
        onPointerDown={(event) => event.stopPropagation()}
        onChange={(event) => onUpdate(checklist.map(entry => entry.id === item.id ? { ...entry, text: event.target.value } : entry))}
        className={cn('min-w-0 flex-1 bg-transparent outline-none text-sm font-bold text-text-secondary', item.completed && 'line-through opacity-50')}
        data-no-pan
      />
      <button
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onUpdate(checklist.filter(entry => entry.id !== item.id));
        }}
        className="w-8 h-8 rounded-lg text-text-secondary/45 hover:text-danger hover:bg-danger/10 flex items-center justify-center"
      >
        <X size={13} />
      </button>
    </div>
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
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.92 }}
      className="absolute -top-14 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-card-border bg-card/95 p-1.5 shadow-2xl ring-4 ring-bg-base/70 backdrop-blur-xl"
      data-no-pan
    >
      <SelectedActionButton icon={<Copy size={15} />} label="Copy" onClick={onCopy} />
      <SelectedActionButton icon={<ArrowUp size={15} />} label="Bring forward" onClick={onBringForward} />
      <SelectedActionButton icon={<ArrowDown size={15} />} label="Send backward" onClick={onSendBackward} />
      <SelectedActionButton icon={<Trash2 size={15} />} label="Delete" onClick={onDelete} danger />
      <SelectedActionButton icon={<X size={15} />} label="Deselect" onClick={onClose} />
    </motion.div>
  );
}

function SelectedActionButton({ icon, label, onClick, danger = false }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        "grid h-10 w-10 place-items-center rounded-xl transition-all",
        danger ? "text-danger hover:bg-danger/10" : "text-text-secondary hover:bg-accent/10 hover:text-accent"
      )}
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  );
}

function ElementEditor({
  element,
  onUpdate,
  onDelete,
  onClose,
  onAddChecklistItem
}: {
  element: VisionElement;
  onUpdate: (updates: Partial<VisionElement>) => void;
  onDelete: () => void;
  onClose: () => void;
  onAddChecklistItem: (text: string) => void;
}) {
  const [newChecklistText, setNewChecklistText] = useState('');
  const canColor = ['text', 'heading', 'sticky', 'shape', 'flowchartNode'].includes(element.type);
  const width = element.width || defaultSize(element.type).width;
  const height = element.height || defaultSize(element.type).height;

  return (
    <motion.aside
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      className="fixed md:absolute inset-x-0 bottom-0 md:inset-x-auto md:right-4 md:top-16 md:bottom-auto z-[170] md:w-80 max-h-[75dvh] overflow-y-auto custom-scrollbar bg-card/95 backdrop-blur-xl border border-card-border rounded-t-[2rem] md:rounded-[2rem] p-4 shadow-2xl"
      data-no-pan
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-accent">{element.type}</p>
          <h3 className="text-sm font-black text-text-main">Element settings</h3>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-xl bg-surface-muted text-text-secondary flex items-center justify-center"><X size={16} /></button>
      </div>

      <div className="space-y-4">
        {element.type !== 'image' && element.type !== 'checklist' && (
          <label className="block space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Content</span>
            <textarea value={safeString(element.content)} onChange={(event) => onUpdate({ content: event.target.value })} className="w-full min-h-24 rounded-2xl bg-surface-muted border border-card-border p-3 text-sm font-semibold outline-none focus:border-accent resize-y" />
          </label>
        )}

        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Width" value={width} onChange={(value) => onUpdate({ width: value })} />
          <NumberField label="Height" value={height} onChange={(value) => onUpdate({ height: value })} />
        </div>

        {(element.type === 'text' || element.type === 'heading') && (
          <NumberField
            label="Font size"
            value={parseInt(String(element.metadata?.fontSize || (element.type === 'heading' ? 46 : 22)), 10)}
            onChange={(value) => onUpdate({ metadata: { fontSize: `${value}px` } })}
          />
        )}

        {canColor && (
          <label className="block space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Color</span>
            <input
              value={element.metadata?.strokeColor || element.metadata?.color || element.metadata?.fillColor || '#8da482'}
              onChange={(event) => onUpdate({
                metadata: element.type === 'shape' || element.type === 'flowchartNode'
                  ? { strokeColor: event.target.value, fillColor: `${event.target.value}22` }
                  : { color: event.target.value }
              })}
              className="w-full h-11 rounded-xl bg-surface-muted border border-card-border px-3 text-sm font-bold outline-none focus:border-accent"
            />
          </label>
        )}

        {(element.type === 'shape' || element.type === 'flowchartNode') && (
          <div className="grid grid-cols-3 gap-2">
            {(['rectangle', 'circle', 'diamond'] as const).map(shape => (
              <button
                key={shape}
                onClick={() => onUpdate({ metadata: { shapeType: shape } })}
                className={cn('h-10 rounded-xl border text-[9px] font-black uppercase tracking-widest', element.metadata?.shapeType === shape ? 'border-accent bg-accent/10 text-accent' : 'border-card-border text-text-secondary')}
              >
                {shape}
              </button>
            ))}
          </div>
        )}

        {element.type === 'checklist' && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const text = newChecklistText.trim();
              if (!text) return;
              onAddChecklistItem(text);
              setNewChecklistText('');
            }}
            className="flex gap-2"
          >
            <input value={newChecklistText} onChange={(event) => setNewChecklistText(event.target.value)} placeholder="Add checklist item" className="min-w-0 flex-1 h-11 rounded-xl bg-surface-muted border border-card-border px-3 text-sm font-bold outline-none focus:border-accent" />
            <button type="submit" className="h-11 px-3 rounded-xl bg-accent text-accent-contrast text-[9px] font-black uppercase tracking-widest">Add</button>
          </form>
        )}

        <div className="pt-2 border-t border-card-border">
          <button onClick={onDelete} className="w-full h-11 rounded-xl bg-danger/10 text-danger text-[10px] font-black uppercase tracking-widest">Delete</button>
        </div>
      </div>
    </motion.aside>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block space-y-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary">{label}</span>
      <input
        type="number"
        min={20}
        value={Math.round(value)}
        onChange={(event) => onChange(Math.max(20, Number(event.target.value) || 20))}
        className="w-full h-11 rounded-xl bg-surface-muted border border-card-border px-3 text-sm font-bold outline-none focus:border-accent"
      />
    </label>
  );
}
