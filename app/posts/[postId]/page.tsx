"use client";

import "../posts.css";

import {
  ChangeEvent,
  PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

type ResizePresetValue =
  | "instagram-square"
  | "instagram-portrait"
  | "facebook-feed"
  | "story-reel";

type MediaOffset = {
  x: number;
  y: number;
};

type MediaTransformDrag = {
  startClientX: number;
  startClientY: number;
  startOffset: MediaOffset;
};

type PreparedMedia = {
  url: string;
  label: string;
  width: number;
  height: number;
};

type ResizePreset = {
  value: ResizePresetValue;
  label: string;
  width: number;
  height: number;
  help: string;
};

type QuickImproveAction = {
  value: string;
  label: string;
};

type ReviewMessage = {
  tone: "success" | "warning" | "error" | "info";
  text: string;
};

const resizePresets: ResizePreset[] = [
  {
    value: "instagram-square",
    label: "Instagram square",
    width: 1080,
    height: 1080,
    help: "Best for simple Instagram and Facebook posts.",
  },
  {
    value: "instagram-portrait",
    label: "Instagram portrait",
    width: 1080,
    height: 1350,
    help: "Best for Instagram feed posts with more screen space.",
  },
  {
    value: "facebook-feed",
    label: "Facebook post",
    width: 1200,
    height: 630,
    help: "Best for Facebook feed and landscape posts.",
  },
  {
    value: "story-reel",
    label: "Story / Reel",
    width: 1080,
    height: 1920,
    help: "Best for Stories, Reels covers and vertical promotions.",
  },
];

const quickImproveActions: QuickImproveAction[] = [
  { value: "shorter", label: "Make shorter" },
  { value: "premium", label: "More premium" },
  { value: "sales", label: "Sales focused" },
  { value: "specific", label: "Less generic" },
  { value: "different", label: "Different version" },
];

const marketReachOptions = [
  "Local customers",
  "Regional customers",
  "Nationwide UK customers",
  "Online customers",
];

const toneOptions = [
  "Use current tone",
  "More premium",
  "More friendly",
  "More confident",
  "More direct",
  "More sales focused",
];

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPlatformName(platform?: string | null) {
  const clean = cleanText(platform).toLowerCase();

  if (clean.includes("instagram")) return "Instagram";
  if (clean.includes("tiktok")) return "TikTok";
  if (clean.includes("facebook")) return "Facebook";

  return "Post";
}

function getPlatformUrl(platform?: string | null) {
  const clean = getPlatformName(platform).toLowerCase();

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

function isGenericTitle(title?: string | null) {
  const clean = cleanText(title);

  if (!clean) return true;

  return (
    /^(facebook|instagram|tiktok|post)\s+post\s*\d*$/i.test(clean) ||
    /^(facebook|instagram|tiktok)\s*\d+$/i.test(clean) ||
    /^post\s*\d+$/i.test(clean)
  );
}

function getReadableTitle(post: any, platformName: string) {
  const savedTitle = cleanText(post?.title);

  if (savedTitle && !isGenericTitle(savedTitle)) return savedTitle;

  const firstLine = cleanText(post?.caption)
    .split(/\n+/)
    .map((line) => line.trim())
    .find(Boolean);

  if (firstLine) {
    const firstSentence = firstLine.split(/[.!?]/)[0]?.trim() || firstLine;
    return firstSentence.length > 78
      ? `${firstSentence.slice(0, 78).trim()}...`
      : firstSentence;
  }

  return `${platformName} post`;
}

function getHashtagsString(value: unknown) {
  if (Array.isArray(value)) return value.join(" ");
  return cleanText(value);
}

function getHashtagsArray(value: string) {
  return value
    .split(/\s+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
}

function getPreparedFrameStyle(preset: ResizePreset) {
  return {
    aspectRatio: `${preset.width} / ${preset.height}`,
  };
}

function getPreparedImageStyle({
  zoom,
  offset,
  fitMode,
}: {
  zoom: number;
  offset: MediaOffset;
  fitMode: "fit" | "fill";
}) {
  return {
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
    objectFit: fitMode === "fit" ? "contain" : "cover",
  } as React.CSSProperties;
}

async function urlToShareFile(url: string, filename: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not load the prepared image for sharing.");
  }

  const blob = await response.blob();
  const contentType = blob.type || "image/jpeg";
  const extension = contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
      ? "webp"
      : "jpg";

  return new File([blob], `${filename}.${extension}`, { type: contentType });
}

export default function PostReviewPage() {
  const router = useRouter();
  const params = useParams();

  const postId = useMemo(() => {
    const value = params?.postId;
    return Array.isArray(value) ? value[0] : cleanText(value);
  }, [params]);

  const [post, setPost] = useState<any>(null);
  const [campaign, setCampaign] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [caption, setCaption] = useState("");
  const [cta, setCta] = useState("");
  const [hashtags, setHashtags] = useState("");

  const [message, setMessage] = useState<ReviewMessage | null>(null);
  const [saving, setSaving] = useState(false);
  const [rewritingAction, setRewritingAction] = useState("");
  const [publishing, setPublishing] = useState(false);

  const [audienceTarget, setAudienceTarget] = useState("Small business owners");
  const [customAudienceTarget, setCustomAudienceTarget] = useState("");
  const [marketReachTarget, setMarketReachTarget] = useState("Local customers");
  const [toneTarget, setToneTarget] = useState("Use current tone");

  const [prepareMode, setPrepareMode] = useState(false);
  const [resizePresetValue, setResizePresetValue] =
    useState<ResizePresetValue>("instagram-portrait");
  const [fitMode, setFitMode] = useState<"fit" | "fill">("fill");
  const [mediaZoom, setMediaZoom] = useState(1);
  const [mediaOffset, setMediaOffset] = useState<MediaOffset>({ x: 0, y: 0 });
  const [mediaDrag, setMediaDrag] = useState<MediaTransformDrag | null>(null);
  const [preparingMedia, setPreparingMedia] = useState(false);
  const [sharingMedia, setSharingMedia] = useState(false);
  const [preparedMedia, setPreparedMedia] = useState<PreparedMedia | null>(null);

  const mediaFrameRef = useRef<HTMLDivElement | null>(null);

  const platformName = getPlatformName(post?.platform);
  const title = useMemo(() => getReadableTitle(post, platformName), [post, platformName]);
  const mediaUrl = cleanText(post?.media_url);
  const mediaType = cleanText(post?.media_type).toLowerCase();
  const isVideo = mediaType === "video";
  const isFlyer =
    mediaType === "flyer" ||
    mediaType === "pdf" ||
    mediaUrl.toLowerCase().includes(".pdf");
  const canPrepareMedia = Boolean(mediaUrl) && !isVideo && !isFlyer;

  const selectedPreset =
    resizePresets.find((preset) => preset.value === resizePresetValue) ||
    resizePresets[1];

  const fullCaption = useMemo(() => {
    return [caption, cta, hashtags].map(cleanText).filter(Boolean).join("\n\n");
  }, [caption, cta, hashtags]);

  const postIsPosted =
    Boolean(post?.is_posted) ||
    cleanText(post?.status).toLowerCase() === "posted" ||
    cleanText(post?.publish_status).toLowerCase() === "posted";

  useEffect(() => {
    if (!postId) return;

    loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const showMessage = (text: string, tone: ReviewMessage["tone"] = "info") => {
    setMessage({ text, tone });
  };

  const loadPost = async () => {
    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase
      .from("campaign_posts")
      .select("*")
      .eq("id", postId)
      .maybeSingle();

    if (error) {
      showMessage(error.message || "Could not load this post.", "error");
      setLoading(false);
      return;
    }

    if (!data) {
      showMessage("This post could not be found.", "warning");
      setLoading(false);
      return;
    }

    setPost(data);
    setCaption(cleanText((data as any).caption));
    setCta(cleanText((data as any).cta));
    setHashtags(getHashtagsString((data as any).hashtags));

    await loadBusinessContext(data);
    setLoading(false);
  };

  const loadBusinessContext = async (loadedPost: any) => {
    const campaignId = cleanText(loadedPost?.campaign_id);
    const userId = cleanText(loadedPost?.user_id);

    if (campaignId) {
      const { data: campaignData } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .maybeSingle();

      if (campaignData) setCampaign(campaignData);
    }

    if (userId) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profileData) setProfile(profileData);
    }
  };

  const refreshPostFromUpdates = (updates: Record<string, any>) => {
    setPost((current: any) => ({
      ...(current || {}),
      ...updates,
    }));
  };

  const saveWording = async () => {
    if (!post?.id) return;

    setSaving(true);
    setMessage(null);

    const cleanHashtags = getHashtagsArray(hashtags);
    const updates = {
      caption,
      cta,
      hashtags: cleanHashtags,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("campaign_posts")
      .update(updates)
      .eq("id", post.id);

    if (error) {
      showMessage(error.message || "Could not save this post.", "error");
      setSaving(false);
      return;
    }

    refreshPostFromUpdates(updates);
    showMessage("Wording saved.", "success");
    setSaving(false);
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(fullCaption);
      showMessage("Caption copied.", "success");
      return true;
    } catch {
      showMessage("Could not copy automatically. Please copy the caption manually.", "warning");
      return false;
    }
  };

  const getToneForRewrite = () => {
    if (toneTarget && toneTarget !== "Use current tone") return toneTarget;
    return (
      cleanText(profile?.tone_of_voice) ||
      cleanText(campaign?.tone) ||
      cleanText(post?.tone) ||
      "Professional"
    );
  };

  const applyRewrittenPost = async (rewritten: any, extraUpdates: Record<string, any> = {}) => {
    if (!post?.id) return false;

    const updates = {
      caption: cleanText(rewritten.caption),
      cta: cleanText(rewritten.cta),
      hashtags: Array.isArray(rewritten.hashtags)
        ? rewritten.hashtags
        : getHashtagsArray(cleanText(rewritten.hashtags)),
      image_prompt: cleanText(rewritten.image_prompt) || cleanText(post.image_prompt),
      updated_at: new Date().toISOString(),
      ...extraUpdates,
    };

    const { error } = await supabase
      .from("campaign_posts")
      .update(updates)
      .eq("id", post.id);

    if (error) {
      showMessage(error.message || "Could not save the improved post.", "error");
      return false;
    }

    setCaption(updates.caption);
    setCta(updates.cta);
    setHashtags(getHashtagsString(updates.hashtags));
    refreshPostFromUpdates(updates);

    return true;
  };

  const quickImprovePost = async (improvementAction: string) => {
    if (!post?.id) return;

    if (!caption.trim()) {
      showMessage("This post needs a caption before it can be improved.", "warning");
      return;
    }

    const selectedAction = quickImproveActions.find(
      (item) => item.value === improvementAction,
    );
    const actionLabel = selectedAction?.label || "Improve post";
    const finalAudience =
      audienceTarget === "Custom audience"
        ? customAudienceTarget.trim()
        : audienceTarget.trim();
    const selectedReach = marketReachTarget || "Local customers";
    const selectedTone = getToneForRewrite();

    setRewritingAction(improvementAction);
    setMessage(null);

    try {
      const response = await fetch("/api/rewritePost", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "gemini",
          improvementAction,
          audienceTarget: finalAudience || post.audience_target || "Current audience",
          marketReach: selectedReach,
          tone: selectedTone,
          toneAdjustment: toneTarget,
          businessName:
            cleanText(profile?.business_name) ||
            cleanText(campaign?.business_name) ||
            "the business",
          industry:
            cleanText(profile?.industry) ||
            cleanText(campaign?.business_type) ||
            "general business",
          platform: post.platform || "Facebook",
          caption,
          cta,
          hashtags: getHashtagsArray(hashtags),
          image_prompt: post.image_prompt || "",
          rewriteQualityInstructions: `Rewrite this as a high-quality, industry-specific social post. Use the selected improvement action as hard guidance. The selected audience is ${finalAudience || post.audience_target || "the current target audience"}, the selected reach is ${selectedReach}, and the tone guidance is ${selectedTone}. Keep the result useful, specific to ${cleanText(profile?.industry) || cleanText(campaign?.business_type) || "the business industry"}, platform-appropriate, and likely to generate enquiries, bookings, visits, orders or messages. Do not use generic wording.`,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || result?.message || "Could not improve this post.");
      }

      const saved = await applyRewrittenPost(result, {
        audience_target: post.audience_target || finalAudience || null,
      });

      if (!saved) return;

      showMessage(result?.improvement_summary || `Improved: ${actionLabel}`, "success");
    } catch (error: any) {
      showMessage(error?.message || "Could not improve this post.", "error");
    } finally {
      setRewritingAction("");
    }
  };

  const rewriteForAudience = async () => {
    if (!post?.id) return;

    const finalAudience =
      audienceTarget === "Custom audience"
        ? customAudienceTarget.trim()
        : audienceTarget.trim();

    if (!finalAudience) {
      showMessage("Please enter who this post is for.", "warning");
      return;
    }

    if (!caption.trim()) {
      showMessage("This post needs a caption before it can be improved.", "warning");
      return;
    }

    setRewritingAction("audience");
    setMessage(null);

    try {
      const response = await fetch("/api/rewritePost", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "gemini",
          audienceTarget: finalAudience,
          marketReach: marketReachTarget,
          tone: getToneForRewrite(),
          toneAdjustment: toneTarget,
          businessName:
            cleanText(profile?.business_name) ||
            cleanText(campaign?.business_name) ||
            "the business",
          industry:
            cleanText(profile?.industry) ||
            cleanText(campaign?.business_type) ||
            "general business",
          platform: post.platform || "Facebook",
          caption,
          cta,
          hashtags: getHashtagsArray(hashtags),
          image_prompt: post.image_prompt || "",
          rewriteQualityInstructions: `Rewrite this as a high-quality, industry-specific social post. Use the selected audience, market reach and tone as hard guidance. Keep the business context, platform, CTA and media prompt aligned. Avoid generic filler. Make it sound like a real ${cleanText(profile?.industry) || cleanText(campaign?.business_type) || "business"} post for ${finalAudience}.`,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || result?.message || "Could not improve this post.");
      }

      const saved = await applyRewrittenPost(result, {
        audience_target: finalAudience,
      });

      if (!saved) return;

      showMessage(result?.improvement_summary || `Improved for ${finalAudience}.`, "success");
    } catch (error: any) {
      showMessage(error?.message || "Could not improve this post.", "error");
    } finally {
      setRewritingAction("");
    }
  };

  const handleUploadMedia = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!post?.id) return;

    const file = event.target.files?.[0];

    if (!file) return;

    setSaving(true);
    setMessage(null);

    try {
      const postUserId = cleanText(post.user_id) || "anonymous";
      const extension = file.name.split(".").pop() || "jpg";
      const path = `${postUserId}/posts/${post.id}/media/${Date.now()}-${getSafeFileName(file.name)}.${extension}`;
      const mediaTypeValue = file.type.startsWith("video/")
        ? "video"
        : file.type.includes("pdf")
          ? "pdf"
          : "image";

      const { error: uploadError } = await supabase.storage
        .from("campaign-assets")
        .upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: true,
        });

      if (uploadError) throw new Error(uploadError.message);

      const { data: publicUrlData } = supabase.storage
        .from("campaign-assets")
        .getPublicUrl(path);

      const mediaUpdate = {
        media_url: publicUrlData.publicUrl,
        media_type: mediaTypeValue,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("campaign_posts")
        .update(mediaUpdate)
        .eq("id", post.id);

      if (updateError) throw new Error(updateError.message);

      setPreparedMedia(null);
      refreshPostFromUpdates(mediaUpdate);
      showMessage("Media updated.", "success");
    } catch (error: any) {
      showMessage(error?.message || "Could not upload media.", "error");
    } finally {
      event.target.value = "";
      setSaving(false);
    }
  };

  const removeMedia = async () => {
    if (!post?.id) return;

    setSaving(true);
    setMessage(null);

    const updates = {
      media_url: null,
      media_type: null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("campaign_posts")
      .update(updates)
      .eq("id", post.id);

    if (error) {
      showMessage(error.message || "Could not remove media.", "error");
      setSaving(false);
      return;
    }

    setPreparedMedia(null);
    refreshPostFromUpdates(updates);
    showMessage("Media removed.", "success");
    setSaving(false);
  };

  const downloadOriginalMedia = () => {
    if (!mediaUrl) return;

    const extension = isVideo ? "mp4" : isFlyer ? "pdf" : "jpg";
    triggerDownload(mediaUrl, `${getSafeFileName(title)}-original.${extension}`);
  };

  const openPrepareMode = () => {
    if (!canPrepareMedia) return;

    setPrepareMode(true);
    setMessage(null);
  };

  const resetTransform = () => {
    setFitMode("fill");
    setMediaZoom(1);
    setMediaOffset({ x: 0, y: 0 });
    setPreparedMedia(null);
  };

  const fitFullImage = () => {
    setFitMode("fit");
    setMediaZoom(1);
    setMediaOffset({ x: 0, y: 0 });
    setPreparedMedia(null);
  };

  const fillFrame = () => {
    setFitMode("fill");
    setMediaZoom(1);
    setMediaOffset({ x: 0, y: 0 });
    setPreparedMedia(null);
  };

  const changePreset = (value: ResizePresetValue) => {
    setResizePresetValue(value);
    setMediaZoom(1);
    setMediaOffset({ x: 0, y: 0 });
    setPreparedMedia(null);
  };

  const startMediaDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!canPrepareMedia) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    setMediaDrag({
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffset: mediaOffset,
    });
  };

  const updateMediaDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!mediaDrag) return;

    event.preventDefault();

    setMediaOffset({
      x: mediaDrag.startOffset.x + (event.clientX - mediaDrag.startClientX),
      y: mediaDrag.startOffset.y + (event.clientY - mediaDrag.startClientY),
    });
  };

  const stopMediaDrag = () => {
    setMediaDrag(null);
  };

  const prepareImage = async () => {
    if (!post?.id || !canPrepareMedia) return;

    setPreparingMedia(true);
    setMessage(null);

    try {
      const response = await fetch("/api/media/resize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId: post.id,
          mediaUrl,
          preset: selectedPreset.value,
          mode: "transform",
          fitMode,
          zoom: mediaZoom,
          offsetX: mediaOffset.x,
          offsetY: mediaOffset.y,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || result?.message || "Could not prepare this image.");
      }

      const url = result?.url || result?.publicUrl || result?.public_url;

      if (!url) {
        throw new Error("The prepared image was created but no link was returned.");
      }

      setPreparedMedia({
        url,
        label: result?.label || selectedPreset.label,
        width: Number(result?.width || selectedPreset.width),
        height: Number(result?.height || selectedPreset.height),
      });

      showMessage("Prepared image created.", "success");
    } catch (error: any) {
      showMessage(error?.message || "Could not prepare this image.", "error");
    } finally {
      setPreparingMedia(false);
    }
  };

  const downloadPreparedImage = () => {
    if (!preparedMedia?.url) return;

    triggerDownload(
      preparedMedia.url,
      `${getSafeFileName(title)}-${preparedMedia.width}x${preparedMedia.height}.jpg`,
    );
  };

  const sharePreparedImage = async () => {
    if (!preparedMedia?.url) {
      showMessage("Create a prepared image first.", "warning");
      return;
    }

    setSharingMedia(true);

    try {
      await copyCaption();
      const file = await urlToShareFile(preparedMedia.url, getSafeFileName(title));
      const nav = navigator as any;

      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({
          title,
          text: fullCaption,
          files: [file],
        });

        showMessage("Share sheet opened.", "success");
      } else {
        downloadPreparedImage();
        window.open(getPlatformUrl(platformName), "_blank", "noopener,noreferrer");
        showMessage("Sharing is not supported here. Prepared image downloaded and platform opened.", "warning");
      }
    } catch {
      downloadPreparedImage();
      window.open(getPlatformUrl(platformName), "_blank", "noopener,noreferrer");
      showMessage("Sharing was not available. Prepared image downloaded and platform opened.", "warning");
    } finally {
      setSharingMedia(false);
    }
  };

  const postManually = async () => {
    await copyCaption();
    window.open(getPlatformUrl(platformName), "_blank", "noopener,noreferrer");
  };

  const autopostNow = async () => {
    if (!post?.id) return;

    const endpoint =
      platformName === "Instagram"
        ? "/api/instagram/publish"
        : platformName === "Facebook"
          ? "/api/facebook/publish"
          : "";

    if (!endpoint) {
      showMessage("Autopost is not available for this platform. Use manual posting instead.", "warning");
      return;
    }

    setPublishing(true);
    setMessage(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId: post.id,
          post_id: post.id,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Autopost needs attention. You can still post manually.",
        );
      }

      refreshPostFromUpdates({
        is_posted: true,
        status: "posted",
        publish_status: "posted",
        posted_at: new Date().toISOString(),
        publish_error: null,
      });

      showMessage(result?.message || "Autoposted successfully.", "success");
    } catch (error: any) {
      showMessage(
        error?.message ||
          "Autopost could not complete. Use manual posting or reconnect accounts.",
        "warning",
      );
    } finally {
      setPublishing(false);
    }
  };

  const markAsPosted = async () => {
    if (!post?.id) return;

    setSaving(true);
    setMessage(null);

    const updates = {
      is_posted: true,
      status: "posted",
      publish_status: "posted",
      posted_at: new Date().toISOString(),
      publish_error: null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("campaign_posts")
      .update(updates)
      .eq("id", post.id);

    if (error) {
      showMessage(error.message || "Could not mark this as posted.", "error");
      setSaving(false);
      return;
    }

    refreshPostFromUpdates(updates);
    showMessage("Marked as posted.", "success");
    setSaving(false);
  };

  const markAsNotPosted = async () => {
    if (!post?.id) return;

    setSaving(true);
    setMessage(null);

    const updates = {
      is_posted: false,
      status: "ready",
      publish_status: "ready",
      posted_at: null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("campaign_posts")
      .update(updates)
      .eq("id", post.id);

    if (error) {
      showMessage(error.message || "Could not update this post.", "error");
      setSaving(false);
      return;
    }

    refreshPostFromUpdates(updates);
    showMessage("Post set back to ready.", "success");
    setSaving(false);
  };

  if (loading) {
    return (
      <main className="f1-review-page-shell">
        <section className="f1-review-loading-card">
          <p>Loading post...</p>
        </section>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="f1-review-page-shell">
        <section className="f1-review-loading-card">
          <h1>Post not found</h1>
          <p>{message?.text || "This post could not be loaded."}</p>
          <button type="button" onClick={() => router.push("/posts")}>
            Back to posts
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="f1-review-page-shell">
      <section className="f1-review-hero">
        <button
          type="button"
          className="f1-review-back-button"
          onClick={() => router.push("/posts")}
        >
          ← Back to posts
        </button>

        <div className="f1-review-hero-copy">
          <span>{platformName}</span>
          <h1>{title}</h1>
          <p>
            Review the wording, prepare the media, then post manually, share the
            prepared image, or autopost when connected.
          </p>
        </div>

        <div className={`f1-review-status-pill ${postIsPosted ? "is-posted" : ""}`}>
          {postIsPosted ? "Posted" : "Ready"}
        </div>
      </section>

      {message && (
        <div className={`f1-review-message is-${message.tone}`}>
          {message.text}
        </div>
      )}

      <section className={`f1-review-workspace ${prepareMode ? "is-preparing" : ""}`}>
        <section className="f1-review-media-card">
          <header className="f1-review-card-header">
            <div>
              <span>Media</span>
              <h2>{prepareMode ? "Prepare media" : "Media preview"}</h2>
            </div>

            {canPrepareMedia && (
              <button
                type="button"
                className="f1-review-secondary-button"
                onClick={() => setPrepareMode((current) => !current)}
              >
                {prepareMode ? "Back to preview" : "Prepare media"}
              </button>
            )}
          </header>

          {!prepareMode && (
            <>
              <div className="f1-review-media-frame">
                {mediaUrl ? (
                  isVideo ? (
                    <video src={mediaUrl} controls />
                  ) : isFlyer ? (
                    <div className="f1-review-empty-media">
                      <strong>PDF / flyer attached</strong>
                      <p>Open or download the file before posting.</p>
                    </div>
                  ) : (
                    <img src={mediaUrl} alt="Post media" />
                  )
                ) : (
                  <div className="f1-review-empty-media">
                    <strong>No media attached</strong>
                    <p>Upload media to make this post ready.</p>
                  </div>
                )}
              </div>

              <div className="f1-review-media-actions">
                <label className="f1-review-upload-button">
                  <input
                    type="file"
                    accept="image/*,video/*,application/pdf"
                    onChange={handleUploadMedia}
                    disabled={saving}
                  />
                  Upload / replace media
                </label>

                {mediaUrl && (
                  <>
                    <a
                      href={mediaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="f1-review-secondary-button"
                    >
                      View media
                    </a>
                    <button
                      type="button"
                      className="f1-review-secondary-button"
                      onClick={downloadOriginalMedia}
                    >
                      Download media
                    </button>
                    <button
                      type="button"
                      className="f1-review-danger-button"
                      onClick={removeMedia}
                      disabled={saving}
                    >
                      Remove media
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {prepareMode && canPrepareMedia && (
            <div className="f1-review-prepare-workspace">
              <div className="f1-review-editor-stage">
                <div
                  ref={mediaFrameRef}
                  className="f1-review-transform-frame"
                  style={getPreparedFrameStyle(selectedPreset)}
                  onPointerDown={startMediaDrag}
                  onPointerMove={updateMediaDrag}
                  onPointerUp={stopMediaDrag}
                  onPointerCancel={stopMediaDrag}
                  onPointerLeave={stopMediaDrag}
                >
                  <img
                    src={mediaUrl}
                    alt="Prepare media preview"
                    draggable={false}
                    style={getPreparedImageStyle({
                      zoom: mediaZoom,
                      offset: mediaOffset,
                      fitMode,
                    })}
                  />
                  <span className="f1-review-transform-grid" />
                  <span className="f1-review-corner is-top-left" />
                  <span className="f1-review-corner is-top-right" />
                  <span className="f1-review-corner is-bottom-left" />
                  <span className="f1-review-corner is-bottom-right" />
                </div>

                <p className="f1-review-editor-tip">
                  Drag the image inside the frame. Use zoom, Fit and Fill to get
                  the crop looking right.
                </p>
              </div>

              <aside className="f1-review-editor-controls">
                <div className="f1-review-control-group">
                  <span>Platform size</span>
                  <div className="f1-review-preset-list">
                    {resizePresets.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        className={resizePresetValue === preset.value ? "is-active" : ""}
                        onClick={() => changePreset(preset.value)}
                      >
                        <strong>{preset.label}</strong>
                        <small>
                          {preset.width} × {preset.height}
                        </small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="f1-review-control-group">
                  <span>Position image</span>
                  <label className="f1-review-slider-label">
                    <strong>Zoom</strong>
                    <input
                      type="range"
                      min="0.65"
                      max="3"
                      step="0.01"
                      value={mediaZoom}
                      onChange={(event) => {
                        setMediaZoom(Number(event.target.value));
                        setPreparedMedia(null);
                      }}
                    />
                  </label>

                  <div className="f1-review-three-actions">
                    <button type="button" onClick={fitFullImage}>
                      Fit
                    </button>
                    <button type="button" onClick={fillFrame}>
                      Fill
                    </button>
                    <button type="button" onClick={resetTransform}>
                      Reset
                    </button>
                  </div>
                </div>

                <div className="f1-review-control-group">
                  <span>Output</span>
                  <button
                    type="button"
                    className="f1-review-primary-button"
                    onClick={prepareImage}
                    disabled={preparingMedia}
                  >
                    {preparingMedia ? "Creating..." : "Create prepared image"}
                  </button>

                  {preparedMedia?.url && (
                    <div className="f1-review-prepared-card">
                      <strong>{preparedMedia.label}</strong>
                      <p>
                        {preparedMedia.width} × {preparedMedia.height}
                      </p>

                      <div className="f1-review-two-actions">
                        <button
                          type="button"
                          onClick={sharePreparedImage}
                          disabled={sharingMedia}
                        >
                          {sharingMedia ? "Opening share..." : "Share"}
                        </button>
                        <button type="button" onClick={downloadPreparedImage}>
                          Download
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          )}
        </section>

        <aside className="f1-review-side-stack">
          <section className="f1-review-card">
            <header className="f1-review-card-header compact">
              <div>
                <span>Step 1</span>
                <h2>Check the wording</h2>
              </div>
            </header>

            <label className="f1-review-field">
              <strong>Caption</strong>
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                rows={8}
              />
            </label>

            <label className="f1-review-field">
              <strong>CTA</strong>
              <input
                value={cta}
                onChange={(event) => setCta(event.target.value)}
                placeholder="Book now, message us, visit the website..."
              />
            </label>

            <label className="f1-review-field">
              <strong>Hashtags</strong>
              <input
                value={hashtags}
                onChange={(event) => setHashtags(event.target.value)}
                placeholder="#LocalBusiness #Marketing"
              />
            </label>

            <div className="f1-review-two-actions">
              <button
                type="button"
                className="f1-review-primary-button"
                onClick={saveWording}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save wording"}
              </button>
              <button
                type="button"
                className="f1-review-secondary-button"
                onClick={copyCaption}
              >
                Copy caption
              </button>
            </div>
          </section>

          <section className="f1-review-card">
            <header className="f1-review-card-header compact">
              <div>
                <span>Improve</span>
                <h2>Make this post stronger</h2>
              </div>
            </header>

            <div className="f1-review-improve-grid">
              {quickImproveActions.map((action) => (
                <button
                  key={action.value}
                  type="button"
                  onClick={() => quickImprovePost(action.value)}
                  disabled={Boolean(rewritingAction)}
                >
                  {rewritingAction === action.value ? "Improving..." : action.label}
                </button>
              ))}
            </div>

            <div className="f1-review-target-grid">
              <label>
                <strong>Audience</strong>
                <select
                  value={audienceTarget}
                  onChange={(event) => setAudienceTarget(event.target.value)}
                >
                  <option>Small business owners</option>
                  <option>Local customers</option>
                  <option>Homeowners</option>
                  <option>Families</option>
                  <option>Trade customers</option>
                  <option>Custom audience</option>
                </select>
              </label>

              {audienceTarget === "Custom audience" && (
                <label>
                  <strong>Custom audience</strong>
                  <input
                    value={customAudienceTarget}
                    onChange={(event) => setCustomAudienceTarget(event.target.value)}
                    placeholder="Example: landlords, office managers..."
                  />
                </label>
              )}

              <label>
                <strong>Reach</strong>
                <select
                  value={marketReachTarget}
                  onChange={(event) => setMarketReachTarget(event.target.value)}
                >
                  {marketReachOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label>
                <strong>Tone</strong>
                <select
                  value={toneTarget}
                  onChange={(event) => setToneTarget(event.target.value)}
                >
                  {toneOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="button"
              className="f1-review-secondary-button full"
              onClick={rewriteForAudience}
              disabled={Boolean(rewritingAction)}
            >
              {rewritingAction === "audience"
                ? "Improving..."
                : "Improve for selected audience"}
            </button>
          </section>

          <section className="f1-review-card">
            <header className="f1-review-card-header compact">
              <div>
                <span>Step 2</span>
                <h2>Post it</h2>
              </div>
            </header>

            <p className="f1-review-muted">
              FromOne copies the caption and opens {platformName}. Add your
              prepared media, paste the caption, then publish.
            </p>

            <button
              type="button"
              className="f1-review-primary-button"
              onClick={postManually}
            >
              Post manually to {platformName}
            </button>

            <div className="f1-review-two-actions">
              <button
                type="button"
                className="f1-review-secondary-button"
                onClick={sharePreparedImage}
                disabled={!preparedMedia?.url || sharingMedia}
              >
                {sharingMedia ? "Opening..." : "Share prepared image"}
              </button>

              <button
                type="button"
                className="f1-review-secondary-button"
                onClick={autopostNow}
                disabled={
                  publishing ||
                  (platformName !== "Facebook" && platformName !== "Instagram")
                }
              >
                {publishing ? "Posting..." : `Autopost to ${platformName}`}
              </button>
            </div>

            <div className="f1-review-two-actions">
              <button type="button" onClick={markAsPosted} disabled={saving}>
                Mark as posted
              </button>
              <button type="button" onClick={markAsNotPosted} disabled={saving}>
                Mark as not posted
              </button>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
