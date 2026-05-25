export type ProfileRoleCategory = {
  name: string;
  roles: string[];
};

export const PROFILE_ROLE_CATEGORIES: ProfileRoleCategory[] = [
  {
    name: 'Tech & Builders',
    roles: ['Software Developer', 'Web Developer', 'App Developer', 'Data Scientist', 'Data Analyst', 'Cybersecurity Specialist', 'Cloud Engineer', 'DevOps Engineer', 'Game Developer', 'Blockchain Developer', 'Robotics Engineer', 'Embedded Systems Engineer']
  },
  {
    name: 'Engineering',
    roles: ['Mechanical Engineer', 'Civil Engineer', 'Electrical Engineer', 'Electronics Engineer', 'Aerospace Engineer', 'Chemical Engineer', 'Industrial Engineer']
  },
  {
    name: 'Creators & Media',
    roles: ['Content Creator', 'YouTuber', 'Video Editor', 'Animator', 'Filmmaker', 'Photographer', 'Graphic Designer', 'UI/UX Designer', 'Writer', 'Blogger', 'Podcaster', 'Storyteller', 'Meme Creator']
  },
  {
    name: 'Business & Entrepreneurship',
    roles: ['Entrepreneur', 'Startup Founder', 'Business Owner', 'Marketer', 'Digital Marketer', 'Sales Specialist', 'Product Manager', 'Business Analyst', 'Consultant', 'Investor']
  },
  {
    name: 'Academics & Students',
    roles: ['Student', 'Commerce Student', 'Science Student', 'Engineering Student', 'Medical Student', 'Law Student', 'Researcher', 'Scholar']
  },
  {
    name: 'Health & Medical',
    roles: ['Doctor', 'Medical Professional', 'Nurse', 'Therapist', 'Psychologist', 'Fitness Coach', 'Nutritionist', 'Personal Trainer']
  },
  {
    name: 'Lifestyle & Self-Development',
    roles: ['Self-Improver', 'Discipline Builder', 'Productivity Enthusiast', 'Learner', 'Explorer']
  },
  {
    name: 'Creative Arts',
    roles: ['Musician', 'Rapper', 'Singer', 'Painter', 'Illustrator', 'Dancer', 'Actor']
  },
  {
    name: 'Other / Flexible',
    roles: ['Freelancer', 'Side Hustler', 'Multi-skilled', 'Generalist']
  }
];

export const PROFILE_ROLE_OPTIONS = PROFILE_ROLE_CATEGORIES.flatMap(category =>
  category.roles.map(role => ({ value: role, label: role, description: category.name }))
);
