
import React, { useRef, useState } from 'react';
import { useAuth } from '../App';
import { 
  User as UserIcon, 
  Mail, 
  ShieldCheck, 
  Upload,
  Palette,
  RotateCcw,
  History,
  Clock,
  Lock,
  User as UserProfileIcon,
  ShieldAlert,
  Users,
  UserPlus,
  Trash2,
  Edit2,
  X,
  CheckCircle2
} from 'lucide-react';
import { AuditLog, UserRole, RegisteredUser } from '../types';

interface ProfilePageProps {
  logs: AuditLog[];
}

const ROOT_ADMIN_EMAIL = 'bianca.bomfim@fgv.br';

const ProfilePage: React.FC<ProfilePageProps> = ({ logs }) => {
  const { user, logo, updateLogo, resetLogo, registeredUsers, setRegisteredUsers, addLog } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<RegisteredUser | null>(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    role: UserRole.VIEWER
  });

  if (!user) return null;

  const isAdmin = user.role === UserRole.ADMIN;
  const isRootAdmin = user.email === ROOT_ADMIN_EMAIL;
  const displayLogs = isAdmin ? logs : logs.filter(l => l.userId === user.id);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isRootAdmin) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenUserModal = (regUser?: RegisteredUser) => {
    if (regUser) {
      setEditingUser(regUser);
      setUserFormData({
        name: regUser.name,
        email: regUser.email,
        role: regUser.role
      });
    } else {
      setEditingUser(null);
      setUserFormData({
        name: '',
        email: '',
        role: UserRole.VIEWER
      });
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const email = userFormData.email.toLowerCase().trim();
    
    if (editingUser) {
      setRegisteredUsers(prev => prev.map(u => 
        u.id === editingUser.id ? { ...u, ...userFormData, email } : u
      ));
      addLog(`Editou acesso do usuário ${userFormData.name}`);
    } else {
      const newUser: RegisteredUser = {
        id: Math.random().toString(36).substr(2, 9),
        ...userFormData,
        email,
        addedAt: new Date().toISOString()
      };
      setRegisteredUsers(prev => [...prev, newUser]);
      addLog(`Cadastrou novo acesso para ${userFormData.name}`);
    }
    setIsUserModalOpen(false);
  };

  const handleDeleteUser = (id: string, name: string, email: string) => {
    if (email === ROOT_ADMIN_EMAIL) {
      alert("O administrador raiz não pode ser removido.");
      return;
    }
    if (confirm(`Deseja realmente remover o acesso de ${name}?`)) {
      setRegisteredUsers(prev => prev.filter(u => u.id !== id));
      addLog(`Removeu acesso do usuário ${name}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight uppercase">
            {isAdmin ? 'Configurações Globais' : 'Perfil do Usuário'}
          </h2>
          <p className="text-[#8B949E] font-bold text-sm uppercase tracking-wider">
            {isAdmin ? 'Controle de Governança e Branding' : 'Informações da Conta Microsoft'}
          </p>
        </div>
        <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-[0.2em] shadow-lg ${isAdmin ? 'bg-amber-950/20 text-amber-500 border-amber-500/30' : 'bg-blue-900/20 text-[#1F6FEB] border-[#1F6FEB]/30'}`}>
          <ShieldCheck size={20} />
          {isAdmin ? 'Permissão Total' : 'Acesso Padrão'}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-[#161B22] rounded-[3rem] border border-[#30363D] shadow-2xl overflow-hidden p-12 text-center relative">
            <div className="absolute top-0 left-0 w-full h-32 bg-[#0D1117] border-b border-[#30363D]"></div>
            <div className="relative z-10">
              <div className={`h-40 w-40 rounded-[2.5rem] flex items-center justify-center text-white text-6xl font-black mx-auto mb-8 shadow-2xl border-[12px] border-[#161B22] ${isAdmin ? 'bg-amber-500' : 'bg-[#1F6FEB]'}`}>
                {user.name.charAt(0)}
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">{user.name}</h3>
              <p className="text-[#8B949E] font-bold text-xs lowercase mt-2">{user.email}</p>
              <div className="mt-8 flex justify-center">
                 <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${isAdmin ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-[#1F6FEB]/10 text-[#1F6FEB] border-[#1F6FEB]/20'}`}>
                    {user.role}
                 </span>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="bg-[#161B22] rounded-[3rem] border border-[#30363D] shadow-2xl overflow-hidden p-8 space-y-8 animate-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-[#1F6FEB]/10 rounded-xl flex items-center justify-center text-[#1F6FEB]">
                  <Palette size={20} />
                </div>
                <h4 className="font-black text-white uppercase tracking-[0.2em] text-[11px]">Identidade Visual</h4>
              </div>
              
              <div className="bg-white p-6 rounded-3xl border border-[#30363D] flex items-center justify-center min-h-[140px]">
                <img src={logo} alt="Preview" className="max-h-20 w-auto object-contain" />
              </div>

              <div className="space-y-3">
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#1F6FEB] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#388BFD] transition-all"
                >
                  <Upload size={18} /> Alterar Logo
                </button>
                <button 
                  onClick={resetLogo}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#0D1117] text-[#8B949E] border border-[#30363D] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-white transition-all"
                >
                  <RotateCcw size={18} /> Restaurar Padrão
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-10">
          {isAdmin && (
            <div className="bg-[#161B22] rounded-[3rem] border border-[#30363D] shadow-2xl overflow-hidden flex flex-col">
              <div className="px-10 py-8 border-b border-[#30363D] bg-[#0D1117]/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-[#1F6FEB]/10 text-[#1F6FEB] rounded-xl flex items-center justify-center border border-[#1F6FEB]/20">
                    <Users size={20} />
                  </div>
                  <h4 className="font-black text-white uppercase tracking-[0.2em] text-[11px]">Gestão de Acesso</h4>
                </div>
                <button 
                  onClick={() => handleOpenUserModal()}
                  className="bg-[#1F6FEB] hover:bg-[#388BFD] text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 transition-all"
                >
                  <UserPlus size={14} /> Novo Usuário
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-[#0D1117] text-[#8B949E] font-black uppercase tracking-[0.2em] text-[9px]">
                    <tr>
                      <th className="px-10 py-4">Usuário</th>
                      <th className="px-10 py-4">E-mail</th>
                      <th className="px-10 py-4">Perfil</th>
                      <th className="px-10 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30363D]">
                    {registeredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-[#1F6FEB]/5 transition-colors group">
                        <td className="px-10 py-5 font-bold text-white uppercase tracking-tight text-xs">{u.name}</td>
                        <td className="px-10 py-5 text-[#8B949E] text-xs font-bold lowercase">{u.email}</td>
                        <td className="px-10 py-5">
                          <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${u.role === UserRole.ADMIN ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-blue-900/10 text-[#1F6FEB] border-[#1F6FEB]/20'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-10 py-5 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => handleOpenUserModal(u)} className="p-2 text-[#484F58] hover:text-[#1F6FEB] hover:bg-[#30363D] rounded-lg transition-all">
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(u.id, u.name, u.email)} 
                              className={`p-2 text-[#484F58] hover:text-rose-500 hover:bg-rose-900/20 rounded-lg transition-all ${u.email === ROOT_ADMIN_EMAIL ? 'opacity-0 pointer-events-none' : ''}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-[#161B22] rounded-[3rem] border border-[#30363D] shadow-2xl overflow-hidden p-10 space-y-10">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-[#484F58]">
                    <Mail size={16} />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">Identificador Corporativo</span>
                  </div>
                  <p className="text-base font-bold text-white">{user.email}</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-[#484F58]">
                    <ShieldCheck size={16} />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">Escopo de Autorização</span>
                  </div>
                  <p className={`text-base font-black uppercase ${isAdmin ? 'text-amber-500' : 'text-[#1F6FEB]'}`}>{user.role}</p>
                </div>
             </div>

             {!isAdmin && (
               <div className="p-6 bg-[#0D1117] rounded-3xl border border-[#30363D] flex items-start gap-4">
                  <ShieldAlert size={20} className="text-[#1F6FEB] shrink-0" />
                  <p className="text-[10px] text-[#8B949E] font-bold uppercase tracking-widest leading-relaxed">
                    SEU PERFIL É LIMITADO À <strong>VISUALIZAÇÃO DE DADOS</strong>. PARA ALTERAÇÕES DE SALDO, ENTRE EM CONTATO COM A GESTORA DO SISTEMA.
                  </p>
               </div>
             )}
          </div>

          <div className="bg-[#161B22] rounded-[3rem] border border-[#30363D] shadow-xl overflow-hidden">
            <div className="px-10 py-8 border-b border-[#30363D] bg-[#0D1117]/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-[#30363D] rounded-xl flex items-center justify-center text-[#8B949E]">
                  <History size={20} />
                </div>
                <h4 className="font-black text-white uppercase tracking-[0.2em] text-[11px]">Atividades Recentes</h4>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#0D1117] text-[#8B949E] font-black uppercase tracking-[0.2em] text-[10px]">
                  <tr>
                    <th className="px-10 py-5">Usuário</th>
                    <th className="px-10 py-5">Movimentação</th>
                    <th className="px-10 py-5">Carimbo de Data/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363D]">
                  {displayLogs.slice(0, 20).map((log) => (
                    <tr key={log.id} className="hover:bg-[#1F6FEB]/5 transition-colors">
                      <td className="px-10 py-6 font-black text-[#1F6FEB] uppercase tracking-tight text-[10px]">{log.userName}</td>
                      <td className="px-10 py-6 font-bold text-white uppercase tracking-tight text-xs">{log.action}</td>
                      <td className="px-10 py-6 text-[#8B949E] text-xs font-bold tabular-nums">
                        <div className="flex items-center gap-3">
                           <Clock size={14} className="text-[#30363D]" />
                           {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {displayLogs.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-10 py-12 text-center text-[#484F58] font-black uppercase text-[10px] tracking-widest">Nenhuma atividade registrada</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* User Management Modal */}
      {isAdmin && isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0D1117]/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#161B22] w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-[#30363D] overflow-hidden animate-in zoom-in duration-200">
            <div className="px-10 py-8 border-b border-[#30363D] flex items-center justify-between bg-[#0D1117]/50">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-[#1F6FEB] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                   <UserPlus size={24} />
                </div>
                <h3 className="font-black text-white text-lg uppercase tracking-tight">
                  {editingUser ? 'Editar Acesso' : 'Novo Acesso'}
                </h3>
              </div>
              <button onClick={() => setIsUserModalOpen(false)} className="h-10 w-10 bg-[#30363D] hover:bg-[#484F58] rounded-full flex items-center justify-center text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="p-10 space-y-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E] mb-3">Nome Completo</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl focus:ring-2 focus:ring-[#1F6FEB]/40 focus:border-[#1F6FEB] outline-none font-bold text-white transition-all uppercase text-xs"
                    value={userFormData.name}
                    onChange={e => setUserFormData({...userFormData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E] mb-3">E-mail Corporativo</label>
                  <input 
                    required
                    type="email" 
                    className="w-full px-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl focus:ring-2 focus:ring-[#1F6FEB]/40 focus:border-[#1F6FEB] outline-none font-bold text-white transition-all lowercase text-xs"
                    value={userFormData.email}
                    onChange={e => setUserFormData({...userFormData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#8B949E] mb-3">Perfil de Acesso</label>
                  <select 
                    className="w-full px-6 py-4 bg-[#0D1117] border border-[#30363D] rounded-2xl focus:ring-2 focus:ring-[#1F6FEB]/40 focus:border-[#1F6FEB] outline-none font-black text-xs uppercase text-white appearance-none cursor-pointer"
                    value={userFormData.role}
                    onChange={e => setUserFormData({...userFormData, role: e.target.value as UserRole})}
                  >
                    <option value={UserRole.ADMIN}>ADMINISTRADOR</option>
                    <option value={UserRole.VIEWER}>VISUALIZADOR</option>
                  </select>
                </div>
              </div>
              <div className="pt-6 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsUserModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-[#0D1117] text-[#8B949E] border border-[#30363D] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#30363D] hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-6 py-4 bg-[#1F6FEB] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#388BFD] transition-all shadow-lg shadow-blue-500/20"
                >
                  {editingUser ? 'Salvar Alterações' : 'Conceder Acesso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
