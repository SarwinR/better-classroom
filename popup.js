function exportFolders() {
  chrome.runtime.sendMessage({ action: "getFolderData" }, function (response) {
    var exportedFolderData = response;

    var json = JSON.stringify(exportedFolderData);

    var blob = new Blob([json], { type: "application/json" });
    var url = URL.createObjectURL(blob);

    var a = document.createElement("a");
    a.href = url;
    a.download = "BetterClassroom_ExportedFolders.json";

    a.click();
  });
}

function importFolders() {
  var input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = function (event) {
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onload = function () {
      var importedFolderData = JSON.parse(reader.result);

      // todo: check if importedFolderData is valid
      // todo: add an error message if the imported data is invalid

      chrome.runtime.sendMessage(
        { action: "saveFolderData", folderData: importedFolderData.folderData },
        function (response) {
          console.log(response);
        }
      );
    };

    reader.readAsText(file);
  };
  input.click();
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
