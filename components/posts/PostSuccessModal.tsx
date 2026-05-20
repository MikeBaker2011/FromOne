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
  const isComplete = postsLeft === 0;

  return (
    <div className="fromone-modal-overlay" role="dialog" aria-modal="true">
      <section className="fromone-modal-card fromone-success-card">
        <div className="fromone-modal-icon">✓</div>

        <div className="page-eyebrow">Post complete</div>

        <h2>{isComplete ? "This weekly set is complete." : "That post is done."}</h2>

        <p>
          {isComplete
            ? "Nice work. All posts in this set are complete. When you are ready, go back to Dashboard, upload more photos, flyers or videos, and create the next set."
            : `${postsLeft} ${postsLeft === 1 ? "post" : "posts"} left to review in this set.`}
        </p>

        {!isComplete && (
          <div className="fromone-success-next-step">
            <strong>Next step</strong>
            <span>Review the next post, check the media and wording, then publish or copy.</span>
          </div>
        )}

        {isComplete && (
          <div className="fromone-success-next-step">
            <strong>Create more posts</strong>
            <span>Use Dashboard to upload fresh business photos, flyers or event videos.</span>
          </div>
        )}

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
