import * as vec2 from '@2gis/gl-matrix/vec2';
import { projectGeoToMap, projectMapToGeo } from '../src/utils';
import { getCircleIcon } from './utils';
import { Simulation } from '../src';
import { Graph } from '../data/types';

const edges: mapgl.Polyline[] = [];
const vertices: mapgl.Marker[] = [];

const vertexColor = '#ff000077';
const isolatedVertexColor = '#0000ff55';

const edgeColor = '#77000055';
const isolatedEdgeColor = '#880000ff';

export function drawGraph(map: mapgl.Map, simulation: Simulation) {
    clearGraph();

    const graph: Graph = (simulation as any).graph;
    const center = projectGeoToMap(map.getCenter());

    const nearRadius = 300000;

    graph.vertices
        .filter((e) => vec2.dist(e.coords, center) < nearRadius)
        .forEach((e) => {
            const color = e.type === 'null' ? isolatedVertexColor : vertexColor;
            const marker = new mapgl.Marker(map, {
                coordinates: projectMapToGeo(e.coords),
                icon: getCircleIcon(color, 4),
            });
            marker.on('click', () => {
                console.log('vertex', e);
            });
            vertices.push(marker);
        });

    graph.edges
        .filter((e) => e.geometry.some((p) => vec2.dist(p, center) < nearRadius))
        .forEach((e) => {
            const color = e.type === 'null' ? isolatedEdgeColor : edgeColor;
            const polyline = new mapgl.Polyline(map, {
                coordinates: e.geometry.map(projectMapToGeo),
                color,
            });
            polyline.on('click', () => {
                console.log('edge', e);
            });
            edges.push(polyline);
        });
}

export function clearGraph() {
    edges.forEach((p) => p.destroy());
    edges.length = 0;
    vertices.forEach((m) => m.destroy());
    vertices.length = 0;
}
