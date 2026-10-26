export interface DocumentFolder {
  id: string;
  customerId: string;
  parentId: string | null;
  name: string;
  createdAt: Date;
}
