import { Capacitor } from '@capacitor/core';

/** Native Capacitor APK/iOS → mobile UI. Browser → web UI. */
export function getAppSurface() {
  try {
    if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform?.()) {
      return 'mobile';
    }
  } catch (_) {}
  return 'web';
}

export function applyAppSurface() {
  if (typeof document === 'undefined') return getAppSurface();
  const surface = getAppSurface();
  document.documentElement.setAttribute('data-surface', surface);
  document.body?.setAttribute('data-surface', surface);
  return surface;
}

export function isWebSurface() {
  return getAppSurface() === 'web';
}
