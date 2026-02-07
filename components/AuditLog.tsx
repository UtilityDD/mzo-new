
import React, { useState, useEffect } from 'react';
import { User, UserRole, AuditEntry } from '../types';
import { fetchAuditLogsFromSheet } from '../services/googleSheetsService';

interface AuditLogProps {
  user: User;
}

const AuditLog: React.FC<AuditLogProps> = ({ user }) => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchAuditLogsFromSheet();
      setLogs(data);
      setLoading(false);
    };
    load();
  }, []);

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
    <div className="pb-24 flex flex-col h-full bg-gray-50">
      {/* Header synchronized with Pending NSC */}
      <div className="bg-white px-6 pt-10 pb-6 border-b border-gray-100 sticky top-0 z-30">
         <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-2">
            System Audit Log
         </h1>
         <div className="flex items-center gap-2 text-blue-600">
            <i className="fa-solid fa-location-dot text-[10px]"></i>
            <span className="text-xs font-bold uppercase tracking-wider">{getOfficeName()}</span>
         </div>
      </div>

      <div className="px-4 pt-6 space-y-6 max-w-lg mx-auto md:max-w-4xl w-full">
        {loading ? (
          <div className="space-y-4">
             {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-white rounded-3xl animate-pulse android-shadow"></div>
             ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[40px] android-shadow">
             <i className="fa-solid fa-list-check text-4xl text-gray-200 mb-4"></i>
             <h3 className="font-bold text-gray-900">No activity recorded</h3>
             <p className="text-xs text-gray-500">System logs will appear here as they occur.</p>
          </div>
        ) : (
          <div className="space-y-3">
             {logs.map((log, idx) => (
                <div key={idx} className="bg-white p-5 rounded-[32px] android-shadow border border-gray-100 flex items-start gap-4">
                   <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs ${
                      log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' :
                      log.status === 'FAILED' ? 'bg-rose-50 text-rose-600' :
                      'bg-blue-50 text-blue-600'
                   }`}>
                      <i className={`fa-solid ${log.status === 'SUCCESS' ? 'fa-check' : log.status === 'FAILED' ? 'fa-xmark' : 'fa-info'}`}></i>
                   </div>
                   <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                         <h4 className="font-bold text-gray-900 text-sm">{log.action}</h4>
                         <span className="text-[9px] font-bold text-gray-400 uppercase">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium mb-1">
                         <span className="text-blue-600 font-bold">{log.user_id}</span> • {log.office}
                      </p>
                      <p className="text-[10px] text-gray-400 italic">"{log.details}"</p>
                      <p className="text-[9px] font-bold text-gray-300 mt-2">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </p>
                   </div>
                </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
