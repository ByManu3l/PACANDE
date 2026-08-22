import { describe, expect, it } from 'vitest';

import {
  adminDeleteUser,
  adminUpdateUser,
  assertCanManageTarget,
  assertNotActingOnSelf,
  changePassword,
  registerUser,
  verifyCredentials,
} from '@/lib/services/user.service';
import { prisma } from '@/lib/prisma';
import {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from '@/lib/utils/errors';

import { createUser } from './factories';

describe('user.service', () => {
  describe('registerUser + verifyCredentials', () => {
    it('registers a user and can verify their credentials afterwards', async () => {
      const user = await registerUser({
        name: 'Ana',
        email: 'ana@test.local',
        password: 'Password123!',
      });
      expect(user.role).toBe('USER');

      const verified = await verifyCredentials('ana@test.local', 'Password123!');
      expect(verified?.id).toBe(user.id);
    });

    it('rejects registration with a duplicate email', async () => {
      await createUser({ email: 'dup@test.local' });
      await expect(
        registerUser({ name: 'Dup', email: 'dup@test.local', password: 'Password123!' }),
      ).rejects.toThrow(ConflictError);
    });

    it('rejects verification with the wrong password', async () => {
      await createUser({ email: 'wrong@test.local', password: 'Correct123!' });
      const result = await verifyCredentials('wrong@test.local', 'Incorrect123!');
      expect(result).toBeNull();
    });
  });

  describe('changePassword', () => {
    it('requires the correct current password', async () => {
      const user = await createUser({ password: 'OldPassword123!' });
      await expect(changePassword(user.id, 'WrongCurrent!', 'NewPassword123!')).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it('updates the password so the new one verifies and the old one no longer does', async () => {
      const user = await createUser({ email: 'change@test.local', password: 'OldPassword123!' });
      await changePassword(user.id, 'OldPassword123!', 'NewPassword123!');

      expect(await verifyCredentials('change@test.local', 'NewPassword123!')).not.toBeNull();
      expect(await verifyCredentials('change@test.local', 'OldPassword123!')).toBeNull();
    });
  });

  describe('assertNotActingOnSelf', () => {
    it('throws when actor and target are the same', () => {
      expect(() => assertNotActingOnSelf('a', 'a', 'eliminar')).toThrow(ForbiddenError);
    });

    it('does not throw for different ids', () => {
      expect(() => assertNotActingOnSelf('a', 'b', 'eliminar')).not.toThrow();
    });
  });

  describe('assertCanManageTarget', () => {
    it('blocks an Admin from managing another Admin or a Superadmin', () => {
      expect(() => assertCanManageTarget('ADMIN', 'ADMIN')).toThrow(ForbiddenError);
      expect(() => assertCanManageTarget('ADMIN', 'SUPERADMIN')).toThrow(ForbiddenError);
    });

    it('allows an Admin to manage a plain User', () => {
      expect(() => assertCanManageTarget('ADMIN', 'USER')).not.toThrow();
    });

    it('allows a Superadmin to manage anyone', () => {
      expect(() => assertCanManageTarget('SUPERADMIN', 'ADMIN')).not.toThrow();
      expect(() => assertCanManageTarget('SUPERADMIN', 'SUPERADMIN')).not.toThrow();
    });
  });

  describe('adminUpdateUser', () => {
    it('lets a Superadmin change another user’s role', async () => {
      const superadmin = await createUser({ role: 'SUPERADMIN' });
      const target = await createUser({ role: 'USER', email: 'promote@test.local' });

      const updated = await adminUpdateUser(superadmin.id, 'SUPERADMIN', target.id, {
        name: target.name,
        email: target.email,
        role: 'ADMIN',
      });
      expect(updated.role).toBe('ADMIN');
    });

    it('blocks a Superadmin from changing their own role, even via adminUpdateUser', async () => {
      const superadmin = await createUser({ role: 'SUPERADMIN', email: 'self@test.local' });
      await expect(
        adminUpdateUser(superadmin.id, 'SUPERADMIN', superadmin.id, {
          name: superadmin.name,
          email: superadmin.email,
          role: 'ADMIN',
        }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('blocks a plain Admin from changing any role, even their own request body', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const target = await createUser({ role: 'USER', email: 'target@test.local' });

      await expect(
        adminUpdateUser(admin.id, 'ADMIN', target.id, {
          name: target.name,
          email: target.email,
          role: 'ADMIN',
        }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('silently ignores a role field from a non-Superadmin instead of applying it', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const target = await createUser({ role: 'USER', email: 'untouched-role@test.local' });

      // No role change requested (matches current role) so this should
      // succeed as a plain profile edit — role must stay USER regardless.
      const updated = await adminUpdateUser(admin.id, 'ADMIN', target.id, {
        name: 'Renamed',
        email: target.email,
        role: 'USER',
      });
      expect(updated.role).toBe('USER');
      expect(updated.name).toBe('Renamed');
    });
  });

  describe('adminDeleteUser', () => {
    it('blocks a Superadmin from deleting themself', async () => {
      const superadmin = await createUser({ role: 'SUPERADMIN' });
      await expect(adminDeleteUser(superadmin.id, 'SUPERADMIN', superadmin.id)).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('blocks an Admin from deleting another Admin', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const otherAdmin = await createUser({ role: 'ADMIN', email: 'other-admin@test.local' });
      await expect(adminDeleteUser(admin.id, 'ADMIN', otherAdmin.id)).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('blocks deleting a user who has order history', async () => {
      const admin = await createUser({ role: 'SUPERADMIN' });
      const target = await createUser({ role: 'USER', email: 'has-orders@test.local' });
      await prisma.order.create({
        data: {
          orderNumber: 'TEST-0001',
          userId: target.id,
          paymentMethod: 'contra_entrega',
          subtotal: 1000,
          shippingCost: 0,
          total: 1000,
          shippingRecipientName: 'x',
          shippingLine1: 'x',
          shippingCity: 'x',
          shippingRegion: 'x',
          shippingPostalCode: 'x',
          shippingCountry: 'CO',
          shippingPhone: 'x',
        },
      });

      await expect(adminDeleteUser(admin.id, 'SUPERADMIN', target.id)).rejects.toThrow(
        ValidationError,
      );
    });

    it('deletes a user with no order history', async () => {
      const admin = await createUser({ role: 'SUPERADMIN' });
      const target = await createUser({ role: 'USER', email: 'deletable@test.local' });

      await adminDeleteUser(admin.id, 'SUPERADMIN', target.id);
      expect(await prisma.user.findUnique({ where: { id: target.id } })).toBeNull();
    });
  });
});
