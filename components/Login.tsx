
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
    <div className={`flex min-h-screen w-full items-center justify-center transition-colors duration-300 ${theme === 'dark' ? 'bg-[#121212]' : 'bg-gray-50'}`}>
      <div className="flex w-full max-w-5xl overflow-hidden rounded-3xl shadow-2xl mx-4">
        
        {/* Left Side - Visuals */}
        <div className={`hidden w-1/2 flex-col justify-between p-12 md:flex ${theme === 'dark' ? 'bg-[#1E1E1E]' : 'bg-blue-600'}`}>
           <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-neonGreen to-cyan-500"></div>
                <span className={`text-xl font-bold tracking-wider ${theme === 'dark' ? 'text-white' : 'text-white'}`}>
                  TRADE<span className="text-neonGreen">VIEW</span>
                </span>
              </div>
              <div className="mt-12 space-y-6">
                <h1 className="text-4xl font-bold leading-tight text-white">
                  {isLogin ? "Welcome back to the future of trading." : "Start your journey with AlphaArena."}
                </h1>
                <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-blue-100'}`}>
                  Access real-time market data, AI-powered insights, and manage your portfolio with precision.
                </p>
              </div>
           </div>
           
           <div className="relative h-64 w-full">
              {/* Abstract decorative elements */}
              <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-neonGreen/20 blur-3xl"></div>
              <div className="absolute right-10 top-10 h-32 w-32 rounded-full bg-blue-500/20 blur-3xl"></div>
              
              <div className={`relative z-10 rounded-xl border p-4 backdrop-blur-md ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-white/20 bg-white/10'}`}>
                 <div className="flex items-center gap-3 mb-2">
                    <div className="h-2 w-2 rounded-full bg-red-500"></div>
                    <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                 </div>
                 <div className="space-y-2">
                    <div className="h-2 w-3/4 rounded bg-gray-500/30"></div>
                    <div className="h-2 w-1/2 rounded bg-gray-500/30"></div>
                    <div className="h-32 rounded bg-gradient-to-tr from-neonGreen/20 to-transparent"></div>
                 </div>
              </div>
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
