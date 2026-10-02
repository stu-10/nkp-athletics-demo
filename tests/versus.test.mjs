import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VersusRace } from '../app/race.js';

test('players alternate independently and cannot accelerate by repeating a key',()=>{
 const r=new VersusRace();r.start(0);r.update(3000,0);
 assert.equal(r.step(0,'left',3000),true);
 assert.equal(r.step(1,'left',3000),true);
 assert.equal(r.step(0,'left',3100),false);
 assert.equal(r.step(0,'right',3010),false);
 assert.equal(r.step(0,'right',3100),true);
 assert.equal(r.players[0].steps,2);assert.equal(r.players[1].steps,1);
});

for(const offender of [0,1])test(`player ${offender+1} false start awards the opponent the race`,()=>{
 const r=new VersusRace();r.start(0);r.step(offender,'left',2999);
 assert.equal(r.state,'false-start');assert.equal(r.winner,1-offender);
 assert.equal(r.step(1-offender,'left',3000),false);
 r.update(5000,1);assert.equal(r.players[1-offender].distance,0);
 r.start(6000);assert.equal(r.winner,null);assert.equal(r.offender,null);
 assert.ok(r.players.every(p=>p.steps===0&&p.distance===0));
});

function run(intervals){
 const r=new VersusRace();r.start(0);
 const sides=['left','left'];
 for(let now=3000;now<40000&&r.state!=='finished';now+=10){
  r.update(now,.01);
  intervals.forEach((interval,p)=>{if(now%interval===0){r.step(p,sides[p],now);sides[p]=sides[p]==='left'?'right':'left';}});
 }
 assert.equal(r.state,'finished');return r;
}
for(const winner of [0,1])test(`player ${winner+1} can win and the result stops further movement`,()=>{
 const r=run(winner===0?[100,200]:[200,100]);
 assert.equal(r.winner,winner);assert.equal(r.players[winner].distance,100);
 const distances=r.players.map(p=>p.distance);
 assert.equal(r.step(1-winner,'left',50000),false);r.update(50000,1);
 assert.deepEqual(r.players.map(p=>p.distance),distances);
});
test('identical rhythms produce a dead heat and reset clears both players',()=>{
 const r=run([100,100]);assert.equal(r.winner,null);
 assert.ok(r.players.every(p=>p.distance===100));r.reset();
 assert.equal(r.state,'ready');assert.equal(r.elapsed,0);
 assert.ok(r.players.every(p=>p.state==='ready'&&p.steps===0));
});
