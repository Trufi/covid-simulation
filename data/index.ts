import * as fs from 'fs-extra';
import * as path from 'path';
import { createGraph } from './graph';
import { projectGeoToMap } from '../src/utils';
import { getBuildings } from './buildings';

const sep = ';';

const csv = fs.readFileSync(path.join(__dirname, 'macro.csv'), 'utf8');
const rows = csv.split('\n');

const keys = rows[1].split(sep).slice(0, -1);

const data = rows
    .slice(2)
    .map((row) => row.split(sep).slice(0, -1))
    .filter((values) => values.length > 0)
    .map((row) =>
        row.reduce(
            (obj, value, i) => ((obj[keys[i]] = value), obj),
            {} as { [key: string]: string },
        ),
    );

console.log(data[0]);

const convertedData = data.map((edge) => ({
    id: edge.id,
    class: Number(edge.class),
    in: parseArray(edge.in_macro_ids),
    out: parseArray(edge.out_macro_ids),
    vertices: parserLineString(edge.geom).map((v) => projectGeoToMap(v).map(Math.floor)),
}));

console.log(convertedData[0]);

const buildings = getBuildings();

const graph = createGraph(convertedData, buildings, {
    center: [82.920412, 55.030111],
    range: 25000,
});

const roundFactor = 100;
graph.vertices.forEach((v, i) => {
    if (i === 0) {
        console.log(v.coords);
    }
    v.coords = [Math.round(v.coords[0] / roundFactor), Math.round(v.coords[1] / roundFactor)];
    if (i === 0) {
        console.log(v.coords);
    }
    // (v as any).id = undefined;
});
graph.edges.forEach(
    (e) =>
        (e.geometry = e.geometry.map((v) => [
            Math.round(v[0] / roundFactor),
            Math.round(v[1] / roundFactor),
        ])),
);

const outDir = path.join(__dirname, '../dist');
fs.mkdirpSync(outDir);
fs.writeJsonSync(path.join(outDir, '/data.json'), graph);

function parserLineString(s: string) {
    return s
        .slice('LINESTRING('.length, -1)
        .split(',')
        .map((t) =>
            t
                .split(' ')
                .map((x) => x.slice(0, 8))
                .map(Number),
        );
}

function parseArray(s: string) {
    return s
        .slice(1, -1)
        .trim()
        .split(' ');
}
