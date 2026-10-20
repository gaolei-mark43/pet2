import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_ROLE_PERMISSIONS, effectiveUserPermissions, normalizeRole, permissionsFromReference, pluginCapabilities, togglePermission, togglePermissionSet } from '../src/rolePermissionModel.js';

test('platform administrator is immutable and always owns the complete permission catalog', () => {
  const role = normalizeRole({ id: 'admin', name: '平台管理员', permissionList: [] });
  assert.equal(role.locked, true);
  assert.deepEqual(role.permissionList, ALL_ROLE_PERMISSIONS);
});

test('permission, page and module toggles are reversible without duplicates', () => {
  const first = ALL_ROLE_PERMISSIONS[0];
  const page = ALL_ROLE_PERMISSIONS.slice(0, 4);
  assert.deepEqual(togglePermission([], first, true), [first]);
  assert.deepEqual(togglePermission([first], first, false), []);
  assert.deepEqual(togglePermissionSet([first], page, true), page);
  assert.deepEqual(togglePermissionSet(page, page, false), []);
});

test('reference role copies a detached permission snapshot', () => {
  const reference = { name: '开发人员', permissionList: ALL_ROLE_PERMISSIONS.slice(0, 3) };
  const inherited = permissionsFromReference(reference);
  inherited.push('额外权限');
  assert.equal(reference.permissionList.includes('额外权限'), false);
});

test('plugin capabilities follow the current user role instead of only changing the matrix UI', () => {
  const db = {
    users: [{ name: 'viewer', roles: '插件查看者' }],
    roles: [{ name: '插件查看者', permissionList: ['查看插件', '导出插件'] }],
  };
  const capabilities = pluginCapabilities(effectiveUserPermissions(db, 'viewer'));
  assert.equal(capabilities.view, true);
  assert.equal(capabilities.export, true);
  assert.equal(capabilities.create, false);
  assert.equal(capabilities.publish, false);
});

test('platform administrator receives new plugin permissions automatically', () => {
  const db = { users: [{ name: 'admin', roles: '平台管理员' }], roles: [{ name: '平台管理员', permissionList: [] }] };
  const capabilities = pluginCapabilities(effectiveUserPermissions(db, 'admin'));
  assert.ok(Object.values(capabilities).every(Boolean));
});
