chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	if (request.action == "saveData") {
		chrome.storage.local.set(
			{
				folderData: request.folderData,
			},
			function () {
				sendResponse({ status: "success: ", data: request.data });
			}
		);
	} else if (request.action == "getData") {
		chrome.storage.local.get(["folderData"], function (result) {
			if (result.folderData == undefined) {
				result.folderData = { folders: {}, folderActiveClasses: {} };
			}

			sendResponse(result);
		});
	} else if (request.action == "getLastSelectedFolder") {
		chrome.storage.local.get(["lastSelectedFolder"], function (result) {
			if (result.lastSelectedFolder == undefined) {
				result.lastSelectedFolder = "__All Classes__";
			}

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
