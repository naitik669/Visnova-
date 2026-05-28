import {
  BookOpen,
  BriefcaseBusiness,
  Code2,
  Compass,
  HeartPulse,
  Palette,
  Rocket,
  type LucideIcon
} from 'lucide-react';

export type OnboardingPathId = 'student' | 'creator' | 'builder' | 'freelancer' | 'growth' | 'custom';

export interface OnboardingPathConfig {
  id: OnboardingPathId;
  label: string;
  description: string;
  icon: LucideIcon;
  visionSuggestions: string[];
  taskSuggestions: string[];
  tone: string;
}

export const ONBOARDING_PATHS: OnboardingPathConfig[] = [
  {
    id: 'student',
    label: 'Student',
    description: 'Study goals, skills, routines, and exams.',
    icon: BookOpen,
    visionSuggestions: ['Score better this semester', 'Learn coding', 'Build my portfolio', 'Prepare for entrance exams'],
    taskSuggestions: ['Study for 25 minutes today', 'Create the first chapter plan', 'Review one weak area', 'Log today\'s study proof'],
    tone: 'Small study blocks become visible progress.'
  },
  {
    id: 'creator',
    label: 'Creator',
    description: 'Content ideas, projects, consistency, and growth.',
    icon: Palette,
    visionSuggestions: ['Post consistently', 'Build my personal brand', 'Finish an animation project', 'Grow my YouTube channel'],
    taskSuggestions: ['Write the first script', 'Collect three references', 'Edit for 25 minutes', 'Log today\'s creator proof'],
    tone: 'Ship the next small piece of your creative system.'
  },
  {
    id: 'builder',
    label: 'Founder / Builder',
    description: 'Products, launches, users, and momentum.',
    icon: Rocket,
    visionSuggestions: ['Launch beta', 'Build my MVP', 'Get first users', 'Improve my product'],
    taskSuggestions: ['Fix one onboarding issue', 'Write the launch checklist', 'Ask one user for feedback', 'Log today\'s product proof'],
    tone: 'Turn the launch from idea into visible evidence.'
  },
  {
    id: 'freelancer',
    label: 'Freelancer',
    description: 'Clients, projects, skills, and money goals.',
    icon: BriefcaseBusiness,
    visionSuggestions: ['Get better clients', 'Improve my portfolio', 'Hit an income goal', 'Build a better workflow'],
    taskSuggestions: ['Update one portfolio section', 'Send one proposal', 'Create a client checklist', 'Log today\'s work proof'],
    tone: 'Make your work easier to trust and easier to show.'
  },
  {
    id: 'growth',
    label: 'Personal Growth',
    description: 'Health, habits, mindset, and lifestyle.',
    icon: HeartPulse,
    visionSuggestions: ['Improve focus', 'Build consistency', 'Fix my routine', 'Track my habits'],
    taskSuggestions: ['Do one 10-minute reset', 'Plan tomorrow\'s routine', 'Finish one small habit', 'Log today\'s growth proof'],
    tone: 'Start small. Prove progress. Return tomorrow.'
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Build your own growth system.',
    icon: Compass,
    visionSuggestions: ['Build my first system', 'Finish one meaningful project', 'Create a better routine', 'Track real progress'],
    taskSuggestions: ['Write the first plan', 'Pick one next move', 'Add one resource', 'Log today\'s proof'],
    tone: 'Shape VisNova around the way you build.'
  }
];

export const ONBOARDING_FEATURE_CHIPS = [
  { label: 'Vision', copy: 'Your long-term goal.' },
  { label: 'Task', copy: 'Your next move.' },
  { label: 'Proof', copy: 'What you actually did.' },
  { label: 'Progress Pulse', copy: 'Your visible growth.' },
  { label: 'Circle', copy: 'Accountability when you want it.' },
  { label: 'Notes / Journal', copy: 'Reflection connected to goals.' }
];

export function getOnboardingPath(id: OnboardingPathId | string | null | undefined) {
  return ONBOARDING_PATHS.find(path => path.id === id) || ONBOARDING_PATHS[0];
}
