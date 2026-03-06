
import React from 'react';
import { AuditLog, UserRole } from '../types';
import { Clock, User as UserIcon, Activity, ShieldCheck, Search, History } from 'lucide-react';
import { useAuth } from '../App';

interface AuditLogPageProps {
  logs: AuditLog[];
}

const AuditLogPage: React.FC<AuditLogPageProps> = ({ logs }) => {
  const { user } = useAuth();
  const [search, setSearch] = React.useState('');

  if (user?.role !== UserRole.ADMIN) {
    return (
      <div className="p-20 text-center space-y-6 bg-[#161B22] rounded-[3rem] border border-dashed border-[#30363D]">
        <ShieldCheck size={64} className="mx-auto text-rose-500 opacity-50" />
        <h3 className="text-xl font-black uppercase text-white tracking-widest leading-relaxed">Acesso Restrito</h3>
        <p className="text-[#8B949E] font-bold text-sm uppercase tracking-wider">Apenas administradores podem visualizar o log de auditoria.</p>
      </div>
    );
  }

  const filteredLogs = logs.filter(log => 
    log.userName.toLowerCase().includes(search.toLowerCase()) ||
    log.action.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight uppercase">Log de Auditoria</h2>
          <p className="text-[#8B949E] font-bold text-sm uppercase tracking-wider">Rastreabilidade completa de ações no sistema</p>
        </div>
        <div className="bg-amber-950/20 text-amber-500 px-6 py-3 rounded-2xl border border-amber-500/30 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3">
          <ShieldCheck size={18} />
          Governança Ativa
        </div>
      </header>

      <div className="bg-[#161B22] p-6 rounded-[1.5rem] border border-[#30363D] shadow-xl">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#8B949E]" size={20} />
          <input 
            type="text" 
            placeholder="PESQUISAR POR USUÁRIO OU AÇÃO..." 
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
                <th className="px-10 py-5">Usuário</th>
                <th className="px-10 py-5">Ação Realizada</th>
                <th className="px-10 py-5">Data e Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363D]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#1F6FEB]/5 transition-colors">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[#30363D] flex items-center justify-center text-[10px] font-black text-white">
                        {log.userName.charAt(0)}
                      </div>
                      <span className="font-black text-[#1F6FEB] uppercase tracking-tight text-[10px]">{log.userName}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6 font-bold text-white uppercase tracking-tight text-xs">
                    <div className="flex items-center gap-2">
                      <Activity size={14} className="text-[#484F58]" />
                      {log.action}
                    </div>
                  </td>
                  <td className="px-10 py-6 text-[#8B949E] text-xs font-bold tabular-nums">
                    <div className="flex items-center gap-3">
                       <Clock size={14} className="text-[#30363D]" />
                       {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-10 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <History size={64} className="text-[#8B949E]" />
                      <p className="font-black uppercase tracking-[0.3em] text-[10px]">Nenhuma atividade encontrada</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogPage;
