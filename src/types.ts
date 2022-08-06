import { GraphEdge } from '../data/types';

export const enum HumanState {
    Virgin = 0,
    Disease = 1,
    Immune = 2,
}

export interface Human {
    coords: number[];

    forward: boolean;
    edge: number;

    /**
     * Индекс сегмента грани, с учетом направления,
     * т.е. если точка едет с конфа (forward === false), то индекса будет считаться с конца
     */
    segment: number;
    passed: number;

    startTime: number;
    state: HumanState;
    diseaseStart: number;
    stoped: boolean;
    homeTimeStart: number;

    immunityAfter: number;
    waitAtHome: number;
    timeOutside: number;
}

export type SimulationIconSize = number | Array<[number, number]>;

export interface SimulationIcons {
    virgin: {
        width: SimulationIconSize;
        height: SimulationIconSize;
        url: string;
    };
    disease: {
        width: SimulationIconSize;
        height: SimulationIconSize;
        url: string;
    };
    immune: {
        width: SimulationIconSize;
        height: SimulationIconSize;
        url: string;
    };
}

export interface SimulationOptions {
    icons: SimulationIcons;
}

export interface SimulationStartOptions {
    /**
     * Random is determined in the simulation. That's the first seed of it.
     */
    randomSeed: number;

    /**
     * The distance in meters of disease spreading between humans
     */
    diseaseRange: number;

    /**
     * The time in seconds when an immunity comes after the infection
     */
    immunityAfter: number;

    /**
     * The time in seconds that any human spend in his home after they has come there
     */
    waitAtHome: number;

    /**
     * The time in seconds that a human spends on the street, after which they will first try to enter a house.
     */
    timeOutside: number;

    /**
     * Relative deviation of parameters immunityAfter, waitAtHome, timeOutside.
     * Gets values from 0 to 1.
     * The final parameter for each human is calculated by the formula:
     *   parameter = parameter + (random() - 0.5) * humanDeviation * parameter
     */
    humanDeviation: number;

    /**
     * Total amount of humans
     */
    humansCount: number;

    /**
     * The number of humans who will never move, such people appear immediately in houses
     */
    humansStop: number;

    /**
     * The number of humans who are infected at the start
     */
    diseaseStartCount: number;

    /**
     * The speed of people in something-something
     */
    humanSpeed: number;

    /**
     * The URL from which the simulation data will be downloaded
     */
    dataUrl: string;
}

export interface SimulationFilterOptions {
    center: number[];
    radius: number;
}

export interface SimulationStat {
    time: number;
    virgin: number;
    disease: number;
    immune: number;
}

export interface RenderContext {
    gl: WebGLRenderingContext;
    extensions: { OES_vertex_array_object: OES_vertex_array_object };
}

export interface ClientGraphVertex {
    edges: number[];
    coords: number[];
    type: 'road' | 'house' | 'null';
    houseEdge: number; // -1 если нет
}

export interface ClientGraph {
    vertices: ClientGraphVertex[];
    edges: GraphEdge[];
    center: number[];
    min: number[];
    max: number[];
}
