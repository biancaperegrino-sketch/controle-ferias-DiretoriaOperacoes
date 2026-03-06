import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BarChart3, 
  Users, 
  Calendar, 
  CalendarDays, 
  FileText, 
  FileUp, 
  Settings, 
  History,
  ShieldCheck,
  X
} from 'lucide-react';
import { useAuth } from '../App';
import { UserRole } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logo } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const isDefaultLogo = logo.includes('picsum.photos');

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Quadro Geral', path: '/', roles: [UserRole.ADMIN, UserRole.COMMON, UserRole.VIEWER] },
    { icon: <BarChart3 size={20} />, label: 'Dashboard', path: '/analytics', roles: [UserRole.ADMIN, UserRole.COMMON, UserRole.VIEWER] },
    { icon: <Users size={20} />, label: 'Colaboradores', path: '/collaborators', roles: [UserRole.ADMIN, UserRole.COMMON, UserRole.VIEWER] },
    { icon: <Calendar size={20} />, label: 'Lançamentos', path: '/vacations', roles: [UserRole.ADMIN, UserRole.COMMON, UserRole.VIEWER] },
    { icon: <CalendarDays size={20} />, label: 'Feriados', path: '/holidays', roles: [UserRole.ADMIN, UserRole.COMMON, UserRole.VIEWER] },
    { icon: <FileText size={20} />, label: 'Relatório Indiv.', path: '/report', roles: [UserRole.ADMIN, UserRole.COMMON, UserRole.VIEWER] },
    { icon: <FileUp size={20} />, label: 'Importação', path: '/import', roles: [UserRole.ADMIN] },
    { icon: <History size={20} />, label: 'Audit Log', path: '/audit', roles: [UserRole.ADMIN] },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed left-0 top-0 z-50 w-72 bg-[#161B22] border-r border-[#30363D] flex flex-col h-screen overflow-y-auto transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-8">
          <div className="flex items-center justify-between mb-10 px-2">
            <div className="flex items-center gap-3">
              {isDefaultLogo ? (
                <div className="h-10 w-10 bg-[#1F6FEB] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <ShieldCheck size={24} />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-2xl overflow-hidden bg-white flex items-center justify-center shadow-lg">
                  <img src={logo} alt="Logo" className="h-full w-full object-contain p-1" />
                </div>
              )}
              <div>
                <h1 className="text-lg font-black text-white uppercase tracking-tighter leading-none">Diretoria de Operações</h1>
                <p className="text-[9px] font-black text-[#8B949E] uppercase tracking-widest mt-1">Saldos de Férias</p>
              </div>
            </div>
            <button onClick={onClose} className="md:hidden text-[#8B949E] hover:text-white">
              <X size={20} />
            </button>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => {
              if (item.roles && !item.roles.includes(user?.role as UserRole)) return null;
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => { if (window.innerWidth < 768) onClose(); }}
                  className={({ isActive }) => `
                    flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all
                    ${isActive 
                      ? 'bg-[#1F6FEB] text-white shadow-lg shadow-blue-500/20' 
                      : 'text-[#8B949E] hover:text-white hover:bg-[#30363D]'}
                  `}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-[#30363D]">
          <NavLink
            to="/profile"
            onClick={() => { if (window.innerWidth < 768) onClose(); }}
            className={({ isActive }) => `
              flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all
              ${isActive 
                ? 'bg-[#30363D] text-white' 
                : 'text-[#8B949E] hover:text-white hover:bg-[#30363D]'}
            `}
          >
            <Settings size={20} />
            Configurações
          </NavLink>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
