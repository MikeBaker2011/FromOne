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
  const postLabel = postsLeft === 1 ? "post" : "posts";

  return (
    <div className="fromone-modal-overlay" role="dialog" aria-modal="true">
      <section className="fromone-modal-card fromone-success-card fromone-success-card-polished">
        <div className="fromone-modal-icon fromone-success-icon">✓</div>

        <div className="page-eyebrow">Post complete</div>

        <h2>
          {isComplete ? "Weekly set complete." : "Post done — keep going."}
        </h2>

        <p className="fromone-success-lead">
          {isComplete
            ? "Nice work. Every post in this set has been completed. You can return to Dashboard whenever you are ready to create the next set."
            : `${postsLeft} ${postLabel} left. Review the next one, check the wording and media, then choose publish, schedule or manual post.`}
        </p>

        <div className="fromone-success-progress-card">
          <span>{isComplete ? "All done" : "Progress"}</span>
          <strong>
            {isComplete ? "0 posts left" : `${postsLeft} ${postLabel} left`}
          </strong>
          <p>
            {isComplete
              ? "Upload fresh photos, videos or flyers from Dashboard to create more posts."
              : "FromOne will keep moving you through the set one post at a time."}
          </p>
        </div>

        <div className="fromone-success-next-step">
          <strong>{isComplete ? "Next best step" : "Recommended next step"}</strong>
          <span>
            {isComplete
              ? "Go back to Dashboard when you want to create more posts from new media."
              : "Review the next post now so the whole set gets finished while you are in flow."}
          </span>
        </div>

        <div className="fromone-modal-actions fromone-success-actions">
          {nextPostId && !isComplete && (
            <button type="button" onClick={onViewNextPost}>
              Review next post
            </button>
          )}

          <button
            type="button"
            className={nextPostId && !isComplete ? "secondary-button" : undefined}
            onClick={onBackToDashboard}
          >
            {isComplete ? "Back to Dashboard" : "Back to Dashboard"}
          </button>
        </div>

        <style jsx global>{`
          .fromone-success-card-polished {
            width: min(520px, calc(100vw - 28px)) !important;
            text-align: center;
            border-radius: 34px !important;
            border: 1px solid rgba(61, 220, 151, 0.22) !important;
            background:
              radial-gradient(circle at top, rgba(61, 220, 151, 0.16), transparent 34%),
              linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.035)) !important;
            box-shadow: 0 30px 96px rgba(0,0,0,0.34) !important;
          }

          .fromone-success-icon {
            background: linear-gradient(135deg, #3ddc97, #a7f3d0) !important;
            color: #062116 !important;
            box-shadow: 0 18px 46px rgba(61, 220, 151, 0.26) !important;
          }

          .fromone-success-lead {
            max-width: 420px;
            margin: 0 auto 16px !important;
            color: rgba(248,250,252,0.72) !important;
            line-height: 1.58 !important;
            font-weight: 760 !important;
          }

          .fromone-success-progress-card {
            display: grid;
            gap: 6px;
            margin: 18px auto;
            padding: 16px;
            border-radius: 24px;
            background: rgba(2, 6, 23, 0.28);
            border: 1px solid rgba(255,255,255,0.09);
          }

          .fromone-success-progress-card span {
            color: #a7f3d0;
            font-size: 0.76rem;
            font-weight: 1000;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .fromone-success-progress-card strong {
            color: #ffffff;
            font-size: clamp(1.45rem, 4vw, 2.25rem);
            line-height: 1;
            letter-spacing: -0.045em;
          }

          .fromone-success-progress-card p {
            margin: 0;
            color: rgba(248,250,252,0.64);
            line-height: 1.45;
            font-weight: 760;
          }

          .fromone-success-card-polished .fromone-success-next-step {
            margin-top: 14px;
            text-align: left;
          }

          .fromone-success-actions {
            margin-top: 18px !important;
            display: grid !important;
            grid-template-columns: 1fr;
            gap: 10px !important;
          }

          .fromone-success-actions button {
            width: 100%;
            min-height: 54px;
            border-radius: 18px !important;
          }

          @media (max-width: 560px) {
            .fromone-success-card-polished {
              padding: 22px !important;
              border-radius: 28px !important;
            }

            .fromone-success-card-polished .fromone-success-next-step {
              text-align: center;
            }
          }
        `}</style>
      </section>
    </div>
  );
}
