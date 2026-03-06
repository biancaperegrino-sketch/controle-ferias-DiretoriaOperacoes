import * as React from 'react';
import { useState, useEffect, createContext, useContext, Component } from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { 
  onAuthStateChanged, 
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  doc, 
  setDoc, 
  addDoc,
  getDocs,
  getDocFromServer
} from 'firebase/firestore';
import { ShieldAlert } from 'lucide-react';
import { auth, db, googleProvider } from './src/lib/firebase';
import { User, UserRole, Collaborator, VacationRecord, Holiday, AuditLog, RegisteredUser } from './types';
import { INITIAL_COLLABORATORS, INITIAL_RECORDS, INITIAL_HOLIDAYS } from './constants';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import CollaboratorsPage from './pages/CollaboratorsPage';
import VacationsPage from './pages/VacationsPage';
import HolidaysPage from './pages/HolidaysPage';
import IndividualReport from './pages/IndividualReport';
import ImportPage from './pages/ImportPage';
import ProfilePage from './pages/ProfilePage';
import AuditLogPage from './pages/AuditLogPage';
import LoginPage from './pages/LoginPage';

const DEFAULT_LOGO = "https://picsum.photos/seed/institutional/400/100";
const ROOT_ADMIN_EMAIL = "biancaperegrino@gmail.com";
const CORPORATE_ADMIN_EMAIL = "bianca.bomfim@fgv.br";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if ((this as any).state.hasError) {
      let message = "Ocorreu um erro inesperado.";
      const error = (this as any).state.error;
      if (error && error.message) {
        try {
          const errObj = JSON.parse(error.message);
          if (errObj.error && errObj.error.includes("insufficient permissions")) {
            message = "Você não tem permissão para acessar estes dados. Por favor, contate o administrador.";
          }
        } catch (e) {
          // Not a JSON error
        }
      }

      return (
        <div className="min-h-screen bg-[#0D1117] flex items-center justify-center p-4">
          <div className="bg-[#161B22] border border-[#30363D] p-8 rounded-[2rem] max-w-md w-full text-center space-y-6">
            <ShieldAlert size={48} className="mx-auto text-rose-500" />
            <h2 className="text-xl font-black text-white uppercase tracking-widest">Erro de Acesso</h2>
            <p className="text-[#8B949E] text-sm leading-relaxed">{message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-[#1F6FEB] text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#388BFD] transition-all"
            >
              Recarregar Sistema
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

interface AuthContextType {
  user: User | null;
  login: () => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  addLog: (action: string) => Promise<void>;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  logo: string;
  updateLogo: (newLogo: string) => Promise<void>;
  resetLogo: () => Promise<void>;
  registeredUsers: RegisteredUser[];
  setRegisteredUsers: React.Dispatch<React.SetStateAction<RegisteredUser[]>>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [logo, setLogo] = useState<string>(DEFAULT_LOGO);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [records, setRecords] = useState<VacationRecord[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isSyncing, setIsSyncing] = useState(true);
  const [showSyncToast, setShowSyncToast] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Connection test
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'settings', 'branding'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();
  }, []);

  // Auth State Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const lowerEmail = firebaseUser.email?.toLowerCase() || '';
        
        // Fetch registered user info
        const userDoc = await getDocs(query(collection(db, 'registered_users'), orderBy('addedAt', 'desc')));
        const list = userDoc.docs.map(doc => ({ id: doc.id, ...doc.data() } as RegisteredUser));
        const registered = list.find(u => u.email === lowerEmail);
        
        let role = UserRole.VIEWER;
        if (lowerEmail === ROOT_ADMIN_EMAIL || lowerEmail === CORPORATE_ADMIN_EMAIL) {
          role = UserRole.ADMIN;
        } else if (registered) {
          role = registered.role;
        } else if (lowerEmail.endsWith('@fgv.br')) {
          role = UserRole.VIEWER;
        } else {
          // If not root admin, not registered, and not corporate domain, 
          // we still allow viewer by default as per current logic, 
          // but now we've explicitly enabled @fgv.br
          role = UserRole.VIEWER;
        }

        setUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || lowerEmail.split('@')[0].toUpperCase(),
          email: lowerEmail,
          unit: 'SEDE',
          role: role,
          avatarUrl: firebaseUser.photoURL || undefined
        });
      } else {
        setUser(null);
      }
      setIsAuthReady(true);
    });
    return unsub;
  }, []);

  // Real-time Sync: Registered Users
  useEffect(() => {
    if (!isAuthReady) return;
    const unsub = onSnapshot(collection(db, 'registered_users'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RegisteredUser));
      
      // Ensure root admin exists in Firestore if not present
      const hasRoot = list.find(u => u.email === ROOT_ADMIN_EMAIL || u.email === CORPORATE_ADMIN_EMAIL);
      if (hasRoot === undefined && user?.role === UserRole.ADMIN) {
        const rootId = 'root-admin';
        setDoc(doc(db, 'registered_users', rootId), {
          id: rootId,
          name: 'BIANCA BOMFIM',
          email: CORPORATE_ADMIN_EMAIL,
          role: UserRole.ADMIN,
          addedAt: new Date().toISOString()
        }).catch(e => handleFirestoreError(e, OperationType.WRITE, 'registered_users'));
      }
      setRegisteredUsers(list);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'registered_users'));
    return unsub;
  }, [isAuthReady, user]);

  // Real-time Sync: Collaborators
  useEffect(() => {
    if (!isAuthReady || !user) return;
    const unsub = onSnapshot(collection(db, 'collaborators'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collaborator));
      if (list.length === 0 && isSyncing && user.role === UserRole.ADMIN) {
        INITIAL_COLLABORATORS.forEach(c => setDoc(doc(db, 'collaborators', c.id), c).catch(e => handleFirestoreError(e, OperationType.WRITE, 'collaborators')));
      }
      setCollaborators(list.sort((a, b) => a.name.localeCompare(b.name)));
      if (!isSyncing) setShowSyncToast(true);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'collaborators'));
    return unsub;
  }, [isAuthReady, user, isSyncing]);

  // Real-time Sync: Records
  useEffect(() => {
    if (!isAuthReady || !user) return;
    const unsub = onSnapshot(collection(db, 'records'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VacationRecord));
      if (list.length === 0 && isSyncing && user.role === UserRole.ADMIN) {
        INITIAL_RECORDS.forEach(r => setDoc(doc(db, 'records', r.id), r).catch(e => handleFirestoreError(e, OperationType.WRITE, 'records')));
      }
      setRecords(list);
      if (!isSyncing) setShowSyncToast(true);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'records'));
    return unsub;
  }, [isAuthReady, user, isSyncing]);

  // Real-time Sync: Holidays
  useEffect(() => {
    if (!isAuthReady || !user) return;
    const unsub = onSnapshot(collection(db, 'holidays'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Holiday));
      if (list.length === 0 && isSyncing && user.role === UserRole.ADMIN) {
        INITIAL_HOLIDAYS.forEach(h => setDoc(doc(db, 'holidays', h.id), h).catch(e => handleFirestoreError(e, OperationType.WRITE, 'holidays')));
      }
      setHolidays(list);
      if (!isSyncing) setShowSyncToast(true);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'holidays'));
    return unsub;
  }, [isAuthReady, user, isSyncing]);

  // Real-time Sync: Logs
  useEffect(() => {
    if (!isAuthReady || !user) return;
    const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
      setLogs(list);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'logs'));
    return unsub;
  }, [isAuthReady, user]);

  // Real-time Sync: Settings (Logo)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'branding'), (docSnap) => {
      if (docSnap.exists()) {
        setLogo(docSnap.data().logo || DEFAULT_LOGO);
      } else if (user?.role === UserRole.ADMIN) {
        setDoc(doc(db, 'settings', 'branding'), { logo: DEFAULT_LOGO }).catch(e => handleFirestoreError(e, OperationType.WRITE, 'settings/branding'));
      }
      setIsSyncing(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/branding'));
    return unsub;
  }, [user]);

  // Auto-hide sync toast
  useEffect(() => {
    if (showSyncToast) {
      const timer = setTimeout(() => setShowSyncToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSyncToast]);

  const updateLogo = async (newLogo: string) => {
    if (user?.role !== UserRole.ADMIN) return;
    try {
      await setDoc(doc(db, 'settings', 'branding'), { logo: newLogo });
      addLog("Atualizou a identidade visual do sistema");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/branding');
    }
  };

  const resetLogo = async () => {
    if (user?.role !== UserRole.ADMIN) return;
    try {
      await setDoc(doc(db, 'settings', 'branding'), { logo: DEFAULT_LOGO });
      addLog("Restaurou o branding institucional padrão");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/branding');
    }
  };

  const addLog = async (action: string) => {
    if (!user) return;
    const newLog = {
      userId: user.id,
      userName: user.name,
      action,
      timestamp: new Date().toISOString()
    };
    try {
      await addDoc(collection(db, 'logs'), newLog);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'logs');
    }
  };

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };

  const logout = async () => {
    addLog("Logout efetuado");
    await signOut(auth);
  };

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={{ 
        user, login, logout, addLog, isAuthenticated: !!user, 
        logo, updateLogo, resetLogo, registeredUsers, setRegisteredUsers,
        isAuthReady
      }}>
        <HashRouter>
          {isAuthReady ? (
            <Routes>
              <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
              <Route path="/*" element={
                user ? (
                  <div className="flex min-h-screen bg-[#0D1117]">
                    <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                    <main className="flex-1 flex flex-col md:ml-72">
                      <Header onMenuClick={() => setSidebarOpen(true)} />
                      <div className="p-4 md:p-8 flex-1">
                        <div className="max-w-7xl mx-auto w-full h-full">
                          <Routes>
                          <Route path="/" element={<Dashboard collaborators={collaborators} records={records} holidays={holidays} />} />
                          <Route path="/analytics" element={<AnalyticsDashboard collaborators={collaborators} records={records} />} />
                          <Route path="/collaborators" element={<CollaboratorsPage collaborators={collaborators} />} />
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
                                setCollaborators={setCollaborators}
                                records={records} 
                                setRecords={setRecords}
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
                          <Route path="/audit" element={<AuditLogPage logs={logs} />} />
                        </Routes>
                      </div>
                    </div>
                  </main>
                </div>
              ) : <Navigate to="/login" />
              } />
            </Routes>
          ) : (
            <div className="min-h-screen flex items-center justify-center bg-[#0D1117]">
              <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="h-12 w-12 bg-[#1F6FEB] rounded-full"></div>
                <p className="text-[#8B949E] font-black uppercase tracking-[0.3em] text-[10px]">Carregando Sistema...</p>
              </div>
            </div>
          )}
        </HashRouter>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
};

export default App;
