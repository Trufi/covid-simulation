import '@2gis/gl-matrix';
import * as vec2 from '@2gis/gl-matrix/vec2';

interface Edge {
    id: string;
    class: number;
    in: string[];
    out: string[];
    vertices: number[][];
}

export interface GraphEdge {
    geometry: number[][];
    a: number;
    b: number;
}

export interface GraphVertex {
    id: number;
    edges: number[];
    coords: number[];
}

export interface Graph {
    vertices: GraphVertex[];
    edges: GraphEdge[]; // Просто список всех
}

function equalPoints(a: number[], b: number[]) {
    return vec2.dist(a, b) < 0.0001;
}

function hasVertexSameEdge(graph: Graph, vertex: GraphVertex, edge: GraphEdge) {
    const edgeA = graph.vertices[edge.a].coords;
    const edgeB = graph.vertices[edge.b].coords;

    const sameEdge = vertex.edges.find((vertexEdgeId) => {
        const vertexEdge = graph.edges[vertexEdgeId];
        const vertexEdgeA = graph.vertices[vertexEdge.a].coords;
        const vertexEdgeB = graph.vertices[vertexEdge.b].coords;
        return (
            (equalPoints(vertexEdgeA, edgeA) && equalPoints(vertexEdgeB, edgeB)) ||
            (equalPoints(vertexEdgeA, edgeB) && equalPoints(vertexEdgeB, edgeA))
        );
    });

    return Boolean(sameEdge);
}

let idCounter = 0;

function createVertex(coords: number[]) {
    const vertex: GraphVertex = {
        id: idCounter++,
        coords,
        edges: [],
    };
    return vertex;
}

function findVertex(graph: Graph, point: number[]) {
    let nearestVertex: GraphVertex | undefined;
    let minDistance = Infinity;

    for (const id in graph.vertices) {
        const vertex = graph.vertices[id];
        const distance = geoPointsDistance(vertex.coords, point);
        if (minDistance > distance) {
            minDistance = distance;
            nearestVertex = vertex;
        }
    }

    if (nearestVertex && minDistance < 50) {
        return nearestVertex;
    }
}

export function createGraph(edges: Edge[]) {
    const graph: Graph = {
        vertices: [],
        edges: [],
    };

    edges.forEach((edge) => {
        const startPoint = edge.vertices[0];
        const endPoint = edge.vertices[edge.vertices.length - 1];

        let startVertex = findVertex(graph, startPoint);
        let endVertex = findVertex(graph, endPoint);

        if (!startVertex) {
            startVertex = createVertex(startPoint);
            graph.vertices[startVertex.id] = startVertex;
        }

        if (!endVertex) {
            endVertex = createVertex(endPoint);
            graph.vertices[endVertex.id] = endVertex;
        }

        const edgeIndex = graph.edges.length;
        const graphEdge: GraphEdge = {
            geometry: edge.vertices,
            a: startVertex.id,
            b: endVertex.id,
        };

        let pushedNewEdge = false;
        if (!hasVertexSameEdge(graph, startVertex, graphEdge)) {
            startVertex.edges.push(edgeIndex);
            graph.edges.push(graphEdge);
            pushedNewEdge = true;
        }

        if (!hasVertexSameEdge(graph, endVertex, graphEdge)) {
            endVertex.edges.push(edgeIndex);
            if (!pushedNewEdge) {
                graph.edges.push(graphEdge);
            }
        }
    });

    return graph;
}

function geoPointsDistance(lngLat1: number[], lngLat2: number[]): number {
    const R = 6371000;
    const rad = Math.PI / 180;
    const lat1 = lngLat1[1] * rad;
    const lat2 = lngLat2[1] * rad;
    const sinDLat = Math.sin(((lngLat2[1] - lngLat1[1]) * rad) / 2);
    const sinDLon = Math.sin(((lngLat2[0] - lngLat1[0]) * rad) / 2);
    const a = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
