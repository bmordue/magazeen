## 2026-03-25 - [Accessible Forms and Improved Interaction]
**Learning:** Adding a `<label>` and helper text significantly improves form accessibility for screen readers and new users. Implementing a loading state ("Generating...") on long-running button actions prevents duplicate submissions and provides clear feedback, while a "Select All" feature is a major efficiency gain for bulk list selections.
**Action:** Always associate inputs with `<label>` using `for` and `id`, and provide immediate visual feedback for any action that takes more than a few hundred milliseconds. Ensure that bulk actions have a "Select All" option to reduce user friction.

## 2026-03-26 - [Filtered Bulk Selection Pattern]
**Learning:** When combining search filters with bulk selection (e.g., 'Select All'), ensuring bulk actions only affect visible/filtered items prevents unintended modifications of hidden data, significantly improving user confidence and efficiency in managing large datasets.
**Action:** Always scope bulk actions (Select All/Clear All) to the currently filtered/visible set of items when a search or filter interface is present. Update the "Select All" state (checked/indeterminate) based on the visible set as well.
