import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  LayoutDashboard,
  MessageCircle,
  NotebookPen,
  Sparkles,
  Target,
  Users,
  Zap
} from 'lucide-react';
import { BrandLogo } from '../BrandLogo';
import { cn } from '../../lib/utils';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';

const trustPills = ['Goals', 'Tasks', 'Journal', 'Feed', 'Circle', 'Nova Clock', 'Progress'];

const features = [
  { icon: Target, title: 'Visions', copy: 'Turn long-term ambition into a clear direction, timeline, and visible system.', accent: 'bg-[#F3F0FF]' },
  { icon: CheckCircle2, title: 'Tasks', copy: 'Break big goals into next moves so progress always has somewhere to start.', accent: 'bg-[#EEF7FF]' },
  { icon: LayoutDashboard, title: 'Vision Board', copy: 'Collect inspiration, resources, proof, and plans in one visual workspace.', accent: 'bg-[#F7F2FF]' },
  { icon: FileText, title: 'Notes', copy: 'Capture ideas, resources, lessons, and references linked back to your Vision.', accent: 'bg-[#F4F7FF]' },
  { icon: NotebookPen, title: 'Journal', copy: 'Reflect on what changed, what blocked you, and what your next move should be.', accent: 'bg-[#FFF7EC]' },
  { icon: MessageCircle, title: 'Feed', copy: 'Share proof, wins, questions, and build updates without losing the growth context.', accent: 'bg-[#F1FCF7]' },
  { icon: Users, title: 'Circle', copy: 'Bring accountability partners into the loop and keep each other moving.', accent: 'bg-[#F3F0FF]' },
  { icon: Clock3, title: 'Nova Clock', copy: 'Anchor deadlines, capsules, and future-self reminders to the work that matters.', accent: 'bg-[#EDF4FF]' },
];

const whyCards = [
  ['Clarity', 'VisNova starts with the Vision, not a pile of disconnected tasks.'],
  ['Execution', 'Every day has a next move, a progress log, and proof of motion.'],
  ['Reflection', 'Notes and journals help you learn from the work, not just finish it.'],
  ['Accountability', 'Your Circle keeps progress visible without turning growth into noise.'],
];

const previewTabs = [
  {
    key: 'Dashboard',
    title: 'Daily command center',
    copy: 'See today’s focus, weekly proof, recent progress, and the next best action.',
    stat: '72%',
    label: 'weekly proof'
  },
  {
    key: 'Vision Board',
    title: 'Make the future visual',
    copy: 'Map inspiration, resources, tasks, deadlines, and proof around one Vision.',
    stat: '8',
    label: 'linked layers'
  },
  {
    key: 'Journal',
    title: 'Reflect without losing momentum',
    copy: 'Capture lessons, moods, blockers, and decisions that feed your next move.',
    stat: '14',
    label: 'reflections'
  },
  {
    key: 'Feed',
    title: 'Share proof, not noise',
    copy: 'Post visible progress, ask for help, and follow builders who are moving.',
    stat: '47',
    label: 'proof logs'
  },
  {
    key: 'Profile',
    title: 'Build proof-of-work identity',
    copy: 'Your profile becomes a portfolio of visible progress, milestones, and growth.',
    stat: '6d',
    label: 'streak'
  },
];

const testimonials = [
  ['Aarav, student builder', 'VisNova made my exam prep feel like a visible project instead of a stressful checklist.'],
  ['Mira, creator', 'I finally have one place for content ideas, resources, proof logs, and accountability.'],
  ['Dev, founder', 'The Day 1 vs Now feeling is powerful. It turns scattered progress into evidence.'],
  ['Naitik, developer', 'It feels less like managing tasks and more like building a future I can actually see.'],
];

function markLandingSeen() {
  localStorage.setItem('visnova_landing_seen', 'true');
}

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.65, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function MiniDashboard({ activeTab }: { activeTab: string }) {
  const tab = previewTabs.find(item => item.key === activeTab) || previewTabs[0];

  return (
    <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[2.4rem] border border-[#E6E8F2] bg-white p-3 shadow-[0_30px_90px_rgba(39,34,93,0.14)]">
      <div className="rounded-[1.9rem] bg-[#F7F7FB] p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandLogo className="h-9 w-9" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#6D5DF6]">VisNova</p>
              <p className="text-[11px] font-bold text-[#8B8EA0]">{tab.title}</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            {['Vision', 'Tasks', 'Proof'].map(label => (
              <span key={label} className="rounded-full border border-[#E6E8F2] bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#5F6273]">
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[1.6rem] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8B7CFF]">Active Vision</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-[#131323]">Launch VisNova Beta</h3>
                <p className="mt-2 max-w-md text-sm font-medium leading-6 text-[#5F6273]">{tab.copy}</p>
              </div>
              <div className="rounded-3xl bg-[#F3F0FF] px-5 py-4 text-center">
                <p className="text-3xl font-black text-[#6D5DF6]">{tab.stat}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#7A7590]">{tab.label}</p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {['Fix onboarding', 'Log proof', 'Review Circle'].map((task, index) => (
                <div key={task} className="rounded-2xl border border-[#E6E8F2] bg-[#FAFAFD] p-4">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F0FF] text-[#6D5DF6]">
                    {index + 1}
                  </div>
                  <p className="text-sm font-black text-[#131323]">{task}</p>
                  <p className="mt-1 text-xs font-medium text-[#7A7E91]">Next visible move</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-[1.6rem] bg-[#F3F0FF] p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-black text-[#131323]">Weekly momentum</p>
                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-[#6D5DF6]">On track</span>
              </div>
              <div className="flex items-end gap-2">
                {[42, 58, 34, 70, 86, 76, 92].map((height, index) => (
                  <div key={index} className="flex flex-1 items-end rounded-full bg-white/70 p-1" style={{ height: 112 }}>
                    <div className="w-full rounded-full bg-gradient-to-t from-[#6D5DF6] to-[#A9A0FF]" style={{ height: `${height}%` }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[1.4rem] bg-white p-4 shadow-sm">
                <p className="text-2xl font-black text-[#131323]">18</p>
                <p className="text-xs font-bold text-[#777A8F]">tasks completed</p>
              </div>
              <div className="rounded-[1.4rem] bg-white p-4 shadow-sm">
                <p className="text-2xl font-black text-[#131323]">4</p>
                <p className="text-xs font-bold text-[#777A8F]">circle check-ins</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState(previewTabs[0].key);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const floatingChips = useMemo(
    () => ['Vision Builder', 'Daily Progress', 'Journal Reflection', 'Accountability', 'Circle', 'Creator', 'Student', 'Founder'],
    []
  );

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
    <div className="min-h-screen overflow-x-hidden bg-[#F7F7FB] font-sans text-[#131323] selection:bg-[#6D5DF6] selection:text-white">
      <nav
        className={cn(
          'sticky top-0 z-50 border-b transition-all duration-300',
          scrolled ? 'border-[#E6E8F2]/80 bg-white/82 shadow-lg shadow-[#191941]/5 backdrop-blur-xl' : 'border-transparent bg-[#F7F7FB]/75 backdrop-blur-md'
        )}
      >
        <div className={cn('mx-auto flex max-w-7xl items-center justify-between px-5 transition-all duration-300', scrolled ? 'h-16' : 'h-20')}>
          <Link to="/landing" className="flex items-center gap-3">
            <BrandLogo className="h-10 w-10" />
            <span className="text-lg font-black tracking-tight">VisNova</span>
          </Link>
          <div className="hidden items-center gap-7 lg:flex">
            {[
              ['Home', 'hero'],
              ['Features', 'features'],
              ['Why VisNova', 'why'],
              ['How It Works', 'how'],
              ['Testimonials', 'testimonials'],
              ['Beta', 'beta'],
            ].map(([label, id]) => (
              <button key={label} onClick={() => explore(id)} className="text-sm font-bold text-[#5F6273] transition-colors hover:text-[#6D5DF6]">
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={goAuth} className="hidden rounded-full border border-[#D9DDEC] bg-white px-5 py-2.5 text-sm font-black text-[#131323] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:block">
              Register
            </button>
            <button onClick={goAuth} className="rounded-full bg-[#131323] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-[#131323]/15 transition hover:-translate-y-0.5 hover:bg-[#6D5DF6]">
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      <main>
        <section id="hero" className="relative overflow-hidden px-5 pb-16 pt-16 sm:pt-20">
          <div className="absolute left-[-10%] top-10 h-80 w-80 rounded-full bg-[#DDE7FF] blur-3xl" />
          <div className="absolute right-[-12%] top-28 h-96 w-96 rounded-full bg-[#E8DFFF] blur-3xl" />
          <div className="relative mx-auto max-w-7xl text-center">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#E6E8F2] bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#6D5DF6] shadow-sm">
                <Sparkles size={14} /> Vision-to-reality OS
              </span>
              <h1 className="mx-auto mt-7 max-w-5xl text-5xl font-black leading-[0.95] tracking-[-0.055em] text-[#131323] sm:text-7xl lg:text-8xl">
                Turn your vision into visible progress.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg font-medium leading-8 text-[#5F6273]">
                VisNova helps ambitious builders set long-term goals, break them into execution, log proof, reflect, share momentum, and stay accountable with their Circle.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button onClick={goAuth} className="group flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#6D5DF6] px-7 text-sm font-black text-white shadow-xl shadow-[#6D5DF6]/25 transition hover:-translate-y-1 hover:bg-[#5B4BE8]">
                  Start Building <ArrowRight size={17} className="transition group-hover:translate-x-0.5" />
                </button>
                <button onClick={() => explore('features')} className="min-h-12 rounded-full border border-[#DDE1EF] bg-white px-7 text-sm font-black text-[#131323] shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  Explore the Platform
                </button>
              </div>
            </Reveal>

            <div className="relative mt-14">
              {floatingChips.map((chip, index) => (
                <motion.span
                  key={chip}
                  className={cn(
                    'pointer-events-none absolute hidden rounded-full border border-[#E6E8F2] bg-white/90 px-4 py-2 text-xs font-black text-[#5F6273] shadow-lg shadow-[#252557]/8 backdrop-blur md:block',
                    index % 2 ? 'text-[#6D5DF6]' : ''
                  )}
                  style={{
                    left: `${8 + (index % 4) * 25}%`,
                    top: `${index < 4 ? -18 : 82}%`,
                  }}
                  animate={{ y: [0, index % 2 ? -10 : 10, 0] }}
                  transition={{ duration: 5 + index * 0.25, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {chip}
                </motion.span>
              ))}
              <Reveal delay={0.12}>
                <MiniDashboard activeTab="Dashboard" />
              </Reveal>
            </div>
          </div>
        </section>

        <section className="px-5 py-6">
          <Reveal className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-3 rounded-full border border-[#E6E8F2] bg-white p-3 shadow-sm">
            {trustPills.map(label => (
              <span key={label} className="rounded-full bg-[#F7F7FB] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#777A8F]">
                {label}
              </span>
            ))}
          </Reveal>
        </section>

        <section id="features" className="px-5 py-20">
          <div className="mx-auto max-w-7xl">
            <Reveal className="mx-auto max-w-3xl text-center">
              <h2 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">Everything you need to build your future in one place.</h2>
              <p className="mt-4 text-lg font-medium leading-8 text-[#5F6273]">
                Planning, execution, reflection, resources, social proof, and accountability are connected around your Vision.
              </p>
            </Reveal>
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => (
                <Reveal key={feature.title} delay={index * 0.035}>
                  <div className={cn('group h-full rounded-[2rem] border border-[#E6E8F2] bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#242453]/10', index === 0 || index === 2 ? 'lg:col-span-2' : '')}>
                    <div className={cn('mb-6 flex h-12 w-12 items-center justify-center rounded-2xl text-[#6D5DF6]', feature.accent)}>
                      <feature.icon size={22} />
                    </div>
                    <h3 className="text-xl font-black tracking-tight">{feature.title}</h3>
                    <p className="mt-3 text-sm font-medium leading-6 text-[#5F6273]">{feature.copy}</p>
                    {(index === 0 || index === 2) && (
                      <div className="mt-6 rounded-[1.4rem] bg-[#F7F7FB] p-4">
                        <div className="h-2 w-2/3 rounded-full bg-[#6D5DF6]" />
                        <div className="mt-3 h-2 w-full rounded-full bg-[#E6E8F2]" />
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <div className="h-12 rounded-2xl bg-white" />
                          <div className="h-12 rounded-2xl bg-[#F3F0FF]" />
                          <div className="h-12 rounded-2xl bg-[#DDE7FF]" />
                        </div>
                      </div>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="why" className="bg-white px-5 py-20">
          <div className="mx-auto max-w-7xl">
            <Reveal className="text-center">
              <h2 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">Why people choose VisNova</h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg font-medium leading-8 text-[#5F6273]">
                Normal productivity tools track what you do. VisNova helps you see what you are becoming.
              </p>
            </Reveal>
            <div className="mt-10 grid gap-5 md:grid-cols-4">
              {whyCards.map(([title, copy], index) => (
                <Reveal key={title} delay={index * 0.05}>
                  <div className="rounded-[2rem] border border-[#E6E8F2] bg-[#F7F7FB] p-6">
                    <p className="text-4xl font-black text-[#6D5DF6]">0{index + 1}</p>
                    <h3 className="mt-8 text-xl font-black">{title}</h3>
                    <p className="mt-3 text-sm font-medium leading-6 text-[#5F6273]">{copy}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="px-5 py-20">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
            <Reveal>
              <MiniDashboard activeTab="Vision Board" />
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">Get started in 3 simple steps</h2>
              <div className="mt-8 space-y-4">
                {[
                  ['Create your vision', 'Name the future you are building and choose what matters.'],
                  ['Break it into execution', 'Add tasks, resources, deadlines, notes, and board items.'],
                  ['Track, reflect, and share', 'Log proof, review progress, and let your Circle keep you moving.'],
                ].map(([title, copy], index) => (
                  <div key={title} className="flex gap-4 rounded-[1.6rem] border border-[#E6E8F2] bg-white p-5 shadow-sm">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#6D5DF6] text-sm font-black text-white">0{index + 1}</span>
                    <div>
                      <h3 className="text-lg font-black">{title}</h3>
                      <p className="mt-1 text-sm font-medium leading-6 text-[#5F6273]">{copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="bg-[#F3F0FF] px-5 py-20">
          <div className="mx-auto max-w-7xl">
            <Reveal className="text-center">
              <h2 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">One system. Multiple layers of growth.</h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg font-medium leading-8 text-[#5F6273]">
                Switch between the layers of VisNova without losing the thread of your Vision.
              </p>
            </Reveal>
            <div className="mt-10 flex flex-wrap justify-center gap-2">
              {previewTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn('rounded-full px-5 py-3 text-sm font-black transition', activeTab === tab.key ? 'bg-[#131323] text-white shadow-lg shadow-[#131323]/15' : 'bg-white text-[#5F6273] hover:text-[#6D5DF6]')}
                >
                  {tab.key}
                </button>
              ))}
            </div>
            <Reveal className="mt-8">
              <MiniDashboard activeTab={activeTab} />
            </Reveal>
            <div className="mt-8 text-center">
              <button onClick={goAuth} className="rounded-full bg-[#6D5DF6] px-7 py-3 text-sm font-black text-white shadow-xl shadow-[#6D5DF6]/25 transition hover:-translate-y-1">
                Create Your First Vision
              </button>
            </div>
          </div>
        </section>

        <section id="testimonials" className="px-5 py-20">
          <div className="mx-auto max-w-7xl">
            <Reveal className="text-center">
              <h2 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">Real builders. Real momentum.</h2>
            </Reveal>
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {testimonials.map(([name, quote], index) => (
                <Reveal key={name} delay={index * 0.05}>
                  <div className="h-full rounded-[2rem] border border-[#E6E8F2] bg-white p-6 shadow-sm">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#6D5DF6] to-[#9F93FF] text-sm font-black text-white">
                      {name.slice(0, 1)}
                    </div>
                    <p className="text-base font-bold leading-7 text-[#252538]">“{quote}”</p>
                    <p className="mt-5 text-xs font-black uppercase tracking-widest text-[#8B7CFF]">{name}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="beta" className="px-5 py-20">
          <Reveal className="mx-auto max-w-6xl overflow-hidden rounded-[2.6rem] bg-gradient-to-br from-[#6D5DF6] via-[#8B7CFF] to-[#DDE7FF] p-8 text-center text-white shadow-[0_32px_100px_rgba(109,93,246,0.28)] sm:p-14">
            <h2 className="mx-auto max-w-3xl text-4xl font-black tracking-[-0.045em] sm:text-6xl">Your future will not build itself.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg font-semibold leading-8 text-white/86">
              Join the beta and start turning ambition into visible proof, one day at a time.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button onClick={goAuth} className="rounded-full bg-white px-7 py-3 text-sm font-black text-[#6D5DF6] shadow-xl transition hover:-translate-y-1">
                Join VisNova
              </button>
              <button onClick={() => explore('how')} className="rounded-full border border-white/50 px-7 py-3 text-sm font-black text-white transition hover:-translate-y-1 hover:bg-white/12">
                See How It Works
              </button>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-[#E6E8F2] bg-white px-5 py-12">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div>
            <div className="flex items-center gap-3">
              <BrandLogo className="h-10 w-10" />
              <span className="text-lg font-black">VisNova</span>
            </div>
            <p className="mt-4 max-w-sm text-sm font-medium leading-6 text-[#5F6273]">
              A vision-to-reality social productivity platform for ambitious builders.
            </p>
          </div>
          {[
            { heading: 'Product', items: ['Features', 'Beta', 'Progress'] },
            { heading: 'Company', items: ['Contact', 'Support', 'Trust'] },
            { heading: 'Resources', items: ['Vision Board', 'Circle', 'Journal'] },
            { heading: 'Legal', items: ['Privacy', 'Terms', 'Cookies'] },
          ].map(({ heading, items }) => (
            <div key={heading}>
              <h4 className="text-sm font-black">{heading}</h4>
              <div className="mt-4 space-y-3">
                {items.map(item => (
                  <button key={item} onClick={() => item === 'Privacy' ? navigate('/privacy') : item === 'Terms' ? navigate('/terms') : item === 'Cookies' ? navigate('/cookies') : explore('features')} className="block text-sm font-semibold text-[#5F6273] hover:text-[#6D5DF6]">
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t border-[#E6E8F2] pt-6 text-sm font-semibold text-[#7A7E91]">
          © VisNova 2026. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
