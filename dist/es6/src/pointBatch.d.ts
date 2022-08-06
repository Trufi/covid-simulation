/// <reference types="@2gis/gl-matrix" />
import { RenderContext } from './types';
export declare type PointIconSize = number | Array<[number, number]>;
export interface PointIcon {
    width: PointIconSize;
    height: PointIconSize;
    url: string;
}
export interface PointBatchEntity {
    position: number[];
    icon: number;
}
export declare class PointBatch {
    private renderContext;
    private matrix;
    private program;
    private vao?;
    private data?;
    private positionBuffer?;
    private uvBuffer?;
    private offsetBuffer?;
    private atlas;
    private texture?;
    private points;
    private min;
    private max;
    private vertexCount;
    constructor(renderContext: RenderContext, icons: PointIcon[]);
    setPoints(points: PointBatchEntity[], min: number[], max: number[]): void;
    render(cameraMatrix: Mat4, mapSize: number[], mapZoom: number): void;
    private updatePoints;
    private clear;
}
