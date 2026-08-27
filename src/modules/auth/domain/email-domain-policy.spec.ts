import { isEmailDomainAllowed } from './email-domain-policy';

const ALLOWED = 'biotageom.com.br';

describe('isEmailDomainAllowed', () => {
  it('allows an exact domain match', () => {
    expect(isEmailDomainAllowed('lucas@biotageom.com.br', ALLOWED)).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isEmailDomainAllowed('lucas@BiotaGeom.COM.BR', ALLOWED)).toBe(true);
  });

  it('rejects a different domain', () => {
    expect(isEmailDomainAllowed('lucas@gmail.com', ALLOWED)).toBe(false);
  });

  it('rejects a lookalike prefix subdomain', () => {
    expect(isEmailDomainAllowed('lucas@evil-biotageom.com.br', ALLOWED)).toBe(
      false,
    );
  });

  it('rejects a lookalike suffix domain', () => {
    expect(
      isEmailDomainAllowed('lucas@biotageom.com.br.evil.com', ALLOWED),
    ).toBe(false);
  });

  it('rejects an email with no "@"', () => {
    expect(isEmailDomainAllowed('not-an-email', ALLOWED)).toBe(false);
  });

  it('rejects an email ending in "@"', () => {
    expect(isEmailDomainAllowed('lucas@', ALLOWED)).toBe(false);
  });
});
