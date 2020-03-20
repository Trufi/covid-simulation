import * as fs from 'fs-extra';
import * as path from 'path';
import { projectGeoToMap } from '../src/utils';

/**
 * Селект для выборки домов в dgdat:
 * select substr(substr(json_extract(json, '$.geometry.centroid'), -1, -30), 7) from gui_full where type = 'building' and json_extract(json, '$.purpose_name') like '%илой дом%'
 */

export interface Building {
    point: number[];
    // purpose: string;
}

export function getBuildings(dir: string) {
    const csv = fs.readFileSync(path.join(dir, 'buildings.csv'), 'utf8');
    const rows = csv.split('\n');

    return rows
        .map((row) => {
            if (!row.trim().length) {
                return;
            }
            try {
                const obj: Building = {
                    point: stringToMap(row),
                    // purpose: array[1],
                };
                return obj;
            } catch (e) {
                console.log('json parse error', e, row);
            }
        })
        .filter((b) => b !== undefined) as Building[];
}

function stringToMap(s: string) {
    const geoPoint = s
        .trim()
        .split(' ')
        .map(Number);
    return projectGeoToMap(geoPoint).map(Math.round);
}
