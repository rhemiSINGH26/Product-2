// Printable certificate (white paper). Auto-prints on load.
export interface CertPrintData {
  id: string;
  studentName: string;
  studentEmail?: string;
  courseName: string;
  courseCode?: string;
  teacherName: string;
  score: number;
  issuedAt?: string;
  requestedAt?: string;
}

export function renderPrintableCertificate(d: CertPrintData): string {
  const issued = d.issuedAt ?? new Date().toISOString().slice(0, 10);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Certificate ${d.id}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Georgia,'Times New Roman',serif;}
  .sheet{width:297mm;height:210mm;padding:18mm;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:space-between;position:relative;}
  .border-outer{position:absolute;inset:10mm;border:2px solid #1a1a1a;border-radius:6px;}
  .border-inner{position:absolute;inset:13mm;border:1px solid #999;border-radius:4px;}
  .brand{font-size:12px;letter-spacing:.4em;text-transform:uppercase;color:#666;margin-top:6mm;position:relative;}
  .title{font-size:42px;font-weight:700;margin-top:6mm;position:relative;}
  .subtitle{font-size:13px;color:#444;letter-spacing:.25em;text-transform:uppercase;margin-top:2mm;position:relative;}
  .body{margin-top:10mm;text-align:center;position:relative;}
  .awarded{font-size:14px;color:#555;}
  .name{font-size:48px;font-family:'Brush Script MT','Snell Roundhand',cursive;margin:6mm 0;color:#0a0a0a;border-bottom:1px solid #ccc;padding:0 30mm 4mm;display:inline-block;}
  .for{font-size:14px;color:#555;}
  .course{font-size:24px;font-weight:600;margin-top:4mm;}
  .code{font-size:12px;color:#666;margin-top:2mm;letter-spacing:.15em;text-transform:uppercase;}
  .footer{display:flex;justify-content:space-between;width:100%;margin-top:auto;position:relative;font-size:12px;}
  .sig{text-align:center;min-width:60mm;}
  .sig .line{border-top:1px solid #333;margin-bottom:2mm;}
  .sig b{display:block;font-size:13px;}
  .sig span{color:#666;font-size:11px;}
  .meta{position:relative;font-size:11px;color:#555;margin-top:6mm;display:flex;gap:14mm;}
  .meta b{color:#111;display:block;font-size:13px;}
  .id{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10px;color:#666;margin-top:3mm;position:relative;}
  .seal{position:absolute;right:24mm;bottom:34mm;width:30mm;height:30mm;border:2px solid #b91c1c;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#b91c1c;font-size:9px;letter-spacing:.2em;text-align:center;line-height:1.3;font-weight:700;transform:rotate(-12deg);text-transform:uppercase;}
  @media print { .noprint{display:none;} }
  .noprint{position:fixed;top:10px;right:10px;background:#111;color:#fff;border:0;padding:8px 14px;border-radius:6px;cursor:pointer;font-family:system-ui;}
</style></head><body>
<button class="noprint" onclick="window.print()">Print / Save as PDF</button>
<div class="sheet">
  <div class="border-outer"></div>
  <div class="border-inner"></div>
  <div class="brand">iTech Academy</div>
  <div class="title">Certificate of Completion</div>
  <div class="subtitle">This is to certify that</div>
  <div class="body">
    <div class="name">${escapeHtml(d.studentName)}</div>
    <div class="for">has successfully completed the course</div>
    <div class="course">${escapeHtml(d.courseName)}</div>
    ${d.courseCode ? `<div class="code">${escapeHtml(d.courseCode)}</div>` : ""}
    <div class="meta">
      <div><b>${d.score}%</b>Final Score</div>
      <div><b>${escapeHtml(issued)}</b>Date Issued</div>
      ${d.requestedAt ? `<div><b>${escapeHtml(d.requestedAt)}</b>Requested</div>` : ""}
    </div>
    <div class="id">Certificate ID: ${escapeHtml(d.id)} &nbsp;·&nbsp; Verify at /verify</div>
  </div>
  <div class="seal">iTech<br/>Verified<br/>Seal</div>
  <div class="footer">
    <div class="sig"><div class="line"></div><b>${escapeHtml(d.teacherName)}</b><span>Instructor</span></div>
    <div class="sig"><div class="line"></div><b>iTech Academy</b><span>Authorised Signatory</span></div>
  </div>
</div>
<script>setTimeout(function(){try{window.print();}catch(e){}}, 400);</script>
</body></html>`;
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export function openPrintableCertificate(d: CertPrintData) {
  const html = renderPrintableCertificate(d);
  const w = window.open("", "_blank");
  if (!w) {
    // fallback: download
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificate-${d.id}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
