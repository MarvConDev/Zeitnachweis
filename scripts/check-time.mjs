function parseTimeToMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function calculateDurationHours(start, end, year, month, day) {
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

  return Math.round(((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)) * 100) / 100;
}

function calculatePause(durationHours) {
  if (durationHours <= 0) return undefined;
  if (durationHours < 10) return 0.5;
  return 0.75;
}

const cases = [
  ['20:00', '08:00', 2026, 1, 15, 12, 0.75],
  ['21:30', '00:30', 2026, 1, 15, 3, 0.5],
  ['08:00', '16:00', 2026, 1, 15, 8, 0.5],
  ['08:00', '18:00', 2026, 1, 15, 10, 0.75],
  // Winterzeit-Umstellung 2026-10-25: 02:00 → 03:00 zurück
  ['20:00', '08:00', 2026, 10, 24, 13, 0.75],
  // Sommerzeit-Umstellung 2026-03-29: 02:00 → 03:00 vor
  ['20:00', '08:00', 2026, 3, 28, 11, 0.75],
];

let failed = 0;
for (const [start, end, year, month, day, expectedDuration, expectedPause] of cases) {
  const duration = calculateDurationHours(start, end, year, month, day);
  const pause = calculatePause(duration);
  const ok = duration === expectedDuration && pause === expectedPause;
  console.log(
    `${year}-${month}-${day} ${start}-${end} => ${duration}h pause ${pause} ${ok ? 'OK' : 'FAIL'}`,
  );
  if (!ok) failed += 1;
}
process.exit(failed ? 1 : 0);
