
import React, { useState, useEffect } from 'react';
import { Theme, Stock, Holding, Strategy } from '../types';
import { X, DollarSign, AlertCircle, RefreshCw, BrainCircuit, Sparkles, ShieldX } from 'lucide-react';
import { getAIStrategyRecommendation, validateTickerForChampionship } from '../services/marketService';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'buy' | 'sell';
  stock: Stock | Holding | null;
  currentPrice: number;
  theme: Theme;
  onConfirm: (quantity: number, strategyId?: string) => void;
  userBalance?: number; 
  userHoldingQuantity?: number;
  onRefreshBalance?: () => void;
  strategies?: Strategy[]; // Available strategies
  defaultStrategyId?: string;
  championshipId: string; // UPDATED: now mandatory string
  maxTradeAmount: number; // Max single trade amount limit
}

export const TradeModal: React.FC<TradeModalProps> = ({ 
  isOpen, 
  onClose, 
  type, 
  stock, 
  currentPrice, 
  theme, 
  onConfirm,
  userBalance = 0,
  userHoldingQuantity = 0,
  onRefreshBalance,
  strategies = [],
  defaultStrategyId,
  championshipId, // UPDATED: now mandatory
  maxTradeAmount,
}) => {
  const [quantity, setQuantity] = useState<string>('');
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(defaultStrategyId || '');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendationReason, setRecommendationReason] = useState<string | null>(null);
  const [aiSuggestionError, setAiSuggestionError] = useState<string | null>(null); // New state for AI errors
  
  // NEW: Ticker validation state
  const [tickerValidationError, setTickerValidationError] = useState<string | null>(null);
  const [isValidatingTicker, setIsValidatingTicker] = useState(false);
  
  // NEW: Validate ticker when modal opens
  useEffect(() => {
    const validateTicker = async () => {
      if (isOpen && stock && type === 'buy') {
        setIsValidatingTicker(true);
        setTickerValidationError(null);
        
        try {
          const validation = await validateTickerForChampionship(
            stock.symbol,
            championshipId
          );
          
          if (!validation.isValid) {
            setTickerValidationError(validation.message || 'Ticker non consentito in questo campionato');
          }
        } catch (error) {
          console.error('Error validating ticker:', error);
          setTickerValidationError('Errore durante la validazione del ticker');
        } finally {
          setIsValidatingTicker(false);
        }
      }
    };
    
    validateTicker();
  }, [isOpen, stock, type, championshipId]);
  
  // Reset when opening
  useEffect(() => {
    if (isOpen) {
        setQuantity('');
        if (defaultStrategyId) setSelectedStrategyId(defaultStrategyId);
        setRecommendationReason(null);
        setAiSuggestionError(null); // Clear AI error on open
    }
  }, [isOpen, defaultStrategyId]);

  if (!isOpen || !stock) return null;

  const qty = parseFloat(quantity);
  const isValidQty = !isNaN(qty) && qty > 0;
  const estimatedTotal = isValidQty ? qty * currentPrice : 0;

  // Validation Logic
  let error = '';
  if (isValidQty) {
      if (type === 'buy') {
          if (estimatedTotal > userBalance) {
              error = `Fondi insufficienti.`;
          } else if (estimatedTotal > maxTradeAmount) {
              error = `Il valore del trade supera il limite massimo di $${maxTradeAmount.toLocaleString()}.`;
          }
      } else if (type === 'sell' && qty > userHoldingQuantity) {
          error = `Azioni insufficienti. Possiedi: ${userHoldingQuantity}`;
      }
  }

  // Calculate remaining balance after trade (preview)
  const remainingBalance = type === 'buy' ? userBalance - estimatedTotal : userBalance + estimatedTotal;

  const handleRefresh = async () => {
      if(onRefreshBalance) {
          setIsRefreshing(true);
          await onRefreshBalance();
          setTimeout(() => setIsRefreshing(false), 500); // Visual feedback delay
      }
  }

  const handleAskAI = async () => {
      setIsAnalyzing(true);
      setRecommendationReason(null);
      setAiSuggestionError(null); // Clear previous AI errors
      try {
          const result = await getAIStrategyRecommendation(stock.symbol);
          
          // Check if strategy exists in user's list (might be a system strategy they have)
          const strategyExists = strategies.find(s => s.id === result.recommendedId);
          
          if (strategyExists) {
              setSelectedStrategyId(result.recommendedId);
              setRecommendationReason(result.reason);
          } else {
              setRecommendationReason("Recommended strategy not available in your list.");
          }
      } catch (e: any) {
          console.error("AI Suggestion error:", e);
          let errorMessage = "Errore durante la richiesta del suggerimento AI. Controlla la tua chiave API AI e riprova.";

          if (e.message?.includes('API Key not configured.')) {
              errorMessage = `Errore chiave API AI: La chiave API per il provider AI selezionato non è configurata o non è valida. Configurala nelle Impostazioni.`;
          } else if (e.message?.includes('AI Quota Exceeded')) {
              errorMessage = `Errore AI: Quota API esaurita o limiti di tariffa raggiunti. Prova più tardi o aggiorna la tua chiave API.`;
          } else if (e.message?.includes('Failed to fetch') || e.message?.includes('Network error')) {
              errorMessage = "Errore di rete: Impossibile connettersi ai servizi AI. Controlla la tua connessione internet.";
          } else if (e.message?.includes('OpenAI Error:')) {
            errorMessage = `OpenAI API Error: ${e.message.replace('OpenAI Error: ', '')} Controlla la tua chiave API o lo stato del tuo account OpenAI.`;
          } else if (e.message?.includes('Anthropic Error:')) {
            errorMessage = `Anthropic API Error: ${e.message.replace('Anthropic Error: ', '')} Controlla la tua chiave API o lo stato del tuo account Anthropic.`;
          } else if (e.message?.includes('Gemini Error:')) {
            errorMessage = `Gemini API Error: ${e.message.replace('Gemini Error: ', '')} Controlla la tua chiave API o lo stato del tuo account Google AI.`;
          } else if (e.message) {
            errorMessage = `Errore AI: ${e.message}. Riprova o controlla le impostazioni API.`;
          }
          setAiSuggestionError(errorMessage);
      } finally {
          setIsAnalyzing(false);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className={`w-full max-w-md overflow-hidden rounded-2xl shadow-2xl transition-all ${theme === 'dark' ? 'bg-[#1E1E1E] border border-white/10' : 'bg-white border-gray-200'}`}>
            {/* Header */}
            <div className={`flex items-center justify-between border-b px-6 py-4 ${theme === 'dark' ? 'border-white/10' : 'border-gray-100'}`}>
                <h3 className={`text-lg font-bold capitalize ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {type} {stock.name || stock.symbol}
                </h3>
                <button onClick={onClose} className={`rounded-full p-1 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                    <X size={20} />
                </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
                
                {/* NEW: Ticker Validation Error - BLOCKS ALL TRADES */}
                {tickerValidationError && type === 'buy' && (
                    <div className={`flex items-start gap-3 p-4 rounded-xl border ${theme === 'dark' ? 'border-red-500/30 bg-red-500/10' : 'border-red-300 bg-red-50'}`}>
                        <ShieldX size={24} className="text-red-500 mt-0.5 shrink-0" />
                        <div className="flex-1">
                            <p className={`text-sm font-bold ${theme === 'dark' ? 'text-red-400' : 'text-red-700'} mb-1`}>
                                Ticker Non Consentito
                            </p>
                            <p className="text-xs text-gray-500">
                                {tickerValidationError}
                            </p>
                        </div>
                    </div>
                )}
                
                {/* Price and Balance Info */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500">Current Price</p>
                        <p className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            ${currentPrice.toFixed(2)}
                        </p>
                    </div>
                    <div className="text-right">
                         <p className="text-sm text-gray-500">{type === 'buy' ? 'Buying Power' : 'Available Shares'}</p>
                         <div className="flex items-center justify-end gap-2">
                             <p className={`font-medium ${theme === 'dark' ? 'text-neonGreen' : 'text-green-600'}`}>
                                {type === 'buy' ? `$${userBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}` : `${userHoldingQuantity} Shares`}
                             </p>
                             {type === 'buy' && (
                                 <button 
                                    onClick={handleRefresh}
                                    title="Refresh Balance"
                                    className={`rounded-full p-1 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
                                 >
                                     <RefreshCw size={12} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />
                                 </button>
                             )}
                         </div>
                    </div>
                </div>

                {/* Input Area */}
                <div>
                    <label className={`mb-2 block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Quantity
                    </label>
                    <div className="relative">
                        <input 
                            type="number" 
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="0.00"
                            className={`w-full rounded-xl border px-4 py-3 text-lg font-semibold outline-none transition-all focus:ring-2 ${
                                theme === 'dark' 
                                ? 'bg-black/30 border-white/10 text-white placeholder:text-gray-600 focus:border-neonGreen/50 focus:ring-neonGreen/20' 
                                : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500 focus:ring-blue-500/20'
                            } ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                        />
                    </div>
                    
                    {/* Error / Warning Message */}
                    {error && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/10 p-2 text-xs text-red-500">
                             <AlertCircle size={16} className="shrink-0" />
                             <div className="flex-1">
                                 <p className="font-semibold">{error}</p>
                                 {type === 'buy' && estimatedTotal > userBalance && (
                                     <p className="mt-1">
                                        You need ${estimatedTotal.toFixed(2)} but only have ${userBalance.toFixed(2)}. 
                                        Please deposit funds in Wallet.
                                     </p>
                                 )}
                                 {type === 'buy' && estimatedTotal > maxTradeAmount && (
                                     <p className="mt-1">
                                        Il valore massimo consentito per un singolo acquisto è di $${maxTradeAmount.toLocaleString()}.
                                     </p>
                                 )}
                             </div>
                        </div>
                    )}
                </div>

                {/* Strategy Selection (Only for Buy) */}
                {type === 'buy' && strategies.length > 0 && (
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                AI Strategy for this Position
                            </label>
                            <button 
                                onClick={handleAskAI}
                                disabled={isAnalyzing}
                                className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full transition-all ${
                                    isAnalyzing 
                                    ? 'bg-gray-500/20 text-gray-500' 
                                    : theme === 'dark' ? 'bg-neonGreen/10 text-neonGreen hover:bg-neonGreen/20' : 'bg-blue-100 text-blue-700'
                                }`}
                            >
                                {isAnalyzing ? 'Analyzing...' : <><Sparkles size={10} /> Ask AI Suggestion</>}
                            </button>
                        </div>
                        
                        <div className={`relative flex items-center rounded-xl border px-4 py-3 ${theme === 'dark' ? 'bg-black/30 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                            <BrainCircuit size={18} className="text-gray-500 mr-3" />
                            <select 
                                value={selectedStrategyId}
                                onChange={(e) => {
                                    setSelectedStrategyId(e.target.value);
                                    setRecommendationReason(null); // Clear auto message if user overrides
                                    setAiSuggestionError(null); // Clear AI error if user overrides
                                }}
                                className={`w-full bg-transparent text-sm outline-none ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
                            >
                                {strategies.map(s => (
                                    <option key={s.id} value={s.id} className={theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'}>
                                        {s.name} (Stop: -{s.stopLossPercentage}%)
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        {aiSuggestionError && (
                            <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/10 p-2 text-xs text-red-500">
                                <AlertCircle size={16} className="shrink-0" />
                                <p className="font-semibold">{aiSuggestionError}</p>
                            </div>
                        )}
                        {recommendationReason && !aiSuggestionError ? (
                            <p className="mt-2 text-[10px] text-neonGreen animate-in fade-in">
                                ✨ AI Suggestion: {recommendationReason}
                            </p>
                        ) : (
                            !aiSuggestionError && (
                                <p className="mt-1 text-[10px] text-gray-500">
                                    The AI Agent will use this specific logic to monitor this stock.
                                </p>
                            )
                        )}
                    </div>
                )}

                {/* Totals Section */}
                <div className={`space-y-2 rounded-xl border p-4 ${theme === 'dark' ? 'border-white/5 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Estimated Total</span>
                        <span className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            ${estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    {type === 'buy' && isValidQty && !error && (
                         <div className="flex items-center justify-between border-t border-dashed border-gray-500/30 pt-2 text-xs">
                             <span className="text-gray-500">Remaining Balance</span>
                             <span className="font-mono text-gray-500">${remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                         </div>
                    )}
                </div>

                <button 
                    onClick={() => isValidQty && !error && !tickerValidationError && onConfirm(qty, selectedStrategyId)}
                    disabled={!isValidQty || !!error || !!tickerValidationError || (type === 'buy' && isValidatingTicker)}
                    className={`w-full rounded-xl py-3.5 font-bold text-white shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 ${
                        type === 'buy' 
                        ? (theme === 'dark' ? 'bg-neonGreen text-black shadow-neonGreen/20 hover:bg-neonGreen/90' : 'bg-green-600 shadow-green-600/20 hover:bg-green-700')
                        : (theme === 'dark' ? 'bg-mutedRed text-white shadow-mutedRed/20 hover:bg-mutedRed/90' : 'bg-red-600 shadow-red-600/20 hover:bg-red-700')
                    }`}
                >
                    {isValidatingTicker ? 'Validating ticker...' : `Confirm ${type === 'buy' ? 'Purchase' : 'Sale'}`}
                </button>
            </div>
        </div>
    </div>
  );
};
