export class DocumentNotFoundError extends Error {
  constructor(documentId: string) {
    super(`Document "${documentId}" was not found`);
    this.name = 'DocumentNotFoundError';
  }
}
