import React from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown } from 'lucide-react';

export default function ExportReport({ scanMeta, results }) {
  const handleDownload = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toISOString().split('T')[0];

    // --- Title & Header ---
    doc.setFontSize(22);
    doc.setTextColor(6, 182, 212); // Cyan-500
    doc.text('TraceGuard Security Advisory', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Target: ${scanMeta?.target || 'Unknown'}`, 14, 35);
    doc.text(`Scan Type: ${scanMeta?.scanType?.toUpperCase() || 'N/A'}`, 14, 40);

    // --- Executive Summary ---
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text('Executive Summary', 14, 52);

    const totalRisks = results.length;
    let highestEntropy = 0;
    
    // Find the highest entropy score among findings (if available)
    results.forEach((r) => {
      if (r.entropyScore && r.entropyScore > highestEntropy) {
        highestEntropy = r.entropyScore;
      }
    });

    const summaryData = [
      ['Total Findings Detected', totalRisks.toString()],
      ['Highest Entropy Score', highestEntropy > 0 ? highestEntropy.toFixed(4) : 'N/A'],
    ];

    if (scanMeta?.summary) {
      summaryData.push(['CRITICAL Severity', scanMeta.summary.critical.toString()]);
      summaryData.push(['HIGH Severity', scanMeta.summary.high.toString()]);
      summaryData.push(['MEDIUM Severity', scanMeta.summary.medium.toString()]);
      summaryData.push(['LOW Severity', scanMeta.summary.low.toString()]);
    }

    autoTable(doc, {
      startY: 58,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 1: { fontStyle: 'bold' } },
    });

    // --- Detailed Findings AutoTable ---
    const finalY = doc.lastAutoTable.finalY || 60;
    
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Detailed Threat Telemetry', 14, finalY + 15);

    const tableCols = ['Severity', 'Secret Type', 'Entropy', 'Source Path / URL', 'Remediation'];
    
    const getRemediation = (type) => {
      if (type.includes('AWS')) return 'Revoke in IAM immediately';
      if (type.includes('Key')) return 'Rotate key and invalidate old token';
      if (type.includes('Token')) return 'Invalidate token in developer console';
      if (type.includes('Subdomain')) return 'Verify DNS record intent';
      if (type.includes('Exposed')) return 'Restrict server access (e.g. .htaccess / firewall)';
      return 'Investigate and rotate secret';
    };

    const tableRows = results.map((r) => [
      r.severity || 'UNKNOWN',
      r.type || 'N/A',
      r.entropyScore ? r.entropyScore.toFixed(4) : 'N/A',
      r.source || 'N/A',
      getRemediation(r.type || '')
    ]);

    autoTable(doc, {
      startY: finalY + 22,
      head: [tableCols],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'center', cellWidth: 25 },
        1: { cellWidth: 35 },
        2: { halign: 'center', cellWidth: 20 },
        3: { cellWidth: 55 },
        4: { cellWidth: 'auto' },
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 0) {
          // Color code severity cells
          const val = data.cell.raw;
          if (val === 'CRITICAL') { data.cell.styles.textColor = [225, 29, 72]; }
          if (val === 'HIGH') { data.cell.styles.textColor = [234, 88, 12]; }
          if (val === 'MEDIUM') { data.cell.styles.textColor = [217, 119, 6]; }
          if (val === 'LOW') { data.cell.styles.textColor = [16, 185, 129]; }
        }
      }
    });

    // Save the PDF
    doc.save(`TraceGuard_Report_${dateStr}.pdf`);
  };

  return (
    <button
      onClick={handleDownload}
      disabled={results.length === 0}
      className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-sm font-semibold rounded-lg border border-slate-700 hover:border-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
    >
      <FileDown className="w-4 h-4" />
      <span>Download Security Advisory</span>
    </button>
  );
}
