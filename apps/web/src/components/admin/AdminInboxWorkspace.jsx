import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, FileText, Paperclip, Search, Send, X, Zap } from 'lucide-react';
import {
  MESSAGE_SORT,
  countThreadsByStatus,
  filterThreads,
  getLatestThreadPreview,
  getMessageStatusMeta,
  getThreadStatus,
  sortThreads,
} from '../messaging/threadUtils';
import {
  AdminEmptyState,
  AdminLoadingState,
  AdminNotice,
  AdminPrimaryButton,
  AdminSecondaryButton,
  AdminSurface,
  AdminTag,
  AdminToast,
} from './AdminUi';

const MAX_ATTACHMENT_SIZE = 2.5 * 1024 * 1024;
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
]);

function formatThreadDate(value) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatShortDate(value) {
  if (!value) return '--/--';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

function toIsoDate(value) {
  if (!value) return new Date().toISOString();

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function isAdminMessage(message) {
  const role = String(
    message?.role
    || message?.direction
    || message?.senderRole
    || message?.senderType
    || message?.type
    || ''
  ).toLowerCase();

  if (['admin', 'outbound', 'reply', 'staff'].includes(role)) {
    return true;
  }

  const authorName = String(
    message?.authorName
    || message?.senderName
    || message?.author?.name
    || message?.sender?.name
    || ''
  ).toLowerCase();

  return authorName.includes('admin');
}

function buildMessageId(message, fallbackDate, index) {
  if (message?.id) return String(message.id);

  return `message-${index}-${toIsoDate(
    message?.createdAt || message?.sentAt || message?.timestamp || fallbackDate
  )}`;
}

function normalizeMessage(message, fallbackDate, index) {
  const createdAt = toIsoDate(
    message?.createdAt
    || message?.sentAt
    || message?.timestamp
    || fallbackDate
  );
  const adminMessage = isAdminMessage(message);
  const body = String(
    message?.body
    || message?.text
    || message?.content
    || message?.message
    || ''
  );

  return {
    id: buildMessageId(message, fallbackDate, index),
    body,
    createdAt,
    authorName: String(
      message?.authorName
      || message?.senderName
      || message?.author?.name
      || message?.sender?.name
      || (adminMessage ? 'Admin LKP' : 'Pengirim')
    ),
    isAdmin: adminMessage,
    attachments: normalizeMessageAttachments(message),
  };
}

function formatFileSize(sizeBytes = 0) {
  const bytes = Number(sizeBytes || 0);
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${Math.max(1, bytes)} B`;
}

function normalizeAttachmentItem(attachment, fallbackId) {
  if (!attachment) return null;

  const name = String(
    attachment?.name
    || attachment?.fileName
    || attachment?.title
    || ''
  ).trim();
  const url = String(
    attachment?.url
    || attachment?.fileUrl
    || attachment?.href
    || ''
  ).trim();
  const mimeType = String(
    attachment?.mimeType
    || attachment?.type
    || ''
  ).trim();
  const sizeLabel = String(
    attachment?.sizeLabel
    || attachment?.fileSizeLabel
    || ''
  ).trim();
  const sizeBytes = Number(attachment?.sizeBytes ?? attachment?.fileSize ?? 0);

  if (!name && !url) {
    return null;
  }

  return {
    id: String(attachment?.id || fallbackId),
    name: name || 'Lampiran',
    url,
    mimeType,
    sizeLabel,
    sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : 0,
  };
}

function normalizeMessageAttachments(message) {
  const directAttachments = Array.isArray(message?.attachments)
    ? message.attachments
      .map((attachment, index) => normalizeAttachmentItem(attachment, `attachment-${index + 1}`))
      .filter(Boolean)
    : [];

  if (directAttachments.length > 0) {
    return directAttachments;
  }

  const fallbackAttachment = normalizeAttachmentItem({
    id: message?.attachmentId || message?.fileName || message?.fileUrl,
    name: message?.fileName,
    url: message?.fileUrl,
    mimeType: message?.mimeType,
    fileSize: message?.fileSize,
    fileSizeLabel: message?.fileSizeLabel,
  }, 'attachment-1');

  return fallbackAttachment ? [fallbackAttachment] : [];
}

function buildAttachmentDraft(file) {
  return {
    file,
    id: `${Date.now()}-${file.name}`,
    name: file.name || 'Lampiran',
    mimeType: file.type || '',
    sizeBytes: Number(file.size || 0),
    sizeLabel: formatFileSize(file.size || 0),
  };
}

function AttachmentCard({ attachment, tone = 'slate', onRemove }) {
  const toneClassName = tone === 'emerald'
    ? 'border-emerald-200/80 bg-emerald-50/80 text-emerald-900'
    : 'border-slate-200 bg-white text-slate-700';

  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-3 py-2 shadow-sm ${toneClassName}`}>
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${tone === 'emerald' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
        <FileText size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{attachment.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          {attachment.sizeLabel ? (
            <span className={tone === 'emerald' ? 'text-emerald-700/80' : 'text-slate-500'}>{attachment.sizeLabel}</span>
          ) : null}
          {attachment.mimeType ? (
            <span className={tone === 'emerald' ? 'text-emerald-700/80' : 'text-slate-500'}>{attachment.mimeType}</span>
          ) : null}
        </div>
      </div>
      {attachment.url ? (
        <a
          href={attachment.url}
          download={attachment.name}
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${tone === 'emerald' ? 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-100/60' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-200 hover:text-emerald-700'}`}
        >
          Unduh
        </a>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          aria-label={`Hapus lampiran ${attachment.name}`}
          className={`shrink-0 rounded-full border p-2 transition-colors ${tone === 'emerald' ? 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-100/60' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'}`}
          onClick={onRemove}
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}

function buildLegacyMessages(thread) {
  const createdAt = toIsoDate(thread.createdAt || thread.updatedAt);
  const incoming = thread.body
    ? [{
      id: String(thread.id || `thread-${createdAt}`),
      body: thread.body,
      createdAt,
      authorName: thread.senderName || thread.studentName || 'Pengirim',
      isAdmin: false,
    }]
    : [];

  const responses = Array.isArray(thread.responses)
    ? thread.responses.map((response, index) => normalizeMessage({
      ...response,
      role: response.role || 'admin',
    }, createdAt, index))
      .filter((message) => message.body.trim() || message.attachments.length > 0)
    : [];

  return [...incoming, ...responses].sort(
    (left, right) => new Date(left.createdAt) - new Date(right.createdAt)
  );
}

function normalizeThread(thread) {
  const normalizedMessages = Array.isArray(thread.messages) && thread.messages.length > 0
    ? thread.messages
      .map((message, index) => normalizeMessage(message, thread.createdAt || thread.updatedAt, index))
      .filter((message) => message.body.trim() || message.attachments.length > 0)
      .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))
    : buildLegacyMessages(thread);

  const firstIncoming = normalizedMessages.find((message) => !message.isAdmin)
    || normalizedMessages[0]
    || null;
  const latestMessage = normalizedMessages[normalizedMessages.length - 1] || firstIncoming;
  const senderName = String(
    thread.senderName
    || thread.studentName
    || thread.contactName
    || thread.participantName
    || firstIncoming?.authorName
    || 'Pengirim'
  );
  const subject = String(
    thread.subject
    || thread.title
    || thread.topic
    || `Percakapan dengan ${senderName}`
  );
  const createdAt = toIsoDate(
    thread.createdAt
    || firstIncoming?.createdAt
    || latestMessage?.createdAt
  );
  const updatedAt = toIsoDate(
    thread.updatedAt
    || thread.lastMessageAt
    || latestMessage?.createdAt
    || createdAt
  );
  const hasAdminReply = normalizedMessages.some((message) => message.isAdmin);
  const unreadCount = Number.isFinite(thread.unreadCount)
    ? Number(thread.unreadCount)
    : null;

  let status = 'unread';
  const rawStatus = String(thread.status || '').toLowerCase();
  if (['replied', 'resolved', 'closed'].includes(rawStatus)) {
    status = 'replied';
  } else if (['unread', 'pending', 'open', 'new'].includes(rawStatus)) {
    status = 'unread';
  } else if (unreadCount !== null) {
    status = unreadCount > 0 ? 'unread' : (hasAdminReply ? 'replied' : 'unread');
  } else if (hasAdminReply) {
    status = 'replied';
  }

  return {
    ...thread,
    id: String(thread.id || thread.threadId || `thread-${createdAt}`),
    senderName,
    subject,
    body: firstIncoming?.body || String(thread.body || ''),
    createdAt,
    updatedAt,
    status,
    draft: String(thread.draft || thread.composerDraft || ''),
    messages: normalizedMessages,
    latestMessagePreview: latestMessage?.body || '',
    unreadCount,
  };
}

export default function AdminInboxWorkspace({
  title,
  icon: Icon,
  description,
  searchPlaceholder,
  emptyTitle,
  emptyDescription,
  quickReplies,
  threads,
  persistenceMode = 'memory',
  isReady,
  error,
  retryAction,
  onReply,
  isReplyPending = false,
  onStatusChange,
  isStatusPending = false,
  allowDelete = false,
  resolveMetaLine,
  resolveSummaryLine,
}) {
  const normalizedThreads = useMemo(
    () => sortThreads(threads.map((thread) => normalizeThread(thread))),
    [threads]
  );
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortMode, setSortMode] = useState(MESSAGE_SORT.NEWEST);
  const [draftsByThread, setDraftsByThread] = useState({});
  const [attachmentsByThread, setAttachmentsByThread] = useState({});
  const [composerError, setComposerError] = useState('');
  const [toast, setToast] = useState({ title: '', description: '', tone: 'emerald' });
  const messageListRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const resolvedActiveThreadId = normalizedThreads.some((thread) => thread.id === activeThreadId)
    ? activeThreadId
    : (normalizedThreads[0]?.id || null);

  const filteredThreads = useMemo(
    () => sortThreads(filterThreads(normalizedThreads, search, statusFilter), sortMode),
    [normalizedThreads, search, sortMode, statusFilter]
  );

  const activeThread = filteredThreads.find((thread) => thread.id === resolvedActiveThreadId)
    || filteredThreads[0]
    || null;
  const response = activeThread
    ? (draftsByThread[activeThread.id] ?? activeThread.draft ?? '')
    : '';
  const activeAttachment = activeThread ? (attachmentsByThread[activeThread.id] || null) : null;
  const counts = countThreadsByStatus(normalizedThreads);
  const isFiltered = search.trim() || statusFilter !== 'all';
  const activeStatusMeta = activeThread ? getMessageStatusMeta(activeThread, 'admin') : null;

  useEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) return;

    messageList.scrollTo({
      top: messageList.scrollHeight,
      behavior: 'auto',
    });
  }, [activeThread?.id, activeThread?.messages.length]);

  const handleDraftUpdate = (nextDraft) => {
    if (!activeThread) return;

    setComposerError('');
    setDraftsByThread((current) => ({
      ...current,
      [activeThread.id]: nextDraft,
    }));
  };

  const handleQuickReply = (reply) => {
    const nextDraft = response.trim() ? `${response.trim()}\n${reply}` : reply;
    handleDraftUpdate(nextDraft);
  };

  const handleAttachmentSelection = (event) => {
    if (!activeThread) return;

    const file = event.target.files?.[0] || null;
    event.target.value = '';

    if (!file) {
      return;
    }

    const extension = String(file.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_ATTACHMENT_EXTENSIONS.has(extension)) {
      setComposerError('Format file belum didukung. Gunakan PDF, gambar, Office, atau TXT.');
      return;
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      setComposerError('Ukuran lampiran maksimal 2.5 MB agar inbox admin tetap ringan.');
      return;
    }

    setComposerError('');
    setAttachmentsByThread((current) => ({
      ...current,
      [activeThread.id]: buildAttachmentDraft(file),
    }));
    setToast({
      tone: 'blue',
      title: 'Lampiran siap dikirim',
      description: `${file.name} akan ikut terkirim bersama balasan admin.`,
    });
  };

  const handleRemoveAttachment = () => {
    if (!activeThread) return;

    setAttachmentsByThread((current) => {
      const next = { ...current };
      delete next[activeThread.id];
      return next;
    });
    setComposerError('');
  };

  const handleReply = async () => {
    if (!activeThread || typeof onReply !== 'function') return;

    const trimmedResponse = response.trim();
    if (!trimmedResponse && !activeAttachment) {
      setComposerError('Tulis balasan atau pilih satu lampiran sebelum mengirim.');
      return;
    }

    setComposerError('');

    try {
      await onReply({
        threadId: activeThread.id,
        body: trimmedResponse,
        attachment: activeAttachment?.file || null,
      });

      setDraftsByThread((current) => {
        const next = { ...current };
        delete next[activeThread.id];
        return next;
      });
      setAttachmentsByThread((current) => {
        const next = { ...current };
        delete next[activeThread.id];
        return next;
      });
      setToast({
        tone: 'emerald',
        title: 'Balasan terkirim',
        description: 'Thread telah diperbarui dan status pesan berubah menjadi sudah dibalas.',
      });
    } catch (replyError) {
      setComposerError(replyError?.message || 'Balasan gagal dikirim. Coba lagi.');
      setToast({
        tone: 'rose',
        title: 'Balasan gagal',
        description: replyError?.message || 'Terjadi masalah saat mengirim balasan admin.',
      });
    }
  };

  const handleMarkAsUnread = async (threadId) => {
    if (!threadId || typeof onStatusChange !== 'function') return;

    try {
      await onStatusChange({
        threadId,
        status: 'unread',
      });
      setToast({
        tone: 'blue',
        title: 'Status diperbarui',
        description: 'Thread ditandai kembali sebagai perlu tindak lanjut.',
      });
    } catch (statusError) {
      setToast({
        tone: 'rose',
        title: 'Status gagal diperbarui',
        description: statusError?.message || 'Perubahan status belum berhasil disimpan.',
      });
    }
  };

  if (!isReady) {
    return <AdminLoadingState title={`Memuat ${title.toLowerCase()}...`} />;
  }

  return (
    <div className="animate-fade-in flex min-h-[calc(100vh-8rem)] flex-col space-y-7 lg:space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-5">
        <div className="rounded-2xl border border-emerald-100 bg-white/78 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700/70">Total Thread</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{counts.total}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-white/78 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700/70">Perlu Balasan</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{counts.unread}</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-white/78 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700/70">Sudah Dibalas</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{counts.replied}</p>
        </div>
      </div>

      {persistenceMode !== 'database' ? (
        <AdminNotice
          tone="amber"
          title="Mode penyimpanan sementara aktif"
          description="Balasan dan lampiran inbox admin saat ini masih tersimpan di memory server. Jika backend restart, data perubahan terbaru dapat hilang."
        />
      ) : null}

      {error ? (
        <AdminNotice
          tone="rose"
          title="Inbox gagal dimuat"
          description={error}
          action={retryAction ? (
            <AdminSecondaryButton onClick={retryAction}>Coba lagi</AdminSecondaryButton>
          ) : null}
        />
      ) : null}

      <AdminSurface className="flex min-h-[680px] min-w-0 flex-1 flex-col overflow-hidden md:flex-row">
        <div className="flex w-full shrink-0 flex-col border-b border-slate-100 bg-slate-50/45 md:min-w-[320px] md:basis-[34%] md:border-b-0 md:border-r lg:min-w-[340px] xl:basis-[30%]">
          <div className="space-y-4 border-b border-slate-100 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
                {title}
              </p>
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition-all focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2" aria-label="Filter status thread">
              {[
                { value: 'all', label: 'Semua', count: counts.total },
                { value: 'unread', label: 'Perlu balas', count: counts.unread },
                { value: 'replied', label: 'Sudah dibalas', count: counts.replied },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={statusFilter === item.value}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${statusFilter === item.value ? 'bg-emerald-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700'}`}
                  onClick={() => setStatusFilter(item.value)}
                >
                  {item.label} ({item.count})
                </button>
              ))}
            </div>

            <label className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Urutkan
              <select
                className="min-w-[150px] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold normal-case tracking-normal text-slate-600 outline-none transition-all focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value)}
              >
                <option value={MESSAGE_SORT.NEWEST}>Terbaru</option>
                <option value={MESSAGE_SORT.OLDEST}>Terlama</option>
                <option value={MESSAGE_SORT.NEEDS_REPLY}>Perlu balas dulu</option>
              </select>
            </label>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredThreads.length === 0 ? (
              <div className="p-5">
                <AdminEmptyState
                  icon={Icon}
                  title={isFiltered ? 'Tidak ada hasil yang cocok' : emptyTitle}
                  description={isFiltered ? 'Coba ubah kata kunci atau filter status untuk melihat thread lain.' : emptyDescription}
                />
              </div>
            ) : (
              filteredThreads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  aria-current={activeThread?.id === thread.id ? 'true' : undefined}
                  className={`block w-full border-b border-slate-100 px-4 py-4 text-left transition-colors hover:bg-emerald-50/35 ${activeThread?.id === thread.id ? 'border-l-2 border-l-emerald-600 bg-emerald-50/55' : 'border-l-2 border-l-transparent'}`}
                  onClick={() => setActiveThreadId(thread.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-semibold text-slate-900">{thread.senderName}</p>
                      <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-600">{thread.subject}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {resolveSummaryLine ? resolveSummaryLine(thread) : getLatestThreadPreview(thread)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock size={11} />
                        {formatShortDate(thread.updatedAt || thread.createdAt)}
                      </span>
                      <div className="mt-2">
                        <AdminTag tone={getMessageStatusMeta(thread, 'admin').tone}>
                          {getMessageStatusMeta(thread, 'admin').label}
                        </AdminTag>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
          {activeThread ? (
            <>
              <div className="flex min-w-0 flex-col gap-4 border-b border-slate-100 p-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-slate-900">{activeThread.subject}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {resolveMetaLine ? resolveMetaLine(activeThread) : activeThread.senderName}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">Masuk pada {formatThreadDate(activeThread.createdAt)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeThread.courseTitle ? (
                      <AdminTag tone="blue">{activeThread.courseTitle}</AdminTag>
                    ) : null}
                    {activeThread.enrollmentId ? (
                      <AdminTag tone="slate">Enrollment {activeThread.enrollmentId}</AdminTag>
                    ) : null}
                    {activeThread.studentId ? (
                      <AdminTag tone="slate">ID Siswa {activeThread.studentId}</AdminTag>
                    ) : null}
                    {response.trim() ? (
                      <AdminTag tone="amber">Draft tersimpan</AdminTag>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <AdminTag tone={activeStatusMeta.tone}>
                    {activeStatusMeta.label}
                  </AdminTag>
                  {getThreadStatus(activeThread) === 'replied' ? (
                    <AdminSecondaryButton disabled={isStatusPending || isReplyPending} onClick={() => handleMarkAsUnread(activeThread.id)}>
                      Tandai perlu balas
                    </AdminSecondaryButton>
                  ) : null}
                  {allowDelete ? (
                    <AdminSecondaryButton
                      className="text-rose-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                      disabled
                    >
                      Hapus
                    </AdminSecondaryButton>
                  ) : null}
                </div>
              </div>

              <div ref={messageListRef} className="flex-1 space-y-4 overflow-x-hidden overflow-y-auto bg-slate-50/45 p-6">
                {activeThread.messages.map((message) => (
                  <div key={message.id} className={`flex flex-col ${message.isAdmin ? 'items-end' : 'items-start'}`}>
                    <div className={`mb-1 flex items-center ${message.isAdmin ? 'mr-1' : 'ml-1'}`}>
                      {message.isAdmin ? (
                        <>
                          <span className="mr-2 text-xs font-medium text-slate-600">{message.authorName}</span>
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                            A
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="mr-2 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                            {message.authorName.charAt(0)}
                          </div>
                          <span className="text-xs font-medium text-slate-600">{message.authorName}</span>
                        </>
                      )}
                    </div>
                    <div className={`max-w-[85%] break-words rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm ${message.isAdmin ? 'rounded-tr-sm bg-emerald-600 text-white' : 'rounded-tl-sm border border-slate-100 bg-white text-slate-700'}`}>
                      {message.body || 'Lampiran tanpa teks'}
                    </div>
                    {message.attachments?.length ? (
                      <div className={`mt-2 w-full max-w-[85%] ${message.isAdmin ? 'flex justify-end' : 'flex justify-start'}`}>
                        <div className="w-full max-w-md">
                          {message.attachments.map((attachment) => (
                            <AttachmentCard
                              key={attachment.id}
                              attachment={attachment}
                              tone={message.isAdmin ? 'emerald' : 'slate'}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <span className="mt-2 text-xs text-slate-400">{formatThreadDate(message.createdAt)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 bg-white p-5" aria-busy={isReplyPending}>
                <div className="flex items-center gap-2 overflow-x-auto pb-3">
                  <span className="flex items-center whitespace-nowrap text-xs font-medium text-slate-400">
                    <Zap size={14} className="mr-1 text-amber-500" />
                    Quick Reply:
                  </span>
                  {quickReplies.map((reply) => (
                    <button
                      key={reply}
                      type="button"
                      disabled={isReplyPending}
                      className="whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => handleQuickReply(reply)}
                    >
                      {reply}
                    </button>
                  ))}
                </div>

                {activeAttachment ? (
                  <div className="pb-3" aria-live="polite">
                    <AttachmentCard
                      attachment={activeAttachment}
                      onRemove={isReplyPending ? undefined : handleRemoveAttachment}
                    />
                  </div>
                ) : null}

                {composerError ? (
                  <div className="pb-3" aria-live="polite">
                    <AdminNotice
                      tone="rose"
                      title="Composer belum siap"
                      description={composerError}
                    />
                  </div>
                ) : null}

                <div className="mt-1 flex min-w-0 items-end gap-3">
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                    onChange={handleAttachmentSelection}
                  />
                  <textarea
                    className="min-h-[92px] min-w-0 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    placeholder={`Tulis balasan untuk ${activeThread.senderName}...`}
                    value={response}
                    disabled={isReplyPending}
                    onChange={(event) => handleDraftUpdate(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey && !isReplyPending) {
                        event.preventDefault();
                        handleReply();
                      }
                    }}
                  />
                  <div className="flex shrink-0 flex-col gap-2 self-stretch">
                    <AdminSecondaryButton
                      className="h-11 rounded-[20px] px-4"
                      disabled={isReplyPending}
                      aria-label="Lampirkan file balasan"
                      onClick={() => attachmentInputRef.current?.click()}
                    >
                      <Paperclip size={16} className="mr-2" />
                      Lampiran
                    </AdminSecondaryButton>
                    <AdminPrimaryButton
                      className="h-[76px] min-w-[108px] shrink-0 rounded-[24px] px-4"
                      disabled={isReplyPending || (!response.trim() && !activeAttachment)}
                      aria-label="Kirim balasan"
                      title="Kirim balasan"
                      onClick={handleReply}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Send size={18} />
                        <span className="text-xs font-semibold">{isReplyPending ? 'Mengirim...' : 'Kirim'}</span>
                      </span>
                    </AdminPrimaryButton>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Tekan Enter untuk kirim, Shift+Enter untuk baris baru.
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <AdminEmptyState
                icon={Icon}
                title={emptyTitle}
                description={emptyDescription}
              />
            </div>
          )}
        </div>
      </AdminSurface>

      <AdminToast
        tone={toast.tone}
        title={toast.title}
        description={toast.description}
        onClose={() => setToast({ title: '', description: '', tone: 'emerald' })}
      />
    </div>
  );
}
