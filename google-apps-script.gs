/**
 * PicaPool intent form — Google Sheets backend.
 *
 * SETUP (one time, ~2 minutes):
 *   1. Create a blank Google Sheet (this will hold all 3 tabs).
 *   2. Extensions > Apps Script. Delete the placeholder code, paste this whole file.
 *   3. Run the `setup` function once (Run menu, or the PicaPool menu that
 *      appears after you reload the sheet). Approve the permission prompt —
 *      it only touches this one spreadsheet.
 *   4. Deploy > New deployment > type "Web app". Execute as: Me.
 *      Who has access: Anyone. Deploy, then copy the Web app URL.
 *   5. Paste that URL into SHEETS_ENDPOINT_URL at the top of submit.js and
 *      redeploy the site.
 *
 * doPost() upserts by session_id: the form pings once when someone reaches
 * the first question (status "Incomplete") and again when they hit Finish
 * (status "Complete", same session_id) — so a person who never finishes
 * stays a single "Incomplete" row instead of a duplicate.
 */

var SUBMISSIONS_SHEET = "Submissions";
var DASHBOARD_SHEET = "Dashboard";
var LINKS_SHEET = "Links";
var LINK_DOMAIN = "https://groupbuying.picapool.tech/";

// Columns that exist for every submission, in sheet order.
var BASE_FIELDS = [
  ["timestamp", "Timestamp"],
  ["session_id", "Session ID"],
  ["status", "Status"],
  ["source", "Source Link"],
  ["name", "Name"],
  ["phone", "Phone"],
  ["ip", "IP Address"],
  ["user_agent", "Device Info"],
  ["language", "Language"],
  ["page_url", "Page URL"],
];

// One column per form question. Keys must match the step keys / __other
// suffixes produced by intent-form/data.js + submit.js.
var ANSWER_FIELDS = [
  ["pizza", "Pizza"],
  ["burger", "Burger"],
  ["burger__other", "Burger (Other)"],
  ["outside_other", "Other Outside Food"],
  ["outside_freq", "Fast Food Frequency"],
  ["chips", "Chips"],
  ["cold_drink", "Cold Drink"],
  ["biscuits", "Biscuits"],
  ["choco_wafer", "Chocolate/Wafer"],
  ["qc_freq", "Quick Commerce Frequency"],
  ["noodles", "Instant Noodles"],
  ["oats", "Oats/Cereal"],
  ["peanut_butter", "Peanut Butter"],
  ["tea_coffee", "Tea/Coffee"],
  ["detergent", "Detergent"],
  ["toothpaste", "Toothpaste"],
  ["interests", "Interests"],
  ["sup_protein", "Protein"],
  ["sup_creatine", "Creatine"],
  ["sunscreen", "Sunscreen"],
  ["facewash", "Facewash"],
  ["facewash__other", "Facewash (Other)"],
  ["moisturizer", "Moisturiser"],
  ["oil_ghee", "Oil/Ghee"],
  ["oil_ghee__other", "Oil/Ghee (Other)"],
  ["masala", "Masala"],
  ["masala__other", "Masala (Other)"],
  ["atta_rice", "Atta/Rice"],
  ["atta_rice__other", "Atta/Rice (Other)"],
  ["final_ask", "30-40% Off Wishlist"],
];

var ALL_FIELDS = BASE_FIELDS.concat(ANSWER_FIELDS);
// Categories worth a "top picks" tile on the Dashboard — free text and
// "(Other)" notes don't group meaningfully, so they're left out.
var DASHBOARD_CATEGORIES = ANSWER_FIELDS.filter(function (f) {
  return f[0].indexOf("__other") === -1 && f[0] !== "final_ask";
});

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var body = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SUBMISSIONS_SHEET);
    if (!sheet) throw new Error("Run setup() once before accepting submissions.");

    var rowValues = ALL_FIELDS.map(function (f) { return fieldValue(f[0], body); });

    var sessionCol = 2; // Session ID is column B
    var statusCol = 3;  // Status is column C
    var lastRow = sheet.getLastRow();
    var rowIndex = -1;
    if (lastRow > 1) {
      var ids = sheet.getRange(2, sessionCol, lastRow - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        if (ids[i][0] === body.session_id) { rowIndex = i + 2; break; }
      }
    }
    if (rowIndex === -1) {
      sheet.appendRow(rowValues);
    } else {
      // A progress ping ("Incomplete") that arrives after the completion
      // ping — e.g. a slow request that lands out of order — must never
      // revert an already-Complete row back to Incomplete.
      var existingStatus = sheet.getRange(rowIndex, statusCol).getValue();
      if (existingStatus === "Complete" && body.status === "Incomplete") {
        return ContentService.createTextOutput(JSON.stringify({ ok: true, skipped: "already complete" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput("PicaPool intake backend is running.");
}

function fieldValue(key, body) {
  switch (key) {
    case "timestamp": return new Date(body.timestamp || Date.now());
    case "session_id": return body.session_id || "";
    case "status": return body.status || "";
    case "source": return body.source || "";
    case "name": return body.name || "";
    case "phone": return body.phone ? "'" + body.phone : ""; // keep as text — preserves leading +/0
    case "ip": return body.ip || "";
    case "user_agent": return body.user_agent || "";
    case "language": return body.language || "";
    case "page_url": return body.page_url || "";
    default: return (body.answers && body.answers[key] != null) ? body.answers[key] : "";
  }
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu("PicaPool")
    .addItem("Run setup (first time only)", "setup")
    .addItem("Rebuild dashboard", "refreshDashboard")
    .addToUi();
}

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  buildSubmissionsSheet(ss);
  buildLinksSheet(ss);
  buildDashboard(ss);
  ss.setActiveSheet(ss.getSheetByName(DASHBOARD_SHEET));
  SpreadsheetApp.getUi().alert("Setup complete. Deploy this as a Web App (Deploy > New deployment) and paste the URL into submit.js.");
}

function buildSubmissionsSheet(ss) {
  var sheet = ss.getSheetByName(SUBMISSIONS_SHEET) || ss.insertSheet(SUBMISSIONS_SHEET);
  sheet.clear();
  var headers = ALL_FIELDS.map(function (f) { return f[1]; });
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold").setBackground("#F6F0E4");
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);

  sheet.clearConditionalFormatRules();
  var fullRange = sheet.getRange(2, 1, 1998, headers.length);
  var completeRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$C2="Complete"')
    .setBackground("#DCEEDC")
    .setRanges([fullRange]).build();
  var incompleteRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$C2="Incomplete"')
    .setBackground("#FBE4E0")
    .setRanges([fullRange]).build();
  sheet.setConditionalFormatRules([completeRule, incompleteRule]);
  return sheet;
}

function buildLinksSheet(ss) {
  var sheet = ss.getSheetByName(LINKS_SHEET) || ss.insertSheet(LINKS_SHEET);
  sheet.clear();
  var headers = ["Slug", "Campaign / Label", "Full Link", "Total Visits", "Completed", "Incomplete", "Completion Rate"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold").setBackground("#F6F0E4");
  sheet.setFrozenRows(1);

  // A couple of starter rows so the sheet isn't empty on first look —
  // add one row per real campaign you hand out, same pattern.
  var starters = [
    ["direct", "No link / typed URL directly"],
    ["instagram-bio", "Instagram bio link"],
    ["whatsapp-status", "WhatsApp status broadcast"],
  ];
  starters.forEach(function (row, i) {
    var r = i + 2;
    sheet.getRange(r, 1, 1, 2).setValues([row]);
    sheet.getRange(r, 3).setFormula('=IF(A' + r + '="","","' + LINK_DOMAIN + '"&A' + r + ')');
    sheet.getRange(r, 4).setFormula('=IF(A' + r + '="","",COUNTIF(Submissions!$D:$D,A' + r + '))');
    sheet.getRange(r, 5).setFormula('=IF(A' + r + '="","",COUNTIFS(Submissions!$D:$D,A' + r + ',Submissions!$C:$C,"Complete"))');
    sheet.getRange(r, 6).setFormula("=IF(D" + r + '="","",D' + r + "-E" + r + ")");
    sheet.getRange(r, 7).setFormula('=IF(OR(D' + r + '="",D' + r + "=0),\"\",E" + r + "/D" + r + ")");
  });
  sheet.getRange(2, 7, starters.length, 1).setNumberFormat("0%");

  sheet.clearConditionalFormatRules();
  var rateRange = sheet.getRange("G2:G500");
  var scaleRule = SpreadsheetApp.newConditionalFormatRule()
    .setGradientMinpointWithValue("#FBE4E0", SpreadsheetApp.InterpolationType.NUMBER, "0")
    .setGradientMidpointWithValue("#FFF3D6", SpreadsheetApp.InterpolationType.PERCENT, "50")
    .setGradientMaxpointWithValue("#DCEEDC", SpreadsheetApp.InterpolationType.NUMBER, "1")
    .setRanges([rateRange]).build();
  sheet.setConditionalFormatRules([scaleRule]);
  sheet.autoResizeColumns(1, headers.length);
  return sheet;
}

function refreshDashboard() {
  buildDashboard(SpreadsheetApp.getActiveSpreadsheet());
}

function buildDashboard(ss) {
  var sheet = ss.getSheetByName(DASHBOARD_SHEET) || ss.insertSheet(DASHBOARD_SHEET, 0);
  sheet.clear();
  var charts = sheet.getCharts();
  charts.forEach(function (c) { sheet.removeChart(c); });

  sheet.getRange("A1").setValue("PicaPool — Intent Form Dashboard")
    .setFontSize(16).setFontWeight("bold");
  sheet.getRange("A2").setValue("Auto-updates from the Submissions sheet. Re-run \"PicaPool > Rebuild dashboard formulas\" if you add/remove question columns.")
    .setFontColor("#8C8072").setFontSize(9);

  // ---- KPI row ----
  var kpiLabels = ["Total Visits", "Completed", "Incomplete", "Completion Rate", "Today", "Last 7 Days", "Last 30 Days"];
  sheet.getRange(4, 1, 1, kpiLabels.length).setValues([kpiLabels]).setFontWeight("bold").setBackground("#F6F0E4");
  sheet.getRange(5, 1).setFormula('=COUNTA(Submissions!$B$2:$B)');
  sheet.getRange(5, 2).setFormula('=COUNTIF(Submissions!$C$2:$C,"Complete")');
  sheet.getRange(5, 3).setFormula('=COUNTIF(Submissions!$C$2:$C,"Incomplete")');
  sheet.getRange(5, 4).setFormula('=IF(A5=0,"",B5/A5)').setNumberFormat("0%");
  sheet.getRange(5, 5).setFormula('=COUNTIFS(Submissions!$A$2:$A,">="&TODAY(),Submissions!$A$2:$A,"<"&(TODAY()+1))');
  sheet.getRange(5, 6).setFormula('=COUNTIFS(Submissions!$A$2:$A,">="&(TODAY()-6),Submissions!$A$2:$A,"<"&(TODAY()+1))');
  sheet.getRange(5, 7).setFormula('=COUNTIFS(Submissions!$A$2:$A,">="&(TODAY()-29),Submissions!$A$2:$A,"<"&(TODAY()+1))');
  sheet.getRange(5, 1, 1, kpiLabels.length).setFontSize(14).setFontWeight("bold");

  // ---- Submissions by day (last 14 days) + chart ----
  sheet.getRange("A8").setValue("Submissions — last 14 days").setFontWeight("bold");
  sheet.getRange("A9").setValue("Date");
  sheet.getRange("B9").setValue("Submissions");
  for (var d = 0; d < 14; d++) {
    var row = 10 + d;
    sheet.getRange(row, 1).setFormula("=TODAY()-" + (13 - d)).setNumberFormat("dd-MMM");
    sheet.getRange(row, 2).setFormula(
      "=COUNTIFS(Submissions!$A$2:$A,\">=\"&A" + row + ",Submissions!$A$2:$A,\"<\"&(A" + row + "+1))"
    );
  }
  var chart = sheet.newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(sheet.getRange("A9:B23"))
    .setPosition(8, 4, 0, 0)
    .setOption("title", "Daily submissions (14 days)")
    .setOption("colors", ["#C1602F"])
    .setOption("legend", { position: "none" })
    .build();
  sheet.insertChart(chart);

  // ---- Link performance summary (mirrors Links sheet) ----
  sheet.getRange("A26").setValue("Link performance").setFontWeight("bold");
  sheet.getRange("A27").setFormula('=IFERROR(QUERY(Links!A2:G,"select A,B,D,E,G where A is not null order by D desc",0),"No links yet — add rows in the Links sheet.")');

  // ---- Top picks per category, 3-column grid ----
  // Computed here (not left as live QUERY formulas) because multi-select
  // answers land in one cell as "Domino's, La Pino'z" — splitting and
  // tallying in code credits each brand correctly, where a naive
  // group-by would count the whole combo as its own bucket. Re-run
  // "PicaPool > Rebuild dashboard" after new submissions to refresh.
  var subSheet = ss.getSheetByName(SUBMISSIONS_SHEET);
  var lastRow = subSheet.getLastRow();
  var gridStartRow = 26;
  var gridStartCol = 6; // column F
  var blockRows = 9;
  var blockCols = 3;
  var perRow = 3;
  DASHBOARD_CATEGORIES.forEach(function (field, i) {
    var key = field[0], label = field[1];
    var col = gridStartCol + (i % perRow) * blockCols;
    var row = gridStartRow + Math.floor(i / perRow) * blockRows;
    sheet.getRange(row, col).setValue(label).setFontWeight("bold").setBackground("#F6F0E4");

    var colIndex = BASE_FIELDS.length + ANSWER_FIELDS.findIndex(function (f) { return f[0] === key; }) + 1;
    var tally = {};
    if (lastRow > 1) {
      var values = subSheet.getRange(2, colIndex, lastRow - 1, 1).getValues();
      values.forEach(function (r) {
        var cell = String(r[0] || "").trim();
        if (!cell) return;
        cell.split(",").forEach(function (part) {
          var v = part.trim();
          if (!v) return;
          tally[v] = (tally[v] || 0) + 1;
        });
      });
    }
    var ranked = Object.keys(tally).map(function (k) { return [k, tally[k]]; })
      .sort(function (a, b) { return b[1] - a[1]; })
      .slice(0, 6);
    if (ranked.length) sheet.getRange(row + 1, col, ranked.length, 2).setValues(ranked);
    else sheet.getRange(row + 1, col).setValue("—");
  });

  sheet.setColumnWidth(1, 130);
  sheet.autoResizeColumns(2, 5);
}

