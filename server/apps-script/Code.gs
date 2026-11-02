// Paste into: your Google Sheet > Extensions > Apps Script (replace everything), then Save.
// Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone > Deploy.
// Changed this code later? Deploy > Manage deployments > pencil icon > Version: New version > Deploy.

var HEADERS = ['Time', 'Name', 'Email', 'Interested', 'Flavours', 'Quantity', 'Suggestion', 'ID'];

// Stops text such as "=1+1" from being run as a formula
function safe(v) {
  v = String(v == null ? '' : v);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);                       // one batch at a time, so rows never collide
  try {
    var data = JSON.parse(e.postData.contents);
    var rows = data.rows || [data];
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
    } else {
      // If the sheet doesn't have an Email column yet, insert it at column 3
      var currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim().toLowerCase(); });
      if (currentHeaders.indexOf('email') === -1) {
        sheet.insertColumnAfter(2);
        sheet.getRange(1, 3).setValue('Email');
      }
    }

    var lastCol = sheet.getLastColumn();
    var headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim().toLowerCase(); });
    var idCol = headerRow.indexOf('id') + 1;
    if (idCol <= 0) idCol = lastCol;

    var seen = {};                            // skip answers that are already in the sheet
    var last = sheet.getLastRow();
    if (last > 1) {
      sheet.getRange(2, idCol, last - 1, 1).getValues().forEach(function (r) { if (r[0]) seen[r[0]] = true; });
    }
    var out = [];
    rows.forEach(function (r) {
      if (r.id && seen[r.id]) return;
      seen[r.id] = true;
      out.push([new Date(r.time), safe(r.name), safe(r.email || ''), r.interested, (r.flavors || []).join(', '), r.quantity, safe(r.suggestion), r.id || '']);
    });
    if (out.length) sheet.getRange(sheet.getLastRow() + 1, 1, out.length, HEADERS.length).setValues(out);
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}

// Open your Web app link in a browser: you should see this message
function doGet() {
  return ContentService.createTextOutput('Waffle sheet connection is working');
}
