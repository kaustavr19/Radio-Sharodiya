const optimizedScene = (id, slug, theme, label) => Object.freeze({ id, slug, theme, label });

export const scenes = Object.freeze({
  dawn: optimizedScene('dawn', 'dawn-lane', 'light', 'Pujo before sunrise'),
  morning: optimizedScene('morning', 'morning-pandal', 'light', 'Pujo morning'),
  afternoon: optimizedScene('afternoon', 'afternoon-city', 'light', 'Pujo afternoon'),
  goldenField: optimizedScene('golden-field', 'pujo-vibes-autumn', 'light', 'Pujo golden hour'),
  goldenRooftop: optimizedScene('golden-rooftop', 'golden-rooftop', 'light', 'Pujo rooftop at golden hour'),
  nightPandal: optimizedScene('night-pandal', 'night-art-pandal', 'dark', 'Pandal lights after dark'),
  nightGates: optimizedScene('night-gates', 'night-light-gates', 'dark', 'Pujo city lights'),
  lateNight: optimizedScene('late-night', 'late-night-tea', 'dark', 'Late-night Pujo'),
  mahalaya: optimizedScene('mahalaya-family', 'mahalaya-radio', 'dark', 'Mahalaya family transmission'),
  mahalayaWindow: optimizedScene('mahalaya-window', 'mahalaya-window', 'dark', 'Mahalaya by the predawn window'),
  mahalayaRooftop: optimizedScene('mahalaya-rooftop', 'mahalaya-rooftop', 'dark', 'Mahalaya above the waking city'),
  mahalayaChandipath: optimizedScene('mahalaya-chandipath', 'mahalaya-chandipath', 'dark', 'Mahalaya Chandipath'),
  dashami: optimizedScene('dashami', 'dashami-riverside', 'light', 'Dashami farewell'),
});

export const sceneForKolkataTime = (parts, calendarState) => {
  if (calendarState?.id === 'mahalaya') {
    if (parts.minutes < 420) return parts.daySeed % 2 ? scenes.mahalayaWindow : scenes.mahalaya;
    if (parts.minutes < 990) return scenes.mahalayaChandipath;
    return scenes.mahalayaRooftop;
  }
  if (calendarState?.id === 'dashami') return scenes.dashami;
  if (calendarState?.id === 'bijoya' && parts.minutes < 1110) return scenes.goldenField;
  if (['panchami', 'shashthi', 'saptami', 'ashtami', 'navami'].includes(calendarState?.id) && parts.minutes >= 1110) return parts.daySeed % 2 ? scenes.nightPandal : scenes.nightGates;
  if (parts.minutes >= 240 && parts.minutes < 420) return scenes.dawn;
  if (parts.minutes >= 420 && parts.minutes < 690) return scenes.morning;
  if (parts.minutes >= 690 && parts.minutes < 990) return scenes.afternoon;
  if (parts.minutes >= 990 && parts.minutes < 1110) return parts.daySeed % 2 ? scenes.goldenRooftop : scenes.goldenField;
  if (parts.minutes >= 1110 && parts.minutes < 1410) return parts.daySeed % 2 ? scenes.nightPandal : scenes.nightGates;
  return scenes.lateNight;
};
export const nextSceneForKolkataTime = (parts, calendarState) => {
  if (calendarState?.id === 'mahalaya') return scenes.mahalayaRooftop;
  if (calendarState?.id === 'dashami') return scenes.goldenField;
  if (calendarState?.id === 'bijoya') return scenes.morning;
  if (parts.minutes < 240) return scenes.dawn;
  if (parts.minutes < 420) return scenes.morning;
  if (parts.minutes < 690) return scenes.afternoon;
  if (parts.minutes < 990) return parts.daySeed % 2 ? scenes.goldenRooftop : scenes.goldenField;
  if (parts.minutes < 1110) return parts.daySeed % 2 ? scenes.nightPandal : scenes.nightGates;
  if (parts.minutes < 1410) return scenes.lateNight;
  return scenes.dawn;
};

export const createSceneDelivery = ({ lowData, viewportWidth = () => window.innerWidth } = {}) => {
  const loadedSceneAssets = new Map();
  const supportsTypedImageSet = CSS.supports?.('background-image', 'image-set(url("data:image/avif;base64,") type("image/avif"))') ?? false;
  const variantForViewport = () => {
    if (lowData?.() || viewportWidth() <= 620) return 'mobile';
    if (viewportWidth() <= 900) return 'tablet';
    return 'desktop';
  };
  const assetUrls = (scene, variant = variantForViewport()) => {
    const base = `/assets/optimized/${scene.slug}/${scene.slug}-${variant}`;
    return { avif: `${base}.avif`, webp: `${base}.webp` };
  };
  const imageSet = (scene, variant = variantForViewport()) => {
    const urls = assetUrls(scene, variant);
    return supportsTypedImageSet ? `image-set(url("${urls.avif}") type("image/avif"), url("${urls.webp}") type("image/webp"))` : `url("${urls.webp}")`;
  };
  const load = (scene, variant = variantForViewport()) => {
    const key = `${scene.id}:${variant}`;
    if (loadedSceneAssets.has(key)) return loadedSceneAssets.get(key);
    const urls = assetUrls(scene, variant);
    const request = new Promise((resolve) => {
      const image = new Image();
      image.addEventListener('load', resolve, { once: true });
      image.addEventListener('error', () => {
        const fallback = new Image();
        fallback.addEventListener('load', resolve, { once: true });
        fallback.addEventListener('error', resolve, { once: true });
        fallback.src = urls.webp;
      }, { once: true });
      image.src = supportsTypedImageSet ? urls.avif : urls.webp;
    });
    loadedSceneAssets.set(key, request);
    return request;
  };
  const preload = (scene) => lowData?.() ? Promise.resolve() : load(scene);
  return { variantForViewport, imageSet, load, preload };
};
