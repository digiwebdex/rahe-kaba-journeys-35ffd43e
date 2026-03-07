import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import logoImg from "@/assets/logo-nobg.png";
import QRCode from "qrcode";

const COMPANY_URL = "https://rahe-kaba-journeys.lovable.app";

async function generateCompanyQr(): Promise<string> {
  try {
    return await QRCode.toDataURL(COMPANY_URL, {
      width: 200, margin: 1,
      color: { dark: "#282E38", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    });
  } catch { return ""; }
}

function addQrToReport(doc: jsPDF, qrDataUrl: string) {
  if (!qrDataUrl) return;
  const pw = doc.internal.pageSize.getWidth();
  try { doc.addImage(qrDataUrl, "PNG", pw - 30, 6, 16, 16); } catch { /* skip */ }
}

interface ReportData {
  title: string;
  columns: string[];
  rows: (string | number)[][];
  summary?: string[];
}

let cachedLogoBase64: string | null = null;

async function loadLogoBase64(): Promise<string | null> {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const response = await fetch(logoImg);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedLogoBase64 = reader.result as string;
        resolve(cachedLogoBase64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function addLogoToDoc(doc: jsPDF, y: number, logoBase64: string | null): number {
  if (!logoBase64) return y;
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoW = 30;
  const logoH = 30;
  const logoX = (pageWidth - logoW) / 2;
  if (y + logoH + 10 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
    y = 20;
  }
  y += 8;
  try {
    doc.addImage(logoBase64, "PNG", logoX, y, logoW, logoH);
    y += logoH + 4;
  } catch { /* logo not available */ }
  return y;
}

export interface HajjiReportData {
  title: string;
  customers: {
    name: string;
    phone: string;
    passport: string;
    bookings: number;
    travelers: number;
    revenue: number;
    due: number;
    expenses: number;
    profit: number;
    bookingDetails: {
      trackingId: string;
      packageName: string;
      date: string;
      total: number;
      paid: number;
      due: number;
      status: string;
    }[];
  }[];
}

export async function exportPDF({ title, columns, rows, summary }: ReportData) {
  const logoBase64 = await loadLogoBase64();
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 25);

  const fmtCell = (val: string | number) =>
    typeof val === "number" ? `BDT ${val.toLocaleString("en-IN")}` : val;

  const formattedRows = rows.map(row => row.map(fmtCell));

  autoTable(doc, {
    head: [columns],
    body: formattedRows,
    startY: 30,
    styles: { fontSize: 8, font: "helvetica" },
    headStyles: { fillColor: [40, 46, 56], font: "helvetica", fontStyle: "bold" },
  });

  let y = (doc as any).lastAutoTable?.finalY + 10 || 50;

  // Summary footer
  if (summary && summary.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 20; }
    doc.setFillColor(40, 46, 56);
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.rect(14, y, pageWidth - 28, 8 * summary.length + 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    summary.forEach((line, i) => {
      doc.text(line, 18, y + 7 + i * 8);
    });
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    y += 8 * summary.length + 10;
  }

  addLogoToDoc(doc, y, logoBase64);
  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
}

export async function exportHajjiPDF({ title, customers }: HajjiReportData) {
  const logoBase64 = await loadLogoBase64();
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 25);

  let y = 30;
  const fmt = (n: number) => `BDT ${n.toLocaleString()}`;

  customers.forEach((c, idx) => {
    if (y > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(40, 46, 56);
    doc.rect(14, y, pageWidth - 28, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`${idx + 1}. ${c.name}`, 18, y + 7);
    doc.text(`Phone: ${c.phone} | Passport: ${c.passport}`, 120, y + 7);
    doc.setTextColor(0, 0, 0);
    y += 14;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Bookings: ${c.bookings} | Travelers: ${c.travelers} | Revenue: ${fmt(c.revenue)} | Due: ${fmt(c.due)} | Expenses: ${fmt(c.expenses)} | Profit: ${fmt(c.profit)}`, 18, y);
    y += 6;

    if (c.bookingDetails.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Tracking ID", "Package", "Date", "Total", "Paid", "Due", "Status"]],
        body: c.bookingDetails.map((b) => [
          b.trackingId, b.packageName, b.date,
          fmt(b.total), fmt(b.paid), fmt(b.due),
          b.status.charAt(0).toUpperCase() + b.status.slice(1),
        ]),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [60, 70, 85] },
        margin: { left: 18, right: 18 },
        theme: "grid",
      });
      y = (doc as any).lastAutoTable?.finalY + 10 || y + 30;
    } else {
      y += 6;
    }
  });

  if (y > doc.internal.pageSize.getHeight() - 30) {
    doc.addPage();
    y = 20;
  }
  const totals = customers.reduce(
    (acc, c) => ({
      bookings: acc.bookings + c.bookings, travelers: acc.travelers + c.travelers,
      revenue: acc.revenue + c.revenue, due: acc.due + c.due,
      expenses: acc.expenses + c.expenses, profit: acc.profit + c.profit,
    }),
    { bookings: 0, travelers: 0, revenue: 0, due: 0, expenses: 0, profit: 0 }
  );

  doc.setFillColor(40, 46, 56);
  doc.rect(14, y, pageWidth - 28, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Grand Total — Customers: ${customers.length} | Bookings: ${totals.bookings} | Travelers: ${totals.travelers} | Revenue: ${fmt(totals.revenue)} | Due: ${fmt(totals.due)} | Profit: ${fmt(totals.profit)}`, 18, y + 8);
  doc.setTextColor(0, 0, 0);
  y += 16;

  addLogoToDoc(doc, y, logoBase64);
  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
}

export function exportHajjiExcel({ title, customers }: HajjiReportData) {
  const rows: (string | number)[][] = [];
  rows.push(["Customer", "Phone", "Passport", "Bookings", "Travelers", "Revenue", "Due", "Expenses", "Profit"]);
  customers.forEach((c) => {
    rows.push([c.name, c.phone, c.passport, c.bookings, c.travelers, c.revenue, c.due, c.expenses, c.profit]);
  });
  rows.push([]);
  rows.push(["=== BOOKING DETAILS ==="]);
  rows.push([]);
  customers.forEach((c) => {
    rows.push([`Customer: ${c.name} (${c.phone})`]);
    rows.push(["Tracking ID", "Package", "Date", "Total", "Paid", "Due", "Status"]);
    c.bookingDetails.forEach((b) => {
      rows.push([b.trackingId, b.packageName, b.date, b.total, b.paid, b.due, b.status]);
    });
    rows.push([]);
  });
  rows.push([]);
  rows.push(["Rahe Kaba Tours & Travels"]);
  rows.push(["Phone: +880 1601-505050 | Email: rahekaba.info@gmail.com"]);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
  XLSX.writeFile(wb, `${title.replace(/\s+/g, "_")}.xlsx`);
}

export function exportExcel({ title, columns, rows, summary }: ReportData) {
  const wsData = [columns, ...rows];
  if (summary && summary.length > 0) {
    wsData.push([]);
    summary.forEach(line => wsData.push([line]));
  }
  wsData.push([]);
  wsData.push(["Rahe Kaba Tours & Travels"]);
  wsData.push(["Phone: +880 1601-505050 | Email: rahekaba.info@gmail.com"]);
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
  XLSX.writeFile(wb, `${title.replace(/\s+/g, "_")}.xlsx`);
}
