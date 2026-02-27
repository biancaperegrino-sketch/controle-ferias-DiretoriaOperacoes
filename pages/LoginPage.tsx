
import React, { useState } from 'react';
import { useAuth } from '../App';
import { Loader2, Mail, Lock, ShieldX, ShieldAlert, ArrowRight } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { login, logo } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Simulação de delay para autenticação
    setTimeout(async () => {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.message || "Credenciais inválidas.");
        setLoading(false);
      }
    }, 1500);
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
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-[#484F58]" size={18} />
                    <input 
                      type="email" 
                      required
                      placeholder="e-mail corporativo"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-[#0D1117] border border-[#30363D] focus:border-[#1F6FEB] rounded-2xl outline-none font-bold text-white placeholder:text-[#484F58] transition-all text-sm"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-[#484F58]" size={18} />
                    <input 
                      type="password" 
                      required
                      placeholder="senha de acesso"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-[#0D1117] border border-[#30363D] focus:border-[#1F6FEB] rounded-2xl outline-none font-bold text-white placeholder:text-[#484F58] transition-all text-sm"
                    />
                  </div>

                  {error && (
                    <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                      <ShieldX className="text-rose-500 shrink-0" size={18} />
                      <p className="text-rose-500 text-[9px] font-black uppercase tracking-widest leading-tight">{error}</p>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="w-full flex items-center justify-center gap-4 bg-[#1F6FEB] hover:bg-[#388BFD] text-white px-6 py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 group"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">Acessar Sistema</span>
                    <ArrowRight size={16} />
                  </button>
                </div>

                <div className="pt-8 border-t border-[#30363D] text-center">
                   <div className="inline-flex items-center gap-2 opacity-30">
                      <ShieldAlert size={12} className="text-white" />
                      <span className="text-[8px] font-black uppercase text-white tracking-[0.3em]">Ambiente Seguro Corporativo</span>
                   </div>
                </div>
              </form>
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
