import { MessageSquare } from 'lucide-react';
import AdminInboxWorkspace from '../../components/admin/AdminInboxWorkspace';
import { AdminHero } from '../../components/admin/AdminUi';
import { getLatestThreadPreview } from '../../components/messaging/threadUtils';
import { useStudentMessages } from '../../hooks/admin/useStudentMessages';

const quickReplies = [
  'Tentu, silakan cek menu materi ya.',
  'Jadwal kelas minggu ini tetap sama.',
  'Sertifikat sedang dalam proses pencetakan.',
  'Baik, terima kasih atas informasinya.',
];

export default function AdminPesanSiswa() {
  const { messages, setMessages, isReady, error, reload } = useStudentMessages();

  return (
    <div className="space-y-7 lg:space-y-8">
      <AdminHero
        icon={MessageSquare}
        title="Pesan dari Siswa"
        description="Satukan percakapan siswa dalam satu inbox yang rapi, bisa dicari, dan menyimpan riwayat balasan admin."
      />

      <AdminInboxWorkspace
        title="Inbox Siswa"
        icon={MessageSquare}
        description="Kelola pesan siswa"
        searchPlaceholder="Cari nama siswa, subjek, atau isi pesan..."
        emptyTitle="Tidak ada pesan siswa"
        emptyDescription="Pesan dari siswa terdaftar akan tampil di sini untuk ditindaklanjuti admin."
        quickReplies={quickReplies}
        threads={messages}
        setThreads={setMessages}
        isReady={isReady}
        error={error}
        retryAction={reload}
        resolveMetaLine={(thread) => `Dari ${thread.senderName}${thread.courseTitle ? ` - ${thread.courseTitle}` : ''}`}
        resolveSummaryLine={(thread) => getLatestThreadPreview(thread)}
      />
    </div>
  );
}
