
import { User, UserRole, ReportData, ReportDefinition } from './types';

export const REPORT_CATALOG: ReportDefinition[] = [
  {
    id: 'REP_PENDING_NSC',
    name: 'Pending NSC Status',
    description: 'Track new service connection delays and SCN status.',
    category: 'Operations',
    icon: 'fa-hourglass-start',
    minRole: UserRole.CCC
  },
  {
    id: 'REP_CONSUMERS_SUMMARY',
    name: 'Consumers Summary',
    description: 'Breakdown of consumer base by status, class, and load.',
    category: 'Commercial',
    icon: 'fa-users-viewfinder',
    minRole: UserRole.CCC
  },
  {
    id: 'REP_AUDIT_LOG',
    name: 'System Audit Log',
    description: 'Track user access and critical system activities.',
    category: 'Security',
    icon: 'fa-shield-halved',
    minRole: UserRole.REGION
  },
  {
    id: 'REP_REVENUE_SUMMARY',
    name: 'Revenue Performance',
    description: 'Consolidated revenue vs target analysis across hierarchy.',
    category: 'Analytics',
    icon: 'fa-indian-rupee-sign',
    minRole: UserRole.DIVISION
  },
  {
    id: 'REP_NETWORK_HEALTH',
    name: 'Network Reliability',
    description: 'Outage frequency and duration index (SAIDI/SAIFI).',
    category: 'Operations',
    icon: 'fa-tower-broadcast',
    minRole: UserRole.REGION
  },
  {
    id: 'REP_BILLING_EFFICIENCY',
    name: 'Billing & Collection',
    description: 'Monitoring billing coverage and collection efficiency.',
    category: 'Commercial',
    icon: 'fa-file-invoice',
    minRole: UserRole.CCC
  },
  ...Array.from({ length: 15 }).map((_, i) => ({
    id: `REP_MOCK_${i}`,
    name: `Enterprise Report ${i + 100}`,
    description: `Statistical breakdown of organizational metric ${i + 1}.`,
    category: (['Operations', 'Analytics', 'Commercial', 'Compliance', 'Personnel'] as const)[i % 5],
    icon: 'fa-chart-pie',
    minRole: UserRole.CCC
  }))
];

export const MOCK_USERS: User[] = [
  {
    user_id: 'admin_zone',
    full_name: 'Amitabh Mukherjee',
    mobile_number: '9830012345',
    designation: 'Zonal Head',
    role: UserRole.ZONE,
    office_name: 'Midnapore Zone',
    zone_code: '6600000',
    is_active: true,
    password_hash: '12345'
  },
  {
    user_id: 'reg_manager',
    full_name: 'Sarah Khan',
    mobile_number: '0987654321',
    designation: 'Regional Manager',
    role: UserRole.REGION,
    office_name: 'Burdwan Region',
    zone_code: '6600000',
    region_code: '6610000',
    is_active: true,
    password_hash: '12345'
  },
  {
    user_id: 'dd',
    full_name: 'D. Das',
    mobile_number: '9900011122',
    designation: 'Division Manager',
    role: UserRole.DIVISION,
    office_name: 'Howrah Division',
    zone_code: '6600000',
    region_code: '6610000',
    division_code: '6613000',
    is_active: true,
    password_hash: '12345'
  }
];

const generateMockData = (): ReportData[] => {
  const data: ReportData[] = [];
  const zones = ['6600000'];
  const regions = ['6610000'];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    zones.forEach(z => {
      regions.forEach(r => {
        data.push({
          date: dateStr,
          zone_code: z,
          region_code: r,
          division_code: '6613000',
          ccc_code: '6613001',
          revenue: Math.floor(Math.random() * 10000) + 500,
          orders: Math.floor(Math.random() * 100) + 10,
          customers: Math.floor(Math.random() * 50) + 5,
          efficiency: Math.random() * 100
        });
      });
    });
  }
  return data;
};

export const MOCK_REPORT_DATA = generateMockData();

export const HIERARCHY_MAP = {
  '6600000': {
    '6610000': {
      '6613000': ['6613001', '6613002']
    }
  }
};
