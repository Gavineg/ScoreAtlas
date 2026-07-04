// 科目关键词映射
export const SUBJECT_MAP = {
  '\u{8bed}\u{6587}': '\u{8bed}\u{6587}', '\u{8a9e}\u{6587}': '\u{8bed}\u{6587}',
  '\u{6570}\u{5b66}': '\u{6570}\u{5b66}', '\u{6578}\u{5b78}': '\u{6570}\u{5b66}',
  '\u{82f1}\u{8bed}': '\u{82f1}\u{8bed}', '\u{82f1}\u{8a9e}': '\u{82f1}\u{8bed}', '\u{82f1}\u{6587}': '\u{82f1}\u{8bed}', '\u{5916}\u{8bed}': '\u{82f1}\u{8bed}', '\u{5916}\u{8a9e}': '\u{82f1}\u{8bed}',
  '\u{7269}\u{7406}': '\u{7269}\u{7406}',
  '\u{5316}\u{5b66}': '\u{5316}\u{5b66}', '\u{5316}\u{5b78}': '\u{5316}\u{5b66}',
  '\u{751f}\u{7269}': '\u{751f}\u{7269}',
  '\u{653f}\u{6cbb}': '\u{653f}\u{6cbb}', '\u{9053}\u{6cd5}': '\u{653f}\u{6cbb}', '\u{601d}\u{653f}': '\u{653f}\u{6cbb}', '\u{9053}\u{5fb7}\u{4e0e}\u{6cd5}\u{6cbb}': '\u{653f}\u{6cbb}', '\u{9053}\u{5fb7}\u{8207}\u{6cd5}\u{6cbb}': '\u{653f}\u{6cbb}',
  '\u{5386}\u{53f2}': '\u{5386}\u{53f2}', '\u{6b77}\u{53f2}': '\u{5386}\u{53f2}',
  '\u{5730}\u{7406}': '\u{5730}\u{7406}',
};
export const SUBJECT_ORDER = ['\u{8bed}\u{6587}','\u{6570}\u{5b66}','\u{82f1}\u{8bed}','\u{7269}\u{7406}','\u{5316}\u{5b66}','\u{751f}\u{7269}','\u{653f}\u{6cbb}','\u{5386}\u{53f2}','\u{5730}\u{7406}'];
export const NAME_KEYWORDS = ['\u{59d3}\u{540d}','\u{540d}\u{5b57}','\u{5b66}\u{751f}\u{59d3}\u{540d}','\u{5b78}\u{751f}\u{59d3}\u{540d}','\u{540d}\u{79f0}','\u{540d}\u{7a31}'];
export const STUDENT_ID_KEYWORDS = ['\u{5b66}\u{53f7}','\u{5b78}\u{865f}','\u{8003}\u{53f7}','\u{8003}\u{865f}','\u{51c6}\u{8003}\u{8bc1}\u{53f7}','\u{7de8}\u{865f}'];
export const TOTAL_KEYWORDS = ['\u{603b}\u{5206}','\u{7e3d}\u{5206}','\u{603b}\u{5206}\u{ff08}\u{7269}\u{7406}\u{7c7b}\u{ff09}','\u{603b}\u{5206}(\u{7269}\u{7406}\u{7c7b})','\u{603b}\u{5206}(\u{5386}\u{53f2}\u{7c7b})','\u{603b}\u{6210}\u{7ee9}','\u{7e3d}\u{6210}\u{7e3e}','\u{5408}\u{8ba1}','\u{5408}\u{8a08}','\u{6210}\u{7ee9}\u{5408}\u{8ba1}','\u{6210}\u{7e3e}\u{5408}\u{8a08}'];
export const RANK_PATTERNS = [
  { pattern: /^\u{73ed}.*(?:\u{6392}\u{540d}|\u{540d}\u{6b21})/, type: 'class', label: '\u{73ed}\u{7ea7}\u{6392}\u{540d}' },
  { pattern: /^(?:\u{6392}\u{540d}|\u{540d}\u{6b21}).*\u{73ed}/, type: 'class', label: '\u{73ed}\u{7ea7}\u{6392}\u{540d}' },
  { pattern: /^\u{73ed}\u{6392}/, type: 'class', label: '\u{73ed}\u{7ea7}\u{6392}\u{540d}' },
  { pattern: /^(?:\u{5e74}|\u{7ea7}).*(?:\u{6392}\u{540d}|\u{540d}\u{6b21})/, type: 'grade', label: '\u{5e74}\u{7ea7}\u{6392}\u{540d}' },
  { pattern: /^(?:\u{6392}\u{540d}|\u{540d}\u{6b21}).*(?:\u{5e74}|\u{7ea7})/, type: 'grade', label: '\u{5e74}\u{7ea7}\u{6392}\u{540d}' },
  { pattern: /^\u{5e74}\u{6392}/, type: 'grade', label: '\u{5e74}\u{7ea7}\u{6392}\u{540d}' },
  { pattern: /^\u{6821}.*(?:\u{6392}\u{540d}|\u{540d}\u{6b21})/, type: 'school', label: '\u{6821}\u{7ea7}\u{6392}\u{540d}' },
  { pattern: /^(?:\u{6392}\u{540d}|\u{540d}\u{6b21}).*\u{6821}/, type: 'school', label: '\u{6821}\u{7ea7}\u{6392}\u{540d}' },
  { pattern: /^\u{6821}\u{6392}/, type: 'school', label: '\u{6821}\u{7ea7}\u{6392}\u{540d}' },
];
export function matchRankColumn(hdr) {
  const clean = hdr.replace(/\s+/g, '').toLowerCase();
  for (const rp of RANK_PATTERNS) { if (rp.pattern.test(clean)) return rp; }
  return null;
}
export function matchNameColumn(hdr) {
  const clean = hdr.replace(/\s+/g, '');
  return NAME_KEYWORDS.some(k => clean.includes(k));
}
export function matchTotalColumn(hdr) {
  const clean = hdr.replace(/\s+/g, '');
  return TOTAL_KEYWORDS.some(k => { const kc = k.replace(/\s+/g, ''); return clean.includes(kc); });
}
export function matchSubjectColumn(hdr) {
  const clean = hdr.replace(/\s+/g, '');
  for (const [key, norm] of Object.entries(SUBJECT_MAP)) {
    if (clean.includes(key.replace(/\s+/g, ''))) return norm;
  }
  return null;
}
