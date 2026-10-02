import { readFile, writeFile } from 'node:fs/promises';
const [image,digest]=process.argv.slice(2);
if(!/^ghcr\.io\/[a-z0-9_.\/-]+$/.test(image||'')||!/^sha256:[a-f0-9]{64}$/.test(digest||''))throw new Error('Expected lowercase GHCR image and sha256 digest');
const path=new URL('../deploy/overlays/demo/kustomization.yaml',import.meta.url);
const source=await readFile(path,'utf8');
const updated=source.replace(/    newName: .+\n    (?:newTag|digest): .+/,`    newName: ${image}\n    digest: ${digest}`);
if(updated===source && !source.includes(`digest: ${digest}`))throw new Error('Image entry not found');
await writeFile(path,updated);
