
export interface User {
  email: string;
  name: string;
  photoURL?: string;
  isAuthenticated: boolean;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isAi?: boolean;
}

export type Domain = 'AI/ML' | 'Web Dev' | 'Android';

export interface FAQItem {
  question: string;
  answer: string;
}
