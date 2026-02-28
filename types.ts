
export interface User {
  email: string;
  name: string;
  photoURL?: string;
  isAuthenticated: boolean;
  bio?: string;
  github?: string;
  techStack?: string;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isAi?: boolean;
}

export type Domain = 'AI/ML' | 'Web Dev' | 'Android';

export type AppView = 'dashboard' | 'chat' | 'leads' | 'events' | 'resources' | 'about';

export interface FAQItem {
  question: string;
  answer: string;
}
