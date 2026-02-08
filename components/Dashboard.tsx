
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
    <div className="pb-24 pt-4 px-4 space-y-6 max-w-lg mx-auto md:max-w-4xl fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 uppercase font-semibold tracking-wider">
            {user.office_name || user.full_name}
          </p>
        </div>
      </div>

      {/* Pending NSC Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Pending NSC</h3>
          {onNavigateToReport && (
            <button
              onClick={() => onNavigateToReport('REP_PENDING_NSC')}
              className="text-[10px] font-bold text-blue-600 uppercase tracking-wider"
            >
              View All →
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div
            onClick={() => onNavigateToReport?.('REP_PENDING_NSC')}
            className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-2xl text-white premium-shadow active:scale-95 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-2">
              <i className="fa-solid fa-clock text-lg"></i>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-90">Total Pending</p>
            </div>
            <h2 className="text-3xl font-black">{totalPending.toLocaleString()}</h2>
            <p className="text-[10px] mt-1 opacity-75">Applications</p>
          </div>

          <div
            onClick={() => onNavigateToReport?.('REP_PENDING_NSC')}
            className="bg-gradient-to-br from-rose-500 to-rose-600 p-5 rounded-2xl text-white premium-shadow active:scale-95 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-2">
              <i className="fa-solid fa-triangle-exclamation text-lg"></i>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-90">Critical</p>
            </div>
            <h2 className="text-3xl font-black">{criticalDelays.toLocaleString()}</h2>
            <p className="text-[10px] mt-1 opacity-75">&gt; 7 Days (Non-Pole)</p>
          </div>
        </div>

        {/* Delay Range Breakdown */}
        <div className="bg-white p-4 rounded-2xl android-shadow border border-gray-100">
          <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-3">Delay Breakdown</h4>
          <div className="space-y-2">
            {Object.entries(delayRanges).sort((a, b) => {
              // Find DelaySerial for each range from the data
              const aSerial = nscData.find(d => d.DelayRange === a[0])?.DelaySerial || 0;
              const bSerial = nscData.find(d => d.DelayRange === b[0])?.DelaySerial || 0;
              return bSerial - aSerial; // Descending order (8 to 1)
            }).map(([range, count]) => {
              const percentage = totalPending > 0 ? ((count / totalPending) * 100).toFixed(1) : '0';
              return (
                <div key={range} className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 font-medium">{range}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-medium">{percentage}%</span>
                    <span className="text-xs font-bold text-gray-900">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dockets & Collections Row */}
      <div className="grid grid-cols-2 gap-3">
        <div
          onClick={() => onNavigateToReport?.('REP_DOCKET_MONITORING')}
          className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-5 rounded-2xl text-white premium-shadow active:scale-95 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2 mb-2">
            <i className="fa-solid fa-ticket text-lg"></i>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-90">Open Dockets</p>
          </div>
          <h2 className="text-3xl font-black">{totalDockets.toLocaleString()}</h2>
          <p className="text-[10px] mt-1 opacity-75">Active Issues</p>
        </div>

        <div
          onClick={() => onNavigateToReport?.('REP_COLLECTION_ANALYSIS')}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-2xl text-white premium-shadow active:scale-95 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2 mb-2">
            <i className="fa-solid fa-indian-rupee-sign text-lg"></i>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-90">{lastMonthLabel} Collection</p>
          </div>
          <h2 className="text-2xl font-black">
            {lastMonthAmount >= 100
              ? `₹${(lastMonthAmount / 100).toFixed(2)} Cr`
              : `₹${lastMonthAmount.toFixed(2)} L`}
          </h2>
          <p className="text-[10px] mt-1 opacity-75">{lastMonthCollections.length} Transactions</p>
        </div>
      </div>

      {/* Consumer Base Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Consumer Base</h3>
          {onNavigateToReport && (
            <button
              onClick={() => onNavigateToReport('REP_CONSUMERS_SUMMARY')}
              className="text-[10px] font-bold text-blue-600 uppercase tracking-wider"
            >
              View Details →
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div
            onClick={() => onNavigateToReport?.('REP_CONSUMERS_SUMMARY')}
            className="bg-white p-5 rounded-2xl android-shadow border border-gray-100 active:scale-95 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <i className="fa-solid fa-users text-sm"></i>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Consumers</p>
            </div>
            <h2 className="text-2xl font-black text-gray-900">{totalConsumers.toLocaleString()}</h2>
          </div>

          <div
            onClick={() => onNavigateToReport?.('REP_CONSUMERS_SUMMARY')}
            className="bg-white p-5 rounded-2xl android-shadow border border-gray-100 active:scale-95 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                <i className="fa-solid fa-bolt text-sm"></i>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Load</p>
            </div>
            <h2 className="text-2xl font-black text-gray-900">{(totalLoad / 1000).toFixed(2)}</h2>
            <p className="text-[10px] text-gray-500 mt-1">MW</p>
            <p className="text-[9px] text-gray-400 mt-1">
              {totalConsumers > 0 ? (totalLoad / totalConsumers).toFixed(2) : '0'} KW/Consumer
            </p>
          </div>
        </div>
      </div>

      {/* Collection Summary */}
      <div className="bg-white p-5 rounded-3xl android-shadow border border-gray-100">
        <h4 className="font-bold text-gray-800 mb-4 flex items-center justify-between">
          Collection Summary
          <span className="text-[10px] font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Total Period</span>
        </h4>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Collected</p>
            <h3 className="text-2xl font-black text-gray-900">₹{(totalAmount / 100000).toFixed(2)}L</h3>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 font-medium">Transactions</p>
            <h3 className="text-2xl font-black text-gray-900">{collectionData.length.toLocaleString()}</h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
