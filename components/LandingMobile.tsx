import React from 'react';
import { Theme } from '../types';
import { TrendingUp, ArrowRight } from 'lucide-react';

interface LandingMobileProps {
  theme: Theme;
  onSignUp: () => void;
  onLogin: () => void;
}

export const LandingMobile: React.FC<LandingMobileProps> = ({ 
  theme, 
  onSignUp, 
  onLogin 
}) => {
  return (
    <div className={`min-h-screen w-full flex flex-col ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-[#121212] via-[#1a1a1a] to-[#0a0a0a]' 
        : 'bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100'
    }`}>
      
      {/* Hero Section */}
      <div className="px-6 pt-12 pb-8 text-center flex-1 flex flex-col justify-center space-y-12">
        <div className="flex items-center justify-center gap-3 animate-in fade-in zoom-in duration-500">
          <TrendingUp size={32} className="text-neonGreen drop-shadow-lg" strokeWidth={2.5} />
          <h1 className={`text-2xl font-bold tracking-tight ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            ALPHA<span className="text-neonGreen">ARENA</span>
          </h1>
        </div>
        
        <p className={`text-4xl font-bold ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
        }`}>
          Think Faster.<br/>
          Trade Smarter.<br/>
          Win Bigger.
        </p>
        
        <p className={`text-lg max-w-md mx-auto ${
          theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
        }`}>
          Trading championships with real prices.<br/>
          Virtual capital. AI-powered strategies.
        </p>
      </div>

      {/* CTA Section - Fixed at bottom */}
      <div className="px-6 pb-8 space-y-3">
        {/* Primary CTA */}
        <button
          onClick={onSignUp}
          className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg bg-neonGreen text-black shadow-lg shadow-neonGreen/20 hover:scale-[1.02] transition-all"
        >
          <ArrowRight size={20} />
          Get Started
        </button>

        {/* Secondary CTA */}
        <button
          onClick={onLogin}
          className={`w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg border transition-all hover:scale-[1.02] ${
            theme === 'dark'
              ? 'bg-white/5 hover:bg-white/10 text-white border-white/20'
              : 'bg-white hover:bg-gray-50 text-gray-900 border-gray-300'
          }`}
        >
          Sign In
        </button>

        {/* Footer */}
        <div className="text-center pt-4">
          <p className={`text-xs ${
            theme === 'dark' ? 'text-gray-600' : 'text-gray-500'
          }`}>
            © 2025 Alpha Arena · Trading Championships
          </p>
          <p className={`text-xs mt-1 ${
            theme === 'dark' ? 'text-gray-700' : 'text-gray-600'
          }`}>
            Created by Michele Tonin
          </p>
        </div>
      </div>
    </div>
  );
};
