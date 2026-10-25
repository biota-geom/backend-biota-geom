import { FileValidator } from '@nestjs/common';
import { extname } from 'node:path';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const JPEG_SIGNATURE = Buffer.from([255, 216, 255]);
const ZIP_SIGNATURE = Buffer.from([80, 75, 3, 4]);

function hasSignature(buffer: Buffer, signature: Buffer): boolean {
  return buffer.subarray(0, signature.length).equals(signature);
}

function isDocx(buffer: Buffer): boolean {
  return (
    hasSignature(buffer, ZIP_SIGNATURE) &&
    buffer.includes(Buffer.from('[Content_Types].xml')) &&
    buffer.includes(Buffer.from('word/'))
  );
}

export class DocumentFileValidator extends FileValidator<
  Record<string, never>,
  Express.Multer.File
> {
  constructor(private readonly errorMessage: string) {
    super({});
  }

  isValid(file?: Express.Multer.File): boolean {
    if (!file) return false;

    const extension = extname(file.originalname).toLowerCase();

    if (extension === '.pdf' && file.mimetype === 'application/pdf') {
      return file.buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    }

    if (
      (extension === '.jpg' || extension === '.jpeg') &&
      file.mimetype === 'image/jpeg'
    ) {
      return hasSignature(file.buffer, JPEG_SIGNATURE);
    }

    if (extension === '.png' && file.mimetype === 'image/png') {
      return hasSignature(file.buffer, PNG_SIGNATURE);
    }

    if (
      extension === '.docx' &&
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return isDocx(file.buffer);
    }

    return false;
  }

  buildErrorMessage(): string {
    return this.errorMessage;
  }
}
