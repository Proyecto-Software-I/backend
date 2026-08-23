/* eslint-disable @typescript-eslint/unbound-method */
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { REQUIRED_PERMISSIONS_KEY } from '../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../access-control/guards/permission.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationsController } from './organizations.controller';
import type { InvitationsService } from './services/invitations.service';
import type { MembershipsService } from './services/memberships.service';

describe('OrganizationsController', () => {
  function makeController() {
    const membershipsService = {
      listCurrentMembers: jest.fn().mockResolvedValue({ members: [] }),
    } as unknown as MembershipsService;
    const invitationsService = {
      listCurrentInvitations: jest.fn().mockResolvedValue({ invitations: [] }),
      createInvitation: jest.fn().mockResolvedValue({
        invitation: {},
        acceptanceUrl: '/invite/token',
      }),
      revokeInvitation: jest.fn().mockResolvedValue({ invitation: {} }),
    } as unknown as InvitationsService;

    return {
      controller: new OrganizationsController(
        membershipsService,
        invitationsService,
      ),
      membershipsService,
      invitationsService,
    };
  }

  it('protects organization endpoints with JwtAuthGuard and PermissionGuard', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      OrganizationsController,
    ) as unknown[];

    expect(guards).toEqual([JwtAuthGuard, PermissionGuard]);
  });

  it('requires members.read for list members and list invitations', () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        OrganizationsController.prototype.listMembers,
      ),
    ).toEqual(['members.read']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        OrganizationsController.prototype.listInvitations,
      ),
    ).toEqual(['members.read']);
  });

  it('requires members.manage for create and revoke invitation', () => {
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        OrganizationsController.prototype.createInvitation,
      ),
    ).toEqual(['members.manage']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        OrganizationsController.prototype.revokeInvitation,
      ),
    ).toEqual(['members.manage']);
  });

  it('passes the current tenant to members service', async () => {
    const { controller, membershipsService } = makeController();

    await controller.listMembers('org-1');

    expect(membershipsService.listCurrentMembers).toHaveBeenCalledWith('org-1');
  });

  it('passes the current tenant to invitations service', async () => {
    const { controller, invitationsService } = makeController();

    await controller.listInvitations('org-1');

    expect(invitationsService.listCurrentInvitations).toHaveBeenCalledWith(
      'org-1',
    );
  });

  it('passes current tenant and authenticated user to create invitation service', async () => {
    const { controller, invitationsService } = makeController();

    await controller.createInvitation(
      { email: 'member@example.com' },
      'org-1',
      { userId: 'user-1', sessionId: 'session-1', organizationId: 'org-1' },
    );

    expect(invitationsService.createInvitation).toHaveBeenCalledWith({
      organizationId: 'org-1',
      invitedByUserId: 'user-1',
      email: 'member@example.com',
    });
  });

  it('passes current tenant and invitation id to revoke invitation service', async () => {
    const { controller, invitationsService } = makeController();

    await controller.revokeInvitation('org-1', 'invitation-1');

    expect(invitationsService.revokeInvitation).toHaveBeenCalledWith(
      'org-1',
      'invitation-1',
    );
  });
});
