chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request.action == "saveData") {
		chrome.storage.local.set(request.data, function () {
			sendResponse({ status: "success" });
		});
	} else if (request.action == "getData") {
		chrome.storage.local.get(
			["folders", "folderActiveClasses"],
			function (result) {
				if (result.folders == undefined) result.folders = [];
				if (result.folderActiveClasses == undefined)
					result.folderActiveClasses = [];

				sendResponse(result);
			}
		);
	} else if (request.action == "getLastSelectedFolder") {
		chrome.storage.local.get(["lastSelectedFolder"], function (result) {
			if (result.lastSelectedFolder == undefined)
				result.lastSelectedFolder = "__All Classes__";

			sendResponse(result);
		});
	} else if (request.action == "setLastSelectedFolder") {
		chrome.storage.local.set(
			{ lastSelectedFolder: request.data.lastSelectedFolder },
			function () {
				sendResponse({ status: "success" });
			}
		);
	}

	return true;
});
