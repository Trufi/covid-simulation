import { SimulationStat } from '../src';

const statsCanvas = document.getElementById('stats') as HTMLCanvasElement;
const statsCtx = statsCanvas.getContext('2d') as CanvasRenderingContext2D;
const statsSize = [600, 70];
statsCanvas.width = statsSize[0];
statsCanvas.height = statsSize[1];

const colors = {
    virgin: [170, 198, 202],
    disease: [255, 60, 60],
    immune: [0, 165, 40],
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
    const newColumnInMs = 100;

    let lastColumnTime = 0;
    const statsToView: SimulationStat[] = [];
    for (let i = 0; i < stats.length; i++) {
        const stat = stats[i];
        if (stat.time - lastColumnTime > newColumnInMs) {
            statsToView.push(stat);
            lastColumnTime = stat.time;
        }
    }

    const columnsCount = statsSize[0] / width;
    for (let x = 0; x < columnsCount; x++) {
        const s = statsToView[x];
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
