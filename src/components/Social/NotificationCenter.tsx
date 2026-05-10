import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../store/useStore';
import { Bell, Heart, MessageCircle, UserPlus, Reply, Clock, Check, Trash2, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { safeFormat } from '../../lib/safeData';

export default function NotificationCenter({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { notifications, markNotificationRead, markAllNotificationsRead, unreadNotificationCount } = useStore();

  useEffect(() => {
    if (isOpen && unreadNotificationCount > 0) {
      const timer = window.setTimeout(() => {
        markAllNotificationsRead();
      }, 300);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, unreadNotificationCount, markAllNotificationsRead]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart size={14} className="text-danger fill-danger" />;
      case 'save': return <Check size={14} className="text-success" />;
      case 'comment': return <MessageCircle size={14} className="text-accent" />;
      case 'follow': return <UserPlus size={14} className="text-success" />;
      case 'reply': return <Reply size={14} className="text-warning" />;
      default: return <Bell size={14} className="text-text-secondary" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-overlay/20 backdrop-blur-sm z-[100]" 
          />
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className="fixed left-20 bottom-6 w-80 sm:w-96 max-h-[80vh] bg-card border border-card-border rounded-[2rem] shadow-2xl z-[101] overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-card-border flex items-center justify-between bg-surface-muted/30">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                     <Bell size={20} />
                  </div>
                  <div>
                     <h3 className="text-lg font-black text-text-main uppercase tracking-tight">Notifications</h3>
                     <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary/40">Notifications</p>
                  </div>
               </div>
               {unreadNotificationCount > 0 && (
                 <span className="px-3 py-1 rounded-full bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-widest">
                    {unreadNotificationCount} New
                 </span>
               )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2 min-h-[300px]">
              {notifications.length > 0 ? (
                notifications.map((n: any) => (
                  <button
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    className={cn(
                      "w-full p-4 rounded-[1.5rem] flex items-start gap-4 transition-all relative group",
                      n.is_read ? "opacity-60 grayscale-[0.5]" : "bg-accent/5 border border-accent/10"
                    )}
                  >
                     <div className="relative shrink-0">
                        <img 
                          src={n.actor?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${n.actor_id}`} 
                          className="w-10 h-10 rounded-xl object-cover border border-card-border"
                        />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card border-2 border-card flex items-center justify-center shadow-sm">
                           {getIcon(n.type)}
                        </div>
                     </div>
                     <div className="flex-1 text-left">
                        <p className="text-[11px] font-semibold text-text-main">
                           <span className="font-black uppercase tracking-widest mr-1">{n.actor?.display_name || 'System'}</span>
                           {n.message || n.content || 'interacted with you'}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 opacity-40">
                           <Clock size={10} />
                           <span className="text-[9px] font-bold uppercase tracking-widest">
                              {safeFormat(n.created_at, 'h:mm a')}
                           </span>
                        </div>
                     </div>
                     {!n.is_read && (
                        <div className="w-2 h-2 rounded-full bg-accent absolute top-4 right-4" />
                     )}
                  </button>
                ))
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                   <div className="w-16 h-16 rounded-[1.5rem] bg-surface-muted flex items-center justify-center mb-4 opacity-40">
                      <Zap size={24} className="text-text-secondary" />
                   </div>
                   <h4 className="text-xs font-black text-text-secondary uppercase tracking-widest">All caught up</h4>
                   <p className="text-[9px] text-text-secondary/40 mt-1 uppercase tracking-widest">No notifications yet.</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-surface-muted/30 border-t border-card-border">
               <button 
                 onClick={onClose}
                 className="w-full h-12 rounded-xl bg-card border border-card-border text-[10px] font-black uppercase tracking-widest text-text-secondary hover:text-text-main transition-colors"
               >
                  Close
               </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
