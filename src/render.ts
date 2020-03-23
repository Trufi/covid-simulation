import { Human, RenderContext, SimulationIcons } from './types';
import { PointBatch, PointBatchEntity } from './pointBatch';

interface RenderPoint {
    state: Human['state'];
    human: Human;
    point: PointBatchEntity;
}

export class Render {
    private canvas: HTMLCanvasElement;
    private renderContext: RenderContext;
    private pointBatch: PointBatch;
    private points: RenderPoint[];

    constructor(private map: import('@2gis/jakarta').Map, icons: SimulationIcons) {
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = '0';
        this.canvas.style.top = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.background = 'transparent';

        const mapCanvas = map.modules.layout.mapContainer.querySelector('canvas');
        const mapCanvasNextSibling = mapCanvas?.nextSibling;
        if (!mapCanvas) {
            throw new Error('Map canvas not found');
        }
        if (!mapCanvasNextSibling) {
            throw new Error('Map html markers container not found');
        }

        map.modules.layout.mapContainer.insertBefore(this.canvas, mapCanvasNextSibling);

        this.points = [];

        const gl = this.canvas.getContext('webgl', {
            antialias: true,
            alpha: true,
            // premultiplyAlpha: true,
        }) as WebGLRenderingContext;

        const extensions = {
            OES_vertex_array_object: gl.getExtension(
                'OES_vertex_array_object',
            ) as OES_vertex_array_object,
        };

        this.renderContext = {
            gl,
            extensions,
        };

        window.addEventListener('resize', this.updateSize);
        this.updateSize();

        gl.clearColor(0, 0, 0, 0);

        this.pointBatch = new PointBatch(this.renderContext, [
            icons.virgin,
            icons.disease,
            icons.immune,
        ]);
    }

    public setPoints(humans: Human[], min: number[], max: number[]) {
        this.points = [];

        this.points = humans.map((human) => ({
            state: human.state,
            human,
            point: {
                icon: human.state,
                position: [human.coords[0], human.coords[1]],
            },
        }));

        this.pointBatch.setPoints(
            this.points.map((p) => p.point),
            min,
            max,
        );
    }

    public render() {
        for (let i = 0; i < this.points.length; i++) {
            const { point, human } = this.points[i];
            point.position[0] = human.coords[0];
            point.position[1] = human.coords[1];
            point.icon = human.state;
        }

        const { gl } = this.renderContext;
        gl.clear(gl.COLOR_BUFFER_BIT);
        const cameraMatrix = this.map.modules.renderer.vpMatrix;
        this.pointBatch.render(cameraMatrix, this.map.getSize(), this.map.getZoom());
    }

    private updateSize = () => {
        const size = this.map.getSize();

        this.canvas.width = size[0] * window.devicePixelRatio;
        this.canvas.height = size[1] * window.devicePixelRatio;
        this.canvas.style.width = size[0] + 'px';
        this.canvas.style.height = size[1] + 'px';

        this.renderContext.gl.viewport(
            0,
            0,
            size[0] * window.devicePixelRatio,
            size[1] * window.devicePixelRatio,
        );
    };
}
