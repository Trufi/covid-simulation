import { MapClass, Polyline, Marker } from '@2gis/jakarta';
import * as vec2 from '@2gis/gl-matrix/vec2';
import { Graph } from '../data/graph';
import { projectGeoToMap, projectMapToGeo } from '../src/utils';
import { getCircleIcon } from './utils';

const edges: Polyline[] = [];
const vertices: Marker[] = [];

export function drawGraph(map: MapClass, graph: Graph) {
    clearGraph();

    const center = projectGeoToMap(map.getCenter());

    const nearRadius = 300000;

    graph.vertices
        .filter((e) => vec2.dist(e.coords, center) < nearRadius)
        .forEach((e) => {
            const marker = new mapgl.Marker(map, {
                coordinates: projectMapToGeo(e.coords),
                icon: getCircleIcon('#ff000077', 5),
            });
            marker.on('click', () => {
                console.log('vertex', e);
            });
            vertices.push(marker);
        });

    graph.edges
        .filter((e) => e.geometry.some((p) => vec2.dist(p, center) < nearRadius))
        .forEach((e) => {
            const polyline = new Polyline(map, {
                coordinates: e.geometry.map(projectMapToGeo),
                color: '#77000000',
            });
            polyline.on('click', () => {
                console.log('edge', e);
            });
            edges.push(polyline);
        });
}

export function clearGraph() {
    edges.forEach((p) => p.remove());
    edges.length = 0;
    vertices.forEach((m) => m.destroy());
    vertices.length = 0;
}
