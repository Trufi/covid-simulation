import { GraphEdge } from '../data/types';

export const enum HumanState {
    Virgin = 0,
    Disease = 1,
    Immune = 2,
}

export interface Human {
    coords: number[];
    edge: number;
    forward: boolean;
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
     * Весь рандом в симуляции детерминированные, это его первоначальное зерно
     */
    randomSeed: number;

    /**
     * Расстояние в метрах, через которое передается заражение
     */
    diseaseRange: number;

    /**
     * Время в секундах, через которое наступает имуннитет после заражения
     */
    immunityAfter: number;

    /**
     * Время в секундах, которое человек проводит в доме, после того как в него зайдет
     */
    waitAtHome: number;

    /**
     * Время в секундах, которое человек проводит на улице, после чего будет первым делом будет стараться заходить в дом
     */
    timeOutside: number;

    /**
     * Относительное отклонение параметров immunityAfter, waitAtHome, timeOutside.
     * Принимает значения от 0 до 1.
     * Итоговый параметр для каждого человека высчитывается по формуле:
     * parameter = parameter + (random() - 0.5) * humanDeviation * parameter
     */
    humanDeviation: number;

    /**
     * Общее количество людей
     */
    humansCount: number;

    /**
     * Количество людей, которое никогда не будет двигаться. Такие люди появляются сразу в домах.
     */
    humansStop: number;

    /**
     * Количество людей, которые заражены при старте
     */
    diseaseStartCount: number;

    /**
     * Скорость людей в папугаях
     */
    humanSpeed: number;

    /**
     * URL, с которого будут скачиваться данные для симуляции
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
