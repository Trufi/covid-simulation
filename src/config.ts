import * as dat from 'dat.gui';
import { parseQuery } from './utils';

export const config: { [key: string]: any } = {
    lng: 82.920412,
    lat: 55.030111,
    zoom: 12,
    rotation: 0,
    pitch: 0,

    diseaseRange: 30,
    immunityAfter: 15,
    humansCount: 4000,
    humansStop: 0,
    diseaseStartCount: 50,
    humanSpeed: 100,
    dataRange: 25000,
    colors: {
        first: [170, 198, 202],
        disease: [187, 100, 29],
        immune: [203, 138, 192],
    },
};

const query = parseQuery();
for (const key in query) {
    if (typeof config[key] === 'boolean') {
        config[key] = Boolean(Number(query[key]));
    } else if (config[key] !== undefined) {
        config[key] = Number(query[key]);
    }
}

export function updateQuery() {
    const params: string[][] = [];

    for (const key in config) {
        if (key === 'colors') {
            continue;
        }
        params.push([key, String(Number((config as any)[key]))]);
    }

    const url = params.reduce((string, param, index) => {
        return string + (index === 0 ? '?' : '&') + param[0] + '=' + param[1];
    }, '');

    history.replaceState({}, document.title, url);
}

const onChange = () =>
    setTimeout(() => {
        updateQuery();
        location.reload();
    }, 1000);

export const gui = new dat.GUI();
gui.add(config, 'diseaseRange', 1, 500, 1).onChange(onChange);
gui.add(config, 'immunityAfter', 1, 240, 1).onChange(onChange);
gui.add(config, 'humansCount', 0, 25000, 1).onChange(onChange);
gui.add(config, 'diseaseStartCount', 0, 5000, 1).onChange(onChange);
gui.add(config, 'humansStop', 0, 1, 0.01).onChange(onChange);
gui.add(config, 'humanSpeed', 0, 500, 1).onChange(onChange);
gui.add(config, 'dataRange', 1, 50000, 1).onChange(onChange);
