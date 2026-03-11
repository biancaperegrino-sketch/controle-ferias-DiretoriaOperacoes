
import React, { useState, useRef } from 'react';
import { Holiday, HolidayType, UserRole } from '../types';
import { BRAZILIAN_STATES } from '../constants';
import * as XLSX from 'xlsx';
import { 
  Calendar, 
  Plus, 
  X, 
  Edit2, 
  Trash2, 
  Globe, 
  MapPin, 
  ShieldAlert, 
  FileUp, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet, 
  Loader2, 
  Info,
  Building
} from 'lucide-react';
import { formatDate } from '../utils/dateUtils';
import { useAuth } from '../App';
import ConfirmModal from '../components/ConfirmModal';

import { db } from '../src/lib/firebase';
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

interface HolidaysPageProps {
  holidays: Holiday[];
}

interface RawHolidayRecord {
  nome: string;
  data: string;
  tipo: string;
  estado: string;
  isValid?: boolean;
  errors?: string[];
}

const HolidaysPage: React.FC<HolidaysPageProps> = ({ holidays }) => {
  const { user, addLog } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const canAdd = isAdmin;
  const canEdit = isAdmin;
  const canDelete = isAdmin;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<{id: string, name: string} | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [rawRecords, setRawRecords] = useState<RawHolidayRecord[]>([]);
  const [isValidated, setIsValidated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [columnMappingError, setColumnMappingError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: HolidayType.NACIONAL,
    state: ''
  });

  const handleOpenModal = (holiday?: Holiday) => {
    if (holiday) {
      if (!canEdit) return;
      setEditingHoliday(holiday);
      setFormData({
        name: holiday.name,
        date: holiday.date,
        type: holiday.type,
        state: holiday.state || ''
      });
    } else {
      if (!canAdd) return;
      setEditingHoliday(null);
      setFormData({ name: '', date: '', type: HolidayType.NACIONAL, state: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = editingHoliday?.id || Math.random().toString(36).substr(2, 9);
    const finalHoliday: Holiday = {
      id,
      name: formData.name,
      date: formData.date,
      type: formData.type,
      ...(formData.type === HolidayType.ESTADUAL ? { state: formData.state } : {})
    };

    await setDoc(doc(db, 'holidays', id), finalHoliday);
    
    if (editingHoliday) {
      addLog(`Editou o feriado ${formData.name}`);
    } else {
      addLog(`Cadastrou o feriado ${formData.name}`);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (!canDelete) return;
    setHolidayToDelete({ id, name });
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!holidayToDelete || !canDelete) return;
    await deleteDoc(doc(db, 'holidays', holidayToDelete.id));
    addLog(`Excluiu o feriado ${holidayToDelete.name}`);
    setHolidayToDelete(null);
  };

  const downloadTemplate = () => {
    const headers = [["Nome do feriado", "Data do feriado", "Tipo de feriado", "Estado"]];
    const data = [
      ["Confraternização Universal", "01/01/2024", "Nacional", ""],
      ["Revolução Constitucionalista", "09/07/2024", "Estadual", "SP"]
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);
    XLSX.utils.book_append_sheet(wb, ws, "Modelo Feriados");
    XLSX.writeFile(wb, "modelo_feriados_fgv.xlsx");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setIsValidated(false);
      setRawRecords([]);
      setColumnMappingError(null);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const dataBuffer = event.target?.result;
          if (!dataBuffer) throw new Error("Falha ao ler arquivo.");
          
          const wb = XLSX.read(dataBuffer, { type: 'array', cellDates: true });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          if (!ws) throw new Error("Planilha não encontrada no arquivo.");
          
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
          
          if (data.length === 0) {
            setColumnMappingError("O arquivo parece estar vazio.");
            return;
          }

          // Find header row
          let headerRowIndex = -1;
          for (let i = 0; i < Math.min(data.length, 20); i++) {
            const row = data[i];
            if (row && Array.isArray(row)) {
              const rowStr = row.map(c => String(c || '').toLowerCase());
              if ((rowStr.some(s => s.includes('nome') || s.includes('feriado'))) && 
                  (rowStr.some(s => s.includes('data') || s.includes('dia')))) {
                headerRowIndex = i;
                break;
              }
            }
          }

          if (headerRowIndex === -1) {
            headerRowIndex = 0; // Fallback to first row
          }

          const headers = (data[headerRowIndex] as any[]).map(h => String(h || '').trim().toLowerCase());
          
          const getIndex = (possibleNames: string[]) => {
            return headers.findIndex(h => possibleNames.some(p => h.includes(p.toLowerCase())));
          };

          const map = {
            nome: getIndex(['nome', 'feriado', 'descrição', 'holiday', 'name']),
            data: getIndex(['data', 'dia', 'date', 'day']),
            tipo: getIndex(['tipo', 'type', 'âmbito']),
            estado: getIndex(['estado', 'uf', 'state', 'region'])
          };

          if (map.nome === -1 || map.data === -1) {
            setColumnMappingError("Colunas obrigatórias ('Nome' e 'Data') não identificadas automaticamente. Verifique os cabeçalhos.");
            return;
          }

          const parsed: RawHolidayRecord[] = data.slice(headerRowIndex + 1)
            .filter(row => row && row.length > 0 && row[map.nome])
            .map(row => {
              let dateVal = row[map.data];
              let dateStr = '';
              if (dateVal instanceof Date) {
                const y = dateVal.getFullYear();
                const m = String(dateVal.getMonth() + 1).padStart(2, '0');
                const d = String(dateVal.getDate()).padStart(2, '0');
                dateStr = `${y}-${m}-${d}`;
              } else {
                dateStr = String(dateVal || '').trim();
              }
              return {
                nome: String(row[map.nome] || '').trim(),
                data: dateStr,
                tipo: map.tipo !== -1 ? String(row[map.tipo] || 'Nacional').trim() : 'Nacional',
                estado: map.estado !== -1 ? String(row[map.estado] || '').trim() : ''
              };
            });

          if (parsed.length === 0) {
            setColumnMappingError("Nenhum registro válido encontrado na planilha.");
          } else {
            setRawRecords(parsed);
            setColumnMappingError(null);
          }
        } catch (err) {
          console.error("Import error:", err);
          setColumnMappingError("Erro ao processar planilha. Verifique se o arquivo está corrompido.");
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const normalizeDate = (dateVal: any) => {
    if (!dateVal) return null;
    
    if (dateVal instanceof Date) {
      const y = dateVal.getFullYear();
      const m = String(dateVal.getMonth() + 1).padStart(2, '0');
      const d = String(dateVal.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    const dateStr = String(dateVal).trim();
    const dateStrNoSpaces = dateStr.replace(/\s/g, '');
    
    // YYYY-MM-DD
    if (dateStrNoSpaces.match(/^\d{4}-\d{2}-\d{2}/)) return dateStrNoSpaces.substring(0, 10);
    
    // DD/MM/YYYY
    const brMatch = dateStrNoSpaces.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (brMatch) {
      const d = brMatch[1].padStart(2, '0');
      const m = brMatch[2].padStart(2, '0');
      const y = brMatch[3];
      return `${y}-${m}-${d}`;
    }

    // Excel serial number
    if (!isNaN(Number(dateStrNoSpaces)) && Number(dateStrNoSpaces) > 30000) {
      const date = new Date((Number(dateStrNoSpaces) - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }

    // Try parsing long date strings like "Thu Jan 20 2011..."
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      const y = parsedDate.getFullYear();
      const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const d = String(parsedDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    return null;
  };

  const validateData = () => {
    try {
      if (rawRecords.length === 0) {
        setColumnMappingError("Nenhum dado encontrado para validar.");
        return;
      }

      const validated = rawRecords.map(record => {
        const errors: string[] = [];
        if (!record.nome) errors.push("Nome ausente");
        
        const normalizedDate = normalizeDate(record.data);
        if (!normalizedDate) errors.push(`Data inválida: "${record.data}"`);

        const validTypes = Object.values(HolidayType) as string[];
        let matchedType = validTypes.find(t => t.toLowerCase() === (record.tipo || '').toLowerCase());
        if (!matchedType) {
          const tipoLower = (record.tipo || '').toLowerCase();
          if (tipoLower.includes('nac')) matchedType = HolidayType.NACIONAL;
          else if (tipoLower.includes('est')) matchedType = HolidayType.ESTADUAL;
          else if (tipoLower.includes('mun')) matchedType = HolidayType.MUNICIPAL;
        }
        
        if (!matchedType) errors.push(`Tipo inválido: "${record.tipo}"`);
        
        if (matchedType === HolidayType.ESTADUAL && !record.estado) {
          errors.push("UF obrigatória para estadual");
        }

        return {
          ...record,
          isValid: errors.length === 0,
          errors,
          data: normalizedDate || record.data,
          tipo: matchedType || record.tipo,
          estado: (record.estado || '').toUpperCase().substring(0, 2)
        };
      });

      setRawRecords(validated);
      setIsValidated(true);
      setColumnMappingError(null);
    } catch (err) {
      console.error("Validation error:", err);
      setColumnMappingError("Erro crítico durante a validação. Verifique se as colunas estão corretas.");
    }
  };

  const processImport = async () => {
    if (!isAdmin || !isValidated) return;
    const validRows = rawRecords.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setIsProcessing(true);
    setColumnMappingError(null);
    
    try {
      // Chunking strategy for Firestore batches (max 500 ops per batch)
      const ops: { type: 'set' | 'delete', ref: any, data?: any }[] = [];

      if (replaceExisting) {
        holidays.forEach(h => {
          ops.push({ type: 'delete', ref: doc(db, 'holidays', h.id) });
        });
      }

      validRows.forEach(raw => {
        const id = Math.random().toString(36).substr(2, 9);
        const holidayData: Holiday = {
          id,
          name: raw.nome,
          date: raw.data,
          type: raw.tipo as HolidayType,
          ...(raw.tipo === HolidayType.ESTADUAL ? { state: raw.estado } : {})
        };
        ops.push({ type: 'set', ref: doc(db, 'holidays', id), data: holidayData });
      });

      // Execute batches in chunks of 450 to be safe
      const chunkSize = 450;
      for (let i = 0; i < ops.length; i += chunkSize) {
        const chunk = ops.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        
        chunk.forEach(op => {
          if (op.type === 'delete') {
            batch.delete(op.ref);
          } else {
            batch.set(op.ref, op.data);
          }
        });
        
        await batch.commit();
      }

      addLog(`Importou/Atualizou ${validRows.length} feriados via planilha.`);
      
      setIsProcessing(false);
      setFile(null);
      setRawRecords([]);
      setIsValidated(false);
      setIsImportModalOpen(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err) {
      console.error("Import execution error:", err);
      setIsProcessing(false);
      setColumnMappingError("Erro ao gravar dados no banco. Verifique sua conexão e permissões.");
    }
  };

  const sortedHolidays = [...holidays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-end gap-6">
        <div className="flex flex-wrap items-center gap-3">
          {canAdd ? (
            <>
              <button 
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-sm active:scale-95 border bg-[#161B22] text-[#8B949E] border-[#30363D] hover:text-white hover:bg-[#30363D]"
              >
                <FileUp size={16} />
                Importar Planilha
              </button>
              <button 
                onClick={() => handleOpenModal()}
                className="bg-[#1F6FEB] hover:bg-[#388BFD] text-white px-5 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
              >
                <Plus size={16} />
                Novo Feriado
              </button>
            </>
          ) : (
            <div className="bg-[#161B22] border border-[#30363D] px-4 py-3 rounded-2xl flex items-center gap-3 text-[#8B949E] text-[10px] font-black uppercase tracking-widest">
              <ShieldAlert size={16} className="text-[#1F6FEB]" />
              Base de Consulta
            </div>
          )}
        </div>
      </header>

      {showSuccess && (
        <div className="bg-emerald-950/20 border border-emerald-500/30 p-6 rounded-3xl flex items-start gap-4 animate-in slide-in-from-top-4">
          <CheckCircle2 className="text-emerald-500 shrink-0" size={24} />
          <div>
            <p className="font-black text-emerald-500 text-xs uppercase tracking-widest">Importação Concluída</p>
            <p className="text-[#8B949E] text-xs mt-2 font-bold uppercase tracking-tight leading-relaxed">O calendário de feriados foi atualizado com sucesso.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {sortedHolidays.map((holiday) => (
          <div key={holiday.id} className="bg-[#161B22] p-8 rounded-[2rem] border border-[#30363D] shadow-xl hover:border-[#1F6FEB]/50 transition-all group relative overflow-hidden">
            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1F6FEB]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-[#0D1117] p-4 rounded-2xl text-[#8B949E] border border-[#30363D] group-hover:text-[#1F6FEB] group-hover:border-[#1F6FEB]/40 transition-all">
                  <Calendar size={22} />
                </div>
                <div className="flex gap-1">
                  {canEdit && (
                    <button onClick={() => handleOpenModal(holiday)} className="p-3 text-[#484F58] hover:text-[#1F6FEB] hover:bg-[#30363D] rounded-xl transition-all"><Edit2 size={18} /></button>
                  )}
                  {canDelete && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(holiday.id, holiday.name);
                      }} 
                      className="p-3 text-[#484F58] hover:text-rose-500 hover:bg-rose-900/20 rounded-xl transition-all"
                      title="Excluir Feriado"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  {!canEdit && !canDelete && (
                    <span className="text-[9px] font-black uppercase text-[#484F58] tracking-widest mt-3">Consulta</span>
                  )}
                </div>
              </div>
              <h4 className="font-black text-white mb-2 leading-tight uppercase tracking-tight text-lg">{holiday.name}</h4>
              <p className="text-[#8B949E] font-black tabular-nums text-sm mb-6 uppercase tracking-wider">{formatDate(holiday.date)}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {holiday.type === HolidayType.NACIONAL && (
                  <span className="bg-blue-900/40 text-[#1F6FEB] px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border border-[#1F6FEB]/30">Nacional</span>
                )}
                {holiday.type === HolidayType.ESTADUAL && (
                  <span className="bg-amber-900/40 text-amber-500 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border border-amber-500/30">Estadual ({holiday.state})</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {sortedHolidays.length === 0 && (
          <div className="col-span-full py-32 bg-[#161B22] border-2 border-dashed border-[#30363D] rounded-[3rem] text-center flex flex-col items-center justify-center gap-6 opacity-30">
             <Calendar size={64} />
             <p className="font-black uppercase tracking-[0.3em] text-xs">Calendário não configurado</p>
          </div>
        )}
      </div>

      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0D1117]/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#161B22] w-full max-w-6xl h-[90vh] rounded-[3rem] shadow-2xl border border-[#30363D] overflow-hidden flex flex-col">
            <div className="px-10 py-8 border-b border-[#30363D] flex items-center justify-between bg-[#0D1117]/50">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-[#1F6FEB] rounded-2xl flex items-center justify-center text-white">
                  <FileUp size={24} />
                </div>
                <div>
                  <h3 className="font-black text-white text-lg uppercase tracking-tight">Importação de Feriados</h3>
                  <p className="text-[#8B949E] text-[10px] font-black uppercase tracking-widest">Carregamento massivo via planilha Excel/CSV</p>
                </div>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="h-10 w-10 bg-[#30363D] hover:bg-[#484F58] rounded-full flex items-center justify-center text-white"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-hidden p-10">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 h-full">
                <div className="lg:col-span-1 space-y-8 overflow-y-auto pr-4 custom-scrollbar">
                  <div className="bg-[#0D1117] p-8 rounded-[2rem] border border-[#30363D] space-y-8">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-[#1F6FEB] uppercase tracking-[0.2em]">1. Preparação</h4>
                      <button onClick={downloadTemplate} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#161B22] border border-[#30363D] hover:border-[#1F6FEB] rounded-2xl transition-all font-black text-[#8B949E] hover:text-white text-[10px] uppercase tracking-widest">
                        <FileSpreadsheet size={18} />
                        Baixar Modelo
                      </button>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-[#1F6FEB] uppercase tracking-[0.2em]">2. Seleção de Arquivo</h4>
                      <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed rounded-[2rem] p-8 text-center cursor-pointer bg-[#161B22] border-[#30363D] hover:border-[#1F6FEB] transition-all group">
                        <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx" onChange={handleFileChange} />
                        <div className="space-y-3">
                          <FileUp size={24} className="mx-auto text-[#484F58] group-hover:text-[#1F6FEB]" />
                          <p className="font-black text-[#8B949E] text-[10px] uppercase tracking-widest truncate">{file ? file.name : 'Clique para selecionar'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-[#1F6FEB] uppercase tracking-[0.2em]">3. Configurações</h4>
                      <label className="flex items-center gap-4 p-4 bg-[#161B22] rounded-2xl border border-[#30363D] cursor-pointer group">
                        <input type="checkbox" checked={replaceExisting} onChange={e => setReplaceExisting(e.target.checked)} className="h-5 w-5 rounded border-[#30363D] bg-[#0D1117] text-[#1F6FEB] focus:ring-[#1F6FEB]" />
                        <span className="text-[9px] font-black text-[#8B949E] uppercase tracking-widest group-hover:text-white transition-colors">Substituir calendário atual</span>
                      </label>
                    </div>

                    <div className="pt-4 space-y-4">
                      {columnMappingError && (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3">
                          <AlertCircle className="text-rose-500 shrink-0" size={16} />
                          <p className="text-rose-500 text-[9px] font-bold uppercase leading-relaxed">{columnMappingError}</p>
                        </div>
                      )}
                      <div className="flex flex-col gap-3">
                        <button onClick={validateData} disabled={!file || isProcessing} className="w-full py-4 bg-[#1F6FEB] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#388BFD] transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50">Validar Dados</button>
                        <button onClick={processImport} disabled={!isValidated || isProcessing} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50">Confirmar Importação</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
                  <div className="bg-[#0D1117] rounded-[2rem] border border-[#30363D] flex-1 flex flex-col overflow-hidden shadow-inner">
                    <div className="px-8 py-5 border-b border-[#30363D] flex items-center justify-between">
                      <h4 className="font-black text-white uppercase tracking-widest text-[10px]">Pré-visualização dos Dados</h4>
                      {isValidated && <span className="text-[10px] font-black uppercase text-emerald-500">{rawRecords.length} REGISTROS</span>}
                    </div>
                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-[#161B22] sticky top-0 z-10 text-[9px] font-black uppercase text-[#8B949E] tracking-widest">
                          <tr>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Feriado</th>
                            <th className="px-6 py-4">Data</th>
                            <th className="px-6 py-4">Âmbito</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#30363D]">
                          {rawRecords.map((record, i) => (
                            <tr key={i} className={`hover:bg-[#1F6FEB]/5 transition-colors ${!record.isValid && isValidated ? 'bg-rose-950/10' : ''}`}>
                              <td className="px-6 py-4">
                                {record.isValid ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-rose-500" />}
                              </td>
                              <td className="px-6 py-4 font-bold text-white uppercase">{record.nome}</td>
                              <td className="px-6 py-4 font-bold text-[#8B949E] tabular-nums">{record.data}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black uppercase text-[#8B949E]">{record.tipo}</span>
                                  {record.estado && <span className="bg-[#161B22] text-[#8B949E] px-1.5 py-0.5 rounded text-[8px] font-black border border-[#30363D]">{record.estado}</span>}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {rawRecords.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-8 py-32 text-center">
                                <div className="flex flex-col items-center gap-4 opacity-20">
                                  <FileSpreadsheet size={48} className="text-[#8B949E]" />
                                  <p className="font-black uppercase tracking-widest text-[9px]">Aguardando arquivo</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {(canAdd || canEdit) && isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0D1117]/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#161B22] w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-[#30363D] overflow-hidden">
            <div className="px-10 py-8 border-b border-[#30363D] flex items-center justify-between bg-[#0D1117]/50">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-[#1F6FEB] rounded-2xl flex items-center justify-center text-white">
                  <Calendar size={24} />
                </div>
                <h3 className="font-black text-white text-lg uppercase tracking-tight">{editingHoliday ? 'Editar Registro' : 'Novo Feriado'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 bg-[#30363D] hover:bg-[#484F58] rounded-full flex items-center justify-center text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-10 space-y-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E] mb-3">Descrição do Feriado</label>
                  <input required type="text" className="w-full px-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl focus:ring-2 focus:ring-[#1F6FEB]/40 outline-none font-bold text-white uppercase" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E] mb-3">Data Base</label>
                    <input required type="date" className="w-full px-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl focus:ring-2 focus:ring-[#1F6FEB]/40 outline-none font-bold text-white uppercase text-xs" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E] mb-3">Âmbito Governamental</label>
                    <select className="w-full px-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl focus:ring-2 focus:ring-[#1F6FEB]/40 outline-none font-black text-xs uppercase text-white appearance-none cursor-pointer" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as HolidayType})}>
                      <option value={HolidayType.NACIONAL}>NACIONAL</option>
                      <option value={HolidayType.ESTADUAL}>ESTADUAL</option>
                    </select>
                  </div>
                </div>
                {formData.type !== HolidayType.NACIONAL && (
                  <div className="grid grid-cols-1 gap-6 animate-in slide-in-from-top-2">
                    {formData.type === HolidayType.ESTADUAL && (
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E] mb-3">Estado (UF)</label>
                        <select required className="w-full px-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl focus:ring-2 focus:ring-[#1F6FEB]/40 outline-none font-black text-xs uppercase text-white appearance-none cursor-pointer" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})}>
                          <option value="">SELECIONE...</option>
                          {BRAZILIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-4 bg-[#0D1117] text-[#8B949E] border border-[#30363D] rounded-2xl font-black text-[10px] uppercase">Cancelar</button>
                <button type="submit" className="flex-1 px-6 py-4 bg-[#1F6FEB] text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-blue-500/20">Salvar Feriado</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Feriado"
        message={`Deseja realmente remover o feriado ${holidayToDelete?.name}? Isso pode afetar o cálculo de dias úteis em lançamentos existentes.`}
      />
    </div>
  );
};

export default HolidaysPage;
