// Boot sequence — reads like a checklist on purpose (first stop when
// diagnosing an on-device boot failure).
import { openDB } from './db/db.js';
import { seedUsers } from './db/users.js';
import { verifyActiveBeanInvariant } from './db/beans.js';
import { requestPersistentStorage } from './pwa/persistStorage.js';
import { registerView, navigate } from './views/router.js';
import { renderMain } from './views/mainView.js';
import { renderCatalog } from './views/beanListView.js';
import { renderAddBean } from './views/addBeanView.js';
import { renderSettings } from './views/settingsView.js';

async function boot() {
  await openDB();                    // 1. open/create database
  await seedUsers();                 // 2. ensure the three fixed users exist
  await verifyActiveBeanInvariant(); // 3. self-heal active-bean pointer
  await requestPersistentStorage();  // 4. ask browser to protect our data

  registerView('main', 'view-main', renderMain);
  registerView('catalog', 'view-catalog', renderCatalog);
  registerView('add-bean', 'view-add-bean', renderAddBean);
  registerView('settings', 'view-settings', renderSettings);

  for (const btn of document.querySelectorAll('.nav-btn')) {
    btn.addEventListener('click', () => navigate(btn.dataset.nav));
  }

  await navigate('main');
}

boot().catch((err) => {
  console.error('Boot failed:', err);
  document.body.textContent = `Failed to start: ${err.message}`;
});

// Surface unhandled rejections loudly during development.
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
});
