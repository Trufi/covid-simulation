export interface GraphEdge {
    // id: string;
    geometry: number[][];
    a: number;
    b: number;
    type: 'road' | 'house';
}

export interface GraphVertex {
    id: number;
    edges: number[];
    coords: number[];
    type: 'road' | 'house';
}

export interface Graph {
    vertices: GraphVertex[];
    edges: GraphEdge[]; // Просто список всех
}
