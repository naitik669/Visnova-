import { Vision, Task } from '../types';

export interface VisionTemplate {
  id: string;
  title: string;
  description: string;
  tags: string[];
  suggestedTasks: Omit<Task, 'id'>[];
  category: 'Skill' | 'Health' | 'Business' | 'Personal';
  color?: string;
}

export const VISION_TEMPLATES: VisionTemplate[] = [
  {
    id: 'tech-skill',
    title: 'Master a New Technical Skill',
    description: 'A structured approach to learning complex technical subjects from fundamentals to advanced projects.',
    tags: ['Tech', 'Learning', 'Career'],
    category: 'Skill',
    suggestedTasks: [
      { text: 'Define 3 core learning objectives', completed: false, priority: 'high' },
      { text: 'Curate top 5 learning resources', completed: false, priority: 'medium' },
      { text: 'Complete foundational theory course', completed: false, priority: 'high' },
      { text: 'Build a small proof-of-concept project', completed: false, priority: 'medium' },
      { text: 'Implement a complex end-to-end project', completed: false, priority: 'high' },
      { text: 'Document and share learnings online', completed: false, priority: 'low' }
    ],
    color: '#3B82F6'
  },
  {
    id: 'fitness-prime',
    title: 'Peak Physical Performance',
    description: 'Transform your physical health through systematic training, nutrition, and recovery optimization.',
    tags: ['Health', 'Body', 'Discipline'],
    category: 'Health',
    suggestedTasks: [
      { text: 'Establish baseline performance metrics', completed: false, priority: 'high' },
      { text: 'Design 12-week progressive training plan', completed: false, priority: 'high' },
      { text: 'Optimize sleep environment and routine', completed: false, priority: 'medium' },
      { text: 'Meal prep for consistent nutrition', completed: false, priority: 'medium' },
      { text: 'Record weekly progress photos/measurements', completed: false, priority: 'low' },
      { text: 'Hit a specific personal record (PR)', completed: false, priority: 'high' }
    ],
    color: '#10B981'
  },
  {
    id: 'side-hustle',
    title: 'Launch a Side Hustle',
    description: 'Move from idea to first revenue with a lean, experimental business model.',
    tags: ['Business', 'Finance', 'Innovation'],
    category: 'Business',
    suggestedTasks: [
      { text: 'Validate problem through 5 user interviews', completed: false, priority: 'high' },
      { text: 'Create a landing page / MVP', completed: false, priority: 'high' },
      { text: 'Initial outreach / Marketing campaign', completed: false, priority: 'medium' },
      { text: 'Secure first paying customer', completed: false, priority: 'high' },
      { text: 'Refine product based on feedback', completed: false, priority: 'medium' },
      { text: 'Scale to consistent monthly revenue', completed: false, priority: 'high' }
    ],
    color: '#F59E0B'
  },
  {
    id: 'mindfulness',
    title: 'Stoic Mindset & Focus',
    description: 'Cultivate mental clarity, resilience, and laser-sharp focus through daily practices.',
    tags: ['Mind', 'Spirit', 'Focus'],
    category: 'Personal',
    suggestedTasks: [
      { text: 'Read 3 foundational philosophical texts', completed: false, priority: 'medium' },
      { text: 'Daily 20-minute meditation streak', completed: false, priority: 'high' },
      { text: 'Morning/Evening reflection journaling', completed: false, priority: 'medium' },
      { text: 'Digital detox (weekend no-screen policy)', completed: false, priority: 'medium' },
      { text: 'Practice negative visualization daily', completed: false, priority: 'low' },
      { text: 'Complete a 7-day deep work challenge', completed: false, priority: 'high' }
    ],
    color: '#8B5CF6'
  }
];
