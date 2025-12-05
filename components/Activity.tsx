

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Theme, Transaction, User } from '../types';
import * as db from '../services/database';
import * as marketService from '../services/marketService';
import { ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';

interface ActivityProps {
  theme: Theme;
  user: User;
  championshipId: string; // UPDATED: now mandatory string
}

export const Activity: React.FC<ActivityProps> = ({ theme, user, championshipId }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [view, setView] = useState<'history' | 'performance'>('history');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch transactions exclusively from the local/Supabase database.
      const localTxs = await db.getTransactions(user.id, championshipId); // Pass mandatory championshipId
      
      // Sort by date descending
      localTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTransactions(localTxs);
    } catch (e) {
        console.error("Activity load error", e);
    } finally {
        setIsLoading(false);
    }
  }, [user.id, championshipId]); // Add championshipId to dependencies

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived Performance Data
  const performanceStats = useMemo(() => {
      const stockPerf: Record<string, { 
          totalBought: number; 
          totalSold: number; 
          buyCost: number; 
          soldValue: number; 
          netQuantity: number;
          trades: number;
      }> = {};

      let totalVolume = 0;
      let totalTrades = 0;

      transactions.forEach(tx => {
          // Filter only trade transactions
          if ((tx.type === 'buy' || tx.type === 'sell') && tx.symbol) {
              totalVolume += tx.amount;
              totalTrades++;
              
              if (!stockPerf[tx.symbol]) {
                  stockPerf[tx.symbol] = { totalBought: 0, totalSold: 0, buyCost: 0, soldValue: 0, netQuantity: 0, trades: 0 };
              }

              stockPerf[tx.symbol].trades++;

              if (tx.type === 'buy') {
                  stockPerf[tx.symbol].totalBought += (tx.quantity || 0);
                  stockPerf[tx.symbol].buyCost += tx.amount;
                  stockPerf[tx.symbol].netQuantity += (tx.quantity || 0);
              } else {
                  stockPerf[tx.symbol].totalSold += (tx.quantity || 0);
                  stockPerf[tx.symbol].soldValue += tx.amount;
                  stockPerf[tx.symbol].netQuantity -= (tx.quantity || 0);
              }
          }
      });

      // Calculate Realized P/L estimation (Avg Buy Price * Sold Qty) vs Sold Value
      const rows = Object.entries(stockPerf).map(([symbol, data]) => {
          const avgBuyPrice = data.totalBought > 0 ? data.buyCost / data.totalBought : 0;
          const estimatedCostOfSoldShares = avgBuyPrice * data.totalSold;
          const realizedPL = data.soldValue - estimatedCostOfSoldShares;
          
          return {
              symbol,
              ...data,
              realizedPL,
              avgBuyPrice
          };
      });

      return {
          stockRows: rows,
          totalVolume,
          totalTrades
      };
  }, [transactions]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                 <p className="text-gray-500 text-sm font-medium">Total Trading Volume</p>
                 <h3 className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                     ${performanceStats.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                 </h3>
             </div>
             <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                 <p className="text-gray-500 text-sm font-medium">Total Executed Trades</p>
                 <h3 className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                     {performanceStats.totalTrades}
                 </h3>
             </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-white/10 pb-1">
            <button 
                onClick={() => setView('history')}
                className={`px-4 py-2 text-sm font-medium transition-colors relative ${view === 'history' ? (theme === 'dark' ? 'text-neonGreen' : 'text-black') : 'text-gray-500'}`}
            >
                Transaction Log
                {view === 'history' && <div className={`absolute bottom-[-5px] left-0 w-full h-0.5 ${theme === 'dark' ? 'bg-neonGreen' : 'bg-black'}`}></div>}
            </button>
            <button 
                onClick={() => setView('performance')}
                className={`px-4 py-2 text-sm font-medium transition-colors relative ${view === 'performance' ? (theme === 'dark' ? 'text-neonGreen' : 'text-black') : 'text-gray-500'}`}
            >
                Stock Performance
                {view === 'performance' && <div className={`absolute bottom-[-5px] left-0 w-full h-0.5 ${theme === 'dark' ? 'bg-neonGreen' : 'bg-black'}`}></div>}
            </button>
        </div>

        {/* Content Area */}
        <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'bg-[#1E1E1E] border-white/10' : 'bg-white border-gray-200'}`}>
            
            {view === 'history' ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className={`border-b ${theme === 'dark' ? 'border-white/5 bg-white/5 text-gray-400' : 'border-gray-100 bg-gray-50 text-gray-500'}`}>
                            <tr>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium">Type</th>
                                <th className="px-6 py-4 font-medium">Asset</th>
                                <th className="px-6 py-4 font-medium text-right">Amount</th>
                                <th className="px-6 py-4 font-medium text-right">Details</th>
                                <th className="px-6 py-4 font-medium text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {isLoading ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading historical data...</td></tr>
                            ) : transactions.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No transactions found.</td></tr>
                            ) : transactions.map(tx => (
                                <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                                        <div className="flex items-center gap-2">
                                            <Clock size={14} className="text-gray-500"/>
                                            {new Date(tx.date).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                            ${tx.type === 'deposit' || tx.type === 'sell' 
                                                ? (theme === 'dark' ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-800')
                                                : (theme === 'dark' ? 'bg-red-500/10 text-red-400' : 'bg-red-100 text-red-800')
                                            }`}>
                                            {tx.type}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {tx.symbol || (tx.type === 'deposit' || tx.type === 'withdrawal' ? 'USD (Cash)' : '-')}
                                    </td>
                                    <td className={`px-6 py-4 text-right font-medium ${
                                        tx.type === 'deposit' || tx.type === 'sell' ? 'text-green-500' : (theme === 'dark' ? 'text-white' : 'text-gray-900')
                                    }`}>
                                        {tx.type === 'deposit' || tx.type === 'sell' ? '+' : '-'}${tx.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-500">
                                        {tx.quantity ? (
                                            tx.symbol?.includes('-USD') 
                                                ? `${tx.quantity.toLocaleString('it-IT', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} @ $${tx.price?.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                : `${tx.quantity.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} @ $${tx.price?.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                        ) : tx.method || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`text-xs ${tx.status === 'completed' ? 'text-gray-500' : 'text-orange-500'}`}>
                                            {tx.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className={`border-b ${theme === 'dark' ? 'border-white/5 bg-white/5 text-gray-400' : 'border-gray-100 bg-gray-50 text-gray-500'}`}>
                            <tr>
                                <th className="px-6 py-4 font-medium">Asset</th>
                                <th className="px-6 py-4 font-medium text-center">Trades</th>
                                <th className="px-6 py-4 font-medium text-right">Avg Buy Price</th>
                                <th className="px-6 py-4 font-medium text-right">Sold Volume</th>
                                <th className="px-6 py-4 font-medium text-right">Realized P/L (Est.)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {performanceStats.stockRows.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No trading activity recorded yet.</td></tr>
                            ) : performanceStats.stockRows.map(row => (
                                <tr key={row.symbol} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-lg">{row.symbol}</div>
                                        <div className="text-xs text-gray-500">Net Holdings: {row.netQuantity.toFixed(2)}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-gray-100 dark:bg-white/10 px-2 py-1 rounded text-xs">{row.trades}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono">
                                        ${row.avgBuyPrice.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        ${row.soldValue.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                    </td>
                                    <td className={`px-6 py-4 text-right font-bold ${row.realizedPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {row.realizedPL >= 0 ? '+' : ''}${row.realizedPL.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    </div>
  );
};
