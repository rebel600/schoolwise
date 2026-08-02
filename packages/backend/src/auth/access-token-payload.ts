/**
 * Access token claims.
 *
 * A JWT is signed, not encrypted — anyone holding it can read every claim.
 * Nothing sensitive belongs here.
 */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  /** Authoritative tenant. Bound at login, never read from a request. */
  schoolId: string;
  membershipId: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
}
