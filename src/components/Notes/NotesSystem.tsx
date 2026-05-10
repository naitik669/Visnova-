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
import { getAudioNoteUrl, uploadAudioNote } from '../../lib/supabase';
import { safeDate, safeFormat } from '../../lib/dateUtils';
import { safeArray, safeString } from '../../lib/safeData';
import { SelectMenu } from '../ui/SelectMenu';
import { ResponsiveModal } from '../ui/ResponsiveModal';

const UNFILED_FOLDER_ID = '__unfiled__';

function formatDuration(seconds?: number) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.max(0, seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function cleanPreview(content?: string) {
  const cleaned = safeString(content)
    .replace(/https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/\S+/gi, 'YouTube')
    .replace(/https?:\/\/\S+/gi, 'Link')
    .replace(/[#*_`>[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || 'No content yet.';
}

function getTranscriptLabel(note: Note) {
  if (note.transcript_status === 'completed') return 'Transcript ready';
  if (note.transcript_status === 'pending') return 'Transcribing...';
  if (note.transcript_status === 'failed') return 'Transcript failed';
  return 'Transcript not generated yet';
}

export default function NotesSystem() {
  const { notes, folders, addNote, updateNote, deleteNote, addFolder, fetchFolders, fetchNotes, moveNoteToFolder, user, addToast } = useStore();
  const location = useLocation();
  const initialTabParam = new URLSearchParams(location.search).get('tab');
  const initialTab = initialTabParam === 'journal' || location.pathname.includes('journal') ? 'journal' : initialTabParam === 'audio' ? 'audio' : 'vault';
  const [activeTab, setActiveTab] = useState<'vault' | 'audio' | 'journal'>(initialTab);
  const [isJournalFullView, setIsJournalFullView] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [folderViewer, setFolderViewer] = useState<FolderType | null>(null);

  useEffect(() => {
    fetchFolders();
    fetchNotes();
  }, []);

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    setActiveTab(tab === 'journal' || location.pathname.includes('journal') ? 'journal' : tab === 'audio' ? 'audio' : 'vault');
  }, [location.pathname, location.search]);

  const [sidebarFilter, setSidebarFilter] = useState<'all' | 'recent' | 'favorites' | 'trash'>('all');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLibrarySidebarHovered, setIsLibrarySidebarHovered] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'all'>('all');
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const libraryNoteTypes: Note['note_type'][] = ['normal', 'audio'];

  useEffect(() => {
    const folderId = new URLSearchParams(location.search).get('folder');
    if (folderId) {
      setActiveTab('vault');
      setSelectedFolder(folderId);
    }
  }, [location.search]);

  const journalEntry = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return safeArray<Note>(notes).find(n =>
      !n.isDeleted && 
      n.note_type === 'journal' && 
      (n.journal_date === dateStr || (n.journal_date === undefined && isSameDay(safeDate(n.createdAt), selectedDate)))
    );
  }, [notes, selectedDate]);

  const streak = useMemo(() => {
    const journalNotes = safeArray<Note>(notes).filter(n => n.note_type === 'journal' && !n.isDeleted && safeString(n.content).trim());
    if (journalNotes.length === 0) return 0;
    
    const entryDates = new Set(journalNotes.map(n => n.journal_date || safeFormat(n.createdAt, 'yyyy-MM-dd')));
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
    const trimmedName = safeString(folder.name).trim();
    const isDuplicate = safeArray<FolderType>(folders).some(f => safeString(f.name).toLowerCase() === trimmedName.toLowerCase());
    if (!trimmedName || isDuplicate) return false;

    addFolder({ name: trimmedName, color: folder.color });
    setIsFolderModalOpen(false);
    return true;
  };

  const filteredNotes = useMemo(() => {
    let result = safeArray<Note>(notes);

    // Handle Trash filter separately as it ignores note_type/folders
    if (sidebarFilter === 'trash') {
      result = result.filter(n => n.isDeleted);
    } else {
      // Exclude deleted notes from normal views
      result = result.filter(n => {
        if (n.isDeleted) return false;
        if (activeTab === 'journal') return n.note_type === 'journal';
        if (activeTab === 'audio') return n.note_type === 'audio';
        return n.note_type === 'normal';
      });

      // Apply sidebar filters
      if (sidebarFilter === 'recent') {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        result = result.filter(n => n.updatedAt > oneWeekAgo);
      } else if (sidebarFilter === 'favorites') {
        result = result.filter(n => n.isFavorite);
      }

      // Vault-specific folder filter
      if ((activeTab === 'vault' || activeTab === 'audio') && selectedFolder) {
        result = selectedFolder === UNFILED_FOLDER_ID
          ? result.filter(n => !n.folderId)
          : result.filter(n => n.folderId === selectedFolder);
      }

      if (timeFilter === 'today') {
        result = result.filter(n => isToday(n.updatedAt));
      } else if (timeFilter === 'week') {
        result = result.filter(n => isThisWeek(n.updatedAt));
      }
    }

    // Search (applies to both trash and normal views)
    if (searchQuery) {
      const q = safeString(searchQuery).toLowerCase();
      result = result.filter(n => 
        safeString(n.title).toLowerCase().includes(q) ||
        safeString(n.content).toLowerCase().includes(q) ||
        safeArray<string>(n.tags).some(t => safeString(t).toLowerCase().includes(q))
      );
    }

    return result;
  }, [notes, activeTab, sidebarFilter, searchQuery, selectedFolder, timeFilter]);

  const noteCounts = useMemo(() => {
    const visibleLibraryNotes = safeArray<Note>(notes).filter(n => !n.isDeleted && libraryNoteTypes.includes(n.note_type));
    const byFolder = new Map<string, number>();
    visibleLibraryNotes.forEach(note => {
      if (!note.folderId) return;
      byFolder.set(note.folderId, (byFolder.get(note.folderId) || 0) + 1);
    });

    return {
      all: visibleLibraryNotes.length,
      unfiled: visibleLibraryNotes.filter(note => !note.folderId).length,
      byFolder
    };
  }, [notes]);

  const filteredFolders = useMemo(() => {
    if (timeFilter === 'all') return safeArray<FolderType>(folders);
    return safeArray<FolderType>(folders).filter(folder => {
      const folderNotes = safeArray<Note>(notes).filter(n => n.folderId === folder.id && !n.isDeleted && libraryNoteTypes.includes(n.note_type));
      return folderNotes.some(note => timeFilter === 'today' ? isToday(note.updatedAt) : isThisWeek(note.updatedAt));
    });
  }, [folders, notes, timeFilter]);

  const selectedNote = useMemo(() => 
    notes.find(n => n.id === selectedNoteId), 
    [notes, selectedNoteId]
  );

  const handleCreateNote = (type: 'normal' | 'journal') => {
    const defaultTitle = type === 'journal' 
      ? `Entry ${format(new Date(), 'MMM dd, yyyy')}`
      : 'Untitled Note';
    
    addNote({
      title: defaultTitle,
      content: '',
      note_type: type,
      folderId: type === 'normal' && selectedFolder !== UNFILED_FOLDER_ID ? selectedFolder : null,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  };

  const handleMoveNote = async (noteId: string, folderId: string | null) => {
    const targetFolderId = folderId === UNFILED_FOLDER_ID ? null : folderId;
    await moveNoteToFolder(noteId, targetFolderId);
  };

  return (
    <div className={cn(
      "flex bg-app-container text-text-main transition-all duration-700 font-sans relative overflow-hidden max-w-full",
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
            className="flex flex-col border-r border-card-border/50 bg-card shrink-0 overflow-hidden"
          >
            <div className={cn(
              "flex flex-col h-full transition-all duration-300",
              isLibrarySidebarHovered ? "p-6 md:p-8 gap-10" : "px-2 py-6 gap-8"
            )}>
              {/* Add New Section like in image */}
              <div className={cn(isLibrarySidebarHovered ? "block" : "hidden")}>
                <button 
                  onClick={() => handleCreateNote('normal')}
                  className="w-full h-12 flex items-center justify-center gap-3 bg-accent text-white rounded-2xl font-bold text-xs shadow-xl shadow-accent/10 hover:scale-[1.02] transition-all"
                >
                  <Plus size={16} />
                  Add new
                </button>
                {activeTab === 'vault' && (
                  <button
                    onClick={() => setIsAudioModalOpen(true)}
                    className="w-full h-12 mt-3 flex items-center justify-center gap-3 bg-surface-muted text-accent rounded-2xl font-bold text-xs border border-card-border hover:bg-accent/5 transition-all"
                  >
                    <Mic size={16} />
                    New Audio Note
                  </button>
                )}
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
                    {safeArray<FolderType>(folders).slice(0, 5).map(f => (
                      <button 
                        key={f.id} 
                        onClick={() => {
                          setActiveTab('vault');
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
      <div className="flex-1 flex flex-col min-w-0 bg-app-container overflow-hidden relative">
        {/* Top Header - Reduced size and condensed content */}
        {!isJournalFullView && (
          <header className={cn(
            "hidden items-center justify-between px-3 sm:px-8 md:px-12 border-b border-card-border/30 bg-app-container/70 backdrop-blur-sm shrink-0 transition-all duration-500 gap-3",
            "min-h-24 sm:h-28"
          )}>
            <div className="flex items-center gap-3 sm:gap-8 lg:gap-12 min-w-0 flex-1">
              <div className="min-w-0">
                <h1 className={cn(
                  "font-black text-text-main tracking-tight uppercase transition-all",
                  "text-xl sm:text-3xl"
                )}>
                  Library
                </h1>
                <p className="hidden sm:block text-[10px] font-bold text-text-secondary/50 uppercase tracking-[0.2em] mt-1">Notes, audio, and journal</p>
              </div>
              <div className="flex max-w-full overflow-x-auto bg-surface-muted p-1 rounded-2xl border border-card-border/50 custom-scrollbar">
                {[
                  { label: 'Vault', value: 'vault' as const },
                  { label: 'Audio', value: 'audio' as const },
                  { label: 'Journal', value: 'journal' as const }
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => {
                      setActiveTab(tab.value);
                      setSelectedNoteId(null);
                    }}
                    className={cn(
                      "h-9 px-3 sm:px-4 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                      activeTab === tab.value ? "bg-card text-accent shadow-sm" : "text-text-secondary/45 hover:text-text-main"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-6 shrink-0">
              <div className="relative group hidden sm:block animate-in fade-in slide-in-from-right duration-500">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/40 group-focus-within:text-accent transition-colors" />
                <input
                  placeholder="Search Notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 pl-10 pr-4 w-64 bg-surface-muted border border-card-border/50 rounded-2xl text-[11px] font-bold text-text-main focus:outline-none focus:border-accent/40 focus:bg-card transition-all placeholder:text-text-secondary/30 shadow-sm"
                />
              </div>
              <button 
                onClick={() => activeTab === 'audio' ? setIsAudioModalOpen(true) : handleCreateNote(activeTab === 'journal' ? 'journal' : 'normal')}
                className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/10 hover:scale-105 transition-all md:hidden"
              >
                {activeTab === 'audio' ? <Mic size={22} /> : <Plus size={24} />}
              </button>
            </div>
          </header>
        )}

        {/* Content Section */}
        <div className={cn(
          "flex-1 overflow-y-auto custom-scrollbar transition-all duration-700",
          isJournalFullView ? "p-0" : activeTab === 'journal' ? "px-2 sm:px-4 md:px-8 py-3 sm:py-4" : "px-2 sm:px-8 md:px-12 py-5 sm:py-10"
        )}>
          {!isJournalFullView && (
            <header className="mx-auto max-w-[1600px] flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 sm:pb-8 mb-5 sm:mb-8 border-b border-card-border/30">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 min-w-0">
                <div className="min-w-0">
                  <h1 className="font-black text-text-main tracking-tight uppercase text-2xl sm:text-3xl">Library</h1>
                  <p className="text-[10px] font-bold text-text-secondary/50 uppercase tracking-[0.2em] mt-1">Notes, audio, and journal</p>
                </div>
                <div className="flex max-w-full overflow-x-auto bg-surface-muted p-1 rounded-2xl border border-card-border/50 custom-scrollbar">
                  {[
                    { label: 'Notes', value: 'vault' as const },
                    { label: 'Audio', value: 'audio' as const },
                    { label: 'Journal', value: 'journal' as const }
                  ].map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => {
                        setActiveTab(tab.value);
                        setSelectedNoteId(null);
                      }}
                      className={cn(
                        "h-9 px-3 sm:px-4 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                        activeTab === tab.value ? "bg-card text-accent shadow-sm" : "text-text-secondary/45 hover:text-text-main"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <div className="relative group hidden sm:block">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/40 group-focus-within:text-accent transition-colors" />
                  <input
                    placeholder="Search Library..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 pl-10 pr-4 w-64 max-w-[40vw] bg-surface-muted border border-card-border/50 rounded-2xl text-[11px] font-bold text-text-main focus:outline-none focus:border-accent/40 focus:bg-card transition-all placeholder:text-text-secondary/30 shadow-sm"
                  />
                </div>
                <button
                  onClick={() => activeTab === 'audio' ? setIsAudioModalOpen(true) : handleCreateNote(activeTab === 'journal' ? 'journal' : 'normal')}
                  className="h-11 px-4 rounded-2xl bg-accent text-accent-contrast shadow-lg shadow-accent/10 hover:scale-105 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  {activeTab === 'audio' ? <Mic size={18} /> : <Plus size={18} />}
                  <span className="hidden sm:inline">{activeTab === 'audio' ? 'Audio Note' : activeTab === 'journal' ? 'Journal Entry' : 'New Note'}</span>
                </button>
              </div>
            </header>
          )}
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
                isJournalFullView ? "max-w-none h-full" : activeTab === 'journal' ? "max-w-[1100px] space-y-6" : "max-w-[1600px] space-y-16"
              )}>
                {activeTab === 'vault' && (
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
                              timeFilter === t.value ? "bg-card shadow-sm text-accent" : "text-text-secondary opacity-40 hover:opacity-100"
                            )}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className={cn(
                      "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 transition-all",
                      draggingNoteId && "rounded-3xl bg-accent/5 p-2"
                    )}>
                       <FolderCard
                         folder={{ id: null, name: 'All Notes', color: 'var(--accent)' }}
                         active={!selectedFolder}
                         count={noteCounts.all}
                         dropActive={false}
                         onClick={() => setSelectedFolder(null)}
                         onDoubleClick={() => setSelectedFolder(null)}
                       />
                       <FolderCard
                         folder={{ id: UNFILED_FOLDER_ID, name: 'Unfiled', color: 'var(--surface-muted)' }}
                         active={selectedFolder === UNFILED_FOLDER_ID}
                         count={noteCounts.unfiled}
                         dropActive={dragOverFolderId === UNFILED_FOLDER_ID}
                         onClick={() => setSelectedFolder(selectedFolder === UNFILED_FOLDER_ID ? null : UNFILED_FOLDER_ID)}
                         onDoubleClick={() => setSelectedFolder(UNFILED_FOLDER_ID)}
                         onDropNote={(noteId) => handleMoveNote(noteId, null)}
                         onDragEnter={() => setDragOverFolderId(UNFILED_FOLDER_ID)}
                         onDragLeave={() => setDragOverFolderId(null)}
                       />
                       {filteredFolders.map((folder, idx) => (
                         <FolderCard 
                           key={folder.id || `folder-${idx}`} 
                          folder={folder}
                          active={selectedFolder === folder.id}
                          count={noteCounts.byFolder.get(folder.id) || 0}
                          dropActive={dragOverFolderId === folder.id}
                          onClick={() => setSelectedFolder(selectedFolder === folder.id ? null : folder.id)}
                          onDoubleClick={() => setFolderViewer(folder)}
                          onDropNote={(noteId) => handleMoveNote(noteId, folder.id)}
                          onDragEnter={() => setDragOverFolderId(folder.id)}
                          onDragLeave={() => setDragOverFolderId(null)}
                         />
                       ))}
                       <button 
                         onClick={() => setIsFolderModalOpen(true)}
                         className="min-h-24 rounded-2xl border border-dashed border-card-border hover:border-accent/40 hover:bg-accent/5 transition-all group flex items-center justify-center gap-3 px-4"
                       >
                          <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-text-secondary/40 group-hover:text-accent transition-colors shrink-0">
                             <Plus size={20} />
                          </div>
                          <div className="text-left">
                            <span className="block text-[10px] font-black uppercase tracking-widest text-text-secondary/40 group-hover:text-accent transition-colors">New Folder</span>
                            <span className="block text-[11px] text-text-secondary/45 font-medium">Organize notes</span>
                          </div>
                       </button>
                    </div>
                  </section>
                )}

                <section className={cn("space-y-8", isJournalFullView && "h-full space-y-0")}>
                   {!isJournalFullView && (
                     <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="text-xl font-black text-text-main tracking-tight uppercase">
                            {activeTab === 'vault' ? 'NOTES' : activeTab === 'audio' ? 'AUDIO NOTES' : 'JOURNAL'}
                          </h3>
                          <p className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] opacity-60">
                            {activeTab === 'vault' ? 'Normal notes and folders' : activeTab === 'audio' ? 'Recorded notes with private playback' : 'Daily writing space'}
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
                                  timeFilter === t.value ? "bg-card shadow-sm text-accent" : "text-text-secondary opacity-40 hover:opacity-100"
                                )}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                          <div className="hidden sm:flex items-center gap-1 bg-surface-muted p-1 rounded-xl border border-card-border/50">
                            <button 
                              onClick={() => setViewMode('grid')}
                              className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-card shadow-sm text-accent" : "text-text-secondary/40 hover:text-text-main")}
                            >
                              <Grid size={16} />
                            </button>
                            <button 
                              onClick={() => setViewMode('list')}
                              className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-card shadow-sm text-accent" : "text-text-secondary/40 hover:text-text-main")}
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
                        recentLibraryNotes={safeArray<Note>(notes).filter(n => libraryNoteTypes.includes(n.note_type) && !n.isDeleted).slice(0, 5)}
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
                      <div className="h-96 flex flex-col items-center justify-center bg-card rounded-[2rem] border border-card-border/50 shadow-sm">
                        <div className="w-20 h-20 rounded-3xl bg-surface-muted flex items-center justify-center mb-6 text-text-secondary/20">
                          {activeTab === 'audio' ? <Mic size={40} /> : <BookOpen size={40} />}
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary/40 mb-6">
                          {activeTab === 'audio' ? 'No audio notes yet' : 'No notes yet'}
                        </p>
                        <button 
                          onClick={() => activeTab === 'audio' ? setIsAudioModalOpen(true) : handleCreateNote('normal')}
                          className="h-11 px-8 rounded-xl border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest hover:bg-accent hover:text-white transition-all"
                        >
                          {activeTab === 'audio' ? 'Record Audio Note' : 'Create First Note'}
                        </button>
                      </div>
                    ) : (
                      <div className={cn(
                        "grid",
                        viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "grid-cols-1"
                      )}>
                        {safeArray<Note>(filteredNotes).map((note, idx) => (
                          <SafeItemBoundary key={note.id || `note-${idx}`}>
                            <NoteCard
                              note={note}
                              folders={safeArray<FolderType>(folders)}
                              folderName={note.folderId ? safeArray<FolderType>(folders).find(folder => folder.id === note.folderId)?.name : 'Unfiled'}
                              onClick={() => setSelectedNoteId(note.id)}
                              onMove={handleMoveNote}
                              onDragStart={() => setDraggingNoteId(note.id)}
                              onDragEnd={() => {
                                setDraggingNoteId(null);
                                setDragOverFolderId(null);
                              }}
                              viewMode={viewMode}
                            />
                          </SafeItemBoundary>
                        ))}
                        {viewMode === 'grid' && (
                          <button 
                            onClick={() => activeTab === 'audio' ? setIsAudioModalOpen(true) : handleCreateNote('normal')}
                            className="min-h-40 rounded-2xl border border-dashed border-card-border hover:border-accent/40 hover:bg-accent/5 transition-all group flex flex-col items-center justify-center gap-3"
                          >
                             <div className="w-12 h-12 rounded-2xl bg-surface-muted flex items-center justify-center text-text-secondary/40 group-hover:text-accent transition-colors">
                                {activeTab === 'audio' ? <Mic size={24} /> : <Plus size={24} />}
                             </div>
                             <span className="text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary/50 group-hover:text-accent transition-colors">
                              {activeTab === 'audio' ? 'Record Audio Note' : 'Add New Note'}
                             </span>
                             <span className="text-[11px] text-text-secondary/45 font-medium">
                              {activeTab === 'audio' ? 'Capture a recording' : 'Create a normal note'}
                             </span>
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
      <NewAudioNoteModal
        isOpen={isAudioModalOpen}
        selectedFolder={selectedFolder === UNFILED_FOLDER_ID ? null : selectedFolder}
        onClose={() => setIsAudioModalOpen(false)}
        onSaved={(noteId) => {
          setIsAudioModalOpen(false);
          setSelectedNoteId(noteId);
        }}
      />
      <FolderViewerModal
        folder={folderViewer}
        notes={safeArray<Note>(notes).filter(note => note.folderId === folderViewer?.id && !note.isDeleted)}
        onClose={() => setFolderViewer(null)}
        onOpenNote={(noteId) => {
          setFolderViewer(null);
          setSelectedNoteId(noteId);
        }}
        onMakePublic={async (noteIds) => {
          const ids = safeArray<string>(noteIds).length > 0 ? noteIds : safeArray<Note>(notes).filter(note => note.folderId === folderViewer?.id && !note.isDeleted).map(note => note.id);
          await Promise.all(ids.map(id => updateNote(id, { visibility: 'public' })));
          const link = `${window.location.origin}/library?folder=${folderViewer?.id || ''}`;
          await navigator.clipboard.writeText(link);
          addToast({ type: 'success', title: 'Folder link ready', description: 'Selected folder notes are public and the link was copied.' });
        }}
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
  const [pages, setPages] = useState<string[]>(safeString(entry?.content).split(JOURNAL_PAGE_BREAK));
  const [currentPage, setCurrentPage] = useState(0);
  const [title, setTitle] = useState(entry?.title || '');
  const [mood, setMood] = useState(entry?.mood || '');
  const [location, setLocation] = useState(entry?.location || '');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(entry?.updatedAt || null);
  const [isEditingLockedEntry, setIsEditingLockedEntry] = useState(false);
  const stickerInputRef = useRef<HTMLInputElement>(null);
  const content = safeArray<string>(pages)[currentPage] || '';
  const isPastEntry = isBefore(startOfDay(selectedDate), startOfDay(new Date()));
  const isLocked = isPastEntry && !isEditingLockedEntry;

  useEffect(() => {
    const nextPages = safeString(entry?.content).split(JOURNAL_PAGE_BREAK);
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
      await onSave(safeArray<string>(pages).join(JOURNAL_PAGE_BREAK), { title: title || `Journal - ${format(selectedDate, 'yyyy-MM-dd')}`, mood, location });
      setLastSaved(Date.now());
    } finally {
      setIsSaving(false);
    }
  };

  const handleDropNote = (noteContent: string) => {
      setContent(prev => prev + (prev ? '\n\n' : '') + `From Library:\n${noteContent}`);
  };

  const updateCurrentPage = (updater: string | ((value: string) => string)) => {
    setPages(prev => safeArray<string>(prev).map((page, index) => {
      if (index !== currentPage) return page;
      return typeof updater === 'function' ? updater(page) : updater;
    }));
  };
  const setContent = updateCurrentPage;

  const addNotebookPage = () => {
    if (isLocked) return;
    setPages(prev => [...safeArray<string>(prev), '']);
    setCurrentPage(pages.length);
  };

  const deleteNotebookPage = async () => {
    if (isLocked) return;
    if (!confirm(`Delete page ${currentPage + 1}?`)) return;
    const nextPages = safeArray<string>(pages).length <= 1 ? [''] : safeArray<string>(pages).filter((_, index) => index !== currentPage);
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
      fullView ? "w-full h-screen bg-app-container overflow-hidden" : "w-full max-w-none py-4"
    )}>
      {fullView && (
        <div className="h-16 flex items-center justify-between px-10 border-b border-card-border/30 bg-app-container/80 backdrop-blur-md">
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
                disabled={isLocked || (safeArray<string>(pages).length <= 1 && !safeString(content).trim())}
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
        fullView ? "h-[calc(100vh-4rem)] p-3 sm:p-6 lg:p-10 gap-4 lg:gap-10" : "flex-col lg:flex-row gap-5 lg:gap-8 items-stretch min-h-[720px] justify-center"
      )}>
        {/* Sticky Notes Sidebar in Full View */}
        {fullView && (
          <div className="w-64 shrink-0 flex flex-col gap-6 animate-in slide-in-from-left duration-700">
             <div className="space-y-1">
               <h3 className="text-xs font-black text-text-main uppercase tracking-widest">Library Stickies</h3>
               <p className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.2em] opacity-40">Drag to Journal</p>
             </div>
             <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                {safeArray<Note>(recentLibraryNotes).map((note: any) => (
                  <motion.div
                    key={note.id}
                    draggable
                    onDragStart={(e: any) => e.dataTransfer.setData('text/plain', safeString(note.content))}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-2xl bg-yellow-50 border border-yellow-200 shadow-sm cursor-grab active:cursor-grabbing group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-yellow-200 group-hover:bg-yellow-400 transition-colors" />
                    <h4 className="text-[10px] font-black text-yellow-800 uppercase tracking-tight truncate">{safeString(note.title, 'Untitled Note')}</h4>
                    <p className="text-[9px] text-yellow-700/60 line-clamp-3 mt-1 leading-relaxed">{safeString(note.content, "Empty sticky...")}</p>
                  </motion.div>
                ))}
             </div>
          </div>
        )}

        <motion.div 
          key={`journal-page-${selectedDate.toISOString()}`}
          layout
          className={cn(
            "flex-1 flex flex-col lg:flex-row gap-5 lg:gap-8 perspective-[1500px]",
            fullView ? "h-full" : "min-h-[700px]"
          )}
        >
          {/* Left Page: Daily Overview */}
          <motion.div 
            initial={{ rotateY: -10, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.8, type: 'spring' }}
            className={cn("flex-1 bg-card rounded-[1.5rem] sm:rounded-[2rem] border border-card-border/50 shadow-2xl p-4 sm:p-6 lg:p-10 flex flex-col items-center text-center space-y-5 sm:space-y-8 lg:space-y-10 origin-right relative overflow-hidden", !fullView && "lg:max-w-[360px]")}
          >
            <div className="absolute top-0 right-0 w-2 h-full bg-surface-muted/30 border-l border-card-border/10" />
            
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-4xl font-black text-text-main tracking-tight sm:tracking-tighter uppercase">{format(selectedDate, 'EEEE')}</h2>
              <p className="text-xs font-bold text-accent uppercase tracking-[0.3em] opacity-60">{format(selectedDate, 'MMMM dd, yyyy')}</p>
              {isLocked && <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/40">Locked until you click edit</p>}
            </div>

            {/* Memory / Visual Card */}
            <div 
              onClick={() => !fullView && toggleFullView()}
              className="w-full max-h-64 lg:max-h-none aspect-square rounded-[1.5rem] sm:rounded-[2rem] bg-surface-muted border-2 border-dashed border-card-border/50 flex flex-col items-center justify-center p-5 sm:p-8 group hover:bg-accent/[0.02] transition-colors relative overflow-hidden cursor-pointer"
            >
              {entry?.image_url ? (
                 <img src={entry.image_url} alt="Memory" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <>
                  <motion.div 
                    whileHover={{ rotate: 12, scale: 1.1 }}
                    className="w-16 h-16 rounded-2xl bg-app-container border border-card-border/50 flex items-center justify-center text-text-secondary/20 mb-4 shadow-sm"
                  >
                    <BookOpen size={32} />
                  </motion.div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/40">
                    Page {currentPage + 1} of {safeArray<string>(pages).length}
                  </p>
                </>
              )}
            </div>

            {/* Weekly date strip */}
            <div className="w-full space-y-4">
              <div className="flex items-center gap-4">
                 <div className="h-[1px] flex-1 bg-card-border/30" />
                 <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary/30">Week</span>
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
                        "flex flex-col items-center gap-1.5 p-2 sm:p-3 rounded-xl transition-all min-w-10 sm:min-w-[50px]",
                        isActive ? "bg-card-elevated shadow-md text-accent scale-105" : "text-text-secondary/40 hover:text-text-main hover:bg-card/70"
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
              {safeArray<string>(pages).map((_, index) => (
                <button
                  key={`journal-page-tab-${index}`}
                  onClick={() => setCurrentPage(index)}
                  className={cn(
                    "h-10 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all",
                    currentPage === index ? "bg-accent text-accent-contrast border-accent shadow-lg shadow-accent/10" : "bg-card text-text-secondary/50 border-card-border hover:border-accent/40"
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
                disabled={isLocked || (safeArray<string>(pages).length <= 1 && !safeString(content).trim())}
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
            className={cn("flex-1 bg-card rounded-[1.5rem] sm:rounded-[2rem] border border-card-border/50 shadow-2xl p-4 sm:p-6 lg:p-10 flex flex-col space-y-5 sm:space-y-8 relative origin-left overflow-hidden", !fullView && "lg:flex-[1.45]")}
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-surface-muted/30 border-r border-card-border/10" />
            <div className="absolute top-0 left-0 w-1.5 h-full bg-accent/5 rounded-l-full" />
            
            {/* Prompt Card */}
            <div className="bg-surface-muted rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-8 border border-card-border/50 space-y-3 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors" />
              <div className="flex items-center gap-3">
                <Sparkles size={14} className="text-accent" />
                <span className="text-[10px] font-black uppercase tracking-widest text-accent">Daily Reflection</span>
              </div>
              <p className="text-base sm:text-lg font-bold text-text-main leading-snug">
                {prompt}
              </p>
              <div className="pt-4 flex flex-wrap items-center gap-2">
                {STICKERS.map(sticker => (
                  <button
                    key={sticker}
                    onClick={() => addSticker(sticker)}
                    disabled={isLocked}
                    className="px-3 h-8 rounded-lg bg-app-container border border-card-border text-[9px] font-black uppercase tracking-widest text-text-secondary hover:text-accent hover:border-accent/40 transition-all"
                  >
                    {sticker}
                  </button>
                ))}
                <button
                  onClick={() => stickerInputRef.current?.click()}
                  disabled={isLocked}
                  className="px-3 h-8 rounded-lg bg-app-container border border-card-border text-[9px] font-black uppercase tracking-widest text-accent flex items-center gap-2 hover:border-accent/40 transition-all"
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
                 style={{ backgroundImage: 'linear-gradient(transparent, transparent 31px, var(--card-border) 31px)', backgroundSize: '100% 32px' }}
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
                      <span>Not saved yet</span>
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
                      Save Entry
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
    const trimmed = safeString(name).trim();
    if (!trimmed) {
      setError('Folder name is required.');
      return;
    }
    if (safeArray<FolderType>(folders).some(folder => safeString(folder.name).toLowerCase() === trimmed.toLowerCase())) {
      setError('A folder with this name already exists.');
      return;
    }
    const created = await onCreate({ name: trimmed, color });
    if (!created) setError('Could not create this folder.');
  };

  return (
    <ResponsiveModal
      open={isOpen}
      onClose={onClose}
      size="sm"
      title="New Folder"
      subtitle="Library collection"
      className="bg-card"
      contentClassName="bg-card"
      zIndexClassName="z-[230]"
    >
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
              className="w-full h-14 rounded-2xl border border-card-border bg-surface-muted/40 px-5 text-sm font-bold text-text-main outline-none focus:border-accent focus:bg-card transition-all"
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
    </ResponsiveModal>
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

class SafeItemBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('VisNova item render failed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-24 rounded-2xl border border-card-border bg-card p-4 flex items-center justify-center text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/45">Could not display this item.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

function FolderViewerModal({ folder, notes, onClose, onOpenNote, onMakePublic }: {
  folder: FolderType | null;
  notes: Note[];
  onClose: () => void;
  onOpenNote: (noteId: string) => void;
  onMakePublic: (noteIds: string[]) => Promise<void>;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    setSelectedIds([]);
  }, [folder?.id]);

  if (!folder) return null;

  const toggleSelected = (noteId: string) => {
    setSelectedIds(current => current.includes(noteId) ? current.filter(id => id !== noteId) : [...current, noteId]);
  };

  const shareFolder = async () => {
    setIsSharing(true);
    try {
      await onMakePublic(selectedIds);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <ResponsiveModal
      open={!!folder}
      onClose={onClose}
      size="lg"
      zIndexClassName="z-[240]"
      footer={(
        <>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/45 sm:mr-auto">
            {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select notes or share the whole folder'}
          </p>
          <button onClick={shareFolder} disabled={isSharing || safeArray<Note>(notes).length === 0} className="h-11 px-5 rounded-xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest disabled:opacity-50">
            {isSharing ? 'Sharing...' : 'Make Public Link'}
          </button>
        </>
      )}
    >
          <div className="p-5 border-b border-card-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Folder size={34} fill={folder.color || 'var(--accent)'} className="text-accent shrink-0" />
              <div className="min-w-0">
                <h3 className="text-lg font-black text-text-main truncate">{safeString(folder.name, 'Folder')}</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/50">{safeArray<Note>(notes).length} notes inside</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-surface-muted text-text-secondary hover:text-text-main flex items-center justify-center">
              <X size={18} />
            </button>
          </div>
          <div className="p-5 space-y-3">
            {safeArray<Note>(notes).length === 0 ? (
              <div className="h-52 rounded-2xl border border-dashed border-card-border flex items-center justify-center text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/40">No notes in this folder yet.</p>
              </div>
            ) : safeArray<Note>(notes).map(note => (
              <div key={note.id} className="rounded-2xl border border-card-border bg-card p-4 flex items-center gap-4">
                <button
                  onClick={() => toggleSelected(note.id)}
                  className={cn('w-6 h-6 rounded-lg border flex items-center justify-center shrink-0', selectedIds.includes(note.id) ? 'bg-accent border-accent text-accent-contrast' : 'border-card-border text-transparent')}
                  aria-label={`Select ${safeString(note.title, 'Untitled note')}`}
                >
                  <CheckCircle2 size={15} />
                </button>
                <button onClick={() => onOpenNote(note.id)} className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-black text-text-main truncate">{safeString(note.title, 'Untitled note')}</p>
                  <p className="text-[10px] text-text-secondary/50 truncate">{safeString(note.content, 'No content yet.')}</p>
                </button>
                <span className="text-[8px] font-black uppercase tracking-widest text-text-secondary/40">{note.visibility === 'public' ? 'Public' : 'Private'}</span>
              </div>
            ))}
          </div>
    </ResponsiveModal>
  );
}

function FolderCard({
  folder,
  active,
  count = 0,
  dropActive = false,
  onClick,
  onDoubleClick,
  onDropNote,
  onDragEnter,
  onDragLeave
}: {
  folder: any;
  active: boolean;
  count?: number;
  dropActive?: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onDropNote?: (noteId: string) => void;
  onDragEnter?: () => void;
  onDragLeave?: () => void;
}) {
  return (
    <button 
      onClick={onClick} 
      onDoubleClick={onDoubleClick}
      onDragOver={(event) => {
        if (!onDropNote) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        onDragEnter?.();
      }}
      onDragLeave={onDragLeave}
      onDrop={(event) => {
        if (!onDropNote) return;
        event.preventDefault();
        const noteId = event.dataTransfer.getData('text/plain');
        onDragLeave?.();
        if (noteId) onDropNote(noteId);
      }}
      className={cn(
        "min-h-24 rounded-2xl border px-4 py-3 transition-all group text-left flex items-center gap-3",
        active ? "border-accent/40 bg-accent/10 shadow-sm" : "border-card-border/70 bg-card hover:-translate-y-0.5 hover:border-accent/30",
        dropActive && "border-accent bg-accent/15 ring-2 ring-accent/20"
      )}
    >
      <div
        className={cn(
          "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
          active || dropActive ? "bg-accent text-accent-contrast" : "bg-surface-muted text-text-secondary/60 group-hover:text-accent"
        )}
      >
        <Folder size={20} fill={active || dropActive ? "currentColor" : (folder.color || "transparent")} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn(
          "text-sm font-black tracking-tight truncate",
          active || dropActive ? "text-accent" : "text-text-main"
        )}>
          {folder.name}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/45">
          {dropActive ? 'Drop to move here' : `${count} ${count === 1 ? 'note' : 'notes'}`}
        </p>
      </div>
    </button>
  );
}

function NewAudioNoteModal({ isOpen, selectedFolder, onClose, onSaved }: {
  isOpen: boolean;
  selectedFolder: string | null;
  onClose: () => void;
  onSaved: (noteId: string) => void;
}) {
  const { addNote, session, addToast } = useStore();
  const [title, setTitle] = useState('Audio Note');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'requesting_permission' | 'recording' | 'stopped' | 'uploading' | 'saved' | 'failed'>('idle');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return;
    return () => {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [isOpen, audioUrl]);

  const resetDraft = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl('');
    setAudioBlob(null);
    setDuration(0);
    setStatus('idle');
  };

  const startRecording = async () => {
    if (!session?.user?.id) {
      addToast({ type: 'error', title: 'Login required', description: 'Sign in to record an audio note.' });
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      addToast({ type: 'error', title: 'Recording unavailable', description: 'Audio recording is not supported in this browser.' });
      setStatus('failed');
      return;
    }

    setStatus('requesting_permission');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const chunks: BlobPart[] = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const recordedType = (recorder.mimeType || 'audio/webm').split(';')[0];
        const blob = new Blob(chunks, { type: recordedType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setDuration(Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)));
        setStatus('stopped');
      };
      recorder.start();
      setStatus('recording');
    } catch (error: any) {
      console.error('Recording failed:', error);
      setStatus('failed');
      addToast({
        type: 'error',
        title: 'Recording failed',
        description: error?.name === 'NotAllowedError'
          ? 'Microphone permission is required to record an audio note.'
          : 'Recording failed. Try again.'
      });
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
  };

  const saveAudioNote = async () => {
    if (!audioBlob) {
      addToast({ type: 'error', title: 'No recording', description: 'Record audio before saving.' });
      return;
    }
    setStatus('uploading');
    try {
      const file = new File([audioBlob], `audio-note-${Date.now()}.webm`, { type: audioBlob.type || 'audio/webm' });
      const { signedUrl, filePath } = await uploadAudioNote(file, session?.user?.id);
      const created = await addNote({
        title: safeString(title).trim() || 'Audio Note',
        content,
        note_type: 'audio',
        folderId: selectedFolder,
        audio_path: filePath,
        audio_url: signedUrl,
        audio_duration: duration,
        audio_mime_type: file.type,
        tags: []
      });
      if (!created) throw new Error('Could not create audio note.');
      setStatus('saved');
      addToast({ type: 'success', title: 'Audio note saved', description: 'Your recording is in Notes.' });
      onSaved(created.id);
      resetDraft();
    } catch (error: any) {
      console.error('Audio note save failed:', error);
      setStatus('failed');
      addToast({ type: 'error', title: 'Audio note failed', description: error.message || 'Could not save this audio note.' });
    }
  };

  if (!isOpen) return null;

  return (
    <ResponsiveModal
      open={isOpen}
      onClose={onClose}
      size="md"
      title="New Audio Note"
      subtitle="Recording and playback"
      className="bg-card"
      contentClassName="bg-card"
      zIndexClassName="z-[230]"
      footer={(
        <>
          <button onClick={onClose} className="h-11 px-5 rounded-xl bg-surface-muted text-text-secondary text-[10px] font-black uppercase tracking-widest">Cancel</button>
          <button onClick={saveAudioNote} disabled={!audioBlob || status === 'uploading'} className="h-11 px-6 rounded-xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest disabled:opacity-50">
            {status === 'uploading' ? 'Saving...' : 'Save'}
          </button>
        </>
      )}
    >
          <div className="p-6 space-y-5">
            <input
              value={title}
              onChange={event => setTitle(event.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-bg-base border border-card-border text-sm font-bold text-text-main focus:outline-none focus:border-accent"
              placeholder="Audio note title"
            />
            <textarea
              value={content}
              onChange={event => setContent(event.target.value)}
              className="w-full min-h-24 p-4 rounded-xl bg-bg-base border border-card-border text-sm text-text-secondary focus:outline-none focus:border-accent resize-none"
              placeholder="Optional description"
            />
            <div className="rounded-2xl border border-card-border bg-bg-base/40 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary/50">
                  {status === 'requesting_permission' ? 'Requesting microphone' : status === 'recording' ? 'Recording' : status === 'uploading' ? 'Uploading' : status === 'failed' ? 'Failed' : audioBlob ? 'Preview' : 'Ready'}
                </span>
                {duration > 0 && <span className="text-[10px] font-black text-accent">{duration}s</span>}
              </div>
              {audioUrl ? (
                <audio src={audioUrl} controls className="w-full" />
              ) : (
                <div className="h-20 rounded-xl border border-dashed border-card-border flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-text-secondary/40">
                  Start recording to preview audio
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                {status !== 'recording' ? (
                  <button onClick={startRecording} disabled={status === 'uploading'} className="h-11 px-5 rounded-xl bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest disabled:opacity-50">
                    {audioBlob ? 'Record Again' : 'Start Recording'}
                  </button>
                ) : (
                  <button onClick={stopRecording} className="h-11 px-5 rounded-xl bg-danger text-white text-[10px] font-black uppercase tracking-widest">
                    Stop Recording
                  </button>
                )}
                {audioBlob && (
                  <button onClick={resetDraft} disabled={status === 'uploading'} className="h-11 px-5 rounded-xl bg-surface-muted text-text-secondary text-[10px] font-black uppercase tracking-widest disabled:opacity-50">
                    Delete Draft
                  </button>
                )}
              </div>
            </div>
          </div>
    </ResponsiveModal>
  );
}

function NoteCard({
  note,
  folders,
  folderName,
  onClick,
  onMove,
  onDragStart,
  onDragEnd,
  viewMode
}: {
  note: Note;
  folders: FolderType[];
  folderName?: string;
  onClick: () => void;
  onMove: (noteId: string, folderId: string | null) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  viewMode?: 'grid' | 'list';
}) {
  if (!note?.id) return null;
  const isAudioNote = note.note_type === 'audio' || !!note.audio_path;
  const isJournalNote = note.note_type === 'journal';
  const NoteIcon = isAudioNote ? Volume2 : isJournalNote ? BookOpen : FileText;
  const [cardAudioUrl, setCardAudioUrl] = useState(note.audio_url || '');
  const dragStartedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setCardAudioUrl(note.audio_url || '');
    if (!note.audio_path) return;

    getAudioNoteUrl(note.audio_path)
      .then(url => {
        if (!cancelled && url) setCardAudioUrl(url);
      })
      .catch(error => console.error('Failed to load audio preview URL:', error));

    return () => {
      cancelled = true;
    };
  }, [note.audio_path, note.audio_url]);

  const createdOrUpdated = safeFormat(note.updatedAt || note.createdAt, 'MMM dd');
  const preview = cleanPreview(note.content);
  const noteTags = safeArray<string>(note.tags);
  const safeFolders = safeArray<FolderType>(folders);
  const sourceBadge = /youtube|youtu\.be/i.test(safeString(note.content)) || /youtube|youtu\.be/i.test(safeString(note.title)) ? 'YouTube' : null;
  const currentFolderValue = note.folderId || '';

  const handleCardClick = () => {
    if (dragStartedRef.current) return;
    onClick();
  };

  const handleMoveChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    event.stopPropagation();
    onMove(note.id, event.target.value || null);
  };

  const dragProps = {
    draggable: true,
    onDragStart: (event: React.DragEvent<HTMLDivElement>) => {
      dragStartedRef.current = true;
      event.dataTransfer.setData('text/plain', note.id);
      event.dataTransfer.effectAllowed = 'move';
      onDragStart();
    },
    onDragEnd: () => {
      onDragEnd();
      window.setTimeout(() => {
        dragStartedRef.current = false;
      }, 0);
    }
  };

  if (viewMode === 'list') {
    return (
      <div 
        {...dragProps}
        onClick={handleCardClick}
        className="group cursor-pointer rounded-2xl border border-card-border/70 bg-card hover:border-accent/35 hover:-translate-y-0.5 transition-all flex flex-col sm:flex-row sm:items-center gap-4 p-4"
      >
        <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-accent-contrast transition-all shrink-0">
          <NoteIcon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-black text-text-main group-hover:text-accent transition-colors truncate tracking-tight">{safeString(note.title, 'Untitled Note')}</h4>
          <p className="mt-1 text-[11px] text-text-secondary/65 line-clamp-1">{preview}</p>
          <p className="mt-2 text-[10px] text-text-secondary font-bold uppercase tracking-wider opacity-60">
            Updated {safeFormat(note.updatedAt || note.createdAt, 'MMM dd, h:mm a')} - {folderName || 'Unfiled'}
          </p>
          {isAudioNote && cardAudioUrl && (
            <audio
              src={cardAudioUrl}
              controls
              onClick={(event) => event.stopPropagation()}
              className="mt-2 h-8 w-full max-w-sm"
            />
          )}
        </div>
        <div className="flex items-center gap-3 sm:px-4">
           {noteTags.slice(0, 2).map((t, i) => (
             <span key={i} className="rounded-full bg-accent/10 px-2 py-1 text-[9px] font-black text-accent uppercase tracking-widest">#{t}</span>
           ))}
           <select
             value={currentFolderValue}
             onClick={(event) => event.stopPropagation()}
             onChange={handleMoveChange}
             className="h-9 rounded-xl border border-card-border bg-bg-base px-3 text-[10px] font-bold text-text-secondary outline-none"
             aria-label="Move note to folder"
           >
             <option value="">Unfiled</option>
             {safeFolders.map(folder => <option key={folder.id} value={folder.id}>{safeString(folder.name, 'Folder')}</option>)}
           </select>
        </div>
        <ChevronRight size={16} className="text-text-secondary/20 group-hover:text-accent group-hover:translate-x-1 transition-all" />
      </div>
    );
  }

  return (
    <div 
      {...dragProps}
      onClick={handleCardClick}
      className="min-h-40 rounded-2xl border border-card-border/70 bg-card p-4 hover:border-accent/35 hover:-translate-y-0.5 hover:shadow-sm transition-all group cursor-pointer flex flex-col relative overflow-hidden"
    >
       <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-accent-contrast transition-all shadow-sm shrink-0">
            <NoteIcon size={19} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-[15px] font-black text-text-main group-hover:text-accent transition-colors leading-tight tracking-tight line-clamp-1">{safeString(note.title, 'Untitled Note')}</h4>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-text-secondary/45 truncate">
              {createdOrUpdated} - {folderName || 'Unfiled'}{isAudioNote && note.audio_duration ? ` - ${formatDuration(note.audio_duration)}` : ''}
            </p>
          </div>
          <button
            type="button"
            aria-label="Note actions"
            onClick={(event) => event.stopPropagation()}
            className="w-8 h-8 rounded-xl text-text-secondary/45 hover:text-accent hover:bg-surface-muted flex items-center justify-center shrink-0"
          >
            <MoreVertical size={16} />
          </button>
       </div>

       <div className="flex-1 mt-4 space-y-3 min-w-0">
          <p className="text-[12px] text-text-secondary/75 font-medium line-clamp-2 leading-relaxed">
            {preview}
          </p>
          {isAudioNote && cardAudioUrl && (
            <div onClick={(event) => event.stopPropagation()} className="rounded-xl border border-accent/10 bg-accent/5 px-3 py-2">
              <audio src={cardAudioUrl} controls className="h-8 w-full" />
              <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-text-secondary/45">{getTranscriptLabel(note)}</p>
            </div>
          )}
       </div>

       <div className="mt-4 pt-3 border-t border-card-border/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 min-w-0">
            {sourceBadge && (
              <span className="rounded-full bg-danger/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-danger">
                {sourceBadge}
              </span>
            )}
            {noteTags.slice(0, 3).map((t, i) => (
              <span key={i} className="rounded-full bg-surface-muted px-2 py-1 text-[9px] font-black uppercase tracking-widest text-text-secondary/60 truncate max-w-20">#{t}</span>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={currentFolderValue}
              onClick={(event) => event.stopPropagation()}
              onChange={handleMoveChange}
              className="h-8 max-w-24 sm:max-w-28 rounded-lg border border-card-border bg-bg-base px-2 text-[9px] font-bold text-text-secondary outline-none"
              aria-label="Move note to folder"
            >
              <option value="">Unfiled</option>
              {safeFolders.map(folder => <option key={folder.id} value={folder.id}>{safeString(folder.name, 'Folder')}</option>)}
            </select>
            <div className="flex items-center gap-1 text-[9px] font-black text-accent uppercase tracking-widest group-hover:translate-x-1 transition-transform">
              Open <ChevronRight size={12} />
            </div>
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
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState(note.audio_url || '');
  const { deleteNote, session, addToast } = useStore();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    let cancelled = false;
    setResolvedAudioUrl(note.audio_url || '');
    if (!note.audio_path) return;

    getAudioNoteUrl(note.audio_path)
      .then(url => {
        if (!cancelled && url) setResolvedAudioUrl(url);
      })
      .catch(error => {
        console.error('Failed to refresh audio note URL:', error);
        if (!cancelled) {
          addToast({ type: 'error', title: 'Audio failed', description: 'Could not refresh this audio note link.' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [note.audio_path, note.audio_url, addToast]);

  const attachAudioFile = async (file: File) => {
    setIsAudioUploading(true);
    try {
      const { signedUrl, filePath } = await uploadAudioNote(file, session?.user?.id);
      setResolvedAudioUrl(signedUrl);
      updateNote(note.id, { audio_url: signedUrl, audio_path: filePath, audio_mime_type: file.type, note_type: 'audio' });
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
      className="fixed inset-0 z-[120] flex flex-col bg-app-container text-text-main overflow-hidden"
    >
      <div className="h-20 flex items-center justify-between px-8 border-b border-card-border/60 shrink-0 bg-app-container/95 backdrop-blur-md">
         <div className="flex items-center gap-6">
           <button onClick={onClose} className="w-10 h-10 rounded-xl bg-accent/5 text-accent flex items-center justify-center hover:bg-accent hover:text-white transition-all active:scale-90">
              <ChevronRight className="rotate-180" size={18} />
           </button>
           <div className="space-y-0.5">
             <span className="text-[10px] font-black uppercase tracking-widest text-text-secondary/45">
               {note.note_type === 'normal' ? 'Normal Note' : note.note_type === 'audio' ? 'Audio Note' : 'Journal'}
             </span>
             <p className="text-[9px] font-bold text-accent uppercase tracking-widest leading-none">Writing Space</p>
           </div>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => updateNote(note.id, { isFavorite: !note.isFavorite })}
             className={cn("w-10 h-10 rounded-xl border flex items-center justify-center transition-all", note.isFavorite ? "bg-accent/10 border-accent/30 text-accent" : "bg-transparent border-card-border text-text-secondary/45 hover:text-text-main")}
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
            <h4 className="text-xs font-black text-[#ccc] uppercase tracking-widest">{safeFormat(note.createdAt, 'EEEE, MMM dd')}</h4>
          )}

          <input
            value={note.title}
            onChange={e => updateNote(note.id, { title: e.target.value })}
            className="w-full text-4xl font-extrabold text-text-main bg-transparent border-none focus:outline-none placeholder:text-text-secondary/20 tracking-tight"
            placeholder="Document Title"
          />
          
          <textarea
            value={note.content}
            onChange={e => {
              updateNote(note.id, { content: e.target.value });
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            className="w-full text-lg text-text-secondary bg-transparent border-none focus:outline-none resize-none placeholder:text-text-secondary/20 leading-loose font-medium min-h-[60vh]"
            placeholder="Log details..."
            style={{ height: 'auto' }}
          />

          {(resolvedAudioUrl || note.audio_url) && (
            <div className="rounded-2xl border border-accent/10 bg-accent/5 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-card border border-card-border flex items-center justify-center text-accent shrink-0">
                <Volume2 size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-2">Audio Note</p>
                <audio src={resolvedAudioUrl || note.audio_url} controls className="w-full" />
              </div>
              <button
                onClick={() => {
                  setResolvedAudioUrl('');
                  updateNote(note.id, { audio_url: '', audio_path: '', audio_duration: undefined, audio_mime_type: undefined, note_type: 'normal' });
                }}
                className="h-10 px-4 rounded-xl bg-card border border-card-border text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-danger transition-colors"
              >
                Remove
              </button>
            </div>
          )}

          <div className="space-y-10 pt-16 border-t border-card-border/50">
            {(note.note_type === 'normal' || note.note_type === 'audio') && (
              <div className="flex items-center gap-3">
                <Folder size={16} className="text-accent" />
                <SelectMenu
                  value={note.folderId || ''}
                  onChange={(value) => updateNote(note.id, { folderId: value || null })}
                  options={[{ value: '', label: 'No folder' }, ...safeArray<FolderType>(folders).map(folder => ({ value: folder.id, label: safeString(folder.name, 'Folder') }))]}
                  className="w-full max-w-xs"
                  triggerClassName="h-11 rounded-xl bg-card text-xs"
                />
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-4 h-10 rounded-xl bg-card border border-card-border text-text-secondary/45">
                <Tag size={14} />
                <input 
                  placeholder="Tag" 
                  className="bg-transparent border-none focus:outline-none text-[10px] font-bold uppercase tracking-widest w-16"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim();
                      const currentTags = safeArray<string>(note.tags);
                      if (val && !currentTags.includes(val)) {
                        updateNote(note.id, { tags: [...currentTags, val] });
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
              </div>
              {safeArray<string>(note.tags).map((t, i) => (
                <div key={i} className="px-4 h-10 rounded-xl bg-accent/5 border border-accent/10 flex items-center gap-2 text-[10px] font-bold text-accent uppercase tracking-widest group">
                  # {t}
                  <button 
                    onClick={() => updateNote(note.id, { tags: safeArray<string>(note.tags).filter(tag => tag !== t) })}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all ml-1"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-text-secondary/45">
              <div className="flex items-center gap-6">
                <span>Created {safeFormat(note.createdAt, 'MMM dd, yyyy')}</span>
                <span>Type: {note.note_type === 'normal' ? 'normal note' : note.note_type === 'audio' ? 'audio note' : note.note_type}</span>
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
                    <Trash2 size={12} /> Delete Note
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function JournalTimeline({ entries, onSelect }: { entries: Note[], onSelect: (id: string) => void }) {
  const groups = safeArray<Note>(entries).reduce((acc: any, entry) => {
    let dateStr = 'History';
    const date = safeDate(entry.createdAt);
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
              {safeArray<Note>(group).map((entry: Note, entryIdx: number) => (
                <div
                  key={entry.id || `journal-${idx}-${entryIdx}`}
                  onClick={() => onSelect(entry.id)}
                  className="group cursor-pointer py-5 border-b border-card-border/60 hover:border-accent/50 transition-all flex items-center gap-6 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-accent/5 group-hover:bg-accent transition-colors" />
                  <div className="w-14 h-14 rounded-2xl bg-accent/5 flex items-center justify-center text-3xl shrink-0 group-hover:scale-110 transition-transform">
                    {entry.mood || '✍️'}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                       <h3 className="text-sm font-black text-text-main group-hover:text-accent transition-colors uppercase tracking-tight truncate">{safeString(entry.title, 'Untitled Note')}</h3>
                       <span className="text-[9px] font-bold text-text-secondary/40 uppercase tracking-widest">{safeFormat(entry.createdAt, 'h:mm a')}</span>
                    </div>
                    <p className="text-[11px] text-text-secondary/70 font-medium line-clamp-1">
                      {safeString(entry.content, 'No entry content yet.')}
                    </p>
                  </div>
                  <div className="hidden sm:flex flex-col items-end shrink-0 pl-10 border-l border-card-border/50">
                    <span className="text-[10px] font-black text-text-main uppercase tracking-widest">{safeFormat(entry.createdAt, 'MMM dd')}</span>
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
