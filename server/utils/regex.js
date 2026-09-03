/** Escapes regex metacharacters so user-typed search text can't be interpreted as a pattern. */
export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
