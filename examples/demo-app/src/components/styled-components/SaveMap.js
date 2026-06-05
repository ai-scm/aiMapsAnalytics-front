import React, {useEffect, useRef, useState} from 'react';
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

const SelectWrapper = styled.div`
  position: relative;
`;

const SelectTrigger = styled.button`
  width: 100%;
  padding: 8px 10px;
  border-radius: 2px;
  border: 1px solid ${props => props.theme.inputBorderColor || '#d5dbe3'};
  background: ${props => props.theme.inputBgd || '#f7f7f7'};
  color: ${props => props.theme.textColorHl || '#ffffff'};
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  text-align: left;

  &:focus {
    outline: 1px solid ${props => props.theme.activeColor || '#2473bd'};
    background: ${props => props.theme.inputBgdActive || '#ffffff'};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SelectValue = styled.span`
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SelectPlaceholder = styled(SelectValue)`
  color: ${props => props.theme.textColor || '#6b7280'};
`;

const SelectMenu = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 20;
  max-height: 220px;
  overflow-y: auto;
  border-radius: 2px;
  border: 1px solid ${props => props.theme.panelBorderColor || '#d5dbe3'};
  background: ${props => props.theme.dropdownListBgd || '#ffffff'};
  box-shadow: 0 8px 20px rgba(31, 41, 55, 0.18);
`;

const SelectOption = styled.button`
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: ${props =>
    props.$selected
      ? props.theme.dropdownListHighlightBg || '#e6eef7'
      : props.theme.dropdownListBgd || '#ffffff'};
  color: ${props =>
    props.$selected
      ? props.theme.textColorHl || '#111827'
      : props.theme.textColor || '#4a5568'};
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: ${props => props.theme.dropdownListHighlightBg || '#e6eef7'};
    color: ${props => props.theme.textColorHl || '#111827'};
  }
`;

const EmptyOption = styled.div`
  padding: 10px;
  font-size: 12px;
  color: ${props => props.theme.textColor || '#6b7280'};
`;

const OptionIndicator = styled.span`
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  border-radius: 2px;
  border: 1px solid
    ${props =>
      props.$selected
        ? props.theme.activeColor || '#2473bd'
        : props.theme.inputBorderColor || '#d5dbe3'};
  background: ${props =>
    props.$selected ? props.theme.activeColor || '#2473bd' : 'transparent'};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.theme.primaryBtnActColor || '#ffffff'};
`;

const OptionLabel = styled.span`
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FieldHint = styled.span`
  color: ${props => props.theme.textColor || '#6b7280'};
  font-size: 11px;
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

const initialForm = {title: '', description: '', groups: []};

const SaveIconOriginal = ({height = '18px'}) => (
  <svg width={height} height={height} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V7zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6m3-10H5V5h10z" />
  </svg>
)

const SaveAsMapIcon = ({height = '18px'}) => (
  <svg
    width={height}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 21a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10l6 6v2.5" />
    <path d="M7 3v5h8" />
    <path d="M7 21v-6a1 1 0 0 1 1-1h4" />
    <path d="m15 18 4.5-4.5 1.5 1.5-4.5 4.5H15z" />
  </svg>
)

const SaveMap = ({uId, catalogMap, isExport, className}) => {
  const dispatch = useDispatch()
  const store = useStore()
  const map = useSelector(state => state.demo?.keplerGl?.map)
  const catalogUId = uId ?? catalogMap?.uId
  const catalogFileName = catalogMap?.fileName
  const groupSelectRef = useRef(null)

  const [
    getGroups,
    {data: groups = [], isFetching: isLoadingGroups, isError: hasGroupsError}
  ] = useLazyGetGroupsQuery()
  const [uploadItemMap, {isLoading: isUploading}] = useUploadItemMapMutation()
  const [updateItemJson, {isLoading: isUpdating}] = useUpdateItemJsonMutation()

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null)
  const [isGroupsMenuOpen, setGroupsMenuOpen] = useState(false)
  const [isCapturingThumbnail, setIsCapturingThumbnail] = useState(false)

  const busy = isUploading || isUpdating || isCapturingThumbnail
  const canSubmit = !busy && !isLoadingGroups && !hasGroupsError

  useEffect(() => {
    if (!status) return undefined
    const id = setTimeout(() => setStatus(null), 5000)
    return () => clearTimeout(id)
  }, [status])

  useEffect(() => {
    if (!isGroupsMenuOpen) return undefined

    const handlePointerDown = event => {
      if (!groupSelectRef.current?.contains(event.target)) {
        setGroupsMenuOpen(false)
      }
    }

    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        setGroupsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isGroupsMenuOpen])

  const buildSavedMap = () => KeplerGlSchema.save(map)

  const buildMapFile = () => {
    const savedMap = buildSavedMap()
    const fileName = `${crypto.randomUUID()}.map.json`
    const blob = new Blob([JSON.stringify(savedMap)], {type: 'application/json'})
    return new File([blob], fileName, {type: 'application/json'})
  }

  const appendThumbnail = async formData => {
    setIsCapturingThumbnail(true)
    try {
      const imageBlob = await captureMapImageBlob(dispatch, store.getState)
      formData.append('thumbnail', imageBlob, 'kepler-map.png')
    } finally {
      setIsCapturingThumbnail(false)
    }
  }

  const closeModal = () => {
    if (busy) return
    setGroupsMenuOpen(false)
    setOpen(false)
  }

  const resetFormErrors = key => {
    setErrors(prev => {
      if (!prev[key]) return prev
      return {...prev, [key]: undefined}
    })
  }

  const handleCreate = async event => {
    event.preventDefault()

    const nextErrors = {}
    if (!form.title.trim()) nextErrors.title = 'El título es obligatorio'
    if (!form.description.trim()) nextErrors.description = 'La descripción es obligatoria'
    if (form.description.length > MAX_DESCRIPTION_LENGTH) {
      nextErrors.description = `La descripción no puede superar los ${MAX_DESCRIPTION_LENGTH} caracteres`
    }
    if (!form.groups.length) nextErrors.groups = 'Debes seleccionar al menos un grupo'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    try {
      const formData = new FormData()
      formData.append('file', buildMapFile())
      await appendThumbnail(formData)
      formData.append('title', form.title.trim())
      formData.append('description', form.description.trim())
      form.groups.forEach(group => formData.append('groups', group))

      await uploadItemMap(formData).unwrap()
      setStatus({message: 'Mapa guardado correctamente', error: false})
      setGroupsMenuOpen(false)
      setOpen(false)
      setForm(initialForm)
      setErrors({})
    } catch (error) {
      console.error('Error guardando el mapa', error)
      setStatus({message: error?.message || 'Error al guardar el mapa', error: true})
    }
  }

  const handleUpdate = async () => {
    if (!catalogUId) return

    try {
      const formData = new FormData()
      formData.append('file', buildMapFile())
      await appendThumbnail(formData)

      await updateItemJson({uuidNumber: catalogUId, formData}).unwrap()
      setStatus({message: 'Mapa actualizado correctamente', error: false})
    } catch (error) {
      console.error('Error actualizando el mapa', error)
      setStatus({message: error?.message || 'Error al actualizar el mapa', error: true})
    }
  }

  const handleExportJson = () => {
    try {
      const savedMap = buildSavedMap()
      const fileName = catalogFileName || `kepler-map-${Date.now()}.json`
      downloadJsonFile(savedMap, fileName)
      setStatus({message: 'Mapa exportado correctamente', error: false})
    } catch (error) {
      console.error('Error exportando el mapa', error)
      setStatus({message: 'Error al exportar el mapa', error: true})
    }
  }

  const updateField = key => event => {
    const {value} = event.target
    setForm(prev => ({...prev, [key]: value}))
    resetFormErrors(key)
  }

  const toggleGroup = groupId => {
    setForm(prev => {
      const alreadySelected = prev.groups.includes(groupId)
      return {
        ...prev,
        groups: alreadySelected
          ? prev.groups.filter(id => id !== groupId)
          : [...prev.groups, groupId]
      }
    })
    resetFormErrors('groups')
  }

  const handleOpenCreate = () => {
    setErrors({})
    setForm(initialForm)
    setGroupsMenuOpen(false)
    setOpen(true)
    getGroups(undefined, true)
  }

  const selectedGroupTitles = groups
    .filter(group => form.groups.includes(group.uuid))
    .map(group => group.title)

  let selectedGroupsLabel = ''
  if (!selectedGroupTitles.length) {
    selectedGroupsLabel = 'Selecciona uno o más grupos'
  } else if (selectedGroupTitles.length <= 2) {
    selectedGroupsLabel = selectedGroupTitles.join(', ')
  } else {
    selectedGroupsLabel = `${selectedGroupTitles.length} grupos seleccionados`
  }

  if (isExport) {
    return null
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
          <SaveIconOriginal height="18px" />
        </MapControlButton>

        {catalogUId && (
          <MapControlButton
            type="button"
            aria-label="Guardar"
            title="Guardar"
            disabled={busy}
            onClick={handleUpdate}
          >
            <SaveAsMapIcon height="18px" />
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
        <Overlay onClick={closeModal}>
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
              <SelectWrapper ref={groupSelectRef}>
                <SelectTrigger
                  type="button"
                  onClick={() => setGroupsMenuOpen(prev => !prev)}
                  disabled={busy || isLoadingGroups || hasGroupsError}
                  aria-expanded={isGroupsMenuOpen}
                >
                  {form.groups.length ? (
                    <SelectValue>{selectedGroupsLabel}</SelectValue>
                  ) : (
                    <SelectPlaceholder>{selectedGroupsLabel}</SelectPlaceholder>
                  )}
                  <Icons.ArrowDown height="16px" />
                </SelectTrigger>

                {isGroupsMenuOpen && (
                  <SelectMenu>
                    {groups.length ? (
                      groups.map(group => {
                        const isSelected = form.groups.includes(group.uuid)
                        return (
                          <SelectOption
                            key={group.uuid}
                            type="button"
                            $selected={isSelected}
                            onClick={() => toggleGroup(group.uuid)}
                          >
                            <OptionIndicator $selected={isSelected}>
                              {isSelected ? <Icons.Checkmark height="10px" /> : null}
                            </OptionIndicator>
                            <OptionLabel>{group.title}</OptionLabel>
                          </SelectOption>
                        )
                      })
                    ) : (
                      <EmptyOption>No hay grupos disponibles</EmptyOption>
                    )}
                  </SelectMenu>
                )}
              </SelectWrapper>
              {isLoadingGroups && <FieldHint>Cargando grupos...</FieldHint>}
              {hasGroupsError && <FieldError>Error cargando grupos</FieldError>}
              {!isLoadingGroups && !hasGroupsError && !errors.groups ? (
                <FieldHint>Selecciona uno o más grupos para el mapa</FieldHint>
              ) : null}
              {errors.groups && <FieldError>{errors.groups}</FieldError>}
            </Field>

            <Actions>
              <ModalButton type="button" onClick={closeModal} disabled={busy}>
                Cancelar
              </ModalButton>
              <ModalButton type="submit" primary disabled={!canSubmit}>
                {isCapturingThumbnail ? 'Preparando mapa...' : busy ? 'Guardando...' : 'Enviar'}
              </ModalButton>
            </Actions>
          </ModalCard>
        </Overlay>
      )}

      {status && <StatusMessage error={status.error}>{status.message}</StatusMessage>}
    </>
  )
}

export default SaveMap
