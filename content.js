folderCreationModal = null;

selectedFolder = null;
classListClassName = "JwPp0e";

// chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
// 	var activeTab = tabs[0];
// 	if (activeTab.status === "complete") {
// 		// The active tab has fully loaded
// 		console.log("Active tab has fully loaded");
// 	}
// });

//check if tab has loaded
// chrome.activeTab.onUpdated.addListener(function (tabId, changeInfo, tab) {
// 	if (changeInfo.status == "complete") {
// 		classList = document.getElementsByClassName(classListClassName)[0];
// 	}
// });

// chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
// 	if (changeInfo.status == "complete") {
// 		classList = document.getElementsByClassName(classListClassName)[0];
// 	}
// });

// append folder creation modal to body
fetch(chrome.runtime.getURL("html/folder_creation_modal.html"))
	.then((response) => response.text())
	.then((data) => {
		folderCreationModal = document.createElement("div");
		folderCreationModal.innerHTML = data;
		document.body.appendChild(folderCreationModal);

		folderCreationModal = document.getElementById("folder-creation-modal");

		folderCreationModal.style.display = "none";

		// setup close button
		folderCreationCloseButton = document.getElementById(
			"folder-creation-modal-modal-close"
		);
		folderCreationCloseButton.addEventListener("click", () => {
			toggleFolderCreationModal(false);
		});

		// setup submit button
		folderCreationSubmitButton = document.getElementById(
			"folder-creation-modal-modal-submit"
		);
		folderCreationSubmitButton.addEventListener("click", () => {
			submitFolderCreationForm();
		});

		folderCreationFormStatus = false;
	});

navigationBarClassName = "Mtd4hb QRiHXd";
folderListClassName = "JwPp0e";
contentWindowClassName = "kFwPee";
inContentWindowNavigationBarClassName = "xgkURe mhCMAe";

folderList = document.getElementsByClassName(folderListClassName)[0];
contentWindow = document.getElementsByClassName(contentWindowClassName)[0];
navigationBar = document.getElementsByClassName(navigationBarClassName)[0];

// create an observer instance
var observer = new MutationObserver(function (mutations) {
	console.log("Loaded");
	observer.disconnect();
});

// configuration of the observer:
var config = { attributes: true, childList: true, characterData: true };

// pass in the target node, as well as the observer options
observer.observe(folderList, config);

fetch(chrome.runtime.getURL("html/dropdown_list.html"))
	.then((response) => response.text())
	.then((data) => {
		dropdown = document.createElement("div");
		dropdown.innerHTML = data;

		navigationBar.innerHTML = dropdown.innerHTML + navigationBar.innerHTML;

		folderDropdown = document.getElementById("folder-dropdown");
		folderDropdown.addEventListener("click", () => {
			if (folderDropdown.value != selectedFolder) {
				selectedFolder = folderDropdown.value;
				console.log(folderDropdown.value);
			}
		});
	});

// addFolderButton = document.getElementById("add-folder");
// addFolderButton.addEventListener("click", () => {
// 	toggleFolderCreationModal(true);
// });

function addAddtoFolderButton() {}

function submitFolderCreationForm() {
	folderName = document.getElementById(
		"folder-creation-modal-folder-name"
	).value;
	folderDescription = document.getElementById(
		"folder-creation-modal-folder-description"
	).value;

	createFolder(folderName, folderDescription);
	toggleFolderCreationModal(false);
	resetFolderCreationForm();
}

function toggleFolderCreationModal(status) {
	folderCreationFormStatus = status;
	if (status) {
		folderCreationModal.style.display = "flex";
	} else {
		folderCreationModal.style.display = "none";
	}
}

function resetFolderCreationForm() {
	document.getElementById("folder-creation-modal-folder-name").value = "";
	document.getElementById("folder-creation-modal-folder-description").value =
		"";
}

function createFolder(name, description) {
	fetch(chrome.runtime.getURL("html/folder_list_item.html"))
		.then((response) => response.text())
		.then((data) => {
			newFolder = document.createElement("div");
			newFolder.innerHTML = data;

			newFolder.querySelector("#folder_name").innerHTML = name;

			document
				.getElementsByClassName(folderListClassName)[0]
				.appendChild(newFolder);
		});
}
