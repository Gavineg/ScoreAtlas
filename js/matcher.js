export function matchStudents(files) {
  const allNames = new Set();
  for (const file of files) { for (const s of file.students) allNames.add(normalizeName(s.name)); }

  const allSubjects = new Set(), allRankTypes = new Set(), allTotalLabels = new Set();
  const hasInlineRanks = files.some(f => f.hasInlineRanks);
  let allSubjectRankTypes = new Set();

  for (const file of files) {
    for (const s of file.subjects) allSubjects.add(s);
    if (file.students.length > 0) {
      const s0 = file.students[0];
      for (const k of Object.keys(s0.ranks)) allRankTypes.add(k);
      for (const k of Object.keys(s0.totals)) allTotalLabels.add(k);
      // Collect per-subject rank types
      if (s0.subjectRanks) {
        for (const [subj, rks] of Object.entries(s0.subjectRanks)) {
          for (const rk of Object.keys(rks)) allSubjectRankTypes.add(rk);
        }
      }
      if (s0.totalRanks) {
        for (const [label, rks] of Object.entries(s0.totalRanks)) {
          for (const rk of Object.keys(rks)) allSubjectRankTypes.add(rk);
        }
      }
    }
  }

  // Detect category totals from files
  const categoryTotalLabels = new Set();
  for (const file of files) {
    if (file.categoryTotals) {
      for (const ct of file.categoryTotals) categoryTotalLabels.add(ct);
    }
  }

  const fileMaps = files.map(f => {
    const map = new Map();
    for (const s of f.students) map.set(normalizeName(s.name), s);
    return map;
  });

  const students = [];
  for (const name of allNames) {
    const record = { name };

    // Scores per subject across exams
    for (const subj of allSubjects) {
      record["score_" + subj] = fileMaps.map(m => {
        const s = m.get(name);
        return s ? (s.scores[subj] != null ? s.scores[subj] : null) : null;
      });
    }

    // Totals across exams
    for (const label of allTotalLabels) {
      record["total_" + label] = fileMaps.map(m => {
        const s = m.get(name);
        return s ? (s.totals[label] != null ? s.totals[label] : null) : null;
      });
    }

    // Global ranks across exams
    for (const type of allRankTypes) {
      record["rank_" + type] = fileMaps.map(m => {
        const s = m.get(name);
        return s ? (s.ranks[type] != null ? s.ranks[type] : null) : null;
      });
    }

    // Per-subject ranks across exams (for inline-ranks format)
    if (hasInlineRanks) {
      for (const subj of allSubjects) {
        record["subjRanks_" + subj] = {};
        for (const rtype of allSubjectRankTypes) {
          record["subjRanks_" + subj][rtype] = fileMaps.map(m => {
            const s = m.get(name);
            if (!s || !s.subjectRanks || !s.subjectRanks[subj]) return null;
            return s.subjectRanks[subj][rtype] != null ? s.subjectRanks[subj][rtype] : null;
          });
        }
      }
      // Category total ranks
      for (const label of categoryTotalLabels) {
        record["totalRanks_" + label] = {};
        for (const rtype of allSubjectRankTypes) {
          record["totalRanks_" + label][rtype] = fileMaps.map(m => {
            const s = m.get(name);
            if (!s || !s.totalRanks || !s.totalRanks[label]) return null;
            return s.totalRanks[label][rtype] != null ? s.totalRanks[label][rtype] : null;
          });
        }
      }
    }

    record.presence = fileMaps.map(m => m.has(name));
    record.missing = fileMaps.map(m => !m.has(name));
    students.push(record);
  }

  return {
    students,
    allSubjects: [...allSubjects],
    allRankTypes: [...allRankTypes],
    allTotalLabels: [...allTotalLabels],
    hasInlineRanks,
    allSubjectRankTypes: [...allSubjectRankTypes],
    categoryTotalLabels: [...categoryTotalLabels],
  };
}

function normalizeName(name) { return (name || "").replace(/\s+/g, ""); }
