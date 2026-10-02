export class Race {
  constructor() { this.reset(); }
  reset() { this.state='ready'; this.distance=0; this.speed=0; this.elapsed=0; this.last=null; this.steps=0; this.startAt=0; this.lastAt=-Infinity; }
  start(now) { this.reset(); this.state='countdown'; this.startAt=now+3000; }
  update(now, dt) {
    if (this.state==='countdown' && now>=this.startAt) this.state='running';
    if (this.state!=='running') return;
    const actual = Math.min(dt, Math.max(0,(now-this.startAt)/1000));
    const previous=this.distance;
    this.speed=Math.max(0,this.speed-2.8*actual);
    this.distance+=this.speed*actual;
    this.elapsed=(now-this.startAt)/1000;
    if (this.distance>=100) {
      this.elapsed-=this.speed>0 ? (this.distance-100)/this.speed : 0;
      this.distance=100; this.state='finished';
    }
  }
  step(side, now) {
    if (this.state==='countdown' && now<this.startAt) { this.state='false-start'; return false; }
    if (this.state==='countdown') this.state='running';
    if (this.state!=='running' || side===this.last || now-this.lastAt<55) return false;
    this.last=side; this.lastAt=now; this.steps++;
    this.speed=Math.min(12.5,this.speed+0.85); return true;
  }
}

// Two racers share a starting gun, but keep independent input and physics.
export class VersusRace {
  constructor() { this.players=[new Race(),new Race()]; this.reset(); }
  reset() { this.players.forEach(p=>p.reset()); this.state='ready'; this.winner=null; this.offender=null; this.startAt=0; }
  start(now) { this.reset(); this.players.forEach(p=>p.start(now)); this.startAt=now+3000; this.state='countdown'; }
  get elapsed() { return this.state==='finished' ? Math.min(...this.players.filter(p=>p.state==='finished').map(p=>p.elapsed)) : Math.max(...this.players.map(p=>p.elapsed)); }
  step(player,side,now) {
    if (!['countdown','running'].includes(this.state)) return false;
    const accepted=this.players[player].step(side,now);
    if (this.players[player].state==='false-start') { this.state='false-start'; this.offender=player; this.winner=1-player; }
    return accepted;
  }
  update(now,dt) {
    if (!['countdown','running'].includes(this.state)) return;
    this.players.forEach(p=>p.update(now,dt));
    if (now>=this.startAt) this.state='running';
    const finishers=this.players.map((p,i)=>({p,i})).filter(({p})=>p.state==='finished');
    if (finishers.length) {
      finishers.sort((a,b)=>a.p.elapsed-b.p.elapsed);
      this.winner=finishers.length===2 && Math.abs(finishers[0].p.elapsed-finishers[1].p.elapsed)<.001 ? null : finishers[0].i;
      this.state='finished';
    }
  }
}
