
import React, { useMemo, useState, useEffect } from 'react';
import { Stock, Holding, Theme, Transaction } from '../types';
import { Wallet, PieChart, ArrowUpRight, ArrowDownRight, DollarSign, ExternalLink } from 'lucide-react';
import * as db from '../services/database';
import { calculateRealizedPL } from '../services/utils';

interface PortfolioProps {
  marketData: Stock[];
  theme: Theme;
  holdings: Holding[]; // Holdings passed are already filtered by App.tsx
  onTrade: (stock: Holding, type: 'buy' | 'sell') => void;
  userBalance: number; // Now represents buying power directly
  externalTotalEquity?: number;
  championshipId: string; // UPDATED: now mandatory string
  championshipStatus?: 'pending' | 'active' | 'finished' | 'archived'; // NEW: Track championship status for trading restrictions
  userEmail: string; // NEW: needed to fetch transactions
}

export const Portfolio: React.FC<PortfolioProps> = ({ marketData, theme, holdings, onTrade, userBalance, externalTotalEquity, championshipId, championshipStatus, userEmail }) => {
  
  const [realizedPL, setRealizedPL] = useState(0);

  // Calculate Realized P/L from completed sales using shared utility function
  useEffect(() => {
    const fetchAndCalculateRealizedPL = async () => {
      try {
        const transactions = await db.getTransactions(userEmail, championshipId);
        const realized = calculateRealizedPL(transactions);
        setRealizedPL(realized);
      } catch (error) {
        console.error('Error calculating realized P/L:', error);
      }
    };
    
    fetchAndCalculateRealizedPL();
  }, [userEmail, championshipId]);
  
  // Generate Google Finance URL
  const getGoogleFinanceUrl = (symbol: string) => {
    // Check if it's a crypto ticker (contains -USD)
    if (symbol.includes('-USD')) {
      return `https://www.google.com/finance/quote/${symbol}`;
    }
    // For regular stocks, determine exchange
    const nyseStocks = ['JPM', 'BAC', 'WFC', 'GS', 'C', 'XOM', 'CVX', 'KO', 'PG', 'WMT', 'HD', 'BA', 'CAT', 'GE'];
    const exchange = nyseStocks.includes(symbol) ? 'NYSE' : 'NASDAQ';
    return `https://www.google.com/finance/quote/${symbol}:${exchange}`;
  };

  const portfolioStats = useMemo(() => {
    let totalAssetValue = 0;
    let totalCost = 0;
    let dayChangeTotal = 0;
    
    // The 'holdings' prop is already filtered by App.tsx based on championshipId.
    // No need to filter again here.
    const enrichedHoldings = holdings.map(holding => {
      // Find real-time price or fallback to avgPrice if not loaded yet
      const liveStock = marketData.find(s => s.symbol === holding.symbol);
      const currentPrice = liveStock ? liveStock.price : holding.avgPrice;
      const dayChangePercent = liveStock ? liveStock.changePercent : 0;
      
      // Use live name if available (e.g. from Market Data which has full names)
      const displayName = liveStock ? liveStock.name : holding.name;

      const currentValue = currentPrice * holding.quantity;
      const costBasis = holding.avgPrice * holding.quantity;
      const totalReturn = currentValue - costBasis;
      const returnPercent = costBasis > 0 ? (totalReturn / costBasis) * 100 : 0;
      
      // FIXED: Calculate today's P/L more accurately
      // If dayChangePercent is 0 or very small, use totalReturn as proxy (likely bought today)
      // Otherwise calculate based on previous close price
      let dayChangeAmount = 0;
      
      if (Math.abs(dayChangePercent) < 0.01) {
        // Very small price movement or no data - assume position opened today
        // Today's P/L = all unrealized gain/loss
        dayChangeAmount = totalReturn;
      } else {
        // Calculate previous close price from dayChangePercent
        // Formula: prevClose = currentPrice / (1 + changePercent/100)
        const prevClosePrice = currentPrice / (1 + (dayChangePercent / 100));
        // Today's P/L = (currentPrice - prevClosePrice) * quantity
        dayChangeAmount = (currentPrice - prevClosePrice) * holding.quantity;
      }

      totalAssetValue += currentValue;
      totalCost += costBasis;
      dayChangeTotal += dayChangeAmount;

      return {
        ...holding,
        name: displayName,
        currentPrice,
        currentValue,
        totalReturn,
        returnPercent,
        dayChangePercent
      };
    });

    const totalReturn = totalAssetValue - totalCost;
    const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;

    // Use external equity (e.g. from Alpaca) if available, otherwise calculate from local state
    const totalNetWorth = externalTotalEquity !== undefined ? externalTotalEquity : (totalAssetValue + userBalance);

    return {
      totalAssetValue,
      totalNetWorth, // Combine Cash + Assets or use external source
      totalReturn,
      totalReturnPercent,
      dayChangeTotal,
      holdings: enrichedHoldings
    };
  }, [marketData, holdings, userBalance, externalTotalEquity, championshipId]); // Keep championshipId as dependency for consistency

  const isPositive = portfolioStats.totalReturn >= 0;
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Championship Finished Banner */}
      {championshipStatus === 'finished' && (
        <div className={`rounded-xl border p-4 ${theme === 'dark' ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2 ${theme === 'dark' ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
              <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 7a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm0 4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm0 4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-orange-400' : 'text-orange-700'}`}>
                🏁 Championship Finished
              </h3>
              <p className={`text-xs ${theme === 'dark' ? 'text-orange-300/80' : 'text-orange-600'}`}>
                Trading is disabled. This championship has ended. View the final leaderboard in the Championships tab.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1">
        {/* Total Net Worth Card (Cash + Assets) - Full Width */}
        <div className={`relative overflow-hidden rounded-2xl p-8 ${theme === 'dark' ? 'bg-gradient-to-br from-neonGreen/10 to-blue-500/5 border border-white/10' : 'bg-gradient-to-br from-green-50 to-blue-50 border border-gray-200'}`}>
           <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Net Worth</p>
                <h2 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                  ${portfolioStats.totalNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><DollarSign size={10}/> Cash: <span className="font-semibold text-gray-900 dark:text-white">${userBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                    <span className="h-3 w-px bg-gray-300 dark:bg-white/20"></span>
                    <span className="flex items-center gap-1"><PieChart size={10}/> Assets: <span className="font-semibold text-gray-900 dark:text-white">${portfolioStats.totalAssetValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                </div>
              </div>
              <div className={`rounded-full p-3 ${theme === 'dark' ? 'bg-white/5 text-neonGreen' : 'bg-white text-green-600 shadow-sm'}`}>
                <Wallet size={24} />
              </div>
           </div>
           
           {/* Scrollable metrics section for mobile */}
           <div className="mt-6 border-t pt-4 dark:border-white/5 border-gray-200/50 overflow-x-auto -mx-2 px-2">
              <div className="flex items-center gap-6 min-w-max">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Total Return (Unrealized)</span>
                  <div className={`flex items-center gap-1 text-lg font-semibold ${isPositive ? 'text-green-600 dark:text-neonGreen' : 'text-red-600 dark:text-mutedRed'}`}>
                    {isPositive ? '+' : ''}${portfolioStats.totalReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    <span className="text-sm">({portfolioStats.totalReturnPercent.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)</span>
                  </div>
                </div>
                <div className="h-8 w-px bg-gray-200 dark:bg-white/10"></div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Realized P/L</span>
                  <div className={`flex items-center gap-1 text-lg font-semibold ${realizedPL >= 0 ? 'text-green-600 dark:text-neonGreen' : 'text-red-600 dark:text-mutedRed'}`}>
                    {realizedPL >= 0 ? '+' : ''}${realizedPL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="h-8 w-px bg-gray-200 dark:bg-white/10"></div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Today's P/L</span>
                  <div className={`flex items-center gap-1 text-lg font-semibold ${portfolioStats.dayChangeTotal >= 0 ? 'text-green-600 dark:text-neonGreen' : 'text-red-600 dark:text-mutedRed'}`}>
                    {portfolioStats.dayChangeTotal >= 0 ? <ArrowUpRight size={16}/> : <ArrowDownRight size={16}/>}
                    {portfolioStats.dayChangeTotal >= 0 ? '+' : '-'}${Math.abs(portfolioStats.dayChangeTotal).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
           </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className={`overflow-hidden rounded-2xl border ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'}`}>
        <div className="border-b border-gray-100 p-6 dark:border-white/5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Assets</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={`border-b ${theme === 'dark' ? 'border-white/5 bg-white/5 text-gray-400' : 'border-gray-100 bg-gray-50 text-gray-500'}`}>
              <tr>
                <th className="px-6 py-4 font-medium">Asset</th>
                <th className="px-6 py-4 font-medium text-right">Price</th>
                <th className="px-6 py-4 font-medium text-right">Balance</th>
                <th className="px-6 py-4 font-medium text-right">Value</th>
                <th className="px-6 py-4 font-medium text-right">Return</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {portfolioStats.holdings.map((holding) => (
                <tr key={holding.symbol} className="group transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg font-bold text-white ${['bg-blue-500', 'bg-purple-500', 'bg-neonGreen text-black', 'bg-orange-500'][portfolioStats.holdings.indexOf(holding) % 4]}`}>
                        {holding.symbol[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">{holding.symbol}</span>
                          <a 
                            href={getGoogleFinanceUrl(holding.symbol)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`transition-colors hover:scale-110 ${theme === 'dark' ? 'text-gray-400 hover:text-neonGreen' : 'text-gray-500 hover:text-blue-600'}`}
                            title="View on Google Finance"
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{holding.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-medium text-gray-900 dark:text-white">${holding.currentPrice.toFixed(2)}</div>
                    <div className={`text-xs ${holding.dayChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {holding.dayChangePercent > 0 ? '+' : ''}{holding.dayChangePercent.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {holding.symbol.includes('-USD') 
                        ? holding.quantity.toLocaleString('it-IT', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
                        : holding.quantity.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                      } Shares
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Avg: ${holding.avgPrice.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-bold text-gray-900 dark:text-white">${holding.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className={`font-medium ${holding.totalReturn >= 0 ? 'text-green-600 dark:text-neonGreen' : 'text-red-600 dark:text-mutedRed'}`}>
                      {holding.totalReturn >= 0 ? '+' : ''}${holding.totalReturn.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <div className={`text-xs ${holding.totalReturn >= 0 ? 'text-green-600 dark:text-neonGreen' : 'text-red-600 dark:text-mutedRed'}`}>
                      {holding.returnPercent.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        <button 
                            onClick={() => onTrade(holding, 'buy')}
                            disabled={championshipStatus === 'finished'}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                              championshipStatus === 'finished' 
                                ? 'opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-600' 
                                : theme === 'dark' 
                                  ? 'bg-neonGreen/10 text-neonGreen hover:bg-neonGreen/20' 
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                        >
                            Buy
                        </button>
                        <button 
                            onClick={() => onTrade(holding, 'sell')}
                            disabled={championshipStatus === 'finished'}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                              championshipStatus === 'finished'
                                ? 'opacity-40 cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-600'
                                : theme === 'dark' 
                                  ? 'bg-mutedRed/10 text-mutedRed hover:bg-mutedRed/20' 
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                        >
                            Sell
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {portfolioStats.holdings.length === 0 && (
             <div className="p-8 text-center text-gray-500">Your portfolio is empty. Start trading to see assets here.</div>
          )}
        </div>
      </div>
    </div>
  );
};
