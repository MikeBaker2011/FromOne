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

function getCloudConvertError(result: any) {
  const tasks = result?.data?.tasks || result?.tasks || [];
  const failedTask = Array.isArray(tasks)
    ? tasks.find((task: any) => task?.status === "error")
    : null;

  return (
    failedTask?.message ||
    failedTask?.result?.message ||
    result?.message ||
    result?.error ||
    result?.errors?.[0]?.message ||
    ""
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const postId = cleanText(body.postId);
    const mediaUrl = cleanText(body.mediaUrl);
    const outputWidth = Number(body.outputWidth || 1080);
    const outputHeight = Number(body.outputHeight || 1350);

    if (!postId) {
      return NextResponse.json(
        { error: "No post id was provided for this PDF conversion." },
        { status: 400 },
      );
    }

    if (!mediaUrl) {
      return NextResponse.json(
        { error: "No PDF URL was provided." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(outputWidth) || outputWidth < 100 || outputWidth > 5000) {
      return NextResponse.json(
        { error: "The requested image width is not valid." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(outputHeight) || outputHeight < 100 || outputHeight > 5000) {
      return NextResponse.json(
        { error: "The requested image height is not valid." },
        { status: 400 },
      );
    }

    const cloudConvertKey = process.env.CLOUDCONVERT_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!cloudConvertKey) {
      return NextResponse.json(
        { error: "PDF conversion is not configured yet. Missing CLOUDCONVERT_API_KEY." },
        { status: 500 },
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "PDF conversion storage is not configured yet. Missing Supabase server environment variables." },
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
            page_range: "1",
          },
          export_jpg: {
            operation: "export/url",
            input: "convert_pdf",
          },
        },
      }),
    });

    const createdJob = await createJobResponse.json().catch(() => ({}));

    if (!createJobResponse.ok) {
      return NextResponse.json(
        {
          error:
            getCloudConvertError(createdJob) ||
            "The PDF conversion could not be started. Please try a smaller PDF or upload a JPG/PNG version.",
        },
        { status: 500 },
      );
    }

    const jobId = createdJob?.data?.id;

    if (!jobId) {
      return NextResponse.json(
        { error: "The PDF conversion service did not return a job id." },
        { status: 500 },
      );
    }

    let completedJob: any = null;

    for (let attempt = 0; attempt < 45; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const pollResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
        headers: {
          Authorization: `Bearer ${cloudConvertKey}`,
        },
      });

      const pollResult = await pollResponse.json().catch(() => ({}));

      if (!pollResponse.ok) {
        return NextResponse.json(
          {
            error:
              getCloudConvertError(pollResult) ||
              "The PDF conversion status could not be checked.",
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
          {
            error:
              getCloudConvertError(pollResult) ||
              "The PDF could not be converted. Please try exporting it as JPG/PNG and upload that instead.",
          },
          { status: 500 },
        );
      }
    }

    if (!completedJob) {
      return NextResponse.json(
        { error: "PDF conversion timed out. Please try again, or upload a JPG/PNG version of the flyer." },
        { status: 504 },
      );
    }

    const exportTask = completedJob.tasks?.find(
      (task: any) => task.name === "export_jpg",
    );

    const convertedUrl = exportTask?.result?.files?.[0]?.url;

    if (!convertedUrl) {
      return NextResponse.json(
        { error: "The converted image URL was not returned." },
        { status: 500 },
      );
    }

    const imageResponse = await fetch(convertedUrl);

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: "The converted image could not be downloaded." },
        { status: 500 },
      );
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const storagePath = `prepared/${postId}/${Date.now()}-${getSafeFileName(postId)}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(storagePath, imageBuffer, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message || "The converted image could not be saved." },
        { status: 500 },
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(MEDIA_BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData.publicUrl;

    await supabase
      .from("campaign_posts")
      .update({
        media_url: publicUrl,
        media_type: "image",
        prepared_media_url: publicUrl,
        prepared_media_width: outputWidth,
        prepared_media_height: outputHeight,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId);

    return NextResponse.json({
      url: publicUrl,
      publicUrl,
      prepared_media_url: publicUrl,
      width: outputWidth,
      height: outputHeight,
      media_type: "image",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "The PDF could not be converted. Please try a smaller PDF or upload a JPG/PNG version.",
      },
      { status: 500 },
    );
  }
}
