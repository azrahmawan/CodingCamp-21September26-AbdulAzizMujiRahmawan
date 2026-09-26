/* Expense & Budget Visualizer — app.js
   All script logic for the app lives here (Requirement 6.2).
   Wrapped in a single IIFE to avoid polluting the global scope.
*/
(function () {
  'use strict';

  // --- Constants (Task 5.1) ---
  const STORAGE_KEY = 'etv_transactions';
  const CATEGORIES = ['Food', 'Transport', 'Fun'];
  const CHART_COLORS = {
    Food: '#FF6384',
    Transport: '#36A2EB',
    Fun: '#FFCE56'
  };

  // --- Module-level State (Task 5.1) ---
  // Single source of truth for all transactions in memory (Requirement 4.5, 6.2)
  let transactions = [];
  // Holds the active Chart.js instance, or null when no chart is rendered
  let chartInstance = null;
  // Holds the active warning auto-dismiss timeout ID, or null when no warning is pending
  let warningTimeoutId = null;

  // --- Utility Functions ---

  /**
   * generateId() — returns a unique string ID for a new transaction.
   * Uses crypto.randomUUID() when available (modern browsers); falls back
   * to a Date.now() + Math.random() composite for older environments.
   * Requirement 1.2
   */
  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback: timestamp + random hex suffix
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 11);
  }

  /**
   * validateForm(name, amount, category) — validates the three form fields.
   * Returns { valid: boolean, errors: { name?, amount?, category? } }.
   * Requirements 1.3, 1.4
   *
   * @param {string} name
   * @param {*}      amount    — raw value from the input (may be string or number)
   * @param {string} category
   * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
   */
  function validateForm(name, amount, category) {
    const errors = {};

    // --- name ---
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (trimmedName.length === 0) {
      errors.name = 'Item name is required.';
    } else if (trimmedName.length > 100) {
      errors.name = 'Item name must be 100 characters or fewer.';
    }

    // --- amount ---
    const numericAmount = Number(amount);
    if (amount === '' || amount === null || amount === undefined || !isFinite(numericAmount)) {
      errors.amount = 'Amount must be a valid number.';
    } else if (numericAmount < 0.01 || numericAmount > 999999999.99) {
      errors.amount = 'Amount must be between 0.01 and 999,999,999.99.';
    }

    // --- category ---
    if (!CATEGORIES.includes(category)) {
      errors.category = 'Please select a valid category.';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * calcBalance(transactions) — returns the arithmetic sum of all transaction.amount values.
   * Returns 0 for an empty array.
   * Requirements 3.1, 3.4
   *
   * @param {Array<{amount: number}>} transactions
   * @returns {number}
   */
  function calcBalance(transactions) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return 0;
    }
    return transactions.reduce(function (sum, tx) {
      return sum + tx.amount;
    }, 0);
  }

  /**
   * calcCategoryTotals(transactions) — returns an object with the sum of positive
   * transaction amounts for each category.
   * Transactions with amount <= 0 contribute zero to any category total.
   * All three category keys are always present in the returned object (defaulting to 0).
   * Requirements 4.1, 4.6, 4.7
   *
   * @param {Array<{amount: number, category: string}>} transactions
   * @returns {{ Food: number, Transport: number, Fun: number }}
   */
  function calcCategoryTotals(transactions) {
    const totals = { Food: 0, Transport: 0, Fun: 0 };
    if (!Array.isArray(transactions)) {
      return totals;
    }
    transactions.forEach(function (tx) {
      if (tx.amount > 0 && Object.prototype.hasOwnProperty.call(totals, tx.category)) {
        totals[tx.category] += tx.amount;
      }
    });
    return totals;
  }

  /**
   * formatAmount(number) — formats a numeric value as a currency string.
   * Returns a string like "$ 1,234.50" — always 2 decimal places, with
   * comma separators for thousands.
   * Requirements 2.1, 3.5
   *
   * @param {number} number
   * @returns {string}
   */
  function formatAmount(number) {
    const formatted = Number(number).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return '$ ' + formatted;
  }

  /**
   * isValidTransactionArray(data) — returns true iff data is an Array where every
   * element is a well-formed Transaction object, or the array is empty.
   * Returns false for null, non-arrays, or arrays containing any malformed element.
   * Requirement 5.6
   *
   * A valid element must have:
   *   id        : string
   *   name      : non-empty string (trimmed length ≥ 1, length ≤ 100)
   *   amount    : finite number > 0
   *   category  : one of CATEGORIES ("Food" | "Transport" | "Fun")
   *   createdAt : number
   *
   * @param {*} data
   * @returns {boolean}
   */
  function isValidTransactionArray(data) {
    if (!Array.isArray(data)) {
      return false;
    }
    return data.every(function (tx) {
      if (tx === null || typeof tx !== 'object') {
        return false;
      }
      // id: must be a string
      if (typeof tx.id !== 'string') {
        return false;
      }
      // name: non-empty string, trimmed length ≥ 1, raw length ≤ 100
      if (typeof tx.name !== 'string' || tx.name.trim().length === 0 || tx.name.length > 100) {
        return false;
      }
      // amount: finite number strictly greater than 0
      if (typeof tx.amount !== 'number' || !isFinite(tx.amount) || tx.amount <= 0) {
        return false;
      }
      // category: must be one of the known categories
      if (!CATEGORIES.includes(tx.category)) {
        return false;
      }
      // createdAt: must be a number
      if (typeof tx.createdAt !== 'number') {
        return false;
      }
      return true;
    });
  }

  // --- Storage Functions ---

  /**
   * loadFromStorage() — reads the transaction list from Local Storage.
   * Returns the parsed array on success, or [] if the key is absent,
   * the data is invalid, or any error is thrown.
   * Never writes to or clears Storage — corrupted/unavailable data is left intact.
   * Requirements 2.2, 5.3, 5.4, 5.6
   *
   * @returns {Array}
   */
  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        // Key does not exist yet — normal first-run case
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!isValidTransactionArray(parsed)) {
        showWarning('Saved data was unreadable. Starting fresh.');
        return [];
      }
      return parsed;
    } catch (e) {
      // Either localStorage is unavailable, or JSON.parse failed
      showWarning('Could not load saved data.');
      return [];
    }
  }

  /**
   * saveToStorage(txs) — serialises txs to JSON and writes it to Local Storage
   * under STORAGE_KEY.
   * Returns { ok: true } on success.
   * Returns { ok: false, error } and calls showWarning on failure.
   * Requirements 5.1, 5.2, 5.5
   *
   * @param {Array} txs
   * @returns {{ ok: boolean, error?: Error }}
   */
  function saveToStorage(txs) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(txs));
      return { ok: true };
    } catch (e) {
      showWarning('Could not save data.');
      return { ok: false, error: e };
    }
  }

  // --- Render Functions ---

  /**
   * renderBalance() — reads module-level `transactions`, computes the balance,
   * formats it, and updates the #balance-amount element in the DOM.
   * Requirements 3.1, 3.2, 3.3, 3.4, 3.5
   */
  function renderBalance() {
    const balance = calcBalance(transactions);
    const formatted = formatAmount(balance);
    document.getElementById('balance-amount').textContent = formatted;
  }

  // --- Warning Function ---

  /**
   * showWarning(message) — displays a non-blocking warning banner to the user.
   * Sets the text content of #storage-warning and reveals it by removing the
   * `.hidden` class. Auto-dismisses after 5 seconds by re-adding `.hidden`.
   * Cancels any previously scheduled dismiss to avoid race conditions.
   * Does not use alert() or block user interaction.
   * Requirements 2.4, 2.8, 5.4, 5.5, 5.6
   *
   * @param {string} message
   */
  function showWarning(message) {
    const banner = document.getElementById('storage-warning');
    if (!banner) {
      return;
    }

    // Cancel any in-flight auto-dismiss so a new warning restarts the timer
    if (warningTimeoutId !== null) {
      clearTimeout(warningTimeoutId);
      warningTimeoutId = null;
    }

    banner.textContent = message;
    banner.classList.remove('hidden');

    warningTimeoutId = setTimeout(function () {
      banner.classList.add('hidden');
      warningTimeoutId = null;
    }, 5000);
  }

  /**
   * renderChart() — reads module-level `transactions`, computes per-category totals,
   * and either creates or updates the Chart.js pie chart.
   *
   * Behaviour:
   *   - If Chart.js is not available: replaces chart-section content with a static
   *     error message so the rest of the app is unaffected.
   *   - If all category totals are 0 (no positive-amount transactions): destroys any
   *     existing chartInstance, hides #pie-chart, shows #chart-placeholder.
   *   - If data exists and chartInstance is null: creates a new Chart instance.
   *   - If data exists and chartInstance already exists: updates datasets in-place
   *     and calls chartInstance.update() — never destroys/recreates.
   *
   * Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
   */
  function renderChart() {
    // Guard: Chart.js failed to load
    if (typeof Chart === 'undefined') {
      const section = document.getElementById('chart-section');
      if (section) {
        section.innerHTML = '<p>Chart unavailable.</p>';
      }
      return;
    }

    const totals = calcCategoryTotals(transactions);
    const { Food, Transport, Fun } = totals;

    const canvasEl = document.getElementById('pie-chart');
    const placeholderEl = document.getElementById('chart-placeholder');

    // No positive-amount transactions → show placeholder, hide chart
    if (Food === 0 && Transport === 0 && Fun === 0) {
      if (chartInstance !== null) {
        chartInstance.destroy();
        chartInstance = null;
      }
      if (canvasEl) canvasEl.classList.add('hidden');
      if (placeholderEl) placeholderEl.classList.remove('hidden');
      return;
    }

    // Data exists — ensure canvas is visible, placeholder is hidden
    if (canvasEl) canvasEl.classList.remove('hidden');
    if (placeholderEl) placeholderEl.classList.add('hidden');

    if (chartInstance === null) {
      // Create a new Chart instance
      chartInstance = new Chart(canvasEl, {
        type: 'pie',
        data: {
          labels: CATEGORIES,
          datasets: [
            {
              data: [Food, Transport, Fun],
              backgroundColor: [
                CHART_COLORS.Food,
                CHART_COLORS.Transport,
                CHART_COLORS.Fun
              ]
            }
          ]
        }
      });
    } else {
      // Update the existing chart in-place
      chartInstance.data.datasets[0].data = [Food, Transport, Fun];
      chartInstance.update();
    }
  }

  /**
   * renderTransactionList() — clears `#transaction-list` and re-renders every
   * transaction in `transactions` as a `<li>` containing:
   *   - a `.transaction-name` span
   *   - a `.transaction-amount` span (formatted via formatAmount)
   *   - a `.category-badge` span with a `data-category` attribute
   *   - a `.delete-btn` button with a `data-id` attribute
   *
   * When `transactions` is empty, renders a single empty-state `<li>`.
   * Requirements: 2.1, 2.2, 2.3, 2.6
   */
  function renderTransactionList() {
    const list = document.getElementById('transaction-list');
    if (!list) { return; }

    // Clear existing content
    list.innerHTML = '';

    if (transactions.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'empty-state';
      emptyItem.textContent = 'No transactions yet.';
      list.appendChild(emptyItem);
      return;
    }

    transactions.forEach(function (tx) {
      const li = document.createElement('li');

      const nameSpan = document.createElement('span');
      nameSpan.className = 'transaction-name';
      nameSpan.textContent = tx.name;

      const amountSpan = document.createElement('span');
      amountSpan.className = 'transaction-amount';
      amountSpan.textContent = formatAmount(tx.amount);

      const categorySpan = document.createElement('span');
      categorySpan.className = 'category-badge';
      categorySpan.setAttribute('data-category', tx.category);
      categorySpan.textContent = tx.category;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.setAttribute('data-id', tx.id);
      deleteBtn.textContent = 'Delete';

      li.appendChild(nameSpan);
      li.appendChild(amountSpan);
      li.appendChild(categorySpan);
      li.appendChild(deleteBtn);

      list.appendChild(li);
    });
  }

  /**
   * renderAll() — convenience function that triggers a full re-render of all
   * UI sections in sequence: balance, transaction list, and chart.
   * Requirements 3.2, 3.3, 4.2, 4.3
   */
  function renderAll() {
    renderBalance();
    renderTransactionList();
    renderChart();
  }

  // --- Event Handlers ---

  /**
   * handleDeleteTransaction(id) — removes the transaction with the given id from
   * the in-memory list, persists the change, and re-renders the UI.
   *
   * If storage fails, the transaction is rolled back into `transactions` and
   * renderAll() is called so the UI reflects the retained item.
   * saveToStorage() already calls showWarning() on failure, so no extra call is needed.
   *
   * Requirements 2.7, 2.8, 5.2
   *
   * @param {string} id
   */
  function handleDeleteTransaction(id) {
    // 1. Find the transaction to remove (kept for potential rollback)
    const removed = transactions.find(function (tx) { return tx.id === id; });

    // Guard: id not found — nothing to do
    if (!removed) { return; }

    // 2. Remove it from the in-memory list
    transactions = transactions.filter(function (tx) { return tx.id !== id; });

    // 3. Persist the updated list
    const result = saveToStorage(transactions);

    if (!result.ok) {
      // 4. Storage failed — roll back by re-adding the transaction
      transactions.push(removed);
    }

    // 5. Re-render regardless of outcome so UI matches current state
    renderAll();
  }

  /**
   * handleFormSubmit(event) — handles the transaction form's submit event.
   *
   * 1. Prevents the default browser form submission.
   * 2. Reads values from #item-name, #amount, and #category.
   * 3. Validates via validateForm(); on failure, writes error messages into the
   *    corresponding #error-* spans and returns early.
   * 4. On success, clears all error spans, creates a Transaction object, pushes
   *    it to the module-level `transactions` array, and persists via saveToStorage().
   *    A storage failure shows a warning but does NOT roll back the in-memory state.
   * 5. Calls renderAll() and resets the form to its default empty/blank state.
   *
   * Requirements: 1.2, 1.3, 1.4, 1.5, 5.1
   *
   * @param {Event} event
   */
  function handleFormSubmit(event) {
    event.preventDefault();

    const form = event.target;

    // --- Read raw form values ---
    const nameInput     = document.getElementById('item-name');
    const amountInput   = document.getElementById('amount');
    const categoryInput = document.getElementById('category');

    const rawName     = nameInput     ? nameInput.value     : '';
    const rawAmount   = amountInput   ? amountInput.value   : '';
    const rawCategory = categoryInput ? categoryInput.value : '';

    // --- Validate ---
    const result = validateForm(rawName, rawAmount, rawCategory);

    // Error span elements
    const errorName     = document.getElementById('error-item-name');
    const errorAmount   = document.getElementById('error-amount');
    const errorCategory = document.getElementById('error-category');

    if (!result.valid) {
      // Populate or clear each error span based on which fields failed
      if (errorName)     { errorName.textContent     = result.errors.name     || ''; }
      if (errorAmount)   { errorAmount.textContent   = result.errors.amount   || ''; }
      if (errorCategory) { errorCategory.textContent = result.errors.category || ''; }
      return;
    }

    // --- Valid: clear all error spans ---
    if (errorName)     { errorName.textContent     = ''; }
    if (errorAmount)   { errorAmount.textContent   = ''; }
    if (errorCategory) { errorCategory.textContent = ''; }

    // --- Build Transaction object (Requirement 1.2) ---
    const trimmedName   = rawName.trim();
    const numericAmount = Number(rawAmount);
    const transaction = {
      id:        generateId(),
      name:      trimmedName,
      amount:    numericAmount,
      category:  rawCategory,
      createdAt: Date.now()
    };

    // --- Commit to in-memory state ---
    transactions.push(transaction);

    // --- Persist (failure is non-fatal: in-memory state is already updated) ---
    saveToStorage(transactions);

    // --- Re-render and reset form ---
    renderAll();
    form.reset();
  }

  function init() {
    transactions = loadFromStorage();
    renderAll();
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Attach form submit handler
    const form = document.getElementById('transaction-form');
    if (form) {
      form.addEventListener('submit', handleFormSubmit);
    }

    // Attach delegated delete click handler on the list
    const list = document.getElementById('transaction-list');
    if (list) {
      list.addEventListener('click', function (event) {
        const btn = event.target.closest('.delete-btn');
        if (btn) {
          const id = btn.getAttribute('data-id');
          if (id) {
            handleDeleteTransaction(id);
          }
        }
      });
    }

    init();
  });
})();
