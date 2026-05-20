import { ChangeEvent, RefObject, useState } from 'react';

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
  const [showMiniAnalytics, setShowMiniAnalytics] = useState(false);
  const [showScheduleControls, setShowScheduleControls] = useState(false);

  if (!selectedPost) return null;

  const platformName = getPlatformDisplayName(selectedPost);
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
  const isImageMedia = hasMedia && !isVideoMedia && !isFlyerMedia;
  const needsMedia = mediaRequiredForPlatform(selectedPost.platform) && !hasMedia;
  const hasSchedule = Boolean(selectedPost.scheduled_publish_at);
  const posted = isPostPosted(selectedPost);
  const isPublishing = publishingPostId === selectedPost.id;
  const isRescanning =
    rescanningMediaPostId === selectedPost.id ||
    (rewritingPost && rewritingAction === 'media_rescan');

  const autoPublishPlatformName = isInstagramPost ? 'Instagram' : 'Facebook';
  const hasPublishableMediaForInstagram = hasMedia && !isFlyerMedia;
  const instagramHasFlyerOnly = isInstagramPost && isFlyerMedia;

  const rescanUsageLabel = isVideoMedia ? videoRescanUsageLabel : mediaRescanUsageLabel;

  const rescanMediaTitle = isVideoMedia
    ? 'Rescan video + rewrite post'
    : isFlyerMedia
      ? 'Rescan flyer + rewrite post'
      : 'Rescan image + rewrite post';

  const rescanMediaDescription = isVideoMedia
    ? 'Use this when the video has changed, such as live event footage, a club night, a product demo, or behind-the-scenes content. Video rescans are limited weekly because they cost more to process.'
    : isFlyerMedia
      ? 'Use this when the flyer has changed or you want FromOne to rewrite this post around the uploaded flyer.'
      : isImageMedia
        ? 'Use this when the photo has changed or you want FromOne to rewrite this post around the uploaded image.'
        : 'Upload media first, then FromOne can rewrite this post around the image, flyer, or video.';

  const publishCardTitle = posted
    ? 'Posted'
    : needsMedia
      ? 'Needs media'
      : instagramHasFlyerOnly
        ? 'Needs image or video'
        : hasSchedule && canAutoPublish
          ? 'Scheduled'
          : canAutoPublish
            ? 'Ready to publish'
            : tiktokDemoAvailable
              ? 'TikTok sandbox demo'
              : isTikTokPost
                ? 'Manual TikTok post'
                : 'Copy/open';

  const publishCardDetail = posted
    ? `${platformName} has been marked as posted.`
    : needsMedia
      ? `${platformName} needs media before publishing.`
      : instagramHasFlyerOnly
        ? 'Instagram needs an image or video. PDF flyers can be viewed and copied from here, but cannot be direct-published to Instagram.'
        : hasSchedule && canAutoPublish
          ? `${platformName} is scheduled to publish automatically.`
          : canAutoPublish
            ? `${platformName} can publish now or be scheduled for later.`
            : tiktokDemoAvailable
              ? 'Run a TikTok sandbox demo publish for app review. No live TikTok post will be published.'
              : isTikTokPost
                ? 'Copy this post, open TikTok, then paste and publish manually.'
                : `Copy this post and open ${platformName}.`;

  const mediaReadyForPlatform =
    mediaRequiredForPlatform(selectedPost.platform)
      ? isInstagramPost
        ? hasPublishableMediaForInstagram
        : hasMedia
      : true;

  const readinessItems = [
    {
      label: 'Wording ready',
      ready: Boolean(selectedPost.caption || selectedPost.cta),
    },
    {
      label: mediaRequiredForPlatform(selectedPost.platform) ? 'Media ready' : 'Media optional',
      ready: mediaReadyForPlatform,
    },
    {
      label: canAutoPublish
        ? 'Auto posting available'
        : tiktokDemoAvailable
          ? 'Demo available'
          : 'Manual posting',
      ready: true,
    },
  ];

  const performanceMetrics = [
    {
      label: 'Reach',
      value: Number(selectedPost.reach || 0),
    },
    {
      label: 'Likes',
      value: Number(selectedPost.likes || 0),
    },
    {
      label: 'Comments',
      value: Number(selectedPost.comments || 0),
    },
    {
      label: 'Shares',
      value: Number(selectedPost.shares || 0),
    },
    {
      label: 'Saves',
      value: Number(selectedPost.saves || 0),
    },
    {
      label: 'Clicks',
      value: Number(selectedPost.clicks || 0),
    },
  ];

  const totalPerformanceActions = performanceMetrics.reduce(
    (total, metric) => total + metric.value,
    0
  );

  const hasPerformanceData = totalPerformanceActions > 0;

  const formatMetricValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}m`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;

    return String(value);
  };

  const handlePrimaryPublish = () => {
    if (canDirectPublishToFacebook(selectedPost)) {
      onPublishToFacebook(selectedPost);
      return;
    }

    if (canDirectPublishToInstagram(selectedPost)) {
      onPublishToInstagram(selectedPost);
      return;
    }

    if (tiktokDemoAvailable && onPublishToTikTokDemo) {
      onPublishToTikTokDemo(selectedPost);
      return;
    }

    onCopyPost(selectedPost);
  };

  return (
    <div className="fromone-modal-overlay" role="dialog" aria-modal="true">
      <section className="fromone-modal-card fromone-post-action-modal">
        <div className="fromone-flow-card-top">
          <div>
            <div className="page-eyebrow">Post editor</div>
            <h2>{selectedPost.title || 'Social media post'}</h2>
            <p>
              {getPostPositionLabel(selectedPost)} · {platformName} · {getPostStatus(selectedPost)}
            </p>
          </div>

          <div className="fromone-flow-inline-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="selected-post-tags">
          <span>{getPostPositionLabel(selectedPost)}</span>
          <span>{platformName}</span>
          <span>{getPostStatus(selectedPost)}</span>
          {isPostScheduledToday(selectedPost) && !posted && <span>Today</span>}
          {selectedPost.audience_target && <span>For {selectedPost.audience_target}</span>}
          {isTikTokPost && <span>Manual posting</span>}
          {isFlyerMedia && <span>PDF flyer</span>}
          {isVideoMedia && <span>Video</span>}
        </div>

        <section ref={mediaRef} className="fromone-flow-tools-card">
          <div className="fromone-flow-tools-header">
            <div>
              <div className="page-eyebrow">Media</div>
              <h3>Check the media</h3>
              <p>{getImageGuidance(selectedPost)}</p>
            </div>
          </div>

          {selectedPost.media_url ? (
            <div className="fromone-media-preview-card">
              {isVideoMedia ? (
                <video src={selectedPost.media_url} controls className="fromone-media-preview" />
              ) : isFlyerMedia ? (
                <div className="fromone-image-guidance-note">
                  <strong>PDF flyer attached</strong>
                  <p>
                    This post was created from a PDF flyer. Open the flyer in a new tab to review
                    the original upload.
                  </p>

                  <a
                    href={selectedPost.media_url}
                    target="_blank"
                    rel="noreferrer"
                    className="secondary-button"
                    style={{
                      display: 'inline-flex',
                      marginTop: 12,
                    }}
                  >
                    View flyer
                  </a>
                </div>
              ) : (
                <img
                  src={selectedPost.media_url}
                  alt="Uploaded post media"
                  className="fromone-media-preview"
                />
              )}

              <div className="fromone-flow-inline-actions">
                <a
                  href={selectedPost.media_url}
                  target="_blank"
                  rel="noreferrer"
                  className="secondary-button"
                >
                  {isFlyerMedia ? 'Open flyer' : 'View media'}
                </a>

                <button
                  type="button"
                  className="secondary-button danger-button"
                  onClick={() => onRemoveMedia(selectedPost)}
                  disabled={removingMediaPostId === selectedPost.id || accessLocked}
                >
                  {removingMediaPostId === selectedPost.id ? 'Removing...' : 'Remove media'}
                </button>
              </div>
            </div>
          ) : (
            <div className="fromone-image-guidance-note">
              <strong>{mediaRequiredForPlatform(selectedPost.platform) ? 'Media needed' : 'Optional'}</strong>
              <p>
                {mediaRequiredForPlatform(selectedPost.platform)
                  ? `${platformName} needs a photo, flyer, graphic, or short video before publishing.`
                  : 'A clear photo, flyer, graphic, or short video can make this post stronger.'}
              </p>
            </div>
          )}

          <label className="fromone-upload-button">
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
                : selectedPost.media_url
                  ? 'Replace media'
                  : 'Choose media'}
            </span>
          </label>

          {onRescanPostMedia && (
            <div
              className="fromone-image-guidance-note"
              style={{
                marginTop: 16,
              }}
            >
              <strong>{rescanMediaTitle}</strong>
              <p>{rescanMediaDescription}</p>

              {rescanUsageLabel && (
                <p
                  style={{
                    marginTop: 10,
                    fontWeight: 850,
                    color: '#ffe58a',
                  }}
                >
                  {rescanUsageLabel}
                </p>
              )}

              {posted ? (
                <>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => onMarkAsNotPosted(selectedPost.id)}
                    disabled={isRescanning}
                    style={{
                      marginTop: 12,
                      width: '100%',
                      minHeight: 52,
                      color: '#101420',
                      background: '#ffd43b',
                      borderColor: 'rgba(255, 212, 59, 0.55)',
                      fontWeight: 950,
                    }}
                  >
                    Mark as not posted to rescan
                  </button>

                  <p
                    style={{
                      marginTop: 10,
                      marginBottom: 0,
                      opacity: 0.82,
                    }}
                  >
                    This post is already marked as posted, so FromOne will not rewrite it yet.
                    Mark it as not posted, then press the rescan button.
                  </p>
                </>
              ) : (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onRescanPostMedia(selectedPost)}
                  disabled={accessLocked || !hasMedia || isRescanning}
                  style={{
                    marginTop: 12,
                    width: '100%',
                    minHeight: 52,
                    color: '#101420',
                    background: '#ffd43b',
                    borderColor: 'rgba(255, 212, 59, 0.55)',
                    fontWeight: 950,
                  }}
                >
                  {isRescanning ? 'Rescanning media...' : rescanMediaTitle}
                </button>
              )}

              {!posted && !hasMedia && (
                <p
                  style={{
                    marginTop: 10,
                    marginBottom: 0,
                    opacity: 0.72,
                  }}
                >
                  Upload media first, then FromOne can rescan it and rewrite this one post.
                </p>
              )}
            </div>
          )}
        </section>

        <section ref={postRef} className="fromone-flow-preview-card">
          <div className="fromone-flow-card-top">
            <div>
              <div className="page-eyebrow">Wording</div>
              <h3>Review the wording</h3>
              <p>Check the caption, CTA and hashtags before publishing.</p>
            </div>

            <span>{platformName}</span>
          </div>

          {editingPostId === selectedPost.id ? (
            <div className="fromone-flow-edit-box">
              <label>
                <strong>Caption</strong>
                <textarea
                  className="input"
                  value={editCaption}
                  onChange={(event) => onSetEditCaption(event.target.value)}
                  rows={8}
                />
              </label>

              <label>
                <strong>CTA</strong>
                <input
                  className="input"
                  value={editCta}
                  onChange={(event) => onSetEditCta(event.target.value)}
                />
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

              <div className="fromone-flow-inline-actions">
                <button type="button" onClick={onSaveEditedPost} disabled={savingEdit}>
                  {savingEdit ? 'Saving...' : 'Save wording'}
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={onCancelEditingPost}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="fromone-post-preview-body">
              <p>{selectedPost.caption || 'No caption saved.'}</p>

              {selectedPost.cta && (
                <p>
                  <strong>CTA:</strong> {selectedPost.cta}
                </p>
              )}

              {Array.isArray(selectedPost.hashtags) && selectedPost.hashtags.length > 0 && (
                <p className="post-hashtags">{selectedPost.hashtags.join(' ')}</p>
              )}
            </div>
          )}

          {activeImprovementNote && (
            <div className="fromone-improvement-note">
              <strong>{activeImprovementNote.label}</strong>
              <p>{activeImprovementNote.detail}</p>
            </div>
          )}

          <div className="fromone-flow-publish-buttons">
            {editingPostId !== selectedPost.id && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => onStartEditingPost(selectedPost)}
                disabled={accessLocked}
              >
                Edit wording
              </button>
            )}

            <button
              type="button"
              className="secondary-button"
              onClick={onToggleImproveTools}
              disabled={accessLocked || rewritingPost || isRescanning}
            >
              {showImproveTools ? 'Hide improve' : 'Improve wording'}
            </button>
          </div>

          {showImproveTools && (
            <div className="fromone-flow-tools-list" style={{ marginTop: 18 }}>
              <section className="fromone-flow-tool-row fromone-improve-options-row">
                <div className="fromone-flow-tool-copy">
                  <strong>Quick improve</strong>
                  <p>Choose a simple improvement.</p>
                </div>

                <div className="fromone-flow-tool-action">
                  <div className="fromone-quick-improve-grid">
                    {quickImproveActions.map((action) => (
                      <button
                        key={action.value}
                        type="button"
                        className="secondary-button fromone-quick-improve-button"
                        onClick={() => onQuickImprovePost(selectedPost, action.value)}
                        disabled={accessLocked || rewritingPost || isRescanning}
                      >
                        {rewritingPost && rewritingAction === action.value
                          ? 'Improving...'
                          : action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="fromone-flow-tool-row fromone-improve-options-row">
                <div className="fromone-flow-tool-copy">
                  <strong>Make it more specific</strong>
                  <p>Choose who this post should speak to.</p>
                </div>

                <div className="fromone-flow-tool-action">
                  <select
                    className="input"
                    value={audienceTarget}
                    onChange={(event) => onSetAudienceTarget(event.target.value)}
                  >
                    {dynamicAudienceTargets.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  {audienceTarget === 'Custom audience' && (
                    <input
                      className="input"
                      value={customAudienceTarget}
                      onChange={(event) => onSetCustomAudienceTarget(event.target.value)}
                      placeholder="Example: first-time homeowners"
                    />
                  )}

                  <select
                    className="input"
                    value={toneTarget}
                    onChange={(event) => onSetToneTarget(event.target.value)}
                  >
                    {toneOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => onRewriteForAudience(selectedPost)}
                    disabled={accessLocked || rewritingPost || isRescanning}
                  >
                    {rewritingPost && rewritingAction === 'audience'
                      ? 'Improving...'
                      : 'Improve for audience'}
                  </button>
                </div>
              </section>
            </div>
          )}
        </section>

        <section ref={publishRef} className="fromone-flow-tools-card fromone-publish-control-section">
          <div className="fromone-flow-tools-header">
            <div>
              <div className="page-eyebrow">Next step</div>
              <h3>Publish or copy</h3>
              <p>
                Facebook and Instagram can auto publish when connected. TikTok is copy/open manual
                posting for now.
              </p>
            </div>
          </div>

          {selectedPost.publish_error && (
            <div className="fromone-improvement-note fromone-error-note">
              <strong>Publishing failed</strong>
              <p>{selectedPost.publish_error}</p>
            </div>
          )}

          {instagramHasFlyerOnly && (
            <div className="fromone-improvement-note">
              <strong>Instagram direct publish needs image or video</strong>
              <p>
                This post has a PDF flyer. Replace it with an image or video to publish directly to
                Instagram, or open the flyer and post manually.
              </p>
            </div>
          )}

          {tiktokDemoAvailable && !posted && (
            <div className="fromone-improvement-note">
              <strong>TikTok sandbox demo</strong>
              <p>
                This demonstrates the TikTok connect and publish flow for app review. No live
                TikTok post will be published.
              </p>
            </div>
          )}

          <div className={`fromone-publish-control-card ${posted ? 'is-posted' : ''} ${needsMedia || instagramHasFlyerOnly ? 'needs-media' : ''}`}>
            <div className="fromone-publish-control-main">
              <div className="fromone-publish-status-icon">
                {posted ? '✓' : needsMedia || instagramHasFlyerOnly ? '!' : hasSchedule ? '⏱' : '→'}
              </div>

              <div>
                <div className="fromone-publish-card-kicker">{platformName}</div>
                <h3>{publishCardTitle}</h3>
                <p>{publishCardDetail}</p>

                {hasSchedule && !posted && (
                  <div className="fromone-publish-schedule-pill">
                    Scheduled: {getReadableDateTime(selectedPost.scheduled_publish_at)}
                  </div>
                )}
              </div>
            </div>

            <div className="fromone-readiness-list">
              {readinessItems.map((item) => (
                <span key={item.label} className={item.ready ? 'is-ready' : 'is-not-ready'}>
                  <strong>{item.ready ? '✓' : '•'}</strong> {item.label}
                </span>
              ))}
            </div>

            <div className="fromone-publish-card-actions">
              {canAutoPublish || tiktokDemoAvailable ? (
                <button
                  type="button"
                  onClick={handlePrimaryPublish}
                  disabled={isPublishing || posted || needsMedia || instagramHasFlyerOnly || isRescanning}
                >
                  {isPublishing
                    ? tiktokDemoAvailable
                      ? 'Running demo...'
                      : 'Publishing...'
                    : posted
                      ? `Posted to ${platformName}`
                      : tiktokDemoAvailable
                        ? 'Run TikTok demo publish'
                        : `Publish to ${autoPublishPlatformName}`}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onCopyPost(selectedPost)}
                  disabled={posted || isRescanning}
                >
                  {isTikTokPost ? 'Copy for TikTok' : `Copy for ${platformName}`}
                </button>
              )}

              <button
                type="button"
                className="secondary-button"
                onClick={() => onCopyPost(selectedPost)}
                disabled={isRescanning}
              >
                Copy post
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => onOpenPlatform(selectedPost.platform || 'Facebook')}
                disabled={isRescanning}
              >
                Open {platformName}
              </button>

              {posted ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onMarkAsNotPosted(selectedPost.id)}
                  disabled={isRescanning}
                >
                  Mark as not posted
                </button>
              ) : (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onMarkAsPosted(selectedPost.id)}
                  disabled={isRescanning}
                >
                  Mark as posted
                </button>
              )}
            </div>
          </div>

          <div
            className="fromone-image-guidance-note"
            style={{
              marginTop: 14,
            }}
          >
            <strong>{hasSchedule ? 'Schedule saved' : 'Schedule for later'}</strong>
            <p>
              {canAutoPublish
                ? `${autoPublishPlatformName} can publish automatically at the time you choose.`
                : `This saves a reminder time for ${platformName}. You will still post manually.`}
            </p>

            {!showScheduleControls ? (
              <div className="button-row" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowScheduleControls(true)}
                  disabled={posted || isRescanning}
                >
                  {hasSchedule ? 'Change schedule' : 'Schedule for later'}
                </button>

                {hasSchedule && !posted && (
                  <span className="fromone-publish-schedule-pill">
                    Scheduled: {getReadableDateTime(selectedPost.scheduled_publish_at)}
                  </span>
                )}
              </div>
            ) : (
              <>
                <input
                  type="datetime-local"
                  className="input"
                  value={reminderValue}
                  onChange={(event) => onSetReminderValue(event.target.value)}
                />

                <div className="button-row" style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => onSaveReminder(selectedPost)}
                    disabled={savingReminderPostId === selectedPost.id || !reminderValue || isRescanning}
                  >
                    {savingReminderPostId === selectedPost.id ? 'Saving...' : 'Save schedule'}
                  </button>

                  {hasSchedule && (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => onClearReminder(selectedPost)}
                      disabled={savingReminderPostId === selectedPost.id || isRescanning}
                    >
                      Clear schedule
                    </button>
                  )}

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowScheduleControls(false)}
                    disabled={savingReminderPostId === selectedPost.id || isRescanning}
                  >
                    Hide schedule
                  </button>
                </div>
              </>
            )}
          </div>

          {(posted || hasPerformanceData) && (
            <div className="fromone-schedule-box fromone-schedule-control-card">
              <div className="fromone-schedule-card-header">
                <div>
                  <strong>Mini analytics</strong>
                  <p>
                    {posted
                      ? hasPerformanceData
                        ? 'Stats are available for this post.'
                        : 'No stats recorded yet.'
                      : 'Stats appear after publishing.'}
                  </p>
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowMiniAnalytics((current: boolean) => !current)}
                >
                  {showMiniAnalytics ? 'Hide stats' : 'Show stats'}
                </button>
              </div>

              {showMiniAnalytics && (
                <>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))',
                      gap: 10,
                    }}
                  >
                    {performanceMetrics.map((metric) => (
                      <div
                        key={metric.label}
                        style={{
                          padding: '12px',
                          borderRadius: 16,
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            opacity: 0.68,
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {metric.label}
                        </div>

                        <strong
                          style={{
                            display: 'block',
                            marginTop: 6,
                            fontSize: 22,
                            lineHeight: 1,
                          }}
                        >
                          {formatMetricValue(metric.value)}
                        </strong>
                      </div>
                    ))}
                  </div>

                  {!hasPerformanceData && (
                    <p style={{ marginBottom: 0, opacity: 0.72 }}>
                      Stats can be updated when platform analytics are connected.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {onDeletePost && (
            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <button
                type="button"
                className="secondary-button danger-button"
                onClick={() => onDeletePost(selectedPost)}
                disabled={deletingPostId === selectedPost.id || isRescanning}
              >
                {deletingPostId === selectedPost.id
                  ? posted
                    ? 'Archiving...'
                    : 'Deleting...'
                  : posted
                    ? 'Archive post'
                    : 'Delete post'}
              </button>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
