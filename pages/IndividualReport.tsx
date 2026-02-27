
import React, { useState, useMemo } from 'react';
import { Collaborator, VacationRecord, RequestType } from '../types';
import { Palmtree, ArrowDownCircle, Wallet, FileText, Search, AlertTriangle, CheckCircle2, Calculator, Info, CircleSlash } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

interface IndividualReportProps {
  collaborators: Collaborator[];
  records: VacationRecord[];
}

const IndividualReport: React.FC<IndividualReportProps> = ({ collaborators, records }) => {
  const [selectedId, setSelectedId] = useState<string>(collaborators[0]?.id || '');

  const summary = useMemo(() => {
    if (!selectedId) return null;

    const collab = collaborators.find(c => c.id === selectedId);
    const collabRecords = records.filter(r => r.collaboratorId === selectedId);

    const initial = collabRecords
      .filter(r => r.type === RequestType.SALDO_INICIAL)
      .reduce((sum, r) => sum + r.businessDays, 0);

    const scheduled = collabRecords
      .filter(r => r.type === RequestType.AGENDADAS)
      .reduce((sum, r) => sum + r.businessDays, 0);

    const discounts = collabRecords
      .filter(r => r.type === RequestType.DESCONTO)
      .reduce((sum, r) => sum + r.businessDays, 0);

    // Saldo Disponível = Saldo inicial + Férias agendadas no RH – Desconto do saldo de férias
    const balanceResult = initial + scheduled - discounts;

    return {
      collaborator: collab,
      initial,
      scheduled,
      discounts,
      balance: balanceResult,
      isNegative: balanceResult < 0,
      isZero: balanceResult === 0,
      history: collabRecords.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    };
  }, [selectedId, collaborators, records]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-black text-white tracking-tight uppercase">Dossiê Individual</h2>
        <p className="text-[#8B949E] font-bold text-sm uppercase tracking-wider">Auditoria de Saldo Disponível</p>
      </header>

      <div className="bg-[#161B22] p-8 rounded-[2.5rem] border border-[#30363D] shadow-xl">
        <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-[#8B949E] mb-4">Selecionar Colaborador</label>
        <div className="relative max-w-xl">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#1F6FEB]" size={22} />
          <select 
            className="w-full pl-14 pr-10 py-5 bg-[#0D1117] border border-[#30363D] rounded-3xl focus:ring-4 focus:ring-[#1F6FEB]/20 outline-none appearance-none font-black text-xs uppercase text-white cursor-pointer"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">PESQUISAR FUNCIONÁRIO...</option>
            {[...collaborators].sort((a, b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {summary && summary.collaborator ? (
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-[#161B22] p-8 rounded-[2rem] border border-[#30363D]">
              <div className="flex items-center gap-4 text-[#8B949E] mb-5">
                <Wallet size={20} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Saldo Inicial</span>
              </div>
              <p className="text-4xl font-black text-white tabular-nums tracking-tighter">{summary.initial} <span className="text-xs opacity-50">DIAS</span></p>
            </div>
            
            <div className="bg-[#161B22] p-8 rounded-[2rem] border border-[#30363D]">
              <div className="flex items-center gap-4 text-[#1F6FEB] mb-5">
                <Palmtree size={20} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Agendadas RH</span>
              </div>
              <p className="text-4xl font-black text-white tabular-nums tracking-tighter">{summary.scheduled} <span className="text-xs opacity-50">DIAS</span></p>
            </div>

            <div className="bg-[#161B22] p-8 rounded-[2rem] border border-[#30363D]">
              <div className="flex items-center gap-4 text-rose-500 mb-5">
                <ArrowDownCircle size={20} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Descontos</span>
              </div>
              <p className="text-4xl font-black text-white tabular-nums tracking-tighter">{summary.discounts} <span className="text-xs opacity-50">DIAS</span></p>
            </div>

            <div className={`p-8 rounded-[2rem] border shadow-2xl transition-colors ${
              summary.isNegative ? 'bg-rose-950/20 border-rose-500/30' : 
              summary.balance > 0 ? 'bg-emerald-950/20 border-emerald-500/30' : 
              'bg-[#161B22] border-[#30363D]'
            }`}>
              <div className={`flex items-center gap-4 mb-5 ${summary.isNegative ? 'text-rose-500' : summary.balance > 0 ? 'text-emerald-500' : 'text-[#8B949E]'}`}>
                {summary.isNegative ? <AlertTriangle size={20} /> : summary.balance > 0 ? <CheckCircle2 size={20} /> : <CircleSlash size={20} />}
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Saldo Disponível</span>
              </div>
              <p className={`text-5xl font-black tabular-nums tracking-tighter ${summary.isNegative ? 'text-rose-500' : summary.balance > 0 ? 'text-emerald-500' : 'text-white'}`}>
                {summary.isNegative ? '-' : ''}{Math.abs(summary.balance)} <span className="text-xs opacity-60">DIAS</span>
              </p>
            </div>
          </div>

          <div className="bg-[#161B22] rounded-[2.5rem] border border-[#30363D] shadow-xl overflow-hidden">
            <div className="px-10 py-8 border-b border-[#30363D] bg-[#0D1117]/50">
              <h3 className="font-black text-white uppercase tracking-tight">Timeline de Lançamentos</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#0D1117] text-[#8B949E] font-black uppercase tracking-[0.2em] text-[10px]">
                  <tr>
                    <th className="px-10 py-5">Categoria</th>
                    <th className="px-10 py-5">Evento</th>
                    <th className="px-10 py-5 text-right">Impacto Real</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363D]">
                  {summary.history.map((record) => (
                    <tr key={record.id} className="hover:bg-[#1F6FEB]/5 transition-colors">
                      <td className="px-10 py-6">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${
                          record.type === RequestType.SALDO_INICIAL ? 'border-blue-500/30 bg-blue-900/40 text-[#1F6FEB]' : 
                          record.type === RequestType.DESCONTO ? 'border-rose-500/30 bg-rose-900/40 text-rose-500' : 
                          'border-emerald-500/30 bg-emerald-900/40 text-emerald-500'}`}>
                          {record.type}
                        </span>
                      </td>
                      <td className="px-10 py-6 text-[#8B949E] font-bold text-xs uppercase tabular-nums">
                        {record.type === RequestType.SALDO_INICIAL && record.startDate === record.endDate ? '-' : `${formatDate(record.startDate)} — ${formatDate(record.endDate)}`}
                      </td>
                      <td className={`px-10 py-6 text-right font-black text-base tabular-nums ${record.type === RequestType.DESCONTO ? 'text-rose-500' : 'text-white'}`}>
                        {record.type === RequestType.DESCONTO ? '-' : ''}{record.businessDays}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#0D1117] border-t border-[#30363D]">
                  <tr>
                    <td colSpan={2} className="px-10 py-8 text-right text-[#484F58] font-black uppercase text-[10px] tracking-widest">Saldo Disponível Consolidado:</td>
                    <td className={`px-10 py-8 text-right text-4xl font-black tabular-nums tracking-tighter ${summary.isNegative ? 'text-rose-500' : summary.balance > 0 ? 'text-emerald-500' : 'text-white'}`}>
                      {summary.isNegative ? '-' : ''}{Math.abs(summary.balance)} <span className="text-xs uppercase font-bold opacity-50">DIAS</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#161B22] py-40 text-center rounded-[3rem] border border-dashed border-[#30363D] flex flex-col items-center justify-center gap-6">
          <FileText size={48} className="text-[#30363D]" />
          <p className="text-[#484F58] font-black uppercase tracking-widest text-[10px]">Selecione um colaborador para auditar o saldo disponível</p>
        </div>
      )}
    </div>
  );
};

export default IndividualReport;
