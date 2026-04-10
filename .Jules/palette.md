## 2026-03-25 - [Accessible Forms and Improved Interaction]
**Learning:** Adding a `<label>` and helper text significantly improves form accessibility for screen readers and new users. Implementing a loading state ("Generating...") on long-running button actions prevents duplicate submissions and provides clear feedback, while a "Select All" feature is a major efficiency gain for bulk list selections.
**Action:** Always associate inputs with `<label>` using `for` and `id`, and provide immediate visual feedback for any action that takes more than a few hundred milliseconds. Ensure that bulk actions have a "Select All" option to reduce user friction.

## 2026-03-26 - [Filtered Bulk Selection Pattern]
**Learning:** When combining search filters with bulk selection (e.g., 'Select All'), ensuring bulk actions only affect visible/filtered items prevents unintended modifications of hidden data, significantly improving user confidence and efficiency in managing large datasets.
**Action:** Always scope bulk actions (Select All/Clear All) to the currently filtered/visible set of items when a search or filter interface is present. Update the "Select All" state (checked/indeterminate) based on the visible set as well.

## 2026-04-01 - [Enhanced Multi-Select Interactions]
**Learning:** Implementing Shift+Click range selection is a critical productivity feature for list-heavy interfaces. Combining this with contextual labels (e.g., "Select All Visible") and comprehensive feedback ("Showing X of Y | Selected: Z") during filtering provides users with high precision and confidence when managing large datasets.
**Action:** Support Shift+Click for ranges in all multi-select lists. Use dynamic, contextual labels for bulk actions when filters are active to prevent ambiguity about which items are being affected.

## 2026-04-05 - [Metadata-Rich List Items]
**Learning:** Providing secondary metadata (like dates and item counts) in selection lists is crucial when primary titles are generic or repetitive. This reduces cognitive load and prevents user errors during selection. Using a vertical flex layout for the label content allows for clear visual hierarchy without cluttering the interface.
**Action:** Always include relevant metadata sub-text in list items to provide context. Ensure that search filters target primary titles but remain functional when list item DOM structure becomes more complex.

## 2026-04-03 - [Consolidated Filtering and Focused Entry]
**Learning:** Providing a "Show selected only" toggle in long multi-select lists allows users to audit their choices without losing their place or search context. Combining this with autofocus on the search input and an Escape-to-clear shortcut creates a high-velocity interaction pattern for data-heavy selection tasks.
**Action:** For list-heavy selection UIs, implement a unified filtering function that handles both text search and selection state. Always autofocus the primary search field and provide keyboard shortcuts (like Escape) for rapid navigation and state clearing.

## 2026-04-06 - [Sticky Actions and Visual Selection Cues]
**Learning:** In long list-based selection interfaces, anchoring primary action buttons in a sticky footer ensures they remain accessible without scrolling, significantly reducing friction. Providing immediate visual feedback for selected rows (e.g., background color and borders) and supporting keyboard shortcuts (Ctrl/Cmd + Enter) creates a much more responsive and efficient user experience.
**Action:** Use sticky footers for primary actions in long lists and implement distinct visual styles for selected states to aid scannability. Always provide keyboard shortcuts for high-frequency actions and communicate them via subtle "Tips".

## 2026-04-09 - [Keyboard Discoverability and High-Contrast Secondary Text]
**Learning:** Consolidating keyboard shortcuts into a single, high-visibility "Tip" line in the sticky footer significantly improves feature discoverability for power users. Additionally, using `#575757` instead of `#666` for secondary text ensures WCAG AA compliance (4.5:1 contrast) on white backgrounds without sacrificing the "secondary" visual hierarchy.
**Action:** Always document all page-level keyboard shortcuts in a consolidated hint area. Use `#575757` as the default for secondary/muted text to guarantee accessibility.

## 2026-04-07 - [Sticky Headers and Scaled Selection Metadata]
**Learning:** For high-volume selection tasks, pinning filter controls in a sticky header maintains context and control during deep scrolling. Complementing this with aggregate metadata (like total message count) in the selection summary provides users with a better sense of scale for the final output, aiding in curation decisions.
**Action:** Implement `.sticky-header` for filter bars in long lists to maintain accessibility. Always include aggregate metrics (counts, sizes, estimated pages) in selection summaries to provide scale context beyond just item counts.

## 2026-04-08 - [Correct Layout for Bulk Actions and Breadcrumbs]
**Learning:** When adding multiple interactive elements to a list header (like breadcrumbs and bulk clear buttons), using flexbox layouts with separate elements instead of nesting buttons inside labels is crucial for accessibility and predictable interaction. Breadcrumbs should provide a clear path back to the entry state (e.g., upload), especially when session data might be ephemeral.
**Action:** Avoid nesting interactive elements in `<label>` tags. Use separate elements with flexbox for header controls. Always provide a clear way back (like breadcrumbs) in multi-step wizard-like flows.

## 2026-04-10 - [Accessible Client-Side Validation]
**Learning:** For micro-UX improvements like file validation, leveraging native HTML elements and adding a small script for immediate feedback is more maintainable than custom UI widgets. Using `aria-live="polite"` on error containers and dynamically linking them to inputs via `aria-describedby` ensures that validation errors are immediately and clearly announced by assistive technologies.
**Action:** Always use ARIA live regions for dynamic validation messages and ensure inputs are programmatically linked to their error containers to maintain accessibility.
