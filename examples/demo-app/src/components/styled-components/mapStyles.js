import mapStylesJson from './map-styles.json';
import {CLOUD_PROVIDERS_CONFIGURATION} from '../../constants/default-settings';

export const DEFAULT_CATALOG_STYLE_ID = 'streets';
export const FALLBACK_STYLE_ID = 'dark-matter';

export function getCatalogMapStyles() {
  return mapStylesJson.reduce((styles, style) => {
    styles[style.name] = {
      id: style.name,
      style: style.mapStyle,
      label: style.name,
      icon: style.icon,
      layerGroups: [],
      visible: true,
      url: style.mapStyle,
      token: CLOUD_PROVIDERS_CONFIGURATION.MAPBOX_TOKEN
    };
    return styles;
  }, {});
}

export function getDefaultCatalogStyleId() {
  return mapStylesJson.some(style => style.name === DEFAULT_CATALOG_STYLE_ID)
    ? DEFAULT_CATALOG_STYLE_ID
    : mapStylesJson[0]?.name || FALLBACK_STYLE_ID;
}
