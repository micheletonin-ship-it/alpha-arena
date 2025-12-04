
import React, { useState } from 'react';
import { NavItem, Theme, User } from '../types'; // Import User type
import { LayoutDashboard, Settings, Sun, Moon, BarChart2, Menu, X, DollarSign, BrainCircuit, Activity, Bot, Radar, LineChart, User as UserIcon, Trophy, Briefcase, Shield, TrendingUp, LogOut } from 'lucide-react'; // Added Shield and LogOut icons
import { getUserColor } from '../services/utils'; // Import shared utility function

interface LayoutProps {
  children: React.ReactNode;
  theme: Theme;
  toggleTheme: () => void;
  activeTab: string;
  setActiveTab: (id: string) => void;
  userBalance?: number;
  currentUser: User | null; // Pass current user to access avatarUrl
  currentChampionshipName?: string; // UPDATED: Display current championship, now string (undefined if none)
  onLogout: () => void; // NEW: Log out handler
  // Removed onSwitchToPersonalPortfolio
}

export const Layout: React.FC<LayoutProps> = ({ children, theme, toggleTheme, activeTab, setActiveTab, userBalance = 0, currentUser, currentChampionshipName, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Base navigation items (for regular users/players)
  const playerNavItems: NavItem[] = [
    { label: 'Championship', icon: <Trophy size={24} />, id: 'championships' },
    { label: 'Portfolio', icon: <LayoutDashboard size={24} />, id: 'portfolio' },
    { label: 'Market', icon: <BarChart2 size={24} />, id: 'market' },
    { label: 'Scanner', icon: <Radar size={24} />, id: 'scanner' },
    { label: 'Activity', icon: <Activity size={24} />, id: 'activity' },
    { label: 'Statistics', icon: <LineChart size={24} />, id: 'statistics' },
    { label: 'Strategies', icon: <BrainCircuit size={24} />, id: 'strategies' },
    { label: 'Monitor', icon: <Bot size={24} />, id: 'agent-monitor' },
    { label: 'Settings', icon: <Settings size={24} />, id: 'settings' },
  ];

  // Admin navigation items (only management, no trading)
  const adminNavItems: NavItem[] = [
    { label: 'Championship', icon: <Trophy size={24} />, id: 'championships' },
    { label: 'Admin Panel', icon: <Shield size={24} />, id: 'admin-panel' },
    { label: 'Strategies', icon: <BrainCircuit size={24} />, id: 'strategies' },
    { label: 'Settings', icon: <Settings size={24} />, id: 'settings' },
  ];

  // Select appropriate navigation based on user role
  const navItems: NavItem[] = currentUser?.is_admin ? adminNavItems : playerNavItems;

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  const renderAvatar = () => {
    if (currentUser?.avatarUrl) {
      return <img src={currentUser.avatarUrl} alt="User Avatar" className="h-full w-full rounded-full object-cover" />;
    }
    const initial = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : '';
    const colors = currentUser ? getUserColor(currentUser.id) : { from: 'from-purple-500', to: 'to-indigo-500' };
    return (
      <div className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-tr ${colors.from} ${colors.to} text-white font-bold`}>
        {initial}
      </div>
    );
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'dark bg-background text-white' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* Desktop Sidebar (>768px) - Always visible */}
      <aside className={`fixed left-0 top-0 hidden h-full w-64 flex-col border-r backdrop-blur-md md:flex ${theme === 'dark' ? 'border-white/10 bg-black/40' : 'border-gray-200 bg-white/70'}`}>
        <div className="flex h-20 items-center px-8">
          <div className="flex items-center gap-2">
            <TrendingUp size={32} className="text-neonGreen drop-shadow-lg" strokeWidth={2.5} />
            <span className={`text-xl font-bold tracking-wider ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              ALPHA<span className="text-neonGreen">ARENA</span>
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                activeTab === item.id
                  ? theme === 'dark' 
                    ? 'bg-neonGreen/10 text-neonGreen shadow-[0_0_20px_rgba(57,255,20,0.1)]' 
                    : 'bg-black text-white shadow-lg'
                  : theme === 'dark'
                    ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                    : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4">
          <button
            onClick={toggleTheme}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors ${
              theme === 'dark'
                ? 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
            }`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="md:pl-64">
        {/* Header */}
        <header className={`sticky top-0 z-30 flex h-20 items-center justify-between px-6 backdrop-blur-md transition-colors ${theme === 'dark' ? 'bg-background/80' : 'bg-gray-50/80'}`}>
           <div className="flex items-center gap-4">
               {/* Mobile Menu Trigger */}
               <button 
                  onClick={() => setIsMobileMenuOpen(true)}
                  className={`md:hidden ${theme === 'dark' ? 'text-white' : 'text-gray-900'} p-2 rounded-lg hover:bg-white/10 active:scale-95 transition-all`}
               >
                  <Menu size={24} />
               </button>
               
               <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                 {currentChampionshipName ? (
                    <span className="flex items-center gap-2">
                        <Trophy size={20} className="text-yellow-500"/>
                        {currentChampionshipName}
                        {/* Removed Personal Portfolio Button */}
                    </span>
                 ) : (
                    <span>
                        {activeTab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </span>
                 )}
               </h1>
           </div>

           <div className="flex items-center gap-6">
              {/* HEADER BALANCE DISPLAY - Only show for non-admin users */}
              {!currentUser?.is_admin && (
                <div className={`hidden md:flex flex-col items-end pr-4 border-r ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
                  <span className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider">Buying Power</span>
                  <div className={`flex items-center gap-1 font-mono font-bold ${theme === 'dark' ? 'text-neonGreen' : 'text-green-700'}`}>
                    <DollarSign size={14} />
                    {userBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              )}

              <div className={`flex items-center gap-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  <div className="hidden text-xs md:block">
                    <span className="mr-2 text-neonGreen">●</span>
                    Market Status: <span className={theme === 'dark' ? 'text-white' : 'text-black'}>Open</span>
                  </div>
                  <button 
                    onClick={() => handleNavClick('settings')}
                    className={`h-10 w-10 rounded-full shadow-md hover:ring-2 hover:ring-neonGreen transition-all cursor-pointer hover:scale-105 active:scale-95`}
                    title="Open Settings"
                  >
                    {renderAvatar()}
                  </button>
              </div>
           </div>
        </header>
        
        <div className="p-6">
          {children}
        </div>
      </main>

      {/* Mobile Sidebar Overlay (Drawer) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Sidebar Panel */}
          <aside className={`relative flex w-4/5 max-w-xs flex-col border-r shadow-2xl backdrop-blur-xl animate-in slide-in-from-left duration-300 ${theme === 'dark' ? 'bg-background/95 border-white/10' : 'bg-white/95 border-gray-200'}`}>
             <div className="flex h-20 items-center justify-between px-6">
                <div className="flex items-center gap-2">
                  <TrendingUp size={32} className="text-neonGreen drop-shadow-lg" strokeWidth={2.5} />
                  <span className={`text-xl font-bold tracking-wider ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    ALPHA<span className="text-neonGreen">ARENA</span>
                  </span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className={`p-2 rounded-lg ${theme === 'dark' ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                  <X size={24} />
                </button>
             </div>

             <nav className="flex-1 space-y-2 px-4 py-4">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      activeTab === item.id
                        ? theme === 'dark' 
                          ? 'bg-neonGreen/10 text-neonGreen' 
                          : 'bg-black text-white shadow-lg'
                        : theme === 'dark'
                          ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
             </nav>
             
             {/* NEW: Log Out button (replaces Available Balance) */}
             <div className="px-4 pb-4">
                <button
                  onClick={onLogout}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl p-3 text-sm font-medium transition-colors bg-red-500/10 text-red-500 hover:bg-red-500/20`}
                >
                  <LogOut size={18} /> Sign Out
                </button>
             </div>

             <div className="p-4 border-t border-white/5">
                <button
                  onClick={toggleTheme}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors ${
                    theme === 'dark'
                      ? 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                      : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                  <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
             </div>
          </aside>
        </div>
      )}

    </div>
  );
};
