import { useEffect, useState } from 'react';
import { TrendingUp, Hash, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { getTrendingTopics, TrendingTopic } from '../../services/discoveryService';
import { cn } from '../../lib/utils';

interface TrendingTopicsSectionProps {
  onTopicClick?: (tag: string) => void;
  className?: string;
}

export function TrendingTopicsSection({ onTopicClick, className }: TrendingTopicsSectionProps) {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const data = await getTrendingTopics();
      setTopics(data);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="h-4 w-32 bg-surface-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-surface-muted rounded-[1.5rem] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (topics.length === 0) return null;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary/60 flex items-center gap-2">
          <TrendingUp size={12} className="text-accent" /> Trending Topics
        </h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topics.slice(0, 8).map((topic, idx) => (
          <motion.button
            key={topic.tag}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => onTopicClick?.(topic.tag)}
            className="system-card group p-5 border-accent/10 bg-accent/[0.01] hover:bg-accent/[0.03] text-left flex flex-col justify-between h-full relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 blur-2xl rounded-full -mr-12 -mt-12 group-hover:bg-accent/10 transition-colors" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 mb-2">
                <Hash size={14} className="text-accent/40" />
                <h4 className="text-sm font-bold text-text-main truncate group-hover:text-accent transition-colors">
                  {topic.tag}
                </h4>
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/40">
                {topic.postCount > 0 ? `${topic.postCount} Synchronized Posts` : 'Potential Focus Topic'}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between relative z-10">
              <div className="flex gap-3">
                {topic.likeCount > 0 && (
                  <div className="flex items-center gap-1 opacity-40">
                    <div className="w-1 h-1 rounded-full bg-text-secondary" />
                    <span className="text-[8px] font-bold text-text-secondary">{topic.likeCount}</span>
                  </div>
                )}
              </div>
              <ChevronRight size={14} className="text-text-secondary/20 group-hover:text-accent group-hover:translate-x-1 transition-all" />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
