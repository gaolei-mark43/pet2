import test from 'node:test';
import assert from 'node:assert/strict';
import { observedPluginCatalog as catalog, mergePluginCatalog } from '../src/observedPluginCatalog.js';

test('observed picker has 39 distinct entries and the verified yocto order', () => {
  assert.equal(catalog.length, 39);
  assert.equal(new Set(catalog.map(x => x[0])).size, 39);
  assert.deepEqual(catalog.filter(x => x[1] === 'yocto').map(x => x[0]), [
    'yocto_setup_build', '[yocto]生成SourceRevision', '[yocto]收集SourceRevision', '[yocto]上传SourceRevision',
  ]);
});

test('legacy demo entries do not override observed catalog; user publications remain selectable', () => {
  const merged = mergePluginCatalog(catalog, [
    {id:'pl1',name:'Groovy命令行',category:'错误',status:'已发布'},
    {id:'user-1',name:'本地插件',category:'测试',source:'自定义',status:'已发布'},
    {id:'user-2',name:'草稿',status:'草稿'},
  ]);
  assert.equal(merged.find(x => x[0] === 'Groovy命令行')[1], '通用');
  assert.ok(merged.some(x => x[0] === '本地插件'));
  assert.ok(!merged.some(x => x[0] === '草稿'));
});

test('a user-owned publication can override a same-name catalog entry without duplicate cards', () => {
  const merged = mergePluginCatalog(catalog, [{id:'user-3',name:'Groovy命令行',category:'通用',source:'自定义',description:'local version',status:'已发布'}]);
  assert.equal(merged.filter(x => x[0] === 'Groovy命令行').length, 1);
  assert.equal(merged[0][3], 'local version');
});
