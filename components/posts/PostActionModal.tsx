import { ChangeEvent, CSSProperties, RefObject, useState } from 'react';

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
  const hasSchedule = Boolean(selectedPost.scheduled_publish_at);
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
  const savedScheduleLabel = canAutoPublish ? 'Autopost planned' : 'Reminder planned';
  const saveScheduleButtonLabel = canAutoPublish ? 'Save autopost time' : 'Save reminder time';

  const publishErrorNeedsReconnect = isMetaReconnectError(selectedPost.publish_error);
  const autopostNeedsAttention = canAutoPublish && (needsMetaConnection || publishErrorNeedsReconnect);
  const manualPlatformLabel = isFacebookPost
    ? 'Facebook'
    : isInstagramPost
      ? 'Instagram'
      : isTikTokPost
        ? 'TikTok'
        : platformName;

  const canUsePrimaryPublish = !posted && !isPublishing && !isRescanning && !needsMedia && !instagramHasFlyerOnly;


  const handlePrimaryPublish = () => {
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

  const primaryPublishLabel = isPublishing
    ? 'Publishing...'
    : posted
      ? 'Already posted'
      : autopostNeedsAttention
        ? publishErrorNeedsReconnect
          ? 'Reconnect accounts'
          : 'Connect business account'
        : canAutoPublish
          ? `Publish to ${autoPublishPlatformName}`
          : isTikTokPost
            ? 'Copy TikTok post'
            : `Copy for ${platformName}`;

  const primaryHelpText = posted
    ? 'This post has already been marked as posted.'
    : autopostNeedsAttention
      ? 'Autoposting needs attention. You can reconnect, or copy and post manually now.'
      : canAutoPublish
        ? 'Publish now, or choose an autopost time in More options.'
        : 'Copy the wording and open the platform manually.';

  const openImprovePanel = () => {
    setShowImprovePanel((current) => !current);
    if (!showImproveTools) onToggleImproveTools();
  };

  return (
    <div className="f1-post-modal-overlay" role="dialog" aria-modal="true">
      <section className="f1-post-modal-card">
        <header className="f1-post-modal-header">
          <div className="f1-post-modal-title-block">
            <div className="f1-post-eyebrow">{getPostPositionLabel(selectedPost)} · {platformName}</div>
            <h2>{modalTitle}</h2>
            <div className="f1-post-badges">
              <span>{statusLabel}</span>
              {hasSchedule && !posted && (
                <span>{canAutoPublish ? 'Autopost' : 'Planned'} · {getReadableDateTime(selectedPost.scheduled_publish_at)}</span>
              )}
              {isPostScheduledToday(selectedPost) && !posted && <span>Today</span>}
              {hasMedia && <span>{isVideoMedia ? 'Video' : isFlyerMedia ? 'Flyer' : 'Image'}</span>}
              {isTikTokPost && <span>TikTok manual</span>}
            </div>
          </div>

          <button type="button" className="f1-post-close" onClick={onClose}>
            Done
          </button>
        </header>

        <div className="f1-post-modal-body">
          <aside ref={mediaRef} className="f1-post-media-panel">
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
                <div className="f1-post-two-actions">
                  <a href={selectedPost.media_url} target="_blank" rel="noreferrer" className="f1-post-secondary">
                    {isFlyerMedia ? 'Open flyer' : 'View media'}
                  </a>

                  <button
                    type="button"
                    className="f1-post-secondary f1-post-danger"
                    onClick={() => onRemoveMedia(selectedPost)}
                    disabled={removingMediaPostId === selectedPost.id || accessLocked}
                  >
                    {removingMediaPostId === selectedPost.id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              )}
            </div>
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
                  <h3>{posted ? 'Posted' : 'Publish or copy'}</h3>
                </div>
              </div>

              {selectedPost.publish_error && (
                <div className="f1-post-error-note">
                  <strong>Publishing failed</strong>
                  <p>{selectedPost.publish_error}</p>
                </div>
              )}

              {autopostNeedsAttention && !posted && (
                <div className="f1-post-soft-note">
                  <strong>Autopost needs reconnecting</strong>
                  <p>
                    Facebook and Instagram autoposting needs a connected business account. You can reconnect,
                    or copy this post and publish it manually now.
                  </p>

                  <div className="f1-post-two-actions">
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

                    <button
                      type="button"
                      className="f1-post-secondary"
                      onClick={() => onCopyPost(selectedPost)}
                      disabled={isRescanning}
                    >
                      Copy post
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
                  <strong>{platformName}</strong>
                  <p>{primaryHelpText}</p>
                  {hasSchedule && !posted && <small>{savedScheduleLabel}: {getReadableDateTime(selectedPost.scheduled_publish_at)}</small>}
                </div>

                <button
                  type="button"
                  className="f1-post-yellow-action"
                  onClick={handlePrimaryPublish}
                  disabled={!canUsePrimaryPublish}
                >
                  {primaryPublishLabel}
                </button>
              </div>

              <div className="f1-post-manual-card">
                <div>
                  <strong>Manual posting is always available</strong>
                  <p>Autoposting is for Facebook Pages and Instagram professional accounts. If the connection is missing, expired, or you use a personal account, copy the post and open the platform manually.</p>
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

              <button type="button" className="f1-post-more-toggle" onClick={() => setShowMoreOptions((current) => !current)}>
                {showMoreOptions ? 'Hide more options' : 'More options'}
              </button>

              {showMoreOptions && (
                <div className="f1-post-more-panel">
                  <div className="f1-post-schedule-card f1-post-more-card">
                    <div className="f1-post-more-card-copy">
                      <strong>{canAutoPublish ? 'Autopost time' : 'Reminder time'}</strong>
                      <p>{canAutoPublish ? 'Choose when FromOne should autopost this connected business account post.' : 'Choose a reminder time for manual posting.'}</p>
                    </div>

                    <div className="f1-post-schedule-stack">
                      <input
                        type="datetime-local"
                        className="input"
                        value={reminderValue}
                        onChange={(event) => onSetReminderValue(event.target.value)}
                      />

                      <button
                        type="button"
                        className="f1-post-yellow-action f1-post-full-action"
                        onClick={() => onSaveReminder(selectedPost)}
                        disabled={savingReminderPostId === selectedPost.id || !reminderValue || isRescanning || posted}
                      >
                        {savingReminderPostId === selectedPost.id ? 'Saving...' : saveScheduleButtonLabel}
                      </button>

                      {hasSchedule && (
                        <button
                          type="button"
                          className="f1-post-secondary f1-post-full-action"
                          onClick={() => onClearReminder(selectedPost)}
                          disabled={savingReminderPostId === selectedPost.id || isRescanning || posted}
                        >
                          Clear time
                        </button>
                      )}
                    </div>
                  </div>

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
