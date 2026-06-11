import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Eye,
  Flame,
  LayoutDashboard,
  ListChecks,
  Menu,
  NotebookPen,
  Palette,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
  Zap,
  type LucideIcon
} from 'lucide-react';
import { BrandLogo } from '../BrandLogo';
import { cn } from '../../lib/utils';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

type SuiteKey = 'visions' | 'tasks' | 'proof' | 'journal' | 'board' | 'circle';

const navLinks = [
  ['Product', 'product'],
  ['Use Cases', 'use-cases'],
  ['How it Works', 'how'],
  ['Plans', 'plans'],
  ['Resources', 'footer'],
] as const;

const productSuite: Record<SuiteKey, {
  label: string;
  title: string;
  copy: string;
  icon: LucideIcon;
  points: string[];
  accent: string;
}> = {
  visions: {
    label: 'Visions',
    title: 'Define what you are building toward.',
    copy: 'Set a long-term direction, choose privacy, and keep tasks, boards, journals, and proof connected to the same goal.',
    icon: Target,
    points: ['Private by default', 'Linked tasks', 'Milestones and deadlines'],
    accent: '#6D5DF6',
  },
  tasks: {
    label: 'Tasks',
    title: 'Turn big goals into next actions.',
    copy: 'Plan small moves for today, move work through statuses, and turn completed work into progress proof.',
    icon: ListChecks,
    points: ['Today focus', 'Proof-needed status', 'Vision-linked work'],
    accent: '#28B98E',
  },
  proof: {
    label: 'Proof Logs',
    title: 'Record what you actually did.',
    copy: 'Log a short update, link it to a Vision, choose visibility, and build a timeline of real movement.',
    icon: CheckCircle2,
    points: ['Private, Circle, or Public', 'Proof attachments', 'Progress timeline'],
    accent: '#8B7CFF',
  },
  journal: {
    label: 'Journal',
    title: 'Reflect privately and stay self-aware.',
    copy: 'Capture thoughts, decisions, lessons, and messy ambition without forcing everything into the public feed.',
    icon: NotebookPen,
    points: ['Private reflections', 'Notes and audio', 'Connected context'],
    accent: '#D185FF',
  },
  board: {
    label: 'Vision Board',
    title: 'Visualize the direction you are building.',
    copy: 'Bring inspirations, goals, tasks, resources, proof cards, and deadlines into one structured visual board.',
    icon: Palette,
    points: ['Classic templates', 'Sticky notes and images', 'Progress proof cards'],
    accent: '#FF9D42',
  },
  circle: {
    label: 'Circle',
    title: 'Stay accountable with people who care.',
    copy: 'Share only what you choose, follow Circle Momentum, and get encouragement without a toxic leaderboard.',
    icon: Users,
    points: ['Circle visibility', 'Momentum preview', 'Gentle accountability'],
    accent: '#4A8CFF',
  },
};

const useCases = [
  {
    icon: BookOpen,
    title: 'Students',
    pain: 'Study plans, routines, and skills scatter across apps.',
    workflow: 'Create a study Vision, add weekly actions, and log proof after focused sessions.',
    features: ['Tasks', 'Journal', 'Progress Pulse'],
  },
  {
    icon: Sparkles,
    title: 'Creators',
    pain: 'Ideas pile up, but consistency gets hard to see.',
    workflow: 'Plan content, build a visual board, and log proof after drafts, edits, and posts.',
    features: ['Vision Board', 'Proof Logs', 'Circle'],
  },
  {
    icon: Zap,
    title: 'Builders / Founders',
    pain: 'Launch work moves fast and progress gets buried.',
    workflow: 'Track MVP tasks, beta fixes, feedback, resources, and visible product momentum.',
    features: ['Tasks', 'Proof Logs', 'Resources'],
  },
  {
    icon: CalendarDays,
    title: 'Freelancers',
    pain: 'Client work, portfolios, and money goals need one place.',
    workflow: 'Link tasks and notes to client Visions, then turn finished work into proof.',
    features: ['Notes', 'Tasks', 'Money Goals'],
  },
  {
    icon: Flame,
    title: 'Personal Growth',
    pain: 'Habits restart often because progress feels invisible.',
    workflow: 'Pick one lifestyle Vision, log daily proof, and review your growth without shame.',
    features: ['Progress Pulse', 'Journal', 'Private Logs'],
  },
];

const processSteps = [
  { icon: Target, title: 'Clarify your Vision', copy: 'Name the direction and choose what stays private.' },
  { icon: ListChecks, title: 'Plan your Actions', copy: 'Break it into today-sized moves and linked tasks.' },
  { icon: CheckCircle2, title: 'Log Proof & Grow', copy: 'Record what changed and watch momentum build.' },
];

const benefits = [
  { icon: LayoutDashboard, title: 'Clearer system', copy: 'Bring goals, actions, notes, journals, boards, resources, and proof into one focused workspace.' },
  { icon: TrendingUp, title: 'Faster goal-to-action planning', copy: 'Move from idea to next step without losing the thread of why it matters.' },
  { icon: Eye, title: 'More visible progress', copy: 'See what changed over time, not just what was planned on a to-do list.' },
  { icon: ShieldCheck, title: 'Accountability that fits', copy: 'Use private, Circle, or public visibility depending on your comfort.' },
];

const plans = [
  ['Freemium', 'Start your growth system.', 'Create Visions, plan tasks, log proof, and use the core workspace.'],
  ['Platinum', 'Unlock the full personal operating system.', 'More boards, richer progress views, resources, and advanced organization.'],
  ['Nova Elite', 'Advanced builder tools for deeper momentum.', 'AI, collaboration, exports, and power features planned after beta.'],
] as const;

const footerColumns = [
  ['Product', ['Features', 'Vision Board', 'Progress Pulse', 'Journal', 'Circle']],
  ['Use Cases', ['Students', 'Creators', 'Builders', 'Freelancers']],
  ['Company', ['About', 'Contact', 'Feedback']],
  ['Legal', ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Data Rights']],
  ['Resources', ['Blog', 'Guides', 'Roadmap']],
] as const;

function markLandingSeen() {
  localStorage.setItem('visnova_landing_seen', 'true');
}

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function OpeningAnimation({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-[#FBFAFF]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: '-8%', filter: 'blur(12px)' }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#EEE8FF] blur-3xl"
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.9 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          <motion.div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#DCD4FF] to-transparent"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#DCD4FF] to-transparent"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
          />

          <div className="relative z-10 w-full max-w-xl px-6 text-center">
            <motion.div
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-white shadow-[0_24px_70px_rgba(109,93,246,0.18)]"
              initial={{ opacity: 0, scale: 0.78, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 190, damping: 16 }}
            >
              <BrandLogo className="h-14 w-14" />
            </motion.div>

            <motion.p
              className="mt-8 text-xs font-black uppercase tracking-[0.34em] text-[#6D5DF6]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.45 }}
            >
              VisNova
            </motion.p>
            <motion.h2
              className="mt-4 text-4xl font-black tracking-[-0.06em] text-[#12122B] sm:text-5xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.34, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              Visible progress starts here.
            </motion.h2>

            <div className="mx-auto mt-8 grid max-w-md grid-cols-3 gap-3">
              {['Vision', 'Proof', 'Progress'].map((label, index) => (
                <motion.div
                  key={label}
                  className="rounded-2xl border border-[#E6E8F2] bg-white px-3 py-3 text-sm font-black text-[#25163D] shadow-[0_16px_44px_rgba(32,30,70,0.06)]"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.48 + index * 0.12, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  {label}
                </motion.div>
              ))}
            </div>

            <div className="mx-auto mt-9 h-2 max-w-sm overflow-hidden rounded-full bg-[#E9E4FF]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#6D5DF6] to-[#A694FF]"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ delay: 0.35, duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SectionHeader({ kicker, title, copy, align = 'center' }: { kicker?: string; title: string; copy: string; align?: 'center' | 'left' }) {
  return (
    <Reveal className={cn('max-w-3xl', align === 'center' ? 'mx-auto text-center' : 'text-left')}>
      {kicker && <p className="text-xs font-black uppercase tracking-[0.22em] text-[#6D5DF6]">{kicker}</p>}
      <h2 className="mt-4 text-4xl font-black tracking-[-0.055em] text-[#12122B] sm:text-5xl">{title}</h2>
      <p className="mt-5 text-base font-semibold leading-8 text-[#66708A] sm:text-lg">{copy}</p>
    </Reveal>
  );
}

function HeroMockup() {
  return (
    <Reveal className="relative mx-auto mt-16 max-w-6xl">
      <motion.div
        aria-hidden="true"
        className="absolute -left-10 top-20 hidden h-56 w-56 rounded-full border border-[#DCD4FF] lg:block"
        animate={{ rotate: 360 }}
        transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute -right-12 top-0 hidden h-52 w-52 rounded-full border border-[#E7E1FF] lg:block"
        animate={{ rotate: -360 }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      />

      <motion.div
        className="relative overflow-hidden rounded-[2rem] border border-[#E7E1FF] bg-[#F7F3FF] p-3 shadow-[0_38px_130px_rgba(78,58,144,0.18)] sm:p-5"
        whileHover={{ y: -7, scale: 1.006 }}
        transition={{ type: 'spring', stiffness: 170, damping: 22 }}
      >
        <div className="grid min-h-[520px] overflow-hidden rounded-[1.6rem] bg-[#FBFAFF] lg:grid-cols-[72px_1fr_350px]">
          <aside className="hidden border-r border-[#E8E1FF] bg-[#F0E9FA] py-6 lg:flex lg:flex-col lg:items-center lg:justify-between">
            <div className="flex flex-col items-center gap-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E5DFFF]">
                <span className="h-3 w-3 rounded-full bg-[#6D5DF6]" />
              </span>
              {[LayoutDashboard, Target, ListChecks, BarChart3, BookOpen, Users].map((Icon, index) => (
                <span key={index} className={cn('flex h-10 w-10 items-center justify-center rounded-2xl text-[#9B88A6]', index === 0 && 'bg-[#6D5DF6] text-white')}>
                  <Icon className="h-5 w-5" />
                </span>
              ))}
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25163D] text-white">
              <Zap className="h-5 w-5" />
            </span>
          </aside>

          <div className="p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.32em] text-[#9B8CFF]">Command Center</p>
                <h3 className="mt-2 text-4xl font-black tracking-[-0.06em] text-[#111126] sm:text-5xl">Launch Beta</h3>
              </div>
              <button className="rounded-2xl bg-[#6D5DF6] px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-[0_16px_34px_rgba(109,93,246,0.25)]">
                + Log Proof
              </button>
            </div>

            <div className="mt-8 grid gap-5 xl:grid-cols-[1fr_240px]">
              <div className="rounded-[1.8rem] border border-[#E6DFFF] bg-white p-6 shadow-[0_16px_55px_rgba(109,93,246,0.08)]">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#6D5DF6]">Today's Focus</p>
                <h4 className="mt-3 text-2xl font-black text-[#111126]">Finish onboarding polish</h4>
                <p className="mt-3 text-sm font-semibold leading-6 text-[#66708A]">Make the setup flow clear, then log one proof update for the beta timeline.</p>
                <div className="mt-6 rounded-[1.25rem] bg-[#F4F1FF] p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#6D5DF6] text-white"><CheckCircle2 className="h-5 w-5" /></span>
                    <div>
                      <p className="text-sm font-black text-[#111126]">Proof needed</p>
                      <p className="text-xs font-bold text-[#66708A]">Updated hero, CTA, and signup path</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.8rem] bg-[#F0ECFF] p-6 text-center">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#66708A]">Progress Pulse</p>
                <p className="mt-5 text-5xl font-black text-[#6D5DF6]">72%</p>
                <div className="mt-5 h-3 rounded-full bg-[#DDD6FF]">
                  <motion.div className="h-full rounded-full bg-[#6D5DF6]" initial={{ width: 0 }} whileInView={{ width: '72%' }} viewport={{ once: true }} transition={{ duration: 1 }} />
                </div>
                <p className="mt-5 text-sm font-black text-[#66708A]">5 proof logs this week</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {[
                ['Vision Board', '8 cards placed', Palette],
                ['Tasks', '4 next moves', ListChecks],
                ['Journal', '2 reflections', NotebookPen],
              ].map(([label, value, Icon]) => (
                <div key={label as string} className="rounded-[1.3rem] border border-[#E8E1FF] bg-white/80 p-5">
                  <Icon className="h-5 w-5 text-[#6D5DF6]" />
                  <p className="mt-4 text-lg font-black text-[#111126]">{label as string}</p>
                  <p className="mt-1 text-sm font-bold text-[#66708A]">{value as string}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#E8E1FF] bg-white/78 p-5 sm:p-8 lg:border-l lg:border-t-0">
            <div className="rounded-[1.8rem] border border-[#E6DFFF] bg-white p-6 shadow-[0_14px_48px_rgba(109,93,246,0.08)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#6D5DF6]">Growth Tracker</p>
                  <h4 className="mt-3 text-2xl font-black text-[#111126]">Day 1 vs Now</h4>
                </div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0ECFF] text-[#6D5DF6]"><BarChart3 className="h-6 w-6" /></span>
              </div>
              <div className="mt-8 space-y-4">
                {[
                  ['Day 1', '1 Vision · 0 proof logs', 'w-[18%]'],
                  ['Now', '3 Visions · 12 proof logs', 'w-[76%]'],
                  ['Next', 'Log today’s proof', 'w-[52%]'],
                ].map(([label, value, width]) => (
                  <div key={label as string}>
                    <div className="flex justify-between text-xs font-black uppercase tracking-wider text-[#66708A]">
                      <span>{label as string}</span>
                      <span>{value as string}</span>
                    </div>
                    <div className="mt-2 h-2.5 rounded-full bg-[#EEE9FF]"><div className={cn('h-full rounded-full bg-[#6D5DF6]', width as string)} /></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-[1.8rem] bg-[#25163D] p-6 text-white">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#B8AEFF]">Circle Momentum</p>
              <p className="mt-3 text-2xl font-black">Your people are moving.</p>
              <div className="mt-5 space-y-3">
                {['Kavya logged proof', 'Aarav finished a task', 'You are 1 log away'].map(item => (
                  <p key={item} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold">{item}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </Reveal>
  );
}

function ProductSuiteTabs() {
  const [active, setActive] = useState<SuiteKey>('visions');
  const activeItem = productSuite[active];
  const Icon = activeItem.icon;

  return (
    <section id="product" className="px-5 py-24">
      <SectionHeader
        kicker="Product Suite"
        title="One workspace for your growth system."
        copy="Everything connects back to your progress: the Vision, the next action, the proof log, the reflection, and the people who help you stay accountable."
      />

      <Reveal className="mx-auto mt-12 max-w-6xl">
        <div className="flex gap-2 overflow-x-auto rounded-[1.4rem] border border-[#E6E8F2] bg-white p-2 shadow-[0_18px_70px_rgba(32,30,70,0.05)]">
          {(Object.keys(productSuite) as SuiteKey[]).map(key => {
            const item = productSuite[key];
            const TabIcon = item.icon;
            const selected = active === key;
            return (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={cn(
                  'flex min-w-max items-center gap-2 rounded-[1.05rem] px-4 py-3 text-sm font-black transition',
                  selected ? 'bg-[#25163D] text-white shadow-lg shadow-[#25163D]/15' : 'text-[#66708A] hover:bg-[#F5F2FF] hover:text-[#25163D]'
                )}
              >
                <TabIcon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[2rem] border border-[#E6E8F2] bg-white p-8 shadow-[0_22px_80px_rgba(32,30,70,0.06)]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl text-white" style={{ background: activeItem.accent }}>
              <Icon className="h-7 w-7" />
            </span>
            <h3 className="mt-8 text-3xl font-black tracking-[-0.05em] text-[#12122B]">{activeItem.title}</h3>
            <p className="mt-4 text-base font-semibold leading-8 text-[#66708A]">{activeItem.copy}</p>
            <div className="mt-8 space-y-3">
              {activeItem.points.map(point => (
                <div key={point} className="flex items-center gap-3 rounded-2xl bg-[#F7F4FF] px-4 py-3 text-sm font-black text-[#25163D]">
                  <CircleDot className="h-4 w-4 text-[#6D5DF6]" />
                  {point}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            key={`${active}-visual`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden rounded-[2rem] border border-[#E6E8F2] bg-[#F4F1FF] p-6 shadow-[0_22px_80px_rgba(109,93,246,0.09)]"
          >
            <div className="rounded-[1.5rem] bg-white p-5">
              <div className="flex items-center justify-between border-b border-[#EEE9FF] pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#6D5DF6]">{activeItem.label}</p>
                  <p className="mt-1 text-xl font-black text-[#12122B]">Connected to Launch Beta</p>
                </div>
                <span className="rounded-full bg-[#F0ECFF] px-4 py-2 text-xs font-black text-[#6D5DF6]">Live preview</span>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {[0, 1, 2, 3].map(index => (
                  <motion.div
                    key={index}
                    className={cn('rounded-[1.25rem] p-5', index === 0 ? 'bg-[#25163D] text-white sm:col-span-2' : 'bg-[#F8F6FF] text-[#12122B]')}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <p className={cn('text-xs font-black uppercase tracking-[0.18em]', index === 0 ? 'text-[#BDB3FF]' : 'text-[#9B8CFF]')}>{activeItem.label}</p>
                    <p className="mt-3 text-lg font-black">{index === 0 ? activeItem.title : activeItem.points[index - 1] ?? 'Progress connected'}</p>
                    <div className={cn('mt-5 h-2 rounded-full', index === 0 ? 'bg-white/18' : 'bg-[#E9E4FF]')}>
                      <motion.div className="h-full rounded-full" style={{ background: activeItem.accent }} initial={{ width: '18%' }} animate={{ width: `${56 + index * 10}%` }} transition={{ duration: 0.7 }} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </Reveal>
    </section>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [introVisible, setIntroVisible] = useState(true);
  const { scrollYProgress } = useScroll();
  const heroGlowY = useTransform(scrollYProgress, [0, 0.24], [0, 80]);
  const heroMockupY = useTransform(scrollYProgress, [0, 0.28], [0, -36]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIntroVisible(false);
      return undefined;
    }
    const timeout = window.setTimeout(() => setIntroVisible(false), 1850);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const title = 'VisNova - Turn Visions Into Visible Progress';
    const description = 'VisNova helps you organize goals, tasks, journals, proof logs, vision boards, and accountability into one personal growth workspace.';
    document.title = title;

    const setMeta = (name: string, content: string, property = false) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let tag = document.querySelector(selector) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(property ? 'property' : 'name', name);
        document.head.appendChild(tag);
      }
      tag.content = content;
    };

    setMeta('description', description);
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:site_name', 'VisNova', true);
    setMeta('twitter:card', 'summary_large_image');
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goAuth = async () => {
    markLandingSeen();
    if (isSupabaseConfigured()) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.id) {
        await supabase.from('profiles').update({ has_seen_landing: true }).eq('id', data.session.user.id);
        navigate('/dashboard');
        return;
      }
    }
    navigate('/auth');
  };

  const explore = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FBFAFF] font-sans text-[#131323] selection:bg-[#6D5DF6] selection:text-white">
      <OpeningAnimation visible={introVisible} />
      <motion.div
        className="fixed left-0 top-0 z-[70] h-1 w-full origin-left bg-gradient-to-r from-[#6D5DF6] via-[#8B7CFF] to-[#C8BFFF]"
        style={{ scaleX: scrollYProgress }}
      />

      <nav className={cn('sticky top-0 z-50 transition-all duration-300', scrolled ? 'border-b border-[#E6E8F2]/80 bg-white/86 shadow-lg shadow-[#3F2D91]/5 backdrop-blur-xl' : 'bg-white/62 backdrop-blur-md')}>
        <div className={cn('mx-auto flex max-w-7xl items-center justify-between px-5 transition-all duration-300 lg:px-8', scrolled ? 'h-16' : 'h-20')}>
          <Link to="/landing" className="flex items-center gap-3">
            <BrandLogo className="h-10 w-10" />
            <span className="text-2xl font-black tracking-[-0.04em] text-[#111126]">VisNova</span>
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            {navLinks.map(([label, id]) => (
              <button key={label} onClick={() => explore(id)} className="text-sm font-black text-[#5F6273] transition hover:text-[#6D5DF6]">
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/auth')} className="hidden rounded-2xl border border-[#E6E8F2] bg-white px-5 py-3 text-sm font-black text-[#25163D] transition hover:border-[#D2CBFF] sm:inline-flex">
              Sign in
            </button>
            <button onClick={goAuth} className="rounded-2xl bg-[#6D5DF6] px-5 py-3 text-sm font-black text-white shadow-[0_14px_28px_rgba(109,93,246,0.24)] transition hover:-translate-y-0.5">
              Start Free
            </button>
            <button onClick={() => setMenuOpen(value => !value)} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E6E8F2] bg-white text-[#25163D] lg:hidden">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-[#E6E8F2] bg-white px-5 py-4 lg:hidden">
            <div className="mx-auto grid max-w-7xl gap-2">
              {navLinks.map(([label, id]) => (
                <button key={label} onClick={() => explore(id)} className="rounded-2xl px-4 py-3 text-left text-sm font-black text-[#5F6273] hover:bg-[#F5F2FF]">
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      <main>
        <section id="hero" className="relative overflow-hidden px-5 pb-20 pt-20 text-center sm:pt-24">
          <motion.div
            aria-hidden="true"
            className="absolute left-1/2 top-8 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[#EFE9FF] blur-3xl"
            style={{ y: heroGlowY }}
          />
          <motion.div
            aria-hidden="true"
            className="absolute left-[12%] top-28 h-2 w-2 rotate-45 bg-[#B8AEFF]"
            animate={{ y: [0, -10, 0], opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            aria-hidden="true"
            className="absolute right-[17%] top-44 h-2 w-2 rotate-45 bg-[#B8AEFF]"
            animate={{ y: [0, 12, 0], opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 4.5, repeat: Infinity }}
          />

          <Reveal className="relative mx-auto max-w-4xl">
            <p className="mx-auto inline-flex rounded-full bg-[#F4F0FF] px-5 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#6D5DF6]">
              Your Vision. Your Proof. Your Progress.
            </p>
            <h1 className="mt-8 text-5xl font-black leading-[1.02] tracking-[-0.075em] text-[#12122B] sm:text-6xl lg:text-7xl">
              Turn visions into <span className="bg-gradient-to-r from-[#6D5DF6] to-[#9D8CFF] bg-clip-text text-transparent">visible progress.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-lg font-semibold leading-8 text-[#66708A]">
              VisNova helps you plan what matters, choose one next move, log proof, and watch your progress become visible over time.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <motion.button onClick={goAuth} className="rounded-2xl bg-gradient-to-r from-[#6D5DF6] to-[#8B7CFF] px-8 py-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(109,93,246,0.28)]" whileHover={{ y: -3, scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                Start Free <ArrowRight className="ml-2 inline h-4 w-4" />
              </motion.button>
              <motion.button onClick={() => explore('how')} className="rounded-2xl border border-[#E1E4F0] bg-white px-8 py-4 text-sm font-black text-[#111126] shadow-sm" whileHover={{ y: -3, scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                See How It Works <ArrowRight className="ml-2 inline h-4 w-4" />
              </motion.button>
            </div>
          </Reveal>

          <motion.div style={{ y: heroMockupY }}>
            <HeroMockup />
          </motion.div>
        </section>

        <section className="border-y border-[#EEF0F7] bg-white px-5 py-8">
          <Reveal className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3">
            {['Visions', 'Tasks', 'Proof Logs', 'Journal', 'Vision Board', 'Circle', 'Progress Pulse'].map(label => (
              <span key={label} className="rounded-full border border-[#E6E8F2] bg-[#FBFAFF] px-5 py-2.5 text-sm font-black text-[#66708A]">
                {label}
              </span>
            ))}
          </Reveal>
        </section>

        <ProductSuiteTabs />

        <section id="use-cases" className="bg-white px-5 py-24">
          <SectionHeader
            kicker="Use Cases"
            title="Built for people turning ambition into proof."
            copy="VisNova adapts to the kind of progress you are trying to make without forcing your private goals into a public performance."
          />
          <div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-2 xl:grid-cols-5">
            {useCases.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.04}>
                <motion.article className="h-full rounded-[1.65rem] border border-[#E6E8F2] bg-[#FBFAFF] p-6 shadow-[0_18px_60px_rgba(32,30,70,0.04)]" whileHover={{ y: -8, boxShadow: '0 26px 70px rgba(109,93,246,0.12)' }}>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0ECFF] text-[#6D5DF6]">
                    <item.icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-6 text-xl font-black text-[#12122B]">{item.title}</h3>
                  <p className="mt-4 text-sm font-bold leading-6 text-[#5F6273]">{item.pain}</p>
                  <p className="mt-4 text-sm font-semibold leading-6 text-[#7A7F95]">{item.workflow}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {item.features.map(feature => (
                      <span key={feature} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-[#6D5DF6]">{feature}</span>
                    ))}
                  </div>
                </motion.article>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="how" className="px-5 py-24">
          <SectionHeader
            kicker="Simple Process"
            title="Get started in 3 simple steps."
            copy="Start small. Keep the loop visible. Return tomorrow with a clearer next move."
          />
          <div className="relative mx-auto mt-14 grid max-w-5xl gap-8 md:grid-cols-3">
            <motion.div className="absolute left-[20%] right-[20%] top-14 hidden origin-left border-t-2 border-dashed border-[#D7D0FF] md:block" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 1 }} />
            {processSteps.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.08} className="relative">
                <motion.article className="relative rounded-[1.5rem] border border-[#E6E8F2] bg-white p-8 text-center shadow-[0_18px_60px_rgba(32,30,70,0.05)]" whileHover={{ y: -7 }}>
                  <span className="absolute left-6 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-[#6D5DF6] text-sm font-black text-white">{index + 1}</span>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0ECFF] text-[#6D5DF6]">
                    <step.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-8 text-lg font-black text-[#12122B]">{step.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-[#66708A]">{step.copy}</p>
                </motion.article>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="bg-[#25163D] px-5 py-24 text-white">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <SectionHeader
              align="left"
              kicker="Progress Pulse"
              title="Planning is not progress. Proof is."
              copy="Progress Pulse turns logged actions into visible momentum: proof count, weekly consistency, active Vision progress, completed tasks, and Day 1 vs Now."
            />
            <Reveal>
              <div className="rounded-[2rem] border border-white/10 bg-white/8 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.22)] backdrop-blur-xl">
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ['Proof logs', '12', 'This week'],
                    ['Weekly consistency', '72%', '5 of 7 days'],
                    ['Active Vision', 'Launch Beta', 'Current focus'],
                    ['Tasks completed', '8', 'Linked to proof'],
                  ].map(([label, value, note]) => (
                    <div key={label} className="rounded-[1.3rem] bg-white p-5 text-[#12122B]">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6D5DF6]">{label}</p>
                      <p className="mt-3 text-3xl font-black tracking-[-0.05em]">{value}</p>
                      <p className="mt-2 text-sm font-bold text-[#66708A]">{note}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-[1.3rem] bg-[#F4F1FF] p-5 text-[#12122B]">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black">Day 1 vs Now</p>
                    <p className="text-xs font-black uppercase tracking-wider text-[#6D5DF6]">Product demo</p>
                  </div>
                  <div className="mt-5 h-3 rounded-full bg-[#DDD6FF]">
                    <motion.div className="h-full rounded-full bg-[#6D5DF6]" initial={{ width: 0 }} whileInView={{ width: '78%' }} viewport={{ once: true }} transition={{ duration: 1.1 }} />
                  </div>
                  <p className="mt-4 text-sm font-bold text-[#66708A]">From one Vision and no logs to a visible proof timeline.</p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="bg-white px-5 py-24">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <SectionHeader
              align="left"
              kicker="Privacy"
              title="Private by default. Shared by choice."
              copy="Your private journals, notes, messages, and private logs stay private unless you choose to share them."
            />
            <div className="grid gap-5 sm:grid-cols-2">
              {[
                ['Private Journals', 'Reflect without turning personal thoughts into public content.'],
                ['Private Notes', 'Capture messy ideas and keep them connected to goals.'],
                ['Controlled Sharing', 'Choose Private, Circle, or Public before posting progress.'],
                ['Analytics Safety', 'Private messages, journals, notes, and private logs are not used for recommendations.'],
              ].map(([title, copy], index) => (
                <Reveal key={title} delay={index * 0.04}>
                  <motion.article className="rounded-[1.5rem] border border-[#E6E8F2] bg-[#FBFAFF] p-6" whileHover={{ y: -5 }}>
                    <ShieldCheck className="h-7 w-7 text-[#6D5DF6]" />
                    <h3 className="mt-5 text-xl font-black text-[#12122B]">{title}</h3>
                    <p className="mt-3 text-sm font-semibold leading-6 text-[#66708A]">{copy}</p>
                  </motion.article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="plans" className="bg-[#F6F4FF] px-5 py-24">
          <SectionHeader
            kicker="Plans"
            title="Start free. Upgrade when your system grows."
            copy="Paid plans will open after beta. For now, the priority is proving the core loop: Vision, action, proof, progress."
          />
          <div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-3">
            {plans.map(([name, headline, copy], index) => (
              <Reveal key={name} delay={index * 0.05}>
                <motion.article className={cn('h-full rounded-[1.65rem] border p-7 shadow-[0_20px_70px_rgba(32,30,70,0.05)]', index === 0 ? 'border-[#DCD4FF] bg-white' : 'border-[#E6E8F2] bg-white/75')} whileHover={{ y: -7 }}>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#6D5DF6]">{name}</p>
                  <h3 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[#12122B]">{headline}</h3>
                  <p className="mt-4 text-sm font-semibold leading-6 text-[#66708A]">{copy}</p>
                  <button onClick={goAuth} className={cn('mt-8 w-full rounded-2xl px-5 py-3 text-sm font-black', index === 0 ? 'bg-[#6D5DF6] text-white' : 'bg-[#F0ECFF] text-[#6D5DF6]')}>
                    {index === 0 ? 'Start Free' : 'Coming after beta'}
                  </button>
                </motion.article>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="px-5 py-24">
          <SectionHeader
            kicker="Benefits"
            title="A complete progress system, not another scattered tool."
            copy="Use VisNova to reduce decision fatigue, keep your next move visible, and make growth easier to return to."
          />
          <div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit, index) => (
              <Reveal key={benefit.title} delay={index * 0.04}>
                <motion.article className="h-full rounded-[1.5rem] border border-[#E6E8F2] bg-white p-6 shadow-[0_18px_60px_rgba(32,30,70,0.04)]" whileHover={{ y: -6 }}>
                  <benefit.icon className="h-7 w-7 text-[#6D5DF6]" />
                  <h3 className="mt-6 text-xl font-black text-[#12122B]">{benefit.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-[#66708A]">{benefit.copy}</p>
                </motion.article>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="beta" className="px-5 pb-16">
          <Reveal className="mx-auto flex max-w-6xl flex-col gap-6 rounded-[2rem] border border-[#E2DAFF] bg-gradient-to-r from-[#25163D] to-[#6D5DF6] p-8 text-white shadow-[0_28px_100px_rgba(109,93,246,0.22)] sm:flex-row sm:items-center sm:justify-between lg:p-10">
            <div>
              <h2 className="text-3xl font-black tracking-[-0.05em] sm:text-4xl">Your future needs proof.</h2>
              <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-white/78">Start building a visible progress system with VisNova. Keep it private, share what matters, and return with a clearer next move.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={goAuth} className="rounded-2xl bg-white px-7 py-4 text-sm font-black text-[#25163D]">
                Start Free
              </button>
              <button onClick={goAuth} className="rounded-2xl border border-white/25 px-7 py-4 text-sm font-black text-white">
                Join Beta
              </button>
            </div>
          </Reveal>
        </section>
      </main>

      <footer id="footer" className="border-t border-[#EEF0F7] bg-white px-5 py-12">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Link to="/landing" className="flex items-center gap-3">
              <BrandLogo className="h-10 w-10" />
              <span className="text-2xl font-black text-[#12122B]">VisNova</span>
            </Link>
            <p className="mt-5 max-w-sm text-sm font-semibold leading-6 text-[#66708A]">
              A vision-to-reality workspace for goals, tasks, proof logs, journals, boards, and accountability.
            </p>
            <p className="mt-8 text-sm font-semibold text-[#66708A]">© VisNova 2026. All rights reserved.</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {footerColumns.map(([heading, items]) => (
              <div key={heading}>
                <h3 className="text-xs font-black uppercase tracking-[0.18em] text-[#25163D]">{heading}</h3>
                <div className="mt-4 space-y-3">
                  {items.map(item => (
                    <button key={item} onClick={() => item === 'Features' ? explore('product') : undefined} className="block text-left text-sm font-semibold text-[#66708A] transition hover:text-[#6D5DF6]">
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
