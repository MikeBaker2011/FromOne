'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_EMAIL = 'mikeb33@hotmail.co.uk';

type UserReview = {
  id: string;
  user_id: string | null;
  rating: number;
  review_text: string;
  status: string;
  created_at: string;
  updated_at: string | null;
};

export default function ReviewsPage() {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [saving, setSaving] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadPage();
  }, []);

  const loadPage = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) return;

    const admin = user.email === ADMIN_EMAIL;
    setIsAdmin(admin);

    await loadReviews(user.id, admin);
  };

  const loadReviews = async (userId?: string, admin = isAdmin) => {
    setLoadingReviews(true);

    let query = supabase
      .from('user_reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (!admin && userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading reviews:', error.message);
      setReviews([]);
    } else {
      setReviews((data || []) as UserReview[]);
    }

    setLoadingReviews(false);
  };

  const submitReview = async () => {
    if (!reviewText.trim()) {
      alert('Please write a short review.');
      return;
    }

    setSaving(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id || null;

      if (!userId) {
        alert('Please sign in before leaving a review.');
        return;
      }

      const { error } = await supabase.from('user_reviews').insert({
        user_id: userId,
        rating,
        review_text: reviewText.trim(),
        status: 'new',
        created_at: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      alert('Thank you. Your review has been sent.');

      setRating(5);
      setHoverRating(0);
      setReviewText('');

      await loadReviews(userId, isAdmin);
    } catch (error: any) {
      alert(error?.message || 'Error submitting review.');
    } finally {
      setSaving(false);
    }
  };

  const updateReviewStatus = async (reviewId: string, nextStatus: string) => {
    if (!isAdmin) return;

    const { error } = await supabase
      .from('user_reviews')
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewId);

    if (error) {
      alert(error.message);
      return;
    }

    setReviews((currentReviews) =>
      currentReviews.map((review) =>
        review.id === reviewId ? { ...review, status: nextStatus } : review
      )
    );
  };

  const deleteReview = async (review: UserReview) => {
    if (!isAdmin) return;

    const confirmed = confirm(`Delete this review?\n\n${review.review_text}`);

    if (!confirmed) return;

    const { error } = await supabase.from('user_reviews').delete().eq('id', review.id);

    if (error) {
      alert(error.message);
      return;
    }

    setReviews((currentReviews) =>
      currentReviews.filter((item) => item.id !== review.id)
    );
  };

  const filteredReviews = useMemo(() => {
    if (statusFilter === 'all') return reviews;

    return reviews.filter((review) => review.status === statusFilter);
  }, [reviews, statusFilter]);

  const newReviewsCount = reviews.filter((review) => review.status === 'new').length;
  const approvedReviewsCount = reviews.filter((review) => review.status === 'approved').length;

  return (
    <>
      <div className="page-header">
        <div className="page-eyebrow">FromOne Reviews</div>
        <h1 className="page-title">How are you finding FromOne?</h1>
        <p className="page-description">
          Your review helps us improve FromOne and helps other small businesses understand
          whether it could save them time.
        </p>
      </div>

      <div className="grid grid-two">
        <section className="premium-card">
          <div className="page-eyebrow">Leave a Review</div>
          <h2 style={{ marginTop: 0 }}>Rate your experience.</h2>
          <p>
            Tell us what you like, what could be better, or whether FromOne has helped you
            save time with social media.
          </p>

          <label>
            <strong>Your rating</strong>
          </label>

          <div className="review-star-row" onMouseLeave={() => setHoverRating(0)}>
            {[1, 2, 3, 4, 5].map((star) => {
              const active = star <= (hoverRating || rating);

              return (
                <button
                  key={star}
                  type="button"
                  className={active ? 'review-star active' : 'review-star'}
                  onMouseEnter={() => setHoverRating(star)}
                  onClick={() => setRating(star)}
                  aria-label={`${star} star${star === 1 ? '' : 's'}`}
                >
                  ★
                </button>
              );
            })}
          </div>

          <label>
            <strong>Your review</strong>
          </label>
          <textarea
            className="input"
            value={reviewText}
            onChange={(event) => setReviewText(event.target.value)}
            placeholder="Example: FromOne made it much easier to plan my posts for the week."
            rows={7}
          />

          <button onClick={submitReview} disabled={saving}>
            {saving ? 'Sending...' : 'Submit Review'}
          </button>
        </section>

        <section className="hero-card">
          <div className="page-eyebrow">Why Reviews Matter</div>
          <h2 style={{ marginTop: 0, fontSize: '34px' }}>
            Real feedback helps build a better product.
          </h2>
          <p>
            FromOne is built for small businesses, so your opinion matters. A short review
            helps us understand what is useful, what is confusing, and what should improve
            next.
          </p>

          <div className="grid" style={{ marginTop: '22px' }}>
            <div className="card">
              <strong>Keep it honest</strong>
              <p>Tell us what worked well and what could be clearer.</p>
            </div>

            <div className="card">
              <strong>Keep it simple</strong>
              <p>A few sentences is enough. Your review does not need to be perfect.</p>
            </div>
          </div>
        </section>
      </div>

      <section className="premium-card review-history-card">
        <div className="review-section-header">
          <div>
            <div className="page-eyebrow">{isAdmin ? 'Admin Reviews' : 'My Reviews'}</div>
            <h2>{isAdmin ? 'Review inbox' : 'Your submitted reviews'}</h2>
            <p>
              {isAdmin
                ? 'Approve, hide, or remove reviews from one place.'
                : 'Reviews you have submitted will appear here.'}
            </p>
          </div>

          {isAdmin && (
            <div className="review-admin-stats">
              <span>
                <strong>{newReviewsCount}</strong>
                New
              </span>
              <span>
                <strong>{approvedReviewsCount}</strong>
                Approved
              </span>
              <span>
                <strong>{reviews.length}</strong>
                Total
              </span>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="review-admin-controls">
            <select
              className="input"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All reviews</option>
              <option value="new">New</option>
              <option value="approved">Approved</option>
              <option value="hidden">Hidden</option>
            </select>

            <button className="secondary-button" onClick={() => loadReviews(undefined, true)}>
              Refresh
            </button>
          </div>
        )}

        {loadingReviews ? (
          <p>Loading reviews...</p>
        ) : filteredReviews.length === 0 ? (
          <div className="review-empty">
            <strong>No reviews yet.</strong>
            <p>{isAdmin ? 'Submitted reviews will appear here.' : 'Your reviews will appear here.'}</p>
          </div>
        ) : (
          <div className="review-list">
            {filteredReviews.map((review) => (
              <article key={review.id} className="review-item">
                <div className="review-item-top">
                  <div>
                    <span className="review-stars-display">
                      {'★'.repeat(review.rating)}
                      {'☆'.repeat(5 - review.rating)}
                    </span>
                    <span className="review-status">{review.status}</span>
                  </div>

                  <small>
                    {new Date(review.created_at).toLocaleDateString(undefined, {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </small>
                </div>

                <p>{review.review_text}</p>

                {isAdmin && review.user_id && (
                  <small className="review-user">User ID: {review.user_id}</small>
                )}

                {isAdmin && (
                  <div className="review-actions">
                    <button
                      className="secondary-button"
                      onClick={() => updateReviewStatus(review.id, 'approved')}
                    >
                      Approve
                    </button>

                    <button
                      className="secondary-button"
                      onClick={() => updateReviewStatus(review.id, 'hidden')}
                    >
                      Hide
                    </button>

                    <button
                      className="secondary-button danger-button"
                      onClick={() => deleteReview(review)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}