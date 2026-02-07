
import React, { useState, useEffect } from 'react';
import { User, UserRole, PendingNSCData, HierarchyFilter, KPIData } from '../types';
import { fetchNSCData, calculateNSCKPIs } from '../services/dataService';

interface PendingNSCReportProps {
  user: User;
}

const PendingNSCReport: React.FC<PendingNSCReportProps> = ({ user }) => {
  const [data, setData] = useState<PendingNSCData[]>([]);
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<HierarchyFilter>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  return (
    <div className="pb-24 flex flex-col h-full">
      {/* Clean Minimal Header */}
      <div className="bg-white px-6 pt-10 pb-6 border-b border-gray-100 sticky top-0 z-30">
         <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-2">
            Pending NSC Status
         </h1>
         <div className="flex items-center gap-2 text-blue-600">
            <i className="fa-solid fa-location-dot text-[10px]"></i>
            <span className="text-xs font-bold uppercase tracking-wider">{getOfficeName()}</span>
         </div>
      </div>

      <div className="px-4 pt-6 space-y-6 max-w-lg mx-auto md:max-w-4xl w-full">
        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
             <div className="relative flex-1">
                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input 
                  type="text" 
                  placeholder="Search Application No, Name..." 
                  className="w-full pl-11 pr-4 py-4 bg-white rounded-3xl border-none android-shadow focus:ring-2 focus:ring-blue-500 transition-all"
                  onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                />
             </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
             {['DelayRange', 'PoleNonPole', 'APPLICANT_TYPE'].map(fType => (
               <select 
                 key={fType}
                 className="bg-white px-5 py-2.5 rounded-2xl text-[11px] font-bold text-gray-600 border-none android-shadow min-w-[130px] active:scale-95 transition-all"
                 onChange={(e) => {
                   const key = fType === 'DelayRange' ? 'delayRange' : fType === 'PoleNonPole' ? 'poleNonPole' : 'applicantType';
                   setFilters({ ...filters, [key]: e.target.value });
                 }}
               >
                  <option value="">{fType === 'APPLICANT_TYPE' ? 'Applicant Type' : fType === 'DelayRange' ? 'Delay Range' : 'Connection Type'}</option>
                  {Array.from(new Set(data.map(d => (d as any)[fType]))).filter(Boolean).map(val => (
                     <option key={val} value={val}>{val}</option>
                  ))}
               </select>
             ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((kpi, idx) => (
            <div key={idx} className="bg-white p-5 rounded-[32px] android-shadow border border-gray-100 flex flex-col justify-between h-36">
               <div className={`w-10 h-10 rounded-2xl ${kpi.color} text-white flex items-center justify-center mb-3`}>
                  <i className={`fa-solid ${kpi.icon} text-sm`}></i>
               </div>
               <div>
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{kpi.label}</p>
                 <h3 className="text-xl font-black text-gray-900">{kpi.value}</h3>
               </div>
            </div>
          ))}
        </div>

        {/* List View */}
        <div className="space-y-4">
           <div className="flex justify-between items-center px-1">
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Application List</h4>
              <span className="text-[10px] font-bold text-gray-400">{data.length} Records</span>
           </div>
           
           {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="h-28 bg-white rounded-[32px] animate-pulse android-shadow"></div>
              ))
           ) : data.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[40px] android-shadow border border-gray-100">
                 <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                    <i className="fa-solid fa-folder-open text-3xl"></i>
                 </div>
                 <h3 className="font-bold text-gray-900">No applications found</h3>
                 <p className="text-xs text-gray-500">Refine your filters to see more data.</p>
              </div>
           ) : (
              data.slice(0, 50).map((row) => (
                 <div 
                   key={row.APPL_NO}
                   onClick={() => setExpandedId(expandedId === row.APPL_NO ? null : row.APPL_NO)}
                   className={`bg-white rounded-[32px] android-shadow border transition-all active:scale-[0.99] overflow-hidden ${expandedId === row.APPL_NO ? 'border-blue-200 ring-4 ring-blue-50' : 'border-gray-100'}`}
                 >
                    <div className="p-5 flex justify-between items-start">
                       <div className="space-y-1.5 flex-1 pr-4">
                          <div className="flex flex-wrap items-center gap-2">
                             <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">{row.APPL_NO}</span>
                             {row.IS_DUARE_SARKAR === 'Y' && <span className="text-[9px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full uppercase">Duare Sarkar</span>}
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 leading-tight">{row.NAME}</h3>
                          <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                             <i className="fa-solid fa-building text-[10px]"></i>
                             {row.SUPP_OFF}
                             <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                             {row.ccc_code}
                          </p>
                       </div>
                       <div className="text-right">
                          <div className={`text-sm font-black px-4 py-1.5 rounded-2xl inline-block ${row.DelayInSC > 15 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                             {row.DelayInSC}d
                          </div>
                          <p className="text-[9px] text-gray-400 mt-1 font-bold uppercase tracking-tighter">Delay</p>
                       </div>
                    </div>
                    
                    {expandedId === row.APPL_NO && (
                       <div className="px-6 pb-6 pt-2 border-t border-gray-50 bg-gray-50/50 space-y-5 animate-in fade-in slide-in-from-top-2">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                             <div>
                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Contact</p>
                                <p className="text-sm font-bold text-gray-700">{row.PHONE_NO || 'N/A'}</p>
                             </div>
                             <div>
                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Applied On</p>
                                <p className="text-sm font-bold text-gray-700">{row.CREATION_DATE}</p>
                             </div>
                             <div>
                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Type</p>
                                <p className="text-sm font-bold text-gray-700">{row.CONN_TYPE}</p>
                             </div>
                             <div>
                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">SCN Status</p>
                                <p className={`text-sm font-black ${row.SCN_STATUS === 'PENDING' ? 'text-rose-600' : 'text-blue-600'}`}>{row.SCN_STATUS}</p>
                             </div>
                          </div>
                          {row.INSPECTION_COMMENT && (
                             <div className="bg-white p-4 rounded-2xl border border-gray-100">
                                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1.5 tracking-widest">Inspection Feedback</p>
                                <p className="text-xs text-gray-600 font-medium leading-relaxed italic">"{row.INSPECTION_COMMENT}"</p>
                             </div>
                          )}
                          <div className="flex gap-3 pt-2">
                             <a href={`tel:${row.PHONE_NO}`} className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl text-xs font-bold text-center active:scale-95 transition-all android-shadow">
                                <i className="fa-solid fa-phone mr-2"></i> Call Applicant
                             </a>
                             <button className="flex-1 py-3.5 bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold active:scale-95 transition-all">
                                Update Status
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

export default PendingNSCReport;
