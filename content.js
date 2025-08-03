// CLASS NAMES AND IDs
navigationBarClassName = "fB7J9c kWv2Xb QRiHXd"; // the '+' button in the navigation bar located on the top right side of the screen
folderListClassName = "JwPp0e";
contentWindowClassName = "kFwPee";
inContentWindowNavigationBarClassName = "xgkURe mhCMAe";

classClassName = "gHz6xd Aopndd rZXyy";
classTitleClassName = "ScpeUc Vu2fZd z3vRcc-ZoZQ1";

var unable2FindClass = false;
var loadingClasses = true;
classesDictionary = {}; // classID: className
folderSelectedClasses = [];
// an array of all elements with class classClassName
allClasses = null;

folderSettingModal = null;
folderCreationModal = null;
classSettingModal = null;

// the current active folder (selected from dropdown)
selectedFolder = "__All Classes__";
// the current class that is being edited
editingClassId = null;

// static folders (cannot be deleted/edited)
topStaticFolders = { "__All Classes__": "All Classes" };
bottomStaticFolders = {
  __Separator__: "──────────",
  "__Add Folder__": "Add Folder",
};
// user created folders (can be deleted/edited)
folders = {};

// classes in each folder
folderActiveClasses = {};

// Dictionary containing names of all classes whose name has been changed
userDefinedClassName = {};

var unable2FindClassMessage =
  'Unable to load classes. Please go to <a href="https://classroom.google.com/">Google Classroom Homepage</a> and refresh the page.';

folderList = document.getElementsByClassName(folderListClassName)[0];
contentWindow = document.getElementsByClassName(contentWindowClassName)[0];
navigationBar = document.getElementsByClassName(navigationBarClassName)[0];

loadFolders();
loadLastSelectedFolder();
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

function saveClasses() {
  chrome.runtime.sendMessage(
    {
      action: "saveClassData",
      classData: userDefinedClassName,
    },
    function (response) {
      //console.log(response);
    }
  );
}

function loadClasses() {
  chrome.runtime.sendMessage({ action: "getClassData" }, function (response) {
    userDefinedClassName = response.classData;
    changeClassesName();
  });
}

function saveFolders() {
  // save folders to chrome storage and output to console
  chrome.runtime.sendMessage(
    {
      action: "saveFolderData",
      folderData: {
        folders: folders,
        folderActiveClasses: folderActiveClasses,
      },
    },
    function (response) {
      //console.log(response);
    }
  );
}

function loadFolders() {
  chrome.runtime.sendMessage({ action: "getFolderData" }, function (response) {
    folders = response.folderData.folders;
    folderActiveClasses = response.folderData.folderActiveClasses;
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
  if (unable2FindClass) {
    classSelectionList.innerHTML = `<option class="class-option" disabled>An Error Occurred</option>`;

    classModalErrorText = document.getElementsByClassName(
      "folder-modal-error-msg"
    );

    classModalErrorText[0].innerHTML = unable2FindClassMessage;
    classModalErrorText[1].innerHTML = unable2FindClassMessage;

    return;
  }
  if (allClasses == null) {
    classSelectionList.innerHTML = `<option class="class-option" disabled>No Classes Found</option>`;
    return;
  }

  Object.keys(classesDictionary).forEach((k) => {
    let _className = "";
    if (userDefinedClassName[k] != null)
      _className = userDefinedClassName[k] + " (" + classesDictionary[k] + ")";
    else _className = classesDictionary[k];

    if (isEditable)
      classSelectionList.innerHTML += `<option class="class-option" value="${k}">${_className}</option>`;
    else
      classSelectionList.innerHTML += `<option class="class-option" value="${k}" disabled>${_className}</option>`;
  });

  // activate all classes in activeClasses
  folderSelectedClasses = activeClasses;
  if (folderSelectedClasses != null) {
    for (let i = 0; i < classSelectionList.options.length; i++) {
      if (folderSelectedClasses.includes(classSelectionList.options[i].value)) {
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
      if (folderSelectedClasses.includes(classSelectionList.options[i].value)) {
        classSelectionList.options[i].selected = true;
      }
    }
  });
}

function setupFolderIcon() {
  if (allClasses == null) return;

  fetch(chrome.runtime.getURL("html/class_setting_button.html"))
    .then((response) => response.text())
    .then((data) => {
      if (document.getElementById("class-setting-button") != null) return;

      for (let i = 0; i < allClasses.length; i++) {
        folderSettingButton = document.createElement("div");
        folderSettingButton.innerHTML = data;
        folderSettingButton.setAttribute("id", "class-setting-button");

        folderSettingButton.addEventListener("click", () => {
          toggleClassSettingModal(true, allClasses[i].dataset["courseId"]);
          editingClassId = allClasses[i].dataset["courseId"];
        });

        appendedFolderSettingButton = allClasses[i]
          .querySelector(".SZ0kZe") // class = SZ0kZe is the div that contains the 2 icons
          .appendChild(folderSettingButton);

        folderSettingButtonObserver = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (
              mutation.type === "childList" &&
              mutation.removedNodes.length > 0
            ) {
              const removedNodes = Array.from(mutation.removedNodes);
              if (removedNodes.includes(folderSettingButton)) {
                folderSettingButtonObserver.disconnect();
                setupFolderIcon();
              }
            }
          });
        });

        folderSettingButtonObserver.observe(
          appendedFolderSettingButton.parentNode,
          {
            childList: true,
          }
        );
      }

      loadClasses();
    });
}

function renderFolders() {
  if (allClasses == null) return; // ! set message to no classes found

  classesDictionary = {};

  for (let i = 0; i < allClasses.length; i++) {
    _classID = allClasses[i].dataset["courseId"];
    _className =
      allClasses[i].getElementsByClassName(classTitleClassName)[0].innerText;

    classesDictionary[_classID] = _className;

    _folderActiveClasses = folderActiveClasses[selectedFolder] || [];

    // if class is in active folder or no folder is selected, show class
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

function submitNewClassName() {}

function changeClassesName() {
  for (let i = 0; i < allClasses.length; i++) {
    if (userDefinedClassName[allClasses[i].dataset["courseId"]] != null) {
      allClasses[i].getElementsByClassName(classTitleClassName)[0].innerText =
        userDefinedClassName[allClasses[i].dataset["courseId"]];
    } else {
      allClasses[i].getElementsByClassName(classTitleClassName)[0].innerText =
        classesDictionary[allClasses[i].dataset["courseId"]];
    }
  }
}

function submitFolderCreationForm() {
  folderName = document.getElementById(
    "folder-creation-modal-folder-name"
  ).value;

  if (validateFolderName(folderName)) {
    createFolder(folderName);
    toggleFolderCreationModal(false);
    resetFolderCreationForm();
  }
}

function toggleClassSettingModal(status, classID = null) {
  if (status) {
    originalClassNameField = document.getElementById(
      "class-setting-modal-original-class-name"
    );
    originalClassNameField.value = classesDictionary[classID];

    alternateClassNameField = document.getElementById(
      "class-setting-modal-new-class-name"
    );
    alternateClassNameField.value = "";
    if (userDefinedClassName[classID] != null) {
      alternateClassNameField.value = userDefinedClassName[classID];
    }

    classSettingModal.style.display = "flex";
  } else {
    classSettingModal.style.display = "none";
  }
}

function saveClassChanges() {
  alternateClassNameField = document.getElementById(
    "class-setting-modal-new-class-name"
  );
  if (alternateClassNameField.value == "") {
    delete userDefinedClassName[editingClassId];
  } else {
    userDefinedClassName[editingClassId] = alternateClassNameField.value;
  }

  saveClasses();
  changeClassesName();
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
function saveFolderChanges(folderId, folderName, folderClasses) {
  delete folderActiveClasses[folderId];
  delete folders[folderId];

  folders[folderName] = folderName;
  folderActiveClasses[folderName] = folderClasses;
  selectedFolder = folderName;

  saveLastSelectedFolder();
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

function validateFolderName(name, isEdit = false) {
  // check if folder is valid and if it already exists
  if (name in topStaticFolders || name in bottomStaticFolders) {
    alert("This folder name is reserved");
    return false;
  }

  if (name == null || name == "") {
    alert("Folder name cannot be empty");
    return false;
  }

  if (isEdit == false) {
    if (name in folders) {
      alert("Folder already exists");
      return false;
    }
  } else {
    if (name in folders && name != selectedFolder) {
      alert("Folder already exists");
      return false;
    }
  }

  return true;
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

      folderCreationModal = document.getElementById("folder-creation-modal");

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

  fetch(chrome.runtime.getURL("html/class_setting_modal.html"))
    .then((response) => response.text())
    .then((data) => {
      classSettingModal = document.createElement("div");
      classSettingModal.innerHTML = data;
      document.body.appendChild(classSettingModal);

      classSettingModal = document.getElementById("class-setting-modal");

      toggleClassSettingModal(false);

      // setup close button
      folderCreationCloseButton = document.getElementById(
        "class-setting-modal-modal-close"
      );
      folderCreationCloseButton.addEventListener("click", () => {
        toggleClassSettingModal(false);
      });

      // setup submit button
      folderCreationSubmitButton = document.getElementById(
        "class-setting-modal-modal-submit"
      );
      folderCreationSubmitButton.addEventListener("click", () => {
        saveClassChanges();
        toggleClassSettingModal(false);
      });
    });

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

      folderSettingModal = document.getElementById("folder-setting-modal");

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
        if (validateFolderName(nameInputField.value, true)) {
          saveFolderChanges(
            selectedFolder,
            nameInputField.value,
            folderSelectedClasses
          );
          toggleFolderSettingModal(false);
        }
      });
    });

  // create an observer instance
  var config = { attributes: true, childList: true, characterData: true };
  var fileListObserver = new MutationObserver(function (mutations) {
    fileListObserver.disconnect();

    setTimeout(() => {
      allClasses = document.getElementsByClassName(classClassName);

      console.log(allClasses);
      console.log(allClasses.length);

      renderFolders();
      changeClassesName();
      loadingClasses = false;
      setupFolderModalClassList("folder-creation-modal-class-select");
      setupFolderModalClassList(
        "folder-setting-modal-class-select",
        folderId2ClassIds(selectedFolder),
        isFolderEditable(selectedFolder)
      );

      setupFolderIcon();
    }, 0);
  });

  if (!folderList) {
    // Google Classroom is not is not on homepage/was not loaded form homepage
    // TODO add observer to detect when Google Classroom homepage is loaded
    // console.log("Google Classroom is not on homepage");

    unable2FindClass = true;
    loadingClasses = false;
  } else {
    // console.log("Google Classroom is on homepage");
    fileListObserver.observe(folderList, config);
  }
}
