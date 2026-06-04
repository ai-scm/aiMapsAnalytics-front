// SPDX-License-Identifier: MIT
// Copyright contributors to the kepler.gl project

import React, {useCallback, useEffect, useRef, useState} from 'react';
import AutoSizer from 'react-virtualized/dist/commonjs/AutoSizer';
import styled, {ThemeProvider, StyleSheetManager} from 'styled-components';
import Window from 'global/window';
import {connect, useDispatch} from 'react-redux';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import {useSelector} from 'react-redux';
import isPropValid from '@emotion/is-prop-valid';
import {WebMercatorViewport} from '@deck.gl/core';
import {ScreenshotWrapper} from '@openassistant/ui';
import {
  setStartScreenCapture,
  setScreenCaptured,
  AiAssistantPanel,
  setMapBoundary
} from '@kepler.gl/ai-assistant';
import {panelBorderColor} from '@kepler.gl/styles';
import {ParsedConfig} from '@kepler.gl/types';
import {getApplicationConfig} from '@kepler.gl/utils';
import {SqlPanel} from '@kepler.gl/duckdb/components';
import Banner from './components/banner';
import Announcement, {FormLink} from './components/announcement';
import {replaceLoadDataModal} from './factories/load-data-modal';
import {replaceMapControl} from './factories/map-control';
import {replacePanelHeader} from './factories/panel-header';
import {CLOUD_PROVIDERS_CONFIGURATION, DEFAULT_FEATURE_FLAGS} from './constants/default-settings';
import {messages} from './constants/localization';

import {
  loadRemoteMap,
  loadSampleConfigurations,
  onExportFileSuccess,
  onLoadCloudMapSuccess,
  setCatalogMapMetadata
} from './actions';

import {
  loadCloudMap,
  addDataToMap,
  loadFiles,
  replaceDataInMap,
  toggleSidePanel,
  toggleMapControl,
  toggleModal
} from '@kepler.gl/actions';
import {CLOUD_PROVIDERS} from './cloud-providers';
import {Panel, PanelGroup, PanelResizeHandle} from 'react-resizable-panels';
import {setMapLoadError} from './components/styled-components/mapLoadSlice';

const KeplerGl = require('@kepler.gl/components').injectComponents([
  replaceLoadDataModal(),
  replaceMapControl(),
  replacePanelHeader()
]);

// Sample data
/* eslint-disable no-unused-vars */
import sampleTripData, {testCsvData, sampleTripDataConfig} from './data/sample-trip-data';
// import sampleGeojson from './data/sample-small-geojson';
// import sampleGeojsonPoints from './data/sample-geojson-points';
import sampleGeojsonConfig from './data/sample-geojson-config';
import sampleH3Data, {config as h3MapConfig} from './data/sample-hex-id-csv';
import sampleS2Data, {config as s2MapConfig, dataId as s2DataId} from './data/sample-s2-data';
import sampleAnimateTrip, {
  pointData,
  pointDataId,
  animateTripDataId,
  replacePointData,
  config as syncedTripConfig
} from './data/sample-animate-trip-data';
import sampleIconCsv from './data/sample-icon-csv';
import sampleGpsData from './data/sample-gps-data';
import sampleRowData, {config as rowDataConfig} from './data/sample-row-data';
import {
  processCsvData,
  processGeojson,
  processRowObject,
  processKeplerglJSON
} from '@kepler.gl/processors';
import {useLazyGetMapFromCatalogQuery} from './components/styled-components/apiSlice';
import {getCatalogMapStyles} from './components/styled-components/mapStyles';
import {mapsAnalyticsTheme} from './components/styled-components/theme';

/* eslint-enable no-unused-vars */

// This implements the default behavior from styled-components v5
function shouldForwardProp(propName, target) {
  if (typeof target === 'string') {
    // For HTML elements, forward the prop if it is a valid HTML attribute
    return isPropValid(propName);
  }
  // For other elements, forward all props
  return true;
}

const BannerHeight = 48;
const BannerKey = `banner-${FormLink}`;
const keplerGlGetState = state => state.demo.keplerGl;
const catalogMapStyles = Object.values(getCatalogMapStyles());

const GlobalStyle = styled.div`
  font-family: ff-clan-web-pro, 'Helvetica Neue', Helvetica, sans-serif;
  font-weight: 400;
  font-size: 0.875em;
  line-height: 1.71429;

  *,
  *:before,
  *:after {
    -webkit-box-sizing: border-box;
    -moz-box-sizing: border-box;
    box-sizing: border-box;
  }

  ul {
    margin: 0;
    padding: 0;
  }

  li {
    margin: 0;
  }

  a {
    text-decoration: none;
    color: ${props => props.theme.labelColor};
  }

  .kepler-gl {
    color: ${props => props.theme.textColor};

    .side-panel__panel-header__top {
      justify-content: flex-end;
    }

    .button {
      letter-spacing: 0;
    }

    .button:not(.map-control-button) {
      border: ${props => props.theme.primaryBtnBorder || 0};
      background-color: ${props => props.theme.primaryBtnBgd};
      color: ${props => props.theme.primaryBtnColor};
    }

    .button:not(.map-control-button):hover,
    .button:not(.map-control-button):focus,
    .button:not(.map-control-button):active,
    .button:not(.map-control-button).active {
      background-color: ${props => props.theme.primaryBtnBgdHover};
      color: ${props => props.theme.primaryBtnActColor};
    }

    .button.secondary,
    .button.cancel,
    .button.link {
      border: ${props => props.theme.secondaryBtnBorder};
      background-color: ${props => props.theme.secondaryBtnBgd};
      color: ${props => props.theme.secondaryBtnColor};
    }

    .button.secondary:hover,
    .button.cancel:hover,
    .button.link:hover {
      background-color: ${props => props.theme.secondaryBtnBgdHover};
      color: ${props => props.theme.secondaryBtnActColor};
    }

    .map-control-button {
      border: ${props => props.theme.floatingBtnBorder};
      background-color: ${props => props.theme.floatingBtnBgd};
      color: ${props => props.theme.floatingBtnColor};
      box-shadow: ${props => props.theme.panelBoxShadow};
    }

    .map-control-button:hover,
    .map-control-button:focus,
    .map-control-button:active,
    .map-control-button.active,
    .map-control-button.isActive {
      border: ${props => props.theme.floatingBtnBorderHover};
      background-color: ${props => props.theme.floatingBtnBgdHover};
      color: ${props => props.theme.floatingBtnActColor};
    }

    input,
    textarea,
    select,
    .item-selector,
    .typeahead,
    .item-selector__dropdown,
    .item-selector__dropdown__value {
      border-color: ${props => props.theme.inputBorderColor};
      background-color: ${props => props.theme.inputBgd};
      color: ${props => props.theme.inputColor};
    }

    input:hover,
    textarea:hover,
    select:hover,
    input:focus,
    textarea:focus,
    select:focus {
      border-color: ${props => props.theme.inputBorderActiveColor};
      background-color: ${props => props.theme.inputBgdActive};
      color: ${props => props.theme.inputColor};
    }

    .list,
    .list__section,
    .list__item,
    .typeahead__dropdown,
    .item-selector__dropdown-list {
      background-color: ${props => props.theme.dropdownListBgd};
      color: ${props => props.theme.textColor};
      border-color: ${props => props.theme.dropdownListBorderTop};
    }

    .list__item:hover,
    .list__item.hover,
    .list__item.selected {
      background-color: ${props => props.theme.dropdownListHighlightBg};
      color: ${props => props.theme.textColorHl};
    }

    .list__item__anchor,
    .list__item__anchor:visited {
      color: ${props => props.theme.textColor};
    }

    .list__item:hover .list__item__anchor,
    .list__item.hover .list__item__anchor,
    .list__item.selected .list__item__anchor {
      color: ${props => props.theme.textColorHl};
    }

    .side-panel,
    .side-panel__header,
    .side-panel-panel__content,
    .side-panel-section {
      background-color: ${props => props.theme.sidePanelBg};
      color: ${props => props.theme.textColor};
    }

    .side-panel-panel__header,
    .side-panel-panel__content {
      border-color: ${props => props.theme.panelBorderColor};
    }
  }
`;

const CONTAINER_STYLE = {
  transition: 'margin 1s, height 1s',
  position: 'absolute',
  width: '100%',
  height: '100%',
  left: 0,
  top: 0,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#333'
};

const StyledResizeHandle = styled(PanelResizeHandle)`
  background-color: ${panelBorderColor};
  &:hover {
    background-color: #555;
  }
  width: 100%;
  height: 5px;
  cursor: row-resize;
`;

const StyledVerticalResizeHandle = styled(PanelResizeHandle)`
  background-color: ${panelBorderColor};
  width: 4px;
  height: 100%;
  cursor: row-resize;

  &:hover {
    background-color: #555;
  }
`;

const CatalogMapLoading = styled.div`
  position: absolute;
  left: 50%;
  top: 24px;
  z-index: 20;
  min-width: 240px;
  transform: translateX(-50%);
  border-radius: 4px;
  background: ${props => props.theme.sidePanelBg || '#242730'};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  color: ${props => props.theme.textColor || '#f7f7f7'};
  padding: 12px;
`;

const CatalogMapLoadingText = styled.div`
  font-size: 12px;
  margin-bottom: 8px;
`;

const CatalogMapLoadingTrack = styled.div`
  height: 4px;
  overflow: hidden;
  border-radius: 2px;
  background: ${props => props.theme.panelBorder || '#3f4550'};
`;

const CatalogMapLoadingBar = styled.div`
  width: ${props => props.progress}%;
  height: 100%;
  transition: width 160ms ease;
  background: ${props => props.theme.activeColor || '#1fbad6'};
`;

const CatalogMapError = styled(CatalogMapLoading)`
  color: ${props => props.theme.errorColor || '#ff4d4d'};
`;

function getCatalogMapFilename(url) {
  try {
    return new URL(url).pathname.split('/').pop() || 'catalog-map.json';
  } catch (error) {
    return url.split('/').pop()?.split('?')[0] || 'catalog-map.json';
  }
}

const App = props => {
  const [showBanner, toggleShowBanner] = useState(false);
  const {params: {id, provider} = {}, location: {query = {}} = {}} = props;
  const dispatch = useDispatch();
  const [triggerLoadCatalogMap] = useLazyGetMapFromCatalogQuery();
  const {isLoading: isCatalogMapLoading, progress: catalogMapProgress, error: catalogMapError} =
    useSelector(state => state.mapLoad);
  const catalogMap = useSelector(state => state.demo.app.catalogMap);

  // TODO find another way to check for existence of duckDb plugin
  const duckDbPluginEnabled = (getApplicationConfig().plugins || []).some(p => p.name === 'duckdb');

  const isSqlPanelOpen = useSelector(
    state => duckDbPluginEnabled && state?.demo?.keplerGl?.map?.uiState.mapControls.sqlPanel?.active
  );

  const isAiAssistantPanelOpen = useSelector(
    state => state?.demo?.keplerGl?.map?.uiState.mapControls.aiAssistant?.active
  );

  const prevQueryRef = useRef<number>(null);

  useEffect(() => {
    // if we pass an id as part of the url
    // we try to fetch along map configurations
    const cloudProvider = CLOUD_PROVIDERS.find(c => c.name === provider);
    if (cloudProvider) {
      // Prevent constant reloading after change of the location
      if (isEqual(prevQueryRef.current, {provider, id, query})) {
        return;
      }

      dispatch(
        loadCloudMap({
          loadParams: query,
          provider: cloudProvider,
          onSuccess: onLoadCloudMapSuccess
        })
      );
      prevQueryRef.current = {provider, id, query};
      return;
    }

    // Load sample using its id
    if (id) {
      dispatch(loadSampleConfigurations(id));
    }

    // Load map using a custom
    if (query.mapUrl) {
      // TODO?: validate map url
      dispatch(loadRemoteMap({dataUrl: query.mapUrl}));
    }

    if (duckDbPluginEnabled && query.sql) {
      dispatch(toggleMapControl('sqlPanel', 0));
      dispatch(toggleModal(null));
    }

    // delay zs to show the banner
    // if (!window.localStorage.getItem(BannerKey)) {
    //   window.setTimeout(_showBanner, 3000);
    // }
    // load sample data
    _loadSampleData();

    // Notifications

    // no dependencies, as this was part of componentDidMount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Window.parent?.postMessage({type: 'FRAME', text: 'Frame cargado'}, '*');
  }, []);

  /**
   * Listen for the map URL sent by the catalog (MapsAnalytics) via postMessage.
   * On `dynamicURL`, download the map JSON (with progress) and inject it into
   * Kepler. The HTTP client lives in components/styled-components/apiSlice.
   */
  useEffect(() => {
    const handleMessage = event => {
      if (event.source !== Window.parent) {
        return;
      }
      if (event.data?.type !== 'dynamicURL') {
        return;
      }
      const dynamicURL = event.data.url;
      if (!dynamicURL) {
        return;
      }
      const fileName = getCatalogMapFilename(dynamicURL);
      dispatch(setCatalogMapMetadata({url: dynamicURL, uId: event.data.uId || null, fileName}));
      dispatch(toggleSidePanel(null));
      triggerLoadCatalogMap(dynamicURL)
        .unwrap()
        .then(data => {
          try {
            const keplerGL = processKeplerglJSON(data);
            if (keplerGL) {
              dispatch(addDataToMap(keplerGL));
              return;
            }
            throw new Error('Catalog map JSON could not be processed as a Kepler map');
          } catch (error) {
            const file = new File([new Blob([JSON.stringify(data)])], fileName, {
              type: 'application/json'
            });
            dispatch(loadFiles([file]));
          }
        })
        .catch(error => {
          dispatch(setMapLoadError(String(error)));
          // eslint-disable-next-line no-console
          console.error('Error loading map from catalog:', error);
        });
    };

    Window.addEventListener('message', handleMessage);
    return () => Window.removeEventListener('message', handleMessage);
  }, [dispatch, triggerLoadCatalogMap]);

  /**
   * Update map boundary when view state changes, used by ai-assistant to
   * get data from vector tiles when map boundary changes
   */
  const onViewStateChange = useCallback(
    viewState => {
      const viewport = new WebMercatorViewport(viewState);
      const nw = viewport.unproject([0, 0]);
      const se = viewport.unproject([viewport.width, viewport.height]);
      dispatch(setMapBoundary(nw, se));
    },
    [dispatch]
  );

  const _setStartScreenCapture = useCallback(
    flag => {
      dispatch(setStartScreenCapture(flag));
    },
    [dispatch]
  );

  const _setScreenCaptured = useCallback(
    screenshot => {
      dispatch(setScreenCaptured(screenshot));
    },
    [dispatch]
  );

  /*
  const _showBanner = useCallback(() => {
    toggleShowBanner(true);
  }, [toggleShowBanner]);
  */

  const hideBanner = useCallback(() => {
    toggleShowBanner(false);
  }, [toggleShowBanner]);

  const _disableBanner = useCallback(() => {
    hideBanner();
    Window.localStorage.setItem(BannerKey, 'true');
  }, [hideBanner]);

  const _loadRowData = useCallback(() => {
    dispatch(
      addDataToMap({
        datasets: [
          {
            info: {
              label: 'Sample Visit Data',
              id: 'sample_visit_data'
            },
            data: processRowObject(sampleRowData)
          }
        ],
        config: rowDataConfig
      })
    );
  }, [dispatch]);

  const _loadVectorTileData = useCallback(() => {
    dispatch(
      addDataToMap({
        datasets: [
          {
            info: {
              label: 'Railroads',
              id: 'railroads.pmtiles',
              color: [255, 0, 0],
              type: 'vector-tile'
            },
            data: {
              rows: [],
              fields: [
                {
                  name: 'continent',
                  type: 'string',
                  format: '',
                  analyzerType: 'STRING'
                }
              ]
            },
            metadata: {
              name: 'output.pmtiles',
              description: 'output.pmtiles',
              type: 'remote',
              remoteTileFormat: 'pmtiles',
              tilesetDataUrl:
                'https://4sq-studio-public.s3.us-west-2.amazonaws.com/pmtiles-test/161727fe-7952-4e57-aa05-850b3086b0b2.pmtiles',
              tilesetMetadataUrl:
                'https://4sq-studio-public.s3.us-west-2.amazonaws.com/pmtiles-test/161727fe-7952-4e57-aa05-850b3086b0b2.pmtiles',
              id: 'sz6uy1xtj',
              format: 'rows',
              label: 'output.pmtiles',
              metaJson: null,
              bounds: [-150.1122219, -51.8952777, 179.3577783, 69.6043747],
              center: [14.0625, 50.7026397, 6],
              maxZoom: 6,
              minZoom: 0,
              fields: [
                {
                  name: 'continent',
                  id: 'continent',
                  format: '',
                  filterProps: {
                    domain: [
                      'Africa',
                      'Asia',
                      'Europe',
                      'North America',
                      'Oceania',
                      'South America'
                    ],
                    value: [],
                    type: 'multiSelect',
                    gpu: false
                  },
                  type: 'string',
                  analyzerType: 'STRING'
                }
              ]
            }
          }
        ],
        options: {
          autoCreateLayers: true
        }
      })
    );
  }, [dispatch]);

  const _loadPointData = useCallback(() => {
    dispatch(
      addDataToMap({
        datasets: [
          {
            info: {
              label: 'Sample Taxi Trips 1',
              id: 'test_trip_data',
              color: [255, 0, 0]
            },
            data: {
              rows: sampleTripData.rows.slice(0, 20),
              fields: cloneDeep(sampleTripData.fields)
            }
          },
          {
            info: {
              label: 'Sample Taxi Trips 2',
              id: 'test_trip_data_2',
              color: [0, 255, 0]
            },
            data: {
              rows: sampleTripData.rows.slice(5, sampleTripData.rows.length),
              fields: cloneDeep(sampleTripData.fields)
            }
          }
        ],
        options: {
          // centerMap: true,
          keepExistingConfig: true
        },
        config: sampleTripDataConfig
      })
    );
  }, [dispatch]);

  const _loadScenegraphLayer = useCallback(() => {
    dispatch(
      addDataToMap({
        datasets: {
          info: {
            label: 'Sample Scenegraph Ducks',
            id: 'test_trip_data'
          },
          data: processCsvData(testCsvData)
        },
        config: {
          version: 'v1',
          config: {
            visState: {
              layers: [
                {
                  type: '3D',
                  config: {
                    dataId: 'test_trip_data',
                    columns: {
                      lat: 'gps_data.lat',
                      lng: 'gps_data.lng'
                    },
                    isVisible: true
                  }
                }
              ]
            }
          }
        }
      })
    );
  }, [dispatch]);

  const _loadIconData = useCallback(() => {
    // load icon data and config and process csv file
    dispatch(
      addDataToMap({
        datasets: [
          {
            info: {
              label: 'Icon Data',
              id: 'test_icon_data'
            },
            data: processCsvData(sampleIconCsv)
          }
        ]
      })
    );
  }, [dispatch]);

  const _loadTripGeoJson = useCallback(() => {
    dispatch(
      addDataToMap({
        datasets: [
          {
            info: {label: 'Trip animation', id: animateTripDataId},
            data: processGeojson(sampleAnimateTrip)
          }
        ]
      })
    );
  }, [dispatch]);

  const _loadGeojsonData = useCallback(() => {
    // load geojson
    const geojsonPoints = processGeojson(sampleGeojsonPoints);
    const geojsonZip = null; // processGeojson(sampleGeojson);
    dispatch(
      addDataToMap({
        datasets: [
          geojsonPoints
            ? {
                info: {label: 'Bart Stops Geo', id: 'bart-stops-geo'},
                data: geojsonPoints
              }
            : null,
          geojsonZip
            ? {
                info: {label: 'SF Zip Geo', id: 'sf-zip-geo'},
                data: geojsonZip
              }
            : null
        ].filter(d => d !== null),
        options: {
          keepExistingConfig: true
        },
        config: sampleGeojsonConfig as ParsedConfig
      })
    );
  }, [dispatch]);

  const _loadSyncedFilterWTripLayer = useCallback(() => {
    dispatch(
      addDataToMap({
        datasets: [
          {
            info: {label: 'Trip animation', id: animateTripDataId},
            data: processGeojson(sampleAnimateTrip)
          },
          {
            info: {
              label: 'Sample Taxi Trips',
              id: pointDataId,
              color: [255, 0, 0]
            },
            data: pointData
          }
        ],
        config: syncedTripConfig,
        options: {
          centerMap: true
        }
      })
    );
  }, [dispatch]);

  const _replaceSyncedFilterWTripLayer = useCallback(() => {
    window.setTimeout(() => {
      dispatch(
        replaceDataInMap({
          datasetToReplaceId: pointDataId,
          datasetToUse: {
            info: {label: 'Sample Taxi Trips Replaced', id: `${pointDataId}-2`},
            data: replacePointData
          }
        })
      );
    }, 1000);
  }, [dispatch]);

  const _replaceData = useCallback(() => {
    // add geojson data
    const sliceData = processGeojson({
      type: 'FeatureCollection',
      features: sampleGeojsonPoints.features.slice(0, 5)
    });
    _loadGeojsonData();
    Window.setTimeout(() => {
      dispatch(
        replaceDataInMap({
          datasetToReplaceId: 'bart-stops-geo',
          datasetToUse: {
            info: {label: 'Bart Stops Geo Replaced', id: 'bart-stops-geo-2'},
            data: sliceData
          }
        })
      );
    }, 1000);
  }, [dispatch, _loadGeojsonData]);

  const _loadH3HexagonData = useCallback(() => {
    // load h3 hexagon
    dispatch(
      addDataToMap({
        datasets: [
          {
            info: {
              label: 'H3 Hexagons V2',
              id: 'h3-hex-id'
            },
            data: processCsvData(sampleH3Data)
          }
        ],
        config: h3MapConfig,
        options: {
          keepExistingConfig: true
        }
      })
    );
  }, [dispatch]);

  const _loadS2Data = useCallback(() => {
    // load s2
    dispatch(
      addDataToMap({
        datasets: [
          {
            info: {
              label: 'S2 Data',
              id: s2DataId
            },
            data: processCsvData(sampleS2Data)
          }
        ],
        config: s2MapConfig as ParsedConfig,
        options: {
          keepExistingConfig: true
        }
      })
    );
  }, [dispatch]);

  const _loadGpsData = useCallback(() => {
    dispatch(
      addDataToMap({
        datasets: [
          {
            info: {
              label: 'Gps Data',
              id: 'gps-data'
            },
            data: processCsvData(sampleGpsData)
          }
        ],
        options: {
          keepExistingConfig: true
        }
      })
    );
  }, [dispatch]);

  const _loadSampleData = useCallback(() => {
    // _loadPointData();
    // _loadGeojsonData();
    // _loadTripGeoJson();
    // _loadIconData();
    // _loadH3HexagonData();
    // _loadS2Data();
    // _loadScenegraphLayer();
    // _loadGpsData();
    // _loadRowData();
    // _loadVectorTileData();
    // _loadSyncedFilterWTripLayer();
    // _replaceSyncedFilterWTripLayer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    _loadPointData,
    _loadGeojsonData,
    _loadTripGeoJson,
    _loadIconData,
    _loadH3HexagonData,
    _loadS2Data,
    _loadScenegraphLayer,
    _loadGpsData,
    _loadRowData,
    _replaceData,
    _loadVectorTileData,
    _loadSyncedFilterWTripLayer,
    _replaceSyncedFilterWTripLayer
  ]);

  return (
    <StyleSheetManager shouldForwardProp={shouldForwardProp}>
      <ThemeProvider theme={mapsAnalyticsTheme}>
        <GlobalStyle
        // this is to apply the same modal style as kepler.gl core
        // because styled-components doesn't always return a node
        // https://github.com/styled-components/styled-components/issues/617
        // ref={node => {
        //   node ? (this.root = node) : null;
        // }}
        >
          <ScreenshotWrapper
            startScreenCapture={props.demo.aiAssistant.screenshotToAsk.startScreenCapture}
            setScreenCaptured={_setScreenCaptured}
            setStartScreenCapture={_setStartScreenCapture}
            className="h-screen"
          >
            <Banner show={showBanner} height={BannerHeight} bgColor="#2E7CF6" onClose={hideBanner}>
              <Announcement onDisable={_disableBanner} />
            </Banner>
            <div style={CONTAINER_STYLE}>
              {isCatalogMapLoading && (
                <CatalogMapLoading>
                  <CatalogMapLoadingText>
                    Cargando mapa del catálogo
                    {catalogMap.fileName ? `: ${catalogMap.fileName}` : ''}
                  </CatalogMapLoadingText>
                  <CatalogMapLoadingTrack>
                    <CatalogMapLoadingBar progress={catalogMapProgress} />
                  </CatalogMapLoadingTrack>
                </CatalogMapLoading>
              )}
              {catalogMapError && (
                <CatalogMapError>
                  <CatalogMapLoadingText>Error cargando mapa del catálogo</CatalogMapLoadingText>
                  <CatalogMapLoadingText>{catalogMapError}</CatalogMapLoadingText>
                </CatalogMapError>
              )}
              <PanelGroup direction="horizontal">
                <Panel defaultSize={isAiAssistantPanelOpen ? 70 : 100}>
                  <PanelGroup direction="vertical">
                    <Panel defaultSize={isSqlPanelOpen ? 60 : 100}>
                      <AutoSizer>
                        {({height, width}) => (
                          <KeplerGl
                            mapboxApiAccessToken={CLOUD_PROVIDERS_CONFIGURATION.MAPBOX_TOKEN}
                            id="map"
                            getState={keplerGlGetState}
                            width={width}
                            height={height}
                            mapStyles={catalogMapStyles}
                            cloudProviders={CLOUD_PROVIDERS}
                            localeMessages={messages}
                            onExportToCloudSuccess={onExportFileSuccess}
                            onLoadCloudMapSuccess={onLoadCloudMapSuccess}
                            featureFlags={DEFAULT_FEATURE_FLAGS}
                            onViewStateChange={onViewStateChange}
                          />
                        )}
                      </AutoSizer>
                    </Panel>

                    {isSqlPanelOpen && (
                      <>
                        <StyledResizeHandle />
                        <Panel defaultSize={40} minSize={20}>
                          <SqlPanel initialSql={query.sql || ''} />
                        </Panel>
                      </>
                    )}
                  </PanelGroup>
                </Panel>
                {isAiAssistantPanelOpen && (
                  <>
                    <StyledVerticalResizeHandle />
                    <Panel defaultSize={30} minSize={20}>
                      <AiAssistantPanel />
                    </Panel>
                  </>
                )}
              </PanelGroup>
            </div>
          </ScreenshotWrapper>
        </GlobalStyle>
      </ThemeProvider>
    </StyleSheetManager>
  );
};

const mapStateToProps = state => state;
const dispatchToProps = dispatch => ({dispatch});

export default connect(mapStateToProps, dispatchToProps)(App);
