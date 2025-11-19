import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import * as XLSX from "xlsx";
import { saveWorkbook } from "../../../lib/workbooksStore.js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing workbook file." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });

    if (!workbook.SheetNames.length) {
      return NextResponse.json({ error: "Uploaded workbook is empty." }, { status: 400 });
    }

    const workbookId = randomUUID();
    const sheets = workbook.SheetNames.map((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const parsedRows = XLSX.utils.sheet_to_json(worksheet, { defval: null });

      const trackedRows = parsedRows.map((row, index) => ({
        rowNumber: index + 2,
        row,
        text: Object.entries(row)
          .map(([key, value]) => `${key}: ${value ?? ""}`)
          .join(" ")
          .toLowerCase(),
      }));

      const columns = Array.from(
        parsedRows.reduce((set, row) => {
          Object.keys(row).forEach((key) => set.add(key));
          return set;
        }, new Set())
      );

      return {
        sheetName,
        columns,
        rows: trackedRows,
      };
    });

    saveWorkbook({
      id: workbookId,
      fileName: file.name ?? "uploaded.xlsx",
      sheets,
      uploadedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      workbookId,
      fileName: file.name ?? "uploaded.xlsx",
      sheetNames: sheets.map((sheet) => sheet.sheetName),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to process workbook." }, { status: 500 });
  }
}