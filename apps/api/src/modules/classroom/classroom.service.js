import { createBackendContext } from '../../runtime/backend-context.js';
import { ensure } from '../../runtime/errors.js';
import {
 canUseDatabaseClassroomOverlayPersistence,
 createPersistedClassroomPost,
 createPersistedClassworkItem,
 deletePersistedClassroomPost,
 listPersistedClassroomPosts,
 listPersistedClassworkItems,
 updatePersistedClassroomPost,
} from './classroom.persistence.js';

export function createClassroomService(options = {}) {
 const context = createBackendContext(options);

 return {
 async listPosts(filters = {}) {
 if (canUseDatabaseClassroomOverlayPersistence()) {
 return listPersistedClassroomPosts(filters);
 }

 return context.repositories.classroomPosts?.list?.() || [];
 },

 async createPost(payload = {}) {
 ensure(payload.courseId, 'Course classroom wajib dipilih.',400, 'CLASSROOM_COURSE_REQUIRED');
 ensure(String(payload.title || '').trim(), 'Judul post wajib diisi.',400, 'CLASSROOM_POST_TITLE_REQUIRED');

 if (canUseDatabaseClassroomOverlayPersistence()) {
 return createPersistedClassroomPost(payload);
 }

 return payload;
 },

 async updatePost(postId, payload = {}) {
 if (canUseDatabaseClassroomOverlayPersistence()) {
 const post = await updatePersistedClassroomPost(postId, payload);
 ensure(post, 'Post classroom tidak ditemukan.',404, 'CLASSROOM_POST_NOT_FOUND');
 return post;
 }

 return null;
 },

 async deletePost(postId) {
 if (canUseDatabaseClassroomOverlayPersistence()) {
 const post = await deletePersistedClassroomPost(postId);
 ensure(post, 'Post classroom tidak ditemukan.',404, 'CLASSROOM_POST_NOT_FOUND');
 return post;
 }

 return null;
 },

 async listClassworkItems(filters = {}) {
 if (canUseDatabaseClassroomOverlayPersistence()) {
 return listPersistedClassworkItems(filters);
 }

 return [];
 },

 async createClassworkItem(payload = {}) {
 ensure(payload.courseId, 'Course classroom wajib dipilih.',400, 'CLASSROOM_COURSE_REQUIRED');
 ensure(String(payload.title || '').trim(), 'Judul classwork wajib diisi.',400, 'CLASSWORK_TITLE_REQUIRED');

 if (canUseDatabaseClassroomOverlayPersistence()) {
 return createPersistedClassworkItem(payload);
 }

 return payload;
 },
 };
}

export default createClassroomService;