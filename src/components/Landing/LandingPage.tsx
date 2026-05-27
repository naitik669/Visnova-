import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Flame,
  LayoutDashboard,
  ListChecks,
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
  ['Pricing', 'beta'],
  ['About', 'why'],
  ['Resources', 'features'],
];

const trustBrands = [
  ['FocusFlow', Target],
  ['LifePilot', Sparkles],
  ['EverBetter', TrendingUp],
  ['MindsPath', BookOpen],
  ['AchieveX', Zap],
];

const featureCards = [
  {
    icon: Star,
    title: 'Vision Planning',
    copy: 'Define your purpose, set meaningful goals, and create the life you truly want.',
  },
  {
    icon: Target,
    title: 'Daily Progress',
    copy: 'Log your daily actions and turn small wins into real momentum.',
  },
  {
    icon: LayoutDashboard,
    title: 'Progress Pulse',
    copy: 'Visualize your growth, track milestones, and celebrate every win.',
  },
  {
    icon: CalendarDays,
    title: 'Tasks & Calendar',
    copy: 'Organize your day, manage tasks, and stay focused on what matters.',
  },
  {
    icon: BookOpen,
    title: 'Journals & Notes',
    copy: 'Write thoughts, capture ideas, and reflect to gain powerful clarity.',
  },
  {
    icon: Users,
    title: 'Guide & Accountability',
    copy: 'Stay accountable with smart insights and gentle nudges that keep you going.',
  },
];

const steps = [
  {
    icon: Sparkles,
    title: 'Clarify Your Vision',
    copy: 'Define what you want and break it into clear goals.',
  },
  {
    icon: ListChecks,
    title: 'Plan Your Actions',
    copy: 'Set smart, actionable steps and schedule your time.',
  },
  {
    icon: Target,
    title: 'Log Proof & Grow',
    copy: 'Take action, log your proof, and let your progress grow.',
  },
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
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function HeroDashboardMockup() {
  const sidebarIcons = [Sparkles, LayoutDashboard, Users, Target, CalendarDays, BookOpen, CheckCircle2, Zap];
  const bars = [28, 42, 36, 54, 48, 62, 44, 70, 52, 38, 46, 66];

  return (
    <Reveal className="relative mx-auto mt-16 w-full max-w-5xl">
      <div className="absolute -left-12 top-10 hidden h-40 w-40 rounded-full border border-[#DDD6FE]/70 lg:block" />
      <div className="absolute -right-16 top-24 hidden h-48 w-48 rounded-full border border-[#DDD6FE]/70 lg:block" />
      <div className="relative overflow-hidden rounded-[2rem] border border-[#E7E1FF] bg-[#F8F6FF]/95 p-3 shadow-[0_34px_100px_rgba(83,63,174,0.16)] sm:rounded-[2.6rem] sm:p-4">
        <div className="grid min-h-[420px] grid-cols-[56px_1fr] rounded-[1.6rem] border border-white bg-white/72 shadow-inner shadow-white sm:grid-cols-[74px_1fr]">
          <aside className="flex flex-col items-center gap-4 border-r border-[#ECE8FF] bg-[#F5F1FF] py-6">
            {sidebarIcons.map((Icon, index) => (
              <div
                key={index}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-2xl text-[#8B7CFF]',
                  index === 1 ? 'bg-white text-[#6D5DF6] shadow-sm' : 'bg-transparent'
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
            ))}
          </aside>
          <div className="p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black tracking-[-0.04em] text-[#14142B]">Hello, Naitik! <span className="text-lg">👋</span></h3>
                <p className="mt-1 text-sm font-medium text-[#777B94]">Good progress. Let’s keep building momentum.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-[#14142B] shadow-sm"><Flame className="mr-1 inline h-3.5 w-3.5 text-[#FF9D42]" />2 Day Streak</span>
                <span className="hidden rounded-full bg-white px-4 py-2 text-xs font-black text-[#14142B] shadow-sm sm:inline-flex">1220 XP · Level 7</span>
                <img className="h-9 w-9 rounded-full object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" alt="Profile" />
              </div>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              <div className="rounded-[1.4rem] border border-[#ECE8FF] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-[#14142B]">Today’s Focus</p>
                  <CalendarDays className="h-4 w-4 text-[#8B7CFF]" />
                </div>
                <h4 className="mt-5 text-base font-black text-[#14142B]">Landing Page</h4>
                <p className="mt-1 text-xs font-medium text-[#777B94]">Finalize your content and hero sections.</p>
                <button className="mt-6 w-full rounded-2xl bg-gradient-to-r from-[#6D5DF6] to-[#8B7CFF] px-4 py-3 text-sm font-black text-white shadow-lg shadow-[#6D5DF6]/20">
                  Log Today’s Proof
                </button>
              </div>
              <div className="rounded-[1.4rem] border border-[#ECE8FF] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-[#14142B]">Progress Pulse</p>
                  <Sparkles className="h-4 w-4 text-[#8B7CFF]" />
                </div>
                <p className="mt-5 text-4xl font-black tracking-[-0.06em] text-[#6D5DF6]">90%</p>
                <p className="text-xs font-bold text-[#777B94]">Plan Progress</p>
                <div className="mt-4 h-2 rounded-full bg-[#ECE8FF]">
                  <div className="h-full w-[90%] rounded-full bg-[#6D5DF6]" />
                </div>
                <div className="mt-5 flex items-end gap-1">
                  {bars.map((height, index) => (
                    <span key={index} className="flex-1 rounded-full bg-[#C8BEFF]" style={{ height }} />
                  ))}
                </div>
              </div>
              <div className="rounded-[1.4rem] border border-[#ECE8FF] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-[#14142B]">Focus Streak</p>
                  <TrendingUp className="h-4 w-4 text-[#8B7CFF]" />
                </div>
                <p className="mt-5 text-4xl font-black tracking-[-0.06em] text-[#14142B]">2</p>
                <p className="text-xs font-bold text-[#777B94]">Day Streak</p>
                <div className="mt-5 flex gap-2">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <span key={index} className={cn('flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-black', index < 6 ? 'bg-[#6D5DF6] text-white' : 'bg-[#EEE9FF] text-[#8B7CFF]')}>✓</span>
                  ))}
                </div>
                <p className="mt-4 text-xs font-bold text-[#777B94]">Longest: 8 Days</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Proof Logged', '12', 'This week'],
                ['Tasks Completed', '8', 'This week'],
                ['Focus Score', '85%', 'This week'],
                ['Environment Score', 'High', 'This week'],
              ].map(([label, value, sub]) => (
                <div key={label} className="rounded-[1.3rem] border border-[#ECE8FF] bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold text-[#777B94]">{label}</p>
                  <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-[#14142B]">{value}</p>
                  <p className="mt-1 text-xs font-bold text-[#777B94]">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
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
    <div className="min-h-screen overflow-x-hidden bg-[#FBFAFF] font-sans text-[#131323] selection:bg-[#6D5DF6] selection:text-white">
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
          <button onClick={goAuth} className="rounded-2xl bg-gradient-to-r from-[#6D5DF6] to-[#8B7CFF] px-5 py-3 text-sm font-black text-white shadow-[0_14px_28px_rgba(109,93,246,0.26)] transition hover:-translate-y-0.5">
            Launch App <ArrowRight className="ml-1 inline h-4 w-4" />
          </button>
        </div>
      </nav>

      <main>
        <section id="hero" className="relative overflow-hidden px-5 pb-14 pt-16 text-center sm:pt-20">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,#F0ECFF_0%,#FFFFFF_44%,#FFFFFF_100%)]" />
          <div className="absolute left-[14%] top-28 h-2 w-2 rotate-45 bg-[#B8AEFF]" />
          <div className="absolute right-[21%] top-40 h-2 w-2 rotate-45 bg-[#B8AEFF]" />
          <div className="absolute left-[8%] top-[420px] hidden h-64 w-[520px] -rotate-12 rounded-[50%] border border-[#DDD6FE]/70 lg:block" />
          <div className="absolute right-[8%] top-[420px] hidden h-64 w-[520px] rotate-12 rounded-[50%] border border-[#DDD6FE]/70 lg:block" />

          <Reveal className="mx-auto max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#F4F0FF] px-5 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#6D5DF6]">
              <Sparkles className="h-3.5 w-3.5" /> 538+ plans in progress <ArrowRight className="h-3.5 w-3.5" />
            </span>
            <h1 className="mt-8 text-5xl font-black leading-[1.04] tracking-[-0.07em] text-[#12122B] sm:text-6xl lg:text-7xl">
              Your <span className="bg-gradient-to-r from-[#6D5DF6] to-[#9D8CFF] bg-clip-text text-transparent">Vision.</span>
              <br />
              Your Life. Your Way.
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-lg font-medium leading-8 text-[#66708A]">
              VisNova helps you see your future, plan with clarity, and build daily proof toward the life you want.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button onClick={goAuth} className="rounded-2xl bg-gradient-to-r from-[#6D5DF6] to-[#8B7CFF] px-8 py-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(109,93,246,0.28)] transition hover:-translate-y-0.5">
                Start Your Journey <ArrowRight className="ml-2 inline h-4 w-4" />
              </button>
              <button onClick={() => explore('features')} className="rounded-2xl border border-[#E1E4F0] bg-white px-8 py-4 text-sm font-black text-[#111126] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                Explore Features <ArrowRight className="ml-2 inline h-4 w-4" />
              </button>
            </div>
          </Reveal>

          <HeroDashboardMockup />
        </section>

        <section className="border-y border-[#EEF0F7] bg-white px-5 py-12">
          <Reveal className="mx-auto max-w-5xl text-center">
            <p className="text-sm font-bold text-[#66708A]">Trusted by visionaries building their best life.</p>
            <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
              {trustBrands.map(([label, Icon]) => (
                <div key={label as string} className="flex items-center justify-center gap-3 text-[#81869E]">
                  <Icon className="h-5 w-5" />
                  <span className="text-base font-black">{label as string}</span>
                </div>
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

          <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 0.04}>
                <article className="group min-h-[214px] rounded-[1.5rem] border border-[#E6E8F2] bg-white p-7 shadow-[0_18px_60px_rgba(32,30,70,0.04)] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(109,93,246,0.12)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0ECFF] text-[#6D5DF6]">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-7 text-xl font-black tracking-[-0.03em] text-[#12122B]">{feature.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-[#66708A]">{feature.copy}</p>
                  <button onClick={() => explore('how')} className="mt-6 text-sm font-black text-[#6D5DF6]">
                    Learn more <ArrowRight className="ml-1 inline h-4 w-4 transition group-hover:translate-x-1" />
                  </button>
                </article>
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
                <div key={label as string} className={cn('px-5', index > 0 && 'lg:border-l lg:border-[#E6E8F2]')}>
                  <Icon className={cn('mx-auto h-8 w-8', color as string)} />
                  <p className="mt-4 text-3xl font-black tracking-[-0.05em] text-[#12122B]">{value as string}</p>
                  <p className="mt-1 text-sm font-bold text-[#66708A]">{label as string}</p>
                </div>
              ))}
            </div>
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
                <article className="relative rounded-[1.5rem] border border-[#E6E8F2] bg-white p-8 text-center shadow-[0_18px_60px_rgba(32,30,70,0.05)]">
                  <span className="absolute left-6 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-[#6D5DF6] text-sm font-black text-white">{index + 1}</span>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0ECFF] text-[#6D5DF6]">
                    <step.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-8 text-lg font-black text-[#12122B]">{step.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-[#66708A]">{step.copy}</p>
                </article>
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
                <article className="rounded-[1.5rem] border border-[#E6E8F2] bg-white p-7 shadow-[0_18px_60px_rgba(32,30,70,0.05)]">
                  <p className="text-base font-semibold leading-7 text-[#2A2A40]">“{testimonial.quote}”</p>
                  <div className="mt-8 flex items-center gap-3">
                    <img className="h-11 w-11 rounded-full object-cover" src={testimonial.image} alt={testimonial.name} />
                    <div>
                      <p className="font-black text-[#12122B]">{testimonial.name}</p>
                      <p className="text-sm font-bold text-[#66708A]">{testimonial.role}</p>
                    </div>
                  </div>
                </article>
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
            <button onClick={goAuth} className="rounded-2xl bg-gradient-to-r from-[#6D5DF6] to-[#8B7CFF] px-7 py-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(109,93,246,0.26)] transition hover:-translate-y-0.5">
              Launch VisNova <ArrowRight className="ml-2 inline h-4 w-4" />
            </button>
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
  );
}
