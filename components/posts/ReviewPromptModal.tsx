type ReviewPromptModalProps = {
  reviewRating: number;
  reviewHoverRating: number;
  reviewText: string;
  savingReview: boolean;
  onSetReviewRating: (rating: number) => void;
  onSetReviewHoverRating: (rating: number) => void;
  onSetReviewText: (text: string) => void;
  onSubmitReview: () => void;
  onDismissReview: () => void;
};

export default function ReviewPromptModal({
  reviewRating,
  reviewHoverRating,
  reviewText,
  savingReview,
  onSetReviewRating,
  onSetReviewHoverRating,
  onSetReviewText,
  onSubmitReview,
  onDismissReview,
}: ReviewPromptModalProps) {
  return (
    <div className="fromone-modal-overlay" role="dialog" aria-modal="true">
      <section className="fromone-modal-card">
        <div className="fromone-modal-icon">⭐</div>
        <div className="page-eyebrow">Quick feedback</div>
        <h2>How is FromOne working for you?</h2>
        <p>
          A short review helps us improve the upload, review and publish flow for local
          businesses.
        </p>

        <div className="review-star-row" onMouseLeave={() => onSetReviewHoverRating(0)}>
          {[1, 2, 3, 4, 5].map((star) => {
            const active = star <= (reviewHoverRating || reviewRating);

            return (
              <button
                key={star}
                type="button"
                className={active ? 'review-star active' : 'review-star'}
                onMouseEnter={() => onSetReviewHoverRating(star)}
                onClick={() => onSetReviewRating(star)}
                aria-label={`${star} star${star === 1 ? '' : 's'}`}
              >
                ★
              </button>
            );
          })}
        </div>

        <textarea
          className="input"
          value={reviewText}
          onChange={(event) => onSetReviewText(event.target.value)}
          placeholder="Example: FromOne helped me turn this week’s photos into posts much faster."
          rows={5}
        />

        <div className="fromone-modal-actions">
          <button type="button" onClick={onSubmitReview} disabled={savingReview}>
            {savingReview ? 'Sending...' : 'Send feedback'}
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={onDismissReview}
            disabled={savingReview}
          >
            Maybe later
          </button>
        </div>
      </section>
    </div>
  );
}
