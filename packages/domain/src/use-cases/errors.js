export function createServiceError(status, message, code = 'SERVICE_ERROR', details = null) {
 const error = new Error(message); error.status = status; error.code = code;
 if (details != null) error.details = details; return error;
}
export function ensure(condition, message, status =400, code = 'VALIDATION_ERROR', details = null) {
 if (!condition) throw createServiceError(status, message, code, details);
}