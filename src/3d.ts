import { Polyline } from '@2gis/jakarta';
import * as vec2 from '@2gis/gl-matrix/vec2';
import { config, gui, updateQuery } from './config';
import { Graph } from '../data/graph';
import { Human } from '.';
import { projectMapToGeo, projectGeoToMap } from './utils';

function getCircleIcon(color: string, radius: number): string {
    const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="${radius * 2}" height="${radius *
        2}" viewBox="0 0 ${radius * 2} ${radius *
        2}"><circle fill="${color}" cx="${radius}" cy="${radius}" r="${radius}"/></svg>`;
    return `data:image/svg+xml;base64,${btoa(icon)}`;
}

let markersInited = false;
const markers: Array<{ marker: mapgl.Marker; state: Human['state'] }> = [];
const edges: Polyline[] = [];
const vertices: mapgl.Marker[] = [];

const alpha = 0.8;
const icons: { [key in Human['state']]: string } = {
    first: getCircleIcon(`rgba(${config.colors.first.join(',')}, ${alpha})`, 5),
    disease: getCircleIcon(`rgba(${config.colors.disease.join(',')}, ${alpha})`, 5),
    immune: getCircleIcon(`rgba(${config.colors.immune.join(',')}, ${alpha})`, 5),
};

const map: mapgl.Map = new mapgl.Map('map', {
    center: [config.lng, config.lat],
    zoom: config.zoom,
    rotation: config.rotation,
    pitch: config.pitch,
    key: '042b5b75-f847-4f2a-b695-b5f58adc9dfd',
    zoomControl: false,
});

let graph: Graph;

const round = (x: number) => String(Math.round(x * 100) / 100);

export function draw3d(g: Graph, humans: Human[]) {
    if (!markersInited && humans.length) {
        graph = g;

        map.on('moveend', () => {
            const center = map.getCenter();
            const zoom = map.getZoom();
            const precision = coordinatesPrecision(zoom);

            config.lng = center[0].toFixed(precision);
            config.lat = center[1].toFixed(precision);
            config.zoom = round(zoom);
            config.rotation = round(map.getRotation());
            config.pitch = round(map.getPitch());

            updateQuery();
        });

        humans.forEach((h) => {
            markers.push({
                marker: new mapgl.Marker(map, {
                    coordinates: projectMapToGeo(h.coords),
                    icon: icons[h.state],
                }),
                state: h.state,
            });
        });

        markersInited = true;
    }

    markers.forEach((m, i) => {
        const human = humans[i];
        m.marker.setCoordinates(projectMapToGeo(human.coords));

        if (m.state !== human.state) {
            m.marker.destroy();
            m.marker = new mapgl.Marker(map, {
                coordinates: projectMapToGeo(human.coords),
                icon: icons[human.state],
            });
            m.state = human.state;
        }
    });
}

gui.add(
    {
        drawEdges: () => {
            if (!graph) {
                return;
            }

            edges.forEach((p) => p.remove());
            edges.length = 0;
            vertices.forEach((m) => m.destroy());
            vertices.length = 0;

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
                    const polyline = new Polyline(map._impl, {
                        coordinates: e.geometry.map(projectMapToGeo),
                        color: '#77000000',
                    });
                    polyline.on('click', () => {
                        console.log('edge', e);
                    });
                    edges.push(polyline);
                });
        },
    },
    'drawEdges',
);

function coordinatesPrecision(zoom: number): number {
    return Math.ceil((zoom * Math.LN2 + Math.log(256 / 360 / 0.5)) / Math.LN10);
}
