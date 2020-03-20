export interface Human {
    coords: number[];
    edge: number;
    forward: boolean;
    startTime: number;
    state: 'virgin' | 'disease' | 'immune';
    diseaseStart: number;
    stoped: boolean;
    homeTimeStart: number;
}

export interface SimulationOptions {
    randomSeed: number;
    diseaseRange: number;
    immunityAfter: number;
    waitAtHome: number;
    timeOutside: number;
    humansCount: number;
    humansStop: number;
    diseaseStartCount: number;
    humanSpeed: number;
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
