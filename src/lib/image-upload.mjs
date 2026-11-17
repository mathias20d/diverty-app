// Subida de imágenes de servicios: misma cuenta y configuración pública de subida
// que usa el panel de Diverty (Cloudinary, preset sin firma «diverty_web»).
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/djfboe8rg/image/upload';
const UPLOAD_PRESET = 'diverty_web';
const MAX_SIDE = 1600, MAX_BYTES = 15 * 1024 * 1024;

// Reduce la foto en el dispositivo para que suba rápido incluso con datos móviles.
export async function compressImage(file) {
  if (!file || !/^image\//.test(file.type)) throw Error('NOT_IMAGE');
  if (file.size > MAX_BYTES * 2) throw Error('TOO_LARGE');
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch { return file; }
}

export async function uploadServiceImage(file, onProgress = () => {}) {
  onProgress('Preparando la imagen…');
  const image = await compressImage(file);
  if (image.size > MAX_BYTES) throw Error('TOO_LARGE');
  onProgress('Subiendo la imagen…');
  const form = new FormData();
  form.append('file', image);
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('tags', 'operacion-navidad');
  const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.secure_url !== 'string' || !data.secure_url.startsWith('https://')) throw Error('UPLOAD_FAILED');
  return data.secure_url;
}
