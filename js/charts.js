export function renderTrendCharts(container, student, orderedFiles, Chart) {
  container.innerHTML = '';
  const examLabels = orderedFiles.map(f => f.filename.replace(/\.(xlsx|xls)$/i, ''));
  const colors = {
    score: 'rgba(74,108,247,1)', scoreFill: 'rgba(74,108,247,0.08)',
    rank: 'rgba(245,158,11,1)', rankFill: 'rgba(245,158,11,0.08)',
    total: 'rgba(16,185,129,1)', totalFill: 'rgba(16,185,129,0.08)',
    missing: 'rgba(200,200,210,0.6)',
  };
  const allSubjects = getAllSubjectKeys(student);
  for (const subj of allSubjects) {
    const scores = student['score_' + subj]; if (!scores) continue;
    const wrap = createChartWrap(subj + ' \u{6210}\u{7ee9}\u{8d70}\u{52bf}');
    const canvas = document.createElement('canvas'); wrap.appendChild(canvas); container.appendChild(wrap);
    createSparkline(canvas, examLabels, scores, student.missing, colors, Chart, 'line');
  }
  const totalKeys = getAllTotalKeys(student);
  for (const label of totalKeys) {
    const totals = student['total_' + label]; if (!totals) continue;
    const wrap = createChartWrap((label||'\u{603b}\u{5206}') + ' \u{8d70}\u{52bf}');
    const canvas = document.createElement('canvas'); wrap.appendChild(canvas); container.appendChild(wrap);
    createSparkline(canvas, examLabels, totals, student.missing, colors, Chart, 'bar');
  }
  const rankKeys = getAllRankKeys(student);
  for (const type of rankKeys) {
    const ranks = student['rank_' + type]; if (!ranks) continue;
    const rankLabel = getRankLabel(type);
    const wrap = createChartWrap(rankLabel + ' \u{8d70}\u{52bf}');
    const canvas = document.createElement('canvas'); wrap.appendChild(canvas); container.appendChild(wrap);
    createRankSparkline(canvas, examLabels, ranks, student.missing, colors, Chart);
  }
}
function createChartWrap(title) {
  const wrap = document.createElement('div'); wrap.className = 'trend-chart-wrap';
  const t = document.createElement('div'); t.className = 'trend-chart-title'; t.textContent = title;
  wrap.appendChild(t); return wrap;
}
function createSparkline(canvas, labels, data, missing, colors, Chart, type) {
  const chartData = data.map((v, i) => missing[i] ? null : v);
  new Chart(canvas, {
    type: type === 'bar' ? 'bar' : 'line',
    data: { labels, datasets: [{
      label: '', data: chartData,
      borderColor: type === 'bar' ? colors.total : colors.score,
      backgroundColor: type === 'bar' ? chartData.map(v => v === null ? colors.missing : colors.total) : (ctx) => { const { chartArea } = ctx.chart; if (!chartArea) return null; const g = ctx.chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom); g.addColorStop(0, 'rgba(74,108,247,0.18)'); g.addColorStop(1, 'rgba(74,108,247,0.0)'); return g; },
      borderWidth: 2, pointRadius: 3, pointBackgroundColor: chartData.map(v => v === null ? colors.missing : colors.score), pointBorderColor: '#fff', pointBorderWidth: 1,
      spanGaps: false, tension: 0.3, fill: type === 'line', barPercentage: 0.6, borderRadius: 4,
    }]},
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 600 },
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#9ca3af', maxRotation: 45 } },
        y: { beginAtZero: false, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 }, color: '#9ca3af' } },
      },
    },
  });
}
function createRankSparkline(canvas, labels, data, missing, colors, Chart) {
  const chartData = data.map((v, i) => missing[i] ? null : v);
  new Chart(canvas, {
    type: 'line', data: { labels, datasets: [{
      label: '', data: chartData,
      borderColor: colors.rank,
      backgroundColor: (ctx) => { const { chartArea } = ctx.chart; if (!chartArea) return null; const g = ctx.chart.ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom); g.addColorStop(0, 'rgba(245,158,11,0.15)'); g.addColorStop(1, 'rgba(245,158,11,0.0)'); return g; },
      borderWidth: 2, pointRadius: 3, pointBackgroundColor: chartData.map(v => v === null ? colors.missing : colors.rank), pointBorderColor: '#fff', pointBorderWidth: 1,
      spanGaps: false, tension: 0.3, fill: true,
    }]},
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 600 },
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#9ca3af', maxRotation: 45 } },
        y: { reverse: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 }, color: '#9ca3af' } },
      },
    },
  });
}
function getRankLabel(type) { const map = { class: '\u{73ed}\u{7ea7}\u{6392}\u{540d}', grade: '\u{5e74}\u{7ea7}\u{6392}\u{540d}', school: '\u{6821}\u{7ea7}\u{6392}\u{540d}' }; return map[type] || type; }
function getAllSubjectKeys(student) { const keys = []; for (const k of Object.keys(student)) { if (k.startsWith('score_')) keys.push(k.replace('score_', '')); } return keys; }
function getAllTotalKeys(student) { const keys = []; for (const k of Object.keys(student)) { if (k.startsWith('total_')) keys.push(k.replace('total_', '')); } return keys; }
function getAllRankKeys(student) { const keys = []; for (const k of Object.keys(student)) { if (k.startsWith('rank_')) keys.push(k.replace('rank_', '')); } return keys; }
