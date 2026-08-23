/**
 * zodiac-periods.js — the twelve zodiac periods, hardcoded.
 *
 * This table is the definition used everywhere on the site (the scoreboard's
 * period filter and the Hall of Stars both import it). It is deliberately NOT
 * computed from astronomical data and NOT a library: these exact ranges are
 * the contract. Both start and end are inclusive; the ranges are contiguous
 * and cover every day of the year, which `verifyPeriodTable()` proves by
 * iterating all 366 days of a leap year (scripts/zodiac-check.mjs runs it as
 * part of `npm run gates`).
 *
 * Capricorn is the one range that crosses the year boundary: the period
 * *labelled* year Y runs 22 December of year Y through 20 January of year
 * Y+1. Every function below handles that as an explicit branch — see
 * `periodIndexFor()` and `periodYearFor()` — never as a range comparison
 * that silently fails in January.
 *
 * `name` is the zodiac sign in English (what period UI shows: "Leo, until
 * 22 August"); `constellation` is the IAU constellation the Hall of Stars
 * draws and labels — they differ only for Scorpio/Scorpius and
 * Capricorn/Capricornus.
 *
 * Time zone: period boundaries are 00:00 *Danish local time*. All the
 * Copenhagen helpers below go through Intl with the "Europe/Copenhagen"
 * IANA zone — never a fixed UTC offset, because Denmark observes DST and a
 * fixed offset would shift every boundary by an hour for half the year.
 */

/** start/end are [month, day] integer pairs, both inclusive. */
export const ZODIAC_PERIODS = [
  { name: "Aries", constellation: "Aries", symbol: "♈", start: [3, 21], end: [4, 19] },
  { name: "Taurus", constellation: "Taurus", symbol: "♉", start: [4, 20], end: [5, 21] },
  { name: "Gemini", constellation: "Gemini", symbol: "♊", start: [5, 22], end: [6, 21] },
  { name: "Cancer", constellation: "Cancer", symbol: "♋", start: [6, 22], end: [7, 22] },
  { name: "Leo", constellation: "Leo", symbol: "♌", start: [7, 23], end: [8, 22] },
  { name: "Virgo", constellation: "Virgo", symbol: "♍", start: [8, 23], end: [9, 22] },
  { name: "Libra", constellation: "Libra", symbol: "♎", start: [9, 23], end: [10, 22] },
  { name: "Scorpio", constellation: "Scorpius", symbol: "♏", start: [10, 23], end: [11, 22] },
  { name: "Sagittarius", constellation: "Sagittarius", symbol: "♐", start: [11, 23], end: [12, 21] },
  { name: "Capricorn", constellation: "Capricornus", symbol: "♑", start: [12, 22], end: [1, 20] },
  { name: "Aquarius", constellation: "Aquarius", symbol: "♒", start: [1, 21], end: [2, 19] },
  { name: "Pisces", constellation: "Pisces", symbol: "♓", start: [2, 20], end: [3, 20] },
];

const CAPRICORN = ZODIAC_PERIODS.findIndex((p) => p.name === "Capricorn");

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * The period a calendar date falls in. Capricorn first, as its own branch:
 * late December and early-to-mid January both belong to it, and no
 * (start <= date <= end) comparison can say so in one pass.
 *
 * @param {number} month 1-12
 * @param {number} day 1-31
 * @returns {number} index into ZODIAC_PERIODS
 */
export function periodIndexFor(month, day) {
  if ((month === 12 && day >= 22) || (month === 1 && day <= 20)) {
    return CAPRICORN;
  }
  for (let i = 0; i < ZODIAC_PERIODS.length; i++) {
    if (i === CAPRICORN) continue;
    const { start, end } = ZODIAC_PERIODS[i];
    const afterStart = month > start[0] || (month === start[0] && day >= start[1]);
    const beforeEnd = month < end[0] || (month === end[0] && day <= end[1]);
    if (afterStart && beforeEnd) return i;
  }
  throw new Error(`No zodiac period for ${month}/${day}`);
}

/**
 * The period AND its label year for a calendar date. The explicit Capricorn
 * year branch lives here: 1-20 January of year Y belongs to the Capricorn
 * period labelled Y-1 (it started 22 December of the previous year).
 *
 * @param {number} year
 * @param {number} month 1-12
 * @param {number} day 1-31
 * @returns {{ index: number, year: number }}
 */
export function periodYearFor(year, month, day) {
  const index = periodIndexFor(month, day);
  if (index === CAPRICORN && month === 1) {
    return { index, year: year - 1 };
  }
  return { index, year };
}

/* ── Europe/Copenhagen, via Intl only ─────────────────────────────────── */

const CPH_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Copenhagen",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
});

/**
 * The Danish wall-clock reading of a UTC instant.
 *
 * @param {number} utcMs epoch milliseconds
 * @returns {{ year: number, month: number, day: number,
 *             hour: number, minute: number, second: number }}
 */
export function copenhagenParts(utcMs) {
  const parts = {};
  for (const { type, value } of CPH_FORMATTER.formatToParts(utcMs)) {
    if (type !== "literal") parts[type] = Number(value);
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

/**
 * The UTC instant of 00:00:00 Danish local time on a given Danish calendar
 * date. Works by guessing the date's UTC midnight and correcting by the
 * observed wall-clock error; two rounds settle it across DST changes
 * (Danish transitions happen at 02:00/03:00, so local midnight always
 * exists exactly once — no skipped/ambiguous midnights to resolve).
 *
 * @param {number} year
 * @param {number} month 1-12
 * @param {number} day 1-31
 * @returns {number} epoch milliseconds
 */
export function copenhagenMidnightUtc(year, month, day) {
  const target = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  let utc = target;
  for (let i = 0; i < 2; i++) {
    const w = copenhagenParts(utc);
    const wall = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second, 0);
    utc -= wall - target;
  }
  return utc;
}

/**
 * The [start, end) UTC window of one labelled period. Half-open on purpose:
 * a score at 23:59:59 Danish time on the period's last day is inside, a
 * score at 00:00:00 on the next period's first day is not (it opens the
 * next window). The end is simply the next period's start midnight — which
 * for Capricorn(Y) is Aquarius's 21 January of Y+1.
 *
 * @param {number} index into ZODIAC_PERIODS
 * @param {number} labelYear the period's label year (Capricorn Y spills into Y+1)
 * @returns {{ startUtcMs: number, endUtcMsExclusive: number }}
 */
export function periodWindowUtc(index, labelYear) {
  const period = ZODIAC_PERIODS[index];
  const next = ZODIAC_PERIODS[(index + 1) % ZODIAC_PERIODS.length];
  const nextYear = next.start[0] < period.start[0] ? labelYear + 1 : labelYear;
  return {
    startUtcMs: copenhagenMidnightUtc(labelYear, period.start[0], period.start[1]),
    endUtcMsExclusive: copenhagenMidnightUtc(nextYear, next.start[0], next.start[1]),
  };
}

/**
 * The period a stored score belongs to: UTC timestamp → Danish wall clock →
 * table lookup, in that order. Converting first is what files a summery
 * "00:30 Danish = 22:30 UTC yesterday" score under the right period.
 *
 * @param {number} utcMs epoch milliseconds (a score's createdAt)
 * @returns {{ index: number, year: number }}
 */
export function periodOfTimestamp(utcMs) {
  const w = copenhagenParts(utcMs);
  return periodYearFor(w.year, w.month, w.day);
}

/**
 * Everything the UI needs about the period running at `nowUtcMs`: the table
 * entry, its label year, its UTC window, and the dimmed status line the
 * scoreboard shows.
 *
 * @param {number} [nowUtcMs] defaults to now
 */
export function currentPeriod(nowUtcMs = Date.now()) {
  const { index, year } = periodOfTimestamp(nowUtcMs);
  const period = ZODIAC_PERIODS[index];
  const { startUtcMs, endUtcMsExclusive } = periodWindowUtc(index, year);
  return {
    index,
    year,
    name: period.name,
    constellation: period.constellation,
    startUtcMs,
    endUtcMsExclusive,
    /** "Leo, until 22 August" — end day is the period's own (inclusive) last day. */
    label: `${period.name}, until ${period.end[1]} ${MONTH_NAMES[period.end[0] - 1]}`,
  };
}

/**
 * Proof of table rule 1: every day of a leap year maps to exactly one
 * period. Iterates all 366 days of 2024 (any leap year works — the table
 * has no year in it) and counts, for each day, how many ranges claim it —
 * via raw range membership, not via periodIndexFor's early return, so an
 * overlap can't hide behind the lookup order. Throws on the first gap or
 * overlap; returns the number of days checked.
 */
export function verifyPeriodTable() {
  const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let checked = 0;
  for (let month = 1; month <= 12; month++) {
    for (let day = 1; day <= DAYS_IN_MONTH[month - 1]; day++) {
      let claims = 0;
      for (let i = 0; i < ZODIAC_PERIODS.length; i++) {
        const { start, end } = ZODIAC_PERIODS[i];
        let inside;
        if (i === CAPRICORN) {
          inside = (month === 12 && day >= start[1]) || (month === 1 && day <= end[1]);
        } else {
          inside =
            (month > start[0] || (month === start[0] && day >= start[1])) &&
            (month < end[0] || (month === end[0] && day <= end[1]));
        }
        if (inside) claims++;
      }
      if (claims !== 1) {
        throw new Error(`${month}/${day} maps to ${claims} periods (must be exactly 1)`);
      }
      // And the lookup agrees with raw membership by construction:
      periodIndexFor(month, day);
      checked++;
    }
  }
  return checked;
}
