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
};

export type AppSettings = {
  darkMode: boolean;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Settings: undefined;
  Timesheet: { id: string };
  EntryForm: { timesheetId: string; day?: number };
};
