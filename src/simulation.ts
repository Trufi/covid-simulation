import { Map as JMap } from '@2gis/jakarta';
import KDBush from 'kdbush';
import * as vec2 from '@2gis/gl-matrix/vec2';

import { EasyRender } from './easyRender';
import { Graph, GraphVertex } from '../data/graph';
import { projectGeoToMap, createRandomFunction, clamp } from './utils';
import { Human, SimulationOptions, SimulationFilterOptions, SimulationStat } from './types';

export class Simulation {
    private options: SimulationOptions = {
        randomSeed: 15,
        diseaseRange: 30,
        immunityAfter: 15,
        waitAtHome: 2,
        timeOutside: 5,
        humansCount: 4000,
        humansStop: 0,
        diseaseStartCount: 50,
        humanSpeed: 100,
        dataUrl: '',
    };
    private render: EasyRender;
    private graph?: Graph;
    private random: () => number;
    private humans: Human[];
    private startTime: number;
    private stats: SimulationStat[];

    constructor(map: JMap) {
        this.render = new EasyRender(map);
        this.random = createRandomFunction(this.options.randomSeed);
        this.humans = [];
        this.startTime = 0;
        this.stats = [];
        requestAnimationFrame(this.update);
    }

    public start(options: SimulationOptions, filterOptions?: SimulationFilterOptions) {
        this.options = options;
        this.stop();

        fetch(options.dataUrl)
            .then((r) => r.json())
            .then((graph: Graph) => {
                unpackGraph(graph);
                this.graph = graph;

                let verticesInRange = graph.vertices;

                if (filterOptions) {
                    const mapCenter = projectGeoToMap(filterOptions.center);
                    verticesInRange = graph.vertices.filter(
                        (vertex) =>
                            vec2.dist(vertex.coords, mapCenter) < filterOptions.radius * 100,
                    );
                }

                if (!verticesInRange.length) {
                    return;
                }

                for (let i = 0; i < options.humansCount; i++) {
                    const human = createHuman(
                        this.graph,
                        this.random,
                        verticesInRange,
                        options,
                        i < options.diseaseStartCount,
                        i < options.humansCount * options.humansStop,
                    );
                    this.humans.push(human);
                }

                this.render.setPoints(this.humans);
            });
    }

    public stop() {
        this.render.setPoints([]);
        this.random = createRandomFunction(this.options.randomSeed);
        this.humans = [];
        this.startTime = Date.now();
        this.stats = [];
        this.graph = undefined;
    }

    public getStats() {
        return this.stats;
    }

    private update = () => {
        requestAnimationFrame(this.update);

        const graph = this.graph;

        if (!graph) {
            return;
        }

        const now = Date.now();
        this.humans.forEach((human) => updateHuman(graph, this.random, this.options, human, now));
        this.spreadDisease(now);
        this.collectStat(now);

        this.render.render();
    };

    private spreadDisease(now: number) {
        const humans = this.humans;
        const kd = new KDBush(
            humans.filter((h) => h.state === 'disease'),
            (h) => h.coords[0],
            (h) => h.coords[1],
            64,
            Int32Array,
        );

        humans.forEach((h) => {
            if (h.state !== 'virgin') {
                return;
            }

            const nearestHumans = kd
                .within(h.coords[0], h.coords[1], this.options.diseaseRange * 100)
                .map((index) => humans[index]);

            if (nearestHumans.length) {
                h.state = 'disease';
                h.diseaseStart = now;
            }
        });
    }

    private collectStat(now: number) {
        const stat: SimulationStat = {
            time: now - this.startTime,
            virgin: 0,
            disease: 0,
            immune: 0,
        };
        this.humans.forEach((h) => stat[h.state]++);
        this.stats.push(stat);
    }
}

function unpackGraph(graph: Graph) {
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
}

function createHuman(
    graph: Graph,
    random: () => number,
    vertices: GraphVertex[],
    options: SimulationOptions,
    disease: boolean,
    stoped: boolean,
) {
    const id = Math.floor(random() * vertices.length);
    const vertexFrom = vertices[id];

    const vertexEdgeIndex = Math.floor(random() * vertexFrom.edges.length);
    const edgeIndex = vertexFrom.edges[vertexEdgeIndex];
    const edge = graph.edges[edgeIndex];

    const forward = edge.a === vertexFrom.id;

    const now = Date.now();

    let homeTimeStart = now - options.waitAtHome * 1000 - random() * options.timeOutside * 1000;

    if (vertexFrom.type === 'house') {
        homeTimeStart = now - random() * options.waitAtHome * 1000;
    }

    const human: Human = {
        coords: vertexFrom.coords.slice(0),
        forward,
        edge: edgeIndex,
        startTime: now,
        state: disease ? 'disease' : 'virgin',
        diseaseStart: now,
        stoped,
        homeTimeStart,
    };

    return human;
}

function updateHuman(
    graph: Graph,
    random: () => number,
    options: SimulationOptions,
    human: Human,
    now: number,
) {
    const distance = options.humanSpeed * (now - human.startTime);

    if (human.state === 'disease' && now - human.diseaseStart > options.immunityAfter * 1000) {
        human.state = 'immune';
    }

    if (human.stoped || now - human.homeTimeStart < options.waitAtHome * 1000) {
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
        human.edge = chooseNextEdge(
            graph,
            random,
            options,
            human,
            now,
            prevEdgeIndex,
            endVertex.edges,
        );
        human.startTime = now;

        const newHumanEdge = graph.edges[human.edge];
        human.forward = newHumanEdge.a === endVertexIndex;
    }
}

function chooseNextEdge(
    graph: Graph,
    random: () => number,
    options: SimulationOptions,
    human: Human,
    now: number,
    prevEdgeIndex: number,
    edgeIndices: number[],
) {
    let edgeIndex = Math.floor(random() * edgeIndices.length);

    // Если выбралась предыдущая грань, то попробуй выбрать другую
    if (edgeIndices.length > 1 && edgeIndex === prevEdgeIndex) {
        edgeIndex = (edgeIndex + 1) % edgeIndices.length;
    }

    // Если чел недавно был в доме, то попробуй выбрать другую грань
    if (
        edgeIndices.length > 1 &&
        now - (human.homeTimeStart + options.waitAtHome * 1000) < options.timeOutside * 1000 &&
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
