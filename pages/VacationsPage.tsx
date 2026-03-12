import React, { useState, useEffect } from 'react';
import { VacationRecord, Collaborator, Holiday, RequestType, UserRole } from '../types';
import { calculateVacationMetrics, formatDate } from '../utils/dateUtils';
import { 
  Plus, 
  X, 
  Edit2, 
  Trash2, 
  Paperclip, 
  AlertCircle, 
  Palmtree, 
  ShieldAlert, 
  Calculator, 
  Hash, 
  Calendar,
  CheckSquare,
  Square,
  AlertTriangle,
  History,
  Search,
  Lock,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Mail,
  Upload
} from 'lucide-react';
import { useAuth } from '../App';
import ConfirmModal from '@/components/ConfirmModal';

import { db } from '../src/lib/firebase';
import { doc, setDoc, deleteDoc, updateDoc, onSnapshot, serverTimestamp, deleteField, writeBatch } from 'firebase/firestore';

interface VacationsPageProps {
  records: VacationRecord[];
  collaborators: Collaborator[];
  holidays: Holiday[];
}

const VacationsPage: React.FC<VacationsPageProps> = ({ records, collaborators, holidays }) => {
  const { user, addLog } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const canCreate = isAdmin;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<VacationRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
  const [lock, setLock] = useState<{userId: string, userName: string} | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
    collaboratorId: '',
    type: ''
  });

  // Listen for locks
  useEffect(() => {
    if (editingRecord && isModalOpen) {
      const unsub = onSnapshot(doc(db, 'locks', editingRecord.id), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.userId !== user?.id) {
            setLock({ userId: data.userId, userName: data.userName });
          } else {
            setLock(null);
          }
        } else {
          setLock(null);
        }
      });
      return unsub;
    }
  }, [editingRecord, isModalOpen, user?.id]);

  // Acquire/Release lock
  const acquireLock = async (recordId: string) => {
    if (!user) return;
    await setDoc(doc(db, 'locks', recordId), {
      userId: user.id,
      userName: user.name,
      timestamp: serverTimestamp()
    });
  };

  const releaseLock = async (recordId: string) => {
    await deleteDoc(doc(db, 'locks', recordId));
  };

  // Fix: Added 'observation' to the initial state of formData to prevent type errors when accessing it in the form.
  const [formData, setFormData] = useState({
    collaboratorId: '',
    type: RequestType.AGENDADAS,
    startDate: '',
    endDate: '',
    attachmentName: '',
    attachmentData: '',
    state: '',
    manualDays: '',
    observation: ''
  });

  const [metrics, setMetrics] = useState({
    calendarDays: 0,
    businessDays: 0,
    holidaysCount: 0
  });

  const [modalSearchText, setModalSearchText] = useState('');

  const isManualEntry = formData.type === RequestType.SALDO_INICIAL || formData.type === RequestType.COMPENSACAO;

  useEffect(() => {
    if (formData.collaboratorId) {
      const collab = collaborators.find(c => c.id === formData.collaboratorId);
      if (collab) {
        setFormData(prev => ({ ...prev, state: collab.state }));
      }
    }
  }, [formData.collaboratorId, collaborators]);

  useEffect(() => {
    if (!isManualEntry && formData.startDate && formData.endDate && formData.state) {
      const result = calculateVacationMetrics(formData.startDate, formData.endDate, formData.state, holidays);
      setMetrics(result);
    } else if (isManualEntry) {
      setMetrics({
        calendarDays: 0,
        businessDays: parseInt(formData.manualDays) || 0,
        holidaysCount: 0
      });
    }
  }, [formData.startDate, formData.endDate, formData.state, formData.manualDays, formData.type, holidays]);

  const handleOpenModal = async (record?: VacationRecord) => {
    if (record) {
      if (!isAdmin) return; // Only admin can edit
      setEditingRecord(record);
      await acquireLock(record.id);
      const isManual = record.type === RequestType.SALDO_INICIAL || record.type === RequestType.COMPENSACAO;
      // Fix: Updated setFormData to include the 'observation' field from the record when editing.
      setFormData({
        collaboratorId: record.collaboratorId,
        type: record.type,
        startDate: record.startDate,
        endDate: record.endDate,
        attachmentName: record.attachmentName || '',
        attachmentData: record.attachmentData || '',
        state: record.state,
        manualDays: isManual ? record.businessDays.toString() : '',
        observation: record.observation || ''
      });
      setModalSearchText(collaborators.find(c => c.id === record.collaboratorId)?.name || '');
      setMetrics({
        calendarDays: record.calendarDays,
        businessDays: record.businessDays,
        holidaysCount: record.holidaysCount
      });
    } else {
      setEditingRecord(null);
      setFormData({
        collaboratorId: '',
        type: RequestType.AGENDADAS,
        startDate: '',
        endDate: '',
        attachmentName: '',
        attachmentData: '',
        state: '',
        manualDays: '',
        observation: ''
      });
      setModalSearchText('');
      setMetrics({ calendarDays: 0, businessDays: 0, holidaysCount: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lock) return; // Prevent saving if locked by another user

    const finalStartDate = isManualEntry ? (formData.startDate || new Date().toISOString().split('T')[0]) : formData.startDate;
    const finalEndDate = isManualEntry ? (formData.endDate || finalStartDate) : formData.endDate;

    const id = editingRecord?.id || Math.random().toString(36).substr(2, 9);
    const finalRecord: VacationRecord = {
      id,
      ...formData,
      startDate: finalStartDate,
      endDate: finalEndDate,
      calendarDays: metrics.calendarDays,
      businessDays: metrics.businessDays,
      holidaysCount: metrics.holidaysCount,
      usuarioCriacao: editingRecord?.usuarioCriacao || user?.name,
      timestampCriacao: editingRecord?.timestampCriacao || new Date().toISOString(),
      usuarioEdicao: user?.name,
      dataHoraEdicao: new Date().toISOString(),
      statusEdicao: 'salvo'
    };

    const collab = collaborators.find(c => c.id === formData.collaboratorId);

    if (editingRecord) {
      await setDoc(doc(db, 'records', editingRecord.id), finalRecord);
      await releaseLock(editingRecord.id);
      addLog(`Alterou registro (${formData.type}) para ${collab?.name}`);
    } else {
      await setDoc(doc(db, 'records', id), finalRecord);
      addLog(`Lançou registro (${formData.type}) para ${collab?.name}`);
    }
    setIsModalOpen(false);
  };

  const handleDeleteSingle = (id: string) => {
    if (!isAdmin) return;
    setRecordToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDeleteSingle = async () => {
    if (!recordToDelete || !isAdmin) return;
    const record = records.find(r => r.id === recordToDelete);
    const collab = collaborators.find(c => c.id === record?.collaboratorId);
    await deleteDoc(doc(db, 'records', recordToDelete));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(recordToDelete);
      return next;
    });
    if (collab) {
      addLog(`Excluiu registro de férias de ${collab?.name}`);
    }
    setRecordToDelete(null);
  };

  const handleDeleteBulk = () => {
    if (!isAdmin || selectedIds.size === 0) return;
    setIsBulkConfirmOpen(true);
  };

  const confirmDeleteBulk = async () => {
    if (!isAdmin || selectedIds.size === 0) return;
    const batch = writeBatch(db);
    selectedIds.forEach(id => {
      batch.delete(doc(db, 'records', id));
    });
    await batch.commit();
    addLog(`Excluiu ${selectedIds.size} registros de férias em massa.`);
    setSelectedIds(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedRecords.map(r => r.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setFormData(prev => ({ 
          ...prev, 
          attachmentName: file.name,
          attachmentData: base64
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = () => {
    setFormData(prev => ({
      ...prev,
      attachmentName: '',
      attachmentData: ''
    }));
  };

  const filteredRecords = records.filter(record => {
    const collab = collaborators.find(c => c.id === record.collaboratorId);
    const collabName = collab?.name || '';
    
    const matchesSearch = collabName.toLowerCase().includes(filters.search.toLowerCase());
    const matchesCollab = !filters.collaboratorId || record.collaboratorId === filters.collaboratorId;
    const matchesType = !filters.type || record.type === filters.type;
    
    return matchesSearch && matchesCollab && matchesType;
  });

  const sortedRecords = [...filteredRecords].sort((a, b) => {
    // Saldo Inicial always comes last in a descending list (it's the oldest)
    if (a.type === RequestType.SALDO_INICIAL) return 1;
    if (b.type === RequestType.SALDO_INICIAL) return -1;

    // Sort by creation timestamp first (most recent first)
    const timeA = a.timestampCriacao ? new Date(a.timestampCriacao).getTime() : 0;
    const timeB = b.timestampCriacao ? new Date(b.timestampCriacao).getTime() : 0;
    if (timeB !== timeA) return timeB - timeA;
    
    // Then by start date (most recent first)
    return b.startDate.localeCompare(a.startDate);
  });

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-6">
        <div className="flex flex-wrap items-center gap-3">
          {selectedIds.size > 0 && isAdmin && (
            <button 
              onClick={handleDeleteBulk}
              className="bg-rose-900/20 text-rose-500 border border-rose-500/30 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-rose-500 hover:text-white transition-all active:scale-95"
            >
              <Trash2 size={16} />
              Excluir Selecionados ({selectedIds.size})
            </button>
          )}
          
          {canCreate ? (
            <button 
              onClick={() => handleOpenModal()}
              className="bg-[#1F6FEB] hover:bg-[#388BFD] text-white px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <Plus size={18} />
              Incluir Movimentação
            </button>
          ) : (
            <div className="bg-[#161B22] border border-[#30363D] px-4 py-3 rounded-2xl flex items-center gap-3 text-[#8B949E] text-[10px] font-black uppercase tracking-widest">
              <ShieldAlert size={16} className="text-[#1F6FEB]" />
              Somente Consulta
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#161B22] p-6 rounded-[1.5rem] border border-[#30363D] shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E]">Pesquisar Colaborador</label>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#484F58]" size={18} />
              <input 
                type="text" 
                placeholder="DIGITE O NOME..." 
                className="w-full pl-14 pr-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl focus:ring-2 focus:ring-[#1F6FEB]/40 outline-none font-black text-[11px] uppercase tracking-widest text-white placeholder:text-[#484F58] transition-all"
                value={filters.search}
                onChange={e => setFilters({...filters, search: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E]">Filtrar por Seleção</label>
            <select 
              className="w-full px-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl font-black text-[11px] uppercase text-[#8B949E] outline-none focus:ring-2 focus:ring-[#1F6FEB]/40 transition-all appearance-none cursor-pointer" 
              value={filters.collaboratorId} 
              onChange={e => setFilters({...filters, collaboratorId: e.target.value})}
            >
              <option value="">Todos os Colaboradores</option>
              {[...collaborators].sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E]">Tipo de Solicitação</label>
            <select 
              className="w-full px-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl font-black text-[11px] uppercase text-[#8B949E] outline-none focus:ring-2 focus:ring-[#1F6FEB]/40 transition-all appearance-none cursor-pointer" 
              value={filters.type} 
              onChange={e => setFilters({...filters, type: e.target.value})}
            >
              <option value="">Todos os Tipos</option>
              {Object.values(RequestType).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-[#161B22] rounded-[2rem] border border-[#30363D] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[#0D1117] text-[#8B949E] font-black uppercase tracking-[0.2em] text-[10px]">
              <tr>
                <th className="px-6 py-5 w-10">
                  <button 
                    onClick={toggleSelectAll}
                    className="text-[#30363D] hover:text-[#1F6FEB] transition-colors"
                  >
                    {selectedIds.size === sortedRecords.length && sortedRecords.length > 0 ? (
                      <CheckSquare size={20} className="text-[#1F6FEB]" />
                    ) : (
                      <Square size={20} />
                    )}
                  </button>
                </th>
                <th className="px-4 py-5">Colaborador</th>
                <th className="px-8 py-5">Categoria</th>
                <th className="px-8 py-5">Período</th>
                <th className="px-8 py-5 text-center">Dias (C/U/F)</th>
                <th className="px-8 py-5 text-center">Doc</th>
                {isAdmin && <th className="px-8 py-5 text-right">Gestão</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363D]">
              {sortedRecords.map((record) => {
                const collab = collaborators.find(c => c.id === record.collaboratorId);
                const isSelected = selectedIds.has(record.id);
                return (
                  <tr 
                    key={record.id} 
                    className={`transition-colors group ${isSelected ? 'bg-[#1F6FEB]/10' : 'hover:bg-[#1F6FEB]/5'}`}
                  >
                    <td className="px-6 py-6">
                      <button 
                        onClick={() => toggleSelectRow(record.id)}
                        className={`transition-colors ${isSelected ? 'text-[#1F6FEB]' : 'text-[#30363D] hover:text-[#484F58]'}`}
                      >
                        {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                      </button>
                    </td>
                    <td className="px-4 py-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-white uppercase tracking-tight">{collab?.name || 'Excluído'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`
                        inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border
                        ${record.type === RequestType.SALDO_INICIAL ? 'border-blue-500/30 bg-blue-900/40 text-[#1F6FEB]' : 
                          record.type === RequestType.COMPENSACAO ? 'border-violet-500/30 bg-violet-900/40 text-violet-500' :
                          record.type === RequestType.DESCONTO ? 'border-rose-500/30 bg-rose-900/40 text-rose-500' : 
                          'border-emerald-500/30 bg-emerald-900/40 text-emerald-500'}
                      `}>
                        {record.type}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-[#8B949E] font-bold text-xs tabular-nums uppercase">
                      {(record.type === RequestType.SALDO_INICIAL || record.type === RequestType.COMPENSACAO) && record.startDate === record.endDate ? '-' : (
                        <div className="flex items-center gap-2">
                          {formatDate(record.startDate)} <span className="text-[#30363D] tracking-tighter">—</span> {formatDate(record.endDate)}
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6 text-center tabular-nums">
                      <div className="flex flex-col items-center leading-tight">
                        <span className="font-black text-white text-base">{record.businessDays}U</span>
                        <div className="flex items-center gap-1 text-[9px] font-bold text-[#8B949E] uppercase tracking-widest">
                          <span>{record.calendarDays}C</span>
                          <span className="opacity-30">|</span>
                          <span>{record.holidaysCount}F</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      {record.attachmentName ? (
                        <button 
                          onClick={() => {
                            if (record.attachmentData) {
                              const win = window.open();
                              if (win) {
                                win.document.write(`<iframe src="${record.attachmentData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                              }
                            }
                          }}
                          className="p-2 text-[#1F6FEB] hover:bg-[#1F6FEB]/10 rounded-lg transition-all"
                          title={record.attachmentName}
                        >
                          <Paperclip size={18} />
                        </button>
                      ) : <span className="text-[#30363D]">-</span>}
                    </td>
                    {isAdmin && (
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleOpenModal(record)} className="p-3 text-[#8B949E] hover:text-[#1F6FEB] hover:bg-[#30363D] rounded-xl transition-all">
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSingle(record.id);
                            }} 
                            className="p-3 text-[#8B949E] hover:text-rose-500 hover:bg-rose-900/20 rounded-xl transition-all"
                            title="Excluir Registro"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {records.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-6 opacity-30">
                      <div className="h-20 w-20 bg-[#0D1117] rounded-[2.5rem] border border-[#30363D] flex items-center justify-center">
                        <Palmtree size={40} className="text-[#484F58]" />
                      </div>
                      <p className="font-black uppercase tracking-[0.4em] text-[10px]">Aguardando primeiro lançamento de férias</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAdmin && isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0D1117]/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#161B22] w-full max-w-5xl max-h-[90vh] rounded-[3rem] shadow-2xl border border-[#30363D] overflow-hidden flex flex-col animate-in zoom-in duration-200">
            <div className="px-10 py-8 border-b border-[#30363D] flex items-center justify-between bg-[#0D1117]/50 shrink-0">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-[#1F6FEB] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                   <Palmtree size={24} />
                </div>
                <h3 className="font-black text-white text-lg uppercase tracking-tight">
                  {editingRecord ? 'Atualizar Registro' : 'Lançamento do Zero'}
                </h3>
              </div>
              <button onClick={async () => {
                if (editingRecord) await releaseLock(editingRecord.id);
                setIsModalOpen(false);
              }} className="h-10 w-10 bg-[#30363D] hover:bg-[#484F58] rounded-full flex items-center justify-center text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-10 overflow-y-auto custom-scrollbar">
              {lock && (
                <div className="mb-8 p-6 bg-rose-500/10 border border-rose-500/30 rounded-[2rem] flex items-center gap-4 animate-in slide-in-from-top-4">
                  <div className="h-12 w-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/20">
                    <Lock size={24} />
                  </div>
                  <div>
                    <h4 className="font-black text-rose-500 uppercase tracking-widest text-xs">Registro sendo editado</h4>
                    <p className="text-[#8B949E] font-bold text-[10px] uppercase tracking-wider mt-1">Este registro está sendo modificado por <strong>{lock.userName}</strong> no momento.</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-7 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative">
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E] mb-3">Colaborador Destino</label>
                      <div className="relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#484F58] z-10" size={18} />
                        <input 
                          required
                          type="text"
                          placeholder="PESQUISAR OU SELECIONAR..."
                          className="w-full pl-14 pr-12 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl focus:ring-2 focus:ring-[#1F6FEB]/40 focus:border-[#1F6FEB] outline-none font-black text-xs uppercase text-white transition-all"
                          value={modalSearchText}
                          onChange={e => {
                            setModalSearchText(e.target.value);
                            setIsSearching(true);
                            const collab = collaborators.find(c => c.name.toLowerCase() === e.target.value.toLowerCase());
                            if (collab) {
                              setFormData({...formData, collaboratorId: collab.id});
                            } else {
                              setFormData({...formData, collaboratorId: ''});
                            }
                            setIsDropdownOpen(true);
                          }}
                          onFocus={() => setIsDropdownOpen(true)}
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            setIsDropdownOpen(!isDropdownOpen);
                            setIsSearching(false);
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#484F58] hover:text-white transition-colors"
                        >
                          <ChevronDown size={20} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-[#0D1117] border border-[#30363D] rounded-2xl shadow-2xl z-[60] max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                            {collaborators
                              .filter(c => !isSearching || c.name.toLowerCase().includes(modalSearchText.toLowerCase()))
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  className="w-full px-6 py-4 text-left hover:bg-[#1F6FEB]/10 text-xs font-black uppercase tracking-widest text-white border-b border-[#30363D] last:border-0 transition-colors flex items-center justify-between group"
                                  onClick={() => {
                                    setModalSearchText(c.name);
                                    setFormData({...formData, collaboratorId: c.id});
                                    setIsDropdownOpen(false);
                                  }}
                                >
                                  <span>{c.name}</span>
                                  <span className="text-[9px] text-[#484F58] group-hover:text-[#1F6FEB] transition-colors">{c.unit}</span>
                                </button>
                              ))}
                            {collaborators.filter(c => !isSearching || c.name.toLowerCase().includes(modalSearchText.toLowerCase())).length === 0 && (
                              <div className="px-6 py-8 text-center text-[#484F58] text-[10px] font-black uppercase tracking-widest">
                                Nenhum colaborador encontrado
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {isDropdownOpen && <div className="fixed inset-0 z-[55]" onClick={() => setIsDropdownOpen(false)} />}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E] mb-3">Tipo de Solicitação</label>
                      <select 
                        className="w-full px-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl focus:ring-2 focus:ring-[#1F6FEB]/40 focus:border-[#1F6FEB] outline-none font-black text-xs uppercase text-white appearance-none cursor-pointer"
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value as RequestType, manualDays: '', startDate: '', endDate: ''})}
                      >
                        <option value={RequestType.SALDO_INICIAL}>SALDO INICIAL</option>
                        <option value={RequestType.AGENDADAS}>FÉRIAS AGENDADAS NO RH</option>
                        <option value={RequestType.COMPENSACAO}>COMPENSAÇÃO</option>
                        <option value={RequestType.DESCONTO}>DESCONTO DE FÉRIAS</option>
                      </select>
                    </div>
                  </div>

                  {!isManualEntry ? (
                    <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-top-2">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E] mb-3">Início</label>
                        <input 
                          required
                          type="date" 
                          className="w-full px-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl focus:ring-2 focus:ring-[#1F6FEB]/40 focus:border-[#1F6FEB] outline-none font-bold text-white transition-all uppercase text-xs"
                          value={formData.startDate}
                          onChange={e => setFormData({...formData, startDate: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E] mb-3">Fim</label>
                        <input 
                          required
                          type="date" 
                          className="w-full px-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl focus:ring-2 focus:ring-[#1F6FEB]/40 focus:border-[#1F6FEB] outline-none font-bold text-white transition-all uppercase text-xs"
                          value={formData.endDate}
                          onChange={e => setFormData({...formData, endDate: e.target.value})}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="animate-in slide-in-from-top-2">
                      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E] mb-3">Lançamento de Dias</label>
                      <div className="relative">
                        <Hash className="absolute left-5 top-1/2 -translate-y-1/2 text-[#484F58]" size={18} />
                        <input 
                          required
                          type="number" 
                          min="0"
                          placeholder="EX: 30"
                          className="w-full pl-14 pr-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl focus:ring-2 focus:ring-[#1F6FEB]/40 focus:border-[#1F6FEB] outline-none font-black text-xl text-white transition-all tabular-nums"
                          value={formData.manualDays}
                          onChange={e => setFormData({...formData, manualDays: e.target.value})}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E] mb-1">Anexar Documento (PDF, Imagem ou E-mail)</label>
                    <div className="relative">
                      {!formData.attachmentName ? (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#30363D] rounded-3xl cursor-pointer hover:border-[#1F6FEB]/50 hover:bg-[#1F6FEB]/5 transition-all group">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-3 text-[#484F58] group-hover:text-[#1F6FEB] transition-colors" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#8B949E] group-hover:text-white transition-colors">Clique ou arraste para anexar</p>
                            <p className="text-[9px] font-bold text-[#484F58] mt-1">PDF, PNG, JPG, EML</p>
                          </div>
                          <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,image/*,.eml,.msg" />
                        </label>
                      ) : (
                        <div className="flex items-center justify-between p-4 bg-[#0D1117] border border-[#1F6FEB]/30 rounded-2xl animate-in zoom-in-95 duration-200">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-[#1F6FEB]/10 rounded-xl flex items-center justify-center text-[#1F6FEB]">
                              {formData.attachmentName.toLowerCase().endsWith('.pdf') ? <FileText size={20} /> : 
                               formData.attachmentName.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/) ? <ImageIcon size={20} /> : 
                               <Mail size={20} />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-white uppercase tracking-tight truncate max-w-[200px]">{formData.attachmentName}</span>
                              <span className="text-[9px] font-bold text-[#484F58] uppercase tracking-widest">Documento Anexado</span>
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={removeAttachment}
                            className="p-2 text-[#484F58] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E] mb-3">Observações Adicionais</label>
                    <textarea 
                      className="w-full px-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl focus:ring-2 focus:ring-[#1F6FEB]/40 focus:border-[#1F6FEB] outline-none font-bold text-white transition-all text-xs"
                      rows={2}
                      placeholder="DETALHES DO LANÇAMENTO..."
                      value={formData.observation}
                      onChange={e => setFormData({...formData, observation: e.target.value})}
                    />
                  </div>

                  {formData.collaboratorId && (
                    <div className="bg-[#0D1117] rounded-3xl border border-[#30363D] overflow-hidden animate-in fade-in duration-500">
                      <div className="px-6 py-4 border-b border-[#30363D] flex items-center gap-3">
                        <History size={14} className="text-[#8B949E]" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#8B949E]">Histórico Recente do Colaborador</span>
                      </div>
                      <div className="max-h-32 overflow-y-auto">
                        <table className="w-full text-left text-[9px]">
                          <tbody className="divide-y divide-[#30363D]">
                            {records
                              .filter(r => r.collaboratorId === formData.collaboratorId)
                              .slice(0, 5)
                              .map(r => (
                                <tr key={r.id}>
                                  <td className="px-6 py-3 font-bold text-white uppercase">{r.type}</td>
                                  <td className="px-6 py-3 text-[#8B949E] tabular-nums">{r.startDate}</td>
                                  <td className="px-6 py-3 text-right font-black text-[#1F6FEB]">{r.businessDays} DIAS</td>
                                </tr>
                              ))}
                            {records.filter(r => r.collaboratorId === formData.collaboratorId).length === 0 && (
                              <tr>
                                <td className="px-6 py-8 text-center text-[#484F58] uppercase font-black tracking-widest">Sem registros anteriores</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-5 flex flex-col gap-6">
                  <div className={`rounded-[2.5rem] p-10 flex flex-col justify-between border transition-all duration-500 flex-1 ${isManualEntry ? 'bg-[#0D1117] border-[#30363D]' : 'bg-[#1F6FEB]/10 border-[#1F6FEB]/30'}`}>
                    <div className="space-y-8">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-2xl ${isManualEntry ? 'bg-[#161B22] text-[#8B949E]' : 'bg-[#1F6FEB] text-white'}`}>
                          <Calculator size={22} />
                        </div>
                        <h4 className={`text-xs font-black uppercase tracking-[0.2em] ${isManualEntry ? 'text-[#8B949E]' : 'text-white'}`}>
                          Resumo do Lançamento
                        </h4>
                      </div>

                      {!isManualEntry ? (
                        <div className="space-y-4 animate-in fade-in duration-300">
                          <div className="flex justify-between items-center text-sm border-b border-[#30363D] pb-3">
                            <span className="text-[#8B949E] font-bold uppercase tracking-widest text-[10px]">Dias Corridos</span>
                            <span className="font-black text-white tabular-nums">{metrics.calendarDays} DIAS</span>
                          </div>
                          <div className="flex justify-between items-center text-sm border-b border-[#30363D] pb-3">
                            <span className="text-[#8B949E] font-bold uppercase tracking-widest text-[10px]">Feriados</span>
                            <span className="font-black text-[#1F6FEB] tabular-nums">{metrics.holidaysCount}</span>
                          </div>
                          <div className="pt-6 flex flex-col items-center justify-center py-6">
                            <span className="text-[10px] font-black uppercase text-[#8B949E] tracking-[0.3em] mb-3">Total Líquido Úteis</span>
                            <span className="text-8xl font-black text-white tabular-nums tracking-tighter">{metrics.businessDays}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-8 animate-in fade-in duration-300 flex flex-col items-center justify-center h-full py-10">
                          <div className="text-center">
                            <span className="block text-[10px] text-[#8B949E] uppercase font-black tracking-[0.3em] mb-4">Ajuste de Saldo</span>
                            <span className="text-8xl font-black text-white tabular-nums tracking-tighter">{metrics.businessDays || 0}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {!isManualEntry && (
                      <div className="mt-10 flex items-start gap-4 bg-[#0D1117] p-6 rounded-3xl border border-[#30363D]">
                        <AlertTriangle size={20} className="text-[#1F6FEB] shrink-0" />
                        <p className="text-[10px] text-[#8B949E] font-bold uppercase tracking-widest leading-relaxed">
                          CÁLCULO AUTOMÁTICO BASEADO NO ESTADO <strong>{formData.state}</strong>.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <button 
                      type="button" 
                      onClick={async () => {
                        if (editingRecord) await releaseLock(editingRecord.id);
                        setIsModalOpen(false);
                      }}
                      className="flex-1 px-6 py-4 bg-[#0D1117] text-[#8B949E] border border-[#30363D] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#30363D] hover:text-white transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      disabled={!!lock || !formData.collaboratorId || (!isManualEntry && metrics.calendarDays === 0) || (isManualEntry && !formData.manualDays)}
                      className="flex-[2] px-10 py-4 bg-[#1F6FEB] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#388BFD] transition-all shadow-lg shadow-blue-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {lock ? 'Bloqueado para Edição' : 'Salvar Lançamento'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDeleteSingle}
        title="Excluir Registro"
        message="Deseja realmente remover este lançamento? O saldo do colaborador será recalculado automaticamente."
      />

      <ConfirmModal 
        isOpen={isBulkConfirmOpen}
        onClose={() => setIsBulkConfirmOpen(false)}
        onConfirm={confirmDeleteBulk}
        title="Excluir em Massa"
        message={`Deseja realmente excluir os ${selectedIds.size} registros selecionados? Esta ação é irreversível.`}
      />
    </div>
  );
};

export default VacationsPage;