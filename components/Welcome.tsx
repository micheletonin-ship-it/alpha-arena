import React from 'react';
import { Theme, User } from '../types';
import { Trophy, TrendingUp, Bot, Sparkles, MessageSquare, ChevronRight, CheckCircle } from 'lucide-react';

interface WelcomeProps {
  theme: Theme;
  user: User;
  onJoinFreeChampionship: () => void;
  onGoToDashboard: () => void;
}

export const Welcome: React.FC<WelcomeProps> = ({ 
  theme, 
  user, 
  onJoinFreeChampionship, 
  onGoToDashboard 
}) => {
  return (
    <div className={`min-h-screen w-full transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-[#121212] via-[#1a1a1a] to-[#0a0a0a]' 
        : 'bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100'
    }`}>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        
        {/* Hero Section */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top duration-700">
          <div className="inline-flex items-center gap-2 mb-4">
            <CheckCircle size={48} className="text-neonGreen animate-in zoom-in duration-500" />
          </div>
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            🎉 Welcome to Alpha Arena, {user.name}!
          </h1>
          <p className={`text-xl ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Your registration is successfully completed
          </p>
        </div>

        {/* What is Alpha Arena */}
        <div className={`rounded-2xl p-8 mb-8 border animate-in fade-in slide-in-from-bottom duration-700 delay-100 ${
          theme === 'dark' 
            ? 'bg-white/5 border-white/10' 
            : 'bg-white border-gray-200 shadow-sm'
        }`}>
          <h2 className={`text-2xl font-bold mb-6 text-center ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            What you can do here
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FeatureCard
              theme={theme}
              icon={<Trophy className="text-neonGreen" size={32} />}
              title="Trading Championships"
              description="Compete with virtual capital on crypto and US stocks with real prices"
            />
            <FeatureCard
              theme={theme}
              icon={<Bot className="text-neonGreen" size={32} />}
              title="AI Trading Agent"
              description="Automatic strategies that manage sales 24/7"
            />
            <FeatureCard
              theme={theme}
              icon={<Sparkles className="text-neonGreen" size={32} />}
              title="AI Suggestions"
              description="Get suggestions on tickers and strategies based on artificial intelligence"
            />
            <FeatureCard
              theme={theme}
              icon={<MessageSquare className="text-neonGreen" size={32} />}
              title="Portfolio ChatBot"
              description="Ask 'How am I doing?' for immediate analysis of your portfolio"
            />
          </div>
        </div>

        {/* How it Works */}
        <div className={`rounded-2xl p-8 mb-8 border animate-in fade-in slide-in-from-bottom duration-700 delay-200 ${
          theme === 'dark' 
            ? 'bg-white/5 border-white/10' 
            : 'bg-white border-gray-200 shadow-sm'
        }`}>
          <h3 className={`text-xl font-bold mb-6 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            How it works
          </h3>
          <ol className="space-y-4">
            {[
              'Choose or create a championship',
              'Receive virtual capital to start',
              'Buy and sell stocks and crypto with real prices',
              'Compete to climb the leaderboard',
              'Win real prizes in premium tournaments (coming soon)'
            ].map((step, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${
                  theme === 'dark' ? 'bg-neonGreen/20 text-neonGreen' : 'bg-green-100 text-green-700'
                }`}>
                  {index + 1}
                </span>
                <span className={`pt-1 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* CTA Section */}
        <div className={`rounded-2xl p-8 border animate-in fade-in zoom-in duration-700 delay-300 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-neonGreen/10 to-neonGreen/5 border-neonGreen/20' 
            : 'bg-gradient-to-br from-green-50 to-blue-50 border-green-200'
        }`}>
          <div className="text-center mb-6">
            <h3 className={`text-2xl font-bold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Ready to start?
            </h3>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Join the free championship and start trading
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onJoinFreeChampionship}
              className={`flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 shadow-lg ${
                theme === 'dark'
                  ? 'bg-neonGreen text-black hover:bg-neonGreen/90 shadow-neonGreen/20'
                  : 'bg-black text-white hover:bg-gray-800 shadow-gray-900/20'
              }`}
            >
              <Trophy size={24} />
              Join Free Championship
              <ChevronRight size={20} />
            </button>

            <button
              onClick={onGoToDashboard}
              className={`flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 border ${
                theme === 'dark'
                  ? 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                  : 'bg-white hover:bg-gray-50 text-gray-900 border-gray-300'
              }`}
            >
              Go to Dashboard
              <ChevronRight size={20} />
            </button>
          </div>

          <p className={`text-center mt-6 text-xs ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
          }`}>
            💡 You can always change championship or create new ones from the dashboard
          </p>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8">
          <p className={`text-sm ${
            theme === 'dark' ? 'text-gray-600' : 'text-gray-500'
          }`}>
            © 2025 Alpha Arena · Trading Championships & AI Insights
          </p>
        </div>
      </div>
    </div>
  );
};

// Feature Card Component
interface FeatureCardProps {
  theme: Theme;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ theme, icon, title, description }) => {
  return (
    <div className={`p-6 rounded-xl border transition-all hover:scale-105 ${
      theme === 'dark'
        ? 'bg-white/5 border-white/10 hover:border-neonGreen/30'
        : 'bg-gray-50 border-gray-200 hover:border-green-300'
    }`}>
      <div className="mb-4">{icon}</div>
      <h4 className={`text-lg font-bold mb-2 ${
        theme === 'dark' ? 'text-white' : 'text-gray-900'
      }`}>
        {title}
      </h4>
      <p className={`text-sm ${
        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
      }`}>
        {description}
      </p>
    </div>
  );
};
