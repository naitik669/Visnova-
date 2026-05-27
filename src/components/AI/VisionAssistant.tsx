import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, CheckSquare, HelpCircle, ListChecks, Maximize2, MessageCircleQuestion, Shrink, Target, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { safeFormat, safeString } from '../../lib/safeData';

type HelpQuestion = {
  id: string;
  label: string;
  icon: typeof HelpCircle;
  kind: 'data' | 'static';
};

const questions: HelpQuestion[] = [
  { id: 'ongoing_tasks', label: 'What are my ongoing tasks?', icon: CheckSquare, kind: 'data' },
  { id: 'unchecked_tasks', label: 'Show my unchecked tasks.', icon: ListChecks, kind: 'data' },
  { id: 'visions_progress', label: 'What visions are in progress?', icon: Target, kind: 'data' },
  { id: 'recent_notes', label: 'What notes did I create recently?', icon: BookOpen, kind: 'data' },
  { id: 'create_post', label: 'How do I create a post?', icon: MessageCircleQuestion, kind: 'static' },
  { id: 'create_vision', label: 'How do I create a vision?', icon: Target, kind: 'static' },
  { id: 'vault_journal', label: 'How do I use Vault and Journal?', icon: BookOpen, kind: 'static' },
  { id: 'change_username', label: 'How do I change my username?', icon: HelpCircle, kind: 'static' },
  { id: 'focus_today', label: 'What should I focus on today?', icon: CheckSquare, kind: 'data' }
];

const staticAnswers: Record<string, string[]> = {
  create_post: ['Open Feed.', 'Use the composer at the top.', 'Add a caption, text, or image, then choose Post.'],
  create_vision: ['Open Vision.', 'Choose the create button.', 'Add a clear title and details, then save it.'],
  vault_journal: ['Vault is for notes you want to keep and organize.', 'Journal is for date-based thoughts and reflections.', 'Both save to your Notes section.'],
  change_username: ['Open Profile.', 'Choose Edit Profile.', 'Enter a lowercase username with 3-24 letters, numbers, or underscores, then save.']
};

const ASSISTANT_ENABLED = import.meta.env.VITE_ENABLE_ASSISTANT === 'true';

export default function VisionAssistant() {
  if (!ASSISTANT_ENABLED) return null;

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisionBoardOpen, setIsVisionBoardOpen] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<string>('ongoing_tasks');
  const [answerLines, setAnswerLines] = useState<string[]>(['Choose a question to get quick help.']);
  const [isLoading, setIsLoading] = useState(false);
  const { session, addToast } = useStore();

  const active = useMemo(() => questions.find(q => q.id === activeQuestion) || questions[0], [activeQuestion]);

  useEffect(() => {
    const openHelp = () => setIsOpen(true);
    window.addEventListener('open-visnova-help', openHelp);
    return () => window.removeEventListener('open-visnova-help', openHelp);
  }, []);

  useEffect(() => {
    const hideForBoard = () => {
      setIsOpen(false);
      setIsVisionBoardOpen(true);
    };
    const restoreAfterBoard = () => setIsVisionBoardOpen(false);

    window.addEventListener('visnova-vision-board-open', hideForBoard);
    window.addEventListener('visnova-vision-board-closed', restoreAfterBoard);
    return () => {
      window.removeEventListener('visnova-vision-board-open', hideForBoard);
      window.removeEventListener('visnova-vision-board-closed', restoreAfterBoard);
    };
  }, []);

  if (isVisionBoardOpen) return null;

  const requireUserId = () => {
    const userId = session?.user?.id;
    if (!userId) {
      addToast({ type: 'error', title: 'Login required', description: 'Sign in to use Help.' });
      return null;
    }
    return userId;
  };

  const showQuestion = async (question: HelpQuestion) => {
    setActiveQuestion(question.id);
    if (question.kind === 'static') {
      setAnswerLines(staticAnswers[question.id] || ['No help article found yet.']);
      return;
    }

    const userId = requireUserId();
    if (!userId) return;

    setIsLoading(true);
    try {
      if (question.id === 'recent_notes') {
        const { data, error } = await supabase
          .from('notes')
          .select('title, note_type, created_at')
          .eq('user_id', userId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(5);
        if (error) throw error;
        setAnswerLines((data || []).length
          ? data.map((note: any) => `${safeString(note.title, 'Untitled note')} - ${safeString(note.note_type, 'vault')} - ${safeFormat(note.created_at, 'MMM d, yyyy')}`)
          : ['No recent notes yet.']);
        return;
      }

      if (question.id === 'visions_progress') {
        const { data, error } = await supabase
          .from('visions')
          .select('title, progress, status')
          .eq('user_id', userId)
          .neq('status', 'completed')
          .order('updated_at', { ascending: false })
          .limit(8);
        if (error) throw error;
        setAnswerLines((data || []).length
          ? data.map((vision: any) => `${vision.title || 'Untitled vision'} - ${vision.progress || 0}% - ${vision.status || 'idea'}`)
          : ['No ongoing visions.']);
        return;
      }

      const [tasksRes, todosRes] = await Promise.all([
        supabase.from('tasks').select('text, vision_id').eq('user_id', userId).eq('completed', false).limit(10),
        supabase.from('todos').select('text').eq('user_id', userId).eq('completed', false).limit(10)
      ]);
      if (tasksRes.error) throw tasksRes.error;
      if (todosRes.error) throw todosRes.error;

      const taskLines = (tasksRes.data || []).map((task: any) => `Task: ${task.text}`);
      const todoLines = (todosRes.data || []).map((todo: any) => `Todo: ${todo.text}`);
      const combined = [...taskLines, ...todoLines];

      if (question.id === 'focus_today') {
        setAnswerLines(combined.length
          ? [`Start with: ${combined[0].replace(/^(Task|Todo):\s*/, '')}`, ...combined.slice(1, 4)]
          : ['No unchecked tasks yet. Add a small next step to one vision.']);
      } else {
        setAnswerLines(combined.length ? combined : ['No unchecked tasks yet.']);
      }
    } catch (error: any) {
      console.error('Help query failed:', error);
      setAnswerLines(['I could not load that data right now.']);
      addToast({ type: 'error', title: 'Help failed', description: error.message || 'Could not load this answer.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <motion.button
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ y: -2, scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 right-12 z-[100] hidden h-16 w-16 items-center justify-center rounded-2xl bg-accent text-accent-contrast shadow-2xl shadow-accent/30 transition-all lg:flex"
          aria-label="Open VisNova Help"
        >
          <HelpCircle size={26} />
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 80, scale: 0.96 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? '80px' : '620px',
              width: isMinimized ? '300px' : '460px'
            }}
            exit={{ opacity: 0, y: 80, scale: 0.96 }}
            className={cn(
              "fixed bottom-8 right-8 z-[200] hidden max-h-[calc(100vh-4rem)] max-w-[calc(100vw-4rem)] flex-col overflow-hidden border border-card-border bg-card shadow-2xl lg:flex",
              isMinimized ? "rounded-2xl" : "rounded-[2rem]"
            )}
          >
            <div className="flex items-center justify-between border-b border-card-border bg-surface-muted p-4 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                  <HelpCircle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-text-main tracking-tight uppercase">VisNova Help</h3>
                  <p className="text-[10px] font-bold text-text-secondary/50 tracking-[0.2em] uppercase">Quick answers</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsMinimized(!isMinimized)} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-card hover:text-text-main" aria-label={isMinimized ? 'Expand help' : 'Minimize help'}>
                  {isMinimized ? <Maximize2 size={16} /> : <Shrink size={16} />}
                </button>
                <button onClick={() => setIsOpen(false)} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-card hover:text-text-main" aria-label="Close help">
                  <X size={16} />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <div className="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-[190px_1fr]">
                <div className="flex gap-2 overflow-x-auto border-b border-card-border p-3 sm:block sm:space-y-2 sm:overflow-y-auto sm:border-b-0 sm:border-r sm:p-4">
                  {questions.map(question => (
                    <button
                      key={question.id}
                      onClick={() => showQuestion(question)}
                      className={cn(
                        "flex min-h-11 shrink-0 items-center gap-3 rounded-xl p-3 text-left text-[10px] font-black uppercase tracking-widest transition-all sm:w-full",
                        activeQuestion === question.id ? "bg-accent text-accent-contrast" : "text-text-secondary hover:bg-surface-muted hover:text-text-main"
                      )}
                    >
                      <question.icon size={14} />
                      {question.label}
                    </button>
                  ))}
                </div>

                <div className="overflow-y-auto p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <active.icon size={18} className="text-accent" />
                    <h4 className="text-sm font-black uppercase tracking-tight text-text-main">{active.label}</h4>
                  </div>

                  {isLoading ? (
                    <div className="flex items-center gap-3 text-text-secondary">
                      <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Loading...</span>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {answerLines.map((line, index) => (
                        <li key={`${line}-${index}`} className="p-4 rounded-2xl bg-surface-muted border border-card-border text-sm text-text-secondary leading-relaxed font-medium">
                          {line}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
