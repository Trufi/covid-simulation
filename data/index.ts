import * as fs from 'fs-extra';
import * as path from 'path';
import { createGraph } from './graph';
import { getBuildings } from './buildings';
import { getMacroEdges } from './macro';
import { packGraph } from './pack';

interface CityConfig {
    center: number[];
    range: number;
}

function prettyMs(ms: number) {
    const minutes = Math.floor(ms / 1000 / 60);
    const seconds = Math.floor(ms / 1000 - minutes * 60);
    let s = '';
    if (minutes > 0) {
        s += `${minutes} min `;
    }
    if (seconds > 0) {
        s += `${seconds} sec`;
    }
    return s;
}

function convertCity(city: string) {
    const startTime = Date.now();
    console.log(`Start convert ${city} data`);

    const cityDir = path.join(__dirname, 'cities', city);

    const config: CityConfig = fs.readJSONSync(path.join(cityDir, 'config.json'));

    const edges = getMacroEdges(cityDir);
    const buildings = getBuildings(cityDir);

    const graph = createGraph(edges, buildings, {
        center: config.center,
        range: config.range,
    });

    packGraph(graph);

    const outDir = path.join(__dirname, '..', 'assets');
    fs.mkdirpSync(outDir);
    fs.writeJsonSync(path.join(outDir, `${city}.json`), graph);

    console.log(`Successfully convert ${city} data in ${prettyMs(Date.now() - startTime)}\n`);
}

const cities = fs.readdirSync(path.join(__dirname, 'cities'));
cities.forEach((city) => {
    if (city === 'dubai') {
        return;
    }
    convertCity(city);
});
// convertCity('dubai');
// convertCity('spb');
