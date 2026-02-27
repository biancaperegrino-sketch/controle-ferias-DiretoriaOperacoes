
import React, { useMemo, useState } from 'react';
import { Collaborator, VacationRecord, RequestType, UserRole } from '../types';
import { 
  BarChart3, 
  TrendingUp, 
  Filter, 
  Wallet, 
  Search, 
  Info, 
  Plus, 
  History, 
  PieChart as PieChartIcon,
  ChevronDown,
  User,
  Calendar
} from 'lucide-react';
import { BRAZILIAN_STATES } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

interface AnalyticsDashboardProps {
  collaborators: Collaborator[];
  records: VacationRecord[];
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ collaborators, records }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const navigate = useNavigate();
  const [selectedCollabId, setSelectedCollabId] = useState<string>(collaborators[0]?.id || '');

  const selectedCollab = useMemo(() => 
    collaborators.find(c => c.id === selectedCollabId), 
    [collaborators, selectedCollabId]
  );

  const collabRecords = useMemo(() => 
    records.filter(r => r.collaboratorId === selectedCollabId),
    [records, selectedCollabId]
  );

  const stats = useMemo(() => {
    const initial = collabRecords
      .filter(r => r.type === RequestType.SALDO_INICIAL)
      .reduce((sum, r) => sum + r.businessDays, 0);
      
    const scheduled = collabRecords
      .filter(r => r.type === RequestType.AGENDADAS)
      .reduce((sum, r) => sum + r.businessDays, 0);

    const discounts = collabRecords
      .filter(r => r.type === RequestType.DESCONTO)
      .reduce((sum, r) => sum + r.businessDays, 0);
    
    const currentBalance = initial + scheduled - discounts;

    return { initial, scheduled, discounts, currentBalance };
  }, [collabRecords]);

  const chartData = useMemo(() => {
    const consumed = stats.discounts;
    const remaining = Math.max(0, stats.currentBalance);
    const total = stats.initial + stats.scheduled;
    const percentage = total > 0 ? Math.round((consumed / total) * 100) : 0;

    return {
      data: [
        { name: 'Utilizado', value: consumed, color: '#1F6FEB' },
        { name: 'Restante', value: remaining, color: '#30363D' }
      ],
      percentage
    };
  }, [stats]);

  // Global Top 10
  const globalBalances = useMemo(() => {
    return collaborators.map(c => {
      const cRecords = records.filter(r => r.collaboratorId === c.id);
      const initial = cRecords.filter(r => r.type === RequestType.SALDO_INICIAL).reduce((sum, r) => sum + r.businessDays, 0);
      const scheduled = cRecords.filter(r => r.type === RequestType.AGENDADAS).reduce((sum, r) => sum + r.businessDays, 0);
      const discounts = cRecords.filter(r => r.type === RequestType.DESCONTO).reduce((sum, r) => sum + r.businessDays, 0);
      return { id: c.id, name: c.name, balance: initial + scheduled - discounts };
    });
  }, [collaborators, records]);

  const top10 = useMemo(() => 
    [...globalBalances].sort((a, b) => b.balance - a.balance).slice(0, 10),
    [globalBalances]
  );

  const maxBalance = Math.max(...top10.map(b => Math.abs(b.balance)), 1);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <header>
        <h2 className="text-3xl font-black text-white tracking-tight uppercase">Dashboard</h2>
        <p className="text-[#8B949E] font-bold text-sm uppercase tracking-wider">Análise de Performance e Saldos de Férias</p>
      </header>

      {/* Top Selector Bar */}
      <div className="flex flex-col lg:flex-row items-center gap-4">
        <div className="w-full lg:w-1/3 space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E] ml-1">Selecionar Colaborador</label>
          <div className="relative group">
            <User className="absolute left-5 top-1/2 -translate-y-1/2 text-[#1F6FEB]" size={18} />
            <select 
              className="w-full pl-14 pr-10 py-4 bg-[#161B22] border border-[#30363D] rounded-2xl font-black text-[11px] uppercase text-white outline-none focus:ring-2 focus:ring-[#1F6FEB]/40 transition-all appearance-none cursor-pointer group-hover:border-[#1F6FEB]/50"
              value={selectedCollabId}
              onChange={(e) => setSelectedCollabId(e.target.value)}
            >
              {[...collaborators].sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                <option key={c.id} value={c.id}>{c.name} - {c.role}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-[#484F58]" size={18} />
          </div>
        </div>

        <div className="flex-1 w-full space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E] ml-1">Informações do Contrato</label>
          <div className="flex items-center gap-4 px-6 py-4 bg-[#161B22]/50 border border-[#30363D] rounded-2xl">
            <div className="bg-[#1F6FEB]/10 p-2 rounded-xl">
              <Info className="text-[#1F6FEB]" size={18} />
            </div>
            <p className="text-xs font-black text-white uppercase tracking-wider">
              Período Aquisitivo: <span className="text-[#1F6FEB]">12/05/2023 - 11/05/2024</span>
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="w-full lg:w-auto pt-6">
            <button 
              onClick={() => navigate('/vacations')}
              className="w-full lg:w-auto bg-[#1F6FEB] hover:bg-[#388BFD] text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <Plus size={18} />
              Nova Solicitação
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#161B22] p-8 rounded-[2rem] border border-[#30363D] shadow-xl">
          <h4 className="text-[10px] font-black text-[#8B949E] uppercase tracking-[0.2em] mb-4">Saldo Inicial</h4>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white tabular-nums">{stats.initial}</span>
            <span className="text-xs font-black text-[#484F58] uppercase tracking-widest">dias</span>
          </div>
        </div>

        <div className="bg-[#161B22] p-8 rounded-[2rem] border border-[#30363D] shadow-xl">
          <h4 className="text-[10px] font-black text-[#8B949E] uppercase tracking-[0.2em] mb-4">Dias Descontados</h4>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white tabular-nums">{stats.discounts}</span>
            <span className="text-xs font-black text-[#484F58] uppercase tracking-widest">dias</span>
          </div>
        </div>

        <div className="bg-[#161B22] p-8 rounded-[2rem] border border-[#30363D] shadow-xl">
          <h4 className="text-[10px] font-black text-[#8B949E] uppercase tracking-[0.2em] mb-4">Agendadas no RH</h4>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white tabular-nums">{stats.scheduled}</span>
            <span className="text-xs font-black text-[#484F58] uppercase tracking-widest">dias</span>
          </div>
        </div>

        <div className="bg-[#1F6FEB] p-8 rounded-[2rem] border border-white/10 shadow-2xl shadow-blue-500/20">
          <h4 className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] mb-4">Saldo Atual (Úteis)</h4>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white tabular-nums">{stats.currentBalance}</span>
            <span className="text-xs font-black text-white/50 uppercase tracking-widest">dias</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* History Table */}
        <div className="lg:col-span-2 bg-[#161B22] rounded-[2.5rem] border border-[#30363D] shadow-xl overflow-hidden flex flex-col">
          <div className="px-10 py-8 border-b border-[#30363D] bg-[#0D1117]/50 flex items-center gap-4">
            <div className="h-10 w-10 bg-[#1F6FEB]/10 text-[#1F6FEB] rounded-2xl flex items-center justify-center border border-[#1F6FEB]/20">
              <History size={20} />
            </div>
            <h3 className="font-black text-white uppercase tracking-[0.2em] text-xs">Histórico de Solicitações</h3>
          </div>
          <div className="flex-1 overflow-auto max-h-[400px]">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#0D1117] sticky top-0 z-10 text-[10px] font-black uppercase text-[#8B949E] tracking-[0.2em]">
                <tr>
                  <th className="px-10 py-5">Período</th>
                  <th className="px-10 py-5">Duração</th>
                  <th className="px-10 py-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363D]">
                {collabRecords.filter(r => r.type !== RequestType.SALDO_INICIAL).map((record, i) => (
                  <tr key={record.id} className="hover:bg-[#1F6FEB]/5 transition-colors">
                    <td className="px-10 py-6 font-bold text-white uppercase tracking-tight text-xs">
                      {record.startDate} - {record.endDate}
                    </td>
                    <td className="px-10 py-6 font-black text-[#8B949E] uppercase tracking-widest text-[10px]">
                      {record.businessDays} DIAS
                    </td>
                    <td className="px-10 py-6">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${
                        new Date(record.endDate) < new Date() 
                          ? 'border-emerald-500/30 bg-emerald-900/40 text-emerald-500' 
                          : 'border-blue-500/30 bg-blue-900/40 text-[#1F6FEB]'
                      }`}>
                        {new Date(record.endDate) < new Date() ? 'CONCLUÍDO' : 'AGENDADO'}
                      </span>
                    </td>
                  </tr>
                ))}
                {collabRecords.filter(r => r.type !== RequestType.SALDO_INICIAL).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-10 py-20 text-center text-[#484F58] font-black uppercase tracking-widest text-[10px]">
                      Nenhuma solicitação registrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Utilization Chart */}
        <div className="bg-[#161B22] p-10 rounded-[2.5rem] border border-[#30363D] shadow-xl flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between mb-8">
            <h3 className="font-black text-[#8B949E] uppercase tracking-[0.2em] text-[10px]">Utilização de Saldo</h3>
            <PieChartIcon size={18} className="text-[#1F6FEB]" />
          </div>

          <div className="relative w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.data}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  startAngle={90}
                  endAngle={450}
                >
                  {chartData.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <Label
                    value={`${chartData.percentage}%`}
                    position="center"
                    content={({ viewBox }) => {
                      const { cx, cy } = viewBox as any;
                      return (
                        <g>
                          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                            <tspan x={cx} y={cy - 5} className="fill-white text-3xl font-black">{chartData.percentage}%</tspan>
                            <tspan x={cx} y={cy + 20} className="fill-[#484F58] text-[9px] font-black uppercase tracking-widest">Consumido</tspan>
                          </text>
                        </g>
                      );
                    }}
                  />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="w-full space-y-6 mt-8">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-[#8B949E]">Utilizado</span>
                <span className="text-white">{stats.discounts} dias</span>
              </div>
              <div className="h-1.5 w-full bg-[#0D1117] rounded-full overflow-hidden">
                <div className="h-full bg-[#1F6FEB] transition-all duration-1000" style={{ width: `${chartData.percentage}%` }} />
              </div>
            </div>
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
              <span className="text-[#8B949E]">Restante</span>
              <span className="text-[#1F6FEB]">{stats.currentBalance} dias</span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Top 10 Section */}
      <div className="bg-[#161B22] p-10 rounded-[2.5rem] border border-[#30363D] shadow-xl">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="bg-[#30363D] p-3 rounded-2xl">
              <BarChart3 className="text-[#1F6FEB]" size={24} />
            </div>
            <h3 className="font-black text-white uppercase tracking-[0.2em] text-[11px]">Top 10 Colaboradores por Saldo Disponível</h3>
          </div>
          <TrendingUp className="text-emerald-500" size={24} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          {top10.map((item, index) => (
            <div key={item.id} className="space-y-2 group">
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-[#484F58] w-4">{index + 1}.</span>
                  <span className="font-black text-white uppercase tracking-tight text-xs group-hover:text-[#1F6FEB] transition-colors">{item.name}</span>
                </div>
                <span className={`font-black tabular-nums text-xs ${item.balance < 0 ? 'text-rose-500' : item.balance > 0 ? 'text-emerald-500' : 'text-[#8B949E]'}`}>
                  {item.balance < 0 ? '-' : ''}{Math.abs(item.balance)} DIAS
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#0D1117] rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(Math.abs(item.balance) / maxBalance) * 100}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full ${item.balance < 0 ? 'bg-rose-500' : 'bg-[#1F6FEB]'}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
