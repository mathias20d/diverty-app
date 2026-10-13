let loading = null;

export async function pdfTimeout(promise, milliseconds, reason) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(reason)), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}

export async function waitForPdfAssets(element, {timeoutMs = 8000, fonts = document.fonts} = {}) {
  const cleanup = [];
  const waits = Array.from(element.querySelectorAll('img')).map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      const done = () => { remove(); resolve(); };
      const remove = () => { img.removeEventListener('load', done); img.removeEventListener('error', done); };
      cleanup.push(remove);
      img.addEventListener('load', done); img.addEventListener('error', done);
      // Catch an image that finished between inspecting it and attaching listeners.
      if (img.complete) done();
    });
  });
  if (fonts?.ready) waits.push(fonts.ready);
  try { await pdfTimeout(Promise.all(waits), timeoutMs, 'PDF_ASSETS_TIMEOUT'); }
  finally { cleanup.forEach(remove => remove()); }
}

export async function createPdfBlob(element, options, {timeoutMs = 45000, assetTimeoutMs = 8000, onProgress = () => {}, library = loadPdfLibrary} = {}) {
  onProgress('Cargando generador…');
  const factory = await library();
  onProgress('Preparando imágenes y fuentes…');
  await waitForPdfAssets(element, {timeoutMs:assetTimeoutMs});
  await pdfTimeout(new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))), assetTimeoutMs, 'PDF_ASSETS_TIMEOUT');
  onProgress('Creando archivo PDF…');
  // Generate a blob first: a timed-out worker cannot download a late result.
  const blob = await pdfTimeout(factory().set(options).from(element).output('blob'), timeoutMs, 'PDF_GENERATION_TIMEOUT');
  if (!blob || !blob.size) throw new Error('PDF_EMPTY');
  return blob;
}

export function downloadPdfBlob(blob, filename) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = filename; document.body.appendChild(link);
  link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pdfErrorMessage(error) {
  if (error?.message === 'PDF_ASSETS_TIMEOUT') return 'Una imagen o fuente tardó demasiado. Reintenta o usa Imprimir PDF.';
  if (error?.message === 'PDF_GENERATION_TIMEOUT') return 'La generación tardó demasiado. Reintenta o usa Imprimir PDF.';
  if (String(error?.message || '').startsWith('PDF_LIBRARY_')) return 'No se pudo cargar el generador. Revisa la conexión y vuelve a intentar.';
  return 'No se pudo crear el PDF. Reintenta o usa Imprimir PDF.';
}

export function loadPdfLibrary() {
  if (window.html2pdf) return Promise.resolve(window.html2pdf);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const existing = document.getElementById('html2pdf-script');
    const script = existing || document.createElement('script');
    const finish = error => {
      clearTimeout(timer);
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
      if (error) { script.remove(); reject(error); }
      else resolve(window.html2pdf);
    };
    const onLoad = () => finish(window.html2pdf ? null : new Error('PDF_LIBRARY_UNAVAILABLE'));
    const onError = () => finish(new Error('PDF_LIBRARY_LOAD_FAILED'));
    const timer = setTimeout(() => finish(new Error('PDF_LIBRARY_TIMEOUT')), 20000);
    script.addEventListener('load', onLoad);
    script.addEventListener('error', onError);
    if (!existing) {
      script.id = 'html2pdf-script';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }).catch(error => { loading = null; throw error; });
  return loading;
}
