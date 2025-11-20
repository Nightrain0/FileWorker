import { GetObjectCommand, CopyObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import mime from 'mime/lite';

import Env from './utils/Env';
import { createS3Client, auth } from './utils/utils';

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const { params, env } = context;
    const { filename } = params;
    const { BUCKET } = env;
    const s3 = createS3Client(env);
    const command = new GetObjectCommand({
        Bucket: BUCKET!,
        Key: filename as string
    });
    let response: GetObjectCommandOutput;
    try {
        response = await s3.send(command);
    } catch (e) {
        return new Response("Not found", { status: 404 });
    }
    const headers = new Headers();
    for (const [key, value] of Object.entries(response.Metadata)) {
        headers.set(key, value);
    }
    if (response.ContentType !== "application/octet-stream") {
        headers.set('content-type', response.ContentType);
    } else {
        headers.set('content-type', mime.getType(filename as string) || "application/octet-stream");
    }
    if (response.Metadata['x-store-type'] === "text") {
        headers.set('content-type', 'text/plain;charset=utf-8');
    }
    headers.set('content-length', response.ContentLength.toString());
    headers.set('last-modified', response.LastModified.toUTCString());

    headers.set('etag', response.ETag);

    if (headers.get("x-store-visibility") !== "public" && !auth(env, context.request)) {
        return new Response("Not found", { status: 404 });
    }
    return new Response(
        response.Body.transformToWebStream(),
        {
            headers,
        }
    );
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
    const { params, env, request } = context;
    if (!auth(env, request)) {
        return new Response("Unauthorized", { status: 401 });
    }
    const { filename } = params;
    const { BUCKET } = env;
    const s3 = createS3Client(env);
    const headers = new Headers(request.headers);
    const x_store_headers = [];
    for (const [key, value] of headers.entries()) {
        if (key.startsWith('x-store-')) {
            x_store_headers.push([key, value]);
        }
    }
    const parallelUploads3 = new Upload({
        client: s3,
        params: { Bucket: BUCKET, Key: filename as string, Body: request.body, Metadata: Object.fromEntries(x_store_headers) },
        queueSize: 4, // optional concurrency configuration
        partSize: 1024 * 1024 * 5, // optional size of each part, in bytes, at least 5MB
        leavePartsOnError: false, // optional manually handle dropped parts
    });
    await parallelUploads3.done();
    return new Response("OK", { status: 200 });
}

export const onRequestPatch: PagesFunction<Env> = async (context) => {
    const { params, env, request } = context;
    if (!auth(env, request)) {
        return new Response("Unauthorized", { status: 401 });
    }
    const { filename } = params;
    const { BUCKET } = env;
    const s3 = createS3Client(env);
    const headers = new Headers(request.headers);
    const x_store_headers = [];
    for (const [key, value] of headers.entries()) {
        if (key.startsWith('x-store-')) {
            x_store_headers.push([key, value]);
        }
    }
    const command = new CopyObjectCommand({
        Bucket: BUCKET!,
        CopySource: `${BUCKET}/${filename}`,
        Key: filename as string,
        MetadataDirective: "REPLACE",
        Metadata: Object.fromEntries(x_store_headers),
    });
    await s3.send(command);
    return new Response("OK", { status: 200 });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
    const { params, env, request } = context;
    // 1. 验证权限 (401)
    if (!auth(env, request)) {
        return new Response("Unauthorized", { status: 401 });
    }
    
    const { filename } = params;
    const { BUCKET } = env;
    const s3 = createS3Client(env);
    
    // 2. 执行删除
    const command = new DeleteObjectCommand({
        Bucket: BUCKET!,
        Key: filename as string
    });

    try {
        await s3.send(command);
        return new Response("OK", { status: 200 });
    } catch (error: any) {
        // 策略升级：如果在删除过程中 SDK 报错，我们进行“二次核实”
        
        // 1. 先检查是不是 204/200 这种“成功”的状态码被当成了错误
        if (error?.$metadata?.httpStatusCode === 204 || error?.$metadata?.httpStatusCode === 200) {
            return new Response("OK", { status: 200 });
        }

        // 2. 如果状态码不对，或者没有状态码，我们尝试查询一下这个文件还在不在
        try {
            // 发送 HeadObject 请求来检查文件是否存在
            await s3.send(new HeadObjectCommand({ 
                Bucket: BUCKET!, 
                Key: filename as string 
            }));
            
            // 如果代码执行到这里，说明 HeadObject 成功了，也就是说文件**还在**。
            // 那么删除是真的失败了，我们需要把原始错误抛给前端。
        } catch (headError: any) {
            // 如果 HeadObject 抛出了 NotFound (404)，说明文件**已经不存在了**。
            // 这意味着删除操作实际上是成功的（或者文件本来就不在），我们可以放心地返回 200 OK。
            if (headError.name === 'NotFound' || headError.$metadata?.httpStatusCode === 404) {
                return new Response("OK", { status: 200 });
            }
            // 如果是其他错误（比如 403 Forbidden），那说明我们甚至无法检查文件，那就还是报错吧。
        }

        // 如果以上补救措施都无效，返回原始错误信息
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export const onRequest: PagesFunction<Env> = async () => {
    return new Response("Method not allowed", { status: 405 });
};
