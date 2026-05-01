import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Search, UserPlus, Link as LinkIcon, Mail, Shield, Check, X, ChevronRight, User } from 'lucide-react';
import { Vision } from '../../types';
import { cn } from '../../lib/utils';
import { useStore } from '../../store/useStore';

interface CollaborateModalProps {
  isOpen: boolean;
  onClose: () => void;
  vision: Vision;
}

type Role = 'Viewer' | 'Editor' | 'Manager';

export default function CollaborateModal({ isOpen, onClose, vision }: CollaborateModalProps) {
  const { circle, addToast } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('Editor');
  
  const filteredConnections = circle.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.statusNote && c.statusNote.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleInvite = (user: any) => {
    addToast({
      type: 'success',
      title: 'Invitation Sent',
      description: `Invited ${user.name} as ${selectedRole}.`
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://visnova.app/vision/${vision.id}/invite`);
    addToast({
      type: 'success',
      title: 'Link Copied',
      description: 'Invitation link copied to clipboard.'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose} 
        className="absolute inset-0 bg-overlay backdrop-blur-2xl" 
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, x: 50 }} 
        animate={{ scale: 1, opacity: 1, x: 0 }} 
        exit={{ scale: 0.9, opacity: 0, x: 50 }}
        className="relative w-full max-w-lg bg-card border border-card-border rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
      >
        <div className="p-8 border-b border-card-border bg-gradient-to-br from-accent/5 to-transparent">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                <Users size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-text-main uppercase tracking-tight">Collaborators</h3>
                <p className="text-[10px] font-black uppercase text-accent opacity-60 tracking-widest">Vision Strategy Alignment</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-text-secondary/40 hover:text-text-main transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex bg-surface-muted p-1 rounded-2xl border border-card-border">
                {(['Viewer', 'Editor', 'Manager'] as Role[]).map(role => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={cn(
                      "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      selectedRole === role ? "bg-card text-accent shadow-premium" : "text-text-secondary/40 hover:text-text-main"
                    )}
                  >
                    {role}
                  </button>
                ))}
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 min-h-[400px]">
           {/* Section: Search Internal */}
           <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary opacity-40">System Node Search</h4>
              <div className="relative group">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-40 group-focus-within:text-accent transition-colors" />
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Seach by name or neural handle..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full h-14 pl-12 pr-6 rounded-2xl bg-bg-base border border-card-border focus:outline-none focus:border-accent/40 text-sm font-bold text-text-main transition-all"
                />
              </div>

              <div className="space-y-2">
                 {filteredConnections.slice(0, 4).map(conn => (
                   <div key={conn.id} className="p-3 bg-card border border-card-border rounded-2xl flex items-center justify-between group hover:border-accent/30 transition-all">
                      <div className="flex items-center gap-3">
                         <img src={conn.avatar} className="w-10 h-10 rounded-xl object-cover grayscale group-hover:grayscale-0 transition-all" />
                         <div>
                            <p className="text-xs font-black text-text-main">{conn.name}</p>
                            <p className="text-[9px] font-bold text-text-secondary opacity-40 uppercase tracking-widest">{conn.role || 'Member'}</p>
                         </div>
                      </div>
                      <button 
                        onClick={() => handleInvite(conn)}
                        className="h-9 px-4 rounded-xl border border-card-border text-[9px] font-black uppercase tracking-widest hover:bg-accent hover:text-accent-contrast hover:border-accent transition-all"
                      >
                         Invite
                      </button>
                   </div>
                 ))}
                 {filteredConnections.length === 0 && (
                   <div className="text-center py-6 italic text-[10px] font-black opacity-30 text-text-secondary uppercase">No matching nodes found</div>
                 )}
              </div>
           </div>

           {/* Section: External */}
           <div className="space-y-4 pt-4 border-t border-card-border/50">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary opacity-40">External Protocols</h4>
              <div className="grid grid-cols-1 gap-3">
                 <button 
                   onClick={handleCopyLink}
                   className="w-full flex items-center justify-between p-5 rounded-2xl bg-bg-base border border-card-border hover:border-accent/30 transition-all group"
                 >
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-card border border-card-border flex items-center justify-center text-text-secondary group-hover:text-accent transition-colors">
                          <LinkIcon size={18} />
                       </div>
                       <div className="text-left">
                          <p className="text-xs font-black uppercase tracking-widest text-text-main">Copy Invite Link</p>
                          <p className="text-[9px] font-bold text-text-secondary opacity-40">Direct neural synchronization</p>
                       </div>
                    </div>
                    <ChevronRight size={16} className="text-text-secondary opacity-40 group-hover:translate-x-1 transition-transform" />
                 </button>

                 <button className="w-full flex items-center justify-between p-5 rounded-2xl bg-bg-base border border-card-border hover:border-accent/30 transition-all group">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-card border border-card-border flex items-center justify-center text-text-secondary group-hover:text-accent transition-colors">
                          <Mail size={18} />
                       </div>
                       <div className="text-left">
                          <p className="text-xs font-black uppercase tracking-widest text-text-main">Invite via Neural Mail</p>
                          <p className="text-[9px] font-bold text-text-secondary opacity-40">Standard transmission protocol</p>
                       </div>
                    </div>
                    <ChevronRight size={16} className="text-text-secondary opacity-40 group-hover:translate-x-1 transition-transform" />
                 </button>
              </div>
           </div>
        </div>

        <div className="p-8 bg-surface-muted border-t border-card-border flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <Shield size={20} />
           </div>
           <p className="text-[9px] font-bold text-text-secondary leading-relaxed flex-1 italic opacity-60">
              Only managers can modify strategic core elements. Editors can contribute to layers and blueprints.
           </p>
        </div>
      </motion.div>
    </div>
  );
}
