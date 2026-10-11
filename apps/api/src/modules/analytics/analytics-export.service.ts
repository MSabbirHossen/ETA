import { type IReportResult } from '@eta/types';
import { sanitizeCsvCell } from '@eta/validation';

function cleanAscii(str: string | number | boolean | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/[\\()]/g, '');
}

export class AnalyticsExportService {
  /**
   * Generates a compliant RFC 4180 CSV export with UTF-8 BOM and formula injection protection (PRD §55).
   */
  public static exportCsv(report: IReportResult): string {
    const lines: string[] = [];

    // UTF-8 BOM for Microsoft Excel / Sheets compatibility
    const BOM = '\uFEFF';

    // Header Metadata Banner
    lines.push(`# ETA ACADEMY REPORT: ${sanitizeCsvCell(report.metadata.title)}`);
    lines.push(`# Generated At: ${sanitizeCsvCell(report.metadata.generatedAt)}`);
    lines.push(`# Date Range: ${sanitizeCsvCell(report.metadata.dateRange.from)} to ${sanitizeCsvCell(report.metadata.dateRange.to)}`);
    lines.push(`# Total Rows: ${report.metadata.totalRows}`);
    lines.push('');

    // Column Headers
    const headerLine = report.headers.map((h) => sanitizeCsvCell(h)).join(',');
    lines.push(headerLine);

    // Data Rows
    for (const row of report.rows) {
      const rowValues = report.columns.map((colKey) => sanitizeCsvCell(row[colKey]));
      lines.push(rowValues.join(','));
    }

    return BOM + lines.join('\r\n');
  }

  /**
   * Generates a compliant PDF-1.4 binary buffer for printable reporting (PRD §55).
   */
  public static exportPdf(report: IReportResult): Buffer {
    const title = cleanAscii(report.metadata.title);
    const dateRange = cleanAscii(`${report.metadata.dateRange.from.split('T')[0]} to ${report.metadata.dateRange.to.split('T')[0]}`);
    const generatedAt = cleanAscii(new Date(report.metadata.generatedAt).toLocaleDateString('en-US'));
    const totalRowsStr = cleanAscii(String(report.metadata.totalRows));

    // Prepare table text lines (capped at 25 rows per page summary)
    const displayRows = report.rows.slice(0, 25);
    const textCommands: string[] = [];

    // Table Header
    const colHeaderStr = report.headers.slice(0, 5).map((h) => cleanAscii(h).padEnd(16)).join(' ');
    textCommands.push('BT /F2 8 Tf 0.09 0.77 1.0 rg 40 610 Td (' + colHeaderStr + ') Tj ET');

    // Separator line
    textCommands.push('0.2 0.3 0.4 rg 40 602 532 1 re f');

    let currentY = 590;
    for (const row of displayRows) {
      const cellValues = report.columns.slice(0, 5).map((col) => {
        const val = cleanAscii(row[col]);
        return (val.length > 15 ? val.substring(0, 14) + '.' : val).padEnd(16);
      });
      const rowLine = cellValues.join(' ');
      textCommands.push(`BT /F2 8 Tf 0.9 0.9 0.9 rg 40 ${currentY} Td (${rowLine}) Tj ET`);
      currentY -= 16;
    }

    if (report.rows.length > 25) {
      textCommands.push(`BT /F2 8 Tf 0.6 0.6 0.6 rg 40 ${currentY} Td (... and ${report.rows.length - 25} more records) Tj ET`);
    }

    const streamContent = `q
0 0 612 792 re W n
0.03 0.07 0.14 rg
0 690 612 102 re f
0.09 0.77 1.0 rg
0 686 612 4 re f
BT
/F1 16 Tf
1.0 1.0 1.0 rg
40 750 Td
(EXPLORATORY TRAINING ACADEMY) Tj
ET
BT
/F1 12 Tf
0.09 0.77 1.0 rg
40 728 Td
(${title}) Tj
ET
BT
/F2 9 Tf
0.7 0.7 0.7 rg
40 706 Td
(Date Range: ${dateRange}  |  Generated: ${generatedAt}  |  Total Records: ${totalRowsStr}) Tj
ET
${textCommands.join('\n')}
BT
/F2 8 Tf
0.5 0.5 0.5 rg
40 30 Td
(Exploratory Training Academy - Official Institutional Analytics - Page 1 of 1) Tj
ET
Q`;

    const streamLength = Buffer.byteLength(streamContent, 'utf-8');

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
<< /Length ${streamLength} >>
stream
${streamContent}
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
0000000244 00000 n 
000000${String(300 + streamLength).padStart(4, '0')} 00000 n 
000000${String(380 + streamLength).padStart(4, '0')} 00000 n 
trailer
<< /Size 7 /Root 1 0 R >>
startxref
${450 + streamLength}
%%EOF`;

    return Buffer.from(pdfData, 'utf-8');
  }
}
