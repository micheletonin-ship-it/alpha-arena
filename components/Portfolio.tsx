
import React, { useMemo } from 'react';
import { Stock, Holding, Theme } from '../types';
import { Wallet, PieChart, ArrowUpRight, ArrowDownRight, DollarSign } from 'lucide-react';

interface PortfolioProps {
  marketData: Stock[];
  theme: Theme;
  holdings: Holding[]; // Holdings passed are already filtered by App.tsx
  onTrade: (stock: Holding, type: 'buy' | 'sell') => void;
  userBalance: number; // Now represents buying power directly
  externalTotalEquity?: number;
  championshipId: string; // UPDATED: now mandatory string
}

export const Portfolio: React.FC<PortfolioProps> = ({ marketData, theme, holdings, onTrade, userBalance, externalTotalEquity, championshipId }) => {
  
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
      
      // Calculate today's rough P/L
      const prevCloseValue = currentValue / (1 + (dayChangePercent / 100));
      const dayChangeAmount = currentValue - prevCloseValue;

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
                    <span className="flex items-center gap-1"><DollarSign size={10}/> Cash: <span className="font-semibold text-gray-900 dark:text-white">${userBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></span>
                    <span className="h-3 w-px bg-gray-300 dark:bg-white/20"></span>
                    <span className="flex items-center gap-1"><PieChart size={10}/> Assets: <span className="font-semibold text-gray-900 dark:text-white">${portfolioStats.totalAssetValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></span>
                </div>
              </div>
              <div className={`rounded-full p-3 ${theme === 'dark' ? 'bg-white/5 text-neonGreen' : 'bg-white text-green-600 shadow-sm'}`}>
                <Wallet size={24} />
              </div>
           </div>
           
           <div className="mt-6 flex items-center gap-6 border-t pt-4 dark:border-white/5 border-gray-200/50">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Total Return</span>
                <div className={`flex items-center gap-1 text-lg font-semibold ${isPositive ? 'text-green-600 dark:text-neonGreen' : 'text-red-600 dark:text-mutedRed'}`}>
                  {isPositive ? '+' : ''}${portfolioStats.totalReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  <span className="text-sm">({portfolioStats.totalReturnPercent.toFixed(2)}%)</span>
                </div>
              </div>
              <div className="h-8 w-px bg-gray-200 dark:bg-white/10"></div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Today's P/L</span>
                 <div className={`flex items-center gap-1 text-lg font-semibold ${portfolioStats.dayChangeTotal >= 0 ? 'text-green-600 dark:text-neonGreen' : 'text-red-600 dark:text-mutedRed'}`}>
                   {portfolioStats.dayChangeTotal >= 0 ? <ArrowUpRight size={16}/> : <ArrowDownRight size={16}/>}
                   ${Math.abs(portfolioStats.dayChangeTotal).toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
                        <div className="font-semibold text-gray-900 dark:text-white">{holding.symbol}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{holding.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-medium text-gray-900 dark:text-white">${holding.currentPrice.toFixed(2)}</div>
                    <div className={`text-xs ${holding.dayChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {holding.dayChangePercent > 0 ? '+' : ''}{holding.dayChangePercent.toFixed(2)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-medium text-gray-900 dark:text-white">{holding.quantity} Shares</div>
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
                      {holding.returnPercent.toFixed(2)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        <button 
                            onClick={() => onTrade(holding, 'buy')}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${theme === 'dark' ? 'bg-neonGreen/10 text-neonGreen hover:bg-neonGreen/20' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                        >
                            Buy
                        </button>
                        <button 
                            onClick={() => onTrade(holding, 'sell')}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${theme === 'dark' ? 'bg-mutedRed/10 text-mutedRed hover:bg-mutedRed/20' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
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
