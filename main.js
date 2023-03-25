url_regex = new RegExp("https://classroom.google.com/u/[0-9]{1,2}/h");
console.log("main");

// function hideClassroom(info) {
// 	console.log("Didinf");
// }

// function showContextMenu() {
// 	chrome.contextMenus.removeAll();

// 	chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
// 		if (tabs[0].url.match(url_regex)) {
// 			chrome.contextMenus.create({
// 				id: "1",
// 				title: "Hide Classroom",
// 			});
// 		}
// 	});
// }

// chrome.tabs.onActivated.addListener(showContextMenu);
// chrome.tabs.onUpdated.addListener(showContextMenu);

// chrome.contextMenus.onClicked.addListener((info, tab) => {
// 	console.log(info);

// 	if (info.menuItemId === "1") {
// 		hideClassroom(info);
// 	}
// });
