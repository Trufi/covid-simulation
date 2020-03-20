import * as fs from 'fs-extra';
import * as path from 'path';
import { createGraph } from './graph';
import { getBuildings } from './buildings';
import { getMacroEdges } from './macro';
import { Graph } from './types';

interface CityConfig {
    center: number[];
    range: number;
}

function convertCity(city: string) {
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

    console.log(`Successfully convert ${city} data`);
}

// const cities = fs.readdirSync(path.join(__dirname, 'cities'));
// cities.forEach(convertCity);
convertCity('dubai');

function packGraph(graph: Graph) {
    const roundFactor = 100;
    graph.vertices.forEach((v) => {
        v.coords = [Math.round(v.coords[0] / roundFactor), Math.round(v.coords[1] / roundFactor)];
        // (v as any).id = undefined;
    });
    graph.edges.forEach(
        (e) =>
            (e.geometry = e.geometry.map((v) => [
                Math.round(v[0] / roundFactor),
                Math.round(v[1] / roundFactor),
            ])),
    );
}
