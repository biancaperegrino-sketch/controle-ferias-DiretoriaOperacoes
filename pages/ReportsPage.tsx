
import React, { useMemo, useState } from 'react';
import { Collaborator, VacationRecord, RequestType, UserRole } from '../types';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  ArrowRight,
  Search,
  Filter,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../App';
import * as XLSX from 'xlsx';
import { motion } from 'motion/react';

interface ReportsPageProps {
  collaborators: Collaborator[];
  records: VacationRecord[];
}

const ReportsPage: React.FC<ReportsPageProps> = ({ collaborators, records }) => {
  const { user } = useAuth();
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
        balance,
        initial,
        scheduled,
        discounts
      };
    });
  }, [collaborators, records]);

  const topBalances = useMemo(() => {
    return [...processedData]
      .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.balance - a.balance);
  }, [processedData, search]);

  const negativeBalances = useMemo(() => {
    return [...processedData]
      .filter(c => c.balance < 0)
      .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.balance - b.balance);
  }, [processedData, search]);

  const exportToExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data.map(item => ({
      'Nome': item.name,
      'Cargo': item.role,
      'Unidade': item.unit,
      'Estado': item.state,
      'Saldo Inicial': item.initial,
      'Agendadas RH': item.scheduled,
      'Descontos': item.discounts,
      'Saldo Final': item.balance
    })));

    // Set column widths
    const wscols = [
      { wch: 30 }, // Nome
      { wch: 25 }, // Cargo
      { wch: 15 }, // Unidade
      { wch: 10 }, // Estado
      { wch: 15 }, // Saldo Inicial
      { wch: 15 }, // Agendadas RH
      { wch: 15 }, // Descontos
      { wch: 15 }, // Saldo Final
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumo');

    // Add detailed records sheet
    const detailedData: any[] = [];
    data.forEach(collab => {
      const collabRecords = records.filter(r => r.collaboratorId === collab.id);
      if (collabRecords.length === 0) {
         detailedData.push({
            'Nome': collab.name,
            'Tipo': 'Sem lançamentos',
            'Início': '-',
            'Fim': '-',
            'Dias Corridos': '-',
            'Dias Úteis': '-',
            'Observação': '-'
         });
      } else {
         collabRecords.forEach(record => {
            detailedData.push({
              'Nome': collab.name,
              'Tipo': record.type,
              'Início': record.startDate ? new Date(record.startDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-',
              'Fim': record.endDate ? new Date(record.endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-',
              'Dias Corridos': record.calendarDays,
              'Dias Úteis': record.businessDays,
              'Observação': record.observation || '-'
            });
         });
      }
    });

    const detailsWorksheet = XLSX.utils.json_to_sheet(detailedData);
    detailsWorksheet['!cols'] = [
      { wch: 30 }, // Nome
      { wch: 25 }, // Tipo
      { wch: 15 }, // Início
      { wch: 15 }, // Fim
      { wch: 15 }, // Dias Corridos
      { wch: 15 }, // Dias Úteis
      { wch: 40 }, // Observação
    ];
    XLSX.utils.book_append_sheet(workbook, detailsWorksheet, 'Lançamentos');

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-10">
      {/* Header Section */}
      <div className="bg-[#161B22] p-8 rounded-[2.5rem] border border-[#30363D] shadow-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-[#1F6FEB]/10 p-3 rounded-2xl text-[#1F6FEB]">
              <BarChart3 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Relatórios Gerenciais</h2>
              <p className="text-[10px] font-bold text-[#8B949E] uppercase tracking-widest mt-1">Análise consolidada de saldos e pendências</p>
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
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        {/* Top Balances Card */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[#161B22] rounded-[2.5rem] border border-[#30363D] shadow-xl overflow-hidden flex flex-col"
        >
          <div className="p-8 border-b border-[#30363D] bg-[#0D1117]/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-amber-500/10 p-2 rounded-xl text-amber-500">
                <TrendingUp size={20} />
              </div>
              <h3 className="font-black text-white uppercase tracking-[0.2em] text-xs">Maiores Saldos de Férias</h3>
            </div>
            <button 
              onClick={() => exportToExcel(topBalances, 'Maiores_Saldos_Ferias')}
              className="flex items-center gap-2 px-4 py-2 bg-[#1F6FEB] hover:bg-[#388BFD] text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all"
            >
              <Download size={14} /> Exportar Excel
            </button>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#0D1117] text-[#8B949E] font-black uppercase tracking-[0.2em] text-[9px]">
                <tr>
                  <th className="px-8 py-4">Colaborador</th>
                  <th className="px-8 py-4 text-center">Saldo</th>
                  <th className="px-8 py-4 text-right">Unidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363D]">
                {topBalances.slice(0, 15).map((collab) => (
                  <tr key={collab.id} className="hover:bg-[#1F6FEB]/5 transition-colors">
                    <td className="px-8 py-5">
                      <div className="font-black text-white uppercase tracking-tight text-xs">{collab.name}</div>
                      <div className="text-[9px] font-bold text-[#484F58] uppercase tracking-wider">{collab.role}</div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className={`font-black text-sm tabular-nums ${collab.balance > 30 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {collab.balance}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest">{collab.unit}</span>
                    </td>
                  </tr>
                ))}
                {topBalances.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-8 py-20 text-center text-[#484F58] font-black uppercase tracking-widest text-[10px]">
                      Nenhum dado encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Negative Balances Card */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[#161B22] rounded-[2.5rem] border border-[#30363D] shadow-xl overflow-hidden flex flex-col"
        >
          <div className="p-8 border-b border-[#30363D] bg-[#0D1117]/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-rose-500/10 p-2 rounded-xl text-rose-500">
                <AlertTriangle size={20} />
              </div>
              <h3 className="font-black text-white uppercase tracking-[0.2em] text-xs">Saldos Negativos</h3>
            </div>
            <button 
              onClick={() => exportToExcel(negativeBalances, 'Saldos_Negativos')}
              className="flex items-center gap-2 px-4 py-2 bg-[#1F6FEB] hover:bg-[#388BFD] text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all"
            >
              <Download size={14} /> Exportar Excel
            </button>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#0D1117] text-[#8B949E] font-black uppercase tracking-[0.2em] text-[9px]">
                <tr>
                  <th className="px-8 py-4">Colaborador</th>
                  <th className="px-8 py-4 text-center">Saldo</th>
                  <th className="px-8 py-4 text-right">Unidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363D]">
                {negativeBalances.map((collab) => (
                  <tr key={collab.id} className="hover:bg-rose-500/5 transition-colors">
                    <td className="px-8 py-5">
                      <div className="font-black text-white uppercase tracking-tight text-xs">{collab.name}</div>
                      <div className="text-[9px] font-bold text-[#484F58] uppercase tracking-wider">{collab.role}</div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className="font-black text-sm tabular-nums text-rose-500">
                        {collab.balance}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest">{collab.unit}</span>
                    </td>
                  </tr>
                ))}
                {negativeBalances.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-8 py-20 text-center text-[#484F58] font-black uppercase tracking-widest text-[10px]">
                      Nenhum saldo negativo encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ReportsPage;
