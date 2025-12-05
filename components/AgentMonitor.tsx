

import React, { useState, useEffect } from 'react';
import { Theme, Strategy, Holding, Stock, AgentLog, User } from '../types';
import * as db from '../services/database';
import { Bot, Terminal, RefreshCw, Target, BrainCircuit } from 'lucide-react';

interface AgentMonitorProps {
  theme: Theme;
  user: User;
  strategies: Strategy[]; // Need all strategies to lookup per holding
  holdings: Holding[]; // Holdings passed are already filtered by App.tsx
  marketData: Stock[];
  activeStrategy: Strategy | null; // Global default fallback
  championshipId: string; // UPDATED: now mandatory string
}

export const AgentMonitor: React.FC<AgentMonitorProps> = ({ theme, user, strategies, activeStrategy, holdings, marketData, championshipId }) => {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  
  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, [user.id, championshipId]); // Add championshipId to dependencies

  const loadLogs = async () => {
      if(user) {
        const agentLogs = await db.getAgentLogs(user.id, championshipId); // Pass mandatory championshipId
        setLogs(agentLogs);
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="flex items-center justify-between">
            <div>
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Agent Monitor</h2>
                <div className="flex items-center gap-2 mt-1">
                    <Bot size={16} className="text-neonGreen"/>
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        Multi-Strategy Agent Active
                    </span>
                </div>
            </div>
            
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
                <span className={`h-2 w-2 rounded-full ${user.autoTradingEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                <span className="text-xs font-bold uppercase">{user.autoTradingEnabled ? 'Agent Active' : 'Agent Paused'}</span>
            </div>
        </div>

        {/* Live Observation Deck */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {holdings.map(holding => { // holdings are already filtered by App.tsx
                const liveStock = marketData.find(s => s.symbol === holding.symbol);
                const currentPrice = liveStock ? liveStock.price : holding.avgPrice;
                const peakPrice = Math.max(holding.peakPrice || 0, currentPrice);
                
                // FIND STRATEGY FOR THIS HOLDING
                const holdingStrategy = strategies.find(s => s.id === holding.strategyId) || activeStrategy;

                if (!holdingStrategy) {
                    return <div key={holding.symbol} className="p-4 text-red-500 border border-red-500 rounded-xl">Strategy Missing for {holding.symbol}</div>
                }

                // Calculations based on SPECIFIC Strategy
                const stopLossPrice = holding.avgPrice * (1 - holdingStrategy.stopLossPercentage / 100);
                const distToStopLoss = ((currentPrice - stopLossPrice) / currentPrice) * 100;
                
                const currentDropFromPeak = ((peakPrice - currentPrice) / peakPrice) * 100;
                const currentGain = ((currentPrice - holding.avgPrice) / holding.avgPrice) * 100;
                
                // Calculate absolute performance in dollars
                const absolutePerformance = (currentPrice - holding.avgPrice) * holding.quantity;

                // Determine closest trigger
                let activeTier = null;
                const tiers = [...holdingStrategy.takeProfitTiers].sort((a, b) => b.gainThreshold - a.gainThreshold);
                for(const tier of tiers) {
                    if (currentGain >= tier.gainThreshold) {
                        activeTier = tier;
                        break;
                    }
                }

                return (
                    <div key={holding.symbol} className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{holding.symbol}</h3>
                                <p className="text-xs text-gray-500">Avg: ${holding.avgPrice.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} • Current: ${currentPrice.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                            <div className={`text-right font-mono ${absolutePerformance >= 0 ? 'text-neonGreen' : 'text-red-500'}`}>
                                <div className="text-lg font-bold">{absolutePerformance >= 0 ? '+' : ''}${absolutePerformance.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                <div className="text-xs">{currentGain > 0 ? '+' : ''}{currentGain.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</div>
                            </div>
                        </div>

                        {/* Strategy Badge */}
                        <div className="mb-4 flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-gray-400 bg-black/20 w-fit px-2 py-1 rounded-lg">
                            <BrainCircuit size={12} /> {holdingStrategy.name}
                        </div>

                        {/* Visualizers */}
                        <div className="space-y-4">
                            {/* STOP LOSS TRACKER */}
                            <div>
                                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                    <span>Stop Loss (${stopLossPrice.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                                    <span className={distToStopLoss < 2 ? 'text-red-500 font-bold' : ''}>{distToStopLoss.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% cushion</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                                    {/* Only show bar if price is above stop loss */}
                                    <div 
                                        className={`h-full rounded-full ${distToStopLoss < 2 ? 'bg-red-500' : 'bg-gray-400'}`}
                                        style={{ width: `${Math.min(100, Math.max(0, distToStopLoss * 5))}%` }} 
                                    ></div>
                                </div>
                            </div>

                            {/* TRAILING STOP TRACKER */}
                            <div>
                                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                    <span className="flex items-center gap-1"><Target size={10}/> Trailing Stop</span>
                                    {activeTier ? (
                                        <span className="text-yellow-500">Active: Drop &gt; {activeTier.trailingDrop}%</span>
                                    ) : (
                                        <span>Inactive (Gain &lt; {tiers[tiers.length-1]?.gainThreshold}%)</span>
                                    )}
                                </div>
                                {activeTier && (
                                    <div className="relative h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${currentDropFromPeak >= activeTier.trailingDrop ? 'bg-red-600' : 'bg-yellow-500'}`}
                                            style={{ width: `${Math.min(100, (currentDropFromPeak / activeTier.trailingDrop) * 100)}%` }}
                                        ></div>
                                    </div>
                                )}
                                {activeTier && (
                                    <div className="text-[10px] text-right mt-1 text-gray-400">
                                        Current Drop: {currentDropFromPeak.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% / Limit: {activeTier.trailingDrop}%
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
            {holdings.length === 0 && (
                <div className="col-span-full p-8 text-center text-gray-500 border border-dashed border-gray-700 rounded-xl">
                    No active holdings to monitor.
                </div>
            )}
        </div>

        {/* Decision Log Terminal */}
        <div className={`rounded-2xl border overflow-hidden ${theme === 'dark' ? 'border-white/10 bg-black/40' : 'border-gray-200 bg-gray-50'}`}>
             <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/10">
                 <div className="flex items-center gap-3">
                     <Terminal size={20} className={theme === 'dark' ? 'text-neonGreen' : 'text-black'}/>
                     <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Agent Logic Terminal</h3>
                 </div>
                 <button onClick={loadLogs} className="p-2 rounded-lg hover:bg-white/10"><RefreshCw size={16} className="text-gray-500"/></button>
             </div>
             
             <div className="h-64 overflow-y-auto bg-black p-4 font-mono text-xs">
                 {logs.length === 0 ? (
                     <div className="flex h-full items-center justify-center text-gray-600">
                         Waiting for agent activity...
                     </div>
                 ) : (
                     <table className="w-full text-left text-gray-300">
                         <thead>
                             <tr className="text-gray-500 border-b border-gray-800">
                                 <th className="pb-2 pl-2">TIME</th>
                                 <th className="pb-2">SYMBOL</th>
                                 <th className="pb-2">ACTION</th>
                                 <th className="pb-2">STRATEGY</th>
                                 <th className="pb-2">REASON / DETAILS</th>
                             </tr>
                         </thead>
                         <tbody>
                             {logs.map(log => (
                                 <tr key={log.id} className="border-b border-gray-900/50 hover:bg-white/5 transition-colors">
                                     <td className="py-2 pl-2 text-gray-500">{new Date(log.date).toLocaleTimeString()}</td>
                                     <td className="py-2 font-bold text-white">{log.symbol}</td>
                                     <td className="py-2"><span className="text-red-500">{log.action}</span> @ ${log.price.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                     <td className="py-2 text-blue-400">{log.strategyName?.replace('strat_', '')}</td>
                                     <td className="py-2 text-gray-400">{log.details}</td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 )}
             </div>
        </div>
    </div>
  );
};
