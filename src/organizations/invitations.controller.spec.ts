/* eslint-disable @typescript-eslint/unbound-method */
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { REQUIRED_PERMISSIONS_KEY } from '../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../access-control/guards/permission.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvitationsController } from './invitations.controller';
import type { InvitationsService } from './services/invitations.service';

describe('InvitationsController', () => {
  function makeController() {
    const invitationsService = {
      previewInvitation: jest.fn().mockResolvedValue({
        email: 'member@example.com',
        organization: { name: 'Acme', slug: 'acme' },
        expiresAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
      acceptInvitation: jest.fn().mockResolvedValue({ invitation: {} }),
    } as unknown as InvitationsService;

    return {
      controller: new InvitationsController(invitationsService),
      invitationsService,
    };
  }

  it('keeps preview public without JwtAuthGuard or PermissionGuard', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      InvitationsController.prototype.previewInvitation,
    ) as unknown[] | undefined;

    expect(guards).toBeUndefined();
  });

  it('protects accept with JwtAuthGuard only', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      InvitationsController.prototype.acceptInvitation,
    ) as unknown[];

    expect(guards).toEqual([JwtAuthGuard]);
    expect(guards).not.toContain(PermissionGuard);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        InvitationsController.prototype.acceptInvitation,
      ),
    ).toBeUndefined();
  });

  it('delegates preview by plaintext token', async () => {
    const { controller, invitationsService } = makeController();

    await controller.previewInvitation('plain-token');

    expect(invitationsService.previewInvitation).toHaveBeenCalledWith(
      'plain-token',
    );
  });

  it('delegates accept using authenticated user id only', async () => {
    const { controller, invitationsService } = makeController();

    await controller.acceptInvitation('plain-token', {
      userId: 'user-1',
      sessionId: 'session-1',
      organizationId: null,
    });

    expect(invitationsService.acceptInvitation).toHaveBeenCalledWith(
      'plain-token',
      'user-1',
    );
  });
});
