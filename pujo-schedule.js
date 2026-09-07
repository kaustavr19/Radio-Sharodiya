export const DAILY_PROGRAMMES = Object.freeze([
  { startHour: 0, playlistId: 'retro', title: 'Retro Pujo · Night archive' },
  { startHour: 4, playlistId: 'mahalaya', title: 'Mahalaya · Before dawn' },
  { startHour: 7, playlistId: 'agomoni', title: 'Agomoni · Pujo morning' },
  { startHour: 11, playlistId: 'retro', title: 'Retro Pujo · Afternoon archive' },
  { startHour: 15, playlistId: 'modern', title: 'Modern Pujo · New signal' },
  { startHour: 18, playlistId: 'pandal', title: 'Pandal Favourites · After dark' },
  { startHour: 22, playlistId: 'biday', title: 'Biday Bela · Quiet night' },
]);

export const getKolkataParts = (date = new Date()) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return { ...parts, dateKey: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute), daySeed: Number(parts.day) };
};
export const programmeTimeLabel = (hour) => `${String(hour).padStart(2, '0')}:00`;

export const resolveProgrammeWindow = ({ date = new Date(), seasonalIds, playlists }) => {
  const hour = Number(getKolkataParts(date).hour) % 24;
  let currentIndex = 0;
  DAILY_PROGRAMMES.forEach((programme, index) => { if (programme.startHour <= hour) currentIndex = index; });
  return [0, 1, 2].map((offset) => {
    const programme = DAILY_PROGRAMMES[(currentIndex + offset) % DAILY_PROGRAMMES.length];
    const playlistId = seasonalIds?.[offset] || programme.playlistId;
    return { ...programme, playlistId, title: playlists[playlistId]?.english || programme.title };
  });
};
