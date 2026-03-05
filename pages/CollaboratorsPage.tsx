
import React, { useState } from 'react';
import { Collaborator, UserRole } from '../types';
import { BRAZILIAN_STATES } from '../constants';
// Added missing Users import
import { Search, UserPlus, X, Edit2, Trash2, ShieldAlert, Users } from 'lucide-react';
import { useAuth } from '../App';
import ConfirmModal from '@/components/ConfirmModal';

import { db } from '../src/lib/firebase';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

interface CollaboratorsPageProps {
  collaborators: Collaborator[];
}

const CollaboratorsPage: React.FC<CollaboratorsPageProps> = ({ collaborators }) => {
  const { user, addLog } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const canAdd = user?.role === UserRole.ADMIN || user?.role === UserRole.COMMON;
  const canEdit = user?.role === UserRole.ADMIN;
  const canDelete = user?.role === UserRole.ADMIN;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const [search, setSearch] = useState('');
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [collabToDelete, setCollabToDelete] = useState<{id: string, name: string} | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    unit: '',
    state: 'SP'
  });

  const handleOpenModal = (collab?: Collaborator) => {
    if (collab) {
      if (!canEdit) return;
      setEditingCollaborator(collab);
      setFormData({
        name: collab.name,
        role: collab.role,
        unit: collab.unit,
        state: collab.state
      });
    } else {
      if (!canAdd) return;
      setEditingCollaborator(null);
      setFormData({ name: '', role: '', unit: '', state: 'SP' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCollaborator) {
      await updateDoc(doc(db, 'collaborators', editingCollaborator.id), formData);
      addLog(`Editou o colaborador ${formData.name}`);
    } else {
      const id = Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'collaborators', id), {
        id,
        ...formData
      });
      addLog(`Cadastrou o colaborador ${formData.name}`);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (!canDelete) return;
    setCollabToDelete({ id, name });
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!collabToDelete || !canDelete) return;
    await deleteDoc(doc(db, 'collaborators', collabToDelete.id));
    addLog(`Excluiu o colaborador ${collabToDelete.name}`);
    setCollabToDelete(null);
  };

  const filtered = collaborators
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight uppercase">Base de Colaboradores</h2>
          <p className="text-[#8B949E] font-bold text-sm uppercase tracking-wider">Gestão do Quadro de Operações</p>
        </div>
        {canAdd ? (
          <button 
            onClick={() => handleOpenModal()}
            className="bg-[#1F6FEB] hover:bg-[#388BFD] text-white px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <UserPlus size={18} />
            Novo Colaborador
          </button>
        ) : (
          <div className="bg-[#161B22] border border-[#30363D] px-4 py-3 rounded-2xl flex items-center gap-3 text-[#8B949E] text-[10px] font-black uppercase tracking-widest">
            <ShieldAlert size={16} className="text-[#1F6FEB]" />
            Acesso Leitura
          </div>
        )}
      </div>

      <div className="bg-[#161B22] p-6 rounded-[1.5rem] border border-[#30363D] shadow-xl">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#8B949E]" size={20} />
          <input 
            type="text" 
            placeholder="PESQUISAR POR NOME..." 
            className="w-full pl-14 pr-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-[1.2rem] focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]/40 focus:border-[#1F6FEB] outline-none transition-all font-black text-[11px] uppercase tracking-widest text-white placeholder:text-[#484F58]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-[#161B22] rounded-[2rem] border border-[#30363D] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[#0D1117] text-[#8B949E] font-black uppercase tracking-[0.2em] text-[10px]">
              <tr>
                <th className="px-8 py-5">Colaborador</th>
                <th className="px-8 py-5">Cargo / Função</th>
                <th className="px-8 py-5">Unidade</th>
                <th className="px-8 py-5">UF</th>
                <th className="px-8 py-5 text-right">Ações de Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363D]">
              {filtered.map((collab) => (
                <tr key={collab.id} className="hover:bg-[#1F6FEB]/5 transition-colors group">
                  <td className="px-8 py-6 font-bold text-white uppercase tracking-tight">{collab.name}</td>
                  <td className="px-8 py-6 text-[#8B949E] font-bold text-xs uppercase">{collab.role}</td>
                  <td className="px-8 py-6 text-[#8B949E] font-bold text-xs uppercase tracking-tight">{collab.unit}</td>
                  <td className="px-8 py-6">
                    <span className="bg-[#0D1117] text-[#8B949E] px-2.5 py-1 rounded text-[10px] font-black uppercase border border-[#30363D] group-hover:border-[#1F6FEB] transition-colors">{collab.state}</span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      {canEdit && (
                        <button onClick={() => handleOpenModal(collab)} className="p-3 text-[#8B949E] hover:text-[#1F6FEB] hover:bg-[#30363D] rounded-xl transition-all">
                          <Edit2 size={18} />
                        </button>
                      )}
                      {canDelete && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(collab.id, collab.name);
                          }} 
                          className="p-3 text-[#8B949E] hover:text-rose-500 hover:bg-rose-900/20 rounded-xl transition-all"
                          title="Excluir Colaborador"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                      {!canEdit && !canDelete && (
                        <span className="text-[9px] font-black uppercase text-[#484F58] tracking-widest">Somente Consulta</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-40">
                      <Users size={64} className="text-[#30363D]" />
                      <p className="font-black uppercase tracking-[0.3em] text-[10px]">Nenhum colaborador cadastrado</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAdmin && isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0D1117]/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#161B22] w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-[#30363D] overflow-hidden animate-in zoom-in duration-200">
            <div className="px-10 py-8 border-b border-[#30363D] flex items-center justify-between bg-[#0D1117]/50">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-[#1F6FEB] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                   <UserPlus size={24} />
                </div>
                <h3 className="font-black text-white text-lg uppercase tracking-tight">
                  {editingCollaborator ? 'Atualizar Perfil' : 'Novo Colaborador'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 bg-[#30363D] hover:bg-[#484F58] rounded-full flex items-center justify-center text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-10 space-y-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E] mb-3">Nome Completo</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl focus:ring-2 focus:ring-[#1F6FEB]/40 focus:border-[#1F6FEB] outline-none font-bold text-white transition-all"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E] mb-3">Cargo / Função</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl focus:ring-2 focus:ring-[#1F6FEB]/40 focus:border-[#1F6FEB] outline-none font-bold text-white transition-all"
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E] mb-3">Unidade</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl focus:ring-2 focus:ring-[#1F6FEB]/40 focus:border-[#1F6FEB] outline-none font-bold text-white transition-all"
                      value={formData.unit}
                      onChange={e => setFormData({...formData, unit: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E] mb-3">Estado (UF)</label>
                    <select 
                      className="w-full px-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl focus:ring-2 focus:ring-[#1F6FEB]/40 focus:border-[#1F6FEB] outline-none font-black text-xs uppercase text-white appearance-none cursor-pointer"
                      value={formData.state}
                      onChange={e => setFormData({...formData, state: e.target.value})}
                    >
                      {BRAZILIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="pt-6 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-[#0D1117] text-[#8B949E] border border-[#30363D] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#30363D] hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-6 py-4 bg-[#1F6FEB] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#388BFD] transition-all shadow-lg shadow-blue-500/20"
                >
                  Salvar Colaborador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Colaborador"
        message={`Deseja realmente remover o colaborador ${collabToDelete?.name}? Esta ação não poderá ser desfeita.`}
      />
    </div>
  );
};

export default CollaboratorsPage;
