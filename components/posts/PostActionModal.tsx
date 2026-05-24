import { ChangeEvent, CSSProperties, PointerEvent, RefObject, useRef, useState } from 'react';

type PostStatus = 'Ready' | 'Reminder set' | 'Posted' | 'Failed';

type ImprovementNote = {
  postId: string;
  label: string;
  detail: string;
};

type QuickImproveAction = {
  value: string;
  label: string;
};

type ResizePresetValue =
  | 'instagram-square'
  | 'instagram-portrait'
  | 'facebook-feed'
  | 'story-reel';

type ResizedMedia = {
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

type CropBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CropInteraction = {
  type: 'move' | 'tl' | 'tr' | 'bl' | 'br';
  startClientX: number;
  startClientY: number;
  startCrop: CropBox;
};

type MediaOffset = {
  x: number;
  y: number;
};

type MediaTransformDrag = {
  startClientX: number;
  startClientY: number;
  startOffset: MediaOffset;
};

type ActiveTransformPointer = {
  pointerId: number;
  clientX: number;
  clientY: number;
};

type MediaPinchGesture = {
  startDistance: number;
  startZoom: number;
  startOffset: MediaOffset;
  startCenterX: number;
  startCenterY: number;
};

type PrepareFitMode = 'fill' | 'fit';
type PrepareShellMode = 'inline' | 'desktop';

type PostActionModalProps = {
  selectedPost: any;
  editingPostId: string | null;
  editCaption: string;
  editCta: string;
  editHashtags: string;
  savingEdit: boolean;
  accessLocked: boolean;
  rewritingPost: boolean;
  rewritingAction: string;
  showImproveTools: boolean;
  quickImproveActions: QuickImproveAction[];
  dynamicAudienceTargets: string[];
  audienceTarget: string;
  customAudienceTarget: string;
  marketReachTarget: string;
  toneTarget: string;
  toneOptions: string[];
  activeImprovementNote: ImprovementNote | null;
  uploadingMediaPostId: string | null;
  removingMediaPostId: string | null;
  publishingPostId: string | null;
  savingReminderPostId: string | null;
  reminderValue: string;
  deletingPostId?: string | null;
  rescanningMediaPostId?: string | null;
  mediaRescanUsageLabel?: string;
  videoRescanUsageLabel?: string;
  postRef?: RefObject<HTMLElement | null>;
  mediaRef?: RefObject<HTMLElement | null>;
  publishRef?: RefObject<HTMLElement | null>;
  getPostPositionLabel: (post: any) => string;
  getPlatformDisplayName: (post: any) => string;
  getPostStatus: (post: any) => PostStatus;
  getImageGuidance: (post: any) => string;
  getReadableDateTime: (value?: string | null) => string;
  mediaRequiredForPlatform: (platform?: string) => boolean;
  canDirectPublishToFacebook: (post: any) => boolean;
  canDirectPublishToInstagram: (post: any) => boolean;
  canDemoPublishToTikTok?: (post: any) => boolean;
  isPostPosted: (post: any) => boolean;
  isPostScheduledToday: (post: any) => boolean;
  onClose: () => void;
  onStartEditingPost: (post: any) => void;
  onCancelEditingPost: () => void;
  onSaveEditedPost: () => void;
  onSetEditCaption: (value: string) => void;
  onSetEditCta: (value: string) => void;
  onSetEditHashtags: (value: string) => void;
  onToggleImproveTools: () => void;
  onQuickImprovePost: (post: any, action: string) => void;
  onRewriteForAudience: (post: any) => void;
  onRescanPostMedia?: (post: any) => void;
  onSetAudienceTarget: (value: string) => void;
  onSetCustomAudienceTarget: (value: string) => void;
  onSetMarketReachTarget: (value: string) => void;
  onSetToneTarget: (value: string) => void;
  onUploadMedia: (post: any, event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveMedia: (post: any) => void;
  onPublishToFacebook: (post: any) => void;
  onPublishToInstagram: (post: any) => void;
  onPublishToTikTokDemo?: (post: any) => void;
  onCopyPost: (post: any) => void;
  onOpenPlatform: (platform: string) => void;
  onMarkAsPosted: (postId: string) => void;
  onMarkAsNotPosted: (postId: string) => void;
  onSetReminderValue: (value: string) => void;
  onSaveReminder: (post: any) => void;
  onClearReminder: (post: any) => void;
  onDeletePost?: (post: any) => void;
};

const marketReachOptions = [
  'Local customers',
  'Regional customers',
  'Nationwide UK customers',
  'Online customers',
];

const resizePresets: ResizePreset[] = [
  {
    value: 'instagram-square',
    label: 'Instagram square',
    width: 1080,
    height: 1080,
    help: 'Best for simple Instagram and Facebook image posts.',
  },
  {
    value: 'instagram-portrait',
    label: 'Instagram portrait',
    width: 1080,
    height: 1350,
    help: 'Best for Instagram feed posts with more screen space.',
  },
  {
    value: 'facebook-feed',
    label: 'Facebook post',
    width: 1200,
    height: 630,
    help: 'Best for Facebook feed and link-style landscape posts.',
  },
  {
    value: 'story-reel',
    label: 'Story / Reel',
    width: 1080,
    height: 1920,
    help: 'Best for Stories, Reels covers and vertical promotions.',
  },
];


function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPresetAspect(preset: ResizePreset) {
  return preset.width / preset.height;
}

function createDefaultCrop(preset: ResizePreset): CropBox {
  const aspect = getPresetAspect(preset);
  let width = 86;
  let height = width / aspect;

  if (height > 86) {
    height = 86;
    width = height * aspect;
  }

  return {
    x: (100 - width) / 2,
    y: (100 - height) / 2,
    width,
    height,
  };
}

function getCropStyle(crop: CropBox): CSSProperties {
  return {
    left: `${crop.x}%`,
    top: `${crop.y}%`,
    width: `${crop.width}%`,
    height: `${crop.height}%`,
  };
}

const platformCaptionLimits: Record<string, number> = {
  Facebook: 700,
  Instagram: 1200,
  TikTok: 300,
};

function getCaptionLimitForPlatform(platform?: string | null) {
  const cleanPlatform = String(platform || '').toLowerCase();

  if (cleanPlatform.includes('instagram')) return platformCaptionLimits.Instagram;
  if (cleanPlatform.includes('tiktok')) return platformCaptionLimits.TikTok;

  return platformCaptionLimits.Facebook;
}

function getCaptionCountStatus(count: number, limit: number) {
  if (count > limit) return 'over';
  if (count > limit * 0.9) return 'near';
  return 'safe';
}

function getCaptionCounterStyle(status: string): CSSProperties {
  if (status === 'over') return { color: '#fecaca', fontWeight: 900 };
  if (status === 'near') return { color: '#ffe58a', fontWeight: 900 };
  return { color: 'rgba(248, 250, 252, 0.64)', fontWeight: 850 };
}

function getBriefMediaGuidance({
  hasMedia,
  isVideoMedia,
  isFlyerMedia,
}: {
  hasMedia: boolean;
  isVideoMedia: boolean;
  isFlyerMedia: boolean;
}) {
  if (!hasMedia) return 'Add media before posting.';
  if (isVideoMedia) return 'Video attached.';
  if (isFlyerMedia) return 'Flyer attached.';
  return 'Image attached.';
}



function getSafeDownloadName(value?: string | null) {
  return (
    String(value || 'fromone-post-media')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'fromone-post-media'
  );
}

function triggerDownload(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function urlToShareFile(url: string, filename: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Could not load the prepared media for sharing.');
  }

  const blob = await response.blob();
  const contentType = blob.type || 'image/jpeg';
  const extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';

  return new File([blob], `${filename}.${extension}`, { type: contentType });
}

function isMetaReconnectError(value?: string | null) {
  const message = String(value || '').toLowerCase();

  return (
    message.includes('connection has expired') ||
    message.includes('reconnect facebook') ||
    message.includes('reconnect instagram') ||
    message.includes('error validating access token') ||
    message.includes('invalid access token') ||
    message.includes('session is invalid') ||
    message.includes('user logged out')
  );
}

function isGenericPostTitle(title?: string | null) {
  const cleanTitle = String(title || '').trim();

  if (!cleanTitle) return true;

  return (
    /^(facebook|instagram|tiktok|post)\s+post\s*\d*$/i.test(cleanTitle) ||
    /^(facebook|instagram|tiktok)\s*\d+$/i.test(cleanTitle) ||
    /^post\s*\d+$/i.test(cleanTitle)
  );
}

function getBetterPostTitle(post: any, fallback: string) {
  const savedTitle = String(post?.title || '').trim();

  if (savedTitle && !isGenericPostTitle(savedTitle)) {
    return savedTitle;
  }

  const caption = String(post?.caption || '').trim();

  if (caption) {
    const firstLine = caption
      .split(/\n+/)
      .map((line) => line.trim())
      .find(Boolean);

    const firstSentence = firstLine?.split(/[.!?]/)[0]?.trim();
    const candidate = firstSentence || firstLine || '';

    if (candidate.length > 8) {
      return candidate.length > 64 ? `${candidate.slice(0, 64).trim()}...` : candidate;
    }
  }

  return fallback;
}

export default function PostActionModal({
  selectedPost,
  editingPostId,
  editCaption,
  editCta,
  editHashtags,
  savingEdit,
  accessLocked,
  rewritingPost,
  rewritingAction,
  showImproveTools,
  quickImproveActions,
  dynamicAudienceTargets,
  audienceTarget,
  customAudienceTarget,
  marketReachTarget,
  toneTarget,
  toneOptions,
  activeImprovementNote,
  uploadingMediaPostId,
  removingMediaPostId,
  publishingPostId,
  savingReminderPostId,
  reminderValue,
  deletingPostId,
  rescanningMediaPostId,
  mediaRescanUsageLabel,
  videoRescanUsageLabel,
  postRef,
  mediaRef,
  publishRef,
  getPostPositionLabel,
  getPlatformDisplayName,
  getPostStatus,
  getImageGuidance,
  getReadableDateTime,
  mediaRequiredForPlatform,
  canDirectPublishToFacebook,
  canDirectPublishToInstagram,
  canDemoPublishToTikTok,
  isPostPosted,
  isPostScheduledToday,
  onClose,
  onStartEditingPost,
  onCancelEditingPost,
  onSaveEditedPost,
  onSetEditCaption,
  onSetEditCta,
  onSetEditHashtags,
  onToggleImproveTools,
  onQuickImprovePost,
  onRewriteForAudience,
  onRescanPostMedia,
  onSetAudienceTarget,
  onSetCustomAudienceTarget,
  onSetMarketReachTarget,
  onSetToneTarget,
  onUploadMedia,
  onRemoveMedia,
  onPublishToFacebook,
  onPublishToInstagram,
  onPublishToTikTokDemo,
  onCopyPost,
  onOpenPlatform,
  onMarkAsPosted,
  onMarkAsNotPosted,
  onSetReminderValue,
  onSaveReminder,
  onClearReminder,
  onDeletePost,
}: PostActionModalProps) {
  const [showImprovePanel, setShowImprovePanel] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showPrepareMediaModal, setShowPrepareMediaModal] = useState(false);
  const [prepareShellMode, setPrepareShellMode] = useState<PrepareShellMode>('inline');
  const [resizePresetValue, setResizePresetValue] = useState<ResizePresetValue>('instagram-portrait');
  const [cropBox, setCropBox] = useState<CropBox>(() => createDefaultCrop(resizePresets[1]));
  const [cropInteraction, setCropInteraction] = useState<CropInteraction | null>(null);
  const [prepareFitMode, setPrepareFitMode] = useState<PrepareFitMode>('fill');
  const [mediaZoom, setMediaZoom] = useState(1);
  const [mediaOffset, setMediaOffset] = useState<MediaOffset>({ x: 0, y: 0 });
  const [mediaTransformDrag, setMediaTransformDrag] = useState<MediaTransformDrag | null>(null);
  const [resizingMedia, setResizingMedia] = useState(false);
  const [sharingMedia, setSharingMedia] = useState(false);
  const [resizedMedia, setResizedMedia] = useState<ResizedMedia | null>(null);
  const [resizeError, setResizeError] = useState('');
  const cropStageRef = useRef<HTMLDivElement | null>(null);
  const transformFrameRef = useRef<HTMLDivElement | null>(null);
  const activeTransformPointersRef = useRef<Map<number, ActiveTransformPointer>>(new Map());
  const mediaPinchGestureRef = useRef<MediaPinchGesture | null>(null);

  if (!selectedPost) return null;

  const platformName = getPlatformDisplayName(selectedPost);
  const modalTitle = getBetterPostTitle(
    selectedPost,
    `${platformName} ${getPostPositionLabel(selectedPost)}`,
  );
  const captionLimit = getCaptionLimitForPlatform(platformName);
  const savedCaptionLength = String(selectedPost.caption || '').length;
  const editedCaptionLength = String(editCaption || '').length;
  const savedCaptionStatus = getCaptionCountStatus(savedCaptionLength, captionLimit);
  const editedCaptionStatus = getCaptionCountStatus(editedCaptionLength, captionLimit);
  const platformKey = String(selectedPost.platform || '').toLowerCase();
  const mediaType = String(selectedPost.media_type || '').toLowerCase();

  const isFacebookPost = platformKey.includes('facebook');
  const isInstagramPost = platformKey.includes('instagram');
  const isTikTokPost = platformKey.includes('tiktok');
  const tiktokDemoAvailable = Boolean(canDemoPublishToTikTok?.(selectedPost));
  const canAutoPublish = isFacebookPost || isInstagramPost;
  const hasMedia = Boolean(selectedPost.media_url);
  const isVideoMedia = mediaType === 'video';
  const isFlyerMedia =
    mediaType === 'flyer' ||
    mediaType === 'pdf' ||
    String(selectedPost.media_url || '').toLowerCase().includes('.pdf');
  const needsMedia = mediaRequiredForPlatform(selectedPost.platform) && !hasMedia;
  const canResizeImageMedia = hasMedia && !isVideoMedia && !isFlyerMedia;
  const selectedResizePreset =
    resizePresets.find((item) => item.value === resizePresetValue) || resizePresets[1];
  const selectedResizeAspect = getPresetAspect(selectedResizePreset);
  const posted = isPostPosted(selectedPost);
  const isPublishing = publishingPostId === selectedPost.id;
  const directFacebookReady = isFacebookPost && canDirectPublishToFacebook(selectedPost);
  const directInstagramReady = isInstagramPost && canDirectPublishToInstagram(selectedPost);
  const directAutoPublishReady = directFacebookReady || directInstagramReady;
  const needsMetaConnection = canAutoPublish && !directAutoPublishReady;
  const isRescanning =
    rescanningMediaPostId === selectedPost.id ||
    (rewritingPost && rewritingAction === 'media_rescan');

  const instagramHasFlyerOnly = isInstagramPost && isFlyerMedia;
  const autoPublishPlatformName = isInstagramPost ? 'Instagram' : 'Facebook';
  const rescanUsageLabel = isVideoMedia ? videoRescanUsageLabel : mediaRescanUsageLabel;
  const statusLabel = getPostStatus(selectedPost) === 'Reminder set' ? 'Scheduled' : getPostStatus(selectedPost);

  const publishErrorNeedsReconnect = isMetaReconnectError(selectedPost.publish_error);
  const autopostNeedsAttention = canAutoPublish && (needsMetaConnection || publishErrorNeedsReconnect);
  const manualPlatformLabel = isFacebookPost
    ? 'Facebook'
    : isInstagramPost
      ? 'Instagram'
      : isTikTokPost
        ? 'TikTok'
        : platformName;

  const canUseManualPost = !posted && !isRescanning;
  const canUseAutopostPublish =
    canAutoPublish &&
    directAutoPublishReady &&
    !posted &&
    !isPublishing &&
    !isRescanning &&
    !needsMedia &&
    !instagramHasFlyerOnly &&
    !publishErrorNeedsReconnect;

  const handleManualPost = () => {
    onCopyPost(selectedPost);
    onOpenPlatform(manualPlatformLabel);
  };

  const handleAutopostPublish = () => {
    if (autopostNeedsAttention) {
      window.location.href = '/settings?setup=business';
      return;
    }

    if (directFacebookReady) {
      onPublishToFacebook(selectedPost);
      return;
    }

    if (directInstagramReady) {
      onPublishToInstagram(selectedPost);
      return;
    }

    if (tiktokDemoAvailable && onPublishToTikTokDemo) {
      onPublishToTikTokDemo(selectedPost);
      return;
    }

    onCopyPost(selectedPost);
  };

  const manualPostLabel = posted
    ? 'Already posted'
    : `Post manually to ${manualPlatformLabel}`;

  const manualHelpText = posted
    ? 'This post has already been marked as posted.'
    : `FromOne copies the wording and opens ${manualPlatformLabel}. Prepare or download the media here, add it to the platform, paste the caption, then publish.`;

  const autopostLabel = isPublishing
    ? 'Publishing...'
    : posted
      ? 'Already posted'
      : autopostNeedsAttention
        ? publishErrorNeedsReconnect
          ? 'Reconnect accounts'
          : 'Connect business account'
        : `Autopost to ${autoPublishPlatformName}`;

  const autopostHelpText = autopostNeedsAttention
    ? 'Autoposting needs a connected Facebook Page or Instagram professional account. Manual posting still works.'
    : canAutoPublish
      ? 'Autopost sends the caption and media automatically when the business account connection is healthy.'
      : 'Autopost is not available for this platform.';

  const handleDownloadOriginalMedia = () => {
    if (!selectedPost.media_url) return;

    const extension = isVideoMedia ? 'mp4' : isFlyerMedia ? 'pdf' : 'jpg';
    triggerDownload(
      selectedPost.media_url,
      `${getSafeDownloadName(modalTitle)}-original.${extension}`,
    );
  };

  const openPrepareMediaModal = () => {
    if (!canResizeImageMedia) return;

    setResizeError('');
    setResizedMedia(null);
    setCropBox(createDefaultCrop(selectedResizePreset));
    setPrepareFitMode('fill');
    setMediaZoom(1);
    setMediaOffset({ x: 0, y: 0 });
    setMediaTransformDrag(null);
    setPrepareShellMode(
      typeof window !== 'undefined' && window.matchMedia('(min-width: 761px)').matches
        ? 'desktop'
        : 'inline',
    );
    setShowPrepareMediaModal(true);
  };

  const closePrepareMediaModal = () => {
    if (resizingMedia) return;

    setCropInteraction(null);
    activeTransformPointersRef.current.clear();
    mediaPinchGestureRef.current = null;
    setMediaTransformDrag(null);
    setPrepareShellMode('inline');
    setShowPrepareMediaModal(false);
  };

  const updateCropPreset = (value: ResizePresetValue) => {
    const nextPreset = resizePresets.find((item) => item.value === value) || resizePresets[1];

    setResizePresetValue(value);
    setCropBox(createDefaultCrop(nextPreset));
    setMediaZoom(1);
    setMediaOffset({ x: 0, y: 0 });
    setResizeError('');
    setResizedMedia(null);
  };

  const getCropDelta = (event: PointerEvent<HTMLDivElement>, interaction: CropInteraction) => {
    const stage = cropStageRef.current;
    const rect = stage?.getBoundingClientRect();

    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return { dx: 0, dy: 0 };
    }

    return {
      dx: ((event.clientX - interaction.startClientX) / rect.width) * 100,
      dy: ((event.clientY - interaction.startClientY) / rect.height) * 100,
    };
  };

  const startCropInteraction = (
    event: PointerEvent<HTMLElement>,
    type: CropInteraction['type'],
  ) => {
    event.preventDefault();
    event.stopPropagation();

    event.currentTarget.setPointerCapture?.(event.pointerId);
    setCropInteraction({
      type,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startCrop: cropBox,
    });
  };

  const updateCropFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (!cropInteraction) return;

    event.preventDefault();

    const { dx, dy } = getCropDelta(event, cropInteraction);
    const startCrop = cropInteraction.startCrop;
    const minSize = 16;
    const aspect = selectedResizeAspect;

    if (cropInteraction.type === 'move') {
      setCropBox({
        ...startCrop,
        x: clampNumber(startCrop.x + dx, 0, 100 - startCrop.width),
        y: clampNumber(startCrop.y + dy, 0, 100 - startCrop.height),
      });
      return;
    }

    let nextWidth = startCrop.width;
    let nextHeight = startCrop.height;
    let nextX = startCrop.x;
    let nextY = startCrop.y;

    if (cropInteraction.type === 'br') {
      nextWidth = clampNumber(startCrop.width + dx, minSize, 100 - startCrop.x);
      nextHeight = nextWidth / aspect;

      if (startCrop.y + nextHeight > 100) {
        nextHeight = 100 - startCrop.y;
        nextWidth = nextHeight * aspect;
      }
    }

    if (cropInteraction.type === 'tr') {
      nextWidth = clampNumber(startCrop.width + dx, minSize, 100 - startCrop.x);
      nextHeight = nextWidth / aspect;
      nextY = startCrop.y + startCrop.height - nextHeight;

      if (nextY < 0) {
        nextY = 0;
        nextHeight = startCrop.y + startCrop.height;
        nextWidth = nextHeight * aspect;
      }
    }

    if (cropInteraction.type === 'bl') {
      nextWidth = clampNumber(startCrop.width - dx, minSize, startCrop.x + startCrop.width);
      nextHeight = nextWidth / aspect;
      nextX = startCrop.x + startCrop.width - nextWidth;

      if (startCrop.y + nextHeight > 100) {
        nextHeight = 100 - startCrop.y;
        nextWidth = nextHeight * aspect;
        nextX = startCrop.x + startCrop.width - nextWidth;
      }
    }

    if (cropInteraction.type === 'tl') {
      nextWidth = clampNumber(startCrop.width - dx, minSize, startCrop.x + startCrop.width);
      nextHeight = nextWidth / aspect;
      nextX = startCrop.x + startCrop.width - nextWidth;
      nextY = startCrop.y + startCrop.height - nextHeight;

      if (nextX < 0) {
        nextX = 0;
        nextWidth = startCrop.x + startCrop.width;
        nextHeight = nextWidth / aspect;
        nextY = startCrop.y + startCrop.height - nextHeight;
      }

      if (nextY < 0) {
        nextY = 0;
        nextHeight = startCrop.y + startCrop.height;
        nextWidth = nextHeight * aspect;
        nextX = startCrop.x + startCrop.width - nextWidth;
      }
    }

    setCropBox({
      x: clampNumber(nextX, 0, 100 - nextWidth),
      y: clampNumber(nextY, 0, 100 - nextHeight),
      width: clampNumber(nextWidth, minSize, 100),
      height: clampNumber(nextHeight, minSize, 100),
    });
  };

  const stopCropInteraction = () => {
    setCropInteraction(null);
  };


  const resetMediaTransform = () => {
    activeTransformPointersRef.current.clear();
    mediaPinchGestureRef.current = null;
    setMediaTransformDrag(null);
    setPrepareFitMode('fill');
    setMediaZoom(1);
    setMediaOffset({ x: 0, y: 0 });
    setResizeError('');
    setResizedMedia(null);
  };

  const fitFullImage = () => {
    activeTransformPointersRef.current.clear();
    mediaPinchGestureRef.current = null;
    setMediaTransformDrag(null);
    setPrepareFitMode('fit');
    setMediaZoom(1);
    setMediaOffset({ x: 0, y: 0 });
    setResizeError('');
    setResizedMedia(null);
  };

  const fillFrame = () => {
    activeTransformPointersRef.current.clear();
    mediaPinchGestureRef.current = null;
    setMediaTransformDrag(null);
    setPrepareFitMode('fill');
    setMediaZoom(1);
    setMediaOffset({ x: 0, y: 0 });
    setResizeError('');
    setResizedMedia(null);
  };

  const getTransformPointers = () => Array.from(activeTransformPointersRef.current.values());

  const getPointerDistance = (first: ActiveTransformPointer, second: ActiveTransformPointer) => {
    const deltaX = first.clientX - second.clientX;
    const deltaY = first.clientY - second.clientY;
    return Math.max(Math.hypot(deltaX, deltaY), 1);
  };

  const getPointerCenter = (first: ActiveTransformPointer, second: ActiveTransformPointer) => ({
    clientX: (first.clientX + second.clientX) / 2,
    clientY: (first.clientY + second.clientY) / 2,
  });

  const clampTransformOffset = (offset: MediaOffset, zoom = mediaZoom) => {
    const zoomRoom = Math.max(zoom - 1, 0);
    const maxOffset = Math.max(18, zoomRoom * 42);

    return {
      x: clampNumber(offset.x, -maxOffset, maxOffset),
      y: clampNumber(offset.y, -maxOffset, maxOffset),
    };
  };

  const startMediaTransformDrag = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    activeTransformPointersRef.current.set(event.pointerId, {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    });

    const pointers = getTransformPointers();

    if (pointers.length >= 2) {
      const [first, second] = pointers;
      const center = getPointerCenter(first, second);

      mediaPinchGestureRef.current = {
        startDistance: getPointerDistance(first, second),
        startZoom: mediaZoom,
        startOffset: mediaOffset,
        startCenterX: center.clientX,
        startCenterY: center.clientY,
      };

      setMediaTransformDrag(null);
      return;
    }

    setMediaTransformDrag({
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffset: mediaOffset,
    });
  };

  const updateMediaTransformDrag = (event: PointerEvent<HTMLDivElement>) => {
    const frame = transformFrameRef.current;
    const rect = frame?.getBoundingClientRect();

    if (!rect || rect.width <= 0 || rect.height <= 0) return;

    const activePointer = activeTransformPointersRef.current.get(event.pointerId);

    if (activePointer) {
      activeTransformPointersRef.current.set(event.pointerId, {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
      });
    }

    const pointers = getTransformPointers();

    if (pointers.length >= 2 && mediaPinchGestureRef.current) {
      event.preventDefault();

      const [first, second] = pointers;
      const pinch = mediaPinchGestureRef.current;
      const center = getPointerCenter(first, second);
      const distance = getPointerDistance(first, second);
      const nextZoom = clampNumber(pinch.startZoom * (distance / pinch.startDistance), 1, 3);
      const centerDeltaX = ((center.clientX - pinch.startCenterX) / rect.width) * 100;
      const centerDeltaY = ((center.clientY - pinch.startCenterY) / rect.height) * 100;

      setPrepareFitMode('fill');
      setMediaZoom(nextZoom);
      setMediaOffset(
        clampTransformOffset(
          {
            x: pinch.startOffset.x + centerDeltaX,
            y: pinch.startOffset.y + centerDeltaY,
          },
          nextZoom,
        ),
      );
      setResizeError('');
      setResizedMedia(null);
      return;
    }

    if (!mediaTransformDrag) return;

    event.preventDefault();
    if (prepareFitMode === 'fit') {
      setPrepareFitMode('fill');
    }

    const dx = ((event.clientX - mediaTransformDrag.startClientX) / rect.width) * 100;
    const dy = ((event.clientY - mediaTransformDrag.startClientY) / rect.height) * 100;

    setMediaOffset(
      clampTransformOffset({
        x: mediaTransformDrag.startOffset.x + dx,
        y: mediaTransformDrag.startOffset.y + dy,
      }),
    );
  };

  const stopMediaTransformDrag = (event?: PointerEvent<HTMLDivElement>) => {
    if (event) {
      activeTransformPointersRef.current.delete(event.pointerId);
    } else {
      activeTransformPointersRef.current.clear();
    }

    mediaPinchGestureRef.current = null;

    const remainingPointers = getTransformPointers();

    if (remainingPointers.length === 1 && prepareFitMode !== 'fit') {
      const remainingPointer = remainingPointers[0];

      setMediaTransformDrag({
        startClientX: remainingPointer.clientX,
        startClientY: remainingPointer.clientY,
        startOffset: mediaOffset,
      });
      return;
    }

    setMediaTransformDrag(null);
  };

  const updateMediaZoom = (value: string) => {
    const nextZoom = clampNumber(Number(value) || 1, 1, 3);
    setPrepareFitMode('fill');
    setMediaZoom(nextZoom);
    setResizeError('');
    setResizedMedia(null);
  };

  const getPreparedImageSource = () => resizedMedia?.url || selectedPost.media_url || '';

  const handleSharePreparedMedia = async () => {
    const mediaUrl = getPreparedImageSource();

    if (!mediaUrl) return;

    setSharingMedia(true);
    setResizeError('');
    onCopyPost(selectedPost);

    try {
      const filename = getSafeDownloadName(`${modalTitle}-${resizedMedia ? 'prepared' : 'original'}`);
      const file = await urlToShareFile(mediaUrl, filename);
      const nav = navigator as any;

      if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await nav.share({
          files: [file],
          title: modalTitle,
          text: 'Caption copied from FromOne. Paste it before posting.',
        });
        return;
      }

      throw new Error('Sharing files is not supported on this device.');
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        if (resizedMedia?.url) {
          handleDownloadResizedMedia();
        } else {
          handleDownloadOriginalMedia();
        }

        onOpenPlatform(manualPlatformLabel);
        setResizeError('Sharing is not supported here, so the caption was copied, the media was downloaded, and the platform was opened.');
      }
    } finally {
      setSharingMedia(false);
    }
  };

  const handleResizeMedia = async () => {
    if (!selectedPost.media_url || !canResizeImageMedia) return;

    setResizeError('');
    setResizingMedia(true);

    try {
      const response = await fetch('/api/media/resize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: selectedPost.id,
          mediaUrl: selectedPost.media_url,
          preset: selectedResizePreset.value,
          mode: 'transform',
          fitMode: prepareFitMode,
          transform: {
            zoom: mediaZoom,
            offsetX: mediaOffset.x,
            offsetY: mediaOffset.y,
          },
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result?.error || result?.message || 'Could not prepare this image.',
        );
      }

      const resizedUrl = result?.url || result?.publicUrl || result?.public_url;

      if (!resizedUrl) {
        throw new Error('The prepared image was created but no download link was returned.');
      }

      setResizedMedia({
        url: resizedUrl,
        label: result?.label || selectedResizePreset.label,
        width: Number(result?.width || selectedResizePreset.width),
        height: Number(result?.height || selectedResizePreset.height),
      });
    } catch (error: any) {
      setResizeError(
        error?.message ||
          'Could not prepare this image. Download the original media instead.',
      );
    } finally {
      setResizingMedia(false);
    }
  };

  const handleDownloadResizedMedia = () => {
    if (!resizedMedia?.url) return;

    triggerDownload(
      resizedMedia.url,
      `${getSafeDownloadName(modalTitle)}-${resizedMedia.width}x${resizedMedia.height}.jpg`,
    );
  };

  const openImprovePanel = () => {
    setShowImprovePanel((current) => !current);
    if (!showImproveTools) onToggleImproveTools();
  };

  return (
    <div
      className={`f1-post-modal-overlay ${showPrepareMediaModal && canResizeImageMedia && prepareShellMode === 'desktop' ? 'is-desktop-prepare-open' : ''}`}
      role="dialog"
      aria-modal="true"
    >
      {showPrepareMediaModal && canResizeImageMedia && prepareShellMode === 'desktop' && (
        <section className="f1-desktop-prepare-card f1-prepare-transform-modal">
          <header className="f1-inline-prepare-header f1-desktop-prepare-header">
            <div>
              <span>Prepare media</span>
              <h3>Move and zoom to fit</h3>
              <p>Choose a platform frame, then drag or zoom the image until it looks right.</p>
            </div>

            <button type="button" className="f1-post-close" onClick={closePrepareMediaModal} disabled={resizingMedia || sharingMedia}>
              Done
            </button>
          </header>

          <div className="f1-inline-prepare-layout f1-desktop-prepare-layout">
            <div className="f1-prepare-media-stage-card">
              <div
                ref={transformFrameRef}
                className={`f1-transform-frame is-${resizePresetValue}`}
                style={{ aspectRatio: `${selectedResizePreset.width} / ${selectedResizePreset.height}` }}
                onPointerDown={startMediaTransformDrag}
                onPointerMove={updateMediaTransformDrag}
                onPointerUp={stopMediaTransformDrag}
                onPointerCancel={stopMediaTransformDrag}
                onPointerLeave={stopMediaTransformDrag}
              >
                <div
                  className={`f1-transform-image-layer ${prepareFitMode === 'fit' ? 'is-fit' : 'is-fill'}`}
                  style={{
                    transform:
                      prepareFitMode === 'fit'
                        ? 'translate3d(0, 0, 0) scale(1)'
                        : `translate3d(${mediaOffset.x}%, ${mediaOffset.y}%, 0) scale(${mediaZoom})`,
                  }}
                >
                  <img src={selectedPost.media_url} alt="Prepare media preview" draggable={false} />
                </div>

                <div className="f1-transform-safe-frame">
                  <span className="f1-transform-grid" />
                  <span className="f1-transform-corner is-tl" />
                  <span className="f1-transform-corner is-tr" />
                  <span className="f1-transform-corner is-bl" />
                  <span className="f1-transform-corner is-br" />
                </div>
              </div>

              <p className="f1-prepare-media-tip">
                Drag the image to position it. Use the zoom slider, Fit or Fill to prepare it for the selected platform frame.
              </p>
            </div>

            <aside className="f1-prepare-media-controls f1-desktop-prepare-controls">
              <div>
                <strong>Platform frame</strong>
                <p>Pick the shape you want the final image to fit.</p>
              </div>

              <div className="f1-prepare-preset-grid">
                {resizePresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    className={preset.value === resizePresetValue ? 'is-active' : ''}
                    onClick={() => updateCropPreset(preset.value)}
                    disabled={resizingMedia || sharingMedia}
                  >
                    <strong>{preset.label}</strong>
                    <span>{preset.width} × {preset.height}</span>
                  </button>
                ))}
              </div>

              <div className="f1-transform-control-card">
                <div>
                  <strong>Position image</strong>
                  <p>{prepareFitMode === 'fit' ? 'Fit keeps the full image visible.' : 'Drag the image inside the fixed frame.'}</p>
                </div>

                <label className="f1-transform-zoom-control">
                  <span>Zoom</span>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={mediaZoom}
                    onChange={(event) => updateMediaZoom(event.target.value)}
                    disabled={resizingMedia || sharingMedia || prepareFitMode === 'fit'}
                  />
                  <small>{Math.round(mediaZoom * 100)}%</small>
                </label>

                <div className="f1-transform-quick-actions">
                  <button type="button" className={prepareFitMode === 'fit' ? 'is-active' : ''} onClick={fitFullImage} disabled={resizingMedia || sharingMedia}>
                    Fit full image
                  </button>
                  <button type="button" className={prepareFitMode === 'fill' ? 'is-active' : ''} onClick={fillFrame} disabled={resizingMedia || sharingMedia}>
                    Fill frame
                  </button>
                  <button type="button" onClick={resetMediaTransform} disabled={resizingMedia || sharingMedia}>
                    Reset
                  </button>
                </div>
              </div>

              <div className="f1-prepare-selected-card">
                <strong>{selectedResizePreset.label}</strong>
                <p>{selectedResizePreset.help}</p>
                <span>{selectedResizePreset.width} × {selectedResizePreset.height}</span>
              </div>

              <button
                type="button"
                className="f1-post-yellow-action f1-prepare-main-action"
                onClick={handleResizeMedia}
                disabled={resizingMedia || sharingMedia}
              >
                {resizingMedia ? 'Creating image...' : 'Create prepared image'}
              </button>

              {resizedMedia && (
                <div className="f1-prepare-ready-card">
                  <strong>Prepared image ready</strong>
                  <p>{resizedMedia.label} · {resizedMedia.width} × {resizedMedia.height}</p>
                  <div className="f1-prepare-ready-actions">
                    <button
                      type="button"
                      className="f1-post-yellow-action"
                      onClick={handleSharePreparedMedia}
                      disabled={sharingMedia || resizingMedia}
                    >
                      {sharingMedia ? 'Opening share...' : 'Share prepared image'}
                    </button>
                    <button
                      type="button"
                      className="f1-post-secondary"
                      onClick={handleDownloadResizedMedia}
                      disabled={sharingMedia || resizingMedia}
                    >
                      Download prepared image
                    </button>
                  </div>
                  <small>Caption is copied before sharing. If sharing is not supported, FromOne downloads the image and opens the platform.</small>
                </div>
              )}

              {resizeError && <small className="f1-post-resize-error">{resizeError}</small>}
            </aside>
          </div>
        </section>
      )}

      <section className="f1-post-modal-card">
        <header className="f1-post-modal-header">
          <div className="f1-post-modal-title-block">
            <div className="f1-post-eyebrow">{getPostPositionLabel(selectedPost)} · {platformName}</div>
            <h2>{modalTitle}</h2>
            <div className="f1-post-badges">
              <span>{statusLabel}</span>
              {isPostScheduledToday(selectedPost) && !posted && <span>Today</span>}
              {hasMedia && <span>{isVideoMedia ? 'Video' : isFlyerMedia ? 'Flyer' : 'Image'}</span>}
              {isTikTokPost && <span>TikTok manual</span>}
            </div>
          </div>

          <button type="button" className="f1-post-close" onClick={onClose}>
            Done
          </button>
        </header>

        <div className="f1-post-review-hint" aria-label="Review navigation hint">
          <span>Review tip</span>
          <strong>Use ↑ / ↓ keys or your mouse wheel to move through this post review.</strong>
        </div>

        <div className="f1-post-modal-body">
          <aside ref={mediaRef} className={`f1-post-media-panel ${showPrepareMediaModal ? 'is-preparing-media' : ''}`}>
            {!showPrepareMediaModal && (
              <>
                <div className="f1-post-media-frame">
                  {selectedPost.media_url ? (
                    isVideoMedia ? (
                      <video src={selectedPost.media_url} controls />
                    ) : isFlyerMedia ? (
                      <div className="f1-post-file-preview">
                        <strong>PDF flyer</strong>
                        <p>Open the flyer to check the details.</p>
                      </div>
                    ) : (
                      <img src={selectedPost.media_url} alt="Uploaded post media" />
                    )
                  ) : (
                    <div className="f1-post-file-preview">
                      <strong>No media yet</strong>
                      <p>Add a photo, video or flyer before posting.</p>
                    </div>
                  )}
                </div>

                <div className="f1-post-media-tools">
                  <div>
                    <strong>{getBriefMediaGuidance({ hasMedia, isVideoMedia, isFlyerMedia })}</strong>
                    {hasMedia && <p>{getImageGuidance(selectedPost)}</p>}
                  </div>

                  <label className="f1-post-yellow-action">
                    <input
                      type="file"
                      accept="image/*,video/*,application/pdf"
                      onChange={(event) => onUploadMedia(selectedPost, event)}
                      disabled={uploadingMediaPostId === selectedPost.id || accessLocked}
                      style={{ display: 'none' }}
                    />
                    <span>
                      {uploadingMediaPostId === selectedPost.id
                        ? 'Uploading...'
                        : hasMedia
                          ? 'Replace media'
                          : 'Choose media'}
                    </span>
                  </label>

                  {hasMedia && (
                    <>
                      <div className="f1-post-two-actions">
                        <a href={selectedPost.media_url} target="_blank" rel="noreferrer" className="f1-post-secondary">
                          {isFlyerMedia ? 'Open flyer' : 'View media'}
                        </a>

                        <button
                          type="button"
                          className="f1-post-secondary"
                          onClick={handleDownloadOriginalMedia}
                          disabled={isRescanning}
                        >
                          Download media
                        </button>

                        <button
                          type="button"
                          className="f1-post-secondary f1-post-danger"
                          onClick={() => onRemoveMedia(selectedPost)}
                          disabled={removingMediaPostId === selectedPost.id || accessLocked}
                        >
                          {removingMediaPostId === selectedPost.id ? 'Removing...' : 'Remove'}
                        </button>
                      </div>

                      {canResizeImageMedia && (
                        <div className="f1-post-resize-card f1-post-prepare-card">
                          <div>
                            <strong>Prepare media</strong>
                            <p>Move, zoom and resize this image for Facebook, Instagram or Stories before posting.</p>
                          </div>

                          <button
                            type="button"
                            className="f1-post-yellow-action"
                            onClick={openPrepareMediaModal}
                            disabled={isRescanning}
                          >
                            Prepare media
                          </button>

                          {resizedMedia && (
                            <div className="f1-post-prepared-actions">
                              <button
                                type="button"
                                className="f1-post-yellow-action"
                                onClick={handleSharePreparedMedia}
                                disabled={resizingMedia || sharingMedia}
                              >
                                {sharingMedia ? 'Opening share...' : 'Share prepared image'}
                              </button>
                              <button
                                type="button"
                                className="f1-post-secondary"
                                onClick={handleDownloadResizedMedia}
                                disabled={resizingMedia}
                              >
                                Download prepared image
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            {showPrepareMediaModal && canResizeImageMedia && prepareShellMode !== 'desktop' && (
              <div className="f1-inline-prepare-media f1-prepare-transform-modal">
                <header className="f1-inline-prepare-header">
                  <div>
                    <span>Prepare media</span>
                    <h3>Move and pinch to fit</h3>
                    <p>Choose a platform frame, then drag or pinch the image until it looks right.</p>
                  </div>

                  <button type="button" className="f1-post-secondary" onClick={closePrepareMediaModal} disabled={resizingMedia || sharingMedia}>
                    Back to post
                  </button>
                </header>

                <div className="f1-inline-prepare-layout">
                  <div className="f1-prepare-media-stage-card">
                    <div
                      ref={transformFrameRef}
                      className={`f1-transform-frame is-${resizePresetValue}`}
                      style={{ aspectRatio: `${selectedResizePreset.width} / ${selectedResizePreset.height}` }}
                      onPointerDown={startMediaTransformDrag}
                      onPointerMove={updateMediaTransformDrag}
                      onPointerUp={stopMediaTransformDrag}
                      onPointerCancel={stopMediaTransformDrag}
                      onPointerLeave={stopMediaTransformDrag}
                    >
                      <div
                        className={`f1-transform-image-layer ${prepareFitMode === 'fit' ? 'is-fit' : 'is-fill'}`}
                        style={{
                          transform:
                            prepareFitMode === 'fit'
                              ? 'translate3d(0, 0, 0) scale(1)'
                              : `translate3d(${mediaOffset.x}%, ${mediaOffset.y}%, 0) scale(${mediaZoom})`,
                        }}
                      >
                        <img src={selectedPost.media_url} alt="Prepare media preview" draggable={false} />
                      </div>

                      <div className="f1-transform-safe-frame">
                        <span className="f1-transform-grid" />
                        <span className="f1-transform-corner is-tl" />
                        <span className="f1-transform-corner is-tr" />
                        <span className="f1-transform-corner is-bl" />
                        <span className="f1-transform-corner is-br" />
                      </div>
                    </div>

                    <p className="f1-prepare-media-tip">
                      Drag with one finger to move. Pinch with two fingers to zoom. The frame stays locked to the selected platform size.
                    </p>
                  </div>

                  <aside className="f1-prepare-media-controls">
                    <div>
                      <strong>Platform frame</strong>
                      <p>Pick the shape you want the final image to fit.</p>
                    </div>

                    <div className="f1-prepare-preset-grid">
                      {resizePresets.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          className={preset.value === resizePresetValue ? 'is-active' : ''}
                          onClick={() => updateCropPreset(preset.value)}
                          disabled={resizingMedia || sharingMedia}
                        >
                          <strong>{preset.label}</strong>
                          <span>{preset.width} × {preset.height}</span>
                        </button>
                      ))}
                    </div>

                    <div className="f1-transform-control-card">
                      <div>
                        <strong>Position image</strong>
                        <p>{prepareFitMode === 'fit' ? 'Fit keeps the full image visible.' : 'Drag or pinch the image inside the fixed frame.'}</p>
                      </div>

                      <label className="f1-transform-zoom-control">
                        <span>Zoom</span>
                        <input
                          type="range"
                          min="1"
                          max="3"
                          step="0.01"
                          value={mediaZoom}
                          onChange={(event) => updateMediaZoom(event.target.value)}
                          disabled={resizingMedia || sharingMedia || prepareFitMode === 'fit'}
                        />
                        <small>{Math.round(mediaZoom * 100)}%</small>
                      </label>

                      <div className="f1-transform-quick-actions">
                        <button type="button" className={prepareFitMode === 'fit' ? 'is-active' : ''} onClick={fitFullImage} disabled={resizingMedia || sharingMedia}>
                          Fit full image
                        </button>
                        <button type="button" className={prepareFitMode === 'fill' ? 'is-active' : ''} onClick={fillFrame} disabled={resizingMedia || sharingMedia}>
                          Fill frame
                        </button>
                        <button type="button" onClick={resetMediaTransform} disabled={resizingMedia || sharingMedia}>
                          Reset
                        </button>
                      </div>
                    </div>

                    <div className="f1-prepare-selected-card">
                      <strong>{selectedResizePreset.label}</strong>
                      <p>{selectedResizePreset.help}</p>
                      <span>{selectedResizePreset.width} × {selectedResizePreset.height}</span>
                    </div>

                    <button
                      type="button"
                      className="f1-post-yellow-action f1-prepare-main-action"
                      onClick={handleResizeMedia}
                      disabled={resizingMedia || sharingMedia}
                    >
                      {resizingMedia ? 'Creating image...' : 'Create prepared image'}
                    </button>

                    {resizedMedia && (
                      <div className="f1-prepare-ready-card">
                        <strong>Prepared image ready</strong>
                        <p>{resizedMedia.label} · {resizedMedia.width} × {resizedMedia.height}</p>
                        <div className="f1-prepare-ready-actions">
                          <button
                            type="button"
                            className="f1-post-yellow-action"
                            onClick={handleSharePreparedMedia}
                            disabled={sharingMedia || resizingMedia}
                          >
                            {sharingMedia ? 'Opening share...' : 'Share prepared image'}
                          </button>
                          <button
                            type="button"
                            className="f1-post-secondary"
                            onClick={handleDownloadResizedMedia}
                            disabled={sharingMedia || resizingMedia}
                          >
                            Download prepared image
                          </button>
                        </div>
                        <small>Caption is copied before sharing. If sharing is not supported, FromOne downloads the image and opens the platform.</small>
                      </div>
                    )}

                    {resizeError && <small className="f1-post-resize-error">{resizeError}</small>}
                  </aside>
                </div>
              </div>
            )}
          </aside>

          <main className="f1-post-content-panel">
            <section ref={postRef} className="f1-post-panel">
              <div className="f1-post-panel-header">
                <div>
                  <span>Step 1</span>
                  <h3>Check the wording</h3>
                </div>
                {editingPostId !== selectedPost.id && (
                  <button
                    type="button"
                    className="f1-post-secondary"
                    onClick={() => onStartEditingPost(selectedPost)}
                    disabled={accessLocked}
                  >
                    Edit
                  </button>
                )}
              </div>

              {editingPostId === selectedPost.id ? (
                <div className="f1-post-edit-form">
                  <label>
                    <strong>Caption</strong>
                    <textarea
                      className="input"
                      value={editCaption}
                      onChange={(event) => onSetEditCaption(event.target.value)}
                      rows={7}
                    />
                    <small style={getCaptionCounterStyle(editedCaptionStatus)}>
                      {editedCaptionLength} / {captionLimit} characters for {platformName}
                      {editedCaptionStatus === 'over' ? ' — shorten this before posting' : ''}
                      {editedCaptionStatus === 'near' ? ' — close to the limit' : ''}
                    </small>
                  </label>

                  <div className="f1-post-edit-grid">
                    <label>
                      <strong>CTA</strong>
                      <input className="input" value={editCta} onChange={(event) => onSetEditCta(event.target.value)} />
                    </label>

                    <label>
                      <strong>Hashtags</strong>
                      <input
                        className="input"
                        value={editHashtags}
                        onChange={(event) => onSetEditHashtags(event.target.value)}
                        placeholder="#LocalBusiness #Marketing"
                      />
                    </label>
                  </div>

                  <div className="f1-post-two-actions">
                    <button type="button" className="f1-post-yellow-action" onClick={onSaveEditedPost} disabled={savingEdit}>
                      {savingEdit ? 'Saving...' : 'Save wording'}
                    </button>
                    <button type="button" className="f1-post-secondary" onClick={onCancelEditingPost} disabled={savingEdit}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <article className="f1-post-wording-card">
                    <p>{selectedPost.caption || 'No caption saved.'}</p>

                    <small style={getCaptionCounterStyle(savedCaptionStatus)}>
                      {savedCaptionLength} / {captionLimit} characters for {platformName}
                      {savedCaptionStatus === 'over' ? ' — shorten this before posting' : ''}
                      {savedCaptionStatus === 'near' ? ' — close to the limit' : ''}
                    </small>

                    {selectedPost.cta && <p><strong>CTA:</strong> {selectedPost.cta}</p>}

                    {Array.isArray(selectedPost.hashtags) && selectedPost.hashtags.length > 0 && (
                      <p className="post-hashtags">{selectedPost.hashtags.join(' ')}</p>
                    )}
                  </article>

                  {activeImprovementNote && (
                    <div className="f1-post-soft-note">
                      <strong>{activeImprovementNote.label}</strong>
                      <p>{activeImprovementNote.detail}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    className="f1-post-improve-toggle"
                    onClick={openImprovePanel}
                    disabled={accessLocked || rewritingPost || isRescanning}
                  >
                    {showImprovePanel ? 'Hide improve tools' : 'Improve wording'}
                  </button>
                </>
              )}

              {showImprovePanel && showImproveTools && (
                <div className="f1-post-improve-panel">
                  <div className="f1-post-improve-head">
                    <strong>Improve this post</strong>
                    <p>Choose one quick change, or target the post by audience, reach and tone.</p>
                  </div>

                  <div className="f1-post-pill-row">
                    {quickImproveActions.map((action) => (
                      <button
                        key={action.value}
                        type="button"
                        onClick={() => onQuickImprovePost(selectedPost, action.value)}
                        disabled={accessLocked || rewritingPost || isRescanning}
                      >
                        {rewritingPost && rewritingAction === action.value
                          ? 'Improving...'
                          : action.value === 'make_sales_focused'
                            ? 'Sales focused'
                            : action.label}
                      </button>
                    ))}
                  </div>

                  <div className="f1-post-target-panel">
                    <div className="f1-post-target-row">
                      <label>
                        <span>Audience</span>
                        <select
                          className="input"
                          value={audienceTarget}
                          onChange={(event) => onSetAudienceTarget(event.target.value)}
                        >
                          {dynamicAudienceTargets.map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <span>Reach</span>
                        <select
                          className="input"
                          value={marketReachTarget}
                          onChange={(event) => onSetMarketReachTarget(event.target.value)}
                        >
                          {marketReachOptions.map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <span>Tone</span>
                        <select
                          className="input"
                          value={toneTarget}
                          onChange={(event) => onSetToneTarget(event.target.value)}
                        >
                          {toneOptions.map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {audienceTarget === 'Custom audience' && (
                      <label className="f1-post-custom-audience">
                        <span>Custom audience</span>
                        <input
                          className="input"
                          value={customAudienceTarget}
                          onChange={(event) => onSetCustomAudienceTarget(event.target.value)}
                          placeholder="Example: first-time homeowners"
                        />
                      </label>
                    )}

                    <button
                      type="button"
                      className="f1-post-yellow-action f1-post-target-improve-button"
                      onClick={() => onRewriteForAudience(selectedPost)}
                      disabled={accessLocked || rewritingPost || isRescanning}
                    >
                      {rewritingPost && rewritingAction === 'audience'
                        ? 'Improving...'
                        : 'Improve for selected audience'}
                    </button>
                  </div>

                  {onRescanPostMedia && (
                    <div className="f1-post-media-rewrite-card">
                      <div>
                        <strong>Rewrite using media</strong>
                        <p>Use this if the wording does not match the image, flyer or video closely enough.</p>
                        {rescanUsageLabel && <small>{rescanUsageLabel}</small>}
                      </div>

                      <button
                        type="button"
                        className="f1-post-secondary"
                        onClick={() => onRescanPostMedia(selectedPost)}
                        disabled={accessLocked || !hasMedia || isRescanning}
                      >
                        {isRescanning ? 'Rewriting...' : 'Rewrite from media'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section ref={publishRef} className="f1-post-panel f1-post-publish-panel">
              <div className="f1-post-panel-header">
                <div>
                  <span>Step 2</span>
                  <h3>{posted ? 'Posted' : 'Post manually'}</h3>
                </div>
              </div>

              {selectedPost.publish_error && !publishErrorNeedsReconnect && (
                <div className="f1-post-error-note">
                  <strong>Publishing failed</strong>
                  <p>{selectedPost.publish_error}</p>
                </div>
              )}

              {autopostNeedsAttention && !posted && (
                <div className="f1-post-soft-note f1-post-reconnect-card">
                  <strong>Autopost needs reconnecting</strong>
                  <p>
                    Facebook and Instagram need a quick reconnect before FromOne can autopost again.
                    You can still post this now using the manual flow.
                  </p>

                  <div className="f1-post-two-actions">
                    <button
                      type="button"
                      className="f1-post-yellow-action"
                      onClick={handleManualPost}
                      disabled={!canUseManualPost}
                    >
                      Post manually now
                    </button>

                    <button
                      type="button"
                      className="f1-post-secondary"
                      onClick={() => {
                        window.location.href = '/settings?setup=business';
                      }}
                      disabled={isRescanning}
                    >
                      Reconnect accounts
                    </button>
                  </div>
                </div>
              )}

              {instagramHasFlyerOnly && (
                <div className="f1-post-soft-note">
                  <strong>Instagram needs an image or video</strong>
                  <p>PDF flyers cannot be direct-published to Instagram. Replace it with an image/video, or post manually.</p>
                </div>
              )}

              <div className="f1-post-primary-publish-card">
                <div>
                  <strong>Post manually</strong>
                  <p>{manualHelpText}</p>
                  {hasMedia && <small>Use Prepare media or Download media, then add the media before pasting the caption.</small>}
                </div>

                <div className="f1-post-manual-action-stack">
                  <button
                    type="button"
                    className="f1-post-yellow-action"
                    onClick={handleManualPost}
                    disabled={!canUseManualPost}
                  >
                    {manualPostLabel}
                  </button>

                  {!posted && (
                    <button
                      type="button"
                      className="f1-post-secondary"
                      onClick={() => onMarkAsPosted(selectedPost.id)}
                      disabled={isRescanning}
                    >
                      Mark as posted
                    </button>
                  )}
                </div>
              </div>

              {canAutoPublish && (
                <div className="f1-post-manual-card f1-post-autopost-option-card">
                  <div>
                    <strong>Autopost option</strong>
                    <p>{autopostHelpText}</p>
                  </div>

                  <div className="f1-post-autopost-actions">
                    <button
                      type="button"
                      className="f1-post-secondary f1-post-autopost-button"
                      onClick={handleAutopostPublish}
                      disabled={posted || isPublishing || isRescanning || (!autopostNeedsAttention && !canUseAutopostPublish)}
                    >
                      {autopostLabel}
                    </button>

                    {autopostNeedsAttention && (
                      <button
                        type="button"
                        className="f1-post-secondary f1-post-autopost-manual-button"
                        onClick={handleManualPost}
                        disabled={!canUseManualPost}
                      >
                        Post manually now
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!canAutoPublish && (
                <div className="f1-post-manual-card">
                  <div>
                    <strong>Manual posting works for this platform</strong>
                    <p>FromOne prepares the wording. You add the media, paste the caption and publish yourself.</p>
                  </div>

                  <div className="f1-post-two-actions">
                    <button type="button" className="f1-post-secondary" onClick={() => onCopyPost(selectedPost)} disabled={isRescanning}>
                      Copy wording
                    </button>
                    <button
                      type="button"
                      className="f1-post-secondary"
                      onClick={() => onOpenPlatform(manualPlatformLabel)}
                      disabled={isRescanning}
                    >
                      Open {manualPlatformLabel}
                    </button>
                  </div>
                </div>
              )}

              <button type="button" className="f1-post-more-toggle" onClick={() => setShowMoreOptions((current) => !current)}>
                {showMoreOptions ? 'Hide post controls' : 'Post controls'}
              </button>

              {showMoreOptions && (
                <div className="f1-post-more-panel">
                  <div className="f1-post-admin-card f1-post-more-card">
                    <div className="f1-post-more-card-copy">
                      <strong>Post status</strong>
                      <p>Use these only if you need to manually update or remove this post.</p>
                    </div>

                    <div className="f1-post-status-stack">
                      {posted ? (
                        <button type="button" className="f1-post-secondary f1-post-full-action" onClick={() => onMarkAsNotPosted(selectedPost.id)} disabled={isRescanning}>
                          Undo posted
                        </button>
                      ) : (
                        <button type="button" className="f1-post-secondary f1-post-full-action" onClick={() => onMarkAsPosted(selectedPost.id)} disabled={isRescanning}>
                          Mark posted manually
                        </button>
                      )}

                      {onDeletePost && (
                        <button
                          type="button"
                          className="f1-post-secondary f1-post-danger f1-post-full-action"
                          onClick={() => onDeletePost(selectedPost)}
                          disabled={deletingPostId === selectedPost.id || isRescanning}
                        >
                          {deletingPostId === selectedPost.id ? 'Deleting...' : posted ? 'Archive post' : 'Delete post'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </main>
        </div>


      </section>
    </div>
  );
}
