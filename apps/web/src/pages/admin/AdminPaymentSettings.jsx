import { useState } from 'react';
import {
  Banknote,
  CreditCard,
  Image,
  Loader2,
  Save,
  ToggleLeft,
  ToggleRight,
  Upload,
} from 'lucide-react';
import { useAdminPaymentSettings, useUpdatePaymentSettings } from '../../hooks/paymentSettings/usePaymentSettings';
import {
  AdminField,
  AdminHero,
  AdminInput,
  AdminNotice,
  AdminPrimaryButton,
  AdminSecondaryButton,
  AdminSectionCard,
  AdminTextarea,
  AdminToast,
} from '../../components/admin/AdminUi';

export default function AdminPaymentSettings() {
  const { data: settings, isLoading, error, refetch } = useAdminPaymentSettings();
  const updateMutation = useUpdatePaymentSettings();

  const [isActive, setIsActive] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [qrisFile, setQrisFile] = useState(null);
  const [qrisPreview, setQrisPreview] = useState('');
  const [toast, setToast] = useState({ title: '', description: '', tone: 'emerald' });

  // Sync local state when settings load from server
  if (settings && !isLoading) {
    if (settings.isActive !== isActive) setIsActive(settings.isActive);
    if (settings.bankName !== bankName) setBankName(settings.bankName || '');
    if (settings.accountNumber !== accountNumber) setAccountNumber(settings.accountNumber || '');
    if (settings.accountHolderName !== accountHolderName) setAccountHolderName(settings.accountHolderName || '');
    if (settings.paymentNotes !== paymentNotes) setPaymentNotes(settings.paymentNotes || '');
  }

  const handleQrisChange = (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    setQrisFile(file);

    const reader = new FileReader();
    reader.onload = (nextEvent) => {
      setQrisPreview(nextEvent.target?.result || '');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      isActive,
      bankName: bankName.trim() || null,
      accountNumber: accountNumber.trim() || null,
      accountHolderName: accountHolderName.trim() || null,
      paymentNotes: paymentNotes.trim() || null,
    };

    if (qrisPreview) {
      payload.qrisDataUrl = qrisPreview;
    }

    try {
      await updateMutation.mutateAsync(payload);
      setQrisFile(null);
      setQrisPreview('');
      setToast({
        tone: 'emerald',
        title: 'Pengaturan pembayaran berhasil disimpan',
        description: 'Instruksi pembayaran manual telah diperbarui.',
      });
    } catch (err) {
      setToast({
        tone: 'rose',
        title: 'Gagal menyimpan',
        description: err.message || 'Terjadi kesalahan. Coba lagi.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 size={40} className="spin mx-auto text-emerald-600" />
          <p className="mt-4 text-slate-500">Memuat pengaturan pembayaran...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-7 lg:space-y-8">
      {error ? (
        <AdminNotice
          tone="rose"
          title="Gagal memuat pengaturan"
          description={error.message || 'Tidak dapat mengambil data.'}
          action={<AdminSecondaryButton onClick={() => refetch()}>Coba lagi</AdminSecondaryButton>}
        />
      ) : null}

      <AdminHero
        icon={Banknote}
        title="Pengaturan Pembayaran"
        description="Kelola instruksi pembayaran manual via QRIS dan transfer bank yang akan ditampilkan kepada calon siswa."
        actions={(
          <AdminPrimaryButton form="payment-settings-form" type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <Save size={16} />
            )}
            Simpan
          </AdminPrimaryButton>
        )}
      />

      <form id="payment-settings-form" onSubmit={handleSubmit} className="max-w-3xl">
        <div className="space-y-6 lg:space-y-7">
          {/* Activation Toggle */}
          <AdminSectionCard title="Status Metode Pembayaran Manual" description="Aktifkan atau nonaktifkan metode pembayaran manual via transfer bank.">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`flex items-center gap-3 rounded-2xl border px-5 py-4 transition-colors w-full text-left ${
                isActive
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              {isActive ? (
                <ToggleRight size={28} className="text-emerald-600" />
              ) : (
                <ToggleLeft size={28} className="text-slate-400" />
              )}
              <div>
                <p className="font-semibold text-slate-800">
                  {isActive ? 'Metode Manual Aktif' : 'Metode Manual Nonaktif'}
                </p>
                <p className="text-sm text-slate-500">
                  {isActive
                    ? 'Calon siswa dapat melihat instruksi transfer manual.'
                    : 'Hanya metode pembayaran Midtrans yang tersedia.'}
                </p>
              </div>
            </button>
          </AdminSectionCard>

          {isActive && (
            <>
              {/* QRIS Upload */}
              <AdminSectionCard title="Kode QRIS" description="Upload gambar kode QRIS yang akan ditampilkan ke calon siswa.">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div className="flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    {qrisPreview ? (
                      <img src={qrisPreview} alt="QRIS Preview" className="h-full w-full object-contain p-2" />
                    ) : settings?.qrisImageUrl ? (
                      <img src={settings.qrisImageUrl} alt="QRIS" className="h-full w-full object-contain p-2" />
                    ) : (
                      <Image size={32} className="text-slate-300" />
                    )}
                  </div>

                  <div className="flex-1">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-emerald-200 hover:text-emerald-700">
                      <Upload size={16} />
                      Pilih gambar QRIS
                      <input type="file" accept="image/*" onChange={handleQrisChange} className="hidden" />
                    </label>
                    <p className="mt-2 text-xs text-slate-500">Format PNG atau JPG. Gambar akan ditampilkan ke calon siswa.</p>
                    {qrisFile ? <p className="mt-1 text-xs font-semibold text-emerald-600">File: {qrisFile.name}</p> : null}
                  </div>
                </div>
              </AdminSectionCard>

              {/* Bank Details */}
              <AdminSectionCard title="Informasi Rekening Bank" description="Masukkan data rekening tujuan transfer untuk pembayaran manual.">
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <AdminField label="Nama Bank">
                      <AdminInput
                        icon={CreditCard}
                        placeholder="Contoh: BCA, Mandiri, BNI"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                      />
                    </AdminField>

                    <AdminField label="Nomor Rekening">
                      <AdminInput
                        icon={CreditCard}
                        placeholder="Contoh: 1234567890"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                      />
                    </AdminField>
                  </div>

                  <AdminField label="Nama Pemilik Rekening">
                    <AdminInput
                      icon={CreditCard}
                      placeholder="Nama sesuai buku tabungan"
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                    />
                  </AdminField>
                </div>
              </AdminSectionCard>

              {/* Payment Notes */}
              <AdminSectionCard title="Catatan & Instruksi Pembayaran" description="Tambahkan instruksi atau catatan penting untuk calon siswa.">
                <AdminField label="Instruksi Pembayaran">
                  <AdminTextarea
                    className="min-h-[140px]"
                    placeholder="Contoh: Silakan lakukan transfer ke rekening di atas dan upload bukti pembayaran..."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                  />
                </AdminField>
              </AdminSectionCard>
            </>
          )}
        </div>
      </form>

      <AdminToast
        tone={toast.tone}
        title={toast.title}
        description={toast.description}
        onClose={() => setToast({ title: '', description: '', tone: 'emerald' })}
      />
    </div>
  );
}
