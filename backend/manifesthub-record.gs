function doPost(e) {
    try {
        var data = JSON.parse(e.postData.contents);
        var doc = SpreadsheetApp.getActiveSpreadsheet();

        // Debug log to Apps Script console (View > Logs)
        console.log("GSheet raw payload: " + JSON.stringify(data));

        var sheet = doc.getSheetByName("Downloads");


        // Add Headers if the sheet is empty
        if (sheet.getLastRow() === 0) {
            sheet.appendRow(["Timestamp", "App ID", "Game Name", "Type", "Real IP"]);
            sheet.getRange("A1:E1").setFontWeight("bold").setBackground("#d1e7dd");
        }

        // Log the data
        sheet.appendRow([
            data.timestamp,
            data.appId,
            data.gameName,
            data.downloadType,
            data.ipAddress
        ]);

        return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function cleanGameName(name) {
    return name
        .replace(/\s*\(ZIP\)$/gi, "")
        .replace(/\s*\(Legacy\)$/gi, "")
        .replace(/\s*-\s*Lua\s*Keys$/gi, "")
        .replace(/\s*-\s*Manifest\s*\(Live\)$/gi, "")
        .replace(/\s*-\s*Manifest$/gi, "")
        .replace(/\s*-\s*ZIP$/gi, "")
        .trim();
}

function doGet(e) {
    var action = e.parameter.action;
    var ip = e.parameter.ip;

    if (action === "top") {
        var doc = SpreadsheetApp.getActiveSpreadsheet();
        var sheet = doc.getSheetByName("Stats");
        if (!sheet) {
            return ContentService.createTextOutput(JSON.stringify([]))
                .setMimeType(ContentService.MimeType.JSON);
        }

        var data = sheet.getDataRange().getValues();
        if (data.length <= 1) {
            return ContentService.createTextOutput(JSON.stringify([]))
                .setMimeType(ContentService.MimeType.JSON);
        }

        var results = [];
        // Stats columns are: A: App ID, B: min Game Name, C: count App ID
        for (var i = 1; i < data.length; i++) {
            var row = data[i];
            if (row[0]) {
                var rawName = row[1] ? row[1].toString() : "Unknown Game";
                results.push({
                    appId: row[0].toString(),
                    gameName: cleanGameName(rawName),
                    count: parseInt(row[2]) || 0
                });
            }
        }

        return ContentService.createTextOutput(JSON.stringify(results))
            .setMimeType(ContentService.MimeType.JSON);
    }

    if (!ip) {
        return ContentService.createTextOutput(JSON.stringify({ error: "Missing ip parameter" }))
            .setMimeType(ContentService.MimeType.JSON);
    }

    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheetByName("Downloads");
    if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify([]))
            .setMimeType(ContentService.MimeType.JSON);
    }

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
        return ContentService.createTextOutput(JSON.stringify([]))
            .setMimeType(ContentService.MimeType.JSON);
    }

    var results = [];
    var limit = 50; // Max downloads to fetch from sheet

    // Start from the bottom of the sheet (newest) and go upwards
    for (var i = data.length - 1; i >= 1; i--) {
        var row = data[i];
        var rowIp = row[4]; // Real IP column

        if (rowIp && rowIp.toString().trim() === ip.trim()) {
            var gameNameAndType = row[2] ? row[2].toString() : "Unknown Game";
            var gameName = gameNameAndType;
            var downloadType = "Download";

            // Parse out specific download type details if present in the game name
            if (gameNameAndType.indexOf(" - ") !== -1) {
                var parts = gameNameAndType.split(" - ");
                gameName = parts[0];
                downloadType = parts[1];
            } else if (gameNameAndType.indexOf(" (ZIP)") !== -1) {
                gameName = gameNameAndType.replace(" (ZIP)", "");
                downloadType = "ZIP Archive";
            } else if (gameNameAndType.indexOf(" (Legacy)") !== -1) {
                gameName = gameNameAndType.replace(" (Legacy)", "");
                downloadType = "Legacy Archive";
            }

            results.push({
                created_at: row[0] || new Date(),
                game_id: row[1] ? row[1].toString() : "",
                game_name: gameName,
                type: downloadType
            });

            if (results.length >= limit) {
                break; // Stop scanning once we reach the limit
            }
        }
    }

    return ContentService.createTextOutput(JSON.stringify(results))
        .setMimeType(ContentService.MimeType.JSON);
}