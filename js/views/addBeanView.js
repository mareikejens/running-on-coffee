// Add-bean form. Suggestion chips (previous roasteries/origins) replace typing
// where possible — tap a chip to fill the field.
import { el, qs } from '../utils/dom.js';
import { STRINGS, COMPOSITIONS, ROAST_STYLES } from '../constants.js';
import { addBean, openBean, distinctFieldValues } from '../db/beans.js';
import { navigate } from './router.js';
import { showToast } from '../components/toast.js';

function segmented(name, options, selectedId, onSelect) {
  const wrap = el('div', { class: 'segmented', dataset: { name } });
  for (const option of options) {
    const btn = el('button', {
      type: 'button',
      class: `segmented-option${option.id === selectedId ? ' is-selected' : ''}`,
      dataset: { value: option.id },
      onClick: () => {
        for (const sibling of wrap.children) sibling.classList.remove('is-selected');
        btn.classList.add('is-selected');
        onSelect(option.id);
      },
    }, option.label);
    wrap.appendChild(btn);
  }
  return wrap;
}

function chipRow(values, input) {
  if (values.length === 0) return null;
  return el('div', { class: 'chip-row' },
    values.map((value) =>
      el('button', { type: 'button', class: 'chip', onClick: () => { input.value = value; } }, value),
    ),
  );
}

export async function renderAddBean(container) {
  const [roasteries, origins, places] = await Promise.all([
    distinctFieldValues('roastery'),
    distinctFieldValues('origin'),
    distinctFieldValues('purchasePlace'),
  ]);

  const state = {
    composition: 'arabica100',
    roastStyle: 'omni',
  };

  const roasteryInput = el('input', { class: 'form-input', type: 'text', autocomplete: 'off' });
  const nameInput = el('input', { class: 'form-input', type: 'text', autocomplete: 'off' });
  const ratioInput = el('input', {
    class: 'form-input', type: 'text', autocomplete: 'off',
    placeholder: STRINGS.ratioPlaceholder,
  });
  const originInput = el('input', {
    class: 'form-input', type: 'text', autocomplete: 'off',
    placeholder: STRINGS.originPlaceholder,
  });
  // inputmode=decimal brings up the number pad on iOS without number-input quirks
  const priceInput = el('input', {
    class: 'form-input', type: 'text', inputmode: 'decimal', autocomplete: 'off',
    placeholder: STRINGS.pricePlaceholder,
  });
  const placeInput = el('input', {
    class: 'form-input', type: 'text', autocomplete: 'off',
    placeholder: STRINGS.purchasePlacePlaceholder,
  });
  const errorBox = el('div', { class: 'form-error' });
  errorBox.hidden = true;

  const ratioField = el('div', { class: 'form-field' },
    el('label', { class: 'form-label' }, STRINGS.fieldRatio),
    ratioInput,
  );
  ratioField.hidden = state.composition !== 'arabicaRobusta';

  async function save(makeActive) {
    if (!roasteryInput.value.trim() && !nameInput.value.trim()) {
      errorBox.textContent = STRINGS.errorNameRequired;
      errorBox.hidden = false;
      return;
    }
    const bean = await addBean({
      roastery: roasteryInput.value,
      name: nameInput.value,
      composition: {
        type: state.composition,
        ratio: state.composition === 'arabicaRobusta' ? ratioInput.value.trim() : null,
      },
      origin: originInput.value,
      roastStyle: state.roastStyle,
      pricePerKg: parseFloat(priceInput.value.replace(',', '.')),
      purchasePlace: placeInput.value,
    });
    if (makeActive) await openBean(bean.id);
    showToast(makeActive ? STRINGS.beanOpened : STRINGS.beanSaved);
    navigate('catalog');
  }

  container.appendChild(
    el('form', { class: 'form', onSubmit: (e) => e.preventDefault() },
      el('h2', { class: 'section-title' }, STRINGS.addBeanTitle),
      errorBox,
      el('div', { class: 'form-field' },
        el('label', { class: 'form-label' }, STRINGS.fieldRoastery),
        roasteryInput,
        chipRow(roasteries, roasteryInput),
      ),
      el('div', { class: 'form-field' },
        el('label', { class: 'form-label' }, STRINGS.fieldName),
        nameInput,
      ),
      el('div', { class: 'form-field' },
        el('label', { class: 'form-label' }, STRINGS.fieldComposition),
        segmented('composition', COMPOSITIONS, state.composition, (id) => {
          state.composition = id;
          ratioField.hidden = id !== 'arabicaRobusta';
        }),
      ),
      ratioField,
      el('div', { class: 'form-field' },
        el('label', { class: 'form-label' }, STRINGS.fieldOrigin),
        originInput,
        chipRow(origins, originInput),
      ),
      el('div', { class: 'form-field' },
        el('label', { class: 'form-label' }, STRINGS.fieldRoastStyle),
        segmented('roastStyle', ROAST_STYLES, state.roastStyle, (id) => {
          state.roastStyle = id;
        }),
      ),
      el('div', { class: 'form-field' },
        el('label', { class: 'form-label' }, STRINGS.fieldPrice),
        priceInput,
      ),
      el('div', { class: 'form-field' },
        el('label', { class: 'form-label' }, STRINGS.fieldPurchasePlace),
        placeInput,
        chipRow(places, placeInput),
      ),
      el('div', { class: 'form-actions' },
        el('button', { type: 'button', class: 'btn', onClick: () => navigate('catalog') },
          STRINGS.cancel),
        el('button', { type: 'button', class: 'btn', onClick: () => save(false) },
          STRINGS.saveToStock),
        el('button', { type: 'button', class: 'btn btn-primary', onClick: () => save(true) },
          STRINGS.saveAndActivate),
      ),
    ),
  );
}
