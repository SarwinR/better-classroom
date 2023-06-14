// popup.js
document.addEventListener('DOMContentLoaded', function() {
    // Fetch the extension version from the manifest file
    version = chrome.runtime.getManifest().version;
    
    // Update the version element with the fetched version
    var versionElement = document.getElementById('version');
    versionElement.textContent = 'Extension Version: ' + version;
});