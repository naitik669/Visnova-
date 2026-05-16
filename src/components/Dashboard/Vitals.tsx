import { motion } from 'motion/react';
import { Focus, Zap, Smile, Moon, Eye, Battery, Coffee, Brain, Target, Layers, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { Vitals as VitalsType } from '../../types';

export default function Vitals() {
  const { vitals, updateVitals, activities, visions, user } = useStore();
  const [editingVital, setEditingVital] = useState<'focus' | 'energy' | 'systemLoad' | null>(null);

  const now = Date.now();
  const dayStart = new Date().setHours(0, 0, 0, 0);
  const todayActivities = (activities || []).filter(a => a.timestamp > dayStart);
  const tasksCompletedToday = todayActivities.filter(a => a.type === 'completed').length;
  const notesAddedToday = todayActivities.filter(a => a.type === 'shared_note' || a.description.toLowerCase().includes('note')).length;

  const totalTasks = visions.reduce((acc, v) => acc + (v.tasks?.length || 0), 0);
  const completedTasks = visions.reduce((acc, v) => acc + (v.tasks?.filter(t => t.completed).length || 0), 0);
  
  const activeVisionsCount = (visions || []).filter(v => v.status === 'in-progress').length;

  // Use vitals from store to ensure manual adjustments are persisted
  const displayVitals = {
    focus: vitals.focus,
    energy: vitals.energy,
    alignment: totalTasks > 0 ? Math.round((completedTasks/totalTasks)*100) : 0,
    systemLoad: vitals.sleep // Mapping sleep to systemLoad or vice versa for consistency
  };

  const metrics = [
    { key: 'focus', label: 'Focus Force', icon: Zap, color: 'text-accent', bg: 'bg-accent/10', title: 'How focused do you feel today?' },
    { key: 'energy', label: 'Energy State', icon: Battery, color: 'text-warning', bg: 'bg-warning/10', title: 'Your physical and mental energy level' },
    { key: 'alignment', label: 'Alignment', icon: Target, color: 'text-success', bg: 'bg-success/10', title: 'Calculated from your task completion rate' },
    { key: 'systemLoad', label: 'System Load', icon: Layers, color: 'text-blue-500', bg: 'bg-blue-50', title: 'Your perceived mental workload' },
  ] as const;

  const adjustVital = (key: 'focus' | 'energy' | 'systemLoad', value: number, delta: number) => {
    const vitalKey = key === 'systemLoad' ? 'sleep' : key;
    updateVitals({ [vitalKey]: Math.max(0, Math.min(100, value + delta)) });
  };

  return (
    <div className="space-y-4">
      {vitals.focus === 0 && vitals.energy === 0 && (
        <div className="rounded-[1.5rem] border border-accent/25 bg-accent/[0.04] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black text-text-main">Set your vitals for today</p>
              <p className="text-xs font-semibold text-text-secondary">Track how you feel before you start building.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['focus', 'energy', 'systemLoad'] as const).map(key => (
                <button
                  key={key}
                  onClick={() => setEditingVital(key)}
                  className="h-9 rounded-xl border border-card-border bg-card px-3 text-[9px] font-black uppercase tracking-widest text-text-secondary hover:text-accent"
                >
                  {key === 'systemLoad' ? 'Track Sleep' : `Track ${key}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {metrics.map((m) => {
          const value = displayVitals[m.key as keyof typeof displayVitals];
          const editable = m.key !== 'alignment';
          return (
            <motion.div
              key={m.key}
              whileHover={{ y: -2 }}
              title={m.title}
              className="system-card p-6 flex flex-col gap-4 relative"
            >
            <div className="flex items-center justify-between">
              <div className={cn("p-2.5 rounded-xl bg-accent/5", m.color)}>
                <m.icon size={18} />
              </div>
              <span className="text-[10px] font-semibold text-text-secondary opacity-60 uppercase tracking-wider">{m.label}</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <span className="flex items-center gap-2 text-2xl font-bold text-text-main">
                  {value}%
                  {editable && (
                    <button
                      type="button"
                      onClick={() => setEditingVital(editingVital === m.key ? null : m.key)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-card-border bg-card text-text-secondary hover:text-accent"
                      aria-label={`Edit ${m.label}`}
                    >
                      <Pencil size={12} />
                    </button>
                  )}
                </span>
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={`vital-dot-${m.key}-${i}`}
                      className={cn(
                        "w-1 h-3 rounded-full transition-colors",
                        value > (i * 25) ? "bg-accent" : "bg-card-border"
                      )}
                    />
                  ))}
                </div>
              </div>
              <div className="h-1 bg-card-border rounded-full overflow-hidden">
                <motion.div
                   initial={{ width: 0 }}
                   animate={{ width: `${value}%` }}
                   className={cn("h-full rounded-full transition-all duration-1000 bg-accent")}
                />
              </div>
            </div>

            {/* Micro Interaction: Quick Update */}
            {editable && editingVital === m.key && (
              <div className="absolute inset-0 bg-card/95 backdrop-blur-sm transition-opacity flex items-center justify-center gap-3 rounded-[inherit]">
                <button
                  onClick={() => adjustVital(m.key, value, -10)}
                  className="p-2 hover:bg-card-border rounded-lg text-text-secondary hover:text-danger transition-colors"
                >
                  -10
                </button>
                <button
                  onClick={() => adjustVital(m.key, value, 10)}
                  className="p-2 hover:bg-card-border rounded-lg text-text-secondary hover:text-success transition-colors"
                >
                  +10
                </button>
              </div>
            )}
          </motion.div>
          );
        })}
      </div>
    </div>
  );
}
