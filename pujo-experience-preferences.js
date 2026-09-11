const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export const IMAGE_QUALITY_VALUES = Object.freeze(['auto', 'mobile', 'tablet', 'desktop']);

export const defaultExperiencePreferences = ({ reducedMotion = false, saveData = false } = {}) => ({
  atmosphere: false,
  atmosphereVolume: 14,
  motion: !reducedMotion,
  lowData: Boolean(saveData),
  imageQuality: 'auto',
});
export const normalizeExperiencePreferences = (saved = {}, defaults = defaultExperiencePreferences()) => ({
  ...defaults,
  motion: typeof saved.motion === 'boolean' ? saved.motion : defaults.motion,
  lowData: typeof saved.lowData === 'boolean' ? saved.lowData : defaults.lowData,
  imageQuality: IMAGE_QUALITY_VALUES.includes(saved.imageQuality) ? saved.imageQuality : defaults.imageQuality,
  atmosphereVolume: Number.isFinite(Number(saved.atmosphereVolume)) ? clamp(Number(saved.atmosphereVolume), 0, 100) : defaults.atmosphereVolume,
  atmosphere: false,
});
