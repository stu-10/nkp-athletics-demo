import { Race, VersusRace } from './race.js';
const $=id=>document.getElementById(id), soloRace=new Race(), versusRace=new VersusRace(), canvas=$('track'), ctx=canvas.getContext('2d');
let mode='solo', race=soloRace;
let previous=performance.now(), saved=false, best=null;
try { const n=Number(localStorage.getItem('cng-best')); if(n>0 && Number.isFinite(n)) best=n; } catch {}
function bestText(){ $('best').textContent=best ? best.toFixed(2)+'s' : '—'; } bestText();
fetch('/version.json').then(r=>r.json()).then(v=>{ $('version').textContent=`v${v.version} · ${v.commit.slice(0,7)}`; $('banner').textContent=v.banner; }).catch(()=>{});
function show(title,message,button='Race again') { $('overlay').classList.remove('hidden'); $('headline').textContent=title; $('message').textContent=message; $('start').firstChild.textContent=button+' '; $('status').textContent=title+' '+message; }
function selectGame(next){
 $('result-entry').hidden=true;soloRace.reset();versusRace.reset();mode=next;race=mode==='solo'?soloRace:versusRace;saved=false;
 $('game-menu').hidden=true;$('game-panel').hidden=false;
 for(const id of ['solo-scoreboard','solo-controls'])$(id).hidden=mode!=='solo';
 for(const id of ['versus-scoreboard','versus-controls'])$(id).hidden=mode!=='versus';
 $('event-label').textContent=mode==='solo'?'EVENT 01 · SOLO':'EVENT 02 · LOCAL TWO PLAYER';
 $('event-title').textContent=mode==='solo'?'100m Sprint':'VS Race · 100m';
 $('callout').textContent=mode==='solo'?'CHASE YOUR PERSONAL BEST':'WHITE: PLAYER 1 · GOLD: PLAYER 2';
 show(mode==='solo'?'Ready, athlete?':'Ready, racers?',mode==='solo'?'Alternate A and L to sprint. Timing is everything.':'Player 1: alternate A / S. Player 2: alternate K / L. Wait for GO!','Start race');
 $('start').focus();
}
$('select-solo').addEventListener('click',()=>selectGame('solo'));
$('select-versus').addEventListener('click',()=>selectGame('versus'));
$('change-game').addEventListener('click',()=>{soloRace.reset();versusRace.reset();saved=false;$('game-panel').hidden=true;$('game-menu').hidden=false;$(mode==='solo'?'select-solo':'select-versus').focus();});
$('start').addEventListener('click',()=>{ $('result-entry').hidden=true;race.start(performance.now()); saved=false; $('overlay').classList.add('hidden'); $('status').textContent='On your marks. Wait for GO.'; });
function step(side,player=0){if($('game-panel').hidden)return;if(mode==='solo')race.step(side,performance.now());else race.step(player,side,performance.now());}
document.addEventListener('keydown',e=>{
 if(e.target.closest?.('input, textarea, select')||$('leaderboard-dialog').open||$('game-panel').hidden||e.altKey||e.ctrlKey||e.metaKey)return;
 const key=e.key.toLowerCase();
 const mapping=mode==='solo'?{a:[0,'left'],l:[0,'right'],arrowleft:[0,'left'],arrowright:[0,'right']}:{a:[0,'left'],s:[0,'right'],k:[1,'left'],l:[1,'right']};
 if(mapping[key]){e.preventDefault();if(!e.repeat){const [player,side]=mapping[key];step(side,player);}}
});
for(const side of ['left','right'])$(side).addEventListener('pointerdown',e=>{e.preventDefault();step(side);});
for(let player=0;player<2;player++)for(const side of ['left','right'])$(`p${player+1}-${side}`).addEventListener('pointerdown',e=>{e.preventDefault();step(side,player);});
document.addEventListener('visibilitychange',()=>{if(document.hidden && ['countdown','running'].includes(race.state)){race.reset();show('Race paused','The tab was hidden. Start a fresh race.');}});
// Keyframed sprint poses separate extension, heel recovery, and knee drive.
function athlete(x,y,color,distance,speed,lane){
 const moving=speed>.05, effort=Math.min(1,speed/10);
 const phase=distance*Math.PI*2/4.8+lane*.7;
 const bob=moving?-(Math.sin(phase*2)**2)*1.5*effort:0;
 const hip={x:x,y:y-23+bob}, shoulder={x:x+2+3*effort,y:y-34+bob};
 const skin=['#c58b62','#ead3bd','#dba579','#a86d4d','#e0b18e'][lane];
 function stroke(points,width,ink){ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))ctx.lineTo(p.x,p.y);ctx.lineWidth=width;ctx.strokeStyle=ink;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}
 function leg(offset,far){
  const t=((phase/(Math.PI*2)+offset)%1+1)%1;
  // Angles are measured from vertical. Knee flexion folds the heel
  // behind the thigh instead of forcing every knee into a crouched pose.
  const poses=[
   [0,.35,.12],       // extended leg reaching for touchdown
   [.18,-.15,.08],    // almost straight support leg beneath the hip
   [.34,-.95,.35],    // full backwards drive / toe-off
   [.5,-.65,2.15],    // heel recovered high behind the body
   [.7,1.05,2.25],    // forward knee drive, heel tucked under thigh
   [.86,1.1,1.05],    // lower leg unfolds for the next contact
   [1,.35,.12]
  ];
  let thigh=far?-.15:.15,flex=.08;
  if(moving){
   const i=poses.findIndex((p,index)=>index>0&&t<=p[0]);
   const a=poses[i-1],b=poses[i],u=(t-a[0])/(b[0]-a[0]);
   const blend=u*u*(3-2*u);
   thigh=(a[1]+(b[1]-a[1])*blend)*(.55+.45*effort);
   flex=.08+(a[2]+(b[2]-a[2])*blend-.08)*(.5+.5*effort);
  }
  const knee={x:hip.x+Math.sin(thigh)*12,y:hip.y+Math.cos(thigh)*12};
  const foot={x:knee.x+Math.sin(thigh-flex)*12,y:knee.y+Math.cos(thigh-flex)*12};
  stroke([hip,knee],5,far?'#767080':'#ece9f5');
  stroke([knee,foot],3.5,far?'#956a50':skin);
  stroke([{x:foot.x-2,y:foot.y},{x:foot.x+5,y:foot.y-1}],3,far?'#292332':'#fff');
 }
 function arm(offset,far){
  const swing=moving?-Math.cos(phase+offset)*1.05*(.5+.5*effort):-.15;
  const elbow={x:shoulder.x+Math.sin(swing)*9,y:shoulder.y+Math.cos(swing)*9};
  // The bent forearm swings with the upper arm, driving towards the face.
  const hand={x:elbow.x+Math.cos(swing)*8,y:elbow.y-Math.sin(swing)*8};
  stroke([shoulder,elbow,hand],3,far?'#956a50':skin);
 }
 ctx.save();
 ctx.fillStyle='#23183b55';ctx.beginPath();ctx.ellipse(x+1,y+3,14,2.5,0,0,Math.PI*2);ctx.fill();
 arm(Math.PI,true);leg(.5,true);
 stroke([hip,shoulder],9,color);
 stroke([{x:hip.x-3,y:hip.y},{x:hip.x+3,y:hip.y}],6,'#342a4c');
 leg(0,false);arm(0,false);
 stroke([shoulder,{x:shoulder.x+1,y:shoulder.y-4}],3,skin);
 ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(shoulder.x+1,shoulder.y-7,4,5,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#292332';ctx.beginPath();ctx.ellipse(shoulder.x,shoulder.y-10,4,2.5,-.2,Math.PI,Math.PI*2);ctx.fill();
 ctx.fillStyle='#292332';ctx.fillRect(shoulder.x+3,shoulder.y-8,1,1);
 ctx.restore();
}
function draw(now){
 const w=1100;ctx.fillStyle='#25212e';ctx.fillRect(0,0,w,400);
 for(let row=0;row<4;row++)for(let col=0;col<80;col++){ctx.fillStyle=['#514466','#756288','#aaa0b9','#393241'][(row*3+col*7)%4];ctx.fillRect(col*14+3,18+row*14,7,7);}
 ctx.fillStyle='#19161f';ctx.fillRect(0,82,w,40);ctx.fillStyle='#b6a0ff';ctx.font='bold 13px monospace';ctx.fillText('CLOUD NATIVE GAMES     /     COMMIT → BUILD → DEPLOY',28,107);
 ctx.fillStyle='#7855fa';ctx.fillRect(0,122,w,242);
 const laneCount=mode==='versus'?2:5,laneHeight=240/laneCount;
 for(let i=0;i<laneCount;i++){ctx.fillStyle=i%2?'#7050e6':'#7855fa';ctx.fillRect(0,124+i*laneHeight,w,laneHeight-2);ctx.fillStyle='#d9cdfd';ctx.fillRect(0,122+i*laneHeight,w,2);}
 const finish=970;for(let y=124;y<364;y+=12)for(let x=finish;x<finish+24;x+=12){ctx.fillStyle=((x-finish)/12+(y-124)/12)%2?'#2c2344':'#fff';ctx.fillRect(x,y,12,12);}
 ctx.fillStyle='#eee8ff';ctx.fillRect(95,122,2,242);ctx.font='12px monospace';ctx.fillText('START',70,388);ctx.fillText('100m',955,388);
 for(let lane=0;lane<laneCount;lane++){ctx.fillStyle=mode==='versus'&&lane===1?'#ffd166':'#ded2ff';ctx.font='bold 16px monospace';ctx.fillText(mode==='versus'?`P${lane+1}`:String(lane+1),22,mode==='versus'?190+lane*120:153+lane*48);}
 const active=race.state==='running'||race.state==='finished';
 if(mode==='versus'){
  race.players.forEach((player,i)=>{
   const y=204+i*120;
   athlete(100+player.distance*8.7,y,i===0?'#fff':'#ffd166',player.distance,race.state==='running'?player.speed:0,i===0?1:3);
  });
 }else for(let i=0;i<5;i++){
  const pace=7.5+i*.22;
  const d=i===2?race.distance:active?Math.min(100,race.elapsed*pace):0;
  const speed=race.state==='running'&&d<100?(i===2?race.speed:pace):0;
  athlete(100+d*8.7,156+i*48,i===2?'#fff':['#cbbaff','#514071','#ad91ed','#342a4c'][i>2?i-1:i],d,speed,i);
 }
 if(race.state==='countdown'){ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.font='bold 64px monospace';ctx.fillText(String(Math.max(1,Math.ceil((race.startAt-now)/1000))),550,240);ctx.font='16px monospace';ctx.fillText('WAIT FOR GO!',550,271);ctx.textAlign='left';}
 if(race.state==='running' && race.elapsed<.65){ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 60px monospace';ctx.fillText('GO!',550,230);ctx.textAlign='left';}
}
function frame(now){
 const dt=Math.min((now-previous)/1000,.05);previous=now;race.update(now,dt);draw(now);
 if(mode==='solo'){
  $('time').innerHTML=race.elapsed.toFixed(2)+'<span>s</span>';$('distance').innerHTML=Math.floor(race.distance)+'<span>m</span>';
 }else{
  $('vs-time').innerHTML=race.elapsed.toFixed(2)+'<span>s</span>';
  race.players.forEach((p,i)=>{$(`p${i+1}-distance`).innerHTML=Math.floor(p.distance)+'<span>m</span>';});
 }
 if(race.state==='false-start'&&!saved){
  saved=true;
  if(mode==='solo')show('False start!','Wait for the countdown to finish before taking your first step.');
  else show(`Player ${race.winner+1} wins!`,`Player ${race.offender+1} false-started. Wait for GO before taking a step.`);
 }
 if(race.state==='finished'&&!saved){
  saved=true;
  offerResults();
  if(mode==='versus'){
   $('callout').textContent='FINISH LINE';
   show(race.winner===null?'Dead heat!':`Player ${race.winner+1} wins!`,`${race.elapsed.toFixed(2)} seconds. Ready for a rematch?`,'Race again');
  }else{
   const record=!best||race.elapsed<best;
   if(record){best=race.elapsed;try{localStorage.setItem('cng-best',String(best));}catch{}bestText();}
   $('callout').textContent=record?'NEW PERSONAL BEST':'FINISH LINE';
   show(race.elapsed.toFixed(2)+' seconds',record?'A new record. Ready to go faster?':'Great finish. Try a steadier rhythm for more speed.');
  }
 }
 requestAnimationFrame(frame);
}requestAnimationFrame(frame);

async function loadLeaderboard(){
 $('leaderboard-title').textContent=(mode==='solo'?'100m Sprint':'VS Race')+' leaderboard';
 $('leaderboard-rows').replaceChildren();$('leaderboard-status').textContent='Loading…';
 try {const response=await fetch('/api/leaderboard?mode='+mode);if(!response.ok)throw new Error();const entries=await response.json();
 entries.forEach((entry,i)=>{const row=document.createElement('tr');for(const value of [i+1,entry.name,entry.company,entry.seconds.toFixed(2)+'s']){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}$('leaderboard-rows').append(row);});
 $('leaderboard-status').textContent=entries.length?'':'No times yet. Complete a race to set the first time!';
 }catch{$('leaderboard-status').textContent='Unable to load the leaderboard. Close and try again.';}
}
$('view-leaderboard').addEventListener('click',()=>{
 if(['countdown','running'].includes(race.state)){race.reset();show('Race paused','Start a fresh race when you close the leaderboard.','Start race');}
 $('leaderboard-dialog').showModal();loadLeaderboard();
});
$('close-leaderboard').addEventListener('click',()=>$('leaderboard-dialog').close());
function offerResults(){
 const event=mode;
 const finishers=mode==='solo'?[{label:'Your sprint',seconds:race.elapsed}]:race.players.flatMap((p,i)=>p.state==='finished'?[{label:`Player ${i+1}`,seconds:p.elapsed}]:[]);
 $('result-forms').replaceChildren();$('result-entry').hidden=false;
 for(const finisher of finishers){
 const id=globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,form=document.createElement('form');
 const title=document.createElement('h3');title.textContent=finisher.label+' · '+finisher.seconds.toFixed(2)+'s';form.append(title);
 const inputs={};for(const [field,max] of [['name',60],['company',100]]){const label=document.createElement('label');label.textContent=field==='name'?'Name':'Company';const input=document.createElement('input');input.required=true;input.maxLength=max;input.autocomplete=field==='name'?'name':'organization';label.append(input);form.append(label);inputs[field]=input;}
 const button=document.createElement('button');button.textContent='Submit time';button.type='submit';form.append(button);
 const status=document.createElement('p');status.setAttribute('role','status');form.append(status);
 form.addEventListener('submit',async e=>{e.preventDefault();button.disabled=true;status.textContent='Saving…';
 try{const response=await fetch('/api/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,mode:event,name:inputs.name.value,company:inputs.company.value,seconds:finisher.seconds})});const body=await response.json();if(!response.ok)throw new Error(body.error);status.textContent='Time saved! View the leaderboard to see your ranking.';for(const input of Object.values(inputs))input.disabled=true;button.textContent='Saved';}
 catch(error){status.textContent=error.message || 'Unable to save. Try again.';button.disabled=false;}
 });$('result-forms').append(form);
 }
}
