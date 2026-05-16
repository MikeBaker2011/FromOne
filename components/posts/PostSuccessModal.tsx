type PostSuccessModalProps = {
  postsLeft: number;
  nextPostId: string | null;
  onViewNextPost: () => void;
  onBackToDashboard: () => void;
};

export default function PostSuccessModal({
  postsLeft,
  nextPostId,
  onViewNextPost,
  onBackToDashboard,
}: PostSuccessModalProps) {
  return (
    <div className="fromone-modal-overlay" role="dialog" aria-modal="true">
      <section className="fromone-modal-card fromone-success-card">
        <div className="fromone-modal-icon">🎉</div>
        <div className="page-eyebrow">Post complete</div>
        <h2>Nice work — that post is done 🎉</h2>
        <p>
          {postsLeft === 0
            ? 'That was the last post in this weekly plan.'
            : `${postsLeft} posts left this week.`}
        </p>

        <div className="fromone-modal-actions">
          {nextPostId && (
            <button type="button" onClick={onViewNextPost}>
              View next post
            </button>
          )}

          <button type="button" className="secondary-button" onClick={onBackToDashboard}>
            Back to dashboard
          </button>
        </div>
      </section>
    </div>
  );
}