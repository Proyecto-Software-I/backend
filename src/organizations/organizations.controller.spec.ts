/* eslint-disable @typescript-eslint/unbound-method */
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { REQUIRED_PERMISSIONS_KEY } from '../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../access-control/guards/permission.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationsController } from './organizations.controller';
import type { OrganizationRolesManagementService } from './services/organization-roles-management.service';
import type { InvitationsService } from './services/invitations.service';
import type { MembershipsService } from './services/memberships.service';

describe('OrganizationsController', () => {
  function makeController() {
    const membershipsService = {
      listCurrentMembers: jest.fn().mockResolvedValue({ members: [] }),
      updateMembershipStatus: jest.fn().mockResolvedValue({ member: {} }),
      removeMembership: jest.fn().mockResolvedValue({ member: {} }),
    } as unknown as MembershipsService;
    const invitationsService = {
      listCurrentInvitations: jest.fn().mockResolvedValue({ invitations: [] }),
      createInvitation: jest.fn().mockResolvedValue({
        invitation: {},
        acceptanceUrl: '/invite/token',
      }),
      revokeInvitation: jest.fn().mockResolvedValue({ invitation: {} }),
    } as unknown as InvitationsService;
    const rolesService = {
      listOrganizationRoles: jest.fn().mockResolvedValue({ roles: [] }),
      listPermissionCatalog: jest.fn().mockResolvedValue({ permissions: [] }),
      createOrganizationRole: jest.fn().mockResolvedValue({ role: {} }),
      updateOrganizationRole: jest.fn().mockResolvedValue({ role: {} }),
      deleteOrganizationRole: jest.fn().mockResolvedValue({ role: {} }),
    } as unknown as OrganizationRolesManagementService;

    return {
      controller: new OrganizationsController(
        membershipsService,
        invitationsService,
        rolesService,
      ),
      membershipsService,
      invitationsService,
      rolesService,
    };
  }

  it('protects organization endpoints with JwtAuthGuard and PermissionGuard', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      OrganizationsController,
    ) as unknown[];

    expect(guards).toEqual([JwtAuthGuard, PermissionGuard]);
  });

  it('requires members.read for read endpoints', () => {
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
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        OrganizationsController.prototype.listRoles,
      ),
    ).toEqual(['members.read']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        OrganizationsController.prototype.listPermissions,
      ),
    ).toEqual(['members.read']);
  });

  it('requires members.manage for write endpoints', () => {
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
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        OrganizationsController.prototype.updateMembershipStatus,
      ),
    ).toEqual(['members.manage']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        OrganizationsController.prototype.removeMembership,
      ),
    ).toEqual(['members.manage']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        OrganizationsController.prototype.createRole,
      ),
    ).toEqual(['members.manage']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        OrganizationsController.prototype.updateRole,
      ),
    ).toEqual(['members.manage']);
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        OrganizationsController.prototype.deleteRole,
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

  it('passes the current tenant to roles service', async () => {
    const { controller, rolesService } = makeController();

    await controller.listRoles('org-1');

    expect(rolesService.listOrganizationRoles).toHaveBeenCalledWith('org-1');
  });

  it('delegates permission catalog listing to roles service', async () => {
    const { controller, rolesService } = makeController();

    await controller.listPermissions();

    expect(rolesService.listPermissionCatalog).toHaveBeenCalledWith();
  });

  it('passes current tenant and create role DTO to roles service', async () => {
    const { controller, rolesService } = makeController();
    const dto = {
      name: 'Security reviewer',
      description: 'Can inspect analysis and audit information.',
      permissionKeys: ['analysis.read', 'audit.read'],
    };

    await controller.createRole('org-1', dto);

    expect(rolesService.createOrganizationRole).toHaveBeenCalledWith(
      'org-1',
      dto,
    );
  });

  it('passes current tenant, role id and update role DTO to roles service', async () => {
    const { controller, rolesService } = makeController();
    const dto = { description: null, permissionKeys: ['members.read'] };

    await controller.updateRole('org-1', 'role-1', dto);

    expect(rolesService.updateOrganizationRole).toHaveBeenCalledWith(
      'org-1',
      'role-1',
      dto,
    );
  });

  it('passes current tenant and role id to delete role service', async () => {
    const { controller, rolesService } = makeController();

    await controller.deleteRole('org-1', 'role-1');

    expect(rolesService.deleteOrganizationRole).toHaveBeenCalledWith(
      'org-1',
      'role-1',
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

  it('passes current tenant, membership id and DTO status to update membership service', async () => {
    const { controller, membershipsService } = makeController();

    await controller.updateMembershipStatus('org-1', 'membership-1', {
      status: 'SUSPENDED',
    });

    expect(membershipsService.updateMembershipStatus).toHaveBeenCalledWith(
      'org-1',
      'membership-1',
      'SUSPENDED',
    );
  });

  it('passes current tenant and membership id to remove membership service', async () => {
    const { controller, membershipsService } = makeController();

    await controller.removeMembership('org-1', 'membership-1');

    expect(membershipsService.removeMembership).toHaveBeenCalledWith(
      'org-1',
      'membership-1',
    );
  });
});
