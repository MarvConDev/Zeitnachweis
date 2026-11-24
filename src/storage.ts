import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AppBackup,
  AppSettings,
  DebugSettings,
  FixedWorkTimes,
  MinimumHoursSettings,
  Timesheet,
  UserProfile,
} from './types';
import { formatEmployeeName } from './utils/time';
import { APP_VERSION } from './version';

const PROFILE_KEY = 'zeitnachweis.profile';
const TIMESHEETS_KEY = 'zeitnachweis.timesheets';
const SETTINGS_KEY = 'zeitnachweis.settings';
const RECENT_OBJECTS_KEY = 'zeitnachweis.recentObjects';

const DEFAULT_FIXED_WORK_TIMES: FixedWorkTimes = {
  enabled: false,
  start: '20:00',
  end: '08:00',
};

const DEFAULT_MINIMUM_HOURS: MinimumHoursSettings = {
  enabled: false,
  hours: 160,
};

const DEFAULT_DEBUG: DebugSettings = {
  allowDuplicateMonths: false,
};

export const DEFAULT_SETTINGS: AppSettings = {
  darkMode: false,
  showWeekdayLabels: false,
  fixedWorkTimes: DEFAULT_FIXED_WORK_TIMES,
  minimumHours: DEFAULT_MINIMUM_HOURS,
  debug: DEFAULT_DEBUG,
};

const MAX_RECENT_OBJECTS = 12;
const BACKUP_FORMAT_VERSION = 1;

function normalizeSettings(raw: Partial<AppSettings> | null | undefined): AppSettings {
  return {
    darkMode: Boolean(raw?.darkMode),
    showWeekdayLabels: Boolean(raw?.showWeekdayLabels),
    fixedWorkTimes: {
      ...DEFAULT_FIXED_WORK_TIMES,
      ...(raw?.fixedWorkTimes ?? {}),
    },
    minimumHours: {
      ...DEFAULT_MINIMUM_HOURS,
      ...(raw?.minimumHours ?? {}),
    },
    debug: {
      ...DEFAULT_DEBUG,
      ...(raw?.debug ?? {}),
    },
  };
}

export async function loadSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS, fixedWorkTimes: { ...DEFAULT_FIXED_WORK_TIMES }, minimumHours: { ...DEFAULT_MINIMUM_HOURS }, debug: { ...DEFAULT_DEBUG } };
  return normalizeSettings(JSON.parse(raw) as Partial<AppSettings>);
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)));
}

export async function updateSettings(
  patch: Partial<AppSettings> | ((current: AppSettings) => AppSettings),
): Promise<AppSettings> {
  const current = await loadSettings();
  const next = typeof patch === 'function' ? patch(current) : normalizeSettings({ ...current, ...patch });
  await saveSettings(next);
  return next;
}

export async function loadProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as UserProfile;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function updateProfileName(profile: UserProfile): Promise<void> {
  await saveProfile(profile);
  const employeeName = formatEmployeeName(profile.lastName, profile.firstName);
  const list = await loadTimesheets();
  const updated = list.map((item) => ({
    ...item,
    employeeName,
    updatedAt: new Date().toISOString(),
  }));
  await saveTimesheets(updated);
}

export async function loadTimesheets(): Promise<Timesheet[]> {
  const raw = await AsyncStorage.getItem(TIMESHEETS_KEY);
  if (!raw) return [];
  const list = JSON.parse(raw) as Timesheet[];
  return list.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
}

export async function saveTimesheets(timesheets: Timesheet[]): Promise<void> {
  await AsyncStorage.setItem(TIMESHEETS_KEY, JSON.stringify(timesheets));
}

export async function getTimesheet(id: string): Promise<Timesheet | null> {
  const list = await loadTimesheets();
  return list.find((item) => item.id === id) ?? null;
}

export async function upsertTimesheet(timesheet: Timesheet): Promise<void> {
  const list = await loadTimesheets();
  const index = list.findIndex((item) => item.id === timesheet.id);
  if (index >= 0) {
    list[index] = timesheet;
  } else {
    list.push(timesheet);
  }
  await saveTimesheets(list);
}

export async function deleteTimesheet(id: string): Promise<void> {
  const list = await loadTimesheets();
  await saveTimesheets(list.filter((item) => item.id !== id));
}

export async function loadRecentObjects(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(RECENT_OBJECTS_KEY);
  if (!raw) return [];
  const list = JSON.parse(raw) as string[];
  return Array.isArray(list) ? list.filter((item) => typeof item === 'string' && item.trim()) : [];
}

export async function saveRecentObjects(objects: string[]): Promise<void> {
  const cleaned = objects.map((item) => item.trim()).filter(Boolean);
  await AsyncStorage.setItem(RECENT_OBJECTS_KEY, JSON.stringify(cleaned.slice(0, MAX_RECENT_OBJECTS)));
}

export async function rememberObject(value: string): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) return;
  const existing = await loadRecentObjects();
  const next = [trimmed, ...existing.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(
    0,
    MAX_RECENT_OBJECTS,
  );
  await saveRecentObjects(next);
}

export async function removeRecentObject(value: string): Promise<string[]> {
  const existing = await loadRecentObjects();
  const next = existing.filter((item) => item.toLowerCase() !== value.trim().toLowerCase());
  await saveRecentObjects(next);
  return next;
}

export async function createBackup(): Promise<AppBackup> {
  const [profile, settings, timesheets, recentObjects] = await Promise.all([
    loadProfile(),
    loadSettings(),
    loadTimesheets(),
    loadRecentObjects(),
  ]);

  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    profile,
    settings,
    timesheets,
    recentObjects,
  };
}

export async function restoreBackup(backup: AppBackup): Promise<void> {
  if (!backup || typeof backup !== 'object') {
    throw new Error('Ungültige Backup-Datei.');
  }
  if (!Array.isArray(backup.timesheets)) {
    throw new Error('Backup enthält keine Zeitnachweise.');
  }

  if (backup.profile) {
    await saveProfile(backup.profile);
  }
  if (backup.settings) {
    await saveSettings(normalizeSettings(backup.settings));
  }
  await saveTimesheets(backup.timesheets);
  await saveRecentObjects(Array.isArray(backup.recentObjects) ? backup.recentObjects : []);
}

export async function resetAppData(): Promise<void> {
  await AsyncStorage.multiRemove([
    PROFILE_KEY,
    TIMESHEETS_KEY,
    SETTINGS_KEY,
    RECENT_OBJECTS_KEY,
  ]);
}

export async function getStorageStats(): Promise<{
  timesheets: number;
  filledDays: number;
  recentObjects: number;
  hasProfile: boolean;
}> {
  const [timesheets, recentObjects, profile] = await Promise.all([
    loadTimesheets(),
    loadRecentObjects(),
    loadProfile(),
  ]);
  const filledDays = timesheets.reduce(
    (sum, sheet) =>
      sum +
      sheet.days.filter((day) => Boolean(day.start || day.end || day.object || day.duration)).length,
    0,
  );
  return {
    timesheets: timesheets.length,
    filledDays,
    recentObjects: recentObjects.length,
    hasProfile: Boolean(profile),
  };
}
