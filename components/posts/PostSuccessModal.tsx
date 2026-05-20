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
        <div className="fromone-modal-icon">✓</div>
        <div className="page-eyebrow">Post done</div>
        <h2>That post is complete.</h2>
        <p>
          {postsLeft === 0
            ? 'All posts in this set are done. Upload more photos or flyers from Dashboard when you are ready to create the next set.'
            : `${postsLeft} posts left to review this week.`}
        </p>

        <div className="fromone-modal-actions">
          {nextPostId && (
            <button type="button" onClick={onViewNextPost}>
              Review next post
            </button>
          )}

          <button type="button" className="secondary-button" onClick={onBackToDashboard}>
            Back to Dashboard
          </button>
        </div>
      </section>
    </div>
  );
}
