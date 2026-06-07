export function createBlogPost(d={}) {
 return { id: d.id??null, title: String(d.title??''), slug: String(d.slug??''), body: String(d.body??''), excerpt: String(d.excerpt??''), image: String(d.image??''), status: d.status??'published', publishedAt: d.publishedAt??null, createdAt: d.createdAt??new Date().toISOString(), updatedAt: d.updatedAt??new Date().toISOString() };
}
export function createGalleryItem(d={}) {
 return { id: d.id??null, title: String(d.title??''), description: String(d.description??''), type: d.type??'photo', media: d.media??[], createdAt: d.createdAt??new Date().toISOString(), updatedAt: d.updatedAt??new Date().toISOString() };
}
export function createAccreditation(d={}) {
 return { id: d.id??null, title: String(d.title??''), documentName: String(d.documentName??''), documentUrl: String(d.documentUrl??''), status: d.status??'active', createdAt: d.createdAt??new Date().toISOString(), updatedAt: d.updatedAt??new Date().toISOString() };
}