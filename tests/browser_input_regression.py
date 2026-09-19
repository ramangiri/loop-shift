"""Full client-stack input regression, isolated from real accounts and the network.

Run: python3 -m pip install playwright; python3 -m playwright install chromium
     python3 tests/browser_input_regression.py
Set CHROMIUM_PATH to use an existing Chromium executable instead.
The fixture loads index.html and every JS layer in production order, but replaces
storage/network with local test doubles. It is not a physical-device latency test.
"""
import base64
import json
import os
import re
import shutil
from pathlib import Path

from playwright.sync_api import sync_playwright

WEB = Path(__file__).resolve().parents[1] / 'www'
SEEN = [
    'loop-shift-preplay-v2', 'loop-shift-howto-no-hold-v1',
    'loop-shift-pause-coach-seen-v2', 'loop-shift-special-reward-guide-v1',
    'loop-shift-ring-lesson-v2', 'loop-shift-learned-fever', 'loop-shift-learned-rush',
]


def load_client(page):
    html = (WEB / 'index.html').read_text()
    scripts = re.findall(r'<script[^>]+src="\./([^"?]+)"[^>]*></script>', html)
    styles = re.findall(r'<link[^>]+href="\./([^"]+\.css)"[^>]*>', html)
    layers = re.findall(r"load\('\./([^']+)'", (WEB / 'player-feedback.js').read_text())
    assert 'player-feedback-base.js' in layers and 'reaction-clarity.js' in layers
    html = re.sub(r'<script\b[^>]*>.*?</script>|<link\b[^>]*>', '', html, flags=re.S)
    page.set_content(html, wait_until='domcontentloaded')
    page.evaluate('''seen => {
      const store = new Map(seen.map(key => [key, 'true']));
      Object.defineProperty(window, 'localStorage', {value: {
        getItem:key => store.get(key) ?? null,
        setItem:(key,value) => store.set(key,String(value)),
        removeItem:key => store.delete(key)
      }});
      window.fetch = async () => new Response(JSON.stringify({entries:[],me:null}),
        {headers:{'Content-Type':'application/json'}});
    }''', SEEN)
    font = base64.b64encode((WEB / 'arcade.woff').read_bytes()).decode()
    for name in styles:
        css = (WEB / name).read_text().replace("'./arcade.woff'", "'data:font/woff;base64," + font + "'")
        page.add_style_tag(content=css)
    # The asynchronous loader is represented by its exact ordered list of files.
    for name in [s for s in scripts if s != 'player-feedback.js'] + layers:
        page.add_script_tag(content=(WEB / name).read_text() + '\n//# sourceURL=' + name)
    page.evaluate('''window.LoopShiftBoard = {
      ready:()=>true, best:()=>null, record:()=>({}), player:()=>null,
      beginRound(){}, refresh(){}, submit(){}, saveProgress(){}
    }; window.LoopShiftSocial = undefined; preplaySeen = true;''')
    return len(scripts) - 1 + len(layers)


CHECK_STACK = r'''() => {
  let checks=0;
  const check=(condition,message)=>{checks++;if(!condition)throw Error(message);};
  const tap=id=>$(id).dispatchEvent(new PointerEvent('pointerdown',{
    bubbles:true,cancelable:true,pointerId:1,pointerType:'touch',isPrimary:true,button:0,
    clientX:190,clientY:300
  }));
  const release=()=>document.dispatchEvent(new PointerEvent('pointerup',{
    bubbles:true,pointerId:1,pointerType:'touch',isPrimary:true,button:0
  }));
  const space=()=>$('shift').dispatchEvent(new KeyboardEvent('keydown',{
    bubbles:true,cancelable:true,code:'Space',key:' ',repeat:false
  }));
  const prepare=(lv,from,countdown)=>{
    for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
    mode='playing';screen='game';roundKind='endless';trainingWaiting=false;
    focusRun=false;comfortRun=false;comfortStop=false;breakPending=false;
    ringLessonPending=false;ringLessonSeen=true;levelTransition=null;departingRows=[];
    rushTime=0;rushQueued=false;feverTime=0;comeback=null;activeSinceBreak=0;
    level=lv;ringCount=ringLimit(lv);lane=from;radius=laneRadius(lane);pathLane=lane;
    angle=-Math.PI/2;gameTime=5;inputTime=0;lastShift=-1;lastShiftInput=-1;
    startDelay=countdown;passes=(lv-1)*12;rows=[];nextRowIndex=passes;
    motionSpeed=targetSpeed();addRow(angle+2,passes);
    $('shift').disabled=false;lastGuideTarget=-1;updateGuide();
  };
  const firstTap=(fire,label)=>{
    const from=lane,expected=guidedTarget(),beforeRadius=radius;
    const frozen=JSON.stringify([angle,gameTime,score,passes,rushTime,feverTime]);
    check(expected!==from,label+': fixture must require a move');
    fire();check(lane===expected,label+': first input follows BLUE');
    check(Math.abs(lane-from)===1,label+': one adjacent ring per input');
    release();check(lane===expected,label+': release does not double-shift');
    const countdown=startDelay;
    update(1/120);
    check(Math.abs(radius-laneRadius(lane))<Math.abs(beforeRadius-laneRadius(lane)),
      label+': ball moves on the first physics step');
    if(countdown>0)check(JSON.stringify([angle,gameTime,score,passes,rushTime,feverTime])===frozen,
      label+': countdown keeps hazards, timers and score frozen');
  };
  for(let lv=1;lv<=100;lv++){
    for(const countdown of [1.5,0]){
      for(const from of [0,ringLimit(lv)-1]){
        for(const input of ['shift','game-screen','Space']){
          prepare(lv,from,countdown);
          firstTap(input==='Space'?space:()=>tap(input),`Level ${lv} ${input} delay ${countdown}`);
        }
      }
    }
  }
  // Repeated inputs cannot bypass the countdown cooldown or bounce away from BLUE.
  prepare(13,0,1.5);rows[0].sparkLane=2;rows[0].switching=false;
  tap('game-screen');check(lane===1,'multi-ring first tap');
  tap('game-screen');check(lane===1,'same-time duplicate is ignored');
  update(.1);tap('game-screen');check(lane===2,'deliberate next tap after cooldown');
  update(.1);tap('game-screen');check(lane===2,'reached BLUE stays safe');

  // Actual level boundaries, including the automatic five-level checkpoint rests.
  for(let lv=1;lv<100;lv++){
    prepare(lv,0,0);passes=lv*12;levelUp(lv+1);
    if(mode==='paused')setPaused(false,false);
    if(guidedTarget()===lane){lane=rows[0].entryLane;radius=laneRadius(lane);}
    lastShift=-1;lastShiftInput=-1;
    firstTap(()=>tap('game-screen'),`Boundary ${lv} to ${lv+1}`);
  }

  // Pause cannot move the ball; the very first tap after Resume must work.
  prepare(1,1,0);setPaused(true,false);
  const paused=JSON.stringify([lane,radius,angle,gameTime,score]);
  tap('game-screen');update(.2);
  check(JSON.stringify([lane,radius,angle,gameTime,score])===paused,'pause freezes input and world');
  setPaused(false,false);firstTap(()=>tap('game-screen'),'Resume');

  // Real retry route (rather than setting startDelay to zero in a test).
  prepare(1,1,0);crash();$('play').click();
  check(startDelay===.45,'retry retains its short safe opening');
  firstTap(()=>tap('game-screen'),'Try Again');

  // Save and reload every eligible checkpoint using the real serialization path.
  for(let completed=5;completed<100;completed+=5){
    prepare(completed,0,0);passes=completed*12;levelUp(completed+1);
    check(mode==='paused'&&checkpointEligible,'checkpoint '+completed+' is eligible');
    lane=rows[0].entryLane;radius=laneRadius(lane);
    saveCheckpoint(true);resumeCheckpoint();
    check(level===completed+1&&startDelay>0,'checkpoint restores with safe opening');
    firstTap(()=>tap('game-screen'),'Checkpoint '+completed);
  }

  prepare(1,1,0);roundKind='practice';practiceLevel=1;start({fresh:true});
  firstTap(()=>tap('game-screen'),'Practice start');

  // Fire Ball resume: preserve its five-second duration and frozen reward timers.
  prepare(13,1,0);startRush();
  const nextCoin=rushCoins.find(c=>c.lane!==lane);angle=nextCoin.angle-.2;
  setPaused(true,false);setPaused(false,false);
  firstTap(()=>tap('game-screen'),'Fire Ball resume');
  check(rushTime===5,'countdown input does not spend Fire Ball time');

  prepare(1,1,0);roundKind='tutorial';tutorialStage=0;rows=[];
  const tutorialFrom=lane;tap('game-screen');
  check(lane!==tutorialFrom,'tutorial first tap still works');
  lastTime=performance.now();frameCarry=0;mode='paused';
  return {checks,levels:100,boundaries:99,checkpoints:19};
}'''


def main():
    results = []
    with sync_playwright() as p:
        executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
        options = {'headless': True}
        if executable:
            options['executable_path'] = executable
        browser = p.chromium.launch(**options)
        try:
            for width, height, mobile in [(390,744,True),(320,568,True),(1366,768,False)]:
                context = browser.new_context(viewport={'width':width,'height':height},
                    device_scale_factor=2 if mobile else 1,is_mobile=mobile,has_touch=mobile)
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                loaded = load_client(page)
                page.locator('#home-play').click()
                before = page.evaluate('({lane,radius,target:guidedTarget(),angle,startDelay,gameTime})')
                assert before['startDelay'] > 0 and before['target'] != before['lane']
                box = page.locator('#arena').bounding_box()
                x,y = box['x']+box['width']/2,box['y']+box['height']/2
                if mobile:
                    page.touchscreen.tap(x,y)
                else:
                    page.mouse.click(x,y)
                immediate = page.evaluate('({lane,radius})')
                assert immediate['lane'] == before['target'], 'Full-stack first pointer tap was swallowed'
                page.wait_for_timeout(60)
                visual = page.evaluate('({radius,targetRadius:laneRadius(lane),angle,gameTime,startDelay})')
                assert abs(visual['radius']-visual['targetRadius']) < abs(before['radius']-visual['targetRadius'])
                assert visual['startDelay'] > 0 and visual['gameTime'] == before['gameTime']
                assert visual['angle'] == before['angle']
                result = page.evaluate(CHECK_STACK)
                assert not errors, errors
                results.append({'viewport':f'{width}x{height}','scripts':loaded,
                    'trusted_first_tap':'pass',**result})
                context.close()
        finally:
            browser.close()
    print(json.dumps({'status':'PASS','results':results},indent=2))


if __name__ == '__main__':
    main()
