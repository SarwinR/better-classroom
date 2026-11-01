# Folder loading and join-flow fixes (#41, #35)

## Findings

- The dropdown insertion assigned `navigationBar.innerHTML`, replacing Google's existing controls and any listeners/controller state attached to those nodes. Preserve those nodes when inserting extension UI. The old store build's Join class screen opened during this investigation, so the intermittent user failure was not reproduced in that session.
- Startup waited at most ten seconds for two generated CSS class combinations. The card observer then disconnected after its first mutation, did not observe descendants, and did not recover after single-page navigation. Late cards, incomplete cards and replaced lists could leave folder controls unusable.
- Saved folder data, selected folder and aliases loaded independently. Title restoration could run before the original-title dictionary existed, writing an undefined value; subsequent renders could mistake an alias for the original title.
- The class-list click handler closed over a shared global element. Opening a different dialog could redirect the old dialog's selection handling.

## Changes

Await saved state and templates before rendering. Insert only the extension-owned dropdown subtree, and reconnect it after navigation replacement. Observe semantic course-card attributes and descendant content throughout the page lifetime. Batch refreshes and disconnect the observer during extension writes to avoid feedback loops. Handle the current home routes, including `/u/0/h` and `/h/tv`.

Track original titles per title DOM node, skip incomplete cards and update open folder dialogs when classes arrive. Create one accessible settings button per card. Use text nodes for folder/class labels and copy selections so cancelling an edit preserves saved membership. Existing storage keys and class IDs are unchanged; no migration or permission changes are required.

## Validation

`npm ci --ignore-scripts`, `npm test`, `npm run validate`, `node --check content.js`, and `git diff --check`.

Eight DOM regression tests cover native listener preservation, saved-state response ordering, late/partial/replaced cards, navigation and header replacement, alias restoration, stale selected folders, folder creation/cancelled editing, and live dialog updates. jsdom is development-only and excluded from extension packages.

Chrome smoke checks against the signed-in Classroom page: all 15 current cards discovered; folder creation with one class; filtering; alias save; folder/alias persistence after refresh; native + > Join class opens the code-entry form. No enrollment was submitted. No extension console warnings/errors were observed. The old store extension was temporarily disabled for testing with user approval; its storage was not changed by the local build, which uses a separate extension ID.

This is a source fix, not a published store update. Users receive it only after review, release packaging and Chrome/Edge store publication. Existing locally stored folders are retained on update; uninstalling the extension can remove that data and this fix cannot reconstruct deleted folders.
