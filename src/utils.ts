export function clamp(value: number, min: number, max: number): number {
    value = Math.max(value, min);
    value = Math.min(value, max);
    return value;
}

export function lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
}

export function degToRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
}

const worldSize = 2 ** 32;

export function projectGeoToMap(geoPoint: number[]): number[] {
    const worldHalf = worldSize / 2;
    const sin = Math.sin(degToRad(geoPoint[1]));

    const x = (geoPoint[0] * worldSize) / 360;
    const y = (Math.log((1 + sin) / (1 - sin)) * worldSize) / (4 * Math.PI);

    return [clamp(x, -worldHalf, worldHalf), clamp(y, -worldHalf, worldHalf), 0];
}
