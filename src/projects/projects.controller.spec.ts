import type { AuthContext } from '../auth/decorators/current-user.decorator';
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
});
