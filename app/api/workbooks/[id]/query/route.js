import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getWorkbook } from "../../../../../lib/workbooksStore.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILTER_PLAN_FUNCTION = {
  name: "set_filter_plan",
  description:
    "Translate the natural-language workbook question into structured filters and optional fallback keywords.",
  parameters: {
    type: "object",
    properties: {
      filters: {
        type: "array",
        items: {
          type: "object",
          properties: {
            sheetName: { type: "string" },
            limit: { type: "integer", minimum: 1, maximum: 50 },
            conditions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  column: { type: "string" },
                  operator: {
                    type: "string",
                    enum: [
                      "equals",
                      "not_equals",
                      "contains",
                      "not_contains",
                      "starts_with",
                      "ends_with",
                      "gt",
                      "gte",
                      "lt",
                      "lte",
                    ],
                  },
                  value: { type: ["string", "number", "boolean"] },
                },
                required: ["column", "operator", "value"],
              },
            },
          },
          required: ["sheetName"],
        },
      },
      keywords: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["filters"],
  },
};

const SUPPORTED_OPERATORS = new Set([
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "gt",
  "gte",
  "lt",
  "lte",
]);

function normalize(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  return String(value);
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function evaluateCondition(rawValue, condition) {
  if (!condition || !SUPPORTED_OPERATORS.has(condition.operator)) return true;

  const cell = normalize(rawValue);
  const target = normalize(condition.value);

  const cellLower = cell.toLowerCase();
  const targetLower = target.toLowerCase();

  const cellNumber = toNumber(rawValue);
  const targetNumber = toNumber(condition.value);

  switch (condition.operator) {
    case "equals":
      return cellLower === targetLower;
    case "not_equals":
      return cellLower !== targetLower;
    case "contains":
      return cellLower.includes(targetLower);
    case "not_contains":
      return !cellLower.includes(targetLower);
    case "starts_with":
      return cellLower.startsWith(targetLower);
    case "ends_with":
      return cellLower.endsWith(targetLower);
    case "gt":
      return cellNumber !== null && targetNumber !== null && cellNumber > targetNumber;
    case "gte":
      return cellNumber !== null && targetNumber !== null && cellNumber >= targetNumber;
    case "lt":
      return cellNumber !== null && targetNumber !== null && cellNumber < targetNumber;
    case "lte":
      return cellNumber !== null && targetNumber !== null && cellNumber <= targetNumber;
    default:
      return true;
  }
}

function applyFilters(workbook, plan) {
  if (!plan?.filters?.length) return [];

  const results = [];
  const seen = new Set();

  for (const filter of plan.filters) {
    const sheetName = filter.sheetName?.toString();
    if (!sheetName) continue;

    const sheet = workbook.sheets.find(
      (candidate) => candidate.sheetName.toLowerCase() === sheetName.toLowerCase()
    );
    if (!sheet) continue;

    const conditions = Array.isArray(filter.conditions) ? filter.conditions : [];
    const limit = Math.min(Math.max(filter.limit ?? 20, 1), 50);

    for (const entry of sheet.rows) {
      const matchesAll = conditions.every((condition) => {
        const columnName = condition.column?.toString();
        if (!columnName) return false;
        const value = entry.row[columnName];
        return evaluateCondition(value, condition);
      });

      if (!conditions.length || matchesAll) {
        const key = `${sheet.sheetName}:${entry.rowNumber}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            sheetName: sheet.sheetName,
            rowNumber: entry.rowNumber,
            row: entry.row,
          });
        }
      }

      if (results.length >= limit) break;
    }
  }

  return results;
}

function keywordSearch(workbook, keywords, cap = 50) {
  if (!keywords?.length) return [];

  const lowered = keywords
    .map((keyword) => keyword?.toString().toLowerCase().trim())
    .filter(Boolean);
  if (!lowered.length) return [];

  const scored = [];

  for (const sheet of workbook.sheets) {
    for (const entry of sheet.rows) {
      const score = lowered.reduce(
        (total, keyword) => total + (entry.text.includes(keyword) ? 1 : 0),
        0
      );
      if (score > 0) {
        scored.push({
          sheetName: sheet.sheetName,
          rowNumber: entry.rowNumber,
          row: entry.row,
          score,
        });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, cap).map(({ score: _score, ...rest }) => rest);
}

async function createFilterPlan(openai, query, workbookSummary) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "You build precise filter plans for Excel workbooks. " +
            "Use only provided sheet names and columns. " +
            "If unsure, return an empty filters array and optionally fallback keywords.",
        },
        {
          role: "user",
          content: JSON.stringify({ query, workbook: workbookSummary }),
        },
      ],
      functions: [FILTER_PLAN_FUNCTION],
      function_call: { name: FILTER_PLAN_FUNCTION.name },
    });

    const fnCall = response.choices?.[0]?.message?.function_call;
    if (!fnCall?.arguments) return null;

    const parsed = JSON.parse(fnCall.arguments);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    console.error("OpenAI plan generation failed:", error);
    return null;
  }
}

async function buildAnswer(openai, query, matches) {
  if (!matches?.length) {
    return "I couldn't find any matching rows for that request.";
  }

  const trimmed = matches.slice(0, 8).map((entry) => ({
    sheetName: entry.sheetName,
    rowNumber: entry.rowNumber,
    row: entry.row,
  }));

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You answer questions about Excel workbooks succinctly. " +
            "Respond with the precise information requested in no more than two sentences. " +
            "If a specific column is requested, return only that value. " +
            "Use bullet points only when multiple distinct rows must be reported.",
        },
        {
          role: "user",
          content: JSON.stringify({ query, matches: trimmed }),
        },
      ],
    });

    const content = response.choices?.[0]?.message?.content?.trim();
    return content || null;
  } catch (error) {
    console.error("OpenAI answer synthesis failed:", error);
    return null;
  }
}

export async function POST(request, context) {
  try {
    const params = (context && (await context.params)) ?? {};
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "Missing workbook id." }, { status: 400 });
    }

    const workbook = getWorkbook(id);
    if (!workbook) {
      return NextResponse.json({ error: "Workbook not found." }, { status: 404 });
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const query = payload?.query?.toString().trim();
    if (!query) {
      return NextResponse.json({ error: "Query is required." }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured on the server." },
        { status: 500 }
      );
    }

    const workbookSummary = workbook.sheets.map((sheet) => ({
      sheetName: sheet.sheetName,
      columns: sheet.columns,
      rowCount: sheet.rows.length,
      sampleRows: sheet.rows.slice(0, 8).map(({ rowNumber, row }) => ({
        rowNumber,
        row,
      })),
    }));

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const plan = await createFilterPlan(openai, query, workbookSummary);

    let matches = applyFilters(workbook, plan);
    if (!matches.length) {
      const fallbackKeywords =
        plan?.keywords?.length ? plan.keywords : query.split(/\s+/).slice(0, 6);
      matches = keywordSearch(workbook, fallbackKeywords, 50);
    }

    const total = matches.length;
    let summary = null;

    if (matches.length) {
      summary = await buildAnswer(openai, query, matches);
    } else {
      summary = "No matching rows were found for that request.";
    }

    if (!summary && matches.length) {
      const firstRow = matches[0]?.row ?? {};
      const preview = Object.entries(firstRow)
        .slice(0, 3)
        .map(([key, value]) => `${key}=${value ?? ""}`)
        .join(", ");
      summary = `Found ${total} matching row(s).${preview ? ` Sample: ${preview}` : ""}`;
    }

    return NextResponse.json({
      matches: matches.slice(0, 50),
      total,
      summary,
    });
  } catch (error) {
    console.error("Workbook query failed:", error);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Failed to process workbook query.",
      },
      { status: 500 }
    );
  }
}