export const MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
] as const;

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function formatEmployeeName(lastName: string, firstName: string): string {
  return `${lastName.trim()}, ${firstName.trim()}`;
}

export function timesheetFileBaseName(
  firstName: string,
  lastName: string,
  month: number,
  year: number,
): string {
  return `${firstName.trim()}_${lastName.trim()}_${MONTH_NAMES[month - 1]}_${year}`;
}

export function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function formatMinutesAsTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Dauer in Stunden inkl. Sommer-/Winterzeit.
 * Nutzt echte lokale Date-Timestamps, damit bei Zeitumstellung
 * automatisch ±1 Stunde berücksichtigt wird.
 */
export function calculateDurationHours(
  start: string,
  end: string,
  year?: number,
  month?: number,
  day?: number,
): number | null {
  const startMin = parseTimeToMinutes(start);
  const endMin = parseTimeToMinutes(end);
  if (startMin === null || endMin === null) return null;

  const y = year ?? new Date().getFullYear();
  const m = month ?? new Date().getMonth() + 1;
  const d = day ?? new Date().getDate();

  const startDate = new Date(y, m - 1, d, Math.floor(startMin / 60), startMin % 60, 0, 0);
  const endDate = new Date(y, m - 1, d, Math.floor(endMin / 60), endMin % 60, 0, 0);
  if (endDate.getTime() <= startDate.getTime()) {
    endDate.setDate(endDate.getDate() + 1);
  }

  const hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}

/**
 * Pause laut Vorgabe:
 * - unter 10 Stunden → 0,5
 * - ab 10 Stunden → 0,75
 */
export function calculatePause(durationHours: number): number | undefined {
  if (durationHours <= 0) return undefined;
  if (durationHours < 10) return 0.5;
  return 0.75;
}

export function formatHours(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '';
  return String(value).replace('.', ',');
}

export function sumDurations(days: { duration: number }[]): number {
  return Math.round(days.reduce((sum, day) => sum + (day.duration || 0), 0) * 100) / 100;
}

export function createEmptyDays(
  year: number,
  month: number,
): { day: number; start?: string; end?: string; duration: number; pause?: number; object?: string }[] {
  const count = daysInMonth(year, month);
  return Array.from({ length: count }, (_, index) => ({
    day: index + 1,
    duration: 0,
  }));
}
