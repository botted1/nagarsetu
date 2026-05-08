import { Storage, type StorageOptions } from "@google-cloud/storage";
import { promises as fs } from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";

const bucketName = process.env.GCS_BUCKET;

// Two ways to authenticate:
// 1. Local dev: GOOGLE_APPLICATION_CREDENTIALS = absolute path to JSON key file.
// 2. Vercel / serverless: GCS_CREDENTIALS_JSON = the entire JSON key inlined as
//    a single env var. This is the standard pattern when the runtime has no
//    persistent filesystem.
function buildStorage(): Storage | null {
  if (!bucketName) return null;

  const inlineJson = process.env.GCS_CREDENTIALS_JSON?.trim();
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  const opts: StorageOptions = {};
  if (inlineJson) {
    try {
      opts.credentials = JSON.parse(inlineJson);
    } catch (err) {
      console.error(
        "[storage] GCS_CREDENTIALS_JSON is set but is not valid JSON:",
        err
      );
      return null;
    }
  } else if (keyPath) {
    opts.keyFilename = keyPath;
  } else {
    return null;
  }
  return new Storage(opts);
}

const gcs = buildStorage();

export async function uploadPhoto(
  file: File
): Promise<{ url: string; storage: "gcs" | "local" }> {
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const key = `grievances/${new Date().toISOString().slice(0, 10)}/${nanoid(12)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (gcs && bucketName) {
    const bucket = gcs.bucket(bucketName);
    const target = bucket.file(key);
    await target.save(buffer, {
      contentType: file.type || "image/jpeg",
      resumable: false,
    });
    const [signed] = await target.getSignedUrl({
      action: "read",
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
    });
    return { url: signed, storage: "gcs" };
  }

  // Local fallback. Note: this won't survive on Vercel (read-only FS), so
  // configure GCS for any deployed environment.
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const subDir = path.dirname(key);
  await fs.mkdir(path.join(uploadsDir, subDir), { recursive: true });
  await fs.writeFile(path.join(uploadsDir, key), buffer);
  return { url: `/uploads/${key}`, storage: "local" };
}
