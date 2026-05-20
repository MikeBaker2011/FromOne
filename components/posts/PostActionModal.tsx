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
  const [showScheduleControls, setShowScheduleControls] = useState(false);
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);

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
  const needsMedia = mediaRequiredForPlatform(selectedPost.platform) && !hasMedia;
  const hasSchedule = Boolean(selectedPost.scheduled_publish_at);
  const posted = isPostPosted(selectedPost);
  const isPublishing = publishingPostId === selectedPost.id;
  const isRescanning =
    rescanningMediaPostId === selectedPost.id ||
    (rewritingPost && rewritingAction === 'media_rescan');

  const instagramHasFlyerOnly = isInstagramPost && isFlyerMedia;
  const autoPublishPlatformName = isInstagramPost ? 'Instagram' : 'Facebook';
  const rescanUsageLabel = isVideoMedia ? videoRescanUsageLabel : mediaRescanUsageLabel;

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

  const primaryPublishLabel = isPublishing
    ? 'Publishing...'
    : posted
      ? 'Already posted'
      : canAutoPublish
        ? `Publish to ${autoPublishPlatformName}`
        : isTikTokPost
          ? 'Copy for TikTok'
          : `Copy for ${platformName}`;

  const primaryPublishDisabled =
    posted || isPublishing || needsMedia || instagramHasFlyerOnly || isRescanning;

  const statusLabel = getPostStatus(selectedPost) === 'Reminder set' ? 'Scheduled' : getPostStatus(selectedPost);
  const scheduleActionLabel = canAutoPublish
    ? hasSchedule
      ? 'Change autopost time'
      : 'Schedule autopost'
    : hasSchedule
      ? 'Change reminder time'
      : isTikTokPost
        ? 'Plan TikTok reminder'
        : 'Plan reminder';
  const savedScheduleLabel = canAutoPublish ? 'Autopost scheduled' : 'Reminder planned';
  const saveScheduleButtonLabel = canAutoPublish ? 'Save autopost time' : 'Save reminder time';

  return (
    <div className="fromone-modal-overlay fromone-simple-modal-overlay" role="dialog" aria-modal="true">
      <section className="fromone-modal-card fromone-post-action-modal fromone-simple-post-modal">
        <header className="fromone-simple-modal-header">
          <div>
            <div className="page-eyebrow">{getPostPositionLabel(selectedPost)} · {platformName}</div>
            <h2>{selectedPost.title || 'Review post'}</h2>
            <div className="fromone-simple-modal-pills">
              <span>{statusLabel}</span>
              {isPostScheduledToday(selectedPost) && !posted && <span>Today</span>}
              {hasMedia && <span>{isVideoMedia ? 'Video' : isFlyerMedia ? 'Flyer' : 'Image'}</span>}
              {isTikTokPost && <span>TikTok manual</span>}
            </div>
          </div>

          <button type="button" className="secondary-button fromone-simple-close" onClick={onClose}>
            Close
          </button>
        </header>

        <section ref={mediaRef} className="fromone-simple-section fromone-simple-media-section">
          <div className="fromone-simple-section-title">
            <span>1</span>
            <div>
              <div className="page-eyebrow">Media</div>
              <h3>Check the media</h3>
            </div>
          </div>

          <div className="fromone-simple-media-grid">
            <div className="fromone-simple-media-preview">
              {selectedPost.media_url ? (
                isVideoMedia ? (
                  <video src={selectedPost.media_url} controls />
                ) : isFlyerMedia ? (
                  <div className="fromone-simple-file-card">
                    <strong>PDF flyer</strong>
                    <p>Open the flyer to check the details before posting.</p>
                  </div>
                ) : (
                  <img src={selectedPost.media_url} alt="Uploaded post media" />
                )
              ) : (
                <div className="fromone-simple-file-card">
                  <strong>No media yet</strong>
                  <p>Add a photo, video or flyer to make this post stronger.</p>
                </div>
              )}
            </div>

            <aside className="fromone-simple-media-actions">
              <p>{hasMedia ? getImageGuidance(selectedPost) : 'Choose the media this post should use.'}</p>

              <label className="fromone-simple-primary-action">
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
                <div className="fromone-simple-two-actions">
                  <a href={selectedPost.media_url} target="_blank" rel="noreferrer" className="secondary-button">
                    {isFlyerMedia ? 'Open flyer' : 'View media'}
                  </a>

                  <button
                    type="button"
                    className="secondary-button danger-button"
                    onClick={() => onRemoveMedia(selectedPost)}
                    disabled={removingMediaPostId === selectedPost.id || accessLocked}
                  >
                    {removingMediaPostId === selectedPost.id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              )}
            </aside>
          </div>
        </section>

        {onRescanPostMedia && (
          <section className="fromone-simple-section fromone-simple-rewrite-section">
            <div className="fromone-simple-section-title">
              <span>2</span>
              <div>
                <div className="page-eyebrow">Rewrite using media</div>
                <h3>Rewrite using media</h3>
              </div>
            </div>

            <div className="fromone-simple-action-strip">
              <div>
                <p>Create a fresh editable version from the photo, video or flyer above.</p>
                {posted && (
                  <small>This will not change anything already posted on Facebook or Instagram.</small>
                )}
                {!hasMedia && <small>Upload media first, then rewrite this post.</small>}
                {rescanUsageLabel && <small>{rescanUsageLabel}</small>}
              </div>

              <button
                type="button"
                className="fromone-simple-primary-action"
                onClick={() => onRescanPostMedia(selectedPost)}
                disabled={accessLocked || !hasMedia || isRescanning}
              >
                {isRescanning ? 'Rewriting...' : 'Rewrite using media'}
              </button>
            </div>
          </section>
        )}

        <section ref={postRef} className="fromone-simple-section">
          <div className="fromone-simple-section-title">
            <span>3</span>
            <div>
              <div className="page-eyebrow">Wording</div>
              <h3>Check the wording</h3>
            </div>
          </div>

          {editingPostId === selectedPost.id ? (
            <div className="fromone-simple-edit-form">
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

              <div className="fromone-simple-two-actions">
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
            <>
              <div className="fromone-simple-wording-card">
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

              {activeImprovementNote && (
                <div className="fromone-simple-note">
                  <strong>{activeImprovementNote.label}</strong>
                  <p>{activeImprovementNote.detail}</p>
                </div>
              )}

              <div className="fromone-simple-two-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onStartEditingPost(selectedPost)}
                  disabled={accessLocked}
                >
                  Edit wording
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setShowAdvancedTools((current) => !current);
                    if (!showImproveTools) onToggleImproveTools();
                  }}
                  disabled={accessLocked || rewritingPost || isRescanning}
                >
                  {showAdvancedTools ? 'Hide improve tools' : 'Improve wording'}
                </button>
              </div>
            </>
          )}

          {showAdvancedTools && showImproveTools && (
            <div className="fromone-simple-improve-panel">
              <div className="fromone-simple-quick-grid">
                {quickImproveActions.map((action) => (
                  <button
                    key={action.value}
                    type="button"
                    className="secondary-button"
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

              <div className="fromone-simple-audience-grid">
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
                  {rewritingPost && rewritingAction === 'audience' ? 'Improving...' : 'Improve for audience'}
                </button>
              </div>
            </div>
          )}
        </section>

        <section ref={publishRef} className="fromone-simple-section">
          <div className="fromone-simple-section-title">
            <span>4</span>
            <div>
              <div className="page-eyebrow">Publish</div>
              <h3>{posted ? 'Posted' : canAutoPublish ? 'Publish now' : 'Copy and open'}</h3>
            </div>
          </div>

          {selectedPost.publish_error && (
            <div className="fromone-simple-note is-error">
              <strong>Publishing failed</strong>
              <p>{selectedPost.publish_error}</p>
            </div>
          )}

          {instagramHasFlyerOnly && (
            <div className="fromone-simple-note">
              <strong>Instagram needs an image or video</strong>
              <p>PDF flyers cannot be direct-published to Instagram. Replace it with an image or video, or post manually.</p>
            </div>
          )}

          <div className="fromone-simple-publish-card">
            <div>
              <strong>{platformName}</strong>
              <p>
                {posted
                  ? `${platformName} has been marked as posted.`
                  : canAutoPublish
                    ? `${platformName} can publish now or autopost at the time you choose.`
                    : isTikTokPost
                      ? 'Copy the post, open TikTok, then paste and publish manually.'
                      : `Copy the post and open ${platformName}.`}
              </p>

              {hasSchedule && !posted && (
                <small>
                  {savedScheduleLabel}: {getReadableDateTime(selectedPost.scheduled_publish_at)}
                </small>
              )}
            </div>

            <button
              type="button"
              className="fromone-simple-primary-action"
              onClick={handlePrimaryPublish}
              disabled={primaryPublishDisabled}
            >
              {primaryPublishLabel}
            </button>
          </div>

          <div className="fromone-simple-two-actions">
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
          </div>

          <div className="fromone-simple-schedule">
            {!showScheduleControls ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowScheduleControls(true)}
                disabled={posted || isRescanning}
              >
                {scheduleActionLabel}
              </button>
            ) : (
              <div className="fromone-simple-schedule-grid">
                <input
                  type="datetime-local"
                  className="input"
                  value={reminderValue}
                  onChange={(event) => onSetReminderValue(event.target.value)}
                />

                <button
                  type="button"
                  onClick={() => onSaveReminder(selectedPost)}
                  disabled={savingReminderPostId === selectedPost.id || !reminderValue || isRescanning}
                >
                  {savingReminderPostId === selectedPost.id ? 'Saving...' : saveScheduleButtonLabel}
                </button>

                {hasSchedule && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => onClearReminder(selectedPost)}
                    disabled={savingReminderPostId === selectedPost.id || isRescanning}
                  >
                    Clear
                  </button>
                )}

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowScheduleControls(false)}
                  disabled={savingReminderPostId === selectedPost.id || isRescanning}
                >
                  Hide
                </button>
              </div>
            )}
          </div>

          <div className="fromone-simple-admin-actions">
            {posted ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => onMarkAsNotPosted(selectedPost.id)}
                disabled={isRescanning}
              >
                Undo posted
              </button>
            ) : (
              <button
                type="button"
                className="secondary-button"
                onClick={() => onMarkAsPosted(selectedPost.id)}
                disabled={isRescanning}
              >
                Mark posted manually
              </button>
            )}

            {onDeletePost && (
              <button
                type="button"
                className="secondary-button danger-button"
                onClick={() => onDeletePost(selectedPost)}
                disabled={deletingPostId === selectedPost.id || isRescanning}
              >
                {deletingPostId === selectedPost.id ? 'Deleting...' : posted ? 'Archive post' : 'Delete post'}
              </button>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
