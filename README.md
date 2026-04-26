# A&H Policy Coverage Automated Test

This project is an automated testing suite designed to verify Policy Coverages (IPD, OPD, PA, etc.) for the A&H Insurance system. It utilizes Postman, Newman, and Node.js to iterate through a list of customers, validate their coverage data against the API, and generate detailed reports.

## 🚀 Features

- **Automated Iteration**: Runs tests against a dataset of Policies and Citizen IDs.
- **Dynamic Coverage Validation**: Automatically detects if any coverage type (IPD, OPD, PA, etc.) exists in the response.
- **Data Extraction**: Captures Plan Code from policy details and maps it to the test result.
- **JSON Logging**: Saves the full raw JSON response for every individual request.
- **Dual Reporting**:
  - **CSV Report**: A consolidated summary file for easy spreadsheet analysis.
  - **HTML Report**: A visual dashboard (using htmlextra) for detailed run analysis.

## 📂 Project Structure

```
CoverageTest/
├── A&H Policy API.postman_collection.json     # Main Postman Collection
├── A&H UAT.postman_environment.json           # Environment Variables (if needed)
├── run_test.js                                # Main Node.js controller script
├── run_prod.sh                                # Shell script to execute the test
├── data_prod/
│   └── e.g. template.csv                      # Input Data File
├── output_json/                               # Output: Individual JSON files per user
├── report_csv/                                # Output: Summary CSV reports
└── report_html/                               # Output: Visual HTML reports
```

## 📋 Prerequisites

Before running the script, ensure you have the following installed:

- **Node.js** (v24 or higher)
- **npm** (Node Package Manager)

## ⚙️ Installation

1. Open your terminal in the project directory.

2. The `run_prod.sh` script automatically handles dependencies. However, you can manually install them using:

```bash
npm install newman newman-reporter-htmlextra
```

## 🏃‍♂️ How to Run

1. **Prepare your Data**: Ensure your CSV file is located at `data_prod/template.csv`. The CSV should contain the headers required by the Postman collection (e.g., `policyNo`, `iiaMembership`).

2. **Execute the Script**: Run the shell script to start the test:

```bash
./run_prod.sh
```

> **Note**: If you encounter a permission error (on macOS/Linux), run `chmod +x run_prod.sh` first.

## 📊 Output & Reports

After the execution finishes, you will find the results in the following folders:

### 1. JSON Files (`output_coverages/`)

- Each file represents a single test case.
- **Naming Convention**: `{finalPolicyNo}_{finalIiaMembership}.json`
- **Content**: The full JSON response from the `GET /policy/coverages` API.

### 2. CSV Report (`report/`)

A summary file named `report_dd-mm-yyyy.csv`.

**Columns**:
- `policy number`: The policy number tested.
- `id card`: The citizen ID tested.
- `result`: `PASSED` (if coverage exists) or `FAILED` (if `data: []`).
- `plan code`: Extracted from the Policy Detail API.
- `coverage result`: Details of found types, e.g., `Found data coverage (IPD, OPD)`.
- `coverage result file`: The filename of the saved JSON.

### 3. HTML Report (`report_html/`)

A graphical dashboard named `report_dd-mm-yyyy.html`. Open this file in any web browser to see charts, request details, and headers.

## 🛠️ Logic & Workflow

1. **Initialization**: The script sets up output directories.

2. **Iteration**: `newman` reads the CSV file and runs the collection for each row.

3. **Step 1: Get Policy Detail**:
   - The script intercepts the request to extract the Plan Code.

4. **Step 2: Get Coverage Data**:
   - The script sends the request.
   - **Postman Test**: Verifies if data exists and logs `[PASSED]` or `[FAILED]` in the console.
   - **Node.js Script**:
     - Saves the response body to a JSON file.
     - Scans the `data` object for any valid array (IPD, OPD, PA, etc.).
     - Records the result and specific coverage types found.

5. **Completion**: Generates the final CSV and HTML reports.

## 📝 Configuration

To change the input file or output locations, modify the **Configuration** section at the top of `run_test.js`:

```javascript
const COLLECTION_FILE = 'A&H Policy API.postman_collection.json';
const DATA_FILE = 'data_prod/template.csv'; // Change input file here
const dataFileName = path.basename(DATA_FILE, path.extname(DATA_FILE));
const PARENT_OUTPUT_FOLDER = 'output_json';
const OUTPUT_FOLDER = path.join(PARENT_OUTPUT_FOLDER, `output_coverages_${dataFileName}`);
const REPORT_FOLDER = 'report_csv';
const HTML_REPORT_FOLDER = 'report_html';
```

---

**Happy Testing!**
