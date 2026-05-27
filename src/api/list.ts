import type { ListObjectsV2Output } from '@aws-sdk/client-s3';
import axios from 'axios';

export const ListFiles = async (
    MaxKeys?: string, 
    Prefix?: string, 
    ContinuationToken?: string,
    Delimiter?: string // 新增分隔符参数
): Promise<ListObjectsV2Output> => {
    const endpoint = "/api/list";
    const params = new URLSearchParams();
    if (MaxKeys) {
        params.append("MaxKeys", MaxKeys);
    }
    if (Prefix) {
        params.append("Prefix", Prefix);
    }
    if (ContinuationToken) {
        params.append("ContinuationToken", ContinuationToken);
    }
    if (Delimiter) {
        params.append("Delimiter", Delimiter);
    }
    const res = await axios.get(endpoint, {
        params,
    });
    return res.data;
};
