"use client";

import "../posts.css";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type ResizePresetValue =
  | "instagram-square"
  | "instagram-portrait"
  | "facebook-feed"
  | "story-reel";

const resizePresets = [
  {
    value: "instagram-square" as ResizePresetValue,
    label: "Instagram square",
    size: "1080 × 1080",
  },
  {
    value: "instagram-portrait" as ResizePresetValue,
    label: "Instagram portrait",
    size: "1080 × 1350",
  },
  {
    value: "facebook-feed" as ResizePresetValue,
    label: "Facebook post",
    size: "1200 × 630",
  },
  {
    value: "story-reel" as ResizePresetValue,
    label: "Story / Reel",
    size: "1080 × 1920",
  },
];

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function normalisePlatform(platform?: string | null) {
  const clean = cleanText(platform).toLowerCase();

  if (clean.includes("instagram")) return "Instagram";
  if (clean.includes("tiktok")) return "TikTok";
  if (clean.includes("facebook")) return "Facebook";

  return "Post";
}

function getPlatformUrl(platform: string) {
  const clean = platform.toLowerCase();

  if (clean.includes("instagram")) return "https://www.instagram.com/";
  if (clean.includes("tiktok")) return "https://www.tiktok.com/upload";
  if (clean.includes("facebook")) return "https://www.facebook.com/";

  return "https://www.facebook.com/";
}

function getSafeFileName(value?: string | null) {
  return (
    cleanText(value || "fromone-post-media")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "fromone-post-media"
  );
}

function triggerDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function PostReviewPage() {
  const router = useRouter();
  const params = useParams();

  const postId = useMemo(() => {
    const value = params?.postId;
    return Array.isArray(value) ? value[0] : cleanText(value);
  }, [params]);

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [caption, setCaption] = useState("");
  const [cta, setCta] = useState("");
  const [hashtags, setHashtags] = useState("");

  const [resizePreset, setResizePreset] =
    useState<ResizePresetValue>("instagram-portrait");
  const [resizing, setResizing] = useState(false);
  const [resizedMedia, setResizedMedia] = useState<any>(null);
  const [message, setMessage] = useState("");

  const platformName = normalisePlatform(post?.platform);
  const mediaUrl = cleanText(post?.media_url);
  const mediaType = cleanText(post?.media_type).toLowerCase();

  const isVideo = mediaType === "video";
  const isFlyer =
    mediaType === "flyer" ||
    mediaType === "pdf" ||
    mediaUrl.toLowerCase().includes(".pdf");

  const canPrepareImage = Boolean(mediaUrl) && !isVideo && !isFlyer;

  const title = useMemo(() => {
    const savedTitle = cleanText(post?.title);

    if (
      savedTitle &&
      !/^(facebook|instagram|tiktok|post)\s*(post)?\s*\d*$/i.test(savedTitle)
    ) {
      return savedTitle;
    }

    const firstLine = cleanText(post?.caption)
      .split(/\n+/)
      .map((line) => line.trim())
      .find(Boolean);

    if (firstLine) {
      const firstSentence = firstLine.split(/[.!?]/)[0]?.trim() || firstLine;
      return firstSentence.length > 70
        ? `${firstSentence.slice(0, 70).trim()}...`
        : firstSentence;
    }

    return `${platformName} post`;
  }, [post, platformName]);

  const fullCaption = useMemo(() => {
    const parts = [
      cleanText(caption),
      cleanText(cta),
      cleanText(hashtags),
    ].filter(Boolean);

    return parts.join("\n\n");
  }, [caption, cta, hashtags]);

  useEffect(() => {
    if (!postId) return;

    loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const loadPost = async () => {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("campaign_posts")
      .select("*")
      .eq("id", postId)
      .maybeSingle();

    if (error) {
      setMessage(error.message || "Could not load this post.");
      setLoading(false);
      return;
    }

    if (!data) {
      setMessage("This post could not be found.");
      setLoading(false);
      return;
    }

    setPost(data);
    setCaption(cleanText(data.caption));
    setCta(cleanText(data.cta));

    const tagValue = Array.isArray(data.hashtags)
      ? data.hashtags.join(" ")
      : cleanText(data.hashtags);

    setHashtags(tagValue);
    setLoading(false);
  };

  const saveWording = async () => {
    if (!post?.id) return;

    setSaving(true);
    setMessage("");

    const cleanHashtags = hashtags
      .split(/\s+/)
      .map((tag) => tag.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from("campaign_posts")
      .update({
        caption,
        cta,
        hashtags: cleanHashtags,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (error) {
      setMessage(error.message || "Could not save this post.");
      setSaving(false);
      return;
    }

    setPost({
      ...post,
      caption,
      cta,
      hashtags: cleanHashtags,
    });

    setMessage("Wording saved.");
    setSaving(false);
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(fullCaption);
      setMessage("Caption copied.");
    } catch {
      setMessage("Could not copy automatically. Please copy the caption manually.");
    }
  };

  const openPlatform = async () => {
    await copyCaption();
    window.open(getPlatformUrl(platformName), "_blank", "noopener,noreferrer");
  };

  const markAsPosted = async () => {
    if (!post?.id) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("campaign_posts")
      .update({
        is_posted: true,
        status: "posted",
        publish_status: "posted",
        posted_at: new Date().toISOString(),
        publish_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (error) {
      setMessage(error.message || "Could not mark this as posted.");
      setSaving(false);
      return;
    }

    setPost({
      ...post,
      is_posted: true,
      status: "posted",
      publish_status: "posted",
    });

    setMessage("Marked as posted.");
    setSaving(false);
  };

  const markAsNotPosted = async () => {
    if (!post?.id) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("campaign_posts")
      .update({
        is_posted: false,
        status: "ready",
        publish_status: "ready",
        posted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (error) {
      setMessage(error.message || "Could not update this post.");
      setSaving(false);
      return;
    }

    setPost({
      ...post,
      is_posted: false,
      status: "ready",
      publish_status: "ready",
    });

    setMessage("Post set back to ready.");
    setSaving(false);
  };

  const downloadOriginalMedia = () => {
    if (!mediaUrl) return;

    const extension = isVideo ? "mp4" : isFlyer ? "pdf" : "jpg";
    triggerDownload(mediaUrl, `${getSafeFileName(title)}-original.${extension}`);
  };

  const prepareImage = async () => {
    if (!post?.id || !canPrepareImage) return;

    setResizing(true);
    setMessage("");

    try {
      const response = await fetch("/api/media/resize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId: post.id,
          mediaUrl,
          preset: resizePreset,
          mode: "transform",
          fitMode: "fill",
          zoom: 1,
          offsetX: 0,
          offsetY: 0,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || "Could not prepare this image.");
      }

      const url = result?.url || result?.publicUrl || result?.public_url;

      if (!url) {
        throw new Error("Prepared image was created but no URL was returned.");
      }

      setResizedMedia({
        url,
        label: result?.label || "Prepared image",
        width: result?.width,
        height: result?.height,
      });

      setMessage("Prepared image created.");
    } catch (error: any) {
      setMessage(error?.message || "Could not prepare this image.");
    } finally {
      setResizing(false);
    }
  };

  const downloadPreparedImage = () => {
    if (!resizedMedia?.url) return;

    triggerDownload(
      resizedMedia.url,
      `${getSafeFileName(title)}-${resizedMedia.width || "prepared"}x${
        resizedMedia.height || "image"
      }.jpg`,
    );
  };

  const sharePreparedImage = async () => {
    if (!resizedMedia?.url) {
      setMessage("Create a prepared image first.");
      return;
    }

    await copyCaption();

    try {
      const response = await fetch(resizedMedia.url);
      const blob = await response.blob();
      const file = new File([blob], `${getSafeFileName(title)}.jpg`, {
        type: blob.type || "image/jpeg",
      });

      const nav = navigator as any;

      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({
          title,
          text: fullCaption,
          files: [file],
        });

        setMessage("Share sheet opened.");
        return;
      }

      downloadPreparedImage();
      window.open(getPlatformUrl(platformName), "_blank", "noopener,noreferrer");
      setMessage(
        "Sharing is not supported here. Prepared image downloaded and platform opened.",
      );
    } catch (error: any) {
      downloadPreparedImage();
      window.open(getPlatformUrl(platformName), "_blank", "noopener,noreferrer");
      setMessage(
        "Sharing was not available. Prepared image downloaded and platform opened.",
      );
    }
  };

  if (loading) {
    return (
      <main className="post-review-page-shell">
        <section className="post-review-loading-card">
          <p>Loading post...</p>
        </section>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="post-review-page-shell">
        <section className="post-review-loading-card">
          <h1>Post not found</h1>
          <p>{message || "This post could not be loaded."}</p>
          <button type="button" onClick={() => router.push("/posts")}>
            Back to posts
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="post-review-page-shell">
      <section className="post-review-header">
        <button type="button" onClick={() => router.push("/posts")}>
          ← Back to posts
        </button>

        <div>
          <span>{platformName}</span>
          <h1>{title}</h1>
          <p>
            Review the wording, prepare the media, then post manually or share
            the prepared image.
          </p>
        </div>

        <div className="post-review-status-pill">
          {post.is_posted ||
          String(post.status || "").toLowerCase() === "posted"
            ? "Posted"
            : "Ready"}
        </div>
      </section>

      {message && <div className="post-review-message">{message}</div>}

      <section className="post-review-workspace">
        <aside className="post-review-media-panel">
          <div className="post-review-media-frame">
            {mediaUrl ? (
              isVideo ? (
                <video src={mediaUrl} controls />
              ) : isFlyer ? (
                <div className="post-review-empty-media">
                  <strong>PDF / flyer attached</strong>
                  <p>Open or download the file before posting.</p>
                </div>
              ) : (
                <img src={mediaUrl} alt="Post media" />
              )
            ) : (
              <div className="post-review-empty-media">
                <strong>No media attached</strong>
                <p>Add media from the posts page before publishing.</p>
              </div>
            )}
          </div>

          <div className="post-review-media-actions">
            {mediaUrl && (
              <>
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="post-review-secondary-button"
                >
                  View media
                </a>

                <button
                  type="button"
                  className="post-review-secondary-button"
                  onClick={downloadOriginalMedia}
                >
                  Download media
                </button>
              </>
            )}
          </div>

          {canPrepareImage && (
            <div className="post-review-prepare-card">
              <div>
                <span>Prepare media</span>
                <h2>Resize for social</h2>
                <p>
                  Create a platform-ready version of this image for Facebook,
                  Instagram or Stories.
                </p>
              </div>

              <div className="post-review-preset-grid">
                {resizePresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    className={
                      resizePreset === preset.value ? "is-active" : ""
                    }
                    onClick={() => setResizePreset(preset.value)}
                  >
                    <strong>{preset.label}</strong>
                    <small>{preset.size}</small>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="post-review-primary-button"
                onClick={prepareImage}
                disabled={resizing}
              >
                {resizing ? "Preparing..." : "Create prepared image"}
              </button>

              {resizedMedia?.url && (
                <div className="post-review-prepared-output">
                  <strong>{resizedMedia.label}</strong>
                  <p>
                    {resizedMedia.width} × {resizedMedia.height}
                  </p>

                  <div className="post-review-two-actions">
                    <button type="button" onClick={sharePreparedImage}>
                      Share prepared image
                    </button>
                    <button type="button" onClick={downloadPreparedImage}>
                      Download
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>

        <section className="post-review-content-panel">
          <div className="post-review-card">
            <div className="post-review-card-heading">
              <span>Step 1</span>
              <h2>Check the wording</h2>
            </div>

            <label>
              <strong>Caption</strong>
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                rows={10}
              />
            </label>

            <label>
              <strong>CTA</strong>
              <input
                value={cta}
                onChange={(event) => setCta(event.target.value)}
                placeholder="Book now, message us, visit the website..."
              />
            </label>

            <label>
              <strong>Hashtags</strong>
              <input
                value={hashtags}
                onChange={(event) => setHashtags(event.target.value)}
                placeholder="#LocalBusiness #Marketing"
              />
            </label>

            <div className="post-review-two-actions">
              <button
                type="button"
                className="post-review-primary-button"
                onClick={saveWording}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save wording"}
              </button>

              <button
                type="button"
                className="post-review-secondary-button"
                onClick={copyCaption}
              >
                Copy caption
              </button>
            </div>
          </div>

          <div className="post-review-card">
            <div className="post-review-card-heading">
              <span>Step 2</span>
              <h2>Post it</h2>
            </div>

            <p>
              FromOne copies the caption and opens {platformName}. Add your
              prepared media, paste the caption, then publish.
            </p>

            <button
              type="button"
              className="post-review-primary-button"
              onClick={openPlatform}
            >
              Post manually to {platformName}
            </button>

            {resizedMedia?.url && (
              <button
                type="button"
                className="post-review-secondary-button"
                onClick={sharePreparedImage}
              >
                Share prepared image
              </button>
            )}

            <div className="post-review-two-actions">
              <button type="button" onClick={markAsPosted} disabled={saving}>
                Mark as posted
              </button>

              <button type="button" onClick={markAsNotPosted} disabled={saving}>
                Mark as not posted
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}