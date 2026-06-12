import React, {useMemo, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import styled from 'styled-components';
import {Icons, MapControlButton} from '@kepler.gl/components';
import {layerConfigChange} from '@kepler.gl/actions';

import {getLayersFromKepler} from './getLayersFromKepler';
import ControlTooltip from './ControlTooltip';

const Panel = styled.div`
  position: absolute;
  top: 0;
  right: 44px;
  z-index: 2;
  width: 320px;
  max-width: calc(100vw - 96px);
  max-height: calc(100vh - 96px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid ${props => props.theme.panelBorderColor || '#d5dbe3'};
  background: ${props => props.theme.panelBackgroundLT || '#ffffff'};
  box-shadow: ${props => props.theme.panelBoxShadow || '0 6px 12px rgba(31, 41, 55, 0.12)'};
`;

const Title = styled.h3`
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: ${props => props.theme.titleTextColor || '#000000'};
`;

const SearchInput = styled.input`
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border-radius: 2px;
  border: 1px solid ${props => props.theme.inputBorderColor || '#d5dbe3'};
  background: ${props => props.theme.inputBgd || '#f7f7f7'};
  color: ${props => props.theme.inputColor || '#29323c'};
  font-size: 12px;

  &:focus {
    outline: 1px solid ${props => props.theme.activeColor || '#2473bd'};
    background: ${props => props.theme.inputBgdActive || '#ffffff'};
  }
`;

const Tree = styled.div`
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Empty = styled.div`
  color: ${props => props.theme.subtextColor || '#6a7485'};
  font-size: 12px;
  line-height: 1.5;
`;

const NodeRow = styled.button`
  width: 100%;
  height: 28px;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 0 6px;
  border: 0;
  border-radius: 2px;
  background: transparent;
  color: ${props => (props.muted ? props.theme.subtextColor : props.theme.textColor)};
  cursor: pointer;
  text-align: left;

  &:hover {
    background: ${props => props.theme.dropdownListHighlightBg || '#f0f0f0'};
    color: ${props => props.theme.textColorHl || '#2473bd'};
  }
`;

const NodeLabel = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
`;

const Children = styled.div`
  margin-left: 16px;
`;

function filterTree(nodes, search) {
  if (!search || search.length < 3) {
    return nodes;
  }

  const needle = search.toLowerCase();
  return nodes
    .map(node => {
      const labelMatches = node.label.toLowerCase().includes(needle);
      const children = node.children ? filterTree(node.children, search) : [];

      if (labelMatches || children.length) {
        return {...node, children};
      }
      return null;
    })
    .filter(Boolean);
}

function LayerNode({node, layerById, expandedFolders, onToggleFolder, onToggleLayer}) {
  const isFolder = Boolean(node.children?.length);
  const currentLayer = node.id ? layerById.get(node.id) : null;
  const isVisible = currentLayer?.config?.isVisible ?? node.isVisible;
  const isExpanded = expandedFolders.has(node.label);

  if (isFolder) {
    return (
      <>
        <NodeRow type="button" onClick={() => onToggleFolder(node.label)}>
          {isExpanded ? <Icons.ArrowDown height="14px" /> : <Icons.ArrowRight height="14px" />}
          <NodeLabel title={node.label}>{node.label}</NodeLabel>
        </NodeRow>
        {isExpanded && (
          <Children>
            {node.children.map(child => (
              <LayerNode
                key={child.id || child.label}
                node={child}
                layerById={layerById}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                onToggleLayer={onToggleLayer}
              />
            ))}
          </Children>
        )}
      </>
    );
  }

  return (
    <NodeRow type="button" muted={!isVisible} onClick={() => onToggleLayer(node.id)}>
      {isVisible ? <Icons.EyeSeen height="14px" /> : <Icons.EyeUnseen height="14px" />}
      <NodeLabel title={node.label}>{node.label}</NodeLabel>
    </NodeRow>
  );
}

export default function LayerCategoriesControl({isExport}) {
  const dispatch = useDispatch();
  const map = useSelector(state => state.demo?.keplerGl?.map);
  const layers = map?.visState?.layers || [];
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedFolders, setExpandedFolders] = useState(new Set());

  const categoryTree = useMemo(() => getLayersFromKepler(map), [map]);
  const visibleTree = useMemo(() => filterTree(categoryTree, search), [categoryTree, search]);
  const layerById = useMemo(() => new Map(layers.map(layer => [layer.id, layer])), [layers]);

  const toggleFolder = label => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const toggleLayer = layerId => {
    const layer = layerById.get(layerId);
    if (!layer) {
      return;
    }

    dispatch(layerConfigChange(layer, {isVisible: !layer.config.isVisible}));
  };

  if (isExport) {
    return null;
  }

  return (
    <>
      <ControlTooltip id="action-layer-categories" label="Catálogo de mapas">
        <MapControlButton
          type="button"
          aria-label="Catálogo de mapas"
          active={open}
          onClick={() => setOpen(value => !value)}
        >
          <Icons.Layers height="18px" />
        </MapControlButton>
      </ControlTooltip>

      {open && (
        <Panel>
          <Title>Catálogo de mapas</Title>
          <SearchInput
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Buscar capa"
            aria-label="Buscar capa"
          />
          <Tree>
            {visibleTree.length ? (
              visibleTree.map(node => (
                <LayerNode
                  key={node.id || node.label}
                  node={node}
                  layerById={layerById}
                  expandedFolders={expandedFolders}
                  onToggleFolder={toggleFolder}
                  onToggleLayer={toggleLayer}
                />
              ))
            ) : (
              <Empty>No hay capas con categoría para mostrar.</Empty>
            )}
          </Tree>
        </Panel>
      )}
    </>
  );
}
