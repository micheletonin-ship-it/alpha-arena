
import React, { useState } from 'react';
import { Theme } from '../types';
import { Mail, Lock, ArrowRight, User as UserIcon, AlertCircle, CheckCircle, TrendingUp, Trophy, Bot, Sparkles, MessageSquare } from 'lucide-react';
import { signUpWithEmail, signInWithEmail, resendConfirmationEmail, requestPasswordReset } from '../services/cloud';
import { getUserByEmail } from '../services/database';

interface LoginProps {
  onLogin: (email: string, name: string) => void;
  theme: Theme;
  isLoading?: boolean;
  fromLanding?: boolean;
}

export const Login: React.FC<LoginProps> = ({ onLogin, theme, isLoading: externalLoading = false, fromLanding = false }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [isDuplicateEmail, setIsDuplicateEmail] = useState(false);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isLegacyUser, setIsLegacyUser] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsDuplicateEmail(false);
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const result = await signInWithEmail(email, password);
        if (result.success && result.user) {
          const displayName = result.user.user_metadata?.display_name || email.split('@')[0];
          const finalName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
          onLogin(email, finalName);
        } else {
          const resultErrorType = (result as any).errorType;
          
          // Check if it's a legacy user (exists in DB but not in Supabase Auth)
          if (resultErrorType === 'invalid_credentials' && email) {
            console.log('[Login] Checking for legacy user:', email);
            const legacyUser = await getUserByEmail(email);
            
            if (legacyUser) {
              console.log('[Login] Legacy user detected:', legacyUser.name);
              setIsLegacyUser(true);
              setError('Account da migrare. Il tuo account esiste ma deve essere aggiornato al nuovo sistema di autenticazione.');
              setErrorType('legacy_user');
            } else {
              // Normal invalid credentials
              setError(result.message || 'Login fallito');
              setErrorType(resultErrorType);
            }
          } else {
            setError(result.message || 'Login fallito');
            setErrorType(resultErrorType);
          }
        }
      } else {
        // Sign up
        const displayName = name || email.split('@')[0];
        const finalName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
        
        const result = await signUpWithEmail(email, password, finalName);
        if (result.success) {
          if (result.requiresConfirmation) {
            setAwaitingConfirmation(true);
            setSuccessMessage(result.message || 'Controlla la tua email per confermare la registrazione!');
          } else {
            // Auto-login if no confirmation required
            onLogin(email, finalName);
          }
        } else {
          setError(result.message || 'Registrazione fallita');
          if ((result as any).isDuplicate) {
            setIsDuplicateEmail(true);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Si è verificato un errore');
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setError(null);
    setLoading(true);
    
    const result = await resendConfirmationEmail(email);
    if (result.success) {
      setSuccessMessage(result.message || 'Email inviata!');
    } else {
      setError(result.message || 'Errore invio email');
    }
    
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Inserisci la tua email per reimpostare la password');
      return;
    }
    
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    
    const result = await requestPasswordReset(email);
    if (result.success) {
      setSuccessMessage(result.message);
      setShowForgotPassword(false);
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  const isFormLoading = loading || externalLoading;

  return (
    <div className={`flex min-h-screen w-full flex-col items-center justify-center transition-colors duration-300 ${theme === 'dark' ? 'bg-gradient-to-br from-[#121212] via-[#1a1a1a] to-[#0a0a0a]' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100'}`}>
      
      {/* Mobile Logo - Always visible on mobile */}
      <div className="w-full px-6 pt-8 pb-4 md:hidden">
        <div className="flex items-center justify-center gap-2 animate-in fade-in duration-300">
          <TrendingUp size={32} className="text-neonGreen drop-shadow-lg" strokeWidth={2.5} />
          <span className={`text-2xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            ALPHA<span className="text-neonGreen">ARENA</span>
          </span>
        </div>
      </div>

      {/* Mobile Hero Section - Only visible on mobile when NOT coming from landing */}
      {!fromLanding && (
      <div className="w-full max-w-md px-4 mb-8 md:hidden animate-in fade-in slide-in-from-top duration-700">
        <div className="text-center space-y-6">
          {/* Logo & Tagline */}
          <div className="animate-in fade-in slide-in-from-top duration-500">
            <div className="flex items-center justify-center gap-2 mb-3">
              <TrendingUp size={48} className="text-neonGreen drop-shadow-lg" strokeWidth={2.5} />
              <span className={`text-3xl font-bold tracking-wider ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                ALPHA<span className="text-neonGreen">ARENA</span>
              </span>
            </div>
            <p className={`text-lg font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Think Faster.<br/>
              Trade Smarter.<br/>
              Win Bigger.
            </p>
            <p className={`text-sm mt-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
              Campionati di trading su Crypto & Azioni USA<br/>
              con capitale virtuale, prezzi reali e AI integrata.
            </p>
            <div className={`mt-6 space-y-3 text-left ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Trophy size={16} className="text-neonGreen flex-shrink-0" />
                  <span>Campionati multipli</span>
                </div>
                <p className={`text-xs mt-1 ml-6 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                  Gratis o con buy-in e montepremi reale.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Bot size={16} className="text-neonGreen flex-shrink-0" />
                  <span>Strategie automatiche</span>
                </div>
                <p className={`text-xs mt-1 ml-6 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                  Il sistema opera automaticamente sulla strategia scelta.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles size={16} className="text-neonGreen flex-shrink-0" />
                  <span>AI Suggestions</span>
                </div>
                <p className={`text-xs mt-1 ml-6 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                  Strategia AI consigliata per ogni titolo.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquare size={16} className="text-neonGreen flex-shrink-0" />
                  <span>ChatBot portafoglio</span>
                </div>
                <p className={`text-xs mt-1 ml-6 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                  Chiedi <em>"Come sto andando?"</em> per una risposta immediata.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Main Login Card */}
      <div className="flex w-full max-w-5xl overflow-hidden rounded-3xl shadow-2xl mx-4 animate-in fade-in zoom-in duration-500 delay-150">
        
        {/* Left Side - Visuals */}
        <div className={`hidden w-1/2 flex-col justify-between p-12 md:flex ${theme === 'dark' ? 'bg-[#1E1E1E]' : 'bg-blue-600'}`}>
           <div>
              <div className="flex items-center gap-2">
                <TrendingUp size={32} className="text-neonGreen drop-shadow-lg" strokeWidth={2.5} />
                <span className={`text-xl font-bold tracking-wider ${theme === 'dark' ? 'text-white' : 'text-white'}`}>
                  ALPHA<span className="text-neonGreen">ARENA</span>
                </span>
              </div>
              <div className="mt-16 space-y-6">
                <h1 className="text-4xl font-bold leading-tight text-white">
                  Think Faster.<br/>
                  Trade Smarter.<br/>
                  Win Bigger.
                </h1>
                <p className="text-lg text-gray-300">
                  Campionati di trading su Crypto & Azioni USA<br/>
                  con capitale virtuale, prezzi reali e AI integrata.
                </p>
                <div className="space-y-4 text-white/90">
                  <div>
                    <div className="flex items-center gap-3 font-medium">
                      <Trophy size={20} className="text-neonGreen flex-shrink-0" />
                      <span>Campionati multipli</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1 ml-8">
                      Gratis o con buy-in e montepremi reale.
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 font-medium">
                      <Bot size={20} className="text-neonGreen flex-shrink-0" />
                      <span>Strategie automatiche</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1 ml-8">
                      Il sistema opera automaticamente sulla strategia scelta.
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 font-medium">
                      <Sparkles size={20} className="text-neonGreen flex-shrink-0" />
                      <span>AI Suggestions</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1 ml-8">
                      Strategia AI consigliata per ogni titolo.
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 font-medium">
                      <MessageSquare size={20} className="text-neonGreen flex-shrink-0" />
                      <span>ChatBot portafoglio</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1 ml-8">
                      Chiedi <em>"Come sto andando?"</em> per una risposta immediata.
                    </p>
                  </div>
                </div>
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

              {isLogin && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="rounded border-gray-300 text-neonGreen focus:ring-neonGreen" />
                    <span className="text-xs text-gray-500">Remember me</span>
                  </label>
                  <button 
                    type="button" 
                    onClick={handleForgotPassword}
                    disabled={isFormLoading}
                    className="text-xs font-medium text-neonGreen hover:underline disabled:opacity-50"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Error/Success Messages */}
              {error && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                  
                  {/* Contextual help based on error type */}
                  {errorType === 'legacy_user' && isLegacyUser && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 text-xs text-yellow-400">
                        <AlertCircle size={14} />
                        <span>Clicca qui sotto per migrare il tuo account e impostare una nuova password. Riceverai un'email con le istruzioni.</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        disabled={isFormLoading}
                        className="w-full text-center text-sm text-black bg-neonGreen hover:bg-neonGreen/90 py-3 rounded-lg font-bold disabled:opacity-50 transition-all"
                      >
                        🔄 Migra Account e Reimposta Password
                      </button>
                    </div>
                  )}
                  
                  {errorType === 'email_not_confirmed' && email && (
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={isFormLoading}
                      className="w-full text-center text-xs text-neonGreen hover:underline font-semibold disabled:opacity-50"
                    >
                      📧 Invia di nuovo email di conferma
                    </button>
                  )}
                  
                  {errorType === 'invalid_credentials' && isLogin && !isLegacyUser && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={isFormLoading}
                      className="w-full text-center text-xs text-neonGreen hover:underline font-semibold disabled:opacity-50"
                    >
                      🔑 Reimposta la password
                    </button>
                  )}
                  
                  {isDuplicateEmail && (
                    <button
                      type="button"
                      onClick={() => setIsLogin(true)}
                      className="w-full text-center text-xs text-neonGreen hover:underline font-semibold"
                    >
                      ← Vai al Login
                    </button>
                  )}
                </div>
              )}
              
              {successMessage && (
                <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400">
                  <CheckCircle size={16} />
                  <span>{successMessage}</span>
                </div>
              )}

              {awaitingConfirmation && (
                <div className="text-center space-y-2">
                  <button 
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={isFormLoading}
                    className="text-xs text-neonGreen hover:underline disabled:opacity-50"
                  >
                    Non hai ricevuto l'email? Invia di nuovo
                  </button>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isFormLoading}
                className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-black transition-all hover:scale-[1.02] disabled:opacity-70 ${isFormLoading ? 'cursor-not-allowed bg-gray-500' : 'bg-neonGreen shadow-lg shadow-neonGreen/20'}`}
              >
                {isFormLoading ? 'Connecting to Cloud...' : (isLogin ? 'Sign In' : 'Create Account')}
                {!isFormLoading && <ArrowRight size={20} />}
              </button>
           </form>

           <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">
                Connected to AlphaArena Cloud.
              </p>
           </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center px-4 pb-6">
        <p className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'}`}>
          © 2025 Alpha Arena · Trading Championships & AI Insights
        </p>
        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-700' : 'text-gray-600'}`}>
          Created by Michele Tonin
        </p>
      </div>
    </div>
  );
};
