const newman = require('newman');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// --- Configuration ---

const COLLECTION_FILE = 'A&H Policy API.postman_collection.json';
const DATA_FILE = 'data_prod/09_2025_HA_2025.csv'; 
const dataFileName = path.basename(DATA_FILE, path.extname(DATA_FILE));



const REPORT_FOLDER = 'report_csv';
const HTML_REPORT_FOLDER = 'report_html';

const START_ROW = process.argv[2] ? parseInt(process.argv[2]) : 1;
const END_ROW = process.argv[3] ? parseInt(process.argv[3]) : Infinity;
const rangeLabel = `${START_ROW}-${END_ROW === Infinity ? 'end' : END_ROW}`;
const PARENT_OUTPUT_FOLDER = 'output_json';
const OUTPUT_FOLDER = path.join(
    PARENT_OUTPUT_FOLDER, 
    `output_coverages_${dataFileName}_${rangeLabel}`
);
// Ensure directories exist
[PARENT_OUTPUT_FOLDER, OUTPUT_FOLDER, REPORT_FOLDER, HTML_REPORT_FOLDER].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

// Prepare HTML Report filename
const date = new Date();
const day = String(date.getDate()).padStart(2, '0');
const month = String(date.getMonth() + 1).padStart(2, '0');
const year = date.getFullYear();
const htmlReportPath = path.join(
    HTML_REPORT_FOLDER, 
    `report_${dataFileName}_${rangeLabel}_${day}-${month}-${year}.html`
);

// Variables
let currentPlanCode = "N/A";
let currentIiaOutsource = "";
let currentFirstName = ""; 
let currentLastName = "";  
let currentIiaMembership = "";
let currentPolicyNo = "";

// CSV report

const reportFileName = `report_${dataFileName}_${rangeLabel}_${day}-${month}-${year}.csv`;
const reportPath = path.join(REPORT_FOLDER, reportFileName);

fs.writeFileSync(reportPath, "policy number,iia membership,first name,last name,result,plan code,iia outsource,coverage result,coverage result file\n");

// --- Load CSV by range ---
function loadCsvByRange(filePath, startRow, endRow) {
    return new Promise((resolve, reject) => {
        const results = [];
        let currentIndex = 0;
        let resolved = false;

        const stream = fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', function (data) {
                currentIndex++;

                if (currentIndex >= startRow && currentIndex <= endRow) {
                    results.push(data);
                }

                if (currentIndex > endRow && !resolved) {
                    resolved = true;
                    stream.destroy();
                    resolve(results); 
                }
            })
            .on('end', () => {
                if (!resolved) {
                    resolve(results);
                }
            })
            .on('error', reject);
    });
}

// --- MAIN ---
(async () => {

	console.log(`Starting Coverage Test (Rows ${rangeLabel})...`);
    const iterationData = await loadCsvByRange(DATA_FILE, START_ROW, END_ROW);
    console.log("CSV Loaded:", iterationData.length);
	
    newman.run({
        collection: require(`./${COLLECTION_FILE}`),
        iterationData: iterationData,
        folder: "coverage prod",
        delayRequest: 1000,

        reporters: ['cli', 'htmlextra'], 
        reporter: {
            htmlextra: {
                export: htmlReportPath,
                title: 'A&H Coverage Test Report',
                darkTheme: true,
                showEnvironmentData: true,
                showGlobalData: true,
                logs: true
            }
        }

    })
    .on('beforeIteration', () => {
        currentPlanCode = "N/A";
        currentIiaOutsource = "";
        currentFirstName = "";
        currentLastName = "";
        currentIiaMembership = "";
        currentPolicyNo = "";
    })
    .on('request', (error, args) => {
        if (error) return;

        const url = args.request.url.toString();
        let jsonBody = {};

        try {
            jsonBody = JSON.parse(args.response.stream.toString());
        } catch (e) { return; }

        if (url.includes('/policy/detail')) {
            if (args.request.url.query && args.request.url.query.members) {
                args.request.url.query.members.forEach(param => {
                    if (param.key === 'iia_membership') currentIiaMembership = param.value;
                    if (param.key === 'policy_number') currentPolicyNo = param.value;
                });
            }

            if (jsonBody.status === 'success' && jsonBody.data) {
                if (jsonBody.data.policyDetails) {
                    currentPlanCode = jsonBody.data.policyDetails.planCode;
                    currentIiaOutsource = jsonBody.data.policyDetails.iiaOutsource;
                }
                if (jsonBody.data.member) {
                    currentFirstName = jsonBody.data.member.firstNameTh || "";
                    currentLastName = jsonBody.data.member.lastNameTh || "";
                }
            }
        }

        if (url.includes('/policy/coverages')) {
            const fileName = `${currentPolicyNo}_${currentIiaMembership}.json`;
            const filePath = path.join(OUTPUT_FOLDER, fileName);

            fs.writeFileSync(filePath, JSON.stringify(jsonBody, null, 4));

            let foundTypes = [];
            if (jsonBody.data) {
                Object.keys(jsonBody.data).forEach(key => {
                    if (Array.isArray(jsonBody.data[key]) && jsonBody.data[key].length > 0) {
                        foundTypes.push(key);
                    }
                });
            }

            const resultStatus = foundTypes.length > 0 ? "PASSED" : "FAILED";
            const coverageResult = foundTypes.length > 0
                ? `Found data coverage (${foundTypes.join(', ')})`
                : "Not found data coverage";

            const csvRow = `${currentPolicyNo},${currentIiaMembership},"${currentFirstName}","${currentLastName}",${resultStatus},${currentPlanCode},${currentIiaOutsource},"${coverageResult}",${fileName}\n`;
            fs.appendFileSync(reportPath, csvRow);

            console.log(`[Processed] ${currentPolicyNo} - ${currentIiaMembership} : ${resultStatus}`);
        }
    })
    .on('done', () => {
        console.log("----------------------------------------------------");
        console.log("Test run complete.");
        console.log(`JSON:  ${OUTPUT_FOLDER}`);
        console.log(`CSV:   ${reportPath}`);
        console.log(`HTML:  ${htmlReportPath}`);
        console.log("----------------------------------------------------");
    });

})();