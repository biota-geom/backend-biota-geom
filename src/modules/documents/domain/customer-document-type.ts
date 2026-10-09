export const CustomerDocumentType = {
  CONTRATO: 'CONTRATO',
  LAUDO: 'LAUDO',
  CERTIDAO: 'CERTIDAO',
  OUTROS: 'OUTROS',
} as const;

export type CustomerDocumentType =
  (typeof CustomerDocumentType)[keyof typeof CustomerDocumentType];
