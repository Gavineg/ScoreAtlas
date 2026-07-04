import { computeScoreDiffs, computeRankDiffs, formatDiffCell, getRankLabel } from "./analyzer.js";
import { renderTrendCharts } from "./charts.js";
import { exportXLSX, exportCSV } from "./exporter.js";
import { matchStudents } from "./matcher.js";


var clicked = false;
var nextPage = false;

let dom = {};
export function initDom() {
  console.log(clicked);
  dom.emptyState = document.getElementById("emptyState");
  dom.uploadZone = document.getElementById("uploadZone");
  dom.uploadDrop = document.getElementById("uploadDrop");
  dom.fileInput = document.getElementById("fileInput");
  dom.fileCountHint = document.getElementById("fileCountHint");
  dom.cardsArea = document.getElementById("cardsArea");
  dom.cardsContainer = document.getElementById("cardsContainer");
  dom.resultArea = document.getElementById("resultArea");
  dom.tableHead = document.getElementById("tableHead");
  dom.tableBody = document.getElementById("tableBody");
  dom.tableWrapper = document.getElementById("tableWrapper");
  dom.trendPanel = document.getElementById("trendPanel");
  dom.trendGrid = document.getElementById("trendGrid");
  dom.trendStudentName = document.getElementById("trendStudentName");
  dom.trendClose = document.getElementById("trendClose");
  dom.exportXlsx = document.getElementById("exportXlsx");
  dom.exportCsv = document.getElementById("exportCsv");
  dom.helpBtn = document.getElementById("helpBtn");
  dom.onboardingOverlay = document.getElementById("onboardingOverlay");
  dom.onboardingBubble = document.getElementById("onboardingBubble");
  dom.bubbleText = document.getElementById("bubbleText");
  dom.bubbleSkip = document.getElementById("bubbleSkip");
  dom.bubbleNext = document.getElementById("bubbleNext");
  dom.toast = document.getElementById("toast");
  dom.helpBtn = document.getElementById("helpBtn");
}

let toastTimer = 0;
export function showToast(msg) {
  clearTimeout(toastTimer);
  dom.toast.textContent = msg;
  dom.toast.classList.add("show");
  toastTimer = setTimeout(function() { dom.toast.classList.remove("show"); }, 2200);
}

export function renderCards(state) {
  dom.cardsContainer.innerHTML = "";
  state.fileOrder.forEach(function(fileIdx, orderIdx) {
    var file = state.files[fileIdx];
    var card = document.createElement("div");
    card.className = "card";
    card.dataset.fileIdx = fileIdx;
    card.style.animationDelay = (orderIdx * 0.08) + "s";
    card.setAttribute("data-idx", fileIdx);
    card.innerHTML =
      "<div class=\"card-drag-handle\"><span></span><span></span><span></span></div>" +
      "<div class=\"card-order\">" + (orderIdx + 1) + "</div>" +
      "<div class=\"card-info\"><div class=\"card-filename\" title=\"" + escapeHtml(file.filename) + "\">" + escapeHtml(file.filename) + "</div>" +
      "<div class=\"card-meta\">" + file.subjects.length + " 科 · " + file.students.length + " 名学生</div></div>" +
      "<button class=\"card-remove\" data-idx=\"" + fileIdx + "\" title=\"移除\">×</button>";
    card.querySelector(".card-remove").addEventListener("click", function(e) {
      e.stopPropagation();
      removeFile(state, fileIdx);
    });
    dom.cardsContainer.appendChild(card);
  });
  dom.emptyState.classList.toggle("hidden", state.files.length > 0);
  dom.cardsArea.classList.toggle("visible", state.files.length > 0);
  updateFileCountHint(state);
}

function updateFileCountHint(state) {
  var remain = Math.max(0, 2 - state.files.length);
  dom.fileCountHint.textContent = remain > 0
    ? "至少需要 2 个文件（还需 " + remain + " 个）"
    : "已满足最低要求，可以继续添加更多文件";
}

export function rerunMatching(state) {
  var orderedFiles = state.fileOrder.map(function(i) { return state.files[i]; });
  state.matchedResult = matchStudents(orderedFiles);
  updateTable(state);
}

function removeFile(state, fileIdx) {
  var orderIdx = state.fileOrder.indexOf(fileIdx);
  if (orderIdx >= 0) state.fileOrder.splice(orderIdx, 1);
  state.files = state.files.filter(function(f) { return f !== state.files[fileIdx]; });
  state.fileOrder = state.fileOrder.map(function(i) { return i > fileIdx ? i - 1 : i; });
  renderCards(state);
  if (state.files.length >= 2) rerunMatching(state);
  else { dom.resultArea.classList.remove("visible"); dom.trendPanel.classList.remove("open"); }
}

/* ===== Pointer-event drag & drop ===== */
var dragCtx = null;

export function initDragDrop(state) {
  var container = dom.cardsContainer;

  container.addEventListener("pointerdown", function(e) {
    var card = e.target.closest(".card");
    if (!card) return;
    if (e.target.closest(".card-remove")) return;

    e.preventDefault();
    card.setPointerCapture(e.pointerId);

    var rect = card.getBoundingClientRect();
    var fileIdx = parseInt(card.dataset.fileIdx, 10);

    dragCtx = {
      card: card,
      fileIdx: fileIdx,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      cardWidth: rect.width,
      cardHeight: rect.height,
      originLeft: rect.left,
      originTop: rect.top,
      moved: false,
      placeholder: null,
      clone: null,
      siblings: []
    };
  });

  container.addEventListener("pointermove", function(e) {
    if (!dragCtx) return;
    var dx = e.clientX - dragCtx.startX;
    var dy = e.clientY - dragCtx.startY;

    if (!dragCtx.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
    dragCtx.moved = true;

    if (!dragCtx.clone) {
      var card = dragCtx.card;
      var containerRect = container.getBoundingClientRect();

      // snapshot all other card positions before mutation
      var allCards = container.querySelectorAll(".card:not(.drag-clone):not(.drag-placeholder)");
      dragCtx.siblings = [];
      for (var i = 0; i < allCards.length; i++) {
        var c = allCards[i];
        if (c === card) continue;
        var r = c.getBoundingClientRect();
        var idx = parseInt(c.dataset.fileIdx, 10);
        dragCtx.siblings.push({ el: c, fileIdx: idx, left: r.left - containerRect.left, top: r.top - containerRect.top, width: r.width });
      }

      // placeholder (shrunken gap)
      var ph = document.createElement("div");
      ph.className = "card drag-placeholder";
      ph.style.width = dragCtx.cardWidth + "px";
      ph.style.height = dragCtx.cardHeight + "px";
      ph.style.transition = "none";
      card.parentNode.insertBefore(ph, card);
      dragCtx.placeholder = ph;

      // visual clone
      var clone = card.cloneNode(true);
      clone.className = "card drag-clone";
      clone.style.position = "fixed";
      clone.style.left = dragCtx.originLeft + "px";
      clone.style.top = dragCtx.originTop + "px";
      clone.style.width = dragCtx.cardWidth + "px";
      clone.style.zIndex = "999";
      clone.style.pointerEvents = "none";
      clone.style.transition = "none";
      clone.style.boxShadow = "0 16px 40px rgba(0,0,0,0.18)";
      clone.style.transform = "scale(1.04)";
      clone.style.opacity = "0.92";
      document.body.appendChild(clone);
      dragCtx.clone = clone;

      // fade the original card in place
      card.style.opacity = "0";
      card.style.pointerEvents = "none";
    }

    // move clone
    if (dragCtx.clone) {
      dragCtx.clone.style.left = (e.clientX - dragCtx.offsetX) + "px";
      dragCtx.clone.style.top = (e.clientY - dragCtx.offsetY) + "px";
    }

    // move placeholder to correct position among siblings
    if (dragCtx.placeholder) {
      var cx = e.clientX;
      var cy = e.clientY;
      var phEl = dragCtx.placeholder;
      var after = null;
      var minDist = Infinity;
      for (var si = 0; si < dragCtx.siblings.length; si++) {
        var sib = dragCtx.siblings[si];
        var midX = sib.el.getBoundingClientRect().left + sib.width / 2;
        var dist = cx - midX;
        if (dist < 0 && Math.abs(dist) < Math.abs(minDist)) {
          minDist = dist;
          after = sib.el;
        }
      }
      if (after && after.nextSibling !== phEl) {
        after.parentNode.insertBefore(phEl, after);
      } else if (!after && container.lastChild !== phEl) {
        // insert after all
        var last = container.lastChild;
        if (last && last !== phEl) {
          container.insertBefore(phEl, last.nextSibling);
        }
      }
    }
  });

  window.addEventListener("pointerup", function(e) {
    if (!dragCtx) return;

    if (dragCtx.clone) {
      dragCtx.clone.remove();
      dragCtx.clone = null;
    }
    if (dragCtx.placeholder) {
      // compute new order from placeholder position
      var phEl = dragCtx.placeholder;
      var newOrder = [];
      var allChildren = container.querySelectorAll(".card:not(.drag-clone):not(.drag-placeholder)");
      var phIdx = -1;
      for (var i = 0; i < container.children.length; i++) {
        if (container.children[i] === phEl) { phIdx = i; break; }
      }

      var srcOrderIdx = state.fileOrder.indexOf(dragCtx.fileIdx);
      var newOrderArr = state.fileOrder.filter(function(_i, idx) { return idx !== srcOrderIdx; });
      // placeholder position maps to insert point among remaining cards
      var remIdx = 0;
      var insertPos = phIdx;
      if (srcOrderIdx < phIdx) insertPos--;
      newOrderArr.splice(Math.max(0, insertPos), 0, dragCtx.fileIdx);
      state.fileOrder = newOrderArr;

      phEl.remove();
      dragCtx.placeholder = null;
    }

    // restore original card
    if (dragCtx.card) {
      dragCtx.card.style.opacity = "";
      dragCtx.card.style.pointerEvents = "";
    }

    var wasMoved = dragCtx.moved;
    dragCtx = null;

    if (wasMoved) {
      renderCards(state);
      if (state.files.length >= 2) rerunMatching(state);
    }
  });
}

/* ===== Table ===== */
// View mode: "scores" or "ranks"
let tableViewMode = "scores";

export function updateTable(state) {
  nextPage = true;
  var files = state.files, fileOrder = state.fileOrder, matchedResult = state.matchedResult;
  if (!matchedResult || files.length < 2) { dom.resultArea.classList.remove("visible"); return; }
  dom.resultArea.classList.add("visible");
  var orderedFiles = fileOrder.map(function(i) { return files[i]; });
  var students = matchedResult.students, allSubjects = matchedResult.allSubjects, allRankTypes = matchedResult.allRankTypes, allTotalLabels = matchedResult.allTotalLabels;
  var hasInline = matchedResult.hasInlineRanks;
  var allSubjRankTypes = matchedResult.allSubjectRankTypes || [];

  // Sort all rank type labels for consistent multi-rank column ordering
  var rankOrderMap = { "???": 1, "???": 2, "???": 3 };
  var allRankTypeLabels = Array.from(allSubjRankTypes).sort(function(a, b) {
    var ao = rankOrderMap[a] || 99, bo = rankOrderMap[b] || 99;
    if (ao !== bo) return ao - bo;
    return a.localeCompare(b);
  });
  var rankCount = allRankTypeLabels.length;
  var categoryTotalLabels = matchedResult.categoryTotalLabels || [];

  var SUBJ_ORDER = ["语文","数学","英语","物理","化学","生物","政治","历史","地理"];
  var sortedSubjects = allSubjects.filter(function(s) { return s; }).sort(function(a, b) {
    var ai = SUBJ_ORDER.indexOf(a), bi = SUBJ_ORDER.indexOf(b);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.localeCompare(b);
  });

  // Build table header
  var htmlHeader = "<tr><th class=\"col-name\" rowspan=\"2\">姓名</th>";

  if (hasInline && rankCount > 0) {
    // Inline-ranks mode: each subject gets score + ALL rank columns
    for (var si = 0; si < sortedSubjects.length; si++) {
      htmlHeader += "<th class=\"col-subject\" colspan=\"" + (2 + 2*rankCount) + "\">" + escapeHtml(sortedSubjects[si]) + "</th>";
    }
    // Category totals
    for (var ct = 0; ct < categoryTotalLabels.length; ct++) {
      htmlHeader += "<th class=\"col-subject\" colspan=\"" + (2 + 2*rankCount) + "\">" + escapeHtml(categoryTotalLabels[ct]) + "</th>";
    }
    // Also show global total label if present
    if (allTotalLabels.length > 0) {
      htmlHeader += "<th class=\"col-subject\" colspan=\"" + (2 + 2*rankCount) + "\">" + escapeHtml(allTotalLabels[0] || "总分") + "</th>";
    }
  } else {
    // Legacy mode
    for (var si = 0; si < sortedSubjects.length; si++) {
      htmlHeader += "<th class=\"col-subject\" colspan=\"2\">" + escapeHtml(sortedSubjects[si]) + "</th>";
    }
    if (allTotalLabels.length > 0) {
      htmlHeader += "<th class=\"col-subject\" colspan=\"2\">" + escapeHtml(allTotalLabels[0] || "总分") + "</th>";
    }
    for (var ti = 0; ti < allRankTypes.length; ti++) {
      htmlHeader += "<th class=\"col-subject\" colspan=\"2\">" + escapeHtml(getRankLabel(allRankTypes[ti])) + "</th>";
    }
  }

  htmlHeader += "</tr><tr>";

  if (hasInline && rankCount > 0) {
    for (var sj = 0; sj < sortedSubjects.length; sj++) {
      htmlHeader += "<th class=\"col-score\">成绩</th><th class=\"col-diff\">进退</th>";
      for (var rk = 0; rk < allRankTypeLabels.length; rk++) {
        var shortLabel = allRankTypeLabels[rk].length > 4 ? allRankTypeLabels[rk].substring(0, 4) + ".." : allRankTypeLabels[rk];
        htmlHeader += "<th class=\"col-rank\" title=\"" + allRankTypeLabels[rk] + "\">" + escapeHtml(shortLabel) + "</th><th class=\"col-diff\">进退</th>";
      }
    }
    for (var ct = 0; ct < categoryTotalLabels.length; ct++) {
      htmlHeader += "<th class=\"col-score\">成绩</th><th class=\"col-diff\">进退</th>";
      for (var rk = 0; rk < allRankTypeLabels.length; rk++) {
        var shortLbl = allRankTypeLabels[rk].length > 4 ? allRankTypeLabels[rk].substring(0, 4) + ".." : allRankTypeLabels[rk];
        htmlHeader += "<th class=\"col-rank\" title=\"" + allRankTypeLabels[rk] + "\">" + escapeHtml(shortLbl) + "</th><th class=\"col-diff\">进退</th>";
      }
    }
    if (allTotalLabels.length > 0) {
      htmlHeader += "<th class=\"col-score\">成绩</th><th class=\"col-diff\">进退</th>";
      for (var rk = 0; rk < allRankTypeLabels.length; rk++) {
        var sl = allRankTypeLabels[rk].length > 4 ? allRankTypeLabels[rk].substring(0, 4) + ".." : allRankTypeLabels[rk];
        htmlHeader += "<th class=\"col-rank\" title=\"" + allRankTypeLabels[rk] + "\">" + escapeHtml(sl) + "</th><th class=\"col-diff\">进退</th>";
      }
    }
  } else {
    for (var sj = 0; sj < sortedSubjects.length; sj++) {
      htmlHeader += "<th class=\"col-score\">成绩</th><th class=\"col-diff\">进退</th>";
    }
    if (allTotalLabels.length > 0) htmlHeader += "<th class=\"col-score\">成绩</th><th class=\"col-diff\">进退</th>";
    for (var tj = 0; tj < allRankTypes.length; tj++) {
      htmlHeader += "<th class=\"col-score\">排名</th><th class=\"col-diff\">进退</th>";
    }
  }
  htmlHeader += "</tr>";
  dom.tableHead.innerHTML = htmlHeader;

  // Table body
  var bodyHtml = "";

  for (var sti = 0; sti < students.length; sti++) {
    var student = students[sti];
    bodyHtml += "<tr><td class=\"name-col\">" + escapeHtml(student.name) + "</td>";

    if (hasInline && rankCount > 0) {
      // Per-subject: score + ALL rank types
      for (var sk = 0; sk < sortedSubjects.length; sk++) {
        var subj = sortedSubjects[sk];
        var scores = student["score_" + subj] || [];
        var scoreDiffs = computeScoreDiffs(scores);

        bodyHtml += "<td>" + scores.map(function(s, i) {
          return student.missing[i] ? "<span class=\"cell-missing\">缺考</span>" : (s != null ? s : "-");
        }).join("  ") + "</td>";
        bodyHtml += "<td>" + scoreDiffs.map(function(d) {
          var c = formatDiffCell(d, "score");
          return "<span class=\"" + c.className + "\">" + c.display + "</span>";
        }).join("  ") + "</td>";

        // All rank types for this subject
        for (var rk = 0; rk < allRankTypeLabels.length; rk++) {
          var rankType = allRankTypeLabels[rk];
          var ranks = (student["subjRanks_" + subj] && student["subjRanks_" + subj][rankType]) || [];
          var rankDiffs = computeRankDiffs(ranks);

          bodyHtml += "<td>" + ranks.map(function(r, i) {
            return student.missing[i] ? "<span class=\"cell-missing\">缺考</span>" : (r != null ? r : "-");
          }).join("  ") + "</td>";
          bodyHtml += "<td>" + rankDiffs.map(function(d) {
            var c = formatDiffCell(d, "rank");
            return "<span class=\"" + c.className + "\">" + c.display + "</span>";
          }).join("  ") + "</td>";
        }
      }

      // Category totals
      for (var ct = 0; ct < categoryTotalLabels.length; ct++) {
        var ctl = categoryTotalLabels[ct];
        var tvals = student["total_" + ctl] || [];
        var tdiffs = computeScoreDiffs(tvals);

        bodyHtml += "<td>" + tvals.map(function(s, i) {
          return student.missing[i] ? "<span class=\"cell-missing\">缺考</span>" : (s != null ? s : "-");
        }).join("  ") + "</td>";
        bodyHtml += "<td>" + tdiffs.map(function(d) {
          var c = formatDiffCell(d, "score");
          return "<span class=\"" + c.className + "\">" + c.display + "</span>";
        }).join("  ") + "</td>";

        for (var rk = 0; rk < allRankTypeLabels.length; rk++) {
          var rt = allRankTypeLabels[rk];
          var tranks = (student["totalRanks_" + ctl] && student["totalRanks_" + ctl][rt]) || [];
          var trdiffs = computeRankDiffs(tranks);

          bodyHtml += "<td>" + tranks.map(function(r, i) {
            return student.missing[i] ? "<span class=\"cell-missing\">缺考</span>" : (r != null ? r : "-");
          }).join("  ") + "</td>";
          bodyHtml += "<td>" + trdiffs.map(function(d) {
            var c = formatDiffCell(d, "rank");
            return "<span class=\"" + c.className + "\">" + c.display + "</span>";
          }).join("  ") + "</td>";
        }
      }

      // Global totals
      if (allTotalLabels.length > 0) {
        var tLabel = allTotalLabels[0];
        var totals = student["total_" + tLabel] || [];
        var tdiffs = computeScoreDiffs(totals);
        bodyHtml += "<td>" + totals.map(function(s, i) {
          return student.missing[i] ? "<span class=\"cell-missing\">缺考</span>" : (s != null ? s : "-");
        }).join("  ") + "</td>";
        bodyHtml += "<td>" + tdiffs.map(function(d) {
          var c = formatDiffCell(d, "score");
          return "<span class=\"" + c.className + "\">" + c.display + "</span>";
        }).join("  ") + "</td>";

        for (var rk = 0; rk < allRankTypeLabels.length; rk++) {
          bodyHtml += "<td>-</td><td>-</td>";
        }
      }
    } else {
      // Legacy mode
      for (var sk = 0; sk < sortedSubjects.length; sk++) {
        var subj = sortedSubjects[sk];
        var scores = student["score_" + subj] || [];
        var diffs = computeScoreDiffs(scores);
        bodyHtml += "<td>" + scores.map(function(s, i) {
          return student.missing[i] ? "<span class=\"cell-missing\">缺考</span>" : (s != null ? s : "-");
        }).join("  ") + "</td>";
        bodyHtml += "<td>" + diffs.map(function(d) {
          var c = formatDiffCell(d, "score");
          return "<span class=\"" + c.className + "\">" + c.display + "</span>";
        }).join("  ") + "</td>";
      }
      if (allTotalLabels.length > 0) {
        var tLabel = allTotalLabels[0];
        var totals = student["total_" + tLabel] || [];
        var tdiffs = computeScoreDiffs(totals);
        bodyHtml += "<td>" + totals.map(function(s, i) {
          return student.missing[i] ? "<span class=\"cell-missing\">缺考</span>" : (s != null ? s : "-");
        }).join("  ") + "</td>";
        bodyHtml += "<td>" + tdiffs.map(function(d) {
          var c = formatDiffCell(d, "score");
          return "<span class=\"" + c.className + "\">" + c.display + "</span>";
        }).join("  ") + "</td>";
      }
      for (var rk = 0; rk < allRankTypes.length; rk++) {
        var rtype = allRankTypes[rk];
        var ranks = student["rank_" + rtype] || [];
        var rdiffs = computeRankDiffs(ranks);
        bodyHtml += "<td>" + ranks.map(function(r, i) {
          return student.missing[i] ? "<span class=\"cell-missing\">缺考</span>" : (r != null ? r : "-");
        }).join("  ") + "</td>";
        bodyHtml += "<td>" + rdiffs.map(function(d) {
          var c = formatDiffCell(d, "rank");
          return "<span class=\"" + c.className + "\">" + c.display + "</span>";
        }).join("  ") + "</td>";
      }
    }
    bodyHtml += "</tr>";
  }
  dom.tableBody.innerHTML = bodyHtml;
  bindRowClicks(state, students, orderedFiles);
  dom.exportXlsx.disabled = false;
  dom.exportCsv.disabled = false;
  dom.trendPanel.classList.remove("open");

  // Show rank comparison note if inline format detected
  showInlineRankNote(hasInline);
}

function showInlineRankNote(hasInline) {
  var note = document.getElementById("inlineRankNote");
  if (!note) {
    note = document.createElement("div");
    note.id = "inlineRankNote";
    note.className = "inline-rank-note";
    var resultHeader = dom.resultArea.querySelector(".result-header");
    if (resultHeader) {
      resultHeader.insertAdjacentElement("afterend", note);
    }
  }
  if (!hasInline) {
    note.style.display = "none";
    return;
  }
  note.style.display = "";
  note.textContent = "每科含成绩+排名对比，排名进退 ↑N 表示排名上升 N 名，↓N 表示排名下降 N 名";
}

function bindRowClicks(state, students, orderedFiles) {
  var rows = dom.tableBody.querySelectorAll("tr");
  var currentExpanded = -1;
  rows.forEach(function(row, idx) {
    row.addEventListener("click", function() {
      if (currentExpanded >= 0 && rows[currentExpanded]) rows[currentExpanded].classList.remove("expanded");
      if (currentExpanded === idx) { dom.trendPanel.classList.remove("open"); currentExpanded = -1; return; }
      row.classList.add("expanded"); currentExpanded = idx;
      var student = students[idx];
      dom.trendStudentName.textContent = student.name;
      if (typeof Chart === "undefined") {
        dom.trendGrid.innerHTML = "<p style=\"padding:16px;color:var(--text-muted);\">Chart.js 正在加载中，请稍候…</p>";
      } else {
        renderTrendCharts(dom.trendGrid, student, orderedFiles, Chart);
      }
      dom.trendPanel.classList.add("open");
    });
  });
}

export function bindExports(state) {
  dom.exportXlsx.addEventListener("click", function() {
    if (!state.matchedResult || state.files.length < 2) return;
    if (typeof XLSX === "undefined") { showToast("SheetJS 正在加载中，请稍候再试"); return; }
    exportXLSX(state, XLSX); showToast("Excel 已导出");
  });
  dom.exportCsv.addEventListener("click", function() {
    if (!state.matchedResult || state.files.length < 2) return;
    exportCSV(state); showToast("CSV 已导出");
  });
}

export function bindTrendClose() {
  dom.trendClose.addEventListener("click", function() {
    dom.trendPanel.classList.remove("open");
    var expanded = dom.tableBody.querySelector("tr.expanded");
    if (expanded) expanded.classList.remove("expanded");
  });
}

/* ===== Onboarding ===== */
var obState = { steps: [], currentStep: 0, dismissed: false, onDone: null };
console.log("Onboarding dismissed:", obState.dismissed);

function defineOnboardingSteps() {
  console.log("Func Def Onboarding dismissed:", obState.dismissed);
  return [
    { id: "upload", target: function() { return dom.uploadDrop; }, text: "把多次考试的成绩 Excel 文件拖到这里", position: "bottom" },
    { id: "cards", target: function() { return dom.cardsContainer; }, text: "拖拽卡片可以调整考试对比的顺序", position: "bottom" },
    { id: "table", target: function() { return dom.tableWrapper; }, text: "这里展示每个同学各科成绩和进退情况，点击任意一行可以展开成绩走势图", position: "top" },
    { id: "export", target: function() { return dom.exportXlsx; }, text: "对比完成后可以导出 Excel 或 CSV", position: "top" },
    { id: "helpBtn", target: function() { return dom.helpBtn; }, text: "点击此处可以重新打开帮助", position: "top" }
  ];
}

export function startOnboarding(fromStep) {
  console.log("Func Start Onboarding dismissed:", obState.dismissed);
  fromStep = fromStep || 0;
  obState.steps = defineOnboardingSteps();
  obState.currentStep = 0;
  obState.dismissed = false;
  obState.onDone = null;

  // skip invisible steps
  var effectiveStart = fromStep;
  for (var i = fromStep; i < obState.steps.length; i++) {
    var t = obState.steps[i].target();
    if (t && t.offsetParent !== null && t.getBoundingClientRect().width > 0 && t.getBoundingClientRect().height > 0) {
      effectiveStart = i;
      break;
    }
  }

  dom.onboardingOverlay.classList.add("active");
  dom.onboardingBubble.style.opacity = "0";
  showStep(effectiveStart);

  dom.bubbleNext.onclick = function() {
    var next = findNextVisibleStep(obState.currentStep + 1);
    clicked = true;
    console.log(clicked);

    console.log(obState.steps[obState.currentStep].id, "next", next); // startpage:-1 imported:1 card:2 table:3 export:4 helpBtn:-1
    if (next >= 0) showStep(next);
    else hideOnboarding();
  };
  dom.bubbleSkip.onclick = function() { hideOnboarding(true); };
  dom.onboardingOverlay.onclick = function(e) {
    if (e.target === dom.onboardingOverlay) hideOnboarding();
  };
}

function findNextVisibleStep(fromIdx) {
  console.log("Func Find Next Visible Step dismissed:", obState.dismissed);
  for (var i = fromIdx; i < obState.steps.length; i++) {
    var t = obState.steps[i].target();
    if (!t) continue;
    var rect = t.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && t.offsetParent !== null) return i;
  }
  return -1;
}

function showStep(idx) {
  console.log("Func Show Step dismissed:", obState.dismissed);
  if (obState.dismissed || idx >= obState.steps.length) { hideOnboarding(); return; }
  dom.uploadDrop.classList.remove("onboarding-highlight");
  dom.exportXlsx.classList.remove("onboarding-highlight");
  dom.cardsContainer.classList.remove("onboarding-highlight");

  obState.currentStep = idx;
  var step = obState.steps[idx];
  var target = step.target();

  if (!target || target.getBoundingClientRect().width === 0) {
    // skip invisible targets
    var next = findNextVisibleStep(idx + 1);
    if (next >= 0) showStep(next);
    else hideOnboarding();
    return;
  }

  dom.bubbleText.textContent = step.text;
  dom.bubbleNext.textContent = (idx >= obState.steps.length - 1 && nextPage == true) ? "完成" : "下一步";

  // force layout before measuring
  dom.onboardingBubble.style.display = "block";
  dom.onboardingBubble.offsetHeight;

  var rect = target.getBoundingClientRect();
  var bw = dom.onboardingBubble.offsetWidth || 280;
  var bh = dom.onboardingBubble.offsetHeight || 100;
  var top, left, arrowClass;

  switch (step.position) {
    case "bottom":
      top = rect.bottom - 300;
      left = rect.left + rect.width / 2 - bw / 2;
      arrowClass = "top";
      break;
    case "top":
      top = rect.top - bh + 160;
      left = rect.left + rect.width / 2 - bw / 2;
      arrowClass = "bottom";
      break;
    default:
      top = rect.top + rect.height / 2 - bh / 2;
      left = rect.right + 12;
      arrowClass = "left";
  }

  var pad = 12;
  left = Math.max(pad, Math.min(window.innerWidth - bw - pad, left));
  top = Math.max(pad, Math.min(window.innerHeight - bh - pad, top));

  dom.onboardingBubble.style.transition = "top 0.35s ease, left 0.35s ease, opacity 0.25s";
  dom.onboardingBubble.style.left = left + "px";
  dom.onboardingBubble.style.top = top + "px";
  dom.onboardingBubble.style.opacity = "1";
  dom.onboardingBubble.querySelector(".bubble-arrow").className = "bubble-arrow " + arrowClass;


  if (step.id === "cards"){
    dom.onboardingBubble.style.top = top + 120 + "px";
    dom.onboardingBubble.style.left = left - 400 + "px";
  }

  if (step.id === "upload"){ 
    dom.uploadDrop.classList.add("onboarding-highlight");
    dom.onboardingBubble.style.left = left + "px";
    dom.onboardingBubble.style.top = top + "px";
  }
  else if (step.id === "cards") dom.cardsContainer.classList.add("onboarding-highlight");
  else if (step.id === "export") {
    dom.exportXlsx.classList.add("onboarding-highlight");
    
  }
}

function hideOnboarding(skip) {
  console.log("Func Hide Onboarding dismissed:", obState.dismissed);
  dom.onboardingOverlay.classList.remove("active");
  dom.onboardingBubble.style.opacity = "0";
  dom.uploadDrop.classList.remove("onboarding-highlight");
  dom.exportXlsx.classList.remove("onboarding-highlight");
  dom.cardsContainer.classList.remove("onboarding-highlight");
  if (skip == true){
    obState.dismissed = true;
  }
  localStorage.setItem("sccalc_onboarding_done", "1");
  console.log("Func Hided Onboarding dismissed:", obState.dismissed);
}

export function continueOnboarding(fromStep) {
  console.log("Func continue Onboarding dismissed:", obState.dismissed);
  if (obState.dismissed) return;
  fromStep = fromStep || 1;
  obState.steps = defineOnboardingSteps();
  dom.onboardingOverlay.classList.add("active");
  dom.onboardingBubble.style.opacity = "0";
  var startIdx = findNextVisibleStep(fromStep);
  if (startIdx >= 0) showStep(startIdx);
  else hideOnboarding();
}


export function isOnboardingDone() { return localStorage.getItem("sccalc_onboarding_done") === "1"; }
//export function isOnboardingActive() { return !obState.dismissed && clicked === true; }

export function isOnboardingActive() { 
    console.log("Running isOnboardingActive check"); 
    console.log("Clicked value:", clicked);
    console.log("Onboarding dismissed:", obState.dismissed);
    return !obState.dismissed && clicked === true;
}


function escapeHtml(str) { var div = document.createElement("div"); div.textContent = str; return div.innerHTML; }

