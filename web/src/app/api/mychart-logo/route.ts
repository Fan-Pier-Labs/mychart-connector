import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const S3_BUCKET = "mychart-connector";
const S3_LOGO_PREFIX = "mychart-logos/";
const AWS_REGION = "us-east-2";

let _s3Client: S3Client | null = null;
function getS3Client(): S3Client {
  if (!_s3Client) {
    _s3Client = new S3Client({
      region: AWS_REGION,
      ...(process.env.NODE_ENV === "development"
        ? { profile: "fanpierlabs" }
        : {}),
    });
  }
  return _s3Client;
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json(
      { error: "Missing 'name' query parameter" },
      { status: 400 }
    );
  }

  // Sanitize: only allow alphanumeric, hyphens, underscores, dots
  if (!/^[\w\-. ]+$/.test(name)) {
    return NextResponse.json(
      { error: "Invalid image name" },
      { status: 400 }
    );
  }

  const key = `${S3_LOGO_PREFIX}${name}`;

  try {
    const s3 = getS3Client();
    const response = await s3.send(
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: key })
    );

    if (!response.Body) {
      return NextResponse.json({ error: "Logo not found" }, { status: 404 });
    }

    const bytes = await response.Body.transformToByteArray();
    const contentType = response.ContentType || "image/png";

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.name === "NoSuchKey" || err.name === "NotFound")
    ) {
      return NextResponse.json({ error: "Logo not found" }, { status: 404 });
    }
    console.error("Error fetching logo from S3:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
