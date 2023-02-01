url_regex = new RegExp("https://classroom.google.com/u/[0-9]{1,2}/h");

function createFolder() {
	console.log("Creating folder");
}

function showContextMenu() {
	chrome.contextMenus.removeAll(() => {
		chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
			if (tabs[0].url.match(url_regex)) {
				chrome.contextMenus.create({
					id: "1",
					title: "Create New Folder",
				});
			}
		});
	});
}

chrome.tabs.onActivated.addListener(showContextMenu);
chrome.tabs.onUpdated.addListener(showContextMenu);

chrome.contextMenus.onClicked.addListener((info, tab) => {
	if (info.menuItemId === "1") {
		createFolder();
	}
});
