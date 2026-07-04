import { computeScoreDiffs, computeRankDiffs } from './analyzer.js';
export function exportXLSX(state, XLSX) {
  const { files, fileOrder, matchedResult: { students, allSubjects, allRankTypes, allTotalLabels } } = state;
  const orderedFiles = fileOrder.map(i => files[i]);
  const examNames = orderedFiles.map(f => f.filename.replace(/\.(xlsx|xls)$/i, ''));
  const rows = [];
  let headerRow1 = ['\u{59d3}\u{540d}'];
  for (const subj of allSubjects) headerRow1.push(subj, '');
  for (const label of allTotalLabels) headerRow1.push(label || '\u{603b}\u{5206}', '');
  for (const type of allRankTypes) headerRow1.push(getRankLabel(type), '');
  rows.push(headerRow1);
  let headerRow2 = [''];
  for (const subj of allSubjects) headerRow2.push('\u{6210}\u{7ee9}', '\u{8fdb}\u{9000}');
  for (const label of allTotalLabels) headerRow2.push('\u{6210}\u{7ee9}', '\u{8fdb}\u{9000}');
  for (const type of allRankTypes) headerRow2.push('\u{6392}\u{540d}', '\u{8fdb}\u{9000}');
  rows.push(headerRow2);
  let headerRow3 = ['\u{59d3}\u{540d}'];
  for (const subj of allSubjects) headerRow3.push(examNames.join('  |  '), examNames.join('  |  '));
  for (const label of allTotalLabels) headerRow3.push(examNames.join('  |  '), examNames.join('  |  '));
  for (const type of allRankTypes) headerRow3.push(examNames.join('  |  '), examNames.join('  |  '));
  rows.push(headerRow3);
  for (const student of students) {
    const row = [student.name];
    for (const subj of allSubjects) {
      const scores = student['score_' + subj] || [];
      const diffs = computeScoreDiffs(scores);
      row.push(scores.map((s,i) => student.missing[i] ? '\u{7f3a}\u{8003}' : (s != null ? s : '-')).join('  |  '));
      row.push(diffs.map((d,i) => d === null ? '-' : (d >= 0 ? '+' + d : String(d))).join('  |  '));
    }
    for (const label of allTotalLabels) {
      const totals = student['total_' + label] || [];
      const diffs = computeScoreDiffs(totals);
      row.push(totals.map((s,i) => student.missing[i] ? '\u{7f3a}\u{8003}' : (s != null ? s : '-')).join('  |  '));
      row.push(diffs.map((d,i) => d === null ? '-' : (d >= 0 ? '+' + d : String(d))).join('  |  '));
    }
    for (const type of allRankTypes) {
      const ranks = student['rank_' + type] || [];
      const diffs = computeRankDiffs(ranks);
      row.push(ranks.map((r,i) => student.missing[i] ? '\u{7f3a}\u{8003}' : (r != null ? r : '-')).join('  |  '));
      row.push(diffs.map((d,i) => d === null ? '-' : (d > 0 ? '\u2191'+d : d < 0 ? '\u2193'+Math.abs(d) : '0')).join('  |  '));
    }
    rows.push(row);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '\u{6210}\u{7ee9}\u{5bf9}\u{6bd4}');
  const examAbbr = orderedFiles.map(f => f.filename.replace(/\.(xlsx|xls)$/i, '')).slice(0, 4).join('vs');
  XLSX.writeFile(wb, examAbbr + '_\u{6210}\u{7ee9}\u{5bf9}\u{6bd4}.xlsx');
}
export function exportCSV(state) {
  const { files, fileOrder, matchedResult: { students, allSubjects, allRankTypes, allTotalLabels } } = state;
  const orderedFiles = fileOrder.map(i => files[i]);
  const examNames = orderedFiles.map(f => f.filename.replace(/\.(xlsx|xls)$/i, ''));
  const lines = [];
  let headerLine = '\u{59d3}\u{540d}';
  for (const subj of allSubjects) headerLine += ',' + subj + '\u{6210}\u{7ee9},' + subj + '\u{8fdb}\u{9000}';
  for (const label of allTotalLabels) headerLine += ',' + (label||'\u{603b}\u{5206}') + '\u{6210}\u{7ee9},' + (label||'\u{603b}\u{5206}') + '\u{8fdb}\u{9000}';
  for (const type of allRankTypes) { const lb = getRankLabel(type); headerLine += ',' + lb + ',' + lb + '\u{8fdb}\u{9000}'; }
  lines.push(headerLine);
  for (const student of students) {
    let line = escapeCSVField(student.name);
    for (const subj of allSubjects) {
      const scores = student['score_' + subj] || [];
      const diffs = computeScoreDiffs(scores);
      line += ',' + escapeCSVField(scores.map((s,i) => student.missing[i] ? '\u{7f3a}\u{8003}' : (s != null ? s : '-')).join(' | '));
      line += ',' + escapeCSVField(diffs.map((d,i) => d === null ? '-' : (d >= 0 ? '+' + d : d)).join(' | '));
    }
    for (const label of allTotalLabels) {
      const totals = student['total_' + label] || [];
      const diffs = computeScoreDiffs(totals);
      line += ',' + escapeCSVField(totals.map((s,i) => student.missing[i] ? '\u{7f3a}\u{8003}' : (s != null ? s : '-')).join(' | '));
      line += ',' + escapeCSVField(diffs.map((d,i) => d === null ? '-' : (d >= 0 ? '+' + d : d)).join(' | '));
    }
    for (const type of allRankTypes) {
      const ranks = student['rank_' + type] || [];
      const diffs = computeRankDiffs(ranks);
      line += ',' + escapeCSVField(ranks.map((r,i) => student.missing[i] ? '\u{7f3a}\u{8003}' : (r != null ? r : '-')).join(' | '));
      line += ',' + escapeCSVField(diffs.map((d,i) => d === null ? '-' : (d > 0 ? '\u2191'+d : d < 0 ? '\u2193'+Math.abs(d) : '0')).join(' | '));
    }
    lines.push(line);
  }
  const examAbbr = orderedFiles.map(f => f.filename.replace(/\.(xlsx|xls)$/i, '')).slice(0, 4).join('vs');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = examAbbr + '_\u{6210}\u{7ee9}\u{5bf9}\u{6bd4}.csv'; a.click();
  URL.revokeObjectURL(url);
}
function getRankLabel(type) { const map = { class: '\u{73ed}\u{7ea7}\u{6392}\u{540d}', grade: '\u{5e74}\u{7ea7}\u{6392}\u{540d}', school: '\u{6821}\u{7ea7}\u{6392}\u{540d}' }; return map[type] || type; }
function escapeCSVField(val) { const s = String(val); if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"'; return s; }
