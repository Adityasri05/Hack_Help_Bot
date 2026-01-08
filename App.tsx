
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, Domain } from './types';
import { FAQS, IDEAS, BASIC_RESPONSES } from './constants';
import { askGemini } from './services/geminiService';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your GDG Hackathon Assistant. Ask me anything about hackathons, or request /idea [Domain] for project suggestions!",
      sender: 'bot',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const normalizeText = (text: string) => {
    return text.toLowerCase().trim();
  };

  const getIdea = (domain: string) => {
    const matchedKey = Object.keys(IDEAS).find(k => k.toLowerCase() === domain.toLowerCase());
    if (matchedKey) {
      const ideasArr = IDEAS[matchedKey];
      const randomIdea = ideasArr[Math.floor(Math.random() * ideasArr.length)];
      return `💡 ${matchedKey} Idea:\n\n${randomIdea}`;
    }
    return `Available domains: AI/ML, Web Dev, Android. Try: /idea AI/ML`;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const prompt = normalizeText(input);
    let botReply = '';

    // 1. Command logic /idea
    if (prompt.startsWith('/idea')) {
      const domain = prompt.replace('/idea', '').trim();
      botReply = getIdea(domain);
    } 
    // 2. Basic Responses
    else if (BASIC_RESPONSES[prompt]) {
      botReply = BASIC_RESPONSES[prompt];
    }
    // 3. FAQ Lookup
    else if (FAQS[prompt]) {
      botReply = FAQS[prompt];
    }
    else if (FAQS[prompt + '?']) {
      botReply = FAQS[prompt + '?'];
    }
    // 4. AI Fallback
    else {
      botReply = await askGemini(input);
    }

    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: botReply,
      sender: 'bot',
      timestamp: new Date(),
      isAi: !botReply.startsWith('💡') && !Object.values(FAQS).includes(botReply) && !Object.values(BASIC_RESPONSES).includes(botReply),
    };

    setMessages(prev => [...prev, botMessage]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto shadow-2xl bg-white">
      {/* Header */}
      <header className="bg-white border-b p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-[#EA4335]"></div>
            <div className="w-3 h-3 rounded-full bg-[#4285F4]"></div>
            <div className="w-3 h-3 rounded-full bg-[#34A853]"></div>
            <div className="w-3 h-3 rounded-full bg-[#FBBC05]"></div>
          </div>
          <h1 className="text-xl font-bold text-slate-800">GDG HackAssistant</h1>
        </div>
        <div className="text-xs text-green-600 font-medium px-2 py-1 bg-green-50 rounded-full border border-green-200">
          ● Online
        </div>
      </header>

      {/* Chat Area */}
      <main 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 chat-scrollbar bg-slate-50"
      >
        {messages.map((m) => (
          <div 
            key={m.id} 
            className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] rounded-2xl p-4 shadow-sm transition-all duration-200 ${
                m.sender === 'user' 
                  ? 'bg-[#4285F4] text-white rounded-tr-none' 
                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
              }`}
            >
              <div className="text-[15px] whitespace-pre-wrap leading-relaxed font-normal">{m.text}</div>
              <div className={`text-[10px] mt-2 flex items-center gap-2 ${m.sender === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {m.isAi && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-blue-100">Gemini AI</span>}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm animate-pulse flex gap-1">
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-75"></div>
              <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        )}
      </main>

      {/* Suggested Actions */}
      <div className="p-2 border-t flex gap-2 overflow-x-auto bg-white no-scrollbar">
        <button 
          onClick={() => setInput('/idea AI/ML')}
          className="whitespace-nowrap px-3 py-1.5 bg-red-50 text-red-700 text-sm rounded-full border border-red-100 hover:bg-red-100 transition-colors"
        >
          🤖 AI/ML Ideas
        </button>
        <button 
          onClick={() => setInput('/idea Web Dev')}
          className="whitespace-nowrap px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-full border border-blue-100 hover:bg-blue-100 transition-colors"
        >
          🌐 Web Ideas
        </button>
        <button 
          onClick={() => setInput('/idea Android')}
          className="whitespace-nowrap px-3 py-1.5 bg-green-50 text-green-700 text-sm rounded-full border border-green-100 hover:bg-green-100 transition-colors"
        >
          📱 Android Ideas
        </button>
        <button 
          onClick={() => setInput('What tech stack can we use?')}
          className="whitespace-nowrap px-3 py-1.5 bg-yellow-50 text-yellow-700 text-sm rounded-full border border-yellow-100 hover:bg-yellow-100 transition-colors"
        >
          🛠️ Tech Stacks
        </button>
      </div>

      {/* Input Area */}
      <footer className="p-4 bg-white border-t sticky bottom-0">
        <div className="flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything or use /idea..."
            className="flex-1 bg-slate-100 border-none focus:ring-2 focus:ring-blue-500 rounded-full px-5 py-3 outline-none transition-all text-slate-900 placeholder-slate-400 font-medium"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-[#4285F4] hover:bg-blue-700 text-white p-3 rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
