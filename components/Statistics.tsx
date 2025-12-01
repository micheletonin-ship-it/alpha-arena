

import React, { useMemo } from 'react';
import { Theme, User, Holding, Stock, Transaction } from '../types';
import { LineChart, BarChart2, TrendingUp, TrendingDown, DollarSign, Wallet, ArrowUpRight, ArrowDownLeft, PieChart } from 'lucide-react';

interface StatisticsProps {
  theme: Theme;
  user: User;
  holdings: Holding[]; // Holdings passed are already filtered by App.tsx
  marketData: Stock[];
  transactions: Transaction[]; // Transactions passed are already filtered by App.tsx
  championshipId: string; // UPDATED: now mandatory string
}

export const Statistics: React.FC<StatisticsProps> = ({ theme, user, holdings, marketData, transactions, championshipId }) => {
  const stats = useMemo(() => {
    let totalAssetValue = 0;
    let totalCostBasis = 0;
    let dailyPL = 0;
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalBuyValue = 0;
    let totalSellValue = 0;

    // Filter holdings and transactions based on championshipId passed from App.tsx
    // These props are already filtered by App.tsx, no need to filter again.
    const enrichedHoldings = holdings.map(holding => {
      const liveStock = marketData.find(s => s.symbol === holding.symbol);
      const currentPrice = liveStock ? liveStock.price : holding.avgPrice;
      const dayChangePercent = liveStock ? liveStock.changePercent : 0;

      const currentValue = currentPrice * holding.quantity;
      const costBasis = holding.avgPrice * holding.quantity;
      const totalReturn = currentValue - costBasis;
      const returnPercent = costBasis > 0 ? (totalReturn / costBasis) * 100 : 0;
      
      // Calculate today's rough P/L
      const prevCloseValue = currentValue / (1 + (dayChangePercent / 100));
      const dayChangeAmount = currentValue - prevCloseValue;

      totalAssetValue += currentValue;
      totalCostBasis += costBasis;
      dailyPL += dayChangeAmount;

      return {
        ...holding,
        currentPrice,
        currentValue,
        totalReturn,
        returnPercent,
        dayChangePercent
      };
    });

    // DEBUG: Log transactions to identify duplicates
    console.log('=== STATISTICS DEBUG ===');
    console.log('Total transactions received:', transactions.length);
    console.log('Transactions:', transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        symbol: t.symbol,
        date: t.date.substring(0, 10)
    })));
    
    transactions.forEach(tx => {
        const amount = Number(tx.amount) || 0; // Ensure it's a number
        
        if (tx.type === 'deposit') {
            totalDeposits += amount;
        } else if (tx.type === 'withdrawal') {
            totalWithdrawals += amount;
        } else if (tx.type === 'buy') {
            totalBuyValue += amount;
            console.log(`BUY: ${tx.symbol} - $${amount} (running total: $${totalBuyValue})`);
        } else if (tx.type === 'sell') {
            totalSellValue += amount;
            console.log(`SELL: ${tx.symbol} - $${amount} (running total: $${totalSellValue})`);
        }
    });
    
    console.log('Final totals:');
    console.log('- Deposits:', totalDeposits);
    console.log('- Withdrawals:', totalWithdrawals);
    console.log('- Buy Value:', totalBuyValue);
    console.log('- Sell Value:', totalSellValue);

    const totalPortfolioReturn = totalAssetValue - totalCostBasis;
    const totalPortfolioReturnPercent = totalCostBasis > 0 ? (totalPortfolioReturn / totalCostBasis) * 100 : 0;
    
    // Cash balance is not calculated here, assume it's passed or derived elsewhere.
    // For this context, we focus on portfolio performance.

    return {
      totalAssetValue,
      totalCostBasis,
      dailyPL,
      totalPortfolioReturn,
      totalPortfolioReturnPercent,
      totalDeposits,
      totalWithdrawals,
      totalBuyValue,
      totalSellValue,
      enrichedHoldings
    };
  }, [holdings, marketData, transactions, championshipId]);

  const isDailyPLPositive = stats.dailyPL >= 0;
  const isTotalReturnPositive = stats.totalPortfolioReturn >= 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Investment Statistics</h2>
      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
        Detailed insights into your portfolio performance and trading activity.
      </p>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Asset Value */}
        <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Asset Value</p>
              <h3 className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                ${stats.totalAssetValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <Wallet size={24} className="text-blue-500" />
          </div>
        </div>

        {/* Daily P/L */}
        <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Today's Profit/Loss</p>
              <h3 className={`text-2xl font-bold mt-1 ${isDailyPLPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isDailyPLPositive ? '+' : ''}${stats.dailyPL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
            </div>
            {isDailyPLPositive ? <TrendingUp size={24} className="text-green-500" /> : <TrendingDown size={24} className="text-red-500" />}
          </div>
        </div>

        {/* Total Portfolio Return */}
        <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Portfolio Return</p>
              <h3 className={`text-2xl font-bold mt-1 ${isTotalReturnPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isTotalReturnPositive ? '+' : ''}${stats.totalPortfolioReturn.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <p className={`text-xs ${isTotalReturnPositive ? 'text-green-500' : 'text-red-500'}`}>
                ({stats.totalPortfolioReturnPercent.toFixed(2)}%)
              </p>
            </div>
            <LineChart size={24} className={isTotalReturnPositive ? 'text-green-500' : 'text-red-500'} />
          </div>
        </div>
      </div>

      {/* Trading Activity Summary */}
      <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-gray-200'}`}>
        <div className="border-b border-gray-100 p-6 dark:border-white/5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Trading Activity</h3>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <p className="text-sm text-gray-500">Total Deposits</p>
                <p className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    ${stats.totalDeposits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
            </div>
            <div>
                <p className="text-sm text-gray-500">Total Withdrawals</p>
                <p className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    ${stats.totalWithdrawals.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
            </div>
            <div>
                <p className="text-sm text-gray-500">Total Buy Value</p>
                <p className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    ${stats.totalBuyValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
            </div>
            <div>
                <p className="text-sm text-gray-500">Total Sell Value</p>
                <p className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    ${stats.totalSellValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
            </div>
        </div>
      </div>

      {/* Holdings Performance Table */}
      <div className={`overflow-hidden rounded-2xl border ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'}`}>
        <div className="border-b border-gray-100 p-6 dark:border-white/5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Individual Holdings Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={`border-b ${theme === 'dark' ? 'border-white/5 bg-white/5 text-gray-400' : 'border-gray-100 bg-gray-50 text-gray-500'}`}>
              <tr>
                <th className="px-6 py-4 font-medium">Asset</th>
                <th className="px-6 py-4 font-medium text-right">Current Value</th>
                <th className="px-6 py-4 font-medium text-right">Cost Basis</th>
                <th className="px-6 py-4 font-medium text-right">Total Return</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {stats.enrichedHoldings.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No active holdings to display statistics.</td></tr>
              ) : (
                stats.enrichedHoldings.map((holding) => (
                  <tr key={holding.symbol} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{holding.symbol}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{holding.name}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-medium text-gray-900 dark:text-white">${holding.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      <div className={`text-xs ${holding.dayChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {holding.dayChangePercent > 0 ? '+' : ''}{holding.dayChangePercent.toFixed(2)}% Today
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-medium text-gray-900 dark:text-white">${(holding.avgPrice * holding.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </td>
                    <td className={`px-6 py-4 text-right ${holding.totalReturn >= 0 ? 'text-green-600 dark:text-neonGreen' : 'text-red-600 dark:text-mutedRed'}`}>
                      <div className="font-bold">{holding.totalReturn >= 0 ? '+' : ''}${holding.totalReturn.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      <div className="text-xs">({holding.returnPercent.toFixed(2)}%)</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
