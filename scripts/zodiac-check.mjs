/**
 * zodiac-check.mjs — proves the zodiac period table and the Copenhagen
 * boundary math (src/shared/zodiac-periods.js). Runs as part of
 * `npm run gates`, same pattern as tokens-check.mjs.
 *
 * What it proves, in order:
 *  1. All 366 days of a leap year map to exactly one period (no gaps, no
 *     overlaps, 29 February included — it lands in Pisces).
 *  2. The five anchor dates: 22 Aug → Leo, 23 Aug → Virgo, 21 Dec →
 *     Sagittarius, 22 Dec → Capricorn, 1 Jan → Capricorn of the PREVIOUS
 *     year.
 *  3. DST is real: a summer timestamp 22:30 UTC is 00:30 Danish the next
 *     day and files under the NEXT day's period — a fixed +1 offset would
 *     file it a period early, and this check would catch that.
 *  4. Period windows are half-open and seamless: 23:59:59 Danish on a
 *     period's last day is inside, 00:00:00 on the next first day opens
 *     the next window, and each window's exclusive end IS the next
 *     window's start, all the way around the year including the
 *     Capricorn year crossing.
 */
import {
  ZODIAC_PERIODS,
  periodIndexFor,
  periodYearFor,
  periodOfTimestamp,
  periodWindowUtc,
  copenhagenMidnightUtc,
  verifyPeriodTable,
} from "../src/shared/zodiac-periods.js";

let failures = 0;
function assert(cond, message) {
  if (!cond) {
    failures++;
    console.error(`zodiac: FAIL — ${message}`);
  }
}
function nameOf(index) {
  return ZODIAC_PERIODS[index].name;
}

/* 1 — the 366-day sweep. */
const days = verifyPeriodTable();
assert(days === 366, `verifyPeriodTable checked ${days} days, expected 366`);
assert(nameOf(periodIndexFor(2, 29)) === "Pisces", "29 February must fall in Pisces");

/* 2 — the five anchor dates. */
const anchors = [
  [2026, 8, 22, "Leo", 2026],
  [2026, 8, 23, "Virgo", 2026],
  [2026, 12, 21, "Sagittarius", 2026],
  [2026, 12, 22, "Capricorn", 2026],
  [2027, 1, 1, "Capricorn", 2026], // the explicit previous-year branch
];
for (const [y, m, d, expectName, expectYear] of anchors) {
  const { index, year } = periodYearFor(y, m, d);
  assert(
    nameOf(index) === expectName && year === expectYear,
    `${y}-${m}-${d} resolved to ${nameOf(index)} ${year}, expected ${expectName} ${expectYear}`,
  );
}

/* 3 — DST. 2026-08-22T22:30Z is 00:30 Danish time on 23 August (CEST,
   UTC+2): Virgo. Under a fixed +1 winter offset it would read 23:30 on
   22 August and file under Leo. */
const summer = Date.UTC(2026, 7, 22, 22, 30, 0);
const summerPeriod = periodOfTimestamp(summer);
assert(
  nameOf(summerPeriod.index) === "Virgo",
  `22:30Z on 22 Aug must be Virgo (00:30 Danish, 23 Aug); got ${nameOf(summerPeriod.index)}`,
);
assert(
  copenhagenMidnightUtc(2026, 8, 23) === Date.UTC(2026, 7, 22, 22, 0, 0),
  "Danish midnight 23 Aug 2026 must be 22:00Z on 22 Aug (CEST, UTC+2)",
);
assert(
  copenhagenMidnightUtc(2026, 1, 21) === Date.UTC(2026, 0, 20, 23, 0, 0),
  "Danish midnight 21 Jan 2026 must be 23:00Z on 20 Jan (CET, UTC+1)",
);
/* New Year's Eve, winter: 23:30Z on 31 Dec is 00:30 Danish on 1 Jan —
   Capricorn of the OLD year. */
const nye = periodOfTimestamp(Date.UTC(2026, 11, 31, 23, 30, 0));
assert(
  nameOf(nye.index) === "Capricorn" && nye.year === 2026,
  `23:30Z on 31 Dec 2026 must be Capricorn 2026; got ${nameOf(nye.index)} ${nye.year}`,
);

/* 4 — half-open windows, seamless around the whole year. */
const virgoStart = copenhagenMidnightUtc(2026, 8, 23);
const lastLeoSecond = periodOfTimestamp(virgoStart - 1000); // 23:59:59 Danish, 22 Aug
const firstVirgoSecond = periodOfTimestamp(virgoStart); // 00:00:00 Danish, 23 Aug
assert(nameOf(lastLeoSecond.index) === "Leo", "23:59:59 Danish on 22 Aug must still be Leo");
assert(nameOf(firstVirgoSecond.index) === "Virgo", "00:00:00 Danish on 23 Aug must be Virgo");

for (let i = 0; i < ZODIAC_PERIODS.length; i++) {
  const w = periodWindowUtc(i, 2026);
  assert(w.startUtcMs < w.endUtcMsExclusive, `${nameOf(i)} 2026 window must be non-empty`);
  // A timestamp 1ms inside each edge belongs to this period and no other.
  const inStart = periodOfTimestamp(w.startUtcMs);
  const inEnd = periodOfTimestamp(w.endUtcMsExclusive - 1);
  assert(inStart.index === i, `${nameOf(i)} window start must resolve to ${nameOf(i)}`);
  assert(inEnd.index === i, `${nameOf(i)} window last ms must resolve to ${nameOf(i)}`);
  const outEnd = periodOfTimestamp(w.endUtcMsExclusive);
  assert(
    outEnd.index === (i + 1) % 12,
    `${nameOf(i)} window end must open ${nameOf((i + 1) % 12)}`,
  );
}
/* The Capricorn window crosses the year: 2026's runs 22 Dec 2026 → 21 Jan 2027. */
const cap = periodWindowUtc(9, 2026);
assert(
  cap.startUtcMs === Date.UTC(2026, 11, 21, 23, 0, 0) &&
    cap.endUtcMsExclusive === Date.UTC(2027, 0, 20, 23, 0, 0),
  "Capricorn 2026 window must run 22 Dec 2026 00:00 CET through 21 Jan 2027 00:00 CET",
);

if (failures) {
  console.error(`zodiac: ${failures} check(s) failed`);
  process.exit(1);
}
console.log(
  "zodiac: ok — 366/366 days map to exactly one period; anchors, DST and window seams verified",
);
