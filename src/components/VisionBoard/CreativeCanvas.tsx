import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  Circle as CircleIcon,
  FileText,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Square,
  StickyNote,
  Target,
  Trash2,
  Type,
  X
} from 'lucide-react';
import { Vision, VisionElement } from '../../types';
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

const CANVAS_SIZE = 5200;
const CANVAS_CENTER = CANVAS_SIZE / 2;
const SAVE_DELAY_MS = 850;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const STABLE_BOARD_TYPES = new Set<VisionElement['type']>(['text', 'image', 'sticky', 'checklist', 'shape', 'connector']);

const newId = (prefix = 'el') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const defaultSize = (type: VisionElement['type']) => {
  if (type === 'image') return { width: 360, height: 240 };
  if (type === 'sticky') return { width: 260, height: 220 };
  if (type === 'checklist') return { width: 300, height: 250 };
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
    shapeType: type === 'shape' ? (metadata.shapeType || 'rectangle') : metadata.shapeType
  };

  return {
    id: safeString(row.id, newId(`board-${index}`)),
    type,
    content: safeString(row.content, type === 'checklist' ? 'Checklist' : type === 'sticky' ? 'Idea or reminder' : ''),
    x: safeNumber(row.x, CANVAS_CENTER),
    y: safeNumber(row.y, CANVAS_CENTER),
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

export const CreativeCanvas: React.FC<CreativeCanvasProps> = ({ vision, updateVision, onActiveChange }) => {
  const [elements, setElements] = useState<VisionElement[]>(() => normalizeBoardElements(vision.elements));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkingFromId, setLinkingFromId] = useState<string | null>(null);
  const [tempConnectorEnd, setTempConnectorEnd] = useState<{ x: number; y: number } | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [isUploading, setIsUploading] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const transformWrapperRef = useRef<any>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingElementsRef = useRef<VisionElement[]>(normalizeBoardElements(vision.elements));
  const { session, addToast } = useStore();

  const selectedElement = useMemo(
    () => elements.find(element => element.id === selectedId) || null,
    [elements, selectedId]
  );

  useEffect(() => {
    const normalized = normalizeBoardElements(vision.elements);
    setElements(normalized);
    pendingElementsRef.current = normalized;
    setSelectedId(null);
    setLinkingFromId(null);
    setTempConnectorEnd(null);
    setSaveStatus('saved');
  }, [vision.id, vision.elements]);

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  const persistNow = useCallback(async (nextElements?: VisionElement[]) => {
    const payload = nextElements || pendingElementsRef.current;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    try {
      const result = await Promise.resolve(updateVision(vision.id, { elements: payload }));
      if (result === false) throw new Error('Could not save this board change.');
      setSaveStatus('saved');
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (error) {
      console.error('Vision Board save failed:', error);
      setSaveStatus('failed');
      addToast({ type: 'error', title: 'Board save failed', description: 'Could not save this board change.' });
    }
  }, [addToast, updateVision, vision.id]);

  const scheduleSave = useCallback((nextElements: VisionElement[]) => {
    pendingElementsRef.current = nextElements;
    setSaveStatus('dirty');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persistNow(nextElements);
    }, SAVE_DELAY_MS);
  }, [persistNow]);

  const applyElements = useCallback((updater: VisionElement[] | ((current: VisionElement[]) => VisionElement[]), save = true) => {
    setElements(current => {
      const next = normalizeBoardElements(typeof updater === 'function' ? updater(current) : updater);
      pendingElementsRef.current = next;
      if (save) scheduleSave(next);
      return next;
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

  const createElement = useCallback((
    type: VisionElement['type'],
    content: string,
    metadata: VisionElement['metadata'] = {},
    x = CANVAS_CENTER + Math.random() * 180 - 90,
    y = CANVAS_CENTER + Math.random() * 120 - 60
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
    setMobileToolsOpen(false);
  }, [applyElements]);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isTyping) return;
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        event.preventDefault();
        deleteElement(selectedId);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        persistNow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteElement, persistNow, selectedId]);

  const toolGroups = (
    <>
      <CanvasToolButton icon={<Type size={18} />} label="Text" onClick={() => createElement('text', 'Write anything', { fontSize: '22px' })} />
      <CanvasToolButton icon={<Target size={18} />} label="Goal" onClick={() => createElement('text', 'New goal', { fontSize: '46px', color: 'var(--text-main)', fontWeight: '900' })} />
      <CanvasToolButton icon={<StickyNote size={18} />} label="Sticky" onClick={() => createElement('sticky', 'Idea or reminder', { color: '#fef08a' })} />
      <CanvasToolButton icon={<ImageIcon size={18} />} label="Image" onClick={() => imageInputRef.current?.click()} loading={isUploading} />
      <CanvasToolButton icon={<Square size={18} />} label="Rectangle" onClick={() => createElement('shape', 'Label', { shapeType: 'rectangle', fillColor: '#3b82f622', strokeColor: '#3b82f6' })} />
      <CanvasToolButton icon={<CircleIcon size={18} />} label="Circle" onClick={() => createElement('shape', '', { shapeType: 'circle', fillColor: '#10b98122', strokeColor: '#10b981' })} />
      <CanvasToolButton icon={<FileText size={18} />} label="Checklist" onClick={() => createElement('checklist', 'Checklist', { checklist: [{ id: newId('item'), text: 'First item', completed: false }] })} />
    </>
  );

  return (
    <div
      className="flex-1 relative overflow-hidden bg-bg-base/20 group/canvas select-none"
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleCanvasDrop}
    >
      <div className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 z-40 bg-card/90 backdrop-blur-xl border border-card-border rounded-2xl p-2 shadow-2xl flex-col gap-1">
        {toolGroups}
      </div>

      <button
        onClick={() => setMobileToolsOpen(true)}
        className="md:hidden absolute left-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 w-14 h-14 rounded-2xl bg-accent text-accent-contrast flex items-center justify-center shadow-2xl"
        aria-label="Add board item"
      >
        <Plus size={24} />
      </button>

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
        minScale={0.2}
        maxScale={3}
        centerOnInit
        limitToBounds={false}
        onTransform={(ref) => onActiveChange?.(ref.state.scale > 1.05)}
        onPanningStart={() => onActiveChange?.(true)}
        doubleClick={{ disabled: true }}
        panning={{ velocityDisabled: true }}
      >
        {({ zoomIn, zoomOut, resetTransform, centerView }) => (
          <>
            <TransformComponent
              wrapperStyle={{ width: '100%', height: '100%' }}
              contentStyle={{ width: `${CANVAS_SIZE}px`, height: `${CANVAS_SIZE}px` }}
            >
              <div
                className="relative w-full h-full overflow-hidden bg-[radial-gradient(circle,rgba(120,120,120,0.22)_1px,transparent_1px)] [background-size:24px_24px]"
                onClick={() => {
                  setSelectedId(null);
                  setLinkingFromId(null);
                  setTempConnectorEnd(null);
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
                  {linkingFromId && tempConnectorEnd && <TempConnectorLine fromId={linkingFromId} toPos={tempConnectorEnd} elements={elements} />}
                </svg>

                {elements.filter(element => element.type !== 'connector').map(element => (
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
                    onStartLink={() => {
                      setLinkingFromId(element.id);
                      setTempConnectorEnd(centerOf(element));
                    }}
                    onHover={() => {
                      if (linkingFromId) setTempConnectorEnd(centerOf(element));
                    }}
                  />
                ))}
              </div>
            </TransformComponent>

            <div className="absolute bottom-24 md:bottom-10 right-3 md:right-10 z-40 flex flex-col gap-2">
              <div className="bg-card/85 backdrop-blur-xl border border-card-border p-1.5 rounded-2xl flex flex-col shadow-2xl">
                <ControlButton onClick={() => zoomIn()} icon={<Plus size={18} />} label="Zoom In" />
                <div className="h-px bg-card-border mx-2" />
                <ControlButton onClick={() => zoomOut()} icon={<Minus size={18} />} label="Zoom Out" />
              </div>
              <div className="bg-card/85 backdrop-blur-xl border border-card-border p-1.5 rounded-2xl flex flex-col shadow-2xl">
                <ControlButton onClick={() => resetTransform()} icon={<RotateCcw size={18} />} label="Reset View" />
                <ControlButton onClick={() => centerView()} icon={<Maximize2 size={18} />} label="Center" />
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
              className="absolute inset-x-0 bottom-0 rounded-t-[2rem] border border-card-border bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-black uppercase tracking-widest text-text-secondary">Add to board</p>
                <button onClick={() => setMobileToolsOpen(false)} className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-text-secondary"><X size={16} /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">{toolGroups}</div>
            </motion.div>
          </motion.div>
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

function ControlButton({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className="min-w-11 min-h-11 p-3 text-text-secondary hover:text-accent hover:bg-accent/5 rounded-xl transition-all" title={label} aria-label={label}>
      {icon}
    </button>
  );
}

function CanvasToolButton({ icon, label, onClick, loading = false }: { icon: React.ReactNode; label: string; onClick: () => void; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="min-w-11 h-11 rounded-xl flex flex-col md:flex-row items-center justify-center gap-1 text-text-secondary hover:text-accent hover:bg-accent/10 transition-all group relative disabled:opacity-50"
      title={label}
      aria-label={label}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : icon}
      <span className="md:hidden text-[8px] font-black uppercase tracking-widest">{label}</span>
      <span className="hidden md:block absolute left-full ml-3 px-2 py-1 rounded-lg bg-text-main text-bg-base text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
        {label}
      </span>
    </button>
  );
}

const CanvasElement: React.FC<{
  element: VisionElement;
  isSelected: boolean;
  isLinking: boolean;
  isLinkingFrom: boolean;
  getScale: () => number;
  onSelect: () => void;
  onUpdate: (updates: Partial<VisionElement>, save?: boolean) => void;
  onDelete: () => void;
  onStartLink: () => void;
  onHover: () => void;
}> = ({ element, isSelected, isLinking, isLinkingFrom, getScale, onSelect, onUpdate, onDelete, onStartLink, onHover }) => {
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  return (
    <motion.div
      drag={!isLinking}
      dragMomentum={false}
      onDragStart={() => {
        setDragStart({ x: element.x, y: element.y });
        onSelect();
      }}
      onDrag={(_, info) => {
        if (!dragStart) return;
        const scale = getScale();
        onUpdate({ x: dragStart.x + info.offset.x / scale, y: dragStart.y + info.offset.y / scale }, false);
      }}
      onDragEnd={(_, info) => {
        const origin = dragStart || { x: element.x, y: element.y };
        const scale = getScale();
        setDragStart(null);
        onUpdate({ x: origin.x + info.offset.x / scale, y: origin.y + info.offset.y / scale }, true);
      }}
      onMouseMove={() => {
        if (isLinking && !isLinkingFrom) onHover();
      }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, x: element.x, y: element.y, zIndex: isSelected ? 120 : (element.zIndex || 1) }}
      className={cn(
        'absolute cursor-grab active:cursor-grabbing touch-none',
        isSelected && !isLinking && 'ring-2 ring-accent ring-offset-4 ring-offset-bg-base/50 rounded-xl',
        isLinking && !isLinkingFrom && 'hover:ring-2 hover:ring-accent/50 hover:ring-offset-2 rounded-xl transition-all'
      )}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      data-no-pan
    >
      <div className="relative group/content">
        {isSelected && !isLinking && <ElementToolbar onDelete={onDelete} />}
        {isLinkingFrom && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent text-accent-contrast rounded-full text-[8px] font-black uppercase tracking-widest">
            Pick target
          </div>
        )}
        <ElementContent element={element} onUpdate={(updates) => onUpdate(updates, true)} />
        {isSelected && ['image', 'shape', 'sticky', 'checklist', 'flowchartNode'].includes(element.type) && (
          <ResizeHandles element={element} getScale={getScale} onUpdate={onUpdate} />
        )}
      </div>
    </motion.div>
  );
};

function ElementToolbar({ onDelete }: { onDelete: () => void }) {
  return (
    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-card border border-card-border rounded-xl shadow-2xl p-1.5 flex items-center gap-1 z-20">
      <button onClick={(event) => { event.stopPropagation(); onDelete(); }} className="p-2 text-danger hover:bg-danger/10 rounded-lg" title="Delete"><Trash2 size={14} /></button>
    </div>
  );
}

function ResizeHandles({ element, getScale, onUpdate }: { element: VisionElement; getScale: () => number; onUpdate: (updates: Partial<VisionElement>, save?: boolean) => void }) {
  const startRef = useRef<{ x: number; y: number; width: number; height: number; left: number; top: number } | null>(null);
  const width = element.width || defaultSize(element.type).width;
  const height = element.height || defaultSize(element.type).height;
  const corners: ResizeCorner[] = ['nw', 'ne', 'sw', 'se'];

  const onPointerDown = (corner: ResizeCorner, event: React.PointerEvent) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    startRef.current = { x: event.clientX, y: event.clientY, width, height, left: element.x, top: element.y };

    const move = (moveEvent: PointerEvent) => {
      if (!startRef.current) return;
      const scale = getScale();
      const dx = (moveEvent.clientX - startRef.current.x) / scale;
      const dy = (moveEvent.clientY - startRef.current.y) / scale;
      const leftEdge = corner.includes('w');
      const topEdge = corner.includes('n');
      const nextWidth = Math.max(64, startRef.current.width + (leftEdge ? -dx : dx));
      const nextHeight = Math.max(48, startRef.current.height + (topEdge ? -dy : dy));
      onUpdate({
        width: nextWidth,
        height: nextHeight,
        x: leftEdge ? startRef.current.left + (startRef.current.width - nextWidth) : startRef.current.left,
        y: topEdge ? startRef.current.top + (startRef.current.height - nextHeight) : startRef.current.top
      }, false);
    };

    const up = () => {
      if (startRef.current) {
        startRef.current = null;
        onUpdate({}, true);
      }
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

const ElementContent: React.FC<{ element: VisionElement; onUpdate: (updates: Partial<VisionElement>) => void }> = ({ element, onUpdate }) => {
  const width = element.width || defaultSize(element.type).width;
  const height = element.height || defaultSize(element.type).height;

  if (element.type === 'text' || element.type === 'heading') {
    return (
      <div
        contentEditable
        suppressContentEditableWarning
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        onBlur={(event) => onUpdate({ content: event.currentTarget.textContent || '' })}
        className={cn('outline-none whitespace-pre-wrap break-words', element.type === 'heading' ? 'font-black tracking-tight' : 'font-bold')}
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
      <textarea
        value={safeString(element.content)}
        onPointerDown={(event) => event.stopPropagation()}
        onChange={(event) => onUpdate({ content: event.target.value })}
        className="resize-none border-none outline-none shadow-2xl p-5 text-base font-bold text-black/80 leading-tight"
        style={{ width, height, backgroundColor: element.metadata?.color || '#fef08a' }}
        data-no-pan
      />
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
    return (
      <div className="bg-card-dark border border-card-border rounded-[2rem] overflow-hidden shadow-2xl p-5 space-y-3" style={{ width }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-accent truncate">{url}</p>
        <input value={safeString(element.metadata?.title, 'Resource')} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => onUpdate({ metadata: { title: event.target.value } })} className="w-full bg-transparent outline-none font-bold text-text-main" data-no-pan />
        <a href={url} target="_blank" rel="noreferrer" onPointerDown={(event) => event.stopPropagation()} className="inline-flex h-10 px-4 rounded-xl bg-accent/10 text-accent text-[10px] font-black uppercase tracking-widest items-center">Open</a>
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
