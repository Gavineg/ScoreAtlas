import { matchNameColumn, matchSubjectColumn, matchTotalColumn, matchRankColumn, detectInlineRankFormat, parseInlineHeader, SUBJECT_ORDER } from "./config.js";

export function parseFile(file, XLSX) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        resolve(parseWorkbook(workbook, file.name));
      } catch (err) { reject(new Error(file.name + ": " + err.message)); }
    };
    reader.onerror = () => reject(new Error(file.name + ": read failed"));
    reader.readAsArrayBuffer(file);
  });
}

function parseWorkbook(workbook, filename) {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false, blankrows: false });
  if (!raw || raw.length < 2) throw new Error("data too short");

  // Try inline-ranks (two-row merged header) format first
  if (raw.length >= 3) {
    const maybeRow1 = raw[1] || [];
    if (detectInlineRankFormat(maybeRow1)) {
      return parseInlineRankFormat(raw, filename);
    }
  }

  // Fallback: original single-row header format
  const headerRowIdx = findHeaderRow(raw);
  const headers = raw[headerRowIdx].map(h => String(h).trim());
  const columns = classifyColumns(headers);
  const students = [];

  for (let i = headerRowIdx + 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row || row.every(c => c === "" || c === null || c === undefined)) continue;
    const name = extractName(row, columns.nameCol);
    if (!name) continue;
    const scores = {};
    for (const [subj, colIdx] of Object.entries(columns.subjectCols)) {
      const val = parseFloat(String(row[colIdx] || "").trim());
      scores[subj] = isNaN(val) ? null : val;
    }
    const totals = {};
    for (const [label, colIdx] of Object.entries(columns.totalCols)) {
      const val = parseFloat(String(row[colIdx] || "").trim());
      totals[label] = isNaN(val) ? null : val;
    }
    const ranks = {};
    for (const [type, colIdx] of Object.entries(columns.rankCols)) {
      const val = parseInt(String(row[colIdx] || "").trim(), 10);
      ranks[type] = isNaN(val) ? null : val;
    }
    students.push({ name, scores, totals, ranks, subjectRanks: null });
  }

  const allSubjects = new Set();
  for (const s of students) { for (const subj of Object.keys(s.scores)) allSubjects.add(subj); }
  return { filename, subjects: [...allSubjects], students, headerRowIdx, rawHeaders: headers, columnMap: columns, hasInlineRanks: false };
}

// Inline-ranks parser using flexible rankCols from config.js
function parseInlineRankFormat(raw, filename) {
  const row0 = raw[0] || [];
  const row1 = raw[1] || [];
  const { subjGroups } = parseInlineHeader(row0, row1);

  const regularSubjects = subjGroups.filter(g => !g.isElective && !g.isCategoryTotal);
  const electiveSubjects = subjGroups.filter(g => g.isElective);
  const categoryTotals = subjGroups.filter(g => g.isCategoryTotal);

  const students = [];
  for (let i = 2; i < raw.length; i++) {
    const row = raw[i];
    if (!row || row.every(c => c === "" || c === null || c === undefined)) continue;

    const name = String(row[3] || "").trim().replace(/\s+/g, "");
    if (!name) continue;

    const scores = {};
    const subjectRanks = {};

    // Regular subjects: score from scoreCol, ranks from rankCols map
    for (const g of regularSubjects) {
      if (g.normName && g.scoreCol >= 0) {
        const val = parseFloat(String(row[g.scoreCol] || "").trim());
        scores[g.normName] = isNaN(val) ? null : val;
      }
      if (g.normName) {
        subjectRanks[g.normName] = {};
        if (g.rankCols && Object.keys(g.rankCols).length > 0) {
          for (const [rankType, colIdx] of Object.entries(g.rankCols)) {
            const r = parseInt(String(row[colIdx] || "").trim(), 10);
            subjectRanks[g.normName][rankType] = isNaN(r) ? null : r;
          }
        }
      }
    }

    // Elective subjects: score from gradeScoreCol/rawScoreCol, ranks from rankCols map
    for (const g of electiveSubjects) {
      if (g.normName && g.gradeScoreCol >= 0) {
        const val = parseFloat(String(row[g.gradeScoreCol] || "").trim());
        scores[g.normName] = isNaN(val) ? null : val;
      } else if (g.normName && g.rawScoreCol >= 0) {
        const val = parseFloat(String(row[g.rawScoreCol] || "").trim());
        if (!isNaN(val)) scores[g.normName] = val;
      }
      if (g.normName) {
        subjectRanks[g.normName] = {};
        if (g.rankCols && Object.keys(g.rankCols).length > 0) {
          for (const [rankType, colIdx] of Object.entries(g.rankCols)) {
            const r = parseInt(String(row[colIdx] || "").trim(), 10);
            subjectRanks[g.normName][rankType] = isNaN(r) ? null : r;
          }
        }
      }
    }

    // Category totals: score from scoreCol, ranks from rankCols map
    const totals = {};
    const totalRanks = {};
    for (const g of categoryTotals) {
      if (g.normName && g.scoreCol >= 0) {
        const val = parseFloat(String(row[g.scoreCol] || "").trim());
        totals[g.normName] = isNaN(val) ? null : val;
      }
      if (g.normName) {
        totalRanks[g.normName] = {};
        if (g.rankCols && Object.keys(g.rankCols).length > 0) {
          for (const [rankType, colIdx] of Object.entries(g.rankCols)) {
            const r = parseInt(String(row[colIdx] || "").trim(), 10);
            totalRanks[g.normName][rankType] = isNaN(r) ? null : r;
          }
        }
      }
    }

    students.push({ name, scores, totals, ranks: {}, subjectRanks, totalRanks });
  }

  const allSubjectsSet = new Set();
  for (const s of students) { for (const subj of Object.keys(s.scores)) allSubjectsSet.add(subj); }

  const subjectRankTypes = {};
  for (const s of students) {
    if (!s.subjectRanks) continue;
    for (const [subj, ranks] of Object.entries(s.subjectRanks)) {
      if (!subjectRankTypes[subj]) subjectRankTypes[subj] = new Set();
      for (const rk of Object.keys(ranks)) {
        if (ranks[rk] != null) subjectRankTypes[subj].add(rk);
      }
    }
  }

  return {
    filename,
    subjects: [...allSubjectsSet],
    students,
    headerRowIdx: 0,
    rawHeaders: row1,
    columnMap: { subjGroups },
    hasInlineRanks: true,
    subjectRankTypes,
    categoryTotals: categoryTotals.map(g => g.normName).filter(Boolean),
  };
}

function findHeaderRow(raw) {
  const maxRows = Math.min(raw.length, 20);
  let bestRow = 0, bestScore = -1;
  for (let i = 0; i < maxRows; i++) {
    const row = raw[i];
    if (!row || row.length === 0) continue;
    let score = 0;
    for (const cell of row) {
      const s = String(cell || "").trim();
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
    const firstHasData = firstRow.some(c => { const s = String(c || "").trim(); return s && !matchNameColumn(s) && !matchSubjectColumn(s); });
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
  const cleaned = String(row[nameColIdx] || "").trim().replace(/\s+/g, "");
  return cleaned || null;
}
