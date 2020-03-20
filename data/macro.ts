import * as fs from 'fs-extra';
import * as path from 'path';
import { projectGeoToMap } from '../src/utils';

export function getMacroEdges(dir: string) {
    const sep = ';';

    const csv = fs.readFileSync(path.join(dir, 'macro.csv'), 'utf8');
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

    return data.map((edge) => ({
        id: edge.id,
        class: Number(edge.class),
        in: parseArray(edge.in_macro_ids),
        out: parseArray(edge.out_macro_ids),
        vertices: parserLineString(edge.geom).map((v) => projectGeoToMap(v).map(Math.floor)),
    }));
}

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
