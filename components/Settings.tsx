import React, { useState, useEffect, useRef } from 'react';
import { Theme, User, AIProvider } from '../types';
import { User as UserIcon, Bell, Shield, Moon, Sun, Smartphone, LogOut, ChevronRight, Key, CheckCircle, Save, Cloud, Activity, Bot, X, Sparkles, Zap, BrainCircuit, Camera, CreditCard } from 'lucide-react'; // Added CreditCard
import { encrypt, decrypt } from '../services/security';
import { initCloud, syncKeysToCloud, checkConnection } from '../services/cloud';
import * as db from '../services/database';
import * as marketService from '../services/marketService'; // Import marketService for Alpaca test
import * as aiService from '../services/aiService'; // Import aiService for AI key test
import { APP_CREDENTIALS } from '../credentials.config';

interface SettingsProps {
  theme: Theme;
  toggleTheme: () => void;
  user: User;
  onLogout: () => void;
  onRefreshData?: () => void; // This callback updates the user object in App.tsx
}

// Helper function to convert File to Base64 Data URL
const fileToBase64DataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

// Helper Components
interface SectionProps {
  title: string;
  children: React.ReactNode;
  theme: Theme;
}

const Section: React.FC<SectionProps> = ({ title, children, theme }) => (
  <div className={`mb-6 overflow-hidden rounded-2xl border ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'}`}>
    <div className="border-b border-gray-100 px-6 py-4 dark:border-white/5">
      <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
);

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  theme: Theme;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, theme }) => (
  <button 
    onClick={onChange}
    className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none ${
      checked 
      ? (theme === 'dark' ? 'bg-neonGreen' : 'bg-black') 
      : (theme === 'dark' ? 'bg-white/20' : 'bg-gray-300')
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

export const Settings: React.FC<SettingsProps> = ({ theme, toggleTheme, user, onLogout, onRefreshData }) => {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [autoTrading, setAutoTrading] = useState(user.autoTradingEnabled || false);
  
  // ALPACA KEYS
  const [alpacaKey, setAlpacaKey] = useState(() => user.alpaca_key ? decrypt(user.alpaca_key) : '');
  const [alpacaSecret, setAlpacaSecret] = useState(() => user.alpaca_secret ? decrypt(user.alpaca_secret) : '');
  const [alpacaConnectionTestResult, setAlpacaConnectionTestResult] = useState<{success: boolean, message: string} | null>(null);
  const [isAlpacaTesting, setIsAlpacaTesting] = useState(false);


  // AI KEYS & CONFIG
  const [activeAI, setActiveAI] = useState<AIProvider>(user.active_ai_provider || 'gemini');
  const [geminiKey, setGeminiKey] = useState(() => user.gemini_key ? decrypt(user.gemini_key) : '');
  const [openaiKey, setOpenaiKey] = useState(() => user.openai_key ? decrypt(user.openai_key) : '');
  const [anthropicKey, setAnthropicKey] = useState(() => user.anthropic_key ? decrypt(user.anthropic_key) : '');

  const [geminiConnectionTestResult, setGeminiConnectionTestResult] = useState<{success: boolean, message: string} | null>(null);
  const [isGeminiTesting, setIsGeminiTesting] = useState(false);
  
  const [openaiConnectionTestResult, setOpenAIConnectionTestResult] = useState<{success: boolean, message: string} | null>(null); 
  const [isOpenAITesting, setIsOpenAITesting] = useState(false); 

  const [anthropicConnectionTestResult, setAnthropicConnectionTestResult] = useState<{success: boolean, message: string} | null>(null);
  const [isAnthropicTesting, setIsAnthropicTesting] = useState(false);

  // NEW: STRIPE KEYS
  const [stripePublicKey, setStripePublicKey] = useState(() => user.stripe_public_key ? decrypt(user.stripe_public_key) : '');
  const [stripeSecretKey, setStripeSecretKey] = useState(() => user.stripe_secret_key ? decrypt(user.stripe_secret_key) : '');
  const [isStripeTesting, setIsStripeTesting] = useState(false);
  const [stripeConnectionTestResult, setStripeConnectionTestResult] = useState<{success: boolean, message: string} | null>(null);
  const [stripePaymentsEnabled, setStripePaymentsEnabled] = useState(false); // Can be set based on presence of keys

  // Cloud & Save States
  const [isSaved, setIsSaved] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{success: boolean, message: string} | null>(null);

  // REMOVED: Edit Profile functionality for launch phase
  // Edit Profile State - Commented out for now
  // const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  // const [editName, setEditName] = useState(user.name);
  // const [editAccountType, setEditAccountType] = useState<'Basic' | 'Pro'>(user.accountType);
  // const [editIsAdmin, setEditIsAdmin] = useState(user.is_admin || false);
  // const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  // const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(user.avatarUrl || null);
  // const [removeAvatarFlag, setRemoveAvatarFlag] = useState(false);
  // const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // NEW: Helper function to generate deterministic colors based on user ID
  const getUserColor = (userId: string): { from: string, to: string } => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colorPairs = [
      { from: 'from-purple-500', to: 'to-indigo-500' },
      { from: 'from-pink-500', to: 'to-rose-500' },
      { from: 'from-blue-500', to: 'to-cyan-500' },
      { from: 'from-green-500', to: 'to-emerald-500' },
      { from: 'from-orange-500', to: 'to-amber-500' },
      { from: 'from-red-500', to: 'to-pink-500' },
      { from: 'from-violet-500', to: 'to-purple-500' },
      { from: 'from-teal-500', to: 'to-cyan-500' },
      { from: 'from-fuchsia-500', to: 'to-pink-500' },
      { from: 'from-lime-500', to: 'to-green-500' },
    ];
    
    const index = Math.abs(hash) % colorPairs.length;
    return colorPairs[index];
  };

  // Set stripePaymentsEnabled based on if keys exist
  useEffect(() => {
    setStripePaymentsEnabled(!!stripePublicKey && !!stripeSecretKey);
  }, [stripePublicKey, stripeSecretKey]);


  const handleAutoTradingToggle = async () => {
      const newValue = !autoTrading;
      setAutoTrading(newValue);
      const updatedUser = { ...user, autoTradingEnabled: newValue };
      await db.updateUser(updatedUser);
      // Ensure the parent component's user state is refreshed
      if(onRefreshData) onRefreshData(); 
  };

  const handleTestCloudConnection = async () => {
      setConnectionTestResult(null);
      setIsCloudSyncing(true);
      const result = await checkConnection();
      setIsCloudSyncing(false);
      setConnectionTestResult(result);
  };

  const handleTestAlpacaConnection = async () => {
      setAlpacaConnectionTestResult(null);
      setIsAlpacaTesting(true);
      try {
          // Changed from getAlpacaAccount to fetchMarketData for a test symbol.
          // This tests if the market data API keys are valid.
          const testSymbols = ['AAPL']; // Use a common symbol for testing
          const data = await marketService.fetchMarketData(testSymbols, alpacaKey, alpacaSecret);
          
          if (data.provider === 'Alpaca' && data.stocks.length > 0) {
              setAlpacaConnectionTestResult({ success: true, message: "Alpaca data connection successful!" });
          } else {
              setAlpacaConnectionTestResult({ success: false, message: "Alpaca data connection failed. Check your keys." });
          }
      } catch (e: any) {
          setAlpacaConnectionTestResult({ success: false, message: `Alpaca data error: ${e.message || 'Unknown error'}` });
      } finally {
          setIsAlpacaTesting(false);
      }
  };

  const handleTestGeminiConnection = async () => {
      setGeminiConnectionTestResult(null);
      setIsGeminiTesting(true);
      try {
          const result = await aiService.testGeminiConnection(geminiKey);
          setGeminiConnectionTestResult(result);
      } catch (e: any) {
          setGeminiConnectionTestResult({ success: false, message: `Gemini test error: ${e.message || JSON.stringify(e)}` });
      } finally {
          setIsGeminiTesting(false);
      }
  };

  const handleTestOpenAIConnection = async () => {
      setOpenAIConnectionTestResult(null);
      setIsOpenAITesting(true);
      try {
          const result = await aiService.testOpenAIConnection(openaiKey);
          setOpenAIConnectionTestResult(result);
      } catch (e: any) {
          setOpenAIConnectionTestResult({ success: false, message: `OpenAI test error: ${e.message || JSON.stringify(e)}` });
      } finally {
          setIsOpenAITesting(false);
      }
  };

  const handleTestAnthropicConnection = async () => {
      setAnthropicConnectionTestResult(null);
      setIsAnthropicTesting(true);
      try {
          const result = await aiService.testAnthropicConnection(anthropicKey);
          setAnthropicConnectionTestResult(result);
      } catch (e: any) {
          setAnthropicConnectionTestResult({ success: false, message: `Anthropic test error: ${e.message || JSON.stringify(e)}` });
      } finally {
          setIsAnthropicTesting(false);
      }
  };

  // NEW: Handle Stripe Connection Test
  const handleTestStripeConnection = async () => {
    setStripeConnectionTestResult(null);
    setIsStripeTesting(true);
    try {
        if (!stripePublicKey || !stripeSecretKey) {
            setStripeConnectionTestResult({ success: false, message: "Both Stripe Public and Secret keys are required." });
            return;
        }

        // Basic client-side validation for key format
        const isPublicKeyValid = stripePublicKey.startsWith('pk_');
        const isSecretKeyValid = stripeSecretKey.startsWith('sk_');

        if (isPublicKeyValid && isSecretKeyValid) {
            setStripeConnectionTestResult({ success: true, message: "Stripe keys format appears valid (simulation)." });
        } else {
            setStripeConnectionTestResult({ success: false, message: "Stripe key format invalid. Public key should start with 'pk_', Secret key with 'sk_'." });
        }
    } catch (e: any) {
        setStripeConnectionTestResult({ success: false, message: `Stripe test error: ${e.message || 'Unknown error'}` });
    } finally {
        setIsStripeTesting(false);
    }
  };

  const handleSaveAndConnect = async () => {
    setIsCloudSyncing(true);
    setAlpacaConnectionTestResult(null); // Clear previous Alpaca test result on save
    setGeminiConnectionTestResult(null); // Clear previous Gemini test result on save
    setOpenAIConnectionTestResult(null); // Clear previous OpenAI test result on save
    setAnthropicConnectionTestResult(null); // Clear previous Anthropic test result on save
    setStripeConnectionTestResult(null); // NEW: Clear previous Stripe test result on save


    // Encrypt keys
    const encAlpacaKey = encrypt(alpacaKey);
    const encAlpacaSecret = encrypt(alpacaSecret);
    const encGemini = encrypt(geminiKey);
    const encOpenAI = encrypt(openaiKey);
    const encAnthropic = encrypt(anthropicKey);
    const encStripePublic = encrypt(stripePublicKey); // NEW
    const encStripeSecret = encrypt(stripeSecretKey); // NEW

    const updatedUser: User = { 
        ...user,
        alpaca_key: encAlpacaKey,
        alpaca_secret: encAlpacaSecret,
        gemini_key: encGemini,
        openai_key: encOpenAI,
        anthropic_key: encAnthropic,
        active_ai_provider: activeAI,
        stripe_public_key: encStripePublic, // NEW
        stripe_secret_key: encStripeSecret, // NEW
    };

    // Save the updated user object to the database
    await db.updateUser(updatedUser);
    
    // Refresh the user data in the parent component (App.tsx)
    // This will cause App.tsx to re-fetch the user and update its state,
    // which in turn will update the `user` prop here, causing this component to re-render
    // with the latest saved values.
    if (onRefreshData) {
        onRefreshData();
    }
    
    setIsCloudSyncing(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // REMOVED: Edit Profile handlers for launch phase
  // const handleOpenEditProfile = () => { ... };
  // const handleAvatarSelect = async (event: React.ChangeEvent<HTMLInputElement>) => { ... };
  // const handleRemoveAvatar = () => { ... };
  // const handleSaveProfile = async () => { ... };

  const renderProfileAvatar = (size: string, isBig = false) => {
    if (user.avatarUrl) {
        return <img src={user.avatarUrl} alt="User Avatar" className={`h-full w-full rounded-full object-cover ${isBig ? 'border-4 border-background dark:border-[#121212]' : ''}`} />;
    }
    const initial = user.name ? user.name.charAt(0).toUpperCase() : '';
    const colors = getUserColor(user.id);
    return (
      <div className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-tr ${colors.from} ${colors.to} text-white font-bold ${size}`}>
        {initial}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Profile Header */}
      <div className="mb-8 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
         <div className="relative h-24 w-24">
            <div className="h-full w-full rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-3xl font-bold text-white">
                {renderProfileAvatar("text-3xl", true)}
            </div>
            <div className={`absolute bottom-0 right-0 rounded-full border-4 p-1.5 ${theme === 'dark' ? 'border-[#121212] bg-neonGreen' : 'border-gray-50 bg-green-500'}`}></div>
         </div>
         <div className="flex-1">
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{user.name}</h2>
            <p className="text-gray-500">{user.email}</p>
            <div className="mt-2 flex justify-center gap-2 sm:justify-start">
               <span className={`rounded-md px-2 py-1 text-xs font-medium ${theme === 'dark' ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                 {user.accountType} Account
               </span>
               <span className={`rounded-md px-2 py-1 text-xs font-medium ${theme === 'dark' ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                 Joined {user.joinedDate}
               </span>
            </div>
         </div>
         {/* REMOVED: Edit Profile button for launch phase */}
         {/* <button onClick={handleOpenEditProfile} ...>Edit Profile</button> */}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
         {/* Navigation Sidebar */}
         <div className="md:col-span-1">
            <nav className="space-y-1">
               {/* Simplified Nav items, can be extended to use state for active section */}
               {['Cloud Sync', 'API Configuration', 'AI Brain', 'Trading Agent', 'Stripe Integration', 'Appearance', 'Notifications'].map((item, idx) => (
                  <button 
                    key={item}
                    className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                       idx === 0
                       ? (theme === 'dark' ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-900')
                       : (theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')
                    }`}
                  >
                     <span>{item}</span>
                     {idx === 0 && <ChevronRight size={16} />}
                  </button>
               ))}
               <div className="my-4 h-px bg-gray-200 dark:bg-white/10"></div>
               <button 
                 onClick={onLogout}
                 className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10"
                >
                  <LogOut size={18} /> Sign Out
               </button>
            </nav>
         </div>

         {/* Main Settings Form */}
         <div className="md:col-span-2">
            
            {/* 1. CLOUD SYNC */}
            <Section title="Cloud Synchronization" theme={theme}>
               <div className="flex items-start gap-3 mb-4 rounded-lg p-3 border border-blue-500/20 bg-blue-500/10">
                  <Cloud size={20} className="text-blue-400 mt-0.5" />
                  <div>
                     <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                         Database Status: Connected
                     </p>
                     <p className="text-xs text-gray-500 mt-1">
                        Your data is synced globally via Supabase.
                     </p>
                  </div>
              </div>
              <div className="flex items-center justify-between">
                  <button 
                    onClick={handleTestCloudConnection}
                    disabled={isCloudSyncing}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                  >
                     <Activity size={14}/> {isCloudSyncing ? 'Testing...' : 'Check Connection'}
                  </button>
                  {connectionTestResult && (
                      <span className={`text-xs font-medium flex items-center gap-1 ${connectionTestResult.success ? 'text-green-500' : 'text-red-500'}`}>
                          {connectionTestResult.success ? <CheckCircle size={14}/> : <X size={14}/>}
                          {connectionTestResult.message}
                      </span>
                  )}
              </div>
            </Section>

            {/* 2. AI CONFIGURATION */}
            <Section title="AI Intelligence (BYOK)" theme={theme}>
                <div className="space-y-4">
                    <p className="text-xs text-gray-500">
                        Select which AI model powers the Scanner and Chatbot. Bring Your Own Key to avoid rate limits and access advanced models.
                    </p>
                    
                    {/* Active Provider Selector */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <button 
                            onClick={() => setActiveAI('gemini')}
                            className={`flex flex-col items-center p-3 rounded-xl border transition-all ${activeAI === 'gemini' 
                                ? 'border-neonGreen bg-neonGreen/10 text-white' 
                                : (theme === 'dark' ? 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-400' : 'border-gray-200 text-gray-500')
                            }`}
                        >
                            <Sparkles size={20} className="mb-2"/>
                            <span className="text-xs font-bold">Gemini</span>
                        </button>
                        <button 
                            onClick={() => setActiveAI('openai')}
                            className={`flex flex-col items-center p-3 rounded-xl border transition-all ${activeAI === 'openai' 
                                ? 'border-green-500 bg-green-700 text-white' 
                                : (theme === 'dark' ? 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-400' : 'border-gray-200 text-gray-500')
                            }`}
                        >
                            <BrainCircuit size={20} className="mb-2"/>
                            <span className="text-xs font-bold">OpenAI</span>
                        </button>
                        <button 
                            onClick={() => setActiveAI('anthropic')}
                            className={`flex flex-col items-center p-3 rounded-xl border transition-all ${activeAI === 'anthropic' 
                                ? 'border-neonGreen bg-neonGreen/10 text-white' 
                                : (theme === 'dark' ? 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-400' : 'border-gray-200 text-gray-500')
                            }`}
                        >
                            <Bot size={20} className="mb-2"/>
                            <span className="text-xs font-bold">Claude</span>
                        </button>
                    </div>

                    {/* Key Inputs */}
                    <div className="space-y-3">
                        {/* Gemini Key */}
                        <div>
                            <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Google Gemini API Key</label>
                            <input 
                                type="password" 
                                value={geminiKey}
                                onChange={e => setGeminiKey(e.target.value)}
                                placeholder="AIzaSy..."
                                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${theme === 'dark' ? 'bg-black/30 border-white/10 text-white focus:border-neonGreen' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                            />
                            <div className="flex items-center justify-between pt-2">
                                <button 
                                  onClick={handleTestGeminiConnection}
                                  disabled={isGeminiTesting || !geminiKey}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                                >
                                   <Activity size={14}/> {isGeminiTesting ? 'Testing...' : 'Test Connection'}
                                </button>
                                {geminiConnectionTestResult && (
                                    <span className={`text-xs font-medium flex items-center gap-1 ${geminiConnectionTestResult.success ? 'text-green-500' : 'text-red-500'}`}>
                                        {geminiConnectionTestResult.success ? <CheckCircle size={14}/> : <X size={14}/>}
                                        {geminiConnectionTestResult.message}
                                    </span>
                                )}
                            </div>
                        </div>
                        {/* OpenAI Key */}
                        <div>
                            <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">OpenAI API Key</label>
                            <input 
                                type="password" 
                                value={openaiKey}
                                onChange={e => setOpenaiKey(e.target.value)}
                                placeholder="sk-..."
                                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${theme === 'dark' ? 'bg-black/30 border-white/10 text-white focus:border-neonGreen' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                            />
                            <div className="flex items-center justify-between pt-2">
                                <button 
                                  onClick={handleTestOpenAIConnection}
                                  disabled={isOpenAITesting || !openaiKey}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                                >
                                   <Activity size={14}/> {isOpenAITesting ? 'Testing...' : 'Test Connection'}
                                </button>
                                {openaiConnectionTestResult && (
                                    <span className={`text-xs font-medium flex items-center gap-1 ${openaiConnectionTestResult.success ? 'text-green-500' : 'text-red-500'}`}>
                                        {openaiConnectionTestResult.success ? <CheckCircle size={14}/> : <X size={14}/>}
                                        {openaiConnectionTestResult.message}
                                    </span>
                                )}
                            </div>
                        </div>
                        {/* Anthropic Key */}
                        <div>
                            <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Anthropic API Key</label>
                            <input 
                                type="password" 
                                value={anthropicKey}
                                onChange={e => setAnthropicKey(e.target.value)}
                                placeholder="sk-ant-..."
                                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${theme === 'dark' ? 'bg-black/30 border-white/10 text-white focus:border-neonGreen' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                            />
                            <div className="flex items-center justify-between pt-2">
                                <button 
                                  onClick={handleTestAnthropicConnection}
                                  disabled={isAnthropicTesting || !anthropicKey}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                                >
                                   <Activity size={14}/> {isAnthropicTesting ? 'Testing...' : 'Test Connection'}
                                </button>
                                {anthropicConnectionTestResult && (
                                    <span className={`text-xs font-medium flex items-center gap-1 ${anthropicConnectionTestResult.success ? 'text-green-500' : 'text-red-500'}`}>
                                        {anthropicConnectionTestResult.success ? <CheckCircle size={14}/> : <X size={14}/>}
                                        {anthropicConnectionTestResult.message}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            {/* 3. API CONFIGURATION */}
            <Section title="API Configuration" theme={theme}>
                <div className="space-y-4">
                    <p className="text-xs text-gray-500">
                        Integrate with real-time market data APIs (e.g., Alpaca) for live price feeds.
                    </p>
                    
                    <div className="space-y-3">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Alpaca Key ID (Market Data)</label>
                            <input 
                                type="password" 
                                value={alpacaKey}
                                onChange={e => setAlpacaKey(e.target.value)}
                                placeholder="PK..."
                                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${theme === 'dark' ? 'bg-black/30 border-white/10 text-white focus:border-neonGreen' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Alpaca Secret Key (Market Data)</label>
                            <input 
                                type="password" 
                                value={alpacaSecret}
                                onChange={e => setAlpacaSecret(e.target.value)}
                                placeholder="SK..."
                                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${theme === 'dark' ? 'bg-black/30 border-white/10 text-white focus:border-neonGreen' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                            />
                            <div className="flex items-center justify-between pt-2">
                                <button 
                                  onClick={handleTestAlpacaConnection}
                                  disabled={isAlpacaTesting || !alpacaKey || !alpacaSecret}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                                >
                                   <Activity size={14}/> {isAlpacaTesting ? 'Testing...' : 'Test Connection'}
                                </button>
                                {alpacaConnectionTestResult && (
                                    <span className={`text-xs font-medium flex items-center gap-1 ${alpacaConnectionTestResult.success ? 'text-green-500' : 'text-red-500'}`}>
                                        {alpacaConnectionTestResult.success ? <CheckCircle size={14}/> : <X size={14}/>}
                                        {alpacaConnectionTestResult.message}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            {/* NEW: 4. STRIPE INTEGRATION (Admin Only) */}
            {user.is_admin && (
                <Section title="Stripe Integration" theme={theme}>
                    <div className="space-y-4">
                        <p className="text-xs text-gray-500">
                            Configure Stripe API keys to enable paid championship enrollments. This is a simulation.
                        </p>
                        <div className="flex items-start gap-4">
                            <CreditCard size={20} className="mt-0.5 text-blue-400"/>
                            <div className="flex-1">
                                <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Enable Payments</h4>
                                <p className="text-xs text-gray-500 mt-1">
                                    Toggle to enable/disable payment processing for championships.
                                </p>
                            </div>
                            <Toggle checked={stripePaymentsEnabled} onChange={() => setStripePaymentsEnabled(!stripePaymentsEnabled)} theme={theme} />
                        </div>
                        <div className="space-y-3 mt-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Stripe Publishable Key</label>
                                <input 
                                    type="password" 
                                    value={stripePublicKey}
                                    onChange={e => setStripePublicKey(e.target.value)}
                                    placeholder="pk_live_..."
                                    className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${theme === 'dark' ? 'bg-black/30 border-white/10 text-white focus:border-neonGreen' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Stripe Secret Key</label>
                                <input 
                                    type="password" 
                                    value={stripeSecretKey}
                                    onChange={e => setStripeSecretKey(e.target.value)}
                                    placeholder="sk_live_..."
                                    className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${theme === 'dark' ? 'bg-black/30 border-white/10 text-white focus:border-neonGreen' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                />
                                <div className="flex items-center justify-between pt-2">
                                    <button 
                                      onClick={handleTestStripeConnection}
                                      disabled={isStripeTesting || !stripePublicKey || !stripeSecretKey}
                                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                                    >
                                       <Activity size={14}/> {isStripeTesting ? 'Testing...' : 'Test Connection'}
                                    </button>
                                    {stripeConnectionTestResult && (
                                        <span className={`text-xs font-medium flex items-center gap-1 ${stripeConnectionTestResult.success ? 'text-green-500' : 'text-red-500'}`}>
                                            {stripeConnectionTestResult.success ? <CheckCircle size={14}/> : <X size={14}/>}
                                            {stripeConnectionTestResult.message}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </Section>
            )}

            {/* 5. TRADING AGENT */}
            <Section title="AI Trading Agent" theme={theme}>
                <div className="flex items-start gap-4">
                    <Bot size={20} className="mt-0.5 text-blue-400"/>
                    <div className="flex-1">
                        <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Enable Auto-Trading</h4>
                        <p className="text-xs text-gray-500 mt-1">
                            Allow the AI to automatically execute trades based on your selected strategies.
                        </p>
                    </div>
                    <Toggle checked={autoTrading} onChange={handleAutoTradingToggle} theme={theme} />
                </div>
            </Section>

            {/* 6. APPEARANCE */}
            <Section title="Appearance" theme={theme}>
                <div className="flex items-start gap-4">
                    {theme === 'dark' ? <Moon size={20} className="mt-0.5 text-purple-400" /> : <Sun size={20} className="mt-0.5 text-orange-400" />}
                    <div className="flex-1">
                        <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Dark Mode</h4>
                        <p className="text-xs text-gray-500 mt-1">
                            Switch between dark and light themes for the application interface.
                        </p>
                    </div>
                    <Toggle checked={theme === 'dark'} onChange={toggleTheme} theme={theme} />
                </div>
            </Section>

            {/* 7. NOTIFICATIONS */}
            <Section title="Notifications" theme={theme}>
                <div className="space-y-4">
                    <div className="flex items-start gap-4">
                        <Bell size={20} className="mt-0.5 text-indigo-400"/>
                        <div className="flex-1">
                            <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Push Notifications</h4>
                            <p className="text-xs text-gray-500 mt-1">
                                Receive alerts for market changes, trade executions, and account updates.
                            </p>
                        </div>
                        <Toggle checked={pushNotifications} onChange={() => setPushNotifications(!pushNotifications)} theme={theme} />
                    </div>
                    <div className="flex items-start gap-4">
                        <Smartphone size={20} className="mt-0.5 text-cyan-400"/>
                        <div className="flex-1">
                            <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Price Alerts</h4>
                            <p className="text-xs text-gray-500 mt-1">
                                Get notified when a stock reaches your target price.
                            </p>
                        </div>
                        <Toggle checked={priceAlerts} onChange={() => setPriceAlerts(!priceAlerts)} theme={theme} />
                    </div>
                </div>
            </Section>
            
            {/* Save Button */}
            <div className="sticky bottom-0 z-10 flex justify-end p-4 -mx-6 bg-background/80 dark:bg-background/80 backdrop-blur-sm border-t border-white/5">
                <button 
                    onClick={handleSaveAndConnect}
                    disabled={isCloudSyncing}
                    className={`relative flex items-center gap-2 rounded-xl px-6 py-3 font-bold text-black shadow-lg transition-all hover:scale-[1.02] ${isCloudSyncing ? 'bg-gray-500' : 'bg-neonGreen shadow-neonGreen/20'}`}
                >
                    {isCloudSyncing ? 'Saving...' : <><Save size={18} /> Save Settings</>}
                    {isSaved && (
                        <span className="absolute -top-3 -right-3 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white text-xs animate-in zoom-in">
                            <CheckCircle size={14}/>
                        </span>
                    )}
                </button>
            </div>

         </div>
      </div>

      {/* REMOVED: Edit Profile Modal for launch phase */}
    </div>
  );
};
