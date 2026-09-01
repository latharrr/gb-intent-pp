// PicaPool intent form — state machine + renderer.
// Multi-select brand pickers (with opt-out mutual exclusivity), a required
// mobile number at the name checkpoint, lightweight entrance/selection
// animations, and hooks into submit.js for the Google Sheets backend.
"use strict";

var ACCENT = "#C1602F";
var ACCENT2 = "#6F8F76";
var INK = "#2B2621";
var MUTED = "#8C8072";

function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function hexToSoft(hex, alpha) {
  var h = hex.replace("#", "");
  var r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
  return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
}

function svgUse(icon, w, h, viewBox, style) {
  return '<svg width="' + w + '" height="' + h + '" viewBox="' + (viewBox || "0 0 40 40") + '"' +
    (style ? ' style="' + style + '"' : "") + '><use href="#ico-' + icon + '"></use></svg>';
}

function topRowHtml(showBack, showEndNow, pct) {
  return (
    '<div class="top-row">' +
    (showBack ? '<button class="back-btn" data-action="back" aria-label="Back">' + svgUse("chevron", 18, 18, "0 0 20 20") + "</button>" : "") +
    '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%">' +
    '<svg class="progress-leaf" width="14" height="14" viewBox="0 0 20 20"><use href="#ico-leaf"></use></svg>' +
    "</div></div>" +
    (showEndNow ? '<button class="end-now" data-action="end-now">End here</button>' : "") +
    "</div>"
  );
}

function optionTileStyle(step, opt, selected, stacked, animDelay) {
  var quiet = opt.optOut && !selected;
  var borderColor = selected ? (opt.optOut ? "rgba(43,38,33,0.32)" : ACCENT) : (quiet ? "rgba(43,38,33,0.10)" : "rgba(43,38,33,0.15)");
  var bg = selected ? (opt.optOut ? "rgba(43,38,33,0.05)" : hexToSoft(ACCENT, 0.1)) : "#FFFDF8";
  var textColor = quiet ? MUTED : INK;
  var dir = stacked ? "column" : "row";
  var justify = stacked ? "center" : "space-between";
  var pad = stacked ? "26px 14px" : "16px 18px";
  var radius = stacked ? 20 : 16;
  var flexBasis = step.layout === "grid2" ? "calc(50% - 6px)" : step.layout === "grid3" ? "calc(33.333% - 8px)" : "100%";
  var style = "flex:0 0 " + flexBasis + ";display:flex;flex-direction:" + dir + ";align-items:center;justify-content:" + justify +
    ";gap:8px;padding:" + pad + ";border-radius:" + radius + "px;border:" + (selected ? 2 : 1.5) + "px solid " + borderColor +
    ";background:" + bg + ";color:" + textColor + ";font-weight:" + (selected ? 600 : 500) +
    ";text-align:" + (stacked ? "center" : "left") + ";";
  if (animDelay != null) style += "animation:tileIn .32s cubic-bezier(.22,1,.36,1) both;animation-delay:" + animDelay + "ms;";
  return style;
}

function optionCheckStyle(stacked) {
  var base = "color:#fff;background:" + ACCENT + ";border-radius:999px;padding:3px;width:16px;height:16px;box-sizing:border-box;animation:checkPop .28s cubic-bezier(.34,1.56,.64,1) both;";
  return stacked ? "position:absolute;top:10px;right:10px;" + base : "flex-shrink:0;" + base;
}

var FormApp = (function () {
  function FormApp(root) {
    this.root = root;
    this.state = {
      steps: buildInitialSteps(),
      stepIndex: 0,
      answers: {},
      niceOneLabel: null,
    };
    this._autoT = null;
    this._niceT = null;
    this._lastStepKey = null;
    this._lastPct = null;
    this.root.addEventListener("click", this.handleClick.bind(this));
    this.render();
    this.maybeAutoAdvance();
  }

  var P = FormApp.prototype;

  P.setState = function (patch) {
    var prevIndex = this.state.stepIndex;
    var partial = typeof patch === "function" ? patch(this.state) : patch;
    Object.assign(this.state, partial);
    this.render();
    if (this.state.stepIndex !== prevIndex) this.maybeAutoAdvance();
  };

  P.maybeAutoAdvance = function () {
    clearTimeout(this._autoT);
    var step = this.state.steps[this.state.stepIndex];
    if (step && step.kind === "transition") {
      this._autoT = setTimeout(this.goNext.bind(this), 1500);
    }
  };

  P.goNext = function () {
    this.setState(function (s) { return { stepIndex: Math.min(s.stepIndex + 1, s.steps.length - 1) }; });
  };

  P.goBack = function () {
    clearTimeout(this._niceT);
    this.setState(function (s) {
      var idx = s.stepIndex - 1;
      if (idx > 0 && s.steps[idx].kind === "transition") idx -= 1;
      if (idx < 0) idx = 0;
      return { stepIndex: idx, niceOneLabel: null };
    });
  };

  P.endNow = function () {
    this.setState(function (s) {
      var idx = s.steps.findIndex(function (x) { return x.key === "final_ask"; });
      return { stepIndex: idx < 0 ? s.stepIndex : idx, niceOneLabel: null };
    });
  };

  // Toggling a real pick clears any opt-out for this step, and vice versa —
  // "Don't eat X" is mutually exclusive with actual brand picks.
  P.toggleMulti = function (step, optId) {
    this.setState(function (s) {
      var opt = (step.options || []).find(function (o) { return o.id === optId; });
      var cur = new Set(s.answers[step.key] || []);
      if (opt && opt.optOut) {
        if (cur.has(optId)) cur.delete(optId); else { cur.clear(); cur.add(optId); }
      } else {
        (step.options || []).forEach(function (o) { if (o.optOut) cur.delete(o.id); });
        if (cur.has(optId)) cur.delete(optId); else cur.add(optId);
      }
      var answers = Object.assign({}, s.answers);
      answers[step.key] = Array.from(cur);
      return { answers: answers };
    });
  };

  P.continueMulti = function (step, clear) {
    var otherNote = null;
    if (!clear) {
      var otherInputEl = document.getElementById("other-input");
      if (otherInputEl) otherNote = otherInputEl.value;
    }
    this.setState(function (s) {
      var steps = s.steps;
      var answers = Object.assign({}, s.answers);
      if (clear) {
        answers[step.key] = [];
        delete answers[step.key + "__other"];
      } else if (otherNote !== null) {
        answers[step.key + "__other"] = otherNote;
      }
      if (step.key === "interests") {
        var sel = clear ? [] : (answers.interests || []);
        var alreadySpliced = steps.some(function (x) { return x.branchInserted; });
        if (!alreadySpliced) {
          var gateIdx = steps.findIndex(function (x) { return x.key === "interests"; });
          var branch = buildBranchSteps(sel).map(function (b) { return Object.assign({}, b, { branchInserted: true }); });
          steps = steps.slice(0, gateIdx + 1).concat(branch, steps.slice(gateIdx + 1));
        }
      }
      return { steps: steps, answers: answers, stepIndex: s.stepIndex + 1 };
    });
  };

  P.selectSingle = function (step, opt) {
    this.commit(step, opt.id);
  };

  P.commit = function (step, value) {
    var answers = Object.assign({}, this.state.answers);
    answers[step.key] = value;
    this.setState({ answers: answers });
    this.afterAnswer(step);
  };

  P.afterAnswer = function (step) {
    if (step.endOfSection) {
      clearTimeout(this._niceT);
      this.setState({ niceOneLabel: step.section + " — noted." });
      this._niceT = setTimeout(this.dismissNiceOne.bind(this), 1100);
    } else {
      this.goNext();
    }
  };

  P.dismissNiceOne = function () {
    clearTimeout(this._niceT);
    this.setState({ niceOneLabel: null });
    this.goNext();
  };

  P.skipCurrent = function (step) {
    if (step.multi) { this.continueMulti(step, true); return; }
    var answers = Object.assign({}, this.state.answers);
    answers[step.key] = undefined;
    this.setState({ answers: answers });
    this.afterAnswer(step);
  };

  // Name is optional; mobile number is required to proceed past the
  // checkpoint. Validation runs without a full re-render so a failed
  // attempt never wipes what the user already typed.
  P.continueNames = function () {
    var nameEl = document.getElementById("name-input");
    var phoneEl = document.getElementById("phone-input");
    var phoneRaw = phoneEl ? phoneEl.value.trim() : "";
    var digits = phoneRaw.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) {
      this.showFieldError(phoneEl, digits.length === 0 ? "Mobile number is required." : "Enter a valid mobile number.");
      return;
    }
    var answers = Object.assign({}, this.state.answers);
    answers.checkpoint = { name: nameEl ? nameEl.value.trim() : "", phone: phoneRaw };
    this.setState({ answers: answers });
    this.goNext();
  };

  P.showFieldError = function (fieldEl, message) {
    var errEl = document.getElementById("phone-error");
    if (errEl) errEl.textContent = message;
    if (!fieldEl) return;
    fieldEl.classList.add("input-error");
    fieldEl.classList.remove("shake");
    void fieldEl.offsetWidth; // restart the shake animation on repeat failures
    fieldEl.classList.add("shake");
    fieldEl.focus();
  };

  P.addChip = function (text) {
    var ta = document.getElementById("final-textarea");
    if (!ta) return;
    var cur = ta.value.trim();
    ta.value = cur ? cur.replace(/[,\s]+$/, "") + ", " + text : text;
    ta.focus();
  };

  P.finishFinal = function () {
    var ta = document.getElementById("final-textarea");
    var answers = Object.assign({}, this.state.answers);
    answers.final_ask = ta ? ta.value : "";
    if (window.Submission) window.Submission.send("Complete", answers, answers.checkpoint);
    this.setState({ answers: answers });
    this.goNext();
  };

  P.restart = function () {
    clearTimeout(this._autoT);
    clearTimeout(this._niceT);
    this._lastStepKey = null;
    this._lastPct = null;
    if (window.Submission) window.Submission.resetSession();
    this.setState({ steps: buildInitialSteps(), stepIndex: 0, answers: {}, niceOneLabel: null });
  };

  P.handleClick = function (e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    var step = this.state.steps[this.state.stepIndex];
    switch (el.dataset.action) {
      case "start": this.goNext(); break;
      case "back": this.goBack(); break;
      case "end-now": this.endNow(); break;
      case "select-option": {
        var opt = (step.options || []).find(function (o) { return o.id === el.dataset.optId; });
        if (!opt) return;
        if (step.multi) this.toggleMulti(step, opt.id); else this.selectSingle(step, opt);
        break;
      }
      case "continue-multi": this.continueMulti(step, false); break;
      case "skip": this.skipCurrent(step); break;
      case "continue-names": this.continueNames(); break;
      case "add-chip": this.addChip(el.dataset.chipText); break;
      case "finish-final": this.finishFinal(); break;
      case "restart": this.restart(); break;
      case "dismiss-nice-one": this.dismissNiceOne(); break;
    }
  };

  // ---- rendering ----

  P.render = function () {
    var s = this.state;
    var step = s.steps[s.stepIndex] || s.steps[0];
    var gateIdx = s.steps.findIndex(function (x) { return x.key === "interests"; });
    var showBack = s.stepIndex > 0 && step.kind !== "end";
    var showEndNow = gateIdx >= 0 && s.stepIndex >= gateIdx && step.kind !== "end" && step.kind !== "final";
    var pct = Math.min(100, Math.round((s.stepIndex / (s.steps.length - 1)) * 100));

    var isNewStep = step.key !== this._lastStepKey;
    var prevPct = this._lastPct == null ? pct : this._lastPct;
    var renderPct = isNewStep ? prevPct : pct;
    this._lastStepKey = step.key;
    this._lastPct = pct;

    var screenHtml;
    if (step.kind === "intro") screenHtml = this.renderIntro();
    else if (step.kind === "notice") screenHtml = this.renderNotice();
    else if (step.kind === "transition") screenHtml = this.renderTransition();
    else if (step.kind === "question") screenHtml = this.renderQuestion(step, showBack, showEndNow, renderPct, isNewStep);
    else if (step.kind === "names") screenHtml = this.renderNames(step, showBack, renderPct);
    else if (step.kind === "final") screenHtml = this.renderFinal(step, renderPct);
    else if (step.kind === "end") screenHtml = this.renderEnd();
    else screenHtml = "";

    var overlayHtml = s.niceOneLabel ? this.renderNiceOne(s.niceOneLabel) : "";
    this.root.innerHTML = '<div class="card">' + screenHtml + overlayHtml + "</div>";

    if (isNewStep) {
      var fillEl = this.root.querySelector(".progress-fill");
      if (fillEl) {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { fillEl.style.width = pct + "%"; });
        });
      }
      // Re-sync the sheet row with whatever's been answered so far on every
      // new question — so a user who drops off halfway still leaves their
      // partial answers behind, not just a blank Incomplete row. finishFinal()
      // sends the terminal "Complete" ping itself; the Apps Script side never
      // lets a later "Incomplete" ping downgrade an already-Complete row, so
      // this can't race a fast Finish click into reverting the status.
      if (window.Submission && (step.kind === "question" || step.kind === "names" || step.kind === "final")) {
        window.Submission.send("Incomplete", s.answers, s.answers.checkpoint);
      }
    }
  };

  P.renderIntro = function () {
    return (
      '<div class="screen-center">' +
      '<div class="body">' +
      svgUse("houses", 118, 98, "0 0 120 100", "color:" + ACCENT2) +
      "<div>" +
      '<h1 class="headline">Buy together with your PG mates.</h1>' +
      '<p class="subtext">Save &#8377;1,100+ a month on the stuff you already order — split across everyone in your PG.</p>' +
      "</div>" +
      '<div class="proof-pill">14 PGs in already · &#8377;21,372 requested so far</div>' +
      "</div>" +
      '<button class="btn-primary" data-action="start">Fill what you require</button>' +
      "</div>"
    );
  };

  P.renderNotice = function () {
    return (
      '<div class="screen-center">' +
      '<div class="body">' +
      svgUse("note", 54, 54, "0 0 40 40", "color:" + ACCENT) +
      '<h2 class="notice-heading">Every question is optional.</h2>' +
      '<p class="notice-body">Answer what\'s relevant to you, skip the rest. About 3 minutes if you go through everything.</p>' +
      "</div>" +
      '<button class="btn-primary btn-plain" data-action="start">Got it</button>' +
      "</div>"
    );
  };

  P.renderTransition = function () {
    return (
      '<div class="screen-transition" data-action="start">' +
      svgUse("paperplane", 60, 60, "0 0 40 40", "color:" + ACCENT + ";animation:floaty 2.2s ease-in-out infinite;") +
      '<div class="transition-label">Let\'s find out what your PG needs.</div>' +
      "</div>"
    );
  };

  P.renderQuestion = function (step, showBack, showEndNow, pct, isNewStep) {
    var self = this;
    var stacked = step.key === "interests";
    var isMulti = !!step.multi;
    var rawAnswer = this.state.answers[step.key];
    var selectedArr = isMulti ? (rawAnswer || []) : [];

    var optionsHtml = (step.options || []).map(function (opt, i) {
      var selected = isMulti
        ? selectedArr.indexOf(opt.id) !== -1
        : rawAnswer === opt.id;
      var showInput = isMulti && opt.needsInput && selected;
      var iconHtml = opt.icon ? svgUse(opt.icon, 22, 22) : "";
      var checkHtml = selected ? svgUse("check", 16, 16, "0 0 16 16", optionCheckStyle(stacked)) : "";
      var animDelay = isNewStep ? i * 35 : null;
      var tile =
        '<div class="option-tile" data-action="select-option" data-opt-id="' + escapeHtml(opt.id) + '" style="' +
        optionTileStyle(step, opt, selected, stacked, animDelay) + '">' +
        iconHtml + "<span>" + escapeHtml(opt.label) + "</span>" + checkHtml + "</div>";
      var reveal = showInput
        ? '<div class="other-reveal"><input class="other-input" id="other-input" placeholder="' +
          escapeHtml(opt.placeholder || "") + '"></div>'
        : "";
      return tile + reveal;
    }).join("");

    return (
      '<div class="screen">' +
      topRowHtml(showBack, showEndNow, pct) +
      '<div class="q-body' + (isNewStep ? " step-enter" : "") + '">' +
      '<div class="section-label">' + escapeHtml(step.section) + "</div>" +
      svgUse(step.icon, 30, 30, "0 0 40 40", "color:" + ACCENT2 + ";margin-bottom:12px;display:block;") +
      '<h2 class="q-title">' + escapeHtml(step.title) + "</h2>" +
      (step.sub ? '<p class="q-sub">' + escapeHtml(step.sub) + "</p>" : "") +
      '<div class="options-grid">' + optionsHtml + "</div>" +
      "</div>" +
      (isMulti
        ? '<div class="footer-multi"><button class="btn-primary" data-action="continue-multi">Continue</button>' +
          '<button class="skip-link" data-action="skip">Skip</button></div>'
        : '<div class="footer-single"><button class="skip-link" data-action="skip">Skip</button></div>') +
      "</div>"
    );
  };

  P.renderNames = function (step, showBack, pct) {
    return (
      '<div class="screen">' +
      topRowHtml(showBack, false, pct) +
      '<div class="q-body step-enter">' +
      svgUse("chat", 48, 48, "0 0 40 40", "color:" + ACCENT + ";margin-bottom:14px;") +
      '<h2 class="names-heading">Who\'s this for?</h2>' +
      '<p class="names-sub">So we can tell you on WhatsApp when your order\'s ready. Name is optional — mobile number is required.</p>' +
      '<div class="names-fields">' +
      '<input class="text-field" id="name-input" placeholder="Your name (optional)" autocomplete="name">' +
      '<div class="field-group">' +
      '<input class="text-field" id="phone-input" placeholder="WhatsApp number *" type="tel" inputmode="tel" autocomplete="tel">' +
      '<div class="field-error" id="phone-error"></div>' +
      "</div>" +
      "</div></div>" +
      '<div class="names-footer"><button class="btn-primary" data-action="continue-names">Continue</button></div>' +
      "</div>"
    );
  };

  P.renderFinal = function (step, pct) {
    var chips = FINAL_CHIPS.map(function (c) {
      return '<button class="final-chip" data-action="add-chip" data-chip-text="' + escapeHtml(c) + '">' + escapeHtml(c) + "</button>";
    }).join("");
    return (
      '<div class="screen">' +
      topRowHtml(true, false, pct) +
      '<div class="q-body step-enter" style="padding:10px 24px 20px;">' +
      svgUse("wish", 50, 50, "0 0 40 40", "color:" + ACCENT + ";margin-bottom:14px;") +
      '<div class="final-label">Last one</div>' +
      '<h2 class="final-heading">Three things you\'d want at 30–40% off?</h2>' +
      '<p class="final-sub">Totally optional — anything goes.</p>' +
      '<textarea class="final-textarea" id="final-textarea" placeholder="e.g. rice, cooking oil, diapers…"></textarea>' +
      '<div class="final-chips">' + chips + "</div>" +
      "</div>" +
      '<div class="final-footer"><button class="btn-primary" data-action="finish-final">Finish</button></div>' +
      "</div>"
    );
  };

  P.renderEnd = function () {
    return (
      '<div class="screen-end">' +
      svgUse("done", 58, 58, "0 0 40 40", "color:" + ACCENT2) +
      '<h2 class="end-heading">That\'s it — thank you!</h2>' +
      '<p class="end-body">We\'ll message you on WhatsApp as soon as your PG\'s order is ready to lock in.</p>' +
      '<button class="restart-link" data-action="restart">Fill it again</button>' +
      "</div>"
    );
  };

  P.renderNiceOne = function (label) {
    return (
      '<div class="nice-one" data-action="dismiss-nice-one">' +
      svgUse("leaf", 52, 52, "0 0 20 20", "color:" + ACCENT2 + ";animation:leafPop .4s cubic-bezier(.34,1.56,.64,1) both;") +
      '<div class="nice-one-label">' + escapeHtml(label) + "</div>" +
      "</div>"
    );
  };

  return FormApp;
})();

document.addEventListener("DOMContentLoaded", function () {
  new FormApp(document.getElementById("app"));
});
