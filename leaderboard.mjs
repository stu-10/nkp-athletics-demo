import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const path=process.env.LEADERBOARD_DB || './data/leaderboard.sqlite';
mkdirSync(dirname(path), {recursive:true});
const db=new DatabaseSync(path);
db.exec(`CREATE TABLE IF NOT EXISTS results (id TEXT PRIMARY KEY, mode TEXT NOT NULL, name TEXT NOT NULL, company TEXT NOT NULL, seconds REAL NOT NULL, created TEXT NOT NULL)`);
export function rankings(mode) {
 return db.prepare('SELECT name, company, seconds FROM results WHERE mode = ? ORDER BY seconds, created, id LIMIT 100').all(mode);
}
export class InvalidEntry extends Error {}
export function submit(entry) {
 const {id,mode,name,company,seconds}=entry;
 if(!['solo','versus'].includes(mode) || typeof id!=='string' || !/^[a-zA-Z0-9-]{1,80}$/.test(id) || typeof name!=='string' || typeof company!=='string' || !name.trim() || !company.trim() || name.length>60 || company.length>100 || typeof seconds!=='number' || !Number.isFinite(seconds) || seconds<8 || seconds>3600) throw new InvalidEntry('Enter a name (up to 60 characters), company (up to 100), and a valid completed race time.');
 db.prepare('INSERT OR IGNORE INTO results VALUES (?, ?, ?, ?, ?, ?)').run(id,mode,name.trim(),company.trim(),seconds,new Date().toISOString());
 return rankings(mode);
}
