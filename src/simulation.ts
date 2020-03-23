import * as vec2 from '@2gis/gl-matrix/vec2';
import KDBush from 'kdbush';

import { Render } from './render';
import { Graph } from '../data/types';
import { projectGeoToMap, createRandomFunction, clamp } from './utils';
import {
    Human,
    SimulationStartOptions,
    SimulationFilterOptions,
    SimulationStat,
    ClientGraph,
    ClientGraphVertex,
    SimulationOptions,
    HumanState,
} from './types';
import { unpackGraph } from '../data/pack';

export class Simulation {
    private options: SimulationStartOptions = {
        randomSeed: 15,
        diseaseRange: 1,
        immunityAfter: 15,
        waitAtHome: 2,
        timeOutside: 5,
        humansCount: 4000,
        humansStop: 0,
        diseaseStartCount: 50,
        humanSpeed: 100,
        dataUrl: '',
        humanDeviation: 0.5,
    };
    private render: Render;
    private graph?: ClientGraph;
    private random: () => number;
    private humans: Human[];
    private stats: SimulationStat[];
    private lastUpdate: number;
    private simulationTime: number;
    private lastSpreadTime: number;
    private paused: boolean;

    constructor(map: import('@2gis/jakarta').Map, options: SimulationOptions) {
        this.render = new Render(map, options.icons);
        this.random = createRandomFunction(this.options.randomSeed);
        this.humans = [];
        this.stats = [];
        this.lastUpdate = Date.now();
        this.simulationTime = 0;
        this.lastSpreadTime = 0;
        this.paused = false;
        requestAnimationFrame(this.update);
    }

    /**
     * Стартует симуляцию с заданными параметрами
     */
    public start(options: SimulationStartOptions, filterOptions?: SimulationFilterOptions) {
        this.options = options;
        this.stop();

        fetch(options.dataUrl)
            .then((r) => r.json())
            .then((graph: Graph) => {
                this.graph = prepareGraph(graph);

                const vertexInRangeIndices: number[] = [];
                if (filterOptions) {
                    const mapCenter = projectGeoToMap(filterOptions.center);
                    this.graph.vertices.forEach((vertex, i) => {
                        if (
                            vertex.type !== 'null' &&
                            vec2.dist(vertex.coords, mapCenter) < filterOptions.radius * 100
                        ) {
                            vertexInRangeIndices.push(i);
                        }
                    });
                } else {
                    this.graph.vertices.forEach((vertex, i) => {
                        if (vertex.type !== 'null') {
                            vertexInRangeIndices.push(i);
                        }
                    });
                }

                if (!vertexInRangeIndices.length) {
                    return;
                }

                const houseVertexIndices = vertexInRangeIndices.filter(
                    (index) => graph.vertices[index].type === 'house',
                );

                for (let i = 0; i < options.humansCount; i++) {
                    const stoped = i < options.humansCount * options.humansStop;
                    const human = createHuman(
                        this.graph,
                        this.random,
                        stoped && houseVertexIndices.length
                            ? houseVertexIndices
                            : vertexInRangeIndices,
                        options,
                        i < options.diseaseStartCount,
                        stoped,
                    );
                    this.humans.push(human);
                }

                this.render.setPoints(this.humans, graph.min, graph.max);
            });
    }

    /**
     * Полностью останавливают и удаляет симуляцию
     */
    public stop() {
        this.render.setPoints([], [0, 0], [0, 0]);
        this.random = createRandomFunction(this.options.randomSeed);
        this.humans = [];
        this.stats = [];
        this.graph = undefined;
        this.simulationTime = 0;
        this.lastSpreadTime = 0;
        this.paused = false;
    }

    /**
     * Ставит симуляцию на паузу, но не удаляет с карты ничего
     */
    public pause() {
        this.paused = true;
    }

    /**
     * Возобновляет симуляцию поставленную на паузу
     */
    public play() {
        this.paused = false;
        this.lastUpdate = Date.now();
    }

    public getStats() {
        return this.stats;
    }

    private update = () => {
        requestAnimationFrame(this.update);

        const graph = this.graph;

        if (graph && !this.paused) {
            const now = Date.now();
            let delta = Date.now() - this.lastUpdate;
            if (delta > 200) {
                delta = 16;
            }

            this.simulationTime += delta;

            this.humans.forEach((human) =>
                updateHuman(graph, this.random, this.options, human, this.simulationTime),
            );

            const spreadUpdateInterval = Math.max(delta, 100);
            if (this.simulationTime - this.lastSpreadTime > spreadUpdateInterval) {
                this.spreadDisease(this.simulationTime, spreadUpdateInterval);
                this.lastSpreadTime = this.simulationTime;
            }

            this.collectStat();

            this.lastUpdate = now;
        }

        // Рендерить все равно нужно, чтобы пустой граф очищался
        this.render.render();
    };

    private spreadDisease(now: number, dt: number) {
        const distance = this.options.humanSpeed * dt * 2;

        const humans = this.humans;
        const kd = new KDBush(
            humans.filter((h) => h.state === HumanState.Disease),
            (h) => h.coords[0],
            (h) => h.coords[1],
            64,
            Int32Array,
        );

        humans.forEach((h) => {
            if (h.state !== HumanState.Virgin) {
                return;
            }

            let radius = this.options.diseaseRange * 100 + distance;

            // Если чел дома, то радиус не учитывает возможное пройденное расстояние
            if (humanAtHome(h, now)) {
                radius = this.options.diseaseRange * 100;
            }

            const nearestHumanIndices = kd.within(h.coords[0], h.coords[1], radius);

            if (nearestHumanIndices.length) {
                h.state = HumanState.Disease;
                h.diseaseStart = this.simulationTime;
            }
        });
    }

    private collectStat() {
        const array = [0, 0, 0];
        this.humans.forEach((h) => array[h.state]++);
        this.stats.push({
            time: this.simulationTime,
            virgin: array[0],
            disease: array[1],
            immune: array[2],
        });
    }
}

function createHuman(
    graph: ClientGraph,
    random: () => number,
    vertexIndices: number[],
    options: SimulationStartOptions,
    disease: boolean,
    stoped: boolean,
) {
    const vertexFromIndex = vertexIndices[Math.floor(random() * vertexIndices.length)];
    const vertexFrom = graph.vertices[vertexFromIndex];

    const edgeIndex = vertexFrom.edges.length
        ? vertexFrom.edges[Math.floor(random() * vertexFrom.edges.length)]
        : vertexFrom.houseEdge;
    const edge = graph.edges[edgeIndex];

    const forward = edge.a === vertexFromIndex;

    const waitAtHome = addDeviation(random, options.waitAtHome, options.humanDeviation);
    const timeOutside = addDeviation(random, options.timeOutside, options.humanDeviation);

    let homeTimeStart = -waitAtHome * 1000 - random() * options.timeOutside * 1000;

    if (vertexFrom.type === 'house') {
        homeTimeStart = -random() * waitAtHome * 1000;
    }

    const human: Human = {
        coords: vertexFrom.coords.slice(0),
        forward,
        edge: edgeIndex,
        startTime: 0,
        state: disease ? HumanState.Disease : HumanState.Virgin,
        diseaseStart: 0,
        stoped,
        homeTimeStart,

        immunityAfter: addDeviation(random, options.immunityAfter, options.humanDeviation),
        waitAtHome,
        timeOutside,
    };

    return human;
}

function addDeviation(random: () => number, value: number, deviation: number) {
    return value + (random() - 0.5) * value * deviation;
}

function updateHuman(
    graph: ClientGraph,
    random: () => number,
    options: SimulationStartOptions,
    human: Human,
    now: number,
) {
    if (
        human.state === HumanState.Disease &&
        now - human.diseaseStart > human.immunityAfter * 1000
    ) {
        human.state = HumanState.Immune;
    }

    if (human.stoped || humanAtHome(human, now)) {
        return;
    }

    let passed = 0;
    let ended = true;

    const humanEdge = graph.edges[human.edge];
    const geometry = humanEdge.geometry;

    const segment = [
        [0, 0],
        [0, 0],
    ];

    const distance = options.humanSpeed * (now - human.startTime);

    for (let i = 0; i < geometry.length - 1; i++) {
        if (human.forward) {
            segment[0] = geometry[i];
            segment[1] = geometry[i + 1];
        } else {
            segment[0] = geometry[geometry.length - 1 - i];
            segment[1] = geometry[geometry.length - 1 - (i + 1)];
        }

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

        human.edge = chooseNextEdge(random, human, now, human.edge, endVertex);
        human.startTime = now;

        const newHumanEdge = graph.edges[human.edge];
        human.forward = newHumanEdge.a === endVertexIndex;
    }
}

function humanAtHome(human: Human, now: number) {
    return human.stoped || now - human.homeTimeStart < human.waitAtHome * 1000;
}

function chooseNextEdge(
    random: () => number,
    human: Human,
    now: number,
    prevEdgeId: number,
    vertex: ClientGraphVertex,
) {
    /**
     * Выбираем всегда дом, если:
     * 1. Кроме дома больше ничего нет
     * 2. Время прибывания на улице истекло
     */
    if (
        vertex.edges.length === 0 ||
        (vertex.houseEdge !== -1 &&
            now - (human.homeTimeStart + human.waitAtHome * 1000) > human.timeOutside * 1000)
    ) {
        return vertex.houseEdge;
    }

    const edgeIndices = vertex.edges;
    let edgeIndex = Math.floor(random() * edgeIndices.length);

    // Если выбралась предыдущая грань, то попробуй выбрать другую
    if (edgeIndices.length > 1 && edgeIndices[edgeIndex] === prevEdgeId) {
        edgeIndex = (edgeIndex + 1) % edgeIndices.length;
    }

    return edgeIndices[edgeIndex];
}

function prepareGraph(graph: Graph): ClientGraph {
    // Распаковываем граф пришедший с сервера
    unpackGraph(graph);

    /**
     * А также вынимаем из вершин грани примыкающие к домам и ставим в их отдельное поле houseEdge,
     * чтобы потом можно было легко его найти и не делать find по всем граням вершины.
     */
    graph.vertices.forEach((v) => {
        const houseEdgeVertexIndex = v.edges.findIndex((i) => graph.edges[i].type === 'house');
        if (houseEdgeVertexIndex !== -1) {
            (v as any).houseEdge = v.edges[houseEdgeVertexIndex];
            v.edges.splice(houseEdgeVertexIndex, 1);
        } else {
            (v as any).houseEdge = -1;
        }
    });

    return graph as any;
}
