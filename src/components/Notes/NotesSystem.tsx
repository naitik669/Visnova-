import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import {
  Folder,
  Plus,
  ChevronRight,
  ChevronDown,
  FileText,
  Search,
  Trash2,
  Layout,
  Grid,
  X,
  Sparkles,
  Loader2,
  BookOpen,
  Star,
  Clock,
  Tag,
  Calendar,
  Pin,
  Smile,
  Hash,
  Archive,
  MoreVertical,
  Home,
  Sidebar as SidebarIcon,
  MapPin,
  Cloud,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Mic,
  StopCircle,
  Upload,
  Volume2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { format, isToday, isYesterday, isThisWeek, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval, isBefore, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Note, Folder as FolderType } from '../../types';
import { uploadAudioNote } from '../../lib/supabase';

export default function NotesSystem() {
  const { notes, folders, addNote, updateNote, deleteNote, addFolder, fetchFolders, fetchNotes, user } = useStore();
  const location = useLocation();
  const initialTab = location.pathname.includes('journal') ? 'journal' : 'library';
  const [activeTab, setActiveTab] = useState<'library' | 'journal'>(initialTab);
  const [isJournalFullView, setIsJournalFullView] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);

  useEffect(() => {
    fetchFolders();
    fetchNotes();
  }, []);

  useEffect(() => {
    setActiveTab(location.pathname.includes('journal') ? 'journal' : 'library');
  }, [location.pathname]);

  const [sidebarFilter, setSidebarFilter] = useState<'all' | 'recent' | 'favorites' | 'trash'>('all');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLibrarySidebarHovered, setIsLibrarySidebarHovered] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'all'>('all');
  const activeNoteType = activeTab === 'library' ? 'vault' : 'journal';

  const journalEntry = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return notes.find(n => 
      !n.isDeleted && 
      n.note_type === 'journal' && 
      (n.journal_date === dateStr || (n.journal_date === undefined && isSameDay(n.createdAt, selectedDate)))
    );
  }, [notes, selectedDate]);

  const streak = useMemo(() => {
    const journalNotes = notes.filter(n => n.note_type === 'journal' && !n.isDeleted && n.content.trim());
    if (journalNotes.length === 0) return 0;
    
    const entryDates = new Set(journalNotes.map(n => n.journal_date || format(n.createdAt, 'yyyy-MM-dd')));
    let count = 0;
    let curr = new Date();
    
    if (!entryDates.has(format(curr, 'yyyy-MM-dd'))) {
      curr = new Date(Date.now() - 86400000);
    }
    
    while (entryDates.has(format(curr, 'yyyy-MM-dd'))) {
      count++;
      curr = new Date(curr.getTime() - 86400000);
    }
    return count;
  }, [notes]);

  const handleNewFolder = async (folder: { name: string; color?: string }) => {
    const trimmedName = folder.name.trim();
    const isDuplicate = folders.some(f => f.name.toLowerCase() === trimmedName.toLowerCase());
    if (!trimmedName || isDuplicate) return false;

    addFolder({ name: trimmedName, color: folder.color });
    setIsFolderModalOpen(false);
    return true;
  };

  const filteredNotes = useMemo(() => {
    let result = notes;

    // Handle Trash filter separately as it ignores note_type/folders
    if (sidebarFilter === 'trash') {
      result = result.filter(n => n.isDeleted);
    } else {
      // Exclude deleted notes from normal views
      result = result.filter(n => !n.isDeleted && (n.note_type === activeNoteType || (activeTab === 'library' && n.note_type === 'library')));

      // Apply sidebar filters
      if (sidebarFilter === 'recent') {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        result = result.filter(n => n.updatedAt > oneWeekAgo);
      } else if (sidebarFilter === 'favorites') {
        result = result.filter(n => n.isFavorite);
      }

      // Library specific folder filter
      if (activeTab === 'library' && selectedFolder) {
        result = result.filter(n => n.folderId === selectedFolder);
      }

      if (timeFilter === 'today') {
        result = result.filter(n => isToday(n.updatedAt));
      } else if (timeFilter === 'week') {
        result = result.filter(n => isThisWeek(n.updatedAt));
      }
    }

    // Search (applies to both trash and normal views)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => 
        n.title.toLowerCase().includes(q) || 
        n.content.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [notes, activeTab, sidebarFilter, searchQuery, selectedFolder, timeFilter]);

  const filteredFolders = useMemo(() => {
    if (timeFilter === 'all') return folders;
    return folders.filter(folder => {
      const folderNotes = notes.filter(n => n.folderId === folder.id && !n.isDeleted && (n.note_type === 'vault' || n.note_type === 'library'));
      return folderNotes.some(note => timeFilter === 'today' ? isToday(note.updatedAt) : isThisWeek(note.updatedAt));
    });
  }, [folders, notes, timeFilter]);

  const selectedNote = useMemo(() => 
    notes.find(n => n.id === selectedNoteId), 
    [notes, selectedNoteId]
  );

  const handleCreateNote = (type: 'library' | 'journal') => {
    const defaultTitle = type === 'journal' 
      ? `Entry ${format(new Date(), 'MMM dd, yyyy')}`
      : 'Untitled Note';
    
    addNote({
      title: defaultTitle,
      content: '',
      note_type: type === 'library' ? 'vault' : 'journal',
      folderId: type === 'library' ? selectedFolder : null,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  };

  return (
    <div className={cn(
      "flex bg-[#fcfcfc] transition-all duration-700 font-sans relative overflow-hidden",
      isJournalFullView ? "h-screen fixed inset-0 z-[100]" : "h-full min-h-[calc(100vh-3rem)]"
    )}>
      {/* 1. Left Support Sidebar - Hidden with animation on Journal or Full View */}
      <AnimatePresence>
        {!isJournalFullView && activeTab !== 'journal' && (
          <motion.aside 
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1, width: isLibrarySidebarHovered ? 256 : 72 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            onMouseEnter={() => setIsLibrarySidebarHovered(true)}
            onMouseLeave={() => setIsLibrarySidebarHovered(false)}
            className="flex flex-col border-r border-card-border/50 bg-white shrink-0 overflow-hidden"
          >
            <div className={cn(
              "flex flex-col h-full transition-all duration-300",
              isLibrarySidebarHovered ? "p-6 md:p-8 gap-10" : "px-2 py-6 gap-8"
            )}>
              {/* Add New Section like in image */}
              <div className={cn(isLibrarySidebarHovered ? "block" : "hidden")}>
                <button 
                  onClick={() => handleCreateNote(activeTab)}
                  className="w-full h-12 flex items-center justify-center gap-3 bg-accent text-white rounded-2xl font-bold text-xs shadow-xl shadow-accent/10 hover:scale-[1.02] transition-all"
                >
                  <Plus size={16} />
                  Add new
                </button>
              </div>

              <nav className="flex-1 w-full space-y-6">
                <div className="space-y-1">
                  <SidebarIconBtn 
                    key="btn-all"
                    icon={<Layout size={18} />} 
                    active={sidebarFilter === 'all'} 
                    onClick={() => { setSidebarFilter('all'); setSelectedFolder(null); }} 
                    label="All Notes"
                    expanded={isLibrarySidebarHovered}
                  />
                  <SidebarIconBtn 
                    key="btn-favorites"
                    icon={<Star size={18} />} 
                    active={sidebarFilter === 'favorites'} 
                    onClick={() => setSidebarFilter('favorites')} 
                    label="Favorites"
                    expanded={isLibrarySidebarHovered}
                  />
                  <SidebarIconBtn 
                    key="btn-recent"
                    icon={<Clock size={18} />} 
                    active={sidebarFilter === 'recent'} 
                    onClick={() => setSidebarFilter('recent')} 
                    label="Recent"
                    expanded={isLibrarySidebarHovered}
                  />
                  <SidebarIconBtn 
                    key="btn-trash"
                    icon={<Trash2 size={18} />} 
                    active={sidebarFilter === 'trash'} 
                    onClick={() => setSidebarFilter('trash')} 
                    label="Trash"
                    expanded={isLibrarySidebarHovered}
                  />
                </div>
                
                <div className={cn("pt-6 border-t border-card-border/30", isLibrarySidebarHovered ? "block" : "hidden")}>
                  <div className="flex items-center justify-between ml-4 mb-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-40">Folders</p>
                    <button 
                      onClick={() => setIsFolderModalOpen(true)}
                      className="p-1 hover:bg-surface-muted rounded-md text-text-secondary/40 hover:text-accent transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="space-y-1 px-1">
                    {folders.slice(0, 5).map(f => (
                      <button 
                        key={f.id} 
                        onClick={() => {
                          setActiveTab('library');
                          setSelectedFolder(f.id);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[11px] font-bold transition-all",
                          selectedFolder === f.id ? "bg-accent/5 text-accent" : "text-text-secondary hover:bg-surface-muted"
                        )}
                      >
                        <Folder size={14} className={selectedFolder === f.id ? "fill-accent" : ""} />
                        <span className="truncate">{f.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </nav>

              <div className={cn("mt-auto border-t border-card-border/30 pt-6", isLibrarySidebarHovered ? "block" : "hidden")}>
                 <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-accent/10">
                       <img src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} className="w-full h-full object-cover" alt="User" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-text-main truncate">{user?.name || "Explorer"}</p>
                      <p className="text-[9px] text-text-secondary font-medium uppercase tracking-wider">{user?.rank || "Architect"}</p>
                    </div>
                 </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#fcfcfc] overflow-hidden relative">
        {/* Top Header - Reduced size and condensed content */}
        {!isJournalFullView && activeTab === 'library' && (
          <header className={cn(
            "flex items-center justify-between px-8 md:px-12 border-b border-card-border/30 bg-white/50 backdrop-blur-sm shrink-0 transition-all duration-500",
            activeTab === 'journal' ? "h-20" : "h-28"
          )}>
            <div className="flex items-center gap-12">
              <div>
                <h1 className={cn(
                  "font-black text-text-main tracking-tight uppercase transition-all",
                  activeTab === 'journal' ? "text-xl" : "text-3xl"
                )}>
                  {activeTab === 'journal' ? 'Journal' : 'Library'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {activeTab === 'library' && (
                <div className="relative group hidden sm:block animate-in fade-in slide-in-from-right duration-500">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/40 group-focus-within:text-accent transition-colors" />
                  <input
                    placeholder="Search Library..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 pl-10 pr-4 w-64 bg-surface-muted border border-card-border/50 rounded-2xl text-[11px] font-bold text-text-main focus:outline-none focus:border-accent/40 focus:bg-white transition-all placeholder:text-text-secondary/30 shadow-sm"
                  />
                </div>
              )}
              {activeTab === 'journal' && (
                <button 
                  onClick={() => setIsJournalFullView(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/5 text-accent text-[10px] font-black uppercase tracking-widest hover:bg-accent hover:text-white transition-all animate-in fade-in slide-in-from-right duration-500"
                >
                  <Maximize2 size={14} />
                  Immersive Mode
                </button>
              )}
              <button 
                onClick={() => handleCreateNote(activeTab)}
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/10 hover:scale-105 transition-all md:hidden"
              >
                <Plus size={24} />
              </button>
            </div>
          </header>
        )}

        {/* Content Section */}
        <div className={cn(
          "flex-1 overflow-y-auto custom-scrollbar transition-all duration-700",
          isJournalFullView ? "p-0" : activeTab === 'journal' ? "px-4 md:px-8 py-4" : "px-8 md:px-12 py-10"
        )}>
          <AnimatePresence mode="wait">
            {selectedNote ? (
              <NoteEditor 
                key={selectedNote.id}
                note={selectedNote} 
                onClose={() => setSelectedNoteId(null)}
                updateNote={updateNote}
                folders={folders}
              />
            ) : (
              <div className={cn(
                "mx-auto transition-all duration-700",
                isJournalFullView ? "max-w-none h-full" : activeTab === 'journal' ? "max-w-[1800px] space-y-6" : "max-w-[1600px] space-y-16"
              )}>
                {activeTab === 'library' && (
                  <section className="space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="text-xl font-black text-text-main tracking-tight uppercase">Recent Folders</h3>
                        <p className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] opacity-60">Directory Layout</p>
                      </div>
                      <div className="flex bg-surface-muted p-1 rounded-xl border border-card-border/50 self-start sm:self-auto">
                        {[
                          { label: 'Today', value: 'today' as const },
                          { label: 'This Week', value: 'week' as const },
                          { label: 'All', value: 'all' as const }
                        ].map((t) => (
                          <button 
                            key={t.value}
                            onClick={() => setTimeFilter(t.value)}
                            className={cn(
                              "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                              timeFilter === t.value ? "bg-white shadow-sm text-accent" : "text-text-secondary opacity-40 hover:opacity-100"
                            )}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-6">
                       {filteredFolders.map((folder, idx) => (
                         <FolderCard 
                           key={folder.id || `folder-${idx}`} 
                           folder={folder}
                           active={selectedFolder === folder.id}
                           onClick={() => setSelectedFolder(selectedFolder === folder.id ? null : folder.id)}
                         />
                       ))}
                       <button 
                         onClick={() => setIsFolderModalOpen(true)}
                         className="aspect-[4/3] rounded-lg border-2 border-dashed border-card-border hover:border-accent/40 hover:bg-accent/5 transition-all group flex flex-col items-center justify-center gap-3"
                       >
                          <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-text-secondary/40 group-hover:text-accent transition-colors">
                             <Plus size={20} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary/40 group-hover:text-accent transition-colors">New Folder</span>
                       </button>
                    </div>
                  </section>
                )}

                <section className={cn("space-y-8", isJournalFullView && "h-full space-y-0")}>
                   {!isJournalFullView && (
                     <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="text-xl font-black text-text-main tracking-tight uppercase">
                            {activeTab === 'library' ? 'Work Records' : 'JOURNAL'}
                          </h3>
                          <p className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] opacity-60">
                            {activeTab === 'library' ? 'Project documentation' : 'Daily writing space'}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 self-start sm:self-auto">
                          <div className="flex bg-surface-muted p-1 rounded-xl border border-card-border/50">
                            {[
                              { label: 'Today', value: 'today' as const },
                              { label: 'This Week', value: 'week' as const },
                              { label: 'All', value: 'all' as const }
                            ].map((t) => (
                              <button 
                                key={t.value}
                                onClick={() => setTimeFilter(t.value)}
                                className={cn(
                                  "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                  timeFilter === t.value ? "bg-white shadow-sm text-accent" : "text-text-secondary opacity-40 hover:opacity-100"
                                )}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                          <div className="hidden sm:flex items-center gap-1 bg-surface-muted p-1 rounded-xl border border-card-border/50">
                            <button 
                              onClick={() => setViewMode('grid')}
                              className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-accent" : "text-text-secondary/40 hover:text-text-main")}
                            >
                              <Grid size={16} />
                            </button>
                            <button 
                              onClick={() => setViewMode('list')}
                              className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white shadow-sm text-accent" : "text-text-secondary/40 hover:text-text-main")}
                            >
                              <Layout size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'journal' ? (
                      <JournalSpread 
                        selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate}
                        entry={journalEntry}
                        streak={streak}
                        fullView={isJournalFullView}
                        toggleFullView={() => setIsJournalFullView(!isJournalFullView)}
                        recentLibraryNotes={notes.filter(n => (n.note_type === 'vault' || n.note_type === 'library') && !n.isDeleted).slice(0, 5)}
                        onSave={(content: string, updates: any) => {
                          if (journalEntry) {
                            updateNote(journalEntry.id, { content, ...updates });
                          } else {
                            addNote({
                              title: updates?.title || `Journal - ${format(selectedDate, 'yyyy-MM-dd')}`,
                              content,
                              note_type: 'journal',
                              journal_date: format(selectedDate, 'yyyy-MM-dd'),
                              mood: updates?.mood || '',
                              ...updates
                            });
                          }
                        }}
                      />
                    ) : filteredNotes.length === 0 ? (
                      <div className="h-96 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-card-border/50 shadow-sm">
                        <div className="w-20 h-20 rounded-3xl bg-surface-muted flex items-center justify-center mb-6 text-text-secondary/20">
                          <BookOpen size={40} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary/40 mb-6">No workspace records detected</p>
                        <button 
                          onClick={() => handleCreateNote(activeTab)}
                          className="h-11 px-8 rounded-xl border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest hover:bg-accent hover:text-white transition-all"
                        >
                          Initialize First Entry
                        </button>
                      </div>
                    ) : (
                      <div className={cn(
                        "grid gap-6",
                        viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" : "grid-cols-1"
                      )}>
                        {filteredNotes.map((note, idx) => (
                          <NoteCard key={note.id || `note-${idx}`} note={note} onClick={() => setSelectedNoteId(note.id)} viewMode={viewMode} />
                        ))}
                        {viewMode === 'grid' && (
                          <button 
                            onClick={() => handleCreateNote('library')}
                            className="aspect-square sm:aspect-[4/5] rounded-lg border-2 border-dashed border-card-border hover:border-accent/40 hover:bg-accent/5 transition-all group flex flex-col items-center justify-center gap-4"
                          >
                             <div className="w-12 h-12 rounded-2xl bg-surface-muted flex items-center justify-center text-text-secondary/40 group-hover:text-accent transition-colors">
                                <Plus size={24} />
                             </div>
                             <span className="text-[11px] font-black uppercase tracking-[0.2em] text-text-secondary/40 group-hover:text-accent transition-colors">Add New Note</span>
                          </button>
                        )}
                      </div>
                    )}
                </section>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <NewFolderModal
        isOpen={isFolderModalOpen}
        folders={folders}
        onClose={() => setIsFolderModalOpen(false)}
        onCreate={handleNewFolder}
      />
    </div>
  );
}

const JOURNAL_PROMPTS = [
  "What made today meaningful?",
  "What did you learn today?",
  "What do you want to improve tomorrow?",
  "What progress did you make today?",
  "What are you grateful for today?"
];

const JOURNAL_PAGE_BREAK = '\n\n--- Page ---\n\n';
const STICKERS = ['*', '!!', 'OK', 'IDEA', 'WIN', 'FOCUS'];
const FOLDER_COLORS = [
  { name: 'Sky', value: '#3b82f6' },
  { name: 'Coral', value: '#f97316' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Mint', value: '#10b981' },
  { name: 'Rose', value: '#f43f5e' },
];

function getDailyPrompt(date: Date) {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  return JOURNAL_PROMPTS[dayOfYear % JOURNAL_PROMPTS.length];
}

function JournalSpread({ selectedDate, setSelectedDate, entry, streak, onSave, fullView, toggleFullView, recentLibraryNotes }: any) {
  const [pages, setPages] = useState<string[]>((entry?.content || '').split(JOURNAL_PAGE_BREAK));
  const [currentPage, setCurrentPage] = useState(0);
  const [title, setTitle] = useState(entry?.title || '');
  const [mood, setMood] = useState(entry?.mood || '');
  const [location, setLocation] = useState(entry?.location || '');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(entry?.updatedAt || null);
  const [isEditingLockedEntry, setIsEditingLockedEntry] = useState(false);
  const stickerInputRef = useRef<HTMLInputElement>(null);
  const content = pages[currentPage] || '';
  const isPastEntry = isBefore(startOfDay(selectedDate), startOfDay(new Date()));
  const isLocked = isPastEntry && !isEditingLockedEntry;

  useEffect(() => {
    const nextPages = (entry?.content || '').split(JOURNAL_PAGE_BREAK);
    setPages(nextPages.length > 0 ? nextPages : ['']);
    setCurrentPage(0);
    setTitle(entry?.title || '');
    setMood(entry?.mood || '');
    setLocation(entry?.location || '');
    setLastSaved(entry?.updatedAt || null);
    setIsEditingLockedEntry(false);
  }, [entry, selectedDate]);

  const handleSave = async () => {
    if (isLocked) return;
    setIsSaving(true);
    try {
      await onSave(pages.join(JOURNAL_PAGE_BREAK), { title: title || `Journal - ${format(selectedDate, 'yyyy-MM-dd')}`, mood, location });
      setLastSaved(Date.now());
    } finally {
      setIsSaving(false);
    }
  };

  const handleDropNote = (noteContent: string) => {
    setContent(prev => prev + (prev ? '\n\n' : '') + `📌 From Library:\n${noteContent}`);
  };

  const updateCurrentPage = (updater: string | ((value: string) => string)) => {
    setPages(prev => prev.map((page, index) => {
      if (index !== currentPage) return page;
      return typeof updater === 'function' ? updater(page) : updater;
    }));
  };
  const setContent = updateCurrentPage;

  const addNotebookPage = () => {
    if (isLocked) return;
    setPages(prev => [...prev, '']);
    setCurrentPage(pages.length);
  };

  const deleteNotebookPage = async () => {
    if (isLocked) return;
    if (!confirm(`Delete page ${currentPage + 1}?`)) return;
    const nextPages = pages.length <= 1 ? [''] : pages.filter((_, index) => index !== currentPage);
    const nextPageIndex = Math.min(Math.max(0, currentPage - 1), nextPages.length - 1);
    setPages(nextPages);
    setCurrentPage(nextPageIndex);
    setIsSaving(true);
    try {
      await onSave(nextPages.join(JOURNAL_PAGE_BREAK), { title: title || `Journal - ${format(selectedDate, 'yyyy-MM-dd')}`, mood, location });
      setLastSaved(Date.now());
    } finally {
      setIsSaving(false);
    }
  };

  const addSticker = (sticker: string) => {
    if (isLocked) return;
    updateCurrentPage(prev => `${prev}${prev ? ' ' : ''}${sticker}`);
  };

  const importStickerImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result) {
        updateCurrentPage(prev => `${prev}${prev ? '\n\n' : ''}![Imported sticker](${result})`);
      }
    };
    reader.readAsDataURL(file);
  };

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate);
    return eachDayOfInterval({
      start,
      end: endOfWeek(selectedDate)
    });
  }, [selectedDate]);

  const prompt = useMemo(() => getDailyPrompt(selectedDate), [selectedDate]);

  return (
    <div className={cn(
      "mx-auto transition-all duration-700 font-sans",
      fullView ? "w-full h-screen bg-[#fcfcfc] overflow-hidden" : "w-full max-w-none py-4"
    )}>
      {fullView && (
        <div className="h-16 flex items-center justify-between px-10 border-b border-card-border/30 bg-white/50 backdrop-blur-md">
           <div className="flex items-center gap-4">
              <button 
                onClick={toggleFullView}
                className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center hover:scale-105 transition-all"
              >
                 <X size={18} />
              </button>
              <h2 className="text-sm font-black text-text-main uppercase tracking-widest">Immersive Journal View</h2>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={addNotebookPage}
                disabled={isLocked}
                className="w-10 h-10 rounded-xl bg-surface-muted border border-card-border flex items-center justify-center text-accent hover:bg-accent hover:text-white transition-all"
                title="Add page"
              >
                <Plus size={16} />
              </button>
              <button
                onClick={deleteNotebookPage}
                disabled={isLocked || (pages.length <= 1 && !content.trim())}
                className="w-10 h-10 rounded-xl bg-surface-muted border border-card-border flex items-center justify-center text-danger hover:bg-danger hover:text-white transition-all disabled:opacity-40"
                title="Delete current page"
              >
                <Trash2 size={16} />
              </button>
               <div className="flex items-center gap-2">
                <Star size={14} className={streak > 0 ? "text-accent fill-accent" : "text-text-secondary/20"} />
                <span className="text-[10px] font-black text-text-main uppercase tracking-widest">{streak} Day Streak</span>
              </div>
              {isLocked ? (
                <button onClick={() => setIsEditingLockedEntry(true)} className="h-10 px-6 rounded-xl bg-text-main text-white text-[10px] font-black uppercase tracking-widest shadow-lg">Edit Locked Entry</button>
              ) : (
                <button onClick={handleSave} className="h-10 px-6 rounded-xl bg-accent text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/10">Save Record</button>
              )}
           </div>
        </div>
      )}

      <div className={cn(
        "flex transition-all duration-1000",
        fullView ? "h-[calc(100vh-4rem)] p-10 gap-10" : "flex-col lg:flex-row gap-8 items-stretch min-h-[700px]"
      )}>
        {/* Sticky Notes Sidebar in Full View */}
        {fullView && (
          <div className="w-64 shrink-0 flex flex-col gap-6 animate-in slide-in-from-left duration-700">
             <div className="space-y-1">
               <h3 className="text-xs font-black text-text-main uppercase tracking-widest">Library Stickies</h3>
               <p className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.2em] opacity-40">Drag to Journal</p>
             </div>
             <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                {recentLibraryNotes.map((note: any) => (
                  <motion.div
                    key={note.id}
                    draggable
                    onDragStart={(e: any) => e.dataTransfer.setData('text/plain', note.content)}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-2xl bg-yellow-50 border border-yellow-200 shadow-sm cursor-grab active:cursor-grabbing group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-yellow-200 group-hover:bg-yellow-400 transition-colors" />
                    <h4 className="text-[10px] font-black text-yellow-800 uppercase tracking-tight truncate">{note.title}</h4>
                    <p className="text-[9px] text-yellow-700/60 line-clamp-3 mt-1 leading-relaxed">{note.content || "Empty sticky..."}</p>
                  </motion.div>
                ))}
             </div>
          </div>
        )}

        <motion.div 
          key={`journal-page-${selectedDate.toISOString()}`}
          layout
          className={cn(
            "flex-1 flex gap-0 lg:gap-8 perspective-[1500px]",
            fullView ? "h-full" : "min-h-[700px]"
          )}
        >
          {/* Left Page: Daily Overview */}
          <motion.div 
            initial={{ rotateY: -10, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.8, type: 'spring' }}
            className="flex-1 bg-white rounded-[2.5rem] border border-card-border/50 shadow-2xl p-10 flex flex-col items-center text-center space-y-10 origin-right relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-2 h-full bg-surface-muted/30 border-l border-card-border/10" />
            
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-text-main tracking-tighter uppercase">{format(selectedDate, 'EEEE')}</h2>
              <p className="text-xs font-bold text-accent uppercase tracking-[0.3em] opacity-60">{format(selectedDate, 'MMMM dd, yyyy')}</p>
              {isLocked && <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/40">Locked until you click edit</p>}
            </div>

            {/* Memory / Visual Card */}
            <div 
              onClick={() => !fullView && toggleFullView()}
              className="w-full aspect-square rounded-[2rem] bg-surface-muted border-2 border-dashed border-card-border/50 flex flex-col items-center justify-center p-8 group hover:bg-accent/[0.02] transition-colors relative overflow-hidden cursor-pointer"
            >
              {entry?.image_url ? (
                 <img src={entry.image_url} alt="Memory" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <>
                  <motion.div 
                    whileHover={{ rotate: 12, scale: 1.1 }}
                    className="w-16 h-16 rounded-2xl bg-white border border-card-border/50 flex items-center justify-center text-text-secondary/20 mb-4 shadow-sm"
                  >
                    <BookOpen size={32} />
                  </motion.div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/40">
                    Page {currentPage + 1} of {pages.length}
                  </p>
                </>
              )}
            </div>

            {/* Weekly date strip */}
            <div className="w-full space-y-4">
              <div className="flex items-center gap-4">
                 <div className="h-[1px] flex-1 bg-card-border/30" />
                 <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary/30">Temporal Pulse</span>
                 <div className="h-[1px] flex-1 bg-card-border/30" />
              </div>
              <div className="flex justify-between items-center bg-surface-muted/50 p-2 rounded-2xl border border-card-border/30">
                {weekDays.map((date, i) => {
                  const isActive = isSameDay(date, selectedDate);
                  const isDayToday = isToday(date);
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(date)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all min-w-[50px]",
                        isActive ? "bg-white shadow-md text-accent scale-105" : "text-text-secondary/40 hover:text-text-main hover:bg-white/50"
                      )}
                    >
                      <span className="text-[8px] font-black uppercase tracking-widest">{format(date, 'EEE')}</span>
                      <span className="text-xs font-bold">{format(date, 'd')}</span>
                      {isDayToday && !isActive && <div className="w-1 h-1 rounded-full bg-accent/40" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="w-full grid grid-cols-2 gap-3">
              {pages.map((_, index) => (
                <button
                  key={`journal-page-tab-${index}`}
                  onClick={() => setCurrentPage(index)}
                  className={cn(
                    "h-10 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all",
                    currentPage === index ? "bg-accent text-white border-accent shadow-lg shadow-accent/10" : "bg-white text-text-secondary/50 border-card-border hover:border-accent/40"
                  )}
                >
                  Page {index + 1}
                </button>
              ))}
              <button
                onClick={addNotebookPage}
                disabled={isLocked}
                className="h-10 rounded-xl border border-dashed border-card-border text-accent flex items-center justify-center hover:bg-accent/5 transition-all"
                title="Add notebook page"
              >
                <Plus size={16} />
              </button>
              <button
                onClick={deleteNotebookPage}
                disabled={isLocked || (pages.length <= 1 && !content.trim())}
                className="h-10 rounded-xl border border-dashed border-danger/30 text-danger flex items-center justify-center hover:bg-danger/5 transition-all disabled:opacity-40"
                title="Delete current page"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </motion.div>

          {/* Right Page: Writing Area */}
          <motion.div 
            key={`journal-writing-page-${currentPage}`}
            initial={{ rotateY: 30, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.8, type: 'spring', delay: 0.1 }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const noteContent = e.dataTransfer.getData('text/plain');
              if (noteContent) handleDropNote(noteContent);
            }}
            className="flex-1 bg-white rounded-[2.5rem] border border-card-border/50 shadow-2xl p-10 flex flex-col space-y-8 relative origin-left overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-surface-muted/30 border-r border-card-border/10" />
            <div className="absolute top-0 left-0 w-1.5 h-full bg-accent/5 rounded-l-full" />
            
            {/* Prompt Card */}
            <div className="bg-surface-muted rounded-[2rem] p-8 border border-card-border/50 space-y-3 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors" />
              <div className="flex items-center gap-3">
                <Sparkles size={14} className="text-accent" />
                <span className="text-[10px] font-black uppercase tracking-widest text-accent">Daily Reflection</span>
              </div>
              <p className="text-lg font-bold text-text-main leading-snug">
                {prompt}
              </p>
              <div className="pt-4 flex flex-wrap items-center gap-2">
                {STICKERS.map(sticker => (
                  <button
                    key={sticker}
                    onClick={() => addSticker(sticker)}
                    disabled={isLocked}
                    className="px-3 h-8 rounded-lg bg-white border border-card-border text-[9px] font-black uppercase tracking-widest text-text-secondary hover:text-accent hover:border-accent/40 transition-all"
                  >
                    {sticker}
                  </button>
                ))}
                <button
                  onClick={() => stickerInputRef.current?.click()}
                  disabled={isLocked}
                  className="px-3 h-8 rounded-lg bg-white border border-card-border text-[9px] font-black uppercase tracking-widest text-accent flex items-center gap-2 hover:border-accent/40 transition-all"
                >
                  <ImageIcon size={12} /> Import
                </button>
                <input
                  ref={stickerInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) importStickerImage(file);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col space-y-6">
               <div className="absolute top-8 right-10 text-right pointer-events-none">
                 <p className="text-[9px] font-black uppercase tracking-[0.3em] text-text-secondary/30">Written</p>
                 <p className="text-xs font-black text-accent uppercase tracking-widest">{format(selectedDate, 'MMM dd, yyyy')}</p>
               </div>
               <input 
                 value={title}
                 onChange={(e) => setTitle(e.target.value)}
                 readOnly={isLocked}
                 placeholder="Journal Entry Title"
                 className="text-2xl font-black text-text-main placeholder:text-text-secondary/20 bg-transparent border-none focus:outline-none uppercase tracking-tight"
               />
               <textarea 
                 value={content}
                 onChange={(e) => setContent(e.target.value)}
                 readOnly={isLocked}
                 placeholder="Write your thoughts for today..."
                 className={cn("flex-1 w-full text-base font-medium text-text-secondary leading-relaxed bg-transparent border-none focus:outline-none resize-none placeholder:text-text-secondary/20", isLocked && "cursor-default opacity-70")}
                 style={{ backgroundImage: 'linear-gradient(transparent, transparent 31px, #f1f1f1 31px)', backgroundSize: '100% 32px' }}
               />
            </div>

            {/* Metadata & Actions */}
            <div className="pt-8 border-t border-card-border/30 space-y-8">
               <div className="flex flex-wrap items-center gap-3">
                 <div className="flex items-center gap-2 px-4 h-12 bg-surface-muted rounded-xl border border-card-border/50">
                    <MapPin size={14} className="text-text-secondary/40" />
                    <input 
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      readOnly={isLocked}
                      placeholder="Origin"
                      className="bg-transparent border-none focus:outline-none text-[10px] font-black tracking-widest uppercase text-text-secondary"
                    />
                 </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-secondary/30">
                  {isSaving ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : lastSaved ? (
                    <>
                      <CheckCircle2 size={12} className="text-green-500" />
                      <span>Saved {format(lastSaved, 'h:mm a')}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={12} />
                      <span>Local Cache Only</span>
                    </>
                  )}
                </div>
                {!fullView && (
                  isLocked ? (
                    <button
                      onClick={() => setIsEditingLockedEntry(true)}
                      className="h-12 px-10 rounded-2xl bg-text-main text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:scale-105 active:scale-95 transition-all"
                    >
                      Edit Entry
                    </button>
                  ) : (
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="h-12 px-10 rounded-2xl bg-accent text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      Preserve Entry
                    </button>
                  )
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function NewFolderModal({ isOpen, folders, onClose, onCreate }: {
  isOpen: boolean;
  folders: FolderType[];
  onClose: () => void;
  onCreate: (folder: { name: string; color?: string }) => Promise<boolean>;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(FOLDER_COLORS[0].value);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setColor(FOLDER_COLORS[0].value);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Folder name is required.');
      return;
    }
    if (folders.some(folder => folder.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('A folder with this name already exists.');
      return;
    }
    const created = await onCreate({ name: trimmed, color });
    if (!created) setError('Could not create this folder.');
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-overlay/70 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        className="relative w-full max-w-md rounded-[2rem] bg-white border border-card-border shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-card-border/40 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight text-text-main">New Folder</h3>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent/60 mt-1">Library collection</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-surface-muted text-text-secondary hover:text-text-main transition-all flex items-center justify-center">
            <X size={18} />
          </button>
        </div>
        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50">Name</label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              autoFocus
              placeholder="Project notes"
              className="w-full h-14 rounded-2xl border border-card-border bg-surface-muted/40 px-5 text-sm font-bold text-text-main outline-none focus:border-accent focus:bg-white transition-all"
            />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50">Color</label>
            <div className="grid grid-cols-5 gap-3">
              {FOLDER_COLORS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setColor(option.value)}
                  className={cn(
                    "h-12 rounded-2xl border-2 transition-all",
                    color === option.value ? "border-text-main scale-105 shadow-lg" : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: option.value }}
                  title={option.name}
                />
              ))}
            </div>
          </div>
          {error && <p className="text-xs font-bold text-danger">{error}</p>}
          <button
            onClick={handleSubmit}
            className="w-full h-12 rounded-2xl bg-accent text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-accent/20 hover:scale-[1.01] active:scale-95 transition-all"
          >
            Create Folder
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function SidebarIconBtn({ icon, active, onClick, label, expanded }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-4 h-12 rounded-2xl transition-all group relative",
        active ? "bg-accent text-white shadow-lg shadow-accent/10" : "text-text-secondary hover:bg-surface-muted"
      )}
    >
      <div className={cn("shrink-0 transition-transform", active ? "scale-110" : "group-hover:scale-110")}>{icon}</div>
      <span className={cn(
        "text-[11px] font-bold tracking-tight transition-all duration-200 whitespace-nowrap",
        expanded ? "opacity-100 translate-x-0" : "pointer-events-none w-0 opacity-0 -translate-x-2 overflow-hidden",
        active ? "opacity-100" : "opacity-70 group-hover:opacity-100"
      )}>{label}</span>
      {active && <div className={cn("absolute left-0 w-1 h-5 bg-white/40 rounded-r-full", expanded ? "block" : "hidden")} />}
    </button>
  );
}

function FolderCard({ folder, active, onClick }: { folder: any, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick} 
      className={cn(
        "h-36 flex flex-col items-center justify-center gap-3 transition-all group text-center",
        active ? "scale-[1.03]" : "hover:-translate-y-1"
      )}
    >
       <Folder
         size={72}
         strokeWidth={1.4}
         fill={active ? "var(--accent)" : (folder.color || "var(--card-dark)")}
         className={cn(
           "drop-shadow-sm transition-all",
           active ? "text-accent" : "text-text-secondary/40 group-hover:text-accent"
         )}
       />
       <p className={cn(
         "w-full px-2 text-xs font-bold tracking-tight truncate",
         active ? "text-accent" : "text-text-main"
       )}>
         {folder.name}
       </p>
    </button>
  );
}

function NoteCard({ note, onClick, viewMode }: { note: Note, onClick: () => void, viewMode?: 'grid' | 'list' }) {
  const NoteIcon = note.audio_url ? Volume2 : FileText;

  if (viewMode === 'list') {
    return (
      <div 
        onClick={onClick}
        className="group cursor-pointer p-5 rounded-2xl bg-white border border-card-border hover:border-accent/40 hover:shadow-lg transition-all flex items-center gap-6"
      >
        <div className="w-12 h-12 rounded-xl bg-accent/5 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all">
          <NoteIcon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-black text-text-main group-hover:text-accent transition-colors truncate uppercase tracking-tight">{note.title}</h4>
          <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider opacity-60">Updated {format(note.updatedAt, 'MMM dd, h:mm a')}</p>
        </div>
        <div className="flex items-center gap-4 px-6 border-l border-card-border/50">
           {note.tags.slice(0, 2).map((t, i) => (
             <span key={i} className="text-[9px] font-black text-accent/40 uppercase tracking-widest">#{t}</span>
           ))}
        </div>
        <ChevronRight size={16} className="text-text-secondary/20 group-hover:text-accent group-hover:translate-x-1 transition-all" />
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className="aspect-square sm:aspect-[4/5] p-8 rounded-lg bg-white border border-card-border hover:border-accent/40 hover:shadow-2xl transition-all group cursor-pointer flex flex-col relative overflow-hidden"
    >
       {/* Card background accent like in image */}
       <div className="absolute top-0 left-0 w-full h-1.5 bg-accent/5 group-hover:bg-accent transition-colors" />
       
       <div className="flex items-center justify-between mb-8">
          <div className="w-12 h-12 rounded-2xl bg-accent/5 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all shadow-sm">
             <NoteIcon size={22} />
          </div>
          <div className="flex flex-col items-end">
            <p className="text-[9px] font-black text-text-secondary/40 uppercase tracking-[0.2em]">{format(note.updatedAt, 'yyyy')}</p>
            <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{format(note.updatedAt, 'MMM dd')}</p>
          </div>
       </div>

       <div className="flex-1 space-y-3 min-w-0">
          <h4 className="text-lg font-black text-text-main group-hover:text-accent transition-colors leading-tight uppercase tracking-tight">{note.title}</h4>
          <p className="text-[11px] text-text-secondary/60 font-medium line-clamp-4 leading-relaxed italic">
            {note.content ? note.content.substring(0, 120) + '...' : "Secure data point waiting for input documentation..."}
          </p>
          {note.audio_url && (
            <p className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-accent">
              <Volume2 size={11} /> Audio note attached
            </p>
          )}
       </div>

       <div className="mt-8 pt-6 border-t border-card-border/30 flex items-center justify-between">
          <div className="flex -space-x-2">
            {note.tags.slice(0, 3).map((t, i) => (
              <div key={i} className="w-6 h-6 rounded-full bg-white border border-card-border flex items-center justify-center shadow-sm" title={`#${t}`}>
                <Hash size={10} className="text-accent" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1 text-[9px] font-black text-accent uppercase tracking-widest group-hover:translate-x-1 transition-transform">
             Open <ChevronRight size={12} />
          </div>
       </div>
    </div>
  );
}

function TabButton({ active, onClick, label, icon }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 py-3 px-1 relative transition-all group",
        active ? "text-accent" : "text-text-secondary/40 hover:text-text-main"
      )}
    >
      {icon}
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      {active && (
        <motion.div 
          layoutId="activeTabNote" 
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" 
        />
      )}
    </button>
  );
}

function NoteEditor({ note, onClose, updateNote, folders }: { note: Note, onClose: () => void, updateNote: (id: string, updates: Partial<Note>) => void, folders: FolderType[] }) {
  const [isAudioUploading, setIsAudioUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const { deleteNote, session, addToast } = useStore();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const attachAudioFile = async (file: File) => {
    setIsAudioUploading(true);
    try {
      const { publicUrl } = await uploadAudioNote(file, session?.user?.id);
      updateNote(note.id, { audio_url: publicUrl });
      addToast({ type: 'success', title: 'Audio attached', description: 'Your audio note was saved.' });
    } catch (error: any) {
      console.error('Failed to attach audio note:', error);
      addToast({ type: 'error', title: 'Audio failed', description: error.message || 'Could not attach this audio note.' });
    } finally {
      setIsAudioUploading(false);
    }
  };

  const startRecording = async () => {
    if (isRecording || isAudioUploading) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      addToast({ type: 'error', title: 'Recording unavailable', description: 'Your browser does not support audio recording.' });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = [];
      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/ogg'
      ];
      const mimeType = preferredTypes.find(type => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const recordedType = (recorder.mimeType || mimeType || 'audio/webm').split(';')[0];
        const extension = recordedType.includes('mp4') ? 'm4a' : recordedType.includes('ogg') ? 'ogg' : 'webm';
        const blob = new Blob(chunks, { type: recordedType });
        const file = new File([blob], `audio-note-${Date.now()}.${extension}`, { type: recordedType });
        attachAudioFile(file);
      };
      recorder.start();
      setIsRecording(true);
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      addToast({ type: 'error', title: 'Mic blocked', description: error.message || 'Could not start recording.' });
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecording(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="fixed inset-0 z-[120] flex flex-col bg-white overflow-hidden"
    >
      <div className="h-20 flex items-center justify-between px-8 border-b border-[#f9f9f9] shrink-0">
         <div className="flex items-center gap-6">
           <button onClick={onClose} className="w-10 h-10 rounded-xl bg-accent/5 text-accent flex items-center justify-center hover:bg-accent hover:text-white transition-all active:scale-90">
              <ChevronRight className="rotate-180" size={18} />
           </button>
           <div className="space-y-0.5">
             <span className="text-[10px] font-black uppercase tracking-widest text-[#ccc]">{note.note_type === 'vault' ? 'library' : note.note_type}</span>
             <p className="text-[9px] font-bold text-accent uppercase tracking-widest leading-none">Writing Space</p>
           </div>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => updateNote(note.id, { isFavorite: !note.isFavorite })}
             className={cn("w-10 h-10 rounded-xl border flex items-center justify-center transition-all", note.isFavorite ? "bg-accent/10 border-accent/30 text-accent" : "bg-transparent border-[#eee] text-[#ccc] hover:text-[#333]")}
            >
              <Star size={16} className={note.isFavorite ? "fill-accent" : ""} />
           </button>
           <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isAudioUploading}
            className={cn(
              "h-10 px-5 rounded-xl flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50",
              isRecording ? "bg-danger text-white" : "bg-accent/5 text-accent hover:bg-accent hover:text-white"
            )}
           >
              {isAudioUploading ? <Loader2 size={12} className="animate-spin" /> : isRecording ? <StopCircle size={12} /> : <Mic size={12} />}
              {isAudioUploading ? 'Uploading' : isRecording ? 'Stop' : 'Record'}
           </button>
           <button
            onClick={() => audioInputRef.current?.click()}
            disabled={isAudioUploading || isRecording}
            className="h-10 px-5 rounded-xl bg-surface-muted text-text-secondary flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:bg-accent/5 hover:text-accent transition-all disabled:opacity-50"
           >
              <Upload size={12} />
              Audio
           </button>
           <input
             ref={audioInputRef}
             type="file"
             accept="audio/webm,audio/webm;codecs=opus,audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/m4a,audio/wav,audio/x-wav,audio/ogg,application/ogg"
             className="hidden"
             onChange={(event) => {
               const file = event.target.files?.[0];
               if (file) attachAudioFile(file);
               event.target.value = '';
             }}
           />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pt-12 pb-24 px-8 md:px-16">
        <div className="max-w-6xl mx-auto space-y-12">
          {note.note_type === 'journal' && (
            <h4 className="text-xs font-black text-[#ccc] uppercase tracking-widest">{format(note.createdAt, 'EEEE, MMM dd')}</h4>
          )}

          <input
            value={note.title}
            onChange={e => updateNote(note.id, { title: e.target.value })}
            className="w-full text-4xl font-extrabold text-[#333] bg-transparent border-none focus:outline-none placeholder:text-[#eee] tracking-tight"
            placeholder="Document Title"
          />
          
          <textarea
            value={note.content}
            onChange={e => {
              updateNote(note.id, { content: e.target.value });
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            className="w-full text-lg text-[#666] bg-transparent border-none focus:outline-none resize-none placeholder:text-[#eee] leading-loose font-medium min-h-[60vh]"
            placeholder="Log details..."
            style={{ height: 'auto' }}
          />

          {note.audio_url && (
            <div className="rounded-2xl border border-accent/10 bg-accent/5 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-white border border-card-border flex items-center justify-center text-accent shrink-0">
                <Volume2 size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-2">Audio Note</p>
                <audio src={note.audio_url} controls className="w-full" />
              </div>
              <button
                onClick={() => updateNote(note.id, { audio_url: '' })}
                className="h-10 px-4 rounded-xl bg-white border border-card-border text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-danger transition-colors"
              >
                Remove
              </button>
            </div>
          )}

          <div className="space-y-10 pt-16 border-t border-[#f5f5f5]">
            {(note.note_type === 'library' || note.note_type === 'vault') && (
              <div className="flex items-center gap-3">
                <Folder size={16} className="text-accent" />
                <select
                  value={note.folderId || ''}
                  onChange={(e) => updateNote(note.id, { folderId: e.target.value || null })}
                  className="h-11 px-4 rounded-lg bg-[#fafafa] border border-[#eee] text-xs font-bold text-text-main focus:outline-none focus:border-accent"
                >
                  <option value="">No folder</option>
                  {folders.map(folder => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-4 h-10 rounded-xl bg-[#fafafa] border border-[#eee] text-[#ccc]">
                <Tag size={14} />
                <input 
                  placeholder="Tag" 
                  className="bg-transparent border-none focus:outline-none text-[10px] font-bold uppercase tracking-widest w-16"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val && !note.tags.includes(val)) {
                        updateNote(note.id, { tags: [...note.tags, val] });
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
              </div>
              {note.tags.map((t, i) => (
                <div key={i} className="px-4 h-10 rounded-xl bg-accent/5 border border-accent/10 flex items-center gap-2 text-[10px] font-bold text-accent uppercase tracking-widest group">
                  # {t}
                  <button 
                    onClick={() => updateNote(note.id, { tags: note.tags.filter(tag => tag !== t) })}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all ml-1"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[#ccc]">
              <div className="flex items-center gap-6">
                <span>Ref: {format(note.createdAt, 'MMM dd, yyyy')}</span>
                <span>Class: {note.note_type === 'vault' ? 'library' : note.note_type}</span>
              </div>
              <button 
                onClick={() => {
                  if (window.confirm('Permanent deletion confirmed?')) {
                    onClose();
                    deleteNote(note.id);
                  }
                }}
                className="text-red-400 hover:text-red-600 transition-colors flex items-center gap-2"
              >
                <Trash2 size={12} /> Erase Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function JournalTimeline({ entries, onSelect }: { entries: Note[], onSelect: (id: string) => void }) {
  const groups = entries.reduce((acc: any, entry) => {
    let dateStr = 'History';
    const date = new Date(entry.createdAt);
    if (isToday(date)) dateStr = 'Today';
    else if (isYesterday(date)) dateStr = 'Yesterday';
    else if (isThisWeek(date)) dateStr = 'This Week';
    
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(entry);
    return acc;
  }, {});

  const order = ['Today', 'Yesterday', 'This Week', 'History'];

  return (
    <div className="space-y-12 max-w-5xl">
      {order.map((label, idx) => {
        const group = groups[label];
        if (!group) return null;
        return (
          <div key={`section-${label}-${idx}`} className="space-y-6">
            <div className="flex items-center gap-4 px-2">
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary/40 shrink-0">{label}</span>
               <div className="h-[1px] flex-1 bg-card-border/30" />
            </div>
            <div className="grid gap-4">
              {group.map((entry: Note, entryIdx: number) => (
                <div
                  key={entry.id || `journal-${idx}-${entryIdx}`}
                  onClick={() => onSelect(entry.id)}
                  className="group cursor-pointer p-6 rounded-[2rem] bg-white border border-card-border hover:border-accent/40 hover:shadow-xl transition-all flex items-center gap-6 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-accent/5 group-hover:bg-accent transition-colors" />
                  <div className="w-14 h-14 rounded-2xl bg-accent/5 flex items-center justify-center text-3xl shrink-0 group-hover:scale-110 transition-transform">
                    {entry.mood || '✍️'}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                       <h3 className="text-sm font-black text-text-main group-hover:text-accent transition-colors uppercase tracking-tight truncate">{entry.title}</h3>
                       <span className="text-[9px] font-bold text-text-secondary/40 uppercase tracking-widest">{format(entry.createdAt, 'h:mm a')}</span>
                    </div>
                    <p className="text-[11px] text-text-secondary/60 font-medium line-clamp-1 italic">
                      {entry.content || "Documentation sequence awaiting input..."}
                    </p>
                  </div>
                  <div className="hidden sm:flex flex-col items-end shrink-0 pl-10 border-l border-card-border/50">
                    <span className="text-[10px] font-black text-text-main uppercase tracking-widest">{format(entry.createdAt, 'MMM dd')}</span>
                    <span className="text-[8px] font-bold text-accent uppercase tracking-widest opacity-60">Snapshot</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
