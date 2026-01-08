
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
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          photoURL: `https://ui-avatars.com/api/?name=${name || email}&background=random&color=fff`
        };

        saveToMockDB(newUser);
        onLogin({ ...newUser, isAuthenticated: true });
      } else {
        const user = db.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (!user) {
          setError('Invalid email or password.');
          setLoading(false);
          return;
        }

        onLogin({ ...user, isAuthenticated: true });
      }
      setLoading(false);
    }, 1500);
  };

  const handleGoogleSignIn = () => {
    setLoading(true);
    setError(null);
    setTimeout(() => {
      const googleUser: User = {
        email: 'developer@example.com',
        name: 'Developer',
        isAuthenticated: true,
        photoURL: 'https://lh3.googleusercontent.com/a/default-user'
      };
      onLogin(googleUser);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
        <div className="p-8 sm:p-10">
          <div className="flex justify-center mb-6">
            <div className="flex gap-2 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700 shadow-inner">
              <div className="w-4 h-4 rounded-full bg-[#EA4335] shadow-sm"></div>
              <div className="w-4 h-4 rounded-full bg-[#4285F4] shadow-sm"></div>
              <div className="w-4 h-4 rounded-full bg-[#34A853] shadow-sm"></div>
              <div className="w-4 h-4 rounded-full bg-[#FBBC05] shadow-sm"></div>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-center text-slate-800 dark:text-slate-100 mb-2">
            {isSignUp ? 'Join the Assistant' : 'Welcome to the Assistant'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-8 font-medium">
            {isSignUp ? 'Start your hackathon journey today.' : 'Sign in to access your AI companion.'}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 px-4 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all font-bold text-slate-700 dark:text-slate-200 mb-8 disabled:opacity-50 shadow-sm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em]"><span className="px-3 bg-white dark:bg-slate-900 text-slate-400 font-bold">OR LOGIN DIRECTLY</span></div>
          </div>

          <form onSubmit={handleSimulatedAuth} className="space-y-5">
            {isSignUp && (
              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-900 dark:text-slate-100"
                  placeholder="Full Name"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-900 dark:text-slate-100"
                placeholder="developer@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-900 dark:text-slate-100"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#4285F4] text-white rounded-2xl font-bold shadow-xl shadow-blue-500/20 hover:bg-blue-600 hover:shadow-blue-500/40 transition-all disabled:opacity-50 flex items-center justify-center mt-4 transform active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Connecting...</span>
                </div>
              ) : (
                isSignUp ? 'Join Now' : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-bold transition-colors py-3 px-6 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30"
            >
              {isSignUp ? 'Already a Member? Sign In' : "New to the Community?"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
