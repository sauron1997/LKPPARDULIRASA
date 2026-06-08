/**
 * Student Repository Interface (Contract)
 * Defines data operations for Student aggregate - implementation is in infrastructure layer.
 */

/**
 * @typedef {Object} IStudentRepository
 * @property {(filters: Object) => Promise<Array>} listStudents
 * @property {(id: number|string) => Promise<Object|null>} getStudentById
 * @property {(authUserId: string) => Promise<Object|null>} getStudentByAuthUserId
 * @property {(email: string) => Promise<Object|null>} getStudentByEmail
 * @property {(nis: string) => Promise<Object|null>} getStudentByNis
 * @property {(id: number|string, data: Object) => Promise<Object>} updateStudent
 * @property {(id: number|string, data: Object) => Promise<Object>} updatePaymentStatus
 * @property {(reference: Object) => Promise<Object|null>} getStudentPortal
 * @property {(reference: Object) => Promise<Object|null>} getAdminStudentBundle
 * @property {(filters: Object) => Promise<Array>} listAdminStudentBundles
 */

// This file defines the contract shape - concrete implementations
// are in apps/api/src/infrastructure/repositories/
export const StudentRepositoryContract = Symbol('StudentRepository');
