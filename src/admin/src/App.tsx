import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Calendar, CreditCard, Settings as SettingsIcon, Users, Menu, LogOut, Lock } from 'lucide-react';

import Dashboard from './components/Dashboard';
import EventsManager from './components/EventsManager';
import PaymentsTable from './components/PaymentsTable';
import UsersManager from './components/UsersManager';
import Settings from './components/Settings';
import Login from './components/Login';

import { EventData, UserData, ViewState } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const [currentView, setCurrentView] = useState<ViewState>(() => {
    const savedView = localStorage.getItem('nicket_current_view');
    const validViews = ['dashboard', 'events', 'payments', 'users', 'settings'];
    return (validViews.includes(savedView || '') ? savedView as ViewState : 'dashboard');
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [events, setEvents] = useState<EventData[]>([]);

  // --- AUTH EFFECTS ---
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await fetch('/api/auth/me', {
             headers: { 'Authorization': `Bearer ${storedToken}` }
          });
          if (res.ok) {
            const user = await res.json();
            setCurrentUser(user);
            setToken(storedToken);
          } else {
            handleLogout();
          }
        } catch {
          handleLogout();
        }
      }
      setIsLoadingUser(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    localStorage.setItem('nicket_current_view', currentView);
  }, [currentView]);

  // --- DATA FETCHING ---
  useEffect(() => {
    if (token) {
        fetch('/events', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error("Failed to fetch events");
        })
        .then(data => {
          if (Array.isArray(data)) {
            setEvents(data);
          } else {
            setEvents([]);
          }
        })
        .catch(err => {
          console.error("Error loading events:", err);
          setEvents([]);
        });
    }
  }, [currentView, token]);

  // --- HANDLERS ---
  const handleLoginSuccess = (user: UserData, authToken: string) => {
    localStorage.setItem('token', authToken);
    setToken(authToken);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('nicket_current_view');
    setToken(null);
    setCurrentUser(null);
    setCurrentView('dashboard');
  };

  if (isLoadingUser) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  if (!currentUser || !token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => {
    if (view === 'users' && currentUser.role !== 'admin') return null;
    if (['dashboard', 'events', 'payments'].includes(view) && !currentUser.permissions.includes(view)) return null;

    return (
      <button
        onClick={() => { setCurrentView(view); setIsMobileMenuOpen(false); }}
        className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 font-medium ${
          currentView === view 
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <Icon size={20} />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* Mobile Overlay */}
      {isMobileMenuOpen && ( <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} /> )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-72 bg-white border-r border-gray-100 p-6 flex flex-col justify-between
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div>
          <div className="flex items-center gap-3 px-2 mb-10">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">N</div>
            <span className="text-xl font-bold tracking-tight text-gray-900">Nicket.</span>
          </div>
          <nav className="space-y-2">
            <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem view="events" icon={Calendar} label="Events" />
            <NavItem view="payments" icon={CreditCard} label="Payments" />
            <NavItem view="users" icon={Users} label="Users" />
          </nav>
        </div>

        <div className="mt-auto pt-6 border-t border-gray-50">
          <NavItem view="settings" icon={SettingsIcon} label="Settings" />
          <button onClick={handleLogout} className="w-full mt-4 flex items-center gap-4 px-4 py-3.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
          <div className="mt-6 flex items-center gap-3 px-2 py-3 rounded-xl bg-gray-50 border border-gray-100">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              {currentUser.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{currentUser.name}</p>
              <p className="text-xs text-gray-500 truncate capitalize">{currentUser.role} Account</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <div className="lg:hidden flex justify-between items-center mb-6">
            <span className="font-bold text-xl text-gray-800">Nicket.</span>
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-white rounded-lg border border-gray-200 text-gray-600 shadow-sm"><Menu size={24} /></button>
          </div>

          {currentView === 'dashboard' && currentUser.permissions.includes('dashboard') && (
            <Dashboard events={events} />
          )}
          
          {currentView === 'events' && currentUser.permissions.includes('events') && (
            <EventsManager />
          )}
          
          {currentView === 'payments' && currentUser.permissions.includes('payments') && (
            <PaymentsTable events={events} />
          )}
          
          {currentView === 'users' && currentUser.role === 'admin' && (
             <UsersManager currentUser={currentUser} />
          )}
          
          {currentView === 'settings' && (
            <Settings currentUser={currentUser} auditLogs={[]} onClearLogs={()=>{}} onLogAction={()=>{}} />
          )}

          {(!['settings', 'users'].includes(currentView) && !currentUser.permissions.includes(currentView)) && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
                <Lock size={48} className="mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-600">Access Restricted</h3>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;