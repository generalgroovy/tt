const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {readFileSync}=require('node:fs');
const path=require('node:path');

test('touch pointer press positions the paddle and routes a pending serve',()=>{
 const events={};let served=0,focused=false,prevented=false;
 const canvas={getBoundingClientRect:()=>({left:0,top:0}),addEventListener(name,fn){events[name]=fn;},focus(){focused=true;}};
 const game={mode:'playing',paused:false,player:{h:60},pointer:{lastX:null,lastY:null},playerZone:()=>({x1:0,x2:130,y1:0,y2:844}),launchFreeServe(){served++;return true;},keys:new Set()};
 const source=readFileSync(path.join(__dirname,'../src/main.js'),'utf8');
 const context=vm.createContext({canvas,game,button:{addEventListener(){}},window:{addEventListener(){}}});
 vm.runInContext(source.slice(source.indexOf('function point'),source.indexOf('function loop')),context);
 vm.runInContext(source.slice(source.indexOf("button.addEventListener('click'"),source.indexOf("window.addEventListener('resize'")),context);
 events.pointerdown({pointerType:'touch',clientX:70,clientY:300,preventDefault(){prevented=true;}});
 assert.equal(served,1);assert.equal(game.pointer.x,70);assert.equal(game.pointer.y,300);
 assert.equal(focused,true);assert.equal(prevented,true);
});

test('narrow HUD wraps introductory dialogue inside its panel and names the serve action',()=>{
 const texts=[],panels=[];
 const ctx={save(){},restore(){},beginPath(){},roundRect(...args){panels.push(args);},fill(){},fillRect(){},measureText(text){return {width:text.length*7};},fillText(...args){texts.push(args);}};
 class Renderer {}
 const context=vm.createContext({Renderer,Colors:{},clamp:(value,min,max)=>Math.max(min,Math.min(max,value))});
 const source=readFileSync(path.join(__dirname,'../src/shippable-polish.js'),'utf8');
 vm.runInContext(source.slice(source.indexOf('Renderer.prototype.hud = function hudMinimal')),context);
 const dialogue='Follow the pointer. Angle with A/D. Load spin, then release it into the ball.';
 const renderer=new Renderer();renderer.ctx=ctx;renderer.game={W:390,H:844,level:-5,player:{hp:5},enemy:{hp:5,maxHp:5,stamina:1},mods:{maxHp:5},balls:[],spinIntent:0,freeServe:true,dialogue:{text:dialogue,life:5,maxLife:5},notes:[]};
 renderer.hud();
 const lines=texts.filter(args=>args.length===4),panel=panels.find(args=>args[1]===78);
 assert.ok(lines.length>1);assert.equal(lines.map(args=>args[0]).join(' '),dialogue);
 for(const [text,x,y,width] of lines){assert.ok(ctx.measureText(text).width<=width);assert.ok(x>=panel[0]);assert.ok(x+width<=panel[0]+panel[2]);assert.ok(y<panel[1]+panel[3]);}
 assert.ok(texts.some(args=>args[0]==='Tap / click / Space to serve'));
});
