
import React, { useState, useEffect } from 'react';
import { Theme, ScanResult, Stock, Strategy } from './types';
import { Radar, Shield, TrendingUp, Zap, ArrowRight, ExternalLink, DollarSign, AlertCircle, Clock, LineChart, Activity, Wallet, Lightbulb, Plus, Filter } from 'lucide-react';
import { filterAllowedTickers } from './services/marketService';
import { getChampionshipById } from './services/database';

interface ScannerProps {
  theme: Theme;
  marketData: Stock[]; // Not directly used for triggering scan, but can be for rendering.
  strategies: Strategy[]; // Not directly used for triggering scan, but can be for rendering.
  onTrade: (stock: Stock, type: 'buy', strategyId?: string) => void;
  
  // New props for automated scanner results
  scanResults: ScanResult[];
  scanSource: 'AI' | 'Heuristic' | null;
  scanAiErrorMessage: string | null;
  lastScanTimestamp: number | null;
  isScanning: boolean;
  onNavigateToSettings: () => void; // New prop for navigating to settings
  championshipId: string; // UPDATED: now mandatory string
}

export const Scanner: React.FC<ScannerProps> = ({ 
  theme, 
  marketData, 
  strategies, 
  onTrade,
  scanResults,
  scanSource,
  scanAiErrorMessage, // Kept in props, but not rendered visually below
  lastScanTimestamp,
  isScanning,
  onNavigateToSettings, // Destructure new prop
  championshipId, // NEW
}) => {
  // NEW: State for filtered results and championship info
  const [filteredScanResults, setFilteredScanResults] = useState<ScanResult[]>(scanResults);
  const [tickerRestrictionEnabled, setTickerRestrictionEnabled] = useState(false);
  const [allowedTickersCount, setAllowedTickersCount] = useState(0);
  const [isLoadingRestrictions, setIsLoadingRestrictions] = useState(true);

  // NEW: Load championship restrictions and filter results
  useEffect(() => {
    const loadRestrictionsAndFilter = async () => {
      setIsLoadingRestrictions(true);
      
      if (!championshipId) {
        // No championship context - show all results
        setFilteredScanResults(scanResults);
        setTickerRestrictionEnabled(false);
        setIsLoadingRestrictions(false);
        return;
      }

      try {
        const championship = await getChampionshipById(championshipId);
        
        if (!championship || !championship.ticker_restriction_enabled) {
          // No restrictions - show all results
          setFilteredScanResults(scanResults);
          setTickerRestrictionEnabled(false);
          setAllowedTickersCount(0);
        } else {
          // Has restrictions - filter results
          const allowedTickers = championship.allowed_tickers || [];
          const allowedSet = new Set(allowedTickers.map(t => t.toUpperCase()));
          
          const filtered = scanResults.filter(result => 
            allowedSet.has(result.symbol.toUpperCase())
          );
          
          setFilteredScanResults(filtered);
          setTickerRestrictionEnabled(true);
          setAllowedTickersCount(allowedTickers.length);
        }
      } catch (error) {
        console.error("Error loading ticker restrictions:", error);
        // On error, show all results
        setFilteredScanResults(scanResults);
        setTickerRestrictionEnabled(false);
      } finally {
        setIsLoadingRestrictions(false);
      }
    };

    loadRestrictionsAndFilter();
  }, [championshipId, scanResults]);

  const getColumnItems = (catId: string) => filteredScanResults.filter(r => r.categoryId === catId);
  const formattedScanTime = lastScanTimestamp ? new Date(lastScanTimestamp).toLocaleTimeString() : 'N/A';

  const renderCard = (item: ScanResult) => {
      // Find live price if available, or mock stock object
      const stockInfo = marketData.find(s => s.symbol === item.symbol) || {
          symbol: item.symbol,
          name: item.symbol,
          price: 0,
          changePercent: 0,
          marketCap: '-',
          volume: '-'
      } as Stock;

      const categoryStrategy = strategies.find(s => s.id === item.categoryId);

      return (
          // NEW: Completed renderCard JSX
          <div key={item.symbol} className={`p-4 mb-3 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
              <div className="flex justify-between items-start mb-2">
                  <div>
                      <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stockInfo.symbol}</h3>
                      <p className="text-xs text-gray-500">{stockInfo.name}</p>
                  </div>
                  <div className={`text-right font-mono ${stockInfo.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      <div className="text-lg font-bold">${stockInfo.price.toFixed(2)}</div>
                      <div className="text-xs">{stockInfo.changePercent > 0 ? '+' : ''}{stockInfo.changePercent.toFixed(2)}%</div>
                  </div>
              </div>
              
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
                {item.reason}
              </p>

              {categoryStrategy && (
                <div className="mb-4 flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-gray-400 bg-black/20 w-fit px-2 py-1 rounded-lg">
                    <Lightbulb size={12} /> {categoryStrategy.name}
                </div>
              )}

              <button 
                  onClick={() => onTrade(stockInfo, 'buy', categoryStrategy?.id)}
                  className={`w-full py-2 rounded-xl font-bold transition-all ${theme === 'dark' ? 'bg-neonGreen text-black hover:bg-neonGreen/90' : 'bg-black text-white hover:bg-gray-800'}`}
              >
                  <Plus size={16} className="inline-block mr-1"/> Buy
              </button>
          </div>
      );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Market Scanner</h2>
                <div className="flex items-center gap-2 mt-1">
                    <Radar size={16} className="text-blue-400"/>
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        Opportunità analizzate per il portafoglio del campionato
                    </span>
                </div>
            </div>
            
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
                <span className={`h-2 w-2 rounded-full ${isScanning ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></span>
                <span className="text-xs font-bold uppercase">{isScanning ? 'Scanning...' : 'Last scan:'} {formattedScanTime}</span>
            </div>
        </div>

        {/* NEW: Ticker Restriction Badge */}
        {tickerRestrictionEnabled && !isLoadingRestrictions && (
            <div className={`flex items-start gap-3 p-4 rounded-xl border ${theme === 'dark' ? 'border-blue-500/20 bg-blue-500/10' : 'border-blue-200 bg-blue-50'}`}>
                <Filter size={20} className="text-blue-400 mt-0.5" />
                <div>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        🎯 Filtro Ticker Attivo
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Questo campionato limita il trading a <span className="font-semibold text-blue-400">{allowedTickersCount} ticker selezionati</span>. Solo questi ticker appariranno nello scanner e saranno tradabili.
                    </p>
                </div>
            </div>
        )}

        {scanAiErrorMessage && (
            <div className={`flex items-start gap-3 p-4 rounded-xl border ${theme === 'dark' ? 'border-red-500/20 bg-red-500/10' : 'border-red-200 bg-red-50'}`}>
                <AlertCircle size={20} className="text-red-400 mt-0.5" />
                <div>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        AI Scanner Error
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        {scanAiErrorMessage}. Check your <button onClick={onNavigateToSettings} className="font-semibold text-blue-400 hover:underline">AI API keys</button> in settings.
                    </p>
                </div>
            </div>
        )}

        {scanResults.length === 0 && !isScanning ? (
            <div className={`p-8 rounded-2xl border border-dashed ${theme === 'dark' ? 'border-white/10 text-gray-500' : 'border-gray-300 text-gray-400'}`}>
                <Radar size={48} className="mx-auto mb-4 opacity-20"/>
                <p className="text-center">Nessuna opportunità di trading trovata al momento.</p>
                <p className="mt-2 text-center text-xs">Il prossimo scan automatico è previsto per le 08:00 AM.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                    <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                        Conservative ({getColumnItems('strat_conservative').length})
                    </h3>
                    {getColumnItems('strat_conservative').map(renderCard)}
                    {getColumnItems('strat_conservative').length === 0 && !isScanning && (
                        <p className="text-sm text-gray-500 p-4 rounded-xl border border-dashed dark:border-white/10">Nessuna opportunità conservativa.</p>
                    )}
                </div>
                <div>
                    <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-green-300' : 'text-green-700'}`}>
                        Balanced ({getColumnItems('strat_balanced').length})
                    </h3>
                    {getColumnItems('strat_balanced').map(renderCard)}
                    {getColumnItems('strat_balanced').length === 0 && !isScanning && (
                        <p className="text-sm text-gray-500 p-4 rounded-xl border border-dashed dark:border-white/10">Nessuna opportunità bilanciata.</p>
                    )}
                </div>
                <div>
                    <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>
                        Aggressive ({getColumnItems('strat_aggressive').length})
                    </h3>
                    {getColumnItems('strat_aggressive').map(renderCard)}
                    {getColumnItems('strat_aggressive').length === 0 && !isScanning && (
                        <p className="text-sm text-gray-500 p-4 rounded-xl border border-dashed dark:border-white/10">Nessuna opportunità aggressiva.</p>
                    )}
                </div>
            </div>
        )}

        {isScanning && (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                <p className="mt-4 text-sm">Scanning for new opportunities...</p>
            </div>
        )}
    </div>
  );
};
