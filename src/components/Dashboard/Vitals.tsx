import { motion } from 'motion/react';
import { Focus, Zap, Smile, Moon, Eye, Battery, Coffee, Brain, Target, Layers } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { Vitals as VitalsType } from '../../types';

export default function Vitals() {
  const { vitals, updateVitals, activities, visions, user } = useStore();

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
    { key: 'focus', label: 'Focus Force', icon: Zap, color: 'text-accent', bg: 'bg-accent/10' },
    { key: 'energy', label: 'Energy State', icon: Battery, color: 'text-warning', bg: 'bg-warning/10' },
    { key: 'alignment', label: 'Alignment', icon: Target, color: 'text-success', bg: 'bg-success/10' },
    { key: 'systemLoad', label: 'System Load', icon: Layers, color: 'text-blue-500', bg: 'bg-blue-50' },
  ] as const;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {metrics.map((m) => {
        const value = displayVitals[m.key as keyof typeof displayVitals];
        return (
          <motion.div
            key={m.key}
            whileHover={{ y: -2 }}
            className="system-card p-6 flex flex-col gap-4 relative group"
          >
            <div className="flex items-center justify-between">
              <div className={cn("p-2.5 rounded-xl bg-accent/5", m.color)}>
                <m.icon size={18} />
              </div>
              <span className="text-[10px] font-semibold text-text-secondary opacity-60 uppercase tracking-wider">{m.label}</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-text-main">{value}%</span>
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
            {m.key !== "alignment" && (
              <div className="absolute inset-0 bg-card/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    const vitalKey = m.key === "systemLoad" ? "sleep" : m.key;
                    updateVitals({ [vitalKey]: Math.max(0, value - 10) });
                  }}
                  className="p-2 hover:bg-card-border rounded-lg text-text-secondary hover:text-danger transition-colors"
                >
                  -10
                </button>
                <button
                  onClick={() => {
                    const vitalKey = m.key === "systemLoad" ? "sleep" : m.key;
                    updateVitals({ [vitalKey]: Math.min(100, value + 10) });
                  }}
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
  );
}
