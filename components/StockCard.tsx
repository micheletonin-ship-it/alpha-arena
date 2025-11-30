
import React, { useMemo } from 'react';
import { Stock, Theme } from '../types';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface StockCardProps {
  stock: Stock;
  theme?: Theme;
  onTrade?: (stock: Stock, type: 'buy' | 'sell') => void;
}

export const StockCard: React.FC<StockCardProps> = ({ stock, theme = 'dark', onTrade }) => {
  const isPositive = stock.changePercent >= 0;

  // Compact sparkline dimensions
  const width = 120;
  const height = 40;

  const sparklinePath = useMemo(() => {
    const points = [];
    const totalPoints = 10;
    
    // Start/End points based on trend
    const startY = isPositive ? height * 0.8 : height * 0.2;
    const endY = isPositive ? height * 0.2 : height * 0.8;
    
    points.push(`0,${startY}`);
    
    for (let i = 1; i < totalPoints - 1; i++) {
        const x = (i / (totalPoints - 1)) * width;
        const trendY = startY + (endY - startY) * (i / (totalPoints - 1));
        const seed = stock.symbol.charCodeAt(i % stock.symbol.length) % 10;
        const randomness = (seed - 5) * (height * 0.15); 
        const y = Math.max(5, Math.min(height - 5, trendY + randomness));
        points.push(`${x},${y}`);
    }
    
    points.push(`${width},${endY}`);
    return `M ${points.join(' L ')}`;
  }, [stock.symbol, isPositive, stock.price]);

  return (
    <div className={`group relative flex items-center justify-between gap-4 rounded-xl border p-3 transition-all duration-200 hover:shadow-lg ${
        theme === 'dark' 
        ? 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10' 
        : 'border-gray-100 bg-white hover:border-gray-200'
    }`}>
      
      {/* 1. Symbol & Name */}
      <div className="flex w-32 shrink-0 flex-col">
        <div className="flex items-center gap-2">
            <h3 className={`font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stock.symbol}
            </h3>
            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${theme === 'dark' ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                NAS
            </span>
        </div>
        <span className="truncate text-xs text-gray-500 dark:text-gray-400">
            {stock.name}
        </span>
      </div>

      {/* 2. Inline Chart (Hidden on small mobile) */}
      <div className="hidden h-10 flex-1 items-center justify-center px-4 sm:flex opacity-50 group-hover:opacity-100 transition-opacity">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full max-w-[120px] overflow-visible">
            <path
              d={sparklinePath}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isPositive ? 'text-green-500 dark:text-neonGreen' : 'text-red-500 dark:text-mutedRed'}
            />
        </svg>
      </div>

      {/* 3. Price & Stats */}
      <div className="flex w-32 flex-col items-end justify-center">
         <span className={`font-mono font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            ${stock.price.toFixed(2)}
         </span>
         <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-green-500 dark:text-neonGreen' : 'text-red-500 dark:text-mutedRed'}`}>
            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {isPositive ? '+' : ''}{stock.changePercent}%
         </div>
      </div>

      {/* 4. Actions (Hover or Visible based on space) */}
      <div className="flex gap-2">
         <button 
            onClick={() => onTrade && onTrade(stock, 'buy')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                theme === 'dark' 
                ? 'bg-neonGreen/10 text-neonGreen hover:bg-neonGreen hover:text-black' 
                : 'bg-gray-100 text-gray-900 hover:bg-black hover:text-white'
            }`}
         >
            Buy
         </button>
         <button 
            onClick={() => onTrade && onTrade(stock, 'sell')}
            className={`hidden sm:block rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                theme === 'dark' 
                ? 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white' 
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
         >
            Sell
         </button>
      </div>

    </div>
  );
};