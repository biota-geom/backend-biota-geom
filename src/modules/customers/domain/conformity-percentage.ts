export function calculateConformityPercentage(
  regularLicenses: number,
  totalLicenses: number,
): number | null {
  if (totalLicenses === 0) {
    return null;
  }

  return Math.round((regularLicenses / totalLicenses) * 100);
}
