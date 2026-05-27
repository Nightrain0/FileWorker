import {
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand
} from "@aws-sdk/client-s3";
import Env from '../utils/Env';
import { createS3Client, auth } from '../utils/utils';

const decode = (str: string) => {
    try {
        return decodeURIComponent(str);
    } catch (e) {
        return str;
    }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { request, env } = context;
    if (!auth(env, request)) {
        return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const filename = decode(url.searchParams.get("filename") || "");
    const uploadId = url.searchParams.get("uploadId");
    
    if (!filename) return new Response("Missing filename", { status: 400 });

    const { BUCKET } = env;
    const s3 = createS3Client(env);

    try {
        if (action === "create") {
            const headers = new Headers(request.headers);
            const x_store_headers = [];
            for (const [key, value] of headers.entries()) {
                if (key.startsWith('x-store-')) {
                    x_store_headers.push([key, value]);
                }
            }
            // 1. 初始化分片上传任务
            const command = new CreateMultipartUploadCommand({
                Bucket: BUCKET!,
                Key: filename,
                Metadata: Object.fromEntries(x_store_headers)
            });
            const res = await s3.send(command);
            return new Response(JSON.stringify({ uploadId: res.UploadId }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
        } 
        else if (action === "upload") {
            const partNumber = parseInt(url.searchParams.get("partNumber") || "0");
            if (!uploadId || !partNumber) return new Response("Missing uploadId or partNumber", { status: 400 });
            
            // 2. 上传单个分片
            const command = new UploadPartCommand({
                Bucket: BUCKET!,
                Key: filename,
                UploadId: uploadId,
                PartNumber: partNumber,
                Body: request.body,
                ContentLength: parseInt(request.headers.get("content-length") || "0")
            });
            const res = await s3.send(command);
            return new Response(JSON.stringify({ etag: res.ETag }), { 
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        else if (action === "complete") {
            if (!uploadId) return new Response("Missing uploadId", { status: 400 });
            const body = await request.json() as { parts: { PartNumber: number, ETag: string }[] };
            
            // 3. 完成上传并合并分片
            const command = new CompleteMultipartUploadCommand({
                Bucket: BUCKET!,
                Key: filename,
                UploadId: uploadId,
                MultipartUpload: {
                    Parts: body.parts
                }
            });
            await s3.send(command);
            return new Response("OK", { status: 200 });
        }
        else if (action === "abort") {
            if (!uploadId) return new Response("Missing uploadId", { status: 400 });
            
            // 4. 中止上传（清理垃圾分片）
            const command = new AbortMultipartUploadCommand({
                Bucket: BUCKET!,
                Key: filename,
                UploadId: uploadId
            });
            await s3.send(command);
            return new Response("OK", { status: 200 });
        }
        return new Response("Invalid action", { status: 400 });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
