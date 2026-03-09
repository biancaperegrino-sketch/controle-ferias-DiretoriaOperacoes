
import React, { useMemo, useState } from 'react';
import { Collaborator, VacationRecord, Holiday, RequestType, UserRole } from '../types';
import { formatDate } from '../utils/dateUtils';
import { 
  Users, 
  CalendarDays, 
  Info, 
  Search, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Palmtree, 
  Wallet, 
  BarChart3, 
  Activity,
  ChevronRight,
  ArrowRight,
  Filter,
  User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area
} from 'recharts';
import { motion } from 'motion/react';

interface DashboardProps {
  collaborators: Collaborator[];
  records: VacationRecord[];
  holidays: Holiday[];
}

const KPIOverview: React.FC<DashboardProps> = ({ collaborators, records, holidays }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCollabId, setSelectedCollabId] = useState('');

  const today = new Date();
  const next30Days = new Date();
  next30Days.setDate(today.getDate() + 30);

  // Filtered Data
  const filteredCollaborators = useMemo(() => {
    if (!selectedCollabId) return collaborators;
    return collaborators.filter(c => c.id === selectedCollabId);
  }, [collaborators, selectedCollabId]);

  const filteredRecords = useMemo(() => {
    if (!selectedCollabId) return records;
    return records.filter(r => r.collaboratorId === selectedCollabId);
  }, [records, selectedCollabId]);

  // Data Processing
  const processedData = useMemo(() => {
    const collabBalances = filteredCollaborators.map(collab => {
      const collabRecords = filteredRecords.filter(r => r.collaboratorId === collab.id);
      
      const initial = collabRecords
        .filter(r => r.type === RequestType.SALDO_INICIAL)
        .reduce((sum, r) => sum + r.businessDays, 0);
        
      const scheduled = collabRecords
        .filter(r => r.type === RequestType.AGENDADAS)
        .reduce((sum, r) => sum + r.businessDays, 0);

      const discounts = collabRecords
        .filter(r => r.type === RequestType.DESCONTO)
        .reduce((sum, r) => sum + r.businessDays, 0);
      
      const balance = initial + scheduled - discounts;

      const nextVacation = collabRecords
        .filter(r => r.type === RequestType.AGENDADAS && new Date(r.startDate) >= today)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];

      const isOnVacation = collabRecords.some(r => 
        r.type === RequestType.AGENDADAS && 
        new Date(r.startDate) <= today && 
        new Date(r.endDate) >= today
      );

      return {
        ...collab,
        balance,
        nextVacation,
        isOnVacation,
        records: collabRecords
      };
    });

    return collabBalances;
  }, [collaborators, records, today]);

  // Indicators
  const indicators = useMemo(() => {
    const totalCollaborators = filteredCollaborators.length;
    const totalBalance = processedData.reduce((sum, c) => sum + c.balance, 0);
    const currentlyOnVacation = processedData.filter(c => c.isOnVacation).length;
    const upcoming30Days = filteredRecords.filter(r => 
      r.type === RequestType.AGENDADAS && 
      new Date(r.startDate) >= today && 
      new Date(r.startDate) <= next30Days
    ).length;

    return [
      { id: 'collabs', label: 'Colaboradores', value: totalCollaborators, icon: <Users size={20} />, color: 'bg-blue-500', shadow: 'shadow-blue-500/20' },
      { id: 'balance', label: 'Saldo Disponível', value: totalBalance, icon: <Wallet size={20} />, color: 'bg-emerald-500', shadow: 'shadow-emerald-500/20' },
      { id: 'current', label: 'Em Férias Agora', value: currentlyOnVacation, icon: <Palmtree size={20} />, color: 'bg-amber-500', shadow: 'shadow-amber-500/20' },
      { id: 'upcoming', label: 'Próximos 30 Dias', value: upcoming30Days, icon: <Clock size={20} />, color: 'bg-violet-500', shadow: 'shadow-violet-500/20' },
    ];
  }, [processedData, filteredRecords, filteredCollaborators.length, today, next30Days]);

  // Chart: Vacations by Unit
  const unitChartData = useMemo(() => {
    const units = Array.from(new Set(filteredCollaborators.map(c => c.unit))).filter(Boolean);
    return units.map(unit => {
      const unitCollabs = filteredCollaborators.filter(c => c.unit === unit).map(c => c.id);
      const unitVacations = filteredRecords
        .filter(r => r.type === RequestType.AGENDADAS && unitCollabs.includes(r.collaboratorId))
        .reduce((sum, r) => sum + r.businessDays, 0);
      return { name: unit, dias: unitVacations };
    }).sort((a, b) => b.dias - a.dias);
  }, [filteredCollaborators, filteredRecords]);

  // Chart: Timeline
  const timelineChartData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentYear = today.getFullYear();
    
    return months.map((month, index) => {
      const monthRecords = filteredRecords.filter(r => {
        const date = new Date(r.startDate);
        return r.type === RequestType.AGENDADAS && date.getMonth() === index && date.getFullYear() === currentYear;
      });
      return {
        name: month,
        férias: monthRecords.reduce((sum, r) => sum + r.businessDays, 0)
      };
    });
  }, [filteredRecords, today]);

  // Ranking: Top 10
  const rankingData = useMemo(() => {
    return [...processedData]
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10);
  }, [processedData]);

  // Alerts
  const alerts = useMemo(() => {
    const list = [];
    
    // High Balance (> 30 days)
    processedData.filter(c => c.balance > 30).forEach(c => {
      list.push({
        type: 'warning',
        title: 'Saldo Elevado',
        message: `${c.name} possui ${c.balance} dias acumulados.`,
        collabId: c.id
      });
    });

    // Upcoming Vacations (next 30 days)
    filteredRecords.filter(r => 
      r.type === RequestType.AGENDADAS && 
      new Date(r.startDate) >= today && 
      new Date(r.startDate) <= next30Days
    ).forEach(r => {
      const collab = collaborators.find(c => c.id === r.collaboratorId);
      list.push({
        type: 'info',
        title: 'Férias Próximas',
        message: `${collab?.name} inicia férias em ${formatDate(r.startDate)}.`,
        collabId: r.collaboratorId
      });
    });

    // Conflicts (same unit, overlapping)
    const scheduledVacations = filteredRecords.filter(r => r.type === RequestType.AGENDADAS && new Date(r.startDate) >= today);
    for (let i = 0; i < scheduledVacations.length; i++) {
      for (let j = i + 1; j < scheduledVacations.length; j++) {
        const r1 = scheduledVacations[i];
        const r2 = scheduledVacations[j];
        const c1 = collaborators.find(c => c.id === r1.collaboratorId);
        const c2 = collaborators.find(c => c.id === r2.collaboratorId);
        
        if (c1 && c2 && c1.unit === c2.unit && c1.id !== c2.id) {
          const start1 = new Date(r1.startDate);
          const end1 = new Date(r1.endDate);
          const start2 = new Date(r2.startDate);
          const end2 = new Date(r2.endDate);
          
          if (start1 <= end2 && start2 <= end1) {
            list.push({
              type: 'danger',
              title: 'Conflito de Equipe',
              message: `${c1.name} e ${c2.name} (${c1.unit}) têm férias sobrepostas.`,
              collabId: c1.id
            });
          }
        }
      }
    }

    return list.slice(0, 5); // Limit to top 5 alerts
  }, [processedData, filteredRecords, collaborators, today, next30Days]);

  const filteredTableData = useMemo(() => {
    return processedData.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => b.balance - a.balance);
  }, [processedData, search]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      {/* Filters Section */}
      <div className="bg-[#161B22] p-8 rounded-[2.5rem] border border-[#30363D] shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E]">Filtrar por Colaborador</label>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-[#484F58]" size={18} />
              <select 
                className="w-full pl-14 pr-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl font-black text-[11px] uppercase text-white outline-none focus:ring-2 focus:ring-[#1F6FEB]/40 transition-all appearance-none cursor-pointer"
                value={selectedCollabId}
                onChange={e => setSelectedCollabId(e.target.value)}
              >
                <option value="">Todos os Colaboradores</option>
                {collaborators.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E]">Pesquisa Rápida (Tabela)</label>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#484F58]" size={18} />
              <input 
                type="text" 
                placeholder="DIGITE O NOME..." 
                className="w-full pl-14 pr-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl focus:ring-2 focus:ring-[#1F6FEB]/40 outline-none font-black text-[11px] uppercase tracking-widest text-white placeholder:text-[#484F58] transition-all"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Indicators Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {indicators.map((indicator, idx) => (
          <motion.div 
            key={indicator.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-[#161B22] p-6 rounded-[2rem] border border-[#30363D] shadow-xl hover:border-[#1F6FEB]/50 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${indicator.color} p-3 rounded-2xl text-white ${indicator.shadow} group-hover:scale-110 transition-transform`}>
                {indicator.icon}
              </div>
              <Activity size={14} className="text-[#484F58]" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-[#8B949E] uppercase tracking-[0.2em]">{indicator.label}</p>
              <h3 className="text-2xl font-black text-white tabular-nums">{indicator.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Charts */}
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 gap-8">
            {/* Chart 1: Vacations by Unit */}
            <div className="bg-[#161B22] p-8 rounded-[2.5rem] border border-[#30363D] shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="bg-[#1F6FEB]/10 p-2 rounded-xl text-[#1F6FEB]">
                    <BarChart3 size={18} />
                  </div>
                  <h3 className="font-black text-white uppercase tracking-[0.2em] text-[10px]">Férias por Unidade (Dias)</h3>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={unitChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363D" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#8B949E', fontSize: 10, fontWeight: 'bold' }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#8B949E', fontSize: 10, fontWeight: 'bold' }} 
                    />
                    <Tooltip 
                      cursor={{ fill: '#1F6FEB', opacity: 0.1 }}
                      contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="dias" fill="#1F6FEB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Chart 3: Timeline */}
          <div className="bg-[#161B22] p-8 rounded-[2.5rem] border border-[#30363D] shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-500">
                  <TrendingUp size={18} />
                </div>
                <h3 className="font-black text-white uppercase tracking-[0.2em] text-[10px]">Linha do Tempo de Férias ({today.getFullYear()})</h3>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineChartData}>
                  <defs>
                    <linearGradient id="colorFérias" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1F6FEB" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#1F6FEB" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363D" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#8B949E', fontSize: 10, fontWeight: 'bold' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#8B949E', fontSize: 10, fontWeight: 'bold' }} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="férias" stroke="#1F6FEB" strokeWidth={3} fillOpacity={1} fill="url(#colorFérias)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sidebar: Alerts & Ranking */}
        <div className="lg:col-span-4 space-y-8">
          {/* Alerts Section */}
          <div className="bg-[#161B22] p-8 rounded-[2.5rem] border border-[#30363D] shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-rose-500/10 p-2 rounded-xl text-rose-500">
                  <AlertTriangle size={18} />
                </div>
                <h3 className="font-black text-white uppercase tracking-[0.2em] text-[10px]">Alertas Inteligentes</h3>
              </div>
            </div>
            <div className="space-y-4">
              {alerts.map((alert, idx) => (
                <div key={idx} className={`p-4 rounded-2xl border flex gap-4 items-start transition-all hover:scale-[1.02] cursor-pointer ${
                  alert.type === 'danger' ? 'bg-rose-500/5 border-rose-500/20' : 
                  alert.type === 'warning' ? 'bg-amber-500/5 border-amber-500/20' : 
                  'bg-blue-500/5 border-blue-500/20'
                }`}>
                  <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                    alert.type === 'danger' ? 'bg-rose-500' : 
                    alert.type === 'warning' ? 'bg-amber-500' : 
                    'bg-blue-500'
                  }`} />
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white mb-1">{alert.title}</h4>
                    <p className="text-[10px] font-bold text-[#8B949E] uppercase leading-relaxed">{alert.message}</p>
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <div className="py-10 text-center">
                  <p className="text-[10px] font-black text-[#484F58] uppercase tracking-widest">Nenhum alerta crítico</p>
                </div>
              )}
            </div>
          </div>

          {/* Ranking: Top 10 */}
          <div className="bg-[#161B22] p-8 rounded-[2.5rem] border border-[#30363D] shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/10 p-2 rounded-xl text-amber-500">
                  <TrendingUp size={18} />
                </div>
                <h3 className="font-black text-white uppercase tracking-[0.2em] text-[10px]">Ranking: Maior Saldo</h3>
              </div>
            </div>
            <div className="space-y-4">
              {rankingData.map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-black text-xs transition-all ${
                      idx === 0 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 
                      idx === 1 ? 'bg-slate-300 text-slate-700' : 
                      idx === 2 ? 'bg-amber-700 text-white' : 
                      'bg-[#0D1117] text-[#484F58] border border-[#30363D]'
                    }`}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-white uppercase tracking-tight group-hover:text-[#1F6FEB] transition-colors">{item.name}</h4>
                      <p className="text-[8px] font-black text-[#484F58] uppercase tracking-widest">{item.unit} • {item.state}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-black tabular-nums ${item.balance > 30 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {item.balance}
                    </span>
                    <span className="text-[8px] font-black text-[#484F58] uppercase tracking-widest ml-1">dias</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-[#161B22] p-8 rounded-[2.5rem] border border-[#30363D] shadow-xl space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-[#1F6FEB]/10 p-3 rounded-2xl text-[#1F6FEB]">
              <Users size={20} />
            </div>
            <div>
              <h3 className="font-black text-white uppercase tracking-[0.2em] text-xs">Resumo de Saldos</h3>
              <p className="text-[10px] font-bold text-[#8B949E] uppercase tracking-widest mt-1">Visão geral consolidada por colaborador</p>
            </div>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#484F58]" size={18} />
            <input 
              type="text" 
              placeholder="PESQUISAR COLABORADOR..." 
              className="w-full pl-14 pr-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl focus:ring-2 focus:ring-[#1F6FEB]/40 outline-none font-black text-[11px] uppercase tracking-widest text-white placeholder:text-[#484F58] transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-[1.5rem] border border-[#30363D]">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[#0D1117] text-[#8B949E] font-black uppercase tracking-[0.2em] text-[10px]">
              <tr>
                <th className="px-8 py-5">Colaborador</th>
                <th className="px-8 py-5">Unidade / Estado</th>
                <th className="px-8 py-5 text-center">Saldo Disponível</th>
                <th className="px-8 py-5">Próximas Férias</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363D]">
              {filteredTableData.slice(0, 5).map((collab) => (
                <tr key={collab.id} className="hover:bg-[#1F6FEB]/5 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-[#1F6FEB]/10 border border-[#1F6FEB]/20 flex items-center justify-center text-[#1F6FEB] font-black text-xs">
                        {collab.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </div>
                      <div>
                        <div className="font-black text-white uppercase tracking-tight">{collab.name}</div>
                        <div className="text-[10px] font-bold text-[#484F58] uppercase tracking-wider">{collab.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="font-black text-white text-xs uppercase tracking-tight">{collab.unit}</div>
                    <div className="text-[10px] font-bold text-[#484F58] uppercase tracking-wider">{collab.state}</div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className={`inline-flex flex-col items-center px-4 py-2 rounded-2xl border ${collab.balance > 30 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-[#0D1117] border-[#30363D]'}`}>
                      <span className={`font-black text-lg leading-none ${collab.balance > 30 ? 'text-rose-500' : 'text-white'}`}>{collab.balance}</span>
                      <span className="text-[9px] font-black text-[#484F58] uppercase tracking-widest">dias</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {collab.nextVacation ? (
                      <div className="flex items-center gap-2 font-black text-white tabular-nums text-xs">
                        {formatDate(collab.nextVacation.startDate)} <ArrowRight size={12} className="text-[#484F58]" /> {formatDate(collab.nextVacation.endDate)}
                      </div>
                    ) : (
                      <span className="text-[10px] font-black text-[#484F58] uppercase tracking-widest">Não agendado</span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={() => navigate('/report')} 
                      className="p-3 text-[#484F58] hover:text-[#1F6FEB] hover:bg-[#30363D] rounded-xl transition-all"
                      title="Ver Dossiê"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTableData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-[#484F58] font-black uppercase tracking-widest text-[10px]">
                    Nenhum colaborador encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-center">
          <button 
            onClick={() => navigate('/collaborators')}
            className="text-[10px] font-black text-[#1F6FEB] uppercase tracking-[0.3em] hover:underline transition-all"
          >
            Ver Todos os Colaboradores
          </button>
        </div>
      </div>
    </div>
  );
};

export default KPIOverview;

