import React from 'react';
import {useDispatch} from 'react-redux';
import {Icons, MapControlButton} from '@kepler.gl/components';
import {EXPORT_IMAGE_ID} from '@kepler.gl/constants';
import {startExportingImage, toggleModal} from '@kepler.gl/actions';

import ControlTooltip from './ControlTooltip';

export default function ExportImageControl({isExport}) {
  const dispatch = useDispatch();

  if (isExport) {
    return null;
  }

  const openExportImage = () => {
    dispatch(toggleModal(EXPORT_IMAGE_ID));
    dispatch(startExportingImage());
  };

  return (
    <ControlTooltip id="action-export-image" label="Exportar imagen">
      <MapControlButton type="button" aria-label="Exportar imagen" onClick={openExportImage}>
        <Icons.Picture height="18px" />
      </MapControlButton>
    </ControlTooltip>
  );
}
