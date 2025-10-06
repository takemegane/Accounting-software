import { NextRequest } from "next/server";
import PDFDocument from "pdfkit";
import type PDFKit from "pdfkit";

import { getTrialBalanceData } from "@/lib/report-data";
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
  const report = await getTrialBalanceData(business.id, business.fiscalYearStartMonth, period);

  const doc = new PDFDocument({ size: "A4", margin: 48 });

  doc.fontSize(16).font("Helvetica-Bold").text("試算表", { align: "left" });
  doc.moveDown(0.2);
  doc.fontSize(12).font("Helvetica").text(`${report.label} (${business.name})`);
  doc.moveDown(1);

  const headers = ["勘定科目", "期首残高", "借方", "貸方", "期末残高"];
  const columnWidths = [160, 90, 90, 90, 90];
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
  doc.font("Helvetica");

  report.rows.forEach((row) => {
    if (currentY > 760) {
      doc.addPage();
      currentY = doc.y;
    }
    const values = [
      `${row.code} ${row.name}`,
      formatCurrency(row.openingBalance),
      formatCurrency(row.debit),
      formatCurrency(row.credit),
      formatCurrency(row.closingBalance),
    ];
    values.forEach((value, index) => {
      doc.text(value, startX + columnWidths.slice(0, index).reduce((a, b) => a + b, 0), currentY + 4, {
        width: columnWidths[index],
        align: index === 0 ? "left" : "right",
      });
    });
    currentY += 20;
  });

  doc.moveDown(1);
  doc.font("Helvetica-Bold").text(`借方合計: ${formatCurrency(report.totals.debit)} 円`);
  doc.text(`貸方合計: ${formatCurrency(report.totals.credit)} 円`);

  doc.end();
  const buffer = await streamToBuffer(doc);

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="trial-balance-${period ?? "current"}.pdf"`,
    },
  });
}
