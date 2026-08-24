import { InvitationStatus } from '../generated/prisma/client';
import { AuthError } from '../common/exceptions/auth-error';

export type InvitationEffectiveState =
  'PENDING' | 'EXPIRED' | 'REVOKED' | 'ACCEPTED';

export function getInvitationEffectiveState(
  status: InvitationStatus,
  expiresAt: Date,
  now: Date,
): InvitationEffectiveState {
  if (status === InvitationStatus.PENDING && expiresAt < now) {
    return 'EXPIRED';
  }

  return status;
}

export function getInvitationStateError(
  status: InvitationStatus,
  expiresAt: Date,
  now: Date,
): AuthError | null {
  const effectiveState = getInvitationEffectiveState(status, expiresAt, now);

  if (effectiveState === 'PENDING') {
    return null;
  }

  if (effectiveState === 'ACCEPTED') {
    return new AuthError(
      'INVITATION_ALREADY_ACCEPTED',
      409,
      'La invitación ya fue aceptada',
    );
  }

  if (effectiveState === 'REVOKED') {
    return new AuthError(
      'INVITATION_REVOKED',
      410,
      'La invitación fue revocada',
    );
  }

  return new AuthError('INVITATION_EXPIRED', 410, 'La invitación expiró');
}

export function throwInvitationStateError(
  status: InvitationStatus,
  expiresAt: Date,
  now: Date,
): void {
  const error = getInvitationStateError(status, expiresAt, now);
  if (error) {
    throw error;
  }
}
