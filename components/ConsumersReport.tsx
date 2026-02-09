import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, ConsumerData, KPIData, HierarchyFilter } from '../types';
import { fetchConsumerData, calculateConsumerKPIs } from '../services/dataService';
import { fetchOfficeMapping } from '../services/googleSheetsService';

interface ConsumersReportProps {
   user: User;
}

const DataTable: React.FC<{
   title: string;
   data: { name: string; count: number; share: string }[];
   total: number;
   color: string;
}> = ({ title, data, total, color }) => (
   <div className="bg-white rounded-[32px] android-shadow border border-gray-100 overflow-hidden flex flex-col scale-up">
      <div className="px-6 py-5 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
         <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</h4>
         <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full text-white ${color}`}>
            {data.length} Items
         </span>
      </div>
      <div className="overflow-x-auto">
         <table className="w-full text-left">
            <thead>
               <tr className="border-b border-gray-50">
                  <th className="px-6 py-3 text-[9px] font-extrabold text-gray-400 uppercase tracking-tighter">Value</th>
                  <th className="px-6 py-3 text-[9px] font-extrabold text-gray-400 uppercase tracking-tighter text-right">Count</th>
                  <th className="px-6 py-3 text-[9px] font-extrabold text-gray-400 uppercase tracking-tighter text-right">Share</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
               {data.length > 0 ? (
                  <>
                     {data.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                           <td className="px-6 py-3.5">
                              <p className="text-[11px] font-bold text-gray-700">{row.name}</p>
                           </td>
                           <td className="px-6 py-3.5 text-right">
                              <p className="text-[11px] font-black text-gray-900">{row.count.toLocaleString()}</p>
                           </td>
                           <td className="px-6 py-3.5 text-right">
                              <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                 {row.share}%
                              </span>
                           </td>
                        </tr>
                     ))}
                     <tr className="bg-gray-50/30 border-t-2 border-gray-100">
                        <td className="px-6 py-4">
                           <p className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Total</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <p className="text-[11px] font-black text-blue-600">{total.toLocaleString()}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <span className="text-[10px] font-black text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-100">100%</span>
                        </td>
                     </tr>
                  </>
               ) : (
                  <tr>
                     <td colSpan={3} className="px-6 py-10 text-center text-[10px] font-bold text-gray-300 uppercase">No Data Available</td>
                  </tr>
               )}
            </tbody>
         </table>
      </div>
   </div>
);

const ConsumersReport: React.FC<ConsumersReportProps> = ({ user }) => {
   const [data, setData] = useState<ConsumerData[]>([]);
   const [allPossibleData, setAllPossibleData] = useState<ConsumerData[]>([]);
   const [kpis, setKpis] = useState<KPIData[]>([]);
   const [loading, setLoading] = useState(true);
   const [filters, setFilters] = useState<HierarchyFilter>({});
   const [officeMap, setOfficeMap] = useState<Record<string, string>>({});
   const [showFilterPage, setShowFilterPage] = useState(false);

   useEffect(() => {
      const loadOptions = async () => {
         const res = await fetchConsumerData(user, {});
         setAllPossibleData(res);
      };
      loadOptions();
   }, [user]);

   useEffect(() => {
      const load = async () => {
         setLoading(true);
         const [mapping, res] = await Promise.all([
            fetchOfficeMapping(),
            fetchConsumerData(user, filters)
         ]);
         setOfficeMap(mapping);
         setData(res);
         setKpis(calculateConsumerKPIs(res));
         setLoading(false);
      };
      load();
   }, [user, filters]);

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

   const getUniqueValues = (key: keyof ConsumerData) => {
      const unique = new Map<string, string>();
      allPossibleData.forEach(item => {
         const raw = String(item[key] || 'Unknown');
         let label = raw;
         if (key.toString().includes('_code') && raw !== 'Unknown') {
            label = resolveName(raw);
         }
         if (raw !== '') unique.set(raw, label);
      });
      return Array.from(unique.entries()).map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
   };

   const toggleFilter = (key: keyof HierarchyFilter, value: string) => {
      setFilters(prev => {
         const current = (prev[key] as string[]) || [];
         const updated = current.includes(value)
            ? current.filter(v => v !== value)
            : [...current, value];
         return { ...prev, [key]: updated };
      });
   };

   const FilterButton = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
      <button
         onClick={onClick}
         className={`px-4 py-3 rounded-2xl text-[10px] font-bold transition-all border ${active ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-95' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'}`}
      >
         {label}
      </button>
   );

   const FilterPage = () => (
      <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto animate-in slide-in-from-bottom-5">
         <div className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-gray-100 px-6 py-6 flex justify-between items-center z-10">
            <div>
               <h2 className="text-xl font-black text-gray-900 tracking-tight">Report Filters</h2>
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Refine your data view</p>
            </div>
            <button
               onClick={() => setShowFilterPage(false)}
               className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:scale-90 transition-all"
            >
               <i className="fa-solid fa-xmark text-lg"></i>
            </button>
         </div>

         <div className="p-6 space-y-8 max-w-lg mx-auto md:max-w-3xl">
            {/* Search Section */}
            <div className="space-y-3">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Global Search</label>
               <div className="relative group">
                  <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"></i>
                  <input
                     type="text"
                     value={filters.searchQuery || ''}
                     placeholder="Search by code, name, category..."
                     className="w-full pl-11 pr-4 py-4 bg-white rounded-3xl border-none android-shadow focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold text-gray-700"
                     onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                  />
               </div>
            </div>

            {/* Hierarchy Section */}
            <div className="space-y-4">
               <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Administrative Levels</h3>

               <div className="space-y-3">
                  <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest px-1">Regions</label>
                  <div className="flex flex-wrap gap-2">
                     {getUniqueValues('region_code').map(item => (
                        <FilterButton
                           key={item.value}
                           label={item.label}
                           active={filters.regionCodes?.includes(item.value) || false}
                           onClick={() => toggleFilter('regionCodes', item.value)}
                        />
                     ))}
                  </div>
               </div>

               <div className="space-y-3">
                  <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest px-1">Divisions</label>
                  <div className="flex flex-wrap gap-2">
                     {getUniqueValues('division_code').map(item => (
                        <FilterButton
                           key={item.value}
                           label={item.label}
                           active={filters.divisionCodes?.includes(item.value) || false}
                           onClick={() => toggleFilter('divisionCodes', item.value)}
                        />
                     ))}
                  </div>
               </div>

               <div className="space-y-3">
                  <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest px-1">CCCs</label>
                  <div className="flex flex-wrap gap-2">
                     {getUniqueValues('ccc_code').map(item => (
                        <FilterButton
                           key={item.value}
                           label={item.label}
                           active={filters.cccCodes?.includes(item.value) || false}
                           onClick={() => toggleFilter('cccCodes', item.value)}
                        />
                     ))}
                  </div>
               </div>
            </div>

            {/* Technical Categories */}
            <div className="space-y-6">
               <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Technical Specs</h3>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                     <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest px-1">Connection Status</label>
                     <div className="flex flex-wrap gap-2">
                        {getUniqueValues('CONN_STAT').map(item => (
                           <FilterButton key={item.value} label={item.label} active={filters.connStat?.includes(item.value) || false} onClick={() => toggleFilter('connStat', item.value)} />
                        ))}
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest px-1">Base Class</label>
                     <div className="flex flex-wrap gap-2">
                        {getUniqueValues('BASE_CLASS').map(item => (
                           <FilterButton key={item.value} label={item.label} active={filters.baseClass?.includes(item.value) || false} onClick={() => toggleFilter('baseClass', item.value)} />
                        ))}
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest px-1">Category</label>
                     <div className="flex flex-wrap gap-2">
                        {getUniqueValues('CATEGORY').map(item => (
                           <FilterButton key={item.value} label={item.label} active={filters.category?.includes(item.value) || false} onClick={() => toggleFilter('category', item.value)} />
                        ))}
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest px-1">Meter Type</label>
                     <div className="flex flex-wrap gap-2">
                        {getUniqueValues('TYPE_OF_METER').map(item => (
                           <FilterButton key={item.value} label={item.label} active={filters.meterType?.includes(item.value) || false} onClick={() => toggleFilter('meterType', item.value)} />
                        ))}
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest px-1">Connection Phase</label>
                     <div className="flex flex-wrap gap-2">
                        {getUniqueValues('CONN_PHASE').map(item => (
                           <FilterButton key={item.value} label={item.label} active={filters.connPhase?.includes(item.value) || false} onClick={() => toggleFilter('connPhase', item.value)} />
                        ))}
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest px-1">Govt. Status</label>
                     <div className="flex flex-wrap gap-2">
                        {getUniqueValues('GOVT_STAT').map(item => (
                           <FilterButton key={item.value} label={item.label} active={filters.govtStat?.includes(item.value) || false} onClick={() => toggleFilter('govtStat', item.value)} />
                        ))}
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest px-1">Connection Source</label>
                     <div className="flex flex-wrap gap-2">
                        {getUniqueValues('CONN_BY').map(item => (
                           <FilterButton key={item.value} label={item.label} active={filters.connBy?.includes(item.value) || false} onClick={() => toggleFilter('connBy', item.value)} />
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-10 flex gap-4 pb-20">
               <button
                  onClick={() => { setFilters({}); setShowFilterPage(false); }}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-3xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
               >
                  Clear All
               </button>
               <button
                  onClick={() => setShowFilterPage(false)}
                  className="flex-1 py-4 bg-blue-600 text-white premium-shadow rounded-3xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
               >
                  <span>Show Results ({data.length})</span>
                  <i className="fa-solid fa-chevron-right text-[10px] opacity-70"></i>
               </button>
            </div>
         </div>
      </div>
   );

   const aggregate = useMemo(() => {
      const compute = (field: keyof ConsumerData, nameField?: keyof ConsumerData) => {
         const aggregated = data.reduce((acc: any, row) => {
            let val = nameField && row[nameField] ? String(row[nameField]) : String(row[field] || 'Unknown');

            // If we only have a code and it's recognized as a hierarchy code, try to resolve it
            if (!nameField && val !== 'Unknown' && field.toString().includes('_code')) {
               val = resolveName(val);
            }

            acc[val] = (acc[val] || 0) + row.COUNT;
            return acc;
         }, {});

         const total = Object.values(aggregated).reduce((a: any, b: any) => a + b, 0) as number;
         const sortedData = Object.entries(aggregated)
            .map(([name, count]) => ({
               name: name === 'undefined' ? 'Unknown' : name,
               count: count as number,
               share: total > 0 ? ((count as number / total) * 100).toFixed(1) : '0'
            }))
            .sort((a, b) => b.count - a.count);

         return { data: sortedData, total };
      };

      return {
         admin: [
            { title: 'Region Distribution', ...compute('region_code', 'region_name'), color: 'bg-indigo-600' },
            { title: 'Division Distribution', ...compute('division_code', 'division_name'), color: 'bg-blue-600' },
            { title: 'CCC Distribution', ...compute('ccc_code', 'ccc_name'), color: 'bg-emerald-600' },
         ],
         tech: [
            { title: 'Connection Status', ...compute('CONN_STAT'), color: 'bg-emerald-500' },
            { title: 'Base Class', ...compute('BASE_CLASS'), color: 'bg-blue-500' },
            { title: 'Category', ...compute('CATEGORY'), color: 'bg-amber-500' },
            { title: 'Meter Type', ...compute('TYPE_OF_METER'), color: 'bg-purple-500' },
            { title: 'Connection Phase', ...compute('CONN_PHASE'), color: 'bg-indigo-500' },
            { title: 'Govt. Status', ...compute('GOVT_STAT'), color: 'bg-pink-500' },
            { title: 'Connection Source', ...compute('CONN_BY'), color: 'bg-slate-500' },
         ]
      };
   }, [data, officeMap]);

   return (
      <div className="pb-32 flex flex-col h-full bg-gray-50 fade-in">
         <div className="glass px-6 pt-10 pb-6 border-b border-gray-100 sticky top-0 z-30 premium-shadow">
            <div className="flex justify-between items-start">
               <div>
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-2">Consumers Summary</h1>
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
               <button
                  onClick={() => setShowFilterPage(true)}
                  className="w-12 h-12 rounded-2xl bg-white border border-gray-100 android-shadow flex items-center justify-center text-gray-400 hover:text-blue-600 transition-all active:scale-90"
               >
                  <i className="fa-solid fa-sliders text-lg"></i>
               </button>
            </div>
         </div>

         {showFilterPage && <FilterPage />}

         <div className="px-4 pt-6 space-y-8 max-w-lg mx-auto md:max-w-4xl w-full">
            {/* KPI Grid */}
            <div className="grid grid-cols-2 gap-4">
               {loading && data.length === 0 ? (
                  [1, 2, 3, 4].map(idx => <div key={idx} className="h-36 skeleton rounded-[32px]"></div>)
               ) : (
                  kpis.map((kpi, idx) => (
                     <div key={idx} className="bg-white p-5 rounded-[32px] android-shadow border border-gray-100 flex flex-col justify-between h-36 scale-up">
                        <div className={`w-10 h-10 rounded-2xl ${kpi.color} text-white flex items-center justify-center mb-3 shadow-sm`}>
                           <i className={`fa-solid ${kpi.icon} text-sm`}></i>
                        </div>
                        <div>
                           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{kpi.label}</p>
                           <h3 className="text-xl font-black text-gray-900">{kpi.value}</h3>
                           {kpi.subtitle && <p className="text-[9px] text-gray-400 font-medium mt-1">{kpi.subtitle}</p>}
                        </div>
                     </div>
                  ))
               )}
            </div>

            {/* Administrative Distribution */}
            <section>
               <div className="flex items-center gap-3 mb-6 px-2">
                  <div className="h-1 w-8 bg-blue-600 rounded-full"></div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Administrative Breakdown</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {loading ? [1, 2, 3, 4].map(i => <div key={i} className="h-80 skeleton rounded-[32px]"></div>) :
                     aggregate.admin.map((section, idx) => (
                        <DataTable key={idx} {...section} />
                     ))
                  }
               </div>
            </section>

            {/* Technical Distribution */}
            <section className="pb-20">
               <div className="flex items-center gap-3 mb-6 px-2">
                  <div className="h-1 w-8 bg-emerald-500 rounded-full"></div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Technical Analysis</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {loading ? [1, 2, 3, 4].map(i => <div key={i} className="h-80 skeleton rounded-[32px]"></div>) :
                     aggregate.tech.map((section, idx) => (
                        <DataTable key={idx} {...section} />
                     ))
                  }
               </div>
            </section>
         </div>
      </div>
   );
};

export default ConsumersReport;
