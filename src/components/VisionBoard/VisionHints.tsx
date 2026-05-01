import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, MousePointer2, Plus, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function VisionHints() {
  const [currentHint, setCurrentHint] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const hints = [
    {
      title: "Navigation",
      text: "Use mouse wheel to zoom. Right-click or Space to pan around your infinite canvas.",
      icon: MousePointer2
    },
    {
      title: "Add Elements",
      text: "Click the '+' button at the bottom to inject images, notes, or strategic markers.",
      icon: Plus
    },
    {
      title: "Convergence",
      text: "Track your progress via the convergence bar in the header as you complete milestones.",
      icon: Sparkles
    }
  ];

  useEffect(() => {
    if (currentHint >= hints.length) {
      setIsVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setCurrentHint(h => h + 1);
    }, 6000);

    return () => clearTimeout(timer);
  }, [currentHint]);

  return (
    <AnimatePresence>
      {isVisible && currentHint < hints.length && (
        <motion.div
          initial={{ opacity: 0, x: -20, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed bottom-32 left-10 z-[60] w-72 bg-accent text-accent-contrast p-6 rounded-[2rem] shadow-2xl shadow-accent/40 border border-accent-light/20"
        >
          <div className="flex items-start gap-4">
             <div className="w-10 h-10 rounded-xl bg-accent-contrast/10 flex items-center justify-center shrink-0">
                {React.createElement(hints[currentHint].icon, { size: 20 })}
             </div>
             <div className="space-y-1">
                <div className="flex items-center justify-between">
                   <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">System Hint {currentHint + 1}</h4>
                   <button onClick={() => setIsVisible(false)} className="opacity-40 hover:opacity-100 transition-opacity"><X size={12} /></button>
                </div>
                <h3 className="text-sm font-bold leading-tight">{hints[currentHint].title}</h3>
                <p className="text-[11px] font-medium leading-relaxed opacity-70">{hints[currentHint].text}</p>
             </div>
          </div>
          <div className="mt-4 flex gap-1">
             {hints.map((_, i) => (
               <div 
                key={i} 
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  i === currentHint ? "w-8 bg-accent-contrast" : "w-1 bg-accent-contrast/20"
                )} 
               />
             ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function X({ size, className }: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}
