import { DocumentFileValidator } from './document-file.validator';

const validator = new DocumentFileValidator('invalid');

function file(
  originalname: string,
  mimetype: string,
  buffer: Buffer,
): Express.Multer.File {
  return { originalname, mimetype, buffer } as Express.Multer.File;
}

describe('DocumentFileValidator', () => {
  it('returns its configured message and rejects a missing file', () => {
    expect(validator.buildErrorMessage()).toBe('invalid');
    expect(validator.isValid()).toBe(false);
  });

  it.each([
    ['report.pdf', 'application/pdf', Buffer.from('%PDF-1.7')],
    ['photo.jpg', 'image/jpeg', Buffer.from([255, 216, 255, 0])],
    ['image.png', 'image/png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])],
    [
      'contract.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      Buffer.concat([
        Buffer.from([80, 75, 3, 4]),
        Buffer.from('[Content_Types].xml word/document.xml'),
      ]),
    ],
  ])('accepts valid %s content', (name, mime, content) => {
    expect(validator.isValid(file(name, mime, content))).toBe(true);
  });

  it.each([
    ['malware.exe', 'application/x-msdownload', Buffer.from('MZ')],
    ['fake.pdf', 'application/pdf', Buffer.from('not a pdf')],
    ['renamed.png', 'image/png', Buffer.from('not a png')],
    ['photo.pdf', 'image/jpeg', Buffer.from([255, 216, 255])],
  ])('rejects invalid file %s', (name, mime, content) => {
    expect(validator.isValid(file(name, mime, content))).toBe(false);
  });
});
