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
  queueRef?: React.RefObject<HTMLDivElement | null>;
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
  return (
    <section ref={queueRef} className="simplified-week-section premium-week-calendar-section">
      <div className="simplified-section-heading">
        <div>
          <div className="page-eyebrow">Weekly queue</div>
          <h2>Pick a post.</h2>
          <p>Click a card to open the post window.</p>
        </div>

        <button type="button" className="premium-next-day-button" onClick={onSelectNextPost}>
          {selectedPostId ? 'Next post →' : 'Start first post →'}
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="premium-card" style={{ marginTop: 20 }}>
          <div className="page-eyebrow">No posts found</div>
          <h2 style={{ marginTop: 0 }}>This weekly plan has no posts yet.</h2>
          <p>Go back to Dashboard and create weekly posts.</p>
        </div>
      ) : (
        <div className="premium-calendar-carousel fromone-weekly-queue">
          {posts.map((post) => {
            const dateParts = getPostDateParts(post);
            const isSelected = selectedPostId === post.id;
            const isToday = isPostScheduledToday(post);
            const status = getPostStatus(post);

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
                  {getPostPositionLabel(post)}
                </span>

                <div className="premium-calendar-date-row">
                  <span>{dateParts.weekday}</span>
                  <strong>{dateParts.day}</strong>
                  <small>{dateParts.month}</small>
                </div>

                <div className="premium-calendar-post-info">
                  <strong>{getPlatformDisplayName(post)}</strong>
                  <p>{isToday && !isPostPosted(post) ? 'Start here' : post.title || 'Post ready'}</p>
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