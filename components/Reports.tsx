
import React, { useState, useEffect } from 'react';
import { User, UserRole, ReportData, HierarchyFilter } from '../types';
import { fetchFilteredData } from '../services/dataService';

interface HistoricalReportProps {
  user: User;
}

const HistoricalReport: React.FC<HistoricalReportProps> = ({ user }) => {
  const [data, setData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await fetchFilteredData(user, {});
      setData(res);
      setLoading(false);
    };
    load();
  }, [user]);

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const paginatedData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getOfficeName = () => {
    const formatValue = (val: string) => val.replace(/^(Z-|R-|D-|CCC-)/i, '').trim();
    
    let displayName = user.office_name;
    
    if (!displayName && data.length > 0) {
      const row = data[0];
      switch (user.role) {
        case UserRole.CCC: displayName = row.ccc_code || user.ccc_code; break;
        case UserRole.DIVISION: displayName = row.division_code || user.division_code; break;
        case UserRole.REGION: displayName = row.region_code || user.region_code; break;
        case UserRole.ZONE: displayName = row.zone_code || user.zone_code; break;
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
      {/* Synchronized Header Styling */}
      <div className="bg-white px-6 pt-10 pb-6 border-b border-gray-100 sticky top-0 z-30">
         <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-2">
            Historical Performance
         </h1>
         <div className="flex items-center gap-2 text-blue-600">
            <i className="fa-solid fa-location-dot text-[10px]"></i>
            <span className="text-xs font-bold uppercase tracking-wider">{getOfficeName()}</span>
         </div>
      </div>

      <div className="px-4 pt-6 space-y-6 max-w-lg mx-auto md:max-w-4xl w-full">
        <div className="flex justify-between items-center px-1">
          <h1 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Granular Data</h1>
          <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
             {data.length} Records
          </div>
        </div>

        <div className="bg-white rounded-[32px] android-shadow border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-4 font-bold text-gray-400">Date</th>
                  <th className="px-5 py-4 font-bold text-gray-400">CCC</th>
                  <th className="px-5 py-4 font-bold text-gray-400 text-right">Revenue</th>
                  <th className="px-5 py-4 font-bold text-gray-400 text-right">Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-5 py-5"><div className="h-4 bg-gray-100 rounded-lg w-16"></div></td>
                      <td className="px-5 py-5"><div className="h-4 bg-gray-100 rounded-lg w-20"></div></td>
                      <td className="px-5 py-5"><div className="h-4 bg-gray-100 rounded-lg w-14 ml-auto"></div></td>
                      <td className="px-5 py-5"><div className="h-4 bg-gray-100 rounded-lg w-10 ml-auto"></div></td>
                    </tr>
                  ))
                ) : (
                  paginatedData.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 active:bg-gray-100 transition-colors">
                      <td className="px-5 py-5 font-bold text-gray-900">{row.date}</td>
                      <td className="px-5 py-5 text-gray-500 text-xs font-medium">{row.ccc_code}</td>
                      <td className="px-5 py-5 text-right font-black text-emerald-600">₹{row.revenue.toLocaleString()}</td>
                      <td className="px-5 py-5 text-right font-bold text-gray-700">{row.orders}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-5 border-t border-gray-50 flex items-center justify-between bg-gray-50/30">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-4 py-2 text-blue-600 disabled:text-gray-300 font-bold text-xs bg-white rounded-xl border border-gray-100 active:scale-95 transition-all"
            >
              Previous
            </button>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-4 py-2 text-blue-600 disabled:text-gray-300 font-bold text-xs bg-white rounded-xl border border-gray-100 active:scale-95 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoricalReport;
