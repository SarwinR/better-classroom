// CLASS NAMES AND IDs
navigationBarClassName = "Mtd4hb QRiHXd"; // navigation bar just beside the right side of the screen
folderListClassName = "JwPp0e";
contentWindowClassName = "kFwPee";
inContentWindowNavigationBarClassName = "xgkURe mhCMAe";

classClassName = "gHz6xd Aopndd rZXyy";
classTitleClassName = "YVvGBb z3vRcc-ZoZQ1";

classesDictionary = {};
folderCreationSelectedClasses = [];
allClasses = null;

folderSettingModal = null;
folderCreationModal = null;

selectedFolder = "__All Classes__";

topStaticFolders = { "__All Classes__": "All Classes" };
bottomStaticFolders = {
	__Separator__: "──────────",
	"__Add Folder__": "Add Folder",
};

folders = { Archive: "Archive" };
folderActiveClasses = {
	Archive: ["552499388433", "176917870822", "176066555629"],
};

folderList = document.getElementsByClassName(folderListClassName)[0];
contentWindow = document.getElementsByClassName(contentWindowClassName)[0];
navigationBar = document.getElementsByClassName(navigationBarClassName)[0];

setup();

function renderFolderDropdown() {
	dropdown = document.getElementById("folder-dropdown");
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

function setupCreateFolderModalClassList() {
	classSelectionList = document.getElementById(
		"folder-creation-modal-class-select"
	);
	classSelectionList.innerHTML = "";

	Object.keys(classesDictionary).forEach((k) => {
		classSelectionList.innerHTML += `<option class="class-option" value="${k}">${classesDictionary[k]}</option>`;
	});

	folderCreationSelectedClasses = [];

	// check for listner already added
	if (classSelectionList.hasAttribute("listener-added")) return;

	classSelectionList.setAttribute("listener-added", true);
	classSelectionList.addEventListener("click", () => {
		_classSelectionListValue = classSelectionList.value;
		classSelectionList.value = "";

		if (folderCreationSelectedClasses.includes(_classSelectionListValue)) {
			// remove class from selected classes
			folderCreationSelectedClasses =
				folderCreationSelectedClasses.filter(
					(item) => item != _classSelectionListValue
				);
		} else {
			folderCreationSelectedClasses.push(_classSelectionListValue);
		}

		// set all options in folderCreationSelectedClasses to selected
		for (let i = 0; i < classSelectionList.options.length; i++) {
			if (
				folderCreationSelectedClasses.includes(
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
	if (allClasses == null) return;

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

	setupCreateFolderModalClassList();
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
		folderCreationModal.style.display = "flex";
	} else {
		folderCreationModal.style.display = "none";
	}
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
			folderSettingDeleteButton.disabled = true;
			folderSettingsaveButton.disabled = true;
			nameInputField.disabled = true;
			classSelectionLabel.innerText += " (Uneditable for this folder)";
		} else {
			folderSettingDeleteButton.disabled = false;
			folderSettingsaveButton.disabled = false;
			nameInputField.disabled = false;
			// setup delete button
			folderSettingDeleteButton.addEventListener("click", () => {
				deleteFolder(selectedFolder);
			});
			folderSettingsaveButton.addEventListener("click", () => {
				console.log("Saving Changes");
			});
		}
	} else {
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
	folderActiveClasses[name] = folderCreationSelectedClasses;

	selectedFolder = name;
	renderFolderDropdown();
	renderFolders();
}

// folder name behaves as the id
function deleteFolder(id) {
	delete folders[id];
	delete folderActiveClasses[id];

	selectedFolder = "__All Classes__";

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
		});

	// create an observer instance
	var config = { attributes: true, childList: true, characterData: true };
	var fileListObserver = new MutationObserver(function (mutations) {
		fileListObserver.disconnect();
		allClasses = document.getElementsByClassName(classClassName);
		renderFolders();
		// setupFolderIcon(); // disabled for now (due to bug when reordering classes)
	});

	fileListObserver.observe(folderList, config);
}
