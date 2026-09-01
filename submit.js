// PicaPool intent form — submission capture.
//
// SETUP: paste your deployed Google Apps Script Web App URL below. Until you
// do, submissions are simply skipped (no error, no data lost visibly, the
// form just doesn't have anywhere to send it yet). See google-apps-script.gs
// and SHEETS_SETUP.md in this folder for the one-time setup.
var SHEETS_ENDPOINT_URL = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";

(function () {
  "use strict";

  function isConfigured() {
    return !!SHEETS_ENDPOINT_URL && SHEETS_ENDPOINT_URL.indexOf("PASTE_YOUR_") === -1;
  }

  function getSessionId() {
    try {
      var existing = sessionStorage.getItem("pp_session_id");
      if (existing) return existing;
    } catch (e) {}
    var id = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : "id-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    try { sessionStorage.setItem("pp_session_id", id); } catch (e) {}
    return id;
  }

  // A visit to https://groupbuying.picapool.tech/<slug> is a trackable link —
  // whatever comes after the domain is recorded as this submission's source.
  function getSourceSlug() {
    var path = (location.pathname || "/").replace(/^\/+|\/+$/g, "");
    return path ? path : "direct";
  }

  var ipPromise = null;
  function getClientIp() {
    if (ipPromise) return ipPromise;
    ipPromise = fetch("https://api.ipify.org?format=json", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) { return d.ip || ""; })
      .catch(function () { return ""; });
    return ipPromise;
  }

  function flattenAnswers(answers) {
    var out = {};
    Object.keys(answers || {}).forEach(function (k) {
      if (k === "checkpoint") return;
      var v = answers[k];
      if (v === undefined || v === null) out[k] = "";
      else if (Array.isArray(v)) out[k] = v.join(", ");
      else if (typeof v === "object") out[k] = JSON.stringify(v);
      else out[k] = String(v);
    });
    return out;
  }

  function postToSheet(payload) {
    if (!isConfigured()) return;
    try {
      // Plain-string body keeps this a "simple request" (no CORS preflight),
      // which is what a Google Apps Script Web App can actually answer.
      fetch(SHEETS_ENDPOINT_URL, { method: "POST", body: JSON.stringify(payload) }).catch(function () {});
    } catch (e) {}
  }

  var sessionId = getSessionId();
  var sourceSlug = getSourceSlug();

  window.Submission = {
    sessionId: sessionId,
    sourceSlug: sourceSlug,
    // status: "Incomplete" (sent once, on reaching the first question) or
    // "Complete" (sent on Finish) — Apps Script upserts by session_id, so
    // the Complete call overwrites the Incomplete row rather than duplicating it.
    send: function (status, answers, checkpoint) {
      var payload = {
        session_id: sessionId,
        status: status,
        source: sourceSlug,
        page_url: location.href,
        user_agent: navigator.userAgent,
        language: navigator.language || "",
        timestamp: new Date().toISOString(),
        name: (checkpoint && checkpoint.name) || "",
        phone: (checkpoint && checkpoint.phone) || "",
        answers: flattenAnswers(answers),
      };
      getClientIp().then(function (ip) {
        payload.ip = ip;
        postToSheet(payload);
      });
    },
  };
})();
