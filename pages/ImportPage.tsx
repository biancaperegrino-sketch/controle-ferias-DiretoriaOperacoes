
import React, { useState, useRef } from 'react';
import { Collaborator, VacationRecord, RequestType, ImportHistory, UserRole } from '../types';
import { 
  FileUp, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet, 
  History, 
  Trash2, 
  ShieldAlert,
  Loader2,
  Info,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../App';

import { db } from '../src/lib/firebase';
import { collection, doc, setDoc, writeBatch, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

interface ImportPageProps {
  collaborators: Collaborator[];
  records: VacationRecord[];
}

interface RawRecord {
  unidade: string;
  funcao: string;
  estado: string;
  nome: string;
  inicio: string;
  fim: string;
  tipo: string;
  dias_corridos: string;
  dias_uteis: string;
  observacao?: string;
  isValid?: boolean;
  errors?: string[];
}

const ImportPage: React.FC<ImportPageProps> = ({ collaborators, records }) => {
  const { user, addLog } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  
  const [file, setFile] = useState<File | null>(null);
  const [rawRecords, setRawRecords] = useState<RawRecord[]>([]);
  const [isValidated, setIsValidated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [columnMappingError, setColumnMappingError] = useState<string | null>(null);
  
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync Import History
  React.useEffect(() => {
    const q = query(collection(db, 'import_history'), orderBy('date', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImportHistory));
      setImportHistory(list);
    });
    return unsub;
  }, []);

  const saveImportHistory = async (history: ImportHistory) => {
    const id = Math.random().toString(36).substr(2, 9);
    await setDoc(doc(db, 'import_history', id), { ...history, id });
  };

  const downloadTemplate = () => {
    const headers = "Unidade;Função;Estado;Nome do colaborador;Data de início;Data de fim;Tipo de Solicitação;Dias Corridos;Dias úteis;Observação";
    const example = "Sede;Analista;SP;João Silva;01/01/2024;15/01/2024;Agendadas;15;10;Férias coletivas";
    const blob = new Blob([`\uFEFF${headers}\n${example}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "modelo_importacao_fgv.csv";
    link.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setIsValidated(false);
      setRawRecords([]);
      setColumnMappingError(null);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseCSV(text);
      };
      reader.readAsText(selectedFile);
    }
  };

  const parseCSV = (text: string) => {
    const cleanText = text.replace(/^\uFEFF/, '');
    const lines = cleanText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      setColumnMappingError("O arquivo parece estar vazio.");
      return;
    }

    const headerLine = lines[0];
    const delimiter = headerLine.includes(';') ? ';' : ',';
    const headers = headerLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/"/g, ''));

    const getIndex = (possibleNames: string[]) => {
      return headers.findIndex(h => possibleNames.some(p => h.includes(p.toLowerCase())));
    };

    const map = {
      unidade: getIndex(['unidade', 'local']),
      funcao: getIndex(['função', 'funcao', 'cargo']),
      estado: getIndex(['estado', 'uf']),
      nome: getIndex(['nome', 'colaborador', 'funcionario']),
      inicio: getIndex(['início', 'inicio', 'data de início']),
      fim: getIndex(['fim', 'final', 'data de fim']),
      tipo: getIndex(['tipo', 'solicitação', 'solicitacao']),
      dias_corridos: getIndex(['corridos']),
      dias_uteis: getIndex(['úteis', 'uteis']),
      observacao: getIndex(['observação', 'observacao', 'obs'])
    };

    if (map.nome === -1) {
      setColumnMappingError("Coluna 'Nome' não encontrada.");
      return;
    }

    const parsed: RawRecord[] = lines.slice(1).map(line => {
      const cols = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
      return {
        unidade: map.unidade !== -1 ? cols[map.unidade] || '' : '',
        funcao: map.funcao !== -1 ? cols[map.funcao] || '' : '',
        estado: map.estado !== -1 ? cols[map.estado] || '' : '',
        nome: cols[map.nome] || '',
        inicio: map.inicio !== -1 ? cols[map.inicio] || '' : '',
        fim: map.fim !== -1 ? cols[map.fim] || '' : '',
        tipo: map.tipo !== -1 ? cols[map.tipo] || '' : '',
        dias_corridos: map.dias_corridos !== -1 ? cols[map.dias_corridos] || '0' : '0',
        dias_uteis: map.dias_uteis !== -1 ? cols[map.dias_uteis] || '0' : '0',
        observacao: map.observacao !== -1 ? cols[map.observacao] || '' : ''
      };
    });

    setRawRecords(parsed);
  };

  const normalizeDate = (dateStr: string) => {
    if (!dateStr) return null;
    const clean = dateStr.trim();
    if (clean.match(/^\d{4}-\d{2}-\d{2}$/)) return clean;
    const brMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (brMatch) {
      const d = brMatch[1].padStart(2, '0');
      const m = brMatch[2].padStart(2, '0');
      const y = brMatch[3];
      return `${y}-${m}-${d}`;
    }
    return null;
  };

  const parseNumber = (str: string) => {
    if (!str) return 0;
    const clean = str.replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const validateData = () => {
    const validated = rawRecords.map(record => {
      const errors: string[] = [];
      if (!record.nome) errors.push("Nome é obrigatório");
      
      const validTypes = Object.values(RequestType) as string[];
      let matchedType = validTypes.find(t => t.toLowerCase() === record.tipo.toLowerCase());
      if (!matchedType && record.tipo) {
         if (record.tipo.toLowerCase().includes('saldo')) matchedType = RequestType.SALDO_INICIAL;
         else if (record.tipo.toLowerCase().includes('agend')) matchedType = RequestType.AGENDADAS;
         else if (record.tipo.toLowerCase().includes('desc')) matchedType = RequestType.DESCONTO;
      }

      const isInitial = matchedType === RequestType.SALDO_INICIAL;
      const normalizedStart = normalizeDate(record.inicio);
      const normalizedEnd = normalizeDate(record.fim);

      if (!isInitial) {
        if (!normalizedStart) errors.push(`Início obrigatório`);
        if (!normalizedEnd) errors.push(`Fim obrigatório`);
      }

      if (!matchedType) {
        errors.push(`Tipo desconhecido: "${record.tipo}"`);
      }

      return { 
        ...record, 
        isValid: errors.length === 0, 
        errors,
        inicio: normalizedStart || (isInitial ? new Date().toISOString().split('T')[0] : record.inicio),
        fim: normalizedEnd || (isInitial ? (normalizedStart || new Date().toISOString().split('T')[0]) : record.fim),
        tipo: matchedType || record.tipo
      };
    });
    
    setRawRecords(validated);
    setIsValidated(true);
  };

  const processImport = async () => {
    if (!isAdmin || !isValidated) return;
    
    const validRows = rawRecords.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setIsProcessing(true);
    
    const batch = writeBatch(db);
    const tempCollaborators = [...collaborators];

    validRows.forEach(raw => {
      let collab = tempCollaborators.find(c => c.name.toLowerCase() === raw.nome.toLowerCase());
      if (!collab) {
        const collabId = Math.random().toString(36).substr(2, 9);
        collab = {
          id: collabId,
          name: raw.nome,
          role: raw.funcao || 'Não informada',
          unit: raw.unidade || 'Não informada',
          state: (raw.estado || 'SP').toUpperCase().substring(0, 2)
        };
        tempCollaborators.push(collab);
        batch.set(doc(db, 'collaborators', collabId), collab);
      }

      const isInitial = raw.tipo === RequestType.SALDO_INICIAL;
      const businessDays = parseNumber(raw.dias_uteis);
      const recordId = Math.random().toString(36).substr(2, 9);

      const recordData = {
        id: recordId,
        collaboratorId: collab.id,
        type: raw.tipo as RequestType,
        startDate: raw.inicio,
        endDate: raw.fim,
        calendarDays: isInitial ? 0 : Math.floor(parseNumber(raw.dias_corridos)),
        businessDays: Math.floor(businessDays),
        holidaysCount: 0,
        unit: collab.unit,
        state: collab.state,
        observation: raw.observacao,
        usuarioEdicao: user?.name,
        dataHoraEdicao: new Date().toISOString(),
        statusEdicao: 'salvo'
      };
      batch.set(doc(db, 'records', recordId), recordData);
    });

    await batch.commit();
    
    await saveImportHistory({
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      userName: user?.name || 'Sistema',
      fileName: file?.name || 'Arquivo',
      recordsCount: validRows.length,
      status: 'Sucesso'
    });
    
    setIsProcessing(false);
    setFile(null);
    setRawRecords([]);
    setIsValidated(false);
    alert(`Importação de dados concluída com sucesso.`);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight uppercase">Módulo de Importação</h2>
          <p className="text-[#8B949E] font-bold text-sm uppercase tracking-wider">Migração Massiva de Registros Históricos</p>
        </div>
        {!isAdmin && (
          <div className="bg-amber-950/20 text-amber-500 px-6 py-3 rounded-2xl border border-amber-500/30 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3">
            <ShieldAlert size={18} />
            RESTRITO A ADMINISTRADORES
          </div>
        )}
      </header>

      {columnMappingError && (
        <div className="bg-rose-950/20 border border-rose-500/30 p-6 rounded-3xl flex items-start gap-4 animate-in slide-in-from-top-4">
          <AlertTriangle className="text-rose-500 shrink-0" size={24} />
          <div>
            <p className="font-black text-rose-500 text-xs uppercase tracking-widest">Inconsistência Estrutural Detectada</p>
            <p className="text-[#8B949E] text-xs mt-2 font-bold uppercase tracking-tight leading-relaxed">{columnMappingError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-1 space-y-8">
          <div className="bg-[#161B22] p-10 rounded-[2.5rem] border border-[#30363D] shadow-xl space-y-10">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-[#1F6FEB]/10 text-[#1F6FEB] rounded-2xl flex items-center justify-center border border-[#1F6FEB]/20">
                  <Download size={20} />
                </div>
                <h3 className="font-black text-white uppercase tracking-widest text-[11px]">1. Obter Modelo Fiscal</h3>
              </div>
              <button onClick={downloadTemplate} className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-[#0D1117] border border-[#30363D] hover:border-[#1F6FEB] hover:bg-[#1F6FEB]/5 rounded-2xl transition-all font-black text-[#8B949E] hover:text-white text-[10px] uppercase tracking-[0.2em]">
                <FileSpreadsheet size={18} />
                Baixar Template CSV
              </button>
            </div>

            <div className="space-y-10">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-[#30363D] text-white rounded-2xl flex items-center justify-center">
                  <FileUp size={20} />
                </div>
                <h3 className="font-black text-white uppercase tracking-widest text-[11px]">2. Upload e Processamento</h3>
              </div>
              
              <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-[2.5rem] p-12 text-center cursor-pointer transition-all ${file ? 'bg-emerald-950/10 border-emerald-500/40' : 'bg-[#0D1117] border-[#30363D] hover:border-[#1F6FEB]'}`}>
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileChange} />
                <div className="space-y-5">
                  <div className={`mx-auto h-20 w-20 rounded-[2rem] flex items-center justify-center border transition-all ${file ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-[#161B22] text-[#484F58] border-[#30363D]'}`}>
                    <FileUp size={32} />
                  </div>
                  <p className="font-black text-white text-xs uppercase tracking-widest truncate max-w-full px-4">{file ? file.name : 'CLIQUE PARA SELECIONAR CSV'}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={validateData} disabled={!file || isProcessing} className="flex-1 py-5 bg-[#0D1117] text-[#8B949E] border border-[#30363D] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#30363D] hover:text-white transition-all">Validar Dados</button>
                <button onClick={processImport} disabled={!isValidated || isProcessing} className="flex-1 py-5 bg-[#1F6FEB] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#388BFD] transition-all shadow-lg shadow-blue-500/20">Iniciar Migração</button>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="bg-[#161B22] rounded-[2.5rem] border border-[#30363D] shadow-xl overflow-hidden h-full flex flex-col">
            <div className="px-10 py-6 border-b border-[#30363D] bg-[#0D1117]/50 flex justify-between items-center">
              <h4 className="font-black text-white uppercase tracking-[0.2em] text-[10px]">Diagnóstico de Pré-Importação</h4>
              {isValidated && <span className="text-[10px] font-black uppercase text-emerald-500 tabular-nums">{rawRecords.filter(r => r.isValid).length} REGISTROS VÁLIDOS</span>}
            </div>
            <div className="flex-1 overflow-auto max-h-[600px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0D1117] sticky top-0 z-10 text-[10px] font-black uppercase text-[#8B949E] tracking-[0.2em]">
                  <tr>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-8 py-5">Colaborador Identificado</th>
                    <th className="px-8 py-5">Evento</th>
                    <th className="px-8 py-5 text-right">Valor Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363D]">
                  {rawRecords.map((record, i) => (
                    <tr key={i} className="hover:bg-[#1F6FEB]/5 transition-colors">
                      <td className="px-8 py-5">{record.isValid ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-rose-500" />}</td>
                      <td className="px-8 py-5 font-bold text-white uppercase tracking-tight">{record.nome}</td>
                      <td className="px-8 py-5">
                         <span className="text-[9px] font-black uppercase text-[#8B949E] tracking-widest">{record.tipo}</span>
                      </td>
                      <td className="px-8 py-5 font-black text-right text-white tabular-nums">
                        {record.tipo === RequestType.SALDO_INICIAL ? (record.saldo_inicial || record.dias_uteis) : record.dias_uteis}
                      </td>
                    </tr>
                  ))}
                  {rawRecords.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-40 text-center">
                        <div className="flex flex-col items-center gap-6 opacity-20">
                           <div className="h-20 w-20 bg-[#0D1117] rounded-3xl border border-[#30363D] flex items-center justify-center">
                              <FileSpreadsheet size={40} className="text-[#8B949E]" />
                           </div>
                           <p className="font-black uppercase tracking-[0.4em] text-[10px]">Aguardando processamento de arquivo CSV</p>
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
  );
};

export default ImportPage;
