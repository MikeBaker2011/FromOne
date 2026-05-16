type TodayReminderModalProps = {
  post: any;
  onStartTodayPost: () => void;
  onClose: () => void;
};

export default function TodayReminderModal({
  post,
  onStartTodayPost,
  onClose,
}: TodayReminderModalProps) {
  if (!post) return null;

  return (
    <div className="fromone-modal-overlay" role="dialog" aria-modal="true">
      <section className="fromone-modal-card">
        <div className="fromone-modal-icon">📌</div>
        <div className="page-eyebrow">Today’s post</div>
        <h2>You have a post to make today</h2>
        <p>
          Your {post.platform || 'social'} post is ready. Open it, publish it, then mark it as
          posted.
        </p>

        <div className="fromone-modal-actions">
          <button type="button" onClick={onStartTodayPost}>
            Start today’s post
          </button>

          <button type="button" className="secondary-button" onClick={onClose}>
            Later
          </button>
        </div>
      </section>
    </div>
  );
}