import { Injectable } from '@nestjs/common';
import { UnreadableLicenseDocumentError } from '../domain/errors/unreadable-license-document.error';
import {
  LicenseDocumentExtractor,
  LicenseExtraction,
} from '../domain/license-extraction';

const PDF_SIGNATURE = Buffer.from('%PDF-');

/*
 * Reads a license PDF and returns suggestions for the registration form.
 * Deliberately has no repository dependency: extraction never creates or
 * changes a record — the user reviews the suggestions and saves them through
 * the existing license/condition routes.
 */
@Injectable()
export class ExtractLicenseDataUseCase {
  constructor(private readonly extractor: LicenseDocumentExtractor) {}

  async execute(document: Buffer): Promise<LicenseExtraction> {
    // The multipart Content-Type is client-controlled; check the actual bytes
    // before paying for a model call on something that is not a PDF.
    if (!document.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)) {
      throw new UnreadableLicenseDocumentError('missing PDF signature');
    }

    const extraction = await this.extractor.extract(document);

    if (isEmpty(extraction)) {
      throw new UnreadableLicenseDocumentError('no license data identified');
    }

    return extraction;
  }
}

function isEmpty({
  extractedData,
  suggestedConditions,
}: LicenseExtraction): boolean {
  return (
    suggestedConditions.length === 0 &&
    Object.values(extractedData).every((value) => value === null)
  );
}
