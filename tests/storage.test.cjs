const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const source=readFileSync(path.join(__dirname,'../src/storage.js'),'utf8').replaceAll('export ','');
function setup(storage){const ctx=vm.createContext({localStorage:storage});vm.runInContext(source,ctx);return code=>vm.runInContext(code,ctx);}
test('blocked reads and writes preserve a playable in-memory session',()=>{
  const run=setup({getItem(){throw Error('blocked');},setItem(){throw Error('quota');}});
  assert.equal(run('readBestScore()'),0);
  assert.equal(run("readSetting('tap-skip-intro')"),'');
  assert.equal(run("writeSetting('score',123)"),false);
});
test('corrupt score values never propagate NaN, infinity or negative best scores',()=>{
  for(const value of ['broken','Infinity','-1',null])assert.equal(setup({getItem:()=>value})('readBestScore()'),0);
  assert.equal(setup({getItem:()=>'420'})('readBestScore()'),420);
});
test('stored settings survive normal writes',()=>{
  const data=new Map();const run=setup({getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)});
  assert.equal(run("writeSetting('tap-skip-intro','1')"),true);
  assert.equal(run("readSetting('tap-skip-intro')"),'1');
});
