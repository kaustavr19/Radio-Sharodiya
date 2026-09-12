import { escapeMarkup } from './pujo-catalogue.js';

export const catalogueThumbnailMarkup = (track, playlistCover = '') => track.videoId
  ? `<img src="https://img.youtube.com/vi/${escapeMarkup(track.videoId)}/mqdefault.jpg" alt="" loading="lazy" decoding="async" />`
  : playlistCover
    ? `<img src="${escapeMarkup(playlistCover)}" alt="" loading="lazy" decoding="async" />`
    : '<span aria-hidden="true">RS</span>';

const trackCredit = (track) => `${track.creditType === 'source' ? 'Source · ' : ''}${track.artist}`;

const PLAY_ICON = '<svg class="icon-glyph" viewBox="0 -960 960 960" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M320-200v-560l440 280-440 280Zm80-280Zm0 134 210-134-210-134v268Z"/></svg>';
const ADD_ICON = '<svg class="icon-glyph" viewBox="0 -960 960 960" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>';

export const personalTrackMarkup = (track, source, playlistName = 'Radio Sharodiya', playlistCover = '') => `<button class="personal-track" type="button" data-personal-track="${escapeMarkup(track.id)}" data-personal-source="${escapeMarkup(source)}" aria-label="Play ${escapeMarkup(track.title)}${track.creditType === 'artist' ? ` by ${escapeMarkup(track.artist)}` : ''}">${catalogueThumbnailMarkup(track, playlistCover)}<span><strong>${escapeMarkup(track.title)}</strong><small>${escapeMarkup(trackCredit(track))} · ${escapeMarkup(playlistName)}</small></span><i aria-hidden="true">${PLAY_ICON}</i></button>`;

export const trackListMarkup = (tracks, { currentTrackId, isTrackPlayable }) => tracks.map((track, index) => {
  const available = isTrackPlayable(track);
  const current = currentTrackId === track.id;
  const longFormBadge = track.isLongForm ? '<em class="long-listen-badge">Long listen</em>' : '';
  return `<div class="track-row${current ? ' is-current' : ''}${available ? '' : ' is-unavailable'}${track.isLongForm ? ' is-long-form' : ''}"${current ? ' aria-current="true"' : ''}><span>${String(index + 1).padStart(2, '0')}</span><button class="track-main" type="button" data-track-action="play" data-track-id="${escapeMarkup(track.id)}" aria-label="${available ? `Play ${track.isLongForm ? 'long listen ' : ''}${escapeMarkup(track.title)}${track.creditType === 'artist' ? ` by ${escapeMarkup(track.artist)}` : ''}` : `${escapeMarkup(track.title)} source coming soon`}"${available ? '' : ' disabled'}><strong>${escapeMarkup(track.title)}</strong><small>${escapeMarkup(trackCredit(track))}${available ? '' : ' · Source coming soon'}${longFormBadge}</small></button><span class="track-duration">${escapeMarkup(track.duration)}</span><button class="track-add" type="button" data-track-action="add" data-track-id="${escapeMarkup(track.id)}" aria-label="Add ${escapeMarkup(track.title)} to queue"${available ? '' : ' disabled'}>${ADD_ICON}</button></div>`;
}).join('');
