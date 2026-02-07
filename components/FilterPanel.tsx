
import React, { useState, useEffect } from 'react';
import { User, UserRole, HierarchyFilter } from '../types';
import { HIERARCHY_MAP } from '../constants';

interface FilterPanelProps {
  user: User;
  onFilterChange: (filters: HierarchyFilter) => void;
  isOpen: boolean;
  onClose: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ user, onFilterChange, isOpen, onClose }) => {
  const [filters, setFilters] = useState<HierarchyFilter>({});

  // Cascading logic
  const zones = Object.keys(HIERARCHY_MAP);
  const regions = filters.zone ? Object.keys((HIERARCHY_MAP as any)[filters.zone]) : [];
  const divisions = (filters.zone && filters.region) ? Object.keys((HIERARCHY_MAP as any)[filters.zone][filters.region]) : [];
  const cccs = (filters.zone && filters.region && filters.division) ? (HIERARCHY_MAP as any)[filters.zone][filters.region][filters.division] : [];

  const handleApply = () => {
    onFilterChange(filters);
    onClose();
  };

  const clearFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden android-shadow flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-lg">Filters</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Zone Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zone</label>
            <select 
              disabled={user.role !== UserRole.ZONE && !!user.zone_code}
              value={filters.zone || user.zone_code || ''} 
              onChange={(e) => setFilters({ ...filters, zone: e.target.value, region: '', division: '', ccc: '' })}
              className="w-full p-3 bg-gray-100 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Zones</option>
              {zones.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>

          {/* Region Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
            <select 
              disabled={!filters.zone || (user.role === UserRole.REGION && !!user.region_code)}
              value={filters.region || user.region_code || ''} 
              onChange={(e) => setFilters({ ...filters, region: e.target.value, division: '', ccc: '' })}
              className="w-full p-3 bg-gray-100 rounded-xl border-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">All Regions</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Division Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
            <select 
              disabled={!filters.region || (user.role === UserRole.DIVISION && !!user.division_code)}
              value={filters.division || user.division_code || ''} 
              onChange={(e) => setFilters({ ...filters, division: e.target.value, ccc: '' })}
              className="w-full p-3 bg-gray-100 rounded-xl border-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">All Divisions</option>
              {divisions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* CCC Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CCC</label>
            <select 
              disabled={!filters.division || (user.role === UserRole.CCC && !!user.ccc_code)}
              value={filters.ccc || user.ccc_code || ''} 
              onChange={(e) => setFilters({ ...filters, ccc: e.target.value })}
              className="w-full p-3 bg-gray-100 rounded-xl border-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">All CCCs</option>
              {cccs.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
            <div className="grid grid-cols-2 gap-2">
               <input 
                type="date" 
                className="w-full p-3 bg-gray-100 rounded-xl border-none text-sm"
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange!, start: e.target.value } }))}
               />
               <input 
                type="date" 
                className="w-full p-3 bg-gray-100 rounded-xl border-none text-sm"
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange!, end: e.target.value } }))}
               />
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex gap-3 safe-area-bottom">
          <button 
            onClick={clearFilters}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-300 font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100"
          >
            Clear
          </button>
          <button 
            onClick={handleApply}
            className="flex-1 py-3 px-4 rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-700 active:bg-blue-800"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
