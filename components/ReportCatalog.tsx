
import React, { useState } from 'react';
import { User, UserRole, ReportDefinition, ReportCategory } from '../types';
import { REPORT_CATALOG } from '../constants';

interface ReportsListProps {
  user: User;
  onSelectReport: (reportId: string) => void;
}

const CATEGORIES: ReportCategory[] = ['Operations', 'Analytics', 'Commercial', 'Compliance', 'Personnel'];

const ReportsList: React.FC<ReportsListProps> = ({ user, onSelectReport }) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ReportCategory | 'All'>('All');

  const ROLE_LEVELS = {
    [UserRole.CCC]: 0,
    [UserRole.DIVISION]: 1,
    [UserRole.REGION]: 2,
    [UserRole.ZONE]: 3
  };

  const filteredReports = REPORT_CATALOG.filter(report => {
    const matchesRole = ROLE_LEVELS[user.role] >= ROLE_LEVELS[report.minRole];
    const matchesSearch = report.name.toLowerCase().includes(search.toLowerCase()) || 
                         report.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || report.category === activeCategory;
    
    return matchesRole && matchesSearch && matchesCategory;
  });

  const getOfficeLabel = () => {
    const formatValue = (val: string) => val.replace(/^(Z-|R-|D-|CCC-)/i, '').trim();
    
    // Priority 1: The 'office_name' field from the User sheet (Descriptive name)
    // Priority 2: The raw codes as fallback
    let displayValue = user.office_name || user.ccc_code || user.division_code || user.region_code || user.zone_code || "Enterprise";
    
    const cleanValue = formatValue(displayValue);
    const suffix = user.role.charAt(0) + user.role.slice(1).toLowerCase();

    // If the cleanValue is strictly numeric and we have a descriptive office_name, use the name.
    // If office_name is missing, we append the suffix to the code.
    switch (user.role) {
      case UserRole.CCC: return `${cleanValue} CCC`;
      case UserRole.DIVISION: return `${cleanValue} Division`;
      case UserRole.REGION: return `${cleanValue} Region`;
      case UserRole.ZONE: return `${cleanValue} Zone`;
      default: return cleanValue;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Sticky Header with Office Name */}
      <div className="bg-white px-6 pt-8 pb-4 border-b border-gray-100 sticky top-0 z-20 android-shadow">
        <div className="flex items-center gap-3 mb-1">
           <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
           <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">
              {getOfficeLabel()}
           </span>
        </div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-4">Reports</h1>
        
        <div className="relative group">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"></i>
          <input 
            type="text" 
            placeholder="Search reports..." 
            className="w-full pl-12 pr-4 py-4 bg-gray-100 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all android-shadow"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Categories Scroller */}
        <div className="flex gap-2 overflow-x-auto mt-6 pb-2 hide-scrollbar snap-x">
          <button 
            onClick={() => setActiveCategory('All')}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all snap-start whitespace-nowrap ${activeCategory === 'All' ? 'bg-blue-600 text-white android-shadow' : 'bg-white text-gray-500 border border-gray-100'}`}
          >
            All Categories
          </button>
          {CATEGORIES.map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all snap-start whitespace-nowrap ${activeCategory === cat ? 'bg-blue-600 text-white android-shadow' : 'bg-white text-gray-500 border border-gray-100'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Report List */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3 pb-24">
        {filteredReports.length > 0 ? (
          filteredReports.map((report) => (
            <button 
              key={report.id}
              onClick={() => onSelectReport(report.id)}
              className="w-full bg-white p-4 rounded-3xl android-shadow border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-all text-left"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl ${
                report.category === 'Operations' ? 'bg-orange-50 text-orange-600' :
                report.category === 'Analytics' ? 'bg-blue-50 text-blue-600' :
                report.category === 'Commercial' ? 'bg-emerald-50 text-emerald-600' :
                report.category === 'Compliance' ? 'bg-purple-50 text-purple-600' :
                'bg-rose-50 text-rose-600'
              }`}>
                <i className={`fa-solid ${report.icon}`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-gray-900 truncate">{report.name}</h3>
                  <i className="fa-solid fa-chevron-right text-[10px] text-gray-300"></i>
                </div>
                <p className="text-xs text-gray-500 line-clamp-1">{report.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                    {report.category}
                  </span>
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <i className="fa-solid fa-search text-2xl"></i>
            </div>
            <h3 className="font-bold text-gray-900">No reports found</h3>
            <p className="text-sm text-gray-500">Try changing your search term.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsList;
