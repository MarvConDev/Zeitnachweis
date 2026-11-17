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

/** Dauer in Stunden; Nachtschicht (Ende vor Beginn) wird über Mitternacht gerechnet. */
export function calculateDurationHours(start: string, end: string): number | null {
  const startMin = parseTimeToMinutes(start);
  const endMin = parseTimeToMinutes(end);
  if (startMin === null || endMin === null) return null;

  let diff = endMin - startMin;
  if (diff <= 0) diff += 24 * 60;
  return Math.round((diff / 60) * 100) / 100;
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

export function createEmptyDays(year: number, month: number) {
  const count = daysInMonth(year, month);
  return Array.from({ length: count }, (_, index) => ({
    day: index + 1,
    duration: 0,
  }));
}
