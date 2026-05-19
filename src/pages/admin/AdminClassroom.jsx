import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  ClipboardCheck,
  FileText,
  GraduationCap,
  MessageSquareText,
  Plus,
  ShieldCheck,
  UserRoundPlus,
  Users,
} from 'lucide-react';
import {
  AdminHero,
  AdminLoadingState,
  AdminNotice,
  AdminPrimaryButton,
  AdminSearchInput,
  AdminSectionCard,
  AdminSecondaryButton,
  AdminSurface,
  AdminTag,
} from '../../components/admin/AdminUi';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Textarea } from '../../components/ui/textarea';
import { useAdminClassroomData } from '../../hooks/admin/useAdminClassroomData';
import { getClassworkTypeConfig } from '../../utils/domainRelations';

const TAB_ITEMS = [
  { key: 'stream', label: 'Stream' },
  { key: 'classwork', label: 'Classwork' },
  { key: 'people', label: 'People' },
  { key: 'grades', label: 'Grades' },
];

const PEOPLE_FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'verified', label: 'Verified' },
  { key: 'pending', label: 'Pending' },
  { key: 'rejected', label: 'Rejected' },
];

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatPaymentStatus(status) {
  if (status === 'verified') return 'Terverifikasi';
  if (status === 'rejected') return 'Ditolak';
  return 'Pending';
}

function formatScore(value) {
  if (value == null || Number.isNaN(Number(value))) return '-';
  return `${Math.round(Number(value))}`;
}

function buildTopicGroups(classroom) {
  const topicMap = new Map();

  classroom.topics.forEach((topic) => {
    topicMap.set(topic.id, {
      topic,
      items: classroom.genericItems.filter((item) => String(item.topicId) === String(topic.id)),
    });
  });

  return [...topicMap.values()];
}

function getPeopleCandidates(classroom) {
  return classroom.roster.filter((entry) => entry.enrollmentStatus !== 'active' && entry.paymentStatus === 'verified');
}

export default function AdminClassroom() {
  const navigate = useNavigate();
  const { courseId, tab } = useParams();
  const classroomDomain = useAdminClassroomData();
  const [search, setSearch] = useState('');
  const [peopleFilter, setPeopleFilter] = useState('all');
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState('');
  const [postDraft, setPostDraft] = useState({ title: '', body: '' });
  const [itemDraft, setItemDraft] = useState({
    title: '',
    type: 'assignment',
    topicId: '',
    summary: '',
    instructions: '',
    dueAt: '',
    maxScore: '100',
  });

  if (!classroomDomain.isReady) {
    return (
      <AdminLoadingState
        title="Memuat workspace classroom..."
        description="Program kursus, roster siswa, stream, dan gradebook sedang disiapkan."
      />
    );
  }

  if (classroomDomain.error) {
    return (
      <AdminNotice
        tone="rose"
        title="Workspace classroom gagal dimuat"
        description={classroomDomain.error}
      />
    );
  }

  if (!classroomDomain.defaultCourseId) {
    return (
      <AdminNotice
        tone="amber"
        title="Belum ada classroom"
        description="Tambahkan paket kursus terlebih dahulu agar workspace classroom bisa ditampilkan."
      />
    );
  }

  const activeTab = TAB_ITEMS.some((item) => item.key === tab) ? tab : 'stream';
  const activeCourseId = courseId || classroomDomain.defaultCourseId;
  const classrooms = classroomDomain.classrooms;
  const activeClassroom = classrooms.find((item) => String(item.key) === String(activeCourseId)) || classrooms[0] || null;

  if (!courseId && classroomDomain.defaultCourseId) {
    return <Navigate to={`/admin/classroom/${classroomDomain.defaultCourseId}/${activeTab}`} replace />;
  }

  if (!activeClassroom) {
    return <Navigate to={`/admin/classroom/${classroomDomain.defaultCourseId}/stream`} replace />;
  }

  const normalizedSearch = search.trim().toLowerCase();
  const filteredClassrooms = normalizedSearch
    ? classrooms.filter((item) => `${item.course.title} ${item.course.description || ''}`.toLowerCase().includes(normalizedSearch))
    : classrooms;

  const filteredRoster = activeClassroom.roster.filter((entry) => {
    if (peopleFilter !== 'all' && entry.paymentStatus !== peopleFilter) {
      return false;
    }

    return true;
  });

  const topicGroups = buildTopicGroups(activeClassroom);
  const peopleCandidates = getPeopleCandidates(activeClassroom);
  const systemItemMeta = {
    latihan: 'Latihan sistem dari assessment lama',
    teori: 'Ujian teori sistem dari assessment lama',
    praktik: 'Ujian praktik sistem dari assessment lama',
  };

  const handleTabChange = (nextTab) => {
    navigate(`/admin/classroom/${activeClassroom.key}/${nextTab}`);
  };

  const openCreatePost = () => {
    setEditingPostId('');
    setPostDraft({ title: '', body: '' });
    setPostDialogOpen(true);
  };

  const openEditPost = (post) => {
    setEditingPostId(post.id);
    setPostDraft({ title: post.title || '', body: post.body || '' });
    setPostDialogOpen(true);
  };

  const savePost = () => {
    const now = new Date().toISOString();
    classroomDomain.setClassroomPosts((current) => {
      if (editingPostId) {
        return current.map((item) => (
          String(item.id) === String(editingPostId)
            ? {
              ...item,
              title: postDraft.title,
              body: postDraft.body,
              updatedAt: now,
            }
            : item
        ));
      }

      return [
        {
          id: `post-${activeClassroom.key}-${Date.now()}`,
          courseId: activeClassroom.course.id,
          title: postDraft.title,
          body: postDraft.body,
          authorName: 'Admin LKP',
          isPublished: true,
          createdAt: now,
          updatedAt: now,
        },
        ...current,
      ];
    });
    setPostDialogOpen(false);
  };

  const togglePostPublish = (postId) => {
    classroomDomain.setClassroomPosts((current) => current.map((item) => (
      String(item.id) === String(postId)
        ? { ...item, isPublished: item.isPublished === false, updatedAt: new Date().toISOString() }
        : item
    )));
  };

  const deletePost = (postId) => {
    classroomDomain.setClassroomPosts((current) => current.filter((item) => String(item.id) !== String(postId)));
  };

  const saveClassworkItem = () => {
    const now = new Date().toISOString();
    classroomDomain.setClassworkItems((current) => [
      {
        id: `classwork-${activeClassroom.key}-${Date.now()}`,
        courseId: activeClassroom.course.id,
        topicId: itemDraft.topicId || null,
        type: itemDraft.type,
        title: itemDraft.title,
        summary: itemDraft.summary,
        instructions: itemDraft.instructions,
        dueAt: itemDraft.dueAt ? new Date(itemDraft.dueAt).toISOString() : null,
        maxScore: itemDraft.type === 'material' ? null : Number(itemDraft.maxScore || 100),
        passingScore: itemDraft.type === 'material' ? null : 75,
        isPublished: true,
        order: current.filter((item) => String(item.courseId) === String(activeClassroom.course.id)).length + 1,
        createdAt: now,
        updatedAt: now,
      },
      ...current,
    ]);
    setItemDialogOpen(false);
    setItemDraft({
      title: '',
      type: 'assignment',
      topicId: '',
      summary: '',
      instructions: '',
      dueAt: '',
      maxScore: '100',
    });
  };

  const removeMember = (enrollmentId) => {
    classroomDomain.setEnrollments((current) => current.map((item) => (
      String(item.id) === String(enrollmentId)
        ? { ...item, status: 'cancelled', updatedAt: new Date().toISOString() }
        : item
    )));
  };

  const activateMember = (enrollmentId) => {
    classroomDomain.setEnrollments((current) => current.map((item) => (
      String(item.id) === String(enrollmentId)
        ? { ...item, status: 'active', updatedAt: new Date().toISOString() }
        : item
    )));
  };

  const verifyPayment = (enrollmentId) => {
    classroomDomain.setEnrollments((current) => current.map((item) => (
      String(item.id) === String(enrollmentId)
        ? { ...item, paymentStatus: 'verified', paymentDate: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString() }
        : item
    )));
  };

  return (
    <div className="animate-fade-in space-y-7 lg:space-y-8">
      <AdminHero
        icon={GraduationCap}
        title="Classroom"
        description="Kelola stream pengumuman, classwork, peserta, dan gradebook untuk setiap program kursus dari satu workspace."
        actions={(
          <>
            <AdminSearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari program kursus..."
            />
            <AdminSecondaryButton onClick={() => navigate(`/admin/paket-kursus`)}>
              Buka Paket Kursus
            </AdminSecondaryButton>
          </>
        )}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-emerald-100 bg-white/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700/70">Classroom aktif</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{classrooms.length}</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700/70">Siswa aktif</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{activeClassroom.counts.activeStudents}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-white/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700/70">Butuh review</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{activeClassroom.counts.pendingReview}</p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-white/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700/70">Tertahan pembayaran</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{activeClassroom.counts.blockedByPayment}</p>
          </div>
        </div>
      </AdminHero>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <AdminSurface className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Daftar Classroom</h2>
            <AdminTag tone="emerald">{filteredClassrooms.length} program</AdminTag>
          </div>
          <div className="space-y-3">
            {filteredClassrooms.map((classroom) => (
              <Link
                key={classroom.key}
                to={`/admin/classroom/${classroom.key}/${activeTab}`}
                className={`block rounded-[24px] border px-4 py-4 transition-colors ${
                  String(classroom.key) === String(activeClassroom.key)
                    ? 'border-emerald-200 bg-emerald-50/80'
                    : 'border-slate-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{classroom.course.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{classroom.course.duration} • {classroom.course.level}</p>
                  </div>
                  <Badge variant="secondary">{classroom.counts.activeStudents}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AdminTag tone="blue">{classroom.counts.topics} topic</AdminTag>
                  <AdminTag tone="emerald">{classroom.counts.classwork} item</AdminTag>
                  <AdminTag tone="amber">{classroom.counts.pendingReview} review</AdminTag>
                </div>
              </Link>
            ))}
          </div>
        </AdminSurface>

        <div className="space-y-6">
          <AdminSectionCard
            title={activeClassroom.course.title}
            description={activeClassroom.course.description}
            action={(
              <div className="flex flex-wrap gap-2">
                <AdminTag tone="emerald">{activeClassroom.counts.activeStudents} siswa aktif</AdminTag>
                <AdminTag tone="blue">{activeClassroom.counts.topics} topic</AdminTag>
                <AdminTag tone="amber">{activeClassroom.counts.pendingReview} review</AdminTag>
              </div>
            )}
          >
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList variant="line" className="mb-6">
                {TAB_ITEMS.map((item) => (
                  <TabsTrigger key={item.key} value={item.key}>
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="stream" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Stream Pengumuman</h3>
                    <p className="text-sm text-slate-500">Posting pengumuman penting untuk siswa di classroom ini.</p>
                  </div>
                  <AdminPrimaryButton onClick={openCreatePost}>
                    <Plus data-icon="inline-start" />
                    Post pengumuman
                  </AdminPrimaryButton>
                </div>

                <div className="grid gap-4">
                  {activeClassroom.posts.map((post) => (
                    <Card key={post.id} className="bg-white">
                      <CardHeader className="border-b">
                        <CardTitle>{post.title}</CardTitle>
                        <CardDescription>{post.authorName} • {formatDate(post.updatedAt || post.createdAt)}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <p className="text-sm leading-7 text-slate-600">{post.body}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button variant="outline" onClick={() => openEditPost(post)}>Edit</Button>
                          <Button variant="outline" onClick={() => togglePostPublish(post.id)}>
                            {post.isPublished === false ? 'Publish' : 'Unpublish'}
                          </Button>
                          <Button variant="outline" onClick={() => deletePost(post.id)}>Hapus</Button>
                          <AdminTag tone={post.isPublished === false ? 'slate' : 'emerald'}>
                            {post.isPublished === false ? 'Draft' : 'Published'}
                          </AdminTag>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {!activeClassroom.posts.length ? (
                    <AdminNotice tone="slate" title="Belum ada pengumuman" description="Buat posting pertama untuk classroom ini." />
                  ) : null}
                </div>
              </TabsContent>

              <TabsContent value="classwork" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Classwork</h3>
                    <p className="text-sm text-slate-500">Topic dari Paket Kursus dipakai sebagai modul/unit, lalu classroom menampung item generik dan item sistem.</p>
                  </div>
                  <AdminPrimaryButton onClick={() => setItemDialogOpen(true)}>
                    <Plus data-icon="inline-start" />
                    Tambah item
                  </AdminPrimaryButton>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                  <div className="space-y-4">
                    {topicGroups.map(({ topic, items }) => (
                      <Card key={topic.id} className="bg-white">
                        <CardHeader className="border-b">
                          <CardTitle>{topic.order}. {topic.title}</CardTitle>
                          <CardDescription>{topic.summary || 'Ringkasan topic belum ditambahkan.'}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-4">
                          {items.length ? items.map((item) => (
                            <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-slate-800">{item.title}</p>
                                  <p className="mt-1 text-sm text-slate-500">{item.summary || 'Tidak ada ringkasan tambahan.'}</p>
                                </div>
                                <AdminTag tone={item.typeMeta.category === 'material' ? 'blue' : item.typeMeta.category === 'quiz' ? 'amber' : 'emerald'}>
                                  {item.typeMeta.label}
                                </AdminTag>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                                <span>Deadline: {item.dueAt ? formatDate(item.dueAt) : 'Tanpa deadline'}</span>
                                <span>Skor maks: {item.maxScore == null ? '-' : item.maxScore}</span>
                              </div>
                            </div>
                          )) : (
                            <p className="text-sm text-slate-500">Belum ada item generik untuk topic ini.</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Card className="bg-white">
                    <CardHeader className="border-b">
                      <CardTitle>Item Sistem</CardTitle>
                      <CardDescription>Latihan, ujian teori, dan ujian praktik tetap membaca domain assessment yang sudah ada.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4">
                      {activeClassroom.systemItems.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-800">{item.title}</p>
                              <p className="mt-1 text-sm text-slate-500">{item.summary || systemItemMeta[item.typeMeta.key]}</p>
                            </div>
                            <AdminTag tone="amber">{item.typeMeta.label}</AdminTag>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="people" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">People</h3>
                    <p className="text-sm text-slate-500">Kelola siswa yang terdaftar dan atur akses classroom berdasarkan status pembayaran.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PEOPLE_FILTERS.map((filter) => (
                      <Button
                        key={filter.key}
                        variant="outline"
                        onClick={() => setPeopleFilter(filter.key)}
                        className={peopleFilter === filter.key ? 'border-emerald-300 text-emerald-700' : ''}
                      >
                        {filter.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {peopleCandidates.length ? (
                  <Card className="bg-white">
                    <CardHeader className="border-b">
                      <CardTitle>Calon anggota siap diaktifkan</CardTitle>
                      <CardDescription>Siswa berikut sudah terdaftar dan pembayaran terverifikasi, tetapi belum aktif di classroom.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4">
                      {peopleCandidates.map((entry) => (
                        <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                          <div>
                            <p className="font-semibold text-slate-800">{entry.student?.name}</p>
                            <p className="mt-1 text-sm text-slate-500">{entry.student?.nis} • {entry.student?.email}</p>
                          </div>
                          <Button onClick={() => activateMember(entry.id)}>
                            <UserRoundPlus data-icon="inline-start" />
                            Aktifkan ke kelas
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : null}

                <AdminSectionCard
                  title="Roster classroom"
                  description="Semua enrollment pada program ini, termasuk yang masih pending atau ditolak."
                  bodyClassName="px-0 py-0"
                >
                  <div className="overflow-hidden rounded-b-[26px] border-t border-slate-100">
                    <Table>
                      <TableHeader className="bg-slate-50/90">
                        <TableRow>
                          <TableHead>Nama</TableHead>
                          <TableHead>Status enrollment</TableHead>
                          <TableHead>Pembayaran</TableHead>
                          <TableHead>Akses</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRoster.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <div>
                                <p className="font-semibold text-slate-800">{entry.student?.name || 'Siswa'}</p>
                                <p className="mt-1 text-xs text-slate-500">{entry.student?.nis} • {entry.student?.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>{entry.enrollmentStatus}</TableCell>
                            <TableCell>
                              <AdminTag tone={entry.paymentStatus === 'verified' ? 'emerald' : entry.paymentStatus === 'rejected' ? 'rose' : 'amber'}>
                                {formatPaymentStatus(entry.paymentStatus)}
                              </AdminTag>
                            </TableCell>
                            <TableCell>
                              <AdminTag tone={entry.isMemberActive ? 'blue' : 'slate'}>
                                {entry.isMemberActive ? 'Aktif' : 'Tertahan'}
                              </AdminTag>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {entry.paymentStatus !== 'verified' ? (
                                  <Button variant="outline" onClick={() => verifyPayment(entry.id)}>Verifikasi</Button>
                                ) : null}
                                {entry.enrollmentStatus === 'active' ? (
                                  <Button variant="outline" onClick={() => removeMember(entry.id)}>Keluarkan</Button>
                                ) : (
                                  <Button variant="outline" onClick={() => activateMember(entry.id)}>Aktifkan</Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </AdminSectionCard>
              </TabsContent>

              <TabsContent value="grades" className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Grades</h3>
                  <p className="text-sm text-slate-500">Gradebook inti untuk assignment, quiz, dan tiga checkpoint assessment sistem.</p>
                </div>
                <AdminSectionCard
                  title="Gradebook classroom"
                  description="Kolom inti Classroom v1 dengan agregasi item generik dan pembacaan nilai assessment lama."
                  bodyClassName="px-0 py-0"
                >
                  <div className="overflow-hidden rounded-b-[26px] border-t border-slate-100">
                    <Table>
                      <TableHeader className="bg-slate-50/90">
                        <TableRow>
                          <TableHead>Siswa</TableHead>
                          <TableHead>Assignment</TableHead>
                          <TableHead>Quiz</TableHead>
                          <TableHead>Latihan</TableHead>
                          <TableHead>Ujian Teori</TableHead>
                          <TableHead>Ujian Praktik</TableHead>
                          <TableHead>Ringkasan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeClassroom.gradeRows.map((row) => (
                          <TableRow key={row.enrollmentId}>
                            <TableCell>
                              <div>
                                <p className="font-semibold text-slate-800">{row.studentName}</p>
                                <p className="mt-1 text-xs text-slate-500">{formatPaymentStatus(row.paymentStatus)}</p>
                              </div>
                            </TableCell>
                            <TableCell>{formatScore(row.assignmentScore)}</TableCell>
                            <TableCell>{formatScore(row.quizScore)}</TableCell>
                            <TableCell>{formatScore(row.latihanScore)}</TableCell>
                            <TableCell>{formatScore(row.teoriScore)}</TableCell>
                            <TableCell>{formatScore(row.praktikScore)}</TableCell>
                            <TableCell>
                              <AdminTag tone={row.summaryScore != null && row.summaryScore >= 75 ? 'emerald' : 'amber'}>
                                {formatScore(row.summaryScore)}
                              </AdminTag>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </AdminSectionCard>
              </TabsContent>
            </Tabs>
          </AdminSectionCard>
        </div>
      </div>

      <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPostId ? 'Edit pengumuman' : 'Post pengumuman baru'}</DialogTitle>
            <DialogDescription>Buat posting untuk tab Stream classroom ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="post-title">Judul</label>
              <Input id="post-title" value={postDraft.title} onChange={(event) => setPostDraft((current) => ({ ...current, title: event.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="post-body">Isi pengumuman</label>
              <Textarea id="post-body" value={postDraft.body} onChange={(event) => setPostDraft((current) => ({ ...current, body: event.target.value }))} className="min-h-40" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPostDialogOpen(false)}>Batal</Button>
            <Button onClick={savePost} disabled={!postDraft.title.trim() || !postDraft.body.trim()}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tambah item classwork</DialogTitle>
            <DialogDescription>Item generik Classroom v1 tetap dikelompokkan ke topic dari Paket Kursus.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="item-title">Judul</label>
              <Input id="item-title" value={itemDraft.title} onChange={(event) => setItemDraft((current) => ({ ...current, title: event.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="item-type">Jenis</label>
              <select
                id="item-type"
                value={itemDraft.type}
                onChange={(event) => setItemDraft((current) => ({ ...current, type: event.target.value }))}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                {['assignment', 'quiz_assignment', 'question', 'material'].map((type) => (
                  <option key={type} value={type}>{getClassworkTypeConfig(type).label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="item-topic">Topic</label>
              <select
                id="item-topic"
                value={itemDraft.topicId}
                onChange={(event) => setItemDraft((current) => ({ ...current, topicId: event.target.value }))}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">Tanpa topic</option>
                {activeClassroom.topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>{topic.order}. {topic.title}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="item-due-at">Deadline</label>
              <Input id="item-due-at" type="datetime-local" value={itemDraft.dueAt} onChange={(event) => setItemDraft((current) => ({ ...current, dueAt: event.target.value }))} />
            </div>
            <div className="md:col-span-2 flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="item-summary">Ringkasan</label>
              <Textarea id="item-summary" value={itemDraft.summary} onChange={(event) => setItemDraft((current) => ({ ...current, summary: event.target.value }))} />
            </div>
            <div className="md:col-span-2 flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="item-instructions">Instruksi</label>
              <Textarea id="item-instructions" value={itemDraft.instructions} onChange={(event) => setItemDraft((current) => ({ ...current, instructions: event.target.value }))} className="min-h-32" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>Batal</Button>
            <Button onClick={saveClassworkItem} disabled={!itemDraft.title.trim()}>Simpan item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
