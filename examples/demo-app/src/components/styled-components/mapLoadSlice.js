import {createSlice} from '@reduxjs/toolkit';

/**
 * Slice de estado para la carga del mapa desde el catálogo (MapsAnalytics).
 * Guarda el progreso de descarga (0-100) y si hay una carga en curso, para que
 * cualquier componente pueda mostrar una barra de carga consumiéndolo del store.
 */
const initialState = {
  progress: 0,
  isLoading: false,
  error: null
};

const mapLoadSlice = createSlice({
  name: 'mapLoad',
  initialState,
  reducers: {
    setMapLoadProgress(state, action) {
      state.progress = action.payload;
      state.isLoading = action.payload < 100;
      state.error = null;
    },
    startMapLoad(state) {
      state.progress = 0;
      state.isLoading = true;
      state.error = null;
    },
    resetMapLoad(state) {
      state.progress = 0;
      state.isLoading = false;
      state.error = null;
    },
    setMapLoadError(state, action) {
      state.isLoading = false;
      state.error = action.payload;
    }
  }
});

export const {setMapLoadProgress, startMapLoad, resetMapLoad, setMapLoadError} =
  mapLoadSlice.actions;

export default mapLoadSlice.reducer;
