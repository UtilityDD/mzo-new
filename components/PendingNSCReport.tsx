
import React, { useState, useEffect } from 'react';
import { User, UserRole, PendingNSCData, HierarchyFilter, KPIData } from '../types';
import { fetchNSCData, calculateNSCKPIs } from '../services/dataService';

interface PendingNSCReportProps {
   user: User;
}

const PendingNSCReport: React.FC<PendingNSCReportProps> = ({ user }) => {
   const [data, setData] = useState<PendingNSCData[]>([]);
   const [allPossibleData, setAllPossibleData] = useState<PendingNSCData[]>([]);
   const [kpis, setKpis] = useState<KPIData[]>([]);
   const [loading, setLoading] = useState(true);
   const [filters, setFilters] = useState<HierarchyFilter>({});
   const [expandedId, setExpandedId] = useState<string | null>(null);
   const [viewMode, setViewMode] = useState<'list' | 'summary'>('summary');
   const [showFilterPage, setShowFilterPage] = useState(false);

   useEffect(() => {
      const load = async () => {
         setLoading(true);
         const res = await fetchNSCData(user, filters);
         setData(res);
         setKpis(calculateNSCKPIs(res));
         setLoading(false);
      };
      load();
   }, [user, filters]);

   useEffect(() => {
      const loadOptions = async () => {
         const res = await fetchNSCData(user, {});
         setAllPossibleData(res);
      };
      loadOptions();
   }, [user]);

   const getUniqueValues = (key: keyof PendingNSCData) => {
      const values = Array.from(new Set(allPossibleData.map(item => String(item[key] || ''))))
         .filter(val => val !== '');

      if (key === 'DelayRange') {
         return values.sort((a, b) => {
            const serialA = allPossibleData.find(item => item.DelayRange === a)?.DelaySerial || 0;
            const serialB = allPossibleData.find(item => item.DelayRange === b)?.DelaySerial || 0;
            return serialB - serialA;
         });
      }

      return values.sort();
   };

   // Data aggregation for summaries
   const getSummaryData = (key: keyof PendingNSCData) => {
      const summaryMap: Record<string, { count: number; totalDelay: number; serial: number }> = {};

      data.forEach(item => {
         const val = String(item[key] || 'N/A');
         if (!summaryMap[val]) {
            summaryMap[val] = { count: 0, totalDelay: 0, serial: item.DelaySerial || 0 };
         }
         summaryMap[val].count += 1;
         summaryMap[val].totalDelay += item.DelayInSC || 0;
      });

      const summaryList = Object.entries(summaryMap).map(([label, stats]) => ({
         label,
         count: stats.count,
         avgDelay: stats.count > 0 ? stats.totalDelay / stats.count : 0,
         serial: stats.serial
      }));

      // Sort by serial descending for DelayRange, otherwise by avgDelay descending
      if (key === 'DelayRange') {
         return summaryList.sort((a, b) => b.serial - a.serial);
      }
      return summaryList.sort((a, b) => b.avgDelay - a.avgDelay);
   };

   // Determine authorized office name from profile or data
   const getOfficeName = () => {
      const formatValue = (val: string) => val.replace(/^(Z-|R-|D-|CCC-)/i, '').trim();

      // Strict priority: user.office_name is the descriptive source of truth from user sheet
      let displayName = user.office_name;

      if (!displayName && data.length > 0) {
         const row = data[0];
         switch (user.role) {
            case UserRole.CCC: displayName = row.SUPP_OFF; break;
            case UserRole.DIVISION: displayName = row.DIVN_NAME; break;
            case UserRole.REGION: displayName = row.REGION; break;
         }
      }

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

   const SummaryTable = ({ title, icon, data, onRowClick }: { title: string; icon: string; data: any[]; onRowClick?: (label: string) => void }) => (
      <div className="bg-white rounded-[32px] android-shadow border border-gray-100 overflow-hidden fade-in mb-6">
         <div className="px-6 py-5 bg-gray-50/50 border-b border-gray-50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
               <i className={`fa-solid ${icon} text-xs`}></i>
            </div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">{title}</h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-gray-50/30">
                     <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest border-b border-gray-50">Category</th>
                     <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest border-b border-gray-50 text-center">Count</th>
                     <th className="px-6 py-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest border-b border-gray-50 text-right">Avg Delay</th>
                  </tr>
               </thead>
               <tbody>
                  {data.map((item, idx) => (
                     <tr
                        key={idx}
                        onClick={() => onRowClick?.(item.label)}
                        className={`group transition-colors ${onRowClick ? 'hover:bg-blue-50/50 cursor-pointer active:bg-blue-100/30' : 'hover:bg-gray-50/50'}`}
                     >
                        <td className="px-6 py-4 text-xs font-bold text-gray-700 capitalize">
                           <div className="flex items-center gap-2">
                              {onRowClick && <i className="fa-solid fa-chevron-right text-[8px] text-blue-300 group-hover:text-blue-500 transition-colors"></i>}
                              {item.label}
                           </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black border border-blue-100">{item.count}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <span className={`text-xs font-black ${item.avgDelay > 15 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {item.avgDelay.toFixed(1)}d
                           </span>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
   );

   const toggleFilter = (key: keyof HierarchyFilter, value: string) => {
      setFilters(prev => {
         const current = (prev[key] as string[]) || [];
         const updated = current.includes(value)
            ? current.filter(v => v !== value)
            : [...current, value];
         return { ...prev, [key]: updated };
      });
   };

   // Reset Actions
   const resetFilters = () => {
      setFilters({});
      setShowFilterPage(false);
   };

   const FilterButton = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
      <button
         onClick={onClick}
         className={`px-4 py-3 rounded-2xl text-[11px] font-bold transition-all border ${active ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-95' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'}`}
      >
         {label}
      </button>
   );

   const FilterPage = () => (
      <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto animate-in slide-in-from-bottom-5">
         <div className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-gray-100 px-6 py-6 flex justify-between items-center z-10">
            <div>
               <h2 className="text-xl font-black text-gray-900 tracking-tight">Filter Options</h2>
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Select your refinement</p>
            </div>
            <button
               onClick={() => setShowFilterPage(false)}
               className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:scale-90 transition-all"
            >
               <i className="fa-solid fa-xmark text-lg"></i>
            </button>
         </div>

         <div className="p-6 space-y-8 max-w-lg mx-auto">
            {/* Search Section */}
            <div className="space-y-3">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Global Search</label>
               <div className="relative group">
                  <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"></i>
                  <input
                     type="text"
                     value={filters.searchQuery || ''}
                     placeholder="Application No, Name..."
                     className="w-full pl-11 pr-4 py-4 bg-white rounded-3xl border-none android-shadow focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                     onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                  />
               </div>
            </div>

            {/* Delay Range Selector */}
            <div className="space-y-3">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Delay Range</label>
               <div className="flex flex-wrap gap-2">
                  {getUniqueValues('DelayRange').map(range => (
                     <FilterButton
                        key={range}
                        label={range}
                        active={filters.delayRange?.includes(range) || false}
                        onClick={() => toggleFilter('delayRange', range)}
                     />
                  ))}
               </div>
            </div>

            {/* Class Selector */}
            <div className="space-y-3">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Connection Class</label>
               <div className="flex flex-wrap gap-2">
                  {getUniqueValues('CONN_CLASS').map(cls => (
                     <FilterButton
                        key={cls}
                        label={`Class ${cls}`}
                        active={filters.connClass?.includes(cls) || false}
                        onClick={() => toggleFilter('connClass', cls)}
                     />
                  ))}
               </div>
            </div>

            {/* Connection Type Selector */}
            <div className="space-y-3">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Connection Type</label>
               <div className="flex flex-wrap gap-2">
                  {getUniqueValues('PoleNonPole').map(type => (
                     <FilterButton
                        key={type}
                        label={type}
                        active={filters.poleNonPole?.includes(type) || false}
                        onClick={() => toggleFilter('poleNonPole', type)}
                     />
                  ))}
               </div>
            </div>

            {/* Status & Flag Toggles */}
            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">WO Issued</label>
                  <div className="flex flex-wrap gap-2">
                     {getUniqueValues('WO_ISSUED').map(val => (
                        <FilterButton
                           key={val}
                           label={val}
                           active={filters.woIssued?.includes(val) || false}
                           onClick={() => toggleFilter('woIssued', val)}
                        />
                     ))}
                  </div>
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Applicant Type</label>
                  <div className="flex flex-wrap gap-2">
                     {getUniqueValues('APPLICANT_TYPE').map(type => (
                        <FilterButton
                           key={type}
                           label={type}
                           active={filters.applicantType?.includes(type) || false}
                           onClick={() => toggleFilter('applicantType', type)}
                        />
                     ))}
                  </div>
               </div>
            </div>

            <div className="space-y-3">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Division</label>
               <div className="flex flex-wrap gap-2">
                  {getUniqueValues('DIVN_NAME').map(div => (
                     <FilterButton
                        key={div}
                        label={div}
                        active={filters.divnName?.includes(div) || false}
                        onClick={() => toggleFilter('divnName', div)}
                     />
                  ))}
               </div>
            </div>
            <div className="space-y-3">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Applied Phase</label>
               <div className="flex flex-wrap gap-2">
                  {getUniqueValues('APPLIED_PHASE').map(phase => (
                     <FilterButton
                        key={phase}
                        label={phase}
                        active={filters.appliedPhase?.includes(phase) || false}
                        onClick={() => toggleFilter('appliedPhase', phase)}
                     />
                  ))}
               </div>
            </div>
            <div className="space-y-3">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Load</label>
               <div className="flex flex-wrap gap-2">
                  {getUniqueValues('SUPP_OFFLOAD_WATTS').map(watts => (
                     <FilterButton
                        key={String(watts)}
                        label={String(watts)}
                        active={filters.suppOffloadWatts?.includes(String(watts)) || false}
                        onClick={() => toggleFilter('suppOffloadWatts', String(watts))}
                     />
                  ))}
               </div>
            </div>
            <div className="space-y-3">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">No. of Poles</label>
               <div className="flex flex-wrap gap-2">
                  {getUniqueValues('NO_OF_POLES').map(poles => (
                     <FilterButton
                        key={String(poles)}
                        label={String(poles)}
                        active={filters.noOfPoles?.includes(String(poles)) || false}
                        onClick={() => toggleFilter('noOfPoles', String(poles))}
                     />
                  ))}
               </div>
            </div>
            <div className="space-y-3">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Portal Application</label>
               <div className="flex flex-wrap gap-2">
                  {getUniqueValues('IS_PORTAL_APPL').map(status => (
                     <FilterButton
                        key={status}
                        label={status === 'Y' ? 'Portal' : 'Non-Portal'}
                        active={filters.isPortalAppl?.includes(status) || false}
                        onClick={() => toggleFilter('isPortalAppl', status)}
                     />
                  ))}
               </div>
            </div>
            <div className="space-y-3">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Duare Sarkar</label>
               <div className="flex flex-wrap gap-2">
                  {getUniqueValues('IS_DUARE_SARKAR').map(status => (
                     <FilterButton
                        key={status}
                        label={status === 'Y' ? 'Duare Sarkar' : 'Regular'}
                        active={filters.isDuareSarkar?.includes(status) || false}
                        onClick={() => toggleFilter('isDuareSarkar', status)}
                     />
                  ))}
               </div>
            </div>

            {/* Reset Actions */}
            <div className="pt-6 flex gap-4">
               <button
                  onClick={resetFilters}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-3xl text-xs font-bold active:scale-95 transition-all"
               >
                  Reset All
               </button>
               <button
                  onClick={() => setShowFilterPage(false)}
                  className={`flex-1 py-4 rounded-3xl text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-2 ${loading ? 'bg-blue-400 text-white/80 cursor-wait' : 'bg-blue-600 text-white premium-shadow'}`}
                  disabled={loading}
               >
                  {loading ? (
                     <>
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                        <span>Calculating...</span>
                     </>
                  ) : (
                     <>
                        <span>Show Results ({data.length})</span>
                        <i className="fa-solid fa-chevron-right text-[10px] opacity-50"></i>
                     </>
                  )}
               </button>
            </div>
         </div>
      </div>
   );

   const getActiveFilterCount = () => {
      let count = 0;
      if (filters.searchQuery) count++;

      const arrayFields: (keyof HierarchyFilter)[] = [
         'delayRange', 'poleNonPole', 'applicantType', 'connClass', 'woIssued', 'isDuareSarkar', 'isPortalAppl',
         'divnName', 'suppOffloadWatts', 'appliedPhase', 'noOfPoles'
      ];

      arrayFields.forEach(field => {
         const val = filters[field];
         if (Array.isArray(val)) {
            count += val.length;
         }
      });

      return count;
   };

   const getListTitle = () => {
      const parts: string[] = [];
      if (filters.divnName?.length) parts.push(filters.divnName.join('/'));
      if (filters.delayRange?.length) parts.push(filters.delayRange.join(' / '));
      if (filters.connClass?.length) parts.push(`Class ${filters.connClass.join('/')}`);
      if (filters.appliedPhase?.length) parts.push(filters.appliedPhase.join('/'));
      if (filters.suppOffloadWatts?.length) parts.push(`${filters.suppOffloadWatts.join('/')} Load`);
      if (filters.poleNonPole?.length) parts.push(filters.poleNonPole.join('/'));
      if (filters.woIssued?.length) parts.push(`WO: ${filters.woIssued.join('/')}`);

      if (parts.length === 0) return 'All Applications';
      return `${parts.join(' • ')} List`;
   };

   return (
      <div className="pb-24 flex flex-col h-full bg-gray-50 fade-in">
         {showFilterPage && <FilterPage />}

         {/* Clean Minimal Header */}
         <div className="glass px-6 pt-10 pb-6 border-b border-gray-100 sticky top-0 z-30 premium-shadow">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-2">
                     Pending NSC Status
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
               <div className="flex bg-gray-100 p-1 rounded-2xl">
                  <button
                     onClick={() => setViewMode('list')}
                     className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                  >
                     List
                  </button>
                  <button
                     onClick={() => setViewMode('summary')}
                     className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'summary' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                  >
                     Summary
                  </button>
               </div>
            </div>

            <button
               onClick={() => setShowFilterPage(true)}
               className="w-full py-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between px-5 android-shadow active:scale-95 transition-all group"
            >
               <div className="flex items-center gap-3">
                  <i className="fa-solid fa-filter text-blue-600 text-xs"></i>
                  <span className="text-[11px] font-black text-gray-700 uppercase tracking-widest">Configure Filters</span>
               </div>
               <div className="flex items-center gap-2 text-gray-400">
                  {getActiveFilterCount() > 0 && (
                     <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-black flex items-center justify-center border border-blue-200 animate-pulse">
                        {getActiveFilterCount()}
                     </span>
                  )}
                  <i className="fa-solid fa-chevron-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
               </div>
            </button>
         </div>

         <div className="px-4 pt-6 space-y-6 max-w-lg mx-auto md:max-w-4xl w-full">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {loading && data.length === 0 ? (
                  [1, 2, 3, 4].map(idx => (
                     <div key={idx} className="h-36 skeleton rounded-[32px]"></div>
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

            {/* Content View */}
            {viewMode === 'summary' ? (
               <div className="space-y-2">
                  <div className="px-2 mb-4">
                     <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Statistical Summary</h4>
                  </div>
                  <SummaryTable
                     title="Delay Range Summary"
                     icon="fa-clock"
                     data={getSummaryData('DelayRange')}
                     onRowClick={(label) => {
                        setFilters({ ...filters, delayRange: [label] });
                        setViewMode('list');
                     }}
                  />
                  <SummaryTable
                     title="Connection Class Summary"
                     icon="fa-layer-group"
                     data={getSummaryData('CONN_CLASS')}
                     onRowClick={(label) => {
                        setFilters({ ...filters, connClass: [label] });
                        setViewMode('list');
                     }}
                  />
                  <SummaryTable
                     title="Connection Type Summary"
                     icon="fa-plug-circle-bolt"
                     data={getSummaryData('PoleNonPole')}
                     onRowClick={(label) => {
                        setFilters({ ...filters, poleNonPole: [label] });
                        setViewMode('list');
                     }}
                  />
               </div>
            ) : (
               <div className="space-y-4">
                  <div className="flex justify-between items-center px-2">
                     <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">{getListTitle()}</h4>
                     <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">{data.length} Total</span>
                  </div>

                  {loading && data.length === 0 ? (
                     [...Array(3)].map((_, i) => (
                        <div key={i} className="h-28 skeleton rounded-[32px]"></div>
                     ))
                  ) : data.length === 0 ? (
                     <div className="text-center py-20 bg-white rounded-[40px] android-shadow border border-gray-100 fade-in">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                           <i className="fa-solid fa-folder-open text-3xl"></i>
                        </div>
                        <h3 className="font-bold text-gray-900">No applications found</h3>
                        <p className="text-xs text-gray-500">Refine your filters to see more data.</p>
                     </div>
                  ) : (
                     <div className="space-y-3">
                        {data.slice(0, 50).map((row, idx) => (
                           <div
                              key={row.APPL_NO}
                              onClick={() => setExpandedId(expandedId === row.APPL_NO ? null : row.APPL_NO)}
                              className={`bg-white rounded-[24px] android-shadow border transition-all active:scale-[0.98] overflow-hidden group fade-in ${expandedId === row.APPL_NO ? 'border-blue-200 ring-4 ring-blue-50' : 'border-gray-100'}`}
                              style={{ animationDelay: `${idx * 0.02}s` }}
                           >
                              <div className="p-4 flex justify-between items-center">
                                 <div className="flex-1 pr-3">
                                    <div className="flex items-center gap-1.5 mb-1">
                                       <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wider border border-blue-100">{row.APPL_NO}</span>
                                       {row.IS_DUARE_SARKAR === 'Y' && <span className="text-[8px] font-black bg-orange-100 text-orange-600 px-2 py-0.5 rounded-md uppercase border border-orange-200">DS</span>}
                                    </div>
                                    <h3 className="text-sm font-black text-gray-900 leading-none group-hover:text-blue-600 transition-colors uppercase truncate max-w-[180px]">{row.NAME}</h3>
                                    <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1 mt-1">
                                       <i className="fa-solid fa-building text-[8px]"></i>
                                       {row.SUPP_OFF}
                                    </p>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <div className="text-right">
                                       <div className={`text-xs font-black px-3 py-1.5 rounded-xl inline-block ${row.DelayInSC > 15 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                          {row.DelayInSC}d
                                       </div>
                                    </div>
                                    <i className={`fa-solid fa-chevron-down text-[10px] text-gray-300 transition-transform ${expandedId === row.APPL_NO ? 'rotate-180 text-blue-500' : ''}`}></i>
                                 </div>
                              </div>

                              {expandedId === row.APPL_NO && (
                                 <div className="px-6 pb-6 pt-2 border-t border-gray-50 bg-gray-50/50 space-y-6 animate-in fade-in slide-in-from-top-2">
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-4">
                                       <div>
                                          <p className="text-[9px] text-gray-400 uppercase font-extrabold tracking-widest mb-1 opacity-60">Division</p>
                                          <p className="text-xs font-bold text-gray-800">{row.DIVN_NAME}</p>
                                       </div>
                                       <div>
                                          <p className="text-[9px] text-gray-400 uppercase font-extrabold tracking-widest mb-1 opacity-60">Phase</p>
                                          <p className="text-xs font-bold text-gray-800">{row.APPLIED_PHASE || 'N/A'}</p>
                                       </div>
                                       <div>
                                          <p className="text-[9px] text-gray-400 uppercase font-extrabold tracking-widest mb-1 opacity-60">Load</p>
                                          <p className="text-xs font-bold text-gray-800">{row.SUPP_OFFLOAD_WATTS} W</p>
                                       </div>
                                       <div>
                                          <p className="text-[9px] text-gray-400 uppercase font-extrabold tracking-widest mb-1 opacity-60">No. of Poles</p>
                                          <p className="text-xs font-bold text-gray-800">{row.NO_OF_POLES}</p>
                                       </div>
                                       <div>
                                          <p className="text-[9px] text-gray-400 uppercase font-extrabold tracking-widest mb-1 opacity-60">Conn Class</p>
                                          <p className="text-xs font-bold text-gray-800">{row.CONN_CLASS}</p>
                                       </div>
                                       <div>
                                          <p className="text-[9px] text-gray-400 uppercase font-extrabold tracking-widest mb-1 opacity-60">WO Issued</p>
                                          <p className="text-xs font-bold text-gray-800">{row.WO_ISSUED || 'No'}</p>
                                       </div>
                                       <div>
                                          <p className="text-[9px] text-gray-400 uppercase font-extrabold tracking-widest mb-1 opacity-60">Portal App</p>
                                          <p className="text-xs font-bold text-gray-800">{row.IS_PORTAL_APPL === 'Y' ? 'Yes' : 'No'}</p>
                                       </div>
                                       <div>
                                          <p className="text-[9px] text-gray-400 uppercase font-extrabold tracking-widest mb-1 opacity-60">Mobile Number</p>
                                          <p className="text-xs font-bold text-gray-800">{row.PHONE_NO || 'N/A'}</p>
                                       </div>
                                    </div>
                                    {row.INSPECTION_COMMENT && (
                                       <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                                          <p className="text-[9px] text-gray-400 uppercase font-extrabold mb-1.5 tracking-widest">Inspector Comment</p>
                                          <p className="text-xs text-gray-600 font-medium leading-relaxed italic">"{row.INSPECTION_COMMENT}"</p>
                                       </div>
                                    )}
                                    <div className="flex gap-3 pt-2">
                                       {(!row.PHONE_NO || row.PHONE_NO === 'N/A' || row.PHONE_NO.trim() === '') ? (
                                          <div className="w-full py-4 bg-gray-100 text-gray-400 rounded-2xl text-[11px] font-bold text-center border border-gray-200 cursor-not-allowed flex items-center justify-center gap-2">
                                             <i className="fa-solid fa-phone-slash"></i> No Number
                                          </div>
                                       ) : (
                                          <a href={`tel:${row.PHONE_NO}`} className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-bold text-center active:scale-95 transition-all premium-shadow flex items-center justify-center gap-2">
                                             <i className="fa-solid fa-phone"></i> Call User
                                          </a>
                                       )}
                                    </div>
                                 </div>
                              )}
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            )}
         </div>
      </div>
   );
};

export default PendingNSCReport;
