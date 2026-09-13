import {useEffect,useRef} from 'react';
import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {PointerTap} from './pointer-tap';
import {definition,groupFor,pairedId,type Atlas,type ViewerState} from './fly-data';

interface Props{bodyOnly?:boolean;atlas:Atlas;state:ViewerState;onSelect:(id:string)=>void;onProgress:(n:number)=>void;onError:(e:string)=>void}
type Item={id:string;mesh:T.Mesh<T.BufferGeometry,T.MeshPhysicalMaterial>;center:T.Vector3;size:T.Vector3;destination:T.Vector3;label:HTMLButtonElement;wire?:T.LineSegments<T.WireframeGeometry,T.LineBasicMaterial>};
export default function FlyScene({atlas,state,onSelect,onProgress,onError,bodyOnly=false}:Props){
 const host=useRef<HTMLDivElement>(null),latest=useRef(state),select=useRef(onSelect);latest.current=state;select.current=onSelect;
 useEffect(()=>{
  onProgress(0);const el=host.current!;let gone=false,frame=0,dirty=true,amount=0,lastKey='',lastAppearance='',lastLayout='',loaded=0,hovered:string|null=null;const abort=new AbortController();
  let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});}catch{onError('The 3D view needs WebGL. Enable hardware acceleration and reload to explore.');return;}
  renderer.setClearColor('#111111');renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  el.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Interactive fly anatomy. Drag to orbit, scroll to zoom, or select a region.');
  const scene=new T.Scene();scene.fog=new T.Fog('#111111',24,65);
  const camera=new T.PerspectiveCamera(34,1,.01,150),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=.2;controls.maxDistance=65;controls.maxPolarAngle=Math.PI*.92;
  const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.03);scene.environment=env.texture;room.dispose();pmrem.dispose();
  scene.add(new T.HemisphereLight('#f1f1f1','#303030',.85));
  const key=new T.DirectionalLight('#fffaf5',2.1);key.position.set(-4,10,7);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-9;key.shadow.camera.right=9;key.shadow.camera.top=9;key.shadow.camera.bottom=-9;key.shadow.bias=-.0005;key.shadow.normalBias=.025;scene.add(key);
  const rim=new T.DirectionalLight('#dedfe2',2.6);rim.position.set(5,6,-7);scene.add(rim);
  const fill=new T.DirectionalLight('#e0e0e0',1);fill.position.set(6,2,5);scene.add(fill);
  const floor=new T.Mesh(new T.PlaneGeometry(160,160),new T.MeshStandardMaterial({color:'#0b0b0b',roughness:1,envMapIntensity:.04}));floor.rotation.x=-Math.PI/2;floor.position.y=-.15;floor.receiveShadow=true;scene.add(floor);
  const grid=new T.GridHelper(120,120,'#383838','#282828');grid.position.y=-.14;(grid.material as T.Material).transparent=true;(grid.material as T.Material).opacity=.26;scene.add(grid);
  const stage=new T.Group();scene.add(stage);
  const platform=new T.Mesh(new T.CylinderGeometry(4.65,4.72,.15,192),new T.MeshStandardMaterial({color:'#151515',roughness:.8,metalness:.15,envMapIntensity:.08}));platform.position.y=-.075;platform.receiveShadow=true;stage.add(platform);
  for(const [radius,opacity] of [[4.38,.46],[4.08,.13]]){const ring=new T.Mesh(new T.RingGeometry(radius,radius+.009,256),new T.MeshBasicMaterial({color:'#acacac',transparent:true,opacity,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.006;stage.add(ring);}
  const ticks:number[]=[];for(let i=0;i<120;i++){const a=i/120*Math.PI*2,r=i%10===0?4.2:4.29;ticks.push(Math.cos(a)*r,.009,Math.sin(a)*r,Math.cos(a)*4.36,.009,Math.sin(a)*4.36);}
  const tg=new T.BufferGeometry();tg.setAttribute('position',new T.Float32BufferAttribute(ticks,3));stage.add(new T.LineSegments(tg,new T.LineBasicMaterial({color:'#7d7d7d',transparent:true,opacity:.35})));
  const brain=new T.Group(),fly=new T.Group();scene.add(brain,fly);fly.visible=false;
  const items:Item[]=[],bodyItems:T.Mesh[]=[],labels=document.createElement('div');labels.className='mesh-labels';el.appendChild(labels);
  const hover=document.createElement('div');hover.className='mesh-hover';hover.hidden=true;el.appendChild(hover);
  const allBox=new T.Box3();atlas.parts.forEach(p=>allBox.union(new T.Box3(new T.Vector3(...p.bounds[0]),new T.Vector3(...p.bounds[1]))));const originalCenter=allBox.getCenter(new T.Vector3()),scale=7.2/allBox.getSize(new T.Vector3()).x;
  const transform=(x:number,y:number,z:number)=>new T.Vector3((x-originalCenter.x)*scale,2.65-(y-originalCenter.y)*scale,-(z-originalCenter.z)*scale);
  const load=async(url:string)=>{const r=await fetch(url,{signal:abort.signal});if(!r.ok)throw new Error(`Could not load model (${r.status}). Reload to retry.`);return r;};
  if(!bodyOnly)(async()=>{try{
   let cursor=0;await Promise.all(Array.from({length:6},async()=>{while(cursor<atlas.parts.length){const p=atlas.parts[cursor++],buffer=await(await load('/male-cns/regions/'+p.id+'.bin')).arrayBuffer();if(gone)return;const view=new DataView(buffer),n=view.getUint32(0,true),pos=new Float32Array(n*3);for(let i=0;i<n;i++){const v=transform(view.getFloat32(4+i*12,true),view.getFloat32(8+i*12,true),view.getFloat32(12+i*12,true));pos.set(v.toArray(),i*3);}const count=(buffer.byteLength-4-n*12)/4,indices=new Uint32Array(count);for(let i=0;i<count;i+=3){indices[i]=view.getUint32(4+n*12+i*4,true);indices[i+1]=view.getUint32(4+n*12+(i+1)*4,true);indices[i+2]=view.getUint32(4+n*12+(i+2)*4,true);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setIndex(new T.BufferAttribute(indices,1));g.computeVertexNormals();g.computeBoundingBox();const center=g.boundingBox!.getCenter(new T.Vector3()),size=g.boundingBox!.getSize(new T.Vector3());
    const material=new T.MeshPhysicalMaterial({color:groupFor(p.id).color,roughness:.44,metalness:.08,clearcoat:.25,clearcoatRoughness:.48,envMapIntensity:.5,side:T.DoubleSide});const mesh=new T.Mesh(g,material);mesh.userData.id=p.id;brain.add(mesh);
    const label=document.createElement('button');label.textContent=p.id.replaceAll('_',' ');label.title=definition(p.id).name;label.setAttribute('aria-label',`Inspect ${definition(p.id).name}, ${p.id}`);label.onclick=()=>select.current(p.id);labels.appendChild(label);items.push({id:p.id,mesh,center,size,destination:new T.Vector3(),label});onProgress(Math.round(++loaded/atlas.parts.length*100));dirty=true;lastLayout='';lastAppearance='';lastKey='';
   }}));
  }catch(e){if(!gone)onError(e instanceof Error?e.message:'Could not load the brain.');}})();
  let bodyLoading=false,bodyReady=false;
  async function loadBody(){bodyLoading=true;try{const manifest=await(await load('/fly-body/manifest.json')).json() as {parts:{id:string;offset:number;vertices:number}[]},buffer=await(await load('/fly-body/body.bin')).arrayBuffer();if(gone)return;
   for(const p of manifest.parts as {id:string;offset:number;vertices:number}[]){let g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(buffer,p.offset,p.vertices*3),3));const original=g;g=mergeVertices(g,1e-5);original.dispose();g.computeVertexNormals();const wing=p.id.includes('Wing'),eye=p.id.includes('Eye');const m=new T.MeshPhysicalMaterial({color:wing?'#b7c4bd':eye?'#8c3022':p.id.startsWith('A')?'#39382b':'#303b35',roughness:eye?.47:.61,metalness:eye?.05:.18,clearcoat:eye?.45:.12,envMapIntensity:.25,side:T.DoubleSide,transparent:wing,opacity:wing?.38:1,depthWrite:!wing});const mesh=new T.Mesh(g,m);mesh.castShadow=!wing;mesh.receiveShadow=true;mesh.userData.id=p.id;fly.add(mesh);bodyItems.push(mesh);}
   const box=new T.Box3().setFromObject(fly),size=box.getSize(new T.Vector3()),c=box.getCenter(new T.Vector3()),s=6.8/Math.max(size.x,size.z);fly.position.set(-c.x*s,-box.min.y*s+.025,-c.z*s);fly.scale.setScalar(s);bodyReady=true;if(bodyOnly)onProgress(100);lastKey='';dirty=true;
  }catch(e){if(!gone)onError(e instanceof Error?e.message:'Could not load the fly.');}}
  let packingWidth=9,packingHeight=5;
  function layout(){const s=latest.current,shown=items.filter(it=>s.isolate?it.id===s.selected||it.id===pairedId(s.selected??''):s.visible.includes(definition(it.id).group));const layoutKey=shown.map(i=>i.id).sort().join(',')+':'+camera.aspect.toFixed(2);if(layoutKey===lastLayout)return;lastLayout=layoutKey;
   const sorted=[...shown].sort((a,b)=>definition(a.id).group.localeCompare(definition(b.id).group)||a.id.localeCompare(b.id));const width=el.clientWidth<700?8.5:16;let x=0,y=0,rowHeight=0,maxX=0;const placements:{it:Item;x:number;y:number}[]=[];
   for(const it of sorted){const w=Math.max(.7,it.size.x)+.4,h=Math.max(.45,it.size.y)+.43;if(x+w>width&&x>0){x=0;y+=rowHeight;rowHeight=0;}placements.push({it,x:x+w/2,y:y+h/2});x+=w;rowHeight=Math.max(rowHeight,h);maxX=Math.max(maxX,x);}
   packingWidth=maxX;packingHeight=y+rowHeight;for(const p of placements)p.it.destination.set(p.x-maxX/2,2.8+packingHeight/2-p.y,0).sub(p.it.center);lastKey='';dirty=true;
  }
  const targetPos=new T.Vector3(),targetLook=new T.Vector3();let fitting=true;
  function fit(){const s=latest.current;camera.clearViewOffset();let center=new T.Vector3(0,2.55,0),width=8,height=4.8;const mobile=el.clientWidth<700;
   if(s.mode==='fly'){center.set(0,1.5,0);width=bodyOnly?7.2:8.5;height=bodyOnly?3.4:5.6;}
   else if(s.isolate&&s.selected){const box=new T.Box3();items.filter(i=>i.id===s.selected||i.id===pairedId(s.selected!)).forEach(i=>box.union(i.mesh.geometry.boundingBox!));if(!box.isEmpty()){center.copy(box.getCenter(new T.Vector3()));const extent=box.getSize(new T.Vector3());width=Math.max(.35,extent.x)*1.35;height=Math.max(.35,extent.y,extent.z)*1.35;}}
   else if(s.explode>.01){width=T.MathUtils.lerp(8,packingWidth+1,s.explode);height=T.MathUtils.lerp(4.8,packingHeight+.7,s.explode);center.y=T.MathUtils.lerp(2.55,2.8,s.explode);}
   const usableW=el.clientWidth,usableH=el.clientHeight;const dist=Math.max(height,width/camera.aspect)/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2)))*(mobile?1.12:1.13);
   const dir=s.mode==='fly'?new T.Vector3(.85,.5,1.5).normalize():s.explode>.5?new T.Vector3(0,.005,1):s.view==='posterior'?new T.Vector3(0,.1,-1):s.view==='dorsal'?new T.Vector3(0,1,.001):s.view==='lateral'?new T.Vector3(1,.08,0):new T.Vector3(.09,.1,1).normalize();
   targetLook.copy(center);targetPos.copy(center).addScaledVector(dir,dist);fitting=true;dirty=true;
  }
  const resize=()=>{renderer.setPixelRatio(Math.min(devicePixelRatio,el.clientWidth<700?1.75:2));renderer.setSize(el.clientWidth,el.clientHeight);camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();lastLayout='';layout();fit();};const observer=new ResizeObserver(resize);observer.observe(el);
  controls.addEventListener('change',()=>dirty=true);controls.addEventListener('start',()=>fitting=false);
  const ray=new T.Raycaster(),pointer=new T.Vector2(),tap=new PointerTap();
  const hit=(e:PointerEvent)=>{const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(latest.current.mode==='brain'?items.filter(i=>i.mesh.visible).map(i=>i.mesh):bodyItems,false)[0];};
  const down=(e:PointerEvent)=>{tap.down(e.pointerId,e.clientX,e.clientY,e.pointerType==='touch'?12:5);hover.hidden=true;};
  let hoverTime=0;const move=(e:PointerEvent)=>{tap.move(e.pointerId,e.clientX,e.clientY);if(e.buttons||e.pointerType==='touch'){hover.hidden=true;if(hovered){hovered=null;lastAppearance='';dirty=true;}return;}if(performance.now()-hoverTime<60)return;hoverTime=performance.now();const h=hit(e);const hoverId=h&&latest.current.mode==='brain'?h.object.userData.id as string:null;if(hoverId!==hovered){hovered=hoverId;lastAppearance='';dirty=true;}hover.hidden=!h;renderer.domElement.style.cursor=h?'pointer':'grab';if(h){const id=h.object.userData.id;hover.textContent=latest.current.mode==='brain'?`${definition(id).name} · ${id}`:id.replace(/([a-z])([A-Z])/g,'$1 $2');const r=el.getBoundingClientRect();hover.style.left=Math.min(e.clientX-r.left+14,el.clientWidth-240)+'px';hover.style.top=Math.max(8,e.clientY-r.top-42)+'px';}};
  const up=(e:PointerEvent)=>{if(tap.up(e.pointerId,e.clientX,e.clientY)&&latest.current.mode==='brain'){const h=hit(e);if(h)select.current(h.object.userData.id);}};const cancel=(e:PointerEvent)=>tap.cancel(e.pointerId);
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',cancel);renderer.domElement.addEventListener('pointerleave',()=>{hover.hidden=true;hovered=null;lastAppearance='';dirty=true;});
  const clock=new T.Clock(),v=new T.Vector3();const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function animate(){if(gone)return;frame=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),s=latest.current;layout();
   if(s.mode==='fly'&&!bodyLoading)void loadBody();brain.visible=s.mode==='brain';fly.visible=s.mode==='fly'&&bodyReady;labels.hidden=s.mode!=='brain';
   const key=JSON.stringify([s.mode,s.view,s.reset,s.isolate,s.isolate?s.selected:null,s.explode,lastLayout]);if(key!==lastKey){fit();lastKey=key;}
   const nextAmount=s.isolate||s.mode==='fly'?0:s.explode;if(Math.abs(amount-nextAmount)>.0001){amount=reduced?nextAmount:T.MathUtils.damp(amount,nextAmount,6,dt);dirty=true;}
   const appearance=JSON.stringify([s.visible,s.selected,s.isolate,s.surface,s.labels,s.mode,s.meshLines,s.hoveredGroup,hovered,items.length]);if(appearance!==lastAppearance){for(const it of items){const selected=it.id===s.selected||it.id===pairedId(s.selected??''),highlighted=selected||it.id===hovered||it.id===pairedId(hovered??'')||definition(it.id).group===s.hoveredGroup;it.mesh.visible=s.isolate?selected:s.visible.includes(definition(it.id).group);const color=new T.Color(s.surface==='tissue'&&!highlighted?'#bdbbb6':groupFor(it.id).color);it.mesh.material.color.copy(color);it.mesh.material.emissive.copy(color);it.mesh.material.emissiveIntensity=highlighted?.12:.015;const glass=s.surface==='glass';it.mesh.material.transparent=glass;it.mesh.material.opacity=glass?(selected?.88:.27):1;it.mesh.material.depthWrite=!glass;it.mesh.material.roughness=glass?.2:s.surface==='tissue'?.32:.44;it.mesh.material.transmission=0;it.mesh.material.thickness=.35;it.mesh.material.ior=1.38;it.mesh.material.attenuationColor.set('#e4e2de');it.mesh.material.attenuationDistance=2;it.mesh.material.needsUpdate=true;if(s.meshLines&&selected&&!it.wire&&it.mesh.visible){it.wire=new T.LineSegments(new T.WireframeGeometry(it.mesh.geometry),new T.LineBasicMaterial({color:'#555555',transparent:true,opacity:.18,depthWrite:false}));it.mesh.add(it.wire);}if(it.wire)it.wire.visible=!!s.meshLines&&selected;it.mesh.material.polygonOffset=!!s.meshLines;it.mesh.material.polygonOffsetFactor=1;it.mesh.material.polygonOffsetUnits=1;if(it.wire)it.wire.material.opacity=highlighted?.3:.18;}lastAppearance=appearance;dirty=true;}
   for(const it of items)it.mesh.position.copy(it.destination).multiplyScalar(amount);
   if(fitting){camera.position.lerp(targetPos,reduced?1:1-Math.exp(-6*dt));controls.target.lerp(targetLook,reduced?1:1-Math.exp(-6*dt));dirty=true;if(camera.position.distanceTo(targetPos)<.002&&controls.target.distanceTo(targetLook)<.002)fitting=false;}
   stage.visible=!bodyOnly&&(s.mode==='fly'||(!s.isolate&&amount<.35));floor.visible=grid.visible=!bodyOnly&&(s.mode==='fly'||(!s.isolate&&amount<.65));controls.autoRotate=s.rotate&&!reduced;controls.autoRotateSpeed=.65;controls.update();if(s.rotate)dirty=true;
   if(dirty){renderer.render(scene,camera);const occupied:{x:number;y:number}[]=[];
    const candidates=[...items].sort((a,b)=>Number(b.id===s.selected)-Number(a.id===s.selected));for(const it of candidates){const selected=it.id===s.selected,important=['ME_L','ME_R','AL_L','AL_R','MB_VL_L','FB','GNG','LH_R'].includes(it.id);let show=it.mesh.visible&&(selected||(s.labels&&(amount>.8||important)));v.copy(it.center).add(it.mesh.position);v.y-=amount>.8?it.size.y/2+.1:0;v.project(camera);const x=(v.x+1)*el.clientWidth/2,y=(1-v.y)*el.clientHeight/2;if(v.z< -1||v.z>1||x<20||x>el.clientWidth-20||y<15||y>el.clientHeight-15)show=false;if(show&&!selected&&occupied.some(p=>Math.abs(p.x-x)<77&&Math.abs(p.y-y)<25))show=false;it.label.hidden=!show;if(show){occupied.push({x,y});it.label.style.transform=`translate(${x}px,${y}px) translate(-50%,${amount>.8?'0':'-50%'})`;it.label.className=selected?'selected':'';}}dirty=false;
   }
  }
  const lost=(e:Event)=>{e.preventDefault();onError('Your device paused the 3D view. Reload to restore the model.');};renderer.domElement.addEventListener('webglcontextlost',lost);resize();animate();
  const screenshot=()=>{renderer.render(scene,camera);const a=document.createElement('a');a.download=`fly-atlas-${latest.current.mode}-4k.png`;const oldSize=renderer.getSize(new T.Vector2()),oldRatio=renderer.getPixelRatio();renderer.setPixelRatio(1);renderer.setSize(3840,Math.round(3840/camera.aspect),false);renderer.render(scene,camera);a.href=renderer.domElement.toDataURL('image/png');a.click();renderer.setPixelRatio(oldRatio);renderer.setSize(oldSize.x,oldSize.y,false);dirty=true;};window.addEventListener('fly-atlas-export',screenshot);
  return()=>{gone=true;abort.abort();cancelAnimationFrame(frame);observer.disconnect();controls.dispose();window.removeEventListener('fly-atlas-export',screenshot);scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.LineSegments){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});env.dispose();renderer.dispose();renderer.domElement.remove();labels.remove();hover.remove();};
 },[atlas,bodyOnly]);
 return <div className="fly-scene" ref={host}/>;
}
