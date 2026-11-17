function parseTimeToMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function calculateDurationHours(start, end) {
  const startMin = parseTimeToMinutes(start);
  const endMin = parseTimeToMinutes(end);
  if (startMin === null || endMin === null) return null;
  let diff = endMin - startMin;
  if (diff <= 0) diff += 24 * 60;
  return Math.round((diff / 60) * 100) / 100;
}

function calculatePause(durationHours) {
  if (durationHours <= 0) return undefined;
  if (durationHours < 10) return 0.5;
  return 0.75;
}

const cases = [
  ['20:00', '08:00', 12, 0.75],
  ['21:30', '00:30', 3, 0.5],
  ['08:00', '16:00', 8, 0.5],
  ['08:00', '18:00', 10, 0.75],
];

let failed = 0;
for (const [start, end, expectedDuration, expectedPause] of cases) {
  const duration = calculateDurationHours(start, end);
  const pause = calculatePause(duration);
  const ok = duration === expectedDuration && pause === expectedPause;
  console.log(`${start}-${end} => ${duration}h pause ${pause} ${ok ? 'OK' : 'FAIL'}`);
  if (!ok) failed += 1;
}
process.exit(failed ? 1 : 0);
