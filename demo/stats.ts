import { SimulationStat } from '../src';

const canvas = document.getElementById('stats') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

const size = [300, 60];

canvas.width = size[0] * window.devicePixelRatio;
canvas.height = size[1] * window.devicePixelRatio;
canvas.style.width = size[0] + 'px';
canvas.style.height = size[1] + 'px';

const colors = {
    virgin: [246, 246, 246],
    disease: [255, 60, 60],
    immune: [0, 165, 40],
};

export interface StatsOptions {
    data: SimulationStat[];

    /**
     * Время прошедщее с запуска симуляции
     */
    time: number;

    /**
     * Общее время, которое будет длиться симуляция
     */
    totalDuration: number;
}

export function drawStats({ data, time, totalDuration }: StatsOptions) {
    const pixelSize = [size[0] * window.devicePixelRatio, size[1] * window.devicePixelRatio];

    ctx.fillStyle = `rgba(${colors.virgin.join(',')}, 1)`;
    ctx.fillRect(0, 0, pixelSize[0], pixelSize[1]);

    if (!data.length) {
        return;
    }

    const timeByPixel = totalDuration / pixelSize[0];

    const diseaseHeights: number[] = [];
    const immuneHeights: number[] = [];

    const fillWidth = (time / totalDuration) * pixelSize[0];

    for (let x = 0; x < fillWidth; x++) {
        const pixelTime = x * timeByPixel;
        const statIndex = Math.floor((pixelTime / time) * data.length);

        const stat = data[statIndex];
        if (!stat) {
            continue;
        }
        const count = stat.disease + stat.virgin + stat.immune;
        diseaseHeights[x] = (stat.disease / count) * pixelSize[1];
        immuneHeights[x] = (stat.immune / count) * pixelSize[1];
    }

    ctx.beginPath();
    ctx.moveTo(0, pixelSize[1]);
    diseaseHeights.forEach((y, x) => ctx.lineTo(x, pixelSize[1] - y));
    ctx.lineTo(diseaseHeights.length - 1, pixelSize[1]);
    ctx.fillStyle = `rgba(${colors.disease.join(',')}, 1)`;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    immuneHeights.forEach((y, x) => ctx.lineTo(x, y));
    ctx.fillStyle = `rgba(${colors.immune.join(',')}, 1)`;
    ctx.lineTo(immuneHeights.length - 1, 0);
    ctx.fill();
}
