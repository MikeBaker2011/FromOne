"use client";

import "./posts.css";

import { CSSProperties, ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

import WeeklyPlanControls from "@/components/posts/WeeklyPlanControls";
import WeeklyQueue from "@/components/posts/WeeklyQueue";
import PostActionModal from "@/components/posts/PostActionModal";
import TodayReminderModal from "@/components/posts/TodayReminderModal";
import PostSuccessModal from "@/components/posts/PostSuccessModal";
import ReviewPromptModal from "@/components/posts/ReviewPromptModal";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const MEDIA_BUCKET = "campaign-assets";
const MAX_SAVED_CAMPAIGNS = 4;

const REVIEW_PROMPT_DISMISSED_KEY = "fromone_review_prompt_dismissed";
const REVIEW_PROMPT_SUBMITTED_KEY = "fromone_review_prompt_submitted";
const REVIEW_PROMPT_POSTED_COUNT_KEY = "fromone_review_prompt_posted_count";
const REVIEW_PROMPT_TRIGGER_COUNT = 3;

const DEMO_WEEKLY_MEDIA_RESCAN_LIMIT = 3;
const PAID_WEEKLY_MEDIA_RESCAN_LIMIT = 10;
const DEMO_WEEKLY_VIDEO_RESCAN_LIMIT = 1;
const PAID_WEEKLY_VIDEO_RESCAN_LIMIT = 2;

const MEDIA_RESCAN_EVENT_TYPES = ["post_media_rescan", "post_image_rescan", "post_flyer_rescan"];
const VIDEO_RESCAN_EVENT_TYPES = ["post_video_rescan"];

type AccessInfo = {
  id: string;
  user_id: string;
  access_status: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  extension_ends_at: string | null;
  subscription_status: string | null;
};

type MetaConnection = {
  id: string;
  provider: string;
  provider_user_name: string | null;
  page_id: string | null;
  page_name: string | null;
  instagram_business_account_id: string | null;
  instagram_username: string | null;
  expires_at: string | null;
  status: string | null;
  updated_at: string | null;
};

type SuccessMoment = {
  postsLeft: number;
  nextPostId: string | null;
};

type ImprovementNote = {
  postId: string;
  label: string;
  detail: string;
};

type PostStatus = "Ready" | "Reminder set" | "Posted" | "Failed";
type BillingPlan = "demo" | "starter";

const MAIN_POST_PLATFORMS = ["Facebook", "Instagram", "TikTok"];

const quickImproveActions = [
  { value: "make_shorter", label: "Make shorter" },
  { value: "make_more_local", label: "More local" },
  { value: "make_sales_focused", label: "More sales-focused" },
  { value: "make_less_generic", label: "Less generic" },
  { value: "different_version", label: "Different version" },
];

const defaultAudienceTargets = [
  "Local customers",
  "Small business owners",
  "Busy professionals",
  "Families",
  "Homeowners",
  "New customers",
  "Returning customers",
  "Custom audience",
];

const toneOptions = [
  "Use current tone",
  "More friendly",
  "More professional",
  "More premium",
  "More direct",
  "More fun",
  "More trustworthy",
];

const industryAudienceTargets: Record<string, string[]> = {
  plumbing: [
    "Homeowners",
    "Landlords",
    "Property managers",
    "Letting agents",
    "Small business owners",
    "Emergency callout customers",
    "Custom audience",
  ],
  electrician: [
    "Homeowners",
    "Landlords",
    "Property managers",
    "Small business owners",
    "Emergency repair customers",
    "New homeowners",
    "Custom audience",
  ],
  roofing: [
    "Homeowners",
    "Landlords",
    "Property managers",
    "Commercial property owners",
    "Storm damage customers",
    "Home sellers",
    "Custom audience",
  ],
  signage: [
    "Small business owners",
    "Retail shops",
    "Construction companies",
    "Estate agents",
    "Event organisers",
    "Local tradespeople",
    "Custom audience",
  ],
  print: [
    "Small business owners",
    "Event organisers",
    "Retail shops",
    "Startups",
    "Local organisations",
    "Marketing managers",
    "Custom audience",
  ],
  beauty: [
    "Local shoppers",
    "Brides",
    "Busy professionals",
    "Luxury buyers",
    "Regular clients",
    "New clients",
    "Custom audience",
  ],
  hair: [
    "Local clients",
    "Brides",
    "Busy professionals",
    "Regular clients",
    "New clients",
    "Style-conscious customers",
    "Custom audience",
  ],
  fitness: [
    "Beginners",
    "Busy professionals",
    "Parents",
    "Weight loss clients",
    "Strength training clients",
    "Local residents",
    "Custom audience",
  ],
  restaurant: [
    "Local diners",
    "Families",
    "Couples",
    "Office workers",
    "Weekend customers",
    "Event bookings",
    "Custom audience",
  ],
  cafe: [
    "Local shoppers",
    "Office workers",
    "Students",
    "Remote workers",
    "Families",
    "Weekend customers",
    "Custom audience",
  ],
  estate: [
    "First-time buyers",
    "Homeowners",
    "Landlords",
    "Property investors",
    "Sellers",
    "Tenants",
    "Custom audience",
  ],
  property: [
    "First-time buyers",
    "Homeowners",
    "Landlords",
    "Property investors",
    "Sellers",
    "Tenants",
    "Custom audience",
  ],
  ecommerce: [
    "Online shoppers",
    "Gift buyers",
    "Returning customers",
    "Deal seekers",
    "Luxury buyers",
    "New customers",
    "Custom audience",
  ],
  accounting: [
    "Small business owners",
    "Sole traders",
    "Startups",
    "Limited company directors",
    "Self-employed professionals",
    "Landlords",
    "Custom audience",
  ],
  legal: [
    "Small business owners",
    "Families",
    "Homeowners",
    "Landlords",
    "Employers",
    "People needing advice",
    "Custom audience",
  ],
  dental: [
    "Families",
    "Nervous patients",
    "New patients",
    "Cosmetic dentistry clients",
    "Parents",
    "Local residents",
    "Custom audience",
  ],
  mechanic: [
    "Car owners",
    "Fleet owners",
    "Commuters",
    "Families",
    "Local drivers",
    "Van owners",
    "Custom audience",
  ],
  garage: [
    "Car owners",
    "Fleet owners",
    "Commuters",
    "Families",
    "Local drivers",
    "Van owners",
    "Custom audience",
  ],
  club: [
    "Local nightlife customers",
    "Students",
    "Weekend groups",
    "Birthday groups",
    "Event bookers",
    "VIP table customers",
    "Custom audience",
  ],
  nightclub: [
    "Local nightlife customers",
    "Students",
    "Weekend groups",
    "Birthday groups",
    "Event bookers",
    "VIP table customers",
    "Custom audience",
  ],
  bar: [
    "Local nightlife customers",
    "After-work customers",
    "Weekend groups",
    "Event bookers",
    "Couples",
    "Regular customers",
    "Custom audience",
  ],
};

const normaliseMainPlatform = (platform?: string | null) => {
  const cleanPlatform = String(platform || "").toLowerCase();

  if (cleanPlatform.includes("facebook")) return "Facebook";
  if (cleanPlatform.includes("instagram")) return "Instagram";
  if (cleanPlatform.includes("tiktok")) return "TikTok";

  return "Post";
};

export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [deletedPosts, setDeletedPosts] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaign, setCampaign] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [metaConnections, setMetaConnections] = useState<MetaConnection[]>([]);

  const [billingPlan, setBillingPlan] = useState<BillingPlan>("demo");
  const [weeklyMediaRescansUsed, setWeeklyMediaRescansUsed] = useState(0);
  const [weeklyVideoRescansUsed, setWeeklyVideoRescansUsed] = useState(0);
  const [rescanningMediaPostId, setRescanningMediaPostId] = useState<string | null>(null);

  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [pendingCampaignId, setPendingCampaignId] = useState("");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingSelectedPlan, setLoadingSelectedPlan] = useState(false);
  const [deletingCampaign, setDeletingCampaign] = useState(false);
  const [renamingCampaign, setRenamingCampaign] = useState(false);

  const [accessLocked, setAccessLocked] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");

  const [audienceTarget, setAudienceTarget] = useState("Local customers");
  const [customAudienceTarget, setCustomAudienceTarget] = useState("");
  const [toneTarget, setToneTarget] = useState("Use current tone");
  const [rewritingPost, setRewritingPost] = useState(false);
  const [rewritingAction, setRewritingAction] = useState("");
  const [improvementNote, setImprovementNote] = useState<ImprovementNote | null>(null);
  const [showImproveTools, setShowImproveTools] = useState(false);

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editCta, setEditCta] = useState("");
  const [editHashtags, setEditHashtags] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [uploadingMediaPostId, setUploadingMediaPostId] = useState<string | null>(null);
  const [removingMediaPostId, setRemovingMediaPostId] = useState<string | null>(null);
  const [publishingPostId, setPublishingPostId] = useState<string | null>(null);
  const [savingReminderPostId, setSavingReminderPostId] = useState<string | null>(null);
  const [reminderValue, setReminderValue] = useState("");
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [recentlyDeletedPost, setRecentlyDeletedPost] = useState<any | null>(null);

  const [showTodayReminder, setShowTodayReminder] = useState(false);
  const [todayReminderPostId, setTodayReminderPostId] = useState<string | null>(null);
  const [successMoment, setSuccessMoment] = useState<SuccessMoment | null>(null);

  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewHoverRating, setReviewHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  const queueRef = useRef<HTMLDivElement | null>(null);
  const postRef = useRef<HTMLElement | null>(null);
  const mediaRef = useRef<HTMLElement | null>(null);
  const publishRef = useRef<HTMLElement | null>(null);

  const sortPostsByDate = (items: any[]) => {
    return [...items].sort((firstPost, secondPost) => {
      const firstTime = firstPost.scheduled_at ? new Date(firstPost.scheduled_at).getTime() : 0;
      const secondTime = secondPost.scheduled_at ? new Date(secondPost.scheduled_at).getTime() : 0;
      return firstTime - secondTime;
    });
  };

  const isPostPosted = (post: any) => {
    return (
    <div className="campaign-brand-shell simplified-posts-page" style={brandStyle}>
      <div className="campaigns-page-header simplified-posts-header">
        <div>
          <div className="page-eyebrow">Posts</div>
          <h1 className="page-title">This week’s posts.</h1>
          <p className="page-description">
            Review each post, then publish Facebook and Instagram or copy/open TikTok.
          </p>

          <div className="simplified-posts-meta">
            <span>{businessName}</span>
            <span>
              {postedCount}/{posts.length || 0} posted
            </span>
            {facebookConnected && <span>Facebook connected</span>}
            {instagramConnected && <span>Instagram connected</span>}
          </div>
        </div>

        <button className="secondary-button refresh-button" onClick={loadPageData}>
          Refresh
        </button>
      </div>

      {loading ? (
        <section className="premium-card">
          <p>Loading posts...</p>
        </section>
      ) : campaigns.length === 0 ? (
        <section
          className="premium-card"
          style={{
            textAlign: "center",
            padding: "clamp(28px, 5vw, 56px)",
            borderRadius: 34,
          }}
        >
          <div className="page-eyebrow">No posts yet</div>
          <h2 style={{ marginTop: 0 }}>Create this week’s posts first.</h2>
          <p style={{ maxWidth: 680, margin: "0 auto 22px" }}>
            Go to Dashboard, upload photos, videos or flyers, then FromOne will create posts ready
            to review here.
          </p>

          <a href="/dashboard" className="dashboard-platform-create-button">
            Upload and create posts
          </a>
        </section>
      ) : (
        <>
          {accessLocked && (
            <section className="access-status-card access-status-locked">
              <div>
                <div className="page-eyebrow">Demo ended</div>
                <h2>Some post actions are locked.</h2>
                <p>{accessMessage}</p>
              </div>

              <a href="/subscription" className="dashboard-profile-link">
                View subscription options
              </a>
            </section>
          )}

          <section
            className="premium-card"
            style={{
              display: "grid",
              gap: 18,
              border: "1px solid rgba(255, 212, 59, 0.24)",
              borderRadius: 30,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div className="page-eyebrow">Weekly calendar</div>
                <h2 style={{ margin: "0 0 8px" }}>Review your posts.</h2>
                <p style={{ margin: 0, color: "var(--muted)" }}>
                  Open a card, check the media and wording, then publish or copy.
                </p>
              </div>

              <div
                style={{
                  minWidth: 180,
                  padding: 14,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.055)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <strong>
                  {postedCount} of {posts.length || 0} done
                </strong>
                <div className="weekly-progress-bar" aria-label="Weekly post progress">
                  <span style={{ width: `${weeklyProgressPercent}%` }} />
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                gap: 16,
              }}
            >
              {sortedPosts.map((post) => {
                const dateParts = getPostDateParts(post);
                const status = getPostStatus(post);
                const platformName = getPlatformDisplayName(post);
                const hasMedia = Boolean(post.media_url);
                const captionPreview = String(post.caption || "").slice(0, 120);

                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => choosePost(post.id)}
                    className="fromone-simple-post-card"
                    style={{
                      textAlign: "left",
                      borderRadius: 26,
                      padding: 0,
                      overflow: "hidden",
                      background:
                        "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.035))",
                      border:
                        status === "Posted"
                          ? "1px solid rgba(61, 220, 151, 0.28)"
                          : "1px solid rgba(255,255,255,0.1)",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        minHeight: 158,
                        background: "rgba(15,23,42,0.72)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      {post.media_url ? (
                        String(post.media_type || "").toLowerCase() === "video" ? (
                          <video
                            src={post.media_url}
                            muted
                            playsInline
                            style={{
                              width: "100%",
                              height: 180,
                              objectFit: "cover",
                            }}
                          />
                        ) : String(post.media_type || "").toLowerCase() === "flyer" ? (
                          <strong>PDF flyer</strong>
                        ) : (
                          <img
                            src={post.media_url}
                            alt={post.title || "Post media"}
                            style={{
                              width: "100%",
                              height: 180,
                              objectFit: "cover",
                            }}
                          />
                        )
                      ) : (
                        <div style={{ textAlign: "center", padding: 20 }}>
                          <strong>No media yet</strong>
                          <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                            Add media in review.
                          </p>
                        </div>
                      )}
                    </div>

                    <div style={{ padding: 18, display: "grid", gap: 12 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div className="page-eyebrow">
                            {dateParts.weekday} {dateParts.day} {dateParts.month}
                          </div>
                          <strong style={{ fontSize: "1.05rem", color: "#fff" }}>
                            {post.title || `${platformName} post`}
                          </strong>
                        </div>

                        <span
                          className={`premium-calendar-status ${getStatusClass(status)}`}
                          style={{ flex: "0 0 auto" }}
                        >
                          {status === "Reminder set" ? "Planned" : status}
                        </span>
                      </div>

                      <p
                        style={{
                          margin: 0,
                          color: "rgba(248,250,252,0.76)",
                          lineHeight: 1.45,
                          minHeight: 52,
                        }}
                      >
                        {captionPreview || "Open to add or review the wording."}
                        {captionPreview.length >= 120 ? "..." : ""}
                      </p>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span className="selected-post-tags">
                          <span>{platformName}</span>
                        </span>
                        <span className="selected-post-tags">
                          <span>{hasMedia ? "Media ready" : "Needs media"}</span>
                        </span>
                      </div>

                      <span
                        className="dashboard-platform-create-button"
                        style={{
                          minHeight: 46,
                          borderRadius: 16,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "100%",
                          marginTop: 4,
                        }}
                      >
                        Review post
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {deletedPosts.length > 0 && (
            <section className="premium-card" style={{ marginTop: 22 }}>
              <div className="page-eyebrow">Deleted posts</div>
              <h2 style={{ marginTop: 0 }}>Restore a deleted post.</h2>

              <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                {deletedPosts.map((post) => (
                  <div
                    key={post.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 16,
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <strong>{post.title || post.platform || "Deleted post"}</strong>
                      <p style={{ margin: "4px 0 0", opacity: 0.78 }}>
                        {post.platform || "Post"} · deleted{" "}
                        {post.deleted_at ? getReadableDateTime(post.deleted_at) : "recently"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => restoreDeletedPost(post)}
                      disabled={deletingPostId === post.id}
                    >
                      {deletingPostId === post.id ? "Restoring..." : "Restore"}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {selectedPost && (
        <PostActionModal
          selectedPost={selectedPost}
          editingPostId={editingPostId}
          editCaption={editCaption}
          editCta={editCta}
          editHashtags={editHashtags}
          savingEdit={savingEdit}
          accessLocked={accessLocked}
          rewritingPost={rewritingPost}
          rewritingAction={rewritingAction}
          showImproveTools={showImproveTools}
          quickImproveActions={quickImproveActions}
          dynamicAudienceTargets={dynamicAudienceTargets}
          audienceTarget={audienceTarget}
          customAudienceTarget={customAudienceTarget}
          toneTarget={toneTarget}
          toneOptions={toneOptions}
          activeImprovementNote={activeImprovementNote}
          uploadingMediaPostId={uploadingMediaPostId}
          removingMediaPostId={removingMediaPostId}
          publishingPostId={publishingPostId}
          savingReminderPostId={savingReminderPostId}
          reminderValue={reminderValue}
          deletingPostId={deletingPostId}
          rescanningMediaPostId={rescanningMediaPostId}
          mediaRescanUsageLabel={getMediaRescanUsageLabel()}
          videoRescanUsageLabel={getVideoRescanUsageLabel()}
          postRef={postRef}
          mediaRef={mediaRef}
          publishRef={publishRef}
          getPostPositionLabel={getPostPositionLabel}
          getPlatformDisplayName={getPlatformDisplayName}
          getPostStatus={getPostStatus}
          getImageGuidance={getImageGuidance}
          getReadableDateTime={getReadableDateTime}
          mediaRequiredForPlatform={mediaRequiredForPlatform}
          canDirectPublishToFacebook={canDirectPublishToFacebook}
          canDirectPublishToInstagram={canDirectPublishToInstagram}
          canDemoPublishToTikTok={canDemoPublishToTikTok}
          isPostPosted={isPostPosted}
          isPostScheduledToday={isPostScheduledToday}
          onClose={closePostModal}
          onStartEditingPost={startEditingPost}
          onCancelEditingPost={cancelEditingPost}
          onSaveEditedPost={saveEditedPost}
          onSetEditCaption={setEditCaption}
          onSetEditCta={setEditCta}
          onSetEditHashtags={setEditHashtags}
          onToggleImproveTools={() => setShowImproveTools(!showImproveTools)}
          onQuickImprovePost={handleQuickImprovePost}
          onRewriteForAudience={handleRewriteForAudience}
          onRescanPostMedia={handleRescanPostMedia}
          onSetAudienceTarget={setAudienceTarget}
          onSetCustomAudienceTarget={setCustomAudienceTarget}
          onSetToneTarget={setToneTarget}
          onUploadMedia={uploadMedia}
          onRemoveMedia={removeMedia}
          onPublishToFacebook={publishToFacebook}
          onPublishToInstagram={publishToInstagram}
          onPublishToTikTokDemo={publishToTikTokDemo}
          onCopyPost={copyPost}
          onOpenPlatform={openPlatform}
          onMarkAsPosted={markAsPosted}
          onMarkAsNotPosted={markAsNotPosted}
          onSetReminderValue={setReminderValue}
          onSaveReminder={saveReminder}
          onClearReminder={clearReminder}
          onDeletePost={deletePostWithUndo}
        />
      )}

      {showTodayReminder && todayReminderPost && (
        <TodayReminderModal
          post={todayReminderPost}
          onStartTodayPost={openTodayReminderPost}
          onClose={() => setShowTodayReminder(false)}
        />
      )}

      {successMoment && (
        <PostSuccessModal
          postsLeft={successMoment.postsLeft}
          nextPostId={successMoment.nextPostId}
          onViewNextPost={viewNextPostAfterSuccess}
          onBackToDashboard={() => {
            window.location.href = "/dashboard";
          }}
        />
      )}

      {showReviewPrompt && (
        <ReviewPromptModal
          reviewRating={reviewRating}
          reviewHoverRating={reviewHoverRating}
          reviewText={reviewText}
          savingReview={savingReview}
          onSetReviewRating={setReviewRating}
          onSetReviewHoverRating={setReviewHoverRating}
          onSetReviewText={setReviewText}
          onSubmitReview={submitReviewPrompt}
          onDismissReview={dismissReviewPrompt}
        />
      )}
    </div>
  );
}