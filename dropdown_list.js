// Example JavaScript to dynamically populate options
const folderDropdown = document.getElementById('folder-dropdown');
const folders = ['Folder 1', 'Folder 2', 'Folder 3'];

folders.forEach(folder => {
    const option = document.createElement('option');
    option.value = folder.toLowerCase().replace(/\s/g, '-');
    option.textContent = folder;
    folderDropdown.appendChild(option);
});

// Example event listener for edit button
const editButton = document.getElementById('folder-edit-button');
editButton.addEventListener('click', () => {
    // Perform your edit action here
});
