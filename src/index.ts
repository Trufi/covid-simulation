// declare const mapgl: any;
import '@2gis/gl-matrix';
import * as vec2 from '@2gis/gl-matrix/vec2';
import { projectGeoToMap, clamp } from './utils';

const defaultMapOptions = {
    center: [82.920412, 55.030111],
    zoom: 12,
};

// const map = ((window as any).map = new mapgl.Map('map', {
//     ...defaultMapOptions,
//     key: '042b5b75-f847-4f2a-b695-b5f58adc9dfd',
//     zoomControl: false,
// }));

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const size = Math.min(window.innerWidth, window.innerHeight);
canvas.width = size;
canvas.height = size;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

const statsCanvas = document.getElementById('stats') as HTMLCanvasElement;
const statsCtx = statsCanvas.getContext('2d') as CanvasRenderingContext2D;
const statsSize = [200, 70];
statsCanvas.width = statsSize[0];
statsCanvas.height = statsSize[1];

interface Edge {
    id: string;
    class: number;
    in: string[];
    out: string[];
    vertices: number[][];
}

interface Stat {
    first: number;
    disease: number;
    immune: number;
}

const bounds = { min: [0, 0], max: [0, 0] };
const mapCenter = projectGeoToMap(defaultMapOptions.center);
const range = 1500000;
const rangeVec2 = [range, range];

const diseaseRange = 15000;
const immuneTime = 15000;
const humansCount = 2000;

const speed = 100000;
const colors: { [key in Human['state']]: number[] } = {
    first: [170, 198, 202],
    disease: [187, 100, 29],
    immune: [203, 138, 192],
};

const stats: Stat[] = [];

interface GraphEdge {
    geometry: number[][];
    vertexA: GraphVertex;
    vertexB: GraphVertex;
}

interface GraphVertex {
    id: number;
    edges: GraphEdge[];
    coords: number[];
}

interface Graph {
    vertices: Map<number, GraphVertex>;
    edges: GraphEdge[]; // Просто список всех
}

interface TempEdge extends Edge {
    startVertexId?: number;
    endVertexId?: number;
}

function createGraph(inputEdges: Edge[]) {
    let idCounter = 0;

    const nearRadius = 100;

    const graph: Graph = {
        vertices: new Map(),
        edges: [],
    };

    const edges = inputEdges.slice(0) as TempEdge[];

    function findVertex(point: number[]) {
        let nearestVertex: GraphVertex | undefined;
        let minDistance = Infinity;

        graph.vertices.forEach((vertex) => {
            const distance = vec2.dist(vertex.coords, point);
            if (minDistance > distance) {
                minDistance = distance;
                nearestVertex = vertex;
            }
        });

        if (nearestVertex && minDistance < nearRadius) {
            return nearestVertex;
        }
    }

    function equalPoints(a: number[], b: number[]) {
        return vec2.dist(a, b) < nearRadius;
    }

    function hasVertexSameEdge(vertex: GraphVertex, edge: GraphEdge) {
        const sameEdge = vertex.edges.find((vertexEdge) => {
            return (
                (equalPoints(vertexEdge.vertexA.coords, edge.vertexA.coords) &&
                    equalPoints(vertexEdge.vertexB.coords, edge.vertexB.coords)) ||
                (equalPoints(vertexEdge.vertexA.coords, edge.vertexB.coords) &&
                    equalPoints(vertexEdge.vertexB.coords, edge.vertexA.coords))
            );
        });

        return Boolean(sameEdge);
    }

    function createVertex(coords: number[]) {
        const vertex: GraphVertex = {
            id: idCounter++,
            coords,
            edges: [],
        };
        return vertex;
    }

    edges.forEach((edge) => {
        const startPoint = edge.vertices[0];
        const endPoint = edge.vertices[edge.vertices.length - 1];

        let startVertex = findVertex(startPoint);
        let endVertex = findVertex(endPoint);

        if (!startVertex) {
            startVertex = createVertex(startPoint);
            graph.vertices.set(startVertex.id, startVertex);
        }

        if (!endVertex) {
            endVertex = createVertex(endPoint);
            graph.vertices.set(endVertex.id, endVertex);
        }

        const graphEdge: GraphEdge = {
            geometry: edge.vertices,
            vertexA: startVertex,
            vertexB: endVertex,
        };

        let newEdge = false;
        if (!hasVertexSameEdge(startVertex, graphEdge)) {
            startVertex.edges.push(graphEdge);
            newEdge = true;
        }

        if (!hasVertexSameEdge(endVertex, graphEdge)) {
            endVertex.edges.push(graphEdge);
            newEdge = true;
        }

        if (newEdge) {
            graph.edges.push(graphEdge);
        }
    });

    return graph;
}

let graph: Graph = {
    vertices: new Map(),
    edges: [],
};

interface Human {
    coords: number[];
    edge: GraphEdge;
    edgeSegment: number;
    forward: boolean;
    startTime: number;
    state: 'first' | 'disease' | 'immune';
    diseaseStart: number;
}

const humans: Human[] = [];

fetch('./dist/data.json')
    .then((r) => r.json())
    .then((data: Edge[]) => {
        console.log(data);

        // bounds = findBounds(data);
        vec2.sub(bounds.min, mapCenter, rangeVec2);
        vec2.add(bounds.max, mapCenter, rangeVec2);
        // data = data.slice(0, 5000);

        data.forEach((edge) => {
            edge.vertices.forEach((vertex) => {
                const p = projectGeoToMap(vertex);
                vec2.copy(vertex, p);
            });
        });

        graph = createGraph(data);

        for (let i = 0; i < humansCount; i++) {
            spawnHuman(i < 30);
        }
    });

function spawnHuman(disease: boolean) {
    const id = Math.floor(Math.random() * graph.vertices.size);
    const vertexFrom = graph.vertices.get(id);
    if (!vertexFrom) {
        console.log('aaaa not found random vertex');
        return;
    }

    const edgeIndex = Math.floor(Math.random() * vertexFrom.edges.length);
    const edge = vertexFrom.edges[edgeIndex];

    const forward = edge.vertexA === vertexFrom;

    const now = Date.now();
    const human: Human = {
        coords: vertexFrom.coords.slice(0),
        forward,
        edge,
        edgeSegment: 0,
        startTime: now,
        state: disease ? 'disease' : 'first',
        diseaseStart: now,
    };

    humans.push(human);
}

function renderLoop() {
    requestAnimationFrame(renderLoop);
    const now = Date.now();
    ctx.clearRect(0, 0, size, size);
    drawGraph();
    drawHumans(now);

    findNearHumans(now);

    collectStats();
    drawStats();
}
renderLoop();

function collectStats() {
    const stat: Stat = {
        disease: 0,
        first: 0,
        immune: 0,
    };
    humans.forEach((h) => stat[h.state]++);
    stats.push(stat);
}

function findNearHumans(now: number) {
    for (let i = 0; i < humans.length - 1; i++) {
        const a = humans[i];
        for (let j = i + 1; j < humans.length; j++) {
            const b = humans[j];

            if (a.state === 'disease' && b.state === 'first') {
                if (vec2.dist(a.coords, b.coords) < diseaseRange) {
                    b.state = 'disease';
                    b.diseaseStart = now;
                }
            } else if (a.state === 'first' && b.state === 'disease') {
                if (vec2.dist(a.coords, b.coords) < diseaseRange) {
                    a.state = 'disease';
                    a.diseaseStart = now;
                }
            }
        }
    }
}

function drawHumans(now: number) {
    humans.forEach((h) => drawHuman(h, now));
}

function drawHuman(human: Human, now: number) {
    const distance = (speed * (now - human.startTime)) / 1000;

    let passed = 0;
    let ended = true;

    for (let i = 0; i < human.edge.geometry.length - 1; i++) {
        const segment = human.forward
            ? [human.edge.geometry[i], human.edge.geometry[i + 1]]
            : [
                  human.edge.geometry[human.edge.geometry.length - 1 - i],
                  human.edge.geometry[human.edge.geometry.length - 1 - (i + 1)],
              ];

        const length = vec2.dist(segment[0], segment[1]);
        if (distance < passed + length) {
            const t = clamp((distance - passed) / length, 0, 1);
            vec2.lerp(human.coords, segment[0], segment[1], t);
            ended = false;
            break;
        }
        passed += length;
    }

    if (ended) {
        // найти следующую цель
        const endVertex = human.forward ? human.edge.vertexB : human.edge.vertexA;
        const prevEdgeIndex = endVertex.edges.indexOf(human.edge);

        let edgeIndex = Math.floor(Math.random() * (endVertex.edges.length - 1));
        if (endVertex.edges.length > 0 && edgeIndex === prevEdgeIndex) {
            edgeIndex = edgeIndex + 1 && endVertex.edges.length - 1;
        }
        human.edge = endVertex.edges[edgeIndex];
        human.startTime = now;
        human.forward = human.edge.vertexA === endVertex;
    }

    if (human.state === 'disease' && now - human.diseaseStart > immuneTime) {
        human.state = 'immune';
    }

    const size = 10;
    const point = drawProject(human.coords);

    ctx.fillStyle = `rgba(${colors[human.state].join(',')}, 0.8)`;
    ctx.fillRect(point[0] - size / 2, point[1] - size / 2, size, size);
}

function drawGraph() {
    graph.edges.forEach(drawEdge);

    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    graph.vertices.forEach(drawVertex);
}

function drawVertex(vertex: GraphVertex) {
    const size = 4;
    const point = drawProject(vertex.coords);
    ctx.fillRect(point[0] - size / 2, point[1] - size / 2, size, size);
}

function drawEdge(edge: GraphEdge) {
    const points = edge.geometry;

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();

    const firstPoint = drawProject(points[0]);
    ctx.moveTo(firstPoint[0], firstPoint[1]);
    for (let i = 1; i < points.length; i++) {
        const point = drawProject(points[i]);
        ctx.lineTo(point[0], point[1]);
    }
    ctx.stroke();

    ctx.closePath();
}

function drawProject(p: number[]) {
    const { min, max } = bounds;
    return [
        ((p[0] - min[0]) / (max[0] - min[0])) * size,
        ((p[1] - min[1]) / (max[1] - min[1])) * size,
    ];
}

// function findBounds(edges: Edge[]) {
//     const min = [Infinity, Infinity];
//     const max = [-Infinity, -Infinity];

//     edges.forEach((edge) => {
//         const points = edge.vertices.map(projectGeoToMap);

//         points.forEach((p) => {
//             vec2.min(min, min, p);
//             vec2.max(max, max, p);
//         });
//     });
//     return { min, max };
// }

function drawStats() {
    const ctx = statsCtx;
    ctx.clearRect(0, 0, statsSize[0], statsSize[1]);

    const count = humans.length;

    const width = 1;

    const columnsCount = statsSize[0] / width;
    for (let x = 0; x < columnsCount; x++) {
        let index = x;
        if (stats.length > columnsCount) {
            index = Math.floor((x / columnsCount) * stats.length);
        }

        const s = stats[index];
        if (!s) {
            return;
        }
        ctx.fillStyle = `rgba(${colors.first.join(',')}, 1)`;

        ctx.fillRect(x * width, 0, (x + 1) * width, statsSize[1]);

        ctx.fillStyle = `rgba(${colors.immune.join(',')}, 1)`;
        ctx.fillRect(x * width, 0, (x + 1) * width, (s.immune / count) * statsSize[1]);

        const diseaseH = (s.disease / count) * statsSize[1];
        ctx.fillStyle = `rgba(${colors.disease.join(',')}, 1)`;
        ctx.fillRect(x * width, statsSize[1] - diseaseH, (x + 1) * width, diseaseH);
    }
}
