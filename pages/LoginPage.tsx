
import React, { useState } from 'react';
import { useAuth } from '../App';
import { Loader2, ShieldX, ShieldAlert, ArrowRight } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { login, logo } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await login(email, password);
    if (!result.success) {
      setError(result.message || "Erro ao realizar login.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D1117] p-6 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#004b8d]/5 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-[#009fe3]/5 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-[420px] relative z-10">
        <div className="bg-[#161B22] rounded-[3rem] shadow-2xl border border-[#30363D] overflow-hidden">
          <div className="p-10 md:p-12 space-y-10">
            <div className="flex flex-col items-center gap-6">
              <div className="bg-white p-5 rounded-[1.5rem] shadow-2xl w-full flex items-center justify-center min-h-[120px]">
                <img src={logo} alt="Branding" className="h-20 w-auto object-contain" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Portal de <span className="text-[#1F6FEB]">Operações</span></h2>
                <p className="text-[#8B949E] font-black uppercase tracking-[0.3em] text-[8px] mt-2">Gestão de Direitos e Férias</p>
              </div>
            </div>

            {!loading ? (
              <div className="space-y-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  {error && (
                    <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                      <ShieldX className="text-rose-500 shrink-0" size={18} />
                      <p className="text-rose-500 text-[9px] font-black uppercase tracking-widest leading-tight">{error}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-[#8B949E] ml-2">E-mail</label>
                    <input 
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#0D1117] border border-[#30363D] rounded-2xl px-6 py-4 text-white text-xs font-bold focus:ring-2 focus:ring-[#1F6FEB]/40 focus:border-[#1F6FEB] outline-none transition-all placeholder:text-[#484F58]"
                      placeholder="seu@email.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-[#8B949E] ml-2">Senha</label>
                    <input 
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#0D1117] border border-[#30363D] rounded-2xl px-6 py-4 text-white text-xs font-bold focus:ring-2 focus:ring-[#1F6FEB]/40 focus:border-[#1F6FEB] outline-none transition-all placeholder:text-[#484F58]"
                      placeholder="••••••••"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-[#1F6FEB] hover:bg-[#388BFD] text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-3"
                  >
                    Entrar no Sistema <ArrowRight size={16} />
                  </button>
                </form>

                <div className="pt-8 border-t border-[#30363D] text-center">
                   <div className="inline-flex items-center gap-2 opacity-30">
                      <ShieldAlert size={12} className="text-white" />
                      <span className="text-[8px] font-black uppercase text-white tracking-[0.3em]">Ambiente Seguro Corporativo</span>
                   </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 space-y-6 animate-pulse">
                <Loader2 className="animate-spin text-[#1F6FEB]" size={48} strokeWidth={4} />
                <div className="text-center">
                  <p className="text-lg font-black text-white uppercase tracking-widest">Autenticando...</p>
                  <p className="text-[8px] text-[#1F6FEB] font-black uppercase tracking-[0.4em] mt-2">Fundação Getulio Vargas</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <p className="mt-8 text-center text-[9px] font-black uppercase tracking-[0.3em] text-[#484F58]">
          &copy; {new Date().getFullYear()} Fundação Getulio Vargas • Operações
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
