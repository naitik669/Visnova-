import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  Flame,
  LayoutDashboard,
  ListChecks,
  Plug,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';
import { BrandLogo } from '../BrandLogo';
import { cn } from '../../lib/utils';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

const navLinks = [
  ['Home', 'hero'],
  ['Features', 'features'],
  ['How It Works', 'how'],
  ['Pricing', 'pricing'],
  ['About', 'why'],
  ['Resources', 'integrations'],
];

const trustBrands = [
  ['FocusFlow', Target],
  ['LifePilot', Sparkles],
  ['EverBetter', TrendingUp],
  ['MindsPath', BookOpen],
  ['AchieveX', Zap],
];

const featureCards = [
  { icon: Star, title: 'Vision Planning', copy: 'Define your purpose, set meaningful goals, and create the life you truly want.' },
  { icon: Target, title: 'Daily Progress', copy: 'Log your daily actions and turn small wins into real momentum.' },
  { icon: LayoutDashboard, title: 'Progress Pulse', copy: 'Visualize your growth, track milestones, and celebrate every win.' },
  { icon: CalendarDays, title: 'Tasks & Calendar', copy: 'Organize your day, manage tasks, and stay focused on what matters.' },
  { icon: BookOpen, title: 'Journals & Notes', copy: 'Write thoughts, capture ideas, and reflect to gain powerful clarity.' },
  { icon: Users, title: 'Guide & Accountability', copy: 'Stay accountable with smart insights and gentle nudges that keep you going.' },
];

const workflowCards = [
  { icon: Star, title: 'Create your Vision', copy: 'Name the future you want and choose the first visible milestone.' },
  { icon: Users, title: 'Build your Circle', copy: 'Invite people who should see your progress and keep you accountable.' },
  { icon: CheckCircle2, title: 'Manage proof together', copy: 'Turn tasks, journals, notes, and resources into a clear progress trail.' },
];

const steps = [
  { icon: Sparkles, title: 'Clarify Your Vision', copy: 'Define what you want and break it into clear goals.' },
  { icon: ListChecks, title: 'Plan Your Actions', copy: 'Set smart, actionable steps and schedule your time.' },
  { icon: Target, title: 'Log Proof & Grow', copy: 'Take action, log your proof, and let your progress grow.' },
];

const integrations = [
  ['Notes', BookOpen],
  ['Tasks', CheckCircle2],
  ['Circle', Users],
  ['Journal', Sparkles],
  ['Resources', Plug],
  ['Progress', BarChart3],
  ['Proof', ShieldCheck],
];

const pricingPlans = [
  {
    name: 'Starter',
    price: 'Free',
    copy: 'For getting your first Vision moving.',
    items: ['1 active Vision', 'Daily proof logs', 'Notes and journal basics', 'Private progress timeline'],
  },
  {
    name: 'Builder',
    price: '$8',
    copy: 'For consistent builders and beta teams.',
    featured: true,
    items: ['Unlimited Visions', 'Growth Tracker insights', 'Circle accountability', 'Vision Board templates', 'Resource goals'],
  },
  {
    name: 'Circle',
    price: '$18',
    copy: 'For creators, founders, and small accountability groups.',
    items: ['Shared proof sprints', 'Circle Momentum board', 'Advanced privacy controls', 'Priority beta access'],
  },
];

const faqs = [
  ['Is VisNova another task manager?', 'No. Tasks are one layer. VisNova connects goals, proof, reflection, resources, and accountability around your Vision.'],
  ['Can I keep progress private?', 'Yes. Private is the default. You choose what becomes Circle-visible or public.'],
  ['Who is VisNova for?', 'Students, creators, founders, developers, freelancers, and anyone turning long-term ambition into visible execution.'],
  ['Does it replace notes and journals?', 'It can, but the bigger idea is linking notes and reflections back to the Vision they support.'],
  ['Is the beta paid?', 'The beta can start free while we test the core loop and refine the product with early builders.'],
  ['Can I use it on mobile?', 'Yes. The main loop is designed to work from a phone: create, focus, log proof, and return tomorrow.'],
];

const testimonials = [
  {
    quote: 'VisNova helped me focus and build real momentum. It feels like a personal coach in my pocket.',
    name: 'Ananya R.',
    role: 'Entrepreneur',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
  },
  {
    quote: 'The daily insights keep me on track and motivated every single day. Game changer.',
    name: 'Rohan K.',
    role: 'Creator',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
  },
  {
    quote: 'My clarity is so much better and my productivity has never been higher.',
    name: 'Priya S.',
    role: 'Student',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
  },
];

function markLandingSeen() {
  localStorage.setItem('visnova_landing_seen', 'true');
}

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-90px' }}
      transition={{ duration: 0.7, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function HeroDashboardMockup() {
  const sidebarIcons = [LayoutDashboard, Target, Users, BarChart3, CheckCircle2, BookOpen, Sparkles, Zap];
  const streakDays = ['T', 'F', 'S', 'S', 'M', 'T', 'W', 'T', 'F', 'S', 'S', 'M', 'T', 'W'];
  const sparkline = 'M4 62 C42 58 66 42 96 24 C126 6 150 8 186 0';

  return (
    <Reveal className="relative mx-auto mt-16 w-full max-w-7xl">
      <motion.div
        aria-hidden="true"
        className="absolute -left-10 top-16 hidden h-56 w-56 rounded-full border border-[#DCD4FF] lg:block"
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute -right-8 top-6 hidden h-44 w-44 rounded-full border border-[#E8E1FF] lg:block"
        animate={{ rotate: -360 }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="relative overflow-hidden rounded-[2rem] border border-[#E8E1FF] bg-[#F7F3FF] p-3 shadow-[0_36px_120px_rgba(74,55,137,0.18)] sm:rounded-[2.8rem] sm:p-5"
        whileHover={{ y: -6, scale: 1.006 }}
        transition={{ type: 'spring', stiffness: 180, damping: 22 }}
      >
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/90 to-transparent" />
        <div className="relative grid min-h-[520px] grid-cols-[58px_1fr] gap-5 rounded-[2rem] bg-[#FBF8FF] sm:grid-cols-[74px_1fr]">
          <aside className="flex flex-col items-center justify-between rounded-l-[2rem] border-r border-[#E3D9F0] bg-[#EFE7F4] py-6">
            <div className="flex flex-col items-center gap-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D8C9E0] text-[#62456B]">
                <span className="h-3 w-3 rounded-full bg-[#62456B]" />
              </div>
              {sidebarIcons.map((Icon, index) => (
                <motion.div
                  key={index}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-2xl text-[#9B88A6]',
                    index === 7 && 'bg-[#62456B] text-white shadow-lg shadow-[#62456B]/25'
                  )}
                  whileHover={{ scale: 1.12, x: 3 }}
                >
                  <Icon className="h-5 w-5" />
                </motion.div>
              ))}
            </div>
            <img className="h-10 w-10 rounded-full object-cover ring-4 ring-white" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80" alt="Profile" />
          </aside>

          <div className="grid gap-5 p-5 text-left lg:grid-cols-[1fr_420px] lg:p-8">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.34em] text-[#9C8EA5]">System Operational</p>
                  <h3 className="mt-2 text-4xl font-black uppercase tracking-[-0.055em] text-[#2A1934] sm:text-5xl">Hello, Naitik!</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  <motion.span whileHover={{ y: -2 }} className="inline-flex items-center gap-2 rounded-full border border-[#E5CFCB] bg-[#FFF6F1] px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#A67A3A]">
                    <Flame className="h-4 w-4" /> 2 Day Streak
                  </motion.span>
                  <motion.span whileHover={{ y: -2 }} className="inline-flex items-center gap-2 rounded-full border border-[#EEE8F5] bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#62456B]">
                    <TrendingUp className="h-4 w-4 text-[#4F8F71]" /> 1520 XP - Level 7
                  </motion.span>
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1fr_300px_260px]">
                <motion.div whileHover={{ y: -4 }} className="rounded-[2rem] border border-[#E2D5E6] bg-white/78 p-7 shadow-[0_16px_50px_rgba(67,47,78,0.08)]">
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-[#9C8EA5]">Command Center</p>
                  <div className="mt-7 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <h4 className="text-4xl font-medium tracking-[-0.06em] text-[#2A1934]">Locking Beta</h4>
                      <p className="mt-4 max-w-md text-base font-bold leading-7 text-[#8B7C91]">Pick the next action, log proof, and keep this Vision moving.</p>
                    </div>
                    <button className="rounded-2xl bg-[#62456B] px-8 py-4 text-sm font-black uppercase tracking-wider text-white shadow-[0_16px_30px_rgba(98,69,107,0.22)]">
                      + Log Progress
                    </button>
                  </div>
                  <div className="mt-6 rounded-[1.6rem] border border-[#D9CDDE] bg-[#FAF7FC] p-5">
                    <div className="flex items-center gap-4">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#62456B] text-white"><Zap className="h-6 w-6" /></span>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#8B7C91]">Next Move</p>
                        <p className="mt-1 text-xl font-black text-[#2A1934]">Log today's proof</p>
                        <p className="mt-1 text-sm font-bold text-[#6F5B76]">Add one update. Private is fine; visible progress starts with the record.</p>
                      </div>
                    </div>
                    <div className="mt-5 h-14 rounded-2xl bg-[#62456B] text-center text-sm font-black uppercase tracking-wider leading-[3.5rem] text-white">+ Log Progress</div>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -4 }} className="rounded-[2rem] bg-[#D8C4DC] p-6 shadow-[0_18px_50px_rgba(98,69,107,0.14)]">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.28em] text-[#62456B]">Streak Fire</p>
                      <p className="mt-4 text-5xl font-black text-[#A67A3A]">2</p>
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-[#BEA9C5] bg-[#E4D2E7] text-[#A67A3A]">
                      <Flame className="h-8 w-8" />
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-7 gap-2">
                    {streakDays.map((day, index) => (
                      <motion.span
                        key={`${day}-${index}`}
                        className={cn('flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black', index % 3 === 0 || index % 3 === 1 ? 'bg-[#A77B3A] text-white' : 'bg-white/75 text-[#9C8EA5]')}
                        initial={{ scale: 0.8, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.025 }}
                      >
                        {day}
                      </motion.span>
                    ))}
                  </div>
                  <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[#62456B]">Longest streak: 6 days</p>
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {['7D', '30D', '100D'].map(label => <span key={label} className="rounded-xl bg-white/70 py-3 text-center text-xs font-black text-[#B9A9BE]">{label}</span>)}
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -4 }} className="rounded-[2rem] bg-[#D8C4DC] p-7 text-center shadow-[0_18px_50px_rgba(98,69,107,0.14)]">
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-[#62456B]">Total Progress</p>
                  <p className="mt-6 text-5xl font-black tracking-[-0.06em] text-[#62456B]">90%</p>
                  <div className="mt-6 h-3 rounded-full bg-[#E9DDEA]">
                    <motion.div className="h-full rounded-full bg-[#62456B]" initial={{ width: 0 }} whileInView={{ width: '90%' }} viewport={{ once: true }} transition={{ duration: 1.1, ease: 'easeOut' }} />
                  </div>
                  <p className="mt-6 text-base font-black leading-7 text-[#62456B]">9 / 10 Milestones<br />Secured</p>
                </motion.div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ['Trajectory', 'Day 2 - Artist'],
                  ['System Efficiency', 'High Performance'],
                  ['Level 7', '1520 / 2100 XP - 580 XP to next'],
                ].map(([label, value], index) => (
                  <motion.div key={label} whileHover={{ y: -3 }} className={cn('rounded-[1.5rem] border border-[#E2D5E6] bg-white/75 p-5', index === 2 && 'md:col-span-3')}>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-[#B8AABA]">{label}</p>
                    <p className="mt-2 text-lg font-black text-[#2A1934]">{value}</p>
                    {index === 2 && <div className="mt-4 h-3 rounded-full bg-[#F1EAF4]"><div className="h-full w-[13%] rounded-full bg-[#62456B]" /></div>}
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <motion.div whileHover={{ y: -4 }} className="rounded-[2rem] border border-[#E2D5E6] bg-white/78 p-7 shadow-[0_16px_50px_rgba(67,47,78,0.08)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.26em] text-[#62456B]">Progress Pulse</p>
                    <h4 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[#2A1934]">Growth Tracker</h4>
                    <p className="mt-3 text-base font-black text-[#6F5B76]">2-day streak - 3 logs - 100% weekly</p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8DDEA] text-[#62456B]">
                    <Brain className="h-7 w-7" />
                  </div>
                </div>
                <div className="mt-7 flex items-end gap-5">
                  <svg viewBox="0 0 190 70" className="h-24 flex-1 overflow-visible">
                    <defs>
                      <linearGradient id="lavenderPulseFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#62456B" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#62456B" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={`${sparkline} L186 70 L4 70 Z`} fill="url(#lavenderPulseFill)" />
                    <motion.path d={sparkline} fill="none" stroke="#62456B" strokeWidth="4" strokeLinecap="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: 'easeInOut' }} />
                  </svg>
                  <button className="rounded-2xl bg-[#62456B] px-6 py-4 text-xs font-black uppercase tracking-wider text-white">View Full Tracker</button>
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -4 }} className="min-h-[300px] rounded-[2rem] border border-[#E2D5E6] bg-white/78 p-7 shadow-[0_16px_50px_rgba(67,47,78,0.08)]">
                <div className="flex items-center justify-between border-b border-[#E9E0ED] pb-5">
                  <h4 className="text-2xl font-black text-[#2A1934]">To-Do List</h4>
                  <span className="text-xs font-black uppercase tracking-wider text-[#A597AA]">1 Pending</span>
                </div>
                <div className="mt-8 flex items-center gap-4">
                  <span className="h-6 w-6 rounded-lg border border-[#C7B8CD]" />
                  <p className="text-xl font-medium text-[#2A1934]">Lock the Beta for VisNova</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </Reveal>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

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

  const explore = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#D8D8DA] px-3 py-5 font-sans text-[#131323] selection:bg-[#6D5DF6] selection:text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-[1120px] overflow-hidden rounded-[2rem] bg-[#F7F7FB] shadow-[0_34px_120px_rgba(38,38,52,0.14)]">
      <nav
        className={cn(
          'sticky top-0 z-50 transition-all duration-300',
          scrolled ? 'border-b border-[#E6E8F2]/80 bg-white/84 shadow-lg shadow-[#3F2D91]/5 backdrop-blur-xl' : 'bg-white/62 backdrop-blur-md'
        )}
      >
        <div className={cn('mx-auto flex max-w-7xl items-center justify-between px-5 transition-all duration-300 lg:px-8', scrolled ? 'h-16' : 'h-20')}>
          <Link to="/landing" className="flex items-center gap-3">
            <BrandLogo className="h-10 w-10" />
            <span className="text-2xl font-black tracking-[-0.04em] text-[#111126]">VisNova</span>
          </Link>
          <div className="hidden items-center gap-9 lg:flex">
            {navLinks.map(([label, id], index) => (
              <button
                key={label}
                onClick={() => explore(id)}
                className={cn(
                  'relative text-sm font-black text-[#596078] transition-colors hover:text-[#6D5DF6]',
                  index === 0 && 'text-[#111126] after:absolute after:-bottom-3 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-[#6D5DF6]'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <motion.button
            onClick={goAuth}
            className="rounded-2xl bg-gradient-to-r from-[#6D5DF6] to-[#8B7CFF] px-5 py-3 text-sm font-black text-white shadow-[0_14px_28px_rgba(109,93,246,0.26)]"
            whileHover={{ y: -2, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Launch App <ArrowRight className="ml-1 inline h-4 w-4" />
          </motion.button>
        </div>
      </nav>

      <main>
        <section id="hero" className="relative overflow-hidden px-5 pb-14 pt-16 text-center sm:pt-20">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,#F0ECFF_0%,#FFFFFF_44%,#FFFFFF_100%)]" />
          <motion.div className="absolute left-[14%] top-28 h-2 w-2 rotate-45 bg-[#B8AEFF]" animate={{ y: [0, -10, 0], opacity: [0.35, 1, 0.35] }} transition={{ duration: 4, repeat: Infinity }} />
          <motion.div className="absolute right-[21%] top-40 h-2 w-2 rotate-45 bg-[#B8AEFF]" animate={{ y: [0, 12, 0], opacity: [0.35, 1, 0.35] }} transition={{ duration: 4.5, repeat: Infinity }} />
          <div className="absolute left-[8%] top-[420px] hidden h-64 w-[520px] -rotate-12 rounded-[50%] border border-[#DDD6FE]/70 lg:block" />
          <div className="absolute right-[8%] top-[420px] hidden h-64 w-[520px] rotate-12 rounded-[50%] border border-[#DDD6FE]/70 lg:block" />

          <Reveal className="mx-auto max-w-4xl">
            <motion.span className="inline-flex items-center gap-2 rounded-full bg-[#F4F0FF] px-5 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#6D5DF6]" whileHover={{ scale: 1.04 }}>
              <Sparkles className="h-3.5 w-3.5" /> 538+ plans in progress <ArrowRight className="h-3.5 w-3.5" />
            </motion.span>
            <h1 className="mt-8 text-5xl font-black leading-[1.04] tracking-[-0.07em] text-[#12122B] sm:text-6xl lg:text-7xl">
              Your <span className="bg-gradient-to-r from-[#6D5DF6] to-[#9D8CFF] bg-clip-text text-transparent">Vision.</span>
              <br />
              Your Life. Your Way.
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-lg font-medium leading-8 text-[#66708A]">
              VisNova helps you see your future, plan with clarity, and build daily proof toward the life you want.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <motion.button onClick={goAuth} className="rounded-2xl bg-gradient-to-r from-[#6D5DF6] to-[#8B7CFF] px-8 py-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(109,93,246,0.28)]" whileHover={{ y: -3, scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                Start Your Journey <ArrowRight className="ml-2 inline h-4 w-4" />
              </motion.button>
              <motion.button onClick={() => explore('features')} className="rounded-2xl border border-[#E1E4F0] bg-white px-8 py-4 text-sm font-black text-[#111126] shadow-sm" whileHover={{ y: -3, scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                Explore Features <ArrowRight className="ml-2 inline h-4 w-4" />
              </motion.button>
            </div>
          </Reveal>

          <HeroDashboardMockup />
        </section>

        <section className="px-5 pb-20">
          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
            {workflowCards.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.06}>
                <motion.article
                  className="h-full rounded-[1.65rem] border border-[#E3E6F0] bg-white p-5 shadow-[0_18px_50px_rgba(41,42,65,0.07)]"
                  whileHover={{ y: -7, boxShadow: '0 26px 70px rgba(109,93,246,0.12)' }}
                >
                  <div className="rounded-[1.25rem] border border-[#EDF0F7] bg-[#F8F9FF] p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF0FF] text-[#6D5DF6]">
                        <item.icon className="h-5 w-5" />
                      </span>
                      <div className="h-2 flex-1 rounded-full bg-[#ECEFF8]" />
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="h-2.5 w-3/4 rounded-full bg-[#DDE2F2]" />
                      <div className="h-2.5 w-1/2 rounded-full bg-[#EEF0F7]" />
                    </div>
                  </div>
                  <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[#6D5DF6]">Step 0{index + 1}</p>
                  <h3 className="mt-2 text-lg font-black tracking-[-0.03em] text-[#131323]">{item.title}</h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-[#697084]">{item.copy}</p>
                </motion.article>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="border-y border-[#EEF0F7] bg-white px-5 py-12">
          <Reveal className="mx-auto max-w-5xl text-center">
            <p className="text-sm font-bold text-[#66708A]">Trusted by visionaries building their best life.</p>
            <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
              {trustBrands.map(([label, Icon], index) => (
                <motion.div key={label as string} className="flex items-center justify-center gap-3 text-[#81869E]" whileHover={{ y: -4, color: '#6D5DF6' }} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.05 }}>
                  <Icon className="h-5 w-5" />
                  <span className="text-base font-black">{label as string}</span>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </section>

        <section id="features" className="px-5 py-24">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#6D5DF6]">+ Powerful Features</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-[#12122B] sm:text-5xl">Everything You Need to Grow</h2>
            <p className="mt-4 text-lg font-medium text-[#66708A]">All-in-one tools to plan, grow, and show up for your goals.</p>
          </Reveal>

          <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-2">
            {featureCards.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 0.04}>
                <motion.article className={cn('group min-h-[214px] rounded-[1.5rem] border border-[#E6E8F2] bg-white p-7 shadow-[0_18px_60px_rgba(32,30,70,0.04)]', index === 2 && 'md:row-span-2 md:min-h-[450px]', index === 5 && 'md:bg-[#F5F3FF]')} whileHover={{ y: -8, rotateX: 2, rotateY: -2, boxShadow: '0 24px 70px rgba(109,93,246,0.14)' }}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0ECFF] text-[#6D5DF6]">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-7 text-xl font-black tracking-[-0.03em] text-[#12122B]">{feature.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-[#66708A]">{feature.copy}</p>
                  {index === 2 && (
                    <div className="mt-10 rounded-[1.4rem] bg-[#F6F4FF] p-5">
                      <div className="flex items-end gap-2">
                        {[30, 44, 38, 64, 52, 82, 58].map((height, barIndex) => (
                          <motion.span
                            key={barIndex}
                            className="flex-1 rounded-t-2xl bg-gradient-to-t from-[#6D5DF6] to-[#B9B0FF]"
                            initial={{ height: 10 }}
                            whileInView={{ height }}
                            viewport={{ once: true }}
                            transition={{ delay: barIndex * 0.05, duration: 0.55 }}
                          />
                        ))}
                      </div>
                      <div className="mt-5 flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-widest text-[#7A7F95]">Weekly proof</span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#6D5DF6]">+18%</span>
                      </div>
                    </div>
                  )}
                  <button onClick={() => explore('how')} className="mt-6 text-sm font-black text-[#6D5DF6]">
                    Learn more <ArrowRight className="ml-1 inline h-4 w-4 transition group-hover:translate-x-1" />
                  </button>
                </motion.article>
              </Reveal>
            ))}
          </div>

          <Reveal className="mx-auto mt-14 max-w-5xl rounded-[1.4rem] border border-[#E6E8F2] bg-white p-7 shadow-[0_18px_70px_rgba(32,30,70,0.05)]">
            <div className="grid gap-6 text-center sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['3.5X', 'Productivity Boost', Sparkles, 'text-[#6D5DF6]'],
                ['2X', 'Better Focus', Target, 'text-[#28B98E]'],
                ['72%', 'Stronger Consistency', Flame, 'text-[#FF9D42]'],
                ['Faster', 'Goal Clarity', TrendingUp, 'text-[#6D5DF6]'],
              ].map(([value, label, Icon, color], index) => (
                <motion.div key={label as string} className={cn('px-5', index > 0 && 'lg:border-l lg:border-[#E6E8F2]')} whileHover={{ y: -4 }}>
                  <Icon className={cn('mx-auto h-8 w-8', color as string)} />
                  <p className="mt-4 text-3xl font-black tracking-[-0.05em] text-[#12122B]">{value as string}</p>
                  <p className="mt-1 text-sm font-bold text-[#66708A]">{label as string}</p>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </section>

        <section id="integrations" className="px-5 pb-24">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#6D5DF6]">Integrated Workspace</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-[#12122B] sm:text-5xl">Stay Connected With Your Favorite Growth Layers</h2>
            <p className="mt-4 text-lg font-medium text-[#66708A]">Every note, task, resource, and proof log connects back to the Vision it supports.</p>
          </Reveal>
          <Reveal className="relative mx-auto mt-12 flex min-h-[260px] max-w-4xl items-center justify-center overflow-hidden rounded-[2rem] border border-[#E6E8F2] bg-white shadow-[0_22px_80px_rgba(32,30,70,0.05)]">
            <div className="absolute h-48 w-48 rounded-full border border-dashed border-[#DCD6FF]" />
            <div className="absolute h-72 w-72 rounded-full border border-dashed border-[#ECE8FF]" />
            <motion.div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-gradient-to-br from-[#6D5DF6] to-[#9B8CFF] text-white shadow-[0_18px_50px_rgba(109,93,246,0.3)]" whileHover={{ scale: 1.08, rotate: 3 }}>
              <BrandLogo className="h-14 w-14" />
            </motion.div>
            {integrations.map(([label, Icon], index) => {
              const positions = [
                'left-[16%] top-[22%]',
                'left-[27%] bottom-[18%]',
                'left-[45%] top-[14%]',
                'right-[28%] bottom-[18%]',
                'right-[16%] top-[24%]',
                'right-[42%] top-[58%]',
                'left-[12%] bottom-[42%]',
              ];
              return (
                <motion.div
                  key={label as string}
                  className={cn('absolute hidden h-12 w-12 items-center justify-center rounded-2xl border border-[#E6E8F2] bg-white text-[#6D5DF6] shadow-lg shadow-[#1F1D46]/5 sm:flex', positions[index])}
                  animate={{ y: [0, index % 2 ? -8 : 8, 0] }}
                  transition={{ duration: 4 + index * 0.2, repeat: Infinity, ease: 'easeInOut' }}
                  title={label as string}
                >
                  <Icon className="h-5 w-5" />
                </motion.div>
              );
            })}
          </Reveal>
        </section>

        <section id="how" className="px-5 pb-24">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#6D5DF6]">Simple Process</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-[#12122B] sm:text-5xl">Get Started in 3 Simple Steps</h2>
            <p className="mt-4 text-lg font-medium text-[#66708A]">Start small. Stay consistent. Achieve big.</p>
          </Reveal>

          <div className="relative mx-auto mt-14 grid max-w-5xl gap-8 md:grid-cols-3">
            <div className="absolute left-[20%] right-[20%] top-14 hidden border-t-2 border-dashed border-[#D7D0FF] md:block" />
            {steps.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.08} className="relative">
                <motion.article className="relative rounded-[1.5rem] border border-[#E6E8F2] bg-white p-8 text-center shadow-[0_18px_60px_rgba(32,30,70,0.05)]" whileHover={{ y: -7 }}>
                  <span className="absolute left-6 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-[#6D5DF6] text-sm font-black text-white">{index + 1}</span>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0ECFF] text-[#6D5DF6]">
                    <step.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-8 text-lg font-black text-[#12122B]">{step.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-[#66708A]">{step.copy}</p>
                </motion.article>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="why" className="bg-[#FBFAFF] px-5 pb-24">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#6D5DF6]">Loved by Visionaries</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-[#12122B] sm:text-5xl">Real People. Real Progress.</h2>
            <p className="mt-4 text-lg font-medium text-[#66708A]">See how VisNova is helping people transform their lives.</p>
          </Reveal>

          <div id="testimonials" className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Reveal key={testimonial.name} delay={index * 0.05}>
                <motion.article className="rounded-[1.5rem] border border-[#E6E8F2] bg-white p-7 shadow-[0_18px_60px_rgba(32,30,70,0.05)]" whileHover={{ y: -6 }}>
                  <p className="text-base font-semibold leading-7 text-[#2A2A40]">"{testimonial.quote}"</p>
                  <div className="mt-8 flex items-center gap-3">
                    <img className="h-11 w-11 rounded-full object-cover" src={testimonial.image} alt={testimonial.name} />
                    <div>
                      <p className="font-black text-[#12122B]">{testimonial.name}</p>
                      <p className="text-sm font-bold text-[#66708A]">{testimonial.role}</p>
                    </div>
                  </div>
                </motion.article>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="pricing" className="bg-[#F1F2F6] px-5 py-24">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#6D5DF6]">Pricing Plans</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-[#12122B] sm:text-5xl">Choose the Perfect Plan</h2>
            <p className="mt-4 text-lg font-medium text-[#66708A]">Start simple, then grow into deeper tracking and accountability as your Vision expands.</p>
          </Reveal>

          <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
            {pricingPlans.map((plan, index) => (
              <Reveal key={plan.name} delay={index * 0.06}>
                <motion.article
                  className={cn(
                    'h-full rounded-[1.7rem] border bg-white p-7 shadow-[0_18px_60px_rgba(32,30,70,0.05)]',
                    plan.featured ? 'border-[#6D5DF6] ring-4 ring-[#6D5DF6]/10' : 'border-[#E6E8F2]'
                  )}
                  whileHover={{ y: -8 }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-black text-[#12122B]">{plan.name}</h3>
                      <p className="mt-2 text-sm font-semibold leading-6 text-[#66708A]">{plan.copy}</p>
                    </div>
                    {plan.featured && <span className="rounded-full bg-[#6D5DF6] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">Beta</span>}
                  </div>
                  <p className="mt-8 text-5xl font-black tracking-[-0.06em] text-[#12122B]">{plan.price}<span className="text-sm font-bold text-[#66708A]">{plan.price.startsWith('$') ? '/mo' : ''}</span></p>
                  <button onClick={goAuth} className={cn('mt-7 h-12 w-full rounded-2xl text-sm font-black transition', plan.featured ? 'bg-[#6D5DF6] text-white shadow-lg shadow-[#6D5DF6]/20' : 'bg-[#F4F5FA] text-[#12122B] hover:bg-[#EEEFFE]')}>
                    Start now
                  </button>
                  <div className="mt-7 space-y-3">
                    {plan.items.map(item => (
                      <div key={item} className="flex items-center gap-3 text-sm font-semibold text-[#66708A]">
                        <CheckCircle2 className="h-4 w-4 text-[#6D5DF6]" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </motion.article>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="bg-[#F1F2F6] px-5 pb-24">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#6D5DF6]">FAQ</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] text-[#12122B] sm:text-5xl">Frequently Asked Questions</h2>
          </Reveal>
          <div className="mx-auto mt-10 grid max-w-5xl gap-3 md:grid-cols-2">
            {faqs.map(([question, answer], index) => (
              <Reveal key={question} delay={index * 0.03}>
                <details className="group rounded-2xl border border-[#E2E5EE] bg-white px-5 py-4 shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black text-[#12122B]">
                    {question}
                    <ChevronDown className="h-4 w-4 text-[#6D5DF6] transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm font-medium leading-6 text-[#66708A]">{answer}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="beta" className="px-5 pb-12">
          <Reveal className="mx-auto flex max-w-5xl flex-col gap-6 rounded-[1.6rem] border border-[#E2DAFF] bg-gradient-to-r from-[#F3F0FF] to-[#F8F6FF] p-8 shadow-[0_22px_80px_rgba(109,93,246,0.13)] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <BrandLogo className="h-16 w-16" />
              <div>
                <h2 className="text-2xl font-black tracking-[-0.04em] text-[#12122B]">Your future is waiting.</h2>
                <p className="mt-2 text-sm font-semibold text-[#66708A]">Start your journey with VisNova now.</p>
              </div>
            </div>
            <motion.button onClick={goAuth} className="rounded-2xl bg-gradient-to-r from-[#6D5DF6] to-[#8B7CFF] px-7 py-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(109,93,246,0.26)]" whileHover={{ y: -3, scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              Launch VisNova <ArrowRight className="ml-2 inline h-4 w-4" />
            </motion.button>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-[#EEF0F7] bg-white px-5 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <Link to="/landing" className="flex items-center gap-3">
            <BrandLogo className="h-9 w-9" />
            <span className="text-lg font-black text-[#12122B]">VisNova</span>
          </Link>
          <p className="text-sm font-semibold text-[#66708A]">© VisNova 2026. All rights reserved.</p>
          <div className="flex items-center gap-5 text-sm font-black text-[#66708A]">
            <button onClick={() => explore('features')}>Features</button>
            <button onClick={() => explore('beta')}>Beta</button>
            <button onClick={goAuth}>Sign Up</button>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
