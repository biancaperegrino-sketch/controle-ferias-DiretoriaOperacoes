
import React, { useMemo, useState } from 'react';
import { Collaborator, VacationRecord, Holiday, RequestType, UserRole } from '../types';
import { formatDate } from '../utils/dateUtils';
import { Palmtree, Users, CalendarDays, Info, Search, Filter, Download, UserPlus, Plus, Edit2, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { BRAZILIAN_STATES } from '../constants';

const getStateName = (uf: string) => {
  const states: Record<string, string> = {
    'DF': 'Distrito Federal',
    'RJ': 'Rio de Janeiro',
    'SP': 'São Paulo'
  };
  return states[uf] || uf;
};

interface DashboardProps {
  collaborators: Collaborator[];
  records: VacationRecord[];
  holidays: Holiday[];
}

const Dashboard: React.FC<DashboardProps> = ({ collaborators, records, holidays }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    search: '',
    state: '',
    unit: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const units = useMemo(() => {
    return Array.from(new Set(collaborators.map(c => c.unit))).filter(Boolean).sort();
  }, [collaborators]);

  const tableData = useMemo(() => {
    const data = records.map(record => {
      const collaborator = collaborators.find(c => c.id === record.collaboratorId);
      const collaboratorRecords = records.filter(r => r.collaboratorId === record.collaboratorId);
      
      const initial = collaboratorRecords
        .filter(r => r.type === RequestType.SALDO_INICIAL)
        .reduce((sum, r) => sum + r.businessDays, 0);
        
      const scheduled = collaboratorRecords
        .filter(r => r.type === RequestType.AGENDADAS)
        .reduce((sum, r) => sum + r.businessDays, 0);

      const discounts = collaboratorRecords
        .filter(r => r.type === RequestType.DESCONTO)
        .reduce((sum, r) => sum + r.businessDays, 0);
      
      const availableBalance = initial + scheduled - discounts;

      return {
        ...record,
        collaboratorName: collaborator?.name || 'Excluído',
        collaboratorRole: collaborator?.role || '',
        availableBalance
      };
    });

    return data.filter(row => {
      const matchSearch = row.collaboratorName.toLowerCase().includes(filters.search.toLowerCase());
      const matchState = !filters.state || row.state === filters.state;
      const matchUnit = !filters.unit || row.unit === filters.unit;
      return matchSearch && matchState && matchUnit;
    }).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [records, collaborators, filters]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return tableData.slice(start, start + itemsPerPage);
  }, [tableData, currentPage]);

  const totalPages = Math.ceil(tableData.length / itemsPerPage);

  const exportToCSV = () => {
    const headers = ["Colaborador", "Estado", "Tipo", "Inicio", "Fim", "Dias Corridos", "Dias Uteis", "Feriados", "Saldo Disponível"];
    const rows = tableData.map(row => [
      `"${row.collaboratorName}"`,
      row.state,
      `"${row.type}"`,
      row.startDate,
      row.endDate,
      row.calendarDays,
      row.businessDays,
      row.holidaysCount,
      row.availableBalance
    ].join(","));
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_saldos_fgv_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight uppercase">Quadro Geral de Férias</h2>
          <p className="text-[#8B949E] font-bold text-sm uppercase tracking-wider">Gerenciamento centralizado de solicitações e saldos de férias.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <>
              <button onClick={() => navigate('/collaborators')} className="bg-[#161B22] text-[#1F6FEB] border border-[#30363D] px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-[#30363D] transition-all">
                <Plus size={16} />
                Incluir Novo Colaborador
              </button>
              <button onClick={() => navigate('/vacations')} className="bg-[#1F6FEB] text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-[#388BFD] transition-all shadow-lg shadow-blue-500/20">
                <div className="bg-white text-[#1F6FEB] rounded-full p-0.5">
                  <Info size={12} />
                </div>
                Incluir Férias
              </button>
            </>
          )}
        </div>
      </header>

      <div className="bg-[#161B22] p-8 rounded-[2rem] border border-[#30363D] shadow-xl space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E]">Unidade</label>
            <select 
              className="w-full px-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl font-black text-[11px] uppercase text-[#8B949E] outline-none focus:ring-2 focus:ring-[#1F6FEB]/40 transition-all appearance-none cursor-pointer" 
              value={filters.unit} 
              onChange={e => setFilters({...filters, unit: e.target.value})}
            >
              <option value="">Todas as Unidades</option>
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E]">Estado</label>
            <select 
              className="w-full px-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl font-black text-[11px] uppercase text-[#8B949E] outline-none focus:ring-2 focus:ring-[#1F6FEB]/40 transition-all appearance-none cursor-pointer" 
              value={filters.state} 
              onChange={e => setFilters({...filters, state: e.target.value})}
            >
              <option value="">Todos os Estados</option>
              {BRAZILIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E]">Colaborador</label>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#484F58]" size={18} />
              <input 
                type="text" 
                placeholder="PESQUISAR POR NOME OU CPF..." 
                className="w-full pl-14 pr-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl focus:ring-2 focus:ring-[#1F6FEB]/40 outline-none font-black text-[11px] uppercase tracking-widest text-white placeholder:text-[#484F58] transition-all"
                value={filters.search}
                onChange={e => setFilters({...filters, search: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-[1.5rem] border border-[#30363D]">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[#0D1117] text-[#8B949E] font-black uppercase tracking-[0.2em] text-[10px]">
              <tr>
                <th className="px-8 py-5">Colaborador</th>
                <th className="px-8 py-5">Unidade / Estado</th>
                <th className="px-8 py-5">Solicitação</th>
                <th className="px-8 py-5">Início / Fim</th>
                <th className="px-8 py-5 text-center">Dias (C / Ú / F)</th>
                <th className="px-8 py-5 text-center">Saldo Atual</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363D]">
              {paginatedData.map((row) => (
                <tr key={row.id} className="hover:bg-[#1F6FEB]/5 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-[#1F6FEB]/10 border border-[#1F6FEB]/20 flex items-center justify-center text-[#1F6FEB] font-black text-xs">
                        {row.collaboratorName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </div>
                      <div>
                        <div className="font-black text-white uppercase tracking-tight">{row.collaboratorName}</div>
                        <div className="text-[10px] font-bold text-[#484F58] uppercase tracking-wider">{row.collaboratorRole}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="font-black text-white text-xs uppercase tracking-tight">{row.unit} - {row.state}</div>
                    <div className="text-[10px] font-bold text-[#484F58] uppercase tracking-wider">{getStateName(row.state)}</div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border w-fit ${
                        row.type === RequestType.SALDO_INICIAL ? 'border-blue-500/30 bg-blue-900/40 text-[#1F6FEB]' : 
                        row.type === RequestType.DESCONTO ? 'border-rose-500/30 bg-rose-900/40 text-rose-500' : 
                        row.type === RequestType.ABONO_PECUNIARIO ? 'border-amber-500/30 bg-amber-900/40 text-amber-500' :
                        'border-blue-500/30 bg-blue-900/40 text-[#1F6FEB]'}`}>
                        {row.type === RequestType.AGENDADAS ? 'FÉRIAS' : 
                         row.type === RequestType.ABONO_PECUNIARIO ? 'ABONO' : 
                         row.type.toUpperCase()}
                      </span>
                      {row.type === RequestType.AGENDADAS && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border w-fit border-indigo-500/30 bg-indigo-900/40 text-indigo-400">
                          INTEGRAIS
                        </span>
                      )}
                      {row.type === RequestType.ABONO_PECUNIARIO && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border w-fit border-amber-500/30 bg-amber-900/40 text-amber-600">
                          PECUNIÁRIO
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 font-black text-white tabular-nums text-xs">
                      {formatDate(row.startDate)} <ArrowRight size={12} className="text-[#484F58]" /> {formatDate(row.endDate)}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center gap-3 font-black tabular-nums">
                      <span className="text-white">{row.calendarDays}</span>
                      <span className="text-[#1F6FEB]">{row.businessDays}</span>
                      <span className="text-amber-500">{row.holidaysCount}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="inline-flex flex-col items-center bg-[#0D1117] px-4 py-2 rounded-2xl border border-[#30363D]">
                      <span className="text-white font-black text-lg leading-none">{row.availableBalance}</span>
                      <span className="text-[9px] font-black text-[#484F58] uppercase tracking-widest">dias</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button onClick={() => navigate('/vacations')} className="p-2 text-[#484F58] hover:text-[#1F6FEB] hover:bg-[#30363D] rounded-xl transition-all">
                      <Edit2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4">
          <p className="text-[10px] font-black text-[#484F58] uppercase tracking-[0.2em]">
            Mostrando {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, tableData.length)} de {tableData.length} colaboradores
          </p>
          
          <div className="flex items-center gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-2 bg-[#0D1117] border border-[#30363D] rounded-xl text-[#8B949E] hover:text-white disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`h-10 w-10 rounded-xl font-black text-xs transition-all ${currentPage === page ? 'bg-[#1F6FEB] text-white shadow-lg shadow-blue-500/20' : 'bg-[#0D1117] border border-[#30363D] text-[#8B949E] hover:text-white'}`}
              >
                {page}
              </button>
            ))}
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-2 bg-[#0D1117] border border-[#30363D] rounded-xl text-[#8B949E] hover:text-white disabled:opacity-30 transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-8 pt-4 border-t border-[#30363D]">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-[#484F58] uppercase tracking-widest">Legenda:</span>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#484F58]"></div>
                <span className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest">Dias Corridos (C)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#1F6FEB]"></div>
                <span className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest">Dias Úteis (Ú)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                <span className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest">Feriados (F)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
