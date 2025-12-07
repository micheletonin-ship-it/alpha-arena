import React, { useState, useEffect } from 'react';
import { Theme, Stock, Holding, AlpacaPosition } from '../types';
import { TrendingUp, TrendingDown, DollarSign, ExternalLink, AlertCircle, Trophy, BarChart3, Clock } from 'lucide-react';
import * as alpacaTradingService from '../services/alpacaTradingService';
import * as db from '../services/database';

interface PersonalMarketOverviewProps {
  theme: Theme;
  marketData: Stock[];
  holdings: Holding[];
  userId: string;
  onTrade: (stock: Stock, type: 'buy' | 'sell') => void;
}

export const PersonalMarketOverview: React.FC<PersonalMarketOverviewProps> = ({ 
  theme, 
  marketData, 
  holdings,
  userId,
  onTrade 
}) => {
  const [alpacaPositions, setAlpacaPositions] = useState<AlpacaPosition[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load Alpaca positions on mount
  useEffect(() => {
    loadAlpacaPositions();
  }, [userId]);

  const loadAlpacaPositions = async () => {
    setIsLoadingPositions(true);
    setErrorMessage(null);

    try {
      // Get decrypted credentials from database
      const credentials = await db.getAlpacaCredentials(userId);
      
      if (!credentials.key || !credentials.secret) {
        setErrorMessage('Alpaca credentials not configured. Please add them in Settings.');
        setIsLoadingPositions(false);
        return;
      }

      const positions = await alpacaTradingService.getPositions(credentials.key, credentials.secret);
      setAlpacaPositions(positions);
    } catch (error: any) {
      console.error('Error loading Alpaca positions:', error);
      setErrorMessage(error.message || 'Failed to load positions from Alpaca');
    } finally {
      setIsLoadingPositions(false);
    }
  };

  // Calculate market movers (top gainers and losers)
  const marketMovers = React.useMemo(() => {
    const sorted = [...marketData].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
    const gainers = sorted.filter(s => s.changePercent > 0).slice(0, 5);
    const losers = sorted.filter(s => s.changePercent < 0).slice(0, 5);
    return { gainers, losers };
  }, [marketData]);

  const getGoogleFinanceUrl = (symbol: string) => {
    if (symbol.includes('-USD')) {
      return `https://www.google.com/finance/quote/${symbol}`;
    }
    const nyseStocks = ['JPM', 'BAC', 'WFC', 'GS', 'C', 'XOM', 'CVX', 'KO', 'PG', 'WMT', 'HD', 'BA', 'CAT', 'GE'];
    const exchange = nyseStocks.includes(symbol) ? 'NYSE' : 'NASDAQ';
    return `https://www.google.com/finance/quote/${symbol}:${exchange}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Market Overview
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <BarChart3 size={16} className="text-blue-400"/>
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Real-time data from Alpaca • Personal Portfolio
            </span>
          </div>
        </div>
        
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
          <Clock size={14} className="text-blue-400" />
          <span className="text-xs font-medium">Live Market Data</span>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${theme === 'dark' ? 'border-red-500/20 bg-red-500/10' : 'border-red-200 bg-red-50'}`}>
          <AlertCircle size={20} className="text-red-400 mt-0.5" />
          <div>
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Unable to Load Positions
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className={`flex items-start gap-3 p-4 rounded-xl border ${theme === 'dark' ? 'border-blue-500/20 bg-blue-500/10' : 'border-blue-200 bg-blue-50'}`}>
        <Trophy size={20} className="text-blue-400 mt-0.5" />
        <div>
          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            💡 Looking for AI-Powered Trading Suggestions?
          </p>
          <p className="text-xs text-gray-500 mt-1">
            The AI Scanner is available in <strong>Championships</strong>. Join a championship to get daily AI-analyzed trading opportunities!
          </p>
        </div>
      </div>

      {/* Your Holdings Performance */}
      <div className={`overflow-hidden rounded-2xl border ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'}`}>
        <div className="border-b border-gray-100 dark:border-white/5 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            🔥 Your Holdings Performance
          </h3>
          <p className="text-xs text-gray-500 mt-1">Live positions from your Alpaca account</p>
        </div>
        
        <div className="p-6">
          {isLoadingPositions ? (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-4 text-sm">Loading your positions from Alpaca...</p>
            </div>
          ) : alpacaPositions.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <DollarSign size={48} className="mx-auto mb-4 opacity-20"/>
              <p>No active positions in your Alpaca account.</p>
              <p className="text-xs mt-2">Start trading in the Market tab!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alpacaPositions.map((position) => {
                const unrealizedPL = parseFloat(position.unrealized_pl);
                const unrealizedPLPercent = parseFloat(position.unrealized_plpc) * 100;
                const currentPrice = parseFloat(position.current_price);
                const quantity = parseFloat(position.qty);
                const marketValue = parseFloat(position.market_value);
                
                return (
                  <div 
                    key={position.symbol} 
                    className={`p-4 rounded-xl border transition-all hover:shadow-md ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {position.symbol}
                          </span>
                          <a 
                            href={getGoogleFinanceUrl(position.symbol)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`transition-colors hover:scale-110 ${theme === 'dark' ? 'text-gray-400 hover:text-neonGreen' : 'text-gray-500 hover:text-blue-600'}`}
                            title="View on Google Finance"
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <div className="text-gray-500">
                            <span className="text-xs">Quantity:</span>
                            <span className={`ml-2 font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {quantity.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-gray-500">
                            <span className="text-xs">Price:</span>
                            <span className={`ml-2 font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              ${currentPrice.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-gray-500">
                            <span className="text-xs">Market Value:</span>
                            <span className={`ml-2 font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              ${marketValue.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-gray-500">
                            <span className="text-xs">Entry:</span>
                            <span className={`ml-2 font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              ${parseFloat(position.avg_entry_price).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right ml-4">
                        <div className={`text-lg font-bold flex items-center gap-1 ${unrealizedPL >= 0 ? 'text-green-600 dark:text-neonGreen' : 'text-red-600 dark:text-mutedRed'}`}>
                          {unrealizedPL >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                          {unrealizedPL >= 0 ? '+' : ''}${unrealizedPL.toFixed(2)}
                        </div>
                        <div className={`text-sm ${unrealizedPL >= 0 ? 'text-green-600 dark:text-neonGreen' : 'text-red-600 dark:text-mutedRed'}`}>
                          {unrealizedPLPercent >= 0 ? '+' : ''}{unrealizedPLPercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Market Movers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Gainers */}
        <div className={`overflow-hidden rounded-2xl border ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'}`}>
          <div className="border-b border-gray-100 dark:border-white/5 p-6">
            <h3 className="text-lg font-semibold text-green-600 dark:text-neonGreen flex items-center gap-2">
              <TrendingUp size={20} />
              Top Gainers
            </h3>
            <p className="text-xs text-gray-500 mt-1">Stocks with highest gains today</p>
          </div>
          
          <div className="p-4 space-y-2">
            {marketMovers.gainers.length === 0 ? (
              <p className="text-center text-gray-500 py-8 text-sm">No gainers available</p>
            ) : (
              marketMovers.gainers.map((stock) => (
                <div 
                  key={stock.symbol}
                  className={`p-3 rounded-lg border transition-all hover:shadow-md ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {stock.symbol}
                      </span>
                      <a 
                        href={getGoogleFinanceUrl(stock.symbol)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`transition-colors hover:scale-110 ${theme === 'dark' ? 'text-gray-400 hover:text-neonGreen' : 'text-gray-500 hover:text-blue-600'}`}
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        ${stock.price.toFixed(2)}
                      </span>
                      <span className="text-green-600 dark:text-neonGreen font-bold">
                        +{stock.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{stock.name}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Losers */}
        <div className={`overflow-hidden rounded-2xl border ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'}`}>
          <div className="border-b border-gray-100 dark:border-white/5 p-6">
            <h3 className="text-lg font-semibold text-red-600 dark:text-mutedRed flex items-center gap-2">
              <TrendingDown size={20} />
              Top Losers
            </h3>
            <p className="text-xs text-gray-500 mt-1">Stocks with biggest drops today</p>
          </div>
          
          <div className="p-4 space-y-2">
            {marketMovers.losers.length === 0 ? (
              <p className="text-center text-gray-500 py-8 text-sm">No losers available</p>
            ) : (
              marketMovers.losers.map((stock) => (
                <div 
                  key={stock.symbol}
                  className={`p-3 rounded-lg border transition-all hover:shadow-md ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {stock.symbol}
                      </span>
                      <a 
                        href={getGoogleFinanceUrl(stock.symbol)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`transition-colors hover:scale-110 ${theme === 'dark' ? 'text-gray-400 hover:text-neonGreen' : 'text-gray-500 hover:text-blue-600'}`}
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        ${stock.price.toFixed(2)}
                      </span>
                      <span className="text-red-600 dark:text-mutedRed font-bold">
                        {stock.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{stock.name}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
