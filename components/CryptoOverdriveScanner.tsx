import React, { useState } from 'react';
import { Theme, Stock } from '../types';
import { Zap, TrendingUp, BarChart3, Activity, CheckCircle, XCircle, Loader2, Rocket } from 'lucide-react';
import { analyzeCryptoOverdrive, fetchYFinanceCandles, generateMockCandleData, CryptoSignal } from '../services/cryptoSignals';

interface CryptoOverdriveScannerProps {
  theme: Theme;
  onTrade: (stock: Stock, type: 'buy', strategyId?: string) => void;
  userAccountType: 'Pro' | 'Basic';
  championshipId: string | undefined;
  marketData: Stock[];
}

export const CryptoOverdriveScanner: React.FC<CryptoOverdriveScannerProps> = ({
  theme,
  onTrade,
  userAccountType,
  championshipId,
  marketData,
}) => {
  const [signals, setSignals] = useState<CryptoSignal[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);

  // Filtra solo crypto dai ticker del market data
  // Lista di basi crypto conosciute
  const CRYPTO_BASES = ['BTC', 'ETH', 'SOL', 'AVAX', 'ADA', 'XRP', 'DOGE', 'DOT', 'MATIC', 'BNB', 'LINK', 'UNI', 'ATOM'];
  
  const cryptoSymbols = marketData
    .filter(stock => {
      const cleanSymbol = stock.symbol.toUpperCase().replace(/-/g, '');
      // Verifica se inizia con una base crypto conosciuta e contiene USD
      return CRYPTO_BASES.some(crypto => cleanSymbol.startsWith(crypto)) && cleanSymbol.includes('USD');
    })
    .map(stock => stock.symbol);
  
  // DEBUG: Log per verificare i dati
  console.log('[Crypto Scanner] 📊 marketData length:', marketData.length);
  console.log('[Crypto Scanner] 📋 All symbols:', marketData.map(s => s.symbol));
  console.log('[Crypto Scanner] 🔍 Filtered crypto symbols:', cryptoSymbols);

  const handleScan = async () => {
    if (cryptoSymbols.length === 0) {
      alert('⚠️ No crypto available in this championship.\n\nThis scanner requires cryptocurrency tickers (e.g., BTCUSD, ETHUSD) to be included in the championship.');
      return;
    }

    setIsScanning(true);
    
    try {
      // Fetch candlestick data from Yahoo Finance
      console.log('[Crypto Scanner] Fetching data for:', cryptoSymbols);
      const candleData = await fetchYFinanceCandles(cryptoSymbols);
      
      const results: CryptoSignal[] = [];
      
      // Analizza ogni crypto
      for (const symbol of cryptoSymbols) {
        const symbolData = candleData[symbol];
        
        // symbolData can be either:
        // 1. { bars: [...], indicators: {...} } from Yahoo Finance (with pre-calculated indicators)
        // 2. Array of bars (legacy format)
        // 3. undefined/empty (need fallback to mock)
        
        let hasBars = false;
        if (symbolData) {
          if (Array.isArray(symbolData)) {
            hasBars = symbolData.length > 0;
          } else if ('bars' in symbolData) {
            hasBars = symbolData.bars && symbolData.bars.length > 0;
          }
        }
        
        // Fallback to mock data if API fails or returns empty
        const dataToAnalyze = hasBars ? symbolData : generateMockCandleData(symbol);
        
        if (!hasBars) {
          console.warn(`[Crypto Scanner] No data for ${symbol}, using mock data`);
        }
        
        const signal = await analyzeCryptoOverdrive(symbol, dataToAnalyze);
        results.push(signal);
      }
      
      // Ordina per score (migliori per primi)
      results.sort((a, b) => b.score - a.score);
      
      setSignals(results);
      setLastScanTime(new Date());
      
      console.log('[Crypto Scanner] Analysis complete:', results.map(r => `${r.symbol}: ${r.score}/4`));
    } catch (error) {
      console.error('[Crypto Scanner] Error scanning crypto signals:', error);
      
      // Fallback to mock data on error
      console.warn('[Crypto Scanner] Using mock data due to error');
      const results: CryptoSignal[] = [];
      for (const symbol of cryptoSymbols) {
        const mockData = generateMockCandleData(symbol);
        const signal = await analyzeCryptoOverdrive(symbol, mockData);
        results.push(signal);
      }
      results.sort((a, b) => b.score - a.score);
      setSignals(results);
      setLastScanTime(new Date());
    } finally {
      setIsScanning(false);
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'STRONG_BUY':
        return 'text-green-500';
      case 'BUY':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const getRecommendationBg = (recommendation: string) => {
    switch (recommendation) {
      case 'STRONG_BUY':
        return theme === 'dark' ? 'bg-green-500/20 border-green-500/30' : 'bg-green-50 border-green-200';
      case 'BUY':
        return theme === 'dark' ? 'bg-blue-500/20 border-blue-500/30' : 'bg-blue-50 border-blue-200';
      default:
        return theme === 'dark' ? 'bg-gray-500/20 border-gray-500/30' : 'bg-gray-50 border-gray-200';
    }
  };

  const canAccessOverdrive = userAccountType === 'Pro';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Rocket className={theme === 'dark' ? 'text-neonGreen' : 'text-orange-500'} size={24} />
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Crypto Overdrive Scanner
            </h2>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${theme === 'dark' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black' : 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white'} shadow-lg`}>
              ⭐ PRO ONLY
            </span>
          </div>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Technical analysis signals for BTC, ETH, AVAX based on momentum, volume, ATR & RSI
          </p>
        </div>

        <button
          onClick={handleScan}
          disabled={isScanning || !canAccessOverdrive}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
            !canAccessOverdrive
              ? 'opacity-50 cursor-not-allowed bg-gray-400'
              : isScanning
              ? 'opacity-50 cursor-wait'
              : theme === 'dark'
              ? 'bg-neonGreen text-black hover:bg-neonGreen/90'
              : 'bg-black text-white hover:bg-gray-800'
          }`}
        >
          {isScanning ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Zap size={18} />
              Scan Signals
            </>
          )}
        </button>
      </div>

      {/* Pro-only warning for Basic users */}
      {!canAccessOverdrive && (
        <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200'}`}>
          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'}`}>
            🔒 This feature requires a Pro account. Upgrade to access advanced crypto signals with technical indicators.
          </p>
        </div>
      )}

      {/* Last scan time */}
      {lastScanTime && (
        <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
          Last scanned: {lastScanTime.toLocaleTimeString()}
        </div>
      )}

      {/* Results */}
      {signals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {signals.map((signal) => (
            <div
              key={signal.symbol}
              className={`rounded-2xl border p-6 ${getRecommendationBg(signal.recommendation)}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {signal.symbol}
                </h3>
                <div className={`text-right ${getRecommendationColor(signal.recommendation)}`}>
                  <div className="text-sm font-bold uppercase">{signal.recommendation}</div>
                  <div className="text-xs">Score: {signal.score}/4</div>
                </div>
              </div>

              {/* Conditions */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Momentum +5%</span>
                  {signal.conditions.momentum ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : (
                    <XCircle size={16} className="text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Volume 2x</span>
                  {signal.conditions.volume ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : (
                    <XCircle size={16} className="text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Low Volatility</span>
                  {signal.conditions.lowVolatility ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : (
                    <XCircle size={16} className="text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>RSI {'<'} 80</span>
                  {signal.conditions.rsiOk ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : (
                    <XCircle size={16} className="text-red-500" />
                  )}
                </div>
              </div>

              {/* Details */}
              <div className={`p-3 rounded-xl mb-4 text-xs space-y-1 ${theme === 'dark' ? 'bg-black/30' : 'bg-white/50'}`}>
                <div className="flex justify-between">
                  <span>Momentum:</span>
                  <span className="font-mono font-bold">{signal.details.momentumPercent.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Volume Ratio:</span>
                  <span className="font-mono font-bold">{signal.details.volumeRatio.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between">
                  <span>ATR:</span>
                  <span className="font-mono font-bold">{signal.details.atrValue.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>RSI:</span>
                  <span className="font-mono font-bold">{signal.details.rsiValue.toFixed(0)}</span>
                </div>
              </div>

              {/* Action button */}
              {signal.recommendation !== 'NEUTRAL' && canAccessOverdrive && (
                <button
                  onClick={() => {
                    const mockStock: Stock = {
                      symbol: signal.symbol,
                      name: signal.symbol,
                      price: 0, // Will be fetched from market
                      changePercent: signal.details.momentumPercent,
                      marketCap: '-',
                      volume: '-',
                    };
                    onTrade(mockStock, 'buy', 'strat_crypto_overdrive');
                  }}
                  className={`w-full py-3 rounded-xl font-bold transition-all ${
                    theme === 'dark'
                      ? 'bg-neonGreen text-black hover:bg-neonGreen/90'
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  <TrendingUp size={16} className="inline-block mr-2" />
                  Buy with Overdrive
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {signals.length === 0 && !isScanning && canAccessOverdrive && (
        <div className={`p-12 rounded-2xl border border-dashed text-center ${theme === 'dark' ? 'border-white/10 text-gray-500' : 'border-gray-300 text-gray-400'}`}>
          <Zap size={48} className="mx-auto mb-4 opacity-20" />
          {cryptoSymbols.length > 0 ? (
            <>
              <p>Click "Scan Signals" to analyze {cryptoSymbols.length} crypto {cryptoSymbols.length === 1 ? 'opportunity' : 'opportunities'}</p>
              <p className="mt-2 text-xs">Analyzing: {cryptoSymbols.join(', ')}</p>
              <p className="mt-1 text-xs text-gray-600">Uses RSI, ATR, Volume & Momentum indicators</p>
            </>
          ) : (
            <>
              <p>⚠️ No cryptocurrency available in this championship</p>
              <p className="mt-2 text-xs">This scanner requires crypto tickers (e.g., BTCUSD, ETHUSD)</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};
