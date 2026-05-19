import { MessageCircle } from 'lucide-react';
import AdminInboxWorkspace from '../../components/admin/AdminInboxWorkspace';
import { AdminHero } from '../../components/admin/AdminUi';
import { usePublicMessages } from '../../hooks/admin/usePublicMessages';

const quickReplies = [
  'Terima kasih telah menghubungi kami. Kami akan segera mengirimkan brosur.',
  'Untuk biaya kursus, silakan cek halaman Program kami.',
  'Kelas malam tersedia setiap Senin-Rabu pukul 19.00.',
  'Pendaftaran bisa dilakukan secara langsung atau via WhatsApp.',
];

export default function AdminRespon() {
  const { messages, setMessages, isReady, error, reload } = usePublicMessages();

  return (
    <div className="space-y-7 lg:space-y-8">
      <AdminHero
        icon={MessageCircle}
        title="Respon Pesan Publik"
        description="Kelola semua pertanyaan yang masuk dari halaman kontak website dalam inbox yang lebih operasional dan konsisten."
      />

      <AdminInboxWorkspace
        title="Inbox Publik"
        icon={MessageCircle}
        description="Kelola pesan publik"
        searchPlaceholder="Cari nama, email, atau isi pesan..."
        emptyTitle="Tidak ada pesan publik"
        emptyDescription="Pesan dari website akan muncul di sini setelah pengunjung mengirim form kontak."
        quickReplies={quickReplies}
        threads={messages}
        setThreads={setMessages}
        isReady={isReady}
        error={error}
        retryAction={reload}
        resolveMetaLine={(thread) => `${thread.senderEmail} · ${thread.senderAddress || 'Alamat belum tersedia'}`}
        resolveSummaryLine={(thread) => thread.body}
      />
    </div>
  );
}
