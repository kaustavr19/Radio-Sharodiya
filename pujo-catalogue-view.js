import { escapeMarkup } from './pujo-catalogue.js';

export const catalogueThumbnailMarkup = (track, playlistCover = '') => track.videoId
  ? `<img src="https://img.youtube.com/vi/${escapeMarkup(track.videoId)}/mqdefault.jpg" alt="" />`
  : playlistCover
    ? `<img src="${escapeMarkup(playlistCover)}" alt="" />`
    : '<span aria-hidden="true">RS</span>';

const trackCredit = (track) => `${track.creditType === 'source' ? 'Source · ' : ''}${track.artist}`;

export const personalTrackMarkup = (track, source, playlistName = 'Radio Sharodiya', playlistCover = '') => `<button class="personal-track" type="button" data-personal-track="${escapeMarkup(track.id)}" data-personal-source="${escapeMarkup(source)}" aria-label="Play ${escapeMarkup(track.title)}${track.creditType === 'artist' ? ` by ${escapeMarkup(track.artist)}` : ''}">${catalogueThumbnailMarkup(track, playlistCover)}<span><strong>${escapeMarkup(track.title)}</strong><small>${escapeMarkup(trackCredit(track))} · ${escapeMarkup(playlistName)}</small></span><i aria-hidden="true">▶</i></button>`;

export const trackListMarkup = (tracks, { currentTrackId, isTrackPlayable }) => tracks.map((track, index) => {
  const available = isTrackPlayable(track);
  const current = currentTrackId === track.id;
  const longFormBadge = track.isLongForm ? '<em class="long-listen-badge">Long listen</em>' : '';
  return `<div class="track-row${current ? ' is-current' : ''}${available ? '' : ' is-unavailable'}${track.isLongForm ? ' is-long-form' : ''}"${current ? ' aria-current="true"' : ''}><span>${String(index + 1).padStart(2, '0')}</span><button class="track-main" type="button" data-track-action="play" data-track-id="${escapeMarkup(track.id)}" aria-label="${available ? `Play ${track.isLongForm ? 'long listen ' : ''}${escapeMarkup(track.title)}${track.creditType === 'artist' ? ` by ${escapeMarkup(track.artist)}` : ''}` : `${escapeMarkup(track.title)} source coming soon`}"${available ? '' : ' disabled'}><strong>${escapeMarkup(track.title)}</strong><small>${escapeMarkup(trackCredit(track))}${available ? '' : ' · Source coming soon'}${longFormBadge}</small></button><span class="track-duration">${escapeMarkup(track.duration)}</span><button class="track-add" type="button" data-track-action="add" data-track-id="${escapeMarkup(track.id)}" aria-label="Add ${escapeMarkup(track.title)} to queue"${available ? '' : ' disabled'}>+</button></div>`;
}).join('');
