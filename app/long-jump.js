import { Race } from './race.js';

export const TAKEOFF_BOARD = 30;
const GRAVITY = 9.81;
const LIFT = 4.2;
const FLIGHT_DURATION = 2 * LIFT / GRAVITY;

// Reuse sprint acceleration and alternating-key rules for the run-up.
export class LongJump extends Race {
  reset() {
    super.reset();
    this.jumpDistance = 0;
    this.height = 0;
    this.takeoff = 0;
    this.launchSpeed = 0;
    this.jumpAt = 0;
    this.foulReason = '';
  }
  jump(now) {
    if (this.state === 'countdown' && now < this.startAt) {
      this.state = 'false-start';
      return false;
    }
    if (this.state === 'countdown') this.state = 'running';
    if (this.state !== 'running') return false;
    if (this.distance > TAKEOFF_BOARD) {
      this.foul('You crossed the take-off board. Jump just before the white line.');
      return false;
    }
    this.takeoff = this.distance;
    this.launchSpeed = this.speed;
    this.jumpAt = now;
    this.state = 'airborne';
    return true;
  }
  foul(reason) {
    this.state = 'foul';
    this.speed = 0;
    this.height = 0;
    this.foulReason = reason;
  }
  update(now, dt) {
    if (this.state === 'countdown' && now >= this.startAt) this.state = 'running';
    if (this.state === 'running') {
      const actual = Math.min(dt, Math.max(0, (now - this.startAt) / 1000));
      this.speed = Math.max(0, this.speed - 2.8 * actual);
      this.distance += this.speed * actual;
      this.elapsed = (now - this.startAt) / 1000;
      if (this.distance > TAKEOFF_BOARD) this.foul('You crossed the take-off board. Jump just before the white line.');
    } else if (this.state === 'airborne') {
      const flight = Math.min(FLIGHT_DURATION, Math.max(0, (now - this.jumpAt) / 1000));
      this.height = Math.max(0, LIFT * flight - GRAVITY * flight * flight / 2);
      this.distance = this.takeoff + this.launchSpeed * flight;
      if (flight >= FLIGHT_DURATION) {
        this.height = 0;
        this.speed = 0;
        this.jumpDistance = Math.max(0, this.distance - TAKEOFF_BOARD);
        if (this.jumpDistance > 0) this.state = 'finished';
        else this.foul('You jumped too early to reach the sand. Build speed and jump nearer the white line.');
      }
    }
  }
}
