
import React, { useState, useEffect } from 'react';
import { User, UserRole, CollectionData, HierarchyFilter, KPIData } from '../types';
import { fetchCollectionData, processCollectionAggregates } from '../services/dataService';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, Cell, Legend
} from 'recharts';
import { fetchOfficeMapping } from '../services/googleSheetsService';

interface CollectionReportProps {
    user: User;
}

const CollectionReport: React.FC<CollectionReportProps> = ({ user }) => {
    const [data, setData] = useState<CollectionData[]>([]);
    const [aggregates, setAggregates] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<HierarchyFilter>({});
    const [viewMode, setViewMode] = useState<'FY' | 'Monthly' | 'Weekly' | 'Daily'>('Monthly');
    const [reportView, setReportView] = useState<'summary' | 'list'>('summary');
    const [showFilterPage, setShowFilterPage] = useState(false);
    const [officeMap, setOfficeMap] = useState<Record<string, string>>({});

    useEffect(() => {
        const load = async () => {
            const [collectionRes, map] = await Promise.all([
                fetchCollectionData(user, filters),
                fetchOfficeMapping()
            ]);
            setData(collectionRes);
            setOfficeMap(map);
            setAggregates(processCollectionAggregates(collectionRes));
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
            {
                label: 'Total Collection',
                value: totalAmount >= 100
                    ? `₹${(totalAmount / 100).toFixed(2)} Cr`
                    : `₹${totalAmount.toFixed(2)} L`,
                trend: 0, icon: 'fa-vault', color: 'bg-emerald-600'
            },
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

    const resolveName = (code: string) => {
        const formatValue = (val: string) => val.replace(/^(Z-|R-|D-|CCC-)/i, '').trim();
        const rawName = officeMap[code] || code || '';
        return formatValue(String(rawName));
    };

    const getOfficeName = () => {
        const name = resolveName(user.ccc_code || user.division_code || user.region_code || user.zone_code || '');
        if (!name || name === '') return "Enterprise View";

        switch (user.role) {
            case UserRole.CCC: return `${name} CCC`;
            case UserRole.DIVISION: return `${name} Division`;
            case UserRole.REGION: return `${name} Region`;
            case UserRole.ZONE: return `${name} Zone`;
            default: return name;
        }
    };

    const getActiveFilterLabels = () => {
        const labels: string[] = [];
        if (filters.regionCodes?.length) labels.push(`${filters.regionCodes.map(c => resolveName(c)).join(', ')}`);
        if (filters.divisionCodes?.length) labels.push(`${filters.divisionCodes.map(c => resolveName(c)).join(', ')}`);
        if (filters.cccCodes?.length) labels.push(`${filters.cccCodes.map(c => resolveName(c)).join(', ')}`);
        if (filters.connStat?.length) labels.push(`${filters.connStat.join(', ')}`);
        if (filters.searchQuery) labels.push(`"${filters.searchQuery}"`);
        return labels.length > 0 ? labels.join(' • ') : null;
    };

    const CollectionTable = ({ title, data, total, color, icon, suffix = 'L' }: { title: string; data: any[]; total: number; color: string; icon: string; suffix?: string }) => (
        <div className="bg-white rounded-[32px] android-shadow border border-gray-100 overflow-hidden flex flex-col fade-in">
            <div className="px-6 py-5 bg-gray-50/50 border-b border-gray-100 flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl ${color.replace('bg-', 'bg-opacity-10 ')} ${color.replace('bg-', 'text-')} flex items-center justify-center`}>
                            <i className={`fa-solid ${icon} text-xs`}></i>
                        </div>
                        <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{title}</h4>
                    </div>
                </div>
                {getActiveFilterLabels() && (
                    <p className="text-[9px] text-gray-400 font-bold italic truncate ml-11 opacity-70">
                        Showing results for: {getActiveFilterLabels()}
                    </p>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50/30">
                            <th className="px-6 py-3 text-[9px] font-extrabold text-gray-400 uppercase tracking-tighter">Office</th>
                            <th className="px-6 py-3 text-[9px] font-extrabold text-gray-400 uppercase tracking-tighter text-right">Count</th>
                            <th className="px-6 py-3 text-[9px] font-extrabold text-gray-400 uppercase tracking-tighter text-right">Amount ({suffix})</th>
                            <th className="px-6 py-3 text-[9px] font-extrabold text-gray-400 uppercase tracking-tighter text-right">Share</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {data.map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-3.5">
                                    <p className="text-[11px] font-bold text-gray-700">{row.name}</p>
                                </td>
                                <td className="px-6 py-3.5 text-right">
                                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">{row.count}</span>
                                </td>
                                <td className="px-6 py-3.5 text-right">
                                    <p className="text-[11px] font-black text-gray-900">₹{row.amount.toLocaleString()}</p>
                                </td>
                                <td className="px-6 py-3.5 text-right">
                                    <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                        {total > 0 ? ((row.amount / total) * 100).toFixed(1) : 0}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                        <tr className="bg-gray-50/30 border-t-2 border-gray-100">
                            <td className="px-6 py-4">
                                <p className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Total</p>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <p className="text-[11px] font-black text-blue-600">{data.reduce((s, r) => s + r.count, 0).toLocaleString()}</p>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <p className="text-[11px] font-black text-emerald-600">₹{total.toLocaleString()}</p>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <span className="text-[10px] font-black text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-100">100%</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );

    const getUniqueValues = (field: keyof CollectionData) => {
        const values = new Set<string>();
        data.forEach(item => {
            const val = item[field];
            if (val) values.add(String(val));
        });
        return Array.from(values).sort();
    };

    const toggleFilter = (field: keyof HierarchyFilter, value: string) => {
        const current = (filters[field] as string[]) || [];
        const updated = current.includes(value)
            ? current.filter(v => v !== value)
            : [...current, value];
        setFilters({ ...filters, [field]: updated });
    };

    const getActiveFilterCount = () => {
        let count = 0;
        if (filters.searchQuery) count++;
        ['regionCodes', 'divisionCodes', 'cccCodes', 'connStat'].forEach(key => {
            const val = filters[key as keyof HierarchyFilter];
            if (Array.isArray(val)) count += val.length;
        });
        return count;
    };

    const FilterButton = ({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color: string }) => (
        <button
            onClick={onClick}
            className={`px-4 py-2.5 rounded-2xl text-[10px] font-bold transition-all border active:scale-95 ${active
                ? `${color} text-white border-transparent premium-shadow`
                : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                }`}
        >
            {label}
        </button>
    );

    const FilterPage = () => (
        <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto animate-in slide-in-from-bottom-5">
            <div className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-gray-100 px-6 py-6 flex justify-between items-center z-10">
                <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Collection Filters</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Refine analysis parameters</p>
                </div>
                <button onClick={() => setShowFilterPage(false)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:scale-90 transition-all">
                    <i className="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>
            <div className="p-6 space-y-8 max-w-lg mx-auto md:max-w-3xl">
                {/* Administrative Filters */}
                <div className="grid grid-cols-1 gap-8">
                    {/* Region */}
                    {(user.role === UserRole.ZONE || user.role === undefined) && (
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Region</label>
                            <div className="flex flex-wrap gap-2">
                                {getUniqueValues('region_code').map(code => (
                                    <FilterButton
                                        key={code}
                                        label={resolveName(code)}
                                        active={filters.regionCodes?.includes(code) || false}
                                        onClick={() => toggleFilter('regionCodes', code)}
                                        color="bg-emerald-600"
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Division */}
                    {(user.role === UserRole.ZONE || user.role === UserRole.REGION || user.role === undefined) && (
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Division</label>
                            <div className="flex flex-wrap gap-2">
                                {getUniqueValues('division_code').map(code => (
                                    <FilterButton
                                        key={code}
                                        label={resolveName(code)}
                                        active={filters.divisionCodes?.includes(code) || false}
                                        onClick={() => toggleFilter('divisionCodes', code)}
                                        color="bg-emerald-600"
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* CCC */}
                    {(user.role !== UserRole.CCC) && (
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">CCC</label>
                            <div className="flex flex-wrap gap-2">
                                {getUniqueValues('ccc_code').map(code => (
                                    <FilterButton
                                        key={code}
                                        label={resolveName(code)}
                                        active={filters.cccCodes?.includes(code) || false}
                                        onClick={() => toggleFilter('cccCodes', code)}
                                        color="bg-emerald-600"
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Mode */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Payment Mode</label>
                        <div className="flex flex-wrap gap-2">
                            {getUniqueValues('MODE').map(mode => (
                                <FilterButton
                                    key={mode}
                                    label={mode}
                                    active={filters.connStat?.includes(mode) || false}
                                    onClick={() => toggleFilter('connStat', mode)}
                                    color="bg-emerald-600"
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Global Search</label>
                    <div className="relative group">
                        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors"></i>
                        <input
                            type="text"
                            value={filters.searchQuery || ''}
                            placeholder="Search by CCC, Mode, Date..."
                            className="w-full pl-11 pr-4 py-4 bg-white rounded-3xl border-none android-shadow focus:ring-2 focus:ring-emerald-500 transition-all text-sm font-bold text-gray-700"
                            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                        />
                    </div>
                </div>

                <div className="pt-10 flex gap-4 pb-20">
                    <button onClick={() => { setFilters({}); setShowFilterPage(false); }} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-3xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all">
                        Clear All
                    </button>
                    <button onClick={() => setShowFilterPage(false)} className="flex-1 py-4 bg-emerald-600 text-white premium-shadow rounded-3xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2">
                        <span>Show Results ({data.length})</span>
                        <i className="fa-solid fa-chevron-right text-[10px] opacity-70"></i>
                    </button>
                </div>
            </div>
        </div>
    );

    const hierarchicalAggregates = React.useMemo(() => {
        const compute = (officeField: keyof CollectionData) => {
            const mapped = data.reduce((acc: any, row) => {
                const code = String(row[officeField] || 'N/A');
                const name = resolveName(code);
                if (!acc[name]) acc[name] = { count: 0, amount: 0 };
                acc[name].count += row.COUNT;
                acc[name].amount += row.AMOUNT_PAID;
                return acc;
            }, {});

            const total = Object.values(mapped).reduce((s: any, r: any) => s + r.amount, 0) as number;
            return {
                data: Object.entries(mapped)
                    .map(([name, stats]: [string, any]) => ({ name, ...stats }))
                    .sort((a, b) => b.amount - a.amount),
                total
            };
        };

        return {
            region: compute('region_code'),
            division: compute('division_code'),
            ccc: compute('ccc_code')
        };
    }, [data, officeMap]);

    const kpis = getKPIs();
    const currentChartData = getChartData();

    return (
        <div className="pb-32 flex flex-col h-full bg-gray-50 fade-in">
            {/* Header */}
            <div className="glass px-6 pt-10 pb-6 border-b border-gray-100 sticky top-0 z-30 premium-shadow">
                <div className="flex justify-between items-start">
                    <div>
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
                    <button
                        onClick={() => setShowFilterPage(true)}
                        className="relative w-12 h-12 rounded-2xl bg-white border border-gray-100 android-shadow flex items-center justify-center text-gray-400 hover:text-emerald-600 transition-all active:scale-90"
                    >
                        <i className="fa-solid fa-sliders text-lg"></i>
                        {getActiveFilterCount() > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-white ring-2 ring-emerald-50">
                                {getActiveFilterCount()}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {showFilterPage && <FilterPage />}

            {/* View Switcher */}
            <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-100">
                <button
                    onClick={() => setReportView('summary')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${reportView === 'summary' ? 'bg-white text-emerald-600 shadow-md scale-[1.02]' : 'text-gray-400'}`}
                >
                    <i className="fa-solid fa-chart-line opacity-50"></i>
                    Summary
                </button>
                <button
                    onClick={() => setReportView('list')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${reportView === 'list' ? 'bg-white text-emerald-600 shadow-md scale-[1.02]' : 'text-gray-400'}`}
                >
                    <i className="fa-solid fa-list opacity-50"></i>
                    Transactions
                </button>
            </div>

            {reportView === 'summary' ? (
                <div className="space-y-8 fade-in">
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

                    {/* Hierarchical Tables */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {(user.role === UserRole.ZONE || user.role === undefined) && (
                            <CollectionTable
                                title="Region Breakdown"
                                icon="fa-map-location-dot"
                                {...hierarchicalAggregates.region}
                                color="bg-indigo-600"
                            />
                        )}
                        {(user.role === UserRole.ZONE || user.role === UserRole.REGION || user.role === undefined) && (
                            <CollectionTable
                                title="Division Breakdown"
                                icon="fa-building-shield"
                                {...hierarchicalAggregates.division}
                                color="bg-blue-600"
                            />
                        )}
                        <CollectionTable
                            title="CCC Breakdown"
                            icon="fa-house-signal"
                            {...hierarchicalAggregates.ccc}
                            color="bg-emerald-600"
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-4 fade-in">
                    <div className="flex justify-between items-center px-2">
                        <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Detailed Transaction Logs</h4>
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">{data.length} Results</span>
                    </div>
                    {loading ? (
                        [1, 2, 3].map(i => <div key={i} className="h-24 skeleton rounded-[32px]"></div>)
                    ) : data.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-[40px] border border-gray-100 italic text-gray-400 text-sm android-shadow">
                            No transactions found for the current selection.
                        </div>
                    ) : (
                        data.slice(0, 50).map((row, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-[32px] android-shadow border border-gray-100 flex justify-between items-center fade-in" style={{ animationDelay: `${idx * 0.02}s` }}>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg border border-emerald-100 uppercase">{row.MODE}</span>
                                        <span className="text-[10px] font-bold text-gray-400">{row.PAYMENT_DT}</span>
                                    </div>
                                    <p className="text-xs font-bold text-gray-700 tracking-tight uppercase">{resolveName(row.ccc_code)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-gray-900">₹{row.AMOUNT_PAID.toLocaleString()} L</p>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase">{row.COUNT} Collections</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default CollectionReport;
