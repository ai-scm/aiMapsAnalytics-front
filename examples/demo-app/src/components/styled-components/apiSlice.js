import {createApi, fetchBaseQuery} from '@reduxjs/toolkit/query/react';

import keycloak from './keycloak-config';
import {getJsonItem} from './getJsonItem';
import {
  startMapLoad,
  setMapLoadProgress,
  resetMapLoad,
  setMapLoadError
} from './mapLoadSlice';

/**
 * Cliente HTTP del catálogo MapsAnalytics (RTK Query).
 *
 * - baseQuery apunta al API del catálogo (process.env.API_URL) e inyecta el
 *   token de Keycloak para los endpoints contra el catálogo.
 * - getMapFromCatalog descarga el JSON del mapa desde una URL presignada de S3
 *   (la que envía el catálogo por postMessage). Usa un queryFn con getJsonItem
 *   para poder reportar el progreso de descarga al slice mapLoad; por eso hace
 *   fetch directo a la URL y no pasa por baseQuery/prepareHeaders.
 */
export const apiSlice = createApi({
  reducerPath: 'mapsAnalyticsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.API_URL,
    prepareHeaders: headers => {
      if (keycloak.token) {
        headers.set('Authorization', `Bearer ${keycloak.token}`);
      }
      return headers;
    }
  }),
  endpoints: builder => ({
    getGroups: builder.query({
      query: () => '/groups/getAll',
      transformResponse: response => response?.value ?? []
    }),
    uploadItemMap: builder.mutation({
      query: formData => ({
        url: '/items/upload',
        method: 'POST',
        body: formData
      })
    }),
    updateItemJson: builder.mutation({
      query: ({uuidNumber, formData}) => ({
        url: `/items/updateJson/${uuidNumber}`,
        method: 'PUT',
        body: formData
      })
    }),
    getMapFromCatalog: builder.query({
      async queryFn(url, api) {
        api.dispatch(startMapLoad());
        try {
          const data = await getJsonItem(url, {
            onProgress: ({fraction}) =>
              api.dispatch(setMapLoadProgress(Math.round(fraction * 100)))
          });
          api.dispatch(setMapLoadProgress(100));
          return {data};
        } catch (error) {
          api.dispatch(resetMapLoad());
          api.dispatch(setMapLoadError(String(error)));
          return {error: {status: 'FETCH_ERROR', error: String(error)}};
        }
      }
    })
  })
});

export const {
  useGetGroupsQuery,
  useLazyGetGroupsQuery,
  useUploadItemMapMutation,
  useUpdateItemJsonMutation,
  useGetMapFromCatalogQuery,
  useLazyGetMapFromCatalogQuery
} = apiSlice;

export default apiSlice;
