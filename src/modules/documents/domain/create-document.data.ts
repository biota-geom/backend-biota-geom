export interface CreateDocumentData {
  customerId: string;
  title: string;
  documentDate: Date;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
  folderId: string | null;
}
