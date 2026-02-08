
import React, { useState, useEffect } from 'react';
import { User, UserRole, CollectionData, HierarchyFilter, KPIData } from '../types';
import { fetchCollectionData, processCollectionAggregates } from '../services/dataService';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, Cell, Legend
} from 'recharts';

interface CollectionReportProps {
    user: User;
}

const CollectionReport: React.FC<CollectionReportProps> = ({ user }) => {
    const [data, setData] = useState<CollectionData[]>([]);
    const [aggregates, setAggregates] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<HierarchyFilter>({});
    const [viewMode, setViewMode] = useState<'FY' | 'Monthly' | 'Weekly' | 'Daily'>('Monthly');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const res = await fetchCollectionData(user, filters);
            setData(res);
            setAggregates(processCollectionAggregates(res));
            setLoading(false);
        };
        load();
    }, [user, filters]);

    const getKPIs = (): KPIData[] => {
        if (!data.length) return [];
        const totalAmount = data.reduce((s, r) => s + r.AMOUNT_PAID, 0);
        const totalCount = data.reduce((s, r) => s + r.COUNT, 0);
        const avgAmount = totalCount > 0 ? totalAmount / totalCount : 0;

        // Group by mode
        const modes = data.reduce((acc: any, curr) => {
            acc[curr.MODE] = (acc[curr.MODE] || 0) + curr.AMOUNT_PAID;
            return acc;
        }, {});
        const topMode = Object.entries(modes).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'N/A';

        return [
            { label: 'Total Collection', value: `₹${(totalAmount / 100000).toFixed(2)}L`, trend: 0, icon: 'fa-vault', color: 'bg-emerald-600' },
            { label: 'Total Count', value: totalCount.toLocaleString(), trend: 0, icon: 'fa-receipt', color: 'bg-blue-600' },
            { label: 'Avg / Trans', value: `₹${avgAmount.toFixed(0)}`, trend: 0, icon: 'fa-calculator', color: 'bg-indigo-600' },
            { label: 'Preferred Mode', value: topMode, trend: 0, icon: 'fa-credit-card', color: 'bg-purple-600' }
        ];
    };

    const getChartData = () => {
        if (!aggregates) return [];
        switch (viewMode) {
            case 'FY': return aggregates.fyCount;
            case 'Monthly': return aggregates.monthlyCount;
            case 'Weekly': return aggregates.weeklyCount;
            case 'Daily': return aggregates.dailyCount;
            default: return [];
        }
    };

    const getOfficeName = () => {
        const formatValue = (val: string) => val.replace(/^(Z-|R-|D-|CCC-)/i, '').trim();
        let displayName = user.office_name || "Enterprise";
        const cleanValue = formatValue(displayName);

        switch (user.role) {
            case UserRole.CCC: return `${cleanValue} CCC`;
            case UserRole.DIVISION: return `${cleanValue} Division`;
            case UserRole.REGION: return `${cleanValue} Region`;
            case UserRole.ZONE: return `${cleanValue} Zone`;
            default: return cleanValue;
        }
    };

    const kpis = getKPIs();
    const currentChartData = getChartData();

    return (
        <div className="pb-24 flex flex-col h-full bg-gray-50 fade-in">
            {/* Header */}
            <div className="glass px-6 pt-10 pb-6 border-b border-gray-100 sticky top-0 z-30 premium-shadow">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-2">
                    Collection Analysis
                </h1>
                <div className="flex items-center gap-2 text-emerald-600">
                    <i className="fa-solid fa-location-dot text-[10px]"></i>
                    <span className="text-xs font-bold uppercase tracking-wider">{getOfficeName()}</span>
                    {data.length > 0 && data[0].date && (
                        <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200 ml-1">
                            Updated: {data[0].date}
                        </span>
                    )}
                </div>
            </div>

            <div className="px-4 pt-6 space-y-6 max-w-lg mx-auto md:max-w-4xl w-full">

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {loading ? (
                        [1, 2, 3, 4].map(idx => (
                            <div key={idx} className="h-32 skeleton rounded-[32px]"></div>
                        ))
                    ) : (
                        kpis.map((kpi, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-[32px] android-shadow border border-gray-100 flex flex-col justify-between h-36 scale-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                                <div className={`w-10 h-10 rounded-2xl ${kpi.color} text-white flex items-center justify-center mb-3 shadow-sm`}>
                                    <i className={`fa-solid ${kpi.icon} text-sm`}></i>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{kpi.label}</p>
                                    <h3 className="text-xl font-black text-gray-900 tracking-tight">{kpi.value}</h3>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Chart Section */}
                <div className="bg-white p-6 rounded-[40px] android-shadow border border-gray-100 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Revenue Realization</h4>

                        <div className="flex bg-gray-100 p-1 rounded-2xl self-start">
                            {(['FY', 'Monthly', 'Weekly', 'Daily'] as const).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all ${viewMode === mode ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-72 w-full">
                        {loading ? (
                            <div className="h-full w-full skeleton rounded-3xl"></div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                {viewMode === 'Daily' ? (
                                    <LineChart data={currentChartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis dataKey="key" hide />
                                        <YAxis hide />
                                        <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                                        <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={4} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
                                    </LineChart>
                                ) : (
                                    <BarChart data={currentChartData}>
                                        <defs>
                                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                                <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis
                                            dataKey="key"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 9, fill: '#9ca3af', fontWeight: 700 }}
                                            tickFormatter={(v) => v.replace(/^\d{4}-/, '')}
                                        />
                                        <YAxis hide />
                                        <Tooltip
                                            cursor={{ fill: '#f9fafb' }}
                                            contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                                        />
                                        <Bar dataKey="amount" fill="url(#barGradient)" radius={[10, 10, 0, 0]} />
                                    </BarChart>
                                )}
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Amount Realized</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-400 opacity-40"></div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Avg Target</span>
                        </div>
                    </div>
                </div>

                {/* Data List */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest px-2">Detailed Transaction Logs</h4>
                    {loading ? (
                        [1, 2, 3].map(i => <div key={i} className="h-24 skeleton rounded-[32px]"></div>)
                    ) : data.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-[40px] border border-gray-100 italic text-gray-400 text-sm android-shadow">
                            Waiting for data streams...
                        </div>
                    ) : (
                        data.slice(0, 30).map((row, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-[32px] android-shadow border border-gray-100 flex justify-between items-center fade-in" style={{ animationDelay: `${idx * 0.02}s` }}>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg border border-emerald-100 uppercase">{row.MODE}</span>
                                        <span className="text-[9px] font-bold text-gray-400">{row.PAYMENT_DT}</span>
                                    </div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-tight">CCC Code: {row.ccc_code}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-gray-900">₹{row.AMOUNT_PAID.toLocaleString()}</p>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase">{row.COUNT} Collections</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default CollectionReport;
