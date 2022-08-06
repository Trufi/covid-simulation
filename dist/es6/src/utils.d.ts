export declare function clamp(value: number, min: number, max: number): number;
export declare function lerp(a: number, b: number, t: number): number;
export declare function degToRad(degrees: number): number;
export declare function radToDeg(radians: number): number;
export declare function projectGeoToMap(geoPoint: number[]): number[];
export declare function projectMapToGeo(mapPoint: number[]): number[];
export declare function createRandomFunction(seed: number): () => number;
