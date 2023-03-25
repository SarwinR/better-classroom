folderCreationModal = null;

selectedFolder = null;
classListClassName = "JwPp0e";

allClasses = null;

activeClasses = {
	archive: ["552499388433", "176917870822", "176066555629"],
};

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

classClassName = "gHz6xd Aopndd rZXyy";

folderList = document.getElementsByClassName(folderListClassName)[0];
contentWindow = document.getElementsByClassName(contentWindowClassName)[0];
navigationBar = document.getElementsByClassName(navigationBarClassName)[0];

// create an observer instance
var fileListObserver = new MutationObserver(function (mutations) {
	fileListObserver.disconnect();
	allClasses = document.getElementsByClassName(classClassName);
	renderFolders();
	setupFolderIcon();
});

// configuration of the observer:
var config = { attributes: true, childList: true, characterData: true };

// pass in the target node, as well as the observer options
fileListObserver.observe(folderList, config);

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
				renderFolders();
			}
		});
	});

function setupFolderIcon() {
	if (allClasses == null) return;

	fetch(chrome.runtime.getURL("html/folder_setting_button.html"))
		.then((response) => response.text())
		.then((data) => {
			for (let i = 0; i < allClasses.length; i++) {
				folderSettingButton = document.createElement("div");
				folderSettingButton.innerHTML = data;
				folderSettingButton.setAttribute("id", "folder-setting-button");

				folderSettingButton.dataset["courseId"] =
					allClasses[i].dataset["courseId"];

				allClasses[i]
					.querySelector(".SZ0kZe")
					.appendChild(folderSettingButton);
			}
		});
}

function renderFolders() {
	if (allClasses == null) return;

	for (let i = 0; i < allClasses.length; i++) {
		console.log(allClasses[i].dataset["courseId"]);

		_activeClasses = activeClasses[selectedFolder] || [];

		if (
			_activeClasses.includes(allClasses[i].dataset["courseId"]) ||
			selectedFolder == null ||
			selectedFolder == "all"
		) {
			allClasses[i].style.display = "flex";
		} else {
			allClasses[i].style.display = "none";
		}
	}
}

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
