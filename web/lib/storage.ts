import { Storage } from "@google-cloud/storage";
import { promises as fs } from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";

const bucketName = process.env.GCS_BUCKET;
const useGcs = Boolean(
  bucketName && process.env.GOOGLE_APPLICATION_CREDENTIALS
);

const gcs = useGcs ? new Storage() : null;

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

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const subDir = path.dirname(key);
  await fs.mkdir(path.join(uploadsDir, subDir), { recursive: true });
  await fs.writeFile(path.join(uploadsDir, key), buffer);
  return { url: `/uploads/${key}`, storage: "local" };
}
