import axios, { type AxiosProgressEvent } from 'axios';

const PutFile = async (
    filename: string, 
    file: File | string, 
    visibility: string, 
    type: string = "file",
    onProgress?: (progress: number) => void
) => {
    const url = `/${filename}`;
    const headers = {
        'x-store-visibility': visibility,
        'x-store-type': type,
    };
    const response = await axios.put(url, file, { 
        headers,
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            if (onProgress && progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            }
        }
    });
    return response.data;
}

const PatchFile = async (filename: string, visibility?: string) => {
    const url = `/${filename}`;
    const headers: { [key: string]: any } = {};
    if (visibility) {
        headers['x-store-visibility'] = visibility;
    }
    const response = await axios.patch(url, {}, { headers });
    return response.data;
}

const DeleteFile = async (filename: string) => {
    const url = `/${filename}`;
    const response = await axios.delete(url);
    return response.data;
}

export { PutFile, PatchFile, DeleteFile }
