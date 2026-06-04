import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector, useStore} from 'react-redux';
import styled from 'styled-components';
import KeplerGlSchema from '@kepler.gl/schemas';
import {Icons, MapControlButton} from '@kepler.gl/components';

import {
  useLazyGetGroupsQuery,
  useUploadItemMapMutation,
  useUpdateItemJsonMutation
} from './apiSlice';
import {captureMapImageBlob} from './exportMapImage';
import downloadJsonFile from './downloadJsonFile';

const MAX_DESCRIPTION_LENGTH = 255;

/* ----------------------------- styled-components ---------------------------- */

const SaveMapControls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
`;

const ModalCard = styled.form`
  width: 420px;
  max-width: 90vw;
  padding: 24px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: ${props => props.theme.textColor || '#4a5568'};
  background: ${props => props.theme.panelBackground || '#f7f7f7'};
  border: 1px solid ${props => props.theme.panelBorderColor || '#d5dbe3'};
  box-shadow: 0 8px 24px rgba(31, 41, 55, 0.2);
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  color: ${props => props.theme.textColorHl || '#ffffff'};
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
`;

const TextInput = styled.input`
  padding: 8px;
  border-radius: 2px;
  border: 1px solid ${props => props.theme.inputBorderColor || '#d5dbe3'};
  background: ${props => props.theme.inputBgd || '#f7f7f7'};
  color: ${props => props.theme.textColorHl || '#ffffff'};
  font-size: 13px;

  &:focus {
    outline: 1px solid ${props => props.theme.activeColor || '#2473bd'};
    background: ${props => props.theme.inputBgdActive || '#ffffff'};
  }
`;

const TextArea = styled.textarea`
  padding: 8px;
  border-radius: 2px;
  min-height: 64px;
  resize: vertical;
  border: 1px solid ${props => props.theme.inputBorderColor || '#d5dbe3'};
  background: ${props => props.theme.inputBgd || '#f7f7f7'};
  color: ${props => props.theme.textColorHl || '#ffffff'};
  font-size: 13px;

  &:focus {
    outline: 1px solid ${props => props.theme.activeColor || '#2473bd'};
    background: ${props => props.theme.inputBgdActive || '#ffffff'};
  }
`;

const MultiSelect = styled.select`
  padding: 8px;
  min-height: 96px;
  border-radius: 2px;
  border: 1px solid ${props => props.theme.inputBorderColor || '#d5dbe3'};
  background: ${props => props.theme.inputBgd || '#f7f7f7'};
  color: ${props => props.theme.textColorHl || '#ffffff'};
  font-size: 13px;

  &:focus {
    outline: 1px solid ${props => props.theme.activeColor || '#2473bd'};
    background: ${props => props.theme.inputBgdActive || '#ffffff'};
  }
`;

const FieldError = styled.span`
  color: ${props => props.theme.errorColor || '#ff4d4d'};
  font-size: 11px;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const ModalButton = styled.button`
  padding: 8px 16px;
  border-radius: 2px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  color: ${props =>
    props.primary ? props.theme.primaryBtnActColor || '#ffffff' : props.theme.textColor || '#4a5568'};
  background: ${props =>
    props.primary ? props.theme.primaryBtnBgd || '#2473bd' : 'transparent'};

  &:hover:not(:disabled) {
    background: ${props =>
      props.primary ? props.theme.primaryBtnBgdHover || '#1869b5' : props.theme.secondaryBtnBgdHover || '#f0f0f0'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatusMessage = styled.div`
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 1100;
  padding: 10px 16px;
  border-radius: 2px;
  font-size: 13px;
  color: #ffffff;
  background: ${props => (props.error ? props.theme.errorColor || '#d64545' : props.theme.primaryBtnBgd || '#2473bd')};
`;

/* ------------------------------- componente -------------------------------- */

const initialForm = {title: '', description: '', groups: []};

const SaveMap = ({uId, catalogMap, isExport, className}) => {
  const dispatch = useDispatch();
  const store = useStore();
  const map = useSelector(state => state.demo?.keplerGl?.map);
  const catalogUId = uId ?? catalogMap?.uId;
  const catalogFileName = catalogMap?.fileName;

  const [
    getGroups,
    {data: groups = [], isFetching: isLoadingGroups, isError: hasGroupsError}
  ] = useLazyGetGroupsQuery();
  const [uploadItemMap, {isLoading: isUploading}] = useUploadItemMapMutation();
  const [updateItemJson, {isLoading: isUpdating}] = useUpdateItemJsonMutation();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null); // {message, error}

  const busy = isUploading || isUpdating;
  const canSubmit = !busy && !isLoadingGroups && !hasGroupsError;

  // Oculta el mensaje de estado tras unos segundos.
  useEffect(() => {
    if (!status) return undefined;
    const id = setTimeout(() => setStatus(null), 5000);
    return () => clearTimeout(id);
  }, [status]);

  const buildSavedMap = () => KeplerGlSchema.save(map);

  const buildMapFile = () => {
    const savedMap = buildSavedMap();
    const fileName = `${crypto.randomUUID()}.map.json`;
    const blob = new Blob([JSON.stringify(savedMap)], {type: 'application/json'});
    return new File([blob], fileName, {type: 'application/json'});
  };

  const appendThumbnail = async formData => {
    const imageBlob = await captureMapImageBlob(dispatch, store.getState);
    formData.append('thumbnail', imageBlob, 'kepler-map.png');
  };

  // Guardar como: crea un mapa nuevo (POST /items/upload).
  const handleCreate = async event => {
    event.preventDefault();

    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = 'El título es obligatorio';
    if (!form.description.trim()) nextErrors.description = 'La descripción es obligatoria';
    if (form.description.length > MAX_DESCRIPTION_LENGTH) {
      nextErrors.description = `La descripción no puede superar los ${MAX_DESCRIPTION_LENGTH} caracteres`;
    }
    if (!form.groups.length) nextErrors.groups = 'Debes seleccionar al menos un grupo';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      const formData = new FormData();
      formData.append('file', buildMapFile());
      await appendThumbnail(formData);
      formData.append('title', form.title);
      formData.append('description', form.description);
      form.groups.forEach(group => formData.append('groups', group));

      await uploadItemMap(formData).unwrap();
      setStatus({message: 'Mapa guardado correctamente', error: false});
      setOpen(false);
      setForm(initialForm);
    } catch (error) {
      console.error('Error guardando el mapa', error);
      setStatus({message: error?.message || 'Error al guardar el mapa', error: true});
    }
  };

  // Guardar: actualiza el mapa existente (PUT /items/updateJson/{uId}).
  const handleUpdate = async () => {
    if (!catalogUId) return;
    try {
      const formData = new FormData();
      formData.append('file', buildMapFile());
      await appendThumbnail(formData);

      await updateItemJson({uuidNumber: catalogUId, formData}).unwrap();
      setStatus({message: 'Mapa actualizado correctamente', error: false});
    } catch (error) {
      console.error('Error actualizando el mapa', error);
      setStatus({message: error?.message || 'Error al actualizar el mapa', error: true});
    }
  };

  const handleExportJson = () => {
    try {
      const savedMap = buildSavedMap();
      const fileName = catalogFileName || `kepler-map-${Date.now()}.json`;
      downloadJsonFile(savedMap, fileName);
      setStatus({message: 'Mapa exportado correctamente', error: false});
    } catch (error) {
      console.error('Error exportando el mapa', error);
      setStatus({message: 'Error al exportar el mapa', error: true});
    }
  };

  const updateField = key => event => {
    const {value} = event.target;
    setForm(prev => ({...prev, [key]: value}));
  };

  const handleGroupsChange = event => {
    const selected = Array.from(event.target.selectedOptions, option => option.value);
    setForm(prev => ({...prev, groups: selected}));
  };

  const handleOpenCreate = () => {
    setErrors({});
    setOpen(true);
    getGroups(undefined, true);
  };

  if (isExport) {
    return null;
  }

  return (
    <>
      <SaveMapControls className={className}>
        <MapControlButton
          type="button"
          aria-label="Guardar como"
          title="Guardar como"
          disabled={busy}
          onClick={handleOpenCreate}
        >
          <Icons.Save height="18px" />
        </MapControlButton>

        {catalogUId && (
          <MapControlButton
            type="button"
            aria-label="Guardar"
            title="Guardar"
            disabled={busy}
            onClick={handleUpdate}
          >
            <Icons.Save2 height="18px" />
          </MapControlButton>
        )}

        <MapControlButton
          type="button"
          aria-label="Exportar JSON"
          title="Exportar JSON"
          disabled={busy}
          onClick={handleExportJson}
        >
          <Icons.BaseMap height="18px" />
        </MapControlButton>
      </SaveMapControls>

      {open && (
        <Overlay onClick={() => !busy && setOpen(false)}>
          <ModalCard onClick={event => event.stopPropagation()} onSubmit={handleCreate}>
            <ModalTitle>Almacenar mapa</ModalTitle>

            <Field>
              Título
              <TextInput
                autoFocus
                value={form.title}
                onChange={updateField('title')}
                placeholder="Título del mapa"
              />
              {errors.title && <FieldError>{errors.title}</FieldError>}
            </Field>

            <Field>
              Descripción
              <TextArea
                value={form.description}
                onChange={updateField('description')}
                maxLength={MAX_DESCRIPTION_LENGTH}
                placeholder="Descripción del mapa"
              />
              {errors.description && <FieldError>{errors.description}</FieldError>}
            </Field>

            <Field>
              Grupos
              <MultiSelect
                multiple
                value={form.groups}
                onChange={handleGroupsChange}
                disabled={isLoadingGroups || hasGroupsError}
              >
                {groups.map(group => (
                  <option key={group.uuid} value={group.uuid}>
                    {group.title}
                  </option>
                ))}
              </MultiSelect>
              {isLoadingGroups && <FieldError>Cargando grupos…</FieldError>}
              {hasGroupsError && <FieldError>Error cargando grupos</FieldError>}
              {errors.groups && <FieldError>{errors.groups}</FieldError>}
            </Field>

            <Actions>
              <ModalButton type="button" onClick={() => setOpen(false)} disabled={busy}>
                Cancelar
              </ModalButton>
              <ModalButton type="submit" primary disabled={!canSubmit}>
                {busy ? 'Guardando…' : 'Enviar'}
              </ModalButton>
            </Actions>
          </ModalCard>
        </Overlay>
      )}

      {status && <StatusMessage error={status.error}>{status.message}</StatusMessage>}
    </>
  );
};

export default SaveMap;
