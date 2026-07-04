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
      '<div class="card-drag-handle"><span></span><span></span><span></span></div>' +
      '<div class="card-order">' + (orderIdx + 1) + '</div>' +
      '<div class="card-info"><div class="card-filename" title="' + escapeHtml(file.filename) + '">' + escapeHtml(file.filename) + '</div>' +
      '<div class="card-meta">' + file.subjects.length + ' \u79d1 \u00b7 ' + file.students.length + ' \u540d\u5b66\u751f</div></div>' +
      '<button class="card-remove" data-idx="' + fileIdx + '" title="\u79fb\u9664">\u00d7</button>';
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
    ? "\u81f3\u5c11\u9700\u8981 2 \u4e2a\u6587\u4ef6\uff08\u8fd8\u9700 " + remain + " \u4e2a\uff09"
    : "\u5df2\u6ee1\u8db3\u6700\u4f4e\u8981\u6c42\uff0c\u53ef\u4ee5\u7ee7\u7eed\u6dfb\u52a0\u66f4\u591a\u6587\u4ef6";
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
export function updateTable(state) {
  nextPage = true;
  var files = state.files, fileOrder = state.fileOrder, matchedResult = state.matchedResult;
  if (!matchedResult || files.length < 2) { dom.resultArea.classList.remove("visible"); return; }
  dom.resultArea.classList.add("visible");
  var orderedFiles = fileOrder.map(function(i) { return files[i]; });
  var students = matchedResult.students, allSubjects = matchedResult.allSubjects, allRankTypes = matchedResult.allRankTypes, allTotalLabels = matchedResult.allTotalLabels;
  var SUBJ_ORDER = ["\u8bed\u6587","\u6570\u5b66","\u82f1\u8bed","\u7269\u7406","\u5316\u5b66","\u751f\u7269","\u653f\u6cbb","\u5386\u53f2","\u5730\u7406"];
  var sortedSubjects = allSubjects.filter(function(s) { return s; }).sort(function(a, b) {
    var ai = SUBJ_ORDER.indexOf(a), bi = SUBJ_ORDER.indexOf(b);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.localeCompare(b);
  });
  var html = '<tr><th class="col-name" rowspan="2">\u59d3\u540d</th>';
  for (var si = 0; si < sortedSubjects.length; si++) {
    html += '<th class="col-subject" colspan="2">' + escapeHtml(sortedSubjects[si]) + '</th>';
  }
  if (allTotalLabels.length > 0) {
    html += '<th class="col-subject" colspan="2">' + escapeHtml(allTotalLabels[0] || "\u603b\u5206") + '</th>';
  }
  for (var ti = 0; ti < allRankTypes.length; ti++) {
    html += '<th class="col-subject" colspan="2">' + escapeHtml(getRankLabel(allRankTypes[ti])) + '</th>';
  }
  html += '</tr><tr>';
  for (var sj = 0; sj < sortedSubjects.length; sj++) {
    html += '<th class="col-score">\u6210\u7ee9</th><th class="col-diff">\u8fdb\u9000</th>';
  }
  if (allTotalLabels.length > 0) html += '<th class="col-score">\u6210\u7ee9</th><th class="col-diff">\u8fdb\u9000</th>';
  for (var tj = 0; tj < allRankTypes.length; tj++) {
    html += '<th class="col-score">\u6392\u540d</th><th class="col-diff">\u8fdb\u9000</th>';
  }
  html += '</tr>';
  dom.tableHead.innerHTML = html;

  var bodyHtml = "";
  for (var sti = 0; sti < students.length; sti++) {
    var student = students[sti];
    bodyHtml += '<tr><td class="name-col">' + escapeHtml(student.name) + '</td>';
    for (var sk = 0; sk < sortedSubjects.length; sk++) {
      var subj = sortedSubjects[sk];
      var scores = student["score_" + subj] || [];
      var diffs = computeScoreDiffs(scores);
      bodyHtml += '<td>' + scores.map(function(s, i) {
        return student.missing[i] ? '<span class="cell-missing">\u7f3a\u8003</span>' : (s != null ? s : "-");
      }).join("  ") + '</td>';
      bodyHtml += '<td>' + diffs.map(function(d) {
        var c = formatDiffCell(d, "score");
        return '<span class="' + c.className + '">' + c.display + '</span>';
      }).join("  ") + '</td>';
    }
    if (allTotalLabels.length > 0) {
      var tLabel = allTotalLabels[0];
      var totals = student["total_" + tLabel] || [];
      var tdiffs = computeScoreDiffs(totals);
      bodyHtml += '<td>' + totals.map(function(s, i) {
        return student.missing[i] ? '<span class="cell-missing">\u7f3a\u8003</span>' : (s != null ? s : "-");
      }).join("  ") + '</td>';
      bodyHtml += '<td>' + tdiffs.map(function(d) {
        var c = formatDiffCell(d, "score");
        return '<span class="' + c.className + '">' + c.display + '</span>';
      }).join("  ") + '</td>';
    }
    for (var rk = 0; rk < allRankTypes.length; rk++) {
      var rtype = allRankTypes[rk];
      var ranks = student["rank_" + rtype] || [];
      var rdiffs = computeRankDiffs(ranks);
      bodyHtml += '<td>' + ranks.map(function(r, i) {
        return student.missing[i] ? '<span class="cell-missing">\u7f3a\u8003</span>' : (r != null ? r : "-");
      }).join("  ") + '</td>';
      bodyHtml += '<td>' + rdiffs.map(function(d) {
        var c = formatDiffCell(d, "rank");
        return '<span class="' + c.className + '">' + c.display + '</span>';
      }).join("  ") + '</td>';
    }
    bodyHtml += '</tr>';
  }
  dom.tableBody.innerHTML = bodyHtml;
  bindRowClicks(state, students, orderedFiles);
  dom.exportXlsx.disabled = false;
  dom.exportCsv.disabled = false;
  dom.trendPanel.classList.remove("open");
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
        dom.trendGrid.innerHTML = '<p style="padding:16px;color:var(--text-muted);">Chart.js \u6b63\u5728\u52a0\u8f7d\u4e2d\uff0c\u8bf7\u7a0d\u5019\u2026</p>';
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
    if (typeof XLSX === "undefined") { showToast("SheetJS \u6b63\u5728\u52a0\u8f7d\u4e2d\uff0c\u8bf7\u7a0d\u5019\u518d\u8bd5"); return; }
    exportXLSX(state, XLSX); showToast("Excel \u5df2\u5bfc\u51fa");
  });
  dom.exportCsv.addEventListener("click", function() {
    if (!state.matchedResult || state.files.length < 2) return;
    exportCSV(state); showToast("CSV \u5df2\u5bfc\u51fa");
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
    { id: "upload", target: function() { return dom.uploadDrop; }, text: "\u628a\u591a\u6b21\u8003\u8bd5\u7684\u6210\u7ee9 Excel \u6587\u4ef6\u62d6\u5230\u8fd9\u91cc", position: "bottom" },
    { id: "cards", target: function() { return dom.cardsContainer; }, text: "\u62d6\u62fd\u5361\u7247\u53ef\u4ee5\u8c03\u6574\u8003\u8bd5\u5bf9\u6bd4\u7684\u987a\u5e8f", position: "bottom" },
    { id: "table", target: function() { return dom.tableWrapper; }, text: "\u8fd9\u91cc\u5c55\u793a\u6bcf\u4e2a\u540c\u5b66\u5404\u79d1\u6210\u7ee9\u548c\u8fdb\u9000\u60c5\u51b5\uff0c\u70b9\u51fb\u4efb\u610f\u4e00\u884c\u53ef\u4ee5\u5c55\u5f00\u6210\u7ee9\u8d70\u52bf\u56fe", position: "top" },
    { id: "export", target: function() { return dom.exportXlsx; }, text: "\u5bf9\u6bd4\u5b8c\u6210\u540e\u53ef\u4ee5\u5bfc\u51fa Excel \u6216 CSV", position: "top" },
    { id: "helpBtn", target: function() { return dom.helpBtn; }, text: "\u70b9\u51fb\u6b64\u5904\u53ef\u4ee5\u91cd\u65b0\u6253\u5f00\u5e2e\u52a9", position: "top" }
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
  dom.bubbleNext.textContent = (idx >= obState.steps.length - 1 && nextPage == true) ? "\u5b8c\u6210" : "\u4e0b\u4e00\u6b65";

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

// export function isOnboardingActive() { 
//     return !obState.dismissed && clicked === true; 
// }

// 需要时直接调用
// function ReactivateFunc() {
//     console.log("Running isOnboardingActive check");
//     const result = isOnboardingActive();  // 调用函数
//     console.log("结果:", result);
//     return result;
// }
// 
// 
// ReactivateFunc();
// ReactivateFunc();
// setInterval(ReactivateFunc, 1000);  // 每秒检查一次