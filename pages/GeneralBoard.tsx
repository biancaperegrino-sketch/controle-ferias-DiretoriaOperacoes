
import React, { useMemo, useState } from 'react';
import { Collaborator, VacationRecord, RequestType, UserRole } from '../types';
import { 
  Search, 
  Plus, 
  Target,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Mail,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { formatDate } from '../utils/dateUtils';

interface GeneralBoardProps {
  collaborators: Collaborator[];
  records: VacationRecord[];
}

const GeneralBoard: React.FC<GeneralBoardProps> = ({ collaborators, records }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const navigate = useNavigate();
  
  const [search, setSearch] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const units = useMemo(() => Array.from(new Set(collaborators.map(c => c.unit))).filter(Boolean).sort(), [collaborators]);
  const states = useMemo(() => Array.from(new Set(collaborators.map(c => c.state))).filter(Boolean).sort(), [collaborators]);

  const processedData = useMemo(() => {
    return records.map(record => {
      const collab = collaborators.find(c => c.id === record.collaboratorId);
      
      // Calculate current balance for this collaborator
      const collabRecords = records.filter(r => r.collaboratorId === record.collaboratorId);
      const initial = collabRecords.filter(r => r.type === RequestType.SALDO_INICIAL).reduce((sum, r) => sum + r.businessDays, 0);
      const scheduled = collabRecords.filter(r => r.type === RequestType.AGENDADAS).reduce((sum, r) => sum + Math.abs(r.businessDays), 0);
      const compensation = collabRecords.filter(r => r.type === RequestType.COMPENSACAO).reduce((sum, r) => sum + Math.abs(r.businessDays), 0);
      const discounts = collabRecords.filter(r => r.type === RequestType.DESCONTO).reduce((sum, r) => sum + Math.abs(r.businessDays), 0);
      const balance = initial + compensation + scheduled - discounts;

      return {
        ...record,
        collabName: collab?.name || 'N/A',
        collabRole: collab?.role || 'N/A',
        collabUnit: collab?.unit || 'N/A',
        collabState: collab?.state || 'N/A',
        currentBalance: balance
      };
    }).filter(item => {
      const matchesSearch = item.collabName.toLowerCase().includes(search.toLowerCase());
      const matchesUnit = !selectedUnit || item.collabUnit === selectedUnit;
      const matchesState = !selectedState || item.collabState === selectedState;
      return matchesSearch && matchesUnit && matchesState;
    }).sort((a, b) => {
      // Saldo Inicial always comes last in a descending list (it's the oldest)
      if (a.type === RequestType.SALDO_INICIAL) return 1;
      if (b.type === RequestType.SALDO_INICIAL) return -1;

      // Sort by creation timestamp first (most recent first)
      const timeA = a.timestampCriacao ? new Date(a.timestampCriacao).getTime() : 0;
      const timeB = b.timestampCriacao ? new Date(b.timestampCriacao).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      
      // Then by start date (most recent first)
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
  }, [records, collaborators, search, selectedUnit, selectedState]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const paginatedData = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getRequestTypeStyle = (type: RequestType) => {
    switch (type) {
      case RequestType.SALDO_INICIAL:
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      case RequestType.AGENDADAS:
        return 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400';
      case RequestType.COMPENSACAO:
        return 'bg-violet-500/10 border-violet-500/30 text-violet-400';
      case RequestType.DESCONTO:
        return 'bg-rose-500/10 border-rose-500/30 text-rose-400';
      default:
        return 'bg-slate-500/10 border-slate-500/30 text-slate-400';
    }
  };

  const getRequestTypeLabel = (type: RequestType) => {
    switch (type) {
      case RequestType.SALDO_INICIAL:
        return 'SALDO INICIAL';
      case RequestType.AGENDADAS:
        return 'FÉRIAS / INTEGRAIS';
      case RequestType.COMPENSACAO:
        return 'COMPENSAÇÃO';
      case RequestType.DESCONTO:
        return 'DESCONTO DE FÉRIAS';
      default:
        return type;
    }
  };

  const handleExportExcel = () => {
    const exportData = records.map(record => {
      const collab = collaborators.find(c => c.id === record.collaboratorId);
      return {
        'Unidade': collab?.unit || 'N/A',
        'Função': collab?.role || 'N/A',
        'Estado': collab?.state || 'N/A',
        'Nome do colaborador': collab?.name || 'N/A',
        'Data de início': formatDate(record.startDate),
        'Data de fim': formatDate(record.endDate),
        'Tipo de Solicitação': getRequestTypeLabel(record.type),
        'Dias Corridos': record.calendarDays,
        'Dias úteis': record.businessDays,
        'Observação': record.observation || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lançamentos");
    
    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Lancamentos_Ferias_${date}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Top Actions */}
      <div className="flex justify-end gap-4">
        <button 
          onClick={handleExportExcel}
          className="px-6 py-3 bg-emerald-600/10 border border-emerald-500/30 text-emerald-500 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-500/20 transition-all"
        >
          <Download size={16} />
          Exportar para Excel
        </button>
        {isAdmin && (
          <>
            <button 
              onClick={() => navigate('/collaborators')}
              className="px-6 py-3 bg-transparent border border-[#1F6FEB] text-[#1F6FEB] rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-[#1F6FEB]/10 transition-all"
            >
              <Plus size={16} />
              Incluir Novo Colaborador
            </button>
            <button 
              onClick={() => navigate('/vacations')}
              className="px-6 py-3 bg-[#1F6FEB] text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-[#388BFD] transition-all shadow-lg shadow-blue-500/20"
            >
              <Target size={16} />
              Incluir Férias
            </button>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="bg-[#161B22] p-8 rounded-[2rem] border border-[#30363D] shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E] ml-1">Unidade</label>
            <select 
              className="w-full px-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl font-black text-[11px] uppercase text-white outline-none focus:ring-2 focus:ring-[#1F6FEB]/40 transition-all appearance-none cursor-pointer"
              value={selectedUnit}
              onChange={e => setSelectedUnit(e.target.value)}
            >
              <option value="">Todas as Unidades</option>
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E] ml-1">Estado</label>
            <select 
              className="w-full px-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl font-black text-[11px] uppercase text-white outline-none focus:ring-2 focus:ring-[#1F6FEB]/40 transition-all appearance-none cursor-pointer"
              value={selectedState}
              onChange={e => setSelectedState(e.target.value)}
            >
              <option value="">Todos os Estados</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E] ml-1">Colaborador</label>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#484F58]" size={18} />
              <input 
                type="text" 
                placeholder="PESQUISAR POR NOME OU CPF..." 
                className="w-full pl-14 pr-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl focus:ring-2 focus:ring-[#1F6FEB]/40 outline-none font-black text-[11px] uppercase tracking-widest text-white placeholder:text-[#484F58] transition-all"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#161B22] rounded-[2.5rem] border border-[#30363D] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[#0D1117] text-[#8B949E] font-black uppercase tracking-[0.2em] text-[10px]">
              <tr>
                <th className="px-10 py-6">Colaborador</th>
                <th className="px-10 py-6">Unidade / Estado</th>
                <th className="px-10 py-6">Solicitação</th>
                <th className="px-10 py-6">Início / Fim</th>
                <th className="px-10 py-6 text-center">Dias (C / Ú / F)</th>
                <th className="px-10 py-6 text-center">Doc</th>
                <th className="px-10 py-6 text-center">Saldo Atual</th>
                <th className="px-10 py-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363D]">
              {paginatedData.map((item) => (
                <tr key={item.id} className="hover:bg-[#1F6FEB]/5 transition-colors group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-[#1F6FEB]/10 border border-[#1F6FEB]/20 flex items-center justify-center text-[#1F6FEB] font-black text-xs">
                        {item.collabName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </div>
                      <div>
                        <div className="font-black text-white uppercase tracking-tight text-xs">{item.collabName}</div>
                        <div className="text-[9px] font-bold text-[#484F58] uppercase tracking-wider">{item.collabRole}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="font-black text-white text-[11px] uppercase tracking-tight">{item.collabUnit}</div>
                    <div className="text-[9px] font-bold text-[#484F58] uppercase tracking-wider">{item.collabState}</div>
                  </td>
                  <td className="px-10 py-6">
                    <span className={`inline-block px-3 py-1 rounded-lg border font-black text-[9px] uppercase tracking-widest ${getRequestTypeStyle(item.type)}`}>
                      {getRequestTypeLabel(item.type)}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-2 font-black text-white tabular-nums text-[11px]">
                      {formatDate(item.startDate)} <ChevronRight size={12} className="text-[#484F58]" /> {formatDate(item.endDate)}
                    </div>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <div className="font-black text-[10px] uppercase tracking-widest text-[#8B949E]">
                      <span className="text-white">{item.calendarDays}C</span> / <span className="text-[#1F6FEB]">{item.businessDays}U</span> / <span className="text-amber-500">{item.holidaysCount}F</span>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-center">
                    {item.attachmentName ? (
                      <button 
                        onClick={() => {
                          if (item.attachmentData) {
                            const win = window.open();
                            if (win) {
                              win.document.write(`<iframe src="${item.attachmentData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                            }
                          }
                        }}
                        className="p-2 text-[#1F6FEB] hover:bg-[#1F6FEB]/10 rounded-lg transition-all"
                        title={item.attachmentName}
                      >
                        <Paperclip size={18} />
                      </button>
                    ) : (
                      <span className="text-[#30363D]">-</span>
                    )}
                  </td>
                  <td className="px-10 py-6 text-center">
                    <div className={`inline-flex flex-col items-center px-4 py-2 rounded-2xl border ${item.currentBalance > 30 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-[#0D1117] border-[#30363D]'}`}>
                      <span className={`font-black text-lg leading-none ${item.currentBalance > 30 ? 'text-rose-500' : 'text-white'}`}>{item.currentBalance}</span>
                      <span className="text-[9px] font-black text-[#484F58] uppercase tracking-widest">dias</span>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button 
                      onClick={() => navigate('/vacations')}
                      className="p-3 text-[#484F58] hover:text-[#1F6FEB] hover:bg-[#30363D] rounded-xl transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-10 py-20 text-center text-[#484F58] font-black uppercase tracking-widest text-[10px]">
                    Nenhum registro encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-10 py-6 bg-[#0D1117]/50 border-t border-[#30363D] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] font-black text-[#484F58] uppercase tracking-widest">
            Mostrando {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, processedData.length)} de {processedData.length} colaboradores
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 text-[#8B949E] hover:text-white disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-8 w-8 rounded-lg font-black text-[10px] transition-all ${
                      currentPage === pageNum ? 'bg-[#1F6FEB] text-white shadow-lg shadow-blue-500/20' : 'text-[#8B949E] hover:bg-[#30363D]'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && <span className="text-[#484F58] px-2">...</span>}
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 text-[#8B949E] hover:text-white disabled:opacity-30 transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralBoard;
