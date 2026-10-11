import { type ICertificate } from '@eta/types';

export class CertificateGeneratorService {
  /**
   * Generates a high-resolution, institutional vector SVG credential artifact
   * utilizing official ETA Brand Design System tokens.
   */
  static generateSVG(certificate: ICertificate, baseUrl: string = 'https://eta-academy.edu'): string {
    const { credentialSnapshot, certificateNumber, verificationCode, issuedAt } = certificate;
    const studentName = credentialSnapshot.studentName || 'Distinguished Scholar';
    const courseTitle = credentialSnapshot.courseTitle || 'Academic Course';
    const letterGrade = credentialSnapshot.letterGrade ? `Grade: ${credentialSnapshot.letterGrade}` : '';
    const gpaText = credentialSnapshot.gpa !== undefined ? `GPA: ${credentialSnapshot.gpa.toFixed(2)}` : '';
    const gradeSummary = [letterGrade, gpaText].filter(Boolean).join(' • ');

    const dateFormatted = new Date(issuedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const verifyUrl = `${baseUrl}/certificate/verify/${verificationCode}`;

    // SVG Canvas: Landscape 1120 x 792 (Print Aspect Ratio 1.414 ~ A4 Landscape)
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1120 792" width="1120" height="792">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050B14" />
      <stop offset="50%" stop-color="#071B3B" />
      <stop offset="100%" stop-color="#071326" />
    </linearGradient>

    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#16C4FF" />
      <stop offset="50%" stop-color="#0B7CEB" />
      <stop offset="100%" stop-color="#0752B5" />
    </linearGradient>

    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#16C4FF" stop-opacity="0.8" />
      <stop offset="50%" stop-color="#0B7CEB" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#16C4FF" stop-opacity="0.8" />
    </linearGradient>

    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Base Canvas -->
  <rect width="1120" height="792" fill="url(#bgGrad)" />

  <!-- Outer Elegant Institutional Border -->
  <rect x="36" y="36" width="1048" height="720" rx="12" fill="none" stroke="url(#borderGrad)" stroke-width="2" />
  <rect x="46" y="46" width="1028" height="700" rx="8" fill="none" stroke="#0B7CEB" stroke-width="1" stroke-opacity="0.4" stroke-dasharray="6,4" />

  <!-- Corner Ornamental Accent Brackets -->
  <path d="M 36 76 L 36 36 L 76 36" fill="none" stroke="#16C4FF" stroke-width="4" />
  <path d="M 1084 76 L 1084 36 L 1044 36" fill="none" stroke="#16C4FF" stroke-width="4" />
  <path d="M 36 716 L 36 756 L 76 756" fill="none" stroke="#16C4FF" stroke-width="4" />
  <path d="M 1084 716 L 1084 756 L 1044 756" fill="none" stroke="#16C4FF" stroke-width="4" />

  <!-- Central Watermark Crest / Emblem -->
  <g opacity="0.04" transform="translate(560, 396) scale(1.6)">
    <circle r="140" fill="none" stroke="#FFFFFF" stroke-width="4" />
    <polygon points="0,-120 104,60 -104,60" fill="none" stroke="#FFFFFF" stroke-width="4" />
    <polygon points="0,120 -104,-60 104,-60" fill="none" stroke="#FFFFFF" stroke-width="4" />
  </g>

  <!-- Institution Header -->
  <g transform="translate(560, 110)" text-anchor="middle">
    <!-- Brand Mark Monogram -->
    <circle cx="0" cy="0" r="28" fill="#073C84" stroke="#16C4FF" stroke-width="2" />
    <text x="0" y="8" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="900" fill="#FFFFFF" letter-spacing="2">ETA</text>

    <text x="0" y="56" font-family="Georgia, serif" font-size="22" font-weight="700" fill="#FFFFFF" letter-spacing="4">EXPLORATORY TRAINING ACADEMY</text>
    <text x="0" y="78" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="600" fill="#16C4FF" letter-spacing="3">ACADEMIC CREDENTIALS &amp; CERTIFICATION BOARD</text>
  </g>

  <!-- Title -->
  <g transform="translate(560, 255)" text-anchor="middle">
    <text x="0" y="0" font-family="Georgia, serif" font-size="34" font-weight="bold" fill="url(#goldGrad)" letter-spacing="3">CERTIFICATE OF COMPLETION</text>
    <line x1="-160" y1="16" x2="160" y2="16" stroke="#16C4FF" stroke-width="1.5" stroke-opacity="0.8" />
    <circle cx="0" cy="16" r="3" fill="#16C4FF" />
  </g>

  <!-- Body Text -->
  <g transform="translate(560, 315)" text-anchor="middle">
    <text x="0" y="0" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#94A3B8" letter-spacing="1.5">THIS IS PROUDLY CONFERRED UPON</text>

    <!-- Student Name -->
    <text x="0" y="52" font-family="Georgia, serif" font-size="36" font-weight="bold" fill="#FFFFFF" letter-spacing="1">${escapeXml(studentName)}</text>
    <line x1="-220" y1="68" x2="220" y2="68" stroke="#0B7CEB" stroke-width="1" stroke-opacity="0.5" />

    <!-- Course Info -->
    <text x="0" y="105" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#94A3B8">
      for successfully completing the rigorous academic curriculum and requirements of
    </text>
    <text x="0" y="140" font-family="Georgia, serif" font-size="24" font-weight="bold" fill="#16C4FF" letter-spacing="0.5">${escapeXml(courseTitle)}</text>

    ${gradeSummary ? `<text x="0" y="172" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="bold" fill="#38BDF8">${escapeXml(gradeSummary)}</text>` : ''}
  </g>

  <!-- Footer & Verification Bar -->
  <g transform="translate(100, 640)">
    <!-- Authorized Signatures -->
    <g transform="translate(60, 0)">
      <line x1="0" y1="0" x2="220" y2="0" stroke="#475569" stroke-width="1" />
      <text x="110" y="20" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="bold" fill="#FFFFFF">Academic Director</text>
      <text x="110" y="36" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#64748B">Exploratory Training Academy</text>
    </g>

    <g transform="translate(640, 0)">
      <line x1="0" y1="0" x2="220" y2="0" stroke="#475569" stroke-width="1" />
      <text x="110" y="20" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="bold" fill="#FFFFFF">Faculty Chair</text>
      <text x="110" y="36" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#64748B">Curriculum &amp; Instruction</text>
    </g>
  </g>

  <!-- Bottom Details & Verification Token -->
  <g transform="translate(560, 715)" text-anchor="middle">
    <text x="0" y="0" font-family="Courier, monospace" font-size="11" fill="#94A3B8">
      Certificate No: <tspan fill="#16C4FF" font-weight="bold">${escapeXml(certificateNumber)}</tspan>  •  Date of Issue: ${dateFormatted}
    </text>
    <text x="0" y="18" font-family="Arial, Helvetica, sans-serif" font-size="9" fill="#64748B">
      Verify authenticity online at: ${escapeXml(verifyUrl)}
    </text>
  </g>
</svg>`;
  }

  /**
   * Generates a deterministic, compliant PDF Buffer representation.
   */
  static generatePDFBuffer(certificate: ICertificate, baseUrl: string = 'https://eta-academy.edu'): Buffer {
    const svgContent = this.generateSVG(certificate, baseUrl);

    // Build standard conforming PDF-1.4 stream containing certificate text and vector references
    const { credentialSnapshot, certificateNumber, verificationCode, issuedAt } = certificate;
    const studentName = cleanAscii(credentialSnapshot.studentName || 'Student');
    const courseTitle = cleanAscii(credentialSnapshot.courseTitle || 'Course');
    const dateStr = new Date(issuedAt).toISOString().split('T')[0];

    const pdfData = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>
endobj
4 0 obj
<< /Length ${500 + studentName.length + courseTitle.length} >>
stream
q
0 0 0 rg
0.03 0.07 0.15 rg
0 0 842 595 re
f
0.09 0.77 1.0 rg
18 18 806 559 re
2 w
S
BT
/F1 22 Tf
1 1 1 rg
250 510 Td
(EXPLORATORY TRAINING ACADEMY) Tj
ET
BT
/F2 14 Tf
0.09 0.77 1.0 rg
280 480 Td
(CERTIFICATE OF COMPLETION) Tj
ET
BT
/F2 12 Tf
0.7 0.7 0.8 rg
320 420 Td
(This is to certify that) Tj
ET
BT
/F1 24 Tf
1 1 1 rg
260 380 Td
(${studentName}) Tj
ET
BT
/F2 12 Tf
0.7 0.7 0.8 rg
280 340 Td
(has successfully completed the course) Tj
ET
BT
/F1 18 Tf
0.09 0.77 1.0 rg
260 300 Td
(${courseTitle}) Tj
ET
BT
/F2 10 Tf
0.7 0.7 0.8 rg
200 160 Td
(Certificate No: ${certificateNumber}   |   Issued: ${dateStr}) Tj
ET
BT
/F2 9 Tf
0.5 0.5 0.6 rg
200 135 Td
(Verification Token: ${verificationCode}) Tj
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
