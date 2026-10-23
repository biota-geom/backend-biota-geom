export class DocumentFolderNotFoundError extends Error {
  constructor(folderId: string) {
    super(`Document folder "${folderId}" was not found`);
    this.name = 'DocumentFolderNotFoundError';
  }
}
