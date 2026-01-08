
import React, { useState, useRef, useEffect } from 'react';
import { Message, User } from './types';
import { FAQS, IDEAS, BASIC_RESPONSES } from './constants';
import { askGemini } from './services/geminiService';
import Auth from './components/Auth';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  
  // Dark Mode: Defaults to false (Off)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('gdg_assistant_dark_mode');
    return saved === 'true'; 
  });

  // Background Selection State
  const [bgType, setBgType] = useState<string>(() => {
    return localStorage.getItem('gdg_assistant_bg') || 'grid';
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    const savedMessages = localStorage.getItem('gdg_chat_history');
    if (savedMessages) {
      const parsed = JSON.parse(savedMessages);
      return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
    }
    return [{
      id: '1',
      text: "Hello! I'm your GDG Hackathon Assistant. Ask me anything about hackathons, or use the buttons below for quick suggestions!",
      sender: 'bot',
      timestamp: new Date(),
    }];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'help' | 'about' | 'settings' | 'history' | 'profile' | 'confirmClear' | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  
  // Profile edit states
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [profilePic, setProfilePic] = useState<string | undefined>(undefined);

  const scrollRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Speech Recognition
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

  // Dark Mode Sync
  useEffect(() => {
    localStorage.setItem('gdg_assistant_dark_mode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Background Sync
  useEffect(() => {
    localStorage.setItem('gdg_assistant_bg', bgType);
  }, [bgType]);

  // Sync state with localStorage
  useEffect(() => {
    localStorage.setItem('gdg_chat_history', JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const savedUser = localStorage.getItem('gdg_assistant_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      setEditName(parsed.name);
      setEditEmail(parsed.email);
      setProfilePic(parsed.photoURL);
    }

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
      // 1. Clear session state immediately
      setUser(null);
      
      // 2. Clear persistence
      localStorage.removeItem('gdg_assistant_user');
      localStorage.removeItem('gdg_chat_history');
      
      // 3. Reset all UI states
      setIsMenuOpen(false);
      setActiveModal(null);
      setEditName('');
      setEditEmail('');
      setProfilePic(undefined);
      setInput('');
      setIsLoading(false);
      
      // Reset messages to welcome state
      setMessages([{
        id: '1',
        text: "Hello! I'm your GDG Hackathon Assistant. Ask me anything about hackathons, or use the buttons below for quick suggestions!",
        sender: 'bot',
        timestamp: new Date(),
      }]);
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
    const initialMessage: Message = {
      id: '1',
      text: "Hello! I'm your GDG Hackathon Assistant. Ask me anything about hackathons, or use the buttons below for quick suggestions!",
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages([initialMessage]);
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
          backgroundImage: `radial-gradient(${isDark ? '#334155' : '#e2e8f0'} 1px, transparent 1px)`, 
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
    <div className={`min-h-screen ${darkMode ? 'bg-slate-950' : 'bg-slate-50'} font-sans flex flex-col items-center transition-colors duration-500`}>
      <div className={`flex flex-col h-screen w-full max-w-4xl shadow-2xl relative overflow-hidden transition-all duration-300 ${darkMode ? 'bg-slate-900 border-x border-slate-800' : 'bg-white'}`}>
        
        {/* Header */}
        <header className={`${darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-100'} backdrop-blur-md border-b p-4 flex items-center justify-between sticky top-0 z-40`}>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-[#EA4335]"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-[#4285F4]"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-[#34A853]"></div>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">GDG Assistant</h1>
          </div>
          
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`flex items-center gap-2 p-1 rounded-full transition-all border border-transparent ${darkMode ? 'hover:bg-slate-800 hover:border-slate-700' : 'hover:bg-slate-50 hover:border-slate-200'}`}
            >
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.name}`} className="w-9 h-9 rounded-full object-cover shadow-sm" alt="Profile" />
              <svg className={`w-4 h-4 text-slate-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {isMenuOpen && (
              <div className={`absolute right-0 mt-3 w-64 border shadow-xl rounded-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`px-4 py-3 border-b mb-1 ${darkMode ? 'border-slate-700' : 'border-slate-50'}`}>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Signed in as</p>
                  <p className={`text-sm font-bold truncate ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{user.name}</p>
                </div>
                <button onClick={() => { setActiveModal('profile'); setIsMenuOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  My Profile
                </button>
                <button onClick={() => { setActiveModal('history'); setIsMenuOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Chat History
                </button>
                <button onClick={() => { setActiveModal('about'); setIsMenuOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  About this App
                </button>
                <button onClick={() => { setActiveModal('settings'); setIsMenuOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Settings
                </button>
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

        {/* Chat Area with Configurable Background */}
        <main 
          ref={scrollRef}
          className={`flex-1 overflow-y-auto p-4 space-y-4 chat-scrollbar transition-all duration-300 relative ${darkMode ? 'bg-slate-950' : 'bg-white'}`}
          style={getBackgroundStyle()}
        >
          {messages.map((m) => (
            <div key={m.id} className={`flex group ${m.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300 relative`}>
              <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm relative transition-all ${
                m.sender === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : darkMode ? 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-none shadow-lg' : 'bg-slate-100 text-slate-800 border border-slate-200 rounded-tl-none'
              }`}>
                {/* Close Button on Chat Corner */}
                <button 
                  onClick={() => deleteMessage(m.id)} 
                  className={`absolute -top-2 -right-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-500 hover:text-white border shadow-sm ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-white border-slate-100 text-slate-400'}`} 
                  title="Remove message"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                
                <div className="text-[15px] whitespace-pre-wrap leading-relaxed pr-1 font-normal">{m.text}</div>
                <div className={`text-[10px] mt-2 flex items-center gap-2 ${m.sender === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                  {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {m.isAi && <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${darkMode ? 'bg-blue-900/30 text-blue-400 border-blue-900' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>Gemini AI</span>}
                  {m.sender === 'bot' && (
                    <button onClick={() => speak(m.text)} className="hover:text-blue-500 transition-colors">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'} border rounded-2xl rounded-tl-none p-4 shadow-sm flex gap-1.5`}>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-300"></div>
              </div>
            </div>
          )}
        </main>

        {/* Suggestion & Input */}
        <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} border-t`}>
          <div className={`p-3 flex gap-2 overflow-x-auto no-scrollbar border-b ${darkMode ? 'border-slate-800' : 'border-slate-50'}`}>
            {["What is GDG?", "Do I need a team?", "How to win?", "Joke"].map((s, i) => (
              <button key={i} onClick={() => handleSuggestionClick(s)} className={`whitespace-nowrap px-4 py-2 text-sm rounded-full border transition-all flex items-center gap-2 active:scale-95 ${
                darkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500 hover:bg-slate-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-400 hover:bg-blue-50'
              }`}>{s}</button>
            ))}
          </div>
          <footer className="p-4 flex gap-2">
            <button onClick={toggleListening} className={`p-3.5 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse shadow-lg' : darkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </button>
            <input 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
              placeholder={isListening ? "Listening..." : "Ask me anything..."} 
              className={`flex-1 rounded-full px-5 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 font-medium placeholder-slate-400 transition-colors ${
                darkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-800'
              }`} 
            />
            <button onClick={handleSend} disabled={!input.trim() || isLoading} className="bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-full shadow-lg disabled:opacity-50 active:scale-90 transition-all">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </footer>
        </div>

        {/* Modals System */}
        {activeModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className={`rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-300 transition-colors ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className={`text-xl font-bold capitalize ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{activeModal}</h3>
                  <button onClick={() => setActiveModal(null)} className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto chat-scrollbar pr-2">
                  {activeModal === 'profile' && (
                    <form onSubmit={handleUpdateProfile} className="space-y-5">
                      <div className="flex flex-col items-center gap-4 mb-2">
                        <div className="relative group">
                          <img src={profilePic || `https://ui-avatars.com/api/?name=${editName}`} className={`w-24 h-24 rounded-full border-4 object-cover shadow-lg ${darkMode ? 'border-slate-700' : 'border-slate-50'}`} alt="Profile" />
                          <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg group-hover:scale-110 transition-transform"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
                          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                        </div>
                        <p className="text-xs text-slate-400">Click the icon to upload a new photo</p>
                      </div>
                      <div>
                        <label className={`block text-xs font-bold uppercase mb-1.5 ml-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Full Name</label>
                        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />
                      </div>
                      <div>
                        <label className={`block text-xs font-bold uppercase mb-1.5 ml-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Email Address</label>
                        <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />
                      </div>
                      <button type="submit" className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-95">Save Profile Changes</button>
                    </form>
                  )}

                  {activeModal === 'history' && (
                    <div className="space-y-3">
                      {messages.length === 0 ? <p className="text-center py-8 text-slate-400">No chat history available.</p> : 
                      messages.map(m => (
                        <div key={m.id} className={`p-3 rounded-xl border flex flex-col gap-1 ${darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50/50 border-slate-100'}`}>
                          <div className="flex justify-between items-center">
                            <span className={`text-[10px] font-bold uppercase ${m.sender === 'user' ? 'text-blue-500' : 'text-slate-400'}`}>{m.sender}</span>
                            <span className="text-[10px] text-slate-400">{m.timestamp.toLocaleString()}</span>
                          </div>
                          <p className={`text-sm line-clamp-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{m.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeModal === 'about' && (
                    <div className="space-y-4">
                      <div className={`p-5 rounded-2xl border mb-4 ${darkMode ? 'bg-blue-900/20 border-blue-900 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
                        <h4 className="font-bold mb-2">Welcome to GDG HackAssistant!</h4>
                        <p className="text-sm leading-relaxed">This application is a specialized tool designed for Google Developer Group (GDG) hackathon participants. It leverages advanced Gemini AI capabilities to provide student developers with real-time technical guidance and creative brainstorming.</p>
                      </div>
                      <div className="space-y-4">
                        {[
                          { title: "Project Ideas", desc: "Instantly generate innovative projects in AI, Web, and Android domains." },
                          { title: "Technical Support", desc: "Ask about Flutter, Firebase, Android, and Cloud for troubleshooting." },
                          { title: "Hackathon Strategy", desc: "Get tips on MVP building and preparations for winning pitches." }
                        ].map((item, idx) => (
                          <div key={idx}>
                            <h5 className={`font-bold text-sm flex items-center gap-2 mb-1 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div> {item.title}
                            </h5>
                            <p className="text-xs text-slate-500">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                      <div className={`pt-4 border-t text-center ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Version 2.3.0 • Powered by Google Gemini</p>
                      </div>
                    </div>
                  )}

                  {activeModal === 'settings' && (
                    <div className="space-y-6">
                      {/* Appearance Section */}
                      <div className="space-y-4">
                        <h4 className={`text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Appearance</h4>
                        <div className={`flex items-center justify-between p-4 rounded-xl transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                          <div><p className={`font-bold text-sm ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Dark Mode</p><p className="text-xs text-slate-400">Adaptive interface appearance</p></div>
                          <button onClick={() => setDarkMode(!darkMode)} className={`w-12 h-6 rounded-full relative transition-all ${darkMode ? 'bg-blue-600' : 'bg-slate-200'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${darkMode ? 'right-1' : 'left-1'}`}></div></button>
                        </div>

                        <div className="space-y-3">
                          <p className={`font-bold text-sm ml-1 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Chat Background</p>
                          <div className="grid grid-cols-5 gap-2">
                            {['grid', 'dots', 'blueprint', 'mesh', 'clean'].map((type) => (
                              <button 
                                key={type}
                                onClick={() => setBgType(type)}
                                className={`h-12 rounded-lg border-2 transition-all flex items-center justify-center capitalize text-[10px] font-bold ${
                                  bgType === type 
                                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600' 
                                    : darkMode ? 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                                }`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Interaction Section */}
                      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <h4 className={`text-xs font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Interaction</h4>
                        <div className={`flex items-center justify-between p-4 rounded-xl transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                          <div><p className={`font-bold text-sm ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Auto-speak Responses</p><p className="text-xs text-slate-400">Read AI answers out loud</p></div>
                          <button onClick={() => setAutoSpeak(!autoSpeak)} className={`w-12 h-6 rounded-full relative transition-all ${autoSpeak ? 'bg-blue-600' : 'bg-slate-200'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${autoSpeak ? 'right-1' : 'left-1'}`}></div></button>
                        </div>
                        
                        <div className={`flex items-center justify-between p-4 rounded-xl transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                          <div><p className={`font-bold text-sm ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Haptic Feedback</p><p className="text-xs text-slate-400">Vibrate on new messages</p></div>
                          <button onClick={() => setNotificationsEnabled(!notificationsEnabled)} className={`w-12 h-6 rounded-full relative transition-all ${notificationsEnabled ? 'bg-blue-600' : 'bg-slate-200'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${notificationsEnabled ? 'right-1' : 'left-1'}`}></div></button>
                        </div>
                      </div>

                      <div className={`p-4 rounded-xl border ${darkMode ? 'bg-red-900/10 border-red-900/50' : 'bg-red-50 border-red-100'}`}>
                        <p className="font-bold text-sm text-red-600 mb-1">Danger Zone</p>
                        <button onClick={() => setActiveModal('confirmClear')} className="text-xs font-bold text-white bg-red-600 px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">Clear All Chat Data</button>
                      </div>
                    </div>
                  )}

                  {activeModal === 'confirmClear' && (
                    <div className="text-center py-4 space-y-6">
                      <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto"><svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></div>
                      <p className={`font-bold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Wipe all chat history?</p>
                      <p className="text-sm text-slate-500">This will permanently delete your entire conversation log from this device.</p>
                      <div className="flex gap-3">
                        <button onClick={() => setActiveModal('settings')} className={`flex-1 py-3.5 rounded-xl font-bold transition-colors ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Cancel</button>
                        <button onClick={clearChatHistory} className="flex-1 py-3.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors">Clear Now</button>
                      </div>
                    </div>
                  )}
                </div>

                {activeModal !== 'confirmClear' && activeModal !== 'profile' && (
                  <button onClick={() => setActiveModal(null)} className={`mt-8 w-full py-4 font-bold rounded-2xl transition-all active:scale-95 ${darkMode ? 'bg-slate-700 text-slate-100 hover:bg-slate-600' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}>Done</button>
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
