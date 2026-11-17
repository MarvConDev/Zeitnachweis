import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings, Timesheet, UserProfile } from './types';
import { formatEmployeeName } from './utils/time';

const PROFILE_KEY = 'zeitnachweis.profile';
const TIMESHEETS_KEY = 'zeitnachweis.timesheets';
const SETTINGS_KEY = 'zeitnachweis.settings';

const DEFAULT_SETTINGS: AppSettings = { darkMode: false };

export async function loadSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as AppSettings) };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as UserProfile;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

/** Speichert den Namen und aktualisiert ihn in allen Zeitnachweisen. */
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
