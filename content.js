folderCreationModal = null;

selectedFolder = "__All Classes__";
classListClassName = "JwPp0e";

allClasses = null;

topStaticFolders = { "__All Classes__": "All Classes" };
bottomStaticFolders = {
	__Separator__: "──────────",
	"__Add Folder__": "Add Folder",
};
folders = { Archive: "Archive" };

activeClasses = {
	Archive: ["552499388433", "176917870822", "176066555629"],
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

		renderFolderDropdown();

		folderDropdown = document.getElementById("folder-dropdown");

		folderDropdown.addEventListener("click", () => {
			if (folderDropdown.value == "__Add Folder__") {
				folderDropdown.value = selectedFolder || "__All Classes__";
				toggleFolderCreationModal(true);
				return;
			}

			if (folderDropdown.value == "__Separator__") {
				return;
			}

			if (folderDropdown.value != selectedFolder) {
				selectedFolder = folderDropdown.value;
				renderFolders();
			}
		});
	});

function renderFolderDropdown() {
	dropdown = document.getElementById("folder-dropdown");
	dropdown.innerHTML = "";

	Object.keys(topStaticFolders).forEach((k) => {
		dropdown.innerHTML += `<option value="${k}">${topStaticFolders[k]}</option>`;
	});

	Object.keys(folders).forEach((k) => {
		dropdown.innerHTML += `<option value="${k}">${folders[k]}</option>`;
	});

	Object.keys(bottomStaticFolders).forEach((k) => {
		if (k == "__Separator__")
			dropdown.innerHTML += `<option value="${k}" disabled>${bottomStaticFolders[k]}</option>`;
		else
			dropdown.innerHTML += `<option value="${k}">${bottomStaticFolders[k]}</option>`;
	});

	dropdown.value = selectedFolder;
}

function setupFolderIcon() {
	if (allClasses == null) return;

	fetch(chrome.runtime.getURL("html/folder_setting_button.html"))
		.then((response) => response.text())
		.then((data) => {
			for (let i = 0; i < allClasses.length; i++) {
				folderSettingButton = document.createElement("div");
				folderSettingButton.innerHTML = data;
				folderSettingButton.setAttribute("id", "folder-setting-button");

				folderSettingButton.addEventListener("click", () => {});

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
			selectedFolder == "__All Classes__"
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

	createFolder(folderName);
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

function createFolder(name) {
	folders[name] = name;
	renderFolderDropdown();
}
