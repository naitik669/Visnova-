import { motion } from 'motion/react';
import { MessageSquare, Heart, Anchor, Ghost } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../../store/useStore';

export default function Reflection() {
  const { vitals, updateVitals } = useStore();
  const currentMoodLabel = vitals.mood > 80 ? 'Transcendent' : vitals.mood > 60 ? 'Flow State' : vitals.mood > 40 ? 'Recovering' : 'High Energy';

  const moods = [
    { label: 'Transcendent', icon: Anchor, color: 'text-accent', value: 95 },
    { label: 'High Energy', icon: Heart, color: 'text-danger', value: 80 },
    { label: 'Flow State', icon: MessageSquare, color: 'text-success', value: 70 },
    { label: 'Recovering', icon: Ghost, color: 'text-text-secondary', value: 40 },
  ];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between px-4">
        <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Daily Reflection</h3>
        <span className="text-[10px] text-text-secondary opacity-50">State: {currentMoodLabel}</span>
      </div>

      <div className="system-card p-10 flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 space-y-4">
          <h4 className="text-xl font-bold tracking-tight text-text-main">How does your current state align with your ambitions?</h4>
          <p className="text-sm text-text-secondary leading-relaxed max-w-lg">
            Taking 30 seconds to acknowledge your mental state reduces physiological stress and improves focus architecture.
          </p>
          <div className="pt-4 flex flex-wrap gap-4">
            {moods.map((m) => (
              <button
                key={m.label}
                onClick={() => updateVitals({ mood: m.value })}
                className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all ${
                  vitals.mood === m.value ? 'bg-text-main text-accent-contrast border-text-main scale-105' : 'bg-card border-card-border text-text-secondary hover:border-text-main'
                }`}
              >
                <m.icon size={18} className={vitals.mood === m.value ? 'text-accent-contrast' : m.color} />
                <span className="text-xs font-bold">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="w-full md:w-64 aspect-square bg-accent-soft rounded-3xl border border-card-border flex items-center justify-center relative overflow-hidden group">
           <div className="text-center space-y-2 p-6 animate-pulse">
              <div className="w-12 h-12 bg-card rounded-full mx-auto flex items-center justify-center shadow-sm border border-card-border">
                <div className="w-6 h-6 bg-accent rounded-full animate-ping" />
              </div>
              <p className="text-[10px] uppercase font-bold text-text-secondary opacity-50 tracking-widest mt-4">Calibrating...</p>
           </div>
           <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
