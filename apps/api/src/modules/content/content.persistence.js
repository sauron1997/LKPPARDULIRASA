import { desc, eq } from 'drizzle-orm';
import {
  getDefaultProfile,
  getPublicSocialLinks,
} from '@lkp-parduli-rasa/domain/defaults';
import { isDatabaseConfigured, requireDb } from '../../db/client.js';
import {
  accreditations,
  blogPosts,
  galleryItems,
  galleryMedia,
  mediaAssets,
  siteProfile,
  socialLinks,
} from '../../db/schema/index.js';

const DEFAULT_SOCIAL_PLATFORMS = ['facebook', 'instagram', 'youtube', 'twitter'];

function toIsoString(value) {
  if (!value) return new Date().toISOString();

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function toDate(value) {
  const parsed = value instanceof Date ? value : new Date(value || Date.now());
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function toBoolean(value) {
  return value === true || value === 'true';
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapSocialRows(rows = [], fallbackProfile = null) {
  const seeded = getPublicSocialLinks(fallbackProfile || getDefaultProfile());

  return [...new Set([...DEFAULT_SOCIAL_PLATFORMS, ...Object.keys(seeded)])].reduce((result, platform) => {
    const match = rows.find((item) => item.platform === platform);
    return {
      ...result,
      [platform]: {
        url: match?.url || seeded[platform]?.url || '',
        enabled: match ? toBoolean(match.enabled) : Boolean(seeded[platform]?.enabled),
      },
    };
  }, {});
}

function mapProfileRecord(profileRow, socialRows) {
  const fallback = getDefaultProfile();
  const socialMedia = mapSocialRows(socialRows, fallback);

  return {
    ...fallback,
    id: profileRow?.id || fallback.id || 'site',
    name: profileRow?.name || fallback.name,
    tagline: profileRow?.tagline || fallback.tagline || '',
    logo: profileRow?.logo || fallback.logo || '',
    description: profileRow?.description || fallback.description || '',
    vision: profileRow?.vision || fallback.vision || '',
    mission: Array.isArray(profileRow?.mission) ? profileRow.mission : fallback.mission || [],
    history: profileRow?.history || fallback.history || '',
    address: profileRow?.address || fallback.address || '',
    phone: profileRow?.phone || fallback.phone || '',
    email: profileRow?.email || fallback.email || '',
    foundedYear: profileRow?.foundedYear ?? fallback.foundedYear ?? null,
    teacherCount: profileRow?.teacherCount ?? fallback.teacherCount ?? null,
    alumniCount: profileRow?.alumniCount ?? fallback.alumniCount ?? null,
    updatedAt: toIsoString(profileRow?.updatedAt || fallback.updatedAt),
    socialMedia,
  };
}

function mapBlogPost(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary || '',
    content: row.contentHtml || '',
    author: row.authorName || 'Admin LKP',
    image: row.coverMediaId || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    category: row.category || 'Edukasi',
    status: row.status || 'draft',
    publishedAt: row.publishedAt ? toIsoString(row.publishedAt) : '',
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

function mapAccreditation(row) {
  return {
    id: row.id,
    title: row.title,
    certificateNumber: row.certificateNumber || '',
    description: row.description || '',
    expiryDate: row.expiryDate || '',
    year: row.year || '',
    status: row.status || 'Aktif',
    documentUrl: row.documentMediaId || '',
    documentName: row.documentName || '',
    updatedAt: toIsoString(row.updatedAt),
  };
}

function normalizeGalleryMedia(payload = {}, fallbackId) {
  if (Array.isArray(payload.media) && payload.media.length) {
    return payload.media.map((item, index) => ({
      id: item.id || `${fallbackId}-media-${index + 1}`,
      name: item.name || `Media ${index + 1}`,
      type: item.type || 'photo',
      url: item.url || '',
      mimeType: item.mimeType || '',
      isObjectUrl: Boolean(item.isObjectUrl),
    }));
  }

  if (payload.url) {
    return [{
      id: `${fallbackId}-media-1`,
      name: payload.title || 'Media',
      type: payload.type || 'photo',
      url: payload.url,
      mimeType: payload.mimeType || '',
      isObjectUrl: Boolean(payload.isObjectUrl),
    }];
  }

  return [];
}

function mapGalleryItem(row, mediaRows = []) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    media: mediaRows.map((item) => ({
      id: item.id,
      name: item.name || row.title,
      type: item.type || 'photo',
      url: item.url || '',
      mimeType: item.mimeType || '',
      isObjectUrl: toBoolean(item.isObjectUrl),
    })),
    coverId: row.coverId || mediaRows[0]?.id || '',
    type: row.type || mediaRows[0]?.type || 'photo',
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

function mapLibraryAsset(row) {
  return {
    id: row.id,
    domain: row.metadata?.domain || 'library',
    parentId: row.ownerId || row.metadata?.parentId || null,
    name: row.originalName || row.metadata?.name || row.id,
    type: row.metadata?.type || 'asset',
    url: row.publicUrl || '',
    mimeType: row.mimeType || '',
    isObjectUrl: Boolean(row.metadata?.isObjectUrl),
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

function mapGalleryLibraryEntry(item, media) {
  return {
    id: media.id,
    domain: 'gallery',
    parentId: item.id,
    name: media.name || item.title,
    type: media.type || item.type || 'photo',
    url: media.url || '',
    mimeType: media.mimeType || '',
    isObjectUrl: toBoolean(media.isObjectUrl),
    createdAt: toIsoString(item.createdAt),
    updatedAt: toIsoString(item.updatedAt),
  };
}

function mapBlogLibraryEntry(post) {
  return {
    id: `media-blog-${post.id}`,
    domain: 'blog',
    parentId: post.id,
    name: post.title,
    type: 'image',
    url: post.coverMediaId || '',
    mimeType: '',
    isObjectUrl: false,
    createdAt: toIsoString(post.createdAt),
    updatedAt: toIsoString(post.updatedAt),
  };
}

function mapAccreditationLibraryEntry(item) {
  return {
    id: `media-accreditation-${item.id}`,
    domain: 'accreditation',
    parentId: item.id,
    name: item.documentName || item.title,
    type: 'document',
    url: item.documentMediaId || '',
    mimeType: 'application/pdf',
    isObjectUrl: false,
    createdAt: toIsoString(item.updatedAt),
    updatedAt: toIsoString(item.updatedAt),
  };
}

export function canUseDatabasePersistence() {
  return isDatabaseConfigured;
}

export async function getPersistedProfile() {
  const database = requireDb();
  const [profileRow] = await database.select().from(siteProfile).where(eq(siteProfile.id, 'site')).limit(1);
  const socialRows = await database.select().from(socialLinks).orderBy(socialLinks.platform);
  return mapProfileRecord(profileRow || null, socialRows);
}

export async function updatePersistedProfile(payload = {}) {
  const database = requireDb();

  return database.transaction(async (tx) => {
    const current = await getPersistedProfile();
    const now = new Date();
    const nextProfile = {
      ...current,
      ...payload,
      mission: Array.isArray(payload.mission) ? payload.mission : current.mission,
      socialMedia: payload.socialMedia ? mapSocialRows(
        Object.entries({ ...current.socialMedia, ...payload.socialMedia }).map(([platform, value]) => ({
          platform,
          url: value?.url || '',
          enabled: value?.enabled ? 'true' : 'false',
        })),
        current,
      ) : current.socialMedia,
      updatedAt: now.toISOString(),
    };

    await tx.insert(siteProfile).values({
      id: 'site',
      name: nextProfile.name,
      tagline: nextProfile.tagline || '',
      logo: nextProfile.logo || '',
      description: nextProfile.description || '',
      vision: nextProfile.vision || '',
      mission: nextProfile.mission || [],
      history: nextProfile.history || '',
      address: nextProfile.address || '',
      phone: nextProfile.phone || '',
      email: nextProfile.email || '',
      foundedYear: nextProfile.foundedYear == null ? null : toNumber(nextProfile.foundedYear, null),
      teacherCount: nextProfile.teacherCount == null ? null : toNumber(nextProfile.teacherCount, null),
      alumniCount: nextProfile.alumniCount == null ? null : toNumber(nextProfile.alumniCount, null),
      updatedAt: now,
    }).onConflictDoUpdate({
      target: siteProfile.id,
      set: {
        name: nextProfile.name,
        tagline: nextProfile.tagline || '',
        logo: nextProfile.logo || '',
        description: nextProfile.description || '',
        vision: nextProfile.vision || '',
        mission: nextProfile.mission || [],
        history: nextProfile.history || '',
        address: nextProfile.address || '',
        phone: nextProfile.phone || '',
        email: nextProfile.email || '',
        foundedYear: nextProfile.foundedYear == null ? null : toNumber(nextProfile.foundedYear, null),
        teacherCount: nextProfile.teacherCount == null ? null : toNumber(nextProfile.teacherCount, null),
        alumniCount: nextProfile.alumniCount == null ? null : toNumber(nextProfile.alumniCount, null),
        updatedAt: now,
      },
    });

    const nextSocialRows = Object.entries(nextProfile.socialMedia || {}).map(([platform, value]) => ({
      id: platform,
      platform,
      url: value?.url || '',
      enabled: value?.enabled ? 'true' : 'false',
      updatedAt: now,
    }));

    for (const row of nextSocialRows) {
      await tx.insert(socialLinks).values(row).onConflictDoUpdate({
        target: socialLinks.id,
        set: {
          url: row.url,
          enabled: row.enabled,
          updatedAt: row.updatedAt,
        },
      });
    }

    const [profileRow] = await tx.select().from(siteProfile).where(eq(siteProfile.id, 'site')).limit(1);
    const socialRows = await tx.select().from(socialLinks).orderBy(socialLinks.platform);
    return mapProfileRecord(profileRow || null, socialRows);
  });
}

export async function listPersistedBlogPosts(filters = {}) {
  const database = requireDb();
  const search = String(filters.search || '').trim().toLowerCase();
  const rows = await database.select().from(blogPosts).orderBy(desc(blogPosts.updatedAt));
  const posts = rows.map(mapBlogPost);

  return search
    ? posts.filter((post) => `${post.title} ${post.summary} ${post.content}`.toLowerCase().includes(search))
    : posts;
}

export async function getPersistedBlogPost(postId) {
  const rows = await listPersistedBlogPosts();
  return rows.find((item) => String(item.id) === String(postId) || String(item.slug) === String(postId)) || null;
}

export async function createPersistedBlogPost(payload = {}) {
  const database = requireDb();
  const rows = await database.select().from(blogPosts);
  const nextId = payload.id ? toNumber(payload.id) : rows.reduce((highest, item) => Math.max(highest, Number(item.id) || 0), 0) + 1;
  const now = new Date();

  await database.insert(blogPosts).values({
    id: nextId,
    slug: payload.slug || slugify(payload.title),
    title: String(payload.title || '').trim(),
    summary: payload.summary || '',
    contentHtml: payload.content || '',
    authorName: payload.author || 'Admin LKP',
    category: payload.category || 'Edukasi',
    status: payload.status || 'draft',
    coverMediaId: payload.image || '',
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    publishedAt: toDate(payload.publishedAt || now),
    createdAt: now,
    updatedAt: now,
  });

  return getPersistedBlogPost(nextId);
}

export async function updatePersistedBlogPost(postId, payload = {}) {
  const database = requireDb();
  const current = await getPersistedBlogPost(postId);

  if (!current) {
    return null;
  }

  await database.update(blogPosts).set({
    slug: payload.slug ?? current.slug,
    title: payload.title ?? current.title,
    summary: payload.summary ?? current.summary,
    contentHtml: payload.content ?? current.content,
    authorName: payload.author ?? current.author,
    category: payload.category ?? current.category,
    status: payload.status ?? current.status,
    coverMediaId: payload.image ?? current.image,
    tags: Array.isArray(payload.tags) ? payload.tags : current.tags,
    publishedAt: payload.publishedAt ? toDate(payload.publishedAt) : toDate(current.publishedAt || current.createdAt),
    updatedAt: new Date(),
  }).where(eq(blogPosts.id, current.id));

  return getPersistedBlogPost(current.id);
}

export async function deletePersistedBlogPost(postId) {
  const database = requireDb();
  const current = await getPersistedBlogPost(postId);
  if (!current) {
    return null;
  }

  await database.delete(blogPosts).where(eq(blogPosts.id, current.id));
  return current;
}

export async function listPersistedAccreditations() {
  const database = requireDb();
  const rows = await database.select().from(accreditations).orderBy(desc(accreditations.updatedAt));
  return rows.map(mapAccreditation);
}

export async function getPersistedAccreditation(itemId) {
  const rows = await listPersistedAccreditations();
  return rows.find((item) => String(item.id) === String(itemId)) || null;
}

export async function createPersistedAccreditation(payload = {}) {
  const database = requireDb();
  const rows = await database.select().from(accreditations);
  const nextId = payload.id ? toNumber(payload.id) : rows.reduce((highest, item) => Math.max(highest, Number(item.id) || 0), 0) + 1;
  const now = new Date();

  await database.insert(accreditations).values({
    id: nextId,
    title: String(payload.title || '').trim(),
    certificateNumber: payload.certificateNumber || '',
    description: payload.description || '',
    expiryDate: payload.expiryDate || '',
    year: payload.year || '',
    status: payload.status || 'Aktif',
    documentMediaId: payload.documentUrl || '',
    documentName: payload.documentName || '',
    updatedAt: now,
  });

  return getPersistedAccreditation(nextId);
}

export async function updatePersistedAccreditation(itemId, payload = {}) {
  const database = requireDb();
  const current = await getPersistedAccreditation(itemId);

  if (!current) {
    return null;
  }

  await database.update(accreditations).set({
    title: payload.title ?? current.title,
    certificateNumber: payload.certificateNumber ?? current.certificateNumber,
    description: payload.description ?? current.description,
    expiryDate: payload.expiryDate ?? current.expiryDate,
    year: payload.year ?? current.year,
    status: payload.status ?? current.status,
    documentMediaId: payload.documentUrl ?? current.documentUrl,
    documentName: payload.documentName ?? current.documentName,
    updatedAt: new Date(),
  }).where(eq(accreditations.id, current.id));

  return getPersistedAccreditation(current.id);
}

export async function deletePersistedAccreditation(itemId) {
  const database = requireDb();
  const current = await getPersistedAccreditation(itemId);
  if (!current) {
    return null;
  }

  await database.delete(accreditations).where(eq(accreditations.id, current.id));
  return current;
}

export async function listPersistedGalleryItems() {
  const database = requireDb();
  const itemRows = await database.select().from(galleryItems).orderBy(desc(galleryItems.updatedAt));
  const mediaRows = await database.select().from(galleryMedia);
  return itemRows.map((item) => mapGalleryItem(
    item,
    mediaRows.filter((media) => String(media.galleryItemId) === String(item.id)),
  ));
}

export async function getPersistedGalleryItem(itemId) {
  const rows = await listPersistedGalleryItems();
  return rows.find((item) => String(item.id) === String(itemId)) || null;
}

export async function createPersistedGalleryItem(payload = {}) {
  const database = requireDb();
  const rows = await database.select().from(galleryItems);
  const nextId = payload.id ? toNumber(payload.id) : rows.reduce((highest, item) => Math.max(highest, Number(item.id) || 0), 0) + 1;
  const media = normalizeGalleryMedia(payload, `gallery-${nextId}`);
  const now = new Date();

  await database.transaction(async (tx) => {
    await tx.insert(galleryItems).values({
      id: nextId,
      title: String(payload.title || '').trim(),
      description: payload.description || '',
      tags: Array.isArray(payload.tags) ? payload.tags : ['Kursus Komputer'],
      coverId: payload.coverId || media[0]?.id || '',
      type: payload.type || media[0]?.type || 'photo',
      createdAt: now,
      updatedAt: now,
    });

    if (media.length) {
      await tx.insert(galleryMedia).values(media.map((item) => ({
        id: item.id,
        galleryItemId: nextId,
        name: item.name || payload.title || 'Media',
        type: item.type || 'photo',
        url: item.url || '',
        mimeType: item.mimeType || '',
        isObjectUrl: item.isObjectUrl ? 'true' : 'false',
      })));
    }
  });

  return getPersistedGalleryItem(nextId);
}

export async function updatePersistedGalleryItem(itemId, payload = {}) {
  const database = requireDb();
  const current = await getPersistedGalleryItem(itemId);

  if (!current) {
    return null;
  }

  const media = payload.media || payload.url
    ? normalizeGalleryMedia({ ...current, ...payload }, `gallery-${current.id}`)
    : current.media;

  await database.transaction(async (tx) => {
    await tx.update(galleryItems).set({
      title: payload.title ?? current.title,
      description: payload.description ?? current.description,
      tags: Array.isArray(payload.tags) ? payload.tags : current.tags,
      coverId: payload.coverId ?? media[0]?.id ?? current.coverId,
      type: payload.type ?? media[0]?.type ?? current.type,
      updatedAt: new Date(),
    }).where(eq(galleryItems.id, current.id));

    await tx.delete(galleryMedia).where(eq(galleryMedia.galleryItemId, current.id));

    if (media.length) {
      await tx.insert(galleryMedia).values(media.map((item) => ({
        id: item.id,
        galleryItemId: current.id,
        name: item.name || current.title,
        type: item.type || 'photo',
        url: item.url || '',
        mimeType: item.mimeType || '',
        isObjectUrl: item.isObjectUrl ? 'true' : 'false',
      })));
    }
  });

  return getPersistedGalleryItem(current.id);
}

export async function deletePersistedGalleryItem(itemId) {
  const database = requireDb();
  const current = await getPersistedGalleryItem(itemId);
  if (!current) {
    return null;
  }

  await database.transaction(async (tx) => {
    await tx.delete(galleryMedia).where(eq(galleryMedia.galleryItemId, current.id));
    await tx.delete(galleryItems).where(eq(galleryItems.id, current.id));
  });

  return current;
}

export async function listPersistedMediaLibrary(filters = {}) {
  const database = requireDb();
  const search = String(filters.search || '').trim().toLowerCase();
  const [libraryRows, itemRows, mediaRows, postRows, accreditationRows] = await Promise.all([
    database.select().from(mediaAssets).where(eq(mediaAssets.ownerType, 'library')).orderBy(desc(mediaAssets.updatedAt)),
    database.select().from(galleryItems),
    database.select().from(galleryMedia),
    database.select().from(blogPosts),
    database.select().from(accreditations),
  ]);

  const items = [
    ...libraryRows.map(mapLibraryAsset),
    ...mediaRows.map((media) => {
      const item = itemRows.find((gallery) => String(gallery.id) === String(media.galleryItemId));
      return item ? mapGalleryLibraryEntry(item, media) : null;
    }).filter(Boolean),
    ...postRows.filter((post) => post.coverMediaId).map(mapBlogLibraryEntry),
    ...accreditationRows.filter((item) => item.documentMediaId).map(mapAccreditationLibraryEntry),
  ].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

  return search
    ? items.filter((item) => `${item.name} ${item.domain} ${item.type}`.toLowerCase().includes(search))
    : items;
}

export async function createPersistedLibraryItem(payload = {}) {
  const database = requireDb();
  const now = new Date();
  const record = {
    id: payload.id || `media-${Date.now()}`,
    visibility: 'public',
    storageKey: null,
    publicUrl: payload.url,
    originalName: String(payload.name || '').trim(),
    mimeType: payload.mimeType || '',
    ownerType: 'library',
    ownerId: payload.parentId ? String(payload.parentId) : null,
    metadata: {
      domain: payload.domain || 'library',
      parentId: payload.parentId || null,
      type: payload.type || 'asset',
      isObjectUrl: Boolean(payload.isObjectUrl),
    },
    createdAt: now,
    updatedAt: now,
  };

  await database.insert(mediaAssets).values(record);
  return mapLibraryAsset(record);
}

export async function updatePersistedLibraryItem(mediaId, payload = {}) {
  const database = requireDb();
  const [current] = await database.select().from(mediaAssets).where(eq(mediaAssets.id, String(mediaId))).limit(1);
  if (!current) {
    return null;
  }

  const next = {
    originalName: payload.name ?? current.originalName,
    publicUrl: payload.url ?? current.publicUrl,
    mimeType: payload.mimeType ?? current.mimeType,
    metadata: {
      ...(current.metadata || {}),
      type: payload.type ?? current.metadata?.type ?? 'asset',
      isObjectUrl: payload.isObjectUrl ?? current.metadata?.isObjectUrl ?? false,
    },
    updatedAt: new Date(),
  };

  await database.update(mediaAssets).set(next).where(eq(mediaAssets.id, current.id));
  return mapLibraryAsset({ ...current, ...next });
}

export async function deletePersistedLibraryItem(mediaId) {
  const database = requireDb();
  const [current] = await database.select().from(mediaAssets).where(eq(mediaAssets.id, String(mediaId))).limit(1);
  if (!current) {
    return null;
  }

  await database.delete(mediaAssets).where(eq(mediaAssets.id, current.id));
  return mapLibraryAsset(current);
}
