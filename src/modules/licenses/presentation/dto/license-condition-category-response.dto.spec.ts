import { toLicenseConditionCategoryResponse } from './license-condition-category-response.dto';

describe('toLicenseConditionCategoryResponse', () => {
  it('maps a category response', () => {
    expect(
      toLicenseConditionCategoryResponse({
        id: 'category-1',
        name: 'Emissões',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ).toEqual({
      id: 'category-1',
      name: 'Emissões',
      created_at: '2026-01-01T00:00:00.000Z',
    });
  });
});
