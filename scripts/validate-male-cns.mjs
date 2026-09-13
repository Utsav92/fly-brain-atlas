import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const root='public/male-cns/',read=p=>JSON.parse(fs.readFileSync(root+p));
const atlas=read('manifest.json'),cells=read('neurons.json');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function mesh(path,p){const b=fs.readFileSync(path),n=b.readUInt32LE(0);assert.equal(n,p.vertices);assert.equal(b.length,4+n*12+p.triangles*12);assert.equal(hash(b),p.sha256);for(let i=4;i<4+n*12;i+=4)assert.ok(Number.isFinite(b.readFloatLE(i)),path);for(let i=4+n*12;i<b.length;i+=4)assert.ok(b.readUInt32LE(i)<n,path);}
assert.equal(atlas.parts.length,80);assert.equal(new Set(atlas.parts.map(p=>p.id)).size,80);
const definitions=fs.readFileSync('app/fly-data.ts','utf8');
for(const p of atlas.parts){mesh(root+'regions/'+p.id+'.bin',p);assert.ok(new RegExp('\\b'+p.id.replace(/_[LR]$/,'')+':d\\(').test(definitions),'Missing description: '+p.id);if(/_[LR]$/.test(p.id)){const paired=p.id.slice(0,-1)+(p.id.endsWith('L')?'R':'L');assert.ok(atlas.parts.some(p=>p.id===paired),paired);}}
assert.equal(atlas.parts.reduce((s,p)=>s+p.triangles,0),7270902);
assert.equal(cells.neurons.length,388);assert.equal(new Set(cells.neurons.map(n=>n.id)).size,388);assert.equal(cells.featured.length,8);
for(const p of cells.neurons){const b=fs.readFileSync(root+'skeletons/'+p.id+'.bin'),n=b.readUInt32LE(0),e=b.readUInt32LE(4);assert.equal(n,p.nodes);assert.equal(e,p.edges);assert.equal(b.length,8+n*12+e*8);assert.equal(hash(b),p.sha256);for(let i=8;i<8+n*12;i+=4)assert.ok(Number.isFinite(b.readFloatLE(i)));for(let i=8+n*12;i<b.length;i+=4)assert.ok(b.readUInt32LE(i)<n);if(p.mesh)mesh(root+'neurons/'+p.id+'.bin',p.mesh);}
assert.equal(cells.neurons.reduce((s,p)=>s+p.edges,0),707518);assert.equal(cells.neurons.filter(n=>n.mesh).length,8);
const body=JSON.parse(fs.readFileSync('public/fly-body/manifest.json')),b=fs.readFileSync('public/fly-body/body.bin');assert.equal(body.parts.length,69);assert.equal(body.triangles,502781);let end=0;for(const p of body.parts){assert.equal(p.offset,end);end+=p.vertices*12;}assert.equal(end,b.length);
console.log('PASS: 80 annotated, paired regions; 7,270,902 triangles; 388 skeletons; 707,518 edges; 8 native neuron surfaces; source hashes and valid geometry; 69 body components.');
