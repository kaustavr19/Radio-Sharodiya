const HLS_PLAYER_URL = 'https://akashvani.gov.in/radio/js/hls.js';

export const liveStations = [
  {
    id: 'akashvani-bangla',
    code: 'AIR-01',
    name: 'Akashvani Bangla',
    bengali: 'আকাশবাণী বাংলা',
    detail: 'West Bengal · Bengali',
    streamUrl: 'https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudio137/hlspbaudio137_Auto.m3u8',
  },
  {
    id: 'fm-rainbow-kolkata',
    code: 'AIR-02',
    name: 'FM Rainbow Kolkata',
    bengali: 'এফ এম রেনবো কলকাতা',
    detail: 'West Bengal · Bengali, Hindi, English',
    streamUrl: 'https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudio058/hlspbaudio058_Auto.m3u8',
  },
  {
    id: 'fm-gold-kolkata',
    code: 'AIR-03',
    name: 'FM Gold Kolkata',
    bengali: 'এফ এম গোল্ড কলকাতা',
    detail: 'West Bengal · Bengali, Hindi, English',
    streamUrl: 'https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudio057/hlspbaudio057_Auto.m3u8',
  },
  {
    id: 'akashvani-kolkata-geetanjali',
    code: 'AIR-04',
    name: 'Akashvani Kolkata Geetanjali',
    bengali: 'আকাশবাণী কলকাতা গীতাঞ্জলি',
    detail: 'West Bengal · Bengali',
    streamUrl: 'https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudio055/hlspbaudio055_Auto.m3u8',
  },
  {
    id: 'akashvani-kolkata-sanchayita',
    code: 'AIR-05',
    name: 'Akashvani Kolkata Sanchayita',
    bengali: 'আকাশবাণী কলকাতা সঞ্চয়িতা',
    detail: 'West Bengal · Bengali',
    streamUrl: 'https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudio056/hlspbaudio056_Auto.m3u8',
  },
  {
    id: 'akashvani-maitree',
    code: 'AIR-06',
    name: 'Akashvani Maitree',
    bengali: 'আকাশবাণী মৈত্রী',
    detail: 'West Bengal · Bengali',
    streamUrl: 'https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudio245/hlspbaudio245_Auto.m3u8',
  },
];

let hlsPlayerRequest;

const loadHlsPlayer = () => {
  if (window.Hls) return Promise.resolve(window.Hls);
  if (hlsPlayerRequest) return hlsPlayerRequest;
  hlsPlayerRequest = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = HLS_PLAYER_URL;
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.addEventListener('load', () => window.Hls ? resolve(window.Hls) : reject(new Error('HLS player unavailable')));
    script.addEventListener('error', () => reject(new Error('HLS player unavailable')));
    document.head.append(script);
  }).catch((error) => {
    hlsPlayerRequest = undefined;
    throw error;
  });
  return hlsPlayerRequest;
};

export const createLiveRadioController = ({
  audio,
  stationButtons,
  title,
  description,
  status,
  playButton,
  volume,
  beforePlay = () => {},
  onUpdate = () => {},
}) => {
  let selected = liveStations[0];
  let hls;
  let shouldPlay = false;
  let connectionTimer;

  const setStatus = (message, state = 'ready') => {
    status.textContent = message;
    status.dataset.state = state;
    onUpdate({ station: selected, message, state, playing: !audio.paused, volume: audio.volume });
  };

  const scheduleUnavailable = () => {
    window.clearTimeout(connectionTimer);
    connectionTimer = window.setTimeout(() => {
      if (shouldPlay && audio.paused) handleUnavailable();
      else if (shouldPlay && audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) handleUnavailable();
    }, 18000);
  };

  const renderSelection = () => {
    stationButtons.forEach((button) => {
      const isSelected = button.dataset.liveStation === selected.id;
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
    });
    title.textContent = selected.name;
    description.textContent = selected.detail;
    playButton.setAttribute('aria-label', `Play ${selected.name} live`);
    playButton.dataset.playing = 'false';
    playButton.querySelector('span').textContent = 'Play live';
    setStatus('Ready · Press play to connect');
  };

  const selectStation = (station) => {
    if (!station || station.id === selected.id) return;
    releaseStream();
    selected = station;
    renderSelection();
  };

  const releaseStream = () => {
    shouldPlay = false;
    window.clearTimeout(connectionTimer);
    connectionTimer = undefined;
    audio.pause();
    hls?.destroy();
    hls = undefined;
    audio.removeAttribute('src');
    audio.load();
    playButton.dataset.playing = 'false';
    playButton.querySelector('span').textContent = 'Play live';
  };

  const handleUnavailable = () => {
    releaseStream();
    setStatus('Feed unavailable · Try again or use the official player', 'error');
  };

  const beginPlayback = async () => {
    try {
      await audio.play();
    } catch {
      setStatus('Connected · Press play once more', 'ready');
    }
  };

  const connect = async () => {
    beforePlay();
    releaseStream();
    shouldPlay = true;
    setStatus('Connecting to the live transmission…', 'connecting');
    scheduleUnavailable();

    if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = selected.streamUrl;
      await beginPlayback();
      return;
    }

    try {
      const Hls = await loadHlsPlayer();
      if (!shouldPlay || !Hls.isSupported()) { handleUnavailable(); return; }
      hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls?.loadSource(selected.streamUrl));
      hls.on(Hls.Events.MANIFEST_PARSED, () => { if (shouldPlay) void beginPlayback(); });
      hls.on(Hls.Events.ERROR, (_event, data) => { if (data?.fatal) handleUnavailable(); });
      hls.attachMedia(audio);
    } catch {
      handleUnavailable();
    }
  };

  const togglePlayback = () => {
    if (!audio.paused) { audio.pause(); return; }
    if (audio.currentSrc || hls) { shouldPlay = true; beforePlay(); void beginPlayback(); return; }
    void connect();
  };

  stationButtons.forEach((button) => button.addEventListener('click', () => {
    selectStation(liveStations.find((candidate) => candidate.id === button.dataset.liveStation));
    void connect();
  }));

  playButton.addEventListener('click', togglePlayback);
  volume.addEventListener('input', () => { audio.volume = Number(volume.value) / 100; });
  audio.addEventListener('playing', () => {
    window.clearTimeout(connectionTimer);
    connectionTimer = undefined;
    playButton.dataset.playing = 'true';
    playButton.querySelector('span').textContent = 'Pause';
    playButton.setAttribute('aria-label', `Pause ${selected.name}`);
    setStatus('Live now', 'live');
  });
  audio.addEventListener('waiting', () => {
    setStatus('Buffering the live transmission…', 'connecting');
    scheduleUnavailable();
  });
  audio.addEventListener('pause', () => {
    if (!shouldPlay) return;
    playButton.dataset.playing = 'false';
    playButton.querySelector('span').textContent = 'Play live';
    playButton.setAttribute('aria-label', `Resume ${selected.name}`);
    setStatus('Paused · The live broadcast continues', 'paused');
  });
  audio.addEventListener('error', handleUnavailable);
  window.addEventListener('offline', () => {
    if (!audio.paused || shouldPlay) {
      releaseStream();
      setStatus('Offline · Live radio needs a connection', 'error');
    }
  });

  audio.volume = Number(volume.value) / 100;
  renderSelection();

  return {
    warm: () => { if (!audio.canPlayType('application/vnd.apple.mpegurl')) void loadHlsPlayer().catch(() => {}); },
    stop: () => { releaseStream(); setStatus('Stopped · Select play to reconnect'); },
    toggle: togglePlayback,
    setVolume: (value) => {
      const normalized = Math.max(0, Math.min(100, Number(value) || 0));
      audio.volume = normalized / 100;
      volume.value = String(normalized);
      onUpdate({ station: selected, message: status.textContent, state: status.dataset.state, playing: !audio.paused, volume: audio.volume });
    },
    playAdjacent: (offset) => {
      const currentIndex = liveStations.findIndex((station) => station.id === selected.id);
      selectStation(liveStations[(currentIndex + offset + liveStations.length) % liveStations.length]);
      void connect();
    },
  };
};
