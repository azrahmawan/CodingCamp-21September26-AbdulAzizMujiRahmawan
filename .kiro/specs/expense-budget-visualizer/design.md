# Design Document: Expense and Budget Visualizer

## Overview

The Expense and Budget Visualizer is a fully client-side single-page web application built with HTML, CSS, and Vanilla JavaScript. It requires no build tools, no backend, and no package manager — the entire app is openable directly via `file://` or a static file server. All expense data is persisted in the browser's Local Storage, and a pie chart (rendered via Chart.js loaded from a CDN) visualizes spending distribution by category.

The app is structured around four visible UI regions: the Total Balance Display at the top, the Input Form for adding transactions, the Transaction List for reviewing and deleting entries, and the Pie Chart for visualizing category distribution. These four regions share a single in-memory transaction state array that acts as the source of truth; every add or delete operation mutates this array, writes it to Storage, then re-renders all four regions.

### Key Design Decisions

- **No frameworks** — DOM manipulation is done with plain `document.querySelector`, `createElement`, and `innerHTML` patterns. This keeps the bundle zero-dependency outside of Chart.js.
- **Chart.js via CDN** — loaded with a `<script>` tag in `index.html`. It is the only external dependency and requires no build step.
- **Single source of truth** — a module-level `transactions` array in `app.js` is the authoritative state. All UI renders derive from this array.
- **Storage-first write ordering** — per Requirement 5.1/5.2, Storage is written *before* re-rendering the UI on add/delete. A failed Storage write shows a non-blocking warning but does not roll back the in-memory state.
- **Vanilla module pattern** — `app.js` is organized as a set of pure utility functions (validation, storage, chart data calculation) and UI event handler functions, all within a single IIFE to avoid polluting the global scope.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    index.html                        │
│  ┌───────────────────────────────────────────────┐  │
│  │             Balance Display                   │  │
│  │  (reads from in-memory transactions array)    │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │               Input Form                      │  │
│  │  (validates → writes Storage → mutates state  │  │
│  │   → renders all four regions)                 │  │
│  └───────────────────────────────────────────────┘  │
│  ┌──────────────────────┐ ┌────────────────────────┐ │
│  │   Transaction List   │ │      Pie Chart         │ │
│  │  (renders from state)│ │  (Chart.js, CDN)       │ │
│  │  (delete → Storage   │ │  (renders from state)  │ │
│  │   → mutates state    │ │                        │ │
│  │   → renders all)     │ │                        │ │
│  └──────────────────────┘ └────────────────────────┘ │
└─────────────────────────────────────────────────────┘
         │                           ▲
         ▼                           │
  ┌──────────────┐         ┌──────────────────┐
  │ Local Storage│         │  Chart.js (CDN)  │
  │  (key: "etv" │         │  <script> tag    │
  │   JSON array)│         └──────────────────┘
  └──────────────┘
```

### Data Flow on Add Transaction

1. User fills form and clicks Submit.
2. Validator runs; errors are shown inline if invalid — stops here.
3. A new Transaction object is created.
4. `transactions.push(newTx)` mutates the in-memory array.
5. `saveToStorage(transactions)` writes JSON to Local Storage. On failure, a non-blocking warning is shown.
6. `renderAll()` — re-renders Balance Display, Transaction List, and Pie Chart in sequence.
7. Input Form is reset.

### Data Flow on Delete Transaction

1. User clicks delete button for a transaction.
2. Transaction is found by `id` and removed from `transactions` array.
3. `saveToStorage(transactions)` writes updated JSON to Local Storage. On failure, a non-blocking warning is shown and the transaction is re-added (rolled back in-memory for delete only — see Error Handling).
4. `renderAll()` re-renders all three display regions.

### Data Flow on Page Load

1. `loadFromStorage()` reads JSON from Local Storage.
2. If data is valid, it populates `transactions`.
3. If Storage is unavailable or data is corrupted, an appropriate non-blocking warning is shown and `transactions` is left empty.
4. `renderAll()` renders the initial UI state.

---

## Components and Interfaces

### File/Folder Structure

```
expense-budget-visualizer/
├── index.html          ← Single HTML entry point
├── css/
│   └── styles.css      ← All style declarations (sole CSS file)
└── js/
    └── app.js          ← All script logic (sole JavaScript file)
```

> Per Requirement 6: no other CSS or JS files may exist. No `node_modules`, no build output, no config files.

---

### index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Expense &amp; Budget Visualizer</title>
  <link rel="stylesheet" href="css/styles.css" />
</head>
<body>
  <!-- Balance Display region -->
  <header id="balance-display">
    <p>Total Balance</p>
    <span id="balance-amount">0.00</span>
  </header>

  <!-- Input Form region -->
  <section id="input-section">
    <form id="transaction-form" novalidate>
      <div class="field-group">
        <label for="item-name">Item Name</label>
        <input type="text" id="item-name" maxlength="100" />
        <span class="error" id="error-item-name"></span>
      </div>
      <div class="field-group">
        <label for="amount">Amount</label>
        <input type="number" id="amount" step="0.01" min="0.01" />
        <span class="error" id="error-amount"></span>
      </div>
      <div class="field-group">
        <label for="category">Category</label>
        <select id="category">
          <option value="">-- Select category --</option>
          <option value="Food">Food</option>
          <option value="Transport">Transport</option>
          <option value="Fun">Fun</option>
        </select>
        <span class="error" id="error-category"></span>
      </div>
      <button type="submit">Add Transaction</button>
    </form>
    <div id="storage-warning" class="warning hidden"></div>
  </section>

  <!-- Main content: list + chart -->
  <main id="main-content">
    <section id="transaction-section">
      <h2>Transactions</h2>
      <ul id="transaction-list"></ul>
    </section>
    <section id="chart-section">
      <h2>Spending by Category</h2>
      <canvas id="pie-chart"></canvas>
      <p id="chart-placeholder" class="hidden">No spending data available.</p>
    </section>
  </main>

  <!-- Chart.js from CDN — loaded as module so no global pollution -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

No inline `<style>` or `<script>` blocks with application logic are used (Requirement 6.3).

---

### css/styles.css

Responsibilities:
- Layout: CSS Grid or Flexbox for the two-column main area (list left, chart right).
- `Balance_Display` header at full width, prominently styled.
- `.error` spans are `color: red`, hidden by default, shown when non-empty.
- `.warning` banner is non-blocking (appears as a dismissible bar, not a modal).
- `.hidden` utility class sets `display: none`.
- Responsive: single-column layout on narrow viewports.
- Visually distinct category colors defined as CSS custom properties:
  - `--color-food: #FF6384`
  - `--color-transport: #36A2EB`
  - `--color-fun: #FFCE56`

---

### js/app.js

The entire script is wrapped in a single IIFE `(function () { ... })()` to avoid global scope pollution.

#### Internal Module Sections

```
app.js
├── Constants
│   ├── STORAGE_KEY
│   ├── CATEGORIES
│   └── CHART_COLORS
│
├── State
│   └── transactions []          ← in-memory source of truth
│   └── chartInstance            ← Chart.js Chart instance (or null)
│
├── Utility Functions (pure, no DOM side effects)
│   ├── generateId()             → string
│   ├── validateForm(name, amount, category) → { valid, errors }
│   ├── calcBalance(transactions) → number
│   ├── calcCategoryTotals(transactions) → { Food, Transport, Fun }
│   ├── formatAmount(number)     → string  (e.g. "$ 12.50")
│   └── isValidTransactionArray(data) → boolean
│
├── Storage Functions
│   ├── loadFromStorage()        → Transaction[] | null
│   └── saveToStorage(txs)       → { ok: boolean, error?: Error }
│
├── Render Functions (read from `transactions`, write to DOM)
│   ├── renderBalance()
│   ├── renderTransactionList()
│   ├── renderChart()
│   └── renderAll()              ← calls the three above in sequence
│
├── Warning / Error Functions
│   └── showWarning(message)
│
└── Event Handlers
    ├── handleFormSubmit(event)
    ├── handleDeleteTransaction(id)
    └── init()                   ← called on DOMContentLoaded
```

---

## Data Models

### Transaction Object

```js
{
  id: string,         // UUID-like unique identifier (generated via crypto.randomUUID() or Date.now() fallback)
  name: string,       // item name, 1–100 characters
  amount: number,     // positive float, 0.01–999999999.99
  category: string,   // "Food" | "Transport" | "Fun"
  createdAt: number   // Unix timestamp (Date.now()) for ordering
}
```

**Serialization:** The `transactions` array is serialized to JSON with `JSON.stringify(transactions)` and deserialized with `JSON.parse(raw)`. The result is validated with `isValidTransactionArray()` before use.

**Validation rules applied at deserialization:**
- Result must be an `Array`
- Each element must have `id` (string), `name` (non-empty string ≤ 100 chars), `amount` (finite number > 0), `category` ("Food" | "Transport" | "Fun"), `createdAt` (number)

Any element failing these rules causes the entire loaded dataset to be treated as corrupted (Requirement 5.6).

---

### Storage Layer

| Key | Type | Value |
|---|---|---|
| `"etv_transactions"` | JSON string | Serialized `Transaction[]` |

- **Read:** `localStorage.getItem("etv_transactions")` — may return `null` (no data) or throw (Storage unavailable).
- **Write:** `localStorage.setItem("etv_transactions", JSON.stringify(transactions))` — may throw (quota exceeded, Storage unavailable).
- **Delete entry:** `localStorage.removeItem("etv_transactions")` — not normally called; corrupted data is not overwritten (Requirement 5.4, 5.6).

All Storage calls are wrapped in `try/catch`.

```js
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!isValidTransactionArray(parsed)) {
      showWarning("Saved data was unreadable. Starting fresh.");
      return [];
    }
    return parsed;
  } catch (e) {
    showWarning("Could not load saved data.");
    return [];
  }
}

function saveToStorage(txs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(txs));
    return { ok: true };
  } catch (e) {
    showWarning("Changes could not be saved.");
    return { ok: false, error: e };
  }
}
```

---

### Chart.js Integration

The pie chart is managed through a single `chartInstance` variable.

**Initialization (first render with data):**
```js
chartInstance = new Chart(document.getElementById("pie-chart"), {
  type: "pie",
  data: {
    labels: ["Food", "Transport", "Fun"],
    datasets: [{
      data: [foodPct, transportPct, funPct],
      backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56"],
      borderWidth: 1
    }]
  },
  options: {
    responsive: true,
    plugins: {
      tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed.toFixed(1)}%` } }
    }
  }
});
```

**Update (subsequent renders):**
```js
chartInstance.data.datasets[0].data = [foodPct, transportPct, funPct];
chartInstance.update();
```

Destroying and recreating the chart on every render is avoided — `chartInstance.update()` is used to keep transitions smooth and avoid Chart.js memory leaks.

**Empty state:** When `transactions` is empty (or all amounts are ≤ 0), `chartInstance.destroy()` is called (if it exists), `chartInstance` is set to `null`, the `<canvas>` is hidden, and `#chart-placeholder` is shown.

**Category percentage calculation:**
```
categoryTotal(c) = sum of amounts for category c where amount > 0
total = sum of all categoryTotals
percentage(c) = (categoryTotal(c) / total) * 100, rounded to 1 decimal place
```
Categories with zero total are excluded from the chart (no segment shown), per Requirement 4.1.

---

### Input Form Validation

`validateForm(name, amount, category)` returns `{ valid: boolean, errors: { name?, amount?, category? } }`.

Rules:
- `name`: must be non-empty string after trimming; max 100 characters (enforced by HTML `maxlength` and validated in JS).
- `amount`: must be a finite number; `0.01 ≤ amount ≤ 999999999.99`.
- `category`: must be one of `["Food", "Transport", "Fun"]`.

Each error key maps to an error message string. `handleFormSubmit` sets the `textContent` of the corresponding `#error-*` spans. When valid, all error spans are cleared.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Form field missing or invalid | Inline error message shown per field; transaction not added. |
| Storage unavailable on load | Non-blocking warning shown; app starts with empty state; Storage not written. |
| Corrupted Storage data on load | Non-blocking warning shown; empty state used; Storage not overwritten. |
| Storage write fails on add | Non-blocking warning shown; in-memory state retains the new transaction (UI reflects it). |
| Storage write fails on delete | Non-blocking warning shown; in-memory transaction is **re-added** (rolled back) and UI re-rendered to reflect the retained transaction. This is conservative: data loss on delete failure is worse than UI inconsistency. |
| Chart.js CDN fails to load | Chart section falls back to a static error message: "Chart could not be loaded." — the rest of the app (form, list, balance) continues to function. |

**Non-blocking warning pattern:** `showWarning(message)` sets the `textContent` of `#storage-warning`, removes the `.hidden` class, and optionally auto-dismisses after 5 seconds. It does not use `alert()` or block user interaction.

---

## Testing Strategy

### Unit Tests

Unit tests target the pure utility functions in `app.js`. Because the project uses no build tools, tests can be run with a minimal test harness loaded in a browser or Node.js.

Key test cases:
- `validateForm`: empty name, whitespace-only name, name > 100 chars, amount = 0, amount = 0.001, amount = 999999999.99, amount = 1000000000, no category selected, all valid.
- `calcBalance`: empty array, single transaction, multiple transactions, amounts with floating-point edge cases.
- `calcCategoryTotals`: transactions with mixed categories, zero-amount transactions excluded, negative-amount transactions excluded.
- `isValidTransactionArray`: valid array, missing fields, wrong types, extra fields (should pass), non-array, null, corrupted JSON.
- `formatAmount`: 0 → "$ 0.00", 1.5 → "$ 1.50", 999999999.99 → "$ 999,999,999.99".

### Integration Tests (manual)

Manual browser tests verifying:
- Add a transaction → list, balance, and chart all update.
- Delete a transaction → list, balance, and chart all update.
- Reload page → transactions restored from Storage.
- Simulate Storage unavailable (override `localStorage.setItem` to throw) → warning shown, in-memory state retained.
- Open in Chrome, Firefox, Edge, and Safari — no uncaught errors.

### Property-Based Tests

See Correctness Properties section below. Property tests are implemented using a PBT library (e.g., [fast-check](https://github.com/dubzzz/fast-check) in Node.js or browser). Each test runs a minimum of 100 iterations and is tagged with the property it validates.


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

---

### Property 1: Validator correctly classifies all inputs

*For any* combination of `name` (arbitrary string), `amount` (arbitrary number), and `category` (arbitrary string), `validateForm(name, amount, category)` returns `valid = true` if and only if: `name` is a non-empty string (after trimming) with at most 100 characters, `amount` is a finite number in the range `[0.01, 999999999.99]`, and `category` is exactly one of `"Food"`, `"Transport"`, or `"Fun"`. For every input that fails at least one of these conditions, `valid = false` and the corresponding error key(s) are present.

**Validates: Requirements 1.3, 1.4**

---

### Property 2: Adding any valid transaction persists and restores it

*For any* valid transaction (arbitrary name ≤ 100 chars, arbitrary amount in `[0.01, 999999999.99]`, arbitrary valid category), adding it to the app's transaction collection, serializing the collection to Storage, then loading and deserializing from Storage yields a collection that contains a transaction equal to the one that was added.

**Validates: Requirements 1.2, 5.1, 5.3**

---

### Property 3: Transaction rendering is complete and contains all required fields

*For any* non-empty list of transactions, every rendered transaction element produced by the render function contains the transaction's `name`, its `amount` formatted to exactly 2 decimal places with a currency symbol, its `category`, and a delete control. No transaction in the list is omitted from the rendered output.

**Validates: Requirements 2.1, 2.6**

---

### Property 4: Delete removes the target transaction and no other

*For any* non-empty list of transactions and any transaction `T` in that list, after deleting `T`, the resulting transaction collection does not contain `T`, contains all other transactions unchanged, and the serialized collection written to Storage reflects this removal.

**Validates: Requirements 2.7, 5.2**

---

### Property 5: Balance is the sum of all transaction amounts

*For any* list of transactions (including the empty list), `calcBalance(transactions)` equals the arithmetic sum of `transaction.amount` for every transaction in the list, treating each amount as a positive addend. When the list is empty, the result is `0`. Additionally, `formatAmount(calcBalance(transactions))` produces a string with exactly 2 digits after the decimal point and includes a currency symbol.

**Validates: Requirements 3.1, 3.4, 3.5**

---

### Property 6: Category totals are correctly aggregated, excluding non-positive amounts

*For any* list of transactions (with arbitrary names, amounts, and categories), `calcCategoryTotals(transactions)` satisfies all of the following:
- The total for each category equals the sum of `amount` for all transactions in that category where `amount > 0`.
- Transactions with `amount ≤ 0` contribute zero to every category total.
- If multiple transactions share the same category name, their positive amounts are summed into one total.
- The resulting percentage for each category is `(categoryTotal / grandTotal) * 100` rounded to 1 decimal place, where `grandTotal` is the sum of all positive-amount category totals.
- A category with a total of `0` (no positive-amount transactions) is excluded from percentage output.

**Validates: Requirements 4.1, 4.6, 4.7**

---

### Property 7: Storage deserialization correctly accepts valid data and rejects invalid data

*For any* value `v` (arbitrary JSON-serializable value), `isValidTransactionArray(v)` returns `true` if and only if `v` is an array where every element has: `id` (string), `name` (non-empty string with length ≤ 100), `amount` (finite number `> 0`), `category` one of `"Food" | "Transport" | "Fun"`, and `createdAt` (number). For every other value — including `null`, non-arrays, arrays with malformed elements, arrays with missing fields, and arrays with out-of-range amounts — the function returns `false`.

**Validates: Requirements 5.6**

