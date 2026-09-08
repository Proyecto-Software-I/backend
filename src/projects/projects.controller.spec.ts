import type { AuthContext } from '../auth/decorators/current-user.decorator';
import { ProjectRolesController } from './project-roles.controller';
import { mock } from './testing/mock';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './services/projects.service';

describe('ProjectsController', () => {
  it('delegates creation to the tenant-derived project service', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'project-1', tags: [] });
    const controller = new ProjectsController(
      mock<ProjectsService>({ create }),
    );
    const user: AuthContext = {
      userId: 'user-1',
      sessionId: 'session-1',
      organizationId: 'org-1',
    };
    await expect(
      controller.create('org-1', user, { key: 'CORE', name: 'Core' }),
    ).resolves.toMatchObject({ project: { id: 'project-1', tags: [] } });
    expect(create).toHaveBeenCalledWith('user-1', 'org-1', {
      key: 'CORE',
      name: 'Core',
    });
  });

  it('documents archived workflow and duplicate role conflicts in Swagger metadata', () => {
    const statusResponses: unknown = Reflect.getMetadata(
      'swagger/apiResponse',
      ProjectsController.prototype.updateStatus,
    );
    const roleCreateResponses: unknown = Reflect.getMetadata(
      'swagger/apiResponse',
      ProjectRolesController.prototype.create,
    );

    expect(statusResponses).toEqual(
      expect.objectContaining({
        409: expect.objectContaining({
          description:
            'PROJECT_STATUS_TRANSITION_INVALID or PROJECT_ALREADY_ARCHIVED',
        }),
      }),
    );
    expect(roleCreateResponses).toEqual(
      expect.objectContaining({
        409: expect.objectContaining({
          description: 'PROJECT_ROLE_ALREADY_EXISTS',
        }),
      }),
    );
  });
});
