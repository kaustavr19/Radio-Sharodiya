const DAY = 86400000;
const PRESEASON_DAYS = 60;

export const PUJO_SEASONS = [
  {
    year: 2026,
    mahalaya: '2026-10-10',
    panchami: '2026-10-15',
    shashthi: '2026-10-16',
    saptami: '2026-10-17',
    ashtami: '2026-10-19',
    navami: '2026-10-20',
    dashami: '2026-10-21',
    bijoyaEnd: '2026-10-28',
  },
  {
    year: 2027,
    mahalaya: '2027-09-29',
    panchami: '2027-10-04',
    shashthi: '2027-10-05',
    saptami: '2027-10-06',
    ashtami: '2027-10-07',
    navami: '2027-10-09',
    dashami: '2027-10-10',
    bijoyaEnd: '2027-10-17',
  },
];

const dateValue = (dateKey) => Date.parse(`${dateKey}T00:00:00+05:30`);

const stateDefinitions = [
  { id: 'mahalaya', start: 'mahalaya', nextOffset: ['mahalaya', 1], countdownTo: 'panchami' },
  { id: 'agomoni', startOffset: ['mahalaya', 1], next: 'panchami' },
  { id: 'panchami', start: 'panchami', next: 'shashthi' },
  { id: 'shashthi', start: 'shashthi', next: 'saptami' },
  { id: 'saptami', start: 'saptami', next: 'ashtami' },
  { id: 'ashtami', start: 'ashtami', next: 'navami' },
  { id: 'navami', start: 'navami', next: 'dashami' },
  { id: 'dashami', start: 'dashami', nextOffset: ['dashami', 1] },
  { id: 'bijoya', startOffset: ['dashami', 1], nextOffset: ['bijoyaEnd', 1] },
];

const boundary = (season, definition, key, offsetKey) => {
  if (definition[key]) return dateValue(season[definition[key]]);
  const [field, days] = definition[offsetKey];
  return dateValue(season[field]) + days * DAY;
};

export const resolvePujoCalendar = (date = new Date()) => {
  const now = date.getTime();
  const nextSeason = PUJO_SEASONS.find((season) => now < dateValue(season.mahalaya));
  const activeSeason = PUJO_SEASONS.find((season) => now >= dateValue(season.mahalaya) && now < dateValue(season.bijoyaEnd) + DAY);

  if (!activeSeason) {
    const preseasonStart = nextSeason ? dateValue(nextSeason.mahalaya) - PRESEASON_DAYS * DAY : Infinity;
    if (nextSeason && now >= preseasonStart) {
      return {
        id: 'pre-mahalaya',
        season: nextSeason,
        stateStart: now,
        stateEnd: dateValue(nextSeason.mahalaya),
        targetKey: 'mahalaya',
        targetDate: dateValue(nextSeason.mahalaya),
      };
    }
    return { id: 'off-season', season: nextSeason || PUJO_SEASONS.at(-1), stateStart: now, stateEnd: preseasonStart };
  }

  const definition = stateDefinitions.find((candidate) => {
    const start = boundary(activeSeason, candidate, 'start', 'startOffset');
    const end = boundary(activeSeason, candidate, 'next', 'nextOffset');
    return now >= start && now < end;
  });

  if (!definition) return { id: 'off-season', season: activeSeason, stateStart: now, stateEnd: Infinity };
  const stateStart = boundary(activeSeason, definition, 'start', 'startOffset');
  const stateEnd = boundary(activeSeason, definition, 'next', 'nextOffset');
  return {
    id: definition.id,
    season: activeSeason,
    stateStart,
    stateEnd,
    targetKey: definition.countdownTo || definition.next || definition.nextOffset?.[0],
    targetDate: definition.countdownTo ? dateValue(activeSeason[definition.countdownTo]) : stateEnd,
  };
};

export const formatPujoDate = (timestamp) => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
}).format(new Date(timestamp));

export const dateKeyAtKolkata = (date = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);
