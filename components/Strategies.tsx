
import React, { useState, useEffect } from 'react';
import { Theme, Strategy, User, TrailingStopTier } from '../types';
import * as db from '../services/database';
import { Plus, Check, Trash2, Edit2, Shield, TrendingUp, X, Save, AlertTriangle, DollarSign } from 'lucide-react';

interface StrategiesProps {
  theme: Theme;
  user: User;
  onStrategyChange: () => void; // Callback to refresh app state
}

export const Strategies: React.FC<StrategiesProps> = ({ theme, user, onStrategyChange }) => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [activeStrategyId, setActiveStrategyId] = useState<string>(user.activeStrategyId || 'strat_balanced');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Partial<Strategy>>({});

  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    const list = await db.getStrategies();
    setStrategies(list);
  };

  const handleSetActive = async (id: string) => {
    setActiveStrategyId(id);
    const updatedUser = { ...user, activeStrategyId: id };
    await db.updateUser(updatedUser);
    onStrategyChange();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this strategy?")) {
        await db.deleteStrategy(id);
        await loadStrategies();
        if (activeStrategyId === id) {
             // Reset to balanced if current is deleted
             handleSetActive('strat_balanced');
        }
    }
  };

  const handleEdit = (strategy: Strategy) => {
      setEditingStrategy({ ...strategy }); // Clone
      setIsModalOpen(true);
  };

  const handleCreate = () => {
      setEditingStrategy({
          id: `strat_${Date.now()}`,
          name: 'New Strategy',
          description: 'Custom Strategy',
          stopLossPercentage: 5,
          takeProfitTiers: [{ gainThreshold: 5, trailingDrop: 2 }],
          isSystem: false,
          // Removed specific valueInvestorConfig initialization as strat_value is no longer a system strategy.
          // New strategies will default to generic configuration.
      });
      setIsModalOpen(true);
  };

  const handleSave = async () => {
      if (!editingStrategy.name || (!editingStrategy.valueInvestorConfig && !editingStrategy.stopLossPercentage)) {
          alert("Please fill in required fields");
          return;
      }
      
      const strategyToSave = editingStrategy as Strategy;
      await db.saveStrategy(strategyToSave);
      await loadStrategies();
      setIsModalOpen(false);
      onStrategyChange(); // Notify parent
  };

  // Tier helpers
  const updateTier = (index: number, field: keyof TrailingStopTier, value: number) => {
      const tiers = [...(editingStrategy.takeProfitTiers || [])];
      tiers[index] = { ...tiers[index], [field]: value };
      setEditingStrategy({ ...editingStrategy, takeProfitTiers: tiers });
  };

  const addTier = () => {
      setEditingStrategy({
          ...editingStrategy,
          takeProfitTiers: [...(editingStrategy.takeProfitTiers || []), { gainThreshold: 10, trailingDrop: 1 }]
      });
  };

  // Fix: Completed the removeTier function
  const removeTier = (index: number) => {
      const tiers = [...(editingStrategy.takeProfitTiers || [])];
      tiers.splice(index, 1);
      setEditingStrategy({ ...editingStrategy, takeProfitTiers: tiers });
  };

  return (
    <div className="mx-auto max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Trading Strategies</h2>
        {user.is_admin && (
          <button
            onClick={handleCreate}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-bold transition-all ${theme === 'dark' ? 'bg-neonGreen text-black hover:bg-neonGreen/90' : 'bg-black text-white hover:bg-gray-800'}`}
          >
            <Plus size={18} /> Add New
          </button>
        )}
      </div>

      {!user.is_admin && (
        <div className={`mb-6 p-4 rounded-xl border ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
          <p className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
            ℹ️ Le strategie di trading sono gestite dagli amministratori. Puoi selezionare e applicare qualsiasi strategia disponibile al tuo portfolio.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {strategies.map((strategy) => (
          <div
            key={strategy.id}
            className={`flex items-center justify-between rounded-2xl border p-6 transition-colors ${
              activeStrategyId === strategy.id
                ? (theme === 'dark' ? 'border-neonGreen bg-neonGreen/10 shadow-[0_0_20px_rgba(57,255,20,0.1)]' : 'border-black bg-gray-50 shadow-lg')
                : (theme === 'dark' ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-gray-200 bg-white hover:border-gray-300')
            }`}
          >
            <div className="flex flex-col">
              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {strategy.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{strategy.description}</p>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Shield size={14} /> Stop Loss: -{strategy.stopLossPercentage}%
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp size={14} /> Tiers: {strategy.takeProfitTiers.length}
                </span>
                {strategy.isSystem && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${theme === 'dark' ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                    System
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user.is_admin && (
                <>
                  <button
                    onClick={() => handleEdit(strategy)}
                    className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                    title="Edit Strategy"
                  >
                    <Edit2 size={18} />
                  </button>
                  {!strategy.isSystem && (
                    <button
                      onClick={() => handleDelete(strategy.id)}
                      className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-100'}`}
                      title="Delete Strategy"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => handleSetActive(strategy.id)}
                className={`py-2 px-4 rounded-xl font-bold transition-all ${
                  activeStrategyId === strategy.id
                    ? (theme === 'dark' ? 'bg-neonGreen text-black' : 'bg-black text-white')
                    : (theme === 'dark' ? 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300')
                }`}
              >
                {activeStrategyId === strategy.id ? <Check size={18} /> : 'Set Active'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-md overflow-hidden rounded-2xl shadow-2xl ${theme === 'dark' ? 'bg-[#1E1E1E] border border-white/10' : 'bg-white border-gray-200'}`}>
            <div className={`flex items-center justify-between border-b px-6 py-4 ${theme === 'dark' ? 'border-white/10' : 'border-gray-100'}`}>
              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {editingStrategy.id && !editingStrategy.isSystem ? 'Edit Custom Strategy' : 'Create New Strategy'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className={`rounded-full p-1 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`mb-1 block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Name</label>
                <input
                  type="text"
                  value={editingStrategy.name || ''}
                  onChange={(e) => setEditingStrategy({ ...editingStrategy, name: e.target.value })}
                  className={`w-full rounded-xl border px-4 py-2 text-base outline-none ${theme === 'dark' ? 'bg-black/30 border-white/10 text-white focus:border-neonGreen/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'}`}
                />
              </div>
              <div>
                <label className={`mb-1 block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
                <textarea
                  value={editingStrategy.description || ''}
                  onChange={(e) => setEditingStrategy({ ...editingStrategy, description: e.target.value })}
                  rows={2}
                  className={`w-full rounded-xl border px-4 py-2 text-base outline-none ${theme === 'dark' ? 'bg-black/30 border-white/10 text-white focus:border-neonGreen/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'}`}
                ></textarea>
              </div>

              {/* Stop Loss */}
              <div>
                <label className={`mb-1 block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Stop Loss (%)</label>
                <input
                  type="number"
                  value={editingStrategy.stopLossPercentage || 0}
                  onChange={(e) => setEditingStrategy({ ...editingStrategy, stopLossPercentage: parseFloat(e.target.value) })}
                  className={`w-full rounded-xl border px-4 py-2 text-base outline-none ${theme === 'dark' ? 'bg-black/30 border-white/10 text-white focus:border-neonGreen/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500'}`}
                />
              </div>

              {/* Take Profit Tiers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Take Profit Tiers</label>
                  <button
                    type="button"
                    onClick={addTier}
                    className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${theme === 'dark' ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}
                  >
                    <Plus size={14} /> Add Tier
                  </button>
                </div>
                <div className="space-y-2">
                  {(editingStrategy.takeProfitTiers || []).map((tier, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="number"
                        value={tier.gainThreshold}
                        onChange={(e) => updateTier(index, 'gainThreshold', parseFloat(e.target.value))}
                        placeholder="Gain %"
                        className={`flex-1 rounded-xl border px-3 py-2 text-sm outline-none ${theme === 'dark' ? 'bg-black/30 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      />
                      <input
                        type="number"
                        value={tier.trailingDrop}
                        onChange={(e) => updateTier(index, 'trailingDrop', parseFloat(e.target.value))}
                        placeholder="Drop %"
                        className={`flex-1 rounded-xl border px-3 py-2 text-sm outline-none ${theme === 'dark' ? 'bg-black/30 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeTier(index)}
                        className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-100'}`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {(editingStrategy.takeProfitTiers?.length === 0) && (
                      <p className="text-sm text-gray-500">No take profit tiers defined.</p>
                  )}
                </div>
              </div>
            </div>
            <div className={`flex justify-end gap-3 px-6 py-4 border-t ${theme === 'dark' ? 'border-white/10' : 'border-gray-100'}`}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium ${theme === 'dark' ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-black shadow-lg transition-all hover:scale-[1.02] ${theme === 'dark' ? 'bg-neonGreen shadow-neonGreen/20 hover:bg-neonGreen/90' : 'bg-black text-white hover:bg-gray-800'}`}
              >
                <Save size={16} /> Save Strategy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
