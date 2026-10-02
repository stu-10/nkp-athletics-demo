import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
test('server exposes game, health, version and rejects unknown files',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'cng-server-'));
 const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'18081',APP_COMMIT:'testcommit',LEADERBOARD_DB:join(dir,'scores.sqlite')},stdio:'pipe'});
 try {
   let ready=false;for(let i=0;i<50;i++){try{const r=await fetch('http://127.0.0.1:18081/healthz');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,50));}
   assert.ok(ready,'server started');
   const home=await fetch('http://127.0.0.1:18081/');assert.equal(home.status,200);const html=await home.text();assert.match(html,/100m Sprint/);assert.match(html,/Long Jump/);
   const jumpModule=await fetch('http://127.0.0.1:18081/long-jump.js');assert.equal(jumpModule.status,200);assert.match(await jumpModule.text(),/class LongJump/);assert.ok(home.headers.get('content-security-policy'));
   const version=await fetch('http://127.0.0.1:18081/version.json');assert.equal((await version.json()).commit,'testcommit');
   assert.equal((await fetch('http://127.0.0.1:18081/package.json')).status,404);
   assert.equal((await fetch('http://127.0.0.1:18081/',{method:'POST'})).status,405);
 } finally {child.kill('SIGTERM');await once(child,'exit');await rm(dir,{recursive:true,force:true});}
});
