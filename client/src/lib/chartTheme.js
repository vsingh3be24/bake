/**
 * Chart palette for the analytics screen.
 *
 * These hexes are not eyeballed — they were snapped from the brand ramp and
 * validated (lightness band, chroma floor, protan/deutan separation,
 * normal-vision floor, contrast vs the #FFFDF7 card surface). Re-run the
 * validator before changing any value or reordering the slots: the ORDER is
 * what keeps adjacent slices/series apart for colour-blind readers.
 */

/** Categorical identity — assigned in fixed order, never cycled. */
export const CATEGORICAL = ['#A32E42', '#1565C0', '#5E9440', '#D64C8D', '#B0821F', '#7B4B9E'];

/** Anything beyond the palette folds into one neutral rather than inventing a hue. */
export const OVERFLOW = '#7A5230';

/** Sequential ramp for magnitude (the peak-days heatmap), light → dark, one hue. */
export const SEQUENTIAL = ['#E3A3AD', '#D07F8D', '#BE5A6E', '#A32E42', '#7A1C2E'];

/** Single-series marks all wear slot 1 — bar length already encodes the value. */
export const PRIMARY = CATEGORICAL[0];

/** Recessive chrome + ink, so text never wears a series colour. */
export const AXIS = '#A98D74';
export const GRID = 'rgba(169,141,116,0.25)';
export const SURFACE = '#FFFDF7';
export const INK = '#4A2C1A';
export const INK_MUTED = '#7A5230';

export function categoricalColor(index) {
  return index < CATEGORICAL.length ? CATEGORICAL[index] : OVERFLOW;
}

/**
 * Colour must follow the entity, never its rank. Series arrive sorted by
 * value, so assigning by array index would repaint every slice the moment
 * one category outsells another — the same category flipping colour between
 * "30 days" and "7 days" makes the two views impossible to compare. Slots are
 * therefore keyed off a stable alphabetical order of the names instead.
 */
export function stableColorMap(names) {
  const ordered = [...new Set(names)].sort((a, b) => String(a).localeCompare(String(b)));
  return new Map(ordered.map((name, i) => [name, categoricalColor(i)]));
}

/** Bucket a value onto the sequential ramp; 0 returns null so empty reads as empty. */
export function rampColor(value, max) {
  if (!value) return null;
  if (max <= 0) return SEQUENTIAL[0];
  const step = Math.min(SEQUENTIAL.length - 1, Math.floor((value / max) * SEQUENTIAL.length));
  return SEQUENTIAL[Math.max(0, step)];
}
