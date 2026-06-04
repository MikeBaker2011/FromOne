import { RefObject } from 'react';

type PostStatus = 'Ready' | 'Reminder set' | 'Posted' | 'Failed';

type WeeklyQueueProps = {
  posts: any[];
  selectedPostId?: string | null;
  onChoosePost: (postId: string) => void;
  onSelectNextPost: () => void;
  getPostDateParts: (post: any) => {
    weekday: string;
    day: string;
    month: string;
  };
  getPostPositionLabel: (post: any) => string;
  getPlatformDisplayName: (post: any) => string;
  getPostStatus: (post: any) => PostStatus;
  getStatusClass: (status: PostStatus) => string;
  isPostScheduledToday: (post: any) => boolean;
  isPostPosted: (post: any) => boolean;
  queueRef?: RefObject<HTMLDivElement | null>;
};

export default function WeeklyQueue({
  posts,
  selectedPostId,
  onChoosePost,
  onSelectNextPost,
  getPostDateParts,
  getPostPositionLabel,
  getPlatformDisplayName,
  getPostStatus,
  getStatusClass,
  isPostScheduledToday,
  isPostPosted,
  queueRef,
}: WeeklyQueueProps) {
  const getMediaUrl = (post: any) => {
    return post?.media_url || post?.image_url || post?.asset_url || '';
  };

  const getMediaType = (post: any) => {
    const mediaType = String(post?.media_type || '').toLowerCase();
    const mediaUrl = String(getMediaUrl(post) || '').toLowerCase();
    const mediaUrlWithoutQuery = mediaUrl.split('?')[0];

    if (mediaType.includes('video')) {
      return 'video';
    }

    if (mediaType.includes('image')) {
      return 'image';
    }

    if (
      mediaType === 'flyer' ||
      mediaType === 'pdf' ||
      (!mediaType && mediaUrlWithoutQuery.endsWith('.pdf'))
    ) {
      return 'flyer';
    }

    return mediaType || 'image';
  };

  const getShortCaption = (post: any) => {
    const value = String(post?.caption || post?.title || 'Post ready').trim();

    if (value.length <= 86) return value;

    return `${value.slice(0, 83).trim()}…`;
  };

  const getManualLabel = (post: any) => {
    const platform = String(getPlatformDisplayName(post) || '').toLowerCase();

    if (platform.includes('tiktok')) return 'Manual TikTok';
    if (platform.includes('facebook')) return 'Facebook';
    if (platform.includes('instagram')) return 'Instagram';

    return getPlatformDisplayName(post);
  };

  const getMediaBadgeLabel = (post: any) => {
    const mediaUrl = getMediaUrl(post);
    const mediaType = getMediaType(post);

    if (!mediaUrl) return 'No media';
    if (mediaType === 'flyer') return 'PDF flyer';
    if (mediaType === 'video') return 'Video';
    return 'Image';
  };

  return (
    <section ref={queueRef} className="simplified-week-section premium-week-calendar-section">
      <div className="simplified-section-heading">
        <div>
          <div className="page-eyebrow">Review posts</div>
          <h2>Media + wording.</h2>
          <p>Open each post, check the media and wording, then publish or copy.</p>
        </div>

        <button type="button" className="premium-next-day-button" onClick={onSelectNextPost}>
          {selectedPostId ? 'Next post →' : 'Start review →'}
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="premium-card" style={{ marginTop: 20 }}>
          <div className="page-eyebrow">No posts found</div>
          <h2 style={{ marginTop: 0 }}>No posts to review yet.</h2>
          <p>
            Go back to Dashboard, upload this week’s photos or flyers, then create posts.
          </p>
        </div>
      ) : (
        <div className="premium-calendar-carousel fromone-weekly-queue">
          {posts.map((post, index) => {
            const dateParts = getPostDateParts(post);
            const isSelected = selectedPostId === post.id;
            const isToday = isPostScheduledToday(post);
            const status = getPostStatus(post);
            const mediaUrl = getMediaUrl(post);
            const mediaType = getMediaType(post);
            const isVideo = mediaType === 'video';
            const isFlyer = mediaType === 'flyer';
            const positionLabel = getPostPositionLabel(post) || `Post ${index + 1}`;
            const mediaBadgeLabel = getMediaBadgeLabel(post);

            return (
              <button
                key={post.id}
                type="button"
                className={[
                  'premium-calendar-day-card',
                  'fromone-queue-card',
                  isSelected ? 'is-selected' : '',
                  isToday && !isPostPosted(post) ? 'is-today' : '',
                  getStatusClass(status),
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onChoosePost(post.id)}
              >
                <span className="premium-calendar-day-label">
                  {positionLabel}
                </span>

                {mediaUrl ? (
                  <div
                    className="fromone-queue-media-preview"
                    style={{
                      width: '100%',
                      aspectRatio: '4 / 3',
                      borderRadius: 18,
                      overflow: 'hidden',
                      background: '#020617',
                      border: '1px solid rgba(255,255,255,0.1)',
                      margin: '10px 0 12px',
                      position: 'relative',
                    }}
                  >
                    {isVideo ? (
                      <video
                        src={mediaUrl}
                        muted
                        playsInline
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    ) : isFlyer ? (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'grid',
                          placeItems: 'center',
                          padding: 16,
                          textAlign: 'center',
                          background:
                            'radial-gradient(circle at top right, rgba(255, 212, 59, 0.18), rgba(255, 255, 255, 0.06) 44%, rgba(15, 23, 42, 0.78))',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              width: 48,
                              height: 58,
                              borderRadius: 12,
                              margin: '0 auto 10px',
                              display: 'grid',
                              placeItems: 'center',
                              background: '#ffd43b',
                              color: '#101420',
                              fontWeight: 950,
                              fontSize: 13,
                              boxShadow: '0 14px 28px rgba(255, 212, 59, 0.18)',
                            }}
                          >
                            PDF
                          </div>

                          <strong
                            style={{
                              display: 'block',
                              color: '#ffffff',
                              fontSize: 14,
                              lineHeight: 1.15,
                            }}
                          >
                            Flyer attached
                          </strong>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={mediaUrl}
                        alt={`${positionLabel} media`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          display: 'block',
                          background: '#020617',
                        }}
                      />
                    )}

                    <span
                      style={{
                        position: 'absolute',
                        left: 10,
                        bottom: 10,
                        display: 'inline-flex',
                        alignItems: 'center',
                        minHeight: 24,
                        padding: '5px 9px',
                        borderRadius: 999,
                        background: 'rgba(2, 6, 23, 0.78)',
                        color: '#ffffff',
                        fontSize: 11,
                        fontWeight: 900,
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.14)',
                      }}
                    >
                      {mediaBadgeLabel}
                    </span>
                  </div>
                ) : (
                  <div
                    className="fromone-queue-media-placeholder"
                    style={{
                      width: '100%',
                      aspectRatio: '4 / 3',
                      borderRadius: 18,
                      display: 'grid',
                      placeItems: 'center',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px dashed rgba(255,255,255,0.18)',
                      color: 'rgba(255,255,255,0.68)',
                      margin: '10px 0 12px',
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    No media
                  </div>
                )}

                <div className="premium-calendar-date-row">
                  <span>{dateParts.weekday}</span>
                  <strong>{dateParts.day}</strong>
                  <small>{dateParts.month}</small>
                </div>

                <div className="premium-calendar-post-info">
                  <strong>{getManualLabel(post)}</strong>
                  <p>{isToday && !isPostPosted(post) ? 'Start here' : getShortCaption(post)}</p>
                </div>

                <span className="premium-calendar-status">{status}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
