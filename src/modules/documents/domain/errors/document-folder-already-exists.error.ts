export class DocumentFolderAlreadyExistsError extends Error {
  constructor(name: string) {
    super(`A document folder named "${name}" already exists at this level`);
    this.name = 'DocumentFolderAlreadyExistsError';
  }
}
