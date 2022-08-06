import { SimulationStartOptions, SimulationFilterOptions, SimulationStat, SimulationOptions } from './types';
export declare class Simulation {
    private options;
    private render;
    private graph?;
    private random;
    private humans;
    private stats;
    private simulationTime;
    private lastSpreadTime;
    private paused;
    private speed;
    constructor(map: mapgl.Map, options: SimulationOptions);
    /**
     * Стартует симуляцию с заданными параметрами
     */
    start(options: SimulationStartOptions, filterOptions?: SimulationFilterOptions): void;
    /**
     * Полностью останавливают и удаляет симуляцию
     */
    stop(): void;
    /**
     * Ставит симуляцию на паузу, но не удаляет с карты ничего
     */
    pause(): void;
    /**
     * Возобновляет симуляцию поставленную на паузу
     */
    play(): void;
    setSpeed(s: number): void;
    getStats(): SimulationStat[];
    private update;
    private spreadDisease;
    private collectStat;
}
