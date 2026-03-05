import React from 'react';
import { useAuth } from '../App';
import { LogOut, User, Bell, Search } from 'lucide-react';

const Header: React.FC = () => {
  const { user, logout, logo } = useAuth();

  return (
    <header className="h-24 bg-[#0D1117]/80 backdrop-blur-xl border-b border-[#30363D] flex items-center justify-between px-10 sticky top-0 z-40">
      <div className="flex items-center gap-8 flex-1">
        <div className="relative w-full max-w-md group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#484F58] group-focus-within:text-[#1F6FEB] transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="PESQUISAR NO SISTEMA..." 
            className="w-full pl-14 pr-6 py-3 bg-[#161B22] border border-[#30363D] rounded-xl focus:ring-2 focus:ring-[#1F6FEB]/40 outline-none font-black text-[10px] uppercase tracking-[0.2em] text-white placeholder:text-[#484F58] transition-all"
          />
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
