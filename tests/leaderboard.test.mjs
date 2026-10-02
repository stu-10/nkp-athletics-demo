import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
test('leaderboards validate entries, separate events, sort, deduplicate and survive restart', async()=>{
 const dir=await mkdtemp(join(tmpdir(),'cng-leaderboard-'));
 let child;
 const base='http://127.0.0.1:18082/api/leaderboard';
 async function start(){
  child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'18082',LEADERBOARD_DB:join(dir,'scores.sqlite')},stdio:'pipe'});
  let ready=false;for(let i=0;i<50;i++){try{const r=await fetch(base+'?mode=solo');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,50));}assert.ok(ready);
 }
 async function stop(){const exit=once(child,'exit');child.kill('SIGTERM');await exit;child=null;}
 const entry={id:'first',mode:'solo',name:' Alice ',company:' Example Co ',seconds:12.345};
 const post=body=>fetch(base,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 try{
  await start();assert.deepEqual(await (await fetch(base+'?mode=solo')).json(),[]);
  assert.equal((await post(entry)).status,200);
  await post({...entry,id:'second',name:'Bob',seconds:10});await post(entry);
  await post({...entry,id:'vs-first',mode:'versus',name:'Charlie',seconds:11});
  const solo=await (await fetch(base+'?mode=solo')).json();assert.equal(solo.length,2);assert.equal(solo[0].name,'Bob');assert.equal(solo[1].name,'Alice');assert.equal(solo[1].company,'Example Co');
  assert.equal((await (await fetch(base+'?mode=versus')).json())[0].name,'Charlie');
  for(const bad of [{name:''},{company:' '},{name:'a'.repeat(61)},{company:'a'.repeat(101)},{seconds:0},{seconds:'12'},{mode:'invalid'},{id:'../bad'}])assert.equal((await post({...entry,...bad})).status,400);
  assert.equal((await fetch(base+'?mode=invalid')).status,400);
  assert.equal((await fetch(base,{method:'POST',headers:{'Content-Type':'application/json'},body:'{'})).status,400);
  assert.equal((await fetch(base,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:'a'.repeat(5000)})})).status,413);
  assert.equal((await fetch(base,{method:'POST',body:'{}'})).status,415);
  // Simulate the pre-long-jump database schema; existing sprint/VS records must survive.
  await stop();const legacy=new DatabaseSync(join(dir,'scores.sqlite'));legacy.exec('DROP TABLE IF EXISTS jump_results');legacy.close();await start();
  assert.deepEqual(await (await fetch(base+'?mode=longjump')).json(),[]);
  const jump={id:'jump-first',mode:'longjump',name:'Jumper',company:'Jump Co',meters:6.5};
  assert.equal((await post(jump)).status,200);await post({...jump,id:'jump-longest',name:'Longest',meters:8.125});await post(jump);
  const jumps=await (await fetch(base+'?mode=longjump')).json();assert.equal(jumps.length,2);assert.equal(jumps[0].name,'Longest');assert.equal(jumps[0].meters,8.125);assert.equal(jumps[1].meters,6.5);assert.ok(!('seconds' in jumps[0]));
  for(const bad of [{meters:0},{meters:-1},{meters:13},{meters:'8'},{meters:null},{meters:undefined}])assert.equal((await post({...jump,...bad})).status,400);
  assert.equal((await post({...jump,meters:undefined,seconds:10})).status,400);
  assert.deepEqual(await (await fetch(base+'?mode=solo')).json(),solo);
  await stop();await start();assert.deepEqual(await (await fetch(base+'?mode=longjump')).json(),jumps);assert.deepEqual(await (await fetch(base+'?mode=solo')).json(),solo);
 }finally{if(child)await stop();await rm(dir,{recursive:true,force:true});}
});
