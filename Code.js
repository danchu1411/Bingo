// Description: This code is used to send the image to the Gemini API and get the result from the API.
const properties = PropertiesService.getScriptProperties();

// Please set the API_KEY and SHEET_ID in the PropertiesService.
const API_KEY = properties.getProperty("API_KEY");
const SHEET_ID = properties.getProperty("SHEET_ID");
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + API_KEY;
const spreadsheet = SpreadsheetApp.openById(SHEET_ID);

function getSheetUrl() {
  const userEmail = Session.getEffectiveUser().getEmail().split('@')[0];
  let sheet = spreadsheet.getSheetByName(userEmail);
  if (!sheet) {
    sheet = spreadsheet.insertSheet().setName(userEmail);
  }
  const sheetUrl = spreadsheet.getUrl() + "#gid=" + sheet.getSheetId();
  return sheetUrl;
}


/**
 * The event handler triggered when editing the spreadsheet.
 * @param {Event} e The onEdit event.
 * 
 */
function onEdit(e) {
  extractAllDataFromSheet();
}

/**
 *
 * @returns 
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index");
}

/**
 * Extract arrays from string
 * @param {string} text 
 * @returns {array} arrays
 */
function extractArraysFromString(text) {
  const arrays = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    const headIndex = text.indexOf("[", currentIndex);
    const tailIndex = text.indexOf("]", headIndex);

    if (headIndex === -1 || tailIndex === -1) {
      break;
    }

    const arrayString = text.slice(headIndex + 1, tailIndex);
    const array = arrayString.split(",").map(item => item.trim());
    const array2D = Array.from({ length: 5 }, (_, i) =>
      array.slice(i * 5, (i + 1) * 5)
    );
    arrays.push(array2D);

    currentIndex = tailIndex + 1;
  }
  return arrays;
};

/**
 * Send image to Gemini API by base64 string
 * @param {array} blobArr 
 * @returns {array} result
 */
function sendToGeminiByBase64(blobArr, isOveride) {
  const payload = {
    "contents": [
      {
        "parts": [
          {
            "text": "Can you extract and return one-dimensional number array from the given bingo board images (include the word FREE in the middle)?"
          }
        ]
      }
    ]
  }

  blobArr.forEach(blob => {
    payload.contents[0].parts.push(
      {
        "inlineData": {
          "data": blob.base64String,
          "mime_type": blob.type,
        }
      }
    )
  })

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json"
    }
  };

  try {
    const response = UrlFetchApp.fetch(GEMINI_URL, options);
    const json = JSON.parse(response.getContentText());
    const result = extractArraysFromString(JSON.stringify(json.candidates[0].content.parts[0]));
    saveDataToSheet(result, isOveride);
    return result;
  } catch (error) {
    Logger.log("Error occurred while sending data to Gemini API: " + error.message);
  }
}



function saveDataToSheet(arrs, isOverride) {
  const userEmail = Session.getEffectiveUser().getEmail().split('@')[0];
  let mainSheet = spreadsheet.getSheetByName(userEmail);
  if (!mainSheet) {
    mainSheet = spreadsheet.insertSheet().setName(userEmail);
  }
  if(isOverride) {
    const range = mainSheet.getRange(1, 1, mainSheet.getLastRow(), 1);
    range.clear();
  }

  arrs.forEach(arr => {
    const numArr = arr.flat().join(" ");
    mainSheet.appendRow([numArr]);
  });
}

/**
 * extract all data from the sheet
 * @returns {array} result
 */
function extractAllDataFromSheet() {
  const result = [];
  const userEmail = Session.getEffectiveUser().getEmail().split('@')[0];
  let mainSheet = spreadsheet.getSheetByName(userEmail);
  // if (!mainSheet) {
  //   mainSheet = spreadsheet.insertSheet().setName(userEmail);
  // }

  var values = mainSheet.getRange(1, 1, mainSheet.getLastRow(), 1).getValues();

  values.forEach(value => {
    const numArr = value.toString().split(' ');

    if (numArr.length == 25 && !checkDuplicateNumber(numArr)) {
      const array2D = Array.from({ length: 5 }, (_, i) =>
        numArr.slice(i * 5, (i + 1) * 5)
      );
      result.push(array2D);
    }
    else {
      Logger.log("there is invalid matrix");
    }
  });
  Logger.log(result);
  return result;
}


/**
 * Check duplicate number in the array
 * @param {boolean}} isDuplicated 
 * @returns 
 */
function checkDuplicateNumber(arr) {
  let seen = new Set();
  for (let i = 0; i < arr.length; i++) {
    if (seen.has(arr[i])) {
      return true;
    }
    seen.add(arr[i]);
  }
  return false;
}