/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import {
  Target,
  MessageCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Brain,
  Zap,
  Play,
  CheckCircle2,
  Users
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const CircularProgress = ({ value, color, strokeWidth = 8, size = 96, label }: { value: number, color: string, strokeWidth?: number, size?: number, label: string }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - ((isNaN(value) ? 0 : value) / 100) * circumference;

  return (
    <div className="bg-card-dark rounded-[2rem] p-6 flex flex-col items-center justify-center gap-4 shadow-sm w-full">
      <span className="text-sm font-semibold text-text-main tracking-wide">{label}</span>
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} className="rotate-[-90deg]">
          <circle
            stroke="rgba(var(--accent-rgb),0.16)"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute font-bold text-text-main text-2xl tracking-tighter">
          {Math.round(value || 0)}%
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { visions, user, circle, vitals, todos, toggleTodo, addTodo, dateNotes, setDateNote, activities } = useStore();
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  
  const [showAllCircle, setShowAllCircle] = React.useState(false);
  const [showAllTasks, setShowAllTasks] = React.useState(false);

  const activeVisions = visions.filter(v => v.status === 'in-progress');
  const allTasks = visions.flatMap(v => (v.tasks || []).map((t, idx) => ({
    ...t, 
    id: `${v.id}-${t.id || idx}`, // Ensure uniqueness when combining tasks from multiple visions
    vision: v.title, 
    visionId: v.id
  })));
  
  const pendingTasks = allTasks.filter(t => !t.completed);
  const displayedTasks = showAllTasks ? pendingTasks : pendingTasks.slice(0, 3);
  
  const displayedCircle = showAllCircle ? circle : circle.slice(0, 3);

  // Dynamic Vitals Calculation
  const now = Date.now();
  const dayStart = new Date().setHours(0, 0, 0, 0);
  
  const todayActivities = (activities || []).filter(a => a.timestamp > dayStart);
  const tasksCompletedToday = todayActivities.filter(a => a.type === 'completed').length;
  const notesAddedToday = todayActivities.filter(a => a.type === 'shared_note' || a.description.toLowerCase().includes('note')).length;

  const totalTasks = visions.reduce((acc, v) => acc + (v.tasks?.length || 0), 0);
  const completedTasks = visions.reduce((acc, v) => acc + (v.tasks?.filter(t => t.completed).length || 0), 0);
  
  // 1. Alignment: Overall completion %
  const globalProgress = totalTasks > 0 ? Math.round((completedTasks/totalTasks)*100) : 0;

  // 2. Focus Force: Derived from activity and state
  const focusForce = Math.min(100, 40 + (tasksCompletedToday * 12) + (notesAddedToday * 8) + (user.isGrinding ? 20 : 0));

  // 3. Energy State: Time-based decay + momentum
  const hoursSinceMorning = Math.max(0, (now - new Date().setHours(8, 0, 0, 0)) / (1000 * 60 * 60));
  const energyState = Math.max(15, Math.min(100, 90 - (hoursSinceMorning * 5) + (tasksCompletedToday * 3)));

  // 4. System Load: Volume of active visions
  const activeVisionsCount = (visions || []).filter(v => v.status === 'in-progress').length;
  const systemLoad = Math.min(100, activeVisionsCount * 25);

  // 5. Neural Pulse Chart Data (Last 7 Days)
  const chartData = React.useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0,0,0,0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23,59,59,999);
      
      const dayActivities = (activities || []).filter(a => a.timestamp >= d.getTime() && a.timestamp <= dayEnd.getTime());
      
      // Calculate output based on activity types
      const output = dayActivities.reduce((acc, a) => {
        if (a.type === 'completed') return acc + 10;
        if (a.type === 'created') return acc + 5;
        if (a.type === 'shared_note') return acc + 8;
        return acc + 2;
      }, 0);

      data.push({
        name: d.toLocaleDateString([], { weekday: 'short' }),
        output,
        focus: Math.min(100, 30 + (output * 0.8))
      });
    }
    return data;
  }, [activities]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20 px-4">
      {/* Header section */}
      <div className="mb-4 ml-2" id="dashboard-header">
        <h1 className="text-2xl lg:text-3xl font-display tracking-tight text-text-main uppercase font-black">
          HELLO, {(user.name || 'Visionary').split(' ')[0]}!
        </h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-6">

          {/* Top Row: Linked Teachers / Events */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Linked Circle (Teachers in the image) */}
            <div className="bg-card rounded-[2.5rem] p-6 shadow-sm flex flex-col gap-4">
              <h3 className="text-[15px] font-semibold text-text-secondary mb-2">Linked Circle</h3>
              <div className="space-y-4">
                {displayedCircle.length > 0 ? displayedCircle.map(member => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => useStore.getState().setSelectedProfileId(member.id)}>
                      <div className="relative">
                        <img src={member.avatar || undefined} alt={member.name} className="w-10 h-10 rounded-full object-cover transition-transform group-hover:scale-105" />
                        {member.isGrinding && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-card" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-main leading-tight group-hover:text-accent transition-colors">{member.name}</p>
                        <p className="text-[11px] text-text-secondary mt-0.5">{member.role || (member.isGrinding ? 'Active now' : 'Offline')}</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent cursor-pointer hover:bg-accent hover:text-accent-contrast transition-colors">
                      <MessageCircle size={14} className="fill-current bg-transparent" />
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <Users size={24} className="text-text-secondary opacity-20 mb-2" />
                    <p className="text-xs font-semibold text-text-secondary opacity-60">No connections yet.</p>
                    <p className="text-[10px] text-accent font-bold mt-1 uppercase tracking-widest cursor-pointer hover:underline">Try making new connections!</p>
                  </div>
                )}
              </div>
              {circle.length > 3 && (
                <button 
                  onClick={() => setShowAllCircle(!showAllCircle)}
                  className="text-[11px] font-semibold text-text-main text-right mt-2 hover:text-accent transition-colors flex items-center justify-end gap-1 underline underline-offset-2 opacity-60"
                >
                  {showAllCircle ? 'Show less' : 'See more'} <ChevronRight size={12} className={cn("transition-transform", showAllCircle && "rotate-90")} />
                </button>
              )}
            </div>

            {/* Upcoming Events / Tasks */}
            <div className="bg-card rounded-[2.5rem] p-6 shadow-sm flex flex-col gap-4">
              <h3 className="text-[15px] font-semibold text-text-secondary mb-2">Upcoming Tasks</h3>
              <div className={cn("space-y-3 transition-all", showAllTasks ? "max-h-[400px] overflow-y-auto custom-scrollbar pr-2" : "")}>
                {displayedTasks.length > 0 ? displayedTasks.map((task, idx) => (
                  <div key={`${task.visionId}-${task.id || idx}`} className="bg-app-container rounded-[1.5rem] p-3 flex items-center gap-4 cursor-pointer hover:bg-surface-muted transition-all group" onClick={() => useStore.getState().toggleVisionTask(task.visionId, task.id || '')}>
                    <div className={cn("w-12 h-12 bg-card rounded-[1.2rem] flex items-center justify-center shrink-0 border border-transparent group-hover:border-accent/10", task.completed ? "bg-success/10" : "")}>
                       <Zap size={20} className={cn(task.completed ? "text-success fill-success/20" : "text-accent fill-accent/20")} />
                    </div>
                    <div className="min-w-0 flex-1 relative">
                       <p className={cn("text-xs font-semibold text-text-main truncate line-clamp-2 leading-tight", task.completed && "line-through opacity-50")}>{task.text}</p>
                       <p className="text-[10px] text-text-secondary mt-1 uppercase tracking-wider">{task.vision}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-6 text-xs text-text-secondary opacity-60">No pending tasks. Great job!</div>
                )}
              </div>
              {pendingTasks.length > 3 && (
                <button 
                  onClick={() => setShowAllTasks(!showAllTasks)}
                  className="text-[11px] font-semibold text-text-main text-right mt-auto hover:text-accent transition-colors flex items-center justify-end gap-1 underline underline-offset-2 opacity-60"
                >
                   {showAllTasks ? 'Show less' : 'See more'} <ChevronRight size={12} className={cn("transition-transform", showAllTasks && "rotate-90")} />
                </button>
              )}
            </div>

          </div>

          {/* Middle Row: Schedule Log */}
          <div className="bg-card rounded-[2.5rem] p-6 shadow-sm flex flex-col md:flex-row gap-10 items-stretch">
             <div className="w-full md:w-auto bg-app-container rounded-[2rem] p-6 shrink-0 flex flex-col gap-4 min-w-[280px]">
                <div className="flex items-center justify-between px-2 text-text-main pb-2">
                   <button onClick={() => {
                     const newDate = new Date(selectedDate);
                     newDate.setMonth(newDate.getMonth() - 1);
                     setSelectedDate(newDate);
                   }} className="hover:text-accent transition-colors"><ChevronLeft size={16} /></button>
                   <span className="text-sm font-bold capitalize tracking-wide">{selectedDate.toLocaleString('default', { month: 'long', year: 'numeric'})}</span>
                   <button onClick={() => {
                     const newDate = new Date(selectedDate);
                     newDate.setMonth(newDate.getMonth() + 1);
                     setSelectedDate(newDate);
                   }} className="hover:text-accent transition-colors"><ChevronRight size={16} /></button>
                </div>
                <div className="grid grid-cols-7 gap-y-3 gap-x-2 text-center text-xs mt-2 relative">
                   {['S','M','T','W','T','F','S'].map((d,i) => <span key={`header-${i}`} className="font-semibold text-text-secondary/60 mb-2">{d}</span>)}
                   {
                     (() => {
                       const year = selectedDate.getFullYear();
                       const month = selectedDate.getMonth();
                       const firstDay = new Date(year, month, 1).getDay();
                       const daysInMonth = new Date(year, month + 1, 0).getDate();

                       const days = [];
                       for (let i = 0; i < firstDay; i++) {
                         days.push(<div key={`empty-${i}`} className="aspect-square" />);
                       }
                       for (let i = 1; i <= daysInMonth; i++) {
                         const dateObj = new Date(year, month, i);
                         const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                         const hasNotes = !!dateNotes[dateKey] && dateNotes[dateKey].length > 0;
                         const isSelected = selectedDate.getDate() === i;

                         days.push(
                           <div
                             key={i}
                             onClick={() => setSelectedDate(dateObj)}
                             className={cn(
                               "relative aspect-square flex items-center justify-center font-bold rounded-full cursor-pointer transition-all text-sm",
                               isSelected ? "bg-accent text-accent-contrast shadow-md shadow-accent/30 scale-110" : "text-text-main hover:bg-surface-muted"
                             )}
                           >
                             {i}
                             {hasNotes && !isSelected && (
                               <div className="absolute top-1 right-2 w-1.5 h-1.5 bg-accent rounded-full border border-card" />
                             )}
                           </div>
                         );
                       }
                       return days;
                     })()
                   }
                </div>
             </div>

             <div className="flex-1 flex flex-col gap-4 w-full h-full min-h-[300px]">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3 ml-2">
                      <Calendar size={18} className="text-text-secondary" />
                      <h3 className="text-[15px] font-semibold text-text-secondary">
                         Schedule & Notes
                      </h3>
                   </div>
                   <span className="text-[11px] font-bold tracking-widest uppercase text-accent bg-accent/10 px-3 py-1 rounded-full">
                      {selectedDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                   </span>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 h-full flex-1 items-start">
                   <div className="bg-app-container rounded-[2rem] p-5 w-full flex flex-col gap-3 relative overflow-hidden group border border-transparent focus-within:border-accent/20 transition-all min-h-[250px]">
                      <textarea
                        className="w-full bg-transparent resize-none outline-none text-[13px] font-medium text-text-main placeholder:text-text-secondary/40 flex-1 leading-relaxed custom-scrollbar"
                        placeholder="Add notes, log tasks, or set reminders for this specific date..."
                        value={dateNotes[`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`] || ''}
                        onChange={(e) => setDateNote(`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`, e.target.value)}
                      />
                      <div className="flex items-center justify-between flex-shrink-0 mt-2">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-text-secondary/40">
                            Auto-saved locally
                          </span>
                      </div>
                   </div>

                   <div className="w-full bg-app-container rounded-[2rem] p-5 flex flex-col gap-3 relative overflow-hidden h-auto max-h-[350px] overflow-y-auto custom-scrollbar xl:mt-8">
                       <h4 className="text-xs font-bold text-text-main uppercase tracking-wider mb-2">Deadlines & Tasks</h4>
                       <div className="flex flex-col gap-3">
                          {(() => {
                             const isPast = selectedDate < new Date(new Date().setHours(0,0,0,0));
                             const isToday = selectedDate.toDateString() === new Date().toDateString();

                             if (isToday) {
                               const todayTasks = pendingTasks.filter(t => !t.completed);
                               if (todayTasks.length === 0) {
                                 return <div className="text-[10px] text-text-secondary/40 font-medium px-2 italic">Optimal alignment. No urgent directives for today.</div>;
                               }
                               return (
                                 <div className="flex flex-col gap-2">
                                    {todayTasks.slice(0, 2).map((t) => (
                                      <div key={`cal-task-${t.id}`} className="flex items-center gap-3 bg-card p-3 rounded-[1.2rem] border border-accent/10">
                                         <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0"></span>
                                         <span className="text-xs font-semibold text-text-main truncate flex-1">{t.text}</span>
                                      </div>
                                    ))}
                                 </div>
                               );
                             }
                             return <div className="text-[10px] text-text-secondary/40 font-medium px-2 italic">Future focus window clear.</div>;
                          })()}
                       </div>

                       <button className="text-[10px] font-bold text-accent uppercase tracking-widest mt-auto border border-accent/20 rounded-full py-2 hover:bg-accent/5 transition-colors">+ Add Reminder</button>
                   </div>
                </div>
             </div>
          </div>

          {/* Bottom Row: My Projects (Visions) */}
           {/* Neural Pulse Chart Section */}
           <div className="bg-card rounded-[2.5rem] p-6 shadow-sm flex flex-col gap-6">
              <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-3">
                    <TrendingUp size={18} className="text-text-secondary" />
                    <h3 className="text-[15px] font-semibold text-text-secondary">Neural Pulse</h3>
                 </div>
                 <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest bg-accent/5 px-3 py-1 rounded-full">Weekly Output</div>
              </div>
              <div className="h-[180px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                       <defs>
                          <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                             <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--text-secondary)', opacity: 0.5 }} dy={10} />
                       <YAxis hide domain={[0, 'dataMax + 20']} />
                       <Area type="monotone" dataKey="output" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorOutput)" />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </div>

           {/* Neural Pulse Area */}
           <div className="bg-card rounded-[2.5rem] p-6 shadow-sm flex flex-col gap-6">
            <h3 className="text-[15px] font-semibold text-text-secondary ml-2">My projects</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               {activeVisions.length > 0 ? activeVisions.slice(0, 2).map((vision, i) => (
                 <div key={vision.id} className="relative h-[180px] rounded-[2rem] overflow-hidden group cursor-pointer">
                    <img
                      src={`https://images.unsplash.com/photo-${i % 2 === 0 ? '1542626990-ce4cb81bcf76?q=80&w=600' : '1519389953810-c5eaa819266a?q=80&w=600'}`}
                      alt="Vision Background"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-overlay group-hover:bg-overlay/80 transition-colors" />
                    <div className="absolute bottom-0 left-0 p-5 text-accent-contrast z-10 w-full bg-gradient-to-t from-overlay to-transparent pt-12">
                       <h4 className="font-semibold text-[15px] truncate tracking-wide">{vision.title}</h4>
                       <div className="w-full bg-accent-contrast/30 h-1.5 rounded-full mt-3 overflow-hidden">
                          <div className="bg-accent-contrast h-full transition-all" style={{ width: `${vision.progress || 0}%` }} />
                       </div>
                    </div>
                 </div>
               )) : (
                 <div className="col-span-2 h-[180px] rounded-[2rem] border-2 border-dashed border-card-border flex items-center justify-center text-text-secondary opacity-60">
                    Create a Vision to see it here.
                 </div>
               )}
            </div>
          </div>

        </div>

        {/* Right Sidebar stats panel */}
        <div className="w-full lg:w-[300px] shrink-0 bg-card rounded-[2.5rem] p-6 flex flex-col shadow-sm relative pt-8">
           <div className="flex flex-col gap-4">
             <CircularProgress value={focusForce} color="#FF6A88" label="Focus Force" />
             <CircularProgress value={globalProgress} color="#5BDABA" label="Alignment" />
             <CircularProgress value={energyState} color="#FFBB5C" label="Energy State" />
             <CircularProgress value={systemLoad} color="#FACD4C" label="System Load" />
           </div>

           <div className="mt-10 flex flex-col gap-4 w-full flex-1">
             <div className="flex items-center justify-between pb-2 border-b border-card-border/60">
               <h3 className="text-[14px] font-bold text-text-main">To-Do List</h3>
               <span className="text-[10px] uppercase tracking-wider text-text-secondary/60 font-bold">{todos.filter(t => !t.completed).length} pending</span>
             </div>

             <div className="flex flex-col gap-1.5 flex-1 min-h-[200px] overflow-y-auto custom-scrollbar">
               {todos.map(todo => (
                 <div key={todo.id} className="flex items-start gap-3 hover:bg-surface-muted p-2 rounded-xl transition-colors cursor-pointer group" onClick={() => toggleTodo(todo.id)}>
                    <div className={cn("w-4 h-4 mt-0.5 rounded-md border flex items-center justify-center shrink-0 transition-colors", todo.completed ? "bg-success border-success text-accent-contrast" : "border-text-secondary/40 group-hover:border-accent")}>
                      {todo.completed && <CheckCircle2 size={10} />}
                    </div>
                    <span className={cn("text-[13px] font-medium flex-1", todo.completed ? "text-text-secondary line-through opacity-60" : "text-text-main", "leading-tight")}>{todo.text}</span>
                 </div>
               ))}
               {todos.length === 0 && (
                  <div className="text-center py-6 text-[11px] text-text-secondary opacity-60">
                     No tasks. Press Enter below to add one.
                  </div>
               )}
             </div>

             <div className="mt-auto pt-4 relative">
                 <input
                     type="text"
                     placeholder="Add new task..."
                     className="w-full bg-app-container border-2 border-transparent hover:border-card-border rounded-xl px-4 py-3 text-sm font-medium focus:ring-0 focus:border-accent outline-none text-text-main placeholder:text-text-secondary/40 transition-all shadow-sm"
                     onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                           addTodo(e.currentTarget.value.trim());
                           e.currentTarget.value = '';
                        }
                     }}
                 />
                 <Zap size={14} className="absolute right-4 top-1/2 mt-1 -translate-y-1/2 text-accent/40" />
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}
