import '@2gis/gl-matrix';
import * as vec2 from '@2gis/gl-matrix/vec2';
import { projectGeoToMap } from '../src/utils';

interface Edge {
    id: string;
    class: number;
    in: string[];
    out: string[];
    vertices: number[][];
}

export interface GraphEdge {
    // id: string;
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

const nearRadius = 100;

function equalPoints(a: number[], b: number[]) {
    return vec2.dist(a, b) < nearRadius;
}

function hasVertexSameEdge(graph: Graph, vertex: GraphVertex, edge: GraphEdge) {
    const edgeA = graph.vertices[edge.a].coords;
    const edgeB = graph.vertices[edge.b].coords;

    const sameEdge = vertex.edges.find((vertexEdgeId) => {
        const vertexEdge = graph.edges[vertexEdgeId];
        // return vertexEdge.id === edge.id;
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
        const distance = vec2.dist(vertex.coords, point);
        if (minDistance > distance) {
            minDistance = distance;
            nearestVertex = vertex;
        }
    }

    if (nearestVertex && minDistance < nearRadius) {
        return nearestVertex;
    }
}

export interface CreateGraphOptions {
    /**
     * Центр от которого будет считать радиус [lng, lat]
     */
    center: number[];

    /**
     * Радиус в метрах
     */
    range: number;
}

export function createGraph(edges: Edge[], options: CreateGraphOptions) {
    const mapCenter = projectGeoToMap(options.center);
    const range = options.range * 100;

    const graph: Graph = {
        vertices: [],
        edges: [],
    };

    edges.forEach((edge) => {
        const edgeHasVertexInRange = edge.vertices.some(
            (point) => vec2.dist(point, mapCenter) < range,
        );
        if (!edgeHasVertexInRange) {
            return;
        }

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
            // id: edge.id,
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
