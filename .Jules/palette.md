## 2026-03-25 - [Accessible Forms and Improved Interaction]
**Learning:** Adding a `<label>` and helper text significantly improves form accessibility for screen readers and new users. Implementing a loading state ("Generating...") on long-running button actions prevents duplicate submissions and provides clear feedback, while a "Select All" feature is a major efficiency gain for bulk list selections.
**Action:** Always associate inputs with `<label>` using `for` and `id`, and provide immediate visual feedback for any action that takes more than a few hundred milliseconds. Ensure that bulk actions have a "Select All" option to reduce user friction.

## 2026-03-27 - [Efficient Bulk Selection Patterns]
**Learning:** For long lists, a "Select All" feature is not enough if users need to pick specific items based on criteria. Combining a real-time search filter with a selection counter and an "Action on Visible" pattern dramatically reduces cognitive load and manual effort. Making the entire row of a list item clickable (hover state + cursor pointer) improves the perceived speed and ease of interaction.
**Action:** Always provide search/filter for lists exceeding 10 items and include a selection counter to give users confidence before committing to a bulk action. When filtering is active, ensure "Select All" only affects visible items to avoid accidental selections.
