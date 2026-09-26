# Implementation Plan: Expense and Budget Visualizer

## Overview

Build a fully client-side, zero-dependency (except Chart.js via CDN) expense tracker using HTML, CSS, and Vanilla JavaScript. The app persists data in Local Storage and visualizes spending by category through an interactive pie chart. All tasks follow the design document's module structure: a single IIFE in `js/app.js`, a single stylesheet in `css/styles.css`, and a single HTML entry point at `index.html`.

---

## Tasks

- [x] 1. Scaffold project file structure
  - Create the root directory layout: `index.html`, `css/styles.css`, `js/app.js`
  - `index.html` must use a `<link>` to `css/styles.css` and a `<script>` to `js/app.js` — no inline `<style>` or `<script>` blocks containing application logic
  - Include the Chart.js CDN `<script>` tag (`https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js`) before `js/app.js`
  - Verify the three files are the only HTML/CSS/JS files in the project
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.3_

- [x] 2. Implement HTML structure for all four UI regions
  - [x] 2.1 Add Balance Display header region
    - `<header id="balance-display">` containing a label paragraph and `<span id="balance-amount">0.00</span>`
    - _Requirements: 3.1, 3.4, 3.5_

  - [x] 2.2 Add Input Form section region
    - `<section id="input-section">` containing `<form id="transaction-form" novalidate>`
    - Three field groups: text input `#item-name` (maxlength="100"), number input `#amount` (step="0.01" min="0.01"), and `<select id="category">` with options for blank default, Food, Transport, Fun
    - Each field group has an inline `<span class="error">` with a unique `id` (`#error-item-name`, `#error-amount`, `#error-category`)
    - Submit button `<button type="submit">Add Transaction</button>`
    - Storage warning banner `<div id="storage-warning" class="warning hidden"></div>` inside this section
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 5.4, 5.5_

  - [x] 2.3 Add Transaction List section region
    - `<section id="transaction-section">` containing `<h2>Transactions</h2>` and `<ul id="transaction-list"></ul>`
    - _Requirements: 2.1, 2.3, 2.5, 2.6_

  - [x] 2.4 Add Pie Chart section region
    - `<section id="chart-section">` containing `<h2>Spending by Category</h2>`, `<canvas id="pie-chart"></canvas>`, and `<p id="chart-placeholder" class="hidden">No spending data available.</p>`
    - _Requirements: 4.1, 4.4, 4.5_

- [x] 3. Implement CSS styling
  - [x] 3.1 Define global reset, typography, and CSS custom properties
    - Declare category color variables: `--color-food: #FF6384`, `--color-transport: #36A2EB`, `--color-fun: #FFCE56`
    - Add `.hidden` utility class (`display: none`)
    - _Requirements: 4.5, 6.1_

  - [x] 3.2 Style Balance Display header
    - Full-width header, prominent font size and weight for `#balance-amount`
    - _Requirements: 3.1_

  - [x] 3.3 Style Input Form — fields, labels, error spans, and submit button
    - `.field-group` layout (stacked label → input → error)
    - `.error` spans styled in red, zero-height when empty, visible when non-empty
    - Submit button styled distinctively
    - _Requirements: 1.1, 1.4_

  - [x] 3.4 Style Transaction List — list items, amount, category badge, delete button
    - Each `<li>` displays name, formatted amount, and category in a row
    - Delete button right-aligned, visually distinct
    - Scrollable list container (overflow-y: auto with a max-height)
    - _Requirements: 2.1, 2.5, 2.6_

  - [x] 3.5 Style Chart section and warning banner
    - Chart section fills available space with the canvas responsive
    - `.warning` banner styled as a non-blocking, non-modal notification bar
    - _Requirements: 4.5, 5.4, 5.5, 5.6_

  - [x] 3.6 Implement responsive layout with CSS Grid or Flexbox
    - Two-column `<main>` layout (transaction list left, chart right) on wide viewports
    - Single-column stacked layout on narrow viewports (e.g., max-width: 600px)
    - _Requirements: 7.1_

- [x] 4. Checkpoint — verify static HTML renders correctly
  - Open `index.html` via `file://` in a browser and confirm all four regions are visible, form fields are present, no JS errors appear, and the page loads fully
  - _Requirements: 6.4, 7.4_

- [x] 5. Implement JavaScript — Constants and State
  - [x] 5.1 Define constants and module-level state inside a single IIFE
    - `STORAGE_KEY = "etv_transactions"`
    - `CATEGORIES = ["Food", "Transport", "Fun"]`
    - `CHART_COLORS = { Food: "#FF6384", Transport: "#36A2EB", Fun: "#FFCE56" }`
    - `let transactions = []` (source of truth)
    - `let chartInstance = null`
    - _Requirements: 4.5, 6.2_

- [x] 6. Implement JavaScript — Utility Functions
  - [x] 6.1 Implement `generateId()`
    - Returns `crypto.randomUUID()` if available; falls back to a `Date.now()` + `Math.random()` string
    - _Requirements: 1.2_

  - [x] 6.2 Implement `validateForm(name, amount, category)`
    - Returns `{ valid: boolean, errors: { name?, amount?, category? } }`
    - `name`: non-empty after trim, max 100 chars
    - `amount`: finite number, `0.01 ≤ amount ≤ 999999999.99`
    - `category`: must be one of `CATEGORIES`
    - _Requirements: 1.3, 1.4_

  - [ ]* 6.3 Write property test for `validateForm` (Property 1)
    - **Property 1: Validator correctly classifies all inputs**
    - Generate arbitrary `(name, amount, category)` triples; assert `valid === true` iff all three constraints are satisfied; assert error keys are present for every violated constraint
    - **Validates: Requirements 1.3, 1.4**

  - [x] 6.4 Implement `calcBalance(transactions)`
    - Returns the arithmetic sum of all `transaction.amount` values; returns `0` for an empty array
    - _Requirements: 3.1, 3.4_

  - [x] 6.5 Implement `calcCategoryTotals(transactions)`
    - Returns `{ Food, Transport, Fun }` where each value is the sum of `amount` for transactions in that category where `amount > 0`
    - Transactions with `amount ≤ 0` contribute zero
    - _Requirements: 4.1, 4.6, 4.7_

  - [ ]* 6.6 Write property test for `calcBalance` and `calcCategoryTotals` (Property 5 & 6)
    - **Property 5: Balance is the sum of all transaction amounts**
    - **Property 6: Category totals are correctly aggregated, excluding non-positive amounts**
    - Generate arbitrary transaction lists; assert balance equals arithmetic sum; assert category totals exclude non-positive amounts; assert percentage formula is correct
    - **Validates: Requirements 3.1, 3.4, 3.5, 4.1, 4.6, 4.7**

  - [x] 6.7 Implement `formatAmount(number)`
    - Returns a string formatted as `"$ X.XX"` with 2 decimal places (e.g., `"$ 1,234.50"`)
    - Uses `toLocaleString` or equivalent for comma separators
    - _Requirements: 2.1, 3.5_

  - [x] 6.8 Implement `isValidTransactionArray(data)`
    - Returns `true` iff `data` is an Array where every element has: `id` (string), `name` (non-empty string ≤ 100 chars), `amount` (finite number `> 0`), `category` ∈ `CATEGORIES`, `createdAt` (number)
    - Returns `false` for `null`, non-arrays, and arrays with any malformed element
    - _Requirements: 5.6_

  - [ ]* 6.9 Write property test for `isValidTransactionArray` (Property 7)
    - **Property 7: Storage deserialization correctly accepts valid data and rejects invalid data**
    - Generate valid transaction arrays (must return `true`) and arbitrary JSON-serializable values with injected invalid fields (must return `false`)
    - **Validates: Requirements 5.6**

- [x] 7. Implement JavaScript — Storage Functions
  - [x] 7.1 Implement `loadFromStorage()`
    - Wraps `localStorage.getItem(STORAGE_KEY)` in `try/catch`
    - Returns `[]` if key is absent
    - Calls `isValidTransactionArray` on parsed result; returns `[]` and calls `showWarning` if invalid or parse fails
    - Does not overwrite Storage on corruption or unavailability
    - _Requirements: 2.2, 5.3, 5.4, 5.6_

  - [x] 7.2 Implement `saveToStorage(txs)`
    - Wraps `localStorage.setItem(STORAGE_KEY, JSON.stringify(txs))` in `try/catch`
    - Returns `{ ok: true }` on success, `{ ok: false, error }` on failure
    - Calls `showWarning` on failure
    - _Requirements: 5.1, 5.2, 5.5_

  - [ ]* 7.3 Write property test for Storage round-trip (Property 2)
    - **Property 2: Adding any valid transaction persists and restores it**
    - Generate arbitrary valid transactions; serialize via `saveToStorage` simulation (JSON.stringify → JSON.parse → isValidTransactionArray); assert the round-tripped collection contains the original transaction unchanged
    - **Validates: Requirements 1.2, 5.1, 5.3**

- [x] 8. Implement JavaScript — Render Functions
  - [x] 8.1 Implement `renderBalance()`
    - Reads `transactions`, calls `calcBalance`, calls `formatAmount`, sets `#balance-amount` text content
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 8.2 Implement `renderTransactionList()`
    - Clears `#transaction-list`, then for each transaction in `transactions`, creates a `<li>` with name, formatted amount, category, and a delete `<button data-id="...">` 
    - When `transactions` is empty, renders the empty-state message
    - _Requirements: 2.1, 2.2, 2.3, 2.6_

  - [ ]* 8.3 Write property test for `renderTransactionList` output (Property 3)
    - **Property 3: Transaction rendering is complete and contains all required fields**
    - For arbitrary non-empty transaction lists, assert each rendered `<li>` contains the name text, formatted amount with 2 decimal places and currency symbol, category text, and a delete control; assert no transaction is omitted
    - **Validates: Requirements 2.1, 2.6**

  - [x] 8.4 Implement `renderChart()`
    - Calls `calcCategoryTotals`, calculates percentages
    - If no positive-amount transactions exist: destroys `chartInstance` (if present), hides canvas, shows `#chart-placeholder`
    - If data exists and `chartInstance` is null: creates new `Chart` instance with pie type, labels, data, and `backgroundColor` from `CHART_COLORS`
    - If `chartInstance` already exists: updates `data.datasets[0].data` and calls `chartInstance.update()` — does NOT destroy/recreate
    - If Chart.js failed to load (`typeof Chart === "undefined"`): shows static error message in chart section; rest of app continues functioning
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 8.5 Implement `renderAll()`
    - Calls `renderBalance()`, `renderTransactionList()`, `renderChart()` in sequence
    - _Requirements: 3.2, 3.3, 4.2, 4.3_

- [x] 9. Implement JavaScript — Warning Function
  - [x] 9.1 Implement `showWarning(message)`
    - Sets `textContent` of `#storage-warning`, removes `.hidden` class
    - Auto-dismisses after 5 seconds by re-adding `.hidden`
    - Does not use `alert()` or block user interaction
    - _Requirements: 2.4, 2.8, 5.4, 5.5, 5.6_

- [x] 10. Implement JavaScript — Event Handlers and Initialization
  - [x] 10.1 Implement `handleFormSubmit(event)`
    - Calls `event.preventDefault()`
    - Reads form values; calls `validateForm`; if invalid, sets `.error` span text content for each errored field and returns
    - If valid: clears all `.error` spans, creates Transaction object with `generateId()`, `Date.now()`, pushes to `transactions`
    - Calls `saveToStorage(transactions)`; on failure, shows warning but retains in-memory state
    - Calls `renderAll()`; resets form fields to default empty/unselected state
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 5.1_

  - [x] 10.2 Implement `handleDeleteTransaction(id)`
    - Finds transaction by `id` in `transactions`; removes it
    - Calls `saveToStorage(transactions)`; on failure, re-adds the transaction to `transactions` (rollback) and calls `renderAll()` to reflect retention
    - On success, calls `renderAll()`
    - _Requirements: 2.7, 2.8, 5.2_

  - [ ]* 10.3 Write property test for delete operation (Property 4)
    - **Property 4: Delete removes the target transaction and no other**
    - For arbitrary non-empty transaction lists and arbitrary target transaction `T`, after calling the delete logic, assert `T` is absent and all other transactions are present and unchanged; assert serialized Storage reflects the removal
    - **Validates: Requirements 2.7, 5.2**

  - [x] 10.4 Implement `init()` and wire up event listeners
    - `init()`: calls `loadFromStorage()`, assigns result to `transactions`, calls `renderAll()`
    - Attaches `handleFormSubmit` to `#transaction-form` `submit` event
    - Attaches a delegated click handler on `#transaction-list` that detects clicks on delete buttons (via `data-id` attribute) and calls `handleDeleteTransaction(id)`
    - Calls `init()` inside a `DOMContentLoaded` listener
    - _Requirements: 2.2, 5.3, 7.2_

- [x] 11. Checkpoint — verify full end-to-end add/delete flows
  - Open `index.html` directly via `file://` in a browser
  - Add transactions of each category; confirm list, balance, and chart all update within the time bounds specified in Requirements 3.2, 4.2, 7.2
  - Delete a transaction; confirm list, balance, and chart update correctly
  - Reload the page; confirm transactions are restored from Local Storage
  - Confirm no uncaught JavaScript errors in the browser console
  - _Requirements: 1.2, 2.2, 2.7, 3.2, 3.3, 4.2, 4.3, 5.3, 7.1, 7.2, 7.4_

- [x] 12. Wire error and edge-case handling
  - [x] 12.1 Handle Storage unavailable on load
    - Simulate by overriding `localStorage.getItem` to throw; confirm non-blocking warning appears and app starts with empty state without overwriting Storage
    - Confirm add/delete operations still work in-memory for the session
    - _Requirements: 2.4, 5.4_

  - [x] 12.2 Handle corrupted Storage data on load
    - Simulate by writing an invalid JSON string to `localStorage.etv_transactions`; confirm non-blocking warning appears and app starts with empty state without overwriting the corrupted key
    - _Requirements: 5.6_

  - [x] 12.3 Handle Storage write failure on add and delete
    - Simulate by overriding `localStorage.setItem` to throw; confirm non-blocking warning appears; confirm new transaction remains in the UI on add failure; confirm deleted transaction is re-added to the UI on delete failure
    - _Requirements: 2.8, 5.5_

  - [x] 12.4 Handle Chart.js CDN load failure
    - Simulate by renaming/removing the Chart.js `<script>` tag or blocking it in devtools; confirm chart section shows a static error message and the rest of the app (form, list, balance) continues to function
    - _Requirements: 7.1_

- [x] 13. Final checkpoint — cross-browser compatibility verification
  - Open `index.html` via `file://` or a static file server in the current stable versions of Chrome, Firefox, Edge, and Safari
  - Confirm all four UI regions render correctly and all interactions produce no uncaught JavaScript errors
  - Confirm page loads fully interactive UI within 3 seconds on a standard desktop device
  - _Requirements: 7.1, 7.4_

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP delivery
- Property tests (6.3, 6.6, 6.9, 7.3, 8.3, 10.3) require a PBT library such as [fast-check](https://github.com/dubzzz/fast-check); they can be run in Node.js or loaded in the browser with a minimal test harness
- The entire app must run via `file://` with no build step — do not introduce `npm`, `webpack`, or any compilation step
- Chart.js is the **only** permitted external dependency, loaded via CDN `<script>` tag
- All Storage calls must be wrapped in `try/catch` — never assume Local Storage is available
- `renderAll()` is always called after `saveToStorage()`, never before — Storage write ordering is required by Requirements 5.1 and 5.2
- Delete rollback (re-adding transaction on Storage write failure) is intentional per the design's error handling table

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["5.1"] },
    { "id": 1, "tasks": ["6.1", "6.2", "6.4", "6.5", "6.7", "6.8"] },
    { "id": 2, "tasks": ["6.3", "6.6", "6.9", "7.1", "7.2"] },
    { "id": 3, "tasks": ["7.3", "8.1", "8.2", "8.4", "9.1"] },
    { "id": 4, "tasks": ["8.3", "8.5"] },
    { "id": 5, "tasks": ["10.1", "10.2"] },
    { "id": 6, "tasks": ["10.3", "10.4"] },
    { "id": 7, "tasks": ["12.1", "12.2", "12.3", "12.4"] }
  ]
}
```
