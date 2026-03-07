declare module "leaflet.heat" {
  import * as L from "leaflet"
  interface HeatLayerOptions {
    radius?: number
    blur?: number
    maxZoom?: number
    max?: number
    minOpacity?: number
    gradient?: Record<number, string>
  }
  function heatLayer(
    latlngs: Array<[number, number] | [number, number, number]>,
    options?: HeatLayerOptions,
  ): L.Layer
}

declare namespace L {
  function heatLayer(
    latlngs: Array<[number, number] | [number, number, number]>,
    options?: {
      radius?: number
      blur?: number
      maxZoom?: number
      max?: number
      minOpacity?: number
      gradient?: Record<number, string>
    },
  ): L.Layer
}
