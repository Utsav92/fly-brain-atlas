import fs from 'node:fs';
import * as T from 'three';
import {STLLoader} from 'three/examples/jsm/loaders/STLLoader.js';
const rig=JSON.parse(fs.readFileSync('public/fly-body/rig.json')),loader=new STLLoader(),parts=[],buffers=[];let offset=0;
const matrix=(p,q)=>new T.Matrix4().compose(new T.Vector3(...p),new T.Quaternion(q[1],q[2],q[3],q[0]).normalize(),new T.Vector3(1,1,1));
function walk(node,parent){
 const m=parent.clone().multiply(matrix(node.pos,node.quat));
 for(const j of node.joints)m.multiply(new T.Matrix4().makeRotationAxis(new T.Vector3(...j.axis),j.angle));
 for(const g of node.geoms){const a=rig.assets[g.mesh],raw=fs.readFileSync('public/fly-body/'+a.file);let geo=loader.parse(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
 geo.applyMatrix4(m.clone().multiply(matrix(g.pos,g.quat)).scale(new T.Vector3(...a.scale)));
 // Convert z-up millimetres to y-up stage coordinates. Reflection winding corrected below.
 const p=geo.getAttribute('position');const positions=new Float32Array(p.count*3);
 for(let i=0;i<p.count;i++){positions[i*3]=p.getX(i);positions[i*3+1]=p.getZ(i);positions[i*3+2]=-p.getY(i);}
 if(a.scale[0]*a.scale[1]*a.scale[2]<0)for(let i=0;i<p.count;i+=3)for(let k=0;k<3;k++){const t=positions[(i+1)*3+k];positions[(i+1)*3+k]=positions[(i+2)*3+k];positions[(i+2)*3+k]=t;}
 const bytes=Buffer.from(positions.buffer);parts.push({id:g.name,offset,vertices:p.count});buffers.push(bytes);offset+=bytes.byteLength;geo.dispose();
 }
 for(const c of node.children)walk(c,m);
}
walk(rig.root,new T.Matrix4());
fs.writeFileSync('public/fly-body/body.bin',Buffer.concat(buffers));fs.writeFileSync('public/fly-body/manifest.json',JSON.stringify({parts,triangles:parts.reduce((n,p)=>n+p.vertices/3,0)}));
console.log(parts.length,'body parts,',parts.reduce((n,p)=>n+p.vertices/3,0),'triangles,',offset,'bytes');
