import { MapClass } from '@2gis/jakarta';
import * as dat from 'dat.gui';

import { SimulationStartOptions, SimulationIcons } from '../src/types';
import { Simulation } from '../src';
import { drawStats } from './stats';
import { coordinatesPrecision, throttle, parseQuery, getCircleIcon } from './utils';
import { drawGraph, clearGraph } from './graph';

const defaultMapOptions = {
    zoom: 12,
    rotation: 0,
    pitch: 0,
};

const mapOptions = { ...defaultMapOptions };

const defaultSimulationOptions: Omit<SimulationStartOptions, 'dataUrl'> = {
    randomSeed: 15,
    diseaseRange: 1,
    immunityAfter: 10,
    waitAtHome: 2,
    timeOutside: 5,
    humansCount: 4000,
    humansStop: 0,
    diseaseStartCount: 50,
    humanSpeed: 100,
    humanDeviation: 0.5,
};

const simulationOptions = { ...defaultSimulationOptions };

const citySettings = {
    novosibirsk: {
        center: [82.93024970970109, 55.01605852277987],
    },
    moscow: {
        center: [37.62237, 55.753491],
    },
    spb: {
        center: [30.30443, 59.943826],
    },
    kazan: {
        center: [49.141467, 55.779121],
    },
    chelyabinsk: {
        center: [61.400285, 55.163678],
    },
    ekaterinburg: {
        center: [60.602911, 56.845605],
    },
    omsk: {
        center: [73.362552, 54.971369],
    },
    krasnoyarsk: {
        center: [92.892688, 56.017456],
    },
    vladivostok: {
        center: [131.929993, 43.120879],
    },
    dubai: {
        center: [55.25674, 25.146185],
    },
};

const defaultSimulationFilterOptions = {
    radius: 500000,
};

const simulationFilterOptions = { ...defaultSimulationFilterOptions };

const defaultCityOptions = {
    city: 'novosibirsk' as keyof typeof citySettings,
};

const cityOptions = {
    ...defaultCityOptions,
};

const map = new MapClass(document.getElementById('map') as HTMLDivElement, {
    center: [82.93, 55.01],
    zoom: mapOptions.zoom,
    rotation: mapOptions.rotation,
    pitch: mapOptions.pitch,
});

window.addEventListener('resize', () => map.invalidateSize());
map.on('click', (ev) => console.log(ev.lngLat));

const iconSize: Array<[number, number]> = [
    [8, 4],
    [10, 6],
    [15, 8],
    [16, 10],
];

const icons: SimulationIcons = {
    virgin: {
        width: iconSize,
        height: iconSize,
        url: getCircleIcon('#979797', 3, '#ffffff', 2),
    },
    disease: {
        width: iconSize,
        height: iconSize,
        url: getCircleIcon('#FF3C3C', 3),
    },
    immune: {
        width: iconSize,
        height: iconSize,
        url: getCircleIcon('#05A82D', 3),
    },
};

const simulation = new Simulation(map, { icons });

function start() {
    simulation.start(
        {
            ...simulationOptions,
            dataUrl: `./assets/${cityOptions.city}.json`,
        },
        {
            ...simulationFilterOptions,
            center: citySettings[cityOptions.city].center,
        },
    );
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
        zoom,
        rotation: map.getRotation(),
        pitch: map.getPitch(),
    };

    const params: string[][] = [];

    params.push(['lng', center[0].toFixed(precision)], ['lat', center[1].toFixed(precision)]);

    [
        [cityOptions, defaultCityOptions],
        [mapOptions, defaultMapOptions],
        [simulationOptions, defaultSimulationOptions],
        [simulationFilterOptions, defaultSimulationFilterOptions],
    ].forEach((pair: any) => {
        const [currentOpts, defaultOpts] = pair;
        for (const key in currentOpts) {
            if (currentOpts[key] !== defaultOpts[key]) {
                if (typeof currentOpts[key] === 'number') {
                    params.push([key, round(currentOpts[key])]);
                } else if (typeof currentOpts[key] === 'string') {
                    params.push([key, currentOpts[key]]);
                }
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
        cityOptions.city = query.city as any;
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

const debugFolder = gui.addFolder('Debug');
debugFolder.add({ drawGraph: () => drawGraph(map, simulation) }, 'drawGraph');
debugFolder.add({ clearGraph }, 'clearGraph');

const dataFolder = gui.addFolder('Data');
dataFolder.add(simulationFilterOptions, 'radius').onChange(simulationUpdate);

const simFolder = gui.addFolder('Simulation');
simFolder.open();
simFolder.add(simulationOptions, 'randomSeed').onChange(simulationUpdate);
simFolder.add(simulationOptions, 'diseaseRange', 1, 500, 1).onChange(simulationUpdate);
simFolder.add(simulationOptions, 'immunityAfter', 1, 240, 1).onChange(simulationUpdate);
simFolder.add(simulationOptions, 'waitAtHome', 0, 100, 0.1).onChange(simulationUpdate);
simFolder.add(simulationOptions, 'timeOutside', 0, 100, 0.1).onChange(simulationUpdate);
simFolder.add(simulationOptions, 'humansCount', 0, 50000, 1).onChange(simulationUpdate);
simFolder.add(simulationOptions, 'diseaseStartCount', 0, 5000, 1).onChange(simulationUpdate);
simFolder.add(simulationOptions, 'humansStop', 0, 1, 0.01).onChange(simulationUpdate);
simFolder.add(simulationOptions, 'humanSpeed', 0, 500, 1).onChange(simulationUpdate);
simFolder.add(simulationOptions, 'humanDeviation', 0, 1, 0.1).onChange(simulationUpdate);

gui.add(cityOptions, 'city', Object.keys(citySettings)).onChange(() => {
    map.setCenter(citySettings[cityOptions.city].center);
    simulationUpdate();
});

const exportWrapper = document.getElementById('export') as HTMLDivElement;
const exportCloseButton = document.getElementById('export-close') as HTMLButtonElement;
const exportCopy = document.getElementById('export-copy') as HTMLDivElement;
const exportText = document.getElementById('export-text') as HTMLTextAreaElement;

function showHideExport() {
    exportWrapper.style.display = exportWrapper.style.display === 'flex' ? 'none' : 'flex';
    exportText.value = JSON.stringify(
        {
            ...simulationOptions,
            dataUrl: `./assets/${cityOptions.city}.json`,
        },
        null,
        2,
    );
}
exportCopy.onclick = () => {
    exportText.select();
    exportText.setSelectionRange(0, 99999);
    document.execCommand('copy');
};
exportCloseButton.onclick = showHideExport;
gui.add({ export: showHideExport }, 'export');

gui.add(
    {
        'pause / play': () => {
            if ((simulation as any).paused) {
                simulation.play();
            } else {
                simulation.pause();
            }
        },
    },
    'pause / play',
);
