import { NextRequest } from "next/server";
import PDFDocument from "pdfkit";
import type PDFKit from "pdfkit";

import { getIncomeStatementData } from "@/lib/report-data";
import { formatCurrency } from "@/lib/report-utils";
import { getBusinessContext } from "@/lib/business-context";

function streamToBuffer(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));
  });
}

export async function GET(request: NextRequest) {
  const { business } = await getBusinessContext();
  const period = request.nextUrl.searchParams.get("period");
  const report = await getIncomeStatementData(business.id, business.fiscalYearStartMonth, period);

  const doc = new PDFDocument({ size: "A4", margin: 48 });

  doc.fontSize(16).font("Helvetica-Bold").text("損益計算書");
  doc.moveDown(0.2);
  doc.fontSize(12).font("Helvetica").text(`${report.label} (${business.name})`);
  doc.moveDown(0.8);

  const columnWidths = [200, 120, 120];
  const headers = ["勘定科目", `${report.label}`, "年初来累計"];
  const startX = doc.x;
  let currentY = doc.y;

  doc.font("Helvetica-Bold");
  headers.forEach((header, index) => {
    doc.text(header, startX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), currentY, {
      width: columnWidths[index],
      align: index === 0 ? "left" : "right",
    });
  });
  currentY += 18;
  doc.moveTo(startX, currentY).lineTo(startX + columnWidths.reduce((a, b) => a + b, 0), currentY).stroke();
  currentY += 8;
  doc.font("Helvetica");

  const writeRow = (label: string, current: number | string, ytd: number | string, bold = false) => {
    if (currentY > 760) {
      doc.addPage();
      currentY = doc.y;
    }
    doc.font(bold ? "Helvetica-Bold" : "Helvetica");
    const values: (string | number)[] = [label, current, ytd];
    values.forEach((value, index) => {
      doc.text(
        typeof value === "number" ? formatCurrency(value) : value,
        startX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0),
        currentY,
        {
          width: columnWidths[index],
          align: index === 0 ? "left" : "right",
        }
      );
    });
    currentY += bold ? 20 : 18;
  };

  doc.font("Helvetica-Bold").text("売上高", startX, currentY);
  currentY += 18;
  report.rows
    .filter((row) => row.type === "REVENUE")
    .forEach((row) => {
      writeRow(`${row.code} ${row.name}`, row.current, row.yearToDate);
    });
  writeRow("売上高合計", report.totals.revenue, report.yearToDate.revenue, true);

  doc.moveDown(0.5);
  currentY = doc.y;
  doc.font("Helvetica-Bold").text("費用", startX, currentY);
  currentY += 18;
  report.rows
    .filter((row) => row.type === "EXPENSE")
    .forEach((row) => {
      writeRow(`${row.code} ${row.name}`, row.current, row.yearToDate);
    });
  writeRow("費用合計", report.totals.expense, report.yearToDate.expense, true);

  doc.moveDown(0.5);
  writeRow("当期純利益", report.totals.netIncome, report.yearToDate.netIncome, true);

  doc.end();
  const buffer = await streamToBuffer(doc);

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="income-statement-${period ?? "current"}.pdf"`,
    },
  });
}
