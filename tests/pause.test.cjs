const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {readFileSync}=require('node:fs');
const path=require('node:path');
for(const entry of ['main.js','app.js'])test(`${entry}: pause offers Resume; repeated P does not flicker or restart`,()=>{
 const events={},buttonEvents={};let runs=0,focused=false;
 const button={addEventListener(k,f){buttonEvents[k]=f;}};
 const canvas={addEventListener(){},focus(){focused=true;}};
 const game={mode:'playing',paused:false,keys:new Set(),newRun(){runs++;},syncButton(){button.hidden=!this.paused;button.textContent='Resume';}};
 const context=vm.createContext({game,button,canvas,window:{addEventListener(k,f){events[k]=f;}}});
 const source=readFileSync(path.join(__dirname,'..','src',entry),'utf8');
 vm.runInContext(source.slice(source.indexOf("button.addEventListener('click'"),source.indexOf("window.addEventListener('resize'")),context);
 events.blur();assert.equal(game.paused,true);assert.equal(button.hidden,false);
 buttonEvents.click();assert.equal(game.paused,false);assert.equal(runs,0);assert.equal(focused,true);
 events.keydown({code:'KeyP',repeat:false});assert.equal(game.paused,true);
 events.keydown({code:'KeyP',repeat:true});assert.equal(game.paused,true);
});
test('pause button exposes an accessible Resume label only during paused gameplay',()=>{
 const source=readFileSync(path.join(__dirname,'..','src','game.js'),'utf8');
 const method=source.match(/  syncButton\(\)\{[^\n]+/)[0];
 const context=vm.createContext({});
 const sync=vm.runInContext(`({${method}}).syncButton`,context);
 const game={mode:'playing',paused:true,button:{}};
 sync.call(game);assert.equal(game.button.textContent,'Resume');assert.equal(game.button.hidden,false);
 game.paused=false;sync.call(game);assert.equal(game.button.hidden,true);
});
