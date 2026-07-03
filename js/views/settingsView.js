// Settings: export/import backup, storage persistence status, export reminder.
import { el } from '../utils/dom.js';
import { STRINGS, CONFIG } from '../constants.js';
import { exportToFile, importFromFile } from '../db/backup.js';
import { getMeta } from '../db/meta.js';
import { daysSince } from '../utils/format.js';
import { getIdleDiagnostics } from '../idle/idleController.js';
import { navigate } from './router.js';
import { showToast } from '../components/toast.js';

export async function renderSettings(container) {
  const [lastExportAt, persisted] = await Promise.all([
    getMeta('lastExportAt'),
    getMeta('storagePersisted'),
  ]);

  const days = lastExportAt ? daysSince(lastExportAt) : null;
  const overdue = days === null || days > CONFIG.exportReminderDays;

  const exportStatus = el('p', {
    class: `settings-note${overdue ? ' settings-warn' : ''}`,
  }, lastExportAt ? STRINGS.lastExportDaysAgo(days) : STRINGS.lastExportNever,
    overdue ? ` ${STRINGS.exportOverdue}` : '');

  const fileInput = el('input', { type: 'file', accept: '.json,application/json' });
  fileInput.style.display = 'none';
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (!window.confirm(STRINGS.importConfirm)) {
      fileInput.value = '';
      return;
    }
    try {
      await importFromFile(file);
      showToast(STRINGS.importSuccess);
      navigate('catalog');
    } catch (err) {
      console.error('Import failed:', err);
      showToast(STRINGS.importError);
    }
    fileInput.value = '';
  });

  container.appendChild(
    el('div', { class: 'form' },
      el('h2', { class: 'section-title' }, STRINGS.backupTitle),
      el('div', { class: 'settings-group card' },
        el('button', {
          class: 'btn btn-primary btn-block',
          onClick: async () => {
            const done = await exportToFile();
            if (done) {
              showToast(STRINGS.exportSuccess);
              navigate('settings');
            }
          },
        }, STRINGS.exportButton),
        exportStatus,
        el('p', { class: 'settings-note' }, STRINGS.exportNote),
      ),
      el('div', { class: 'settings-group card' },
        el('button', { class: 'btn btn-block', onClick: () => fileInput.click() },
          STRINGS.importButton),
        fileInput,
      ),
      el('div', { class: 'settings-group' },
        el('p', {
          class: `settings-note${persisted ? '' : ' settings-warn'}`,
        }, persisted ? STRINGS.storagePersisted : STRINGS.storageNotPersisted),
        el('p', { class: 'settings-note' }, STRINGS.idleDiag(getIdleDiagnostics())),
      ),
    ),
  );
}
