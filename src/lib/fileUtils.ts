
// Note: These functions are intended for client-side use due to FileReader and fetch on data URIs.

export function blobToDataURI(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read blob as Data URI.'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function dataURIToBlob(dataURI: string): Promise<Blob> {
  try {
    const response = await fetch(dataURI);
    if (!response.ok) {
      throw new Error(`Failed to fetch data URI: ${response.statusText}`);
    }
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error("Error converting data URI to Blob:", error);
    throw error;
  }
}
