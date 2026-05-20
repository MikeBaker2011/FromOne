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

  const platform = post.platform || 'social';

  return (
    <div className="fromone-modal-overlay" role="dialog" aria-modal="true">
      <section className="fromone-modal-card">
        <div className="fromone-modal-icon">📌</div>
        <div className="page-eyebrow">Ready to review</div>
        <h2>You have a post ready today</h2>
        <p>
          Your {platform} post is ready. Check the media and wording, then publish Facebook or
          Instagram, or copy/open TikTok manually.
        </p>

        <div className="fromone-modal-actions">
          <button type="button" onClick={onStartTodayPost}>
            Review post
          </button>

          <button type="button" className="secondary-button" onClick={onClose}>
            Later
          </button>
        </div>
      </section>
    </div>
  );
}
