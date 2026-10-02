import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Race } from '../app/race.js';
test('early input is a false start',()=>{const r=new Race();r.start(0);assert.equal(r.step('left',2999),false);assert.equal(r.state,'false-start');});
test('requires alternating steps and filters implausibly fast input',()=>{const r=new Race();r.start(0);r.update(3000,0);assert.equal(r.step('left',3000),true);assert.equal(r.step('left',3100),false);assert.equal(r.step('right',3010),false);assert.equal(r.step('right',3100),true);assert.equal(r.steps,2);});
test('steady rhythm can finish and reset clears the race',()=>{const r=new Race();r.start(0);let side='left';for(let n=3000;n<30000 && r.state!=='finished';n+=10){r.update(n,.01);if(n%100===0){r.step(side,n);side=side==='left'?'right':'left';}}assert.equal(r.state,'finished');assert.equal(r.distance,100);assert.ok(r.elapsed>8 && r.elapsed<20);r.reset();assert.equal(r.distance,0);assert.equal(r.state,'ready');});
test('runner slows without input',()=>{const r=new Race();r.start(0);r.step('left',3000);for(let n=3010;n<4000;n+=10)r.update(n,.01);assert.equal(r.speed,0);assert.ok(r.distance<1);});
