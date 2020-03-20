import { Graph } from './types';

const roundFactor = 100;

export function packGraph(graph: Graph) {
    graph.vertices.forEach((v) => {
        v.coords = [Math.round(v.coords[0] / roundFactor), Math.round(v.coords[1] / roundFactor)];
        (v as any).type = v.type === 'road' ? 0 : 1;
        (v as any).id = undefined;
    });
    graph.edges.forEach((e) => {
        (e as any).type = e.type === 'road' ? 0 : 1;
        e.geometry = e.geometry.map((v) => [
            Math.round(v[0] / roundFactor),
            Math.round(v[1] / roundFactor),
        ]);
    });
}

export function unpackGraph(graph: Graph) {
    graph.vertices.forEach((v) => {
        v.coords[0] = v.coords[0] * roundFactor;
        v.coords[1] = v.coords[1] * roundFactor;
        v.type = (v as any).type === 0 ? 'road' : 'house';
    });
    graph.edges.forEach((e) => {
        e.type = (e as any).type === 0 ? 'road' : 'house';
        e.geometry.forEach((v) => {
            v[0] = v[0] * roundFactor;
            v[1] = v[1] * roundFactor;
        });
    });
}
