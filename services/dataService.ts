
import { ReportData, User, UserRole, HierarchyFilter, PendingNSCData, ConsumerData, DocketData, CollectionData } from '../types';
import { MOCK_REPORT_DATA } from '../constants';
import { fetchReportsFromSheet, fetchPendingNSCFromSheet, fetchConsumersFromSheet, fetchDocketDataFromSheet, fetchCollectionDataFromSheet } from './googleSheetsService';

/**
 * Enforces Mandatory Hierarchy Logic
 */
const applyHierarchyRestriction = (row: any, user: User) => {
  if (user.role === UserRole.REGION) {
    if (row.region_code && row.region_code !== user.region_code) return false;
  } else if (user.role === UserRole.DIVISION) {
    if (row.division_code && row.division_code !== user.division_code) return false;
  } else if (user.role === UserRole.CCC) {
    if (row.ccc_code && row.ccc_code !== user.ccc_code) return false;
  } else if (user.role === UserRole.ZONE) {
    if (row.zone_code && row.zone_code !== user.zone_code) return false;
  }
  return true;
};

export const fetchNSCData = async (user: User, filters: HierarchyFilter): Promise<PendingNSCData[]> => {
  const allData = await fetchPendingNSCFromSheet();

  return allData.filter(row => {
    // 1. Mandatory Hierarchy Enforcement
    if (!applyHierarchyRestriction(row, user)) return false;

    // 2. UI Hierarchy Filters (scope checked implicitly by above)
    if (filters.zone && row.zone_code !== filters.zone) return false;
    if (filters.region && row.region_code !== filters.region) return false;
    if (filters.division && row.division_code !== filters.division) return false;
    if (filters.ccc && row.ccc_code !== filters.ccc) return false;

    // 3. NSC Specific Filters
    if (filters.delayRange && row.DelayRange !== filters.delayRange) return false;
    if (filters.poleNonPole && row.PoleNonPole !== filters.poleNonPole) return false;
    if (filters.applicantType && row.APPLICANT_TYPE !== filters.applicantType) return false;

    // 4. Search
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const match =
        row.APPL_NO.toLowerCase().includes(q) ||
        row.NAME.toLowerCase().includes(q) ||
        row.PHONE_NO.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });
};

export const fetchConsumerData = async (user: User, filters: HierarchyFilter): Promise<ConsumerData[]> => {
  const allData = await fetchConsumersFromSheet();

  return allData.filter(row => {
    // Note: Consumers sheet doesn't have full hierarchy codes, usually only CCC
    if (user.role === UserRole.CCC && row.ccc_code !== user.ccc_code) return false;

    // UI Hierarchy Filters
    if (filters.ccc && row.ccc_code !== filters.ccc) return false;

    // Search
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const match =
        row.CATEGORY.toLowerCase().includes(q) ||
        row.CONN_STAT.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });
};

export const calculateConsumerKPIs = (data: ConsumerData[]) => {
  const totalCount = data.reduce((s, r) => s + r.COUNT, 0);
  const totalLoad = data.reduce((s, r) => s + r.LOAD, 0);
  const totalSD = data.reduce((s, r) => s + r.SD_LAKH, 0);
  const totalOSD = data.reduce((s, r) => s + r.OSD_LAKH, 0);

  return [
    { label: 'Consumers', value: totalCount.toLocaleString(), trend: 0, icon: 'fa-users', color: 'bg-blue-500' },
    { label: 'Total Load', value: `${totalLoad.toLocaleString()} KW`, trend: 0, icon: 'fa-bolt', color: 'bg-orange-500' },
    { label: 'SD (Lakh)', value: `₹${totalSD.toFixed(2)}`, trend: 0, icon: 'fa-vault', color: 'bg-emerald-500' },
    { label: 'OSD (Lakh)', value: `₹${totalOSD.toFixed(2)}`, trend: 0, icon: 'fa-triangle-exclamation', color: 'bg-rose-500' }
  ];
};

export const fetchDocketData = async (user: User, filters: HierarchyFilter): Promise<DocketData[]> => {
  const allData = await fetchDocketDataFromSheet();

  return allData.filter(row => {
    if (!applyHierarchyRestriction(row, user)) return false;

    if (filters.zone && row.zone_code !== filters.zone) return false;
    if (filters.region && row.region_code !== filters.region) return false;
    if (filters.division && row.division_code !== filters.division) return false;
    if (filters.ccc && row.ccc_code !== filters.ccc) return false;

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const match =
        row.doc_no.toLowerCase().includes(q) ||
        row.PARTY_NAME.toLowerCase().includes(q) ||
        row.con_id.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });
};

export const calculateDocketKPIs = (data: DocketData[]) => {
  const totalDockets = data.length;
  const technicalComplaints = data.filter(d =>
    d.prob_type.toLowerCase().includes('fuse') ||
    d.prob_type.toLowerCase().includes('transformer') ||
    d.prob_type.toLowerCase().includes('breakdown')
  ).length;

  const billingComplaints = data.filter(d =>
    d.prob_type.toLowerCase().includes('bill') ||
    d.prob_type.toLowerCase().includes('payment')
  ).length;

  return [
    { label: 'Total Dockets', value: totalDockets.toLocaleString(), trend: 0, icon: 'fa-ticket', color: 'bg-indigo-600' },
    { label: 'Technical', value: technicalComplaints.toLocaleString(), trend: 0, icon: 'fa-screwdriver-wrench', color: 'bg-rose-600' },
    { label: 'Billing', value: billingComplaints.toLocaleString(), trend: 0, icon: 'fa-file-invoice-dollar', color: 'bg-amber-600' },
    { label: 'Others', value: (totalDockets - technicalComplaints - billingComplaints).toLocaleString(), trend: 0, icon: 'fa-circle-info', color: 'bg-slate-600' }
  ];
};

export const calculateNSCKPIs = (data: PendingNSCData[]) => {
  const totalPending = data.length;
  const avgDelaySC = totalPending > 0 ? data.reduce((s, r) => s + r.DelayInSC, 0) / totalPending : 0;
  const avgDelayWO = totalPending > 0 ? data.reduce((s, r) => s + r.DelayInWO, 0) / totalPending : 0;
  const avgDelayQtn = totalPending > 0 ? data.reduce((s, r) => s + r.DelayInQtn, 0) / totalPending : 0;

  return [
    { label: 'Total Pending', value: totalPending.toLocaleString(), trend: 0, icon: 'fa-hourglass-half', color: 'bg-rose-500' },
    { label: 'Avg SC Delay', value: `${avgDelaySC.toFixed(1)} Days`, trend: 0, icon: 'fa-clock', color: 'bg-orange-500' },
    { label: 'Avg WO Delay', value: `${avgDelayWO.toFixed(1)} Days`, trend: 0, icon: 'fa-briefcase', color: 'bg-blue-500' },
    { label: 'Avg Qtn Delay', value: `${avgDelayQtn.toFixed(1)} Days`, trend: 0, icon: 'fa-file-invoice-dollar', color: 'bg-indigo-500' }
  ];
};

export const fetchFilteredData = async (user: User, filters: HierarchyFilter): Promise<ReportData[]> => {
  let allData = await fetchReportsFromSheet();
  if (allData.length === 0) allData = MOCK_REPORT_DATA;

  return allData.filter(row => {
    if (!applyHierarchyRestriction(row, user)) return false;
    if (filters.zone && row.zone_code !== filters.zone) return false;
    if (filters.region && row.region_code !== filters.region) return false;
    if (filters.division && row.division_code !== filters.division) return false;
    if (filters.ccc && row.ccc_code !== filters.ccc) return false;
    if (filters.dateRange) {
      if (row.date < filters.dateRange.start || row.date > filters.dateRange.end) return false;
    }
    return true;
  });
};

export const calculateKPIs = (data: ReportData[]) => {
  const totalRevenue = data.reduce((sum, r) => sum + r.revenue, 0);
  const totalOrders = data.reduce((sum, r) => sum + r.orders, 0);
  const totalCustomers = data.reduce((sum, r) => sum + r.customers, 0);
  const avgEfficiency = data.length > 0 ? data.reduce((sum, r) => sum + r.efficiency, 0) / data.length : 0;

  return [
    { label: 'Revenue', value: `₹${totalRevenue.toLocaleString()}`, trend: 12, icon: 'fa-indian-rupee-sign', color: 'bg-emerald-500' },
    { label: 'Orders', value: totalOrders.toLocaleString(), trend: -5, icon: 'fa-cart-shopping', color: 'bg-blue-500' },
    { label: 'Active Users', value: totalCustomers.toLocaleString(), trend: 8, icon: 'fa-users', color: 'bg-orange-500' },
    { label: 'Efficiency', value: `${avgEfficiency.toFixed(1)}%`, trend: 2, icon: 'fa-bolt', color: 'bg-purple-500' }
  ];
};

export const fetchCollectionData = async (user: User, filters: HierarchyFilter): Promise<CollectionData[]> => {
  const allData = await fetchCollectionDataFromSheet();

  return allData.filter(row => {
    if (!applyHierarchyRestriction(row, user)) return false;

    if (filters.zone && row.zone_code !== filters.zone) return false;
    if (filters.region && row.region_code !== filters.region) return false;
    if (filters.division && row.division_code !== filters.division) return false;
    if (filters.ccc && row.ccc_code !== filters.ccc) return false;

    return true;
  });
};

export const processCollectionAggregates = (data: CollectionData[]) => {
  const daily: Record<string, { count: number, amount: number }> = {};
  const weekly: Record<string, { count: number, amount: number }> = {};
  const monthly: Record<string, { count: number, amount: number }> = {};
  const fy: Record<string, { count: number, amount: number }> = {};

  data.forEach(item => {
    // Payment Date Parse: YYYYMMDD
    const y = item.PAYMENT_DT.substring(0, 4);
    const m = item.PAYMENT_DT.substring(4, 6);
    const d = item.PAYMENT_DT.substring(6, 8);
    const dateObj = new Date(`${y}-${m}-${d}`);

    if (isNaN(dateObj.getTime())) return;

    const dayKey = `${y}-${m}-${d}`;
    const monthKey = `${y}-${m}`;

    // FY Logic: Apr-Mar
    const year = parseInt(y);
    const month = parseInt(m);
    const fyKey = month >= 4 ? `FY ${year}-${year + 1}` : `FY ${year - 1}-${year}`;

    // Simple Weekly (ISO week approximation or just by day/7)
    const firstDayOfYear = new Date(dateObj.getFullYear(), 0, 1);
    const pastDaysOfYear = (dateObj.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    const weekKey = `${y}-W${weekNumber}`;

    // Aggregates
    [
      { res: daily, key: dayKey },
      { res: weekly, key: weekKey },
      { res: monthly, key: monthKey },
      { res: fy, key: fyKey }
    ].forEach(({ res, key }) => {
      if (!res[key]) res[key] = { count: 0, amount: 0 };
      res[key].count += item.COUNT;
      res[key].amount += item.AMOUNT_PAID;
    });
  });

  const sortAndMap = (obj: Record<string, any>) =>
    Object.entries(obj)
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => a.key.localeCompare(b.key));

  return {
    dailyCount: sortAndMap(daily),
    weeklyCount: sortAndMap(weekly),
    monthlyCount: sortAndMap(monthly),
    fyCount: sortAndMap(fy)
  };
};
