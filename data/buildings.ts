import * as fs from 'fs-extra';
import * as path from 'path';
import { projectGeoToMap } from '../src/utils';

const regExp = /жилой дом/i;

export interface Building {
    point: number[];
    purpose: string;
}

export function getBuildings() {
    const csv = fs.readFileSync(path.join(__dirname, 'buildings.csv'), 'utf8');
    const rows = csv.split('\n');

    return rows
        .map((row) => {
            if (!row.trim().length) {
                return;
            }
            try {
                const array = JSON.parse(row);
                const obj: Building = {
                    point: wktPointToMap(array[0]),
                    purpose: array[1],
                };
                return obj;
            } catch (e) {
                console.log('json parse error', e, row);
            }
        })
        .filter((b) => b !== undefined && b.purpose.search(regExp) !== -1) as Building[];
}

function wktPointToMap(s: string) {
    const geoPoint = s
        .slice('POINT('.length, -1)
        .split(' ')
        .map(Number);
    return projectGeoToMap(geoPoint).map(Math.round);
}
