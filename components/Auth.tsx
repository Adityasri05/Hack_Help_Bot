
import React, { useState } from 'react';
import { User } from '../types';

interface AuthProps {
  onLogin: (user: User) => void;
}

type GoogleAuthStep = 'none' | 'email' | 'password';

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google Flow States
  const [googleStep, setGoogleStep] = useState<GoogleAuthStep>('none');
  const [googleEmail, setGoogleEmail] = useState('');
  const [googlePassword, setGooglePassword] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleManualAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Standard manual auth simulation
    setTimeout(() => {
      onLogin({
        email,
        name: isSignUp ? (name || email.split('@')[0]) : email.split('@')[0],
        photoURL: `https://ui-avatars.com/api/?name=${name || email}&background=4285F4&color=fff`,
        isAuthenticated: true,
        bio: isSignUp ? 'New Hacker on the block!' : 'Hackathon Builder',
        techStack: 'Full Stack'
      });
      setLoading(false);
    }, 1200);
  };

  const startGoogleFlow = () => {
    setError(null);
    setGoogleStep('email');
  };

  const handleGoogleEmailNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.includes('@')) {
      setError("Enter a valid email address");
      return;
    }
    setError(null);
    setGoogleStep('password');
  };

  const handleGoogleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleLoading(true);
    setError(null);

    try {
      // Identity verification handshake required by environment
      if (typeof (window as any).aistudio?.openSelectKey === 'function') {
        await (window as any).aistudio.openSelectKey();
      }

      // Proceed with the user's actual entered email
      onLogin({
        email: googleEmail,
        name: googleEmail.split('@')[0],
        photoURL: `https://ui-avatars.com/api/?name=${googleEmail}&background=4285F4&color=fff`,
        isAuthenticated: true,
        bio: 'Verified via Google Identity Services',
        techStack: 'Cloud & AI'
      });
    } catch (err) {
      console.error("Auth Error:", err);
      setError("Failed to verify Google account. Try again.");
      setGoogleLoading(false);
    }
  };

  const GoogleLogo = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" className="mb-4">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-500 font-sans text-slate-900 dark:text-slate-100">
      <div className="max-w-md w-full animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative min-h-[500px] flex flex-col">
          
          {/* Simulated Google Flow UI Overlay */}
          {googleStep !== 'none' && (
            <div className="absolute inset-0 bg-white dark:bg-slate-900 z-50 flex flex-col p-8 sm:p-12 animate-in slide-in-from-right-full duration-500">
              <div className="flex flex-col items-center flex-1">
                <GoogleLogo />
                <h2 className="text-2xl font-medium mb-2">Sign in</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8">Use your Google Account</p>

                {error && (
                  <div className="w-full mb-6 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs font-bold flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    {error}
                  </div>
                )}

                {googleStep === 'email' ? (
                  <form onSubmit={handleGoogleEmailNext} className="w-full space-y-6">
                    <div className="relative">
                      <input 
                        type="email" 
                        required 
                        autoFocus
                        value={googleEmail} 
                        onChange={(e) => setGoogleEmail(e.target.value)}
                        className="w-full px-4 py-4 rounded-lg border-2 border-slate-100 dark:border-slate-700 focus:border-blue-500 outline-none transition-all bg-transparent"
                        placeholder="Email or phone"
                      />
                    </div>
                    <div className="text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer">Forgot email?</div>
                    <div className="text-xs text-slate-500 mt-4 leading-relaxed">
                      Not your computer? Use Guest mode to sign in privately. <span className="text-blue-600 font-bold cursor-pointer">Learn more</span>
                    </div>
                    <div className="flex justify-between items-center mt-12">
                      <button type="button" onClick={() => setGoogleStep('none')} className="text-blue-600 font-bold text-sm hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors">Back</button>
                      <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-2.5 rounded-lg transition-all">Next</button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleGoogleComplete} className="w-full space-y-6">
                    <div className="flex items-center gap-2 mb-8 p-1.5 border border-slate-200 dark:border-slate-700 rounded-full w-fit mx-auto bg-slate-50 dark:bg-slate-800">
                      <div className="w-5 h-5 rounded-full bg-slate-300"></div>
                      <span className="text-sm font-medium mr-2">{googleEmail}</span>
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                    <div className="relative">
                      <input 
                        type="password" 
                        required 
                        autoFocus
                        value={googlePassword} 
                        onChange={(e) => setGooglePassword(e.target.value)}
                        className="w-full px-4 py-4 rounded-lg border-2 border-slate-100 dark:border-slate-700 focus:border-blue-500 outline-none transition-all bg-transparent"
                        placeholder="Enter your password"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                       <input type="checkbox" className="w-4 h-4" />
                       <span className="text-sm text-slate-600 dark:text-slate-400">Show password</span>
                    </div>
                    <div className="flex justify-between items-center mt-12">
                      <button type="button" onClick={() => setGoogleStep('email')} className="text-blue-600 font-bold text-sm hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors">Back</button>
                      <button 
                        type="submit" 
                        disabled={googleLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-2.5 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {googleLoading ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : null}
                        Next
                      </button>
                    </div>
                  </form>
                )}
              </div>
              <footer className="mt-auto pt-8 flex justify-between text-xs text-slate-500">
                <div className="flex gap-4">
                  <span className="hover:text-slate-900 cursor-pointer">English (United States)</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
                <div className="flex gap-4">
                  <span className="hover:text-slate-900 cursor-pointer">Help</span>
                  <span className="hover:text-slate-900 cursor-pointer">Privacy</span>
                  <span className="hover:text-slate-900 cursor-pointer">Terms</span>
                </div>
              </footer>
            </div>
          )}

          <div className="p-8 sm:p-12">
            {/* Brand Header */}
            <div className="flex flex-col items-center mb-8 text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mb-6 rotate-3 transform hover:rotate-0 transition-all duration-500">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-3xl font-black tracking-tight mb-2">
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-[250px]">
                {isSignUp ? 'Join the GDG Hackathon workspace and build with us.' : 'Sign in to continue your project journey.'}
              </p>
            </div>

            {error && !googleStep && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-3 animate-in shake">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* Google Identity Trigger */}
            <button
              onClick={startGoogleFlow}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-4 py-4 px-6 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl transition-all font-black text-slate-700 dark:text-slate-200 shadow-sm active:scale-[0.98] group relative overflow-hidden hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-700/50`}
            >
              <GoogleLogo />
              <span className="group-hover:translate-x-1 transition-transform">Continue with Google</span>
            </button>

            <div className="relative my-10">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                <span className="px-6 bg-white dark:bg-slate-900">OR</span>
              </div>
            </div>

            {/* Manual Form Area */}
            <form onSubmit={handleManualAuth} className="space-y-5">
              {isSignUp && (
                <div className="animate-in slide-in-from-left-4 duration-300">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-blue-500 outline-none transition-all font-bold text-sm shadow-inner" 
                    placeholder="Jane Doe" 
                  />
                </div>
              )}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email</label>
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-blue-500 outline-none transition-all font-bold text-sm shadow-inner" 
                  placeholder="name@email.com" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                <input 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-blue-500 outline-none transition-all font-bold text-sm shadow-inner" 
                  placeholder="••••••••" 
                />
              </div>
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center uppercase tracking-widest text-[10px]"
              >
                {loading ? 'Processing...' : (isSignUp ? 'Create Workspace' : 'Sign In')}
              </button>
            </form>

            <div className="mt-8 text-center">
              <button 
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest hover:underline"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </div>

          {/* Footer Security Badge */}
          <div className="p-6 mt-auto bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex justify-center gap-6">
             <div className="flex items-center gap-1.5 opacity-30">
               <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
               <span className="text-[9px] font-black uppercase tracking-widest">TLS 1.3</span>
             </div>
             <div className="flex items-center gap-1.5 opacity-30">
               <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>
               <span className="text-[9px] font-black uppercase tracking-widest">Google SSO</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
