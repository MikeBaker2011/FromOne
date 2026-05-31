import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const MEDIA_BUCKET = "campaign-assets";

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function getSafeFileName(value?: string | null) {
  return (
    cleanText(value || "fromone-pdf")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "fromone-pdf"
  );
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJsonResponse(response: Response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text };
  }
}

function getCloudConvertError(payload: any, fallback: string) {
  const firstError = Array.isArray(payload?.errors)
    ? payload.errors
        .map((item: any) => item?.message || item?.detail || item?.title || item?.code)
        .filter(Boolean)
        .join(" ")
    : "";

  return cleanText(
    payload?.message ||
      payload?.error ||
      payload?.detail ||
      payload?.title ||
      firstError ||
      fallback,
  );
}

function getCloudConvertTaskError(job: any) {
  const failedTask = job?.tasks?.find((task: any) => task?.status === "error");

  return cleanText(
    failedTask?.message ||
      failedTask?.result?.message ||
      failedTask?.result?.error ||
      failedTask?.code ||
      getCloudConvertError(job, "CloudConvert failed to convert this PDF."),
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const conversionId = cleanText(
      body.postId || body.campaignPostId || body.uploadId || body.conversionId
    );
    const mediaUrl = cleanText(body.mediaUrl || body.media_url);
    const skipPostUpdate = body.skipPostUpdate === true;
    const outputWidth = Number(body.outputWidth || body.width || 1080);
    const outputHeight = Number(body.outputHeight || body.height || 1350);

    if (!conversionId || !mediaUrl) {
      return NextResponse.json(
        { error: "Missing conversionId/postId or mediaUrl." },
        { status: 400 },
      );
    }

    if (!/^https?:\/\//i.test(mediaUrl)) {
      return NextResponse.json(
        { error: "The PDF must have a public URL before it can be converted." },
        { status: 400 },
      );
    }

    const cloudConvertKey = process.env.CLOUDCONVERT_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!cloudConvertKey) {
      return NextResponse.json(
        { error: "Missing CLOUDCONVERT_API_KEY in Render environment variables." },
        { status: 500 },
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          error:
            "Missing Supabase server environment variables. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Render.",
        },
        { status: 500 },
      );
    }

    const createJobResponse = await fetch("https://api.cloudconvert.com/v2/jobs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cloudConvertKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tasks: {
          import_pdf: {
            operation: "import/url",
            url: mediaUrl,
          },
          convert_pdf: {
            operation: "convert",
            input: "import_pdf",
            input_format: "pdf",
            output_format: "jpg",
            pages: "1",
            width: outputWidth,
            height: outputHeight,
            fit: "max",
            quality: 92,
          },
          export_jpg: {
            operation: "export/url",
            input: "convert_pdf",
          },
        },
      }),
    });

    const createdJob = await readJsonResponse(createJobResponse);

    if (!createJobResponse.ok) {
      return NextResponse.json(
        {
          error: getCloudConvertError(
            createdJob,
            `CloudConvert could not start the PDF conversion. Status ${createJobResponse.status}.`,
          ),
        },
        { status: 500 },
      );
    }

    const jobId = createdJob?.data?.id;

    if (!jobId) {
      return NextResponse.json(
        { error: "CloudConvert did not return a job id." },
        { status: 500 },
      );
    }

    let completedJob: any = null;

    for (let attempt = 0; attempt < 45; attempt += 1) {
      await wait(1000);

      const pollResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
        headers: {
          Authorization: `Bearer ${cloudConvertKey}`,
        },
      });

      const pollResult = await readJsonResponse(pollResponse);

      if (!pollResponse.ok) {
        return NextResponse.json(
          {
            error: getCloudConvertError(
              pollResult,
              `Could not check conversion status. Status ${pollResponse.status}.`,
            ),
          },
          { status: 500 },
        );
      }

      if (pollResult?.data?.status === "finished") {
        completedJob = pollResult.data;
        break;
      }

      if (pollResult?.data?.status === "error") {
        return NextResponse.json(
          { error: getCloudConvertTaskError(pollResult.data) },
          { status: 500 },
        );
      }
    }

    if (!completedJob) {
      return NextResponse.json(
        { error: "PDF conversion timed out. Please try again." },
        { status: 504 },
      );
    }

    const exportTask = completedJob.tasks?.find(
      (task: any) => task.name === "export_jpg",
    );

    const convertedUrl = exportTask?.result?.files?.[0]?.url;

    if (!convertedUrl) {
      return NextResponse.json(
        { error: "Converted JPEG URL was not returned by CloudConvert." },
        { status: 500 },
      );
    }

    const imageResponse = await fetch(convertedUrl);

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: `Could not download the converted JPEG. Status ${imageResponse.status}.` },
        { status: 500 },
      );
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const storagePath = `prepared/${conversionId}/${Date.now()}-${getSafeFileName(conversionId)}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(storagePath, imageBuffer, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message || "Could not save converted JPEG to Supabase Storage." },
        { status: 500 },
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(MEDIA_BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData.publicUrl;

    const updates = {
      media_url: publicUrl,
      media_type: "image",
      prepared_media_url: publicUrl,
      prepared_media_width: outputWidth,
      prepared_media_height: outputHeight,
      publish_error: null,
      updated_at: new Date().toISOString(),
    };

    if (!skipPostUpdate) {
      const { error: updateError } = await supabase
        .from("campaign_posts")
        .update(updates)
        .eq("id", conversionId);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message || "Converted image saved, but the post was not updated." },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      url: publicUrl,
      publicUrl,
      public_url: publicUrl,
      preparedUrl: publicUrl,
      prepared_url: publicUrl,
      preparedMediaUrl: publicUrl,
      prepared_media_url: publicUrl,
      width: outputWidth,
      height: outputHeight,
      media_type: "image",
      storage_path: storagePath,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Could not convert PDF to JPEG." },
      { status: 500 },
    );
  }
}
