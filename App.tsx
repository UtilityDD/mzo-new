
import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { MOCK_USERS } from './constants';
import Dashboard from './components/Dashboard';
import HistoricalReport from './components/Reports';
import PendingNSCReport from './components/PendingNSCReport';
import AuditLog from './components/AuditLog';
import ConsumersReport from './components/ConsumersReport';
import ReportsList from './components/ReportCatalog';
import DocketReport from './components/DocketReport';
import CollectionReport from './components/CollectionReport';
import { fetchUsersFromSheet, logAudit, performFullBackgroundSync } from './services/googleSheetsService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'reports' | 'profile'>('home');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const [loginForm, setLoginForm] = useState({ id: 'dd', pass: '12345' });
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleDataUpdate = (e: any) => {
      console.log('[App] Data updated in background:', e.detail.cacheKey);
      // You could force a re-render here if needed, 
      // but most components fetch on mount or have their own logic.
    };

    window.addEventListener('mzo-data-updated', handleDataUpdate);
    return () => window.removeEventListener('mzo-data-updated', handleDataUpdate);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncing(true);
    setError(null);

    try {
      const liveUsers = await fetchUsersFromSheet();
      const userList = liveUsers.length > 0 ? liveUsers : MOCK_USERS;

      const foundUser = userList.find(u =>
        String(u.user_id).toLowerCase() === String(loginForm.id).toLowerCase() &&
        String(u.password_hash) === String(loginForm.pass) &&
        u.is_active
      );

      if (foundUser) {
        // RECORD LOGIN TO AUDIT LOG
        await logAudit({
          user_id: foundUser.user_id,
          action: 'LOGIN_SUCCESS',
          office: foundUser.office_name || foundUser.user_id,
          details: `Logged in from ${navigator.userAgent.slice(0, 30)}...`,
          status: 'SUCCESS'
        });

        setUser(foundUser);
        setActiveTab('reports');

        // Trigger background sync silently
        performFullBackgroundSync();
      } else {
        const idMatch = userList.find(u => String(u.user_id).toLowerCase() === String(loginForm.id).toLowerCase());

        // RECORD FAILED LOGIN ATTEMPT
        await logAudit({
          user_id: loginForm.id || 'unknown',
          action: 'LOGIN_FAILED',
          office: 'N/A',
          details: idMatch ? 'Incorrect Password' : 'User not found',
          status: 'FAILED'
        });

        if (!idMatch) setError('Invalid User ID');
        else if (String(idMatch.password_hash) !== String(loginForm.pass)) setError('Incorrect Password');
        else if (!idMatch.is_active) setError('Account is inactive');
        else setError('Authentication failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const logout = () => {
    setUser(null);
    setSelectedReportId(null);
    setActiveTab('reports');
  };

  const handleReportSelect = (id: string) => {
    setSelectedReportId(id);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-12">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center text-white text-3xl mb-6 android-shadow">
              <i className="fa-solid fa-chart-line"></i>
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">MZO</h1>
            <p className="mt-2 text-gray-500 font-medium">Actionable data visualization</p>
          </div>

          <form onSubmit={handleLogin} className="bg-white p-8 rounded-[40px] android-shadow border border-gray-100 space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">System ID</label>
              <input
                type="text"
                required
                disabled={syncing}
                value={loginForm.id}
                onChange={(e) => setLoginForm({ ...loginForm, id: e.target.value })}
                className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 disabled:opacity-50 transition-all"
                placeholder="Enter ID"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Password</label>
              <input
                type="password"
                required
                disabled={syncing}
                value={loginForm.pass}
                onChange={(e) => setLoginForm({ ...loginForm, pass: e.target.value })}
                className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 disabled:opacity-50 transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-rose-50 text-rose-600 text-xs font-bold text-center py-3 rounded-xl animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={syncing}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 active:scale-95 transition-all android-shadow shadow-blue-200 disabled:bg-gray-300 flex items-center justify-center gap-3"
            >
              {syncing ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></div>
                  <span>Verifying...</span>
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-gray-300 text-[10px] font-bold uppercase tracking-[0.2em]">
            &copy; 2025 MZO Intelligence
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      <main className="flex-1 overflow-y-auto">

        {activeTab === 'home' && <Dashboard user={user} />}

        {activeTab === 'reports' && (
          selectedReportId ? (
            <div className="relative h-full">
              {selectedReportId === 'REP_PENDING_NSC' && <PendingNSCReport user={user} />}
              {selectedReportId === 'REP_REVENUE_SUMMARY' && <HistoricalReport user={user} />}
              {selectedReportId === 'REP_AUDIT_LOG' && <AuditLog user={user} />}
              {selectedReportId === 'REP_CONSUMERS_SUMMARY' && <ConsumersReport user={user} />}
              {selectedReportId === 'REP_DOCKET_MONITORING' && <DocketReport user={user} />}
              {selectedReportId === 'REP_COLLECTION_ANALYSIS' && <CollectionReport user={user} />}
              {selectedReportId.startsWith('REP_MOCK') && (
                <div className="p-20 text-center space-y-4">
                  <div className="text-4xl text-blue-500"><i className="fa-solid fa-screwdriver-wrench"></i></div>
                  <h2 className="text-xl font-bold">Report Under Construction</h2>
                  <p className="text-sm text-gray-500">The data source for {selectedReportId} is currently being mapped.</p>
                </div>
              )}
            </div>
          ) : (
            <ReportsList user={user} onSelectReport={handleReportSelect} />
          )
        )}

        {activeTab === 'profile' && (
          <div className="p-6 space-y-6 max-w-lg mx-auto fade-in">
            <div className="glass-card p-8 rounded-[40px] text-center space-y-5 premium-shadow">
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full mx-auto flex items-center justify-center text-4xl text-white border-4 border-white premium-shadow">
                  <i className="fa-solid fa-user-tie"></i>
                </div>
                <div className="absolute -right-1 bottom-1 w-7 h-7 bg-emerald-500 border-4 border-white rounded-full"></div>
              </div>

              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">{user.full_name}</h2>
                <p className="text-xs text-blue-600 font-extrabold uppercase tracking-widest mt-1">{user.designation}</p>
              </div>

              <div className="flex items-center justify-center gap-2 text-emerald-600 font-extrabold text-[10px] uppercase tracking-widest py-2 bg-emerald-50/50 rounded-full w-fit mx-auto px-4 border border-emerald-100/50">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                Live Session Verified
              </div>

              <div className="grid grid-cols-2 gap-3 text-left pt-4">
                <div className="bg-gray-50/50 p-4 rounded-[24px] border border-gray-100">
                  <p className="text-[9px] text-gray-400 uppercase font-extrabold tracking-widest mb-1.5">Your Role</p>
                  <p className="text-sm font-bold text-gray-700">{user.role}</p>
                </div>
                <div className="bg-gray-50/50 p-4 rounded-[24px] border border-gray-100">
                  <p className="text-[9px] text-gray-400 uppercase font-extrabold tracking-widest mb-1.5">System ID</p>
                  <p className="text-sm font-bold text-gray-700 tracking-tight">{user.user_id}</p>
                </div>
              </div>

              <button
                onClick={logout}
                className="w-full mt-6 py-4 rounded-2xl bg-rose-50 text-rose-600 font-extrabold text-sm uppercase tracking-widest active:bg-rose-100 transition-all border border-rose-100"
              >
                End Session
              </button>
            </div>

            <p className="text-center text-[9px] font-extrabold text-gray-300 uppercase tracking-[0.3em]">
              MZO Intelligence &copy; 2025
            </p>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-gray-100 px-8 py-3 safe-area-bottom flex justify-between items-center z-40">
        <button
          onClick={() => { setActiveTab('home'); setSelectedReportId(null); }}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-blue-600 scale-110' : 'text-gray-400'}`}
        >
          <div className={`p-2 rounded-2xl ${activeTab === 'home' ? 'bg-blue-50' : ''}`}>
            <i className="fa-solid fa-house-chimney text-lg"></i>
          </div>
          <span className="text-[10px] font-bold">Home</span>
        </button>

        <button
          onClick={() => { setActiveTab('reports'); setSelectedReportId(null); }}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'reports' ? 'text-blue-600 scale-110' : 'text-gray-400'}`}
        >
          <div className={`p-2 rounded-2xl ${activeTab === 'reports' ? 'bg-blue-50' : ''}`}>
            <i className="fa-solid fa-chart-pie text-lg"></i>
          </div>
          <span className="text-[10px] font-bold">Reports</span>
        </button>

        <button
          onClick={() => { setActiveTab('profile'); setSelectedReportId(null); }}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-blue-600 scale-110' : 'text-gray-400'}`}
        >
          <div className={`p-2 rounded-2xl ${activeTab === 'profile' ? 'bg-blue-50' : ''}`}>
            <i className="fa-solid fa-circle-user text-lg"></i>
          </div>
          <span className="text-[10px] font-bold">Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
