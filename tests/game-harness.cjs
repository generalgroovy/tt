exports.loadGame=async()=>{
  await import('../src/pro-overhaul.js');
  await import('../src/playability-hotfix.js');
  await import('../src/shippable-polish.js');
  await import('../src/skill-depth.js');
  const {Game}=await import('../src/game.js');
  const game=new Game({style:{}},{hidden:true});
  game.newRun();game.blocks=[];game.previews=[];game.notes=[];game.dialogue=null;
  game.targetBlocks=()=>0;
  return game;
};
