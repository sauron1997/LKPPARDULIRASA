import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock, MessageSquare, Plus, Search, Send, X } from 'lucide-react';
import {
  MESSAGE_STATUS,
  filterThreads,
  getLatestThreadPreview,
  getMessageCountLabel,
  getMessageStatusMeta,
  sortThreads,
} from '../../components/messaging/threadUtils';
import {
  useCreateStudentMessageThreadMutation,
  useReplyToStudentMessageThreadMutation,
} from '../../hooks/student/useStudentMutations';
import { useStudentDashboardData } from '../../hooks/student/useStudentDashboardData';
import { normalizeThreadMessages } from '@lkp-parduli-rasa/domain';
import './Dashboard.css';

const topicOptions = ['Jadwal', 'Materi', 'Sertifikat', 'Pembayaran', 'Lainnya'];

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

function normalizeThread(thread) {
  const normalized = normalizeThreadMessages(thread);

  return {
    ...thread,
    body: normalized.body,
    messages: normalized.messages,
    responses: normalized.responses,
    updatedAt: thread.updatedAt || normalized.lastMessageAt,
    lastMessageAt: thread.lastMessageAt || normalized.lastMessageAt,
    lastMessagePreview: thread.lastMessagePreview || normalized.messages.at(-1)?.body || normalized.body,
  };
}

export default function PesanPage() {
  const { isReady, error, portal } = useStudentDashboardData();
  const createThreadMutation = useCreateStudentMessageThreadMutation();
  const replyMutation = useReplyToStudentMessageThreadMutation();
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('Jadwal');
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [formTouched, setFormTouched] = useState(false);
  const [toast, setToast] = useState({ title: '', description: '' });
  const messageListRef = useRef(null);

  const threads = useMemo(
    () => sortThreads(portal.threads.map((thread) => normalizeThread(thread))),
    [portal.threads],
  );
  const counts = useMemo(() => ({
    total: threads.length,
    unread: threads.filter((thread) => thread.status !== MESSAGE_STATUS.REPLIED).length,
    replied: threads.filter((thread) => thread.status === MESSAGE_STATUS.REPLIED).length,
  }), [threads]);
  const filteredThreads = useMemo(
    () => filterThreads(threads, search, statusFilter),
    [search, statusFilter, threads],
  );

  const resolvedActiveThreadId = filteredThreads.some((thread) => String(thread.id) === String(activeThreadId))
    ? activeThreadId
    : (filteredThreads[0]?.id || null);
  const activeThread = filteredThreads.find((thread) => String(thread.id) === String(resolvedActiveThreadId)) || null;
  const activeStatusMeta = activeThread ? getMessageStatusMeta(activeThread, 'student') : null;
  const canCreateThread = Boolean(newSubject.trim() && newMessage.trim() && portal.student);
  const isFiltered = search.trim() || statusFilter !== 'all';

  useEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) return;

    messageList.scrollTo({
      top: messageList.scrollHeight,
      behavior: 'auto',
    });
  }, [activeThread?.id, activeThread?.messages.length]);

  const createThread = async () => {
    if (!canCreateThread) {
      setFormTouched(true);
      return;
    }

    try {
      const nextThread = await createThreadMutation.mutateAsync({
        subject: newSubject.trim(),
        body: newMessage.trim(),
        category: selectedTopic.toLowerCase(),
        threadType: 'consultation',
      });

      setActiveThreadId(nextThread.id);
      setNewSubject('');
      setNewMessage('');
      setReplyMessage('');
      setFormTouched(false);
      setComposeOpen(false);
      setToast({
        title: 'Thread konsultasi dibuat',
        description: 'Pesan Anda masuk ke inbox admin dan menunggu balasan.',
      });
    } catch (submitError) {
      setToast({
        title: 'Thread belum terkirim',
        description: submitError.message || 'Pesan gagal dikirim. Coba lagi.',
      });
    }
  };

  const sendReply = async () => {
    if (!replyMessage.trim() || !activeThread || !portal.student) {
      return;
    }

    try {
      await replyMutation.mutateAsync({
        threadId: activeThread.id,
        body: replyMessage.trim(),
      });

      setReplyMessage('');
      setToast({
        title: 'Balasan terkirim',
        description: 'Thread kembali ditandai menunggu respons admin.',
      });
    } catch (submitError) {
      setToast({
        title: 'Balasan belum terkirim',
        description: submitError.message || 'Balasan gagal dikirim. Coba lagi.',
      });
    }
  };

  if (!isReady) {
    return (
      <div className="dash-page animate-fade-in">
        <div className="dash-state-card">
          <h2>Menyiapkan konsultasi...</h2>
          <p>Thread konsultasi dan riwayat balasan admin sedang dimuat.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dash-page animate-fade-in">
        <div className="dash-state-card danger">
          <h2>Konsultasi belum bisa dimuat</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-page animate-fade-in">
      <section className="student-section-header consultation-titlebar">
        <div>
          <span className="student-section-eyebrow">Konsultasi</span>
          <h2>Komunikasi dengan admin</h2>
          <p className="dash-subtitle">Buat thread baru atau lanjutkan percakapan yang sudah berjalan.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setComposeOpen((current) => !current)}>
          {composeOpen ? <X size={16} /> : <Plus size={16} />}
          {composeOpen ? 'Tutup Form' : 'Buka Konsultasi Baru'}
        </button>
      </section>

      <section className="consultation-layout">
        <article className="consultation-sidebar">
          <div className={`consultation-compose ${composeOpen ? 'is-open' : ''}`}>
            <div className="student-panel-heading">
              <div>
                <span className="student-section-eyebrow">Thread Baru</span>
                <h3>Buka konsultasi</h3>
              </div>
            </div>

            <div className="consultation-form">
              <div className="consultation-topic-chips" aria-label="Topik konsultasi">
                {topicOptions.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    className={selectedTopic === topic ? 'active' : ''}
                    aria-pressed={selectedTopic === topic}
                    onClick={() => {
                      setSelectedTopic(topic);
                      if (!newSubject.trim() && topic !== 'Lainnya') {
                        setNewSubject(topic);
                      }
                    }}
                  >
                    {topic}
                  </button>
                ))}
              </div>
              <label>
                <span>Subjek</span>
                <input
                  className={formTouched && !newSubject.trim() ? 'input-error' : ''}
                  value={newSubject}
                  onBlur={() => setFormTouched(true)}
                  onChange={(event) => setNewSubject(event.target.value)}
                  placeholder="Subjek konsultasi"
                />
              </label>
              <label>
                <span>Pesan</span>
                <textarea
                  className={formTouched && !newMessage.trim() ? 'input-error' : ''}
                  value={newMessage}
                  onBlur={() => setFormTouched(true)}
                  onChange={(event) => setNewMessage(event.target.value)}
                  placeholder="Tulis pertanyaan atau kebutuhan Anda untuk admin..."
                />
              </label>
              {formTouched && !canCreateThread ? (
                <p className="consultation-form-error">Isi subjek dan pesan sebelum membuat thread.</p>
              ) : null}
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canCreateThread || createThreadMutation.isPending}
                onClick={createThread}
              >
                <Plus size={16} /> Buat Thread
              </button>
            </div>
          </div>

          <div className="consultation-toolbar">
            <label className="consultation-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari konsultasi..."
                aria-label="Cari konsultasi"
              />
            </label>
            <div className="consultation-filters" aria-label="Filter konsultasi">
              {[
                { value: 'all', label: 'Semua', count: counts.total },
                { value: MESSAGE_STATUS.UNREAD, label: 'Menunggu', count: counts.unread },
                { value: MESSAGE_STATUS.REPLIED, label: 'Dibalas', count: counts.replied },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={statusFilter === item.value ? 'active' : ''}
                  aria-pressed={statusFilter === item.value}
                  onClick={() => setStatusFilter(item.value)}
                >
                  {item.label} ({item.count})
                </button>
              ))}
            </div>
          </div>

          <div className="consultation-thread-list">
            {filteredThreads.length === 0 ? (
              <div className="dash-empty small">
                <MessageSquare size={32} />
                <p>{isFiltered ? 'Tidak ada thread yang cocok.' : 'Belum ada thread konsultasi.'}</p>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setComposeOpen(true)}>
                  <Plus size={15} /> Mulai konsultasi
                </button>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const statusMeta = getMessageStatusMeta(thread, 'student');
                return (
                  <button
                    key={thread.id}
                    type="button"
                    aria-current={String(activeThread?.id) === String(thread.id) ? 'true' : undefined}
                    className={`consultation-thread-item ${String(activeThread?.id) === String(thread.id) ? 'active' : ''}`}
                    onClick={() => setActiveThreadId(thread.id)}
                  >
                    <div className="consultation-thread-head">
                      <strong>{thread.subject}</strong>
                      <span className={`consultation-status ${statusMeta.className}`}>{statusMeta.label}</span>
                    </div>
                    <p>{getLatestThreadPreview(thread)}</p>
                    <div className="consultation-thread-meta">
                      <span><Clock size={13} /> {formatThreadDate(thread.updatedAt || thread.lastMessageAt || thread.createdAt)}</span>
                      <span>{getMessageCountLabel(thread)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </article>

        <article className="consultation-main">
          {activeThread ? (
            <>
              <div className="consultation-header">
                <div className="consultation-header-copy">
                  <h3>{activeThread.subject}</h3>
                  <p>{activeThread.status === 'replied' ? 'Admin sudah merespons thread ini.' : 'Thread ini masih menunggu balasan admin.'}</p>
                  <div className="consultation-header-meta">
                    {activeStatusMeta ? <span className={`consultation-status ${activeStatusMeta.className}`}>{activeStatusMeta.label}</span> : null}
                    {portal.course?.title ? <span>{portal.course.title}</span> : null}
                    <span>{getMessageCountLabel(activeThread)}</span>
                  </div>
                </div>
              </div>

              <div ref={messageListRef} className="consultation-messages">
                {activeThread.messages.map((message) => (
                  <div key={message.id} className={`consultation-bubble ${message.authorRole === 'admin' ? 'admin' : 'student'}`}>
                    <span>{message.authorName}</span>
                    <p>{message.body}</p>
                    <small>{new Date(message.createdAt).toLocaleString('id-ID')}</small>
                  </div>
                ))}
              </div>

              <div className="consultation-reply-box">
                <label>
                  <span>Balasan lanjutan</span>
                  <textarea
                    value={replyMessage}
                    onChange={(event) => setReplyMessage(event.target.value)}
                    placeholder="Tulis balasan lanjutan untuk admin..."
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!replyMessage.trim() || replyMutation.isPending}
                  onClick={sendReply}
                >
                  <Send size={16} /> Kirim Balasan
                </button>
              </div>
            </>
          ) : (
            <div className="dash-empty">
              <MessageSquare size={48} />
              <h3>{isFiltered ? 'Tidak ada thread yang cocok' : 'Pilih atau buat thread konsultasi'}</h3>
              <p>{isFiltered ? 'Ubah pencarian atau filter untuk melihat thread lainnya.' : 'Mulai konsultasi tentang jadwal, materi, sertifikat, atau pembayaran.'}</p>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setComposeOpen(true)}>
                <Plus size={15} /> Buka konsultasi baru
              </button>
            </div>
          )}
        </article>
      </section>

      {toast.title || toast.description ? (
        <div className="consultation-toast" role="status" aria-live="polite">
          <CheckCircle2 size={18} />
          <div>
            <strong>{toast.title}</strong>
            <p>{toast.description}</p>
          </div>
          <button type="button" aria-label="Tutup notifikasi" onClick={() => setToast({ title: '', description: '' })}>
            <X size={16} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
