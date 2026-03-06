
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

interface ImportPageProps {
  collaborators: Collaborator[];
  setCollaborators: React.Dispatch<React.SetStateAction<Collaborator[]>>;
  records: VacationRecord[];
  setRecords: React.Dispatch<React.SetStateAction<VacationRecord[]>>;
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

const ImportPage: React.FC<ImportPageProps> = ({ collaborators, setCollaborators, records, setRecords }) => {
  const { user, addLog } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  
  const [file, setFile] = useState<File | null>(null);
  const [rawRecords, setRawRecords] = useState<RawRecord[]>([]);
  const [isValidated, setIsValidated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [columnMappingError, setColumnMappingError] = useState<string | null>(null);
  
  const [importHistory, setImportHistory] = useState<ImportHistory[]>(() => {
    const saved = localStorage.getItem('vacation_import_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveImportHistory = (history: ImportHistory) => {
    const updated = [history, ...importHistory].slice(0, 50);
    setImportHistory(updated);
    localStorage.setItem('vacation_import_history', JSON.stringify(updated));
  };

  const downloadTemplate = () => {
    const headers = "Unidade;Função;Estado;Nome do colaborador;Data de início;Data de fim;Tipo de Solicitação;Dias Corridos;Dias úteis;Observação";
    const example1 = "Sede;Analista;SP;João Silva;01/01/2024;15/01/2024;Férias agendadas no RH;15;10;Férias coletivas";
    const example2 = "Sede;Analista;SP;Maria Souza;;;Saldo Inicial;0;30;Saldo vindo do sistema antigo";
    const blob = new Blob([`\uFEFF${headers}\n${example1}\n${example2}`], { type: 'text/csv;charset=utf-8;' });
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
      unidade: getIndex(['unidade', 'local', 'centro']),
      funcao: getIndex(['função', 'funcao', 'cargo', 'ocupação']),
      estado: getIndex(['estado', 'uf', 'região']),
      nome: getIndex(['nome', 'colaborador', 'funcionario', 'pessoal']),
      inicio: getIndex(['início', 'inicio', 'data de início', 'data inicial', 'periodo inicio']),
      fim: getIndex(['fim', 'final', 'data de fim', 'data final', 'periodo fim']),
      tipo: getIndex(['tipo', 'solicitação', 'solicitacao', 'evento', 'descrição']),
      dias_corridos: getIndex(['corridos', 'total dias']),
      dias_uteis: getIndex(['úteis', 'uteis', 'dias', 'líquido', 'liquido']),
      observacao: getIndex(['observação', 'observacao', 'obs', 'comentário'])
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
    
    // ISO format YYYY-MM-DD
    if (clean.match(/^\d{4}-\d{2}-\d{2}$/)) return clean;
    
    // BR format DD/MM/YYYY or D/M/YY
    const brMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (brMatch) {
      const d = brMatch[1].padStart(2, '0');
      const m = brMatch[2].padStart(2, '0');
      let y = brMatch[3];
      if (y.length === 2) {
        y = parseInt(y) > 50 ? `19${y}` : `20${y}`;
      }
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
    try {
      if (rawRecords.length === 0) {
        setColumnMappingError("Nenhum dado encontrado para validar.");
        return;
      }

      const validated = rawRecords.map(record => {
        const errors: string[] = [];
        if (!record.nome) errors.push("Nome é obrigatório");
        
        const validTypes = Object.values(RequestType) as string[];
        const typeLower = (record.tipo || '').toLowerCase();
        let matchedType = validTypes.find(t => t.toLowerCase() === typeLower);
        
        if (!matchedType && record.tipo) {
           if (typeLower.includes('saldo') || typeLower.includes('inicial')) matchedType = RequestType.SALDO_INICIAL;
           else if (typeLower.includes('agend') || typeLower.includes('rh') || typeLower.includes('marcado')) matchedType = RequestType.AGENDADAS;
           else if (typeLower.includes('desc') || typeLower.includes('uso') || typeLower.includes('utiliz')) matchedType = RequestType.DESCONTO;
           else if (typeLower.includes('abono') || typeLower.includes('pecun')) matchedType = RequestType.ABONO_PECUNIARIO;
        }

        const isInitial = matchedType === RequestType.SALDO_INICIAL;
        const normalizedStart = normalizeDate(record.inicio);
        const normalizedEnd = normalizeDate(record.fim);

        if (!isInitial) {
          if (!normalizedStart) errors.push(`Início obrigatório`);
          if (!normalizedEnd) errors.push(`Fim obrigatório`);
        }

        const finalStart = normalizedStart || new Date().toISOString().split('T')[0];
        const finalEnd = normalizedEnd || finalStart;

        if (!matchedType) {
          errors.push(`Tipo desconhecido: "${record.tipo}"`);
        }

        return { 
          ...record, 
          isValid: errors.length === 0, 
          errors,
          inicio: finalStart,
          fim: finalEnd,
          tipo: matchedType || record.tipo
        };
      });
      
      setRawRecords(validated);
      setIsValidated(true);
      setColumnMappingError(null);
    } catch (err) {
      console.error("Validation error:", err);
      setColumnMappingError("Erro crítico durante a validação. Verifique o formato do CSV.");
    }
  };

  const processImport = async () => {
    if (!isAdmin || !isValidated) return;
    
    const validRows = rawRecords.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const newCollaborators = [...collaborators];
    const newRecords = [...records];

    validRows.forEach(raw => {
      let collab = newCollaborators.find(c => c.name.toLowerCase() === raw.nome.toLowerCase());
      if (!collab) {
        collab = {
          id: Math.random().toString(36).substr(2, 9),
          name: raw.nome,
          role: raw.funcao || 'Não informada',
          unit: raw.unidade || 'Não informada',
          state: (raw.estado || 'SP').toUpperCase().substring(0, 2)
        };
        newCollaborators.push(collab);
      }

      const isInitial = raw.tipo === RequestType.SALDO_INICIAL;
      const businessDays = parseNumber(raw.dias_uteis);

      newRecords.push({
        id: Math.random().toString(36).substr(2, 9),
        collaboratorId: collab.id,
        type: raw.tipo as RequestType,
        startDate: raw.inicio,
        endDate: raw.fim,
        calendarDays: isInitial ? 0 : Math.floor(parseNumber(raw.dias_corridos)),
        businessDays: Math.floor(businessDays),
        holidaysCount: 0,
        unit: collab.unit,
        state: collab.state,
        observation: raw.observacao
      });
    });

    setCollaborators(newCollaborators);
    setRecords(newRecords);
    
    saveImportHistory({
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
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 5000);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight uppercase">Módulo de Importação</h2>
          <p className="text-[#8B949E] font-bold text-sm uppercase tracking-wider">Migração Massiva de Registros Históricos (Suporte até 1000+ linhas)</p>
        </div>
        {!isAdmin && (
          <div className="bg-amber-950/20 text-amber-500 px-6 py-3 rounded-2xl border border-amber-500/30 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3">
            <ShieldAlert size={18} />
            RESTRITO A ADMINISTRADORES
          </div>
        )}
      </header>

      {showSuccess && (
        <div className="bg-emerald-950/20 border border-emerald-500/30 p-6 rounded-3xl flex items-start gap-4 animate-in slide-in-from-top-4">
          <CheckCircle2 className="text-emerald-500 shrink-0" size={24} />
          <div>
            <p className="font-black text-emerald-500 text-xs uppercase tracking-widest">Importação Concluída</p>
            <p className="text-[#8B949E] text-xs mt-2 font-bold uppercase tracking-tight leading-relaxed">Os dados foram validados e carregados com sucesso para o sistema.</p>
          </div>
        </div>
      )}

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
              <div className="bg-blue-950/20 border border-blue-500/20 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-[#1F6FEB]">
                  <Info size={14} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Dica de Preenchimento</span>
                </div>
                <p className="text-[9px] text-[#8B949E] font-bold leading-relaxed uppercase">
                  Para <strong className="text-white">Saldo Inicial</strong>, as datas são <span className="text-emerald-500">opcionais</span>. Para <strong className="text-white">Descontos</strong> e <strong className="text-white">Férias</strong>, as datas são <span className="text-rose-500">obrigatórias</span>.
                </p>
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
              {rawRecords.length > 0 && (
                <div className="flex gap-4">
                  <span className="text-[10px] font-black uppercase text-[#8B949E] tabular-nums">{rawRecords.length} REGISTROS TOTAIS</span>
                  {isValidated && <span className="text-[10px] font-black uppercase text-emerald-500 tabular-nums">{rawRecords.filter(r => r.isValid).length} REGISTROS VÁLIDOS</span>}
                </div>
              )}
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
                  {rawRecords.slice(0, 100).map((record, i) => (
                    <tr key={i} className="hover:bg-[#1F6FEB]/5 transition-colors">
                      <td className="px-8 py-5">{record.isValid ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-rose-500" />}</td>
                      <td className="px-8 py-5 font-bold text-white uppercase tracking-tight">
                        {record.nome}
                        {!record.isValid && record.errors && (
                          <div className="text-[9px] text-rose-500 font-black mt-1 lowercase tracking-normal">
                            {record.errors.join(' • ')}
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-5">
                         <span className="text-[9px] font-black uppercase text-[#8B949E] tracking-widest">{record.tipo}</span>
                      </td>
                      <td className="px-8 py-5 font-black text-right text-white tabular-nums">
                        {record.dias_uteis}
                      </td>
                    </tr>
                  ))}
                  {rawRecords.length > 100 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-4 text-center bg-[#0D1117]/30">
                        <p className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest">
                          Exibindo apenas os primeiros 100 registros de {rawRecords.length}. Todos os registros serão processados na migração.
                        </p>
                      </td>
                    </tr>
                  )}
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
