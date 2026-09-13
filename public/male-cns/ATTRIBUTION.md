# MaleCNS asset provenance

Data: **MaleCNS v1.0**, FlyEM / HHMI Janelia, University of Cambridge, MRC Laboratory of Molecular Biology, and Google Research.

- Project and publication: https://male-cns.janelia.org/
- Official downloads, formats, and coordinate conventions: https://male-cns.janelia.org/download/
- Dataset license: **Creative Commons Attribution 4.0**, https://creativecommons.org/licenses/by/4.0/
- Access-tools repository: https://github.com/natverse/malecns (GPL-3.0 code; not incorporated into this application).
- Downloaded 13 September 2026. Public annotations may subsequently change; the included metadata is the acquisition snapshot.

## Regional anatomy

80 region meshes from `gs://flyem-male-cns/rois/fullbrain-roi-v5/mesh/` contain **7,270,902 source triangles**. CV-anterior and CRN are excluded from the 82-entry source label map. Identifiers are normalized for the interface: `(L)`/`(R)` becomes `_L`/`_R`, and mushroom-body identifiers receive readable prefixes. Original source labels, URLs, bounds, and SHA-256 checksums are in `manifest.json`.

The downloaded legacy-mesh files are unchanged: uint32 vertex count, float32 XYZ vertices, and uint32 triangle indices. Coordinates are nanometers in the MaleCNS EM space. Both regional and cellular renderers apply the same uniform scale and orientation `(x, -y, -z)` after translation. Native triangles and assembled spatial relationships are retained. Shading, natural-tissue approximation, group colors, and exploded positions are presentation choices. Region surfaces are atlas boundaries, not the outer membrane of an organ or evidence of physical separability. Sampling and segmentation artifacts in the source are retained.

## Individual neurons

`neurons.json` describes **388 centerline skeletons** and **eight native surface meshes**. Skeletons retain all **707,518 source edges**. Binary format: uint32 vertex/edge counts, float32 XYZ vertices, uint32 edge endpoint indices. The official precomputed skeleton coordinates are in nanometers, matching the region and neuron meshes. Display line width does not encode neurite diameter.

The collection uses 96 neurons per displayed family, selected by a deterministic per-type round-robin with hash-ordered body IDs, plus eight surface exemplars (four already present in the collection). This emphasizes morphological variety, not population frequencies or statistical representativeness. Family assignments use the type-label patterns in `scripts/download-male-cns.py`; they are interface groupings. Type and instance names are copied from the source annotation snapshot. The rendered collection is not the entire published 166,691-neuron brain-and-ventral-nerve-cord reconstruction. Synapse positions and connection strengths are not shown.

Native neuron surface studies: HSN (10015), T4a (13882), MBON01 (10013), KCg-m (14292), VL2a_adPN (10039), DA1_lPN (10075), EPG (10539), and ER5 (10043). All surface vertices and triangles are retained. Meshes load on demand.

## Exterior and application

The exterior reference is **NeuroMechFly**, distributed with **FlyGym v1.2.1**, NeLy-EPFL, under Apache 2.0. See `../fly-body/LICENSE` and https://github.com/NeLy-EPFL/flygym/tree/v1.2.1/flygym/data. The 69 placed components retain 502,781 source triangles. The supplied tripod pose and source rig are used to assemble the model. Colors and wing transparency are illustrative. The exterior is not registered to the MaleCNS brain and is not a reconstruction of the same specimen.

Application foundation: **Human Atlas**, ashemag, https://github.com/ashemag/human-atlas, MIT. Application code retains its MIT license. The dataset licenses above apply separately to assets.
