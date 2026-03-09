
import React, { useMemo, useState } from 'react';
import { Collaborator, VacationRecord, RequestType } from '../types';
import { formatDate } from '../utils/dateUtils';
import { 
  Users, 
  Wallet, 
  Calendar, 
  Search, 
  ArrowRight, 
  ChevronRight,
  FileText,
  Palmtree,
  ArrowDownCircle,
  CheckCircle2,
  AlertTriangle,
  CircleSlash
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SummaryPageProps {
  collaborators: Collaborator[];
  records: VacationRecord[];
}

const SummaryPage: React.FC<SummaryPageProps> = ({ collaborators, records }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const processedData = useMemo(() => {
    return collaborators.map(collab => {
      const collabRecords = records.filter(r => r.collaboratorId === collab.id);
      
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

      return {
        ...collab,
        initial,
        scheduled,
        discounts,
        balance,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [collaborators, records]);

  const filteredData = useMemo(() => {
    return processedData.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.unit.toLowerCase().includes(search.toLowerCase())
    );
  }, [processedData, search]);

  const latestRecords = useMemo(() => {
    return [...records]
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .slice(0, 10);
  }, [records]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-12">
      {/* Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-[#161B22] p-8 rounded-[2.5rem] border border-[#30363D] shadow-xl flex items-center gap-6">
          <div className="h-16 w-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
            <Users size={32} />
          </div>
          <div>
            <p className="text-[10px] font-black text-[#8B949E] uppercase tracking-[0.2em]">Total Colaboradores</p>
            <h3 className="text-3xl font-black text-white">{collaborators.length}</h3>
          </div>
        </div>
        <div className="bg-[#161B22] p-8 rounded-[2.5rem] border border-[#30363D] shadow-xl flex items-center gap-6">
          <div className="h-16 w-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
            <Wallet size={32} />
          </div>
          <div>
            <p className="text-[10px] font-black text-[#8B949E] uppercase tracking-[0.2em]">Saldo Total Disponível</p>
            <h3 className="text-3xl font-black text-white">
              {processedData.reduce((sum, c) => sum + c.balance, 0)} <span className="text-xs opacity-50">DIAS</span>
            </h3>
          </div>
        </div>
        <div className="bg-[#161B22] p-8 rounded-[2.5rem] border border-[#30363D] shadow-xl flex items-center gap-6">
          <div className="h-16 w-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
            <Calendar size={32} />
          </div>
          <div>
            <p className="text-[10px] font-black text-[#8B949E] uppercase tracking-[0.2em]">Total de Lançamentos</p>
            <h3 className="text-3xl font-black text-white">{records.length}</h3>
          </div>
        </div>
      </div>

      {/* Main Content: Summary Table */}
      <div className="bg-[#161B22] rounded-[3rem] border border-[#30363D] shadow-2xl overflow-hidden">
        <div className="px-10 py-8 border-b border-[#30363D] bg-[#0D1117]/50 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-[#1F6FEB]/10 text-[#1F6FEB] rounded-2xl flex items-center justify-center border border-[#1F6FEB]/20">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="font-black text-white uppercase tracking-[0.2em] text-xs">Resumo de Saldos por Colaborador</h3>
              <p className="text-[10px] font-bold text-[#8B949E] uppercase tracking-widest mt-1">Visão consolidada de direitos e descontos</p>
            </div>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#484F58]" size={20} />
            <input 
              type="text" 
              placeholder="PESQUISAR POR NOME OU UNIDADE..." 
              className="w-full pl-14 pr-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl focus:ring-2 focus:ring-[#1F6FEB]/40 outline-none font-black text-[11px] uppercase tracking-widest text-white placeholder:text-[#484F58] transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[#0D1117] text-[#8B949E] font-black uppercase tracking-[0.2em] text-[10px]">
              <tr>
                <th className="px-10 py-5">Colaborador</th>
                <th className="px-10 py-5 text-center">Inicial</th>
                <th className="px-10 py-5 text-center">Agendadas</th>
                <th className="px-10 py-5 text-center">Descontos</th>
                <th className="px-10 py-5 text-center">Saldo Atual</th>
                <th className="px-10 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363D]">
              {filteredData.map((collab) => (
                <tr key={collab.id} className="hover:bg-[#1F6FEB]/5 transition-colors group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-[#1F6FEB]/10 border border-[#1F6FEB]/20 flex items-center justify-center text-[#1F6FEB] font-black text-xs">
                        {collab.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </div>
                      <div>
                        <div className="font-black text-white uppercase tracking-tight text-sm">{collab.name}</div>
                        <div className="text-[10px] font-bold text-[#484F58] uppercase tracking-wider">{collab.unit} • {collab.state}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-center tabular-nums font-bold text-[#8B949E]">{collab.initial}U</td>
                  <td className="px-10 py-6 text-center tabular-nums font-bold text-[#1F6FEB]">{collab.scheduled}U</td>
                  <td className="px-10 py-6 text-center tabular-nums font-bold text-rose-500">{collab.discounts}U</td>
                  <td className="px-10 py-6 text-center">
                    <div className={`inline-flex flex-col items-center px-5 py-2 rounded-2xl border ${
                      collab.balance < 0 ? 'bg-rose-500/10 border-rose-500/30' : 
                      collab.balance > 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 
                      'bg-[#0D1117] border-[#30363D]'
                    }`}>
                      <span className={`font-black text-xl leading-none ${
                        collab.balance < 0 ? 'text-rose-500' : 
                        collab.balance > 0 ? 'text-emerald-500' : 
                        'text-white'
                      }`}>{collab.balance}</span>
                      <span className="text-[9px] font-black text-[#484F58] uppercase tracking-widest">dias</span>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button 
                      onClick={() => navigate('/report', { state: { collaboratorId: collab.id } })} 
                      className="p-3 text-[#484F58] hover:text-[#1F6FEB] hover:bg-[#30363D] rounded-xl transition-all"
                      title="Ver Dossiê Individual"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-10 py-20 text-center text-[#484F58] font-black uppercase tracking-widest text-[10px]">
                    Nenhum colaborador encontrado para os critérios de busca
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Latest Records Section */}
      <div className="bg-[#161B22] rounded-[3rem] border border-[#30363D] shadow-2xl overflow-hidden">
        <div className="px-10 py-8 border-b border-[#30363D] bg-[#0D1117]/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center border border-amber-500/20">
              <Calendar size={24} />
            </div>
            <div>
              <h3 className="font-black text-white uppercase tracking-[0.2em] text-xs">Últimos Lançamentos Registrados</h3>
              <p className="text-[10px] font-bold text-[#8B949E] uppercase tracking-widest mt-1">Histórico recente de movimentações no sistema</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/analytics')}
            className="text-[10px] font-black text-[#1F6FEB] uppercase tracking-[0.2em] hover:underline"
          >
            Ver Quadro Completo
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[#0D1117] text-[#8B949E] font-black uppercase tracking-[0.2em] text-[10px]">
              <tr>
                <th className="px-10 py-5">Colaborador</th>
                <th className="px-10 py-5">Tipo de Movimentação</th>
                <th className="px-10 py-5">Período</th>
                <th className="px-10 py-5 text-right">Dias Úteis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363D]">
              {latestRecords.map((record) => {
                const collab = collaborators.find(c => c.id === record.collaboratorId);
                return (
                  <tr key={record.id} className="hover:bg-[#1F6FEB]/5 transition-colors">
                    <td className="px-10 py-6">
                      <div className="font-black text-white uppercase tracking-tight text-xs">{collab?.name || 'N/A'}</div>
                      <div className="text-[9px] font-bold text-[#484F58] uppercase tracking-wider">{collab?.unit}</div>
                    </td>
                    <td className="px-10 py-6">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${
                        record.type === RequestType.SALDO_INICIAL ? 'border-blue-500/30 bg-blue-900/40 text-[#1F6FEB]' : 
                        record.type === RequestType.DESCONTO ? 'border-rose-500/30 bg-rose-900/40 text-rose-500' : 
                        'border-emerald-500/30 bg-emerald-900/40 text-emerald-500'}`}>
                        {record.type}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-[#8B949E] font-bold text-xs uppercase tabular-nums">
                      {record.type === RequestType.SALDO_INICIAL ? 'LANÇAMENTO BASE' : `${formatDate(record.startDate)} — ${formatDate(record.endDate)}`}
                    </td>
                    <td className="px-10 py-6 text-right tabular-nums">
                      <span className={`font-black text-base ${record.type === RequestType.DESCONTO ? 'text-rose-500' : 'text-white'}`}>
                        {record.type === RequestType.DESCONTO ? '-' : ''}{record.businessDays}U
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SummaryPage;
