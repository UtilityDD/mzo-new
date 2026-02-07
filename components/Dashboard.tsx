
import React, { useState, useEffect } from 'react';
import { User, ReportData, HierarchyFilter, KPIData } from '../types';
import { fetchFilteredData, calculateKPIs } from '../services/dataService';
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
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<HierarchyFilter>({});

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const filtered = await fetchFilteredData(user, activeFilters);
      setData(filtered);
      setKpis(calculateKPIs(filtered));
      setLoading(false);
      
      // calculateKPIs
      setKpis(calculateKPIs(filtered));
      setLoading(false);
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

  return (
    <div className="pb-24 pt-4 px-4 space-y-6 max-w-lg mx-auto md:max-w-4xl">
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
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
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
