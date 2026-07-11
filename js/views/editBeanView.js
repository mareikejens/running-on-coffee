// Fix a roastery/name typo — or add a bag photo — after the bean has already
// been logged. Grind settings, ratings and comments are keyed by beanId, not
// by name, so updating these fields in place never touches that history.
import { el } from '../utils/dom.js';
import { STRINGS } from '../constants.js';
import { getBean, updateBean } from '../db/beans.js';
import { setPhoto, deletePhoto, getPhotoUrl } from '../db/photos.js';
import { photoPicker } from '../components/photoPicker.js';
import { navigate } from './router.js';
import { showToast } from '../components/toast.js';

export async function renderEditBean(container, params = {}) {
  const bean = params.beanId ? await getBean(params.beanId) : null;

  if (!bean) {
    container.appendChild(
      el('div', { class: 'empty-state' },
        el('p', {}, STRINGS.historyNoBean),
        el('button', { class: 'btn btn-primary', onClick: () => navigate('catalog') },
          STRINGS.mainGoToBeans),
      ),
    );
    return;
  }

  const roasteryInput = el('input', {
    class: 'form-input', type: 'text', autocomplete: 'off', value: bean.roastery || '',
  });
  const nameInput = el('input', {
    class: 'form-input', type: 'text', autocomplete: 'off', value: bean.name || '',
  });
  const errorBox = el('div', { class: 'form-error' });
  errorBox.hidden = true;

  const picker = photoPicker(await getPhotoUrl(bean.id));

  async function save() {
    if (!roasteryInput.value.trim() && !nameInput.value.trim()) {
      errorBox.textContent = STRINGS.errorNameRequired;
      errorBox.hidden = false;
      return;
    }
    await updateBean(bean.id, { roastery: roasteryInput.value, name: nameInput.value });
    const photo = await picker.getResult();
    if (photo.changed) {
      if (photo.blob) await setPhoto(bean.id, photo.blob);
      else await deletePhoto(bean.id);
    }
    showToast(STRINGS.beanUpdated);
    navigate('catalog');
  }

  container.appendChild(
    el('form', { class: 'form', onSubmit: (e) => e.preventDefault() },
      el('h2', { class: 'section-title' }, STRINGS.editBeanTitle),
      errorBox,
      el('div', { class: 'form-field' },
        el('label', { class: 'form-label' }, STRINGS.fieldRoastery),
        roasteryInput,
      ),
      el('div', { class: 'form-field' },
        el('label', { class: 'form-label' }, STRINGS.fieldName),
        nameInput,
      ),
      picker.node,
      el('div', { class: 'form-actions' },
        el('button', { type: 'button', class: 'btn', onClick: () => navigate('catalog') },
          STRINGS.cancel),
        el('button', { type: 'button', class: 'btn btn-primary', onClick: save },
          STRINGS.saveChanges),
      ),
    ),
  );
}
