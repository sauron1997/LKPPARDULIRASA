import { useState } from 'react';
import { Search, Download, FileDown, Filter } from 'lucide-react';
import { usePublicStudentsQuery } from '../../hooks/public/usePublicQueries';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';
import SEO from '../../components/SEO/SEO';
import './Pages.css';

const studentColumns = [
  { key: 'nis', label: 'NIS' },
  { key: 'name', label: 'Nama' },
  { key: 'program', label: 'Program' },
  { key: 'status', label: 'Status' },
];

export default function SiswaKursusPage() {
  const { data: students = [] } = usePublicStudentsQuery();
  const [search, setSearch] = useState('');
  const [filterProgram, setFilterProgram] = useState('all');
  const [showExport, setShowExport] = useState(false);

  const programs = [...new Set(students.map((student) => student.program))];

  const filtered = students.filter((student) => {
    const matchSearch = student.name.toLowerCase().includes(search.toLowerCase())
      || student.nis.toLowerCase().includes(search.toLowerCase());
    const matchProgram = filterProgram === 'all' || student.program === filterProgram;
    return matchSearch && matchProgram;
  });

  const handleExport = (type) => {
    const data = filtered.map((student, index) => ({ no: index + 1, ...student }));
    const cols = [{ key: 'no', label: 'No' }, ...studentColumns];
    if (type === 'csv') exportToCSV(data, 'Data_Siswa_LKP_Parduli_Rasa', cols);
    if (type === 'excel') exportToExcel(data, 'Data_Siswa_LKP_Parduli_Rasa', cols);
    if (type === 'pdf') exportToPDF(data, 'Data Siswa Kursus - LKP Parduli Rasa', cols);
    setShowExport(false);
  };

  return (
    <div className="page-wrapper">
      <SEO title="Siswa Kursus" description="Database siswa kursus LKP Parduli Rasa Komputer." />
      <div className="page-hero">
        <div className="container">
          <h1>Siswa Kursus</h1>
          <p>Database siswa kursus LKP Parduli Rasa Komputer</p>
        </div>
      </div>
      <div className="container section">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={18} />
            <input type="text" placeholder="Cari nama atau NIS..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <div className="filter-box">
            <Filter size={16} />
            <select value={filterProgram} onChange={(event) => setFilterProgram(event.target.value)}>
              <option value="all">Semua Program</option>
              {programs.map((program) => <option key={program} value={program}>{program}</option>)}
            </select>
          </div>
          <div className="export-dropdown-wrapper">
            <button className="btn btn-primary btn-sm" onClick={() => setShowExport((current) => !current)}>
              <FileDown size={16} /> Unduh Data
            </button>
            {showExport ? (
              <div className="export-dropdown">
                <button onClick={() => handleExport('pdf')}><Download size={14} /> Unduh PDF</button>
                <button onClick={() => handleExport('csv')}><Download size={14} /> Unduh CSV</button>
                <button onClick={() => handleExport('excel')}><Download size={14} /> Unduh Excel</button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>NIS</th>
                <th>Nama</th>
                <th>Program</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student, index) => (
                <tr key={student.id}>
                  <td>{index + 1}</td>
                  <td><strong>{student.nis}</strong></td>
                  <td>{student.name}</td>
                  <td>{student.program}</td>
                  <td>
                    <span className={`badge ${student.status === 'Aktif' ? 'badge-success' : 'badge-primary'}`}>
                      {student.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr><td colSpan="5" className="text-center" style={{ padding: '32px', color: 'var(--text-muted)' }}>Tidak ada data ditemukan</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
