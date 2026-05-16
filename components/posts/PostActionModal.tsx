import { ChangeEvent } from 'react';

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
  postRef?: React.RefObject<HTMLElement | null>;
  mediaRef?: React.RefObject<HTMLElement | null>;
  publishRef?: React.RefObject<HTMLElement | null>;
  getPostPositionLabel: (post: any) => string;
  getPlatformDisplayName: (post: any) => string;
  getPostStatus: (post: any) => PostStatus;
  getImageGuidance: (post: any) => string;
  getReadableDateTime: (value?: string | null) => string;
  mediaRequiredForPlatform: (platform?: string) => boolean;
  canDirectPublishToFacebook: (post: any) => boolean;
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
  onSetAudienceTarget: (value: string) => void;
  onSetCustomAudienceTarget: (value: string) => void;
  onSetToneTarget: (value: string) => void;
  onUploadMedia: (post: any, event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveMedia: (post: any) => void;
  onPublishToFacebook: (post: any) => void;
  onCopyPost: (post: any) => void;
  onOpenPlatform: (platform: string) => void;
  onMarkAsPosted: (postId: string) => void;
  onMarkAsNotPosted: (postId: string) => void;
  onSetReminderValue: (value: string) => void;
  onSaveReminder: (post: any) => void;
  onClearReminder: (post: any) => void;
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
  onSetAudienceTarget,
  onSetCustomAudienceTarget,
  onSetToneTarget,
  onUploadMedia,
  onRemoveMedia,
  onPublishToFacebook,
  onCopyPost,
  onOpenPlatform,
  onMarkAsPosted,
  onMarkAsNotPosted,
  onSetReminderValue,
  onSaveReminder,
  onClearReminder,
}: PostActionModalProps) {
  if (!selectedPost) return null;

  const isFacebookPost = String(selectedPost.platform || '').toLowerCase().includes('facebook');

  const scheduleStatusLabel = isFacebookPost ? 'Scheduled' : 'Reminder set';
  const scheduleInputLabel = isFacebookPost ? 'Schedule publish time' : 'Reminder time';
  const saveScheduleLabel = isFacebookPost ? 'Save schedule' : 'Save reminder';
  const clearScheduleLabel = isFacebookPost ? 'Clear schedule' : 'Clear reminder';
  const scheduleHelperText = isFacebookPost
    ? 'Facebook posts can auto-publish when the scheduler runs.'
    : 'This saves a reminder time only for this platform.';

  return (
    <div className="fromone-modal-overlay" role="dialog" aria-modal="true">
      <section className="fromone-modal-card fromone-post-action-modal">
        <div className="fromone-flow-card-top">
          <div>
            <div className="page-eyebrow">Post window</div>
            <h2>{selectedPost.title || 'Social media post'}</h2>
            <p>
              {getPostPositionLabel(selectedPost)} · {getPlatformDisplayName(selectedPost)} ·{' '}
              {getPostStatus(selectedPost)}
            </p>
          </div>

          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="selected-post-tags">
          <span>{getPostPositionLabel(selectedPost)}</span>
          <span>{getPlatformDisplayName(selectedPost)}</span>
          <span>{getPostStatus(selectedPost)}</span>
          {isPostScheduledToday(selectedPost) && !isPostPosted(selectedPost) && <span>Today</span>}
          {selectedPost.audience_target && <span>For {selectedPost.audience_target}</span>}
        </div>

        <section ref={postRef} className="fromone-flow-preview-card">
          <div className="fromone-flow-card-top">
            <div>
              <div className="page-eyebrow">Post</div>
              <h3>Check the wording.</h3>
              <p>Improve or edit only if needed.</p>
            </div>

            <span>{getPlatformDisplayName(selectedPost)}</span>
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
              disabled={accessLocked || rewritingPost}
            >
              {showImproveTools ? 'Hide improve' : 'Improve'}
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
                        disabled={accessLocked || rewritingPost}
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
                  <strong>Make it specific</strong>
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
                    disabled={accessLocked || rewritingPost}
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

        <section ref={mediaRef} className="fromone-flow-tools-card">
          <div className="fromone-flow-tools-header">
            <div>
              <div className="page-eyebrow">Media</div>
              <h3>Add an image or video.</h3>
              <p>{getImageGuidance(selectedPost)}</p>
            </div>
          </div>

          {selectedPost.media_url ? (
            <div className="fromone-media-preview-card">
              {selectedPost.media_type === 'video' ? (
                <video src={selectedPost.media_url} controls className="fromone-media-preview" />
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
                  View media
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
            </div>
          ) : (
            <div className="fromone-image-guidance-note">
              <strong>
                {mediaRequiredForPlatform(selectedPost.platform) ? 'Media needed' : 'Optional'}
              </strong>
              <p>
                {mediaRequiredForPlatform(selectedPost.platform)
                  ? `${getPlatformDisplayName(
                      selectedPost
                    )} usually needs an image or video before publishing.`
                  : 'A clear photo or short video can make this post stronger.'}
              </p>
            </div>
          )}

          <label className="fromone-upload-button">
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(event) => onUploadMedia(selectedPost, event)}
              disabled={uploadingMediaPostId === selectedPost.id || accessLocked}
              style={{ display: 'none' }}
            />
            <span>
              {uploadingMediaPostId === selectedPost.id
                ? 'Uploading...'
                : selectedPost.media_url
                  ? 'Replace media'
                  : 'Choose image or video'}
            </span>
          </label>
        </section>

        <section ref={publishRef} className="fromone-flow-tools-card">
          <div className="fromone-flow-tools-header">
            <div>
              <div className="page-eyebrow">Publish</div>
              <h3>Send it out.</h3>
              <p>Facebook can publish directly. Other platforms stay as copy/open for now.</p>
            </div>
          </div>

          {selectedPost.publish_error && (
            <div className="fromone-improvement-note fromone-error-note">
              <strong>Publishing failed</strong>
              <p>{selectedPost.publish_error}</p>
            </div>
          )}

          {selectedPost.scheduled_publish_at && (
            <div className="fromone-improvement-note">
              <strong>{scheduleStatusLabel}</strong>
              <p>
                {getReadableDateTime(selectedPost.scheduled_publish_at)}. {scheduleHelperText}
              </p>
            </div>
          )}

          <div className="fromone-flow-publish-buttons">
            {canDirectPublishToFacebook(selectedPost) ? (
              <button
                type="button"
                onClick={() => onPublishToFacebook(selectedPost)}
                disabled={publishingPostId === selectedPost.id || isPostPosted(selectedPost)}
              >
                {publishingPostId === selectedPost.id
                  ? 'Publishing...'
                  : isPostPosted(selectedPost)
                    ? 'Posted to Facebook'
                    : 'Publish to Facebook'}
              </button>
            ) : (
              <button type="button" onClick={() => onCopyPost(selectedPost)}>
                {String(selectedPost.platform || '').toLowerCase().includes('tiktok')
                  ? 'Send to TikTok'
                  : `Copy for ${getPlatformDisplayName(selectedPost)}`}
              </button>
            )}

            <button
              type="button"
              className="secondary-button"
              onClick={() => onCopyPost(selectedPost)}
            >
              Copy post
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => onOpenPlatform(selectedPost.platform || 'Facebook')}
            >
              Open {getPlatformDisplayName(selectedPost)}
            </button>

            {isPostPosted(selectedPost) ? (
              <button
                type="button"
                className="secondary-button"
                onClick={() => onMarkAsNotPosted(selectedPost.id)}
              >
                Mark as not posted
              </button>
            ) : (
              <button
                type="button"
                className="posted-button"
                onClick={() => onMarkAsPosted(selectedPost.id)}
              >
                Mark as posted
              </button>
            )}
          </div>

          <div className="fromone-schedule-box">
            <label>
              <strong>{scheduleInputLabel}</strong>
              <input
                className="input"
                type="datetime-local"
                value={reminderValue}
                onChange={(event) => onSetReminderValue(event.target.value)}
              />
            </label>

            <p style={{ marginTop: 8 }}>{scheduleHelperText}</p>

            <div className="fromone-flow-inline-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => onSaveReminder(selectedPost)}
                disabled={savingReminderPostId === selectedPost.id}
              >
                {savingReminderPostId === selectedPost.id ? 'Saving...' : saveScheduleLabel}
              </button>

              {selectedPost.scheduled_publish_at && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onClearReminder(selectedPost)}
                  disabled={savingReminderPostId === selectedPost.id}
                >
                  {clearScheduleLabel}
                </button>
              )}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}