
import React, { useState, useRef, useEffect } from 'react';
import { Message, User, AppView } from './types';
import { FAQS, IDEAS, BASIC_RESPONSES } from './constants';
import { askGemini, analyzeVideoWithGemini } from './services/geminiService';
import Auth from './components/Auth';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// High-fidelity SVG of the GDG brackets logo provided by the user
export const GDGLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Left Bracket Pillar 1 (Red) */}
    <rect x="18" y="28" width="45" height="18" rx="9" fill="#EA4335" transform="rotate(45 18 28)" />
    {/* Left Bracket Pillar 2 (Blue) */}
    <rect x="5" y="55" width="45" height="18" rx="9" fill="#4285F4" transform="rotate(-45 5 55)" />
    {/* Right Bracket Pillar 1 (Green) */}
    <rect x="45" y="15" width="45" height="18" rx="9" fill="#34A853" transform="rotate(45 45 15)" />
    {/* Right Bracket Pillar 2 (Yellow) */}
    <rect x="35" y="85" width="45" height="18" rx="9" fill="#FBBC05" transform="rotate(-45 35 85)" />
  </svg>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('gdg_assistant_dark_mode');
    return saved === 'true'; 
  });

  const [bgType, setBgType] = useState<string>(() => {
    return localStorage.getItem('gdg_assistant_bg') || 'grid';
  });

  // Preferences State
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(() => localStorage.getItem('gdg_speech_enabled') === 'true');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
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
      text: "👋 Welcome back to the Hub! I'm your GDG Hackathon Mentor. Ready to build something great today? 🚀",
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

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    syncEditFields(newUser);
    localStorage.setItem('gdg_assistant_user', JSON.stringify(newUser));
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to sign out? This will clear all session data and return to the login page.")) {
      localStorage.clear();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      
      setUser(null);
      setMessages([]);
      setInput('');
      setIsLoading(false);
      setIsMenuOpen(false);
      setActiveModal(null);
      setVideoFrames([]);
      setSelectedVideo(null);
      setCurrentView('dashboard');
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
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
      const domain = prompt.replace('/idea', '').trim();
      const matchedKey = Object.keys(IDEAS).find(k => k.toLowerCase() === domain.toLowerCase());
      if (matchedKey) {
        botReply = `💡 ${matchedKey} Idea:\n\n${IDEAS[matchedKey][Math.floor(Math.random() * IDEAS[matchedKey].length)]}`;
      } else {
        botReply = `Available domains: AI/ML, Web Dev, Android. Try: /idea AI/ML`;
      }
    } else if (BASIC_RESPONSES[prompt]) {
      botReply = BASIC_RESPONSES[prompt];
    } else if (FAQS[prompt] || FAQS[prompt + '?']) {
      botReply = FAQS[prompt] || FAQS[prompt + '?'];
    } else {
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

  if (!user) return <Auth onLogin={handleLogin} />;

  // View Components
  const Dashboard = () => (
    <div className="flex-1 overflow-y-auto p-6 sm:p-12 animate-in fade-in slide-in-from-bottom-6 duration-700 relative">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 mb-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">GDG Chapter Workspace</span>
          </div>
          <h2 className={`text-5xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>GDG Launchpad</h2>
          <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">Welcome back, <span className="text-blue-600 font-bold">{user.name}</span>! Elevate your hackathon performance with specialized GDG tools.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pb-12">
          {[
            { 
              view: 'chat', 
              color: 'blue', 
              title: 'Mentor Chat', 
              desc: 'Get technical advice, debug code, and brainstorm project architecture.',
              icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
              gradient: 'from-blue-600 to-indigo-700'
            },
            { 
              view: 'leads', 
              color: 'red', 
              title: 'GDG Leads', 
              desc: 'The experts behind our chapter. Reach out for high-level guidance.',
              icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
              gradient: 'from-red-500 to-rose-600'
            },
            { 
              view: 'events', 
              color: 'yellow', 
              title: 'Timeline', 
              desc: 'Official event schedule, session topics, and judging rounds.',
              icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 00-2 2z",
              gradient: 'from-yellow-500 to-amber-600'
            },
            { 
              view: 'resources', 
              color: 'green', 
              title: 'Dev Toolbox', 
              desc: 'Core Google technologies to accelerate your MVP development.',
              icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
              gradient: 'from-green-500 to-emerald-600'
            }
          ].map((item, idx) => (
            <button 
              key={idx}
              onClick={() => setCurrentView(item.view as AppView)}
              className={`group relative p-10 rounded-[3rem] border text-left transition-all duration-500 hover:scale-[1.03] active:scale-[0.98] shadow-xl overflow-hidden ${
                darkMode ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800' : 'bg-white border-slate-100 hover:shadow-2xl'
              }`}
            >
              <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-5 blur-3xl transition-opacity duration-500`}></div>
              <div className={`w-16 h-16 bg-gradient-to-br ${item.gradient} rounded-3xl flex items-center justify-center text-white mb-8 shadow-lg group-hover:rotate-[10deg] transition-all duration-500`}>
                <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
              </div>
              <h3 className={`text-2xl font-black mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.title}</h3>
              <p className="text-md text-slate-500 leading-relaxed font-medium group-hover:text-slate-400 transition-colors">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <button 
        onClick={() => setActiveModal('about')}
        className={`fixed bottom-8 right-8 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-90 z-50 ${
          darkMode ? 'bg-slate-800 text-blue-400 border border-slate-700' : 'bg-white text-blue-600 border border-slate-100'
        }`}
        title="About the App"
      >
        <span className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping opacity-20"></span>
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </button>
    </div>
  );

  const LeadsView = () => (
    <div className="flex-1 overflow-y-auto p-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="flex items-center gap-6">
          <button onClick={() => setCurrentView('dashboard')} className={`p-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-90`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h2 className="text-4xl font-black tracking-tight">GDG Leads</h2>
            <p className="text-slate-500 font-medium">Chapter experts available for mentorship (19 members).</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 pb-12">
          {[
            { name: "Rahul Sharma", role: "GDG Organizer", email: "rahul.sharma@gdg.community", color: "from-blue-500 to-blue-600" },
            { name: "Anita Desai", role: "WTM Ambassador", email: "anita.desai@wtm.ambassador", color: "from-red-500 to-red-600" },
            { name: "Vikram Singh", role: "Cloud Lead", email: "vikram.singh@gdg.tech", color: "from-green-500 to-green-600" },
            { name: "Sanya Gupta", role: "Event Manager", email: "sanya.gupta@community.dev", color: "from-yellow-500 to-yellow-600" },
            { name: "Amit Patel", role: "Android Lead", email: "amit.p@gdg.dev", color: "from-indigo-500 to-indigo-600" },
            { name: "Priya Ray", role: "Flutter Specialist", email: "priya.ray@flutter.io", color: "from-cyan-500 to-cyan-600" },
            { name: "Rohan Das", role: "ML Engineer", email: "rohan.das@ai.google", color: "from-orange-500 to-orange-600" },
            { name: "Neha Kapoor", role: "Web Dev Lead", email: "neha.k@gdg.community", color: "from-teal-500 to-teal-600" },
            { name: "Arjun Mehta", role: "UI/UX Designer", email: "arjun.m@design.google", color: "from-pink-500 to-pink-600" },
            { name: "Ishani Bose", role: "Marketing Lead", email: "ishani.b@community.dev", color: "from-purple-500 to-purple-600" },
            { name: "Kabir Khan", role: "Community Manager", email: "kabir.k@gdg.org", color: "from-emerald-500 to-emerald-600" },
            { name: "Meera Iyer", role: "DevOps Specialist", email: "meera.i@cloud.google", color: "from-slate-500 to-slate-600" },
            { name: "Devika Nair", role: "Cybersecurity Lead", email: "devika.n@security.dev", color: "from-rose-500 to-rose-600" },
            { name: "Sameer Shah", role: "Content Creator", email: "sameer.s@gdg.media", color: "from-amber-500 to-amber-600" },
            { name: "Tanvi Joshi", role: "Volunteer Coordinator", email: "tanvi.j@gdg.team", color: "from-lime-500 to-lime-600" },
            { name: "Aditya Verma", role: "Technical Writer", email: "aditya.v@docs.google", color: "from-blue-400 to-blue-500" },
            { name: "Rhea Sharma", role: "Frontend Architect", email: "rhea.s@web.dev", color: "from-violet-500 to-violet-600" },
            { name: "Nikhil Gupta", role: "Backend Developer", email: "nikhil.g@api.google", color: "from-fuchsia-500 to-fuchsia-600" },
            { name: "Zara Wilson", role: "Quality Assurance", email: "zara.w@qa.google", color: "from-gray-500 to-gray-600" }
          ].map((lead, i) => (
            <div key={i} className={`group p-8 rounded-[2.5rem] border shadow-lg flex flex-col gap-6 transition-all duration-300 hover:border-blue-500/30 ${
              darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100'
            }`}>
              <div className="flex items-center gap-5">
                <div className={`w-16 h-16 bg-gradient-to-br ${lead.color} rounded-[1.25rem] flex items-center justify-center text-white font-black text-2xl shadow-inner`}>
                  {lead.name[0]}
                </div>
                <div>
                  <h4 className={`font-black text-xl ${darkMode ? 'text-white' : 'text-slate-900'}`}>{lead.name}</h4>
                  <p className="text-sm font-bold text-blue-500 uppercase tracking-widest">{lead.role}</p>
                </div>
              </div>
              <div className={`p-4 rounded-2xl border flex items-center gap-3 ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 00-2 2z" /></svg>
                <span className={`text-sm font-mono font-medium select-all ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {lead.email}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const EventsView = () => (
    <div className="flex-1 overflow-y-auto p-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="flex items-center gap-6">
          <button onClick={() => setCurrentView('dashboard')} className={`p-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-90`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <h2 className="text-4xl font-black tracking-tight">Timeline</h2>
        </div>
        <div className="space-y-6">
          {[
            { title: "DevFest 2024", date: "Oct 15, 2024", type: "Conference", status: "Open" },
            { title: "Hack-A-Thon Sprint", date: "Nov 02, 2024", type: "Coding", status: "Coming Soon" },
            { title: "WTM Summit", date: "Dec 10, 2024", type: "Networking", status: "Registration Open" }
          ].map((event, i) => (
            <div key={i} className={`p-8 rounded-[2.5rem] border shadow-lg flex items-center justify-between group transition-all duration-300 hover:scale-[1.01] ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100'}`}>
              <div className="flex gap-6 items-center">
                <div className={`w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500`}>
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 00-2 2z" /></svg>
                </div>
                <div>
                  <h4 className="font-black text-xl mb-1">{event.title}</h4>
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z" /></svg>{event.date}</span>
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                    <span className="flex items-center gap-1.5 uppercase tracking-widest">{event.type}</span>
                  </div>
                </div>
              </div>
              <div className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm transition-all duration-300 ${
                event.status === 'Open' ? 'bg-green-500/10 text-green-600 border-green-200 dark:border-green-900/30' : 
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

  const ResourcesView = () => (
    <div className="flex-1 overflow-y-auto p-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="flex items-center gap-6">
          <button onClick={() => setCurrentView('dashboard')} className={`p-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-90`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h2 className="text-4xl font-black tracking-tight">GDG Dev Toolbox</h2>
            <p className="text-slate-500 font-medium">Core Google technologies for high-impact projects.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {[
            { name: "Firebase", category: "Full Stack", desc: "Backend-as-a-Service including Hosting, Auth, and NoSQL databases for rapid MVP development.", color: 'bg-yellow-500' },
            { name: "Gemini API", category: "Intelligence", desc: "Access Google's most capable multimodal AI models for intelligent features in your app.", color: 'bg-blue-600' },
            { name: "Google Cloud", category: "Infrastructure", desc: "Scalable computing, storage, and advanced specialized APIs for computer vision and speech.", color: 'bg-blue-400' },
            { name: "Flutter", category: "Mobile/Web", desc: "Build beautiful, natively compiled applications for mobile, web, and desktop from a single codebase.", color: 'bg-indigo-500' },
            { name: "TensorFlow", category: "Machine Learning", desc: "The end-to-end open source platform for machine learning, from research to production.", color: 'bg-orange-500' },
            { name: "Material Design", category: "UI/UX", desc: "Google's open-source design system to help teams build high-quality digital experiences.", color: 'bg-red-500' }
          ].map((tool, i) => (
            <div key={i} className={`p-8 rounded-[2.5rem] border shadow-lg transition-all hover:bg-slate-50/50 group active:scale-[0.98] ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100'}`}>
              <div className="flex items-start justify-between mb-6">
                <div className={`w-14 h-14 ${tool.color} rounded-[1.25rem] flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                   <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  {tool.category}
                </span>
              </div>
              <h4 className="font-black text-xl mb-3">{tool.name}</h4>
              <p className="text-sm text-slate-500 leading-relaxed font-medium mb-4">{tool.desc}</p>
              <div className="h-1 w-12 bg-blue-500/20 rounded-full group-hover:w-full transition-all duration-700"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans flex flex-col items-center transition-colors duration-500`}>
      <div className={`flex flex-col h-screen w-full max-w-4xl shadow-2xl relative overflow-hidden transition-all duration-300 ${darkMode ? 'bg-slate-900 border-x border-slate-800' : 'bg-white'}`}>
        
        {/* Header */}
        <header className={`${darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-100'} backdrop-blur-md border-b p-5 flex items-center justify-between sticky top-0 z-40`}>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className="flex items-center gap-3 hover:opacity-80 transition-all active:scale-[0.98]"
            >
              <GDGLogo className="w-9 h-9" />
              <h1 className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">GDG Assistant</h1>
            </button>
          </div>
          
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`flex items-center gap-3 p-1.5 rounded-full transition-all border border-transparent ${darkMode ? 'hover:bg-slate-800 hover:border-slate-700' : 'hover:bg-slate-50 hover:border-slate-200'}`}
            >
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.name}`} className="w-9 h-9 rounded-full object-cover shadow-sm ring-2 ring-blue-500/10 group-hover:ring-blue-500 transition-all" alt="Profile" />
              <div className="hidden sm:block text-left mr-1">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Session</p>
                <p className="text-[11px] font-bold truncate max-w-[80px]">{user.name.split(' ')[0]}</p>
              </div>
              <svg className={`w-4 h-4 text-slate-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {isMenuOpen && (
              <div className={`absolute right-0 mt-3 w-64 border shadow-2xl rounded-3xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`px-5 py-4 border-b mb-1 ${darkMode ? 'border-slate-700' : 'border-slate-50'}`}>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Authenticated</p>
                  <p className={`text-sm font-black truncate ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{user.name}</p>
                </div>
                
                {[
                  { id: 'profile', icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", label: 'My Identity' },
                  { id: 'settings', icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z", label: 'Preferences' },
                  { id: 'history', icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", label: 'Chat History' },
                ].map(item => (
                  <button 
                    key={item.id}
                    onClick={() => { setActiveModal(item.id as any); setIsMenuOpen(false); }} 
                    className={`w-full text-left px-5 py-3.5 text-sm font-bold flex items-center gap-3 transition-colors ${darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'}`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
                    {item.label}
                  </button>
                ))}

                <div className={`border-t mt-1 ${darkMode ? 'border-slate-700' : 'border-slate-50'}`}>
                  <button onClick={() => { setActiveModal('confirmClear'); setIsMenuOpen(false); }} className="w-full text-left px-5 py-3.5 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Clear History
                  </button>
                  <button onClick={handleLogout} className="w-full text-left px-5 py-3.5 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content View Routing */}
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'leads' && <LeadsView />}
        {currentView === 'events' && <EventsView />}
        {currentView === 'resources' && <ResourcesView />}

        {currentView === 'chat' && (
          <>
            <div className={`px-5 py-4 border-b flex items-center justify-between sticky top-0 z-30 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
              <button 
                onClick={() => setCurrentView('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-sm ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Dashboard
              </button>

              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsSpeechEnabled(!isSpeechEnabled)}
                  className={`p-2.5 rounded-xl transition-all active:scale-90 border flex items-center gap-2 ${isSpeechEnabled ? 'bg-blue-600 border-blue-500 text-white' : darkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}
                  title={isSpeechEnabled ? "Auto-read Enabled" : "Auto-read Disabled"}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">{isSpeechEnabled ? "ON" : "OFF"}</span>
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/20"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Mentor Online</span>
                </div>
              </div>
            </div>

            <main 
              ref={scrollRef}
              className={`flex-1 overflow-y-auto p-5 sm:p-8 space-y-12 chat-scrollbar transition-all duration-300 relative ${darkMode ? 'bg-slate-950' : 'bg-white'}`}
              style={getBackgroundStyle()}
            >
              {messages.map((m) => (
                <div 
                  key={m.id} 
                  className={`flex gap-4 sm:gap-6 ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in duration-700 ${m.sender === 'user' ? 'slide-in-from-right-8' : 'slide-in-from-left-8'}`}
                >
                  <div className="flex-shrink-0 mt-auto mb-1 relative">
                    {m.sender === 'user' ? (
                      <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.name}`} className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover shadow-xl ring-2 ring-blue-500/10" alt="User" />
                    ) : (
                      <div className="relative">
                        <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-[1.25rem] flex items-center justify-center shadow-xl border relative z-10 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                          <GDGLogo className="w-6 h-6 sm:w-7 sm:h-7" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] group relative ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-7 py-5 shadow-lg transition-all duration-500 relative ${
                      m.sender === 'user' 
                        ? 'bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-[2rem] rounded-br-none' 
                        : darkMode 
                          ? 'bg-slate-800 text-slate-100 border-l-4 border-l-blue-500 rounded-[2rem] rounded-bl-none' 
                          : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-[2rem] rounded-bl-none hover:border-blue-200'
                    }`}>
                      <div className={`text-md whitespace-pre-wrap leading-relaxed markdown-content ${compactMode ? 'text-sm' : 'text-md'}`} dangerouslySetInnerHTML={renderMarkdown(m.text)}></div>
                    </div>

                    <div className={`flex items-center gap-4 mt-3 ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className={`text-[10px] font-black tracking-[0.2em] opacity-30 uppercase`}>
                        {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {m.sender === 'bot' && (
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${darkMode ? 'bg-blue-900/30 text-blue-400 border-blue-800' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                          Official Mentor
                        </span>
                      )}
                      <div className={`flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300`}>
                        <button onClick={() => speak(m.text)} className="p-2 rounded-full text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Read message">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                        </button>
                        <button onClick={() => handleCopy(m.text, m.id)} className={`p-2 rounded-full transition-colors ${copiedId === m.id ? 'text-green-500' : 'text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                          {copiedId === m.id ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {(isLoading || isProcessingVideo) && (
                <div className="flex flex-row gap-5 animate-in fade-in slide-in-from-left-8 duration-700">
                   <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-[1.25rem] flex items-center justify-center shadow-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <GDGLogo className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse" />
                  </div>
                  <div className={`p-5 px-7 rounded-[2rem] rounded-bl-none border shadow-lg flex items-center gap-3 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">{isProcessingVideo ? "Analyzing Visuals" : "Mentor Thinking"}</span>
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              )}
            </main>

            {/* Chat Footer */}
            <footer className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border-t transition-all z-10 p-5 sm:p-7`}>
              <div className="flex gap-4 w-full">
                <button onClick={() => videoInputRef.current?.click()} className={`p-4 rounded-[1.5rem] shadow-lg transition-all active:scale-90 ${selectedVideo ? 'bg-blue-600 text-white shadow-blue-500/30' : darkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2-2v8a2 2 0 00-2 2z" /></svg>
                  <input type="file" ref={videoInputRef} onChange={handleVideoSelect} className="hidden" accept="video/*" />
                </button>
                <button 
                  onClick={toggleListening}
                  className={`p-4 rounded-[1.5rem] shadow-lg transition-all active:scale-90 ${isListening ? 'bg-red-500 text-white animate-pulse' : darkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  title="Voice Command"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </button>
                <div className="flex-1 relative">
                  <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask your mentor..." className={`w-full h-full rounded-[1.5rem] px-8 py-4 outline-none border transition-all font-bold ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-blue-500/50' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500/50'}`} disabled={isProcessingVideo} />
                </div>
                <button onClick={handleSend} disabled={(!input.trim() && videoFrames.length === 0) || isLoading || isProcessingVideo} className="bg-blue-600 text-white px-8 rounded-[1.5rem] font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </div>
            </footer>
          </>
        )}

        {/* Modals */}
        {activeModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in">
            <div className={`rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden ${darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border'}`}>
              <div className="p-10">
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-3xl font-black capitalize tracking-tight">
                    {activeModal === 'confirmClear' ? 'Reset Session' : 
                     activeModal === 'history' ? 'Chat Log' : 
                     activeModal === 'settings' ? 'Preferences' :
                     activeModal}
                  </h3>
                  <button onClick={() => setActiveModal(null)} className="p-2 text-slate-400 hover:text-blue-500">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto chat-scrollbar pr-2">
                   {activeModal === 'profile' && (
                    <form onSubmit={handleUpdateProfile} className="space-y-6 pb-6">
                      <div className="flex flex-col items-center gap-6 mb-8">
                        <img src={profilePic || `https://ui-avatars.com/api/?name=${editName}`} className={`w-32 h-32 rounded-full border-4 object-cover ${darkMode ? 'border-slate-800 shadow-blue-500/10' : 'border-slate-50 shadow-lg'}`} alt="Profile" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="px-5 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg active:scale-95 transition-transform">Update Avatar</button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Full Identity Name</label>
                          <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={`w-full px-6 py-4 rounded-2xl border font-bold transition-all ${darkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`} placeholder="E.g. John Developer" />
                        </div>
                        
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Professional Bio</label>
                          <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} className={`w-full px-6 py-4 rounded-2xl border font-medium transition-all min-h-[100px] resize-none ${darkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`} placeholder="Tell us about your mission..." />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">GitHub Handle</label>
                            <input type="text" value={editGithub} onChange={(e) => setEditGithub(e.target.value)} className={`w-full px-6 py-4 rounded-2xl border font-bold transition-all ${darkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`} placeholder="@username" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Core Tech Stack</label>
                            <select value={editTechStack} onChange={(e) => setEditTechStack(e.target.value)} className={`w-full px-6 py-4 rounded-2xl border font-bold transition-all ${darkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`}>
                              <option value="">Select Stack</option>
                              <option value="React">React / Web</option>
                              <option value="Flutter">Flutter / Mobile</option>
                              <option value="Cloud">Cloud / Backend</option>
                              <option value="AI/ML">AI / Machine Learning</option>
                              <option value="Other">Fullstack Generalist</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transform active:scale-[0.98] transition-all uppercase tracking-widest text-xs mt-4">Sync Global Identity</button>
                    </form>
                  )}

                  {activeModal === 'history' && (
                    <div className="space-y-4">
                      {messages.length > 0 ? (
                        <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                          <p className="text-sm font-bold mb-4 opacity-60">Complete Transcript ({messages.length} entries)</p>
                          <div className="space-y-4">
                            {messages.map((msg, i) => (
                              <div key={i} className="flex gap-3 items-start text-sm border-b pb-4 last:border-0 dark:border-slate-700/50">
                                <span className={`font-black uppercase text-[9px] min-w-[30px] mt-1 ${msg.sender === 'bot' ? 'text-blue-500' : 'text-slate-400'}`}>{msg.sender === 'bot' ? 'Mentor' : 'User'}</span>
                                <p className="opacity-80 leading-relaxed">{msg.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-center py-8 opacity-40 italic">No chat entries found.</p>
                      )}
                    </div>
                  )}

                  {activeModal === 'confirmClear' && (
                    <div className="space-y-6 text-center">
                      <p className="text-lg font-medium text-slate-500">This will wipe your session history and restart the chat. Continue?</p>
                      <div className="flex gap-4">
                        <button onClick={() => { setWelcomeMessage(); localStorage.removeItem('gdg_chat_history'); setActiveModal(null); }} className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg hover:bg-red-700 transition-colors">Yes, Clear</button>
                        <button onClick={() => setActiveModal(null)} className={`flex-1 py-4 font-black rounded-2xl transition-colors ${darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {activeModal === 'settings' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-4">
                        <button onClick={() => setDarkMode(!darkMode)} className={`w-full p-6 rounded-[2rem] border flex items-center justify-between transition-all ${darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700/50' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700 text-yellow-400' : 'bg-white text-blue-600 border'}`}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" /></svg>
                            </div>
                            <span className="font-bold">Dark Theme</span>
                          </div>
                          <div className={`w-14 h-7 rounded-full relative transition-all ${darkMode ? 'bg-blue-600' : 'bg-slate-300'}`}>
                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${darkMode ? 'right-1' : 'left-1'}`}></div>
                          </div>
                        </button>

                        <button onClick={() => setBgType(bgType === 'grid' ? 'dots' : bgType === 'dots' ? 'plain' : 'grid')} className={`w-full p-6 rounded-[2rem] border flex items-center justify-between transition-all ${darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700/50' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700 text-purple-400' : 'bg-white text-purple-600 border'}`}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
                            </div>
                            <span className="font-bold">Background: <span className="capitalize">{bgType}</span></span>
                          </div>
                          <div className="flex items-center gap-1">
                             <div className={`w-2 h-2 rounded-full ${bgType === 'grid' ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                             <div className={`w-2 h-2 rounded-full ${bgType === 'dots' ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                             <div className={`w-2 h-2 rounded-full ${bgType === 'plain' ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                          </div>
                        </button>

                        <button onClick={() => setCompactMode(!compactMode)} className={`w-full p-6 rounded-[2rem] border flex items-center justify-between transition-all ${darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700/50' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${compactMode ? 'bg-blue-100 text-blue-600' : 'bg-white border text-slate-400'}`}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                            </div>
                            <span className="font-bold">Compact Chat UI</span>
                          </div>
                          <div className={`w-14 h-7 rounded-full relative transition-all ${compactMode ? 'bg-blue-600' : 'bg-slate-300'}`}>
                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${compactMode ? 'right-1' : 'left-1'}`}></div>
                          </div>
                        </button>

                        <button onClick={() => setNotificationsEnabled(!notificationsEnabled)} className={`w-full p-6 rounded-[2rem] border flex items-center justify-between transition-all ${darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700/50' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${notificationsEnabled ? 'bg-green-100 text-green-600' : 'bg-white border text-slate-400'}`}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                            </div>
                            <span className="font-bold">System Alerts</span>
                          </div>
                          <div className={`w-14 h-7 rounded-full relative transition-all ${notificationsEnabled ? 'bg-green-500' : 'bg-slate-300'}`}>
                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${notificationsEnabled ? 'right-1' : 'left-1'}`}></div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {activeModal === 'about' && (
                    <div className="space-y-6">
                      <p className="text-lg font-bold text-blue-600">The GDG Assistant is your competitive edge.</p>
                      <p className="text-slate-500 font-medium leading-relaxed">Built by GDG experts, this workspace provides multimodal AI mentorship, direct chapter lead connections, and official event tracking.</p>
                      <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <h5 className="font-black text-[10px] uppercase tracking-widest mb-3 opacity-60">Architectural Core</h5>
                        <ul className="grid grid-cols-2 gap-3 text-xs font-bold opacity-80">
                           <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>Gemini 3 Flash</li>
                           <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#EA4335]"></div>Firebase Auth</li>
                           <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#34A853]"></div>React 19</li>
                           <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]"></div>Material Design</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={() => setActiveModal(null)} className="mt-10 w-full py-5 font-black rounded-3xl bg-slate-900 text-white uppercase tracking-widest text-[11px] shadow-2xl hover:bg-black transition-all">Return to Workspace</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
