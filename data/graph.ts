import '@2gis/gl-matrix';
import * as vec2 from '@2gis/gl-matrix/vec2';
// import KDBush from 'kdbush';
import KDBush = require('kdbush');

import { projectGeoToMap } from '../src/utils';
import { Building } from './buildings';
import { Graph, GraphVertex, GraphEdge } from './types';

interface Edge {
    id: string;
    class: number;
    in: string[];
    out: string[];
    vertices: number[][];
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

function createVertex(coords: number[], type: GraphVertex['type'] = 'road') {
    const vertex: GraphVertex = {
        id: idCounter++,
        coords,
        edges: [],
        type,
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

export function createGraph(edges: Edge[], buildings: Building[], options: CreateGraphOptions) {
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
            type: 'road',
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

    addBuildings(graph, buildings, mapCenter, range);

    return graph;
}

function addBuildings(graph: Graph, buildings: Building[], mapCenter: number[], range: number) {
    let kd = new KDBush(
        graph.vertices,
        (h) => h.coords[0],
        (h) => h.coords[1],
        64,
        Int32Array,
    );
    const vertexRadius = 500000;

    buildings.forEach((building) => {
        if (vec2.dist(building.point, mapCenter) > range) {
            return;
        }

        const verticesInRange = kd
            .within(building.point[0], building.point[1], vertexRadius)
            .map((index) => graph.vertices[index]);

        // let nearestVertex: GraphVertex | undefined;
        // let minDistance = Infinity;
        // for (let i = 0; i < verticesInRange.length; i++) {
        //     const vertex = verticesInRange[i];
        //     const distance = vec2.dist(vertex.coords, building.point);
        //     if (distance < minDistance) {
        //         minDistance = distance;
        //         nearestVertex = vertex;
        //     }
        // }

        if (!verticesInRange.length) {
            return;
        }

        addShortestLineToPoint(graph, verticesInRange, building.point);

        // обновляем, т.к. добавилась точка :(
        kd = new KDBush(
            graph.vertices,
            (h) => h.coords[0],
            (h) => h.coords[1],
            64,
            Int32Array,
        );
    });
}

function addShortestLineToPoint(graph: Graph, verticesInRange: GraphVertex[], point: number[]) {
    let nearest:
        | {
              edgeIndex: number;
              edge: GraphEdge;
              segmentIndex: number;
              closestPoint: number[];
              vertex: GraphVertex;
          }
        | undefined;
    let minDistance = 70 * 100;

    verticesInRange.forEach((vertex) => {
        vertex.edges.forEach((edgeIndex) => {
            const edge = graph.edges[edgeIndex];

            if (edge.type === 'house') {
                return;
            }

            for (let i = 0; i < edge.geometry.length - 1; i++) {
                const closestPoint = getClosestPointOnLineSegment(
                    point,
                    edge.geometry[i],
                    edge.geometry[i + 1],
                );
                const distance = vec2.dist(closestPoint, point);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = {
                        edgeIndex,
                        edge,
                        segmentIndex: i,
                        closestPoint,
                        vertex,
                    };
                }
            }
        });
    });

    if (!nearest) {
        return;
    }

    const vertexA = graph.vertices[nearest.edge.a];
    const vertexB = graph.vertices[nearest.edge.b];
    if (equalPoints(nearest.closestPoint, vertexA.coords)) {
        createNewEdge(graph, nearest.edge.a, point);
    } else if (equalPoints(nearest.closestPoint, vertexB.coords)) {
        createNewEdge(graph, nearest.edge.b, point);
    } else {
        const newVertexIndex = splitEdgeByPoint(
            graph,
            nearest.edgeIndex,
            nearest.segmentIndex,
            nearest.closestPoint,
        );
        createNewEdge(graph, newVertexIndex, point);
    }
}

function createNewEdge(graph: Graph, startVertexIndex: number, newPoint: number[]) {
    const startVertex = graph.vertices[startVertexIndex];

    const newVertex = createVertex(newPoint, 'house');
    const newVertexIndex = graph.vertices.length;
    graph.vertices.push(newVertex);

    const edge: GraphEdge = {
        geometry: [startVertex.coords, newVertex.coords],
        a: startVertexIndex,
        b: newVertexIndex,
        type: 'house',
    };
    const edgeIndex = graph.edges.length;
    graph.edges.push(edge);
    startVertex.edges.push(edgeIndex);
    newVertex.edges.push(edgeIndex);
}

function splitEdgeByPoint(graph: Graph, edgeIndex: number, segmentIndex: number, point: number[]) {
    const edge = graph.edges[edgeIndex];

    const newVertex = createVertex(point);
    const newVertexIndex = graph.vertices.length;
    graph.vertices.push(newVertex);

    const leftEdge: GraphEdge = {
        geometry: [],
        a: edge.a,
        b: newVertexIndex,
        type: 'road',
    };

    // левый становится прошлой гранью, чтобы не было дырок в массиве
    const leftEdgeIndex = edgeIndex;
    graph.edges[leftEdgeIndex] = leftEdge;

    const rightEdge: GraphEdge = {
        geometry: [],
        a: newVertexIndex,
        b: edge.b,
        type: 'road',
    };
    const rightVertex = graph.vertices[edge.b];
    // правый пушится в конец
    const rightEdgeIndex = graph.edges.length;
    graph.edges.push(rightEdge);

    newVertex.edges.push(leftEdgeIndex, rightEdgeIndex);

    // в правой вершине нужно вместе индекса старой грани, воткнуть индекс правой
    const edgeIndexInRightVertex = rightVertex.edges.indexOf(edgeIndex);
    if (edgeIndexInRightVertex === -1) {
        throw new Error('Почему-то в правом векторе не нашлась грань!');
    }
    rightVertex.edges[edgeIndexInRightVertex] = rightEdgeIndex;

    for (let i = 0; i < edge.geometry.length; i++) {
        if (i <= segmentIndex) {
            leftEdge.geometry.push(edge.geometry[i]);
        }

        if (i === segmentIndex) {
            leftEdge.geometry.push(point);
            rightEdge.geometry.push(point);
        }

        if (i > segmentIndex) {
            rightEdge.geometry.push(edge.geometry[i]);
        }
    }

    return newVertexIndex;
}

function getClosestPointOnLineSegment(
    point: number[],
    point1: number[],
    point2: number[],
): number[] {
    const A = point[0] - point1[0];
    const B = point[1] - point1[1];
    const C = point2[0] - point1[0];
    const D = point2[1] - point1[1];

    const dot = A * C + B * D;
    const lengthSquared = C * C + D * D;
    const param = lengthSquared !== 0 ? dot / lengthSquared : 0;

    if (param < 0) {
        return point1;
    } else if (param > 1) {
        return point2;
    } else {
        return [Math.round(point1[0] + param * C), Math.round(point1[1] + param * D)];
    }
}
