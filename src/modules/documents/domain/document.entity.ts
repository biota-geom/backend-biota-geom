import { CustomerDocumentType } from './customer-document-type';

export interface DocumentUploader {
  id: string;
  name: string;
}

export interface CustomerDocument {
  id: string;
  customerId: string;
  title: string;
  type: CustomerDocumentType;
  documentDate: Date;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
  uploadedBy: DocumentUploader;
  createdAt: Date;
  deletedAt: Date | null;
}
