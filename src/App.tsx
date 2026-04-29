/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  CheckCircle2, 
  Settings, 
  Menu, 
  X, 
  ChevronRight,
  Plus,
  Search,
  BookOpen,
  Award,
  Database,
  Bell,
  Info,
  Zap,
  Check,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  Mail,
  Clock,
  Trash2,
  Archive,
  ArchiveRestore,
  Filter,
  Sparkles,
  QrCode,
  Scan,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { Member, Activity, AttendanceRecord, View, AppNotification, Badge, User, ReportSchedule } from './types';
import { getScoutAssistantResponse } from './services/geminiService';
import { QRCodeSVG } from 'qrcode.react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Mock Data
const MOCK_BADGES: Badge[] = [
  { id: 'b1', name: 'SKU Ramu', description: 'Lulus Syarat Kecakapan Umum tingkat Ramu', icon: '⛺', color: 'bg-scout-green', category: 'Kecakapan Umum' },
  { id: 'b2', name: 'TKK Menabung', description: 'Rajin menabung dan mengelola uang', icon: '💰', color: 'bg-amber-500', category: 'Kecakapan Khusus' },
  { id: 'b3', name: 'TKK Memasak', description: 'Mahir memasak masakan rimba', icon: '🍳', color: 'bg-orange-500', category: 'Kecakapan Khusus' },
  { id: 'b4', name: 'Bintang Tahunan', description: 'Satu tahun aktif tanpa cela', icon: '⭐', color: 'bg-yellow-400', category: 'Penghargaan' },
];

const MOCK_MEMBERS: Member[] = [
  { id: '1', name: 'Budi Santoso', skuLevel: 'Penggalang', unit: 'Gudep 01.001', joinDate: '2023-01-15', status: 'Active', badges: ['b1', 'b2'] },
  { id: '2', name: 'Ani Wijaya', skuLevel: 'Penggalang', unit: 'Gudep 01.001', joinDate: '2023-02-10', status: 'Active', badges: ['b1', 'b3'] },
  { id: '3', name: 'Siti Aminah', skuLevel: 'Penggalang', unit: 'Gudep 01.001', joinDate: '2023-03-05', status: 'Active', badges: ['b4'] },
];

const MOCK_ACTIVITIES: Activity[] = [
  { id: '1', title: 'Latihan Rutin Mingguan', date: '2024-03-22', description: 'Materi Peta Pita dan Kompas', location: 'Halaman Sekolah', participantsCount: 25, category: 'Latihan Rutin', isArchived: false },
  { id: '2', title: 'Persami (Perkemahan Sabtu Minggu)', date: '2024-04-05', description: 'Pelantikan Penggalang Ramu', location: 'Bumi Perkemahan Cibubur', participantsCount: 40, category: 'Perkemahan', isArchived: false },
  { id: '3', title: 'Kemah Bakti Desa', date: '2023-11-12', description: 'Misi bakti sosial di desa Kertarahayu', location: 'Desa Kertarahayu', participantsCount: 30, category: 'Bakti Sosial', isArchived: true },
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('scout_users');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((u: any) => ({
        ...u,
        role: u.role || 'Pembina',
        status: u.status || 'active'
      }));
    }
    return [
      { id: '1', username: 'admin', password: '123', fullName: 'Kak Admin (Owner)', role: 'Owner', status: 'active' }
    ];
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  const isOwner = currentUser?.role === 'Owner';
  const isAdmin = currentUser?.role === 'Admin' || isOwner;

  // App State
  const [members, setMembers] = useState<Member[]>(() => {
    const saved = localStorage.getItem('scout_members');
    return saved ? JSON.parse(saved) : MOCK_MEMBERS;
  });
  const [activities, setActivities] = useState<Activity[]>(() => {
    const saved = localStorage.getItem('scout_activities');
    return saved ? JSON.parse(saved) : MOCK_ACTIVITIES;
  });
  
  const [apiToken, setApiToken] = useState(() => {
    return localStorage.getItem('scout_api_token') || '2130';
  });

  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: '1',
      title: 'Pesan Super Penting! 📢',
      message: 'Besok latihan rutin jam 15.00 WIB. Pake seragam lengkap plus hasduk ya!',
      time: new Date().toISOString(),
      type: 'important',
      read: false
    },
    {
      id: '2',
      title: 'Squad Baru Bergabung! 👥',
      message: 'Budi Santoso baru aja masuk squad Penggalang kita nih.',
      time: new Date(Date.now() - 3600000).toISOString(),
      type: 'activity',
      read: true
    }
  ]);

  const [reportSchedules, setReportSchedules] = useState<ReportSchedule[]>(() => {
    const saved = localStorage.getItem('scout_schedules');
    return saved ? JSON.parse(saved) : [];
  });

  const [isIDCardOpen, setIsIDCardOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Find existing user by email
        const existingUser = users.find(u => u.email === firebaseUser.email);
        
        if (existingUser) {
          setCurrentUser(existingUser);
          setIsAuthenticated(true);
        } else {
          // Auto-register owner if email matches
          if (firebaseUser.email === 'rafisyahputra728@gmail.com') {
            const ownerUser: User = {
              id: firebaseUser.uid,
              username: 'admin',
              fullName: firebaseUser.displayName || 'Kak Admin',
              password: '', // No password for google auth users
              role: 'Owner',
              status: 'active',
              email: firebaseUser.email
            };
            
            setUsers(prev => {
              if (prev.some(u => u.username === 'admin')) {
                 return prev.map(u => u.username === 'admin' ? ownerUser : u);
              }
              return [...prev, ownerUser];
            });
            setCurrentUser(ownerUser);
            setIsAuthenticated(true);
            toast.success(`Selamat Datang, ${ownerUser.fullName}!`, {
              description: 'Berhasil masuk sebagai OWNER melalui Google Login.'
            });
          }
        }
      }
    });

    return () => unsubscribe();
  }, [users]);

  // Effects
  useEffect(() => {
    localStorage.setItem('scout_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('scout_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('scout_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isAuthenticated) {
    const handleGoogleSignIn = async () => {
      try {
        const result = await signInWithPopup(auth, googleProvider);
      } catch (error: any) {
        toast.error('Gagal Login Google', {
          description: error.message
        });
      }
    };

    const handleQRLogin = (data: string) => {
      try {
        const decoded = JSON.parse(data);
        if (decoded.type === 'scout_login' && decoded.u && decoded.p) {
          const user = users.find(u => u.username === decoded.u && u.password === decoded.p);
          if (user) {
            if (user.status === 'pending' && user.role !== 'Owner') {
              toast.error('Akun Belum Aktif', { description: 'Menunggu konfirmasi Admin.' });
              return;
            }
            setCurrentUser(user);
            setIsAuthenticated(true);
            setIsQRScannerOpen(false);
            toast.success(`Berhasil Login QR, Kak ${user.fullName}!`);
          } else {
            toast.error('User Tidak Ditemukan');
          }
        }
      } catch {
        toast.error('QR Code Tidak Valid');
      }
    };

    if (authMode === 'login') {
      return (
        <>
          <LoginView 
            users={users} 
            onLogin={(user) => {
              setCurrentUser(user);
              setIsAuthenticated(true);
            }} 
            onGoogleLogin={handleGoogleSignIn}
            onQRLogin={() => setIsQRScannerOpen(true)}
            onSwitchToRegister={() => setAuthMode('register')} 
          />
          {isQRScannerOpen && (
            <QRScannerModal 
              isOpen={isQRScannerOpen} 
              onClose={() => setIsQRScannerOpen(false)} 
              onScan={handleQRLogin} 
            />
          )}
        </>
      );
    }
    return (
      <RegisterView 
        onRegister={(u) => {
          setUsers(prev => [...prev, u]);
          setAuthMode('login');
        }} 
        onGoogleLogin={handleGoogleSignIn}
        onSwitchToLogin={() => setAuthMode('login')} 
      />
    );
  }

  const approveUser = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'active' } : u));
    toast.success('Akun Berhasil Dikonfirmasi!', {
      description: 'Sekarang user tersebut sudah bisa masuk ke sistem.'
    });
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    toast.info('Akun Berhasil Dihapus.');
  };

  const promoteUser = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role: 'Admin' } : u));
    toast.success('Berhasil Diangkat!', {
      description: 'User tersebut sekarang memiliki hak akses Admin.'
    });
  };

  const updateProfile = (data: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === currentUser?.id ? { ...u, ...data } : u));
    setCurrentUser(prev => prev ? { ...prev, ...data } : null);
    toast.success('Profil Diupdate!');
  };

  return (
    <div className="flex h-screen bg-earth-beige font-sans text-text-dark overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-soft-sage transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:static lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-soft-sage flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-scout-green rounded-xl flex items-center justify-center text-white shadow-lg">
                <Award size={24} />
              </div>
              <span className="font-black text-scout-green tracking-tighter uppercase text-2xl">ONE<span className="text-accent">KERTA</span></span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 hover:bg-earth-beige rounded-lg">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            <NavItem icon={<LayoutDashboard size={20}/>} label="Beranda" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
            <NavItem icon={<Users size={20}/>} label="Anggota" active={currentView === 'members'} onClick={() => setCurrentView('members')} />
            <NavItem icon={<Calendar size={20}/>} label="Kegiatan" active={currentView === 'activities'} onClick={() => setCurrentView('activities')} />
            <NavItem icon={<CheckCircle2 size={20}/>} label="Absensi" active={currentView === 'attendance'} onClick={() => setCurrentView('attendance')} />
            <NavItem icon={<BookOpen size={20}/>} label="SKU / TKK" active={currentView === 'badges'} onClick={() => setCurrentView('badges')} />
            <NavItem icon={<Sparkles size={20}/>} label="Asisten AI" active={currentView === 'ai-assistant'} onClick={() => setCurrentView('ai-assistant')} />
            <NavItem icon={<Settings size={20}/>} label="Pengaturan" active={currentView === 'settings'} onClick={() => setCurrentView('settings')} />
          </nav>

          <div className="p-4 border-t border-soft-sage">
            <button 
              onClick={() => setIsIDCardOpen(true)}
              className="w-full mb-3 flex items-center gap-3 px-4 py-3 bg-accent/10 text-accent rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-accent hover:text-white transition-all group"
            >
              <QrCode size={18} className="group-hover:scale-110 transition-transform" />
              <span>Kartu Anggota</span>
            </button>
            <div className="flex items-center gap-3 p-3 bg-earth-beige rounded-2xl border border-soft-sage mb-4">
              <div className="w-10 h-10 rounded-xl bg-scout-green text-white flex items-center justify-center font-black text-lg">
                {currentUser?.fullName.charAt(0)}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold truncate">{currentUser?.fullName}</p>
                <p className="text-[10px] text-accent font-bold uppercase tracking-widest">{currentUser?.role}</p>
              </div>
              <button 
                onClick={async () => {
                  if (auth.currentUser) {
                    await auth.signOut();
                  }
                  setIsAuthenticated(false);
                  setCurrentUser(null);
                }}
                className="text-text-light hover:text-red-500"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-earth-beige overflow-hidden">
        <header className="bg-white border-b border-soft-sage h-20 flex items-center justify-between px-8 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-earth-beige rounded-xl">
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-black text-scout-green uppercase tracking-tight">{currentView}</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative">
              <Bell size={20} className="text-text-light cursor-pointer hover:text-scout-green" />
              {notifications.some(n => !n.read) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-accent rounded-full border-2 border-white animate-pulse" />
              )}
            </div>
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-bold text-text-light uppercase tracking-widest">Waktu Sekarang</span>
              <span className="text-xs font-black text-scout-green">PRABU-WIDYA 01.001</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 relative">
           <AnimatePresence mode="wait">
             <motion.div
               key={currentView}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.2 }}
               className="h-full"
             >
                {currentView === 'dashboard' && (
                  <DashboardView 
                    members={members} 
                    activities={activities} 
                    notifications={notifications} 
                    onNavigate={setCurrentView}
                    isAdmin={isAdmin}
                  />
                )}
                {currentView === 'members' && (
                  <MembersView 
                    members={members} 
                    onAddMember={(m) => setMembers([...members, m])}
                    onDeleteMember={(id) => setMembers(members.filter(m => m.id !== id))}
                    isAdmin={isAdmin}
                  />
                )}
                {currentView === 'activities' && (
                  <ActivitiesView 
                    activities={activities} 
                    onAddActivity={(a) => setActivities([...activities, a])}
                    onArchiveActivity={(id) => setActivities(activities.map(a => a.id === id ? {...a, isArchived: true} : a))}
                    isAdmin={isAdmin}
                  />
                )}
                {currentView === 'attendance' && (
                  <AttendanceView 
                    members={members} 
                    activities={activities} 
                  />
                )}
                {currentView === 'badges' && (
                  <BadgesView 
                    members={members} 
                    badges={MOCK_BADGES} 
                    onAwardBadge={(memberId, badgeId) => {
                      setMembers(members.map(m => m.id === memberId ? {...m, badges: [...m.badges, badgeId]} : m));
                      toast.success('Lencana dianugerahkan!');
                    }}
                    isAdmin={isAdmin}
                  />
                )}
                {currentView === 'ai-assistant' && <AIAssistantView />}
                {currentView === 'settings' && (
                  <SettingsView 
                    user={currentUser} 
                    users={users}
                    onApproveUser={approveUser}
                    onDeleteUser={deleteUser}
                    onPromoteUser={promoteUser}
                    onEditProfile={updateProfile}
                    reportSchedules={reportSchedules}
                  />
                )}
             </motion.div>
           </AnimatePresence>
        </div>

        {isIDCardOpen && currentUser && (
          <IDCardModal 
            user={currentUser} 
            onClose={() => setIsIDCardOpen(false)} 
          />
        )}
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${active ? 'bg-scout-green text-white shadow-lg shadow-scout-green/20' : 'text-text-light hover:bg-earth-beige hover:text-scout-green'}`}
    >
      {icon}
      <span>{label}</span>
      {active && <ChevronRight size={16} className="ml-auto opacity-50" />}
    </button>
  );
}

function DashboardView({ members, activities, notifications, onNavigate, isAdmin }: { members: Member[], activities: Activity[], notifications: AppNotification[], onNavigate: (v: View) => void, isAdmin: boolean }) {
  const stats = [
    { label: 'Total Anggota', value: members.length, icon: <Users size={24}/>, color: 'bg-blue-500', view: 'members' as View },
    { label: 'Kegiatan Aktif', value: activities.filter(a => !a.isArchived).length, icon: <Calendar size={24}/>, color: 'bg-scout-green', view: 'activities' as View },
    { label: 'Penghargaan', value: 12, icon: <Award size={24}/>, color: 'bg-accent', view: 'badges' as View },
    { label: 'Presensi', value: '85%', icon: <CheckCircle2 size={24}/>, color: 'bg-purple-500', view: 'attendance' as View },
  ];

  return (
    <div className="space-y-8">
      {/* Quick Actions for Admin/Owner */}
      {isAdmin && (
        <div className="flex flex-wrap gap-4">
           <button 
             onClick={() => onNavigate('members')}
             className="flex items-center gap-3 px-6 py-4 bg-scout-green text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl shadow-scout-green/20 hover:scale-105 transition-all"
           >
              <Plus size={20} /> Tambah Anggota Baru
           </button>
           <button 
             onClick={() => onNavigate('attendance')}
             className="flex items-center gap-3 px-6 py-4 bg-white border-2 border-scout-green text-scout-green rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-scout-green hover:text-white transition-all"
           >
              <Scan size={20} /> Absensi QR
           </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onNavigate(s.view)}
            className="bg-white p-6 rounded-[32px] border border-soft-sage shadow-sm flex items-center gap-5 hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1"
          >
            <div className={`w-14 h-14 rounded-2xl ${s.color} flex items-center justify-center text-white shadow-lg group-hover:rotate-6 transition-transform`}>
              {s.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-light uppercase tracking-widest leading-none mb-1">{s.label}</p>
              <p className="text-2xl font-black text-text-dark tracking-tight">{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[40px] border border-soft-sage shadow-sm overflow-hidden relative group">
             <div className="absolute top-0 right-0 p-8 text-scout-green/10 transform rotate-12 group-hover:rotate-6 transition-transform">
                <LayoutDashboard size={120} />
             </div>
             <h3 className="text-xl font-black text-scout-green mb-6 uppercase tracking-tight relative z-10">Kegiatan Terakhir</h3>
             <div className="space-y-4 relative z-10">
                {activities.slice(0, 3).map(a => (
                  <div key={a.id} className="p-4 bg-earth-beige rounded-2xl flex items-center justify-between group/item hover:bg-soft-sage/20 transition-colors">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-scout-green shadow-sm text-sm font-black border border-soft-sage">
                           {new Date(a.date).getDate()}
                        </div>
                        <div>
                           <p className="text-sm font-bold text-text-dark">{a.title}</p>
                           <p className="text-[10px] text-text-light uppercase font-bold">{a.location} • {a.participantsCount} Peserta</p>
                        </div>
                     </div>
                     <ChevronRight size={18} className="text-text-light opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-scout-green p-8 rounded-[40px] text-white shadow-xl shadow-scout-green/20 relative overflow-hidden">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
             <h3 className="text-lg font-black uppercase tracking-tight mb-4 relative z-10">📢 Pengumuman</h3>
             <div className="space-y-4 relative z-10">
                {notifications.slice(0, 2).map(n => (
                   <div key={n.id} className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                      <p className="text-xs font-bold mb-1">{n.title}</p>
                      <p className="text-[10px] opacity-70 leading-relaxed font-medium">{n.message}</p>
                   </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IDCardModal({ user, onClose }: { user: User, onClose: () => void }) {
  const qrValue = JSON.stringify({
    type: 'scout_login',
    u: user.username,
    p: user.password
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-dark/40 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[40px] shadow-2xl overflow-hidden max-w-sm w-full relative print:shadow-none print:rounded-none"
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-earth-beige rounded-full transition-colors z-10 print:hidden">
          <X size={20} />
        </button>

        <div className="print-area">
          {/* Card Front */}
          <div className="p-8 bg-scout-green text-white relative h-48 flex flex-col justify-end">
            <div className="absolute top-8 left-8 flex items-center gap-3">
               <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-scout-green shadow-xl">
                  <Award size={28} />
               </div>
               <div>
                  <h4 className="font-black text-xl tracking-tighter leading-none">ONE KERTA</h4>
                  <p className="text-[8px] font-bold uppercase tracking-[0.3em] opacity-70">Gugus Depan Digital</p>
               </div>
            </div>
            <div className="relative z-10">
               <p className="text-2xl font-black tracking-tight">{user.fullName}</p>
               <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent mt-1">{user.role}</p>
            </div>
            <div className="absolute top-0 right-0 p-8 opacity-10">
               <Users size={120} />
            </div>
          </div>

          <div className="p-8 border-x border-b border-soft-sage flex flex-col items-center">
             <div className="p-4 bg-white rounded-3xl border-2 border-scout-green/10 mb-6 shadow-inner">
                <QRCodeSVG value={qrValue} size={150} level="H" includeMargin />
             </div>
             <p className="text-[10px] font-bold text-text-light uppercase tracking-[0.3em] mb-8">Scan untuk Login Cepat</p>
             
             <div className="w-full grid grid-cols-2 gap-4 print:hidden">
                <button onClick={handlePrint} className="col-span-2 bg-accent text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-accent/20 hover:scale-105 transition-transform">
                   <QrCode size={20} /> Cetak Kartu Offline
                </button>
             </div>
          </div>
        </div>

        <style>{`
          @media print {
            body * { visibility: hidden; }
            .print-area, .print-area * { visibility: visible; }
            .print-area { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); border: none !important; }
            .print:hidden { display: none !important; }
          }
        `}</style>
      </motion.div>
    </div>
  );
}

function QRScannerModal({ isOpen, onClose, onScan }: { isOpen: boolean, onClose: () => void, onScan: (data: string) => void }) {
  useEffect(() => {
    // Note: html5-qrcode implementation would go here
    // For this environment, we'll simulate the scanner or use a simple UI
    // Real implementation would look like:
    /*
    const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
    scanner.render(onScan, (err) => console.log(err));
    return () => scanner.clear();
    */
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-dark/80 backdrop-blur-md">
       <div className="bg-white rounded-[40px] p-8 max-w-sm w-full flex flex-col items-center">
          <div className="flex justify-between items-center w-full mb-8">
             <h3 className="text-xl font-bold text-scout-green uppercase tracking-tight">Scan Login QR</h3>
             <button onClick={onClose} className="p-2 hover:bg-earth-beige rounded-full transition-colors"><X size={20}/></button>
          </div>
          
          <div className="w-full aspect-square bg-earth-beige rounded-3xl border-2 border-dashed border-soft-sage flex flex-col items-center justify-center text-center p-8 mb-6">
             <Scan size={48} className="text-soft-sage mb-4 animate-pulse" />
             <p className="text-xs font-bold text-text-light/50 uppercase leading-relaxed tracking-widest">Arahkan kamera ke Kartu Anggota Digital anda</p>
             
             {/* Placeholder for real scanner */}
             <div className="mt-8 border-t border-soft-sage/30 pt-8 w-full">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Atau tempel data QR di sini..."
                  className="w-full text-xs p-3 bg-white border border-soft-sage rounded-xl outline-none focus:ring-2 focus:ring-accent"
                  onChange={(e) => {
                    if (e.target.value.includes('scout_login')) {
                      onScan(e.target.value);
                    }
                  }}
                />
             </div>
          </div>
          
          <button onClick={onClose} className="w-full py-4 text-text-light font-bold text-xs uppercase tracking-widest">Batal</button>
       </div>
    </div>
  );
}

function MembersView({ members, onAddMember, onDeleteMember, isAdmin }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', unit: '', skuLevel: 'Siaga' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-scout-green uppercase tracking-tight">Daftar Anggota Squad</h3>
        {isAdmin && (
          <button onClick={() => setIsAdding(!isAdding)} className="bg-accent text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-transform">
            <Plus size={16} /> Tambah Anggota
          </button>
        )}
      </div>

      {isAdding && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="bg-white p-6 rounded-3xl border border-soft-sage overflow-hidden mb-6">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input type="text" placeholder="Nama Lengkap" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} className="px-4 py-3 bg-earth-beige rounded-xl border border-soft-sage outline-none font-bold text-sm" />
              <input type="text" placeholder="Unit (Gudep)" value={newMember.unit} onChange={e => setNewMember({...newMember, unit: e.target.value})} className="px-4 py-3 bg-earth-beige rounded-xl border border-soft-sage outline-none font-bold text-sm" />
              <select value={newMember.skuLevel} onChange={e => setNewMember({...newMember, skuLevel: e.target.value})} className="px-4 py-3 bg-earth-beige rounded-xl border border-soft-sage outline-none font-bold text-sm">
                 <option>Siaga</option>
                 <option>Penggalang</option>
                 <option>Penegak</option>
                 <option>Pandega</option>
              </select>
           </div>
           <button 
             onClick={() => {
               onAddMember({ id: Math.random().toString(), ...newMember, joinDate: new Date().toISOString(), status: 'Active', badges: [] });
               setIsAdding(false);
               setNewMember({ name: '', unit: '', skuLevel: 'Siaga' });
             }}
             className="mt-4 w-full bg-scout-green text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest"
           >
              Simpan Anggota Baru 🪢
           </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((m: Member) => (
          <div key={m.id} className="bg-white p-6 rounded-[32px] border border-soft-sage shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Users size={64}/></div>
             <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-scout-green/10 text-scout-green flex items-center justify-center font-black text-lg">
                   {m.name.charAt(0)}
                </div>
                <div>
                   <p className="font-bold text-text-dark">{m.name}</p>
                   <p className="text-[10px] text-text-light uppercase font-bold tracking-widest">{m.unit}</p>
                </div>
             </div>
             <div className="flex items-center justify-between pt-4 border-t border-earth-beige">
                <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-[10px] font-bold uppercase">{m.skuLevel}</span>
                {isAdmin && (
                  <button onClick={() => onDeleteMember(m.id)} className="text-text-light/30 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivitiesView({ activities, onAddActivity, onArchiveActivity, isAdmin }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [newActivity, setNewActivity] = useState({ title: '', date: '', location: '', description: '' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-scout-green uppercase tracking-tight">Agenda Kegiatan Gudep</h3>
        {isAdmin && (
          <button onClick={() => setIsAdding(!isAdding)} className="bg-scout-green text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <Plus size={16} /> Rancang Kegiatan
          </button>
        )}
      </div>

      {isAdding && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="bg-white p-6 rounded-3xl border border-soft-sage overflow-hidden mb-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Judul Kegiatan" value={newActivity.title} onChange={e => setNewActivity({...newActivity, title: e.target.value})} className="px-4 py-3 bg-earth-beige rounded-xl border border-soft-sage outline-none font-bold text-sm" />
              <input type="date" value={newActivity.date} onChange={e => setNewActivity({...newActivity, date: e.target.value})} className="px-4 py-3 bg-earth-beige rounded-xl border border-soft-sage outline-none font-bold text-sm" />
              <input type="text" placeholder="Lokasi" value={newActivity.location} onChange={e => setNewActivity({...newActivity, location: e.target.value})} className="px-4 py-3 bg-earth-beige rounded-xl border border-soft-sage outline-none font-bold text-sm" />
              <input type="text" placeholder="Deskripsi Singkat" value={newActivity.description} onChange={e => setNewActivity({...newActivity, description: e.target.value})} className="px-4 py-3 bg-earth-beige rounded-xl border border-soft-sage outline-none font-bold text-sm" />
           </div>
           <button 
             onClick={() => {
               onAddActivity({ id: Math.random().toString(), ...newActivity, participantsCount: 0, category: 'Kegiatan', isArchived: false });
               setIsAdding(false);
               setNewActivity({ title: '', date: '', location: '', description: '' });
             }}
             className="mt-4 w-full bg-accent text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest"
           >
              Tayangkan Agenda 🚀
           </button>
        </motion.div>
      )}

      <div className="space-y-4">
        {activities.filter((a: Activity) => !a.isArchived).map((a: Activity) => (
          <div key={a.id} className="bg-white p-6 rounded-[32px] border border-soft-sage shadow-sm flex items-center gap-6">
             <div className="flex flex-col items-center justify-center w-16 h-16 bg-earth-beige rounded-2xl border border-soft-sage">
                <span className="text-xl font-black text-scout-green">{new Date(a.date).getDate()}</span>
                <span className="text-[8px] font-black uppercase text-text-light">{new Date(a.date).toLocaleString('id-ID', { month: 'short' })}</span>
             </div>
             <div className="flex-1">
                <h4 className="font-bold text-text-dark">{a.title}</h4>
                <div className="flex items-center gap-3 mt-1">
                   <span className="flex items-center gap-1 text-[10px] text-text-light font-bold uppercase"><Scan size={12}/> {a.location}</span>
                   <span className="flex items-center gap-1 text-[10px] text-accent font-bold uppercase"><Users size={12}/> {a.participantsCount} Peserta</span>
                </div>
             </div>
             {isAdmin && (
               <button onClick={() => onArchiveActivity(a.id)} className="p-3 hover:bg-red-50 text-text-light hover:text-red-500 rounded-xl transition-all">
                  <Archive size={20} />
               </button>
             )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AttendanceView({ members, activities }: any) {
  return (
    <div className="bg-white p-8 rounded-[40px] border border-soft-sage shadow-sm">
       <h3 className="text-xl font-black text-scout-green uppercase tracking-tight mb-8">Papan Kehadiran Digital</h3>
       <div className="overflow-x-auto">
          <table className="w-full text-left">
             <thead>
                <tr className="border-b border-soft-sage">
                   <th className="py-4 text-[10px] font-black uppercase text-text-light tracking-widest">Nama Anggota</th>
                   {activities.slice(0, 5).map((a: Activity) => (
                      <th key={a.id} className="py-4 text-[10px] font-black uppercase text-text-light tracking-widest text-center">{a.title.substring(0, 5)}...</th>
                   ))}
                </tr>
             </thead>
             <tbody>
                {members.map((m: Member) => (
                   <tr key={m.id} className="border-b border-soft-sage/30 hover:bg-earth-beige transition-colors">
                      <td className="py-4 font-bold text-sm text-text-dark">{m.name}</td>
                      {activities.slice(0, 5).map((a: Activity) => (
                         <td key={a.id} className="py-4 text-center">
                            <div className="w-6 h-6 rounded-lg bg-scout-green/10 flex items-center justify-center mx-auto text-scout-green">
                               <Check size={14} />
                            </div>
                         </td>
                      ))}
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
}

function BadgesView({ members, badges, onAwardBadge, isAdmin }: any) {
  const [selectedMember, setSelectedMember] = useState<string>('');

  return (
    <div className="space-y-8">
       <div className="bg-white p-8 rounded-[40px] border border-soft-sage shadow-sm">
          <h3 className="text-xl font-black text-scout-green uppercase tracking-tight mb-6">Pencapaian SKU & TKK</h3>
          <div className="flex gap-4 items-end mb-8">
             <div className="flex-1">
                <label className="text-[10px] font-bold text-text-light uppercase tracking-widest ml-1 mb-1 block">Pilih Anggota</label>
                <select value={selectedMember} onChange={e => setSelectedMember(e.target.value)} className="w-full px-4 py-3 bg-earth-beige border border-soft-sage rounded-2xl outline-none font-bold text-sm">
                   <option value="">Pilih Anggota...</option>
                   {members.map((m: Member) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {badges.map((b: Badge) => (
                <div key={b.id} className="p-6 bg-earth-beige rounded-[32px] border border-soft-sage group">
                   <div className={`w-14 h-14 rounded-2xl ${b.color} flex items-center justify-center text-3xl mb-4 shadow-xl border-4 border-white`}>
                      {b.icon}
                   </div>
                   <h5 className="font-black text-sm text-text-dark uppercase tracking-tight leading-tight mb-2">{b.name}</h5>
                   <p className="text-[10px] text-text-light font-medium leading-relaxed mb-4">{b.description}</p>
                   {isAdmin && selectedMember && (
                      <button 
                        onClick={() => onAwardBadge(selectedMember, b.id)}
                        className="w-full py-2 bg-white text-scout-green rounded-xl text-[10px] font-black uppercase tracking-widest border border-soft-sage hover:bg-scout-green hover:text-white transition-all"
                      >
                         Anugerahkan 🎖️
                      </button>
                   )}
                </div>
             ))}
          </div>
       </div>
    </div>
  );
}

function AIAssistantView() {
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<{role: 'user' | 'ai', content: string}[]>([
    { role: 'ai', content: 'Siap Kak! Saya Asisten Pandu Digital. Ingin tanya apa tentang Pramuka? (Materi SKU, Sandi, Morse, atau Administrasi)' }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    const userMsg = message;
    setChat([...chat, { role: 'user', content: userMsg }]);
    setMessage('');
    setIsTyping(true);
    
    try {
      const response = await getScoutAssistantResponse(userMsg);
      setChat(prev => [...prev, { role: 'ai', content: response }]);
    } catch {
      setChat(prev => [...prev, { role: 'ai', content: 'Maaf Kak, signal di hutan agak terganggu. Coba lagi ya!' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-[40px] border border-soft-sage shadow-sm overflow-hidden">
       <div className="p-6 border-b border-soft-sage bg-scout-green text-white flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner">
             <Sparkles size={24} />
          </div>
          <div>
             <h4 className="font-black uppercase tracking-tight">Kaka Asisten AI</h4>
             <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-70">Pusat Informasi Gudep Digital</p>
          </div>
       </div>
       
       <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {chat.map((c, i) => (
             <div key={i} className={`flex ${c.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-5 rounded-[28px] text-sm font-medium leading-relaxed ${c.role === 'user' ? 'bg-accent text-white rounded-br-none' : 'bg-earth-beige text-text-dark rounded-bl-none border border-soft-sage'}`}>
                   {c.content}
                </div>
             </div>
          ))}
          {isTyping && (
             <div className="flex justify-start">
                <div className="bg-earth-beige p-4 rounded-full border border-soft-sage flex gap-1">
                   <div className="w-1.5 h-1.5 bg-scout-green rounded-full animate-bounce" />
                   <div className="w-1.5 h-1.5 bg-scout-green rounded-full animate-bounce [animation-delay:0.2s]" />
                   <div className="w-1.5 h-1.5 bg-scout-green rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
             </div>
          )}
       </div>

       <div className="p-6 border-t border-soft-sage bg-earth-beige/30 flex gap-3">
          <input 
            type="text" 
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            placeholder="Tanya apapun tentang kepramukaan kak..."
            className="flex-1 px-6 py-4 bg-white border border-soft-sage rounded-[28px] outline-none font-bold text-sm shadow-sm focus:ring-4 focus:ring-scout-green/5 transition-all"
          />
          <button onClick={handleSend} className="w-14 h-14 bg-scout-green text-white rounded-[24px] flex items-center justify-center shadow-lg shadow-scout-green/20 hover:scale-105 active:scale-95 transition-all">
             <Plus size={24} className="rotate-45" />
          </button>
       </div>
    </div>
  );
}

function SettingsView({ user, users, onApproveUser, onDeleteUser, onPromoteUser, onEditProfile, reportSchedules }: any) {
  const isOwner = user?.role === 'Owner';
  const isAdmin = user?.role === 'Admin' || isOwner;
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: user?.fullName, username: user?.username });

  const handleUpdate = (e: any) => {
    e.preventDefault();
    onEditProfile(editForm);
    setIsEditing(false);
  };

  const pendingUsers = users.filter((u: User) => u.status === 'pending');
  const activeUsers = users.filter((u: User) => u.status === 'active');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">
      <div className="space-y-8">
        <div className="bg-white p-8 rounded-[40px] border border-soft-sage shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-scout-green uppercase tracking-tight">Akun Anda</h3>
              <button onClick={() => setIsEditing(!isEditing)} className="text-[10px] font-black text-accent hover:underline uppercase tracking-widest flex items-center gap-1">
                 <Settings size={12} /> {isEditing ? 'Batal' : 'Edit Profil'}
              </button>
           </div>
           
           {isEditing ? (
             <form onSubmit={handleUpdate} className="space-y-4">
                <input type="text" value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} className="w-full px-4 py-3 bg-earth-beige border border-soft-sage rounded-2xl outline-none font-bold text-sm" placeholder="Nama Lengkap" />
                <input type="text" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} className="w-full px-4 py-3 bg-earth-beige border border-soft-sage rounded-2xl outline-none font-bold text-sm" placeholder="Username" />
                <button type="submit" className="w-full bg-scout-green text-white py-3 rounded-2xl font-bold uppercase text-xs tracking-widest">Simpan Perubahan</button>
             </form>
           ) : (
             <div className="flex items-center gap-5 p-6 bg-earth-beige rounded-3xl border border-soft-sage">
                <div className="w-16 h-16 rounded-[24px] bg-scout-green flex items-center justify-center text-white font-black text-2xl shadow-xl border-4 border-white">
                   {user?.fullName.charAt(0)}
                </div>
                <div>
                   <p className="text-lg font-black text-text-dark tracking-tight">{user?.fullName}</p>
                   <p className="text-[10px] text-accent font-black uppercase tracking-[0.2em]">{user?.role} • @{user?.username}</p>
                </div>
             </div>
           )}
        </div>

        {isAdmin && (
          <div className="bg-white p-8 rounded-[40px] border border-soft-sage shadow-sm">
             <h3 className="text-xl font-black text-scout-green mb-6 uppercase tracking-tight">📧 Laporan Otomatis</h3>
             {reportSchedules.length === 0 ? (
                <div className="py-12 bg-earth-beige rounded-3xl border border-dashed border-soft-sage flex flex-col items-center justify-center text-center">
                   <Mail className="text-soft-sage mb-2" size={32} />
                   <p className="text-xs font-bold text-text-light/50 uppercase tracking-widest">Belum ada jadwal</p>
                </div>
             ) : (
                <div className="space-y-3">
                   {/* Maps schedules here */}
                </div>
             )}
          </div>
        )}
      </div>

      <div className="space-y-8">
        {isAdmin && pendingUsers.length > 0 && (
          <div className="bg-white p-8 rounded-[40px] border-4 border-accent/20 shadow-xl shadow-accent/5">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-accent text-white flex items-center justify-center animate-pulse shadow-lg">
                   <Bell size={20} />
                </div>
                <h3 className="text-xl font-black text-accent uppercase tracking-tight">Persetujuan Akun</h3>
             </div>
             <div className="space-y-4">
                {pendingUsers.map((u: User) => (
                   <div key={u.id} className="p-4 bg-accent/5 rounded-3xl border border-accent/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center font-black">
                            {u.fullName.charAt(0)}
                         </div>
                         <div>
                            <p className="text-sm font-black text-text-dark">{u.fullName}</p>
                            <p className="text-[10px] text-accent font-bold uppercase tracking-widest">@{u.username} • {u.role}</p>
                         </div>
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => onApproveUser(u.id)} className="p-2.5 bg-scout-green text-white rounded-xl shadow-lg hover:bg-scout-green/90 transition-all">
                            <Check size={18} />
                         </button>
                         <button onClick={() => onDeleteUser(u.id)} className="p-2.5 bg-white text-red-500 rounded-xl border border-red-50 hover:bg-red-50 transition-all shadow-sm">
                            <X size={18} />
                         </button>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        )}

        {isAdmin && (
           <div className="bg-white p-8 rounded-[40px] border border-soft-sage shadow-sm">
              <h3 className="text-xl font-black text-scout-green mb-6 uppercase tracking-tight">👥 Kelola Kader</h3>
              <div className="space-y-3">
                 {activeUsers.map((u: User) => (
                    <div key={u.id} className="p-4 bg-earth-beige rounded-3xl border border-soft-sage flex items-center justify-between group">
                       <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${u.role === 'Owner' ? 'bg-accent' : 'bg-scout-green'} text-white flex items-center justify-center font-black`}>
                             {u.fullName.charAt(0)}
                          </div>
                          <div>
                             <p className="text-sm font-black text-text-dark">{u.fullName}</p>
                             <p className="text-[10px] text-text-light uppercase font-bold">@{u.username} • {u.role}</p>
                          </div>
                       </div>
                       <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {u.role === 'Pembina' && (
                            <button onClick={() => onPromoteUser(u.id)} title="Jadikan Admin" className="p-2 bg-white text-accent rounded-xl border border-accent/20 hover:bg-accent hover:text-white transition-all">
                               <Zap size={16} />
                            </button>
                          )}
                          {u.id !== user?.id && u.role !== 'Owner' && (
                             <button onClick={() => onDeleteUser(u.id)} title="Hapus Akun" className="p-2 bg-white text-red-500 rounded-xl border border-red-100 hover:bg-red-50 transition-all">
                                <Trash2 size={16} />
                             </button>
                          )}
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}
      </div>
    </div>
  );
}

function LoginView({ users, onLogin, onGoogleLogin, onQRLogin, onSwitchToRegister }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      const user = users.find((u: any) => u.username === username && u.password === password);
      if (user) {
        if (user.status === 'pending' && user.role !== 'Owner') {
          toast.error('Akun Belum Aktif ⏳', {
            description: 'Akun kakak masih menunggu antrian konfirmasi dari Owner/Admin.'
          });
          setIsLoading(false);
          return;
        }
        onLogin(user);
        toast.success(`Halo Kak ${user.fullName}!`, { description: 'Selamat bertugas kembali.' });
      } else {
        toast.error('Gagal Masuk', { description: 'Data login salah kak.' });
      }
      setIsLoading(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-earth-beige flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-scout-green/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white p-10 rounded-[48px] shadow-2xl border border-soft-sage relative z-10">
           <div className="flex flex-col items-center mb-10 text-center">
              <div className="w-20 h-20 bg-scout-green rounded-3xl flex items-center justify-center text-white shadow-xl shadow-scout-green/20 mb-6 border-4 border-earth-beige animate-bounce-slow">
                 <Award size={40} />
              </div>
              <h2 className="text-4xl font-black text-scout-green tracking-tight uppercase">ONE<span className="text-accent">KERTA</span></h2>
              <p className="text-[10px] font-bold text-text-light uppercase tracking-[0.3em] mt-2">Dapodik Gugusdepan Terintegrasi</p>
           </div>

           <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-text-light uppercase tracking-widest pl-1">Identitas (Username)</label>
                 <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light/50"><Users size={18} /></span>
                    <input type="text" required value={username} onChange={e => setUsername(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-earth-beige border border-soft-sage rounded-2xl outline-none font-bold text-sm focus:ring-4 focus:ring-scout-green/5 transition-all" placeholder="Gunakan ID Digital/Username" />
                 </div>
              </div>
              <div className="space-y-2">
                 <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-text-light uppercase tracking-widest">Sandi Rahasia</label>
                    <button type="button" className="text-[10px] font-bold text-accent hover:underline uppercase tracking-widest">Lupa Sandi?</button>
                 </div>
                 <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light/50"><Lock size={18} /></span>
                    <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-12 pr-12 py-4 bg-earth-beige border border-soft-sage rounded-2xl outline-none font-bold text-sm focus:ring-4 focus:ring-scout-green/5 transition-all" placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-light/30 hover:text-accent transition-colors">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                 </div>
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-scout-green text-white py-4 rounded-3xl font-black tracking-widest uppercase shadow-xl shadow-scout-green/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50">
                 {isLoading ? "MASUK..." : "MASUK SQUAD 🚀"}
              </button>

              <button 
                type="button"
                onClick={onQRLogin}
                className="w-full bg-accent/10 text-accent py-4 rounded-3xl font-black tracking-widest uppercase hover:bg-accent hover:text-white transition-all flex items-center justify-center gap-3 mt-4"
              >
                 <Scan size={20} /> Login dengan QR
              </button>

              <div className="relative my-6">
                 <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-soft-sage"></div></div>
                 <div className="relative flex justify-center text-[10px] uppercase font-bold"><span className="bg-white px-2 text-text-light">Atau</span></div>
              </div>

              <button 
                type="button" 
                onClick={onGoogleLogin}
                className="w-full bg-white border border-soft-sage text-text-dark py-4 rounded-3xl font-black tracking-widest uppercase shadow-sm hover:bg-earth-beige active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                 <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                 Masuk dengan Google
              </button>
           </form>

           <div className="mt-8 pt-8 border-t border-soft-sage text-center">
              <p className="text-xs font-bold text-text-light">Belum punya akun? <button onClick={onSwitchToRegister} className="text-accent underline">Daftar Kuy!</button></p>
           </div>
        </motion.div>
    </div>
  );
}

function RegisterView({ onRegister, onGoogleLogin, onSwitchToLogin }: any) {
  const [formData, setFormData] = useState({ fullName: '', username: '', password: '', role: 'Pembina' as any });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    const forbiddenUsernames = ['admin', 'owner', 'root'];
    if (forbiddenUsernames.includes(formData.username.toLowerCase())) {
      toast.error('Gagal Mendaftar', {
        description: `Username "${formData.username}" tidak tersedia karena sudah dipesan kak!`
      });
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      onRegister({ 
        id: Math.random().toString(36).substr(2, 9), 
        ...formData, 
        status: 'pending' 
      });
      setIsLoading(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-earth-beige flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-white p-10 rounded-[48px] shadow-2xl border border-soft-sage">
           <div className="flex flex-col items-center mb-10 text-center">
              <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-accent/20">
                 <Plus size={32} />
              </div>
              <h2 className="text-2xl font-black text-scout-green uppercase tracking-tight">KADER BARU</h2>
              <p className="text-[10px] font-bold text-text-light uppercase tracking-widest mt-2">Daftar Akun Pengurus Digital</p>
           </div>

           <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-text-light uppercase tracking-widest ml-1">Nama Lengkap Kakak</label>
                 <input type="text" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full px-5 py-4 bg-earth-beige border border-soft-sage rounded-2xl outline-none font-bold text-sm" placeholder="Contoh: Kak Budi" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-text-light uppercase tracking-widest ml-1">Username (ID Digital)</label>
                 <input type="text" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-5 py-4 bg-earth-beige border border-soft-sage rounded-2xl outline-none font-bold text-sm" placeholder="kak_budi" />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-text-light uppercase tracking-widest ml-1">Daftar Sebagai apa?</label>
                 <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setFormData({...formData, role: 'Pembina'})} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.role === 'Pembina' ? 'bg-scout-green text-white shadow-lg' : 'bg-earth-beige text-text-light border border-soft-sage'}`}>PEMBINA</button>
                    <button type="button" onClick={() => setFormData({...formData, role: 'Admin'})} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.role === 'Admin' ? 'bg-scout-green text-white shadow-lg' : 'bg-earth-beige text-text-light border border-soft-sage'}`}>ADMIN</button>
                 </div>
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] font-bold text-text-light uppercase tracking-widest ml-1">Sandi Rahasia</label>
                 <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-5 py-4 bg-earth-beige border border-soft-sage rounded-2xl outline-none font-bold text-sm" placeholder="••••••••" />
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-accent text-white py-4 rounded-3xl font-black tracking-widest uppercase shadow-xl hover:opacity-90 active:scale-95 transition-all mt-4 disabled:opacity-50">
                 {isLoading ? "MENDAFTAR..." : "KIRIM PENDAFTARAN 🪢"}
              </button>

              <div className="relative my-6">
                 <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-soft-sage"></div></div>
                 <div className="relative flex justify-center text-[10px] uppercase font-bold"><span className="bg-white px-2 text-text-light">Atau</span></div>
              </div>

              <button 
                type="button" 
                onClick={onGoogleLogin}
                className="w-full bg-white border border-soft-sage text-text-dark py-4 rounded-3xl font-black tracking-widest uppercase shadow-sm hover:bg-earth-beige active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                 <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                 Daftar dengan Google
              </button>
           </form>

           <p className="mt-8 text-center text-xs font-bold text-text-light">Udah punya akun? <button onClick={onSwitchToLogin} className="text-accent underline">Masuk Aja</button></p>
        </motion.div>
    </div>
  );
}
