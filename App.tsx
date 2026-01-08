
import React, { useState, useRef, useEffect } from 'react';
import { Message, User } from './types';
import { FAQS, IDEAS, BASIC_RESPONSES } from './constants';
import { askGemini } from './services/geminiService';
import Auth from './components/Auth';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('gdg_assistant_dark_mode');
    return saved === 'true'; 
  });

  const [bgType, setBgType] = useState<string>(() => {
    return localStorage.getItem('gdg_assistant_bg') || 'grid';
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'help' | 'about' | 'settings' | 'history' | 'profile' | 'confirmClear' | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [profilePic, setProfilePic] = useState<string | undefined>(undefined);

  const scrollRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('gdg_assistant_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setEditName(parsed.name);
        setEditEmail(parsed.email);
        setProfilePic(parsed.photoURL);
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

  const setWelcomeMessage = () => {
    setMessages([{
      id: '1',
      text: "👋 Welcome, Innovator! I'm your GDG Hackathon Mentor. Whether you're here to build your first app or your tenth AI model, I've got your back. \n\nNeed a winning idea? Type '/idea AI/ML' (or Web/Android). Got a question? Just ask. Let's build something world-changing! 🚀✨",
      sender: 'bot',
      timestamp: new Date(),
    }]);
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
    if (isAppLoaded) {
      localStorage.setItem('gdg_chat_history', JSON.stringify(messages));
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [messages, isAppLoaded]);

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
    setEditName(newUser.name);
    setEditEmail(newUser.email);
    setProfilePic(newUser.photoURL);
    localStorage.setItem('gdg_assistant_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      localStorage.removeItem('gdg_assistant_user');
      localStorage.removeItem('gdg_chat_history');
      setUser(null);
      setMessages([]);
      setIsMenuOpen(false);
      setActiveModal(null);
    }
  };

  const handleNewChat = () => {
    if (messages.length > 1 && window.confirm("Start a new conversation? Current chat will be cleared.")) {
      clearChatHistory();
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const updatedUser = { ...user, name: editName, email: editEmail, photoURL: profilePic };
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

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const processResponse = async (text: string) => {
    const prompt = text.toLowerCase().trim();
    let botReply = '';

    if (prompt.startsWith('/idea')) {
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
      isAi: !botReply.startsWith('💡') && !Object.values(FAQS).includes(botReply) && !Object.values(BASIC_RESPONSES).includes(botReply),
    };

    setMessages(prev => [...prev, botMessage]);
    setIsLoading(false);
    if (autoSpeak) speak(botReply.replace(/[^\w\s.,?!]/gi, ''));
    if (notificationsEnabled && 'vibrate' in navigator) navigator.vibrate(50);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage: Message = { id: Date.now().toString(), text: input, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    await processResponse(currentInput);
  };

  const handleSuggestionClick = async (suggestion: string) => {
    if (isLoading) return;
    const userMessage: Message = { id: Date.now().toString(), text: suggestion, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    await processResponse(suggestion);
  };

  const clearChatHistory = () => {
    setWelcomeMessage();
    localStorage.removeItem('gdg_chat_history');
    setActiveModal(null);
  };

  const deleteMessage = (id: string) => setMessages(prev => prev.filter(m => m.id !== id));
  
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
      case 'blueprint':
        return { 
          backgroundImage: `linear-gradient(${isDark ? '#1e293b' : '#f8fafc'} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? '#1e293b' : '#f8fafc'} 1px, transparent 1px)`, 
          backgroundSize: '40px 40px' 
        };
      case 'mesh':
        return { 
          backgroundImage: isDark 
            ? 'radial-gradient(at 0% 0%, hsla(217,100%,30%,0.15) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(225,100%,30%,0.15) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(339,100%,30%,0.15) 0, transparent 50%)'
            : 'radial-gradient(at 0% 0%, hsla(217,100%,90%,1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(225,100%,90%,1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(339,100%,90%,1) 0, transparent 50%)'
        };
      case 'clean':
        return { background: 'transparent' };
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

  if (!user) return <Auth onLogin={handleLogin} />;

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans flex flex-col items-center transition-colors duration-500`}>
      <div className={`flex flex-col h-screen w-full max-w-4xl shadow-2xl relative overflow-hidden transition-all duration-300 ${darkMode ? 'bg-slate-900 border-x border-slate-800' : 'bg-white'}`}>
        
        {/* Header */}
        <header className={`${darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-100'} backdrop-blur-md border-b p-4 flex items-center justify-between sticky top-0 z-40`}>
          <div className="flex items-center gap-4">
             <button 
                onClick={handleNewChat}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700' : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'}`}
                title="Start Fresh"
              >
                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                New Chat
              </button>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#EA4335]"></div>
                <div className="w-3 h-3 rounded-full bg-[#4285F4]"></div>
                <div className="w-3 h-3 rounded-full bg-[#34A853]"></div>
              </div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">GDG Assistant</h1>
            </div>
          </div>
          
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`flex items-center gap-2 p-1 rounded-full transition-all border border-transparent ${darkMode ? 'hover:bg-slate-800 hover:border-slate-700' : 'hover:bg-slate-50 hover:border-slate-200'}`}
            >
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.name}`} className="w-9 h-9 rounded-full object-cover shadow-sm ring-2 ring-transparent group-hover:ring-blue-500 transition-all" alt="Profile" />
              <svg className={`w-4 h-4 text-slate-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {isMenuOpen && (
              <div className={`absolute right-0 mt-3 w-64 border shadow-2xl rounded-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`px-4 py-3 border-b mb-1 ${darkMode ? 'border-slate-700' : 'border-slate-50'}`}>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Authenticated</p>
                  <p className={`text-sm font-bold truncate ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{user.name}</p>
                </div>
                {[
                  { id: 'profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label: 'My Profile' },
                  { id: 'history', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Chat Logs' },
                  { id: 'about', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'About the App' },
                  { id: 'settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', label: 'Preferences' },
                ].map(item => (
                  <button 
                    key={item.id}
                    onClick={() => { setActiveModal(item.id as any); setIsMenuOpen(false); }} 
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
                    {item.label}
                  </button>
                ))}
                <div className={`border-t mt-1 ${darkMode ? 'border-slate-700' : 'border-slate-50'}`}>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Chat Area */}
        <main 
          ref={scrollRef}
          className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 chat-scrollbar transition-all duration-300 relative ${darkMode ? 'bg-slate-950' : 'bg-white'}`}
          style={getBackgroundStyle()}
        >
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-3 sm:gap-4 ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
              {/* Avatar */}
              <div className="flex-shrink-0 mt-1">
                {m.sender === 'user' ? (
                  <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.name}`} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover shadow-md ring-2 ring-blue-500/20" alt="User" />
                ) : (
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-md border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                )}
              </div>

              {/* Message Bubble Container */}
              <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] group relative ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                {/* Bubble */}
                <div className={`px-5 py-4 rounded-3xl shadow-sm transition-all duration-300 relative ${
                  m.sender === 'user' 
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none shadow-blue-500/10' 
                    : darkMode 
                      ? 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-none hover:border-slate-600' 
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none hover:border-slate-300 shadow-slate-200/50'
                }`}>
                  <div className="text-[15px] whitespace-pre-wrap leading-relaxed font-normal">{m.text}</div>
                </div>

                {/* Footer Info & Actions */}
                <div className={`flex items-center gap-3 mt-2 ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className={`text-[10px] font-bold tracking-tight opacity-40 uppercase`}>
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {m.isAi && (
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${darkMode ? 'bg-blue-900/40 text-blue-400 border-blue-800' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                      AI Mentor
                    </span>
                  )}
                  
                  {/* Hover Actions */}
                  <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200`}>
                    {m.sender === 'bot' && (
                      <button onClick={() => speak(m.text)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors" title="Listen">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                      </button>
                    )}
                    <button 
                      onClick={() => handleCopy(m.text, m.id)} 
                      className={`p-1.5 rounded-full transition-colors ${copiedId === m.id ? 'text-green-500' : 'text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                      title="Copy to clipboard"
                    >
                      {copiedId === m.id ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      )}
                    </button>
                    <button 
                      onClick={() => deleteMessage(m.id)} 
                      className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex flex-row gap-4 animate-in fade-in slide-in-from-left-4 duration-500">
               <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-md border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div className={`p-4 rounded-3xl rounded-tl-none border shadow-sm flex items-center gap-1.5 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
        </main>

        {/* Suggestion & Input */}
        <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border-t transition-all z-10`}>
          <div className={`p-3 flex gap-2 overflow-x-auto no-scrollbar border-b ${darkMode ? 'border-slate-800' : 'border-slate-50'}`}>
            {["What is GDG?", "Team advice?", "How to win?", "DevFest?"].map((s, i) => (
              <button 
                key={i} 
                onClick={() => handleSuggestionClick(s)} 
                className={`whitespace-nowrap px-5 py-2.5 text-xs font-bold rounded-full border shadow-sm transition-all active:scale-95 ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <footer className="p-4 sm:p-5 flex gap-4">
            <button 
              onClick={toggleListening} 
              className={`p-4 rounded-2xl transition-all shadow-md active:scale-90 ${isListening ? 'bg-red-500 text-white animate-pulse' : darkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              title="Vocalize"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </button>
            <div className="flex-1 relative">
              <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
                placeholder={isListening ? "Listening..." : "Ask your Hackathon Mentor..."} 
                className={`w-full h-full rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-blue-500/10 font-medium placeholder-slate-400 border transition-all ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-slate-100 focus:border-blue-500/50' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500/50'
                }`} 
              />
            </div>
            <button 
              onClick={handleSend} 
              disabled={!input.trim() || isLoading} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-7 rounded-2xl shadow-xl shadow-blue-600/20 disabled:opacity-50 active:scale-95 transition-all font-bold"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </footer>
        </div>

        {/* Modals System */}
        {activeModal && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className={`rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-300 transition-colors ${darkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-100'}`}>
              <div className="p-8 sm:p-10">
                <div className="flex justify-between items-center mb-8">
                  <h3 className={`text-2xl font-bold capitalize ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{activeModal}</h3>
                  <button onClick={() => setActiveModal(null)} className={`p-2.5 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto chat-scrollbar pr-2">
                  {activeModal === 'profile' && (
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative group">
                          <img src={profilePic || `https://ui-avatars.com/api/?name=${editName}`} className={`w-32 h-32 rounded-full border-4 object-cover shadow-2xl ${darkMode ? 'border-slate-800' : 'border-slate-50'}`} alt="Profile" />
                          <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-1 right-1 p-3 bg-blue-600 text-white rounded-full shadow-lg group-hover:scale-110 transition-transform ring-4 ring-white dark:ring-slate-900">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          </button>
                          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Update Avatar</p>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Full Name</label>
                          <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={`w-full px-6 py-4 rounded-2xl border outline-none focus:ring-4 focus:ring-blue-500/10 transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Registered Email</label>
                          <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className={`w-full px-6 py-4 rounded-2xl border outline-none opacity-60 transition-all ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'}`} disabled />
                        </div>
                      </div>
                      <button type="submit" className="w-full py-5 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95">Update Identity</button>
                    </form>
                  )}

                  {activeModal === 'history' && (
                    <div className="space-y-4">
                      {messages.length === 0 ? <p className="text-center py-12 text-slate-400 font-medium italic">No conversation logs yet.</p> : 
                      messages.map(m => (
                        <div key={m.id} className={`p-5 rounded-3xl border flex flex-col gap-2 transition-all hover:scale-[1.01] ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                          <div className="flex justify-between items-center">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${m.sender === 'user' ? 'text-blue-500' : 'text-indigo-400'}`}>{m.sender}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{m.timestamp.toLocaleString()}</span>
                          </div>
                          <p className={`text-sm line-clamp-3 leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{m.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeModal === 'about' && (
                    <div className="space-y-6">
                      <div className={`p-7 rounded-[2rem] border shadow-sm ${darkMode ? 'bg-blue-900/10 border-blue-900 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
                        <h4 className="font-bold text-xl mb-3 flex items-center gap-2">
                          GDG Assistant
                        </h4>
                        <p className="text-sm leading-relaxed opacity-90 font-medium">Your dedicated intelligent mentor for Google Developer Group hackathons. We bridge the gap between visionary ideas and high-impact solutions with AI.</p>
                      </div>
                      <div className="space-y-5">
                        {[
                          { title: "Smart Brainstorming", desc: "Instantly refine project ideas for challenges.", icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
                          { title: "Technical Advice", desc: "Expert advice on technical stacks including Firebase and Flutter.", icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
                        ].map((item, idx) => (
                          <div key={idx} className="flex gap-5 items-start p-2">
                            <div className={`p-3.5 rounded-2xl ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                              <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
                            </div>
                            <div>
                              <h5 className={`font-bold text-base mb-1 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{item.title}</h5>
                              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.3em]">Built for the Developer Community</p>
                      </div>
                    </div>
                  )}

                  {activeModal === 'settings' && (
                    <div className="space-y-8">
                      <div className="space-y-5">
                        <h4 className={`text-xs font-bold uppercase tracking-[0.2em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Interface</h4>
                        <div className={`flex items-center justify-between p-6 rounded-3xl transition-all border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${darkMode ? 'bg-slate-700' : 'bg-white shadow-sm'}`}><svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg></div>
                            <div><p className={`font-bold text-sm ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Dark Theme</p><p className="text-xs text-slate-400 font-medium">Toggle low-light mode</p></div>
                          </div>
                          <button onClick={() => setDarkMode(!darkMode)} className={`w-14 h-7 rounded-full relative transition-all ${darkMode ? 'bg-blue-600' : 'bg-slate-300'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${darkMode ? 'right-1' : 'left-1'}`}></div></button>
                        </div>

                        <div className="space-y-4">
                          <p className={`font-bold text-sm ml-1 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Workspace Background</p>
                          <div className="grid grid-cols-5 gap-3">
                            {['grid', 'dots', 'blueprint', 'mesh', 'clean'].map((type) => (
                              <button 
                                key={type}
                                onClick={() => setBgType(type)}
                                className={`h-14 rounded-2xl border-2 transition-all flex items-center justify-center capitalize text-[10px] font-bold overflow-hidden relative ${
                                  bgType === type 
                                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-600' 
                                    : darkMode ? 'border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200 shadow-sm'
                                }`}
                              >
                                {type}
                                {bgType === type && (
                                  <div className="absolute top-0 right-0 w-4 h-4 bg-blue-600 rounded-bl-lg flex items-center justify-center">
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-5 pt-8 border-t border-slate-100 dark:border-slate-800">
                        <h4 className={`text-xs font-bold uppercase tracking-[0.2em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>AI Interactions</h4>
                        <div className={`flex items-center justify-between p-6 rounded-3xl transition-all border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${darkMode ? 'bg-slate-700' : 'bg-white shadow-sm'}`}><svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg></div>
                            <div><p className={`font-bold text-sm ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Vocal Mode</p><p className="text-xs text-slate-400 font-medium">Automatic narration</p></div>
                          </div>
                          <button onClick={() => setAutoSpeak(!autoSpeak)} className={`w-14 h-7 rounded-full relative transition-all ${autoSpeak ? 'bg-blue-600' : 'bg-slate-300'}`}><div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${autoSpeak ? 'right-1' : 'left-1'}`}></div></button>
                        </div>
                      </div>

                      <div className={`p-7 rounded-[2rem] border ${darkMode ? 'bg-red-900/10 border-red-900/40 text-red-400' : 'bg-red-50 border-red-100 text-red-600 shadow-sm shadow-red-500/5'}`}>
                        <div className="flex items-center justify-between">
                          <div><p className="font-black text-sm mb-1 uppercase tracking-tighter">System Reset</p><p className="text-xs opacity-75 font-bold">Wipe all local data</p></div>
                          <button onClick={() => setActiveModal('confirmClear')} className="text-[11px] font-black text-white bg-red-600 px-6 py-3 rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 active:scale-95 uppercase tracking-widest">Wipe Data</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeModal === 'confirmClear' && (
                    <div className="text-center py-8 space-y-7">
                      <div className="w-28 h-28 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner ring-8 ring-red-50/50 dark:ring-red-900/10 animate-pulse"><svg className="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></div>
                      <div>
                        <p className={`text-2xl font-black mb-2 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Confirm Wipe?</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-bold px-4 leading-relaxed">This will erase your entire chat history. Are you sure?</p>
                      </div>
                      <div className="flex gap-4 px-2">
                        <button onClick={() => setActiveModal('settings')} className={`flex-1 py-4.5 rounded-3xl font-black transition-all uppercase tracking-widest text-[11px] ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Cancel</button>
                        <button onClick={clearChatHistory} className="flex-1 py-4.5 rounded-3xl bg-red-600 text-white font-black hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 active:scale-95 uppercase tracking-widest text-[11px]">Confirm Wipe</button>
                      </div>
                    </div>
                  )}
                </div>

                {activeModal !== 'confirmClear' && activeModal !== 'profile' && (
                  <button onClick={() => setActiveModal(null)} className={`mt-12 w-full py-5 font-black rounded-3xl shadow-2xl transition-all active:scale-[0.98] uppercase tracking-[0.2em] text-[11px] ${darkMode ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20'}`}>Back to Workspace</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
