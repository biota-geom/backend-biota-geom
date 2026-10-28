export interface DocumentUploader {
  id: string;
  name: string;
}

export interface CustomerDocument {
  id: string;
  customerId: string;
  title: string;
  documentDate: Date;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
  uploadedBy: DocumentUploader;
  folderId: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  deletedById: string | null;
}
