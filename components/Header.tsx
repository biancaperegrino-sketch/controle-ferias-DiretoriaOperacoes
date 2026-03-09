import React from 'react';
import { useAuth } from '../App';
import { LogOut, User, Bell, Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path === '/analytics') return 'Quadro Geral';
    if (path === '/collaborators') return 'Colaboradores';
    if (path === '/vacations') return 'Lançamentos';
    if (path === '/holidays') return 'Feriados';
    if (path === '/report') return 'Dossiê';
    if (path === '/import') return 'Importação';
    if (path === '/profile') return 'Configurações';
    if (path === '/audit') return 'Auditoria';
    return '';
  };

  const getPageSubtitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Indicadores gerenciais e análise de saldos';
    if (path === '/analytics') return 'Controle centralizado de saldos e dias úteis de férias de toda a diretoria';
    if (path === '/collaborators') return 'Gestão completa do cadastro, cargos e unidades dos colaboradores';
    if (path === '/vacations') return 'Registro, agendamento e acompanhamento de períodos de férias e abonos';
    if (path === '/holidays') return 'Manutenção do calendário de feriados para cálculos automáticos de dias úteis';
    if (path === '/report') return 'Relatório individual detalhado e timeline de lançamentos por colaborador';
    if (path === '/import') return 'Processamento de carga de dados em massa através de planilhas CSV';
    if (path === '/profile') return 'Gerenciamento de informações de perfil e configurações de acesso';
    if (path === '/audit') return 'Rastreabilidade completa de todas as alterações realizadas no sistema';
    return '';
  };

  return (
    <header className="h-24 bg-[#0D1117]/80 backdrop-blur-xl border-b border-[#30363D] flex items-center justify-between px-6 md:px-10 sticky top-0 z-40">
      <div className="flex items-center gap-4 md:gap-8 flex-1">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-3 text-[#8B949E] hover:text-white hover:bg-[#30363D] rounded-xl transition-all"
        >
          <Menu size={24} />
        </button>
        <div className="flex flex-col">
          <h1 className="text-xl font-black text-white uppercase tracking-tight leading-none">
            {getPageTitle()}
          </h1>
          <p className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest mt-2 opacity-70">
            {getPageSubtitle()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 pr-6 border-r border-[#30363D]">
          <button className="p-3 text-[#8B949E] hover:text-white hover:bg-[#30363D] rounded-xl transition-all relative">
            <Bell size={20} />
            <span className="absolute top-3 right-3 h-2 w-2 bg-[#1F6FEB] rounded-full border-2 border-[#0D1117]"></span>
          </button>
        </div>

        <div className="flex items-center gap-5">
          <div className="text-right hidden sm:block">
            <div className="text-[11px] font-black text-white uppercase tracking-tight">{user?.name}</div>
            <div className="text-[9px] font-black text-[#1F6FEB] uppercase tracking-widest">{user?.role}</div>
          </div>
          
          <div className="relative group">
            <button className="h-12 w-12 rounded-2xl bg-[#30363D] border border-[#484F58] overflow-hidden hover:border-[#1F6FEB] transition-all flex items-center justify-center">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User size={24} className="text-[#8B949E]" />
              )}
            </button>
            
            <div className="absolute right-0 mt-3 w-56 bg-[#161B22] border border-[#30363D] rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right scale-95 group-hover:scale-100 z-50 overflow-hidden">
              <div className="p-5 border-b border-[#30363D] bg-[#0D1117]/50">
                <p className="text-[9px] font-black text-[#8B949E] uppercase tracking-widest mb-1">Conectado como</p>
                <p className="text-xs font-black text-white uppercase truncate">{user?.email}</p>
              </div>
              <div className="p-2">
                <button 
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest"
                >
                  <LogOut size={18} />
                  Sair do Sistema
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
