"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeWorkbookTitleForLookup = normalizeWorkbookTitleForLookup;
exports.parseApprovedWorkbook = parseApprovedWorkbook;
const XLSX = __importStar(require("xlsx"));
function cleanCell(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
}
function normalizeTitleForDisplay(title) {
    return cleanCell(title).replace(/\s*:\s*/g, " : ");
}
function normalizeWorkbookTitleForLookup(title) {
    return normalizeTitleForDisplay(title).toLowerCase();
}
function parseApprovedWorkbook(workbookPath) {
    const workbook = XLSX.readFile(workbookPath, { cellDates: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        throw new Error(`No worksheet was found in ${workbookPath}.`);
    }
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false
    });
    const cases = [];
    let currentTitle = "";
    let currentCase = null;
    for (const row of rows) {
        const titleCell = cleanCell(row["Title"]);
        const actionCell = cleanCell(row["Step Action"]);
        const resultCell = cleanCell(row["Step Result"]);
        if (titleCell) {
            currentTitle = normalizeTitleForDisplay(titleCell);
            currentCase = {
                caseOrdinal: cases.length + 1,
                sourceTitle: currentTitle,
                title: currentTitle,
                manualSteps: []
            };
            cases.push(currentCase);
        }
        if (!currentCase && currentTitle) {
            currentCase = {
                caseOrdinal: cases.length + 1,
                sourceTitle: currentTitle,
                title: currentTitle,
                manualSteps: []
            };
            cases.push(currentCase);
        }
        if (!currentCase) {
            continue;
        }
        if (actionCell || resultCell) {
            currentCase.manualSteps.push({
                action: actionCell,
                expected: resultCell
            });
        }
    }
    return {
        workbookPath,
        sheetName,
        testCases: cases.filter((item) => item.sourceTitle && item.manualSteps.length > 0)
    };
}
