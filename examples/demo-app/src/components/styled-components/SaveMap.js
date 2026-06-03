import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector, useStore} from 'react-redux';
import styled from 'styled-components';
import KeplerGlSchema from '@kepler.gl/schemas';

import {
  useGetGroupsQuery,
  useUploadItemMapMutation,
  useUpdateItemJsonMutation
} from './apiSlice';
import {captureMapImageBlob} from './exportMapImage';

const MAX_DESCRIPTION_LENGTH = 255;

/* ----------------------------- styled-components ---------------------------- */

const FloatingButtons = styled.div`
  position: absolute;
  z-index: 100;
  top: 322px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const IconButton = styled.button`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  padding: 0;
  color: ${props => props.theme.textColorHl || '#ffffff'};
  background-color: ${props => props.theme.secondaryBtnBgd || '#3a414c'};

  &:hover {
    background-color: ${props => props.theme.secondaryBtnBgdHover || '#4b5563'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const Tooltip = styled.span`
  position: absolute;
  right: 40px;
  white-space: nowrap;
  padding: 4px 8px;
  font-size: 11px;
  border-radius: 2px;
  color: ${props => props.theme.textColorHl || '#ffffff'};
  background-color: ${props => props.theme.tooltipBg || '#111317'};
  pointer-events: none;
`;

const ButtonRow = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
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
  color: ${props => props.theme.textColor || '#a0a7b4'};
  background: ${props => props.theme.panelBackground || '#29323c'};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
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
  border: 1px solid ${props => props.theme.inputBorderColor || '#3a414c'};
  background: ${props => props.theme.inputBgd || '#1b242d'};
  color: ${props => props.theme.textColorHl || '#ffffff'};
  font-size: 13px;
`;

const TextArea = styled.textarea`
  padding: 8px;
  border-radius: 2px;
  min-height: 64px;
  resize: vertical;
  border: 1px solid ${props => props.theme.inputBorderColor || '#3a414c'};
  background: ${props => props.theme.inputBgd || '#1b242d'};
  color: ${props => props.theme.textColorHl || '#ffffff'};
  font-size: 13px;
`;

const MultiSelect = styled.select`
  padding: 8px;
  min-height: 96px;
  border-radius: 2px;
  border: 1px solid ${props => props.theme.inputBorderColor || '#3a414c'};
  background: ${props => props.theme.inputBgd || '#1b242d'};
  color: ${props => props.theme.textColorHl || '#ffffff'};
  font-size: 13px;
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
    props.primary ? props.theme.primaryBtnActColor || '#ffffff' : props.theme.textColor || '#a0a7b4'};
  background: ${props =>
    props.primary ? props.theme.primaryBtnBgd || '#0F9668' : 'transparent'};

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatusMessage = styled.div`
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 1100;
  padding: 10px 16px;
  border-radius: 2px;
  font-size: 13px;
  color: #ffffff;
  background: ${props => (props.error ? '#d64545' : '#0F9668')};
`;

/* --------------------------------- iconos ---------------------------------- */

const SaveAsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const SaveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
    <path d="M12 17v-3" strokeLinecap="round" />
  </svg>
);

/* ------------------------------- componente -------------------------------- */

const initialForm = {title: '', description: '', groups: []};

const SaveMap = ({uId}) => {
  const dispatch = useDispatch();
  const store = useStore();
  const map = useSelector(state => state.demo?.keplerGl?.map);

  const {data: groups = []} = useGetGroupsQuery();
  const [uploadItemMap, {isLoading: isUploading}] = useUploadItemMapMutation();
  const [updateItemJson, {isLoading: isUpdating}] = useUpdateItemJsonMutation();

  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null); // {message, error}

  const busy = isUploading || isUpdating;

  // Oculta el mensaje de estado tras unos segundos.
  useEffect(() => {
    if (!status) return undefined;
    const id = setTimeout(() => setStatus(null), 5000);
    return () => clearTimeout(id);
  }, [status]);

  const buildMapFile = () => {
    const savedMap = KeplerGlSchema.save(map);
    const fileName = `${crypto.randomUUID()}.map.json`;
    const blob = new Blob([JSON.stringify(savedMap)], {type: 'application/json'});
    return new File([blob], fileName, {type: 'application/json'});
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
      const imageBlob = await captureMapImageBlob(dispatch, store.getState);
      formData.append('thumbnail', imageBlob, 'kepler-map.png');
      formData.append('title', form.title);
      formData.append('description', form.description);
      form.groups.forEach(group => formData.append('groups', group));

      await uploadItemMap(formData).unwrap();
      setStatus({message: 'Mapa guardado correctamente', error: false});
      setOpen(false);
      setForm(initialForm);
    } catch (error) {
      console.error('Error guardando el mapa', error);
      setStatus({message: 'Error al guardar el mapa', error: true});
    }
  };

  // Guardar: actualiza el mapa existente (PUT /items/updateJson/{uId}).
  const handleUpdate = async () => {
    if (!uId) return;
    try {
      const formData = new FormData();
      formData.append('file', buildMapFile());
      const imageBlob = await captureMapImageBlob(dispatch, store.getState);
      formData.append('thumbnail', imageBlob, 'kepler-map.png');

      await updateItemJson({uuidNumber: uId, formData}).unwrap();
      setStatus({message: 'Mapa actualizado correctamente', error: false});
    } catch (error) {
      console.error('Error actualizando el mapa', error);
      setStatus({message: 'Error al actualizar el mapa', error: true});
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

  return (
    <>
      <FloatingButtons>
        <ButtonRow>
          {hovered === 'create' && <Tooltip>Guardar como</Tooltip>}
          <IconButton
            type="button"
            aria-label="Guardar como"
            disabled={busy}
            onMouseEnter={() => setHovered('create')}
            onMouseLeave={() => setHovered(null)}
            onClick={() => setOpen(true)}
          >
            <SaveAsIcon />
          </IconButton>
        </ButtonRow>

        {uId && (
          <ButtonRow>
            {hovered === 'update' && <Tooltip>Guardar</Tooltip>}
            <IconButton
              type="button"
              aria-label="Guardar"
              disabled={busy}
              onMouseEnter={() => setHovered('update')}
              onMouseLeave={() => setHovered(null)}
              onClick={handleUpdate}
            >
              <SaveIcon />
            </IconButton>
          </ButtonRow>
        )}
      </FloatingButtons>

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
              <MultiSelect multiple value={form.groups} onChange={handleGroupsChange}>
                {groups.map(group => (
                  <option key={group.uuid} value={group.uuid}>
                    {group.title}
                  </option>
                ))}
              </MultiSelect>
              {errors.groups && <FieldError>{errors.groups}</FieldError>}
            </Field>

            <Actions>
              <ModalButton type="button" onClick={() => setOpen(false)} disabled={busy}>
                Cancelar
              </ModalButton>
              <ModalButton type="submit" primary disabled={busy}>
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
