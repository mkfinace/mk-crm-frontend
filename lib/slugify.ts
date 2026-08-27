// Must match backend's slugify (src/common/slugify.ts) exactly, since the
// backend looks up Brand/Model by slugifying their `name` and comparing.
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
