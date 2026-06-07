export const ASSESSMENT_TYPES = ['latihan', 'teori', 'praktik'];
export const ASSESSMENT_STATUSES = ['not_started', 'in_progress', 'in_review', 'passed', 'retry'];
export const SUBMISSION_STATUSES = ['draft', 'submitted', 'in_review', 'passed', 'retry'];

export function createAssessmentDefinition(d={}) {
 return { id: d.id??null, courseId: d.courseId??null, type: d.type??'latihan', title: String(d.title??''), description: String(d.description??''), durationMinutes: Number(d.durationMinutes??0), passingScore: Number(d.passingScore??60), maxScore: Number(d.maxScore??100), maxAttempts: Number(d.maxAttempts??3), allowRetry: d.allowRetry??true, submissionMode: d.submissionMode??'online', isPublished: d.isPublished??true, createdAt: d.createdAt??new Date().toISOString(), updatedAt: d.updatedAt??new Date().toISOString() };
}
export function createAssessmentProgress(d={}) {
 return { id: d.id??null, studentId: d.studentId??null, enrollmentId: d.enrollmentId??null, definitionId: d.definitionId??null, status: d.status??'not_started', score: Number(d.score??0), attempt: Number(d.attempt??0), startedAt: d.startedAt??null, completedAt: d.completedAt??null, createdAt: d.createdAt??new Date().toISOString(), updatedAt: d.updatedAt??new Date().toISOString() };
}
export function createAssessmentSubmission(d={}) {
 return { id: d.id??null, studentId: d.studentId??null, enrollmentId: d.enrollmentId??null, definitionId: d.definitionId??null, status: d.status??'draft', score: Number(d.score??0), attempt: Number(d.attempt??0), submittedAt: d.submittedAt??null, reviewedAt: d.reviewedAt??null, reviewedBy: d.reviewedBy??null, reviewNote: String(d.reviewNote??''), answers: d.answers??null, createdAt: d.createdAt??new Date().toISOString(), updatedAt: d.updatedAt??new Date().toISOString() };
}