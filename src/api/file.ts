import axios, { type AxiosProgressEvent } from 'axios';

const CHUNK_SIZE = 10 * 1024 * 1024; // 每块 10MB (S3 分片要求除最后一块外至少 5MB)

const PutFile = async (
    filename: string, 
    file: File | string, 
    visibility: string, 
    type: string = "file",
    onProgress?: (progress: number) => void
) => {
    // 文本内容或者小于 10MB 的小文件，维持普通单次 PUT 上传
    if (typeof file === 'string' || file.size < CHUNK_SIZE) {
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

    // ========== 大文件并发分片上传 ==========
    const fileSize = file.size;
    const totalParts = Math.ceil(fileSize / CHUNK_SIZE);
    const encodedFilename = encodeURIComponent(filename);
    
    // 1. 发起请求：创建 Multipart Upload 任务
    const initHeaders = {
        'x-store-visibility': visibility,
        'x-store-type': type,
    };
    const initRes = await axios.post(`/api/multipart?action=create&filename=${encodedFilename}`, null, { headers: initHeaders });
    const uploadId = initRes.data.uploadId;

    try {
        const parts: { PartNumber: number, ETag: string }[] = [];
        const partProgress = new Array(totalParts).fill(0);
        let hasError = false;

        // 并发控制：最多同时上传 3 个分片防止浏览器/网络堵塞
        const concurrency = 3; 
        const queue = Array.from({ length: totalParts }, (_, i) => i);

        const uploadWorker = async () => {
            while (queue.length > 0 && !hasError) {
                const index = queue.shift()!;
                const partNumber = index + 1;
                const start = index * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, fileSize);
                const chunk = file.slice(start, end); // Blob API 不会读取进内存，仅仅是引用指针

                const uploadRes = await axios.post(
                    `/api/multipart?action=upload&filename=${encodedFilename}&uploadId=${uploadId}&partNumber=${partNumber}`, 
                    chunk,
                    {
                        headers: { 'Content-Type': 'application/octet-stream' },
                        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
                            if (progressEvent.loaded) {
                                // 实时累加所有分片的进度，实现平滑进度条
                                partProgress[index] = progressEvent.loaded;
                                const totalLoaded = partProgress.reduce((a, b) => a + b, 0);
                                if (onProgress) {
                                    // 预留 1% 给最后的合并接口
                                    const percent = Math.round((totalLoaded * 99) / fileSize); 
                                    onProgress(percent);
                                }
                            }
                        }
                    }
                );
                parts.push({ PartNumber: partNumber, ETag: uploadRes.data.etag });
            }
        };

        // 启动并发池
        const workers = Array(concurrency).fill(null).map(() => uploadWorker());
        await Promise.all(workers);

        if (hasError) throw new Error("Upload part failed");

        // 2. 发起请求：通知 R2 合并所有上传完毕的分片
        // AWS SDK 严格要求传过去的 parts 数组必须按照 PartNumber 升序排列
        parts.sort((a, b) => a.PartNumber - b.PartNumber);
        const completeRes = await axios.post(`/api/multipart?action=complete&filename=${encodedFilename}&uploadId=${uploadId}`, { parts });
        
        if (onProgress) onProgress(100);
        return completeRes.data;

    } catch (error) {
        // 3. 发生异常时：终止任务，清理云端已经上传的废弃分片，防止占用 R2 容量
        await axios.post(`/api/multipart?action=abort&filename=${encodedFilename}&uploadId=${uploadId}`);
        throw error;
    }
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
    const url = `/${encodeURIComponent(filename)}`;
    const response = await axios.delete(url);
    return response.data;
}

export { PutFile, PatchFile, DeleteFile }
