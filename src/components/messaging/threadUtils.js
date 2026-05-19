export const MESSAGE_STATUS = {
  UNREAD: 'unread',
  REPLIED: 'replied',
};

export const MESSAGE_SORT = {
  NEWEST: 'newest',
  OLDEST: 'oldest',
  NEEDS_REPLY: 'needs-reply',
};

export function getThreadTimestamp(thread = {}) {
  return thread.updatedAt || thread.lastMessageAt || thread.createdAt || thread.date || '';
}

export function getThreadTimeValue(thread = {}) {
  const timestamp = getThreadTimestamp(thread);
  const parsed = timestamp ? new Date(timestamp).getTime() : 0;
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function getLatestThreadMessage(thread = {}) {
  const messages = Array.isArray(thread.messages) ? thread.messages : [];
  if (!messages.length) {
    return null;
  }

  return [...messages].sort((left, right) => (
    new Date(left.createdAt || 0) - new Date(right.createdAt || 0)
  ))[messages.length - 1] || null;
}

export function getLatestThreadPreview(thread = {}) {
  const latestMessage = getLatestThreadMessage(thread);
  return String(
    thread.latestMessagePreview
    || thread.lastMessagePreview
    || latestMessage?.body
    || thread.body
    || thread.message
    || ''
  );
}

export function getThreadStatus(thread = {}) {
  return thread.status === MESSAGE_STATUS.REPLIED ? MESSAGE_STATUS.REPLIED : MESSAGE_STATUS.UNREAD;
}

export function getMessageStatusMeta(thread = {}, role = 'admin') {
  const replied = getThreadStatus(thread) === MESSAGE_STATUS.REPLIED;

  if (role === 'student') {
    return replied
      ? { label: 'Sudah dibalas', tone: 'emerald', className: 'is-replied' }
      : { label: 'Menunggu admin', tone: 'amber', className: 'is-waiting' };
  }

  return replied
    ? { label: 'Sudah dibalas', tone: 'emerald', className: 'is-replied' }
    : { label: 'Perlu balas', tone: 'amber', className: 'is-waiting' };
}

export function countThreadsByStatus(threads = []) {
  return threads.reduce((counts, thread) => {
    const status = getThreadStatus(thread);
    return {
      ...counts,
      total: counts.total + 1,
      unread: counts.unread + (status === MESSAGE_STATUS.UNREAD ? 1 : 0),
      replied: counts.replied + (status === MESSAGE_STATUS.REPLIED ? 1 : 0),
    };
  }, { total: 0, unread: 0, replied: 0 });
}

export function sortThreads(threads = [], sortMode = MESSAGE_SORT.NEWEST) {
  return [...threads].sort((left, right) => {
    if (sortMode === MESSAGE_SORT.OLDEST) {
      return getThreadTimeValue(left) - getThreadTimeValue(right);
    }

    if (sortMode === MESSAGE_SORT.NEEDS_REPLY) {
      const leftPriority = getThreadStatus(left) === MESSAGE_STATUS.UNREAD ? 0 : 1;
      const rightPriority = getThreadStatus(right) === MESSAGE_STATUS.UNREAD ? 0 : 1;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
    }

    return getThreadTimeValue(right) - getThreadTimeValue(left);
  });
}

export function filterThreads(threads = [], search = '', statusFilter = 'all') {
  const normalizedSearch = search.trim().toLowerCase();

  return threads.filter((thread) => {
    const messages = Array.isArray(thread.messages) ? thread.messages : [];
    const combinedText = [
      thread.senderName,
      thread.studentName,
      thread.subject,
      thread.courseTitle,
      thread.enrollmentId,
      thread.body,
      getLatestThreadPreview(thread),
      ...messages.map((message) => message.body),
    ].join(' ').toLowerCase();
    const matchesSearch = !normalizedSearch || combinedText.includes(normalizedSearch);
    const matchesStatus = statusFilter === 'all' || getThreadStatus(thread) === statusFilter;

    return matchesSearch && matchesStatus;
  });
}

export function getMessageCountLabel(thread = {}) {
  const count = Array.isArray(thread.messages) ? thread.messages.length : 0;
  return `${count} pesan`;
}
