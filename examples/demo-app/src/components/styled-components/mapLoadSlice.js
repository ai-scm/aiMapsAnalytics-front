import {createSlice} from '@reduxjs/toolkit';

/**
 * Slice de estado para la carga del mapa desde el catálogo (MapsAnalytics).
 * Guarda el progreso de descarga (0-100) y si hay una carga en curso, para que
 * cualquier componente pueda mostrar una barra de carga consumiéndolo del store.
 */
const initialState = {
  progress: 0,
  isLoading: false
};

const mapLoadSlice = createSlice({
  name: 'mapLoad',
  initialState,
  reducers: {
    setMapLoadProgress(state, action) {
      state.progress = action.payload;
      state.isLoading = action.payload < 100;
    },
    startMapLoad(state) {
      state.progress = 0;
      state.isLoading = true;
    },
    resetMapLoad(state) {
      state.progress = 0;
      state.isLoading = false;
    }
  }
});

export const {setMapLoadProgress, startMapLoad, resetMapLoad} = mapLoadSlice.actions;

export default mapLoadSlice.reducer;
