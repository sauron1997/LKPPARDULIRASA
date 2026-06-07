export function createMediaItem(d={}) {
 return { id: d.id??null, domain: String(d.domain??''), parentId: d.parentId??null, name: String(d.name??''), type: String(d.type??''), url: String(d.url??''), mimeType: String(d.mimeType??''), isObjectUrl: Boolean(d.isObjectUrl??false), createdAt: d.createdAt??new Date().toISOString(), updatedAt: d.updatedAt??new Date().toISOString() };
}