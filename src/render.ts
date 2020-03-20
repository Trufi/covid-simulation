import type { Map as JMap } from '@2gis/jakarta';
import * as mat4 from '@2gis/gl-matrix/mat4';
import * as vec2 from '@2gis/gl-matrix/vec2';
import ShaderProgram from '2gl/ShaderProgram';
import BufferChannel from '2gl/BufferChannel';
import Shader from '2gl/Shader';
import Buffer from '2gl/Buffer';
import Vao from '2gl/Vao';

const vertexShaderSource = `
`;

export class Render {
    private canvas: HTMLCanvasElement;
    private gl: WebGLRenderingContext;
    private ext: { OES_vertex_array_object: OES_vertex_array_object; };
    private matrix: Mat4;

    constructor(private map: JMap) {
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = '0';
        this.canvas.style.top = '0';
        this.canvas.style.pointerEvents = 'none';
        map.modules.container.appendChild(this.canvas);

        const gl = (this.gl = this.canvas.getContext('webgl', {
            antialias: true,
            premultipliedAlpha: false,
            alpha: true,
        }) as WebGLRenderingContext);


        this.ext = {
            OES_vertex_array_object: gl.getExtension(
                'OES_vertex_array_object',
            ) as OES_vertex_array_object,
        };

        window.addEventListener('resize', this.updateSize);
        this.updateSize();

        gl.clearColor(1, 1, 1, 0);
        gl.enable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ZERO);

        this.matrix = mat4.create();
    }

    private updateSize = () => {
        const size = this.map.getSize();

        this.canvas.width = size[0] * window.devicePixelRatio;
        this.canvas.height = size[1] * window.devicePixelRatio;
        this.canvas.style.width = size[0] + 'px';
        this.canvas.style.height = size[1] + 'px';

        this.gl.viewport(
            0,
            0,
            size[0] * window.devicePixelRatio,
            size[1] * window.devicePixelRatio,
        );
    };
}