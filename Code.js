const properties = PropertiesService.getScriptProperties();

const API_KEY = properties.getProperty("API_KEY");
const SHEET_ID = properties.getProperty("SHEET_ID");
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + API_KEY;

function convertImgUrlToBase64(imgUrl) {
  const imageBlob = UrlFetchApp.fetch(imgUrl).getBlob();
  return Utilities.base64Encode(imageBlob.getBytes());
}

function convertToTwoDimensionalArray(arr) {
  let result = []; 
  for (let i = 0; i < 5; i++) { 
  result.push(arr.slice(i * 5, i * 5 + 5)); 
  } 
  return result;
}

function extractArraysFromString(text) {
  const arrays = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
      let headIndex = text.indexOf("[", currentIndex);
      let tailIndex = text.indexOf("]", headIndex);

      if (headIndex === -1 || tailIndex === -1) {
      break;
      }

      let arrayString = text.slice(headIndex + 1, tailIndex);
      let array = arrayString.split(",").map(item => item.trim());
      let twoDArr = convertToTwoDimensionalArray(array); 
      arrays.push(twoDArr);

      currentIndex = tailIndex + 1;
  }
  return arrays;
};

function sendToGeminiByBase64(blobArr) {
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
    Logger.log("result: " + result);
    return result;
  } catch (error) {
    Logger.log("Error occurred while sending data to Gemini API: " + error.message);
  }
}

function sendToGeminByUrl(imgUrl) {
  var base64Image = convertImgUrlToBase64(imgUrl); 
  return sendToGeminiByBase64([{base64String: base64Image, type: "image/jpeg"}]);
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index');
}

function extractAllDataFromSheet() {
  var spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  var sheet = spreadsheet.getSheetByName("Sheet1");
  var values = sheet.getRange("A:A").getValues();
  const result = [];

  values.forEach(value => {
    const numArr = value.toString().split(' ');

    if(numArr.length == 25 && !checkDuplicateNumber(numArr)) {
      const twoDimensionArr = [];
      for (let i = 0; i < 5; i++) {
        const chunk = numArr.slice(i*5, i*5+5);
        twoDimensionArr.push(chunk);
      }
      result.push(twoDimensionArr);
    }
    else {
      Logger.log("there is invalid matrix");
    }
  });
  return result;
}

function checkDuplicateNumber(arr){
  let seen = new Set();
  for(let i = 0; i < arr.length; i++) {
      if (seen.has(arr[i])) {
        return true;
      }
      seen.add(arr[i]);
  }
  return false;
}