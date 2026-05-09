export const LEVEL_THRESHOLDS = [
  0,
  100,
  250,
  450,
  700,
  1050,
  1500,
  2100,
  2800,
  3600,
  4600,
  5800,
  7200,
  8800,
  10600
];

export function getLevelFromXp(totalXp: number) {
  const safeXp = Math.max(0, Math.floor(totalXp || 0));
  let level = 1;
  for (let index = 0; index < LEVEL_THRESHOLDS.length; index += 1) {
    if (safeXp >= LEVEL_THRESHOLDS[index]) level = index + 1;
  }

  if (safeXp >= LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]) {
    const extraXp = safeXp - LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    level = LEVEL_THRESHOLDS.length + Math.floor(extraXp / 2000);
  }

  return level;
}

export function getLevelProgress(totalXp: number) {
  const safeXp = Math.max(0, Math.floor(totalXp || 0));
  const level = getLevelFromXp(safeXp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? currentThreshold + 2000;
  const span = Math.max(1, nextThreshold - currentThreshold);
  const progress = Math.min(100, Math.max(0, ((safeXp - currentThreshold) / span) * 100));

  return {
    level,
    currentThreshold,
    nextThreshold,
    progress,
    xpToNext: Math.max(0, nextThreshold - safeXp)
  };
}

export function normalizeLegacyXp(level: number, xp: number) {
  const safeLevel = Math.max(1, Math.floor(level || 1));
  const safeXp = Math.max(0, Math.floor(xp || 0));
  const levelThreshold = LEVEL_THRESHOLDS[safeLevel - 1] || 0;

  if (safeLevel > 1 && safeXp < levelThreshold) {
    return levelThreshold + safeXp;
  }

  return safeXp;
}
