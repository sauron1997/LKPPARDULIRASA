export function slugify(value, fallback = 'item') {
  const normalized = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
}

export function ensureUniqueSlug(value, existing = []) {
  const baseSlug = slugify(value);
  const taken = new Set(existing);

  if (!taken.has(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  let nextSlug = `${baseSlug}-${counter}`;

  while (taken.has(nextSlug)) {
    counter += 1;
    nextSlug = `${baseSlug}-${counter}`;
  }

  return nextSlug;
}
