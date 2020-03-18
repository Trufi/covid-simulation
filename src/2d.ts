import * as vec2 from '@2gis/gl-matrix/vec2';
import { Graph, GraphVertex, GraphEdge } from '../data/graph';
import { Human } from '.';
import { projectGeoToMap } from './utils';
import { config } from './config';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const size = Math.min(window.innerWidth, window.innerHeight);
canvas.width = size;
canvas.height = size;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

const bounds = { min: [0, 0], max: [0, 0] };
const mapCenter = projectGeoToMap([82.920412, 55.030111]);
const range = 1500000;
vec2.sub(bounds.min, mapCenter, [range, range]);
vec2.add(bounds.max, mapCenter, [range, range]);

export function draw2d(graph: Graph, humans: Human[]) {
    ctx.clearRect(0, 0, size, size);
    drawGraph(graph);
    drawHumans(humans);
}

function drawHumans(humans: Human[]) {
    humans.forEach((h) => drawHuman(h));
}

function drawHuman(human: Human) {
    const size = 10;
    const point = drawProject(human.coords);

    ctx.fillStyle = `rgba(${config.colors[human.state].join(',')}, 0.8)`;
    ctx.fillRect(point[0] - size / 2, point[1] - size / 2, size, size);
}

function drawGraph(graph: Graph) {
    graph.edges.forEach(drawEdge);

    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
    graph.vertices.forEach(drawVertex);
}

function drawVertex(vertex: GraphVertex) {
    const size = 4;
    const point = drawProject(vertex.coords);
    ctx.fillRect(point[0] - size / 2, point[1] - size / 2, size, size);
}

function drawEdge(edge: GraphEdge) {
    const points = edge.geometry;

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();

    const firstPoint = drawProject(points[0]);
    ctx.moveTo(firstPoint[0], firstPoint[1]);
    for (let i = 1; i < points.length; i++) {
        const point = drawProject(points[i]);
        ctx.lineTo(point[0], point[1]);
    }
    ctx.stroke();

    ctx.closePath();
}

function drawProject(p: number[]) {
    const { min, max } = bounds;
    return [
        ((p[0] - min[0]) / (max[0] - min[0])) * size,
        ((p[1] - min[1]) / (max[1] - min[1])) * size,
    ];
}
