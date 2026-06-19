/**
 * Performance Benchmark — Phase 5 Verification
 *
 * Micro-benchmarks for the two highest-impact backend optimizations:
 *  1. buildLearningOps() — O(n²) → O(n) Map lookups
 *  2. listStudents()    — pagination caps memory pressure
 *
 * Run with:  node scripts/perf-benchmark.mjs
 *
 * The script builds a synthetic dataset (in-memory repos), invokes the
 * real use-case factories, and reports median timing over a number of
 * iterations. No external services or DB required.
 */

import { performance } from 'node:perf_hooks';
import { createDashboardQuery } from '../packages/domain/src/use-cases/dashboard.query.js';
import { createStudentUseCases } from '../packages/domain/src/use-cases/student.usecase.js';

const STUDENT_COUNTS = [100, 500, 1000];
const ITERATIONS = 20;

function makeStudent(i) {
  return {
    id: i,
    nis: `NIS-${i}`,
    name: `Siswa ${i}`,
    email: `siswa${i}@example.com`,
    phone: '081234567890',
    status: i % 2 === 0 ? 'Aktif' : 'Lulus',
    program: 'Microsoft Word',
    courseId: (i % 6) + 1,
    enrollmentId: `enr-${i}`,
    paymentStatus: 'verified',
    registrationDate: '2026-01-01',
  };
}

function makeEnrollment(i) {
  return {
    id: `enr-${i}`,
    studentId: i,
    courseId: (i % 6) + 1,
    program: 'Microsoft Word',
    status: 'active',
    paymentStatus: 'verified',
    progressPercent: 50,
  };
}

function makeCourse(i) {
  return { id: i, title: `Course ${i}` };
}

function makeProgress(i) {
  return {
    id: `p-${i}`,
    enrollmentId: `enr-${i}`,
    studentId: i,
    courseId: (i % 6) + 1,
    type: 'latihan',
    status: 'passed',
  };
}

function makeSubmission(i) {
  return {
    id: `s-${i}`,
    enrollmentId: `enr-${i}`,
    studentId: i,
    courseId: (i % 6) + 1,
    status: 'in_review',
  };
}

function makeCert(i) {
  return { id: `c-${i}`, studentId: i, enrollmentId: `enr-${i}`, courseId: (i % 6) + 1, fileMediaId: 'm1' };
}

function makeMessage(i) {
  return { id: `m-${i}`, channel: 'student', studentId: i, status: i % 3 === 0 ? 'unread' : 'replied' };
}

function makeBlogPost(i) {
  return { id: `b-${i}`, title: `Blog ${i}`, slug: `blog-${i}`, content: 'x' };
}

function buildRepos(count) {
  const students = Array.from({ length: count }, (_, i) => makeStudent(i + 1));
  const enrollments = students.map(makeEnrollment);
  const courses = Array.from({ length: 6 }, (_, i) => makeCourse(i + 1));
  const progress = students.map(makeProgress);
  const submissions = students.map(makeSubmission);
  const certs = students.map(makeCert);
  const sessions = [];
  const assignments = [];
  const records = [];
  const studentMessages = students.map(makeMessage);
  const publicMessages = [];
  const blogPosts = Array.from({ length: 5 }, (_, i) => makeBlogPost(i + 1));

  return {
    studentRepo: { list: async () => students },
    courseRepo: { list: async () => courses },
    enrollmentRepo: { list: async () => enrollments },
    scheduleSessionRepo: { list: async () => sessions },
    scheduleAssignmentRepo: { listAll: async () => assignments },
    attendanceRepo: { list: async () => records },
    certificateRepo: { list: async () => certs },
    assessmentRepo: {
      listDefinitions: async () => [],
      listProgress: async () => progress,
      listSubmissions: async () => submissions,
    },
    messageRepo: {
      listPublic: async () => publicMessages,
      listStudent: async () => studentMessages,
    },
    blogRepo: { list: async () => blogPosts },
    accountRepo: { list: async () => [] },
  };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

async function timeOnce(fn) {
  const start = performance.now();
  await fn();
  return performance.now() - start;
}

async function benchDashboard() {
  console.log('\n=== buildLearningOps benchmark (median over %d runs) ===', ITERATIONS);
  for (const count of STUDENT_COUNTS) {
    const repos = buildRepos(count);
    const dashboard = createDashboardQuery(repos);

    // Warm-up to amortize JIT
    await dashboard.buildLearningOps();

    const samples = [];
    for (let i = 0; i < ITERATIONS; i += 1) {
      samples.push(await timeOnce(() => dashboard.buildLearningOps()));
    }
    console.log(
      `  students=${count.toString().padStart(4)} -> median ${median(samples).toFixed(2)}ms (min ${Math.min(...samples).toFixed(2)}ms, max ${Math.max(...samples).toFixed(2)}ms)`,
    );
  }
}

async function benchListStudents() {
  console.log('\n=== listStudents benchmark (median over %d runs) ===', ITERATIONS);
  const repos = buildRepos(1000);
  const useCases = createStudentUseCases(repos);

  // Warm-up
  await useCases.listStudents();

  const cases = [
    { label: 'no filters', filters: {} },
    { label: 'search=ah', filters: { search: 'ah' } },
    { label: 'status=Aktif + limit=50', filters: { status: 'Aktif', limit: 50 } },
    { label: 'status=Aktif + limit=50 + offset=100', filters: { status: 'Aktif', limit: 50, offset: 100 } },
  ];
  for (const { label, filters } of cases) {
    const samples = [];
    for (let i = 0; i < ITERATIONS; i += 1) {
      samples.push(await timeOnce(() => useCases.listStudents(filters)));
    }
    const result = await useCases.listStudents(filters);
    console.log(
      `  ${label.padEnd(40)} -> median ${median(samples).toFixed(2)}ms (returned ${result.students.length}/${result.total})`,
    );
  }
}

async function main() {
  console.log('Phase 5 Performance Benchmark');
  console.log('==============================');
  await benchDashboard();
  await benchListStudents();
  console.log('\nDone.');
}

main().catch((error) => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});
