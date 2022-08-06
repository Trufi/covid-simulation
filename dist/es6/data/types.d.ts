export interface GraphEdge {
    geometry: number[][];
    a: number;
    b: number;
    type: 'road' | 'house' | 'null';
}
export interface GraphVertex {
    id: number;
    edges: number[];
    coords: number[];
    type: 'road' | 'house' | 'null';
}
export interface Graph {
    vertices: GraphVertex[];
    edges: GraphEdge[];
    center: number[];
    min: number[];
    max: number[];
}
