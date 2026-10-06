let loading = null;

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
