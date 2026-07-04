import { computeScoreDiffs, computeRankDiffs } from "./analyzer.js";

export function exportXLSX(state, XLSX) {
  const { files, fileOrder, matchedResult } = state;
  const { students, allSubjects, allRankTypes, allTotalLabels, hasInlineRanks, allSubjectRankTypes, categoryTotalLabels } = matchedResult;
  const orderedFiles = fileOrder.map(i => files[i]);
  const examNames = orderedFiles.map(f => f.filename.replace(/\.(xlsx|xls)$/i, ""));

  // Sort rank type labels consistently
  const rankOrderMap = { "班排名": 1, "校排名": 2, "级排名": 3 };
  const allRankTypeLabels = Array.from(allSubjectRankTypes).sort((a, b) => {
    const ao = rankOrderMap[a] || 99, bo = rankOrderMap[b] || 99;
    if (ao !== bo) return ao - bo;
    return a.localeCompare(b);
  });
  const rankCount = allRankTypeLabels.length;

  const rows = [];

  // Header row 1: subject names
  let headerRow1 = ["姓名"];
  if (hasInlineRanks && rankCount > 0) {
    for (const subj of allSubjects) headerRow1.push(subj, ...Array(1 + 2 * rankCount - 1).fill(""));
    for (const ctl of (categoryTotalLabels || [])) headerRow1.push(ctl, ...Array(1 + 2 * rankCount - 1).fill(""));
    for (const label of allTotalLabels) headerRow1.push(label || "总分", ...Array(1 + 2 * rankCount - 1).fill(""));
  } else {
    for (const subj of allSubjects) headerRow1.push(subj, "");
    for (const label of allTotalLabels) headerRow1.push(label || "总分", "");
    for (const type of allRankTypes) headerRow1.push(getRankLabel(type), "");
  }
  rows.push(headerRow1);

  // Header row 2: sub-column labels
  let headerRow2 = [""];
  if (hasInlineRanks && rankCount > 0) {
    for (const subj of allSubjects) {
      headerRow2.push("成绩", "进退");
      for (const rl of allRankTypeLabels) headerRow2.push(rl, "进退");
    }
    for (const ctl of (categoryTotalLabels || [])) {
      headerRow2.push("成绩", "进退");
      for (const rl of allRankTypeLabels) headerRow2.push(rl, "进退");
    }
    for (const label of allTotalLabels) {
      headerRow2.push("成绩", "进退");
      for (const rl of allRankTypeLabels) headerRow2.push(rl, "进退");
    }
  } else {
    for (const subj of allSubjects) headerRow2.push("成绩", "进退");
    for (const label of allTotalLabels) headerRow2.push("成绩", "进退");
    for (const type of allRankTypes) headerRow2.push("排名", "进退");
  }
  rows.push(headerRow2);

  // Header row 3: exam names
  let headerRow3 = ["姓名"];
  if (hasInlineRanks && rankCount > 0) {
    for (const subj of allSubjects) {
      headerRow3.push(examNames.join("  |  "), examNames.join("  |  "));
      for (const rl of allRankTypeLabels) headerRow3.push(examNames.join("  |  "), examNames.join("  |  "));
    }
    for (const ctl of (categoryTotalLabels || [])) {
      headerRow3.push(examNames.join("  |  "), examNames.join("  |  "));
      for (const rl of allRankTypeLabels) headerRow3.push(examNames.join("  |  "), examNames.join("  |  "));
    }
    for (const label of allTotalLabels) {
      headerRow3.push(examNames.join("  |  "), examNames.join("  |  "));
      for (const rl of allRankTypeLabels) headerRow3.push(examNames.join("  |  "), examNames.join("  |  "));
    }
  } else {
    for (const subj of allSubjects) headerRow3.push(examNames.join("  |  "), examNames.join("  |  "));
    for (const label of allTotalLabels) headerRow3.push(examNames.join("  |  "), examNames.join("  |  "));
    for (const type of allRankTypes) headerRow3.push(examNames.join("  |  "), examNames.join("  |  "));
  }
  rows.push(headerRow3);

  // Data rows
  for (const student of students) {
    const row = [student.name];

    if (hasInlineRanks && rankCount > 0) {
      for (const subj of allSubjects) {
        const scores = student["score_" + subj] || [];
        const sdiffs = computeScoreDiffs(scores);
        row.push(scores.map((s,i) => student.missing[i] ? "缺考" : (s != null ? s : "-")).join("  |  "));
        row.push(sdiffs.map((d,i) => d === null ? "-" : (d >= 0 ? "+" + d : String(d))).join("  |  "));

        for (const rankType of allRankTypeLabels) {
          const ranks = (student["subjRanks_" + subj] && student["subjRanks_" + subj][rankType]) || [];
          const rdiffs = computeRankDiffs(ranks);
          row.push(ranks.map((r,i) => student.missing[i] ? "缺考" : (r != null ? r : "-")).join("  |  "));
          row.push(rdiffs.map((d,i) => d === null ? "-" : (d > 0 ? "\u2191"+d : d < 0 ? "\u2193"+Math.abs(d) : "0")).join("  |  "));
        }
      }

      for (const ctl of (categoryTotalLabels || [])) {
        const tvals = student["total_" + ctl] || [];
        const tdiffs = computeScoreDiffs(tvals);
        row.push(tvals.map((s,i) => student.missing[i] ? "缺考" : (s != null ? s : "-")).join("  |  "));
        row.push(tdiffs.map((d,i) => d === null ? "-" : (d >= 0 ? "+" + d : String(d))).join("  |  "));

        for (const rankType of allRankTypeLabels) {
          const tranks = (student["totalRanks_" + ctl] && student["totalRanks_" + ctl][rankType]) || [];
          const trdiffs = computeRankDiffs(tranks);
          row.push(tranks.map((r,i) => student.missing[i] ? "缺考" : (r != null ? r : "-")).join("  |  "));
          row.push(trdiffs.map((d,i) => d === null ? "-" : (d > 0 ? "\u2191"+d : d < 0 ? "\u2193"+Math.abs(d) : "0")).join("  |  "));
        }
      }

      for (const label of allTotalLabels) {
        const totals = student["total_" + label] || [];
        const tdiffs = computeScoreDiffs(totals);
        row.push(totals.map((s,i) => student.missing[i] ? "缺考" : (s != null ? s : "-")).join("  |  "));
        row.push(tdiffs.map((d,i) => d === null ? "-" : (d >= 0 ? "+" + d : String(d))).join("  |  "));

        for (const rankType of allRankTypeLabels) {
          row.push("-", "-");
        }
      }
    } else {
      for (const subj of allSubjects) {
        const scores = student["score_" + subj] || [];
        const diffs = computeScoreDiffs(scores);
        row.push(scores.map((s,i) => student.missing[i] ? "缺考" : (s != null ? s : "-")).join("  |  "));
        row.push(diffs.map((d,i) => d === null ? "-" : (d >= 0 ? "+" + d : String(d))).join("  |  "));
      }
      for (const label of allTotalLabels) {
        const totals = student["total_" + label] || [];
        const diffs = computeScoreDiffs(totals);
        row.push(totals.map((s,i) => student.missing[i] ? "缺考" : (s != null ? s : "-")).join("  |  "));
        row.push(diffs.map((d,i) => d === null ? "-" : (d >= 0 ? "+" + d : String(d))).join("  |  "));
      }
      for (const type of allRankTypes) {
        const ranks = student["rank_" + type] || [];
        const diffs = computeRankDiffs(ranks);
        row.push(ranks.map((r,i) => student.missing[i] ? "缺考" : (r != null ? r : "-")).join("  |  "));
        row.push(diffs.map((d,i) => d === null ? "-" : (d > 0 ? "\u2191"+d : d < 0 ? "\u2193"+Math.abs(d) : "0")).join("  |  "));
      }
    }
    rows.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "成绩对比");
  const examAbbr = orderedFiles.map(f => f.filename.replace(/\.(xlsx|xls)$/i, "")).slice(0, 4).join("vs");
  XLSX.writeFile(wb, examAbbr + "_成绩对比.xlsx");
}

export function exportCSV(state) {
  const { files, fileOrder, matchedResult } = state;
  const { students, allSubjects, allRankTypes, allTotalLabels, hasInlineRanks, allSubjectRankTypes, categoryTotalLabels } = matchedResult;
  const orderedFiles = fileOrder.map(i => files[i]);
  const examNames = orderedFiles.map(f => f.filename.replace(/\.(xlsx|xls)$/i, ""));

  const rankOrderMap = { "班排名": 1, "校排名": 2, "级排名": 3 };
  const allRankTypeLabels = Array.from(allSubjectRankTypes).sort((a, b) => {
    const ao = rankOrderMap[a] || 99, bo = rankOrderMap[b] || 99;
    if (ao !== bo) return ao - bo;
    return a.localeCompare(b);
  });
  const rankCount = allRankTypeLabels.length;

  const lines = [];

  // Header line
  let headerLine = "姓名";
  if (hasInlineRanks && rankCount > 0) {
    for (const subj of allSubjects) {
      headerLine += "," + subj + "成绩," + subj + "进退";
      for (const rl of allRankTypeLabels) headerLine += "," + subj + rl + "," + subj + rl + "进退";
    }
    for (const ctl of (categoryTotalLabels || [])) {
      headerLine += "," + ctl + "成绩," + ctl + "进退";
      for (const rl of allRankTypeLabels) headerLine += "," + ctl + rl + "," + ctl + rl + "进退";
    }
    for (const label of allTotalLabels) {
      const lb = label || "总分";
      headerLine += "," + lb + "成绩," + lb + "进退";
      for (const rl of allRankTypeLabels) headerLine += "," + lb + rl + "," + lb + rl + "进退";
    }
  } else {
    for (const subj of allSubjects) headerLine += "," + subj + "成绩," + subj + "进退";
    for (const label of allTotalLabels) headerLine += "," + (label||"总分") + "成绩," + (label||"总分") + "进退";
    for (const type of allRankTypes) { const lb = getRankLabel(type); headerLine += "," + lb + "," + lb + "进退"; }
  }
  lines.push(headerLine);

  // Data lines
  for (const student of students) {
    let line = escapeCSVField(student.name);

    if (hasInlineRanks && rankCount > 0) {
      for (const subj of allSubjects) {
        const scores = student["score_" + subj] || [];
        const sdiffs = computeScoreDiffs(scores);
        line += "," + escapeCSVField(scores.map((s,i) => student.missing[i] ? "缺考" : (s != null ? s : "-")).join(" | "));
        line += "," + escapeCSVField(sdiffs.map((d,i) => d === null ? "-" : (d >= 0 ? "+" + d : d)).join(" | "));

        for (const rankType of allRankTypeLabels) {
          const ranks = (student["subjRanks_" + subj] && student["subjRanks_" + subj][rankType]) || [];
          const rdiffs = computeRankDiffs(ranks);
          line += "," + escapeCSVField(ranks.map((r,i) => student.missing[i] ? "缺考" : (r != null ? r : "-")).join(" | "));
          line += "," + escapeCSVField(rdiffs.map((d,i) => d === null ? "-" : (d > 0 ? "+" + d : d < 0 ? d : "0")).join(" | "));
        }
      }

      for (const ctl of (categoryTotalLabels || [])) {
        const tvals = student["total_" + ctl] || [];
        const tdiffs = computeScoreDiffs(tvals);
        line += "," + escapeCSVField(tvals.map((s,i) => student.missing[i] ? "缺考" : (s != null ? s : "-")).join(" | "));
        line += "," + escapeCSVField(tdiffs.map((d,i) => d === null ? "-" : (d >= 0 ? "+" + d : d)).join(" | "));

        for (const rankType of allRankTypeLabels) {
          const tranks = (student["totalRanks_" + ctl] && student["totalRanks_" + ctl][rankType]) || [];
          const trdiffs = computeRankDiffs(tranks);
          line += "," + escapeCSVField(tranks.map((r,i) => student.missing[i] ? "缺考" : (r != null ? r : "-")).join(" | "));
          line += "," + escapeCSVField(trdiffs.map((d,i) => d === null ? "-" : (d > 0 ? "+" + d : d < 0 ? d : "0")).join(" | "));
        }
      }

      for (const label of allTotalLabels) {
        const totals = student["total_" + label] || [];
        const tdiffs = computeScoreDiffs(totals);
        line += "," + escapeCSVField(totals.map((s,i) => student.missing[i] ? "缺考" : (s != null ? s : "-")).join(" | "));
        line += "," + escapeCSVField(tdiffs.map((d,i) => d === null ? "-" : (d >= 0 ? "+" + d : d)).join(" | "));
        for (const rankType of allRankTypeLabels) line += ",-,-";
      }
    } else {
      for (const subj of allSubjects) {
        const scores = student["score_" + subj] || [];
        const diffs = computeScoreDiffs(scores);
        line += "," + escapeCSVField(scores.map((s,i) => student.missing[i] ? "缺考" : (s != null ? s : "-")).join(" | "));
        line += "," + escapeCSVField(diffs.map((d,i) => d === null ? "-" : (d >= 0 ? "+" + d : d)).join(" | "));
      }
      for (const label of allTotalLabels) {
        const totals = student["total_" + label] || [];
        const diffs = computeScoreDiffs(totals);
        line += "," + escapeCSVField(totals.map((s,i) => student.missing[i] ? "缺考" : (s != null ? s : "-")).join(" | "));
        line += "," + escapeCSVField(diffs.map((d,i) => d === null ? "-" : (d >= 0 ? "+" + d : d)).join(" | "));
      }
      for (const type of allRankTypes) {
        const ranks = student["rank_" + type] || [];
        const diffs = computeRankDiffs(ranks);
        line += "," + escapeCSVField(ranks.map((r,i) => student.missing[i] ? "缺考" : (r != null ? r : "-")).join(" | "));
        line += "," + escapeCSVField(diffs.map((d,i) => d === null ? "-" : (d > 0 ? "+" + d : d < 0 ? d : "0")).join(" | "));
      }
    }
    lines.push(line);
  }

  const examAbbr = orderedFiles.map(f => f.filename.replace(/\.(xlsx|xls)$/i, "")).slice(0, 4).join("vs");
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = examAbbr + "_成绩对比.csv"; a.click();
  URL.revokeObjectURL(url);
}

function getRankLabel(type) { const map = { class: "班级排名", grade: "年级排名", school: "校级排名" }; return map[type] || type; }
function escapeCSVField(val) { const s = String(val); if (s.includes(",") || s.includes("\"") || s.includes("\n")) return "\"" + s.replace(/\"/g, "\"\"") + "\""; return s; }
