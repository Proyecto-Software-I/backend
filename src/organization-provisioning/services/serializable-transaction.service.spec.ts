/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/unbound-method */
import { AuthError } from '../../common/exceptions/auth-error';
import { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { SerializableTransactionService } from './serializable-transaction.service';

function makePrisma() {
  return {
    $transaction: jest.fn(),
  } as unknown as PrismaService & { $transaction: jest.Mock };
}

describe('SerializableTransactionService', () => {
  it('retries P2034 conflicts with a new serializable transaction', async () => {
    const prisma = makePrisma();
    const callback = jest.fn().mockResolvedValue('ok');
    prisma.$transaction
      .mockRejectedValueOnce({ code: 'P2034' })
      .mockImplementationOnce((cb: typeof callback) => cb({ id: 'tx-2' }));

    const service = new SerializableTransactionService(prisma);

    await expect(service.run(callback)).resolves.toBe('ok');
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(callback).toHaveBeenCalledWith({ id: 'tx-2' });
  });

  it('stops after three total P2034 attempts', async () => {
    const prisma = makePrisma();
    prisma.$transaction.mockRejectedValue({ code: 'P2034' });
    const service = new SerializableTransactionService(prisma);

    await expect(service.run(jest.fn())).rejects.toMatchObject({
      code: 'P2034',
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it('does not retry functional errors', async () => {
    const prisma = makePrisma();
    const error = new AuthError('MEMBER_ALREADY_EXISTS', 409, 'exists');
    prisma.$transaction.mockRejectedValue(error);
    const service = new SerializableTransactionService(prisma);

    await expect(service.run(jest.fn())).rejects.toBe(error);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('does not retry non-P2034 errors', async () => {
    const prisma = makePrisma();
    const error = new Error('boom');
    prisma.$transaction.mockRejectedValue(error);
    const service = new SerializableTransactionService(prisma);

    await expect(service.run(jest.fn())).rejects.toBe(error);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
