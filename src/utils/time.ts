import type { HourBucket, ShiftDefinition, ShiftOption } from '../types';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function istDateTimeToUtcMs(date: string, hhmm: string, addDays = 0) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = hhmm.split(':').map(Number);
  return Date.UTC(year, month - 1, day + addDays, hour, minute) - IST_OFFSET_MS;
}

export function utcMsToIstParts(ms: number) {
  const date = new Date(ms + IST_OFFSET_MS);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  };
}

const pad = (value: number) => String(value).padStart(2, '0');

export function formatIstDate(ms: number) {
  const p = utcMsToIstParts(ms);
  return `${pad(p.day)}-${pad(p.month)}-${p.year}`;
}

export function formatIstTime(ms: number, withSeconds = false) {
  const p = utcMsToIstParts(ms);
  return `${pad(p.hour)}:${pad(p.minute)}${withSeconds ? `:${pad(p.second)}` : ''}`;
}

export function formatIstDateTime(ms: number) {
  const p = utcMsToIstParts(ms);
  return `${pad(p.day)} ${monthName(p.month)}, ${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
}

export function toIsoUtc(ms: number) {
  return new Date(ms).toISOString().replace('.000Z', 'Z');
}

export function monthName(month: number) {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1];
}

export function buildShiftOptions(shifts: ShiftDefinition[]): ShiftOption[] {
  return shifts
    .filter((shift) => shift.is_active && shift.shift_timings.length > 0)
    .flatMap((shift) =>
      shift.shift_timings.map((start, index) => {
        const end = shift.shift_timings[(index + 1) % shift.shift_timings.length];
        return {
          shiftId: shift.id,
          start,
          end,
          label: `${shift.name} (${start} - ${end})`,
        };
      }),
    );
}

export function buildShiftWindow(date: string, option: ShiftOption) {
  const startMs = istDateTimeToUtcMs(date, option.start);
  const crossesMidnight = option.end <= option.start;
  const endMs = istDateTimeToUtcMs(date, option.end, crossesMidnight ? 1 : 0);
  return { fromMs: startMs, toMs: endMs, from_ts: toIsoUtc(startMs), to_ts: toIsoUtc(endMs) };
}

export function buildHourBuckets(fromMs: number, toMs: number): HourBucket[] {
  const now = Date.now();
  const buckets: HourBucket[] = [];
  let cursor = fromMs;

  while (cursor < toMs) {
    const next = Math.min(nextIstClockHourMs(cursor), toMs);
    buckets.push({
      key: String(cursor),
      label: `${formatIstTime(cursor)} - ${formatIstTime(next)}`,
      startMs: cursor,
      endMs: next,
      elapsed: cursor < now,
    });
    cursor = next;
  }

  return buckets;
}

function nextIstClockHourMs(ms: number) {
  const parts = utcMsToIstParts(ms);
  if (parts.minute === 0 && parts.second === 0) {
    return ms + 60 * 60 * 1000;
  }

  const currentIstHourStartUtcMs =
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, 0, 0) - IST_OFFSET_MS;
  return currentIstHourStartUtcMs + 60 * 60 * 1000;
}

export function formatDurationMinutes(minutes: number | null) {
  if (minutes === null) return '';
  if (minutes === 0) return '0 mins';
  return `${Number.isInteger(minutes) ? minutes : minutes.toFixed(1)} mins`;
}

export function formatSeconds(seconds: number | null) {
  if (seconds === null) return '';
  if (seconds === 0) return '0 secs';
  if (seconds >= 60) {
    const mins = seconds / 60;
    return `${Number.isInteger(mins) ? mins : mins.toFixed(1)} mins`;
  }
  return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)} secs`;
}
