import React, { useState, useEffect, useMemo } from 'react';
import { Theme, User, Championship, LeaderboardEntry, Stock } from '../types';
import * as db from '../services/database';
import { Shield, Trophy, Users, DollarSign, TrendingUp, BarChart3, AlertCircle, Search, Filter, Play, Pause, Trash2, Eye, Download, Calendar, X, CheckCircle, Clock } from 'lucide-react';

interface AdminPanelProps {
  theme: Theme;
  currentUser: User;
  marketData?: Stock[]; // Optional market data for leaderboard calculations
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ theme, currentUser, marketData = [] }) => {
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'finished'>('all');
  
  // Leaderboard Modal State
  const [selectedChampForLeaderboard, setSelectedChampForLeaderboard] = useState<Championship | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [stats, setStats] = useState({
    totalChampionships: 0,
    activeChampionships: 0,
    pendingChampionships: 0,
    finishedChampionships: 0,
    totalUsers: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      // Load all championships
      const allChampionships = await db.getChampionships();
      setChampionships(allChampionships);

      // Calculate stats
      const active = allChampionships.filter(c => c.status === 'active').length;
      const pending = allChampionships.filter(c => c.status === 'pending').length;
      const finished = allChampionships.filter(c => c.status === 'finished').length;
      
      // Calculate total revenue from enrollment fees
      const revenue = allChampionships.reduce((sum, c) => {
        return sum + (c.enrollment_fee || 0);
      }, 0);

      // Get unique user count (rough estimate based on participation)
      const allParticipants = new Set<string>();
      for (const champ of allChampionships) {
        const participants = await db.getUserChampionshipParticipation(champ.id);
        participants.forEach(email => allParticipants.add(email));
      }

      setStats({
        totalChampionships: allChampionships.length,
        activeChampionships: active,
        pendingChampionships: pending,
        finishedChampionships: finished,
        totalUsers: allParticipants.size,
        totalRevenue: revenue,
      });
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <AlertCircle size={64} className="text-red-500 mb-4"/>
        <h2 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Accesso Negato
        </h2>
        <p className="text-gray-500">Non hai i permessi per accedere a questa sezione.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-neonGreen/10' : 'bg-green-100'}`}>
          <Shield size={32} className={theme === 'dark' ? 'text-neonGreen' : 'text-green-700'}/>
        </div>
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Admin Panel
          </h2>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Dashboard di amministrazione completa
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neonGreen border-t-transparent"></div>
          <p className="text-sm text-gray-400">Caricamento dati...</p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Total Championships */}
            <div className={`rounded-2xl border p-6 ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <Trophy size={24} className="text-yellow-500"/>
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Totale
                </span>
              </div>
              <h3 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stats.totalChampionships}
              </h3>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Campionati Creati
              </p>
            </div>

            {/* Active Championships */}
            <div className={`rounded-2xl border p-6 ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <TrendingUp size={24} className="text-neonGreen"/>
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Attivi
                </span>
              </div>
              <h3 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stats.activeChampionships}
              </h3>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                In Corso
              </p>
            </div>

            {/* Pending Championships */}
            <div className={`rounded-2xl border p-6 ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <BarChart3 size={24} className="text-blue-400"/>
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  In Sospeso
                </span>
              </div>
              <h3 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stats.pendingChampionships}
              </h3>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Da Avviare
              </p>
            </div>

            {/* Finished Championships */}
            <div className={`rounded-2xl border p-6 ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <Trophy size={24} className="text-purple-400"/>
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Terminati
                </span>
              </div>
              <h3 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stats.finishedChampionships}
              </h3>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Completati
              </p>
            </div>

            {/* Total Users */}
            <div className={`rounded-2xl border p-6 ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <Users size={24} className="text-cyan-400"/>
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Utenti
                </span>
              </div>
              <h3 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stats.totalUsers}
              </h3>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Partecipanti Unici
              </p>
            </div>

            {/* Total Revenue */}
            <div className={`rounded-2xl border p-6 ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <DollarSign size={24} className="text-green-400"/>
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Revenue
                </span>
              </div>
              <h3 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                ${stats.totalRevenue.toLocaleString()}
              </h3>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Quote Iscrizione
              </p>
            </div>
          </div>

          {/* Championships Manager */}
          <ChampionshipsManager
            championships={championships}
            theme={theme}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onViewLeaderboard={(champ) => {
              setSelectedChampForLeaderboard(champ);
              calculateLeaderboard(champ);
            }}
            onStartChampionship={handleStartChampionship}
            onEndChampionship={handleEndChampionship}
            onDeleteChampionship={handleDeleteChampionship}
            onExportCSV={handleExportCSV}
            onRefresh={loadAdminData}
          />
        </>
      )}

      {/* Leaderboard Modal */}
      {selectedChampForLeaderboard && (
        <LeaderboardModal
          isOpen={!!selectedChampForLeaderboard}
          onClose={() => {
            setSelectedChampForLeaderboard(null);
            setLeaderboardData([]);
          }}
          championship={selectedChampForLeaderboard}
          leaderboardData={leaderboardData}
          isLoading={isLeaderboardLoading}
          theme={theme}
        />
      )}
    </div>
  );

  // Helper Functions
  async function handleStartChampionship(champ: Championship) {
    try {
      await db.updateChampionship({ ...champ, status: 'active' });
      await loadAdminData();
    } catch (error) {
      console.error('Failed to start championship:', error);
      alert('Errore durante l\'avvio del campionato');
    }
  }

  async function handleEndChampionship(champ: Championship) {
    try {
      await db.updateChampionship({ ...champ, status: 'finished' });
      await loadAdminData();
    } catch (error) {
      console.error('Failed to end championship:', error);
      alert('Errore durante la terminazione del campionato');
    }
  }

  async function handleDeleteChampionship(champ: Championship) {
    if (!confirm(`Sei sicuro di voler eliminare il campionato "${champ.name}"? Questa azione è irreversibile.`)) {
      return;
    }
    try {
      await db.deleteChampionship(champ.id);
      await loadAdminData();
    } catch (error) {
      console.error('Failed to delete championship:', error);
      alert('Errore durante l\'eliminazione del campionato');
    }
  }

  async function handleExportCSV(champ: Championship) {
    try {
      const participants = await db.getUserChampionshipParticipation(champ.id);
      
      // Build CSV content
      let csvContent = 'Championship Name,Status,Start Date,End Date,Starting Cash,Enrollment Fee,Admin\n';
      csvContent += `"${champ.name}","${champ.status}","${champ.start_date}","${champ.end_date}","${champ.starting_cash}","${champ.enrollment_fee || 0}","${champ.admin_user_id}"\n\n`;
      
      csvContent += 'Participants\n';
      csvContent += 'Email\n';
      participants.forEach(email => {
        csvContent += `"${email}"\n`;
      });

      // Create and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${champ.name.replace(/\s+/g, '_')}_export.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Errore durante l\'export CSV');
    }
  }

  async function calculateLeaderboard(champ: Championship) {
    setIsLeaderboardLoading(true);
    try {
      const participants = await db.getUserChampionshipParticipation(champ.id);
      const entries: LeaderboardEntry[] = [];

      const allUsersPromises = participants.map(email => db.getUserByEmail(email));
      const allUsers = (await Promise.all(allUsersPromises)).filter((u): u is User => u !== null);
      const usersMap = new Map(allUsers.map(u => [u.id, u]));

      for (const email of participants) {
        const participant = usersMap.get(email);
        if (!participant) continue;

        const holdings = await db.getHoldings(email, champ.id);
        const transactions = await db.getTransactions(email, champ.id);

        let currentBuyingPower = 0;
        let totalTrades = 0;
        transactions.forEach(tx => {
          const amount = Number(tx.amount);
          if (tx.type === 'deposit' || tx.type === 'sell') {
            currentBuyingPower += amount;
          } else if (tx.type === 'withdrawal' || tx.type === 'buy') {
            currentBuyingPower -= amount;
          }
          if (tx.type === 'buy' || tx.type === 'sell') {
            totalTrades++;
          }
        });

        let totalAssetValue = 0;
        holdings.forEach(holding => {
          const liveStock = marketData.find(s => s.symbol === holding.symbol);
          const currentPrice = liveStock ? liveStock.price : holding.avgPrice;
          totalAssetValue += currentPrice * holding.quantity;
        });

        const totalNetWorth = currentBuyingPower + totalAssetValue;
        const totalReturn = totalNetWorth - champ.starting_cash;
        const returnPercentage = champ.starting_cash > 0 ? (totalReturn / champ.starting_cash) * 100 : 0;

        entries.push({
          user_email: email,
          user_name: participant.name,
          totalNetWorth,
          rank: 0,
          totalReturn,
          returnPercentage,
          totalAssetValue,
          totalTrades,
        });
      }

      entries.sort((a, b) => b.totalNetWorth - a.totalNetWorth);
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      setLeaderboardData(entries);
    } catch (error) {
      console.error('Failed to calculate leaderboard:', error);
    } finally {
      setIsLeaderboardLoading(false);
    }
  }
};

// Championships Manager Component
interface ChampionshipsManagerProps {
  championships: Championship[];
  theme: Theme;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: 'all' | 'pending' | 'active' | 'finished';
  setStatusFilter: (f: 'all' | 'pending' | 'active' | 'finished') => void;
  onViewLeaderboard: (champ: Championship) => void;
  onStartChampionship: (champ: Championship) => void;
  onEndChampionship: (champ: Championship) => void;
  onDeleteChampionship: (champ: Championship) => void;
  onExportCSV: (champ: Championship) => void;
  onRefresh: () => void;
}

const ChampionshipsManager: React.FC<ChampionshipsManagerProps> = ({
  championships,
  theme,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  onViewLeaderboard,
  onStartChampionship,
  onEndChampionship,
  onDeleteChampionship,
  onExportCSV,
  onRefresh,
}) => {
  const [participantCounts, setParticipantCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    loadParticipantCounts();
  }, [championships]);

  const loadParticipantCounts = async () => {
    const counts = new Map<string, number>();
    for (const champ of championships) {
      const participants = await db.getUserChampionshipParticipation(champ.id);
      counts.set(champ.id, participants.length);
    }
    setParticipantCounts(counts);
  };

  const filteredChampionships = useMemo(() => {
    return championships.filter(champ => {
      const matchesSearch = champ.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           champ.admin_user_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || champ.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [championships, searchQuery, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold bg-blue-500/20 text-blue-400">
            <Clock size={10}/> In Sospeso
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold bg-green-500/20 text-neonGreen">
            <Play size={10}/> Attivo
          </span>
        );
      case 'finished':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold bg-purple-500/20 text-purple-400">
            <CheckCircle size={10}/> Terminato
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`rounded-2xl border p-6 ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Gestione Campionati
        </h3>
        <button
          onClick={onRefresh}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
        >
          <TrendingUp size={14}/> Aggiorna
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Search */}
        <div className={`flex items-center gap-2 flex-1 rounded-xl p-2 border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
          <Search size={16} className="text-gray-400"/>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca per nome o admin..."
            className="bg-transparent text-sm outline-none flex-1 text-inherit"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2">
          {(['all', 'pending', 'active', 'finished'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === status
                  ? (theme === 'dark' ? 'bg-neonGreen/20 text-neonGreen' : 'bg-black text-white')
                  : (theme === 'dark' ? 'bg-white/10 hover:bg-white/20 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600')
              }`}
            >
              {status === 'all' ? 'Tutti' : status === 'pending' ? 'In Sospeso' : status === 'active' ? 'Attivi' : 'Terminati'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filteredChampionships.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Trophy size={48} className="mx-auto mb-4 opacity-20"/>
          <p>Nessun campionato trovato</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={`border-b ${theme === 'dark' ? 'border-white/5 text-gray-400' : 'border-gray-200 text-gray-600'}`}>
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nome</th>
                <th className="px-4 py-3 text-left font-medium">Stato</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">Partecipanti</th>
                <th className="px-4 py-3 text-right font-medium">Cash Iniziale</th>
                <th className="px-4 py-3 text-right font-medium">Quota</th>
                <th className="px-4 py-3 text-center font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-gray-100'}`}>
              {filteredChampionships.map(champ => (
                <tr key={champ.id} className={`transition-colors ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-3">
                    <div>
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {champ.name}
                      </p>
                      <p className="text-xs text-gray-500">{champ.admin_user_id}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(champ.status)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs">{new Date(champ.start_date).toLocaleDateString()}</span>
                      <span className="text-xs">{new Date(champ.end_date).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {participantCounts.get(champ.id) || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    ${champ.starting_cash.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {champ.enrollment_fee ? `$${champ.enrollment_fee.toLocaleString()}` : 'Gratis'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onViewLeaderboard(champ)}
                        className={`p-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-white/10 text-blue-400' : 'hover:bg-gray-100 text-blue-600'}`}
                        title="Visualizza Classifica"
                      >
                        <Eye size={16}/>
                      </button>
                      {champ.status === 'pending' && (
                        <button
                          onClick={() => onStartChampionship(champ)}
                          className={`p-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-white/10 text-green-400' : 'hover:bg-gray-100 text-green-600'}`}
                          title="Avvia Campionato"
                        >
                          <Play size={16}/>
                        </button>
                      )}
                      {champ.status === 'active' && (
                        <button
                          onClick={() => onEndChampionship(champ)}
                          className={`p-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-white/10 text-purple-400' : 'hover:bg-gray-100 text-purple-600'}`}
                          title="Termina Campionato"
                        >
                          <Pause size={16}/>
                        </button>
                      )}
                      <button
                        onClick={() => onExportCSV(champ)}
                        className={`p-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-white/10 text-cyan-400' : 'hover:bg-gray-100 text-cyan-600'}`}
                        title="Export CSV"
                      >
                        <Download size={16}/>
                      </button>
                      {champ.status !== 'active' && (
                        <button
                          onClick={() => onDeleteChampionship(champ)}
                          className={`p-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-white/10 text-red-400' : 'hover:bg-gray-100 text-red-600'}`}
                          title="Elimina Campionato"
                        >
                          <Trash2 size={16}/>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Leaderboard Modal Component
interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  championship: Championship;
  leaderboardData: LeaderboardEntry[];
  isLoading: boolean;
  theme: Theme;
}

const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  championship,
  leaderboardData,
  isLoading,
  theme,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-4xl overflow-hidden rounded-2xl shadow-2xl ${theme === 'dark' ? 'bg-[#1E1E1E] border border-white/10' : 'bg-white border-gray-200'}`}>
        <div className={`flex items-center justify-between border-b px-6 py-4 ${theme === 'dark' ? 'border-white/10' : 'border-gray-100'}`}>
          <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Classifica: {championship.name}
          </h3>
          <button onClick={onClose} className={`rounded-full p-1 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
            <X size={20} />
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex h-48 flex-col items-center justify-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-neonGreen border-t-transparent"></div>
              <p className="text-sm text-gray-400">Calcolo classifica...</p>
            </div>
          ) : leaderboardData.length === 0 ? (
            <div className="text-center text-gray-500 py-8">Nessun partecipante</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className={`border-b ${theme === 'dark' ? 'border-white/5 bg-white/5 text-gray-400' : 'border-gray-100 bg-gray-50 text-gray-500'}`}>
                  <tr>
                    <th className="px-4 py-2 font-medium">Pos</th>
                    <th className="px-4 py-2 font-medium">Partecipante</th>
                    <th className="px-4 py-2 font-medium text-right">Patrimonio</th>
                    <th className="px-4 py-2 font-medium text-right">Ritorno</th>
                    <th className="px-4 py-2 font-medium text-right">Ritorno %</th>
                    <th className="px-4 py-2 font-medium text-right">Trades</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {leaderboardData.map((entry) => {
                    const isPositive = entry.totalReturn >= 0;
                    return (
                      <tr key={entry.user_email} className="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="px-4 py-2 font-semibold">{entry.rank}</td>
                        <td className="px-4 py-2">{entry.user_name}</td>
                        <td className={`px-4 py-2 text-right font-bold ${entry.totalNetWorth >= championship.starting_cash ? 'text-neonGreen' : 'text-red-400'}`}>
                          ${entry.totalNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`px-4 py-2 text-right ${isPositive ? 'text-neonGreen' : 'text-red-400'}`}>
                          {isPositive ? '+' : ''}${entry.totalReturn.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`px-4 py-2 text-right ${isPositive ? 'text-neonGreen' : 'text-red-400'}`}>
                          {isPositive ? '+' : ''}{entry.returnPercentage.toFixed(2)}%
                        </td>
                        <td className="px-4 py-2 text-right">{entry.totalTrades}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
