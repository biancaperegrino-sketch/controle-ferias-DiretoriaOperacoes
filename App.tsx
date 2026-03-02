
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  LayoutDashboard, 
  Palmtree, 
  Menu, 
  X,
  FileText,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  History,
  Lock,
  BarChart3,
  FileUp,
  Settings,
  ShieldAlert,
  ShieldX,
  Calculator,
  Eye
} from 'lucide-react';

import { Collaborator, VacationRecord, Holiday, User, UserRole, AuditLog, RegisteredUser } from './types';
import { INITIAL_COLLABORATORS, INITIAL_RECORDS, INITIAL_HOLIDAYS } from './constants';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy, 
  limit,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, db } from './src/lib/firebase';

import Dashboard from './pages/Dashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import CollaboratorsPage from './pages/CollaboratorsPage';
import VacationsPage from './pages/VacationsPage';
import HolidaysPage from './pages/HolidaysPage';
import IndividualReport from './pages/IndividualReport';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import ImportPage from './pages/ImportPage';

// REGRA DE OURO: Administrador Único Fixo
const ROOT_ADMIN_EMAIL = 'bianca.bomfim@fgv.br';

const DEFAULT_LOGO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 520 160'%3E%3Cpath d='M10 20 L100 20 L70 65 L-20 65 Z' fill='%23004b8d'/%3E%3Cpath d='M45 75 L135 75 L105 120 L15 120 Z' fill='%23009fe3'/%3E%3Ctext x='150' y='75' font-family='Arial Black, sans-serif' font-weight='900' font-size='82' letter-spacing='-4' fill='%23004b8d'%3EFGV%3C/text%3E%3Ctext x='355' y='75' font-family='Arial Black, sans-serif' font-weight='900' font-size='82' letter-spacing='-4' fill='%23009fe3'%3EDO%3C/text%3E%3Ctext x='150' y='115' font-family='Arial, sans-serif' font-weight='700' font-size='38' fill='%238b8c8e'%3EDIRETORIA%3C/text%3E%3Ctext x='150' y='152' font-family='Arial, sans-serif' font-weight='700' font-size='38' fill='%238b8c8e'%3EDE OPERAÇÕES%3C/text%3E%3C/svg%3E";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{success: boolean; message?: string}>;
  logout: () => void;
  addLog: (action: string) => void;
  isAuthenticated: boolean;
  loading: boolean;
  logo: string;
  updateLogo: (newLogo: string) => void;
  resetLogo: () => void;
  registeredUsers: RegisteredUser[];
  setRegisteredUsers: React.Dispatch<React.SetStateAction<RegisteredUser[]>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  return context;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [logo, setLogo] = useState<string>(DEFAULT_LOGO);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [records, setRecords] = useState<VacationRecord[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isSyncing, setIsSyncing] = useState(true);
  const [showSyncToast, setShowSyncToast] = useState(false);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        // Fetch user role from Firestore
        const userDoc = await getDoc(doc(db, 'registered_users', firebaseUser.uid));
        let role = UserRole.VIEWER;
        let name = firebaseUser.email.split('@')[0].replace('.', ' ').toUpperCase();

        if (userDoc.exists()) {
          const data = userDoc.data();
          role = data.role;
          name = data.name;
        } else if (firebaseUser.email === ROOT_ADMIN_EMAIL) {
          role = UserRole.ADMIN;
          name = 'BIANCA BOMFIM';
        }

        setUser({
          id: firebaseUser.uid,
          name: name,
          email: firebaseUser.email,
          unit: 'SEDE',
          role: role
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Real-time Sync: Registered Users
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'registered_users'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RegisteredUser));
      
      // Ensure root admin exists in Firestore if not present
      const hasRoot = list.find(u => u.email === ROOT_ADMIN_EMAIL);
      if (!hasRoot) {
        const rootId = 'root-admin';
        setDoc(doc(db, 'registered_users', rootId), {
          name: 'BIANCA BOMFIM',
          email: ROOT_ADMIN_EMAIL,
          role: UserRole.ADMIN,
          addedAt: new Date().toISOString()
        });
      }
      setRegisteredUsers(list);
    });
    return unsub;
  }, []);

  // Real-time Sync: Collaborators
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'collaborators'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collaborator));
      if (list.length === 0 && isSyncing) {
        // Seed initial data if empty
        INITIAL_COLLABORATORS.forEach(c => setDoc(doc(db, 'collaborators', c.id), c));
      }
      setCollaborators(list.sort((a, b) => a.name.localeCompare(b.name)));
      if (!isSyncing) setShowSyncToast(true);
    });
    return unsub;
  }, [isSyncing]);

  // Real-time Sync: Records
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'records'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VacationRecord));
      if (list.length === 0 && isSyncing) {
        INITIAL_RECORDS.forEach(r => setDoc(doc(db, 'records', r.id), r));
      }
      setRecords(list);
      if (!isSyncing) setShowSyncToast(true);
    });
    return unsub;
  }, [isSyncing]);

  // Real-time Sync: Holidays
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'holidays'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Holiday));
      if (list.length === 0 && isSyncing) {
        INITIAL_HOLIDAYS.forEach(h => setDoc(doc(db, 'holidays', h.id), h));
      }
      setHolidays(list);
      if (!isSyncing) setShowSyncToast(true);
    });
    return unsub;
  }, [isSyncing]);

  // Real-time Sync: Logs
  useEffect(() => {
    const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
      setLogs(list);
    });
    return unsub;
  }, []);

  // Real-time Sync: Settings (Logo)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'branding'), (docSnap) => {
      if (docSnap.exists()) {
        setLogo(docSnap.data().logo || DEFAULT_LOGO);
      } else {
        setDoc(doc(db, 'settings', 'branding'), { logo: DEFAULT_LOGO });
      }
      setIsSyncing(false);
    });
    return unsub;
  }, []);

  // Auto-hide sync toast
  useEffect(() => {
    if (showSyncToast) {
      const timer = setTimeout(() => setShowSyncToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSyncToast]);

  const updateLogo = async (newLogo: string) => {
    if (user?.role !== UserRole.ADMIN) return;
    await setDoc(doc(db, 'settings', 'branding'), { logo: newLogo });
    addLog("Atualizou a identidade visual do sistema");
  };

  const resetLogo = async () => {
    if (user?.role !== UserRole.ADMIN) return;
    await setDoc(doc(db, 'settings', 'branding'), { logo: DEFAULT_LOGO });
    addLog("Restaurou o branding institucional padrão");
  };

  const addLog = async (action: string) => {
    if (!user) return;
    const newLog = {
      userId: user.id,
      userName: user.name,
      action,
      timestamp: new Date().toISOString()
    };
    await addDoc(collection(db, 'logs'), newLog);
  };

  // Wrapper setters to update Firestore
  const setCollaboratorsFirestore = async (value: React.SetStateAction<Collaborator[]>) => {
    if (typeof value === 'function') {
      const next = value(collaborators);
      // This is simplified. In a real app, you'd diff or use batch.
      // For this app, we'll implement specific handlers in pages or use this for bulk.
      // But since pages use these setters, we need to be careful.
    }
  };

  // We'll pass specialized handlers to pages instead of raw setters where possible,
  // or update the pages to use Firestore directly.
  // For now, let's keep the setters but they will be "read-only" from Firestore sync,
  // and we'll provide mutation functions in the context or as props.

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      addLog(`Acesso realizado`);
      return { success: true };
    } catch (error: any) {
      console.error("Login error:", error);
      let message = "Erro ao realizar login.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "E-mail ou senha incorretos.";
      }
      return { success: false, message };
    }
  };

  const logout = async () => {
    addLog("Logout efetuado");
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex flex-col items-center justify-center space-y-6">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1F6FEB]"></div>
        <p className="text-[#8B949E] font-black uppercase tracking-[0.3em] text-[10px]">Carregando Ambiente Seguro...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, login, logout, addLog, isAuthenticated: !!user, loading,
      logo, updateLogo, resetLogo, registeredUsers, setRegisteredUsers
    }}>
      <HashRouter>
        <Routes>
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/*" element={
            user ? (
              <div className="flex min-h-screen bg-[#0D1117]">
                <Sidebar />
                <main className="flex-1 flex flex-col md:ml-64">
                  <Header />
                  <div className="p-4 md:p-8">
                    <Routes>
                      <Route path="/" element={<Dashboard collaborators={collaborators} records={records} holidays={holidays} />} />
                      <Route path="/analytics" element={<AnalyticsDashboard collaborators={collaborators} records={records} />} />
                      <Route path="/collaborators" element={<CollaboratorsPage collaborators={collaborators} setCollaborators={setCollaborators} />} />
                      <Route path="/vacations" element={
                        <VacationsPage 
                          records={records} 
                          collaborators={collaborators} 
                          holidays={holidays} 
                        />
                      } />
                      <Route path="/holidays" element={<HolidaysPage holidays={holidays} />} />
                      <Route path="/report" element={<IndividualReport collaborators={collaborators} records={records} />} />
                      <Route path="/import" element={
                        user.role === UserRole.ADMIN ? (
                          <ImportPage 
                            collaborators={collaborators} 
                            records={records} 
                          />
                        ) : (
                          <div className="p-20 text-center space-y-6 bg-[#161B22] rounded-[3rem] border border-dashed border-[#30363D]">
                            <ShieldAlert size={64} className="mx-auto text-rose-500 opacity-50" />
                            <h3 className="text-xl font-black uppercase text-white tracking-widest leading-relaxed">Você não tem permissão para acessar esta página.</h3>
                            <Link to="/" className="inline-block bg-[#1F6FEB] text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-[#388BFD] transition-all">Voltar ao Dashboard</Link>
                          </div>
                        )
                      } />
                      <Route path="/profile" element={<ProfilePage logs={logs} />} />
                    </Routes>
                  </div>
                </main>
              </div>
            ) : <Navigate to="/login" />
          } />
        </Routes>
      </HashRouter>
    </AuthContext.Provider>
  );
};

const Header: React.FC = () => {
  const { user, logo } = useAuth();
  return (
    <header className="h-16 bg-[#161B22] border-b border-[#30363D] flex items-center justify-between px-6 sticky top-0 z-10 shadow-md">
      <div className="flex items-center gap-4">
        <div className="bg-white p-1 rounded-lg h-10 w-auto flex items-center justify-center min-w-[100px]">
          <img src={logo} alt="Branding" className="h-8 w-auto object-contain" />
        </div>
        <h1 className="text-[10px] md:text-xs font-black text-white tracking-tight truncate uppercase border-l border-[#30363D] pl-4">
          Controle de Saldo de Férias
        </h1>
      </div>
      <div className="flex items-center gap-4 ml-auto">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-white leading-none">{user?.name}</p>
          <p className={`text-[9px] font-black uppercase tracking-wider mt-1 ${user?.role === UserRole.ADMIN ? 'text-amber-500' : 'text-[#8B949E]'}`}>
            {user?.role}
          </p>
        </div>
        <Link to="/profile" className="h-9 w-9 rounded-full bg-[#30363D] border border-[#484F58] flex items-center justify-center text-white font-bold hover:bg-[#1F6FEB] transition-all overflow-hidden shadow-sm">
          {user?.name.charAt(0)}
        </Link>
      </div>
    </header>
  );
};

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout, logo } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: 'Visão Geral', icon: LayoutDashboard, path: '/' },
    { label: 'Dashboard', icon: BarChart3, path: '/analytics' },
    { label: 'Colaboradores', icon: Users, path: '/collaborators' },
    { label: 'Gestão de Férias', icon: Palmtree, path: '/vacations' },
    { label: 'Dossiê Individual', icon: FileText, path: '/report' },
    { label: 'Feriados', icon: Calendar, path: '/holidays' },
    { label: 'Importar Dados', icon: FileUp, path: '/import', adminOnly: true },
  ].filter(item => !item.adminOnly || user?.role === UserRole.ADMIN);

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed bottom-6 right-6 z-50 bg-[#1F6FEB] text-white p-4 rounded-full shadow-2xl hover:bg-[#388BFD] transition-all active:scale-95"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#161B22] text-[#8B949E] border-r border-[#30363D] transition-transform duration-300 transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 h-full flex flex-col">
          <div className="mb-10 px-2">
            <div className="bg-white p-4 rounded-2xl shadow-lg mb-4 flex items-center justify-center min-h-[80px]">
              <img src={logo} alt="Logo" className="h-14 w-auto object-contain" />
            </div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-[#484F58]">
              <ShieldCheck size={12} className="text-[#1F6FEB]" />
              Painel de Controle
            </div>
          </div>

          <nav className="space-y-1 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                    ${isActive 
                      ? 'bg-[#1F6FEB] text-white shadow-lg' 
                      : 'hover:bg-[#30363D] hover:text-white'}
                  `}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-[#30363D] space-y-1">
            <Link 
              to="/profile"
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${location.pathname === '/profile' ? 'bg-[#30363D] text-white' : 'hover:bg-[#30363D]'}`}
            >
              {user?.role === UserRole.ADMIN ? <Settings size={16} /> : <UserIcon size={16} />}
              <span>{user?.role === UserRole.ADMIN ? 'Configurações' : 'Meu Perfil'}</span>
            </Link>
            <button 
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-900/20 text-rose-500 transition-colors"
            >
              <LogOut size={16} />
              <span>Sair do Sistema</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default App;
