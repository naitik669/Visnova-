export type ProfileRoleCategory = {
  name: string;
  roles: string[];
};

export const PROFILE_ROLE_CATEGORIES: ProfileRoleCategory[] = [
  {
    name: 'Tech & Builders',
    roles: ['Software Developer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Web Developer', 'App Developer', 'Mobile Developer', 'AI Engineer', 'Machine Learning Engineer', 'Data Scientist', 'Data Analyst', 'Cybersecurity Specialist', 'Cloud Engineer', 'DevOps Engineer', 'Game Developer', 'Blockchain Developer', 'Robotics Engineer', 'Embedded Systems Engineer', 'No-Code Builder', 'Automation Specialist', 'QA Engineer', 'Product Engineer']
  },
  {
    name: 'Engineering',
    roles: ['Mechanical Engineer', 'Civil Engineer', 'Electrical Engineer', 'Electronics Engineer', 'Aerospace Engineer', 'Chemical Engineer', 'Industrial Engineer', 'Manufacturing Engineer', 'Biomedical Engineer', 'Environmental Engineer', 'Automotive Engineer', 'Mechatronics Engineer']
  },
  {
    name: 'Creators & Media',
    roles: ['Content Creator', 'YouTuber', 'Streamer', 'Influencer', 'Video Editor', 'Animator', 'Motion Designer', 'Filmmaker', 'Photographer', 'Photo Editor', 'Graphic Designer', 'Brand Designer', 'UI/UX Designer', 'Product Designer', 'Writer', 'Copywriter', 'Blogger', 'Podcaster', 'Storyteller', 'Meme Creator', 'Social Media Manager', 'Creative Director']
  },
  {
    name: 'Business & Entrepreneurship',
    roles: ['Entrepreneur', 'Startup Founder', 'Business Owner', 'Solopreneur', 'Marketer', 'Digital Marketer', 'Growth Marketer', 'Sales Specialist', 'Product Manager', 'Project Manager', 'Operations Manager', 'Business Analyst', 'Consultant', 'Investor', 'E-commerce Seller', 'Agency Owner', 'Community Builder']
  },
  {
    name: 'Academics & Students',
    roles: ['Student', 'High School Student', 'College Student', 'Commerce Student', 'Science Student', 'Arts Student', 'Engineering Student', 'Medical Student', 'Law Student', 'MBA Student', 'Exam Aspirant', 'Researcher', 'Scholar', 'Tutor', 'Teacher', 'Professor', 'Educator']
  },
  {
    name: 'Health & Medical',
    roles: ['Doctor', 'Medical Professional', 'Nurse', 'Pharmacist', 'Dentist', 'Physiotherapist', 'Therapist', 'Psychologist', 'Counsellor', 'Fitness Coach', 'Nutritionist', 'Personal Trainer', 'Yoga Instructor', 'Wellness Coach']
  },
  {
    name: 'Lifestyle & Self-Development',
    roles: ['Self-Improver', 'Discipline Builder', 'Productivity Enthusiast', 'Learner', 'Explorer', 'Goal Setter', 'Habit Builder', 'Mindfulness Practitioner', 'Life Coach', 'Public Speaker', 'Traveler']
  },
  {
    name: 'Creative Arts',
    roles: ['Artist', 'Visual Artist', 'Digital Artist', 'Concept Artist', '3D Artist', 'Musician', 'Music Producer', 'DJ', 'Rapper', 'Singer', 'Songwriter', 'Painter', 'Illustrator', 'Comic Artist', 'Tattoo Artist', 'Dancer', 'Choreographer', 'Actor', 'Theatre Artist', 'Fashion Designer', 'Makeup Artist']
  },
  {
    name: 'Finance, Law & Public Service',
    roles: ['Accountant', 'Finance Analyst', 'Trader', 'Banker', 'Financial Planner', 'Lawyer', 'Legal Professional', 'Civil Services Aspirant', 'Government Employee', 'Policy Researcher', 'Nonprofit Worker', 'Social Worker']
  },
  {
    name: 'Gaming & Sports',
    roles: ['Gamer', 'Esports Player', 'Game Streamer', 'Game Designer', 'Athlete', 'Coach', 'Sports Analyst', 'Martial Artist']
  },
  {
    name: 'Trades & Practical Skills',
    roles: ['Chef', 'Baker', 'Interior Designer', 'Architect', 'Real Estate Professional', 'Farmer', 'Craftsperson', 'Mechanic', 'Electrician', 'Carpenter']
  },
  {
    name: 'Other / Flexible',
    roles: ['Freelancer', 'Side Hustler', 'Multi-skilled', 'Generalist', 'Creator', 'Builder', 'Professional', 'Volunteer', 'Parent', 'Career Switcher']
  }
];

export const PROFILE_ROLE_OPTIONS = PROFILE_ROLE_CATEGORIES.flatMap(category =>
  category.roles.map(role => ({ value: role, label: role, description: category.name }))
);
