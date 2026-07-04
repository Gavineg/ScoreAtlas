import { matchNameColumn, matchSubjectColumn, matchTotalColumn, matchRankColumn } from './config.js';
export function parseFile(file, XLSX) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        resolve(parseWorkbook(workbook, file.name));
      } catch (err) { reject(new Error(file.name + ': ' + err.message)); }
    };
    reader.onerror = () => reject(new Error(file.name + ': read failed'));
    reader.readAsArrayBuffer(file);
  });
}
function parseWorkbook(workbook, filename) {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, blankrows: false });
  if (!raw || raw.length < 2) throw new Error('data too short');
  const headerRowIdx = findHeaderRow(raw);
  const headers = raw[headerRowIdx].map(h => String(h).trim());
  const columns = classifyColumns(headers);
  const students = [];
  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row || row.every(c => c === '' || c === null || c === undefined)) continue;
    const name = extractName(row, columns.nameCol);
    if (!name) continue;
    const scores = {};
    for (const [subj, colIdx] of Object.entries(columns.subjectCols)) {
      const val = parseFloat(String(row[colIdx] || '').trim());
      scores[subj] = isNaN(val) ? null : val;
    }
    const totals = {};
    for (const [label, colIdx] of Object.entries(columns.totalCols)) {
      const val = parseFloat(String(row[colIdx] || '').trim());
      totals[label] = isNaN(val) ? null : val;
    }
    const ranks = {};
    for (const [type, colIdx] of Object.entries(columns.rankCols)) {
      const val = parseInt(String(row[colIdx] || '').trim(), 10);
      ranks[type] = isNaN(val) ? null : val;
    }
    students.push({ name, scores, totals, ranks });
  }
  const allSubjects = new Set();
  for (const s of students) { for (const subj of Object.keys(s.scores)) allSubjects.add(subj); }
  return { filename, subjects: [...allSubjects], students, headerRowIdx, rawHeaders: headers, columnMap: columns };
}
function findHeaderRow(raw) {
  const maxRows = Math.min(raw.length, 20);
  let bestRow = 0, bestScore = -1;
  for (let i = 0; i < maxRows; i++) {
    const row = raw[i];
    if (!row || row.length === 0) continue;
    let score = 0;
    for (const cell of row) {
      const s = String(cell || '').trim();
      if (!s) continue;
      if (matchNameColumn(s)) score += 10;
      if (matchSubjectColumn(s)) score += 5;
      if (matchTotalColumn(s)) score += 3;
      if (matchRankColumn(s)) score += 3;
    }
    if (score > bestScore) { bestScore = score; bestRow = i; }
  }
  if (bestScore <= 0 && raw.length > 1) {
    const firstRow = raw[0] || [];
    const firstHasData = firstRow.some(c => { const s = String(c || '').trim(); return s && !matchNameColumn(s) && !matchSubjectColumn(s); });
    bestRow = firstHasData ? 1 : 0;
  }
  return bestRow;
}
function classifyColumns(headers) {
  const nameCol = [], subjectCols = {}, totalCols = {}, rankCols = {};
  for (let i = 0; i < headers.length; i++) {
    const hdr = headers[i];
    if (!hdr) continue;
    if (matchNameColumn(hdr)) { nameCol.push(i); continue; }
    const subj = matchSubjectColumn(hdr);
    if (subj) { subjectCols[subj] = i; continue; }
    const rank = matchRankColumn(hdr);
    if (rank) { rankCols[rank.type] = i; continue; }
    if (matchTotalColumn(hdr)) { totalCols[hdr] = i; }
  }
  return { nameCol: nameCol.length > 0 ? nameCol[0] : -1, nameCols: nameCol, subjectCols, totalCols, rankCols };
}
function extractName(row, nameColIdx) {
  if (nameColIdx < 0 || nameColIdx >= row.length) return null;
  const cleaned = String(row[nameColIdx] || '').trim().replace(/\s+/g, '');
  return cleaned || null;
}
