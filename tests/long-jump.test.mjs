import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LongJump, TAKEOFF_BOARD } from '../app/long-jump.js';

function atBoard(distance=29,speed=10) {
 const jump=new LongJump();jump.start(0);jump.update(3000,0);jump.distance=distance;jump.speed=speed;return jump;
}
function land(jump) {jump.update(jump.jumpAt+1000,.016);}

test('long jump run-up uses alternating steps and ignores held/repeated input',()=>{
 const jump=new LongJump();jump.start(0);jump.update(3000,0);
 assert.equal(jump.step('left',3000),true);
 const speed=jump.speed;assert.equal(jump.step('left',3060),false);assert.equal(jump.speed,speed);
 assert.equal(jump.step('right',3020),false);assert.equal(jump.step('right',3060),true);
 jump.update(3120,.06);assert.ok(jump.distance>0);
});
test('run-up input and jump input before GO are false starts',()=>{
 for(const input of ['step','jump']){const jump=new LongJump();jump.start(0);input==='jump'?jump.jump(100):jump.step('left',100);assert.equal(jump.state,'false-start');assert.equal(jump.jumpDistance,0);}
});
test('valid take-off follows an arc, measures from board and lands once',()=>{
 const jump=atBoard();assert.equal(jump.jump(3100),true);
 jump.update(3300,.016);assert.ok(jump.height>0);assert.equal(jump.state,'airborne');
 assert.equal(jump.jump(3300),false);assert.equal(jump.step('left',3300),false);
 land(jump);assert.equal(jump.state,'finished');assert.ok(Math.abs(jump.jumpDistance-(29+10*(8.4/9.81)-TAKEOFF_BOARD))<1e-9);assert.equal(jump.height,0);
 const result=jump.jumpDistance;jump.update(6000,.05);assert.equal(jump.jumpDistance,result);
});
test('more speed and take-off nearer the board produce longer jumps',()=>{
 const early=atBoard(28,8),fast=atBoard(28,11),late=atBoard(29,11);
 for(const jump of [early,fast,late]){jump.jump(3100);land(jump);}
 assert.ok(fast.jumpDistance>early.jumpDistance);assert.ok(late.jumpDistance>fast.jumpDistance);
});
test('crossing the board without jumping is a foul; exact board take-off is legal',()=>{
 const foul=atBoard(29.9,10);foul.update(3100,.02);assert.equal(foul.state,'foul');assert.equal(foul.jump(3100),false);assert.equal(foul.jumpDistance,0);
 const exact=atBoard(30,10);assert.equal(exact.jump(3100),true);land(exact);assert.equal(exact.state,'finished');
});
test('jumping too early misses the sand and does not qualify',()=>{
 const jump=atBoard(5,10);jump.jump(3100);land(jump);assert.equal(jump.state,'foul');assert.equal(jump.jumpDistance,0);
});
test('new attempts clear distance, flight and foul state',()=>{
 const jump=atBoard();jump.jump(3100);land(jump);jump.start(5000);
 assert.equal(jump.state,'countdown');assert.equal(jump.distance,0);assert.equal(jump.height,0);assert.equal(jump.jumpDistance,0);assert.equal(jump.launchSpeed,0);assert.equal(jump.foulReason,'');
});
