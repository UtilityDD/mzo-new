
import { User, UserRole, ReportData, PendingNSCData, AuditEntry, ConsumerData, DocketData, CollectionData } from '../types';

const USERS_SHEET_ID = '1rWw9wrbuAduKThCd4tRLzfpULWedyGmQNnHeAmUQSR4';
const NSC_SHEET_ID = '1jP1fPkntRCuUL7YNRrcrvB-Mm_c-5etcMEPa_1nQm40';
const CONSUMERS_SHEET_ID = '1_56xJru04Y_Hv4yybMZ79XUmNAajcF8OV-hSISUDR00';
const DOCKET_SHEET_ID = '1FcCzii1tB66sbw9AXrOd-rW3i-IsZVjG4Hhb2Jtev5c';
const COLLECTION_SHEET_ID = 'PLACEHOLDER_COLLECTION_SHEET_ID'; // Awaiting User Input

// Web App URL for writing data back to Google Sheets
const LOGS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbz_Placeholder_URL/exec';

const CACHE_KEYS = {
  USERS: 'mzo_cache_users',
  NSC: 'mzo_cache_nsc',
  CONSUMERS: 'mzo_cache_consumers',
  REPORTS: 'mzo_cache_reports',
  DOCKETS: 'mzo_cache_dockets',
  COLLECTION: 'mzo_cache_collection',
  MAPPING: 'mzo_cache_mapping'
};

const getExportUrl = (sheetId: string, gid: string = '0', range?: string) =>
  `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}${range ? `&range=${range}` : ''}`;

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

// --- Caching Helpers ---

const setCache = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.warn('LocalStorage quota exceeded. Attempting to clear older caches...', key);
      try {
        // Clear all MZO caches except the current one if we're trying to save a big one
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('mzo_cache_') && k !== key) {
            localStorage.removeItem(k);
          }
        });
        // Retry one time
        localStorage.setItem(key, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
        console.log('Successfully saved to cache after clearing space:', key);
      } catch (retryError) {
        console.error('Failed to save to cache even after clearing space:', key, retryError);
      }
    } else {
      console.warn('Failed to save to cache:', key, e);
    }
  }
};

const getCache = <T>(key: string): T | null => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    return JSON.parse(item).data as T;
  } catch (e) {
    return null;
  }
};

/**
 * Silently checks if the data on the sheet has changed by comparing the first data row's date.
 */
const syncSheetBackground = async (sheetId: string, gid: string, cacheKey: string) => {
  try {
    // Try to fetch only headers + first data row (approx range A1:Z2)
    const response = await fetch(getExportUrl(sheetId, gid, 'A1:Z2'));
    if (!response.ok) return;
    const csvData = await response.text();
    const rows = parseCSV(csvData);
    if (rows.length === 0) return;

    const latestDate = getValue(rows[0], 'date') || getValue(rows[0], 'DATE');
    const cachedData = getCache<any[]>(cacheKey);
    const cachedFirstRowDate = cachedData && cachedData.length > 0 ? (getValue(cachedData[0], 'date') || getValue(cachedData[0], 'DATE')) : null;

    if (String(latestDate) !== String(cachedFirstRowDate)) {
      console.log(`[Sync] Change detected in ${cacheKey}. Fetching full data...`);
      const fullResponse = await fetch(getExportUrl(sheetId, gid));
      if (fullResponse.ok) {
        const fullCsv = await fullResponse.text();
        const fullData = parseCSV(fullCsv);
        setCache(cacheKey, fullData);
        // Dispatch an event to notify components that data has updated
        window.dispatchEvent(new CustomEvent('mzo-data-updated', { detail: { cacheKey } }));
      }
    }
  } catch (error) {
    console.error(`[Sync] Error syncing ${cacheKey}:`, error);
  }
};

export const performFullBackgroundSync = async () => {
  console.log('[Sync] Starting full background sync...');
  await Promise.allSettled([
    syncSheetBackground(NSC_SHEET_ID, '0', CACHE_KEYS.NSC),
    syncSheetBackground(CONSUMERS_SHEET_ID, '0', CACHE_KEYS.CONSUMERS),
    syncSheetBackground(USERS_SHEET_ID, '1', CACHE_KEYS.REPORTS),
    syncSheetBackground(DOCKET_SHEET_ID, '0', CACHE_KEYS.DOCKETS),
    syncSheetBackground(COLLECTION_SHEET_ID, '0', CACHE_KEYS.COLLECTION),
    syncSheetBackground(USERS_SHEET_ID, '0', CACHE_KEYS.USERS)
  ]);
  console.log('[Sync] Full background sync completed.');
};

// --- Exported Fetch Functions ---

/**
 * Fetches a map of all codes to their descriptive office names
 */
export const fetchOfficeMapping = async (): Promise<Record<string, string>> => {
  const cached = getCache<Record<string, string>>(CACHE_KEYS.MAPPING);
  if (cached) return cached;

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
    setCache(CACHE_KEYS.MAPPING, map);
    return map;
  } catch (error) {
    console.error('Error fetching office mapping:', error);
    return {};
  }
};

export const fetchUsersFromSheet = async (): Promise<User[]> => {
  const cached = getCache<User[]>(CACHE_KEYS.USERS);
  if (cached) return cached;

  try {
    const response = await fetch(getExportUrl(USERS_SHEET_ID, '0'));
    if (!response.ok) throw new Error('Failed to fetch user sheet');
    const csvData = await response.text();
    const rawData = parseCSV(csvData);

    const users = rawData.map(row => {
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
    setCache(CACHE_KEYS.USERS, users);
    return users;
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
  const cached = getCache<any>(CACHE_KEYS.NSC);

  // Handle compact storage format (array of arrays)
  if (cached) {
    if (Array.isArray(cached) && cached.length > 0 && Array.isArray(cached[0])) {
      const [headers, ...rows] = cached;
      return rows.map(row => {
        const obj: any = {};
        headers.forEach((h: string, i: number) => obj[h] = row[i]);
        return obj as PendingNSCData;
      });
    }
    return cached as PendingNSCData[];
  }

  try {
    const response = await fetch(getExportUrl(NSC_SHEET_ID, '0'));
    if (!response.ok) throw new Error('Failed to fetch NSC sheet');
    const csvData = await response.text();
    const rawData = parseCSV(csvData);

    const data = rawData.map(row => ({
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
      DelaySerial: parseInt(getValue(row, 'DelaySerial')) || 0,
      SCN_STATUS: getValue(row, 'SCN_STATUS'),
      WO_ISSUED: getValue(row, 'WO_ISSUED'),
      INSPECTION_COMMENT: getValue(row, 'INSPECTION_COMMENT'),
      SUPP_OFFLOAD_WATTS: parseFloat(getValue(row, 'LOAD_WATTS')) || parseFloat(getValue(row, 'SUPP_OFFLOAD_WATTS')) || 0,
      APPLIED_PHASE: getValue(row, 'APPLIED_PHASE'),
      NO_OF_POLES: parseInt(getValue(row, 'NO_OF_POLES')) || 0
    }));

    // Convert to compact format before caching if it's a large dataset
    if (data.length > 500) {
      const headers = Object.keys(data[0]);
      const compactData = [headers, ...data.map(obj => headers.map(h => (obj as any)[h]))];
      setCache(CACHE_KEYS.NSC, compactData);
    } else {
      setCache(CACHE_KEYS.NSC, data);
    }

    return data;
  } catch (error) {
    console.error('Error fetching Pending NSC:', error);
    return [];
  }
};

export const fetchConsumersFromSheet = async (): Promise<ConsumerData[]> => {
  const cached = getCache<ConsumerData[]>(CACHE_KEYS.CONSUMERS);
  if (cached) return cached;

  try {
    const response = await fetch(getExportUrl(CONSUMERS_SHEET_ID, '0'));
    if (!response.ok) throw new Error('Failed to fetch Consumers sheet');
    const csvData = await response.text();
    const rawData = parseCSV(csvData);

    const data = rawData.map(row => ({
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
    setCache(CACHE_KEYS.CONSUMERS, data);
    return data;
  } catch (error) {
    console.error('Error fetching Consumers:', error);
    return [];
  }
};

export const fetchReportsFromSheet = async (): Promise<ReportData[]> => {
  const cached = getCache<ReportData[]>(CACHE_KEYS.REPORTS);
  if (cached) return cached;

  try {
    const response = await fetch(getExportUrl(USERS_SHEET_ID, '1'));
    if (!response.ok) return [];
    const csvData = await response.text();
    const rawData = parseCSV(csvData);

    const data = rawData.map(row => ({
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
    setCache(CACHE_KEYS.REPORTS, data);
    return data;
  } catch (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
};

export const fetchDocketDataFromSheet = async (): Promise<DocketData[]> => {
  const cached = getCache<DocketData[]>(CACHE_KEYS.DOCKETS);
  if (cached) return cached;

  try {
    const response = await fetch(getExportUrl(DOCKET_SHEET_ID, '0'));
    if (!response.ok) throw new Error('Failed to fetch Docket sheet');
    const csvData = await response.text();
    const rawData = parseCSV(csvData);

    const data = rawData.map(row => ({
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
    setCache(CACHE_KEYS.DOCKETS, data);
    return data;
  } catch (error) {
    console.error('Error fetching Docket Data:', error);
    return [];
  }
};

export const fetchCollectionDataFromSheet = async (): Promise<CollectionData[]> => {
  const cached = getCache<CollectionData[]>(CACHE_KEYS.COLLECTION);
  if (cached) return cached;

  try {
    const response = await fetch(getExportUrl(COLLECTION_SHEET_ID, '0'));
    if (!response.ok) throw new Error('Failed to fetch Collection sheet');
    const csvData = await response.text();
    const rawData = parseCSV(csvData);

    const data = rawData.map(row => ({
      date: getValue(row, 'date'),
      zone_code: getValue(row, 'zone_code'),
      region_code: getValue(row, 'region_code'),
      division_code: getValue(row, 'division_code'),
      PAYMENT_DT: String(getValue(row, 'PAYMENT_DT')),
      ccc_code: getValue(row, 'ccc_code'),
      MODE: getValue(row, 'MODE'),
      COUNT: parseInt(getValue(row, 'COUNT')) || 0,
      AMOUNT_PAID: parseFloat(getValue(row, 'AMOUNT PAID')) || parseFloat(getValue(row, 'AMOUNT_PAID')) || 0
    }));
    setCache(CACHE_KEYS.COLLECTION, data);
    return data;
  } catch (error) {
    console.error('Error fetching Collection Data:', error);
    return [];
  }
};

