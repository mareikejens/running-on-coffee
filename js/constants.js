// All UI strings and tunable config live here — the only file to touch for copy changes.

export const DB_NAME = 'coffeewall-db';
export const DB_VERSION = 1;

export const CONFIG = {
  grindMin: 1.0,
  grindMax: 18.0,
  grindStep: 0.1,
  grindDefault: 5.0,
  idleTimeoutMs: 2 * 60 * 1000,        // 2 min to idle "painting"
  idleCheckMs: 10 * 1000,              // watchdog tick (wall-clock comparison)
  burnInShiftMs: 4 * 60 * 1000,        // nudge idle layout every 4 min
  burnInShiftPx: 6,
  exportReminderDays: 30,
  toastMs: 2500,
  recentNotesShown: 3,
  currency: 'CHF',
};

export const USERS = [
  { id: 'mareike', displayName: 'Mareike' },
  { id: 'frenzi', displayName: 'Frenzi' },
  { id: 'guest', displayName: 'Guest' },
];

export const MILK_TYPES = [
  { id: 'oat', label: 'Oat milk' },
  { id: 'cow', label: 'Cow milk' },
  { id: 'pea', label: 'Pea milk' },
  { id: 'black', label: 'Black / none' },
];

export const ROAST_STYLES = [
  { id: 'omni', label: 'Omni' },
  { id: 'espresso', label: 'Espresso' },
  { id: 'filter', label: 'Filter' },
  { id: 'other', label: 'Other' },
];

export const COMPOSITIONS = [
  { id: 'arabica100', label: '100% Arabica' },
  { id: 'arabicaRobusta', label: 'Arabica–Robusta mix' },
];

export const COMMENT_CHIPS = [
  'too bitter',
  'too sour',
  'great with oat milk',
  'needs dialing in',
  'buy again',
];

export const STRINGS = {
  appTitle: 'Coffee Wall',

  // Navigation
  navBeans: 'Beans',
  navSettings: 'Settings',
  navMain: 'Now brewing',

  // Main screen
  grindTitle: 'Grind setting',
  ratingsTitle: 'Ratings',
  mainNoActiveBean: 'No open bag right now.',
  beanBarOpenAnother: '+ Open bag',
  mainGoToBeans: 'Choose a bean',

  // Idle painting
  idleKicker: 'Now brewing',
  idleNoBean: 'No open bag.',
  idleGrindLabel: 'grind',
  idleNotRated: 'not rated yet',
  idleAlsoOpen: (names) => `Also open: ${names}`,

  // PWA update
  updateReady: 'Update ready — tap here to reload.',

  // Stats
  navStats: 'Stats',
  statsUserTitle: (name) => `${name}'s favorites`,
  statsUserEmpty: 'No ratings yet.',
  statsHouseTitle: 'House stats',
  statsHouseChampion: 'Top rating',
  statsHouseTried: 'Beans tried',
  statsHouseRated: 'Beans rated',
  statsEmpty: 'Rate a few beans first — favorites show up here.',

  // Speech input
  micLabel: 'Dictate a note',
  micError: 'Speech input failed — type instead.',

  // Comments
  commentsTitle: 'Notes',
  commentPlaceholder: 'Write a note…',
  commentAdd: 'Add',
  commentSaved: 'Note saved.',
  notesMore: (n) => `+ ${n} older — see History`,

  // History
  historyButton: 'History',
  historyBack: '‹ Back',
  historyRatingsTitle: 'Rating journey',
  historyCommentsTitle: 'Notes',
  historyNoRatings: 'No ratings yet.',
  historyNoComments: 'No notes yet.',
  historyNoBean: 'No bean selected.',

  // Catalog
  catalogOpenTitle: 'Open bags',
  catalogStockTitle: 'In stock (sealed)',
  catalogArchivedTitle: 'Finished beans',
  catalogAddBean: 'Add bean',
  catalogEmpty: 'No beans yet. Add your first bag.',
  catalogNoOpen: 'No open bags. Open one from the stock below.',
  actionOpenBag: 'Open bag',
  actionArchive: 'Finish',
  actionRestock: 'Back to stock',
  badgeBrewing: 'Now brewing',
  badgeArchived: 'Finished',

  // Add-bean form
  addBeanTitle: 'Add a bean',
  fieldRoastery: 'Roastery',
  fieldName: 'Bean name',
  fieldComposition: 'Composition',
  fieldRatio: 'Arabica / Robusta ratio',
  ratioPlaceholder: 'e.g. 80/20',
  fieldOrigin: 'Origin',
  originPlaceholder: 'e.g. Rwanda',
  fieldRoastStyle: 'Roast style',
  fieldPrice: 'Price per kg (CHF, optional)',
  pricePlaceholder: 'e.g. 24.50',
  fieldPurchasePlace: 'Bought at (optional)',
  purchasePlacePlaceholder: 'e.g. Vertical Coffee Bar, Zürich',
  saveToStock: 'Save to stock',
  saveAndActivate: 'Save & open bag',
  cancel: 'Cancel',
  errorNameRequired: 'Give the bean a name (roastery or bean name).',

  // Edit-bean form
  editBeanTitle: 'Edit bean',
  saveChanges: 'Save changes',
  actionEdit: 'Edit',
  beanUpdated: 'Bean updated — grind settings and history are unchanged.',

  // Settings / backup
  settingsTitle: 'Settings',
  backupTitle: 'Backup',
  exportButton: 'Export data (JSON)',
  importButton: 'Import data (JSON)',
  exportNote: 'Save the file somewhere safe. Import fully restores everything.',
  lastExportNever: 'Never exported yet.',
  lastExportDaysAgo: (days) => `Last export: ${days === 0 ? 'today' : days === 1 ? 'yesterday' : days + ' days ago'}.`,
  exportOverdue: 'Backup overdue — please export.',
  importConfirm: 'Importing replaces ALL current data with the file contents. Continue?',
  importSuccess: 'Data restored.',
  importError: 'Import failed — file is not a valid Coffee Wall backup.',
  exportSuccess: 'Backup exported.',
  storagePersisted: 'Storage is persistent — data is protected.',
  storageNotPersisted: 'Storage persistence not granted — export regularly!',
  idleDiag: (d) =>
    `Painting: shown ${d.idleShownCount}× since launch · last activity ${d.secondsSinceActivity}s ago` +
    (d.lastError ? ` · last error: ${d.lastError}` : ''),

  // Toasts
  beanSaved: 'Bean saved.',
  beanOpened: 'Bag opened — now brewing.',
  beanArchived: 'Bean finished.',
  beanRestocked: 'Bean moved back to stock.',
};
