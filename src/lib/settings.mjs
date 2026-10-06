export function readResourceCount(value, fallback) {
  const count = value == null ? NaN : Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.min(50, Math.round(count))) : fallback;
}

export function readAppSettings(saved, defaults) {
  let parsed;
  try { parsed = saved ? JSON.parse(saved) : null; } catch { return defaults; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return defaults;
  const company = parsed.empresa;
  const empresa = { ...defaults.empresa };
  if (company && typeof company === 'object' && !Array.isArray(company)) {
    for (const [key, value] of Object.entries(company)) {
      if (typeof value === 'string') empresa[key] = value;
    }
  }
  const goal = Number(parsed.metaMensual);
  return {
    ...defaults, ...parsed, empresa,
    metaMensual: parsed.metaMensual != null && Number.isFinite(goal) && goal >= 0
      ? goal : defaults.metaMensual
  };
}
