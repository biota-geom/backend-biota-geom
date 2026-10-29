import { Injectable } from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import PDFDocument from 'pdfkit';
import {
  CustomerReport,
  CustomerReportEsgIndicator,
} from '../domain/customer-report';
import { CustomerReportRenderer } from '../domain/customer-report.renderer';

const MARGIN = 48;
const INK = '#16211c';
const MUTED = '#56675e';
const ACCENT = '#0d7f58';
const RULE = '#dde4df';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

const NUMBER_FORMATTER = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
});

function formatDocument(value: string, type: DocumentType): string {
  if (type === DocumentType.CNPJ && value.length === 14) {
    return `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8, 12)}-${value.slice(12)}`;
  }
  if (type === DocumentType.CPF && value.length === 11) {
    return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
  }

  return value;
}

function formatVariation(indicator: CustomerReportEsgIndicator): string {
  if (indicator.variationPercentage === null) return 'sem mês anterior';

  const sign = indicator.variationPercentage > 0 ? '+' : '';
  return `${sign}${indicator.variationPercentage.toFixed(1)}% vs mês anterior`;
}

function formatIndicatorValue(indicator: CustomerReportEsgIndicator): string {
  if (indicator.value === null) return '—';

  return `${NUMBER_FORMATTER.format(indicator.value)} ${indicator.unit}`;
}

/** `2026-09` as `09/2026`, the way the dashboard shows it. */
function formatReferenceMonth(referenceMonth: string): string {
  const [year, month] = referenceMonth.split('-');

  return `${month}/${year}`;
}

@Injectable()
export class PdfKitCustomerReportRenderer implements CustomerReportRenderer {
  async render(report: CustomerReport): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<void>((resolve, reject) => {
      doc.on('end', () => resolve());
      doc.on('error', reject);
    });

    this.writeHeader(doc, report);
    this.writeLicenses(doc, report);
    this.writeConditions(doc, report);
    this.writeEsg(doc, report);

    doc.end();
    await finished;

    return Buffer.concat(chunks);
  }

  private writeHeader(doc: PDFKit.PDFDocument, report: CustomerReport): void {
    const { header } = report;

    doc
      .fillColor(ACCENT)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('RELATÓRIO EXECUTIVO', { characterSpacing: 1.2 });

    doc
      .moveDown(0.3)
      .fillColor(INK)
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(header.companyName);

    const subtitle = [
      formatDocument(header.document, header.documentType),
      header.segment,
    ]
      .filter(Boolean)
      .join('  ·  ');

    doc
      .moveDown(0.25)
      .fillColor(MUTED)
      .fontSize(10)
      .font('Helvetica')
      .text(subtitle);

    doc.text(`Gerado em ${DATE_TIME_FORMATTER.format(header.generatedAt)}`, {
      continued: false,
    });

    this.writeRule(doc, 14);
  }

  private writeLicenses(doc: PDFKit.PDFDocument, report: CustomerReport): void {
    const { licenses } = report;

    this.writeSectionTitle(doc, 'Licenças ambientais');
    this.writeMetricRow(doc, [
      { label: 'Ativas', value: String(licenses.active) },
      { label: 'Regulares', value: String(licenses.regular) },
      { label: 'Em atenção', value: String(licenses.attention) },
      { label: 'Vencidas', value: String(licenses.expired) },
    ]);
  }

  private writeConditions(
    doc: PDFKit.PDFDocument,
    report: CustomerReport,
  ): void {
    const { conditions } = report;

    this.writeSectionTitle(doc, 'Condicionantes');
    this.writeMetricRow(doc, [
      { label: 'Conformidade', value: `${conditions.compliancePercentage}%` },
      { label: 'Em dia', value: String(conditions.inCompliance) },
      { label: 'Pendentes', value: String(conditions.pending) },
      { label: 'Total ativas', value: String(conditions.totalActive) },
    ]);
  }

  private writeEsg(doc: PDFKit.PDFDocument, report: CustomerReport): void {
    const { esg } = report;
    const title =
      esg.referenceMonth === null
        ? 'Indicadores ESG'
        : `Indicadores ESG · ${formatReferenceMonth(esg.referenceMonth)}`;

    this.writeSectionTitle(doc, title);

    if (esg.indicators.length === 0) {
      doc
        .fillColor(MUTED)
        .fontSize(10)
        .font('Helvetica-Oblique')
        .text('Nenhum indicador configurado para esta empresa.');
      doc.moveDown(0.8);
      return;
    }

    /*
     * Four per row keeps each column wide enough for the value and the
     * variation underneath it.
     */
    for (let index = 0; index < esg.indicators.length; index += 4) {
      this.writeMetricRow(
        doc,
        esg.indicators.slice(index, index + 4).map((indicator) => ({
          label: indicator.name,
          value: formatIndicatorValue(indicator),
          hint: formatVariation(indicator),
        })),
      );
    }
  }

  private writeSectionTitle(doc: PDFKit.PDFDocument, title: string): void {
    doc
      .fillColor(INK)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(title)
      .moveDown(0.5);
  }

  private writeMetricRow(
    doc: PDFKit.PDFDocument,
    metrics: Array<{ label: string; value: string; hint?: string }>,
  ): void {
    const usableWidth = doc.page.width - MARGIN * 2;
    const columnWidth = usableWidth / metrics.length;
    const top = doc.y;
    let bottom = top;

    metrics.forEach((metric, index) => {
      const left = MARGIN + columnWidth * index;

      doc
        .fillColor(MUTED)
        .fontSize(8)
        .font('Helvetica')
        .text(metric.label.toUpperCase(), left, top, {
          width: columnWidth - 8,
          characterSpacing: 0.6,
        });

      doc
        .fillColor(INK)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(metric.value, left, doc.y + 1, { width: columnWidth - 8 });

      if (metric.hint) {
        doc
          .fillColor(MUTED)
          .fontSize(8)
          .font('Helvetica')
          .text(metric.hint, left, doc.y + 1, { width: columnWidth - 8 });
      }

      bottom = Math.max(bottom, doc.y);
    });

    doc.x = MARGIN;
    doc.y = bottom;
    this.writeRule(doc, 12);
  }

  private writeRule(doc: PDFKit.PDFDocument, spacing: number): void {
    const y = doc.y + spacing;

    doc
      .strokeColor(RULE)
      .lineWidth(1)
      .moveTo(MARGIN, y)
      .lineTo(doc.page.width - MARGIN, y)
      .stroke();

    doc.x = MARGIN;
    doc.y = y + spacing;
  }
}
