import React, { useState } from 'react';
import { Theme } from '../types';
import { X, Zap, Lock, Check, TrendingUp, DollarSign, Shield, Sparkles, Mail, User, MessageSquare } from 'lucide-react';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  userEmail?: string;
  userName?: string;
}

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ 
  isOpen, 
  onClose, 
  theme,
  userEmail = '',
  userName = ''
}) => {
  const [requestSent, setRequestSent] = useState(false);
  const [formData, setFormData] = useState({
    name: userName,
    email: userEmail,
    reason: ''
  });

  if (!isOpen) return null;

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate request submission (in una vera app, invieresti a backend/email)
    console.log('Pro upgrade request:', formData);
    
    // In produzione: invia email o crea ticket admin
    // await api.requestProUpgrade(formData);
    
    setRequestSent(true);
    
    // Reset dopo 3 secondi e chiudi
    setTimeout(() => {
      setRequestSent(false);
      onClose();
    }, 3000);
  };

  const features = [
    {
      icon: <TrendingUp size={20} />,
      title: 'Personal Broker Integration',
      basic: false,
      pro: true,
      description: 'Connect your Alpaca account (Paper or Live)'
    },
    {
      icon: <DollarSign size={20} />,
      title: 'Real Money Trading',
      basic: false,
      pro: true,
      description: 'Trade with your own capital via live broker'
    },
    {
      icon: <Shield size={20} />,
      title: 'Paper Trading Portfolio',
      basic: false,
      pro: true,
      description: 'Practice with personal simulated account'
    },
    {
      icon: <Sparkles size={20} />,
      title: 'Championship Access',
      basic: true,
      pro: true,
      description: 'Compete in trading competitions'
    },
    {
      icon: <Sparkles size={20} />,
      title: 'AI Scanner & Chatbot',
      basic: true,
      pro: true,
      description: 'AI-powered market analysis'
    },
    {
      icon: <Sparkles size={20} />,
      title: 'Strategy Builder',
      basic: true,
      pro: true,
      description: 'Create custom trading strategies'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border animate-in zoom-in-95 duration-200 ${
        theme === 'dark' 
          ? 'bg-background border-white/10' 
          : 'bg-white border-gray-200'
      }`}>
        
        {/* Header with Gradient */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-600 opacity-10" />
          <div className="relative p-6 border-b border-white/10">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg">
                  <Zap size={24} className="text-black" fill="currentColor" />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Upgrade to <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500">Alpha Arena Pro</span>
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Take your trading to the next level
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'hover:bg-white/10 text-gray-400 hover:text-white' 
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Hero Message */}
          <div className={`rounded-xl border p-4 ${
            theme === 'dark' 
              ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20' 
              : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
          }`}>
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'}`}>
              ⚡ Pro members can trade with their own Alpaca broker account, using real money or paper trading mode.
            </p>
          </div>

          {/* Features Comparison Table */}
          <div>
            <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Features Comparison
            </h3>
            <div className={`rounded-xl border overflow-hidden ${
              theme === 'dark' ? 'border-white/10' : 'border-gray-200'
            }`}>
              {/* Table Header */}
              <div className={`grid grid-cols-3 gap-4 p-4 font-bold text-sm border-b ${
                theme === 'dark' 
                  ? 'bg-white/5 border-white/10 text-white' 
                  : 'bg-gray-50 border-gray-200 text-gray-900'
              }`}>
                <div>Feature</div>
                <div className="text-center">Basic</div>
                <div className="text-center">Pro ⭐</div>
              </div>

              {/* Table Rows */}
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className={`grid grid-cols-3 gap-4 p-4 items-center border-b last:border-b-0 ${
                    theme === 'dark' ? 'border-white/5' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                      {feature.icon}
                    </span>
                    <div>
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {feature.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    {feature.basic ? (
                      <Check size={20} className="text-green-500" />
                    ) : (
                      <X size={20} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex justify-center">
                    {feature.pro ? (
                      <Check size={20} className="text-yellow-500" />
                    ) : (
                      <X size={20} className="text-gray-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Request Form or Success Message */}
          {!requestSent ? (
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <h3 className={`text-lg font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Request Pro Access
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Fill out the form below and our admin will review your request.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">
                  <User size={12} className="inline mr-1" />
                  Your Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="John Doe"
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
                    theme === 'dark' 
                      ? 'bg-black/30 border-white/10 text-white focus:border-yellow-500' 
                      : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-yellow-500'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">
                  <Mail size={12} className="inline mr-1" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  placeholder="john@example.com"
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
                    theme === 'dark' 
                      ? 'bg-black/30 border-white/10 text-white focus:border-yellow-500' 
                      : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-yellow-500'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">
                  <MessageSquare size={12} className="inline mr-1" />
                  Why do you want Pro? (Optional)
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  placeholder="Tell us why you'd like to upgrade..."
                  rows={3}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors resize-none ${
                    theme === 'dark' 
                      ? 'bg-black/30 border-white/10 text-white focus:border-yellow-500' 
                      : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-yellow-500'
                  }`}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold text-black bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
                >
                  <Zap size={18} fill="currentColor" />
                  Request Pro Access
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-white/10 text-white hover:bg-white/20'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="py-8 text-center animate-in zoom-in duration-200">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 mx-auto mb-4">
                <Check size={32} className="text-green-500" />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Request Sent! 🎉
              </h3>
              <p className="text-sm text-gray-500">
                Our admin team will review your request and get back to you soon.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
