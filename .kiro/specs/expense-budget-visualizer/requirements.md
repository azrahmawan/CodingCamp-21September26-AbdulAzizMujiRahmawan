# Requirements Document

## Introduction

The Expense and Budget Visualizer is a client-side web application that allows users to track personal expenses, categorize spending, and visualize budget distribution through an interactive pie chart. The app requires no backend server, stores all data in the browser's Local Storage, and is built with HTML, CSS, and Vanilla JavaScript only. It can function as a standalone web page or as a browser extension.

## Glossary

- **App**: The Expense and Budget Visualizer web application.
- **Transaction**: A single expense entry consisting of an item name, a monetary amount, and a category.
- **Transaction_List**: The scrollable UI component that displays all recorded transactions.
- **Input_Form**: The UI form component used to create new transactions.
- **Category**: A predefined spending classification applied to a transaction. Valid values are: Food, Transport, Fun.
- **Balance_Display**: The UI component at the top of the App that shows the sum of all transaction amounts.
- **Pie_Chart**: The visual chart component that shows spending distribution broken down by category.
- **Storage**: The browser's Local Storage API used to persist transaction data on the client side.
- **Validator**: The client-side logic responsible for verifying that all required input fields are filled before a transaction is submitted.

---

## Requirements

### Requirement 1: Transaction Input Form

**User Story:** As a user, I want to fill in an item name, amount, and category and submit the form, so that I can record a new expense transaction.

#### Acceptance Criteria

1. THE Input_Form SHALL provide a text field for the item name (maximum 100 characters), a numeric field for the amount, and a dropdown selector for the category with the options Food, Transport, and Fun.
2. WHEN the user submits the Input_Form with all fields filled, THE App SHALL add a new Transaction to the Transaction_List and persist it to Storage.
3. WHEN the user submits the Input_Form, THE Validator SHALL verify that the item name field is not empty, the amount field contains a numeric value between 0.01 and 999,999,999.99 inclusive, and a category has been selected.
4. IF the Validator detects that one or more required fields are empty or invalid, THEN THE Input_Form SHALL display an inline error message for each missing or invalid field and SHALL NOT add a Transaction to the Transaction_List.
5. WHEN a Transaction is successfully added, THE Input_Form SHALL reset the text field to empty, the amount field to empty, and the dropdown selector to its unselected default state.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see a scrollable list of all my recorded transactions, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all persisted Transactions, each showing the item name (up to 100 characters), amount formatted to 2 decimal places with a currency symbol, and category.
2. WHEN the App loads in the browser, THE Transaction_List SHALL retrieve and render all Transactions previously saved in Storage within 2 seconds of page load.
3. WHEN the Transaction_List contains no Transactions, THE Transaction_List SHALL display an empty state message indicating no transactions have been recorded.
4. IF Storage is unavailable when the App loads, THEN THE App SHALL display a non-blocking warning message and render the Transaction_List in an empty state.
5. WHILE the number of Transactions exceeds the visible area of the Transaction_List, THE Transaction_List SHALL remain scrollable to allow access to all entries.
6. THE Transaction_List SHALL provide a delete control for each Transaction entry.
7. WHEN the user activates the delete control for a Transaction, THE App SHALL remove that Transaction from the Transaction_List and delete it from Storage.
8. IF a Storage delete operation fails, THEN THE App SHALL display a non-blocking warning message indicating the change could not be saved, and retain the Transaction in the Transaction_List.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total spending balance prominently at the top of the page, so that I always know my current cumulative expense total.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of the amounts of all Transactions currently in the Transaction_List, where each Transaction amount is treated as a positive addend regardless of sign.
2. WHEN a new Transaction is added, THE Balance_Display SHALL update to reflect the new total within 500 milliseconds without requiring a page reload.
3. WHEN a Transaction is deleted, THE Balance_Display SHALL update to reflect the new total within 500 milliseconds without requiring a page reload.
4. WHEN the Transaction_List is empty, THE Balance_Display SHALL display a numeric value of 0.
5. THE Balance_Display SHALL format the total as a numeric value rounded to 2 decimal places.

---

### Requirement 4: Spending Distribution Pie Chart

**User Story:** As a user, I want to see a pie chart of my spending broken down by category, so that I can quickly understand where my money is going.

#### Acceptance Criteria

1. THE Pie_Chart SHALL display each Category's percentage of total spending, calculated as (category total / sum of all Transaction amounts) x 100, rounded to one decimal place, for every Category that has at least one Transaction with an amount greater than zero.
2. WHEN a new Transaction is added, THE Pie_Chart SHALL update to reflect the new category distribution within 1 second without requiring a page reload.
3. WHEN a Transaction is deleted, THE Pie_Chart SHALL update to reflect the revised category distribution within 1 second without requiring a page reload.
4. WHEN the Transaction_List is empty, THE Pie_Chart SHALL display a placeholder state with a message indicating no spending data is available, replacing all segments.
5. THE Pie_Chart SHALL render each Category segment in a color that is visually distinguishable from all other simultaneously displayed segments.
6. IF two or more Categories share the same name, THEN THE Pie_Chart SHALL treat them as a single Category and aggregate their Transaction amounts into one segment.
7. IF a Transaction amount is zero or negative, THEN THE Pie_Chart SHALL exclude that Transaction from the category distribution calculation.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my transactions to be saved across browser sessions, so that I do not lose my expense history when I close or refresh the page.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE App SHALL write the updated Transaction collection to Storage immediately, completing the write before the Transaction_List, Balance_Display, and Pie_Chart are re-rendered.
2. WHEN a Transaction is deleted, THE App SHALL write the updated Transaction collection to Storage immediately, completing the write before the Transaction_List, Balance_Display, and Pie_Chart are re-rendered.
3. WHEN the App loads, THE App SHALL read all Transactions from Storage and restore them before rendering the Transaction_List, Balance_Display, and Pie_Chart.
4. IF Storage is unavailable or returns a read error, THEN THE App SHALL display a non-blocking warning message indicating that saved data could not be loaded, and operate with an empty Transaction collection for the current session without overwriting existing Storage data.
5. IF a write to Storage fails after a Transaction is added or deleted, THEN THE App SHALL display a non-blocking warning message indicating that the change could not be saved, and retain the in-memory Transaction collection in its updated state for the current session.
6. IF Storage contains data that is not a valid Transaction collection, THEN THE App SHALL discard the corrupted data, display a non-blocking warning message indicating that saved data was unreadable, and operate with an empty Transaction collection for the current session without overwriting the existing Storage data.

---

### Requirement 6: File and Code Structure

**User Story:** As a developer, I want the project to follow a strict file structure, so that the codebase remains clean, readable, and easy to maintain.

#### Acceptance Criteria

1. THE App SHALL contain exactly one CSS file located inside a `css/` directory, and that CSS file SHALL be the sole source of all style declarations for the App.
2. THE App SHALL contain exactly one JavaScript file located inside a `js/` directory, and that JavaScript file SHALL be the sole source of all script logic for the App.
3. THE App SHALL be structured as a single HTML entry point file at the root of the project that references the single CSS file via a `<link>` element and the single JavaScript file via a `<script>` element, with no inline `<style>` blocks or inline `<script>` blocks containing application logic.
4. THE App SHALL require no build tools, package manager setup, or backend server to run in a modern browser, meaning all files SHALL be openable directly via the `file://` protocol or a static file server without any compilation, transpilation, or dependency installation step.
5. IF the App contains any CSS file outside the `css/` directory or any JavaScript file outside the `js/` directory, THEN THE App SHALL be considered non-conformant to this structure requirement.

---

### Requirement 7: Browser Compatibility and Performance

**User Story:** As a user, I want the app to load quickly and respond without lag in any modern browser, so that I have a smooth experience regardless of the browser I use.

#### Acceptance Criteria

1. THE App SHALL render all UI components, accept all user interactions, and produce no uncaught JavaScript errors in the current stable versions of Chrome, Firefox, Edge, and Safari.
2. WHEN the user clicks the button to confirm adding or deleting a Transaction, THE App SHALL update the Transaction_List, Balance_Display, and Pie_Chart within 100 milliseconds of receiving that click event.
3. THE App SHALL operate as a standalone web page where all assets and logic are self-contained, requiring no network requests to a server or external host at runtime.
4. WHEN the user opens the App in a browser, THE App SHALL display the fully interactive UI within 3 seconds on a standard desktop device with a broadband connection.
