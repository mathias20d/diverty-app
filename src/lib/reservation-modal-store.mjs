// Only the modal subscribes: opening it does not render the dashboard/client list.
export function createReservationModalStore(defaults) {
  let snapshot = {isOpen: false, initialData: defaults, isCotizacion: false, revision: 0};
  const listeners = new Set();
  return {
    getSnapshot: () => snapshot,
    subscribe: listener => {listeners.add(listener); return () => listeners.delete(listener);},
    set: update => {
      const next = typeof update === 'function' ? update(snapshot) : update;
      snapshot = {...next, revision: snapshot.revision + 1};
      listeners.forEach(listener => listener());
    }
  };
}
