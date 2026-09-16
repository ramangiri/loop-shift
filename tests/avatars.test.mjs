import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
test('requested names use short-haired boy artwork and others use girl artwork without remote images',()=>{
 const scope={window:{},document:{createElement:()=>({})}};vm.runInNewContext(readFileSync(new URL('../www/avatars.js',import.meta.url),'utf8'),scope);
 const make=name=>decodeURIComponent(scope.window.LoopShiftAvatar.make(name).src);
 for(const name of ['Giri','Naveen','Arun','Sam',' GIRI '])assert.ok(make(name).includes('M18 31Q14 9'));
 for(const name of ['Girija','Maya','KEERTHI','Mom'])assert.ok(make(name).includes('M12 50L14 27'));
 assert.equal(make('Giri'),make('Giri'));assert.ok(!make('<script>alert(1)</script>').includes('<script>'));assert.ok(make('Sam').startsWith('data:image/svg+xml,'));
});
