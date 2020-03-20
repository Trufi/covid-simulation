import { SimulationStat } from '../src';

const statsCanvas = document.getElementById('stats') as HTMLCanvasElement;
const statsCtx = statsCanvas.getContext('2d') as CanvasRenderingContext2D;
const statsSize = [200, 70];
statsCanvas.width = statsSize[0];
statsCanvas.height = statsSize[1];

const colors = {
    virgin: [170, 198, 202],
    disease: [187, 100, 29],
    immune: [203, 138, 192],
};

export function drawStats(stats: SimulationStat[]) {
    const ctx = statsCtx;
    ctx.clearRect(0, 0, statsSize[0], statsSize[1]);

    if (!stats.length) {
        return;
    }
    const firstStat = stats[0];
    const count = firstStat.disease + firstStat.virgin + firstStat.immune;

    const width = 1;

    const columnsCount = statsSize[0] / width;
    for (let x = 0; x < columnsCount; x++) {
        let index = x;
        if (stats.length > columnsCount) {
            index = Math.floor((x / columnsCount) * stats.length);
        }

        const s = stats[index];
        if (!s) {
            return;
        }
        ctx.fillStyle = `rgba(${colors.virgin.join(',')}, 1)`;

        ctx.fillRect(x * width, 0, width, statsSize[1]);

        ctx.fillStyle = `rgba(${colors.immune.join(',')}, 1)`;
        ctx.fillRect(x * width, 0, width, (s.immune / count) * statsSize[1]);

        const diseaseH = (s.disease / count) * statsSize[1];
        ctx.fillStyle = `rgba(${colors.disease.join(',')}, 1)`;
        ctx.fillRect(x * width, statsSize[1] - diseaseH, width, diseaseH);
    }
}
