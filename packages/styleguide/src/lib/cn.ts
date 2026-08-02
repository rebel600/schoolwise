/**
 * Joins class names, dropping falsy entries.
 *
 * Deliberately minimal — no tailwind-merge. Components put caller `className`
 * LAST so it wins on equal specificity, which covers the common override
 * cases without another dependency in a package loaded at runtime through
 * the import map.
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
