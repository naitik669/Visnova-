/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, Bot, Sparkles, Brain, Shrink, Maximize2, Terminal, Zap } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import Markdown from 'react-markdown';

export default function NeuralAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Quick Help is ready. Ask about your open tasks, active Visions, or recent notes.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const { visions, notes, todos, user } = useStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const activeVisions = visions.filter(v => v.status !== 'completed');
      const openTasks = [
        ...todos.filter(task => !task.completed),
        ...visions.flatMap(vision => (vision.tasks || []).filter(task => !task.completed).map(task => ({ ...task, visionTitle: vision.title })))
      ].slice(0, 5);
      const recentNotes = notes.filter(note => !note.isDeleted).slice(0, 4);
      const lower = userMessage.toLowerCase();
      const assistantMessage = lower.includes('task')
        ? openTasks.length
          ? `Open tasks:\n${openTasks.map((task: any) => `- ${task.text}${task.visionTitle ? ` (${task.visionTitle})` : ''}`).join('\n')}`
          : 'No open tasks found. Create one small next step from your Dashboard or Vision page.'
        : lower.includes('vision') || lower.includes('goal')
          ? activeVisions.length
            ? `Active Visions:\n${activeVisions.slice(0, 5).map(vision => `- ${vision.title} - ${vision.progress || 0}%`).join('\n')}`
            : 'No active Visions yet. Start with one goal you want to make real.'
          : lower.includes('note')
            ? recentNotes.length
              ? `Recent notes:\n${recentNotes.map(note => `- ${note.title || 'Untitled Note'}`).join('\n')}`
              : 'No notes yet. Save your first idea, plan, or resource in Notes.'
            : `Try one small action now: log proof for your most important Vision. ${user.name ? `${user.name}, ` : ''}even a short update counts.`;
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      console.error('Quick Help error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Quick Help could not read your workspace right now. Try again in a moment.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 left-8 lg:left-auto lg:right-12 z-[100] w-16 h-16 rounded-2xl bg-accent text-white shadow-2xl shadow-accent/40 flex items-center justify-center group active:scale-90 transition-all"
        >
          <div className="absolute inset-0 bg-accent rounded-2xl animate-ping opacity-20 pointer-events-none" />
          <Sparkles size={28} className="group-hover:scale-110 transition-transform" />
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9, filter: 'blur(10px)' }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1, 
              filter: 'blur(0px)',
              height: isMinimized ? '80px' : '650px',
              width: isMinimized ? '300px' : '450px'
            }}
            exit={{ opacity: 0, y: 100, scale: 0.9, filter: 'blur(10px)' }}
            className={cn(
              "fixed bottom-8 right-8 z-[200] bg-card border border-card-border shadow-2xl flex flex-col overflow-hidden max-w-[calc(100vw-4rem)] max-h-[calc(100vh-4rem)]",
              isMinimized ? "rounded-2xl" : "rounded-[2.5rem]"
            )}
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                  <Terminal size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-text-main tracking-tight uppercase">Quick Help</h3>
                  <p className="text-[10px] font-bold text-accent tracking-[0.2em] uppercase origin-left scale-90">Workspace helper</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-2 text-text-secondary hover:text-text-main transition-colors"
                >
                  {isMinimized ? <Maximize2 size={16} /> : <Shrink size={16} />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-text-secondary hover:text-text-main transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-card/50">
                  {messages.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "flex flex-col gap-2 max-w-[85%]",
                        m.role === 'user' ? "ml-auto items-end" : "items-start"
                      )}
                    >
                      <div className={cn(
                        "p-5 rounded-3xl text-sm leading-relaxed",
                        m.role === 'user' 
                          ? "bg-accent text-bg-base font-bold shadow-xl shadow-accent/10 rounded-tr-none" 
                          : "bg-white/5 border border-white/5 text-text-main rounded-tl-none"
                      )}>
                        <div className="markdown-body">
                           <Markdown>{m.content}</Markdown>
                        </div>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary/40 px-2">
                        {m.role === 'user' ? user.name : 'Strategist'}
                      </span>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      className="flex items-center gap-3 text-accent"
                    >
                      <Zap size={14} className="animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Checking workspace...</span>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-8 bg-card border-t border-white/5">
                  <form 
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex gap-4"
                  >
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about tasks, Visions, or notes..."
                        className="w-full h-14 pl-6 pr-12 rounded-2xl bg-white/5 border border-white/5 text-sm focus:outline-none focus:border-accent/40 transition-all font-medium text-text-main placeholder:text-text-secondary/30"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-text-secondary">
                        <kbd className="px-1.5 py-0.5 rounded border border-white/10 text-[9px] bg-white/5">⏎</kbd>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="w-14 h-14 rounded-2xl bg-accent text-bg-base flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-accent/20 disabled:opacity-50 disabled:grayscale"
                    >
                      <Send size={20} />
                    </button>
                  </form>
                  <p className="mt-4 text-[9px] text-center text-text-secondary/40 font-black uppercase tracking-widest">
                    Data-backed quick help. No external AI is connected here.
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
