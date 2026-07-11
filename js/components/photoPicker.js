// Bag-photo field for the add/edit bean forms. "Take photo" opens the iPad
// camera directly (file input with capture); the shot is processed on-device
// into a background-free cut-out with a live trim slider. Nothing is written
// to the database until the form is saved — getResult() hands the final blob
// (or a removal) to the caller.
import { el } from '../utils/dom.js';
import { STRINGS, CONFIG } from '../constants.js';
import {
  loadSource,
  renderCutout,
  renderOriginal,
  canvasToBlob,
} from '../photo/cutout.js';

export function photoPicker(existingUrl) {
  const state = {
    source: null,          // downscaled ImageData of the current capture
    mode: 'cutout',        // 'cutout' | 'original'
    trim: CONFIG.photoTrimDefault,
    blobPromise: null,     // resolves to the blob of the current preview
    changed: false,        // a new capture or a removal happened
    removed: false,
  };

  const input = el('input', {
    type: 'file',
    accept: 'image/*',
    capture: 'environment',
    class: 'photo-input',
  });

  const previewBox = el('div', { class: 'photo-preview' });
  const hint = el('p', { class: 'settings-note' }, STRINGS.photoHint);
  const errorBox = el('div', { class: 'form-error' });
  errorBox.hidden = true;

  const takeBtn = el('button', { type: 'button', class: 'btn', onClick: () => input.click() },
    STRINGS.photoTake);
  const removeBtn = el('button', {
    type: 'button', class: 'btn',
    onClick: () => {
      state.source = null;
      state.blobPromise = null;
      state.changed = true;
      state.removed = true;
      showEmpty();
    },
  }, STRINGS.photoRemove);

  const trimSlider = el('input', {
    type: 'range', min: '0', max: '100', step: '1',
    value: String(state.trim), class: 'photo-trim',
  });
  const trimField = el('div', { class: 'photo-trim-field' },
    el('label', { class: 'form-label' }, STRINGS.photoTrimLabel),
    trimSlider,
  );

  const modeButtons = {};
  const modeWrap = el('div', { class: 'segmented' },
    ['cutout', 'original'].map((mode) => {
      const btn = el('button', {
        type: 'button',
        class: `segmented-option${mode === state.mode ? ' is-selected' : ''}`,
        onClick: () => {
          state.mode = mode;
          for (const b of Object.values(modeButtons)) b.classList.remove('is-selected');
          btn.classList.add('is-selected');
          trimField.hidden = mode !== 'cutout';
          rerenderPreview();
        },
      }, mode === 'cutout' ? STRINGS.photoModeCutout : STRINGS.photoModeOriginal);
      modeButtons[mode] = btn;
      return btn;
    }),
  );

  const controls = el('div', { class: 'photo-controls' }, modeWrap, trimField);
  controls.hidden = true;

  function showEmpty() {
    previewBox.replaceChildren();
    previewBox.classList.remove('has-photo');
    controls.hidden = true;
    takeBtn.textContent = STRINGS.photoTake;
    removeBtn.hidden = true;
    hint.hidden = false;
  }

  function showCanvas(canvas) {
    canvas.className = 'photo-preview-img';
    previewBox.replaceChildren(canvas);
    previewBox.classList.add('has-photo');
    takeBtn.textContent = STRINGS.photoRetake;
    removeBtn.hidden = false;
    hint.hidden = true;
  }

  function rerenderPreview() {
    if (!state.source) return;
    // Too-aggressive trim can swallow the whole photo — fall back to the
    // unmodified shot so the preview never goes blank.
    const canvas = state.mode === 'cutout'
      ? renderCutout(state.source, state.trim) || renderOriginal(state.source)
      : renderOriginal(state.source);
    showCanvas(canvas);
    state.blobPromise = state.mode === 'cutout'
      ? canvasToBlob(canvas, 'image/png')
      : canvasToBlob(canvas, 'image/jpeg', 0.85);
  }

  let sliderQueued = false;
  trimSlider.addEventListener('input', () => {
    state.trim = Number(trimSlider.value);
    if (sliderQueued) return; // coalesce drag events; re-render once per frame
    sliderQueued = true;
    requestAnimationFrame(() => {
      sliderQueued = false;
      rerenderPreview();
    });
  });

  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    input.value = ''; // same photo re-selectable
    if (!file) return;
    errorBox.hidden = true;
    try {
      state.source = await loadSource(file, CONFIG.photoMaxDim);
    } catch (err) {
      console.error('Photo load failed:', err);
      errorBox.textContent = STRINGS.photoError;
      errorBox.hidden = false;
      return;
    }
    state.changed = true;
    state.removed = false;
    controls.hidden = false;
    trimField.hidden = state.mode !== 'cutout';
    rerenderPreview();
  });

  // Existing photo (edit form): plain preview, controls stay hidden until a
  // retake — the stored blob is already processed.
  if (existingUrl) {
    showCanvas(el('img', { src: existingUrl, class: 'photo-preview-img' }));
  } else {
    showEmpty();
  }

  const node = el('div', { class: 'form-field photo-picker' },
    el('label', { class: 'form-label' }, STRINGS.fieldPhoto),
    errorBox,
    previewBox,
    controls,
    el('div', { class: 'photo-actions' }, takeBtn, removeBtn),
    hint,
    input,
  );

  return {
    node,
    // { changed, blob } — blob null with changed=true means "photo removed".
    async getResult() {
      if (!state.changed) return { changed: false, blob: null };
      if (state.removed || !state.blobPromise) return { changed: true, blob: null };
      return { changed: true, blob: await state.blobPromise };
    },
  };
}
