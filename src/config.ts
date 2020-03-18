import * as dat from 'dat.gui';
import { parseQuery } from './utils';

export const config = {
    debugGraph: false,
    diseaseRange: 30,
    immunityAfter: 15,
    humansCount: 4000,
    diseaseStartCount: 50,
    humanSpeed: 100,
    dataRange: 2500,
    colors: {
        first: [170, 198, 202],
        disease: [187, 100, 29],
        immune: [203, 138, 192],
    },
};

const query = parseQuery();
for (const key in query) {
    if (key === 'debugGraph') {
        config.debugGraph = Boolean(Number(query[key]));
    } else {
        (config as any)[key] = Number(query[key]);
    }
}

const onChange = () =>
    setTimeout(() => {
        const params: string[][] = [];

        for (const key in config) {
            if (key === 'colors') {
                continue;
            }
            params.push([key, String(Math.floor(Number((config as any)[key])))]);
        }

        const url = params.reduce((string, param, index) => {
            return string + (index === 0 ? '?' : '&') + param[0] + '=' + param[1];
        }, '');

        history.replaceState({}, document.title, url);

        location.reload();
    }, 1000);

const gui = new dat.GUI();
gui.add(config, 'debugGraph').onChange(onChange);
gui.add(config, 'diseaseRange', 1, 500).onChange(onChange);
gui.add(config, 'immunityAfter', 1, 240).onChange(onChange);
gui.add(config, 'humansCount', 0, 25000).onChange(onChange);
gui.add(config, 'diseaseStartCount', 0, 5000).onChange(onChange);
gui.add(config, 'humanSpeed', 0, 500).onChange(onChange);
gui.add(config, 'dataRange', 1, 50000).onChange(onChange);
