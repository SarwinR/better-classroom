// CLASS NAMES AND IDs
navigationBarClassName = "Mtd4hb QRiHXd"; // navigation bar just beside the right side of the screen
folderListClassName = "JwPp0e";
contentWindowClassName = "kFwPee";
inContentWindowNavigationBarClassName = "xgkURe mhCMAe";

classClassName = "gHz6xd Aopndd rZXyy";
classTitleClassName = "YVvGBb z3vRcc-ZoZQ1";

var loadingClasses = true;
classesDictionary = {};
folderSelectedClasses = [];
allClasses = null;

folderSettingModal = null;
folderCreationModal = null;

selectedFolder = "__All Classes__";

topStaticFolders = { "__All Classes__": "All Classes" };
bottomStaticFolders = {
	__Separator__: "──────────",
	"__Add Folder__": "Add Folder",
};

folders = {};
folderActiveClasses = {};
loadFolders();
loadLastSelectedFolder();

folderList = document.getElementsByClassName(folderListClassName)[0];
contentWindow = document.getElementsByClassName(contentWindowClassName)[0];
navigationBar = document.getElementsByClassName(navigationBarClassName)[0];

setup();

function loadLastSelectedFolder() {
	chrome.runtime.sendMessage(
		{ action: "getLastSelectedFolder" },
		function (response) {
			selectedFolder = response.lastSelectedFolder;
			renderFolders();
			renderFolderDropdown();
		}
	);
}

function saveLastSelectedFolder() {
	chrome.runtime.sendMessage({
		action: "setLastSelectedFolder",
		data: { lastSelectedFolder: selectedFolder },
	});
}

function saveFolders() {
	// save folders to chrome storage and output to console
	chrome.runtime.sendMessage({
		action: "saveData",
		data: {
			folders: folders,
			folderActiveClasses: folderActiveClasses,
		},
	});
}

function loadFolders() {
	chrome.runtime.sendMessage({ action: "getData" }, function (response) {
		folders = response.folders;
		folderActiveClasses = response.folderActiveClasses;
		renderFolderDropdown();
	});
}

function renderFolderDropdown() {
	dropdown = document.getElementById("folder-dropdown");
	if (dropdown == null) return;

	dropdown.innerHTML = "";

	Object.keys(topStaticFolders).forEach((k) => {
		dropdown.innerHTML += `<option class="folder-dropdown-option" value="${k}">${topStaticFolders[k]}</option>`;
	});

	Object.keys(folders).forEach((k) => {
		dropdown.innerHTML += `<option class="folder-dropdown-option" value="${k}">${folders[k]}</option>`;
	});

	Object.keys(bottomStaticFolders).forEach((k) => {
		if (k == "__Separator__")
			dropdown.innerHTML += `<option class="folder-dropdown-option" value="${k}" disabled>${bottomStaticFolders[k]}</option>`;
		else
			dropdown.innerHTML += `<option class="folder-dropdown-option" value="${k}">${bottomStaticFolders[k]}</option>`;
	});

	dropdown.value = selectedFolder;
}

function folderId2ClassIds(folderId) {
	if (folderId == "__All Classes__") {
		return Object.keys(classesDictionary);
	} else {
		return folderActiveClasses[folderId];
	}
}

function isFolderEditable(folderId) {
	return !Object.keys(topStaticFolders).includes(folderId);
}

//todo repurpose this function
function setupFolderModalClassList(
	elementId,
	activeClasses = [],
	isEditable = true
) {
	classSelectionList = document.getElementById(elementId);
	classSelectionList.innerHTML = "";

	if (loadingClasses) {
		classSelectionList.innerHTML = `<option class="class-option" disabled>Loading Class List . . .</option>`;
		return;
	}
	if (allClasses == null) {
		classSelectionList.innerHTML = `<option class="class-option" disabled>No Classes Found</option>`;
		return;
	}

	Object.keys(classesDictionary).forEach((k) => {
		if (isEditable)
			classSelectionList.innerHTML += `<option class="class-option" value="${k}">${classesDictionary[k]}</option>`;
		else
			classSelectionList.innerHTML += `<option class="class-option" value="${k}" disabled>${classesDictionary[k]}</option>`;
	});

	// activate all classes in activeClasses
	folderSelectedClasses = activeClasses;
	if (folderSelectedClasses != null) {
		for (let i = 0; i < classSelectionList.options.length; i++) {
			if (
				folderSelectedClasses.includes(
					classSelectionList.options[i].value
				)
			) {
				classSelectionList.options[i].selected = true;
			}
		}
	}

	// check for listener already added
	if (classSelectionList.hasAttribute("listener-added")) return;

	classSelectionList.setAttribute("listener-added", true);
	classSelectionList.addEventListener("click", () => {
		_classSelectionListValue = classSelectionList.value;
		classSelectionList.value = "";

		if (folderSelectedClasses.includes(_classSelectionListValue)) {
			// remove class from selected classes
			folderSelectedClasses = folderSelectedClasses.filter(
				(item) => item != _classSelectionListValue
			);
		} else {
			folderSelectedClasses.push(_classSelectionListValue);
		}

		// set all options in folderSelectedClasses to selected
		for (let i = 0; i < classSelectionList.options.length; i++) {
			if (
				folderSelectedClasses.includes(
					classSelectionList.options[i].value
				)
			) {
				classSelectionList.options[i].selected = true;
			}
		}
	});
}

// !disabled due to bug (icon disappears when reordering classes)
// !to enable, ensure that folder_setting_button.html is stated in manifest.json
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
					.querySelector(".SZ0kZe") // class = SZ0kZe is the div that contains the 2 icons
					.appendChild(folderSettingButton);
			}
		});
}

function renderFolders() {
	if (allClasses == null) return; // ! set message to no classes found

	classesDictionary = {};

	for (let i = 0; i < allClasses.length; i++) {
		_classID = allClasses[i].dataset["courseId"];
		_className =
			allClasses[i].getElementsByClassName(classTitleClassName)[0]
				.innerText;

		classesDictionary[_classID] = _className;

		_folderActiveClasses = folderActiveClasses[selectedFolder] || [];

		if (
			_folderActiveClasses.includes(allClasses[i].dataset["courseId"]) ||
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

	createFolder(folderName);
	toggleFolderCreationModal(false);
	resetFolderCreationForm();
}

function toggleFolderCreationModal(status) {
	if (status) {
		setupFolderModalClassList("folder-creation-modal-class-select");
		folderCreationModal.style.display = "flex";
	} else {
		folderSelectedClasses = [];
		folderCreationModal.style.display = "none";
	}
}

// currently oldFolderName, newFolderName, and newFolderClasses
function saveChanges(folderId, folderName, folderClasses) {
	delete folderActiveClasses[folderId];
	delete folders[folderId];

	folders[folderName] = folderName;
	folderActiveClasses[folderName] = folderClasses;
	selectedFolder = folderName;

	saveFolders();

	renderFolderDropdown();
	renderFolders();
}

function toggleFolderSettingModal(status) {
	if (status) {
		folderSettingModal.style.display = "flex";

		// setup delete button
		// if folder is not a static folder or if no folder is selected
		// then disable delete button, lock name input, lock class selection, disable save button
		folderSettingDeleteButton = document.getElementById(
			"folder-setting-modal-modal-delete"
		);
		folderSettingsaveButton = document.getElementById(
			"folder-setting-modal-modal-submit"
		);
		nameInputField = document.getElementById(
			"folder-setting-modal-folder-name"
		);

		classSelectionLabel = document.getElementById(
			"folder-setting-modal-class-select-label"
		);
		classSelectionLabel.innerText = "Select Classes";

		_folderName =
			folders[selectedFolder] ||
			topStaticFolders[selectedFolder] ||
			bottomStaticFolders[selectedFolder] ||
			"No Folder Selected";

		nameInputField.value = _folderName;
		document.getElementsByClassName(
			"folder-setting-modal-title"
		)[0].innerText = `${_folderName} Settings`;
		if (
			selectedFolder in topStaticFolders ||
			selectedFolder in bottomStaticFolders ||
			selectedFolder == null
		) {
			// uneditable folder
			setupFolderModalClassList(
				"folder-setting-modal-class-select",
				folderId2ClassIds(selectedFolder),
				isFolderEditable(selectedFolder)
			);
			folderSettingDeleteButton.disabled = true;
			folderSettingsaveButton.disabled = true;
			nameInputField.disabled = true;
			classSelectionLabel.innerText += " (Uneditable for this folder)";
		} else {
			// editable folder
			setupFolderModalClassList(
				"folder-setting-modal-class-select",
				folderId2ClassIds(selectedFolder)
			);
			folderSettingDeleteButton.disabled = false;
			folderSettingsaveButton.disabled = false;
			nameInputField.disabled = false;
		}
	} else {
		folderSelectedClasses = [];
		folderSettingModal.style.display = "none";
	}
}

function resetFolderCreationForm() {
	document.getElementById("folder-creation-modal-folder-name").value = "";
}

function createFolder(name) {
	// folder-id -- folder-name
	folders[name] = name;
	// folder-id -- [id, id, id]
	folderActiveClasses[name] = folderSelectedClasses;

	saveFolders();

	selectedFolder = name;
	saveLastSelectedFolder();
	renderFolderDropdown();
	renderFolders();
}

// folder name behaves as the id
function deleteFolder(id) {
	delete folders[id];
	delete folderActiveClasses[id];

	selectedFolder = "__All Classes__";
	saveLastSelectedFolder();

	saveFolders();

	toggleFolderSettingModal(false);
	renderFolderDropdown();
	renderFolders();
}

function setup() {
	// setting up folder creation modal
	fetch(chrome.runtime.getURL("html/folder_creation_modal.html"))
		.then((response) => response.text())
		.then((data) => {
			folderCreationModal = document.createElement("div");
			folderCreationModal.innerHTML = data;
			document.body.appendChild(folderCreationModal);

			folderCreationModal = document.getElementById(
				"folder-creation-modal"
			);

			toggleFolderCreationModal(false);

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
		});

	fetch(chrome.runtime.getURL("html/dropdown_list.html"))
		.then((response) => response.text())
		.then((data) => {
			dropdown = document.createElement("div");
			dropdown.innerHTML = data;

			navigationBar.innerHTML =
				dropdown.innerHTML + navigationBar.innerHTML;

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
					saveLastSelectedFolder();
					renderFolders();
				}
			});

			folderEditButton = document.getElementById("folder-edit-button");
			folderEditButton.addEventListener("click", () => {
				toggleFolderSettingModal(true);
			});
		});

	// setting up folder setting modal
	fetch(chrome.runtime.getURL("html/folder_setting_modal.html"))
		.then((response) => response.text())
		.then((data) => {
			folderSettingModal = document.createElement("div");
			folderSettingModal.innerHTML = data;
			document.body.appendChild(folderSettingModal);

			folderSettingModal = document.getElementById(
				"folder-setting-modal"
			);

			toggleFolderSettingModal(false);

			// setup close button
			folderSettingCloseButton = document.getElementById(
				"folder-setting-modal-modal-close"
			);
			folderSettingCloseButton.addEventListener("click", () => {
				toggleFolderSettingModal(false);
			});

			// setup delete button
			folderSettingDeleteButton = document.getElementById(
				"folder-setting-modal-modal-delete"
			);

			folderSettingDeleteButton.addEventListener("click", () => {
				deleteFolder(selectedFolder);
			});

			folderSettingsaveButton = document.getElementById(
				"folder-setting-modal-modal-submit"
			);
			folderSettingsaveButton.addEventListener("click", () => {
				nameInputField = document.getElementById(
					"folder-setting-modal-folder-name"
				);
				saveChanges(
					selectedFolder,
					nameInputField.value,
					folderSelectedClasses
				);
				toggleFolderSettingModal(false);
			});
		});

	// create an observer instance
	var config = { attributes: true, childList: true, characterData: true };
	var fileListObserver = new MutationObserver(function (mutations) {
		fileListObserver.disconnect();
		allClasses = document.getElementsByClassName(classClassName);
		renderFolders();
		loadingClasses = false;
		setupFolderModalClassList("folder-creation-modal-class-select");
		setupFolderModalClassList(
			"folder-setting-modal-class-select",
			folderId2ClassIds(selectedFolder),
			isFolderEditable(selectedFolder)
		);
		// setupFolderIcon(); // disabled for now (due to bug when reordering classes)
	});

	fileListObserver.observe(folderList, config);
}
