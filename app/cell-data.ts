import type {GroupId, Part} from './fly-data';
export interface Neuron {id:string;type:string;instance:string;group:GroupId;nodes:number;edges:number;url:string;sha256:string;mesh?:Omit<Part,'id'|'sourceId'>}
export interface CellAtlas {source:string;units:string;selection:string;featured:string[];neurons:Neuron[]}
export interface CellState {selected:string|null;group:GroupId|null;surface:boolean;solo:boolean}
export const CELL_GROUPS=['optic','mushroom','olfactory','central'] as const;
export const CELL_NOTES:Record<string,string>={
 HSN:'A horizontal-system tangential neuron in the lobula plate. Its extensive branches are part of the fly’s visual motion pathways.',
 T4a:'A T4 motion-pathway neuron. The compact, repeated anatomy belongs to the columnar circuits of the optic lobe.',
 MBON01:'A mushroom body output neuron. It collects signals from mushroom body compartments and carries output into other brain territories.',
 'KCg-m':'A γ Kenyon cell of the mushroom body. Kenyon cells provide a sparse representation used by associative-learning circuitry.',
 VL2a_adPN:'An antennal-lobe projection neuron with the source label VL2a_adPN. Its arborizations link early olfactory processing to higher olfactory regions.',
 DA1_lPN:'A DA1 lateral projection neuron. This is one individual reconstructed neuron from the source’s DA1_lPN type.',
 EPG:'An EPG neuron in the central-complex heading network, connecting regions including the ellipsoid body and protocerebral bridge.',
 ER5:'An ellipsoid-body ring neuron of type ER5. Its branching geometry is shown directly from the MaleCNS reconstruction.',
};
