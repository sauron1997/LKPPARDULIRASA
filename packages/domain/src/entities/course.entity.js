/**
 * Course Entity - Pure domain logic, no framework/DB dependencies.
 */

export function createCourse(data = {}) {
 return {
 id: data.id ?? null,
 slug: String(data.slug ?? ''),
 title: String(data.title ?? ''),
 aliases: data.aliases ?? [],
 description: String(data.description ?? ''),
 icon: String(data.icon ?? ''),
 priceValue: Number(data.priceValue ??0),
 priceLabel: String(data.priceLabel ?? ''),
 duration: String(data.duration ?? ''),
 level: String(data.level ?? ''),
 brochureMediaId: data.brochureMediaId ?? null,
 isPublished: String(data.isPublished ?? 'true'),
 createdAt: data.createdAt ?? new Date().toISOString(),
 updatedAt: data.updatedAt ?? new Date().toISOString(),
 };
}

export function isPublishedCourse(course) {
 return String(course?.isPublished ?? 'true') === 'true';
}

export function formatCoursePrice(course) {
 const value = Number(course?.priceValue ??0);
 if (!value) return course?.priceLabel || 'Gratis';
 return new Intl.NumberFormat('id-ID', {
 style: 'currency',
 currency: 'IDR',
 maximumFractionDigits:0,
 }).format(value);
}
