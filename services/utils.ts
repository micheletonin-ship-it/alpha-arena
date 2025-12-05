/**
 * Utility functions shared across the application
 */

import { Transaction } from '../types';

/**
 * Generate deterministic avatar colors based on user ID
 * This ensures each user has consistent, unique colors across all app components
 */
export const getUserColor = (userId: string): { from: string, to: string } => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colorPairs = [
    { from: 'from-purple-500', to: 'to-indigo-500' },
    { from: 'from-pink-500', to: 'to-rose-500' },
    { from: 'from-blue-500', to: 'to-cyan-500' },
    { from: 'from-green-500', to: 'to-emerald-500' },
    { from: 'from-orange-500', to: 'to-amber-500' },
    { from: 'from-red-500', to: 'to-pink-500' },
    { from: 'from-violet-500', to: 'to-purple-500' },
    { from: 'from-teal-500', to: 'to-cyan-500' },
    { from: 'from-fuchsia-500', to: 'to-pink-500' },
    { from: 'from-lime-500', to: 'to-green-500' },
  ];
  
  const index = Math.abs(hash) % colorPairs.length;
  return colorPairs[index];
};

/**
 * Calculate Realized P/L from transactions using chronological FIFO method
 * This method processes transactions in time order and tracks the cost basis
 * as positions are opened and closed.
 * 
 * @param transactions - Array of transactions to analyze
 * @returns Total realized profit/loss from closed positions
 */
export const calculateRealizedPL = (transactions: Transaction[]): number => {
  // Track position data for realized P/L calculation
  const positionTracker: Record<string, { totalBought: number; totalCost: number; avgBuyPrice: number }> = {};
  let realizedPL = 0;

  // Sort transactions by date to process in chronological order
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  sortedTransactions.forEach(tx => {
    const amount = Number(tx.amount) || 0;
    const quantity = Number(tx.quantity) || 0;
    const price = Number(tx.price) || 0;
    
    if (tx.type === 'buy' && tx.symbol) {
      // Track position for realized P/L calculation
      if (!positionTracker[tx.symbol]) {
        positionTracker[tx.symbol] = { totalBought: 0, totalCost: 0, avgBuyPrice: 0 };
      }
      positionTracker[tx.symbol].totalBought += quantity;
      positionTracker[tx.symbol].totalCost += amount;
      positionTracker[tx.symbol].avgBuyPrice = positionTracker[tx.symbol].totalCost / positionTracker[tx.symbol].totalBought;
      
    } else if (tx.type === 'sell' && tx.symbol) {
      // Calculate realized P/L for this sell
      if (positionTracker[tx.symbol]) {
        const avgBuyPrice = positionTracker[tx.symbol].avgBuyPrice;
        const profit = (price - avgBuyPrice) * quantity;
        realizedPL += profit;
        
        // Update position tracker
        positionTracker[tx.symbol].totalBought -= quantity;
        positionTracker[tx.symbol].totalCost -= avgBuyPrice * quantity;
        
        // Update average if there are still shares left
        if (positionTracker[tx.symbol].totalBought > 0) {
          positionTracker[tx.symbol].avgBuyPrice = positionTracker[tx.symbol].totalCost / positionTracker[tx.symbol].totalBought;
        }
      }
    }
  });

  return realizedPL;
};
