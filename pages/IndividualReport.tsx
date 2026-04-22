
import React, { useState, useMemo, useEffect } from 'react';
import { Collaborator, VacationRecord, RequestType } from '../types';
import { Palmtree, ArrowDownCircle, ArrowUpCircle, Wallet, FileText, Search, AlertTriangle, CheckCircle2, Calculator, Info, CircleSlash, Download } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';
import { useLocation } from 'react-router-dom';
import ExcelJS from 'exceljs';

interface IndividualReportProps {
  collaborators: Collaborator[];
  records: VacationRecord[];
}

const IndividualReport: React.FC<IndividualReportProps> = ({ collaborators, records }) => {
  const location = useLocation();
  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    if (location.state?.collaboratorId) {
      setSelectedId(location.state.collaboratorId);
    } else if (collaborators.length > 0 && !selectedId) {
      setSelectedId(collaborators[0].id);
    }
  }, [location.state, collaborators]);

  const summary = useMemo(() => {
    if (!selectedId) return null;

    const collab = collaborators.find(c => c.id === selectedId);
    const collabRecords = records.filter(r => r.collaboratorId === selectedId);

    const initial = collabRecords
      .filter(r => r.type === RequestType.SALDO_INICIAL)
      .reduce((sum, r) => sum + r.businessDays, 0);

    const scheduled = collabRecords
      .filter(r => r.type === RequestType.AGENDADAS)
      .reduce((sum, r) => sum + Math.abs(r.businessDays), 0);

    const compensation = collabRecords
      .filter(r => r.type === RequestType.COMPENSACAO)
      .reduce((sum, r) => sum + Math.abs(r.businessDays), 0);

    const discounts = collabRecords
      .filter(r => r.type === RequestType.DESCONTO)
      .reduce((sum, r) => sum + Math.abs(r.businessDays), 0);

    // Saldo Disponível = Saldo inicial + Compensação + Férias agendadas no RH - Desconto de férias
    const balanceResult = initial + compensation + scheduled - discounts;

    return {
      collaborator: collab,
      initial,
      scheduled,
      compensation,
      discounts,
      balance: balanceResult,
      isNegative: balanceResult < 0,
      isZero: balanceResult === 0,
      history: collabRecords.sort((a, b) => {
        // Saldo Inicial always comes last in a descending list (it's the oldest)
        if (a.type === RequestType.SALDO_INICIAL) return 1;
        if (b.type === RequestType.SALDO_INICIAL) return -1;
        
        // Sort by start date (most recent first)
        const dateA = new Date(a.startDate).getTime();
        const dateB = new Date(b.startDate).getTime();
        if (dateA !== dateB) return dateB - dateA;
        
        // If same date, sort by creation timestamp (most recent first)
        const timeA = a.timestampCriacao ? new Date(a.timestampCriacao).getTime() : 0;
        const timeB = b.timestampCriacao ? new Date(b.timestampCriacao).getTime() : 0;
        return timeB - timeA;
      })
    };
  }, [selectedId, collaborators, records]);

  const exportToExcel = async () => {
    if (!summary || !summary.collaborator) return;

    const { collaborator, history, balance, initial, scheduled, compensation, discounts } = summary;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório Individual');

    // FGV Blue: #003B71
    const fgvBlue = '003B71';
    const white = 'FFFFFF';

    // Title
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `RELATÓRIO INDIVIDUAL DE FÉRIAS - ${collaborator.name}`;
    titleCell.font = { bold: true, size: 14, color: { argb: white } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fgvBlue } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.mergeCells('A1:I1');
    worksheet.getRow(1).height = 30;

    // Summary Section Header
    const summaryHeaderRow = worksheet.getRow(3);
    summaryHeaderRow.values = ['INFORMAÇÕES DO COLABORADOR', '', '', '', '', 'RESUMO DOS SALDOS', '', '', ''];
    summaryHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: white } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fgvBlue } };
      cell.alignment = { horizontal: 'center' };
    });
    worksheet.mergeCells('A3:D3');
    worksheet.mergeCells('F3:I3');

    // Identity Data
    worksheet.getCell('A4').value = 'Nome:';
    worksheet.getCell('B4').value = collaborator.name;
    worksheet.getCell('A5').value = 'Cargo:';
    worksheet.getCell('B5').value = collaborator.role;
    worksheet.getCell('A6').value = 'Unidade:';
    worksheet.getCell('B6').value = collaborator.unit;
    worksheet.getCell('A7').value = 'Estado:';
    worksheet.getCell('B7').value = collaborator.state;

    // Balance Data
    worksheet.getCell('F4').value = 'Saldo Inicial:';
    worksheet.getCell('G4').value = initial;
    worksheet.getCell('F5').value = 'Agendadas RH:';
    worksheet.getCell('G5').value = scheduled;
    worksheet.getCell('F6').value = 'Compensação:';
    worksheet.getCell('G6').value = compensation;
    worksheet.getCell('F7').value = 'Descontos:';
    worksheet.getCell('G7').value = discounts;
    
    const balanceLabelCell = worksheet.getCell('F8');
    balanceLabelCell.value = 'SALDO DISPONÍVEL:';
    balanceLabelCell.font = { bold: true };
    
    const balanceValueCell = worksheet.getCell('G8');
    balanceValueCell.value = balance;
    balanceValueCell.font = { bold: true, color: { argb: balance < 0 ? 'FF0000' : '008000' } };

    // Timeline Header
    const historyTitleRow = worksheet.getRow(10);
    historyTitleRow.values = ['LINHA DO TEMPO - HISTÓRICO COMPLETO'];
    historyTitleRow.getCell(1).font = { bold: true, color: { argb: white } };
    historyTitleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fgvBlue } };
    historyTitleRow.getCell(1).alignment = { horizontal: 'center' };
    worksheet.mergeCells('A10:I10');

    const headerRow = worksheet.getRow(11);
    headerRow.values = [
      'Categoria', 
      'Data Início', 
      'Data Fim', 
      'Dias Úteis', 
      'D. Corridos', 
      'Feriados', 
      'Observação', 
      'Registrado por', 
      'Data Registro'
    ];
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: white } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fgvBlue } };
      cell.border = { bottom: { style: 'thin' } };
    });

    // Add History Data
    history.forEach((record, index) => {
      const row = worksheet.addRow([
        record.type,
        record.startDate ? new Date(record.startDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-',
        record.endDate ? new Date(record.endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-',
        record.businessDays,
        record.calendarDays,
        record.holidaysCount,
        record.observation || '-',
        record.usuarioCriacao || '-',
        record.timestampCriacao ? new Date(record.timestampCriacao).toLocaleString('pt-BR') : '-'
      ]);

      if (record.type === RequestType.DESCONTO) {
        row.getCell(4).font = { color: { argb: 'FF0000' } };
      }
    });

    // Column Widths
    worksheet.columns = [
      { width: 25 }, // Categoria
      { width: 12 }, // Início
      { width: 12 }, // Fim
      { width: 10 }, // Uteis
      { width: 10 }, // Corridos
      { width: 10 }, // Feriados
      { width: 40 }, // Obs
      { width: 25 }, // Registrado por
      { width: 20 }, // Data Registro
    ];

    // Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Relatorio_Individual_${collaborator.name.replace(/\s+/g, '_')}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="bg-[#161B22] p-8 rounded-[2.5rem] border border-[#30363D] shadow-xl flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex-1 max-w-xl">
          <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-[#8B949E] mb-4">Selecionar Colaborador</label>
          <div className="relative">
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

        {summary && summary.collaborator && (
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-3 px-8 py-5 bg-[#1F6FEB] hover:bg-[#388BFD] text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all shadow-lg hover:shadow-[#1F6FEB]/20 active:scale-95 shrink-0"
          >
            <Download size={18} /> Exportar Excel
          </button>
        )}
      </div>

      {summary && summary.collaborator ? (
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
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
              <div className="flex items-center gap-4 text-violet-500 mb-5">
                <ArrowUpCircle size={20} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Compensação</span>
              </div>
              <p className="text-4xl font-black text-white tabular-nums tracking-tighter">{summary.compensation} <span className="text-xs opacity-50">DIAS</span></p>
            </div>

            <div className="bg-[#161B22] p-8 rounded-[2rem] border border-[#30363D]">
              <div className="flex items-center gap-4 text-rose-500 mb-5">
                <ArrowDownCircle size={20} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Descontos</span>
              </div>
              <p className="text-4xl font-black text-white tabular-nums tracking-tighter">-{summary.discounts} <span className="text-xs opacity-50">DIAS</span></p>
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
                    <th className="px-10 py-5 text-right">Dias (C/U/F)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363D]">
                  {summary.history.map((record) => (
                    <tr key={record.id} className="hover:bg-[#1F6FEB]/5 transition-colors">
                      <td className="px-10 py-6">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${
                          record.type === RequestType.SALDO_INICIAL ? 'border-blue-500/30 bg-blue-900/40 text-[#1F6FEB]' : 
                          record.type === RequestType.COMPENSACAO ? 'border-violet-500/30 bg-violet-900/40 text-violet-500' :
                          record.type === RequestType.DESCONTO ? 'border-rose-500/30 bg-rose-900/40 text-rose-500' : 
                          'border-emerald-500/30 bg-emerald-900/40 text-emerald-500'}`}>
                          {record.type}
                        </span>
                      </td>
                      <td className="px-10 py-6 text-[#8B949E] font-bold text-xs uppercase tabular-nums">
                        {record.type === RequestType.SALDO_INICIAL && record.startDate === record.endDate ? '-' : `${formatDate(record.startDate)} — ${formatDate(record.endDate)}`}
                      </td>
                      <td className="px-10 py-6 text-right tabular-nums">
                        <div className="flex flex-col items-end leading-tight">
                          <span className={`font-black text-base ${record.type === RequestType.DESCONTO ? 'text-rose-500' : 'text-white'}`}>
                            {record.type === RequestType.DESCONTO ? '-' : ''}{Math.abs(record.businessDays)}U
                          </span>
                          <div className="flex items-center gap-1 text-[9px] font-bold text-[#8B949E] uppercase tracking-widest">
                            <span>{record.calendarDays}C</span>
                            <span className="opacity-30">|</span>
                            <span>{record.holidaysCount}F</span>
                          </div>
                        </div>
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
