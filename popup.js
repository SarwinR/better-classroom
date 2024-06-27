function isValidJsonFormat(json) {
  var obj = JSON.parse(json);

  if (typeof obj !== "object" || obj === null) return false;

  if (!obj.folderData || typeof obj.folderData !== "object") return false;
  if (
    !obj.folderData.folderActiveClasses ||
    typeof obj.folderData.folderActiveClasses !== "object"
  )
    return false;
  if (!obj.folderData.folders || typeof obj.folderData.folders !== "object")
    return false;
  if (!obj.classData || typeof obj.classData !== "object") return false;

  for (const key in obj.folderData.folderActiveClasses) {
    if (!Array.isArray(obj.folderData.folderActiveClasses[key])) return false;
  }

  for (const key in obj.folderData.folders) {
    if (typeof obj.folderData.folders[key] !== "string") return false;
  }

  for (const key in obj.classData) {
    if (typeof obj.classData[key] !== "string") return false;
  }

  return true;
}

function exportFolders() {
  chrome.runtime.sendMessage({ action: "getFolderData" }, function (response) {
    var exportedFolderData = response.folderData;

    chrome.runtime.sendMessage({ action: "getClassData" }, function (response) {
      userDefinedClassName = response.classData;

      var json = JSON.stringify({
        folderData: exportedFolderData,
        classData: userDefinedClassName,
      });

      var blob = new Blob([json], { type: "application/json" });
      var url = URL.createObjectURL(blob);

      var a = document.createElement("a");
      a.href = url;
      a.download = "BetterClassroom_ExportedFolders.json";

      a.click();

      URL.revokeObjectURL(url);

      var settingMessage = document.getElementById("setting-message");
      settingMessage.textContent =
        "Folders exported successfully! It has been downloaded as BetterClassroom_ExportedFolders.json";
    });
  });
}

function importFolders() {
  try {
    var input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = function (event) {
      var file = event.target.files[0];
      var reader = new FileReader();
      reader.onload = function () {
        if (isValidJsonFormat(reader.result)) {
          var importedFolderData = JSON.parse(reader.result);
          chrome.runtime.sendMessage(
            {
              action: "saveFolderData",
              folderData: importedFolderData.folderData,
            },
            function (response) {
              chrome.runtime.sendMessage(
                {
                  action: "saveClassData",
                  classData: importedFolderData.classData,
                },
                function (response) {
                  var settingMessage =
                    document.getElementById("setting-message");
                  settingMessage.textContent =
                    "Folders imported successfully! Please refresh the page to apply the changes.";
                }
              );
            }
          );
        } else {
          var settingMessage = document.getElementById("setting-message");
          settingMessage.textContent =
            "Invalid JSON format. Please make sure the file is exported from BetterClassroom.";
        }
      };
      reader.readAsText(file);
    };
    input.click();
  } catch (err) {
    var settingMessage = document.getElementById("setting-message");
    settingMessage.textContent = "Error importing folders. Please try again.";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  // Fetch the extension version from the manifest file
  version = chrome.runtime.getManifest().version;

  console.log("popup.js loaded");
  document
    .getElementById("export-folders-button")
    .addEventListener("click", function () {
      exportFolders();
    });

  document
    .getElementById("import-folders-button")
    .addEventListener("click", function () {
      importFolders();
    });

  // Update the version element with the fetched version
  var versionElement = document.getElementById("version");
  versionElement.textContent = "Extension Version: " + version;
});
