export function computeScoreDiffs(scoreSeq) {
  if (!scoreSeq || scoreSeq.length < 2) return [];
  const diffs = []; let lastValid = null;
  for (let i = 0; i < scoreSeq.length; i++) {
    const cur = scoreSeq[i];
    if (cur === null || cur === undefined) { diffs.push(null); continue; }
    if (lastValid === null) { diffs.push(null); } else { diffs.push(cur - lastValid); }
    lastValid = cur;
  }
  return diffs;
}
export function computeRankDiffs(rankSeq) {
  if (!rankSeq || rankSeq.length < 2) return [];
  const diffs = []; let lastValid = null;
  for (let i = 0; i < rankSeq.length; i++) {
    const cur = rankSeq[i];
    if (cur === null || cur === undefined) { diffs.push(null); continue; }
    if (lastValid === null) { diffs.push(null); } else { diffs.push(lastValid - cur); }
    lastValid = cur;
  }
  return diffs;
}
export function formatDiffCell(diff, type) {
  if (diff === null || diff === undefined) return { display: '-', className: 'cell-diff-na' };
  if (type === 'rank') {
    if (diff > 0) return { display: '\u2191' + diff, className: 'rank-up' };
    if (diff < 0) return { display: '\u2193' + Math.abs(diff), className: 'rank-down' };
    return { display: '0', className: 'rank-same' };
  }
  if (diff > 0) return { display: '+' + diff, className: 'cell-diff-positive' };
  if (diff < 0) return { display: String(diff), className: 'cell-diff-negative' };
  return { display: '0', className: 'cell-diff-zero' };
}
export function getRankLabel(type) {
  const map = { class: '\u{73ed}\u{7ea7}\u{6392}\u{540d}', grade: '\u{5e74}\u{7ea7}\u{6392}\u{540d}', school: '\u{6821}\u{7ea7}\u{6392}\u{540d}' };
  return map[type] || type;
}
