import { FileValidator } from '@nestjs/common';

const PDF_MIME_TYPE = 'application/pdf';

/*
 * Deliberately simple: checks the multipart Content-Type Multer reports for
 * the part, not the file's magic numbers. That's enough for the ticket's own
 * test plan (reject a .jpg, accept a .pdf) without pulling in the `file-type`
 * package's dynamic ESM import into this CommonJS build.
 */
export class PdfFileValidator extends FileValidator<
  Record<string, never>,
  Express.Multer.File
> {
  constructor(private readonly errorMessage: string) {
    super({});
  }

  isValid(file?: Express.Multer.File): boolean {
    return file?.mimetype === PDF_MIME_TYPE;
  }

  buildErrorMessage(): string {
    return this.errorMessage;
  }
}
