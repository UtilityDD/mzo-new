
export enum UserRole {
  ZONE = 'ZONE',
  REGION = 'REGION',
  DIVISION = 'DIVISION',
  CCC = 'CCC'
}

export type ReportCategory = 'Operations' | 'Analytics' | 'Commercial' | 'Compliance' | 'Personnel' | 'Security';

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  icon: string;
  minRole: UserRole;
  isFavorite?: boolean;
}

export interface User {
  user_id: string;
  password_hash?: string;
  full_name: string;
  mobile_number: string;
  designation: string;
  role: UserRole;
  office_name?: string;
  zone_code?: string;
  region_code?: string;
  division_code?: string;
  ccc_code?: string;
  is_active: boolean;
}

export interface AuditEntry {
  timestamp: string;
  user_id: string;
  action: string;
  office: string;
  details: string;
  status: 'SUCCESS' | 'FAILED' | 'INFO';
}

export interface ReportData {
  date: string;
  zone_code: string;
  region_code: string;
  division_code: string;
  ccc_code: string;
  revenue: number;
  orders: number;
  customers: number;
  efficiency: number;
}

export interface PendingNSCData {
  date: string;
  zone_code: string;
  region_code: string;
  division_code: string;
  ccc_code: string;
  REGION: string;
  DIVN_NAME: string;
  SUPP_OFF: string;
  APPL_NO: string;
  CREATION_DATE: string;
  CON_ID: string;
  NAME: string;
  PHONE_NO: string;
  ADDRESS: string;
  APPLICANT_TYPE: string;
  CONN_CLASS: string;
  CONN_CAT: string;
  CONN_TYPE: string;
  AGENCY_NAME: string;
  METER_NUMBER: string;
  IS_DUARE_SARKAR: string;
  IS_PORTAL_APPL: string;
  DelayRange: string;
  PoleNonPole: string;
  DelayInWO: number;
  DelayInSC: number;
  DelayInQtn: number;
  SCN_STATUS: string;
  INSPECTION_COMMENT?: string;
}

export interface ConsumerData {
  date: string;
  ccc_code: string;
  CONN_STAT: string;
  BASE_CLASS: string;
  CATEGORY: string;
  TYPE_OF_METER: string;
  CONN_PHASE: string;
  GOVT_STAT: string;
  TIME_OF_DAY: string;
  CONN_BY: string;
  COUNT: number;
  LOAD: number;
  SD_LAKH: number;
  OSD_LAKH: number;
}

export interface DocketData {
  date: string;
  zone_code: string;
  region_code: string;
  division_code: string;
  ccc_code: string;
  doc_no: string;
  con_id: string;
  PARTY_NAME: string;
  Mob_No: string;
  addr: string;
  prob_type: string;
  DESCRIPTION: string;
  doc_crn_dt: string;
}

export interface HierarchyFilter {
  zone?: string;
  region?: string;
  division?: string;
  ccc?: string;
  dateRange?: { start: string; end: string };
  delayRange?: string;
  poleNonPole?: string;
  applicantType?: string;
  searchQuery?: string;
}

export interface KPIData {
  label: string;
  value: string | number;
  trend: number;
  icon: string;
  color: string;
}
