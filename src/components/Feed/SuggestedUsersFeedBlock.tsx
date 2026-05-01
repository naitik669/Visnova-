import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, UserPlus, Check, User, ArrowRight } from 'lucide-react';
import { getSuggestedUsers, SuggestedUser } from '../../services/discoveryService';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';

export function SuggestedUsersFeedBlock() {
  const { user: currentUser, toggleFollow, followingIds } = useStore();
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!currentUser.id) return;
      setLoading(true);
      const data = await getSuggestedUsers(currentUser.id);
      setSuggestions(data);
      setLoading(false);
    };
    fetch();
  }, [currentUser.id]);

  const visibleSuggestions = suggestions.filter(s => !followingIds.includes(s.id));

  if (loading || visibleSuggestions.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="system-card p-8 bg-surface-muted/30 border-accent/10 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-3xl rounded-full -mr-32 -mt-32 pointer-events-none" />
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-accent text-accent-contrast flex items-center justify-center shadow-lg shadow-accent/20">
            <Users size={16} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text-main">Suggested users</h3>
            <p className="text-[9px] font-medium text-text-secondary opacity-60 uppercase tracking-widest mt-0.5">Based on your visionary profile</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        <AnimatePresence mode="popLayout">
          {visibleSuggestions.slice(0, 3).map((user) => (
            <SuggestedUserCard key={user.id} user={user} onFollow={() => toggleFollow(user.id)} isFollowing={followingIds.includes(user.id)} />
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-8 pt-6 border-t border-card-border/30 flex justify-center">
        <button 
          onClick={() => {
            // This would navigate to a full explore users page if it existed, 
            // for now we'll just refresh or use the store's profile view
            window.dispatchEvent(new CustomEvent('nav-explore'));
          }}
          className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-accent hover:gap-3 transition-all"
        >
          Discover more creators <ArrowRight size={12} />
        </button>
      </div>
    </motion.div>
  );
}

function SuggestedUserCard({ user, onFollow, isFollowing }: { user: SuggestedUser, onFollow: () => void, isFollowing: boolean }) {
  const { setSelectedProfileId } = useStore();
  
  return (
    <motion.div
      layout
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-card rounded-[1.5rem] p-5 border border-card-border shadow-sm group hover:border-accent/30 transition-all"
    >
      <div className="flex flex-col items-center text-center">
        <button 
          onClick={() => setSelectedProfileId(user.id)}
          className="relative mb-4 group/avatar"
        >
          <img 
            src={user.avatar_url} 
            alt={user.username} 
            className="w-16 h-16 rounded-2xl object-cover border-2 border-card-border group-hover/avatar:border-accent group-hover/avatar:scale-105 transition-all duration-500" 
          />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg bg-card border border-card-border flex items-center justify-center text-accent shadow-lg group-hover/avatar:scale-110 transition-transform">
             <User size={10} />
          </div>
        </button>

        <h4 className="text-[11px] font-black text-text-main uppercase tracking-tight truncate w-full mb-0.5 group-hover:text-accent transition-colors">
          {user.display_name}
        </h4>
        <p className="text-[9px] font-bold text-text-secondary/40 uppercase tracking-widest mb-3">
          @{user.username}
        </p>

        {user.reason && (
          <div className="px-3 py-1 rounded-full bg-surface-muted border border-card-border text-[8px] font-black uppercase tracking-tighter text-text-secondary/60 mb-5">
            {user.reason}
          </div>
        )}

        <div className="flex gap-2 w-full">
          <button
            onClick={onFollow}
            className={cn(
              "flex-1 h-9 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95",
              isFollowing 
                ? "bg-surface-muted text-text-secondary/40" 
                : "bg-accent text-accent-contrast shadow-lg shadow-accent/10 hover:shadow-accent/20"
            )}
          >
            {isFollowing ? (
              <>
                <Check size={12} /> Linked
              </>
            ) : (
              <>
                <UserPlus size={12} /> Follow
              </>
            )}
          </button>
          
          <button 
            onClick={() => setSelectedProfileId(user.id)}
            className="w-9 h-9 rounded-xl border border-card-border flex items-center justify-center text-text-secondary/40 hover:text-text-main hover:bg-surface-muted transition-all"
          >
             <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
