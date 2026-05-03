import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function scoreLabel(score) {
  if (score >= 80) return 'Conforme'
  if (score >= 50) return 'Risqué'
  return 'Bloqué'
}

export function generateReportPDF(result, originalText) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 18
  let y = margin

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(30, 58, 95)
  doc.rect(0, 0, pageW, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('RegulAI — Rapport de conformité', margin, 14)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Analysé le ${new Date().toLocaleString('fr-FR')}`, pageW - margin, 14, { align: 'right' })

  y = 30
  doc.setTextColor(15, 23, 42)

  // ── Score ────────────────────────────────────────────────────────────────────
  const scoreColor = result.score >= 80 ? [5, 150, 105] : result.score >= 50 ? [217, 119, 6] : [220, 38, 38]
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...scoreColor)
  doc.text(`${result.score}/100`, margin, y)
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text(`— ${scoreLabel(result.score)}`, margin + 28, y)

  if (result.headline) {
    y += 7
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(result.headline, margin, y)
  }

  y += 10

  // ── Texte analysé (extrait) ──────────────────────────────────────────────────
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('Texte analysé :', margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  const preview = originalText.length > 300 ? originalText.slice(0, 300) + '…' : originalText
  const lines = doc.splitTextToSize(preview, pageW - margin * 2)
  doc.text(lines, margin, y)
  y += lines.length * 4.5 + 6

  // ── Risques ──────────────────────────────────────────────────────────────────
  if (result.risks?.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text('Points de non-conformité', margin, y)
    y += 6

    autoTable(doc, {
      startY: y,
      head: [['#', 'Domaine', 'Problème', 'Sanction max.']],
      body: result.risks.map((r, i) => [
        i + 1,
        r.domain || '',
        r.title || r.description || '',
        r.sanction || '—',
      ]),
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [15, 23, 42] },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 28 }, 2: { cellWidth: 80 }, 3: { cellWidth: 50 } },
      margin: { left: margin, right: margin },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // ── Version corrigée ─────────────────────────────────────────────────────────
  if (result.corrected_text) {
    if (y > 230) { doc.addPage(); y = margin }
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(5, 150, 105)
    doc.text('Version conforme publiable', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(9)
    const correctedLines = doc.splitTextToSize(result.corrected_text, pageW - margin * 2)
    doc.text(correctedLines, margin, y)
    y += correctedLines.length * 4.5 + 6
  }

  // ── Modifications ────────────────────────────────────────────────────────────
  if (result.modifications?.length > 0) {
    if (y > 240) { doc.addPage(); y = margin }
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text('Modifications apportées', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    for (const mod of result.modifications) {
      doc.text(`• ${mod}`, margin + 3, y)
      y += 5
    }
    y += 3
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight()
  doc.setFontSize(7)
  doc.setTextColor(148, 163, 184)
  doc.text('Ce rapport est généré automatiquement par RegulAI. Il ne constitue pas un avis juridique.', margin, pageH - 8)
  doc.text(`Page 1`, pageW - margin, pageH - 8, { align: 'right' })

  doc.save(`regulai-rapport-${new Date().toISOString().slice(0, 10)}.pdf`)
}
