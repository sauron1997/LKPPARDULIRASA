export function createMessageThread(d={}) {
 return { id: d.id??null, studentId: d.studentId??null, subject: String(d.subject??''), status: d.status??'open', lastMessageAt: d.lastMessageAt??null, createdAt: d.createdAt??new Date().toISOString(), updatedAt: d.updatedAt??new Date().toISOString() };
}
export function createMessage(d={}) {
 return { id: d.id??null, threadId: d.threadId??null, senderId: d.senderId??null, senderRole: d.senderRole??'admin', body: String(d.body??''), createdAt: d.createdAt??new Date().toISOString() };
}