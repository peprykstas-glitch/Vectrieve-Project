export interface DossierData {
  title: string;
  filename: string;
  category?: string;
  summary?: string;
  fileSize?: number;
  chunkCount?: number;
  actionItems?: string[];
  createdAt?: string;
}

export function exportExecutiveDossierPdf(data: DossierData) {
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    alert('Please allow popups to export the Executive PDF Dossier.');
    return;
  }

  const dateStr = data.createdAt 
    ? new Date(data.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Neurach Executive Dossier - ${data.filename}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #ffffff;
      color: #18181b;
      padding: 48px;
      line-height: 1.6;
      font-size: 13px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e4e4e7;
      padding-bottom: 24px;
      margin-bottom: 32px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #09090b;
    }

    .brand-badge {
      background-color: #e0e7ff;
      color: #4338ca;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .meta-date {
      font-size: 11px;
      color: #71717a;
      text-align: right;
    }

    .title-section {
      margin-bottom: 28px;
    }

    .dossier-title {
      font-size: 24px;
      font-weight: 800;
      color: #09090b;
      margin-bottom: 6px;
      letter-spacing: -0.5px;
    }

    .dossier-subtitle {
      font-size: 13px;
      color: #71717a;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 32px;
    }

    .meta-item-label {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .meta-item-value {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
    }

    .section {
      margin-bottom: 32px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #4338ca;
      border-bottom: 1px solid #e4e4e7;
      padding-bottom: 8px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .summary-box {
      background-color: #fdfefe;
      border-left: 4px solid #6366f1;
      padding: 18px 20px;
      border-radius: 0 10px 10px 0;
      font-size: 13px;
      line-height: 1.7;
      color: #27272a;
      white-space: pre-wrap;
    }

    .action-items-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .action-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 14px;
      background-color: #f4fdf7;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      font-size: 12px;
      color: #14532d;
    }

    .footer {
      border-top: 1px solid #e4e4e7;
      padding-top: 20px;
      margin-top: 48px;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #a1a1aa;
    }

    @media print {
      body {
        padding: 24px;
      }
      @page {
        margin: 1.5cm;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <span class="brand-title">Neurach</span>
      <span class="brand-badge">Executive Dossier</span>
    </div>
    <div class="meta-date">
      <div>Generated on: <strong>${dateStr}</strong></div>
      <div>Zero Data Retention · Private RAG</div>
    </div>
  </div>

  <div class="title-section">
    <h1 class="dossier-title">${data.filename}</h1>
    <p class="dossier-subtitle">Verified Intelligence & Automated Document Analysis Report</p>
  </div>

  <div class="meta-grid">
    <div>
      <div class="meta-item-label">Classification</div>
      <div class="meta-item-value">${data.category || 'Executive Document'}</div>
    </div>
    <div>
      <div class="meta-item-label">File Size</div>
      <div class="meta-item-value">${data.fileSize ? (data.fileSize / 1024).toFixed(1) + ' KB' : 'N/A'}</div>
    </div>
    <div>
      <div class="meta-item-label">Vector Chunks</div>
      <div class="meta-item-value">${data.chunkCount || 1} Chunks</div>
    </div>
    <div>
      <div class="meta-item-label">Security Protocol</div>
      <div class="meta-item-value" style="color: #059669;">TLS 1.3 · GDPR Compliant</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Executive Briefing & Synthesis</div>
    <div class="summary-box">
${data.summary || 'Summary briefing pending generation.'}
    </div>
  </div>

  ${data.actionItems && data.actionItems.length > 0 ? `
  <div class="section">
    <div class="section-title">Extracted Action Items & Key Decisions</div>
    <ul class="action-items-list">
      ${data.actionItems.map(item => `<li class="action-item"><span>✅</span> <span>${item}</span></li>`).join('')}
    </ul>
  </div>
  ` : ''}

  <div class="footer">
    <span>Neurach Knowledge Intelligence Platform</span>
    <span>Confidential & Proprietary</span>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>
`;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
