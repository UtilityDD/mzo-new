
import React, { useState, useEffect } from 'react';
import { User, UserRole, DocketData, HierarchyFilter, KPIData } from '../types';
import { fetchDocketData, calculateDocketKPIs } from '../services/dataService';

interface DocketReportProps {
    user: User;
}

const DocketReport: React.FC<DocketReportProps> = ({ user }) => {
    const [data, setData] = useState<DocketData[]>([]);
    const [kpis, setKpis] = useState<KPIData[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<HierarchyFilter>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const res = await fetchDocketData(user, filters);
            setData(res);
            setKpis(calculateDocketKPIs(res));
            setLoading(false);
        };
        load();
    }, [user, filters]);

    const getOfficeName = () => {
        const formatValue = (val: string) => val.replace(/^(Z-|R-|D-|CCC-)/i, '').trim();
        let displayName = user.office_name;

        if (!displayName) {
            displayName = user.ccc_code || user.division_code || user.region_code || user.zone_code || "Enterprise";
        }

        const cleanValue = formatValue(displayName);

        switch (user.role) {
            case UserRole.CCC: return `${cleanValue} CCC`;
            case UserRole.DIVISION: return `${cleanValue} Division`;
            case UserRole.REGION: return `${cleanValue} Region`;
            case UserRole.ZONE: return `${cleanValue} Zone`;
            default: return cleanValue;
        }
    };

    return (
        <div className="pb-24 flex flex-col h-full bg-gray-50 fade-in">
            {/* Header */}
            <div className="glass px-6 pt-10 pb-6 border-b border-gray-100 sticky top-0 z-30 premium-shadow">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-2">
                    Docket Monitoring
                </h1>
                <div className="flex items-center gap-2 text-blue-600">
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
                {/* Search */}
                <div className="relative group">
                    <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"></i>
                    <input
                        type="text"
                        placeholder="Search Docket No, Name, Consumer ID..."
                        className="w-full pl-11 pr-4 py-4 bg-white rounded-3xl border-none android-shadow focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                        onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                    />
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {loading && data.length === 0 ? (
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
                                    <h3 className="text-xl font-black text-gray-900">{kpi.value}</h3>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* List View */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Active Dockets</h4>
                        <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">{data.length} Total</span>
                    </div>

                    {loading && data.length === 0 ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="h-28 skeleton rounded-[32px]"></div>
                        ))
                    ) : data.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-[40px] android-shadow border border-gray-100 fade-in">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                <i className="fa-solid fa-ticket text-3xl"></i>
                            </div>
                            <h3 className="font-bold text-gray-900">No dockets found</h3>
                            <p className="text-xs text-gray-500">All caught up or try a different search.</p>
                        </div>
                    ) : (
                        data.slice(0, 50).map((row, idx) => (
                            <div
                                key={row.doc_no}
                                onClick={() => setExpandedId(expandedId === row.doc_no ? null : row.doc_no)}
                                className={`bg-white rounded-[32px] android-shadow border transition-all active:scale-[0.99] overflow-hidden group fade-in ${expandedId === row.doc_no ? 'border-blue-200 ring-4 ring-blue-50' : 'border-gray-100'}`}
                                style={{ animationDelay: `${idx * 0.03}s` }}
                            >
                                <div className="p-5 flex justify-between items-start">
                                    <div className="space-y-2 flex-1 pr-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-[9px] font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-blue-100">{row.doc_no}</span>
                                            <span className="text-[9px] font-extrabold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg uppercase border border-slate-200">{row.con_id}</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">{row.PARTY_NAME}</h3>
                                        <p className="text-xs text-gray-400 font-semibold flex items-center gap-1.5 line-clamp-1">
                                            <i className="fa-solid fa-location-dot text-[10px]"></i>
                                            {row.addr}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-[10px] font-black px-3 py-1.5 rounded-xl inline-block shadow-sm ${row.prob_type.toLowerCase().includes('fuse') ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                            row.prob_type.toLowerCase().includes('break') ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                'bg-blue-50 text-blue-600 border border-blue-100'
                                            }`}>
                                            {row.prob_type}
                                        </div>
                                        <p className="text-[9px] text-gray-400 mt-2 font-extrabold uppercase tracking-widest leading-none">{row.date}</p>
                                    </div>
                                </div>

                                {expandedId === row.doc_no && (
                                    <div className="px-6 pb-6 pt-2 border-t border-gray-50 bg-gray-50/50 space-y-6 animate-in fade-in slide-in-from-top-2">
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-5 pt-4">
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-extrabold tracking-widest mb-1.5 opacity-60">Mobile Number</p>
                                                <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                                    <i className="fa-solid fa-phone text-blue-600 text-[10px]"></i>
                                                    {row.Mob_No || 'N/A'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-extrabold tracking-widest mb-1.5 opacity-60">Created On</p>
                                                <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                                    <i className="fa-solid fa-calendar text-blue-600 text-[10px]"></i>
                                                    {row.doc_crn_dt}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                                            <p className="text-[9px] text-gray-400 uppercase font-extrabold mb-1.5 tracking-widest">Problem Description</p>
                                            <p className="text-xs text-gray-600 font-medium leading-relaxed italic">"{row.DESCRIPTION}"</p>
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <a href={`tel:${row.Mob_No}`} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-bold text-center active:scale-95 transition-all premium-shadow flex items-center justify-center gap-2">
                                                <i className="fa-solid fa-phone"></i> Call Party
                                            </a>
                                            <button className="flex-1 py-4 bg-white text-gray-700 rounded-2xl text-[11px] font-bold active:scale-95 transition-all border border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-2">
                                                <i className="fa-solid fa-check-to-slot"></i> Close Docket
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocketReport;
