
import { User, UserRole, ReportData, PendingNSCData, AuditEntry, ConsumerData, DocketData } from '../types';

const USERS_SHEET_ID = '1rWw9wrbuAduKThCd4tRLzfpULWedyGmQNnHeAmUQSR4';
const NSC_SHEET_ID = '1jP1fPkntRCuUL7YNRrcrvB-Mm_c-5etcMEPa_1nQm40';
const CONSUMERS_SHEET_ID = '1_56xJru04Y_Hv4yybMZ79XUmNAajcF8OV-hSISUDR00';
const DOCKET_SHEET_ID = '1FcCzii1tB66sbw9AXrOd-rW3i-IsZVjG4Hhb2Jtev5c';

// Web App URL for writing data back to Google Sheets
const LOGS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbz_Placeholder_URL/exec';

const getExportUrl = (sheetId: string, gid: string = '0') =>
  `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

const parseCSV = (csv: string): any[] => {
  if (!csv) return [];
  const lines = csv.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  return lines.slice(1).map(line => {
    const values = (line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=^)(?=,)|(?<=,)(?=$))/g) || [])
      .map(v => v.trim().replace(/^"|"$/g, ''));

    const obj: any = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] || '';
    });
    return obj;
  }).filter(o => Object.keys(o).length > 0 && o[headers[0]]);
};

const getValue = (row: any, key: string) => {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  const actualKey = Object.keys(row).find(k =>
    k.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedKey
  );
  return actualKey ? row[actualKey] : undefined;
};

/**
 * Fetches a map of all codes to their descriptive office names
 */
export const fetchOfficeMapping = async (): Promise<Record<string, string>> => {
  try {
    const response = await fetch(getExportUrl(USERS_SHEET_ID, '0'));
    if (!response.ok) return {};
    const csvData = await response.text();
    const rawData = parseCSV(csvData);

    const map: Record<string, string> = {};
    rawData.forEach(row => {
      const name = getValue(row, 'office_name') || getValue(row, 'office');
      if (!name) return;

      const codes = [
        getValue(row, 'zone_code'),
        getValue(row, 'region_code'),
        getValue(row, 'division_code'),
        getValue(row, 'ccc_code')
      ].filter(Boolean);

      codes.forEach(code => {
        if (code) map[String(code)] = name;
      });
    });
    return map;
  } catch (error) {
    console.error('Error fetching office mapping:', error);
    return {};
  }
};

export const fetchUsersFromSheet = async (): Promise<User[]> => {
  try {
    const response = await fetch(getExportUrl(USERS_SHEET_ID, '0'));
    if (!response.ok) throw new Error('Failed to fetch user sheet');
    const csvData = await response.text();
    const rawData = parseCSV(csvData);

    return rawData.map(row => {
      const rawIsActive = getValue(row, 'is_active');
      const isActive = (
        rawIsActive === undefined ||
        rawIsActive === '' ||
        rawIsActive === 'TRUE' ||
        rawIsActive === 'true' ||
        rawIsActive === '1' ||
        rawIsActive === 'Y'
      );

      return {
        user_id: String(getValue(row, 'user_id')),
        password_hash: String(getValue(row, 'password_hash')),
        full_name: getValue(row, 'full_name') || getValue(row, 'user_id') || 'Unknown User',
        mobile_number: getValue(row, 'mobile_number') || 'N/A',
        designation: getValue(row, 'designation') || 'Staff',
        role: (getValue(row, 'role') as UserRole) || UserRole.CCC,
        office_name: getValue(row, 'office_name') || getValue(row, 'office'),
        zone_code: getValue(row, 'zone_code'),
        region_code: getValue(row, 'region_code'),
        division_code: getValue(row, 'division_code'),
        ccc_code: getValue(row, 'ccc_code'),
        is_active: isActive
      };
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

export const logAudit = async (entry: Partial<AuditEntry>) => {
  const payload = {
    timestamp: new Date().toISOString(),
    user_id: entry.user_id,
    action: entry.action || 'LOGIN',
    office: entry.office || 'N/A',
    details: entry.details || 'System Access',
    status: entry.status || 'SUCCESS'
  };

  try {
    await fetch(LOGS_WEBAPP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Failed to write to Audit Log sheet:', error);
  }
};

export const fetchAuditLogsFromSheet = async (): Promise<AuditEntry[]> => {
  try {
    const response = await fetch(getExportUrl(USERS_SHEET_ID, '2'));
    if (!response.ok) return [];
    const csvData = await response.text();
    const rawData = parseCSV(csvData);

    return rawData.map(row => ({
      timestamp: getValue(row, 'timestamp'),
      user_id: getValue(row, 'user_id'),
      action: getValue(row, 'action'),
      office: getValue(row, 'office'),
      details: getValue(row, 'details'),
      status: (getValue(row, 'status') as 'SUCCESS' | 'FAILED' | 'INFO') || 'INFO'
    })).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
};

export const fetchPendingNSCFromSheet = async (): Promise<PendingNSCData[]> => {
  try {
    const response = await fetch(getExportUrl(NSC_SHEET_ID, '0'));
    if (!response.ok) throw new Error('Failed to fetch NSC sheet');
    const csvData = await response.text();
    const rawData = parseCSV(csvData);

    return rawData.map(row => ({
      date: getValue(row, 'date'),
      zone_code: getValue(row, 'zone_code'),
      region_code: getValue(row, 'region_code'),
      division_code: getValue(row, 'division_code'),
      ccc_code: getValue(row, 'ccc_code'),
      REGION: getValue(row, 'REGION'),
      DIVN_NAME: getValue(row, 'DIVN_NAME'),
      SUPP_OFF: getValue(row, 'SUPP_OFF'),
      APPL_NO: getValue(row, 'APPL_NO'),
      CREATION_DATE: getValue(row, 'CREATION_DATE'),
      CON_ID: getValue(row, 'CON_ID'),
      NAME: getValue(row, 'NAME'),
      PHONE_NO: getValue(row, 'PHONE_NO'),
      ADDRESS: getValue(row, 'ADDRESS'),
      APPLICANT_TYPE: getValue(row, 'APPLICANT_TYPE'),
      CONN_CLASS: getValue(row, 'CONN_CLASS'),
      CONN_CAT: getValue(row, 'CONN_CAT'),
      CONN_TYPE: getValue(row, 'CONN_TYPE'),
      AGENCY_NAME: getValue(row, 'AGENCY_NAME'),
      METER_NUMBER: getValue(row, 'METER_NUMBER'),
      IS_DUARE_SARKAR: getValue(row, 'IS_DUARE_SARKAR'),
      IS_PORTAL_APPL: getValue(row, 'IS_PORTAL_APPL'),
      DelayRange: getValue(row, 'DelayRange'),
      PoleNonPole: getValue(row, 'PoleNonPole'),
      DelayInWO: parseFloat(getValue(row, 'DelayInWO')) || 0,
      DelayInSC: parseFloat(getValue(row, 'DelayInSC')) || 0,
      DelayInQtn: parseFloat(getValue(row, 'DelayInQtn')) || 0,
      SCN_STATUS: getValue(row, 'SCN_STATUS'),
      INSPECTION_COMMENT: getValue(row, 'INSPECTION_COMMENT')
    }));
  } catch (error) {
    console.error('Error fetching Pending NSC:', error);
    return [];
  }
};

export const fetchConsumersFromSheet = async (): Promise<ConsumerData[]> => {
  try {
    const response = await fetch(getExportUrl(CONSUMERS_SHEET_ID, '0'));
    if (!response.ok) throw new Error('Failed to fetch Consumers sheet');
    const csvData = await response.text();
    const rawData = parseCSV(csvData);

    return rawData.map(row => ({
      date: getValue(row, 'date'),
      ccc_code: getValue(row, 'ccc_code'),
      CONN_STAT: getValue(row, 'CONN_STAT'),
      BASE_CLASS: getValue(row, 'BASE_CLASS'),
      CATEGORY: getValue(row, 'CATEGORY'),
      TYPE_OF_METER: getValue(row, 'TYPE_OF_METER'),
      CONN_PHASE: getValue(row, 'CONN_PHASE'),
      GOVT_STAT: getValue(row, 'GOVT_STAT'),
      TIME_OF_DAY: getValue(row, 'TIME_OF_DAY'),
      CONN_BY: getValue(row, 'CONN_BY'),
      COUNT: parseInt(getValue(row, 'COUNT')) || 0,
      LOAD: parseFloat(getValue(row, 'LOAD')) || 0,
      SD_LAKH: parseFloat(getValue(row, 'SD_LAKH')) || 0,
      OSD_LAKH: parseFloat(getValue(row, 'OSD_LAKH')) || 0
    }));
  } catch (error) {
    console.error('Error fetching Consumers:', error);
    return [];
  }
};

export const fetchReportsFromSheet = async (): Promise<ReportData[]> => {
  try {
    const response = await fetch(getExportUrl(USERS_SHEET_ID, '1'));
    if (!response.ok) return [];
    const csvData = await response.text();
    const rawData = parseCSV(csvData);

    return rawData.map(row => ({
      date: getValue(row, 'date'),
      zone_code: getValue(row, 'zone_code'),
      region_code: getValue(row, 'region_code'),
      division_code: getValue(row, 'division_code'),
      ccc_code: getValue(row, 'ccc_code'),
      revenue: parseFloat(getValue(row, 'revenue')) || 0,
      orders: parseInt(getValue(row, 'orders')) || 0,
      customers: parseInt(getValue(row, 'customers')) || 0,
      efficiency: parseFloat(getValue(row, 'efficiency')) || 0
    }));
  } catch (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
};

export const fetchDocketDataFromSheet = async (): Promise<DocketData[]> => {
  try {
    const response = await fetch(getExportUrl(DOCKET_SHEET_ID, '0'));
    if (!response.ok) throw new Error('Failed to fetch Docket sheet');
    const csvData = await response.text();
    const rawData = parseCSV(csvData);

    return rawData.map(row => ({
      date: getValue(row, 'date'),
      zone_code: getValue(row, 'zone_code'),
      region_code: getValue(row, 'region_code'),
      division_code: getValue(row, 'division_code'),
      ccc_code: getValue(row, 'ccc_code'),
      doc_no: getValue(row, 'doc_no'),
      con_id: getValue(row, 'con_id'),
      PARTY_NAME: getValue(row, 'PARTY_NAME'),
      Mob_No: getValue(row, 'Mob_No'),
      addr: getValue(row, 'addr'),
      prob_type: getValue(row, 'prob_type'),
      DESCRIPTION: getValue(row, 'DESCRIPTION'),
      doc_crn_dt: getValue(row, 'doc_crn_dt')
    }));
  } catch (error) {
    console.error('Error fetching Docket Data:', error);
    return [];
  }
};
