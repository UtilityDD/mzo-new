
import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { MOCK_USERS } from './constants';
import Dashboard from './components/Dashboard';
import HistoricalReport from './components/Reports';
import PendingNSCReport from './components/PendingNSCReport';
import AuditLog from './components/AuditLog';
import ConsumersReport from './components/ConsumersReport';
import ReportsList from './components/ReportCatalog';
import { fetchUsersFromSheet, logAudit } from './services/googleSheetsService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'reports' | 'profile'>('reports');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const [loginForm, setLoginForm] = useState({ id: 'dd', pass: '12345' });
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

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

        {activeTab === 'reports' && (
          selectedReportId ? (
            <div className="relative h-full">
              {selectedReportId === 'REP_PENDING_NSC' && <PendingNSCReport user={user} />}
              {selectedReportId === 'REP_REVENUE_SUMMARY' && <HistoricalReport user={user} />}
              {selectedReportId === 'REP_AUDIT_LOG' && <AuditLog user={user} />}
              {selectedReportId === 'REP_CONSUMERS_SUMMARY' && <ConsumersReport user={user} />}
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
          <div className="p-6 space-y-6 max-w-lg mx-auto">
            <div className="bg-white p-8 rounded-[40px] android-shadow text-center space-y-4">
              <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto flex items-center justify-center text-4xl text-gray-400 border-4 border-white android-shadow">
                <i className="fa-solid fa-user-tie"></i>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{user.full_name}</h2>
                <p className="text-sm text-blue-600 font-semibold">{user.designation}</p>
              </div>

              <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-[10px] uppercase">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                Live Session Verified
              </div>

              <div className="grid grid-cols-2 gap-2 text-left pt-2">
                <div className="bg-gray-50 p-3 rounded-2xl">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Role</p>
                  <p className="text-sm font-bold text-gray-700">{user.role}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">System ID</p>
                  <p className="text-sm font-bold text-gray-700">{user.user_id}</p>
                </div>
              </div>

              <button
                onClick={logout}
                className="w-full mt-6 py-4 rounded-2xl bg-gray-100 text-rose-600 font-bold active:bg-rose-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 px-8 py-3 safe-area-bottom flex justify-between items-center z-40">
        <button
          onClick={() => { setActiveTab('reports'); setSelectedReportId(null); }}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'reports' ? 'text-blue-600 scale-110' : 'text-gray-400'}`}
        >
          <div className={`p-2 rounded-2xl ${activeTab === 'reports' ? 'bg-blue-50' : ''}`}>
            <i className="fa-solid fa-grid-2 text-lg"></i>
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
