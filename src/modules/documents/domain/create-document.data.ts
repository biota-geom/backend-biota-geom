import { CustomerDocumentType } from './customer-document-type';

export interface CreateDocumentData {
  customerId: string;
  title: string;
  type: CustomerDocumentType;
  documentDate: Date;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
}
