# Fly Brain Atlas

An interactive atlas of the adult male fruit fly brain using published MaleCNS geometry. Built from [Human Atlas](https://github.com/ashemag/human-atlas).

- 80 brain regions with 7,270,902 native source triangles.
- Exploded anatomy, paired-region highlighting, and isolation.
- 388 traced neurons plus eight complete neuron meshes, loaded on demand.
- A separate detailed NeuroMechFly exterior reference.
- A minimal dark interface with source-backed structure descriptions.

## Run

Node.js 22.13 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:3027. Drag to orbit, scroll to zoom, and select a structure. The Explode toggle separates regions for inspection. In Neurons, select a study to load its native surface. Sources contains provenance, research, and scope.

```sh
npm run check
npm run validate:data
npm run build
```

Production files are generated in `dist/`. Serve the entire directory, including its model assets. No API token is required at runtime. Geometry is served locally; Google Fonts is used for typography.

## Data and reproducibility

See [asset provenance](public/male-cns/ATTRIBUTION.md), `public/male-cns/manifest.json`, and `public/male-cns/neurons.json` for source URLs and SHA-256 checksums. To retrieve missing MaleCNS files, run `python3 scripts/download-male-cns.py`; existing files and the included annotation snapshot are reused. `node scripts/pack-fly-body.mjs` rebuilds the exterior binary from the supplied source STL files and rig.

Regions and neurons share MaleCNS EM coordinates. The exterior is an independent specimen. The cellular view is a selected collection, not all 166,691 neurons or a display of synapses. Colors and exploded spacing are illustrative. Meshes preserve source segmentation artifacts; more triangles do not imply more certain biological boundaries.

The full regional collection has substantial geometry (approximately 125 MB). Neuron skeletons load only in Neurons, and complete neuron meshes load only when selected. A WebGL-capable browser with hardware acceleration is recommended.

## Credits and licenses

MaleCNS data: FlyEM / HHMI Janelia, Cambridge, MRC LMB, and Google Research — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). NeuroMechFly / FlyGym — Apache 2.0. Application and Human Atlas foundation — MIT. Research references are linked in the application.
