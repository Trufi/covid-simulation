import { MapClass } from '@2gis/jakarta';
import * as dat from 'dat.gui';

import { SimulationOptions } from '../src/types';
import { Simulation } from '../src';
import { drawStats } from './stats';
import { coordinatesPrecision, throttle, parseQuery } from './utils';

const defaultMapOptions = {
    lng: 82.920412,
    lat: 55.030111,
    zoom: 12,
    rotation: 0,
    pitch: 0,
};

const mapOptions = { ...defaultMapOptions };

const defaultSimulationOptions: Omit<SimulationOptions, 'dataUrl'> = {
    randomSeed: 15,
    diseaseRange: 30,
    immunityAfter: 15,
    waitAtHome: 2,
    timeOutside: 5,
    humansCount: 4000,
    humansStop: 0,
    diseaseStartCount: 50,
    humanSpeed: 100,
};

const simulationOptions = { ...defaultSimulationOptions };

const dataUrlByCity = {
    nsk: './assets/nsk.json',
};

const defaultCityOptions = {
    city: 'nsk' as keyof typeof dataUrlByCity,
};

const cityOptions = {
    ...defaultCityOptions,
};

const map = new MapClass(document.getElementById('map') as HTMLDivElement, {
    center: [mapOptions.lng, mapOptions.lat],
    zoom: mapOptions.zoom,
    rotation: mapOptions.rotation,
    pitch: mapOptions.pitch,
});

const simulation = new Simulation(map);

function start() {
    simulation.start({
        ...simulationOptions,
        dataUrl: dataUrlByCity[cityOptions.city],
    });
}

function loop() {
    requestAnimationFrame(loop);
    drawStats(simulation.getStats());
}
requestAnimationFrame(loop);

const round = (x: number) => String(Math.round(x * 100) / 100);

const updateUrl = throttle(() => {
    const center = map.getCenter();
    const zoom = map.getZoom();
    const precision = coordinatesPrecision(zoom);
    const mapOptions: typeof defaultMapOptions = {
        lng: Number(center[0].toFixed(precision)),
        lat: Number(center[1].toFixed(precision)),
        zoom,
        rotation: map.getRotation(),
        pitch: map.getPitch(),
    };

    const params: string[][] = [];

    [
        [mapOptions, defaultMapOptions],
        [simulationOptions, defaultSimulationOptions],
        [cityOptions, defaultCityOptions],
    ].forEach((pair: any) => {
        const [currentOpts, defaultOpts] = pair;
        for (const key in currentOpts) {
            if (currentOpts[key] !== defaultOpts[key]) {
                params.push([key, round(currentOpts[key])]);
            }
        }
    });

    const url = params.reduce((string, param, index) => {
        return string + (index === 0 ? '?' : '&') + param[0] + '=' + param[1];
    }, '');

    history.replaceState({}, document.title, url);
}, 500);

function restoreFromUrl() {
    const query = parseQuery();

    if (query.lng && query.lat) {
        map.setCenter([Number(query.lng), Number(query.lat)], { animate: false });
    }
    if (query.zoom) {
        map.setZoom(Number(query.zoom), { animate: false });
    }
    if (query.rotation) {
        map.setRotation(Number(query.rotation), { animate: false });
    }
    if (query.pitch) {
        map.setPitch(Number(query.pitch), { animate: false });
    }

    [simulationOptions].forEach((options) => {
        for (const key in options) {
            if (query[key] !== undefined && !Number.isNaN(Number(query[key]))) {
                (simulationOptions as any)[key] = Number(query[key]);
            }
        }
    });

    if (query.city) {
        cityOptions.city = (dataUrlByCity as any)[query.city];
    }

    start();
}
restoreFromUrl();
map.on('moveend', updateUrl);

const gui = new dat.GUI();

const simulationUpdate = throttle(() => {
    updateUrl();
    start();
}, 500);

// const formFolder = gui.addFolder('Form');
gui.add(simulationOptions, 'randomSeed').onChange(simulationUpdate);
gui.add(simulationOptions, 'diseaseRange', 1, 500, 1).onChange(simulationUpdate);
gui.add(simulationOptions, 'immunityAfter', 1, 240, 1).onChange(simulationUpdate);
gui.add(simulationOptions, 'waitAtHome', 0, 100, 0.1).onChange(simulationUpdate);
gui.add(simulationOptions, 'timeOutside', 0, 100, 0.1).onChange(simulationUpdate);
gui.add(simulationOptions, 'humansCount', 0, 25000, 1).onChange(simulationUpdate);
gui.add(simulationOptions, 'diseaseStartCount', 0, 5000, 1).onChange(simulationUpdate);
gui.add(simulationOptions, 'humansStop', 0, 1, 0.01).onChange(simulationUpdate);
gui.add(simulationOptions, 'humanSpeed', 0, 500, 1).onChange(simulationUpdate);
// gui.add(config, 'dataRange', 1, 50000, 1).onChange(update);
