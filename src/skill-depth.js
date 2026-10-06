import { Game } from './game.js';
import { Renderer } from './render.js';
import { CFG, Colors } from './config.js';
import { circleRect, clamp, speedOf } from './utils.js';
import { sweepCircleRect } from './collision.js';

const stamina=Game.prototype.stamina;
Game.prototype.stamina=function(p,moving,dt,drain){
  return stamina.call(this,p,moving,dt,drain*(p===this.player?1-clamp(this.mods.staminaSave||0,0,.8):1));
};
const stabilize=Game.prototype.stabilize;
Game.prototype.stabilize=function(ball,force){
  stabilize.call(this,ball,force);
  // Bound work and extreme pointer flicks; swept contacts still cover each segment.
  const speed=speedOf(ball);
  if(speed>4200){ball.vx*=4200/speed;ball.vy*=4200/speed;}
};
const wallSpin=Game.prototype.wallSpin;
Game.prototype.wallSpin=function(ball,top){
  wallSpin.call(this,ball,top);
  if(ball.wallBounces>1 && this.mods.wallBrake){
    const speed=speedOf(ball),next=Math.max(CFG.ball.minSpeed,speed*(1-this.mods.wallBrake));
    if(speed>next){ball.vx*=next/speed;ball.vy*=next/speed;}
  }
};
const handleBlock=Game.prototype.handleBlock;
Game.prototype.handleBlock=function(block,ball,index,x,y){
  if(this.mods.shear && Math.abs(ball.spin)>.65)block.slow=3;
  const broken=block.hp>0;
  handleBlock.call(this,block,ball,index,x,y);
  if(broken && block.hp<=0 && this.mods.blockKick){ball.vx*=1+this.mods.blockKick;ball.vy*=1+this.mods.blockKick;}
};

Game.prototype.blockHit=function(ball){
  let first=null;
  for(const block of this.blocks){
    const hit=sweepCircleRect({x:ball.prevX,y:ball.prevY},ball,ball.r,block);
    // A moving block may begin overlapping a ball; resolve that contact as well.
    let overlap=null;
    if(!hit && circleRect(ball,block)){
      const dx=ball.x-(block.x+block.w/2),dy=ball.y-(block.y+block.h/2);
      overlap=Math.abs(dx)/(block.w/2)>Math.abs(dy)/(block.h/2)
        ?{t:1,nx:Math.sign(dx)||1,ny:0,x:block.x+(dx>=0?block.w+ball.r:-ball.r),y:ball.y}
        :{t:1,nx:0,ny:Math.sign(dy)||1,x:ball.x,y:block.y+(dy>=0?block.h+ball.r:-ball.r)};
    }
    const contact=hit||overlap;
    if(contact && (!first||contact.t<first.hit.t))first={block,hit:contact};
  }
  if(!first)return false;
  const {block,hit}=first,dot=ball.vx*hit.nx+ball.vy*hit.ny;
  if(dot<0){ball.vx-=2*dot*hit.nx;ball.vy-=2*dot*hit.ny;}
  ball.x=hit.x+hit.nx*.8;ball.y=hit.y+hit.ny*.8;ball.spin*=.95;
  ball.travelDir=Math.sign(ball.vx)||1;
  this.handleBlock(block,ball,this.blocks.indexOf(block),block.x+block.w/2,block.y+block.h/2);
  ball.travelDir=Math.sign(ball.vx)||1;
  return true;
};

export function serveGuide(game){
  if(!game.freeServe||game.bossEnemyServeBall||!game.player)return [];
  const angle=clamp(game.player.angle,-.92,.92);
  const speed=(CFG.ball.startSpeed+Math.max(0,game.level)*8)*game.mods.ballSpeed;
  const ball={x:game.player.x+CFG.ball.serveHoldX,y:game.player.y,r:CFG.ball.r,
    vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
    spin:clamp(game.spinIntent*CFG.spin.intentionalGain,-CFG.ball.maxSpin,CFG.ball.maxSpin),lastHit:'player'};
  const points=[{x:ball.x,y:ball.y}];
  // The opening direction only: stop before a wall/block; this is not an outcome promise.
  for(let i=0;i<18;i++){
    const prev={x:ball.x,y:ball.y};
    game.applySpin(ball,.008);game.stabilize(ball);
    ball.x+=ball.vx*.008;ball.y+=ball.vy*.008;
    if(ball.x>game.W-20||ball.y<game.arenaTop()+ball.r||ball.y>game.arenaBottom()-ball.r
      ||game.blocks.some(block=>sweepCircleRect(prev,ball,ball.r,block)))break;
    points.push({x:ball.x,y:ball.y});
  }
  return points;
}
const balls=Renderer.prototype.balls;
Renderer.prototype.balls=function(){
  const points=serveGuide(this.game),ctx=this.ctx;
  if(points.length>1){
    ctx.save();ctx.strokeStyle=Colors.cyan;ctx.globalAlpha=.65;ctx.lineWidth=2;ctx.setLineDash([4,6]);
    ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.restore();
  }
  balls.call(this);
};
// Native upgrade controls own hit testing, text wrapping, focus and scrolling.
Renderer.prototype.upgrades=function(){this.overlay(.86);};
Renderer.prototype.pause=function(){
  this.overlay(.7);const {ctx,game:g}=this;
  ctx.save();ctx.fillStyle=Colors.text;ctx.textAlign='center';ctx.font='800 32px sans-serif';
  ctx.fillText('Paused',g.W/2,g.H*.4,g.W-32);
  ctx.font='16px sans-serif';ctx.fillStyle=Colors.muted;
  ctx.fillText('Resume when ready.',g.W/2,g.H*.4+32,g.W-32);ctx.restore();
};
