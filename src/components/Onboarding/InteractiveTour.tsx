import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Target, 
  Sparkles,
  Zap,
  LayoutDashboard,
  CheckCircle2,
  Activity,
  ListChecks,
  NotebookPen,
  Users,
  WalletCards,
  ShieldCheck,
  CircleDot
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';

interface TourStep {
  target: string;
  title: string;
  content: string;
  icon: React.ElementType;
  route?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: 'body',
    title: 'Welcome to VisNova',
    content: 'A short guide to the loop: choose a Vision, do one next move, log proof, and watch momentum become visible.',
    icon: Sparkles
  },
  {
    target: '#nav-dashboard',
    title: 'Command Center',
    content: 'Your Dashboard keeps today simple: active Vision, next move, and the Log Proof action.',
    icon: LayoutDashboard,
    route: '/dashboard'
  },
  {
    target: 'body',
    title: 'Log Proof',
    content: 'Tasks show intention. Proof shows what actually changed. This is the habit VisNova is built around.',
    icon: Activity,
    route: '/dashboard'
  },
  {
    target: '#nav-growth',
    title: 'Progress Pulse',
    content: 'Progress Pulse turns logs, tasks, streaks, resources, and deadlines into a visible growth layer.',
    icon: Zap,
    route: '/growth'
  },
  {
    target: '#nav-vision',
    title: 'Vision Board',
    content: 'Build a visual plan with sections, notes, tasks, resources, and proof connected to your Vision.',
    icon: Target,
    route: '/visions'
  },
  {
    target: '#nav-tasks',
    title: 'Tasks',
    content: 'Organize next moves by status, then turn finished work into progress proof.',
    icon: ListChecks,
    route: '/tasks'
  },
  {
    target: '#nav-library',
    title: 'Notes & Journal',
    content: 'Capture ideas and reflection, then connect them back to the Vision they support.',
    icon: NotebookPen,
    route: '/library'
  },
  {
    target: '#nav-circle',
    title: 'Circle Momentum',
    content: 'Accountability stays friendly: see visible momentum from your Circle without exposing private logs.',
    icon: Users,
    route: '/circle/momentum'
  },
  {
    target: '#nav-money',
    title: 'Resources & Money',
    content: 'Track what a Vision needs, save resources, and keep money goals connected to progress.',
    icon: WalletCards,
    route: '/money'
  },
  {
    target: 'body',
    title: 'Privacy Controls',
    content: 'VisNova is private by default. You choose what stays private, Circle-visible, or public.',
    icon: ShieldCheck,
    route: '/settings'
  },
  {
    target: 'body',
    title: 'You are ready',
    content: 'Start with one proof log today. Small proof, repeated, becomes the story of your growth.',
    icon: CircleDot,
    route: '/dashboard'
  }
];

export function InteractiveTour() {
  const { tutorialCompleted, completeTutorial, hasCompletedOnboarding } = useStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, position: 'bottom' });
  const location = useLocation();
  const navigate = useNavigate();
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tutorialCompleted && hasCompletedOnboarding) {
      const timer = setTimeout(() => setIsVisible(true), 900);
      return () => clearTimeout(timer);
    } else if (tutorialCompleted) {
      setIsVisible(false);
    }
  }, [tutorialCompleted, hasCompletedOnboarding]);

  // Handle step changes, navigation and scrolling
  useEffect(() => {
    if (!isVisible) return;
    
    const step = TOUR_STEPS[currentStep];
    
    if (step.route && location.pathname !== step.route) {
      navigate(step.route);
      return; 
    }

    const updateRect = () => {
      if (step.target === 'body') {
        setTargetRect(null);
        return;
      }

      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        
        // Auto-scroll to element if it's off-screen
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // If element is missing, skip to next or skip if it's a known risk
        if (currentStep > 0 && currentStep < TOUR_STEPS.length - 1) {
           console.warn(`Tutorial target ${step.target} not found, skipping step.`);
           setCurrentStep(prev => prev + 1);
        } else {
           setTargetRect(null);
        }
      }
    };

    updateRect();
    const timer = setTimeout(updateRect, 500); // Check again after route transition animations
    
    window.addEventListener('resize', updateRect);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRect);
    };
  }, [currentStep, isVisible, location.pathname, navigate]);

  // Calculate tooltip position relative to target
  useEffect(() => {
    if (!tooltipRef.current) return;

    if (!targetRect) {
      setTooltipPos({ top: 0, left: 0, position: 'center' });
      return;
    }

    const tooltip = tooltipRef.current.getBoundingClientRect();
    const padding = 24;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let strategy: 'top' | 'bottom' | 'side' | 'center' = 'bottom';
    let top = 0;
    let left = 0;

    // Center horizontally by default
    const centerX = targetRect.left + (targetRect.width / 2) - (tooltip.width / 2);
    left = Math.max(padding, Math.min(centerX, windowWidth - tooltip.width - padding));

    // Try Bottom
    if (targetRect.bottom + tooltip.height + padding < windowHeight) {
      strategy = 'bottom';
      top = targetRect.bottom + padding;
    } 
    // Try Top
    else if (targetRect.top - tooltip.height - padding > 0) {
      strategy = 'top';
      top = targetRect.top - tooltip.height - padding;
    }
    // Try Side (Right)
    else if (targetRect.right + tooltip.width + padding < windowWidth) {
      strategy = 'side';
      top = Math.max(padding, Math.min(targetRect.top, windowHeight - tooltip.height - padding));
      left = targetRect.right + padding;
    }
    // Try Side (Left)
    else if (targetRect.left - tooltip.width - padding > 0) {
      strategy = 'side';
      top = Math.max(padding, Math.min(targetRect.top, windowHeight - tooltip.height - padding));
      left = targetRect.left - tooltip.width - padding;
    }
    // Absolute Fallback: Center
    else {
      strategy = 'center';
    }

    setTooltipPos({ top, left, position: strategy });
  }, [targetRect, currentStep, isVisible]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsVisible(false);
      completeTutorial();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    completeTutorial();
  };

  if (!isVisible) return null;

  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Dim Overlay with SVG Mask for sharp highlight */}
      <div className="absolute inset-0 pointer-events-auto overflow-hidden">
        <svg className="w-full h-full">
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect 
                  x={targetRect.left - 8} 
                  y={targetRect.top - 8} 
                  width={targetRect.width + 16} 
                  height={targetRect.height + 16} 
              rx="24"
                  fill="black" 
                />
              )}
            </mask>
          </defs>
          <rect 
            width="100%" 
            height="100%" 
            fill="rgba(37, 22, 61, 0.34)"
            mask="url(#tour-mask)" 
            className="transition-all duration-500"
          />
        </svg>
      </div>

      {/* Target Highlight Border */}
      <AnimatePresence>
        {targetRect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: 1,
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="absolute rounded-[1.6rem] border border-accent/80 z-[10000] pointer-events-none shadow-[0_0_0_8px_rgba(var(--accent-rgb),0.08)]"
          >
             <motion.div 
               animate={{ opacity: [0.06, 0.12, 0.06] }}
               transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
               className="absolute inset-0 rounded-[1.5rem] bg-accent"
             />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tutorial Tooltip */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          ref={tooltipRef}
          key={currentStep}
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            top: targetRect && tooltipPos.position !== 'center' ? tooltipPos.top : '50%',
            left: targetRect && tooltipPos.position !== 'center' ? tooltipPos.left : '50%',
            x: targetRect && tooltipPos.position !== 'center' ? 0 : '-50%',
            y: targetRect && tooltipPos.position !== 'center' ? 0 : '-50%'
          }}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "w-[calc(100vw-32px)] sm:w-[420px] bg-card/95 border border-card-border p-5 sm:p-7 rounded-[2rem] shadow-2xl pointer-events-auto relative z-[10001] backdrop-blur-xl",
            targetRect && tooltipPos.position === 'center' && "fixed"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-accent/10 flex items-center justify-center text-accent shadow-inner">
                <Icon size={22} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">VisNova Tutorial</span>
                <span className="text-[10px] font-bold text-text-secondary/40 uppercase tracking-widest">
                  Step {currentStep + 1} of {TOUR_STEPS.length}
                </span>
              </div>
            </div>
            <button 
              onClick={handleSkip}
              className="group h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-text-secondary/40 hover:text-danger hover:bg-danger/5 transition-all flex items-center gap-2 border border-transparent hover:border-danger/10"
            >
              Skip
              <X size={14} />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-3 mb-7">
            <h3 className="text-2xl font-black tracking-tight text-text-main leading-tight">
              {step.title}
            </h3>
            <p className="text-sm text-text-secondary font-semibold leading-relaxed">
              {step.content}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="flex gap-1.5 mb-7">
            {TOUR_STEPS.map((_, i) => (
              <div 
                key={`tour-dot-${i}`} 
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  i === currentStep ? "bg-accent w-8" : i < currentStep ? "bg-accent/20 w-4" : "bg-card-border w-2"
                )}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div>
              {currentStep > 0 && (
                <button
                  onClick={handleBack}
                className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-text-secondary hover:text-text-main transition-colors flex items-center gap-2"
                >
                  <ChevronLeft size={16} /> Back
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleNext}
                className="px-8 py-4 bg-accent text-accent-contrast text-[10px] font-black uppercase tracking-[0.22em] rounded-2xl active:scale-[0.98] transition-all shadow-2xl shadow-accent/20 flex items-center gap-3 group"
              >
                {currentStep === TOUR_STEPS.length - 1 ? (
                  <>
                    Finish
                    <CheckCircle2 size={16} />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
