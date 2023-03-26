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
	folderCreationFormStatus = status;
	if (status) {
		folderCreationModal.style.display = "flex";
	} else {
		folderCreationModal.style.display = "none";
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

function setup() {
	// append folder creation modal to body
	fetch(chrome.runtime.getURL("html/folder_creation_modal.html"))
		.then((response) => response.text())
		.then((data) => {
			folderCreationModal = document.createElement("div");
			folderCreationModal.innerHTML = data;
			document.body.appendChild(folderCreationModal);

			folderCreationModal = document.getElementById(
				"folder-creation-modal"
			);

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
				console.log("edit");
			});
		});

	// create an observer instance
	var config = { attributes: true, childList: true, characterData: true };
	var fileListObserver = new MutationObserver(function (mutations) {
		fileListObserver.disconnect();
		allClasses = document.getElementsByClassName(classClassName);
		renderFolders();
		setupFolderIcon();
	});

	fileListObserver.observe(folderList, config);
}
