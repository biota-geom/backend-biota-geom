export class SectorNotFoundError extends Error {
  constructor(sectorId: string) {
    super(`Sector "${sectorId}" does not exist`);
    this.name = 'SectorNotFoundError';
  }
}
