
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Theme, User, Championship, Holding, Transaction, Stock, LeaderboardEntry, PrizePoolInfo } from '../types';
import * as db from '../services/database';
import { Trophy, Plus, CheckCircle, Clock, Calendar, DollarSign, Users, X, AlertTriangle, Play, Pause, Save, Trash2, ExternalLink, Briefcase, TrendingUp, TrendingDown, CreditCard, Loader2, Award } from 'lucide-react'; // Added CreditCard, Loader2, Award
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { processPaymentWithMockBackend } from '../services/stripePaymentService'; // NEW: Import mock backend

// Make sure to call loadStripe outside of a component’s render to avoid recreating the Stripe object on every render.
// The Elements component can handle Promise<Stripe | null> directly.
const getStripePromise = (publicKey: string | null) => {
    if (!publicKey) return null;
    return loadStripe(publicKey);
};


interface ChampionshipsProps {
  theme: Theme;
  currentUser: User;
  onSetChampionshipContext: (championship: Championship | null) => Promise<void>; // Fix: Changed to Promise<void>
  currentChampionshipId?: string | null;
  marketData: Stock[]; // NEW: Market data for leaderboard calculation
  onNavigateToSettings: () => void; // Fix: Added onNavigateToSettings prop
}

interface ChampionshipCardProps {
    championship: Championship;
    currentUser: User;
    theme: Theme;
    onViewLeaderboard: (champ: Championship) => void;
    onJoin: (champ: Championship) => void;
    onPayEnrollment: (champ: Championship) => void; // NEW
    onSetContext: (champ: Championship | null) => Promise<void>;
    onStart: (champ: Championship) => void;
    onEnd: (champ: Championship) => void;
    onDelete: (champ: Championship) => void; // NEW: Add onDelete prop
    onAdminLeave: (champ: Championship) => void; // NEW: Add onAdminLeave prop
    currentChampionshipId?: string | null;
    isParticipating: boolean;
    prizePoolInfo?: PrizePoolInfo | null; // NEW: Prize pool information
}

const ChampionshipCard: React.FC<ChampionshipCardProps> = ({ 
    championship, 
    currentUser, 
    theme, 
    onViewLeaderboard, 
    onJoin, 
    onPayEnrollment, // NEW
    onSetContext, 
    onStart, 
    onEnd, 
    onDelete,
    onAdminLeave, // NEW
    currentChampionshipId,
    isParticipating,
    prizePoolInfo // NEW: Prize pool information
}) => {
    const isOwner = currentUser.email === championship.admin_user_id;
    const isActiveContext = currentChampionshipId === championship.id;

    // console.log(`[ChampCard] ${championship.name}: Status=${championship.status}, isParticipating=${isParticipating}, isActiveContext=${isActiveContext}`);

    const statusBadge = useMemo(() => {
        let bgColor = '';
        let textColor = '';
        let icon = null;
        let text = '';

        switch (championship.status) {
            case 'pending':
                bgColor = 'bg-blue-500/20';
                textColor = 'text-blue-400';
                icon = <Clock size={12}/>;
                text = 'In Sospeso';
                break;
            case 'active':
                bgColor = 'bg-neonGreen/20';
                textColor = 'text-neonGreen';
                icon = <Play size={12}/>;
                text = 'Attivo';
                break;
            case 'finished':
                bgColor = 'bg-purple-500/20';
                textColor = 'text-purple-400';
                icon = <CheckCircle size={12}/>;
                text = 'Terminato';
                break;
            default:
                bgColor = 'bg-gray-500/20';
                textColor = 'text-gray-400';
                text = 'Sconosciuto';
        }
        return (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${bgColor} ${textColor}`}>
                {icon} {text}
            </span>
        );
    }, [championship.status]);

    const startDate = new Date(championship.start_date).toLocaleDateString();
    const endDate = new Date(championship.end_date).toLocaleDateString();

    const renderActionButton = () => {
        // PRIORITY CHECK: Block admin from portfolio access if already participating
        if (currentUser.is_admin && isParticipating) {
            return (
                <div className="space-y-2">
                    <div className={`w-full py-3 px-4 rounded-xl text-center ${theme === 'dark' ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-orange-50 border border-orange-200'}`}>
                        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-orange-300' : 'text-orange-700'}`}>
                            ⚠️ Sei iscritto come admin ma non puoi accedere al portfolio.
                        </p>
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-orange-400/70' : 'text-orange-600/70'}`}>
                            Gli amministratori possono solo gestire i campionati.
                        </p>
                    </div>
                    <button 
                        onClick={() => onAdminLeave(championship)}
                        className={`w-full py-2 rounded-xl text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                    >
                        Rimuovi Iscrizione Admin
                    </button>
                </div>
            );
        }
        
        // ADMIN BLOCK: Admins cannot participate in championships (new joins)
        if (currentUser.is_admin && (championship.status === 'pending' || championship.status === 'active') && !isParticipating) {
            return (
                <div className={`w-full py-3 px-4 rounded-xl text-center ${theme === 'dark' ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                        👨‍💼 Come amministratore, non puoi partecipare ai campionati.
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-blue-400/70' : 'text-blue-600/70'}`}>
                        Gestisci questo campionato dall'Admin Panel.
                    </p>
                </div>
            );
        }
        
        // Option 1: User can JOIN (not participating, and not finished)
        if ((championship.status === 'pending' || championship.status === 'active') && !isParticipating) {
            if (championship.enrollment_fee && championship.enrollment_fee > 0) {
                return (
                    <button 
                        onClick={() => onPayEnrollment(championship)} // NEW: Trigger payment flow
                        className={`w-full py-3 rounded-xl font-bold transition-all ${theme === 'dark' ? 'bg-neonGreen text-black hover:bg-neonGreen/90' : 'bg-black text-white hover:bg-gray-800'}`}
                    >
                        <CreditCard size={16} className="inline-block mr-2"/> Paga e Iscriviti
                    </button>
                );
            } else {
                return (
                    <button 
                        onClick={() => onJoin(championship)}
                        className={`w-full py-3 rounded-xl font-bold transition-all ${theme === 'dark' ? 'bg-neonGreen text-black hover:bg-neonGreen/90' : 'bg-black text-white hover:bg-gray-800'}`}
                    >
                        Iscriviti al Campionato
                    </button>
                );
            }
        }
        // Option 2: User can ENTER their PORTFOLIO (participating, active, and not currently in context)
        else if (championship.status === 'active' && isParticipating && !isActiveContext) {
            return (
                <button 
                    onClick={() => onSetContext(championship)}
                    className={`w-full py-3 rounded-xl font-bold transition-all ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                >
                    <Briefcase size={16} className="inline-block mr-1"/> Entra nel Portfolio
                </button>
            );
        } 
        // Option 3: User can VIEW LEADERBOARD (always if not pending, or if participating)
        else if (championship.status !== 'pending' || isParticipating) {
            return (
                <button 
                    onClick={() => onViewLeaderboard(championship)}
                    className={`w-full py-3 rounded-xl font-bold transition-all ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
                >
                    Visualizza Classifica
                </button>
            );
        }
        return null; // No action button needed (e.g. pending and already in context, or pending and not participating admin can start etc.)
    };


    return (
        <div className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-300 ${
            isActiveContext
            ? (theme === 'dark' ? 'border-neonGreen bg-neonGreen/5 shadow-[0_0_20px_rgba(57,255,20,0.1)]' : 'border-black bg-gray-50 shadow-lg') 
            : (theme === 'dark' ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-gray-200 bg-white hover:border-gray-300')
        }`}>
            {isActiveContext && (
                 <div className={`absolute -top-3 left-6 px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${theme === 'dark' ? 'bg-neonGreen text-black' : 'bg-black text-white'}`}>
                    Contesto Attuale
                </div>
            )}
            <div className="flex justify-between items-start mb-4">
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{championship.name}</h3>
                {statusBadge}
            </div>
            <p className="text-sm text-gray-500 mb-4 flex-1">{championship.description}</p>

            <div className="space-y-2 text-sm mb-4">
                {/* Data Inizio */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-gray-400">
                        <Calendar size={16}/> Data Inizio:
                    </div>
                    <div className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{startDate}</div>
                </div>

                {/* Data Fine */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-gray-400">
                        <Calendar size={16}/> Data Fine:
                    </div>
                    <div className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{endDate}</div>
                </div>

                {/* Cash Iniziale */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-gray-400">
                        <DollarSign size={16}/> Cash Iniziale:
                    </div>
                    <div className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>${championship.starting_cash.toLocaleString()}</div>
                </div>
                
                {/* Quota Iscrizione */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-gray-400">
                        <CreditCard size={16}/> Quota Iscrizione:
                    </div>
                    <div className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {championship.enrollment_fee && championship.enrollment_fee > 0 
                            ? `$${championship.enrollment_fee.toLocaleString()}` 
                            : 'Gratuito'}
                    </div>
                </div>

                {/* Amministratore */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-gray-400">
                        <Users size={16}/> Amministratore:
                    </div>
                    <div className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} truncate max-w-[180px]`}>{championship.admin_user_id}</div>
                </div>
            </div>

            {/* NEW: Prize Pool Display */}
            {prizePoolInfo && championship.enrollment_fee && championship.enrollment_fee > 0 && (
                <div className={`mt-4 p-4 rounded-xl border ${theme === 'dark' ? 'bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20' : 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Award size={16} className="text-purple-400"/>
                            <span className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>
                                Montepremi
                            </span>
                        </div>
                        <span className={`text-lg font-bold ${theme === 'dark' ? 'text-neonGreen' : 'text-green-600'}`}>
                            ${prizePoolInfo.prize_pool.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                    </div>
                    
                    <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Partecipanti:</span>
                            <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {prizePoolInfo.participants_count}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Commissione:</span>
                            <span className={`font-semibold ${theme === 'dark' ? 'text-orange-300' : 'text-orange-600'}`}>
                                {(prizePoolInfo.rake_percentage * 100).toFixed(0)}% (${prizePoolInfo.platform_commission.toFixed(0)})
                            </span>
                        </div>
                        
                        {prizePoolInfo.prize_distribution.length > 0 && (
                            <div className={`mt-3 pt-3 border-t ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
                                <div className="text-gray-400 mb-2 font-medium">Top 3 Premi:</div>
                                {prizePoolInfo.prize_distribution.slice(0, 3).map((prize, idx) => (
                                    <div key={prize.rank} className="flex justify-between items-center py-0.5">
                                        <span className="flex items-center gap-1.5">
                                            <span className={`text-xs ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : 'text-orange-600'}`}>
                                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                                            </span>
                                            <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                                                {prize.rank}°
                                            </span>
                                        </span>
                                        <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                            ${prize.amount.toFixed(0)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-white/10 flex flex-col gap-2">
                {renderActionButton()}

                {currentUser.is_admin && isOwner && (
                    <div className="flex justify-between gap-2 mt-2">
                        {championship.status === 'pending' && (
                            <button 
                                onClick={() => onStart(championship)}
                                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                            >
                                <Play size={16} className="inline-block mr-1"/> Avvia
                            </button>
                        )}
                        {championship.status === 'active' && (
                            <button 
                                onClick={() => onEnd(championship)}
                                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
                            >
                                <Pause size={16} className="inline-block mr-1"/> Termina
                            </button>
                        )}
                        {/* NEW: Delete Button for Admin/Owner, only if not active */}
                        {championship.status !== 'active' && ( 
                            <button 
                                onClick={() => onDelete(championship)}
                                className={`py-2 px-3 rounded-xl text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                            >
                                <Trash2 size={16}/>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Modals ---

interface CreateChampionshipModalProps {
    isOpen: boolean;
    onClose: () => void;
    // Fix: Correct the type definition for `onCreate` to match the data structure passed by the modal.
    onCreate: (data: Omit<Championship, 'id' | 'created_at' | 'status' | 'admin_user_id'>) => Promise<void>;
    theme: Theme;
    isLoading: boolean;
    error: string | null;
}

const CreateChampionshipModal: React.FC<CreateChampionshipModalProps> = ({ isOpen, onClose, onCreate, theme, isLoading, error }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [startingCash, setStartingCash] = useState(100000);
    const [enrollmentFee, setEnrollmentFee] = useState(0);
    
    // TICKER WHITELIST STATE
    const [tickerRestrictionEnabled, setTickerRestrictionEnabled] = useState(false);
    const [allowedTickers, setAllowedTickers] = useState<string[]>([]);
    const [tickerInput, setTickerInput] = useState('');

    // NEW: Prize pool simulator calculations
    const calculateSimulatedPrizePool = useCallback((participants: number, fee: number) => {
        if (fee <= 0 || participants < 1) return null;
        
        const totalEntry = participants * fee;
        
        // Progressive rake calculation (same as backend)
        let rakePercentage = 0.05; // 5% base
        if (participants >= 100) rakePercentage = 0.20;
        else if (participants >= 50) rakePercentage = 0.15;
        else if (participants >= 20) rakePercentage = 0.10;
        
        const platformCommission = totalEntry * rakePercentage;
        const prizePool = totalEntry - platformCommission;
        
        // Prize distribution (same as backend)
        const distribution = [];
        if (participants >= 10) {
            distribution.push({ rank: 1, percentage: 0.50, amount: prizePool * 0.50 });
            distribution.push({ rank: 2, percentage: 0.30, amount: prizePool * 0.30 });
            distribution.push({ rank: 3, percentage: 0.20, amount: prizePool * 0.20 });
        } else if (participants >= 5) {
            distribution.push({ rank: 1, percentage: 0.60, amount: prizePool * 0.60 });
            distribution.push({ rank: 2, percentage: 0.40, amount: prizePool * 0.40 });
        } else if (participants >= 3) {
            distribution.push({ rank: 1, percentage: 1.0, amount: prizePool });
        }
        
        return {
            totalEntry,
            prizePool,
            platformCommission,
            rakePercentage,
            participants,
            distribution
        };
    }, []);

    // TICKER WHITELIST PRESETS
    const TICKER_PRESETS: { [key: string]: string[] } = {
        tech_giants: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META', 'NVDA', 'TSLA', 'NFLX', 'AMD', 'INTC'],
        sp500_top10: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'BRK.B', 'TSLA', 'LLY', 'UNH'],
        dow_jones: ['AAPL', 'MSFT', 'UNH', 'GS', 'HD', 'MCD', 'CAT', 'V', 'AMGN', 'BA'],
        crypto: ['BTC-USD', 'ETH-USD', 'BNB-USD', 'SOL-USD', 'ADA-USD', 'XRP-USD', 'DOGE-USD', 'DOT-USD', 'MATIC-USD', 'AVAX-USD'],
    };

    const handleAddTicker = () => {
        const ticker = tickerInput.trim().toUpperCase();
        if (!ticker) return;
        if (allowedTickers.includes(ticker)) {
            alert(`${ticker} è già nella lista`);
            return;
        }
        if (allowedTickers.length >= 100) {
            alert('Massimo 100 ticker consentiti');
            return;
        }
        setAllowedTickers([...allowedTickers, ticker]);
        setTickerInput('');
    };

    const handleRemoveTicker = (ticker: string) => {
        setAllowedTickers(allowedTickers.filter(t => t !== ticker));
    };

    const handleLoadPreset = (presetKey: string) => {
        const preset = TICKER_PRESETS[presetKey];
        if (!preset) return;
        setAllowedTickers(preset);
        setTickerRestrictionEnabled(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !startDate || !endDate || !startingCash) {
            alert("Compila tutti i campi richiesti.");
            return;
        }
        if (new Date(startDate) >= new Date(endDate)) {
            alert("La data di fine deve essere successiva alla data di inizio.");
            return;
        }
        if (tickerRestrictionEnabled && allowedTickers.length < 10) {
            alert("Devi specificare almeno 10 ticker se abiliti la whitelist.");
            return;
        }
        await onCreate({ 
            name, 
            description, 
            start_date: startDate, 
            end_date: endDate, 
            starting_cash: startingCash, 
            enrollment_fee: enrollmentFee,
            ticker_restriction_enabled: tickerRestrictionEnabled,
            allowed_tickers: tickerRestrictionEnabled ? allowedTickers : undefined,
        });
    };

    if (!isOpen) return null;

    // Get today's date for min attribute
    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`w-full max-w-md overflow-hidden rounded-2xl shadow-2xl ${theme === 'dark' ? 'bg-[#1E1E1E] border border-white/10' : 'bg-white border-gray-200'}`}>
                <div className={`flex items-center justify-between border-b px-6 py-4 ${theme === 'dark' ? 'border-white/10' : 'border-gray-100'}`}>
                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Crea Nuovo Campionato</h3>
                    <button onClick={onClose} className={`rounded-full p-1 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className={`mb-1 block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Nome Campionato</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                            className={`w-full rounded-xl border px-4 py-2 text-base outline-none ${theme === 'dark' ? 'bg-black/30 border-white/10 text-white focus:border-neonGreen/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'}`}
                        />
                    </div>
                    <div>
                        <label className={`mb-1 block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Descrizione</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                            className={`w-full rounded-xl border px-4 py-2 text-base outline-none ${theme === 'dark' ? 'bg-black/30 border-white/10 text-white focus:border-neonGreen/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'}`}
                        ></textarea>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`mb-1 block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Data Inizio</label>
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required min={today}
                                className={`w-full rounded-xl border px-4 py-2 text-base outline-none ${theme === 'dark' ? 'bg-black/30 border-white/10 text-white focus:border-neonGreen/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'}`}
                            />
                        </div>
                        <div>
                            <label className={`mb-1 block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Data Fine</label>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required min={startDate || today}
                                className={`w-full rounded-xl border px-4 py-2 text-base outline-none ${theme === 'dark' ? 'bg-black/30 border-white/10 text-white focus:border-neonGreen/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'}`}
                            />
                        </div>
                    </div>
                    <div>
                        <label className={`mb-1 block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Cash di Partenza ($)</label>
                        <input type="number" value={startingCash} onChange={(e) => setStartingCash(parseFloat(e.target.value))} required min={1000} step={1000}
                            className={`w-full rounded-xl border px-4 py-2 text-base outline-none ${theme === 'dark' ? 'bg-black/30 border-white/10 text-white focus:border-neonGreen/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'}`}
                        />
                    </div>
                    {/* Enrollment Fee Input */}
                    <div>
                        <label className={`mb-1 block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Quota Iscrizione ($)</label>
                        <input type="number" value={enrollmentFee} onChange={(e) => setEnrollmentFee(parseFloat(e.target.value))} required min={0} step={1}
                            className={`w-full rounded-xl border px-4 py-2 text-base outline-none ${theme === 'dark' ? 'bg-black/30 border-white/10 text-white focus:border-neonGreen/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'}`}
                        />
                    </div>

                    {/* TICKER WHITELIST UI */}
                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
                        <div className="flex items-center justify-between mb-3">
                            <label className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                                🎯 Limita Ticker Consentiti
                            </label>
                            <input 
                                type="checkbox" 
                                checked={tickerRestrictionEnabled} 
                                onChange={(e) => setTickerRestrictionEnabled(e.target.checked)}
                                className="w-5 h-5 rounded cursor-pointer"
                            />
                        </div>
                        
                        {tickerRestrictionEnabled && (
                            <div className="space-y-3">
                                <div className="text-xs text-gray-400">
                                    Quick Presets:
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries({
                                        'Tech Giants': 'tech_giants',
                                        'S&P 500 Top 10': 'sp500_top10',
                                        'Dow Jones': 'dow_jones',
                                        'Crypto': 'crypto'
                                    }).map(([label, key]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => handleLoadPreset(key)}
                                            className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white hover:bg-gray-100 text-gray-900'}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                
                                <div>
                                    <label className={`block text-xs font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Aggiungi Ticker ({allowedTickers.length}/100)
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={tickerInput}
                                            onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTicker())}
                                            placeholder="es. AAPL"
                                            className={`flex-1 rounded-lg border px-3 py-2 text-sm outline-none ${theme === 'dark' ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddTicker}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium ${theme === 'dark' ? 'bg-neonGreen text-black hover:bg-neonGreen/90' : 'bg-black text-white hover:bg-gray-800'}`}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                
                                {allowedTickers.length > 0 && (
                                    <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-black/20' : 'bg-white/50'}`}>
                                        <div className="flex flex-wrap gap-2">
                                            {allowedTickers.map(ticker => (
                                                <span
                                                    key={ticker}
                                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${theme === 'dark' ? 'bg-neonGreen/20 text-neonGreen' : 'bg-green-100 text-green-700'}`}
                                                >
                                                    {ticker}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveTicker(ticker)}
                                                        className="hover:text-red-500"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                <p className="text-xs text-gray-400">
                                    ℹ️ Minimo 10 ticker richiesti quando abilitato
                                </p>
                            </div>
                        )}
                    </div>

                    {/* NEW: Prize Pool Simulator */}
                    {enrollmentFee > 0 && (
                        <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20' : 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200'}`}>
                            <div className="flex items-center gap-2 mb-3">
                                <Award size={16} className="text-purple-400"/>
                                <h4 className={`text-sm font-bold ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>
                                    Simulatore Montepremi
                                </h4>
                            </div>
                            
                            <div className="space-y-3">
                                {[10, 30, 100].map(participantCount => {
                                    const simulation = calculateSimulatedPrizePool(participantCount, enrollmentFee);
                                    if (!simulation) return null;
                                    
                                    return (
                                        <div key={participantCount} className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-black/20' : 'bg-white/50'}`}>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    {participantCount} Partecipanti
                                                </span>
                                                <span className={`text-sm font-bold ${theme === 'dark' ? 'text-neonGreen' : 'text-green-600'}`}>
                                                    ${simulation.prizePool.toFixed(0)}
                                                </span>
                                            </div>
                                            <div className="text-xs space-y-1">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400">Totale incassi:</span>
                                                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                                                        ${simulation.totalEntry.toFixed(0)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-400">Commissione:</span>
                                                    <span className={`${theme === 'dark' ? 'text-orange-300' : 'text-orange-600'}`}>
                                                        {(simulation.rakePercentage * 100).toFixed(0)}% (${simulation.platformCommission.toFixed(0)})
                                                    </span>
                                                </div>
                                                {simulation.distribution.length > 0 && (
                                                    <div className={`mt-2 pt-2 border-t ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
                                                        <div className="text-gray-400 mb-1">Premi:</div>
                                                        {simulation.distribution.slice(0, 3).map((prize, idx) => (
                                                            <div key={prize.rank} className="flex justify-between items-center">
                                                                <span className="flex items-center gap-1">
                                                                    <span className="text-xs">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                                                                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                                                                        {prize.rank}° ({(prize.percentage * 100).toFixed(0)}%)
                                                                    </span>
                                                                </span>
                                                                <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                                    ${prize.amount.toFixed(0)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-gray-400 mt-3 text-center">
                                💡 La commissione aumenta con più partecipanti (5-20%)
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-start gap-2 rounded-lg bg-red-500/10 p-2 text-xs text-red-500">
                            <AlertTriangle size={16} className="shrink-0" />
                            <p className="font-semibold">{error}</p>
                        </div>
                    )}
                    <div className={`flex justify-end gap-3 px-6 py-4 border-t ${theme === 'dark' ? 'border-white/10' : 'border-gray-100'}`}>
                        <button type="button" onClick={onClose}
                            className={`rounded-xl px-4 py-2.5 text-sm font-medium ${theme === 'dark' ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                        >
                            Annulla
                        </button>
                        <button type="submit" disabled={isLoading}
                            className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-black shadow-lg transition-all hover:scale-[1.02] ${isLoading ? 'bg-gray-500' : 'bg-neonGreen shadow-neonGreen/20 hover:bg-neonGreen/90'}`}
                        >
                            <Save size={16}/> {isLoading ? 'Creazione...' : 'Crea Campionato'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface LeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    championship: Championship | null;
    leaderboardData: LeaderboardEntry[];
    isLoading: boolean;
    theme: Theme;
    error: string | null;
    prizePoolInfo?: PrizePoolInfo | null; // NEW: Prize pool information
}

const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose, championship, leaderboardData, isLoading, theme, error, prizePoolInfo }) => {
    if (!isOpen || !championship) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`w-full max-w-4xl overflow-hidden rounded-2xl shadow-2xl ${theme === 'dark' ? 'bg-[#1E1E1E] border border-white/10' : 'bg-white border-gray-200'}`}>
                <div className={`flex items-center justify-between border-b px-6 py-4 ${theme === 'dark' ? 'border-white/10' : 'border-gray-100'}`}>
                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Classifica: {championship.name}</h3>
                    <button onClick={onClose} className={`rounded-full p-1 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">
                    {isLoading ? (
                        <div className="flex h-48 flex-col items-center justify-center gap-4">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-neonGreen border-t-transparent"></div>
                            <p className="text-sm text-gray-400">Calcolo classifica...</p>
                        </div>
                    ) : error ? (
                        <div className="flex items-start gap-2 rounded-lg bg-red-500/10 p-4 text-sm text-red-500">
                            <AlertTriangle size={20} className="shrink-0" />
                            <p>{error}</p>
                        </div>
                    ) : leaderboardData.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">Nessun partecipante o dati disponibili per la classifica.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className={`border-b ${theme === 'dark' ? 'border-white/5 bg-white/5 text-gray-400' : 'border-gray-100 bg-gray-50 text-gray-500'}`}>
                                    <tr>
                                        <th className="px-4 py-2 font-medium whitespace-nowrap">Classifica</th>
                                        <th className="px-4 py-2 font-medium whitespace-nowrap">Partecipante</th>
                                        <th className="px-4 py-2 font-medium text-right whitespace-nowrap">Patrimonio Netto</th>
                                        <th className="px-4 py-2 font-medium text-right whitespace-nowrap">Ritorno Totale</th>
                                        <th className="px-4 py-2 font-medium text-right whitespace-nowrap">Ritorno %</th>
                                        <th className="px-4 py-2 font-medium text-right whitespace-nowrap">Valore Assets</th>
                                        <th className="px-4 py-2 font-medium text-right whitespace-nowrap">Trades</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {leaderboardData.map((entry) => {
                                        const isReturnPositive = entry.totalReturn >= 0;
                                        return (
                                            <tr key={entry.user_email} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-2 font-semibold">{entry.rank}</td>
                                            <td className="px-4 py-2 whitespace-nowrap">{entry.user_name}</td>
                                            <td className={`px-4 py-2 text-right font-bold ${entry.totalNetWorth >= championship.starting_cash ? (theme === 'dark' ? 'text-neonGreen' : 'text-green-700') : (theme === 'dark' ? 'text-mutedRed' : 'text-red-700')}`}>
                                                ${entry.totalNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className={`px-4 py-2 text-right ${isReturnPositive ? (theme === 'dark' ? 'text-neonGreen' : 'text-green-700') : (theme === 'dark' ? 'text-mutedRed' : 'text-red-700')}`}>
                                                <div className="flex items-center justify-end gap-1">
                                                    {isReturnPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                    {isReturnPositive ? '+' : ''}${entry.totalReturn.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </div>
                                            </td>
                                            <td className={`px-4 py-2 text-right ${isReturnPositive ? (theme === 'dark' ? 'text-neonGreen' : 'text-green-700') : (theme === 'dark' ? 'text-mutedRed' : 'text-red-700')}`}>
                                                {isReturnPositive ? '+' : ''}{entry.returnPercentage.toFixed(2)}%
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                ${entry.totalAssetValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                {entry.totalTrades}
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}
                    
                    {/* NEW: Prize Pool Section */}
                    {!isLoading && !error && leaderboardData.length > 0 && prizePoolInfo && championship.enrollment_fee && championship.enrollment_fee > 0 && (
                        <div className={`mt-6 p-6 rounded-2xl border ${theme === 'dark' ? 'bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20' : 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200'}`}>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <Award size={24} className="text-purple-400"/>
                                    <h4 className={`text-lg font-bold ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>
                                        Distribuzione Montepremi
                                    </h4>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-400 mb-1">Montepremi Totale</div>
                                    <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-neonGreen' : 'text-green-600'}`}>
                                        ${prizePoolInfo.prize_pool.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </div>
                                </div>
                            </div>

                            {/* Prize Pool Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-black/20' : 'bg-white/50'}`}>
                                    <div className="text-xs text-gray-400 mb-1">Partecipanti</div>
                                    <div className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {prizePoolInfo.participants_count}
                                    </div>
                                </div>
                                <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-black/20' : 'bg-white/50'}`}>
                                    <div className="text-xs text-gray-400 mb-1">Quota x Partecipante</div>
                                    <div className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        ${championship.enrollment_fee.toLocaleString()}
                                    </div>
                                </div>
                                <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-black/20' : 'bg-white/50'}`}>
                                    <div className="text-xs text-gray-400 mb-1">Commissione Platform</div>
                                    <div className={`text-xl font-bold ${theme === 'dark' ? 'text-orange-300' : 'text-orange-600'}`}>
                                        {(prizePoolInfo.rake_percentage * 100).toFixed(0)}%
                                    </div>
                                </div>
                            </div>

                            {/* Prize Distribution List */}
                            {prizePoolInfo.prize_distribution.length > 0 && (
                                <div>
                                    <h5 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Premi per Posizione:
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {prizePoolInfo.prize_distribution.map((prize, idx) => (
                                            <div key={prize.rank} className={`p-4 rounded-xl border transition-all ${
                                                idx < 3 
                                                    ? (theme === 'dark' ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30' : 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300')
                                                    : (theme === 'dark' ? 'bg-black/20 border-white/10' : 'bg-white/50 border-gray-200')
                                            }`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-lg ${
                                                            idx === 0 ? 'text-yellow-500' : 
                                                            idx === 1 ? 'text-gray-400' : 
                                                            idx === 2 ? 'text-orange-600' : 
                                                            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                                                        }`}>
                                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🏅'}
                                                        </span>
                                                        <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                            {prize.rank}° Posto
                                                        </span>
                                                    </div>
                                                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        {(prize.percentage * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                                <div className={`text-2xl font-bold ${
                                                    idx < 3 
                                                        ? (theme === 'dark' ? 'text-neonGreen' : 'text-green-600')
                                                        : (theme === 'dark' ? 'text-white' : 'text-gray-900')
                                                }`}>
                                                    ${prize.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Legend */}
                                    <div className={`mt-4 p-3 rounded-lg ${theme === 'dark' ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                                        <p className={`text-xs ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                                            ℹ️ I premi vengono assegnati automaticamente ai primi {prizePoolInfo.prize_distribution.length} classificati al termine del campionato.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText: string;
    theme: Theme;
    isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmText, theme, isLoading = false }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`w-full max-w-sm rounded-2xl shadow-2xl ${theme === 'dark' ? 'bg-[#1E1E1E] border border-white/10' : 'bg-white border-gray-200'}`}>
                <div className={`flex items-center justify-between border-b px-6 py-4 ${theme === 'dark' ? 'border-white/10' : 'border-gray-100'}`}>
                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
                    <button onClick={onClose} className={`rounded-full p-1 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{message}</p>
                </div>
                <div className={`flex justify-end gap-3 px-6 py-4 border-t ${theme === 'dark' ? 'border-white/10' : 'border-gray-100'}`}>
                    <button type="button" onClick={onClose} disabled={isLoading}
                        className={`rounded-xl px-4 py-2.5 text-sm font-medium ${theme === 'dark' ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                    >
                        Annulla
                    </button>
                    <button type="button" onClick={onConfirm} disabled={isLoading}
                        className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-black shadow-lg transition-all hover:scale-[1.02] ${isLoading ? 'bg-gray-500' : 'bg-neonGreen shadow-neonGreen/20 hover:bg-neonGreen/90'}`}
                    >
                        {isLoading ? 'Conferma...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

// NEW: Stripe Checkout Parent Modal - Handles Stripe.js loading and Elements Provider
interface StripeCheckoutModalProps {
    isOpen: boolean;
    onClose: () => void; // Called on cancel or after success/fail message
    onPaymentSuccess: (championship: Championship) => void;
    championship: Championship | null;
    theme: Theme;
    stripePublicKey: string | null; // Passed from parent
    onNavigateToSettings: () => void; // NEW: Callback to navigate to settings // Fix: Changed to () => void to match handleNavigateToSettings
    isAdminUser: boolean; // NEW: Flag to indicate if current user is admin
}

const StripeCheckoutModal: React.FC<StripeCheckoutModalProps> = ({ isOpen, onClose, onPaymentSuccess, championship, theme, stripePublicKey, onNavigateToSettings, isAdminUser }) => {
    // This state is no longer needed in this component as Elements handles loading internally
    // const [clientStripe, setClientStripe] = useState<Stripe | null>(null); 
    const [stripeError, setStripeError] = useState<string | null>(null);

    useEffect(() => {
        // If the modal is open and no public key is provided, set a local error.
        // The Elements component will now handle the loading of Stripe.js internally
        // when provided with the promise from getStripePromise.
        if (isOpen && !stripePublicKey) {
            setStripeError("Chiave Pubblica Stripe non configurata.");
        } else if (!isOpen) {
            setStripeError(null); 
        }
    }, [isOpen, stripePublicKey]); // Depend on isOpen and stripePublicKey

    if (!isOpen || !championship) return null;

    // Handle the case where stripePublicKey is missing (admin needs to configure it)
    if (!stripePublicKey && stripeError) { // Check stripeError here to display custom message
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className={`w-full max-w-md overflow-hidden rounded-2xl shadow-2xl ${theme === 'dark' ? 'bg-[#1E1E1E] border border-white/10' : 'bg-white border-gray-200'}`}>
                    <div className={`flex items-center justify-between border-b px-6 py-4 ${theme === 'dark' ? 'border-white/10' : 'border-gray-100'}`}>
                        <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Errore Configurazione Stripe</h3>
                        <button onClick={onClose} className={`rounded-full p-1 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-6 text-center">
                        <AlertTriangle size={48} className="mx-auto text-red-500 mb-4"/>
                        <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>Chiave Pubblica Stripe non configurata.</p>
                        <p className="text-sm text-gray-500">Un amministratore deve configurare la chiave pubblica Stripe nelle Impostazioni per abilitare i pagamenti.</p>
                        {isAdminUser && (
                            <button 
                                onClick={onNavigateToSettings}
                                className={`mt-6 rounded-xl px-6 py-2.5 text-sm font-bold transition-all ${theme === 'dark' ? 'bg-neonGreen text-black hover:bg-neonGreen/90' : 'bg-black text-white hover:bg-gray-800'}`}
                            >
                                Vai alle Impostazioni
                            </button>
                        )}
                        <button 
                            onClick={onClose}
                            className={`mt-3 rounded-xl px-6 py-2.5 text-sm font-bold transition-all ${theme === 'dark' ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                        >
                            Chiudi
                        </button>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`w-full max-w-md overflow-hidden rounded-2xl shadow-2xl ${theme === 'dark' ? 'bg-[#1E1E1E] border border-white/10' : 'bg-white border-gray-200'}`}>
                <div className={`flex items-center justify-between border-b px-6 py-4 ${theme === 'dark' ? 'border-white/10' : 'border-gray-100'}`}>
                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Checkout Iscrizione Campionato</h3>
                    <button onClick={onClose} className={`rounded-full p-1 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                        <X size={20} />
                    </button>
                </div>
                {/* Now, Elements component always renders when publicKey is present (and not in an explicit error state),
                    and it internally manages the loading state for Stripe.js.
                    StripeCheckoutForm will only try to use hooks once Elements is ready.
                */}
                {stripePublicKey ? ( // Render Elements if publicKey is available
                    <Elements stripe={getStripePromise(stripePublicKey)}>
                        <StripeCheckoutForm 
                            championship={championship} 
                            theme={theme} 
                            onPaymentSuccess={onPaymentSuccess} 
                            onClose={onClose}
                        />
                    </Elements>
                ) : (
                    // This loading state handles the brief moment while stripePublicKey is being fetched
                    // (which happens in handlePayEnrollment) before the Elements component can render.
                    // If stripePublicKey remains null after fetching, the stripeError message above will handle it.
                    <div className="p-6 text-center">
                        <Loader2 size={32} className="mx-auto animate-spin text-neonGreen mb-4"/>
                        <p className="text-sm text-gray-400">Caricamento configurazione Stripe...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// NEW: Stripe Checkout Form - Child component to use Stripe hooks
interface StripeCheckoutFormProps {
    championship: Championship;
    theme: Theme;
    onPaymentSuccess: (championship: Championship) => void;
    onClose: () => void;
}

const StripeCheckoutForm: React.FC<StripeCheckoutFormProps> = ({ championship, theme, onPaymentSuccess, onClose }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'failed'>('idle');
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [cardError, setCardError] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!stripe || !elements || !championship.enrollment_fee || championship.enrollment_fee <= 0) {
            // Stripe.js has not yet loaded or no fee
            return;
        }

        setIsProcessing(true);
        setPaymentStatus('idle');
        setStatusMessage(null);
        setCardError(null);

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
            setCardError("Errore: Impossibile trovare il componente della carta di credito.");
            setIsProcessing(false);
            return;
        }

        try {
            // Step 1: Get the admin's Stripe secret key from database
            const { secretKey: stripeSecretKey } = await db.getStripeCredentials(championship.admin_user_id);
            
            if (!stripeSecretKey) {
                setCardError("Chiave Stripe non configurata per questo campionato.");
                setIsProcessing(false);
                return;
            }

            // Step 2: Create PaymentIntent via backend API
            const backendResult = await processPaymentWithMockBackend(
                '', // paymentMethodId not needed with new flow
                championship.enrollment_fee,
                'usd',
                championship.id,
                stripeSecretKey
            );

            if (!backendResult.success || !backendResult.clientSecret) {
                setPaymentStatus('failed');
                setStatusMessage(backendResult.message || "Errore nella creazione del pagamento.");
                setCardError(backendResult.error);
                setIsProcessing(false);
                return;
            }

            // Step 3: Confirm the payment with the card details
            const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
                backendResult.clientSecret,
                {
                    payment_method: {
                        card: cardElement,
                        billing_details: {
                            email: championship.admin_user_id, // Ideally use currentUser.email
                        },
                    },
                }
            );

            if (confirmError) {
                console.error("[Stripe Frontend] Payment confirmation failed:", confirmError);
                setPaymentStatus('failed');
                setStatusMessage("Pagamento fallito. Controlla i dati della carta e riprova.");
                setCardError(confirmError.message || "Errore nella conferma del pagamento.");
                setIsProcessing(false);
                return;
            }

            // Step 4: Check payment status
            if (paymentIntent.status === 'succeeded') {
                setPaymentStatus('success');
                setStatusMessage("Pagamento completato con successo! Verrai iscritto al campionato.");
                onPaymentSuccess(championship);
            } else {
                setPaymentStatus('failed');
                setStatusMessage(`Pagamento non completato. Stato: ${paymentIntent.status}`);
            }

        } catch (e: any) {
            console.error("[Stripe Frontend] Error during payment processing:", e);
            setPaymentStatus('failed');
            setStatusMessage("Errore di comunicazione con il servizio di pagamento. Riprova.");
            setCardError(e.message || "Errore di rete o server.");
        } finally {
            setIsProcessing(false);
        }
    };

    const cardElementOptions = {
        style: {
            base: {
                fontSize: '16px',
                color: theme === 'dark' ? '#E0E0E0' : '#333',
                '::placeholder': {
                    color: theme === 'dark' ? '#888' : '#A0A0A0',
                },
            },
            invalid: {
                color: '#EF4444',
                iconColor: '#EF4444',
            },
        },
    };

    const renderPaymentContent = () => {
        // Elements.js provides an internal loading state, 
        // so we only need to handle the payment processing state explicitly.
        if (paymentStatus === 'idle' || isProcessing) {
            return (
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-4`}>
                        Stai per iscriverti al campionato <span className="font-semibold">{championship.name}</span>.
                    </p>
                    <p className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-6 text-center`}>
                        Totale: ${championship.enrollment_fee?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>

                    <div className={`rounded-xl border p-4 ${theme === 'dark' ? 'bg-black/30 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                        <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Dettagli Carta</label>
                        <CardElement options={cardElementOptions} className="p-2"/>
                    </div>
                    {cardError && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/10 p-2 text-xs text-red-500">
                             <AlertTriangle size={16} className="shrink-0" />
                             <p className="font-semibold">{cardError}</p>
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={isProcessing || !stripe || !elements || !championship.enrollment_fee || championship.enrollment_fee <= 0}
                        className={`flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-bold text-black shadow-lg transition-all hover:scale-[1.02] disabled:opacity-70 ${isProcessing ? 'bg-gray-500' : 'bg-neonGreen shadow-neonGreen/20 hover:bg-neonGreen/90'}`}
                    >
                        {isProcessing ? <Loader2 size={18} className="animate-spin"/> : <CreditCard size={18} />}
                        {isProcessing ? 'Elaborazione...' : `Paga $${championship.enrollment_fee?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </button>
                    <button 
                        type="button"
                        onClick={onClose}
                        disabled={isProcessing}
                        className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${theme === 'dark' ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                    >
                        Annulla
                    </button>
                    <p className="mt-6 text-center text-xs text-gray-500">
                        Questa è una simulazione di pagamento. In un'applicazione reale, verrebbe utilizzato un gateway come Stripe.
                    </p>
                </form>
            );
        } else {
            return (
                <div className="p-6 text-center">
                    {paymentStatus === 'success' && <CheckCircle size={48} className="mx-auto text-green-500 mb-4"/>}
                    {paymentStatus === 'failed' && <X size={48} className="mx-auto text-red-500 mb-4"/>}
                    <p className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>{statusMessage}</p>
                    {!isProcessing && (
                        <button 
                            onClick={onClose}
                            className={`mt-4 rounded-xl px-6 py-2.5 text-sm font-bold transition-all ${theme === 'dark' ? 'bg-neonGreen text-black hover:bg-neonGreen/90' : 'bg-black text-white hover:bg-gray-800'}`}
                        >
                            Chiudi
                        </button>
                    )}
                </div>
            );
        }
    };

    return renderPaymentContent();
};


// --- Main Championships Component ---
export const Championships: React.FC<ChampionshipsProps> = ({ theme, currentUser, onSetChampionshipContext, currentChampionshipId, marketData, onNavigateToSettings }) => { // Fix: Destructure onNavigateToSettings
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createChampionshipError, setCreateChampionshipError] = useState<string | null>(null);
  const [isCreatingChampionship, setIsCreatingChampionship] = useState(false);

  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);
  const [selectedChampionshipForLeaderboard, setSelectedChampionshipForLeaderboard] = useState<Championship | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [championshipToDelete, setChampionshipToDelete] = useState<Championship | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isLoadingChampionships, setIsLoadingChampionships] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // NEW: Payment State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [championshipToPayFor, setChampionshipToPayFor] = useState<Championship | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [stripePublicKey, setStripePublicKey] = useState<string | null>(null); // State for Stripe Public Key

  // NEW: Prize Pool Cache State
  const [prizePoolsCache, setPrizePoolsCache] = useState<Map<string, PrizePoolInfo>>(new Map());
  const [prizePoolRefreshTrigger, setPrizePoolRefreshTrigger] = useState(0); // NEW: Force prize pool recalculation


    // NO LONGER NEEDED: This useEffect was the source of the problem.
    // The public key must come from the admin of the specific championship being paid for,
    // not from the currentUser.
    // useEffect(() => {
    //     const fetchStripeKeys = async () => {
    //         if (currentUser.is_admin) {
    //             const { publicKey } = await db.getStripeCredentials(currentUser.id);
    //             setStripePublicKey(publicKey);
    //         } else {
    //             setStripePublicKey(null); // Non-admins don't need to know the public key
    //         }
    //     };
    //     fetchStripeKeys();
    // }, [currentUser.is_admin, currentUser.id]);


  const loadChampionships = useCallback(async () => {
    setIsLoadingChampionships(true);
    setLoadError(null);
    try {
        const fetchedChampionships = await db.getChampionships();
        
        // Fetch participants for each championship to accurately display "isParticipating"
        const championshipsWithParticipation = await Promise.all(
            fetchedChampionships.map(async (champ) => {
                const participantEmails = await db.getUserChampionshipParticipation(champ.id);
                return { ...champ, participant_emails: participantEmails };
            })
        );
        
        // Update championship status based on dates
        const now = new Date();
        const updatedChampionships = championshipsWithParticipation.map(champ => {
            let status = champ.status; // Default to current status from DB
            const startDate = new Date(champ.start_date);
            const endDate = new Date(champ.end_date);

            // Only auto-update if not already finished or archived
            if (status !== 'finished' && status !== 'archived') {
                if (now >= startDate && now <= endDate) {
                    status = 'active';
                } else if (now > endDate) {
                    status = 'finished';
                }
            }
            
            // If the status has changed from the DB state, update it in DB
            if (status !== champ.status) {
                db.updateChampionship({ ...champ, status }); 
            }
            return { ...champ, status };
        });

        setChampionships(updatedChampionships);
    } catch (e: any) {
        console.error("Failed to load championships:", e);
        setLoadError(e.message || "Caricamento dei campionati fallito.");
    } finally {
        setIsLoadingChampionships(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadChampionships();
  }, [loadChampionships]);

  // NEW: Calculate prize pools for all championships with enrollment fees
  useEffect(() => {
    const calculateAllPrizePools = async () => {
      console.log('[DEBUG] Calculating prize pools, trigger:', prizePoolRefreshTrigger);
      const newCache = new Map<string, PrizePoolInfo>();
      
      for (const champ of championships) {
        if (champ.enrollment_fee && champ.enrollment_fee > 0) {
          try {
            console.log(`[DEBUG] Calculating prize pool for ${champ.name} (${champ.id})`);
            const poolInfo = await db.calculatePrizePool(champ.id);
            console.log(`[DEBUG] Prize pool result for ${champ.name}:`, poolInfo);
            if (poolInfo) {
              newCache.set(champ.id, poolInfo);
            }
          } catch (error) {
            console.error(`Error calculating prize pool for ${champ.id}:`, error);
          }
        }
      }
      
      console.log('[DEBUG] Prize pools cache updated:', newCache.size, 'entries');
      setPrizePoolsCache(newCache);
    };

    if (championships.length > 0) {
      calculateAllPrizePools();
    }
  }, [championships, prizePoolRefreshTrigger]); // UPDATED: Added prizePoolRefreshTrigger dependency

  const handleCreateChampionship = async (data: Omit<Championship, 'id' | 'created_at' | 'status' | 'admin_user_id'>) => {
    setIsCreatingChampionship(true);
    setCreateChampionshipError(null);
    try {
        if (!currentUser.email) throw new Error("Email utente non disponibile per l'amministratore.");
        const newChampionship = await db.createChampionship(data, currentUser.email);
        if (newChampionship) {
            // ADMIN POLICY: Admins do NOT auto-join championships they create
            // They manage championships but do not participate as players
            console.log(`L'amministratore ${currentUser.email} ha creato il campionato ${newChampionship.name}.`);
            setIsCreateModalOpen(false);
            loadChampionships(); // Reload list to reflect participation status
        } else {
            setCreateChampionshipError("Fallita la creazione del campionato nel database.");
        }
    } catch (e: any) {
        console.error("Errore creazione campionato:", e);
        setCreateChampionshipError(e.message || "Errore nella creazione del campionato.");
    } finally {
        setIsCreatingChampionship(false);
    }
  };

  const handleJoinChampionship = async (champ: Championship) => {
    if (!currentUser.id || !currentUser.email) return;

    // PHASE 1: MULTI-ENROLLMENT ALLOWED - Restriction temporarily removed for testing
    // TODO PHASE 2: Add Championship Switcher UI for better UX
    /* --- COMMENTED OUT: Check for existing participation in other active/pending championships ---
    const allActiveOrPendingChamps = championships.filter(c => 
        (c.status === 'pending' || c.status === 'active') && c.id !== champ.id
    );

    for (const existingChamp of allActiveOrPendingChamps) {
        const participantEmails = await db.getUserChampionshipParticipation(existingChamp.id);
        if (participantEmails.includes(currentUser.email)) {
            alert(`Puoi partecipare solo a un campionato in stato "In Sospeso" o "Attivo" alla volta. Termina o aspetta che il tuo campionato attuale "${existingChamp.name}" si concluda prima di unirti a un altro.`);
            return;
        }
    }
    --- END COMMENTED CHECK --- */

    // Check for enrollment fee before joining
    if (champ.enrollment_fee && champ.enrollment_fee > 0) {
        handlePayEnrollment(champ); // Trigger payment flow
        return;
    }

    // Direct join if no fee
    try {
        await db.joinChampionship(currentUser.id, champ);
        await onSetChampionshipContext(champ); // Set this as current context
        loadChampionships(); // Refresh list to update participation status
    } catch (e: any) {
        console.error("Fallita l'iscrizione al campionato:", e);
        alert(`Fallita l'iscrizione al campionato: ${e.message}`);
    }
  };

  // NEW: Handle payment initiation
  const handlePayEnrollment = async (champ: Championship) => { // Made async to fetch key
    setChampionshipToPayFor(champ);
    setIsPaymentModalOpen(true);
    setPaymentError(null);

    // Fetch the admin's Stripe public key for the specific championship
    if (champ.admin_user_id) {
        const { publicKey } = await db.getStripeCredentials(champ.admin_user_id);
        setStripePublicKey(publicKey);
    } else {
        setStripePublicKey(null); // Fallback if admin_user_id is missing (shouldn't happen)
    }
  };

  // NEW: Handle successful payment and then join
  const handlePaymentSuccess = async (champ: Championship) => {
    console.log('[DEBUG] Payment success, enrolling user:', currentUser.email, 'to championship:', champ.name);
    if (!currentUser.id || !currentUser.email) {
        setPaymentError("Utente non loggato, impossibile completare l'iscrizione.");
        return;
    }

    // PHASE 1: MULTI-ENROLLMENT ALLOWED - Restriction temporarily removed for testing
    // TODO PHASE 2: Add Championship Switcher UI for better UX
    /* --- COMMENTED OUT: Check for existing participation in other active/pending championships AFTER payment ---
    // This is a safety check in case the user quickly pays then another champ activates/pending.
    const allActiveOrPendingChamps = championships.filter(c => 
        (c.status === 'pending' || c.status === 'active') && c.id !== champ.id
    );

    for (const existingChamp of allActiveOrPendingChamps) {
        const participantEmails = await db.getUserChampionshipParticipation(existingChamp.id);
        if (participantEmails.includes(currentUser.email)) {
            alert(`Pagamento riuscito, ma non puoi unirti: puoi partecipare solo a un campionato in stato "In Sospeso" o "Attivo" alla volta. Termina o aspetta che il tuo campionato attuale "${existingChamp.name}" si concluda prima di unirti a un altro.`);
            setIsPaymentModalOpen(false); // Close payment modal
            return;
        }
    }
    --- END COMMENTED CHECK --- */

    try {
        console.log('[DEBUG] Calling joinChampionship...');
        await db.joinChampionship(currentUser.id, champ);
        console.log('[DEBUG] joinChampionship completed');
        
        await onSetChampionshipContext(champ);
        console.log('[DEBUG] Championship context set');
        
        await loadChampionships();
        console.log('[DEBUG] Championships reloaded');
        
        console.log('[DEBUG] Triggering prize pool refresh...');
        setPrizePoolRefreshTrigger(prev => prev + 1); // NEW: Force prize pool recalculation
        
        setIsPaymentModalOpen(false); // Close modal after successful enrollment
        console.log('[DEBUG] Payment success flow completed');
    } catch (e: any) {
        setPaymentError(e.message || "Iscrizione fallita dopo il pagamento. Riprova.");
        console.error("Errore nell'iscrizione al campionato dopo il pagamento:", e);
    }
  };

  const handleStartChampionship = async (champ: Championship) => {
    try {
        const now = new Date();
        const startDate = new Date(champ.start_date);
        if (now < startDate) {
            const confirmed = window.confirm(`Questo campionato è programmato per iniziare il ${startDate.toLocaleDateString()}. Sei sicuro di volerlo avviare ora?`);
            if (!confirmed) return;
        }

        await db.updateChampionship({ ...champ, status: 'active' });
        loadChampionships();
    } catch (e: any) {
        console.error("Fallito l'avvio del campionato:", e);
        alert(`Fallito l'avvio del campionato: ${e.message}`);
    }
  };

  const handleEndChampionship = async (champ: Championship) => {
    try {
        await db.updateChampionship({ ...champ, status: 'finished' });
        loadChampionships();
    } catch (e: any) {
        console.error("Fallita la terminazione del campionato:", e);
        alert(`Fallita la terminazione del campionato: ${e.message}`);
    }
  };

  // NEW: Handle admin leaving championship
  const handleAdminLeaveChampionship = async (champ: Championship) => {
    if (!currentUser.id || !currentUser.email) return;
    
    try {
        // Remove admin from championship participants
        await db.leaveChampionship(currentUser.id, champ.id);
        
        // Clear championship context if this was the active one
        if (currentChampionshipId === champ.id) {
            await onSetChampionshipContext(null);
        }
        
        // Reload championships to update participation status
        loadChampionships();
        
        alert(`Ti sei rimosso con successo dal campionato "${champ.name}".`);
    } catch (e: any) {
        console.error("Fallita la rimozione dal campionato:", e);
        alert(`Fallita la rimozione dal campionato: ${e.message}`);
    }
  };

  const handleDeleteRequest = (champ: Championship) => {
    setChampionshipToDelete(champ);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteChampionship = async () => {
    if (!championshipToDelete) return;
    setIsDeleting(true);
    try {
        await db.deleteChampionship(championshipToDelete.id);
        setIsDeleteConfirmOpen(false);
        setChampionshipToDelete(null);
        if (currentChampionshipId === championshipToDelete.id) {
            onSetChampionshipContext(null); // If current context is deleted, reset to personal
        }
        loadChampionships();
    } catch (e: any) {
        console.error("Fallita l'eliminazione del campionato:", e);
        alert(`Fallita l'eliminazione del campionato: ${e.message}`);
    } finally {
        setIsDeleting(false);
    }
  };

  const calculateLeaderboard = useCallback(async (champ: Championship) => {
    setIsLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
        const participantEmails = await db.getUserChampionshipParticipation(champ.id);
        const leaderboardEntries: LeaderboardEntry[] = [];

        // Fetch all user profiles once
        const allUsersPromises = participantEmails.map(email => db.getUserByEmail(email));
        const allUsers = (await Promise.all(allUsersPromises)).filter((u): u is User => u !== null);
        const usersMap = new Map(allUsers.map(u => [u.id, u]));

        for (const email of participantEmails) {
            const participant = usersMap.get(email);
            if (!participant) continue; // Skip if user profile not found

            const holdings = await db.getHoldings(email, champ.id);
            const transactions = await db.getTransactions(email, champ.id);

            // FIX: Initialize currentBuyingPower to 0. The champ.starting_cash is already accounted for in the initial 'deposit' transaction.
            let currentBuyingPower = 0; 
            let totalTrades = 0; // Initialize total trades
            transactions.forEach(tx => {
                const amount = Number(tx.amount); // Ensure amount is treated as number
                if (tx.type === 'deposit' || tx.type === 'sell') {
                    currentBuyingPower += amount;
                } else if (tx.type === 'withdrawal' || tx.type === 'buy') {
                    currentBuyingPower -= amount;
                }
                if (tx.type === 'buy' || tx.type === 'sell') {
                    totalTrades++; // Count only buy/sell as trades
                }
            });

            let totalAssetValue = 0;
            holdings.forEach(holding => {
                const liveStock = marketData.find(s => s.symbol === holding.symbol);
                const currentPrice = liveStock ? liveStock.price : holding.avgPrice; // Fallback to avgPrice
                totalAssetValue += currentPrice * holding.quantity;
            });

            const totalNetWorth = currentBuyingPower + totalAssetValue;
            const totalReturn = totalNetWorth - champ.starting_cash;
            const returnPercentage = champ.starting_cash > 0 ? (totalReturn / champ.starting_cash) * 100 : 0;

            leaderboardEntries.push({
                user_email: email,
                user_name: participant.name, // Use actual user name
                totalNetWorth,
                rank: 0, // Will be set after sorting
                totalReturn,
                returnPercentage,
                totalAssetValue,
                totalTrades,
            });
        }

        // Sort and assign ranks
        leaderboardEntries.sort((a, b) => b.totalNetWorth - a.totalNetWorth);
        leaderboardEntries.forEach((entry, index) => {
            entry.rank = index + 1;
        });

        setLeaderboardData(leaderboardEntries);

    } catch (e: any) {
        console.error("Fallito il calcolo della classifica:", e);
        setLeaderboardError(e.message || "Errore nel calcolo della classifica.");
    } finally {
        setIsLeaderboardLoading(false);
    }
  }, [marketData]);

  const handleViewLeaderboard = async (champ: Championship) => {
    setSelectedChampionshipForLeaderboard(champ);
    setIsLeaderboardModalOpen(true);
    await calculateLeaderboard(champ); // Calculate when modal opens
  };


  // NEW ORGANIZATION: By user participation instead of status
  // 1. Championships the user is participating in (pending or active)
  const myChampionships = championships.filter(c => 
    (c.status === 'pending' || c.status === 'active') && 
    c.participant_emails?.includes(currentUser.email)
  );

  // 2. Championships available to join (pending or active, not participating)
  const availableChampionships = championships.filter(c => 
    (c.status === 'pending' || c.status === 'active') && 
    !c.participant_emails?.includes(currentUser.email)
  );

  // 3. Finished championships (only those the user participated in)
  const finishedChampionships = championships.filter(c => 
    c.status === 'finished' && 
    c.participant_emails?.includes(currentUser.email)
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Campionati di Trading</h2>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Partecipa a campionati di trading virtuali, competi con altri utenti e scala le classifiche!
                </p>
            </div>
            {currentUser.is_admin && (
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 font-bold transition-all ${theme === 'dark' ? 'bg-neonGreen text-black hover:bg-neonGreen/90' : 'bg-black text-white hover:bg-gray-800'}`}
                >
                    <Plus size={18}/> Crea Nuovo Campionato
                </button>
            )}
        </div>

        {isLoadingChampionships ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 text-gray-500">
               <div className="h-8 w-8 animate-spin rounded-full border-4 border-neonGreen border-t-transparent"></div>
               <p className="text-sm text-gray-400">Caricamento campionati...</p>
            </div>
        ) : loadError ? (
            <div className="flex items-start gap-2 rounded-lg bg-red-500/10 p-4 text-sm text-red-500">
                <AlertTriangle size={20} className="shrink-0" />
                <p>{loadError}</p>
            </div>
        ) : (
            <div className="space-y-8">
                {/* My Championships - User is participating */}
                {myChampionships.length > 0 && (
                    <div>
                        <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-neonGreen' : 'text-green-700'}`}>I Miei Campionati <span className="text-gray-500 text-sm">({myChampionships.length})</span></h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {myChampionships.map(champ => (
                                <ChampionshipCard
                                    key={champ.id}
                                    championship={champ}
                                    currentUser={currentUser}
                                    theme={theme}
                                    onViewLeaderboard={handleViewLeaderboard}
                                    onJoin={handleJoinChampionship}
                                    onPayEnrollment={handlePayEnrollment} // NEW
                                    onSetContext={onSetChampionshipContext}
                                    onStart={handleStartChampionship}
                                    onEnd={handleEndChampionship}
                                    onDelete={handleDeleteRequest}
                                    onAdminLeave={handleAdminLeaveChampionship} // NEW
                                    currentChampionshipId={currentChampionshipId}
                                    isParticipating={champ.participant_emails?.includes(currentUser.email) || false}
                                    prizePoolInfo={prizePoolsCache.get(champ.id) || null}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Available Championships - User can join */}
                {availableChampionships.length > 0 && (
                    <div>
                        <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>Campionati Disponibili <span className="text-gray-500 text-sm">({availableChampionships.length})</span></h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {availableChampionships.map(champ => (
                                <ChampionshipCard
                                    key={champ.id}
                                    championship={champ}
                                    currentUser={currentUser}
                                    theme={theme}
                                    onViewLeaderboard={handleViewLeaderboard}
                                    onJoin={handleJoinChampionship}
                                    onPayEnrollment={handlePayEnrollment} // NEW
                                    onSetContext={onSetChampionshipContext}
                                    onStart={handleStartChampionship}
                                    onEnd={handleEndChampionship}
                                    onDelete={handleDeleteRequest}
                                    onAdminLeave={handleAdminLeaveChampionship} // NEW
                                    currentChampionshipId={currentChampionshipId}
                                    isParticipating={champ.participant_emails?.includes(currentUser.email) || false}
                                    prizePoolInfo={prizePoolsCache.get(champ.id) || null}
                                />
                            ))}
                        </div>
                    </div>
                )}
                {availableChampionships.length === 0 && myChampionships.length === 0 && !currentUser.is_admin && (
                    <div className={`p-8 rounded-2xl border border-dashed ${theme === 'dark' ? 'border-white/10 text-gray-500' : 'border-gray-300 text-gray-400'}`}>
                        <Trophy size={48} className="mx-auto mb-4 opacity-20"/>
                        <p className="text-center">Nessun campionato disponibile al momento.</p>
                        <p className="mt-2 text-center text-xs">Torna presto per nuove sfide!</p>
                    </div>
                )}

                {/* Finished Championships */}
                {finishedChampionships.length > 0 && (
                    <div>
                        <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>Campionati Terminati <span className="text-gray-500 text-sm">({finishedChampionships.length})</span></h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {finishedChampionships.map(champ => (
                                <ChampionshipCard
                                    key={champ.id}
                                    championship={champ}
                                    currentUser={currentUser}
                                    theme={theme}
                                    onViewLeaderboard={handleViewLeaderboard}
                                    onJoin={handleJoinChampionship}
                                    onPayEnrollment={handlePayEnrollment} // NEW
                                    onSetContext={onSetChampionshipContext}
                                    onStart={handleStartChampionship}
                                    onEnd={handleEndChampionship}
                                    onDelete={handleDeleteRequest}
                                    onAdminLeave={handleAdminLeaveChampionship} // NEW
                                    currentChampionshipId={currentChampionshipId}
                                    isParticipating={champ.participant_emails?.includes(currentUser.email) || false}
                                    prizePoolInfo={prizePoolsCache.get(champ.id) || null}
                                />
                            ))}
                        </div>
                    </div>
                )}
                {finishedChampionships.length === 0 && (
                    <div className={`p-8 rounded-2xl border border-dashed ${theme === 'dark' ? 'border-white/10 text-gray-500' : 'border-gray-300 text-gray-400'}`}>
                        <Trophy size={48} className="mx-auto mb-4 opacity-20"/>
                        <p className="text-center">Nessun campionato terminato.</p>
                    </div>
                )}
            </div>
        )}

        <CreateChampionshipModal
            isOpen={isCreateModalOpen}
            onClose={() => {setIsCreateModalOpen(false); setCreateChampionshipError(null);}}
            onCreate={handleCreateChampionship}
            theme={theme}
            isLoading={isCreatingChampionship}
            error={createChampionshipError}
        />

        <LeaderboardModal
            isOpen={isLeaderboardModalOpen}
            onClose={() => {setIsLeaderboardModalOpen(false); setLeaderboardError(null); setLeaderboardData([]);}}
            championship={selectedChampionshipForLeaderboard}
            leaderboardData={leaderboardData}
            isLoading={isLeaderboardLoading}
            theme={theme}
            error={leaderboardError}
            prizePoolInfo={selectedChampionshipForLeaderboard ? prizePoolsCache.get(selectedChampionshipForLeaderboard.id) || null : null}
        />

        <ConfirmModal
            isOpen={isDeleteConfirmOpen}
            onClose={() => {setIsDeleteConfirmOpen(false); setChampionshipToDelete(null);}}
            onConfirm={handleDeleteChampionship}
            title="Elimina Campionato"
            message={`Sei sicuro di voler eliminare il campionato "${championshipToDelete?.name}"? Questa azione è irreversibile e cancellerà tutti i dati associati al campionato (holdings, transazioni, log).`}
            confirmText="Elimina Definitivamente"
            theme={theme}
            isLoading={isDeleting}
        />

        {/* NEW: Stripe Checkout Modal */}
        <StripeCheckoutModal
            isOpen={isPaymentModalOpen}
            onClose={() => {setIsPaymentModalOpen(false); setPaymentError(null);}}
            onPaymentSuccess={handlePaymentSuccess}
            championship={championshipToPayFor}
            theme={theme}
            stripePublicKey={stripePublicKey} // Pass the fetched public key
            onNavigateToSettings={onNavigateToSettings} // Fix: Pass the correct navigation handler
            isAdminUser={currentUser.is_admin || false} // Pass admin status
        />
    </div>
  );
};
