import React, { useState } from 'react';
import { Globe, Lock, Share2, Sparkles, Check } from 'lucide-react';
import { Vision } from '../../types';
import { cn } from '../../lib/utils';
import { useStore } from '../../store/useStore';
import { ResponsiveModal } from '../ui/ResponsiveModal';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  vision: Vision;
}

export default function PublishModal({ isOpen, onClose, vision }: PublishModalProps) {
  const { addToast, updateVision } = useStore();
  const [isPublic, setIsPublic] = useState(vision.isPublished || false);
  const [allowRemix, setAllowRemix] = useState(vision.publishSettings?.allowRemix ?? true);
  const [showInFeed, setShowInFeed] = useState(vision.publishSettings?.showInFeed ?? true);

  const handlePublish = () => {
    updateVision(vision.id, { 
      isPublished: isPublic,
      publishSettings: { 
        visibility: isPublic ? 'public' : 'private',
        allowComments: vision.publishSettings?.allowComments ?? true,
        allowRemix, 
        showInFeed 
      }
    });
    addToast({
      type: 'success',
      title: isPublic ? 'Vision Published' : 'Vision Privated',
      description: isPublic ? 'Your vision is now visible to the VisNova community.' : 'Your vision is now private.'
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ResponsiveModal open={isOpen} onClose={onClose} size="md" className="bg-card" contentClassName="bg-card" zIndexClassName="z-[230]">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left Preview */}
          <div className="bg-bg-base/50 p-10 flex flex-col justify-between border-r border-card-border relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12">
               <Sparkles size={120} />
            </div>
            
            <div className="space-y-6 relative z-10">
              <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center text-accent-contrast shadow-xl shadow-accent/20">
                <Globe size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-text-main tracking-tight uppercase leading-tight mb-2">{vision.title}</h3>
                <p className="text-xs text-text-secondary font-medium leading-relaxed line-clamp-3  opacity-60">
                  {vision.description || 'Vision ready to be shared with the community.'}
                </p>
              </div>
            </div>

            <div className="p-4 bg-card border border-card-border rounded-2xl">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-bold text-[10px]">PS</div>
                 <div>
                    <p className="text-[10px] font-black uppercase text-text-main">Publication Status</p>
                    <p className="text-[9px] font-bold text-text-secondary opacity-50 uppercase tracking-widest">{isPublic ? 'Live on Network' : 'Private workspace'}</p>
                 </div>
               </div>
            </div>
          </div>

          {/* Right Controls */}
          <div className="p-10 space-y-8 bg-card">
            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary opacity-40">Deployment Configuration</h4>
              
              <div className="space-y-3">
                 <button 
                   onClick={() => setIsPublic(!isPublic)}
                   className={cn(
                     "w-full p-4 rounded-2xl border transition-all flex items-center justify-between group",
                     isPublic ? "bg-accent/5 border-accent/20" : "bg-bg-base border-card-border hover:border-accent/20"
                   )}
                 >
                   <div className="flex items-center gap-4">
                     <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", isPublic ? "bg-accent text-accent-contrast" : "bg-card text-text-secondary")}>
                       {isPublic ? <Globe size={18} /> : <Lock size={18} />}
                     </div>
                     <div className="text-left">
                       <p className="text-xs font-black uppercase tracking-widest text-text-main">Visibility</p>
                       <p className="text-[10px] font-medium text-text-secondary opacity-50">{isPublic ? 'Publicly accessible' : 'Restricted access'}</p>
                     </div>
                   </div>
                   <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all", isPublic ? "bg-accent border-accent" : "border-card-border")}>
                      {isPublic && <Check size={12} className="text-accent-contrast" />}
                   </div>
                 </button>

                 <div className="space-y-2 pt-4">
                   <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/40 ml-1">Additional Protocols</p>
                   <Toggle 
                    icon={Share2} 
                    label="Remixing" 
                    desc="Allow others to fork this vision" 
                    active={allowRemix} 
                    onToggle={() => setAllowRemix(!allowRemix)} 
                   />
                   <Toggle 
                    icon={Globe} 
                    label="Discovery Feed" 
                    desc="Show in global exploration" 
                    active={showInFeed} 
                    onToggle={() => setShowInFeed(!showInFeed)} 
                   />
                 </div>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <button 
                onClick={handlePublish}
                className="w-full h-14 bg-accent text-accent-contrast font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                {isPublic ? 'Publish to Feed' : 'Update Privacy Settings'}
              </button>
              <button 
                onClick={onClose}
                className="w-full h-10 text-[10px] font-black uppercase tracking-widest text-text-secondary opacity-40 hover:opacity-100 transition-opacity"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
    </ResponsiveModal>
  );
}

function Toggle({ icon: Icon, label, desc, active, onToggle }: any) {
  return (
    <button 
      onClick={onToggle}
      className={cn(
        "w-full px-5 py-3 rounded-2xl border transition-all flex items-center justify-between group",
        active ? "bg-accent/5 border-accent/10" : "bg-bg-base border-card-border hover:border-accent/10"
      )}
    >
       <div className="flex items-center gap-4">
          <Icon size={14} className={cn("transition-colors", active ? "text-accent" : "text-text-secondary/40")} />
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-main">{label}</p>
            <p className="text-[8px] font-medium text-text-secondary opacity-50">{desc}</p>
          </div>
       </div>
       <div className={cn("w-4 h-4 rounded border transition-all flex items-center justify-center", active ? "bg-accent border-accent" : "border-card-border")}>
          {active && <Check size={10} className="text-accent-contrast" />}
       </div>
    </button>
  );
}
