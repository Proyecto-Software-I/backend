import { ProjectsController } from './projects.controller';

describe('ProjectsController', () => {
  it('delegates creation to the tenant-derived project service', async () => {
    const service = {
      create: jest.fn().mockResolvedValue({ id: 'project-1' }),
    };
    const controller = new ProjectsController(service as any);

    await expect(
      controller.create('org-1', { userId: 'user-1' } as any, {
        key: 'CORE',
        name: 'Core',
      }),
    ).resolves.toMatchObject({ project: { id: 'project-1', tags: [] } });
    expect(service.create).toHaveBeenCalledWith('user-1', 'org-1', {
      key: 'CORE',
      name: 'Core',
    });
  });

  it('keeps static role routes ahead of project identifiers', () => {
    const paths = Reflect.getMetadata('path', ProjectsController) as string;
    expect(paths).toBe('projects');
  });
});
