import { TrendingUp } from 'lucide-react';
import {
  AdminSectionCard,
  AdminSidebarPanel,
  AdminTag,
} from './AdminUi';

const chartGradientId = 'admin-dashboard-area-gradient';
const chartWidth = 320;
const chartHeight = 220;
const chartPadding = {
  top: 16,
  right: 12,
  bottom: 32,
  left: 12,
};

function formatTick(value) {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function buildAreaChart(registrationTrend) {
  if (!registrationTrend.length) {
    return {
      points: [],
      areaPath: '',
      linePath: '',
      ticks: [0, 50, 100],
      maxValue: 100,
    };
  }

  const innerWidth = chartWidth - chartPadding.left - chartPadding.right;
  const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const maxValue = Math.max(...registrationTrend.map((item) => Number(item.value) || 0), 1);
  const stepX = registrationTrend.length > 1 ? innerWidth / (registrationTrend.length - 1) : innerWidth / 2;
  const bottomY = chartPadding.top + innerHeight;
  const points = registrationTrend.map((item, index) => {
    const normalizedValue = Number(item.value) || 0;
    const x = chartPadding.left + (registrationTrend.length === 1 ? innerWidth / 2 : index * stepX);
    const y = chartPadding.top + innerHeight - ((normalizedValue / maxValue) * innerHeight);
    return {
      ...item,
      value: normalizedValue,
      x,
      y,
    };
  });
  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;
  const ticks = [maxValue, maxValue * 0.5, 0].map((value) => formatTick(value));

  return {
    points,
    areaPath,
    linePath,
    ticks,
    maxValue,
  };
}

function buildProgramDistributionStyle(programDistribution) {
  if (!programDistribution.length) {
    return {
      background: 'conic-gradient(#e2e8f0 0deg 360deg)',
    };
  }

  let currentAngle = 0;
  const segments = programDistribution.map((item) => {
    const segmentAngle = (Number(item.percentage) || 0) * 3.6;
    const nextAngle = currentAngle + segmentAngle;
    const segment = `${item.color} ${currentAngle}deg ${nextAngle}deg`;
    currentAngle = nextAngle;
    return segment;
  });

  if (currentAngle < 360) {
    segments.push(`#e2e8f0 ${currentAngle}deg 360deg`);
  }

  return {
    background: `conic-gradient(${segments.join(', ')})`,
  };
}

export default function AdminDashboardCharts({
  registrationTrend,
  programDistribution,
  studentCount,
  children,
}) {
  const areaChart = buildAreaChart(registrationTrend);
  const distributionStyle = buildProgramDistributionStyle(programDistribution);
  const latestValue = registrationTrend[registrationTrend.length - 1]?.value || 0;
  const earliestValue = registrationTrend[0]?.value || 0;
  const trendDelta = latestValue - earliestValue;
  const trendLabel = trendDelta >= 0 ? `+${trendDelta}` : String(trendDelta);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:gap-7 2xl:gap-8">
      <AdminSectionCard
        title="Tren Pendaftaran Siswa Baru"
        description="Pergerakan jumlah pendaftar selama enam bulan terakhir."
        action={<AdminTag tone="emerald" className="px-3 py-1.5 text-sm">{trendLabel} vs awal periode</AdminTag>}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Aktivitas pendaftaran</p>
            <p className="text-sm text-slate-500">Momentum intake enam bulan terakhir</p>
          </div>
        </div>

        <div className="mt-6 rounded-[28px] border border-slate-100 bg-slate-50/70 p-4">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-[270px] w-full lg:h-[286px]" role="img" aria-label="Grafik tren pendaftaran siswa baru">
            <defs>
              <linearGradient id={chartGradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#11a36a" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#11a36a" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {areaChart.ticks.map((tick, index) => {
              const y = chartPadding.top + ((chartHeight - chartPadding.top - chartPadding.bottom) / (areaChart.ticks.length - 1 || 1)) * index;
              return (
                <g key={`tick-${tick}`}>
                  <line
                    x1={chartPadding.left}
                    x2={chartWidth - chartPadding.right}
                    y1={y}
                    y2={y}
                    stroke="#e7eef2"
                    strokeDasharray="4 8"
                  />
                  <text x={chartWidth - chartPadding.right} y={y - 6} textAnchor="end" fontSize="11" fill="#94a3b8">
                    {tick}
                  </text>
                </g>
              );
            })}

            {areaChart.areaPath ? <path d={areaChart.areaPath} fill={`url(#${chartGradientId})`} /> : null}
            {areaChart.linePath ? (
              <path
                d={areaChart.linePath}
                fill="none"
                stroke="#0f9f61"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
            {areaChart.points.map((point) => (
              <g key={point.month}>
                <circle cx={point.x} cy={point.y} r="6" fill="#ffffff" />
                <circle cx={point.x} cy={point.y} r="4" fill="#0f9f61" />
                <text x={point.x} y={chartHeight - 6} textAnchor="middle" fontSize="12" fill="#64748b">
                  {point.month}
                </text>
              </g>
            ))}
          </svg>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-emerald-600" />
            Jumlah pendaftaran
          </div>
          <span className="font-semibold text-slate-700">{latestValue} pendaftar pada periode terbaru</span>
        </div>
      </AdminSectionCard>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:gap-7">
        <AdminSidebarPanel
          title="Distribusi Paket Kursus"
          description="Program yang paling banyak dipilih siswa."
          contentClassName="mt-6"
        >
          <div className="grid gap-5 xl:grid-cols-[210px_minmax(0,1fr)] xl:items-center">
            <div className="relative flex h-[210px] items-center justify-center">
              <div className="h-[176px] w-[176px] rounded-full" style={distributionStyle} aria-hidden="true" />
              <div className="absolute flex h-[108px] w-[108px] flex-col items-center justify-center rounded-full bg-white shadow-[0_18px_45px_-20px_rgba(15,23,42,0.18)]">
                <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-slate-400">Total</span>
                <span className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{studentCount}</span>
                <span className="text-sm text-slate-500">Siswa aktif</span>
              </div>
            </div>

            <div className="space-y-3">
              {programDistribution.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-4 text-sm">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="truncate font-medium text-slate-700">{item.name}</span>
                  </div>
                  <span className="font-semibold text-slate-500">{item.percentage}%</span>
                </div>
              ))}

              {!programDistribution.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-sm text-slate-500">
                  Belum ada distribusi paket untuk divisualkan.
                </div>
              ) : null}
            </div>
          </div>
        </AdminSidebarPanel>

        {children}
      </div>
    </div>
  );
}
