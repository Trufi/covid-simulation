import * as _mapgl from '@2gis/jakarta/dist/es6/sdk';

declare global {
    const mapgl: typeof _mapgl;
}

export as namespace mapgl;
export = _mapgl;
