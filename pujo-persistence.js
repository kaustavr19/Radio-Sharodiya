export const createVersionedStorage = ({ storage, key, version }) => ({
  read({ acceptUnversioned = false } = {}) {
    try {
      const value = JSON.parse(storage?.getItem(key) || 'null');
      if (value?.version === version) return value;
      return acceptUnversioned && value && value.version === undefined ? value : undefined;
    } catch {
      return undefined;
    }
  },
  write(value) {
    try {
      storage?.setItem(key, JSON.stringify({ ...value, version }));
      return true;
    } catch {
      return false;
    }
  },
  hasValue() {
    try { return Boolean(storage?.getItem(key)); } catch { return false; }
  },
});
