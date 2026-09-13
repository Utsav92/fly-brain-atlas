import {useEffect,useRef,useState} from 'react';
import {BookOpen,Box,Check,ChevronRight,Layers3,RotateCcw,SlidersHorizontal,X} from 'lucide-react';
import FlyScene from './fly-scene';
import CellScene from './cell-scene';
import {CELL_NOTES,type CellAtlas,type CellState} from './cell-data';
import {GROUPS,SOURCES,definition,groupFor,side,pairedId,type Atlas,type GroupId,type ViewerState} from './fly-data';

const initial:ViewerState={mode:'brain',explode:0,visible:GROUPS.map(g=>g.id),selected:null,isolate:false,rotate:false,labels:false,surface:'tissue',meshLines:false,view:'anterior',reset:0};
const miniState:ViewerState={...initial,mode:'fly'};
const noop=()=>{};
const emptyCells:CellState={selected:null,group:null,surface:false,solo:false};


export default function FlyPage(){
 const [atlas,setAtlas]=useState<Atlas|null>(null),[cellData,setCellData]=useState<CellAtlas|null>(null),[s,set]=useState(initial),[cells,setCells]=useState(emptyCells);
 const [progress,setProgress]=useState(0),[error,setError]=useState(''),[sources,setSources]=useState(false),[listOpen,setListOpen]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const c=new AbortController();Promise.all([fetch('/male-cns/manifest.json',{signal:c.signal}),fetch('/male-cns/neurons.json',{signal:c.signal})]).then(async responses=>{if(responses.some(r=>!r.ok))throw new Error('The source data could not load.');const [a,n]=await Promise.all(responses.map(r=>r.json()));setAtlas(a as Atlas);setCellData(n as CellAtlas);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>c.abort();},[]);
 useEffect(()=>{sources?dialog.current?.showModal():dialog.current?.close();},[sources]);
 const patch=(p:Partial<ViewerState>)=>set(v=>({...v,...p}));
 const changeMode=(mode:ViewerState['mode'])=>{setError('');setProgress(0);setCells(emptyCells);set(v=>({...initial,mode,reset:v.reset+1}));setListOpen(false);};
 const select=(id:string)=>{const g=definition(id).group;set(v=>({...v,selected:id,isolate:false,visible:v.visible.includes(g)?v.visible:[...v.visible,g]}));setListOpen(false);};
 const selectNeuron=(id:string,surface=false)=>{setCells({selected:id,group:null,surface,solo:surface});patch({explode:0});setListOpen(false);};
 const reset=()=>{set(v=>({...initial,mode:v.mode,reset:v.reset+1}));setCells(emptyCells);};
 const explode=()=>patch({explode:s.explode>.5?0:1,isolate:false});
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setSources(false);setListOpen(false);}if(e.key.toLowerCase()==='e'&&!sources&&s.mode!=='fly'){set(v=>({...v,explode:v.explode>.5?0:1,isolate:false}));}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[s.mode,sources]);
 const region=s.mode==='brain'?atlas?.parts.find(p=>p.id===s.selected):undefined,info=region?definition(region.id):null;
 const neuron=s.mode==='cells'?cellData?.neurons.find(n=>n.id===cells.selected):undefined;
 const paired=region&&atlas?.parts.some(p=>p.id!==region.id&&p.id===pairedId(region.id));
 const detail=!!(region||neuron);
 const onlyGroup=(id:GroupId)=>{const all=s.visible.length===1&&s.visible[0]===id;patch({visible:all?GROUPS.map(g=>g.id):[id],selected:null,isolate:false,reset:s.reset+1});};
 return <main className={`fly-studio ${detail?'has-selection':''}`}>
  <header className="atlas-header">
   <div className="brand"><h1>Fly Brain Atlas</h1><p>MaleCNS <span>·</span> Adult male <i>Drosophila</i></p></div>
   <nav className="mode-tabs" aria-label="View">
    {([{mode:'brain',label:'Brain'},{mode:'cells',label:'Neurons'},{mode:'fly',label:'Fly'}] as const).map(({mode,label})=><button key={mode} aria-pressed={s.mode===mode} className={s.mode===mode?'active':''} onClick={()=>changeMode(mode)}>{label}</button>)}
   </nav>
   <button className="sources-button" onClick={()=>setSources(true)}><BookOpen size={15}/><span>Sources</span></button>
  </header>
  {atlas&&<button className="fly-mini" aria-label="Show whole fly" onClick={()=>changeMode('fly')}><FlyScene atlas={atlas} state={miniState} bodyOnly onSelect={noop} onProgress={noop} onError={noop}/></button>}
  <div className="viewport">
   {atlas&&(s.mode==='cells'?cellData&&<CellScene atlas={atlas} data={cellData} state={s} cells={cells} onSelect={id=>selectNeuron(id)} onProgress={setProgress} onError={setError}/>:<FlyScene atlas={atlas} state={s} onSelect={select} onProgress={setProgress} onError={setError}/>)}
   {!error&&progress<100&&<div className="model-loading" role="status"><span className="loader-ring"/><p>Loading {s.mode==='cells'?'neurons':'anatomy'} <span>{progress}%</span></p></div>}
   {error&&<div className="model-loading" role="alert"><p>{error}</p><button onClick={()=>location.reload()}>Reload</button></div>}
   <div className="stage-caption">{s.mode==='fly'?'NeuroMechFly · exterior reference':s.mode==='cells'?(neuron&&cells.surface?'Native neuron surface':'Traced neuron collection'):'MaleCNS · 80 brain regions'}</div>
  </div>
  {s.mode!=='fly'&&<aside className={`structure-list ${listOpen?'open':''}`} aria-label="Explore structures">
   <div className="list-heading"><span>{s.mode==='cells'?'Neuron studies':'Regions'}</span><button className="mobile-close icon-btn" aria-label="Close structures" onClick={()=>setListOpen(false)}><X size={17}/></button></div>
   <button className="all-structures" onClick={()=>{s.mode==='cells'?setCells(emptyCells):patch({visible:GROUPS.map(g=>g.id),selected:null,isolate:false,reset:s.reset+1});}}> {s.mode==='cells'?'All 388 neurons':'All regions'}<ChevronRight size={13}/></button>
   {s.mode==='brain'?<div className="group-list">{GROUPS.map(g=><button key={g.id} className={`group-row ${s.visible.length===1&&s.visible[0]===g.id?'active':''}`} onClick={()=>onlyGroup(g.id)} onPointerEnter={()=>patch({hoveredGroup:g.id})} onPointerLeave={()=>patch({hoveredGroup:null})} onFocus={()=>patch({hoveredGroup:g.id})} onBlur={()=>patch({hoveredGroup:null})}><i style={{background:g.color}}/><span>{g.name}</span>{s.visible.length===1&&s.visible[0]===g.id&&<Check size={12}/>}</button>)}</div>:<div className="study-list">{cellData?.featured.map(id=>{const n=cellData.neurons.find(n=>n.id===id)!;return <button className={cells.selected===id?'active':''} key={id} onClick={()=>selectNeuron(id,true)}><span>{n.type}</span><ChevronRight size={13}/></button>;})}</div>}
  </aside>}
  {detail&&<aside className="detail-card" aria-label="Selected structure">
   <button className="detail-close icon-btn" aria-label="Clear selection" onClick={()=>{patch({selected:null,isolate:false});setCells(emptyCells);}}><X size={17}/></button>
   {region&&info?<><div className="eyebrow" style={{color:groupFor(region.id).color}}>{side(region.id)}{paired?' + paired region':''}</div><h2>{info.name}</h2><p>{info.summary}</p><small className="geometry-note">{region.triangles.toLocaleString()} source triangles <span>·</span> {region.id}</small><button className="isolate-button" onClick={()=>patch({isolate:!s.isolate,explode:0,reset:s.reset+1})}>{s.isolate?'Show surrounding regions':paired?'Isolate pair':'Isolate region'}<ChevronRight size={14}/></button></>:neuron?<><div className="eyebrow">{neuron.instance}</div><h2>{neuron.type}</h2><p>{CELL_NOTES[neuron.type]??'An annotated neuron traced from the male brain’s electron-microscopy volume.'}</p><small className="geometry-note">{cells.surface&&neuron.mesh?`${neuron.mesh.triangles.toLocaleString()} source triangles`:`${neuron.edges.toLocaleString()} traced segments`} <span>·</span> ID {neuron.id}</small><button className="isolate-button" onClick={()=>setCells(v=>({...v,solo:!v.solo}))}>{cells.solo?'Show neuron collection':'Isolate neuron'}<ChevronRight size={14}/></button></>:null}
  </aside>}
  <div className="stage-dock">
   {s.mode!=='fly'&&<button className="mobile-list icon-btn" aria-label="Open structures" onClick={()=>setListOpen(true)}><SlidersHorizontal size={18}/></button>}
   {s.mode!=='fly'&&<button className={`explode-toggle ${s.explode>.5?'on':''}`} role="switch" aria-checked={s.explode>.5} aria-label={s.mode==='cells'?'Separate neuron families':'Explode brain'} onClick={explode}>{s.mode==='cells'?<Layers3 size={17}/>:<Box size={17}/>}<span>{s.mode==='cells'?'Separate families':'Explode'}</span><i><b/></i></button>}
   <button className="icon-btn" aria-label="Reset view" title="Reset view" onClick={reset}><RotateCcw size={17}/></button>
  </div>
  <div className="orbit-hint">Drag to rotate <span>·</span> Scroll to zoom</div>
  <dialog ref={dialog} className="sources-dialog" onCancel={()=>setSources(false)} onClick={e=>{if(e.target===e.currentTarget)setSources(false);}}>
   <div className="sources-header"><h2>Sources & scope</h2><button className="icon-btn" aria-label="Close sources" onClick={()=>setSources(false)}><X size={20}/></button></div>
   <div className="sources-scroll"><div className="scope-notes"><p><strong>Brain.</strong> MaleCNS v1.0: 80 region surfaces, 7,270,902 triangles. The region inventory excludes CV-anterior and CRN.</p><p><strong>Neurons.</strong> 388 selected centerline reconstructions and eight complete surface meshes in the same coordinate space. This is a subset of the published 166,691-neuron CNS; synapses are not shown. Line width does not encode neurite diameter.</p><p><strong>Presentation.</strong> Pale tissue approximates dissection microscopy. Highlight colors identify structures. Exploding rearranges anatomy for inspection. The NeuroMechFly exterior is a separate specimen.</p></div><div className="source-library">{SOURCES.map(source=><a href={source.url} key={source.id} target="_blank" rel="noreferrer"><span>{source.title}<small>{source.authors}</small></span><ChevronRight size={14}/></a>)}</div><p className="credits">MaleCNS data: CC BY 4.0 · NeuroMechFly: Apache 2.0 · Built on Human Atlas by ashemag (MIT).</p><a className="provenance-link" href="/male-cns/ATTRIBUTION.md" target="_blank" rel="noreferrer">Full asset provenance ↗</a></div>
  </dialog>
 </main>;
}
