import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface ReportData {
  title: string;
  columns: string[];
  rows: (string | number)[][];
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

export function exportPDF({ title, columns, rows }: ReportData) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 25);

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 30,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [40, 46, 56] },
  });

  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
}

export function exportHajjiPDF({ title, customers }: HajjiReportData) {
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
    // Check if we need a new page
    if (y > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      y = 20;
    }

    // Customer header
    doc.setFillColor(40, 46, 56);
    doc.rect(14, y, pageWidth - 28, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`${idx + 1}. ${c.name}`, 18, y + 7);
    doc.text(`Phone: ${c.phone} | Passport: ${c.passport}`, 120, y + 7);
    doc.setTextColor(0, 0, 0);
    y += 14;

    // Customer summary
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Bookings: ${c.bookings} | Travelers: ${c.travelers} | Revenue: ${fmt(c.revenue)} | Due: ${fmt(c.due)} | Expenses: ${fmt(c.expenses)} | Profit: ${fmt(c.profit)}`, 18, y);
    y += 6;

    // Booking details table
    if (c.bookingDetails.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Tracking ID", "Package", "Date", "Total", "Paid", "Due", "Status"]],
        body: c.bookingDetails.map((b) => [
          b.trackingId,
          b.packageName,
          b.date,
          fmt(b.total),
          fmt(b.paid),
          fmt(b.due),
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

  // Totals
  if (y > doc.internal.pageSize.getHeight() - 30) {
    doc.addPage();
    y = 20;
  }
  const totals = customers.reduce(
    (acc, c) => ({
      bookings: acc.bookings + c.bookings,
      travelers: acc.travelers + c.travelers,
      revenue: acc.revenue + c.revenue,
      due: acc.due + c.due,
      expenses: acc.expenses + c.expenses,
      profit: acc.profit + c.profit,
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

  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
}

export function exportHajjiExcel({ title, customers }: HajjiReportData) {
  const rows: (string | number)[][] = [];

  // Summary header
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

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
  XLSX.writeFile(wb, `${title.replace(/\s+/g, "_")}.xlsx`);
}

export function exportExcel({ title, columns, rows }: ReportData) {
  const wsData = [columns, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
  XLSX.writeFile(wb, `${title.replace(/\s+/g, "_")}.xlsx`);
}
