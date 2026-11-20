import waveCover from '../assets/suggested/wave-cover.jpg';

/** Suggested art users can pick for Avatar or Cover (upload also supported). */
export const SUGGESTED_IMAGES = [
  {
    id: 'wave-aurora',
    label: 'Wave Aurora',
    typeHint: 'cover',
    url: waveCover,
  },
  {
    id: 'sunset-glow',
    label: 'Sunset Glow',
    typeHint: 'avatar',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'neon-mesh',
    label: 'Neon Mesh',
    typeHint: 'cover',
    url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'soft-abstract',
    label: 'Soft Abstract',
    typeHint: 'avatar',
    url: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'violet-flow',
    label: 'Violet Flow',
    typeHint: 'cover',
    url: 'https://images.unsplash.com/photo-1614850716478-dea4ac1196a6?auto=format&fit=crop&w=600&q=80',
  },
];

export const IMAGE_UPLOAD_TYPES = [
  { id: 'avatar', label: 'Profile photo', hint: 'Shown on Home & sidebar' },
  { id: 'cover', label: 'Profile cover', hint: 'Banner behind your profile card' },
  { id: 'song', label: 'Song cover', hint: 'Custom image for the song now playing' },
];

/**
 * Read a File into a compressed JPEG data-URL for localStorage.
 * Caps long edge at `maxEdge` px to keep storage small.
 */
export function fileToProfileDataUrl(file, { maxEdge = 720, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('Please choose an image file'));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('Image must be under 8 MB'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image'));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas not supported'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (e) {
          reject(e);
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
