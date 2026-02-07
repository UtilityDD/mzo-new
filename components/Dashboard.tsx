
import React, { useState, useEffect } from 'react';
import { User, ReportData, HierarchyFilter, KPIData, DocketData } from '../types';
import { fetchFilteredData, calculateKPIs, fetchDocketData } from '../services/dataService';
import { getReportInsights } from '../services/geminiService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area
} from 'recharts';
import FilterPanel from './FilterPanel';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [data, setData] = useState<ReportData[]>([]);
  const [dockets, setDockets] = useState<number>(0);
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<HierarchyFilter>({});

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [filtered, docketList] = await Promise.all([
          fetchFilteredData(user, activeFilters),
          fetchDocketData(user, activeFilters)
        ]);

        setData(filtered);
        setDockets(docketList.length);

        const baseKpis = calculateKPIs(filtered);
        // Add Docket KPI
        baseKpis.push({
          label: 'Open Dockets',
          value: docketList.length.toLocaleString(),
          trend: 0,
          icon: 'fa-ticket-simple',
          color: 'bg-indigo-600'
        });
        setKpis(baseKpis);

        // Fetch AI Insights with extra context
        const summary = await getReportInsights(filtered, user, docketList);
        setInsights(summary);
      } catch (error) {
        console.error("Dashboard Load Error:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user, activeFilters]);

  const chartData = data.reduce((acc: any[], item) => {
    const existing = acc.find(a => a.date === item.date);
    if (existing) {
      existing.revenue += item.revenue;
      existing.orders += item.orders;
    } else {
      acc.push({ date: item.date, revenue: item.revenue, orders: item.orders });
    }
    return acc;
  }, []).sort((a, b) => a.date.localeCompare(b.date)).slice(-7);

  if (loading && data.length === 0) {
    return (
      <div className="pb-24 pt-4 px-4 space-y-6 max-w-lg mx-auto md:max-w-4xl">
        <div className="h-8 w-48 skeleton rounded-lg"></div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="min-w-[160px] h-32 skeleton rounded-2xl flex-1"></div>
          ))}
        </div>
        <div className="h-64 w-full skeleton rounded-3xl"></div>
        <div className="h-48 w-full skeleton rounded-3xl"></div>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 px-4 space-y-6 max-w-lg mx-auto md:max-w-4xl fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Executive Summary</h1>
          <p className="text-sm text-gray-500 uppercase font-semibold tracking-wider">
            {user.role}: {user.full_name}
          </p>
        </div>
        <button
          onClick={() => setIsFilterOpen(true)}
          className="w-10 h-10 rounded-full bg-white android-shadow flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <i className="fa-solid fa-sliders"></i>
        </button>
      </div>

      {/* AI Insights Card */}
      {insights && (
        <div className="bg-gradient-to-br from-indigo-600 to-blue-600 p-6 rounded-[32px] text-white premium-shadow fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
              <i className="fa-solid fa-sparkles text-xs"></i>
            </div>
            <h4 className="font-extrabold text-sm uppercase tracking-widest">AI Intelligence</h4>
          </div>
          <div className="text-sm font-medium leading-relaxed opacity-90 whitespace-pre-line">
            {insights}
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-60">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
            Real-time Analysis Complete
          </div>
        </div>
      )}

      {/* KPI Scroll View (Mobile Optimized) */}
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory hide-scrollbar">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="min-w-[160px] flex-1 snap-start bg-white p-4 rounded-2xl android-shadow border border-gray-100 flex flex-col justify-between">
            <div className={`w-10 h-10 rounded-xl ${kpi.color} text-white flex items-center justify-center mb-4`}>
              <i className={`fa-solid ${kpi.icon}`}></i>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
              <h3 className="text-lg font-bold text-gray-900">{kpi.value}</h3>
              <p className={`text-[10px] mt-1 font-bold ${kpi.trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {kpi.trend >= 0 ? '+' : ''}{kpi.trend}% vs prev
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="space-y-4">
        <div className="bg-white p-5 rounded-3xl android-shadow border border-gray-100">
          <h4 className="font-bold text-gray-800 mb-6 flex items-center justify-between">
            Revenue Trend (Last 7 Days)
            <span className="text-[10px] font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Daily Refresh</span>
          </h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickFormatter={(val) => val.split('-').slice(1).join('/')}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl android-shadow border border-gray-100">
          <h4 className="font-bold text-gray-800 mb-6">Order Volume</h4>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickFormatter={(val) => val.split('-').slice(1).join('/')}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="orders" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        user={user}
        onFilterChange={setActiveFilters}
      />
    </div>
  );
};

export default Dashboard;
