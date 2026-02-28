
import React, { useState, useRef, useEffect } from 'react';
import { Message, User, AppView } from './types';
import { IDEAS } from './constants';
import { askGemini, analyzeVideoWithGemini } from './services/geminiService';

import { marked } from 'marked';
import DOMPurify from 'dompurify';

// The "old default logo" style: 4 colored dots in a pill container
// Now intended EXCLUSIVELY for the header next to the title.
export const GDGLogo = ({ className = "" }: { className?: string }) => (
  <div className={`flex gap-1.5 p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-full px-2.5 sm:px-3 shadow-inner ${className}`}>
    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#EA4335]"></div>
    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#4285F4]"></div>
    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#34A853]"></div>
    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#FBBC05]"></div>
  </div>
);

// AI Assistant Icon for chat and other areas
const AssistantIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User>({ name: 'Guest', email: 'guest@gdg.dev', isAuthenticated: true });
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  const [isHeaderBlurred, setIsHeaderBlurred] = useState(false);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    setIsHeaderHidden(false);
  }, [currentView]);

  const [darkMode, setDarkMode] = useState<boolean>(true);

  const [bgType, setBgType] = useState<string>(() => {
    return localStorage.getItem('gdg_assistant_bg') || 'grid';
  });

  // Preferences State
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(() => localStorage.getItem('gdg_speech_enabled') === 'true');
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('gdg_notifications_enabled') !== 'false');
  const [compactMode, setCompactMode] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'help' | 'about' | 'settings' | 'history' | 'profile' | 'confirmClear' | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Profile Edit State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editGithub, setEditGithub] = useState('');
  const [editTechStack, setEditTechStack] = useState('');
  const [profilePic, setProfilePic] = useState<string | undefined>(undefined);

  // Video Understanding State
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoFrames, setVideoFrames] = useState<string[]>([]);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // AboutView Scroll State
  const [showAboutScrollTop, setShowAboutScrollTop] = useState(false);
  const aboutScrollContainerRef = useRef<HTMLDivElement>(null);

  // LeadsView Scroll State
  const [showLeadsScrollTop, setShowLeadsScrollTop] = useState(false);
  const leadsScrollRef = useRef<HTMLDivElement>(null);

  // ResourcesView Scroll State
  const [showResourcesScrollTop, setShowResourcesScrollTop] = useState(false);
  const resourcesScrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('gdg_assistant_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        syncEditFields(parsed);
      } catch (e) {
        localStorage.removeItem('gdg_assistant_user');
      }
    } else {
      syncEditFields({ name: 'Guest', email: 'guest@gdg.dev', isAuthenticated: true });
    }

    const savedMessages = localStorage.getItem('gdg_chat_history');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      } catch (e) {
        setWelcomeMessage();
      }
    } else {
      setWelcomeMessage();
    }
    setIsAppLoaded(true);
  }, []);

  const syncEditFields = (u: User) => {
    setEditName(u.name || '');
    setEditEmail(u.email || '');
    setEditBio(u.bio || '');
    setEditGithub(u.github || '');
    setEditTechStack(u.techStack || '');
    setProfilePic(u.photoURL);
  };

  const setWelcomeMessage = () => {
    setMessages([{
      id: '1',
      text: "ðŸ‘‹ Hey there! I'm the GDG SRMCEM AI Assistant. Ask me anything about our community, events, or tech questions! ðŸš€",
      sender: 'bot',
      timestamp: new Date(),
    }]);
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('gdg_assistant_dark_mode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('gdg_assistant_bg', bgType);
  }, [bgType]);

  useEffect(() => {
    localStorage.setItem('gdg_speech_enabled', String(isSpeechEnabled));
  }, [isSpeechEnabled]);

  useEffect(() => {
    localStorage.setItem('gdg_notifications_enabled', String(notificationsEnabled));
  }, [notificationsEnabled]);

  useEffect(() => {
    if (isAppLoaded && currentView === 'chat') {
      localStorage.setItem('gdg_chat_history', JSON.stringify(messages));
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [messages, isAppLoaded, currentView]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClearSession = () => {
    if (window.confirm("Are you sure you want to clear all session data?")) {
      localStorage.clear();
      if (window.speechSynthesis) window.speechSynthesis.cancel();

      const defaultUser: User = { name: 'Guest', email: 'guest@gdg.dev', isAuthenticated: true };
      setUser(defaultUser);
      syncEditFields(defaultUser);
      setMessages([]);
      setInput('');
      setIsLoading(false);
      setIsMenuOpen(false);
      setActiveModal(null);
      setVideoFrames([]);
      setSelectedVideo(null);
      setCurrentView('dashboard');
      setWelcomeMessage();
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser: User = {
      ...user,
      name: editName,
      email: editEmail,
      bio: editBio,
      github: editGithub,
      techStack: editTechStack,
      photoURL: profilePic
    };
    setUser(updatedUser);
    localStorage.setItem('gdg_assistant_user', JSON.stringify(updatedUser));
    setActiveModal(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const extractFrames = (file: File): Promise<string[]> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.src = URL.createObjectURL(file);

      video.onloadedmetadata = () => {
        const duration = video.duration;
        const framesToExtract = 8;
        const interval = duration / (framesToExtract + 1);
        const frames: string[] = [];
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        let currentFrame = 1;

        const captureFrame = () => {
          video.currentTime = currentFrame * interval;
        };

        video.onseeked = () => {
          if (context) {
            canvas.width = video.videoWidth / 4;
            canvas.height = video.videoHeight / 4;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            frames.push(canvas.toDataURL('image/jpeg', 0.7));
          }

          if (currentFrame < framesToExtract) {
            currentFrame++;
            captureFrame();
          } else {
            URL.revokeObjectURL(video.src);
            resolve(frames);
          }
        };

        captureFrame();
      };
    });
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingVideo(true);
      setSelectedVideo(file);
      try {
        const frames = await extractFrames(file);
        setVideoFrames(frames);
      } catch (err) {
        console.error("Frame extraction error", err);
        alert("Could not process video. Try a shorter MP4 file.");
        setSelectedVideo(null);
      } finally {
        setIsProcessingVideo(false);
      }
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const processResponse = async (text: string) => {
    const prompt = text.toLowerCase().trim();
    let botReply = '';

    if (videoFrames.length > 0) {
      botReply = await analyzeVideoWithGemini(text, videoFrames);
      setVideoFrames([]);
      setSelectedVideo(null);
    } else if (prompt.startsWith('/idea')) {
      // Keep /idea command for quick project idea generation
      const domain = prompt.replace('/idea', '').trim();
      const matchedKey = Object.keys(IDEAS).find(k => k.toLowerCase() === domain.toLowerCase());
      if (matchedKey) {
        botReply = `ðŸ’¡ ${matchedKey} Idea:\n\n${IDEAS[matchedKey][Math.floor(Math.random() * IDEAS[matchedKey].length)]}`;
      } else {
        botReply = `Available domains: AI/ML, Web Dev, Android. Try: /idea AI/ML`;
      }
    } else {
      // All queries go through Gemini for dynamic, beginner-friendly responses
      botReply = await askGemini(text);
    }

    const botMessage: Message = {
      id: Date.now().toString(),
      text: botReply,
      sender: 'bot',
      timestamp: new Date(),
      isAi: true,
    };

    setMessages(prev => [...prev, botMessage]);
    setIsLoading(false);
    if (isSpeechEnabled) speak(botReply.replace(/[^\w\s.,?!]/gi, ''));
  };

  const handleSend = async () => {
    if ((!input.trim() && videoFrames.length === 0) || isLoading) return;

    let messageText = input;
    if (videoFrames.length > 0 && !input.trim()) {
      messageText = "Analyze this video for me.";
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText + (selectedVideo ? ` [Video attached: ${selectedVideo.name}]` : ""),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = messageText;
    setInput('');
    setIsLoading(true);
    await processResponse(currentInput);
  };

  const toggleListening = () => {
    if (isListening) recognitionRef.current?.stop();
    else { setIsListening(true); recognitionRef.current?.start(); }
  };

  const getBackgroundStyle = () => {
    const isDark = darkMode;
    switch (bgType) {
      case 'dots':
        return {
          backgroundImage: `radial-gradient(${isDark ? '#334155' : '#e2e8f0'} 1.5px, transparent 1.5px)`,
          backgroundSize: '24px 24px'
        };
      case 'plain':
        return { backgroundImage: 'none' };
      case 'grid':
      default:
        return {
          backgroundImage: isDark
            ? 'radial-gradient(#1e293b 1px, transparent 1px)'
            : 'radial-gradient(#f1f5f9 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        };
    }
  };

  const renderMarkdown = (text: string) => {
    const m = marked as any;
    const rawHtml = typeof m === 'function' ? m(text) : m.parse(text);
    const cleanHtml = DOMPurify.sanitize(rawHtml as string);
    return { __html: cleanHtml };
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;

    // Blur the header when scrolling past the hero area
    const threshold = Math.max(window.innerHeight * 0.6, 400) - 80;
    setIsHeaderBlurred(currentScrollY > threshold);

    if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
      setIsHeaderHidden(true);
    } else if (currentScrollY < lastScrollY.current) {
      setIsHeaderHidden(false);
    }
    lastScrollY.current = currentScrollY;
  };

  // View Components
  const Dashboard = () => {
    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'Good morning';
      if (hour < 18) return 'Good afternoon';
      return 'Good evening';
    };

    return (
      <div
        className="flex-1 overflow-y-auto relative animate-in fade-in duration-1000"
        onScroll={handleScroll}
      >

        {/* ===== HERO SECTION ===== */}
        <div className="relative w-full h-[60vh] min-h-[400px] flex flex-col items-center justify-center overflow-hidden">

          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70 z-0"></div>

          <div className="relative z-10 text-center space-y-5 sm:space-y-6 px-4 w-full max-w-4xl mx-auto">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-white drop-shadow-lg">
              <span className="inline-block">
                <span className="text-[#4285F4]">G</span>
                <span className="text-[#EA4335]">o</span>
                <span className="text-[#FBBC05]">o</span>
                <span className="text-[#4285F4]">g</span>
                <span className="text-[#34A853]">l</span>
                <span className="text-[#EA4335]">e</span>
              </span>
              {" Developer"} <br className="hidden sm:block" /> {"Groups"}
              <span className="block text-xl sm:text-2xl md:text-3xl mt-3 text-[#4285F4] font-bold">
                on Campus SRMCEM
              </span>
            </h2>
            <p className="text-sm sm:text-base font-medium max-w-2xl mx-auto px-4 leading-relaxed text-gray-200">
              {getGreeting()}, <span className="text-[#4285F4] font-bold">{user.name}</span>! Welcome to your all-in-one workspace for hackathon prep, AI-powered assistance, community resources, and Google technologies.
            </p>

          </div>
        </div>

        {/* ===== MAIN DASHBOARD CONTENT ===== */}
        <div className={`p-4 sm:p-8 md:p-12 relative z-10 w-full overflow-hidden ${darkMode ? 'bg-[#0a0a0a]' : 'bg-[#f5f5f5]'}`}>
          <div className="max-w-7xl mx-auto space-y-10 sm:space-y-14 mt-4">

            {/* ===== ABOUT GDG SECTION ===== */}
            <div className={`p-6 sm:p-10 rounded-xl border transition-all duration-300 ${darkMode ? 'bg-[#111] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
              <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#4285F4] rounded-xl flex items-center justify-center shadow-lg shadow-[#4285F4]/20 flex-shrink-0">
                  <span className="text-2xl sm:text-3xl">🎓</span>
                </div>
                <div className="space-y-3 flex-1">
                  <h3 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>What is <span className="text-[#4285F4]">GDG on Campus</span>?</h3>
                  <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <strong className="text-[#4285F4]">Google Developer Groups on Campus (GDG)</strong> are university-based communities backed by Google Developers. We bring students together to learn, build, and grow with Google technologies — from Cloud and AI/ML to Android and Web. Whether you're a first-year beginner or a seasoned coder, GDG SRMCEM is your launchpad for real-world skills and industry connections.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {['Open Source', 'Workshops', 'Hackathons', 'Study Jams', 'Tech Talks', 'Networking'].map((tag) => (
                      <span key={tag} className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'bg-gray-800 text-gray-400 border border-gray-700' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ===== NAVIGATION CARDS ===== */}
            <div className="space-y-5">
              <div className="px-1">
                <h3 className={`text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Explore <span className="text-[#4285F4]">Tools</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#4285F4]/10 text-[#4285F4]">Beta</span>
                </h3>
                <p className={`text-sm mt-1 text-gray-500`}>Everything you need to crush your next hackathon.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {[
                  { view: 'chat', title: 'AI Assistant', badge: 'Gemini 2.0', desc: 'Get technical advice, debug code, brainstorm architecture, and analyze videos with Gemini-powered AI.', icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z", color: '#4285F4' },
                  { view: 'certification', title: 'Certification Zone', badge: 'External', externalUrl: 'https://gdg-certify.vercel.app/', desc: 'Earn official Google credentials and validate your skills.', icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z", color: '#34A853' }
                ].map((item: any, i) => (
                  <button key={i} onClick={() => { if (item.externalUrl) { window.open(item.externalUrl, '_blank'); } else { setCurrentView(item.view as AppView); } }}
                    className={`group relative p-6 sm:p-8 rounded-xl border text-left transition-all duration-300 hover:-translate-y-1 card-glow ${darkMode ? 'bg-[#111] border-gray-800 hover:border-gray-700' : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'}`}>
                    <div className="flex items-start justify-between mb-5">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md" style={{ backgroundColor: item.color }}>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
                      </div>
                      <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider ${darkMode ? 'bg-gray-800 text-gray-400 border border-gray-700' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>{item.badge}</span>
                    </div>
                    <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.title}</h3>
                    <p className={`text-xs sm:text-sm leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.desc}</p>
                    <div className="absolute bottom-5 right-5 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                      <svg className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ===== HACKATHON TIPS ===== */}
            <div className="space-y-5">
              <div className="px-1">
                <h3 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>💡 Hackathon <span className="text-[#4285F4]">Quick Tips</span></h3>
                <p className="text-sm mt-1 text-gray-500">Pro strategies from past winners and GDG mentors.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                {[
                  { title: "Start with the Problem", tip: "Judges care more about the problem you solve than the tech you use. Define a clear problem statement in the first 30 minutes.", icon: "🎯" },
                  { title: "Build an MVP First", tip: "A working demo beats a polished mockup. Get core functionality running before adding bells and whistles.", icon: "🏗️" },
                  { title: "Nail the Pitch", tip: "You have 3-5 minutes to impress. Lead with the problem, demo the solution, explain the impact. Practice twice.", icon: "🎤" },
                ].map((tip, i) => (
                  <div key={i} className={`p-6 rounded-xl border transition-all duration-300 hover:-translate-y-1 ${darkMode ? 'bg-[#111] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="text-3xl mb-4">{tip.icon}</div>
                    <h4 className={`font-bold text-sm mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{tip.title}</h4>
                    <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{tip.tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ===== FOOTER CTA ===== */}
            <div className={`relative p-8 sm:p-12 md:p-16 rounded-xl border overflow-hidden ${darkMode ? 'bg-gradient-to-br from-[#111] to-[#0a0a2e] border-gray-800' : 'bg-gradient-to-br from-[#4285F4] to-[#667eea] border-transparent'}`}>

              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-16 w-full max-w-5xl mx-auto">
                {/* Logo on left */}
                <div className="flex-shrink-0 bg-white p-4 rounded-[2rem] shadow-xl flex items-center justify-center transition-transform hover:scale-105 duration-300">
                  <img src="/srmcem_logo.png" alt="SRMCEM Logo" className="w-28 sm:w-36 md:w-48 h-auto object-contain drop-shadow-sm" />
                </div>

                {/* Text on right */}
                <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-6 flex-1">
                  <span className={`inline-block px-4 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest ${darkMode ? 'bg-[#4285F4]/20 text-[#4285F4] border border-[#4285F4]/30' : 'bg-white/20 text-white border border-white/30'}`}>
                    Join The Movement
                  </span>
                  <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] text-white">
                    Shape the future of tech with <span className={`${darkMode ? 'text-[#4285F4]' : ''}`}>GDG SRMCEM.</span>
                  </h3>
                  <p className={`text-sm sm:text-base font-medium max-w-lg ${darkMode ? 'text-gray-400' : 'text-white/80'}`}>
                    Don't just write code—build communities, learn from industry experts, and launch your career.
                  </p>
                  <a href="mailto:gdg.srmcem@gmail.com" className={`inline-flex items-center justify-center px-8 py-3.5 text-sm font-bold rounded-lg border-2 transition-all hover:-translate-y-0.5 ${darkMode ? 'border-gray-600 text-gray-300 hover:text-white hover:border-[#4285F4]' : 'border-white/50 text-white hover:bg-white hover:text-[#4285F4]'}`}>
                    Contact Us
                  </a>
                </div>
              </div>

              <div className={`mt-10 pt-6 border-t flex flex-wrap justify-center gap-6 relative z-10 ${darkMode ? 'border-gray-800' : 'border-white/20'}`}>
                {[
                  { name: 'Discord', url: 'https://discord.gg/qHvqUePnY' },
                  { name: 'Instagram', url: 'https://www.instagram.com/gdg_on_campus_srmcem?igsh=MXAxNXUwZWhnaHluNg==' },
                  { name: 'LinkedIn', url: 'https://www.linkedin.com/company/gdgoncampus-srmcem/' }
                ].map((social) => (
                  <a key={social.name} href={social.url} target="_blank" rel="noopener noreferrer" className={`text-xs font-bold uppercase tracking-widest transition-colors ${darkMode ? 'text-gray-500 hover:text-[#4285F4]' : 'text-white/60 hover:text-white'}`}>{social.name}</a>
                ))}
              </div>
              <p className={`text-[9px] font-bold uppercase tracking-widest opacity-50 mt-8 text-center relative z-10 w-full block ${darkMode ? 'text-gray-600' : 'text-white'}`}>Made with ❤️ by GDG on Campus SRMCEM</p>
            </div>
          </div>
        </div>

        {/* Global Action Button */}
        <button
          onClick={() => setActiveModal('about')}
          className={`fixed bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 z-50 ${darkMode ? 'bg-[#111] text-[#4285F4] border border-gray-800 shadow-lg' : 'bg-white text-[#4285F4] border border-gray-200 shadow-lg'}`}
          title="About the App"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </button>
      </div>
    );
  };

  const LeadsView = () => {
    const handleLocalScroll = (e: React.UIEvent<HTMLDivElement>) => {
      setShowLeadsScrollTop(e.currentTarget.scrollTop > 300);
      handleScroll(e);
    };

    const scrollToTop = () => {
      leadsScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
      <div
        ref={leadsScrollRef}
        className={`flex-1 overflow-y-auto p-4 sm:p-8 relative ${darkMode ? 'bg-[#0a0a0a]' : 'bg-[#f5f5f5]'}`}
        onScroll={handleLocalScroll}
      >
        <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <button onClick={() => setCurrentView('dashboard')} className={`self-start p-2.5 rounded-lg ${darkMode ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'} transition-all active:scale-90`}>
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>Our <span className="text-[#4285F4]">Team</span></h2>
              <p className="text-sm text-gray-500 mt-2">
                GDG on Campus SRMCEM Organizing Team.<br />
                Meet the people behind the community. Reach out for mentorship, guidance, and collaboration.
              </p>
            </div>
          </div>

          {/* ===== LEADS SECTION ===== */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-[#4285F4] rounded-full"></div>
              <h3 className={`text-xl font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>Leads</h3>
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>Core Team</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {[
                { name: "Priyam Srivastava", role: "Organizer (Lead)", linkedin: "https://www.linkedin.com/in/itspriyamsri/", color: "from-blue-500 to-blue-600" },
                { name: "Navleen Kaur", role: "Co-Organizer", linkedin: "https://www.linkedin.com/in/navleen-kaur-782257294/", color: "from-red-500 to-red-600" },
                { name: "Lav Kumar Shakya", role: "Technical Head", linkedin: "https://www.linkedin.com/in/lavkumarshakya/", color: "from-green-500 to-green-600" },
                { name: "Bhanu Pratap Singh", role: "Marketing Head", linkedin: "https://www.linkedin.com/in/bylerma/", color: "from-indigo-500 to-indigo-600" },
                { name: "Ayush Pandey", role: "Creative Head", linkedin: "https://www.linkedin.com/in/ayush-pandey-66b254294/", color: "from-cyan-500 to-cyan-600" },
                { name: "Kirti", role: "Event and PR Head", linkedin: "https://www.linkedin.com/in/kirti-5b7231325/", color: "from-orange-500 to-orange-600" },
                { name: "Ananay Verma", role: "Social Media Head", linkedin: "https://www.linkedin.com/in/ananay-verma-268843326/", color: "from-purple-500 to-purple-600" }
              ].map((lead, i) => (
                <div key={i} className={`group p-6 rounded-xl border flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 card-glow ${darkMode ? 'bg-[#111] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                  <div className="flex items-center gap-4 sm:gap-5">
                    <div className={`w-12 h-12 bg-gradient-to-br ${lead.color} rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                      {lead.name[0]}
                    </div>
                    <div>
                      <h4 className={`font-bold text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>{lead.name}</h4>
                      <p className="text-[10px] font-bold text-[#4285F4] uppercase tracking-wider">{lead.role}</p>
                    </div>
                  </div>
                  <a href={lead.linkedin} target="_blank" rel="noopener noreferrer" className={`p-3 rounded-lg border flex items-center gap-2 transition-colors ${darkMode ? 'bg-black/30 border-gray-800 hover:border-blue-500/50 hover:bg-blue-500/5' : 'bg-gray-50 border-gray-200 hover:border-blue-400 hover:bg-blue-50'}`}>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#0A66C2] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                    <span className={`text-[10px] sm:text-sm font-medium truncate ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      LinkedIn Profile
                    </span>
                    <svg className="w-3 h-3 ml-auto text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* ===== COORDINATORS SECTION ===== */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-[#34A853] rounded-full"></div>
              <h3 className={`text-xl font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>Coordinators</h3>
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-green-50 text-green-600 border border-green-100'}`}>Support Team</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 pb-12">
              {[
                { name: "Ishan Kumar Tiwari", role: "Technical Coordinator", linkedin: "https://www.linkedin.com/in/ishan-kumar-tiwari/", color: "from-teal-500 to-teal-600" },
                { name: "Shikhar Shahi", role: "Technical Coordinator", linkedin: "https://www.linkedin.com/in/shikhar-shahi-7934a327a/", color: "from-sky-500 to-sky-600" },
                { name: "Aditya Srivastav", role: "Marketing Coordinator", linkedin: "https://www.linkedin.com/in/aditya-srivastav-85776a306/", color: "from-amber-500 to-amber-600" },
                { name: "Eshaan Singh Deo", role: "Marketing Coordinator", linkedin: "https://www.linkedin.com/in/eshaan-singh-deo-ba669433a/", color: "from-rose-500 to-rose-600" },
                { name: "Pranjali Nigam", role: "Event and PR Coordinator", linkedin: "http://linkedin.com/in/pranjali-nigam-29513a389/", color: "from-fuchsia-500 to-fuchsia-600" },
                { name: "Aadya Srivastava", role: "Event and PR Coordinator", linkedin: "https://www.linkedin.com/in/aadya-srivastava-6a7945387/", color: "from-pink-500 to-pink-600" },
                { name: "Anushka Nigam", role: "Creative Coordinator", linkedin: "https://www.linkedin.com/in/anushka-nigam-ai/", color: "from-violet-500 to-violet-600" },
                { name: "Divyansh Pal", role: "Creative Coordinator", linkedin: "https://www.linkedin.com/in/divyansh-pal-3b3abb31a/", color: "from-lime-500 to-lime-600" },
                { name: "Eshika Verma", role: "Creative Coordinator", linkedin: "https://www.linkedin.com/in/eshika-verma-64058a357/", color: "from-emerald-500 to-emerald-600" },
                { name: "Jigyasa Tiwari", role: "Social Media Coordinator", linkedin: "https://www.linkedin.com/in/jigyasatiwari/", color: "from-blue-500 to-blue-600" },
                { name: "Aamina Hassan", role: "Social Media Coordinator", linkedin: "https://www.linkedin.com/in/aamina-hasan-50a6a930b/", color: "from-purple-500 to-purple-600" },
              ].map((coord, i) => (
                <div key={i} className={`group p-6 rounded-xl border flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 card-glow ${darkMode ? 'bg-[#111] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                  <div className="flex items-center gap-4 sm:gap-5">
                    <div className={`w-12 h-12 bg-gradient-to-br ${coord.color} rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                      {coord.name[0]}
                    </div>
                    <div>
                      <h4 className={`font-bold text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>{coord.name}</h4>
                      <p className="text-[10px] font-bold text-[#34A853] uppercase tracking-wider">{coord.role}</p>
                    </div>
                  </div>
                  <a href={coord.linkedin} target="_blank" rel="noopener noreferrer" className={`p-3 rounded-lg border flex items-center gap-2 transition-colors ${darkMode ? 'bg-black/30 border-gray-800 hover:border-blue-500/50 hover:bg-blue-500/5' : 'bg-gray-50 border-gray-200 hover:border-blue-400 hover:bg-blue-50'}`}>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#0A66C2] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                    <span className={`text-[10px] sm:text-sm font-medium truncate ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      LinkedIn Profile
                    </span>
                    <svg className="w-3 h-3 ml-auto text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll to Top Button */}
        <button
          onClick={scrollToTop}
          className={`fixed bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 z-50 hover:scale-110 active:scale-95 shadow-lg ${showLeadsScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'} ${darkMode ? 'bg-[#111] text-[#4285F4] border border-gray-800' : 'bg-white text-[#4285F4] border border-gray-200'}`}
          title="Scroll to Top"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
        </button>
      </div>
    );
  };

  const EventsView = () => (
    <div className={`flex-1 overflow-y-auto p-4 sm:p-8 ${darkMode ? 'bg-[#0a0a0a]' : 'bg-[#f5f5f5]'}`} onScroll={handleScroll}>
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10">
        <div className="flex items-center gap-4 sm:gap-6">
          <button onClick={() => setCurrentView('dashboard')} className={`p-2.5 rounded-lg ${darkMode ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'} transition-all active:scale-90`}>
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>Event <span className="text-[#4285F4]">Timeline</span></h2>
        </div>
        <div className="space-y-4 sm:space-y-6">
          {[
            { title: "DevFest 2024", date: "Oct 15, 2024", type: "Conference", status: "Open" },
            { title: "Hack-A-Thon Sprint", date: "Nov 02, 2024", type: "Coding", status: "Coming Soon" },
            { title: "WTM Summit", date: "Dec 10, 2024", type: "Networking", status: "Registration Open" }
          ].map((event, i) => (
            <div key={i} className={`p-5 sm:p-6 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 group transition-all duration-300 hover:-translate-y-0.5 ${darkMode ? 'bg-[#111] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
              <div className="flex gap-4 sm:gap-6 items-center">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 bg-slate-100 dark:bg-slate-700 rounded-xl sm:rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500`}>
                  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z" /></svg>
                </div>
                <div>
                  <h4 className="font-black text-lg sm:text-xl mb-0.5 sm:mb-1">{event.title}</h4>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1.5"><svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z" /></svg>{event.date}</span>
                    <span className="hidden sm:block w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                    <span className="flex items-center gap-1.5 uppercase tracking-widest">{event.type}</span>
                  </div>
                </div>
              </div>
              <div className={`self-start sm:self-center px-4 sm:px-5 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm transition-all duration-300 ${event.status === 'Open' ? 'bg-green-500/10 text-green-600 border-green-200 dark:border-green-900/30' :
                event.status === 'Coming Soon' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:border-yellow-900/30' :
                  'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900/30'
                }`}>
                {event.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const ResourcesView = () => {
    const handleResourcesScroll = (e: React.UIEvent<HTMLDivElement>) => {
      handleScroll(e);
      setShowResourcesScrollTop(e.currentTarget.scrollTop > 300);
    };

    const scrollToTop = () => {
      resourcesScrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
      <div ref={resourcesScrollContainerRef} className={`flex-1 overflow-y-auto p-4 sm:p-8 relative ${darkMode ? 'bg-[#0a0a0a]' : 'bg-[#f5f5f5]'}`} onScroll={handleResourcesScroll}>
        <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10">
          <div className="flex items-center gap-4 sm:gap-6">
            <button onClick={() => setCurrentView('dashboard')} className={`p-2.5 rounded-lg ${darkMode ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'} transition-all active:scale-90`}>
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>Tech <span className="text-[#4285F4]">Hub</span></h2>
              <p className="text-sm text-gray-500">Core Google technologies for builders explored briefly.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {[
              { name: "Firebase", category: "Full Stack", desc: "Backend-as-a-Service including Hosting, Auth, and NoSQL databases for rapid MVP development.", color: 'bg-[#FFCA28]', url: 'https://firebase.google.com/' },
              { name: "Gemini API", category: "Intelligence", desc: "Access Google's most capable multimodal AI models for intelligent features in your app.", color: 'bg-[#8E24AA]', url: 'https://ai.google.dev/' },
              { name: "Google Cloud", category: "Infrastructure", desc: "Scalable computing, storage, and advanced specialized APIs for vision and speech.", color: 'bg-[#4285F4]', url: 'https://cloud.google.com/' },
              { name: "Flutter", category: "Mobile/Web", desc: "Build beautiful, natively compiled applications for mobile, web, and desktop from a single codebase.", color: 'bg-[#0468D7]', url: 'https://flutter.dev/' },
              { name: "TensorFlow", category: "Machine Learning", desc: "The end-to-end open source platform for machine learning, from research to production.", color: 'bg-[#FF6F00]', url: 'https://www.tensorflow.org/' },
              { name: "Android Studio", category: "Mobile", desc: "The official Integrated Development Environment (IDE) for Android app development.", color: 'bg-[#3DDC84]', url: 'https://developer.android.com/studio' },
              { name: "Chrome DevTools", category: "Web", desc: "A set of web developer tools built directly into the Google Chrome browser.", color: 'bg-[#4285F4]', url: 'https://developer.chrome.com/docs/devtools/' },
              { name: "Angular", category: "Web", desc: "A web development framework for building fast, reliable, and scalable web applications.", color: 'bg-[#DD0031]', url: 'https://angular.dev/' },
              { name: "Google Maps Platform", category: "APIs", desc: "Build location-based features with rich maps, routes, and places APIs.", color: 'bg-[#34A853]', url: 'https://mapsplatform.google.com/' },
              { name: "Material Design", category: "UI/UX", desc: "Google's open-source design system to help teams build high-quality digital experiences.", color: 'bg-[#EA4335]', url: 'https://m3.material.io/' },
              { name: "React", category: "Frontend", desc: "A JavaScript library for building user interfaces containing reusable components.", color: 'bg-[#61DAFB]', url: 'https://react.dev/' },
              { name: "Next.js", category: "Full Stack", desc: "The React Framework for the Web with built-in routing, API creation, and rendering optimizations.", color: 'bg-[#000000]', url: 'https://nextjs.org/' },
              { name: "Node.js", category: "Backend", desc: "An asynchronous event-driven JavaScript runtime designed to build scalable network applications.", color: 'bg-[#339933]', url: 'https://nodejs.org/' },
              { name: "Tailwind CSS", category: "Styling", desc: "A utility-first CSS framework packed with classes to build any design, directly in your markup.", color: 'bg-[#06B6D4]', url: 'https://tailwindcss.com/' },
              { name: "Docker", category: "DevOps", desc: "Accelerate how you build, share, and run applications in isolated containerized environments.", color: 'bg-[#2496ED]', url: 'https://www.docker.com/' },
              { name: "Postman", category: "API Testing", desc: "An API platform for building and using APIs, simplifying each step of the API lifecycle.", color: 'bg-[#FF6C37]', url: 'https://www.postman.com/' }
            ].map((tool, i) => (
              <a href={tool.url} target="_blank" rel="noopener noreferrer" key={i} className={`block p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1.5 group cursor-pointer overflow-hidden relative ${darkMode ? 'bg-[#151515] border-gray-800/60 hover:border-gray-600 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)]' : 'bg-white border-gray-100 shadow-sm hover:border-gray-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]'}`}>

                {/* Subtle gradient background on hover */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${tool.color.replace('bg-', 'bg-gradient-to-br from-transparent to-')}`}></div>

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-5">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 ${tool.color} rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                      <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${darkMode ? 'bg-[#0a0a0a] border-gray-800 text-gray-400 group-hover:text-white group-hover:border-gray-600 transition-colors' : 'bg-gray-50 border-gray-200 text-gray-500 group-hover:text-gray-800 transition-colors'}`}>
                      {tool.category}
                    </span>
                  </div>
                  <h4 className={`font-black text-xl mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {tool.name}
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-[#4285F4]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium mb-4">{tool.desc}</p>
                  <div className={`h-1 w-12 ${tool.color} rounded-full group-hover:w-full transition-all duration-700 opacity-80`}></div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Scroll To Top Button */}
        <button
          onClick={scrollToTop}
          className={`fixed bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 z-50 hover:scale-110 active:scale-95 shadow-lg ${showResourcesScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'} ${darkMode ? 'bg-[#111] text-[#4285F4] border border-gray-800' : 'bg-white text-[#4285F4] border border-gray-200'}`}
          title="Scroll to Top"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
        </button>
      </div>
    );
  };

  const AboutView = () => {
    const handleAboutScroll = (e: React.UIEvent<HTMLDivElement>) => {
      handleScroll(e);
      setShowAboutScrollTop(e.currentTarget.scrollTop > 300);
    };

    const scrollToTop = () => {
      aboutScrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
      <div ref={aboutScrollContainerRef} className={`flex-1 overflow-y-auto p-4 sm:p-8 relative ${darkMode ? 'bg-[#0a0a0a]' : 'bg-[#f5f5f5]'}`} onScroll={handleAboutScroll}>
        <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12">
          {/* Header */}
          <div className="flex items-center gap-4 sm:gap-6">
            <button onClick={() => setCurrentView('dashboard')} className={`p-2.5 rounded-lg ${darkMode ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'} transition-all active:scale-90`}>
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div>
              <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>About <span className="text-[#4285F4]">GDG SRMCEM</span></h2>
              <p className="text-sm text-gray-500">1363 Group Members • Lucknow, India</p>
            </div>
          </div>

          {/* Content Section */}
          <div className={`p-6 sm:p-10 rounded-xl border transition-all duration-300 ${darkMode ? 'bg-[#111] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="space-y-6">
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Welcome to Google Developer Group (GDG) on Campus SRMCEM.</h3>
              <p className={`text-sm sm:text-base leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                We are a community driven by curiosity and built on collaboration. At SRMCEM, we bring together Developers, Innovators, and Google Fans to create an ecosystem where technology meets creativity.
              </p>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <h4 className={`text-lg font-bold flex items-center gap-2 mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <span>🚀</span> Beyond the Campus Walls
                </h4>
                <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  We believe in learning that extends beyond just theory. Our chapter is a proud contributor to the wider tech landscape, serving as Co-Organizers for massive city-wide events like DevFest Lucknow and the AI Hackathon Lucknow. When you join us, you aren't just joining a college community; you are stepping into a wide network of industry professionals and tech leaders.
                </p>
                <div className="mt-5">
                  <a href="https://gdg.community.dev/gdg-on-campus-shri-ramswaroop-memorial-college-of-engineering-and-management-lucknow-india/" target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all hover:-translate-y-0.5 ${darkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-gray-900 hover:bg-slate-200'}`}>
                    View Chapter Page
                    <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <h4 className={`text-lg font-bold flex items-center gap-2 mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <span>✨</span> What We Experience Together
                </h4>
                <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>From writing your first line of code to deploying complex models, we support every step of your journey.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-4 rounded-lg border ${darkMode ? 'bg-slate-800/30 border-gray-700' : 'bg-slate-50 border-gray-200'}`}>
                    <h5 className={`font-bold text-sm mb-2 text-[#4285F4]`}>Deep Dives</h5>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Master the latest technologies through Gen AI Study Jams, Build with AI events, and Skill-up Sessions. (Plus, there's plenty of exclusive Google swag for active learners!)</p>
                  </div>
                  <div className={`p-4 rounded-lg border ${darkMode ? 'bg-slate-800/30 border-gray-700' : 'bg-slate-50 border-gray-200'}`}>
                    <h5 className={`font-bold text-sm mb-2 text-[#EA4335]`}>Expert Insights</h5>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Gain real-world perspective through our Speaker Sessions and hands-on Workshops led by industry experts.</p>
                  </div>
                  <div className={`p-4 rounded-lg border ${darkMode ? 'bg-slate-800/30 border-gray-700' : 'bg-slate-50 border-gray-200'}`}>
                    <h5 className={`font-bold text-sm mb-2 text-[#34A853]`}>Community & Vibes</h5>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>It's not all work—we value connection. Our Community Building Events are designed to help you unwind, make friends, and bond over shared interests in technology.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <h4 className={`text-lg font-bold flex items-center gap-2 mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <span>🛠️</span> Core Technologies We Explore
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className={`p-3 rounded-lg border ${darkMode ? 'bg-slate-800/30 border-gray-700' : 'bg-slate-50 border-gray-200'} flex flex-col items-center justify-center text-center`}>
                    <span className="text-2xl mb-1">📱</span>
                    <span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Android</span>
                  </div>
                  <div className={`p-3 rounded-lg border ${darkMode ? 'bg-slate-800/30 border-gray-700' : 'bg-slate-50 border-gray-200'} flex flex-col items-center justify-center text-center`}>
                    <span className="text-2xl mb-1">☁️</span>
                    <span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Google Cloud</span>
                  </div>
                  <div className={`p-3 rounded-lg border ${darkMode ? 'bg-slate-800/30 border-gray-700' : 'bg-slate-50 border-gray-200'} flex flex-col items-center justify-center text-center`}>
                    <span className="text-2xl mb-1">🌐</span>
                    <span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Web Dev</span>
                  </div>
                  <div className={`p-3 rounded-lg border ${darkMode ? 'bg-slate-800/30 border-gray-700' : 'bg-slate-50 border-gray-200'} flex flex-col items-center justify-center text-center`}>
                    <span className="text-2xl mb-1">🤖</span>
                    <span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>AI / ML</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <h4 className={`text-lg font-bold flex items-center gap-2 mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <span>🤝</span> A Place for Everyone
                </h4>
                <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Whether you are here to hack a solution, explore Google's latest tools, or simply find a group of friends who share your passion for tech, you belong here.<br /><br />
                  <strong className={`text-[#4285F4]`}>Join us at GDG on Campus SRMCEM—where we turn ideas into reality.</strong>
                </p>
                <p className={`text-xs mt-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Reach out to the organizing team through our official community page or check the Team section for direct contacts!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll To Top Button */}
        <button
          onClick={scrollToTop}
          className={`fixed bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 z-50 hover:scale-110 active:scale-95 shadow-lg ${showAboutScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'} ${darkMode ? 'bg-[#111] text-[#4285F4] border border-gray-800' : 'bg-white text-[#4285F4] border border-gray-200'}`}
          title="Scroll to Top"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
        </button>
      </div>
    );
  };

  return (
    <div className={`min-h-[100dvh] flex flex-col items-center transition-colors duration-500 ${darkMode ? 'bg-[#0a0a0a]' : 'bg-[#f5f5f5]'}`}>
      <div className={`flex flex-col h-[100dvh] w-full relative overflow-hidden transition-all duration-300 glow-frame`}>

        {/* Global Background Image */}
        {currentView !== 'leads' && currentView !== 'resources' && (
          <img
            src="/team-bg.jpg"
            alt=""
            aria-hidden="true"
            className={`absolute inset-0 w-full h-full object-cover object-bottom z-0 pointer-events-none select-none transition-opacity duration-500 delay-100 ${isHeaderBlurred ? 'opacity-0' : 'opacity-100'}`}
          />
        )}
        {/* Dark overlay for readability */}
        <div className={`absolute inset-0 transition-colors duration-1000 ${darkMode ? 'bg-black/60' : 'bg-black/40'} z-0`}></div>

        {/* Header â€” solid dark with blue glow underline */}
        <header className={`px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-40 transition-all duration-300 bg-[#0a0a0a] header-glow `}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-all active:scale-[0.98]"
            >
              <GDGLogo />
              <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">GDG <span className="text-[#4285F4]">Assistant</span></h1>
            </button>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {['Home', 'About Us', 'Our Team', 'Tech Hub'].map((nav) => (
              <button
                key={nav}
                onClick={() => {
                  if (nav === 'Tech Hub') {
                    setCurrentView('resources');
                  } else {
                    setCurrentView(nav === 'Home' ? 'dashboard' : nav === 'About Us' ? 'about' : 'leads' as AppView);
                  }
                }}
                className={`hidden sm:block text-xs font-semibold tracking-wide transition-colors px-3 py-1.5 rounded-lg ${(nav === 'Home' && currentView === 'dashboard') ||
                  (nav === 'About Us' && currentView === 'about') ||
                  (nav === 'Our Team' && currentView === 'leads') ||
                  (nav === 'Tech Hub' && currentView === 'resources')
                  ? 'text-[#4285F4] bg-[#4285F4]/10'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                {nav}
              </button>
            ))}

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-full transition-all hover:bg-white/10"
              >
                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.name}&background=4285F4&color=fff`} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover ring-2 ring-[#4285F4]/30" alt="Profile" />
                <svg className={`w-3 h-3 text-gray-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-3 w-56 sm:w-64 border shadow-2xl rounded-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 bg-[#111] border-gray-800">
                  <div className="px-5 py-3 border-b border-gray-800 mb-1">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Session</p>
                    <p className="text-sm font-bold text-white truncate">{user.name}</p>
                  </div>

                  {[
                    { id: 'profile', icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", label: 'My Identity' },
                    { id: 'settings', icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z", label: 'Preferences' },
                    { id: 'history', icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", label: 'Chat History' },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => { setActiveModal(item.id as any); setIsMenuOpen(false); }}
                      className="w-full text-left px-5 py-3 text-sm font-medium flex items-center gap-3 text-gray-300 hover:bg-white/5 hover:text-[#4285F4] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
                      {item.label}
                    </button>
                  ))}

                  <div className="border-t border-gray-800 mt-1">
                    <button onClick={() => { setActiveModal('confirmClear'); setIsMenuOpen(false); }} className="w-full text-left px-5 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Clear History
                    </button>
                    <button onClick={handleClearSession} className="w-full text-left px-5 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      Reset Session
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content View Routing */}
        {currentView === 'dashboard' && Dashboard()}
        {currentView === 'leads' && LeadsView()}
        {currentView === 'events' && EventsView()}
        {currentView === 'resources' && ResourcesView()}
        {currentView === 'about' && AboutView()}

        {currentView === 'chat' && (
          <>
            <div className={`px-3 sm:px-5 py-3 sm:py-4 border-b flex items-center justify-between sticky top-0 z-30 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-sm ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
              >
                <svg className="w-3.5 h-3.5 sm:w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                <span className="hidden xs:inline">Home</span>
              </button>

              <div className="flex items-center gap-2 sm:gap-4">
                <button
                  onClick={() => setIsSpeechEnabled(!isSpeechEnabled)}
                  className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all active:scale-90 border flex items-center gap-1.5 sm:gap-2 ${isSpeechEnabled ? 'bg-blue-600 border-blue-500 text-white' : darkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}
                  title={isSpeechEnabled ? "Auto-read Enabled" : "Auto-read Disabled"}
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                  <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest hidden sm:block">{isSpeechEnabled ? "ON" : "OFF"}</span>
                </button>
                <div className="flex items-center gap-1.5 sm:gap-3">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/20"></div>
                  <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-60">AI Online</span>
                </div>
              </div>
            </div>

            <main
              ref={scrollRef}
              className={`flex-1 overflow-y-auto p-3 sm:p-5 md:p-8 space-y-8 sm:space-y-12 chat-scrollbar transition-all duration-300 relative ${darkMode ? 'bg-slate-950' : 'bg-white'}`}
              style={getBackgroundStyle()}
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 sm:gap-4 md:gap-6 ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in duration-700 ${m.sender === 'user' ? 'slide-in-from-right-4' : 'slide-in-from-left-4'}`}
                >
                  <div className="flex-shrink-0 mt-auto mb-1 relative">
                    {m.sender === 'user' ? (
                      <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.name}`} className="w-8 h-8 sm:w-9 sm:h-9 md:w-11 md:h-11 rounded-full object-cover shadow-xl ring-2 ring-blue-500/10" alt="User" />
                    ) : (
                      <div className="relative">
                        <div className={`w-8 h-8 sm:w-9 sm:h-9 md:w-11 md:h-11 rounded-xl sm:rounded-[1.25rem] flex items-center justify-center shadow-xl border relative z-10 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                          <AssistantIcon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-blue-500" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`flex flex-col max-w-[85%] sm:max-w-[80%] md:max-w-[75%] group relative ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 sm:px-6 md:px-7 py-3 sm:py-4 md:py-5 shadow-lg transition-all duration-500 relative ${m.sender === 'user'
                      ? 'bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-[1.25rem] sm:rounded-[2rem] rounded-br-none'
                      : darkMode
                        ? 'bg-slate-800 text-slate-100 border-l-4 border-l-blue-500 rounded-[1.25rem] sm:rounded-[2rem] rounded-bl-none'
                        : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-[1.25rem] sm:rounded-[2rem] rounded-bl-none hover:border-blue-200'
                      }`}>
                      <div className={`text-sm sm:text-base whitespace-pre-wrap leading-relaxed markdown-content ${compactMode ? 'text-xs sm:text-sm' : ''}`} dangerouslySetInnerHTML={renderMarkdown(m.text)}></div>
                    </div>

                    <div className={`flex items-center gap-2 sm:gap-4 mt-2 sm:mt-3 ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className={`text-[8px] sm:text-[10px] font-black tracking-[0.2em] opacity-30 uppercase`}>
                        {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {m.sender === 'bot' && (
                        <span className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[7px] sm:text-[9px] font-black uppercase tracking-[0.2em] border ${darkMode ? 'bg-blue-900/30 text-blue-400 border-blue-800' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                          AI
                        </span>
                      )}
                      <div className={`flex items-center gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300`}>
                        <button onClick={() => speak(m.text)} className="p-1.5 rounded-full text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Read message">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                        </button>
                        <button onClick={() => handleCopy(m.text, m.id)} className={`p-1.5 rounded-full transition-colors ${copiedId === m.id ? 'text-green-500' : 'text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                          {copiedId === m.id ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {(isLoading || isProcessingVideo) && (
                <div className="flex flex-row gap-3 sm:gap-5 animate-in fade-in slide-in-from-left-4 duration-700">
                  <div className={`w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-[1.25rem] flex items-center justify-center shadow-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <AssistantIcon className="animate-pulse text-blue-500 w-5 h-5 sm:w-7 sm:h-7" />
                  </div>
                  <div className={`p-3 sm:p-5 px-4 sm:px-7 rounded-xl sm:rounded-[2rem] rounded-bl-none border shadow-lg flex items-center gap-2 sm:gap-3 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">{isProcessingVideo ? "Analyzing" : "AI Thinking"}</span>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              )}
            </main>

            {/* Chat Footer */}
            <footer className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border-t transition-all z-10 p-3 sm:p-5 md:p-7`}>
              <div className="flex gap-2 sm:gap-4 w-full">
                <button onClick={() => videoInputRef.current?.click()} className={`p-3 sm:p-4 rounded-xl sm:rounded-[1.5rem] shadow-md transition-all active:scale-90 ${selectedVideo ? 'bg-blue-600 text-white shadow-blue-500/30' : darkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 00-2 2z" /></svg>
                  <input type="file" ref={videoInputRef} onChange={handleVideoSelect} className="hidden" accept="video/*" />
                </button>
                <button
                  onClick={toggleListening}
                  className={`p-3 sm:p-4 rounded-xl sm:rounded-[1.5rem] shadow-md transition-all active:scale-90 ${isListening ? 'bg-red-500 text-white animate-pulse' : darkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  title="Voice Command"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask..."
                    className={`w-full h-full rounded-xl sm:rounded-[1.5rem] px-4 sm:px-8 py-3 sm:py-4 outline-none border transition-all font-bold text-sm sm:text-base ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-blue-500/50' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500/50'}`}
                    disabled={isProcessingVideo}
                  />
                </div>
                <button onClick={handleSend} disabled={(!input.trim() && videoFrames.length === 0) || isLoading || isProcessingVideo} className="bg-blue-600 text-white px-4 sm:px-8 rounded-xl sm:rounded-[1.5rem] font-black shadow-md shadow-blue-500/20 active:scale-95 transition-all">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </div>
            </footer>
          </>
        )}

        {/* Modals */}
        {activeModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
            <div className={`rounded-[1.5rem] sm:rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden ${darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border'}`}>
              <div className="p-6 sm:p-10">
                <div className="flex justify-between items-center mb-6 sm:mb-10">
                  <h3 className="text-2xl sm:text-3xl font-black capitalize tracking-tight">
                    {activeModal === 'confirmClear' ? 'Reset' :
                      activeModal === 'history' ? 'Transcript' :
                        activeModal === 'settings' ? 'Settings' :
                          activeModal}
                  </h3>
                  <button onClick={() => setActiveModal(null)} className="p-2 text-slate-400 hover:text-blue-500">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="max-h-[60dvh] overflow-y-auto chat-scrollbar pr-2">
                  {activeModal === 'profile' && (
                    <form onSubmit={handleUpdateProfile} className="space-y-4 sm:space-y-6 pb-4">
                      <div className="flex flex-col items-center gap-4 sm:gap-6 mb-6">
                        <img src={profilePic || `https://ui-avatars.com/api/?name=${editName}`} className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 object-cover ${darkMode ? 'border-slate-800 shadow-blue-500/10' : 'border-slate-50 shadow-lg'}`} alt="Profile" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-blue-600 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg sm:rounded-xl shadow-lg active:scale-95 transition-transform">Update Avatar</button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                      </div>

                      <div className="space-y-3 sm:space-y-4">
                        <div>
                          <label className="block text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Full Name</label>
                          <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={`w-full px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl border font-bold transition-all text-sm ${darkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`} placeholder="Name" />
                        </div>

                        <div>
                          <label className="block text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Professional Bio</label>
                          <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} className={`w-full px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl border font-medium transition-all min-h-[80px] sm:min-h-[100px] resize-none text-sm ${darkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`} placeholder="Your mission..." />
                        </div>

                        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <label className="block text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">GitHub</label>
                            <input type="text" value={editGithub} onChange={(e) => setEditGithub(e.target.value)} className={`w-full px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl border font-bold transition-all text-sm ${darkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`} placeholder="@user" />
                          </div>
                          <div>
                            <label className="block text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1">Stack</label>
                            <select value={editTechStack} onChange={(e) => setEditTechStack(e.target.value)} className={`w-full px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl border font-bold transition-all text-sm ${darkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`}>
                              <option value="">Select Stack</option>
                              <option value="React">React</option>
                              <option value="Flutter">Flutter</option>
                              <option value="Cloud">Cloud</option>
                              <option value="AI/ML">AI/ML</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <button type="submit" className="w-full py-4 sm:py-5 bg-blue-600 text-white font-black rounded-2xl sm:rounded-3xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transform active:scale-[0.98] transition-all uppercase tracking-widest text-[10px] sm:text-xs mt-2 sm:mt-4">Update Identity</button>
                    </form>
                  )}

                  {activeModal === 'history' && (
                    <div className="space-y-3 sm:space-y-4">
                      {messages.length > 0 ? (
                        <div className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                          <p className="text-[10px] sm:text-sm font-bold mb-4 opacity-60">Complete Transcript ({messages.length} entries)</p>
                          <div className="space-y-4">
                            {messages.map((msg, i) => (
                              <div key={i} className="flex gap-2 sm:gap-3 items-start text-xs sm:text-sm border-b pb-4 last:border-0 dark:border-slate-700/50">
                                <span className={`font-black uppercase text-[8px] sm:text-[9px] min-w-[30px] mt-1 ${msg.sender === 'bot' ? 'text-blue-500' : 'text-slate-400'}`}>{msg.sender === 'bot' ? 'Bot' : 'You'}</span>
                                <p className="opacity-80 leading-relaxed truncate-3-lines">{msg.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-center py-8 opacity-40 italic">No history found.</p>
                      )}
                    </div>
                  )}

                  {activeModal === 'confirmClear' && (
                    <div className="space-y-6 text-center">
                      <p className="text-base sm:text-lg font-medium text-slate-500">This will wipe your session history. Continue?</p>
                      <div className="flex gap-3 sm:gap-4">
                        <button onClick={() => { setWelcomeMessage(); localStorage.removeItem('gdg_chat_history'); setActiveModal(null); }} className="flex-1 py-3 sm:py-4 bg-red-600 text-white font-black rounded-xl sm:rounded-2xl shadow-lg hover:bg-red-700 transition-colors">Clear</button>
                        <button onClick={() => setActiveModal(null)} className={`flex-1 py-3 sm:py-4 font-black rounded-xl sm:rounded-2xl transition-colors ${darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {activeModal === 'settings' && (
                    <div className="space-y-4 sm:space-y-6">
                      <div className="grid grid-cols-1 gap-3 sm:gap-4">

                        <button onClick={() => setDarkMode(!darkMode)} className={`w-full p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border flex items-center justify-between transition-all ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-900 border-indigo-700 text-indigo-400' : 'bg-white border text-indigo-500'}`}>
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                            </div>
                            <span className="font-bold text-sm sm:text-base">Dark Mode</span>
                          </div>
                          <div className={`w-10 sm:w-14 h-5 sm:h-7 rounded-full relative transition-all ${darkMode ? 'bg-blue-600' : 'bg-slate-300'}`}>
                            <div className={`absolute top-0.5 sm:top-1 w-4 sm:w-5 h-4 sm:h-5 bg-white rounded-full shadow-sm transition-all ${darkMode ? 'right-0.5 sm:right-1' : 'left-0.5 sm:left-1'}`}></div>
                          </div>
                        </button>

                        <button onClick={() => setNotificationsEnabled(!notificationsEnabled)} className={`w-full p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border flex items-center justify-between transition-all ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className={`p-2 rounded-lg ${notificationsEnabled ? 'bg-green-100 text-green-600' : 'bg-white border text-slate-400'}`}>
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                            </div>
                            <span className="font-bold text-sm sm:text-base">Push Notifications</span>
                          </div>
                          <div className={`w-10 sm:w-14 h-5 sm:h-7 rounded-full relative transition-all ${notificationsEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}>
                            <div className={`absolute top-0.5 sm:top-1 w-4 sm:w-5 h-4 sm:h-5 bg-white rounded-full shadow-sm transition-all ${notificationsEnabled ? 'right-0.5 sm:right-1' : 'left-0.5 sm:left-1'}`}></div>
                          </div>
                        </button>

                        <button onClick={() => setIsSpeechEnabled(!isSpeechEnabled)} className={`w-full p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border flex items-center justify-between transition-all ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className={`p-2 rounded-lg ${isSpeechEnabled ? 'bg-blue-100 text-blue-600' : 'bg-white border text-slate-400'}`}>
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                            </div>
                            <span className="font-bold text-sm sm:text-base">Auto-read Messages</span>
                          </div>
                          <div className={`w-10 sm:w-14 h-5 sm:h-7 rounded-full relative transition-all ${isSpeechEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}>
                            <div className={`absolute top-0.5 sm:top-1 w-4 sm:w-5 h-4 sm:h-5 bg-white rounded-full shadow-sm transition-all ${isSpeechEnabled ? 'right-0.5 sm:right-1' : 'left-0.5 sm:left-1'}`}></div>
                          </div>
                        </button>

                        <button onClick={() => setBgType(bgType === 'grid' ? 'dots' : bgType === 'dots' ? 'plain' : 'grid')} className={`w-full p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border flex items-center justify-between transition-all ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700 text-purple-400' : 'bg-white text-purple-600 border'}`}>
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
                            </div>
                            <span className="font-bold text-sm sm:text-base">Background: <span className="capitalize text-blue-500">{bgType}</span></span>
                          </div>
                        </button>

                        <button onClick={() => setCompactMode(!compactMode)} className={`w-full p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border flex items-center justify-between transition-all ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className={`p-2 rounded-lg ${compactMode ? 'bg-blue-100 text-blue-600' : 'bg-white border text-slate-400'}`}>
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                            </div>
                            <span className="font-bold text-sm sm:text-base">Compact Mode</span>
                          </div>
                          <div className={`w-10 sm:w-14 h-5 sm:h-7 rounded-full relative transition-all ${compactMode ? 'bg-blue-600' : 'bg-slate-300'}`}>
                            <div className={`absolute top-0.5 sm:top-1 w-4 sm:w-5 h-4 sm:h-5 bg-white rounded-full shadow-sm transition-all ${compactMode ? 'right-0.5 sm:right-1' : 'left-0.5 sm:left-1'}`}></div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {activeModal === 'about' && (
                    <div className="space-y-4 sm:space-y-6">
                      <p className="text-base sm:text-lg font-bold text-blue-600">Competitive Edge for Hackers.</p>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">Built for GDG on Campus SRMCEM, providing AI-powered assistance, expert lead access, and community resources.</p>
                      <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl sm:rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <h5 className="font-black text-[9px] sm:text-[10px] uppercase tracking-widest mb-3 opacity-60">Tech Core</h5>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] sm:text-xs font-bold opacity-80">
                          <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>Gemini 3 Flash</li>
                          <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#EA4335]"></div>React 19</li>
                          <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#34A853]"></div>Tailwind CSS</li>
                          <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]"></div>ESM Modules</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={() => setActiveModal(null)} className="mt-6 sm:mt-10 w-full py-4 sm:py-5 font-black rounded-2xl sm:rounded-3xl bg-slate-900 text-white uppercase tracking-widest text-[10px] sm:text-[11px] shadow-2xl hover:bg-black transition-all">Dismiss</button>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
};

export default App;
