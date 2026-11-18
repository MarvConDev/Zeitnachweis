export type DayEntry = {
  day: number;
  start?: string;
  end?: string;
  duration: number;
  pause?: number;
  object?: string;
};

export type Timesheet = {
  id: string;
  year: number;
  month: number;
  employeeName: string;
  days: DayEntry[];
  createdAt: string;
  updatedAt: string;
};

export type UserProfile = {
  firstName: string;
  lastName: string;
  personnelNumber?: string;
};

export type FixedWorkTimes = {
  enabled: boolean;
  start: string;
  end: string;
};

export type MinimumHoursSettings = {
  enabled: boolean;
  hours: number;
};

export type DebugSettings = {
  allowDuplicateMonths: boolean;
};

export type AppSettings = {
  darkMode: boolean;
  fixedWorkTimes: FixedWorkTimes;
  minimumHours: MinimumHoursSettings;
  debug: DebugSettings;
};

export type AppBackup = {
  formatVersion: number;
  appVersion: string;
  exportedAt: string;
  profile: UserProfile | null;
  settings: AppSettings;
  timesheets: Timesheet[];
  recentObjects: string[];
};

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Settings: undefined;
  FixedWorkTimes: undefined;
  RecentObjects: undefined;
  MinimumHours: undefined;
  DebugMenu: undefined;
  Timesheet: { id: string };
  EntryForm: { timesheetId: string; day?: number };
};
