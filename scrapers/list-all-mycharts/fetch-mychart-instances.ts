/**
 * Fetches the complete list of MyChart instances from mychart.org,
 * downloads their logos, and uploads them to S3.
 *
 * Usage:
 *   bun scrapers/list-all-mycharts/fetch-mychart-instances.ts [--skip-logos] [--download-only] [--upload-only]
 *
 * Flags:
 *   --skip-logos      Skip logo downloading/uploading, only fetch the instance list
 *   --download-only   Download logos to disk but don't upload to S3
 *   --upload-only     Upload previously downloaded logos to S3 (skip download)
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";

const S3_BUCKET = "mychart-connector";
const S3_LOGO_PREFIX = "mychart-logos/";
const S3_REGION = "us-east-2";
const LOGOS_DIR = path.join(path.dirname(import.meta.path), "logos");
const OUTPUT_FILE = path.join(
  path.dirname(import.meta.path),
  "mychart-instances.json"
);
const MYCHART_DIRECTORY_URL = "https://www.mychart.org/LoginSignup";
const MYCHART_BASE_URL = "https://www.mychart.org";
const CONCURRENCY = 20;

interface MyChartCustomer {
  OrgID: string;
  Name: string;
  BrandName: string;
  Locations: string;
  ImageUrl: string;
  LoginUrl: string;
  SignupUrl: string;
  Aliases: string[];
  Hide: boolean;
  Live: boolean;
  LiveOnCentral: boolean;
}

interface MyChartInstance {
  name: string;
  url: string;
  logoUrl: string;
  logoS3Key: string;
  logoS3Url: string;
}

async function fetchDirectory(): Promise<MyChartCustomer[]> {
  console.log("Fetching MyChart directory from", MYCHART_DIRECTORY_URL);
  const response = await fetch(MYCHART_DIRECTORY_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
  });
  const html = await response.text();

  const match = html.match(
    /window\.PageContext\s*=\s*\{\s*Directory:\s*JSON\.parse\('(.+?)'\)/
  );
  if (!match) {
    throw new Error(
      "Could not find PageContext.Directory in page HTML. The page structure may have changed."
    );
  }

  // The JSON is single-quote escaped inside a JS string
  const jsonStr = match[1].replace(/\\'/g, "'").replace(/\\"/g, '"');
  const directory = JSON.parse(jsonStr);
  const customers: MyChartCustomer[] = directory.Customers;
  console.log(`Found ${customers.length} MyChart instances`);
  return customers;
}

function resolveImageUrl(imageUrl: string): string {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http")) return imageUrl;
  return `${MYCHART_BASE_URL}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
}

function customerToInstance(customer: MyChartCustomer): MyChartInstance {
  const fullImageUrl = resolveImageUrl(customer.ImageUrl);
  const imageFilename = fullImageUrl
    ? path.basename(new URL(fullImageUrl).pathname)
    : "";
  const s3Key = imageFilename ? `${S3_LOGO_PREFIX}${imageFilename}` : "";
  const s3Url = s3Key
    ? `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${s3Key}`
    : "";

  return {
    name: customer.Name,
    url: customer.LoginUrl,
    logoUrl: fullImageUrl,
    logoS3Key: s3Key,
    logoS3Url: s3Url,
  };
}

async function downloadLogo(
  customer: MyChartCustomer
): Promise<{ filename: string; data: Buffer } | null> {
  const fullImageUrl = resolveImageUrl(customer.ImageUrl);
  if (!fullImageUrl) return null;

  const filename = path.basename(new URL(fullImageUrl).pathname);
  const filepath = path.join(LOGOS_DIR, filename);

  // Skip if already downloaded
  if (fs.existsSync(filepath)) {
    return { filename, data: fs.readFileSync(filepath) };
  }

  try {
    const response = await fetch(fullImageUrl);
    if (!response.ok) {
      console.warn(
        `  Failed to download logo for ${customer.Name}: ${response.status}`
      );
      return null;
    }
    const data = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filepath, data);
    return { filename, data };
  } catch (err) {
    console.warn(
      `  Error downloading logo for ${customer.Name}: ${(err as Error).message}`
    );
    return null;
  }
}

async function downloadAllLogos(customers: MyChartCustomer[]) {
  fs.mkdirSync(LOGOS_DIR, { recursive: true });

  console.log(`Downloading ${customers.length} logos to ${LOGOS_DIR}...`);
  let downloaded = 0;
  const skipped = 0;
  let failed = 0;

  // Process in batches for concurrency control
  for (let i = 0; i < customers.length; i += CONCURRENCY) {
    const batch = customers.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(downloadLogo));
    for (const r of results) {
      if (r) downloaded++;
      else failed++;
    }
    const total = Math.min(i + CONCURRENCY, customers.length);
    process.stdout.write(`\r  Progress: ${total}/${customers.length}`);
  }
  console.log(
    `\n  Downloaded: ${downloaded}, Skipped (already exists): ${skipped}, Failed: ${failed}`
  );
}

async function uploadAllLogos() {
  if (!fs.existsSync(LOGOS_DIR)) {
    throw new Error(
      `Logos directory not found at ${LOGOS_DIR}. Run download first.`
    );
  }

  const s3 = new S3Client({
    region: S3_REGION,
    ...(process.env.NODE_ENV !== "production" && {
      profile: "fanpierlabs",
    }),
  });

  const files = fs.readdirSync(LOGOS_DIR).filter((f) => !f.startsWith("."));
  console.log(`Uploading ${files.length} logos to s3://${S3_BUCKET}/${S3_LOGO_PREFIX}...`);

  let uploaded = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (filename) => {
        const filepath = path.join(LOGOS_DIR, filename);
        const data = fs.readFileSync(filepath);
        const ext = path.extname(filename).toLowerCase();
        const contentType =
          ext === ".png"
            ? "image/png"
            : ext === ".jpg" || ext === ".jpeg"
              ? "image/jpeg"
              : ext === ".svg"
                ? "image/svg+xml"
                : "application/octet-stream";

        await s3.send(
          new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: `${S3_LOGO_PREFIX}${filename}`,
            Body: data,
            ContentType: contentType,
          })
        );
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") uploaded++;
      else {
        failed++;
        console.warn(`  Upload failed: ${r.reason}`);
      }
    }
    const total = Math.min(i + CONCURRENCY, files.length);
    process.stdout.write(`\r  Progress: ${total}/${files.length}`);
  }

  console.log(`\n  Uploaded: ${uploaded}, Failed: ${failed}`);
}

async function main() {
  const args = process.argv.slice(2);
  const skipLogos = args.includes("--skip-logos");
  const downloadOnly = args.includes("--download-only");
  const uploadOnly = args.includes("--upload-only");

  if (uploadOnly) {
    await uploadAllLogos();
    return;
  }

  const customers = await fetchDirectory();
  const instances = customers.map(customerToInstance);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(instances, null, 2));
  console.log(`Wrote ${instances.length} instances to ${OUTPUT_FILE}`);

  if (!skipLogos) {
    await downloadAllLogos(customers);
    if (!downloadOnly) {
      await uploadAllLogos();
    }
  }

  console.log("Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
