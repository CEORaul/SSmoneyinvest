"use client"

import { FileDown, FileImage, FileSpreadsheet } from "lucide-react"
import { useRef, useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { buildComparisonCsv, type ExportData } from "@/features/comparator/export"

interface ExportToolbarProps {
  exportData: ExportData
  /// The chart/health-score/table sections to capture for PNG/PDF — passed
  /// as children so this component never needs to know their internals,
  /// same "wrap what should be captured" shape as any screenshot tool.
  children: ReactNode
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/// PNG/PDF/CSV export for the comparator — one of SSmoney's flagship
/// differentiators is meant to be shareable, not just viewable. PNG/PDF
/// capture exactly what's rendered (via html-to-image on the wrapped
/// container); CSV is built from the same structured data the table
/// received, never a second query.
export function ExportToolbar({ exportData, children }: ExportToolbarProps) {
  const captureRef = useRef<HTMLDivElement>(null)
  const [pending, setPending] = useState<"png" | "pdf" | "csv" | null>(null)

  async function handlePng() {
    if (!captureRef.current) return
    setPending("png")
    try {
      const { toPng } = await import("html-to-image")
      const dataUrl = await toPng(captureRef.current, {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        pixelRatio: 2,
      })
      const link = document.createElement("a")
      link.href = dataUrl
      link.download = "comparacao-ssmoney.png"
      link.click()
    } finally {
      setPending(null)
    }
  }

  async function handlePdf() {
    if (!captureRef.current) return
    setPending("pdf")
    try {
      const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")])
      const node = captureRef.current
      const dataUrl = await toPng(node, {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        pixelRatio: 2,
      })
      // Image-based PDF (the capture is embedded as a single full-page
      // image, not paginated/text-selectable) — stated in the button's
      // own tooltip below.
      const widthPx = node.offsetWidth
      const heightPx = node.offsetHeight
      const orientation = widthPx >= heightPx ? "landscape" : "portrait"
      const doc = new jsPDF({ orientation, unit: "px", format: [widthPx, heightPx] })
      doc.addImage(dataUrl, "PNG", 0, 0, widthPx, heightPx)
      doc.save("comparacao-ssmoney.pdf")
    } finally {
      setPending(null)
    }
  }

  function handleCsv() {
    setPending("csv")
    try {
      const csv = buildComparisonCsv(exportData)
      downloadBlob(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }), "comparacao-ssmoney.csv")
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handlePng} disabled={pending !== null}>
          <FileImage className="size-3.5" />
          PNG
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePdf}
          disabled={pending !== null}
          title="PDF com a imagem da comparação — não é um documento com texto selecionável"
        >
          <FileDown className="size-3.5" />
          PDF
        </Button>
        <Button variant="outline" size="sm" onClick={handleCsv} disabled={pending !== null}>
          <FileSpreadsheet className="size-3.5" />
          CSV
        </Button>
      </div>
      <div ref={captureRef} className="space-y-8 bg-background">
        {children}
      </div>
    </div>
  )
}
