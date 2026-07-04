import { parseFile } from "./parser.js";
import { matchStudents } from "./matcher.js";
import {
  initDom, showToast, renderCards, initDragDrop, rerunMatching,
  updateTable, bindExports, bindTrendClose,
  startOnboarding, continueOnboarding, isOnboardingDone, isOnboardingActive
} from "./ui.js";

var state = { files: [], fileOrder: [], matchedResult: null };

function init() {
  initDom();
  var uploadDrop = document.getElementById("uploadDrop");
  var fileInput = document.getElementById("fileInput");
  var helpBtn = document.getElementById("helpBtn");

  uploadDrop.addEventListener("click", function() { fileInput.click(); });
  document.querySelector(".upload-link").addEventListener("click", function(e) { e.stopPropagation(); fileInput.click(); });
  fileInput.addEventListener("change", function(e) { handleFiles(e.target.files); });

  uploadDrop.addEventListener("dragover", function(e) { e.preventDefault(); e.stopPropagation(); uploadDrop.classList.add("drag-over"); });
  uploadDrop.addEventListener("dragleave", function(e) { e.preventDefault(); e.stopPropagation(); uploadDrop.classList.remove("drag-over"); });
  uploadDrop.addEventListener("drop", function(e) { e.preventDefault(); e.stopPropagation(); uploadDrop.classList.remove("drag-over"); handleFiles(e.dataTransfer.files); });

  document.addEventListener("dragover", function(e) { e.preventDefault(); uploadDrop.classList.add("drag-over"); });
  document.addEventListener("dragleave", function(e) { if (!e.relatedTarget || e.relatedTarget === document.documentElement) uploadDrop.classList.remove("drag-over"); });
  document.addEventListener("drop", function(e) { e.preventDefault(); uploadDrop.classList.remove("drag-over"); if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files); });

  initDragDrop(state);
  bindExports(state);
  bindTrendClose();

  helpBtn.addEventListener("click", function() {
    localStorage.removeItem("sccalc_onboarding_done");
    startOnboarding(0);
  });

  if (!isOnboardingDone()) {
    setTimeout(function() { startOnboarding(0); }, 500);
  }
}

async function handleFiles(fileList) {
  var files = [].slice.call(fileList).filter(function(f) { return f.name.endsWith(".xlsx") || f.name.endsWith(".xls"); });
  if (files.length === 0) { showToast("\u8bf7\u9009\u62e9 .xlsx \u6216 .xls \u683c\u5f0f\u7684 Excel \u6587\u4ef6"); return; }

  if (typeof XLSX === "undefined") {
    showToast("Excel \u89e3\u6790\u5e93\u6b63\u5728\u52a0\u8f7d\u4e2d\uff0c\u8bf7\u7a0d\u5019\u2026");
    await waitForLib(function() { return typeof XLSX !== "undefined"; }, 5000);
  }
  if (typeof XLSX === "undefined") { showToast("SheetJS \u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u5237\u65b0\u9875\u9762\u91cd\u8bd5"); return; }

  showToast("\u6b63\u5728\u89e3\u6790 " + files.length + " \u4e2a\u6587\u4ef6\u2026");
  var results = [];
  for (var i = 0; i < files.length; i++) {
    try { results.push(await parseFile(files[i], XLSX)); }
    catch (err) { showToast(err.message); }
  }
  if (results.length === 0) return;

  for (var j = 0; j < results.length; j++) {
    state.files.push(results[j]);
    state.fileOrder.push(state.files.length - 1);
  }
  renderCards(state);

  if (state.files.length >= 2) {
    console.log(state.files.length); 
    console.log(isOnboardingActive());
    rerunMatching(state);
    // If onboarding step 1 is active, continue to step 2
    if (isOnboardingActive()) {
      console.log("Onboarding step 1 active, continuing to step 2");
      setTimeout(function() { continueOnboarding(1); }, 800);
    }
  }
}

function waitForLib(pred, timeout) {
  return new Promise(function(resolve) {
    var start = Date.now();
    var check = function() {
      if (pred()) return resolve(true);
      if (Date.now() - start > timeout) return resolve(false);
      setTimeout(check, 200);
    };
    check();
  });
}

document.addEventListener("DOMContentLoaded", init);