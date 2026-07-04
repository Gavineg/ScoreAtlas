export function matchStudents(files) {
  const allNames = new Set();
  for (const file of files) { for (const s of file.students) allNames.add(normalizeName(s.name)); }
  const allSubjects = new Set(), allRankTypes = new Set(), allTotalLabels = new Set();
  for (const file of files) {
    for (const s of file.subjects) allSubjects.add(s);
    if (file.students.length > 0) {
      for (const k of Object.keys(file.students[0].ranks)) allRankTypes.add(k);
      for (const k of Object.keys(file.students[0].totals)) allTotalLabels.add(k);
    }
  }
  const fileMaps = files.map(f => { const map = new Map(); for (const s of f.students) map.set(normalizeName(s.name), s); return map; });
  const students = [];
  for (const name of allNames) {
    const record = { name };
    for (const subj of allSubjects) {
      record['score_' + subj] = fileMaps.map(m => { const s = m.get(name); return s ? (s.scores[subj] != null ? s.scores[subj] : null) : null; });
    }
    for (const label of allTotalLabels) {
      record['total_' + label] = fileMaps.map(m => { const s = m.get(name); return s ? (s.totals[label] != null ? s.totals[label] : null) : null; });
    }
    for (const type of allRankTypes) {
      record['rank_' + type] = fileMaps.map(m => { const s = m.get(name); return s ? (s.ranks[type] != null ? s.ranks[type] : null) : null; });
    }
    record.presence = fileMaps.map(m => m.has(name));
    record.missing = fileMaps.map(m => !m.has(name));
    students.push(record);
  }
  return { students, allSubjects: [...allSubjects], allRankTypes: [...allRankTypes], allTotalLabels: [...allTotalLabels] };
}
function normalizeName(name) { return (name || '').replace(/\s+/g, ''); }
