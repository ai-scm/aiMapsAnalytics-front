import Window from 'global/window';

export function downloadJsonFile(jsonData, filename) {
  const fileBlob = new Blob([JSON.stringify(jsonData, null, 2)], {
    type: 'application/json'
  });

  const url = URL.createObjectURL(fileBlob);
  const link = Window.document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);

  Window.document.body.appendChild(link);
  link.click();
  Window.document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default downloadJsonFile;
