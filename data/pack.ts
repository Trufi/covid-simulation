import { Graph, GraphEdge } from './types';

const roundFactor = 100;

export function packGraph(graph: Graph) {
    let lastX = 0;
    let lastY = 0;

    function deltaEncodeVec2(p: number[]) {
        const x = p[0] - lastX;
        const y = p[1] - lastY;
        lastX = p[0];
        lastY = p[1];
        p[0] = x;
        p[1] = y;
    }

    let last = 0;
    function deltaEncode(ex: number) {
        const x = ex - last;
        last = ex;
        return x;
    }

    graph.vertices.forEach((v) => {
        v.coords = [v.coords[0] - graph.center[0], v.coords[1] - graph.center[1]];
        v.coords = [Math.round(v.coords[0] / roundFactor), Math.round(v.coords[1] / roundFactor)];
        deltaEncodeVec2(v.coords);
        (v as any).type = packType(v.type);
        v.edges = v.edges.map(deltaEncode);
    });

    graph.edges.forEach((e) => {
        (e as any).type = packType(e.type);
        e.a = deltaEncode(e.a);
        e.b = deltaEncode(e.b);

        if (e.geometry.length <= 2) {
            (e as any).geometry = undefined;
        } else {
            e.geometry = e.geometry.map((v) => {
                const coords = [v[0] - graph.center[0], v[1] - graph.center[1]];
                coords[0] = Math.round(coords[0] / roundFactor);
                coords[1] = Math.round(coords[1] / roundFactor);
                deltaEncodeVec2(coords);
                return coords;
            });
        }
    });
}

export function unpackGraph(graph: Graph) {
    let lastX = 0;
    let lastY = 0;

    function deltaDecodeVec2(p: number[]) {
        lastX = p[0] = p[0] + lastX;
        lastY = p[1] = p[1] + lastY;
    }

    let last = 0;
    function deltaDecode(ex: number) {
        last = ex + last;
        return last;
    }

    graph.vertices.forEach((v) => {
        deltaDecodeVec2(v.coords);

        v.coords[0] = v.coords[0] * roundFactor;
        v.coords[1] = v.coords[1] * roundFactor;

        v.coords[0] = v.coords[0] + graph.center[0];
        v.coords[1] = v.coords[1] + graph.center[1];

        v.type = unpackType((v as any).type);
        v.edges = v.edges.map(deltaDecode);
    });

    graph.edges.forEach((e) => {
        e.type = unpackType((e as any).type);
        e.a = deltaDecode(e.a);
        e.b = deltaDecode(e.b);

        if (e.geometry === undefined) {
            e.geometry = [graph.vertices[e.a].coords, graph.vertices[e.b].coords];
        } else {
            e.geometry.forEach((v) => {
                deltaDecodeVec2(v);
                v[0] = v[0] * roundFactor;
                v[1] = v[1] * roundFactor;
                v[0] = v[0] + graph.center[0];
                v[1] = v[1] + graph.center[1];
            });
        }
    });
}

function packType(type: GraphEdge['type']): number {
    switch (type) {
        case 'road':
            return 0;
        case 'house':
            return 1;
        case 'null':
            return 3;
    }
    return 0;
}

function unpackType(type: number): GraphEdge['type'] {
    switch (type) {
        case 0:
            return 'road';
        case 1:
            return 'house';
        case 3:
            return 'null';
    }
    return 'road';
}
