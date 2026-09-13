"""Fetch an attributed, bounded MaleCNS v1.0 collection from official public storage.
Regions and neuron surfaces are retained byte-for-byte. Skeletons retain every node/edge.
Run from any directory; existing files are reused. No neuPrint credentials required.
"""
import concurrent.futures, hashlib, json, pathlib, re, struct, subprocess, urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/male-cns'
BASE = 'https://storage.googleapis.com/flyem-male-cns/'
def get(path, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists():
        subprocess.run(['curl', '-fL', '--retry', '3', '-sS', BASE+urllib.parse.quote(path, safe='/:'), '-o', str(dest)], check=True)
    return dest.read_bytes()
def properties(path, name):
    j=json.loads(get(path, OUT/'metadata'/name))['inline']
    return dict(zip(j['ids'], j['properties'][0]['values']))
def mesh_stats(raw):
    n=struct.unpack_from('<I',raw)[0]
    assert (len(raw)-4-n*12)%12 == 0
    verts=list(struct.iter_unpack('<fff',raw[4:4+n*12]))
    return dict(vertices=n,triangles=(len(raw)-4-n*12)//12,bounds=[[min(p[k] for p in verts) for k in range(3)],[max(p[k] for p in verts) for k in range(3)]],sha256=hashlib.sha256(raw).hexdigest())
rois=properties('rois/fullbrain-roi-v5/segment_properties/info','regions.json')
def region(item):
    num,name=item
    prefix={'CA':'MB_CA','PED':'MB_PED',"a'L":'MB_AP', 'aL':'MB_A',"b'L":'MB_BP','bL':'MB_B','gL':'MB_G'}
    match=re.match(r'(.+)\(([LR])\)$',name)
    root,hemisphere=(match[1],match[2]) if match else (name,None)
    id=prefix.get(root,root)+('_'+hemisphere if hemisphere else '')
    path='rois/fullbrain-roi-v5/mesh/'
    fragments=json.loads(get(path+num+':0',OUT/'metadata'/f'roi-{num}.json'))['fragments']
    assert len(fragments)==1
    url=path+fragments[0]
    raw=get(url,OUT/'regions'/f'{id}.bin')
    return dict(id=id,sourceId=int(num),sourceLabel=name,url=BASE+urllib.parse.quote(url,safe='/:'),**mesh_stats(raw))
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    parts=list(pool.map(region,[(i,n) for i,n in rois.items() if n not in ['CV-anterior','CRN']]))
(OUT/'manifest.json').write_text(json.dumps(dict(source='MaleCNS v1.0 · fullbrain-roi-v5',units='nm',excluded=['CV-anterior','CRN'],parts=parts),indent=2))
print('Regions',len(parts),'triangles',sum(p['triangles'] for p in parts),flush=True)
types=properties('v1.0/segmentation/type_property/info','types.json')
instances=properties('v1.0/segmentation/instance_property/info','instances.json')
groups={
 'optic':lambda t: bool(re.match(r'^(T[45][abcd]|Mi1|Tm[123]|HSN|HSE|HSS|VS)$',t)),
 'mushroom':lambda t: t.startswith(('KC','MBON')),
 'olfactory':lambda t: bool(re.search(r'_(?:ad|l|v)PN$',t)),
 'central':lambda t: t.startswith(('EPG','PEN','PFL','ER')),
}
# Deterministic hash ordering within each neuron type; equal per-type round-robin.
# This deliberately highlights morphological variety and is not a statistical sample.
selected={}
for group,test in groups.items():
    buckets={}
    for id,t in types.items():
        if test(t): buckets.setdefault(t,[]).append(id)
    for ids in buckets.values():
        ids.sort(key=int)
        ids[:]=[ids[i] for i in sorted(range(len(ids)),key=lambda i: hashlib.sha256(ids[i].encode()).hexdigest())]
    count=0;offset=0
    while count<96:
        for t,ids in sorted(buckets.items()):
            if offset<len(ids) and count<96:
                selected[ids[offset]]=group;count+=1
        offset+=1
featured_types=['HSN','T4a','MBON01','KCg-m','VL2a_adPN','DA1_lPN','EPG','ER5']
featured=[]
for t in featured_types:
    id=next(i for i,v in types.items() if v==t)
    group=next(g for g,fn in groups.items() if fn(t))
    selected[id]=group;featured.append(id)
def neuron(item):
    id,group=item
    path=f'v1.0/segmentation/skeletons-malecns/skeletons-precomputed/{id}'
    raw=get(path,OUT/'skeletons'/f'{id}.bin');n,e=struct.unpack_from('<II',raw)
    assert len(raw)==8+n*12+e*8
    result=dict(id=id,type=types[id],instance=instances.get(id,types[id]),group=group,nodes=n,edges=e,url=BASE+path,sha256=hashlib.sha256(raw).hexdigest())
    if id in featured:
        meshpath=f'v1.0/segmentation/meshes-malecns/single-res-meshes/{id}.ngmesh'
        m=get(meshpath,OUT/'neurons'/f'{id}.bin')
        result['mesh']=dict(url=BASE+meshpath,**mesh_stats(m))
    return result
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool: neurons=list(pool.map(neuron,selected.items()))
(OUT/'neurons.json').write_text(json.dumps(dict(source='MaleCNS v1.0',units='nm',selection='96 neurons per displayed family, stratified by type; additional native-surface exemplars. Not a representative or complete connectome.',featured=featured,neurons=neurons),indent=2))
print('Neurons',len(neurons),'edges',sum(n['edges'] for n in neurons),'native surfaces',len(featured),flush=True)
