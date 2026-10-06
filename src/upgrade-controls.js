import { previewUpgrade, UPGRADE_RULES } from './upgrade-model.js';

export function installUpgradeControls(game,canvas){
  const panel=document.getElementById('upgradePanel'),choices=document.getElementById('upgradeChoices');
  const build=document.getElementById('buildSummary');
  let shownDraft=null;
  panel.addEventListener('keydown',event=>{
    if(event.defaultPrevented||event.repeat||event.ctrlKey||event.metaKey||event.altKey||game.mode!=='upgrade'||shownDraft!==game.draft)return;
    const match=/^(?:Digit|Numpad)([123])$/.exec(event.code);
    if(!match)return;
    const button=choices.children[Number(match[1])-1];
    if(button){event.preventDefault();button.click();}
  });
  return ()=>{
    const visible=game.mode==='upgrade';
    panel.hidden=!visible;
    if(!visible){
      if(shownDraft && panel.contains(document.activeElement))canvas.focus();
      shownDraft=null;return;
    }
    if(shownDraft===game.draft)return;
    shownDraft=game.draft;
    const draft=game.draft;
    choices.replaceChildren();
    build.textContent=`Health ${game.player.hp}/${game.mods.maxHp} · Damage ${game.mods.damage} · Serve balls ${1+game.mods.extraBalls}`;
    draft.forEach((relic,index)=>{
      const button=document.createElement('button');button.type='button';button.className='upgrade-choice';
      const category=document.createElement('small');category.textContent=`${index+1} · ${UPGRADE_RULES[relic.id][1]}`;
      const name=document.createElement('strong');name.textContent=relic.name;
      const description=document.createElement('span');description.textContent=relic.desc;
      const effect=document.createElement('span');effect.className='upgrade-effect';
      effect.textContent=previewUpgrade(relic,game).changes.join(' · ');
      button.append(category,name,description,effect);
      button.addEventListener('click',()=>{
        if(game.mode!=='upgrade'||game.draft!==draft)return;
        game.chooseRelic(index);panel.hidden=true;canvas.focus();
      });
      choices.append(button);
    });
    choices.querySelector('button')?.focus();
  };
}
