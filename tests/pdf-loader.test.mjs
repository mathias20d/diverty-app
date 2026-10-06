import test from 'node:test';
import assert from 'node:assert/strict';

function documentFixture() {
  let current = null;
  let appended = 0;
  globalThis.window = {};
  globalThis.document = {
    getElementById: () => current,
    createElement: () => {
      const script = new EventTarget();
      script.remove = () => { if (current === script) current = null; };
      return script;
    },
    body: { appendChild: script => { current = script; appended++; } }
  };
  return { script: () => current, appended: () => appended };
}

test('simultaneous PDF actions share one load and the already loaded library is reused', async () => {
  const fixture = documentFixture();
  const { loadPdfLibrary } = await import('../src/lib/pdf.mjs?test=sharing');
  const a = loadPdfLibrary(), b = loadPdfLibrary();
  assert.equal(a, b);
  assert.equal(fixture.appended(), 1);
  window.html2pdf = () => {};
  fixture.script().dispatchEvent(new Event('load'));
  assert.equal(await a, window.html2pdf);
  assert.equal(await loadPdfLibrary(), window.html2pdf);
  assert.equal(fixture.appended(), 1);
});

test('a failed library request is removed and the next user action can retry', async () => {
  const fixture = documentFixture();
  const { loadPdfLibrary } = await import('../src/lib/pdf.mjs?test=retry');
  const first = loadPdfLibrary();
  fixture.script().dispatchEvent(new Event('error'));
  await assert.rejects(first, /PDF_LIBRARY_LOAD_FAILED/);
  assert.equal(fixture.script(), null);
  const retry = loadPdfLibrary();
  window.html2pdf = () => {};
  fixture.script().dispatchEvent(new Event('load'));
  assert.equal(await retry, window.html2pdf);
  assert.equal(fixture.appended(), 2);
});

test('a response without the PDF API fails instead of reporting a successful library load', async () => {
  const fixture = documentFixture();
  const { loadPdfLibrary } = await import('../src/lib/pdf.mjs?test=missing-api');
  const result = loadPdfLibrary();
  fixture.script().dispatchEvent(new Event('load'));
  await assert.rejects(result, /PDF_LIBRARY_UNAVAILABLE/);
  assert.equal(fixture.script(), null);
});
