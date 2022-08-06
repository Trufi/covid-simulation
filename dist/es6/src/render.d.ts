import { Human, SimulationIcons } from './types';
export declare class Render {
    private map;
    private canvas;
    private renderContext;
    private pointBatch;
    private points;
    constructor(map: mapgl.Map, icons: SimulationIcons);
    setPoints(humans: Human[], min: number[], max: number[]): void;
    render(): void;
    private updateSize;
}
