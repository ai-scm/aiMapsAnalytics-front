function buildLayerTree(layers) {
  const root = [];

  layers.forEach(layer => {
    const pathParts = layer.path === '/' ? [] : layer.path.split('/').filter(Boolean);
    let currentLevel = root;

    if (layer.path === '/') {
      currentLevel.push({
        id: layer.id,
        dataId: layer.dataId,
        label: layer.label,
        isVisible: layer.isVisible
      });
      return;
    }

    pathParts.forEach((part, index) => {
      let existingPath = currentLevel.find(node => node.label === part);

      if (!existingPath) {
        existingPath = {label: part, children: []};
        currentLevel.push(existingPath);
      }

      if (index === pathParts.length - 1) {
        existingPath.children.push({
          id: layer.id,
          dataId: layer.dataId,
          label: layer.label,
          isVisible: layer.isVisible
        });
      }

      currentLevel = existingPath.children;
    });
  });

  return root;
}

export function getLayersFromKepler(keplerMap) {
  const layers = keplerMap?.visState?.layers || [];
  const categoryLayers = layers
    .filter(layer => layer?.config?.path)
    .map(layer => ({
      id: layer.id,
      path: layer.config.path,
      dataId: layer.config.dataId,
      label: layer.config.label,
      isVisible: layer.config.isVisible
    }));

  return buildLayerTree(categoryLayers);
}

export default getLayersFromKepler;
