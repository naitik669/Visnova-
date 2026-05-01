import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import {
  Folder,
  FolderOpen,
  Plus,
  ChevronRight,
  ChevronDown,
  FileText,
  Search,
  BarChart,
  Cloud,
  Image as ImageIcon,
  Music,
  Play,
  Trash2,
  Layout,
  Grid,
  Maximize2,
  X,
  Sparkles,
  Zap,
  Loader2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

export default function NotesSystem() {
  const { notes, folders, addNote, addFolder, updateNote, user } = useStore();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'trash'>('all');
  const [viewMode, setViewMode] = useState<'stream' | 'gallery'>('stream');

  const currentNotes = selectedFolder
    ? notes.filter(n => n.folderId === selectedFolder)
    : notes;

  const activeNote = selectedNote ? notes.find(n => n.id === selectedNote) : null;

  return (
    <div className="flex bg-card rounded-3xl h-[calc(100vh-7rem)] shadow-2xl overflow-hidden border border-card-border animate-in fade-in zoom-in-95 duration-500">
      {/* Side Panel: Dynamic Accent Category */}
      <div className="w-72 bg-bg-base border-r border-card-border p-8 flex flex-col gap-8">
        <div className="flex items-center gap-4 border-b border-card-border pb-6">
          <div className="relative group cursor-pointer">
             <div className="absolute inset-0 bg-accent blur-md opacity-0 group-hover:opacity-20 transition-opacity" />
             <img
               src={user?.avatar || undefined}
               className="w-10 h-10 rounded-xl object-cover border border-card-border relative z-10"
               alt="User"
             />
          </div>
          <div className="space-y-0.5 min-w-0">
            <h3 className="text-text-main font-bold tracking-tight truncate text-sm">{user?.name}</h3>
            <p className="text-text-secondary text-[9px] font-semibold uppercase tracking-wider">Goal Sync Active</p>
          </div>
        </div>

        <div className="space-y-1.5 overflow-y-auto custom-scrollbar pr-2 h-full">
           <h4 className="text-text-secondary opacity-40 text-[10px] font-semibold uppercase tracking-wider mb-4">Vision Assets</h4>
           <CategoryItem icon={<Layout size={16} />} label="Visions" count="24" progress={80} active />
           <CategoryItem icon={<FileText size={16} />} label="Documents" count="12" progress={45} />
           <CategoryItem icon={<ImageIcon size={16} />} label="Reference" count="124" progress={65} />
           <CategoryItem icon={<Cloud size={16} />} label="Cloud Sync" count="2.4K" progress={92} />
           <CategoryItem icon={<Trash2 size={16} />} label="Trash" count="12" progress={0} />
        </div>

        <div className="mt-auto pt-6 border-t border-card-border">
           <button className="flex items-center gap-4 text-text-secondary hover:text-text-main transition-all group w-full">
              <div className="w-9 h-9 rounded-xl bg-accent/5 flex items-center justify-center group-hover:bg-accent group-hover:text-accent-contrast transition-all shadow-sm active:scale-90">
                <Plus size={16} />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider">New Insight</span>
           </button>
        </div>
      </div>


      {/* Main Panel: Fluid Workspace */}
      <div className="flex-1 flex flex-col bg-bg-base relative overflow-hidden">
        {selectedNote ? (
          <NoteEditor
            note={activeNote!}
            onClose={() => setSelectedNote(null)}
            updateNote={updateNote}
          />
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <div className="p-8 lg:p-12 space-y-12">
              {/* Storage Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-full border border-card-border flex items-center justify-center relative bg-card shadow-sm shrink-0">
                        <span className="text-[10px] font-bold text-text-main">80%</span>
                        <svg className="absolute inset-0 w-full h-full -rotate-90 p-1">
                           <circle cx="22" cy="22" r="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent/20" />
                           <circle cx="22" cy="22" r="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent" strokeDasharray={126} strokeDashoffset={126 * 0.2} strokeLinecap="round" />
                        </svg>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                       <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary/40" />
                       <input
                         placeholder="Search Knowledge..."
                         className="h-10 pl-10 pr-4 rounded-xl bg-card border border-card-border text-[11px] font-medium text-text-main focus:outline-none focus:border-accent/40 w-48 transition-all"
                       />
                    </div>
                    <button
                     onClick={() => addNote({ title: 'New Insight ' + format(new Date(), 'MM.dd'), content: '', folderId: selectedFolder, tags: [] })}
                     className="xp-button !h-10 !px-5"
                    >
                       + Entry
                    </button>
                </div>
              </div>

              {/* Folder Grid */}
              <section className="space-y-6">
                 <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary opacity-40">Key Sectors</h4>
                 </div>
                 <div className="flex flex-wrap gap-4">
                    {folders.map(folder => (
                      <FolderCard
                        key={folder.id}
                        folder={folder}
                        onClick={() => setSelectedFolder(folder.id === selectedFolder ? null : folder.id)}
                        isActive={selectedFolder === folder.id}
                      />
                    ))}
                 </div>
              </section>

              {/* Memories Grid */}
              <section className="space-y-6">
                 <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary opacity-40">Milestones</h4>
                    <div className="flex items-center gap-4 text-[10px] font-semibold text-text-secondary">
                       <button onClick={() => setViewMode('gallery')} className={cn("flex items-center gap-1.5 transition-all cursor-pointer", viewMode === 'gallery' ? "text-accent opacity-100" : "opacity-40 hover:opacity-100")}><Grid size={12} /> Gallery</button>
                       <button onClick={() => setViewMode('stream')} className={cn("flex items-center gap-1.5 transition-all cursor-pointer", viewMode === 'stream' ? "text-accent opacity-100" : "opacity-40 hover:opacity-100")}><Layout size={12} /> Stream</button>
                    </div>
                 </div>
                 {viewMode === 'gallery' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[150px]">
                       <div className="rounded-3xl overflow-hidden relative group row-span-2">
                          <img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=400&h=600" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Idea" />
                          <div className="absolute inset-0 bg-gradient-to-t from-overlay to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                             <span className="text-accent-contrast text-xs font-bold">Workspace Inspiration</span>
                          </div>
                       </div>
                       <div className="rounded-3xl overflow-hidden relative group row-span-1 border border-card-border">
                          <div className="w-full h-full flex flex-col items-center justify-center bg-card hover:bg-surface-muted transition-colors cursor-pointer text-text-secondary">
                             <Plus size={24} className="mb-2" />
                             <span className="text-[10px] font-bold uppercase tracking-wider">Upload Reference</span>
                          </div>
                       </div>
                       <div className="rounded-3xl overflow-hidden relative group row-span-2">
                          <img src="https://images.unsplash.com/photo-1542435503-956c469947f6?auto=format&fit=crop&q=80&w=400&h=600" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Journal" />
                          <div className="absolute inset-0 bg-gradient-to-t from-overlay to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                             <span className="text-accent-contrast text-xs font-bold">Daily Logs</span>
                          </div>
                       </div>
                       <div className="rounded-3xl overflow-hidden relative group row-span-1">
                          <img src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=400&h=400" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Setup" />
                       </div>
                       <div className="rounded-3xl overflow-hidden relative group row-span-1">
                          <img src="https://images.unsplash.com/photo-1621075160523-b936ad96132a?auto=format&fit=crop&q=80&w=400&h=400" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Growth" />
                       </div>
                    </div>
                 ) : (
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {currentNotes.map(n => (
                        <NoteCard key={n.id} note={n} onClick={() => setSelectedNote(n.id)} />
                      ))}
                   </div>
                 )}
                 {currentNotes.length === 0 && (
                   <div className="h-40 flex flex-col items-center justify-center border border-dashed border-card-border rounded-[2rem] text-text-secondary/30 font-black uppercase text-[10px] tracking-[0.2em]">
                      <Cloud size={32} className="mb-4 opacity-10" />
                      Zero State Reached
                   </div>
                 )}
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryItem({ icon, label, count, progress, active }: any) {
  return (
    <div className={cn(
      "w-full flex items-center justify-between p-3 rounded-xl transition-all group cursor-pointer",
      active ? "bg-accent/5 text-accent shadow-sm" : "hover:bg-surface-muted text-text-secondary"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn("shrink-0", active ? "text-accent" : "opacity-40 group-hover:opacity-100 transition-opacity")}>
          {icon}
        </div>
        <span className={cn("text-[11px] font-semibold uppercase tracking-wider", active ? "opacity-100" : "opacity-60")}>{label}</span>
      </div>
      <span className="text-[10px] font-mono opacity-30">{count}</span>
    </div>
  );
}

function FolderCard({ folder, onClick, isActive }: any) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-5 rounded-2xl border transition-all cursor-pointer group min-w-[130px] flex flex-col items-center justify-center gap-3 text-center",
        isActive ? "bg-accent border-accent shadow-lg" : "bg-card border-card-border hover:border-accent/20"
      )}
    >
      <div className={cn(
        "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-500",
        isActive ? "bg-accent-contrast/20 text-accent-contrast" : "bg-accent/5 text-accent group-hover:scale-105"
      )}>
        <Folder size={28} strokeWidth={isActive ? 2 : 1.5} />
      </div>
      <div className="space-y-0.5">
        <h3 className={cn("font-semibold tracking-tight uppercase text-[10px]", isActive ? "text-accent-contrast" : "text-text-main")}>{folder.name}</h3>
        <p className={cn("text-[8px] font-bold uppercase tracking-wider opacity-60", isActive ? "text-accent-contrast" : "text-text-secondary")}>12 Units</p>
      </div>
    </div>
  );
}

function NoteCard({ note, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className="p-5 rounded-3xl bg-card border border-card-border hover:border-accent/40 hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
        <FileText size={48} strokeWidth={1} />
      </div>
      <div className="flex items-center justify-between mb-5 relative z-10">
         <div className="w-8 h-8 rounded-lg bg-bg-base border border-card-border flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-accent-contrast transition-all">
            <FileText size={14} />
         </div>
         <span className="text-[9px] font-semibold text-text-secondary/60 uppercase tracking-widest">{format(new Date(note.updatedAt), 'MMM dd')}</span>
      </div>
      <h3 className="text-sm font-semibold text-text-main leading-tight mb-2 tracking-tight group-hover:text-accent transition-colors">{note.title}</h3>
      <p className="text-[11px] text-text-secondary/80 line-clamp-2 leading-relaxed font-medium">
        {note.content || "Entry pending strategic analysis..."}
      </p>
    </div>
  );
}

function NoteEditor({ note, onClose, updateNote }: any) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [note.content]);

  const handleAIAnalysis = async () => {
    if (!note.content || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Please summarize the following note content in a concise, technical manner suitable for an "Architect" dashboard. Use bullet points for key takeaways.\n\nContent: ${note.content}`,
        config: {
          systemInstruction: "You are the Visnova Analysis Engine. Your goal is to synthesize user thoughts into actionable insights.",
        }
      });

      const summary = response.text || "Analysis failed.";
      updateNote(note.id, { content: note.content + "\n\n--- AI SYNTHESIS ---\n" + summary });
    } catch (error) {
      console.error("AI Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-1 flex flex-col bg-bg-base overflow-hidden"
    >
      <div className="h-20 px-8 flex items-center justify-between border-b border-card-border bg-card shadow-sm">
        <div className="flex items-center gap-4">
           <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-accent-contrast shadow-lg shadow-accent/10">
              <FileText size={18} />
           </div>
           <div className="space-y-0.5">
             <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Strategy Engine</span>
             <p className="text-[9px] font-semibold text-text-secondary/60 uppercase tracking-widest leading-none">Vision Sync Active</p>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <button
            onClick={handleAIAnalysis}
            disabled={isAnalyzing}
            className="h-10 px-6 rounded-xl bg-accent text-accent-contrast flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider shadow-lg shadow-accent/10 active:scale-95 transition-all disabled:opacity-50"
           >
              {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              AI Synthesis
           </button>
           <button onClick={onClose} className="w-9 h-9 rounded-lg bg-accent/5 border border-card-border flex items-center justify-center text-text-main hover:bg-accent hover:text-accent-contrast hover:border-accent transition-all active:scale-90"><X size={18} /></button>
        </div>
      </div>


      <div className="flex-1 overflow-y-auto custom-scrollbar p-10 lg:p-20 bg-bg-base">
        <div className="max-w-4xl mx-auto space-y-12 pb-32">
          <input
            value={note.title}
            onChange={e => updateNote(note.id, { title: e.target.value })}
            className="w-full text-3xl lg:text-5xl font-bold text-text-main bg-transparent border-none focus:outline-none placeholder:text-text-main/10 tracking-tight"
            placeholder="Anchor Title"
          />
          <textarea
            ref={textareaRef}
            value={note.content}
            onChange={e => updateNote(note.id, { content: e.target.value })}
            className="w-full text-lg lg:text-xl text-text-secondary bg-transparent border-none focus:outline-none resize-none placeholder:text-text-main/5 leading-relaxed font-medium min-h-[400px]"
            placeholder="Stream of consciousness..."
          />

          <div className="flex flex-wrap gap-2 pt-12 border-t border-card-border">
             <button className="px-4 h-9 rounded-xl border border-card-border flex items-center gap-2 text-[10px] font-semibold text-text-secondary uppercase tracking-wider hover:border-accent hover:text-accent transition-colors">
                <Plus size={12} /> Add Tag
             </button>
             {note.tags.map((t: string, i: number) => (
                <div key={`${t}-${i}`} className="px-4 h-9 rounded-xl bg-accent/5 border border-accent/20 flex items-center gap-2 text-[10px] font-semibold text-accent uppercase tracking-wider">
                   # {t}
                </div>
             ))}
          </div>

        </div>
      </div>
    </motion.div>
  );
}
