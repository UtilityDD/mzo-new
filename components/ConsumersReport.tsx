
import React, { useState, useEffect } from 'react';
import { User, UserRole, ConsumerData, KPIData, HierarchyFilter } from '../types';
import { fetchConsumerData, calculateConsumerKPIs } from '../services/dataService';
import { fetchOfficeMapping } from '../services/googleSheetsService';
import {
   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

interface ConsumersReportProps {
   user: User;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const ConsumersReport: React.FC<ConsumersReportProps> = ({ user }) => {
   const [data, setData] = useState<ConsumerData[]>([]);
   const [kpis, setKpis] = useState<KPIData[]>([]);
   const [loading, setLoading] = useState(true);
   const [filters, setFilters] = useState<HierarchyFilter>({});
   const [officeMap, setOfficeMap] = useState<Record<string, string>>({});

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

   const getOfficeName = () => {
      const formatValue = (val: string) => val.replace(/^(Z-|R-|D-|CCC-)/i, '').trim();

      // Priority 1: User's descriptive office_name from profile
      let displayName = user.office_name;

      // Priority 2: Resolve from lookup map using user's authorized code
      if (!displayName || /^\d+$/.test(displayName)) {
         const authCode = user.ccc_code || user.division_code || user.region_code || user.zone_code;
         if (authCode && officeMap[authCode]) {
            displayName = officeMap[authCode];
         }
      }

      // Priority 3: Fallback to first available CCC name from data if everything else fails
      if (!displayName && data.length > 0) {
         const firstCode = data[0].ccc_code;
         displayName = officeMap[firstCode] || firstCode;
      }

      if (!displayName) {
         displayName = "Enterprise View";
         return displayName;
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

   // Aggregations for Charts
   const categoryData = data.reduce((acc: any[], item) => {
      const existing = acc.find(a => a.name === item.CATEGORY);
      if (existing) {
         existing.value += item.COUNT;
      } else {
         acc.push({ name: item.CATEGORY, value: item.COUNT });
      }
      return acc;
   }, []).sort((a, b) => b.value - a.value).slice(0, 5);

   const statusData = data.reduce((acc: any[], item) => {
      const existing = acc.find(a => a.name === item.CONN_STAT);
      if (existing) {
         existing.value += item.COUNT;
      } else {
         acc.push({ name: item.CONN_STAT, value: item.COUNT });
      }
      return acc;
   }, []).sort((a, b) => b.value - a.value);

   const phaseData = data.reduce((acc: any[], item) => {
      const existing = acc.find(a => a.name === item.CONN_PHASE);
      if (existing) {
         existing.value += item.COUNT;
      } else {
         acc.push({ name: item.CONN_PHASE, value: item.COUNT });
      }
      return acc;
   }, []);

   return (
      <div className="pb-24 flex flex-col h-full bg-gray-50 fade-in">
         <div className="glass px-6 pt-10 pb-6 border-b border-gray-100 sticky top-0 z-30 premium-shadow">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-2">
               Consumers Summary
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
            {/* KPI Grid */}
            <div className="grid grid-cols-2 gap-4">
               {loading && data.length === 0 ? (
                  [1, 2, 3, 4].map(idx => (
                     <div key={idx} className="h-36 skeleton rounded-[32px]"></div>
                  ))
               ) : (
                  kpis.map((kpi, idx) => (
                     <div key={idx} className="bg-white p-5 rounded-[32px] android-shadow border border-gray-100 flex flex-col justify-between h-36 scale-up" style={{ animationDelay: `${idx * 0.1}s` }}>
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

            {/* Breakdown Charts */}
            <div className="space-y-4">
               <div className="bg-white p-6 rounded-[32px] android-shadow border border-gray-100">
                  <h4 className="text-sm font-bold text-gray-800 mb-6 uppercase tracking-widest">Category Distribution</h4>
                  <div className="h-64 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                           <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                           <XAxis type="number" hide />
                           <YAxis
                              dataKey="name"
                              type="category"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 'bold' }}
                              width={80}
                           />
                           <Tooltip
                              cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                           />
                           <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                              {categoryData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-[32px] android-shadow border border-gray-100">
                     <h4 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-widest">Status Mix</h4>
                     <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                              <Pie
                                 data={statusData}
                                 cx="50%"
                                 cy="50%"
                                 innerRadius={50}
                                 outerRadius={70}
                                 paddingAngle={8}
                                 dataKey="value"
                              >
                                 {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                 ))}
                              </Pie>
                              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                           </PieChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  <div className="bg-white p-6 rounded-[32px] android-shadow border border-gray-100">
                     <h4 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-widest">Phase Analysis</h4>
                     <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={phaseData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                              <YAxis hide />
                              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '16px', border: 'none' }} />
                              <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-[32px] android-shadow border border-gray-100 overflow-hidden">
               <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                  <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Granular Breakdown</h4>
                  <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">{data.length} Clusters</span>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                     <thead>
                        <tr className="bg-gray-50/50">
                           <th className="px-6 py-4 font-extrabold text-[10px] text-gray-400 uppercase tracking-widest">Classification</th>
                           <th className="px-6 py-4 font-extrabold text-[10px] text-gray-400 uppercase tracking-widest">Status</th>
                           <th className="px-6 py-4 font-extrabold text-[10px] text-gray-400 uppercase tracking-widest text-right">Count</th>
                           <th className="px-6 py-4 font-extrabold text-[10px] text-gray-400 uppercase tracking-widest text-right">Load</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {loading && data.length === 0 ? (
                           [...Array(5)].map((_, i) => (
                              <tr key={i}>
                                 <td colSpan={4} className="px-6 py-6"><div className="h-6 skeleton rounded-xl w-full"></div></td>
                              </tr>
                           ))
                        ) : (
                           data.slice(0, 20).map((row, i) => (
                              <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                                 <td className="px-6 py-5">
                                    <p className="font-bold text-gray-900 group-hover:text-blue-700">{row.BASE_CLASS}</p>
                                    <p className="text-[10px] text-gray-400 font-medium">{row.CATEGORY}</p>
                                 </td>
                                 <td className="px-6 py-5">
                                    <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider ${row.CONN_STAT === 'LIVE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                       {row.CONN_STAT}
                                    </span>
                                 </td>
                                 <td className="px-6 py-5 text-right font-bold text-gray-700 tracking-tight">{row.COUNT.toLocaleString()}</td>
                                 <td className="px-6 py-5 text-right font-extrabold text-blue-600 tracking-tight">{row.LOAD.toLocaleString()}</td>
                              </tr>
                           ))
                        )}
                     </tbody>
                  </table>
               </div>
               {data.length > 20 && (
                  <div className="p-4 bg-gray-50 text-center">
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Plus {data.length - 20} more records in full view</p>
                  </div>
               )}
            </div>
         </div>
      </div>
   );
};

export default ConsumersReport;
