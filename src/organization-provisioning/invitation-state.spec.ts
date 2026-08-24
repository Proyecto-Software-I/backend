import { InvitationStatus } from '../generated/prisma/client';
import {
  getInvitationEffectiveState,
  getInvitationStateError,
} from './invitation-state';

describe('invitation-state', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const future = new Date('2026-01-02T00:00:00.000Z');
  const past = new Date('2025-12-31T00:00:00.000Z');

  it('treats pending invitation with future expiry as PENDING and usable', () => {
    expect(
      getInvitationEffectiveState(InvitationStatus.PENDING, future, now),
    ).toBe('PENDING');
    expect(getInvitationStateError(InvitationStatus.PENDING, future, now)).toBe(
      null,
    );
  });

  it('treats pending invitation with past expiry as EXPIRED', () => {
    expect(
      getInvitationEffectiveState(InvitationStatus.PENDING, past, now),
    ).toBe('EXPIRED');
    expect(
      getInvitationStateError(InvitationStatus.PENDING, past, now),
    ).toMatchObject({ code: 'INVITATION_EXPIRED', status: 410 });
  });

  it.each([
    [InvitationStatus.EXPIRED, 'INVITATION_EXPIRED', 410],
    [InvitationStatus.REVOKED, 'INVITATION_REVOKED', 410],
    [InvitationStatus.ACCEPTED, 'INVITATION_ALREADY_ACCEPTED', 409],
  ])('maps %s to %s', (status, code, httpStatus) => {
    expect(getInvitationStateError(status, future, now)).toMatchObject({
      code,
      status: httpStatus,
    });
  });
});
