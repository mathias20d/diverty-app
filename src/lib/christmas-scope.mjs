export const SEASON_YEAR=2026;
export const SEASON_DATES=['2026-12-24','2026-12-25'];
export const isChristmasService=row=>row?.esNavidad===true || String(row?.recursoNavidad||'').toLowerCase()==='santa' || /noche\s*buena|entrega.*santa|visita.*santa|santa.*(?:entrega|visita)/i.test([row?.nombre,row?.name,row?.servicio,row?.titulo,row?.descripcion].join(' '));
export const isChristmasRecord=row=>!!row && SEASON_DATES.includes(String(row.fecha||'')) && isChristmasService(row);
export function assertChristmasRecord(row){if(!isChristmasRecord(row))throw Error('OUTSIDE_CHRISTMAS_SCOPE');return row;}
