import { type IReceipt } from '@eta/types';

export class ReceiptGeneratorService {
  /**
   * Generates a printable vector SVG receipt artifact
   */
  static generateSVG(receipt: IReceipt): string {
    const formattedAmount = (receipt.amountMinor / 100).toFixed(2);
    const dateFormatted = new Date(receipt.paidAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
  <defs>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050B14" />
      <stop offset="100%" stop-color="#071B3B" />
    </linearGradient>
  </defs>

  <!-- Background Canvas -->
  <rect width="800" height="1000" fill="#FFFFFF" />

  <!-- Top Institutional Header -->
  <rect width="800" height="160" fill="url(#headerGrad)" />
  <rect x="0" y="156" width="800" height="4" fill="#16C4FF" />

  <text x="60" y="70" font-family="Helvetica, Arial, sans-serif" font-size="24" font-weight="bold" fill="#FFFFFF" letter-spacing="2">
    EXPLORATORY TRAINING ACADEMY
  </text>
  <text x="60" y="100" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="#16C4FF" letter-spacing="1">
    OFFICIAL ACADEMIC PAYMENT RECEIPT
  </text>
  <text x="60" y="125" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#94A3B8">
    Institutional Bursar &amp; Finance Office • Global Online Campus
  </text>

  <!-- Receipt Metadata Pill -->
  <rect x="540" y="45" width="200" height="70" rx="8" fill="#0A254D" stroke="#0B7CEB" stroke-width="1" />
  <text x="560" y="75" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#94A3B8">RECEIPT NUMBER</text>
  <text x="560" y="98" font-family="Courier, monospace" font-size="14" font-weight="bold" fill="#16C4FF">${receipt.receiptNumber}</text>

  <!-- Key Transaction Summary Cards -->
  <rect x="60" y="200" width="320" height="110" rx="8" fill="#F8FAFC" stroke="#E2E8F0" />
  <text x="80" y="230" font-family="Helvetica, Arial, sans-serif" font-size="10" font-weight="bold" fill="#64748B">STUDENT DETAILS</text>
  <text x="80" y="258" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="bold" fill="#071B3B">${escapeXml(receipt.studentName)}</text>
  <text x="80" y="280" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="#64748B">${escapeXml(receipt.studentEmail || 'Registered Student')}</text>

  <rect x="420" y="200" width="320" height="110" rx="8" fill="#F8FAFC" stroke="#E2E8F0" />
  <text x="440" y="230" font-family="Helvetica, Arial, sans-serif" font-size="10" font-weight="bold" fill="#64748B">TRANSACTION DETAILS</text>
  <text x="440" y="255" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="#334155">Date: <tspan font-weight="bold">${dateFormatted}</tspan></text>
  <text x="440" y="275" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="#334155">Method: <tspan font-weight="bold">${receipt.paymentMethod}</tspan></text>
  <text x="440" y="295" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="#334155">Payment ID: <tspan font-family="Courier">${receipt.paymentNumber}</tspan></text>

  <!-- Line Items Table -->
  <rect x="60" y="340" width="680" height="40" fill="#071B3B" rx="4" />
  <text x="80" y="365" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#FFFFFF">DESCRIPTION</text>
  <text x="480" y="365" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#FFFFFF">INVOICE REF</text>
  <text x="660" y="365" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#FFFFFF" text-anchor="end">PAID AMOUNT</text>

  <line x1="60" y1="430" x2="740" y2="430" stroke="#E2E8F0" />
  <text x="80" y="410" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="bold" fill="#071B3B">
    ${escapeXml(receipt.courseTitle ? `Tuition &amp; Fees — ${receipt.courseTitle}` : 'Academic Tuition &amp; Fees')}
  </text>
  <text x="480" y="410" font-family="Courier, monospace" font-size="12" fill="#334155">${receipt.invoiceNumber}</text>
  <text x="660" y="410" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="bold" fill="#073C84" text-anchor="end">
    ${receipt.currency} ${formattedAmount}
  </text>

  <!-- Total Summary Box -->
  <rect x="420" y="460" width="320" height="90" rx="8" fill="#F0FDF4" stroke="#86EFAC" stroke-width="1" />
  <text x="440" y="495" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="#166534">Total Amount Received</text>
  <text x="720" y="525" font-family="Helvetica, Arial, sans-serif" font-size="24" font-weight="bold" fill="#15803D" text-anchor="end">
    ${receipt.currency} ${formattedAmount}
  </text>

  <!-- Official Stamp & Verification Notice -->
  <rect x="60" y="600" width="680" height="120" rx="8" fill="#F8FAFC" stroke="#E2E8F0" stroke-dasharray="4" />
  <text x="80" y="635" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="#0B7CEB">
    ELECTRONIC FINANCIAL RECORD CONFIRMATION
  </text>
  <text x="80" y="660" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#64748B">
    This document serves as an authoritative electronic proof of payment issued by Exploratory Training Academy.
  </text>
  <text x="80" y="680" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#64748B">
    All transactions are recorded in the institutional ledger. Retain this receipt for your academic and financial records.
  </text>

  <!-- Authorized Signatory Stamp -->
  <circle cx="660" cy="820" r="50" fill="none" stroke="#073C84" stroke-width="2" stroke-dasharray="6,3" />
  <circle cx="660" cy="820" r="42" fill="none" stroke="#16C4FF" stroke-width="1" />
  <text x="660" y="815" font-family="Helvetica, Arial, sans-serif" font-size="9" font-weight="bold" fill="#073C84" text-anchor="middle">ETA FINANCE</text>
  <text x="660" y="830" font-family="Helvetica, Arial, sans-serif" font-size="8" fill="#0B7CEB" text-anchor="middle">OFFICIALLY PAID</text>

  <!-- Footer -->
  <text x="400" y="960" font-family="Helvetica, Arial, sans-serif" font-size="10" fill="#94A3B8" text-anchor="middle">
    Exploratory Training Academy • Finance Department • https://eta-academy.edu
  </text>
</svg>`;
  }

  /**
   * Generates a compliant PDF-1.4 binary buffer for receipt download
   */
  static generatePDFBuffer(receipt: IReceipt): Buffer {
    const studentName = cleanAscii(receipt.studentName || 'Student');
    const invoiceNumber = cleanAscii(receipt.invoiceNumber);
    const receiptNumber = cleanAscii(receipt.receiptNumber);
    const paymentNumber = cleanAscii(receipt.paymentNumber);
    const amountStr = `${receipt.currency} ${(receipt.amountMinor / 100).toFixed(2)}`;
    const dateStr = cleanAscii(new Date(receipt.paidAt).toLocaleDateString('en-US'));

    const pdfData = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>
endobj
4 0 obj
<< /Length 750 >>
stream
q
0 0 612 792 re W n
0.03 0.07 0.14 rg
0 680 612 112 re f
0.09 0.77 1.0 rg
0 676 612 4 re f
BT
/F1 18 Tf
1.0 1.0 1.0 rg
50 740 Td
(EXPLORATORY TRAINING ACADEMY) Tj
ET
BT
/F2 10 Tf
0.09 0.77 1.0 rg
50 715 Td
(OFFICIAL PAYMENT RECEIPT) Tj
ET
BT
/F1 12 Tf
0.03 0.11 0.23 rg
50 630 Td
(RECEIPT NO: ${receiptNumber}) Tj
ET
BT
/F2 10 Tf
0.2 0.2 0.3 rg
50 600 Td
(Student: ${studentName}) Tj
ET
BT
/F2 10 Tf
0.2 0.2 0.3 rg
50 575 Td
(Invoice: ${invoiceNumber}) Tj
ET
BT
/F2 10 Tf
0.2 0.2 0.3 rg
50 550 Td
(Payment Reference: ${paymentNumber}   |   Method: ${receipt.paymentMethod}) Tj
ET
BT
/F2 10 Tf
0.2 0.2 0.3 rg
50 525 Td
(Date of Payment: ${dateStr}) Tj
ET
0.03 0.11 0.23 rg
50 480 512 2 re f
BT
/F1 14 Tf
0.08 0.5 0.24 rg
50 440 Td
(Amount Paid: ${amountStr}) Tj
ET
BT
/F2 9 Tf
0.4 0.4 0.5 rg
50 380 Td
(Status: CONFIRMED - Record verified in institutional bursar ledger.) Tj
ET
BT
/F2 8 Tf
0.5 0.5 0.6 rg
200 80 Td
(Exploratory Training Academy  --  Finance & Bursar Administration) Tj
ET
Q
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000248 00000 n 
0000000850 00000 n 
0000000923 00000 n 
trailer
<< /Size 7 /Root 1 0 R >>
startxref
990
%%EOF`;

    return Buffer.from(pdfData, 'utf-8');
  }
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

function cleanAscii(str: string): string {
  return str.replace(/[^\x20-\x7E]/g, '');
}
