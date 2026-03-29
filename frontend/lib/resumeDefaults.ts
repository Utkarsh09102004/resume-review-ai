/**
 * Generate a date-based default title for a new main resume.
 * De-duplicates against existing titles in the current session.
 */
export function generateDefaultTitle(existingTitles: string[]): string {
  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const base = `Resume - ${dateStr}`;
  if (!existingTitles.includes(base)) return base;
  let counter = 2;
  while (existingTitles.includes(`${base} (${counter})`)) counter++;
  return `${base} (${counter})`;
}

/**
 * Generate a default title for a sub-resume based on its parent.
 */
export function generateSubResumeTitle(
  parentTitle: string,
  siblingCount: number,
): string {
  return `${parentTitle} - Variant ${siblingCount + 1}`;
}
