// CLASS NAMES AND IDs
navigationBarClassName = "Mtd4hb gmNu1d"; // the '+' button in the navigation bar located on the top right side of the screen
folderListClassName = "JwPp0e";
contentWindowClassName = "kFwPee";
inContentWindowNavigationBarClassName = "xgkURe mhCMAe";

classClassName = "gHz6xd riU7le rZXyy";
classTitleClassName = "ScpeUc Vu2fZd XwD7Ke";
classSectionClassName = "FWGURc Vu2fZd Svw0vd";

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

// current hot-search query (lowercased), applied on top of folder filtering
searchQuery = "";

// classID: any extra text visible on the class's homepage tile (section,
// teacher name, etc.) beyond the title itself — used for search and shown
// as a subtitle in the folder picker cards
classesMetaDictionary = {};

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
    return folderActiveClasses[folderId] || [];
  }
}

function isFolderEditable(folderId) {
  return !Object.keys(topStaticFolders).includes(folderId);
}

// Keeps a modal's "Select All" checkbox in sync with the currently
// *visible* cards (i.e. respecting any active search filter) — checked if
// all visible cards are selected, indeterminate if some are, unchecked
// if none are, and disabled if there's nothing selectable to act on.
function updateSelectAllState(selectAllId, selectId) {
  selectAllCheckbox = document.getElementById(selectAllId);
  listContainer = document.getElementById(selectId);
  if (selectAllCheckbox == null || listContainer == null) return;

  visibleCards = Array.from(
    listContainer.getElementsByClassName("class-picker-card")
  ).filter(
    (card) => card.style.display != "none" && !card.classList.contains("disabled")
  );

  if (visibleCards.length == 0) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
    selectAllCheckbox.disabled = true;
    return;
  }

  selectAllCheckbox.disabled = false;
  checkedCount = visibleCards.filter(
    (card) => card.querySelector(".class-picker-checkbox").checked
  ).length;

  selectAllCheckbox.checked = checkedCount == visibleCards.length;
  selectAllCheckbox.indeterminate =
    checkedCount > 0 && checkedCount < visibleCards.length;
}

// checking/unchecking "Select All" toggles every currently visible,
// non-disabled card and keeps folderSelectedClasses in sync
function attachSelectAllCheckbox(selectAllId, selectId) {
  selectAllCheckbox = document.getElementById(selectAllId);
  if (selectAllCheckbox == null) return;

  if (selectAllCheckbox.hasAttribute("listener-added")) return;
  selectAllCheckbox.setAttribute("listener-added", true);

  selectAllCheckbox.addEventListener("change", () => {
    listContainer = document.getElementById(selectId);
    if (listContainer == null) return;

    _shouldSelect = selectAllCheckbox.checked;
    cards = listContainer.getElementsByClassName("class-picker-card");

    for (let i = 0; i < cards.length; i++) {
      card = cards[i];
      if (card.style.display == "none" || card.classList.contains("disabled"))
        continue;

      checkbox = card.querySelector(".class-picker-checkbox");
      if (checkbox == null) continue;

      checkbox.checked = _shouldSelect;
      _value = checkbox.value;

      if (_shouldSelect) {
        if (!folderSelectedClasses.includes(_value))
          folderSelectedClasses.push(_value);
        card.classList.add("selected");
      } else {
        folderSelectedClasses = folderSelectedClasses.filter(
          (item) => item != _value
        );
        card.classList.remove("selected");
      }
    }

    updateSelectAllState(selectAllId, selectId);
  });
}

function setupFolderModalClassList(
  elementId,
  activeClasses = [],
  isEditable = true
) {
  classSelectionList = document.getElementById(elementId);
  classSelectionList.innerHTML = "";

  selectAllId = elementId.replace("-class-select", "-select-all");
  selectAllCheckbox = document.getElementById(selectAllId);

  if (loadingClasses) {
    classSelectionList.innerHTML = `<div class="class-picker-empty">Loading Class List . . .</div>`;
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.disabled = true;
    }
    return;
  }
  if (unable2FindClass) {
    classSelectionList.innerHTML = `<div class="class-picker-empty">An Error Occurred</div>`;

    classModalErrorText = document.getElementsByClassName(
      "folder-modal-error-msg"
    );

    classModalErrorText[0].innerHTML = unable2FindClassMessage;
    classModalErrorText[1].innerHTML = unable2FindClassMessage;

    if (selectAllCheckbox) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.disabled = true;
    }
    return;
  }
  if (allClasses == null) {
    classSelectionList.innerHTML = `<div class="class-picker-empty">No Classes Found</div>`;
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.disabled = true;
    }
    return;
  }

  // activate all classes in activeClasses
  folderSelectedClasses = Array.isArray(activeClasses) ? activeClasses : [];

  Object.keys(classesDictionary).forEach((k) => {
    let _className = "";
    if (userDefinedClassName[k] != null)
      _className = userDefinedClassName[k] + " (" + classesDictionary[k] + ")";
    else _className = classesDictionary[k];

    let _meta = classesMetaDictionary[k] || "";
    let _checked = folderSelectedClasses.includes(k);

    classSelectionList.innerHTML += `
      <label class="class-picker-card${_checked ? " selected" : ""}${
      isEditable ? "" : " disabled"
    }" data-class-id="${k}">
        <input
          type="checkbox"
          class="class-picker-checkbox"
          value="${k}"
          ${_checked ? "checked" : ""}
          ${isEditable ? "" : "disabled"}
        />
        <div class="class-picker-info">
          <div class="class-picker-name">${_className}</div>
          ${_meta ? `<div class="class-picker-meta">${_meta}</div>` : ""}
        </div>
      </label>`;
  });

  if (selectAllCheckbox) selectAllCheckbox.disabled = !isEditable;
  updateSelectAllState(selectAllId, elementId);
  attachSelectAllCheckbox(selectAllId, elementId);

  // check for listener already added
  if (classSelectionList.hasAttribute("listener-added")) return;

  classSelectionList.setAttribute("listener-added", true);
  classSelectionList.addEventListener("change", (event) => {
    if (!event.target.classList.contains("class-picker-checkbox")) return;

    _value = event.target.value;
    _card = event.target.closest(".class-picker-card");

    if (event.target.checked) {
      if (!folderSelectedClasses.includes(_value))
        folderSelectedClasses.push(_value);
      if (_card) _card.classList.add("selected");
    } else {
      folderSelectedClasses = folderSelectedClasses.filter(
        (item) => item != _value
      );
      if (_card) _card.classList.remove("selected");
    }

    updateSelectAllState(selectAllId, elementId);
  });
}

// live-filters the class-picker cards inside a folder modal as the user
// types in its search box, without touching the actual selection state
// (folderSelectedClasses). Matches against each card's full visible text,
// so it searches name, section, and teacher together.
function attachClassSearchFilter(searchInputId, selectId) {
  searchInput = document.getElementById(searchInputId);
  if (searchInput == null) return;

  // avoid double-binding every time the modal is opened
  if (searchInput.hasAttribute("listener-added")) return;
  searchInput.setAttribute("listener-added", true);

  searchInput.addEventListener("input", () => {
    query = searchInput.value.trim().toLowerCase();
    listContainer = document.getElementById(selectId);
    if (listContainer == null) return;

    cards = listContainer.getElementsByClassName("class-picker-card");
    for (let i = 0; i < cards.length; i++) {
      _matches = query == "" || cards[i].innerText.toLowerCase().includes(query);
      cards[i].style.display = _matches ? "" : "none";
    }

    updateSelectAllState(selectId.replace("-class-select", "-select-all"), selectId);
  });
}

// clears a modal's search box and un-hides every card, used whenever
// a modal is (re)opened so it doesn't retain a stale filter
function resetClassSearch(searchInputId, selectId) {
  searchInput = document.getElementById(searchInputId);
  if (searchInput != null) searchInput.value = "";

  listContainer = document.getElementById(selectId);
  if (listContainer == null) return;
  cards = listContainer.getElementsByClassName("class-picker-card");
  for (let i = 0; i < cards.length; i++) {
    cards[i].style.display = "";
  }

  updateSelectAllState(selectId.replace("-class-select", "-select-all"), selectId);
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

// Reads the section text Google renders directly under the class title on
// its homepage tile (e.g. "Karachi.AI CVE - Batch 12"). Google doesn't
// render teacher, room, or level anywhere on this tile — those only exist
// in the "Edit class" dialog — so this is the one extra field available
// without opening that dialog per class.
function extractClassMeta(classElement, titleText) {
  let sectionEl = classElement.getElementsByClassName(classSectionClassName)[0];
  if (sectionEl == null) return "";
  return sectionEl.innerText.trim();
}

function renderFolders() {
  if (allClasses == null) return; // ! set message to no classes found

  classesDictionary = {};

  for (let i = 0; i < allClasses.length; i++) {
    _classID = allClasses[i].dataset["courseId"];
    _className =
      allClasses[i].getElementsByClassName(classTitleClassName)[0].innerText;

    classesDictionary[_classID] = _className;
    classesMetaDictionary[_classID] = extractClassMeta(
      allClasses[i],
      _className
    );

    _folderActiveClasses = folderActiveClasses[selectedFolder] || [];

    // if class is in active folder or no folder is selected, show class
    _inFolder =
      _folderActiveClasses.includes(_classID) ||
      selectedFolder == null ||
      selectedFolder == "__All Classes__";

    // hot-search filter: match against the display name (alias if set)
    // as well as any section/teacher text visible on the tile
    _displayName = userDefinedClassName[_classID] || _className;
    _meta = classesMetaDictionary[_classID] || "";
    _matchesSearch =
      searchQuery == "" ||
      _displayName.toLowerCase().includes(searchQuery) ||
      _meta.toLowerCase().includes(searchQuery);

    if (_inFolder && _matchesSearch) {
      allClasses[i].style.display = "flex";
    } else {
      allClasses[i].style.display = "none";
    }
  }
}

function submitNewClassName() {}

function changeClassesName() {
  if (allClasses == null) return;

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
    attachClassSearchFilter(
      "folder-creation-modal-class-search",
      "folder-creation-modal-class-select"
    );
    resetClassSearch(
      "folder-creation-modal-class-search",
      "folder-creation-modal-class-select"
    );
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

    attachClassSearchFilter(
      "folder-setting-modal-class-search",
      "folder-setting-modal-class-select"
    );
    resetClassSearch(
      "folder-setting-modal-class-search",
      "folder-setting-modal-class-select"
    );
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

      classSearchInput = document.getElementById("class-search-input");
      classSearchInput.addEventListener("input", () => {
        searchQuery = classSearchInput.value.trim().toLowerCase();
        renderFolders();
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
  config = { attributes: true, childList: true, characterData: true };
  fileListObserver = new MutationObserver(function (mutations) {
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

  // Google Classroom is a slow-rendering SPA, so `folderList` may not exist
  // in the DOM yet at the instant this content script runs (e.g. right after
  // navigation, on a slow connection, or while Classroom re-renders). A
  // single synchronous check here was the cause of the permanent
  // "Unable to load classes" error: if it missed the timing window once,
  // unable2FindClass stayed true forever with no way to recover.
  //
  // Instead, poll for it for a while before giving up.
  findFolderListWithRetry();
}

function findFolderListWithRetry(attempt = 0, maxAttempts = 30, intervalMs = 500) {
  folderList = document.getElementsByClassName(folderListClassName)[0];

  if (folderList) {
    unable2FindClass = false;
    fileListObserver.observe(folderList, config);
    return;
  }

  if (attempt >= maxAttempts) {
    // genuinely couldn't find it (wrong page, or Google changed the markup)
    unable2FindClass = true;
    loadingClasses = false;

    // refresh any modal that might already be open/rendering so the
    // "Unable to load classes" message actually shows up instead of
    // silently staying on "Loading Class List . . ."
    setupFolderModalClassList("folder-creation-modal-class-select");
    setupFolderModalClassList(
      "folder-setting-modal-class-select",
      folderId2ClassIds(selectedFolder),
      isFolderEditable(selectedFolder)
    );
    return;
  }

  setTimeout(
    () => findFolderListWithRetry(attempt + 1, maxAttempts, intervalMs),
    intervalMs
  );
}
