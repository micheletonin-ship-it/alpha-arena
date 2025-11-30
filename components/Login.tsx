
import React, { useState } from 'react';
import { Theme } from '../types';
import { Mail, Lock, ArrowRight, User as UserIcon } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, name: string) => void;
  theme: Theme;
  isLoading?: boolean;
}

export const Login: React.FC<LoginProps> = ({ onLogin, theme, isLoading = false }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const displayName = name || (email.split('@')[0]);
    const finalName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    onLogin(email, finalName);
  };

  return (
    <div className={`flex min-h-screen w-full flex-col items-center justify-center transition-colors duration-300 ${theme === 'dark' ? 'bg-gradient-to-br from-[#121212] via-[#1a1a1a] to-[#0a0a0a]' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100'}`}>
      
      {/* Mobile Hero Section - Only visible on mobile */}
      <div className="w-full max-w-md px-4 mb-8 md:hidden animate-in fade-in slide-in-from-top duration-700">
        <div className="text-center space-y-6">
          {/* Logo & Tagline */}
          <div className="animate-in fade-in slide-in-from-top duration-500">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-neonGreen to-cyan-500 shadow-lg shadow-neonGreen/50"></div>
              <span className={`text-3xl font-bold tracking-wider ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                ALPHA<span className="text-neonGreen">ARENA</span>
              </span>
            </div>
            <p className={`text-xl font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Think Faster. Trade Smarter.<br/>
              Win Bigger.
            </p>
          </div>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="flex w-full max-w-5xl overflow-hidden rounded-3xl shadow-2xl mx-4 animate-in fade-in zoom-in duration-500 delay-150">
        
        {/* Left Side - Visuals */}
        <div className={`hidden w-1/2 flex-col justify-between p-12 md:flex ${theme === 'dark' ? 'bg-[#1E1E1E]' : 'bg-blue-600'}`}>
           <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-neonGreen to-cyan-500"></div>
                <span className={`text-xl font-bold tracking-wider ${theme === 'dark' ? 'text-white' : 'text-white'}`}>
                  ALPHA<span className="text-neonGreen">ARENA</span>
                </span>
              </div>
              <div className="mt-16">
                <h1 className="text-5xl font-bold leading-tight text-white">
                  Think Faster. Trade Smarter.<br/>
                  Win Bigger.
                </h1>
              </div>
           </div>
           
           {/* Bottom gradient decoration - abstract only */}
           <div className="relative h-32 w-full">
              <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-neonGreen/20 blur-3xl"></div>
              <div className="absolute right-10 bottom-0 h-32 w-32 rounded-full bg-blue-500/20 blur-3xl"></div>
           </div>
        </div>

        {/* Right Side - Form */}
        <div className={`flex w-full flex-col justify-center p-8 md:w-1/2 md:p-12 ${theme === 'dark' ? 'bg-black/40' : 'bg-white'}`}>
           <div className="mb-8 text-center md:text-left">
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {isLogin ? 'Sign in to your account' : 'Create an account'}
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button 
                  onClick={() => setIsLogin(!isLogin)}
                  className="ml-1 font-semibold text-neonGreen hover:underline focus:outline-none"
                >
                  {isLogin ? 'Sign up' : 'Log in'}
                </button>
              </p>
           </div>

           <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                   <label className={`mb-1.5 block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Full Name</label>
                   <div className={`flex items-center rounded-xl border px-4 py-3 transition-colors focus-within:border-neonGreen ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                      <UserIcon size={20} className="text-gray-400" />
                      <input 
                        type="text" 
                        required={!isLogin}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className={`ml-3 w-full bg-transparent text-sm outline-none ${theme === 'dark' ? 'text-white placeholder:text-gray-600' : 'text-gray-900 placeholder:text-gray-400'}`}
                      />
                   </div>
                </div>
              )}

              <div>
                 <label className={`mb-1.5 block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Email Address</label>
                 <div className={`flex items-center rounded-xl border px-4 py-3 transition-colors focus-within:border-neonGreen ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                    <Mail size={20} className="text-gray-400" />
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className={`ml-3 w-full bg-transparent text-sm outline-none ${theme === 'dark' ? 'text-white placeholder:text-gray-600' : 'text-gray-900 placeholder:text-gray-400'}`}
                    />
                 </div>
              </div>

              <div>
                 <label className={`mb-1.5 block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Password</label>
                 <div className={`flex items-center rounded-xl border px-4 py-3 transition-colors focus-within:border-neonGreen ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                    <Lock size={20} className="text-gray-400" />
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`ml-3 w-full bg-transparent text-sm outline-none ${theme === 'dark' ? 'text-white placeholder:text-gray-600' : 'text-gray-900 placeholder:text-gray-400'}`}
                    />
                 </div>
              </div>

              <div className="flex items-center justify-between">
                 <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded border-gray-300 text-neonGreen focus:ring-neonGreen" />
                    <span className="text-xs text-gray-500">Remember me</span>
                 </label>
                 <button type="button" className="text-xs font-medium text-neonGreen hover:underline">Forgot password?</button>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-black transition-all hover:scale-[1.02] disabled:opacity-70 ${isLoading ? 'cursor-not-allowed bg-gray-500' : 'bg-neonGreen shadow-lg shadow-neonGreen/20'}`}
              >
                {isLoading ? 'Connecting to Cloud...' : (isLogin ? 'Sign In' : 'Create Account')}
                {!isLoading && <ArrowRight size={20} />}
              </button>
           </form>

           <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">
                Connected to AlphaArena Cloud.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};
