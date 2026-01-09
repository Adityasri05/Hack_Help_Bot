
import React, { useState, useEffect } from 'react';
import { User } from '../types';

interface AuthProps {
  onLogin: (user: User) => void;
}

interface MockDBUser {
  email: string;
  password?: string;
  name: string;
  photoURL: string;
  bio?: string;
  github?: string;
  techStack?: string;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Clear error when switching modes
  useEffect(() => {
    setError(null);
  }, [isSignUp]);

  const getMockDB = (): MockDBUser[] => {
    const data = localStorage.getItem('gdg_mock_users');
    return data ? JSON.parse(data) : [];
  };

  const saveToMockDB = (user: MockDBUser) => {
    const db = getMockDB();
    db.push(user);
    localStorage.setItem('gdg_mock_users', JSON.stringify(db));
  };

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
  };

  const handleSimulatedAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Passwords must be at least 6 characters.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const db = getMockDB();

      if (isSignUp) {
        const existingUser = db.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existingUser) {
          setError('An account with this email already exists.');
          setLoading(false);
          return;
        }

        const newUser: MockDBUser = {
          email,
          password,
          name: name || email.split('@')[0],
          photoURL: `https://ui-avatars.com/api/?name=${name || email}&background=random&color=fff`,
          bio: 'Building the future, one line at a time.',
          github: '',
          techStack: 'React'
        };

        saveToMockDB(newUser);
        onLogin({ ...newUser, isAuthenticated: true });
      } else {
        const user = db.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (!user) {
          setError('Invalid email or password. Please check your credentials.');
          setLoading(false);
          return;
        }

        onLogin({ ...user, isAuthenticated: true });
      }
      setLoading(false);
    }, 1500);
  };

  const handleGoogleSignIn = () => {
    setGoogleLoading(true);
    setError(null);
    
    // Professional simulation of OAuth flow
    setTimeout(() => {
      const googleUser: User = {
        email: 'developer@google.com',
        name: 'GDG Builder',
        isAuthenticated: true,
        photoURL: 'https://lh3.googleusercontent.com/a/default-user',
        bio: 'Google Developer Group Enthusiast and Innovator.',
        github: 'gdg-innovator',
        techStack: 'Fullstack Generalist'
      };
      onLogin(googleUser);
      setGoogleLoading(false);
    }, 1200);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-3 sm:p-4 transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
        <div className="p-6 sm:p-10">
          <div className="flex justify-center mb-6 sm:mb-8">
             <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-xl sm:rounded-[1.25rem] flex items-center justify-center text-white shadow-lg">
                <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-1.17-15.357A10.025 10.025 0 0112 2c3.25 0 6.138 1.543 8 3.931m0 0L21 8M12 11c3.517 0 6.799-1.009 9.571-2.753M12 11c0-3.517 1.009-6.799 2.753-9.571m0 0L19 2M12 11c-3.517 0-6.799 1.009-9.571 2.753M12 11c0 3.517-1.009 6.799-2.753 9.571m0 0L5 22M12 11c-3.517 0-6.799 1.009-9.571-2.753m0 0L2 10" /></svg>
             </div>
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-slate-800 dark:text-slate-100 mb-2">
            {isSignUp ? 'Join the Hub' : 'GDG Launchpad'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center mb-6 sm:mb-8 font-medium leading-relaxed px-4">
            {isSignUp ? 'Start your hackathon journey today.' : 'Secure access to your multimodal AI mentorship workspace.'}
          </p>

          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 text-red-600 dark:text-red-400 text-xs sm:text-sm animate-in fade-in slide-in-from-top-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className={`w-full flex items-center justify-center gap-2 sm:gap-3 py-3.5 sm:py-4 px-4 border border-slate-200 dark:border-slate-700 rounded-xl sm:rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold text-slate-700 dark:text-slate-200 mb-6 sm:mb-8 disabled:opacity-50 text-sm sm:text-base ${googleLoading ? 'animate-pulse bg-blue-50 dark:bg-blue-900/10' : ''}`}
          >
            {googleLoading ? (
              <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg width="18" height="18" className="sm:w-5 sm:h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {googleLoading ? 'Authorizing...' : 'Google'}
          </button>

          <div className="relative mb-6 sm:mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800"></div></div>
            <div className="relative flex justify-center text-[9px] sm:text-[10px] uppercase tracking-[0.2em]"><span className="px-3 bg-white dark:bg-slate-900 text-slate-400 font-black text-center">CHAPTER MEMBER LOGIN</span></div>
          </div>

          <form onSubmit={handleSimulatedAuth} className="space-y-4 sm:space-y-5">
            {isSignUp && (
              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2 ml-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-900 dark:text-slate-100 font-bold text-sm sm:text-base"
                  placeholder="John Developer"
                />
              </div>
            )}
            <div>
              <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2 ml-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-900 dark:text-slate-100 font-bold text-sm sm:text-base"
                placeholder="developer@example.com"
              />
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2 ml-1">Passcode</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-900 dark:text-slate-100 font-bold text-sm sm:text-base"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3.5 sm:py-4 bg-[#4285F4] text-white rounded-xl sm:rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center mt-4 transform active:scale-[0.98] uppercase tracking-widest text-[10px] sm:text-xs"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Syncing...</span>
                </div>
              ) : (
                isSignUp ? 'Activate' : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 sm:mt-10 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs sm:text-sm font-bold transition-colors py-2 sm:py-3 px-4 sm:px-6 rounded-xl sm:rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              {isSignUp ? 'Member? Sign In' : "New? Join Hub"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
