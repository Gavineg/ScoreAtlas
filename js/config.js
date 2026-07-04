// 科目关键词映射
export const SUBJECT_MAP = {
  语文: "语文", 語文: "语文",
  数学: "数学", 數學: "数学",
  英语: "英语", 英語: "英语", 英文: "英语", 外语: "英语", 外語: "英语",
  英语口语: "英语口语", 英語口語: "英语口语",
  英语总分: "英语总分", 英語總分: "英语总分",
  物理: "物理",
  化学: "化学", 化學: "化学",
  生物: "生物",
  政治: "政治", 道法: "政治", 思政: "政治", 道德与法治: "政治", 道德與法治: "政治",
  历史: "历史", 歷史: "历史",
  地理: "地理",
  日语: "日语", 日語: "日语",
};
export const SUBJECT_ORDER = ["语文","数学","英语","物理","化学","生物","政治","历史","地理","英语口语","日语"];
export const NAME_KEYWORDS = ["姓名","名字","学生姓名","學生姓名","名称","名稱"];
export const STUDENT_ID_KEYWORDS = ["学号","學號","考号","考號","准考证号","編號"];
export const TOTAL_KEYWORDS = ["总分","總分","总分（物理类）","总分(物理类)","总分(历史类)","总成绩","總成績","合计","合計","成绩合计","成績合計"];
export const CATEGORY_TOTAL_KEYWORDS = ["物理类", "物理類", "历史类", "歷史類"];
export const RANK_PATTERNS = [
  { pattern: /^班.*(?:排名|名次)/, type: "class", label: "班级排名" },
  { pattern: /^(?:排名|名次).*班/, type: "class", label: "班级排名" },
  { pattern: /^班排/, type: "class", label: "班级排名" },
  { pattern: /^(?:年|级).*(?:排名|名次)/, type: "grade", label: "年级排名" },
  { pattern: /^(?:排名|名次).*(?:年|级)/, type: "grade", label: "年级排名" },
  { pattern: /^年排/, type: "grade", label: "年级排名" },
  { pattern: /^校.*(?:排名|名次)/, type: "school", label: "校级排名" },
  { pattern: /^(?:排名|名次).*校/, type: "school", label: "校级排名" },
  { pattern: /^校排/, type: "school", label: "校级排名" },
];
export function matchRankColumn(hdr) {
  const clean = hdr.replace(/\s+/g, "").toLowerCase();
  for (const rp of RANK_PATTERNS) { if (rp.pattern.test(clean)) return rp; }
  return null;
}
export function matchNameColumn(hdr) {
  const clean = hdr.replace(/\s+/g, "");
  return NAME_KEYWORDS.some(k => clean.includes(k));
}
export function matchTotalColumn(hdr) {
  const clean = hdr.replace(/\s+/g, "");
  return TOTAL_KEYWORDS.some(k => { const kc = k.replace(/\s+/g, ""); return clean.includes(kc); });
}
export function matchSubjectColumn(hdr) {
  const clean = hdr.replace(/\s+/g, "");
  // Sort keys by length descending so longer keys (e.g. "英语总分") match before shorter ones (e.g. "英语")
  const sortedKeys = Object.keys(SUBJECT_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (clean.includes(key.replace(/\s+/g, ""))) return SUBJECT_MAP[key];
  }
  return null;
}

// ── Inline-ranks format detection ──
const INLINE_SCORE_PATTERNS = ["成绩", "成績", "原始成绩", "原始成績"];

export function detectInlineRankFormat(row1) {
  if (!row1 || row1.length < 8) return false;
  let scoreHits = 0, rankHits = 0;
  for (const cell of row1) {
    const s = String(cell || "").trim();
    if (!s) continue;
    if (INLINE_SCORE_PATTERNS.includes(s)) scoreHits++;
    if (s.includes("排名") || s.includes("名次")) rankHits++;
  }
  return scoreHits >= 3 && rankHits >= 6;
}

export function parseInlineHeader(row0, row1) {
  // Collect all subject names from row0 in order (skip info columns 0-3)
  const subjNames = [];
  for (let j = 4; j < row0.length; j++) {
    const cell = String(row0[j] || "").trim();
    if (!cell) continue;
    if (isInfoColumn(cell)) continue;
    subjNames.push(cell);
  }

  const subjGroups = [];
  let subjSeq = 0;

  let i = 4;
  while (i < row1.length) {
    const cell = String(row1[i] || "").trim();
    if (INLINE_SCORE_PATTERNS.includes(cell)) {
      const block = {
        scoreCol: -1, rankCols: {},
        rawScoreCol: -1, gradeLevelCol: -1, gradeScoreCol: -1,
        isElective: false, isCategoryTotal: false,
        name: "", normName: "", colStart: i
      };
      const isRaw = cell === "原始成绩" || cell === "原始成績";
      if (isRaw) { block.rawScoreCol = i; block.isElective = true; }
      else { block.scoreCol = i; }
      i++;
      const maxFields = isRaw ? 12 : 10;
      let fieldCount = 0;
      while (i < row1.length && fieldCount < maxFields - 1) {
        const fc = String(row1[i] || "").trim();
        const kind = classifyInlineField(fc);
        if (!kind || kind === "score" || kind === "rawScore") break;
        if (kind === "gradeLevel") block.gradeLevelCol = i;
        else if (kind === "gradeScore") block.gradeScoreCol = i;
        else if (kind.startsWith("rank:")) { const rt = kind.substring(5); block.rankCols[rt] = i; }
        else if (kind === "classRank") block.rankCols["班排名"] = i;
        else if (kind === "schoolRank") block.rankCols["校排名"] = i;
        else if (kind === "gradeRank") block.rankCols["级排名"] = i;
        fieldCount++;
        i++;
      }
      if (subjSeq < subjNames.length) {
        block.name = subjNames[subjSeq];
        const norm = matchSubjectColumn(block.name);
        if (norm) {
          block.normName = norm;
        } else if (CATEGORY_TOTAL_KEYWORDS.some(k => block.name.includes(k))) {
          block.normName = block.name;
          block.isCategoryTotal = true;
        } else {
          block.normName = block.name;
        }
        subjGroups.push(block);
      }
      subjSeq++;
    } else {
      i++;
    }
  }

  // Special handling: if 英语总分 exists, rename to 英语 and remove original 英语
  const hasEngTotal = subjGroups.some(g => g.name === "英语总分");
  if (hasEngTotal) {
    subjGroups = subjGroups.filter(g => g.name !== "英语");
    const etBlock = subjGroups.find(g => g.name === "英语总分");
    if (etBlock) { etBlock.name = "英语"; etBlock.normName = "英语"; }
  }
  // Move 英语口语 to the end
  const oralIdx = subjGroups.findIndex(g => g.normName === "英语口语");
  if (oralIdx >= 0) { subjGroups.push(...subjGroups.splice(oralIdx, 1)); }

  return { subjGroups, hasInlineRanks: true };
}

function isInfoColumn(cell) {
  const patterns = ["班级", "班級", "类型", "類型", "学号", "學號", "考号", "考號", "姓名", "名字", "学生姓名", "學生姓名", "名称", "名稱"];
  return patterns.some(p => cell.includes(p) || cell === p);
}
function classifyInlineField(cell) {
  const s = cell.trim();
  if (s === "班排名" || s === "班名次") return "classRank";
  if (s === "校排名" || s === "校名次") return "schoolRank";
  if (s === "级排名" || s === "年排名" || s === "年排") return "gradeRank";
  if (s === "等级" || s === "等級") return "gradeLevel";
  if (s === "等级分" || s === "等級分") return "gradeScore";
  if (s === "成绩" || s === "成績") return "score";
  if (s === "原始成绩" || s === "原始成績") return "rawScore";
  // Extended rank names - any field with 排名/名次 not yet matched
  if (s.includes("排名") || s.includes("名次")) return "rank:" + s;
  return null;
}
