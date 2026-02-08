
import React, { useState, useEffect } from 'react';
import { User, PendingNSCData, DocketData, CollectionData, ConsumerData } from '../types';
import { fetchNSCData, fetchDocketData, fetchCollectionData, fetchConsumerData } from '../services/dataService';

interface DashboardProps {
  user: User;
  onNavigateToReport?: (reportId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onNavigateToReport }) => {
  const [nscData, setNscData] = useState<PendingNSCData[]>([]);
  const [docketData, setDocketData] = useState<DocketData[]>([]);
  const [collectionData, setCollectionData] = useState<CollectionData[]>([]);
  const [consumerData, setConsumerData] = useState<ConsumerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [nsc, dockets, collections, consumers] = await Promise.all([
          fetchNSCData(user, {}),
          fetchDocketData(user, {}),
          fetchCollectionData(user, {}),
          fetchConsumerData(user, {})
        ]);

        setNscData(nsc);
        setDocketData(dockets);
        setCollectionData(collections);
        setConsumerData(consumers);
      } catch (error) {
        console.error("Dashboard Load Error:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  // NSC Metrics
  const totalPending = nscData.length;
  const criticalDelays = nscData.filter(d => {
    const hasHighDelay = d.DelayRange !== '0-3 Day' && d.DelayRange !== '4-7 Day';
    const isNonPole = d.PoleNonPole === 'Non Pole Case';
    return hasHighDelay && isNonPole;
  }).length;
  const delayRanges = nscData.reduce((acc, d) => {
    acc[d.DelayRange] = (acc[d.DelayRange] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Docket Metrics
  const totalDockets = docketData.length;

  // Collection Metrics
  const lastMonthObj = collectionData.reduce((latest, curr) => {
    const yearMonth = curr.PAYMENT_DT.substring(0, 6);
    return yearMonth > latest ? yearMonth : latest;
  }, '000000');

  const lastMonthLabel = lastMonthObj !== '000000'
    ? new Date(`${lastMonthObj.substring(0, 4)}-${lastMonthObj.substring(4, 6)}-01`)
      .toLocaleString('default', { month: 'short', year: '2-digit' })
    : 'N/A';

  const lastMonthCollections = collectionData.filter(c =>
    c.PAYMENT_DT.startsWith(lastMonthObj)
  );
  const lastMonthAmount = lastMonthCollections.reduce((sum, c) => sum + c.AMOUNT_PAID, 0);
  const totalAmount = collectionData.reduce((sum, c) => sum + c.AMOUNT_PAID, 0);

  // Consumer Metrics
  const totalConsumers = consumerData.reduce((sum, c) => sum + c.COUNT, 0);
  const totalLoad = consumerData.reduce((sum, c) => sum + c.LOAD, 0);

  if (loading) {
    return (
      <div className="pb-24 pt-4 px-4 space-y-6 max-w-lg mx-auto md:max-w-4xl">
        <div className="h-8 w-48 skeleton rounded-lg"></div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 skeleton rounded-2xl"></div>
          ))}
        </div>
        <div className="h-48 w-full skeleton rounded-3xl"></div>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-6 px-4 space-y-8 max-w-lg mx-auto md:max-w-7xl fade-in">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-[32px] android-shadow border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-xs text-gray-400 uppercase font-extrabold tracking-widest mt-1">
            {user.office_name || user.full_name}
          </p>
        </div>
        <div className="hidden lg:block text-right">
          <p className="text-xs text-gray-400 font-bold">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <div className="space-y-8">

        {/* 1. Pending NSC Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Pending NSC Status
            </h3>
            {onNavigateToReport && (
              <button onClick={() => onNavigateToReport('REP_PENDING_NSC')} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider transition-colors flex items-center gap-1">
                View Report <i className="fa-solid fa-arrow-right"></i>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Metrics Column */}
            <div className="lg:col-span-4 space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                <div
                  onClick={() => onNavigateToReport?.('REP_PENDING_NSC')}
                  className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-[28px] text-white premium-shadow active:scale-95 transition-all cursor-pointer group hover:shadow-blue-200 hover:shadow-lg relative overflow-hidden"
                >
                  <div className="absolute -right-4 -bottom-4 opacity-10 text-9xl rotate-[-15deg]">
                    <i className="fa-solid fa-clock"></i>
                  </div>
                  <div className="relative">
                    <p className="text-[11px] font-bold uppercase tracking-widest opacity-80 mb-1">Total Pending</p>
                    <h2 className="text-4xl font-black">{totalPending.toLocaleString()}</h2>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold bg-white/20 w-fit px-2 py-1 rounded-lg backdrop-blur-sm">
                      <i className="fa-solid fa-layer-group"></i>
                      <span>Applications</span>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => onNavigateToReport?.('REP_PENDING_NSC')}
                  className="bg-gradient-to-br from-rose-500 to-rose-600 p-6 rounded-[28px] text-white premium-shadow active:scale-95 transition-all cursor-pointer group hover:shadow-rose-200 hover:shadow-lg relative overflow-hidden"
                >
                  <div className="absolute -right-4 -bottom-4 opacity-10 text-9xl rotate-[-15deg]">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                  </div>
                  <div className="relative">
                    <p className="text-[11px] font-bold uppercase tracking-widest opacity-80 mb-1">Critical (&gt;15 Days)</p>
                    <h2 className="text-4xl font-black">{criticalDelays.toLocaleString()}</h2>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold bg-white/20 w-fit px-2 py-1 rounded-lg backdrop-blur-sm">
                      <i className="fa-solid fa-bolt"></i>
                      <span>Non-Pole Cases</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Aging Chart Column */}
            <div className="lg:col-span-8">
              <div className="bg-white p-6 rounded-[32px] android-shadow border border-gray-100 h-full flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                    <i className="fa-solid fa-hourglass-half text-sm"></i>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 leading-none">Pending Aging Analysis</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Breakdown by time bucket</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  {Object.entries(delayRanges).sort((a, b) => {
                    const aSerial = nscData.find(d => d.DelayRange === a[0])?.DelaySerial || 0;
                    const bSerial = nscData.find(d => d.DelayRange === b[0])?.DelaySerial || 0;
                    return bSerial - aSerial;
                  }).map(([range, count]) => {
                    const percentage = totalPending > 0 ? ((count / totalPending) * 100).toFixed(1) : '0';
                    return (
                      <div key={range} className="group">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-gray-600">{range}</span>
                          <span className="text-xs font-black text-gray-900">{count}</span>
                        </div>
                        <div className="w-full bg-gray-50 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 group-hover:bg-opacity-80 ${range.includes('Above') ? 'bg-rose-500' : 'bg-blue-500'}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {Object.keys(delayRanges).length === 0 && (
                  <div className="text-center py-6 text-gray-300">
                    <p className="text-[10px] font-bold uppercase">No Data Available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* 2. Collection Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                Collection Analysis
              </h3>
              {onNavigateToReport && (
                <button onClick={() => onNavigateToReport('REP_COLLECTION_ANALYSIS')} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider transition-colors flex items-center gap-1">
                  View Report <i className="fa-solid fa-arrow-right"></i>
                </button>
              )}
            </div>

            <div
              onClick={() => onNavigateToReport?.('REP_COLLECTION_ANALYSIS')}
              className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-8 rounded-[32px] text-white premium-shadow active:scale-[0.98] transition-all cursor-pointer group relative overflow-hidden h-full"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full -ml-10 -mb-10 blur-2xl"></div>

              <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">{lastMonthLabel} Revenue</p>
                    <h2 className="text-5xl lg:text-6xl font-black tracking-tight">
                      {lastMonthAmount >= 100
                        ? `₹${(lastMonthAmount / 100).toFixed(2)}`
                        : `₹${lastMonthAmount.toFixed(2)}`}
                      <span className="text-2xl lg:text-3xl ml-1 opacity-80">{lastMonthAmount >= 100 ? 'Cr' : 'L'}</span>
                    </h2>
                  </div>
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <i className="fa-solid fa-indian-rupee-sign text-xl"></i>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/20 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Today's Txns</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black">{lastMonthCollections.length}</span>
                      <span className="text-[10px] opacity-60">Count</span>
                    </div>
                  </div>
                  <div className="bg-black/20 rounded-2xl p-4 backdrop-blur-sm border border-white/10 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Total Period</p>
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-2xl font-black">₹{(totalAmount / 100000).toFixed(2)}</span>
                      <span className="text-[10px] opacity-60">Lakh</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-8">
            {/* 3. Consumer Profile Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  Consumer Profile
                </h3>
                {onNavigateToReport && (
                  <button onClick={() => onNavigateToReport('REP_CONSUMERS_SUMMARY')} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider transition-colors flex items-center gap-1">
                    View Report <i className="fa-solid fa-arrow-right"></i>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div
                  onClick={() => onNavigateToReport?.('REP_CONSUMERS_SUMMARY')}
                  className="bg-white p-5 rounded-[28px] android-shadow border border-gray-100 active:scale-95 transition-all cursor-pointer group hover:border-blue-100 flex flex-col justify-between h-32"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                    <i className="fa-solid fa-users text-xs"></i>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">{totalConsumers.toLocaleString()}</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Total Consumers</p>
                  </div>
                </div>

                <div
                  onClick={() => onNavigateToReport?.('REP_CONSUMERS_SUMMARY')}
                  className="bg-white p-5 rounded-[28px] android-shadow border border-gray-100 active:scale-95 transition-all cursor-pointer group hover:border-orange-100 flex flex-col justify-between h-32"
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shadow-sm">
                    <i className="fa-solid fa-bolt text-xs"></i>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">{(totalLoad / 1000).toFixed(2)}</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Total Load (MW)</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. Docket Monitoring Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                  Docket Monitoring
                </h3>
                {onNavigateToReport && (
                  <button onClick={() => onNavigateToReport('REP_DOCKET_MONITORING')} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider transition-colors flex items-center gap-1">
                    View Report <i className="fa-solid fa-arrow-right"></i>
                  </button>
                )}
              </div>

              <div
                onClick={() => onNavigateToReport?.('REP_DOCKET_MONITORING')}
                className="bg-white p-6 rounded-[28px] android-shadow border border-gray-100 active:scale-[0.98] transition-all cursor-pointer group hover:border-indigo-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                      <i className="fa-solid fa-ticket text-xl"></i>
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-gray-900 leading-none">{totalDockets.toLocaleString()}</h2>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Open Complaints</p>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                    <i className="fa-solid fa-arrow-right text-sm"></i>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
