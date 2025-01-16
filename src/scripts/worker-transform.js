importScripts('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');

self.onmessage = async ({ data }) => {
  const { files } = data;
  const zip = new JSZip();
  const totalFiles = files.length;

  for (let i = 0; i < totalFiles; i++) {
    const file = files[i];
    const reader = new FileReaderSync();
    const text = reader.readAsText(file);
    zip.file(file.name, text);

    // 回報進度
    self.postMessage({ status: 'progress', progress: Math.floor((i / totalFiles) * 100) });
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  self.postMessage({ status: 'complete', zipBlob });
};
