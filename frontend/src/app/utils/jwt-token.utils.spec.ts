import { JwtTokenUtils } from './jwt-token.utils';

describe('JwtTokenUtils.decodeJwtPayload', () => {
  // Build a real JWT-shaped string: header.payload.signature, each segment base64.
  function makeToken(payload: object): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    return `${header}.${body}.fake-signature`;
  }

  it('decodes the claims from a valid JWT payload segment', () => {
    const token = makeToken({ sub: '1234567890', email: 'test@fred.com', exp: 9999999999 });
    const result = JwtTokenUtils.decodeJwtPayload(token);
    expect(result).toEqual({ sub: '1234567890', email: 'test@fred.com', exp: 9999999999 });
  });

  it('returns null for a malformed token', () => {
    const result = JwtTokenUtils.decodeJwtPayload('not-a-jwt');
    expect(result).toBeNull();
  });
});
