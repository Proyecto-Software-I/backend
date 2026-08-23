import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MembershipStatus } from '../../generated/prisma/client';
import { UpdateMembershipStatusDto } from './member-list.dto';

async function validateDto(payload: Record<string, unknown>) {
  return validate(plainToInstance(UpdateMembershipStatusDto, payload));
}

describe('UpdateMembershipStatusDto', () => {
  it.each([MembershipStatus.ACTIVE, MembershipStatus.SUSPENDED])(
    'accepts %s',
    async (status) => {
      await expect(validateDto({ status })).resolves.toHaveLength(0);
    },
  );

  it.each(['REMOVED', 'INVITED', 'OWNER', '', null, undefined])(
    'rejects %s',
    async (status) => {
      const errors = await validateDto({ status });

      expect(errors.length).toBeGreaterThan(0);
    },
  );
});
