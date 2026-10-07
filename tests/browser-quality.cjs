// Run in GitHub CI. Source instrumentation is confined to this browser's route;
// it exposes fixtures for hard-to-reach game states, never production globals.
const {chromium,expect}=require('@playwright/test');
const {mkdirSync,writeFileSync}=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
  mkdirSync('test-results',{recursive:true});
  const browser=await chromium.launch(),results=[];
  try{
    for(const width of [1366,844,390,320]){
      const context=await browser.newContext({viewport:{width,height:width===1366?768:width===844?420:844},hasTouch:width<1000});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
      await page.route('**/src/main.js',async route=>{
        const response=await route.fetch();
        await route.fulfill({response,body:(await response.text())+'\nwindow.testGame=game;'});
      });
      await page.goto('http://127.0.0.1:8080/');
      await page.getByRole('button',{name:'Practice · learn controls',exact:true}).click();
      const layout=await page.evaluate(()=>({canvasBottom:document.querySelector('canvas').getBoundingClientRect().bottom,controlsTop:document.getElementById('paddleControls').getBoundingClientRect().top}));
      assert.ok(layout.canvasBottom<=layout.controlsTop,JSON.stringify(layout));
      const canvas=page.locator('#game'),box=await canvas.boundingBox();
      if(width===1366){
        await canvas.focus();
        await page.keyboard.down('ArrowDown');
        await expect(page.locator('#practiceStatus')).toContainText('Tilt');
        await page.keyboard.up('ArrowDown');
        const y=await page.evaluate(()=>testGame.player.y);
        await page.waitForTimeout(100);
        assert.equal(await page.evaluate(()=>testGame.player.y),y);
      }else await page.mouse.move(80,box.y+box.height/2+55);
      await expect(page.locator('#practiceStatus')).toContainText('Tilt');
      await page.getByRole('button',{name:'Tilt paddle clockwise'}).click();
      assert.equal(await page.locator('#angleRight').evaluate(el=>el===document.activeElement),true);
      await page.locator('#angleRight').press('Enter');
      assert.equal(await page.locator('#angleRight').evaluate(el=>el===document.activeElement),true);
      await expect(page.locator('#practiceStatus')).toContainText('Choose Backspin');
      await page.getByRole('button',{name:'Topspin',exact:true}).click();
      assert.equal(await page.getByRole('button',{name:'Topspin',exact:true}).evaluate(el=>el===document.activeElement),true);
      await expect(page.locator('#practiceStatus')).toContainText('Serve the charged');
      await page.screenshot({path:`test-results/practice-${width}.png`});
      await page.getByRole('button',{name:'Serve',exact:true}).click();
      await expect(page.locator('#practiceStatus')).toContainText('Ready.');
      await page.getByRole('button',{name:'Pause',exact:true}).click();
      await expect(page.locator('#practiceStatus')).toContainText('Paused');
      assert.equal(await page.locator('#pauseControl').evaluate(el=>el===document.activeElement),true);
      const paused=await page.evaluate(()=>JSON.stringify({clock:testGame.clock,balls:testGame.balls,enemy:testGame.enemy}));
      await page.waitForTimeout(150);
      assert.equal(await page.evaluate(()=>JSON.stringify({clock:testGame.clock,balls:testGame.balls,enemy:testGame.enemy})),paused);
      await canvas.press('Space');
      assert.equal(await page.evaluate(()=>JSON.stringify({clock:testGame.clock,balls:testGame.balls,enemy:testGame.enemy})),paused);
      await page.locator('#pauseControl').click();
      await page.getByRole('button',{name:'Start game',exact:true}).click();
      await expect(page.locator('#practiceStatus')).toContainText('Your serve');
      await page.getByRole('button',{name:'Serve',exact:true}).click();
      await expect(page.locator('#practiceStatus')).toContainText('Rally');
      assert.equal(await page.locator('#serveButton').isDisabled(),true);
      // Explicit test fixture: finish a round to exercise the real transition/UI.
      const clearRound=async()=>{
        await page.evaluate(()=>{testGame.enemy.hp=1;testGame.hitEnemy(1,testGame.W-70,200);});
        await expect(page.locator('#upgradePanel')).toBeVisible();
        await expect(page.locator('.upgrade-choice')).toHaveCount(3);
        assert.equal(await page.evaluate(()=>document.activeElement.className),'upgrade-choice');
      };
      await clearRound();
      await page.screenshot({path:`test-results/upgrades-${width}.png`});
      // Digit shortcut must work while the native first card owns focus.
      let level=await page.evaluate(()=>testGame.level);
      await page.keyboard.press('Digit2');
      await expect(page.locator('#upgradePanel')).toBeHidden();
      assert.deepEqual(await page.evaluate(()=>[testGame.level,testGame.freeServe,testGame.balls.length]),[level+1,true,0]);
      await clearRound();level=await page.evaluate(()=>testGame.level);
      await page.keyboard.press('Space');
      await expect(page.locator('#upgradePanel')).toBeHidden();
      assert.deepEqual(await page.evaluate(()=>[testGame.level,testGame.freeServe,testGame.balls.length]),[level+1,true,0]);
      await clearRound();level=await page.evaluate(()=>testGame.level);
      await page.locator('.upgrade-choice').last().press('Enter');
      await expect(page.locator('#upgradePanel')).toBeHidden();
      assert.deepEqual(await page.evaluate(()=>[testGame.level,testGame.freeServe,testGame.balls.length]),[level+1,true,0]);
      // Every card remains actionable on a short landscape screen via panel scrolling.
      await page.setViewportSize({width,height:420});await clearRound();
      await page.locator('.upgrade-choice').last().click();
      await expect(page.locator('#upgradePanel')).toBeHidden();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.deepEqual(errors,[]);results.push({width,practice:true,pausedSpaceInert:true,digit:true,space:true,enter:true,shortViewportLastChoice:true,errors});
      await context.close();
    }
  }finally{await browser.close();writeFileSync('test-results/results.json',JSON.stringify(results,null,2));}
})().catch(error=>{console.error(error);process.exitCode=1;});
