export function panamaToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Panama', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-');
}

export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function closedDates(data) {
  return Object.fromEntries(Object.entries(data?.fechas || {}).filter(([date, closed]) => validDate(date) && closed === true));
}

// Both documents are read before writing. Concurrent administrators cannot
// overwrite each other's closures or the website's content version.
export async function saveDateClosure({ runTransaction, db, datesRef, syncRef, date, closed, now = new Date() }) {
  if (!validDate(date) || date < panamaToday(now) || typeof closed !== 'boolean') throw new Error('INVALID_DATE');
  return runTransaction(db, async tx => {
    const dates = await tx.get(datesRef);
    const sync = await tx.get(syncRef);
    const fechas = closedDates(dates.data());
    if (closed) fechas[date] = true;
    else delete fechas[date];
    const updatedAt = now.toISOString();
    const saved = { fechas, updatedAt, revision: Number(dates.data()?.revision || 0) + 1 };
    tx.set(datesRef, saved);
    const previous = sync.data() || {};
    tx.set(syncRef, { version: Number(previous.version || 0) + 1, versions: { ...previous.versions, config_web: Number(previous.versions?.config_web || 0) + 1 }, updatedAt }, { merge: true });
    return saved;
  });
}
