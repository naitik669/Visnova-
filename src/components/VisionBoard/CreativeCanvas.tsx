import React, { useState, useRef, useEffect } from 'react';
import { TransformWrapper, TransformComponent, useTransformContext } from 'react-zoom-pan-pinch';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Vision, 
  VisionElement 
} from '../../types';
import { cn } from '../../lib/utils';
import { 
  X, 
  Type, 
  Link as LinkIcon, 
  FileText, 
  ExternalLink,
  Quote,
  Square,
  Circle as CircleIcon,
  Diamond,
  ArrowRight,
  Maximize2,
  Trash2,
  MoreVertical
} from 'lucide-react';

interface CreativeCanvasProps {
  vision: Vision;
  updateVision: (id: string, updates: Partial<Vision>) => void;
  onActiveChange?: (active: boolean) => void;
}

const STICKER_GALLERY = [
  { label: 'Rocket', value: '\u{1F680}', color: '#fee2e2' },
  { label: 'Spark', value: '\u2728', color: '#fef3c7' },
  { label: 'Target', value: '\u{1F3AF}', color: '#dbeafe' },
  { label: 'Idea', value: '\u{1F4A1}', color: '#fef9c3' },
  { label: 'Fire', value: '\u{1F525}', color: '#ffedd5' },
  { label: 'Growth', value: '\u{1F331}', color: '#dcfce7' },
  { label: 'Star', value: '\u2B50', color: '#fef3c7' },
  { label: 'Heart', value: '\u{1F49C}', color: '#ede9fe' },
  { label: 'Check', value: '\u2705', color: '#dcfce7' },
  { label: 'Warning', value: '\u26A0\uFE0F', color: '#fef3c7' },
  { label: 'Money', value: '\u{1F4B8}', color: '#dcfce7' },
  { label: 'Mind', value: '\u{1F9E0}', color: '#fce7f3' },
  { label: 'Build', value: '\u{1F6E0}\uFE0F', color: '#e5e7eb' },
  { label: 'Time', value: '\u23F3', color: '#e0f2fe' },
  { label: 'Win', value: '\u{1F3C6}', color: '#fef3c7' },
  { label: 'Flag', value: '\u{1F6A9}', color: '#fee2e2' }
];

export const CreativeCanvas: React.FC<CreativeCanvasProps> = ({ vision, updateVision, onActiveChange }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkingFromId, setLinkingFromId] = useState<string | null>(null);
  const [tempConnectorEnd, setTempConnectorEnd] = useState<{ x: number, y: number } | null>(null);
  const transformWrapperRef = useRef<any>(null);

  const elements = vision.elements || [];

  const addElement = (element: VisionElement) => {
    updateVision(vision.id, { elements: [...elements, element] });
  };

  const addSticker = (sticker: typeof STICKER_GALLERY[number], x = 2500, y = 2500) => {
    addElement({
      id: Math.random().toString(36).substring(7),
      type: 'emoji',
      content: sticker.value,
      x,
      y,
      width: 96,
      height: 96,
      metadata: {
        title: sticker.label,
        color: sticker.color
      }
    });
  };

  const updateElement = (id: string, updates: Partial<VisionElement>) => {
    const newElements = elements.map(el => el.id === id ? { ...el, ...updates } : el);
    updateVision(vision.id, { elements: newElements });
  };

  const deleteElement = (id: string) => {
    // Also delete any connectors associated with this element
    const newElements = elements.filter(el => 
      el.id !== id && 
      el.metadata?.fromElementId !== id && 
      el.metadata?.toElementId !== id
    );
    updateVision(vision.id, { elements: newElements });
    if (selectedId === id) setSelectedId(null);
  };

  const startLinking = (fromId: string) => {
    setLinkingFromId(fromId);
    const fromEl = elements.find(el => el.id === fromId);
    if (fromEl) {
      setTempConnectorEnd({ x: fromEl.x + (fromEl.width || 100) / 2, y: fromEl.y + (fromEl.height || 100) / 2 });
    }
  };

  const finishLinking = (toId: string) => {
    if (!linkingFromId || linkingFromId === toId) {
      setLinkingFromId(null);
      setTempConnectorEnd(null);
      return;
    }

    // Check if link already exists
    const exists = elements.some(el => 
      el.type === 'connector' && 
      el.metadata?.fromElementId === linkingFromId && 
      el.metadata?.toElementId === toId
    );

    if (!exists) {
      const newConnector: VisionElement = {
        id: `conn-${Math.random().toString(36).substring(7)}`,
        type: 'connector',
        content: '',
        x: 0,
        y: 0,
        metadata: {
          fromElementId: linkingFromId,
          toElementId: toId
        }
      };
      updateVision(vision.id, { elements: [...elements, newConnector] });
    }

    setLinkingFromId(null);
    setTempConnectorEnd(null);
  };

  const getCanvasPointFromEvent = (e: React.DragEvent) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    const transformState = transformWrapperRef.current?.instance?.transformState || transformWrapperRef.current?.state;
    const scale = transformState?.scale || 1;
    const positionX = transformState?.positionX || 0;
    const positionY = transformState?.positionY || 0;

    return {
      x: (e.clientX - bounds.left - positionX) / scale,
      y: (e.clientY - bounds.top - positionY) / scale
    };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (linkingFromId && tempConnectorEnd) {
      // We need to account for zooming and panning if we want accuracy, 
      // but for now let's just track the mouse relative to the transform content if possible
      // Simplification: We'll update it when hovering over another element
    }
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropPoint = getCanvasPointFromEvent(e);
    const stickerPayload = e.dataTransfer.getData('application/x-visnova-sticker');
    if (stickerPayload) {
      try {
        addSticker(JSON.parse(stickerPayload), dropPoint.x - 48, dropPoint.y - 48);
        return;
      } catch (error) {
        console.warn('Sticker payload could not be read:', error);
      }
    }

    const file = Array.from(e.dataTransfer.files || []).find(item => item.type.startsWith('image/'));
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      addElement({
        id: Math.random().toString(36).substring(7),
        type: 'image',
        content: result,
        x: dropPoint.x - 160,
        y: dropPoint.y - 120,
        metadata: { title: file.name }
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div 
      className="flex-1 relative overflow-hidden bg-bg-base/20 group/canvas select-none"
      onMouseMove={handleCanvasMouseMove}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleCanvasDrop}
    >
      <TransformWrapper
        ref={transformWrapperRef}
        initialScale={1}
        minScale={0.1}
        maxScale={4}
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
              contentStyle={{ width: '5000px', height: '5000px' }}
            >
              <div 
                className="relative w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:40px_40px] opacity-20"
                onClick={() => {
                  setSelectedId(null);
                  setLinkingFromId(null);
                  setTempConnectorEnd(null);
                }}
              />
              
              <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible z-0">
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orientation="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" className="text-accent" />
                  </marker>
                </defs>
                {elements.filter(el => el.type === 'connector').map(connector => (
                  <ConnectorLine 
                    key={connector.id}
                    connector={connector}
                    elements={elements}
                    onDelete={() => deleteElement(connector.id)}
                  />
                ))}
                {linkingFromId && tempConnectorEnd && (
                   <TempConnectorLine fromId={linkingFromId} toPos={tempConnectorEnd} elements={elements} />
                )}
              </svg>

              {elements.filter(el => el.type !== 'connector').map((element) => (
                <CanvasElement
                  key={element.id}
                  element={element}
                  isSelected={selectedId === element.id}
                  isLinking={linkingFromId !== null}
                  isLinkingFrom={linkingFromId === element.id}
                  onSelect={() => {
                    if (linkingFromId) {
                      finishLinking(element.id);
                    } else {
                      setSelectedId(element.id);
                    }
                  }}
                  onUpdate={(updates) => updateElement(element.id, updates)}
                  onDelete={() => deleteElement(element.id)}
                  onStartLink={() => startLinking(element.id)}
                  onHover={(x, y) => {
                    if (linkingFromId) setTempConnectorEnd({ x, y });
                  }}
                />
              ))}
            </TransformComponent>

            {/* Floating Navigation Controls */}
            <div className="absolute bottom-10 right-10 z-40 flex flex-col gap-2">
              <div className="bg-card/80 backdrop-blur-xl border border-card-border p-1.5 rounded-2xl flex flex-col shadow-2xl">
                <ControlButton onClick={() => zoomIn()} icon={<Plus size={18} />} label="Zoom In" />
                <div className="h-px bg-card-border mx-2" />
                <ControlButton onClick={() => zoomOut()} icon={<Minus size={18} />} label="Zoom Out" />
              </div>
              <div className="bg-card/80 backdrop-blur-xl border border-card-border p-1.5 rounded-2xl flex flex-col shadow-2xl">
                <ControlButton onClick={() => resetTransform()} icon={<Maximize2 size={18} />} label="Reset View" />
                <ControlButton onClick={() => centerView()} icon={<Target size={18} />} label="Center" />
              </div>
            </div>
            <div className="absolute left-6 top-6 z-40 w-72 bg-card/90 backdrop-blur-xl border border-card-border rounded-2xl shadow-2xl p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-accent">Graphics Library</p>
                  <h3 className="text-sm font-black text-text-main uppercase tracking-tight">Stickers</h3>
                </div>
                <span className="text-[9px] font-bold text-text-secondary/40 uppercase tracking-widest">Drag or click</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {STICKER_GALLERY.map(sticker => (
                  <button
                    key={sticker.label}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('application/x-visnova-sticker', JSON.stringify(sticker));
                      event.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => addSticker(sticker)}
                    className="aspect-square rounded-xl border border-card-border bg-surface-muted hover:border-accent hover:bg-accent/5 transition-all text-2xl flex items-center justify-center shadow-sm active:scale-95"
                    title={sticker.label}
                  >
                    {sticker.value}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </TransformWrapper>
    </div>
  );
};

// --- Subcomponents ---

function ControlButton({ onClick, icon, label }: { onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className="p-3 text-text-secondary hover:text-accent hover:bg-accent/5 rounded-xl transition-all"
      title={label}
    >
      {icon}
    </button>
  );
}

const CanvasElement: React.FC<{
  element: VisionElement;
  isSelected: boolean;
  isLinking: boolean;
  isLinkingFrom: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<VisionElement>) => void;
  onDelete: () => void;
  onStartLink: () => void;
  onHover: (x: number, y: number) => void;
}> = ({ element, isSelected, isLinking, isLinkingFrom, onSelect, onUpdate, onDelete, onStartLink, onHover }) => {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <motion.div
      drag={!isLinking}
      dragMomentum={false}
      onDragStart={() => {
        setIsDragging(true);
        onSelect();
      }}
      onDragEnd={(_, info) => {
        setIsDragging(false);
        onUpdate({ x: element.x + info.offset.x, y: element.y + info.offset.y });
      }}
      onMouseMove={() => {
        if (isLinking && !isLinkingFrom) {
          onHover(element.x + (element.width || 100) / 2, element.y + (element.height || 100) / 2);
        }
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: 1,
        scale: 1,
        x: element.x,
        y: element.y,
        zIndex: isSelected ? 100 : (element.zIndex || 1),
      }}
      className={cn(
        "absolute cursor-grab active:cursor-grabbing",
        isSelected && !isLinking && "ring-2 ring-accent ring-offset-4 ring-offset-bg-base/50 rounded-xl",
        isLinking && !isLinkingFrom && "hover:ring-2 hover:ring-accent/50 hover:ring-offset-2 rounded-xl transition-all"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <div className="relative group/content">
        {isSelected && !isLinking && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-card border border-card-border rounded-xl shadow-2xl p-1.5 flex items-center gap-1 animate-in fade-in zoom-in slide-in-from-bottom-2">
            <button onClick={onDelete} className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-all" title="Delete"><Trash2 size={14} /></button>
            <div className="w-px h-4 bg-card-border mx-1" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                const next = window.prompt('Edit content', element.content);
                if (next !== null) onUpdate({ content: next });
              }}
              className="p-2 text-text-secondary hover:bg-surface-muted rounded-lg transition-all"
              title="Edit Text"
            >
              <Type size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const current = element.metadata?.color || '#fef08a';
                const next = window.prompt('Color hex', current);
                if (next) onUpdate({ metadata: { ...(element.metadata || {}), color: next } });
              }}
              className="p-2 text-text-secondary hover:bg-surface-muted rounded-lg transition-all"
              title="Color"
            >
              <CircleIcon size={14} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onStartLink();
              }} 
              className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-all" 
              title="Draw Connector"
            >
              <LinkIcon size={14} />
            </button>
            <div className="w-px h-4 bg-card-border mx-1" />
            <button className="p-2 text-text-secondary hover:bg-surface-muted rounded-lg transition-all"><MoreVertical size={14} /></button>
          </div>
        )}

        {isLinkingFrom && (
           <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent text-accent-contrast rounded-full text-[8px] font-black uppercase tracking-widest animate-bounce">
              Pick target
           </div>
        )}

        <ElementContent element={element} />
      </div>
    </motion.div>
  );
};

function ConnectorLine({ connector, elements, onDelete }: { connector: VisionElement, elements: VisionElement[], onDelete: () => void }) {
  const fromEl = elements.find(el => el.id === connector.metadata?.fromElementId);
  const toEl = elements.find(el => el.id === connector.metadata?.toElementId);

  if (!fromEl || !toEl) return null;

  // Simplified center point calculations
  const x1 = fromEl.x + (fromEl.width || 120) / 2;
  const y1 = fromEl.y + (fromEl.height || 120) / 2;
  const x2 = toEl.x + (toEl.width || 120) / 2;
  const y2 = toEl.y + (toEl.height || 120) / 2;

  // Smooth curve calculation
  const dx = Math.abs(x1 - x2);
  const dy = Math.abs(y1 - y2);
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  return (
    <g className="group/line">
      <path
        d={`M ${x1} ${y1} Q ${x1} ${y2} ${x2} ${y2}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="8 8"
        className="text-accent/30 transition-all group-hover/line:text-accent group-hover/line:stroke-[4]"
        markerEnd="url(#arrowhead)"
      />
      
      {/* Invisible thicker path for easier interaction */}
      <path
        d={`M ${x1} ${y1} Q ${x1} ${y2} ${x2} ${y2}`}
        fill="none"
        stroke="transparent"
        strokeWidth="20"
        className="pointer-events-auto cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      />

      <foreignObject x={midX - 12} y={midY - 12} width="24" height="24" className="opacity-0 group-hover/line:opacity-100 transition-opacity">
        <button 
          onClick={onDelete}
          className="w-6 h-6 rounded-full bg-danger text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all pointer-events-auto"
        >
          <X size={12} />
        </button>
      </foreignObject>
    </g>
  );
}

function TempConnectorLine({ fromId, toPos, elements }: { fromId: string, toPos: { x: number, y: number }, elements: VisionElement[] }) {
  const fromEl = elements.find(el => el.id === fromId);
  if (!fromEl) return null;

  const x1 = fromEl.x + (fromEl.width || 120) / 2;
  const y1 = fromEl.y + (fromEl.height || 120) / 2;

  return (
    <path
      d={`M ${x1} ${y1} L ${toPos.x} ${toPos.y}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeDasharray="4 4"
      className="text-accent animate-pulse"
    />
  );
}

const ElementContent: React.FC<{ element: VisionElement }> = ({ element }) => {
  switch (element.type) {
    case 'sticky':
      return (
        <div 
          className="p-6 w-64 h-64 shadow-2xl flex flex-col justify-between"
          style={{ backgroundColor: element.metadata?.color || '#fef08a' }}
        >
          <p className="text-lg font-bold text-black/80 font-serif leading-tight">{element.content}</p>
          <div className="flex justify-between items-center opacity-40">
             <Quote size={18} className="text-black" />
             <span className="text-[10px] font-black uppercase tracking-widest text-black">Note</span>
          </div>
        </div>
      );
    case 'emoji':
      return (
        <div
          className="w-24 h-24 rounded-3xl border border-card-border shadow-2xl flex items-center justify-center text-5xl bg-card"
          style={{ backgroundColor: element.metadata?.color || '#fff' }}
          title={element.metadata?.title || 'Sticker'}
        >
          {element.content}
        </div>
      );
    case 'image':
      return (
        <div className="max-w-md bg-card rounded-2xl overflow-hidden shadow-2xl border border-card-border">
          <img src={element.content} className="w-full h-auto object-cover max-h-[500px]" alt="Board asset" />
          {element.metadata?.title && (
            <div className="p-4 border-t border-card-border bg-card/80">
              <p className="text-xs font-bold text-text-main">{element.metadata.title}</p>
            </div>
          )}
        </div>
      );
    case 'text':
    case 'heading':
      return (
        <div className={cn(
          "max-w-xl",
          element.type === 'heading' ? "text-5xl font-black tracking-tighter" : "text-xl font-bold tracking-tight"
        )}
        style={{
          color: element.metadata?.color || (element.type === 'heading' ? 'var(--text-main)' : 'var(--text-secondary)'),
          fontFamily: element.metadata?.fontFamily,
          fontSize: element.metadata?.fontSize
        }}>
          {element.content}
        </div>
      );
    case 'quote':
      return (
        <div className="p-10 bg-card border-l-4 border-accent rounded-r-[2.5rem] shadow-2xl max-w-lg space-y-6">
          <Quote size={40} className="text-accent opacity-20" />
          <p className="text-2xl font-black text-text-main leading-tight tracking-tight ">"{element.content}"</p>
          {element.metadata?.author && (
            <p className="text-sm font-bold text-accent uppercase tracking-widest">— {element.metadata.author}</p>
          )}
        </div>
      );
    case 'link':
      return (
        <div className="w-80 bg-card-dark border border-card-border rounded-[2rem] overflow-hidden shadow-2xl group/link">
          <div className="aspect-video bg-bg-base flex items-center justify-center overflow-hidden">
             {element.metadata?.favicon ? (
               <img src={element.metadata.favicon} className="w-full h-full object-cover opacity-80" alt="" />
             ) : (
               <LinkIcon size={40} className="text-text-secondary/20" />
             )}
          </div>
          <div className="p-6 space-y-3">
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">{new URL(element.metadata?.url || element.content).hostname}</span>
             </div>
             <h4 className="font-bold text-text-main line-clamp-2 leading-tight">{element.metadata?.title || element.content}</h4>
             <p className="text-xs text-text-secondary line-clamp-2">{element.metadata?.description}</p>
             <a href={element.metadata?.url || element.content} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full h-10 mt-2 rounded-xl bg-accent/10 text-accent text-[9px] font-black uppercase tracking-widest hover:bg-accent hover:text-accent-contrast transition-all">
                Open Resource <ExternalLink size={12} />
             </a>
          </div>
        </div>
      );
    case 'shape':
      const ShapeIcon = element.metadata?.shapeType === 'circle' ? CircleIcon : 
                       element.metadata?.shapeType === 'diamond' ? Diamond : Square;
      return (
        <div 
          className="flex items-center justify-center border-4 border-accent bg-accent/5"
          style={{ 
            width: element.width || 120, 
            height: element.height || 120,
            backgroundColor: element.metadata?.color ? `${element.metadata.color}22` : undefined,
            borderColor: element.metadata?.color || undefined,
            borderRadius: element.metadata?.shapeType === 'circle' ? '50%' : '12px',
            transform: element.metadata?.shapeType === 'diamond' ? 'rotate(45deg)' : undefined
          }}
        >
          <div style={{ transform: element.metadata?.shapeType === 'diamond' ? 'rotate(-45deg)' : undefined }}>
            <p className="text-center font-bold text-text-main px-4">{element.content}</p>
          </div>
        </div>
      );
    case 'note':
      return (
        <div className="w-72 bg-card p-6 rounded-3xl border border-card-border shadow-2xl relative">
          <div className="flex items-center justify-between mb-4">
             <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                <FileText size={16} />
             </div>
             <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary opacity-40">Tactical Note</span>
          </div>
          <h4 className="font-bold text-text-main mb-3">{element.metadata?.title}</h4>
          <div className="space-y-2 opacity-60">
             <div className="h-2 w-full bg-card-border rounded-full" />
             <div className="h-2 w-3/4 bg-card-border rounded-full" />
             <div className="h-2 w-1/2 bg-card-border rounded-full" />
          </div>
        </div>
      );
    default:
      return <div className="p-4 bg-accent text-accent-contrast rounded-xl">{element.content}</div>;
  }
};

const Plus = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
);
const Minus = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>
);
const Target = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
);
