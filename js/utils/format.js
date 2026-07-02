export function formatGrind(value) {
  return value.toFixed(1);
}

export function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function daysSince(isoString) {
  return Math.floor((Date.now() - new Date(isoString).getTime()) / 86400000);
}

export function nowIso() {
  return new Date().toISOString();
}
