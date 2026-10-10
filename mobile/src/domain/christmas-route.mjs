import {reservationGpsPoint} from './gps-point.mjs';
const CHRISTMAS_SERVICE_BUFFER_MINUTES = 30;
const christmasTimeMinutes = value => {
  const m = String(value || '').match(/^(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const christmasEventGps = reservationGpsPoint;

const christmasDistanceKm = (a, b) => {
  if (!a || !b) return null;
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat-a.lat)*rad, dLng = (b.lng-a.lng)*rad;
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
};
const christmasTravelMinutes = km => {
  const d = Math.max(0, Number(km) || 0);
  if (d <= 2) return 10;
  if (d <= 5) return 15;
  if (d <= 8) return 22;
  if (d <= 12) return 30;
  if (d <= 18) return 40;
  return Math.min(70, 40 + Math.ceil((d - 18) * 2));
};
const christmasLeg = (from, to) => {
  const km = christmasDistanceKm(christmasEventGps(from), christmasEventGps(to));
  return { km, minutes: km === null ? 15 : christmasTravelMinutes(km), estimated: km === null };
};
const christmasInsertionPlan = (candidate, existingStops = []) => {
  const t = christmasTimeMinutes(candidate?.hora);
  if (t === null) return {feasible:false, score:9999, reason:'time'};
  const sameDate = existingStops
    .filter(x => x && x.id !== candidate?.id && String(x.fecha || '') === String(candidate?.fecha || ''))
    .filter(x => christmasTimeMinutes(x.hora) !== null)
    .sort((a,b)=>christmasTimeMinutes(a.hora)-christmasTimeMinutes(b.hora));
  if (sameDate.some(x => christmasTimeMinutes(x.hora) === t)) return {feasible:false, score:9999, reason:'same-time'};

  const previous = [...sameDate].filter(x => christmasTimeMinutes(x.hora) < t).pop() || null;
  const next = sameDate.find(x => christmasTimeMinutes(x.hora) > t) || null;
  const legPrev = previous ? christmasLeg(previous, candidate) : null;
  const legNext = next ? christmasLeg(candidate, next) : null;
  const fitsPrevious = !previous || christmasTimeMinutes(previous.hora) + CHRISTMAS_SERVICE_BUFFER_MINUTES + legPrev.minutes <= t;
  const fitsNext = !next || t + CHRISTMAS_SERVICE_BUFFER_MINUTES + legNext.minutes <= christmasTimeMinutes(next.hora);

  let addedTravel = 0;
  if (previous && next) {
    const direct = christmasLeg(previous, next).minutes;
    addedTravel = Math.max(0, legPrev.minutes + legNext.minutes - direct);
  } else if (previous) addedTravel = legPrev.minutes;
  else if (next) addedTravel = legNext.minutes;

  const kms = [legPrev?.km, legNext?.km].filter(v => Number.isFinite(v));
  const nearestKm = kms.length ? Math.min(...kms) : null;
  const hasGps = !!christmasEventGps(candidate);
  // Abrir una ruta nueva tiene una pequeña penalización. Esto hace que una entrega
  // cercana prefiera al Santa que ya trabaja en esa zona, sin forzar recorridos largos.
  const startRoutePenalty = sameDate.length ? 0 : 25;
  const gpsPenalty = hasGps ? 0 : 25;
  const nearbyBonus = nearestKm !== null && nearestKm <= 7 ? 8 : 0;
  const score = Math.max(0, addedTravel) + sameDate.length * 2 + startRoutePenalty + gpsPenalty - nearbyBonus;
  return {feasible:fitsPrevious && fitsNext, fitsPrevious, fitsNext, previous, next, legPrev, legNext, nearestKm, addedTravel, score, anchors:sameDate.length};
};

export {CHRISTMAS_SERVICE_BUFFER_MINUTES,christmasTimeMinutes,christmasEventGps,christmasDistanceKm,christmasTravelMinutes,christmasLeg,christmasInsertionPlan};
