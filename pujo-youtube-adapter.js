const API_URL = 'https://www.youtube.com/iframe_api';
const LOAD_TIMEOUT_MS = 12000;

export const createYoutubePlaybackAdapter = ({
  elementId,
  origin,
  getVolume,
  getMuted,
  onState,
  onError,
}) => {
  let player;
  let playerPromise;
  let apiPromise;
  let loadTimer;

  const ensureApi = () => {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('YouTube took too long to respond.')), LOAD_TIMEOUT_MS);
      window.onYouTubeIframeAPIReady = () => { window.clearTimeout(timeout); resolve(window.YT); };
      let script = document.querySelector(`script[src="${API_URL}"]`);
      if (!script) {
        script = document.createElement('script');
        script.src = API_URL;
        document.head.append(script);
      }
      script.addEventListener('error', () => {
        window.clearTimeout(timeout);
        reject(new Error('YouTube could not be reached.'));
      }, { once: true });
    });
    apiPromise.catch(() => { apiPromise = undefined; });
    return apiPromise;
  };

  const sourceId = () => player?.getVideoData?.()?.video_id || undefined;
  const emitState = (state) => onState?.({
    state,
    sourceId: sourceId(),
    position: player?.getCurrentTime?.() || 0,
    duration: player?.getDuration?.() || 0,
  });

  const ensure = () => {
    if (playerPromise) return playerPromise;
    playerPromise = ensureApi().then(() => new Promise((resolve, reject) => {
      loadTimer = window.setTimeout(() => reject(new Error('YouTube took too long to respond.')), LOAD_TIMEOUT_MS);
      player?.destroy?.();
      player = new window.YT.Player(elementId, {
        width: '200',
        height: '200',
        playerVars: { controls: 0, playsinline: 1, rel: 0, origin },
        events: {
          onReady: (event) => {
            window.clearTimeout(loadTimer);
            event.target.setVolume(getVolume());
            if (getMuted()) event.target.mute();
            resolve(event.target);
          },
          onStateChange: (event) => {
            const states = window.YT.PlayerState;
            if (event.data === states.PLAYING) emitState('playing');
            else if (event.data === states.PAUSED) emitState('paused');
            else if (event.data === states.BUFFERING) emitState('buffering');
            else if (event.data === states.ENDED) emitState('ended');
            else if (event.data === states.CUED) emitState('ready');
          },
          onError: (event) => onError?.({ code: event.data, sourceId: sourceId() }),
        },
      });
    }));
    playerPromise.catch(() => {
      window.clearTimeout(loadTimer);
      try { player?.destroy?.(); } catch { /* A failed embed may already be detached. */ }
      if (!document.querySelector(`#${elementId}`)) {
        const engine = document.createElement('div');
        engine.id = elementId;
        engine.className = 'media-engine';
        engine.setAttribute('aria-hidden', 'true');
        document.body.append(engine);
      }
      playerPromise = undefined;
      player = undefined;
    });
    return playerPromise;
  };

  const request = (source, startSeconds = 0) => startSeconds > 0 ? { videoId: source, startSeconds } : source;

  return {
    kind: 'youtube',
    ensure,
    async load(source, { autoplay = false, startSeconds = 0 } = {}) {
      const instance = await ensure();
      if (autoplay) instance.loadVideoById(request(source, startSeconds));
      else instance.cueVideoById(request(source, startSeconds));
    },
    play: async () => (await ensure()).playVideo(),
    pause: () => player?.pauseVideo?.(),
    stop: () => player?.stopVideo?.(),
    seek: (seconds, allowSeekAhead = true) => player?.seekTo?.(seconds, allowSeekAhead),
    setVolume: (volume) => player?.setVolume?.(volume),
    mute: () => player?.mute?.(),
    unmute: () => player?.unMute?.(),
    getPosition: () => player?.getCurrentTime?.() || 0,
    getDuration: () => player?.getDuration?.() || 0,
    getPlaybackRate: () => player?.getPlaybackRate?.() || 1,
    getLoadedSourceId: sourceId,
    isReady: () => Boolean(player),
  };
};
