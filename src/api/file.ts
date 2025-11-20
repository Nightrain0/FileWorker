import axios, { type AxiosProgressEvent } from 'axios';

const PutFile = async (
    filename: string, 
    file: File | string, 
    visibility: string, 
    type: string = "file",
    onProgress?: (progress: number) => void
) => {
    // 同样建议对上传路径进行编码，防止特殊字符导致路径错误
    const url = `/${encodeURIComponent(filename)}`;
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
    const url = `/${encodeURIComponent(filename)}`;
    const headers: { [key: string]: any } = {};
    if (visibility) {
        headers['x-store-visibility'] = visibility;
    }
    const response = await axios.patch(url, {}, { headers });
    return response.data;
}

const DeleteFile = async (filename: string) => {
    // 修复：必须使用 encodeURIComponent 编码文件名
    // 否则 "foo bar.txt" 可能变成 "foo%20bar.txt" (浏览器自动处理空格通常没问题)，
    // 但 "foo#bar.txt" 会被截断为 "foo"，导致删除错误的文件或找不到文件。
    const url = `/${encodeURIComponent(filename)}`;
    const response = await axios.delete(url);
    return response.data;
}

export { PutFile, PatchFile, DeleteFile }
