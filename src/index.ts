import '@2gis/gl-matrix';
import KDBush from 'kdbush';
import * as vec2 from '@2gis/gl-matrix/vec2';
import { clamp, projectGeoToMap } from './utils';
import { Graph, GraphVertex } from '../data/graph';
import { draw3d } from './3d';
import { config } from './config';

const random = (() => {
    let seed = config.randomSeed;
    return () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    };
})();

const statsCanvas = document.getElementById('stats') as HTMLCanvasElement;
const statsCtx = statsCanvas.getContext('2d') as CanvasRenderingContext2D;
const statsSize = [200, 70];
statsCanvas.width = statsSize[0];
statsCanvas.height = statsSize[1];

interface Stat {
    first: number;
    disease: number;
    immune: number;
}

const stats: Stat[] = [];

let graph: Graph = {
    vertices: [],
    edges: [],
};

const mapCenter = projectGeoToMap([82.920412, 55.030111]);

export interface Human {
    coords: number[];
    edge: number;
    forward: boolean;
    startTime: number;
    state: 'first' | 'disease' | 'immune';
    diseaseStart: number;
    stoped: boolean;
    homeTimeStart: number;
}

const humans: Human[] = [];

fetch('./dist/data.json')
    .then((r) => r.json())
    .then((data: Graph) => {
        console.log(data);
        graph = data;

        const roundFactor = 100;
        graph.vertices.forEach((v) => {
            v.coords[0] = v.coords[0] * roundFactor;
            v.coords[1] = v.coords[1] * roundFactor;
        });
        graph.edges.forEach((e) =>
            e.geometry.forEach((v) => {
                v[0] = v[0] * roundFactor;
                v[1] = v[1] * roundFactor;
            }),
        );

        const verticesInRange = graph.vertices.filter(
            (vertex) => vec2.dist(vertex.coords, mapCenter) < config.dataRange * 100,
        );

        if (!verticesInRange.length) {
            return;
        }

        for (let i = 0; i < config.humansCount; i++) {
            spawnHuman(
                verticesInRange,
                i < config.diseaseStartCount,
                i < config.humansCount * config.humansStop,
            );
        }
    });

function spawnHuman(vertices: GraphVertex[], disease: boolean, stoped: boolean) {
    const id = Math.floor(random() * vertices.length);
    const vertexFrom = vertices[id];

    const vertexEdgeIndex = Math.floor(random() * vertexFrom.edges.length);
    const edgeIndex = vertexFrom.edges[vertexEdgeIndex];
    const edge = graph.edges[edgeIndex];

    const forward = edge.a === vertexFrom.id;

    const now = Date.now();

    let homeTimeStart = now - config.waitAtHome * 1000 - random() * config.timeOutside * 1000;

    if (vertexFrom.type === 'house') {
        homeTimeStart = now - random() * config.waitAtHome * 1000;
    }

    const human: Human = {
        coords: vertexFrom.coords.slice(0),
        forward,
        edge: edgeIndex,
        startTime: now,
        state: disease ? 'disease' : 'first',
        diseaseStart: now,
        stoped,
        homeTimeStart,
    };

    humans.push(human);
}

function updateHuman(human: Human, now: number) {
    const distance = config.humanSpeed * (now - human.startTime);

    if (human.state === 'disease' && now - human.diseaseStart > config.immunityAfter * 1000) {
        human.state = 'immune';
    }

    if (human.stoped || now - human.homeTimeStart < config.waitAtHome * 1000) {
        return;
    }

    let passed = 0;
    let ended = true;

    const humanEdge = graph.edges[human.edge];
    const geometry = humanEdge.geometry;

    for (let i = 0; i < geometry.length - 1; i++) {
        const segment = human.forward
            ? [geometry[i], geometry[i + 1]]
            : [geometry[geometry.length - 1 - i], geometry[geometry.length - 1 - (i + 1)]];

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
        const endVertexIndex = human.forward ? humanEdge.b : humanEdge.a;
        const endVertex = graph.vertices[endVertexIndex];

        if (endVertex.type === 'house') {
            human.homeTimeStart = now;
            vec2.copy(human.coords, endVertex.coords);
        }

        const prevEdgeIndex = endVertex.edges.indexOf(human.edge);
        human.edge = chooseNextEdge(prevEdgeIndex, endVertex.edges, human, now);
        human.startTime = now;

        const newHumanEdge = graph.edges[human.edge];
        human.forward = newHumanEdge.a === endVertexIndex;
    }
}

function chooseNextEdge(prevEdgeIndex: number, edgeIndices: number[], human: Human, now: number) {
    let edgeIndex = Math.floor(random() * edgeIndices.length);

    // Если выбралась предыдущая грань, то попробуй выбрать другую
    if (edgeIndices.length > 1 && edgeIndex === prevEdgeIndex) {
        edgeIndex = (edgeIndex + 1) % edgeIndices.length;
    }

    // Если чел недавно был в доме, то попробуй выбрать другую грань
    if (
        edgeIndices.length > 1 &&
        now - (human.homeTimeStart + config.waitAtHome * 1000) < config.timeOutside * 1000 &&
        graph.edges[edgeIndices[edgeIndex]].type === 'house'
    ) {
        edgeIndex = (edgeIndex + 1) % edgeIndices.length;

        // Если выбралась предыдущая грань, то попробуй выбрать другую
        if (edgeIndices.length > 1 && edgeIndex === prevEdgeIndex) {
            edgeIndex = (edgeIndex + 1) % edgeIndices.length;
        }
    }

    return edgeIndices[edgeIndex];
}

function renderLoop() {
    requestAnimationFrame(renderLoop);
    const now = Date.now();

    findNearHumans(now);

    humans.forEach((h) => updateHuman(h, now));

    draw3d(graph, humans);

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
    const kd = new KDBush(
        humans.filter((h) => h.state === 'disease'),
        (h) => h.coords[0],
        (h) => h.coords[1],
        64,
        Int32Array,
    );

    humans.forEach((h) => {
        if (h.state !== 'first') {
            return;
        }

        const nearestHumans = kd
            .within(h.coords[0], h.coords[1], config.diseaseRange * 100)
            .map((index) => humans[index]);

        if (nearestHumans.length) {
            h.state = 'disease';
            h.diseaseStart = now;
        }
    });
}

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
        ctx.fillStyle = `rgba(${config.colors.first.join(',')}, 1)`;

        ctx.fillRect(x * width, 0, width, statsSize[1]);

        ctx.fillStyle = `rgba(${config.colors.immune.join(',')}, 1)`;
        ctx.fillRect(x * width, 0, width, (s.immune / count) * statsSize[1]);

        const diseaseH = (s.disease / count) * statsSize[1];
        ctx.fillStyle = `rgba(${config.colors.disease.join(',')}, 1)`;
        ctx.fillRect(x * width, statsSize[1] - diseaseH, width, diseaseH);
    }
}
