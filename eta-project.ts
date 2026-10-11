import { SiReact, SiTypescript, SiPostgresql, SiDocker } from '../icons';

export const etaProject = {
  id: 'eta-digital-education-platform',
  title: 'Exploratory Training Academy (ETA)',
  category: 'Full-Stack Education Platform',
  overview: 'A complete digital education management platform designed for educational institutions that may operate fully online, physically, or in a hybrid model. Built with modern web technologies to provide seamless learning experiences across multiple delivery modes.',
  technologies: [
    {
      name: 'TypeScript',
      icon: SiTypescript,
    },
    {
      name: 'React',
      icon: SiReact,
    },
    {
      name: 'PostgreSQL',
      icon: SiPostgresql,
    },
    {
      name: 'Docker',
      icon: SiDocker,
    },
  ],
  architecture: [
    'TypeScript-based full-stack architecture ensuring type safety across frontend and backend',
    'Modular component structure for scalable educational content delivery',
    'Support for multiple institution models: online, physical, and hybrid learning environments',
    'Containerized deployment using Docker for consistent staging and production environments',
  ],
  challenges: [
    'Accommodating diverse educational institution requirements across online, in-person, and hybrid models',
    'Managing complex enrollment and course scheduling for multiple delivery modes',
    'Ensuring platform scalability to handle growing numbers of students and courses',
  ],
  lessonsLearned: [
    'Building flexible systems that can adapt to multiple institutional contexts',
    'Importance of TypeScript in maintaining code quality in large education platforms',
    'Designing user interfaces that work across different learning environments and pedagogies',
  ],
  futureImprovements: [
    'AI-powered personalized learning recommendations',
    'Advanced analytics dashboard for institutional performance tracking',
    'Integration with third-party education tools and standards (LMS interoperability)',
    'Mobile-first responsive design enhancements',
    'Real-time collaboration features for hybrid learning sessions',
  ],
  githubUrl: 'https://github.com/MSabbirHossen/ETA',
  liveUrl: 'https://eta.example.com/',
  screenshots: ['/screenshots/eta-dashboard.png', '/screenshots/eta-course-view.png'],
  featured: false,
  status: 'In Development',
  year: '2026',
  role: 'Solo Developer',
  duration: 'Ongoing',
  teamSize: '1',
  client: 'Personal',
  difficulty: 'Advanced',
  featuredOrder: null,
};