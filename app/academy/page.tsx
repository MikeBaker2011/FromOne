"use client";

import { useState } from "react";

const academyLessons = [
  {
    step: "01",
    title: "Create your account",
    group: "Start here",
    time: "3 minutes",
    keywords: ["signup", "sign up", "login", "password", "account", "demo", "reset"],
    intro:
      "Start here if you are brand new to FromOne. This lesson gets you from the homepage into your account.",
    before: [
      "Have your email address ready.",
      "Choose a password you can remember.",
      "Use a test email if you are recording a guide or demo.",
    ],
    steps: [
      "Go to fromone.co.uk.",
      "Click Start 7-day demo.",
      "Create your account with your email and password.",
      "If you already have an account, sign in instead.",
      "If you cannot remember your password, use Reset password and check your email.",
      "After signing in, FromOne may take you to Settings first. That is normal.",
    ],
    tip:
      "If the reset email does not arrive straight away, check junk or spam before trying again.",
    outcome: "You can sign in and start setting up FromOne.",
  },
  {
    step: "02",
    title: "Set up your business profile",
    group: "Start here",
    time: "5 minutes",
    keywords: ["settings", "business", "website", "scan", "profile", "tone", "services"],
    intro:
      "FromOne creates better posts when it understands the business. This lesson explains how to add that information.",
    before: [
      "Have your website ready if you have one.",
      "Think about your main services.",
      "Think about your ideal customer.",
    ],
    steps: [
      "Open Settings.",
      "Add your business name.",
      "Add your website if you have one.",
      "Use the website scan if available, or enter the details manually.",
      "Add your services, location, audience and tone of voice.",
      "Save the settings before moving on.",
    ],
    tip:
      "You do not need perfect wording. Simple business details are enough to help FromOne create more relevant posts.",
    outcome: "FromOne now has the context it needs to create better post ideas.",
  },
  {
    step: "03",
    title: "Create your first posts",
    group: "Create posts",
    time: "5 minutes",
    keywords: ["dashboard", "create", "generate", "weekly posts", "media", "photos", "flyers"],
    intro:
      "This lesson creates a set of posts for review. Nothing needs to go live yet.",
    before: [
      "Make sure the business profile is saved.",
      "Have photos, videos or flyers ready if you want to use them.",
      "Decide whether you want general posts or posts based on specific media.",
    ],
    steps: [
      "Go to the Dashboard.",
      "Add photos, videos or flyers if you have them. On mobile, you can take a photo, record a video or upload a file.",
      "Choose the option to create posts.",
      "Wait while FromOne creates the post set.",
      "Open the posts when they are ready.",
      "Review them before publishing anything.",
    ],
    tip:
      "Real photos, videos and flyers usually make the posts more specific and less generic. On mobile, always add the quick description so FromOne knows what the media is about.",
    outcome: "You now have posts ready to check and improve.",
  },
  {
    step: "04",
    title: "Create posts on mobile",
    group: "Create posts",
    time: "4 minutes",
    keywords: ["mobile", "phone", "camera", "photo", "video", "quick description", "upload"],
    intro:
      "FromOne is designed to work well on a phone. Use it when you have a real business moment to capture, then review the post before anything goes live.",
    before: [
      "Sign in to FromOne on your phone.",
      "Have a photo, video or flyer ready, or use the camera option if available.",
      "Allow camera or file permissions when your phone asks.",
    ],
    steps: [
      "Open FromOne on your phone.",
      "Go to Dashboard.",
      "Tap Take photo, Record video or Upload file.",
      "Add a quick description in the “What is this about?” box.",
      "Choose the platforms you want FromOne to create posts for.",
      "Tap Create and review posts.",
      "Open the Posts page and review the wording before publishing, scheduling or posting manually.",
    ],
    tip:
      "The quick description matters. A few words like “new roof repair in Sale today” helps FromOne write a much better post.",
    outcome: "You can create useful posts from real business moments while you are on the move.",
  },
  {
    step: "05",
    title: "Review a post",
    group: "Review",
    time: "3 minutes",
    keywords: ["posts", "review", "caption", "hashtags", "cta", "platform", "planned"],
    intro:
      "Review is where you stay in control. You check the post before it is published, scheduled or copied manually.",
    before: [
      "Open the Posts page.",
      "Choose one post card to review.",
      "Take your time. Nothing publishes just by opening the post.",
    ],
    steps: [
      "Open a post from the Posts page.",
      "Check the platform, such as Facebook or Instagram.",
      "Check the image or media.",
      "Read the caption, CTA and hashtags.",
      "Check the scheduled time if one is shown.",
      "Make changes if something does not look right.",
    ],
    tip:
      "If a post does not feel right, edit it before publishing. FromOne is there to help, not take control away from you.",
    outcome: "The post is checked and ready for the next step.",
  },
  {
    step: "06",
    title: "Edit captions and wording",
    group: "Review",
    time: "4 minutes",
    keywords: ["caption", "cta", "hashtags", "edit", "improve", "tone", "audience"],
    intro:
      "This lesson helps you make the wording sound right for the business and the customer.",
    before: [
      "Open the post you want to edit.",
      "Read the caption from start to finish.",
      "Check that the CTA tells the customer what to do next.",
    ],
    steps: [
      "Open the Wording section.",
      "Edit the caption if needed.",
      "Edit the CTA.",
      "Check the hashtags.",
      "Use the improve tools if you want a different tone or version.",
      "Save the wording when you are happy.",
    ],
    tip:
      "Short, clear wording is often better than trying to say everything in one post.",
    outcome: "The post wording is clear, relevant and ready to publish.",
  },
  {
    step: "07",
    title: "Schedule a post",
    group: "Publishing",
    time: "2 minutes",
    keywords: ["schedule", "scheduled time", "planned", "autopublish", "time", "date"],
    intro:
      "Scheduling lets you choose when the post should go out. FromOne will only try to publish once the scheduled time has arrived.",
    before: [
      "Open the post review page.",
      "Check the post is not already marked as posted.",
      "Make sure the schedule time is correct.",
    ],
    steps: [
      "Find the Publish card.",
      "Choose or edit the Scheduled time.",
      "Click Save schedule.",
      "Check the status says Planned or Scheduled.",
      "Leave the post ready for FromOne to pick up later.",
    ],
    tip:
      "If the scheduled time is still in the future, the scheduler will correctly say there are no due posts yet.",
    outcome: "The post has a saved publish time.",
  },
  {
    step: "08",
    title: "Publish now or manually",
    group: "Publishing",
    time: "4 minutes",
    keywords: ["publish", "autopublish now", "manual", "copy", "share", "download", "posted"],
    intro:
      "FromOne gives you options. You can autopublish where supported, or use manual posting if that is safer or easier.",
    before: [
      "Check the post first.",
      "Make sure the media and wording are ready.",
      "For Facebook and Instagram autopublish, make sure Meta is connected.",
    ],
    steps: [
      "Use Autopublish now for supported Facebook and Instagram posts.",
      "Use Post manually to copy the caption and open the platform.",
      "Copy the caption when posting manually.",
      "Share or download prepared media if needed.",
      "Mark as posted after manual posting.",
    ],
    tip:
      "Manual posting is not a failure. It is a useful fallback when a platform or connection needs attention.",
    outcome: "The post is published or ready to publish manually.",
  },
  {
    step: "09",
    title: "Connect Facebook and Instagram",
    group: "Connections",
    time: "5 minutes",
    keywords: ["facebook", "instagram", "meta", "connect", "reconnect", "token", "page"],
    intro:
      "Facebook and Instagram can be used in two ways. Personal accounts can still use FromOne to create, edit and prepare posts for manual posting. Direct publishing and automatic scheduling through Meta need connected business/professional accounts.",
    before: [
      "For direct Facebook publishing, make sure you have access to the Facebook Page.",
      "For direct Instagram publishing, use an Instagram professional account linked through Meta.",
      "If you only use a personal account, you can still copy the caption and post manually.",
    ],
    steps: [
      "Open Settings.",
      "Choose the Meta or Facebook and Instagram connection option.",
      "Follow the Meta authorisation window.",
      "Select the correct Facebook Page if asked.",
      "Return to FromOne and check the connection status.",
      "If you use a personal account, use manual posting instead.",
      "If FromOne says needs attention, reconnect Meta.",
    ],
    tip:
      "Meta connections can expire. If that happens, reconnecting is normal. Manual posting still works while a connection needs attention.",
    outcome: "You know when FromOne can direct publish and when manual posting is the better option.",
  },
  {
    step: "10",
    title: "Fix publish errors",
    group: "Troubleshooting",
    time: "3 minutes",
    keywords: ["error", "failed", "needs attention", "manual fallback", "account not connected"],
    intro:
      "If a post cannot autopublish, FromOne should explain what needs attention. The post is not lost.",
    before: [
      "Open the post that failed.",
      "Read the message in the Publish card.",
      "Do not delete the post unless you are sure you no longer need it.",
    ],
    steps: [
      "If it says account not connected, reconnect Facebook and Instagram in Settings.",
      "If Instagram needs media, add or prepare a supported image or video.",
      "If the post is already failed, create or reset a clean post before testing again.",
      "Use manual posting if you need to publish immediately.",
    ],
    tip:
      "A connection error is usually fixable. The manual fallback lets you keep working while you sort it.",
    outcome: "You know what to do when publishing needs attention.",
  },
  {
    step: "11",
    title: "Subscription and account",
    group: "Account",
    time: "2 minutes",
    keywords: ["subscription", "demo", "settings", "support", "sign out", "billing"],
    intro:
      "This lesson shows where to check account details, subscription access and support options.",
    before: [
      "Open FromOne while signed in.",
      "Use the sidebar to move around.",
      "Check the Subscription page if access looks different from expected.",
    ],
    steps: [
      "Open Subscription to check plan or demo access.",
      "Use Settings to update business or connection details.",
      "Use Support or Bug Report if something needs reporting.",
      "Sign out when finished if you are on a shared device.",
    ],
    tip:
      "If something looks wrong with access, check the Subscription page first.",
    outcome: "You know where to manage the account and get help.",
  },
  {
    step: "12",
    title: "Best weekly routine",
    group: "Workflow",
    time: "3 minutes",
    keywords: ["weekly", "routine", "process", "business", "posts"],
    intro:
      "This is the simple weekly routine for getting the most from FromOne without overcomplicating social media.",
    before: [
      "Set aside a small amount of time each week.",
      "Gather photos, videos or flyers from the business.",
      "Review posts before they go live.",
    ],
    steps: [
      "Check the business profile is still accurate.",
      "Create or review the week’s post set.",
      "Prepare images where needed.",
      "Edit wording if needed.",
      "Schedule posts or publish now.",
      "Use manual fallback whenever needed.",
    ],
    tip:
      "The aim is consistency, not perfection. A simple weekly rhythm is better than doing nothing for weeks.",
    outcome: "You have a repeatable weekly posting system.",
  },
  {
    step: "13",
    title: "Use Reports and performance",
    group: "Reports",
    time: "4 minutes",
    keywords: [
      "reports",
      "performance",
      "metrics",
      "likes",
      "comments",
      "reach",
      "impressions",
      "engagement",
      "best performer",
      "sync metrics",
      "facebook",
      "instagram",
      "create post from best performer",
    ],
    intro:
      "Reports shows how published Facebook and Instagram posts are performing, then helps you create a follow-up post from the strongest performer.",
    before: [
      "Publish at least one Facebook or Instagram post through FromOne.",
      "Make sure the post has a saved Meta post ID.",
      "Give Meta time to return activity. Brand new posts may show zero at first.",
    ],
    steps: [
      "Open Reports from the sidebar.",
      "Check the Social engagement section for likes, comments, shares, reach, impressions and engagement.",
      "Use Sync metrics if you want FromOne to check Meta for the latest activity now.",
      "Use the All, Facebook and Instagram filters to view individual post performance by platform.",
      "Open the Best performer follow-up section.",
      "Click Create post from best performer when you want FromOne to create a new draft based on the strongest tracked post.",
      "Open the new draft from Posts and review it before publishing.",
    ],
    tip:
      "If a post says Meta post found but shows zero engagement, that usually means FromOne has saved the Meta ID but Meta has not returned live activity yet.",
    outcome:
      "You can see which posts are working and turn the best performer into a new draft post.",
  }
];

export default function FromOneAcademyPage() {
  const [selectedStep, setSelectedStep] = useState("01");

  const selectedLesson =
    academyLessons.find((lesson) => lesson.step === selectedStep) ||
    academyLessons[0];

  const chooseLesson = (step: string) => {
    setSelectedStep(step);

    window.setTimeout(() => {
      document
        .getElementById("academy-selected-lesson")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  return (
    <main className="academy-page">
      <section className="premium-card academy-shell">
        <header className="academy-hero">
          <div className="page-eyebrow">FromOne Academy</div>
          <h1 className="page-title">Learn FromOne faster.</h1>
          <p className="page-description">
            Clear, practical tutorials for setting up your account, creating better posts,
            reviewing content and publishing with confidence.
          </p>
        </header>

        <section className="academy-tutorials" aria-label="FromOne Academy tutorials">
          <div className="academy-tutorials-head">
            <div>
              <div className="page-eyebrow">Tutorials</div>
              <h2>Pick a lesson.</h2>
            </div>
            <p>Scroll across the cards. Each card opens its full tutorial underneath.</p>
          </div>

          <div className="academy-card-scroll">
            {academyLessons.map((lesson) => (
              <button
                key={lesson.step}
                type="button"
                className={
                  lesson.step === selectedLesson.step
                    ? "academy-subject-card is-active"
                    : "academy-subject-card"
                }
                onClick={() => chooseLesson(lesson.step)}
              >
                <span>{lesson.step}</span>
                <strong>{lesson.title}</strong>
                <small>{lesson.group} · {lesson.time}</small>
              </button>
            ))}
          </div>
        </section>

        <article
          id="academy-selected-lesson"
          className="academy-lesson-card"
          aria-label="Selected Academy tutorial"
        >
          <div className="academy-lesson-head">
            <div className="academy-lesson-meta">
              <span>Step {selectedLesson.step}</span>
              <span>{selectedLesson.group}</span>
              <span>{selectedLesson.time}</span>
            </div>

            <h2>{selectedLesson.title}</h2>
            <p>{selectedLesson.intro}</p>
          </div>

          <div className="academy-lesson-body">
            <section className="academy-before-card">
              <div className="page-eyebrow">Before you start</div>
              <ul>
                {selectedLesson.before.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="academy-steps-card">
              <div className="page-eyebrow">Do this</div>
              <div className="academy-step-list">
                {selectedLesson.steps.map((item, index) => (
                  <div key={item} className="academy-step-row">
                    <span>{index + 1}</span>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="academy-note-grid">
              <div className="academy-note-card is-tip">
                <strong>Tip</strong>
                <p>{selectedLesson.tip}</p>
              </div>

              <div className="academy-note-card is-goal">
                <strong>Goal</strong>
                <p>{selectedLesson.outcome}</p>
              </div>
            </section>
          </div>
        </article>
      </section>

      <style jsx global>{`
        /* Removed media prep lesson */

        /* Reports tutorial addition */
        .academy-subject-card strong,
        .academy-tutorial-card strong {
          text-wrap: balance;
        }

        .academy-card-scroll {
          padding-bottom: 14px !important;
        }

        .academy-subject-card small,
        .academy-tutorial-card small {
          text-transform: none !important;
        }


        .academy-page {
          width: min(100%, 1040px);
          max-width: 1040px;
          margin: 0 auto 56px;
          padding: 0 0 48px;
        }

        .academy-shell {
          width: 100%;
          padding: clamp(24px, 3.4vw, 38px) !important;
          border-radius: 34px !important;
          border: 1px solid rgba(255, 212, 59, 0.18) !important;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.12), transparent 34%),
            rgba(15, 23, 42, 0.84) !important;
          box-shadow: 0 24px 72px rgba(0, 0, 0, 0.28) !important;
        }

        .academy-hero {
          max-width: 760px;
          margin: 0 auto 28px;
          padding-bottom: 26px;
          text-align: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .academy-hero .page-eyebrow {
          width: fit-content;
          margin: 0 auto 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          padding: 0 12px;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.1);
          border: 1px solid rgba(255, 212, 59, 0.18);
          color: #ffe58a;
          font-size: 0.72rem;
          font-weight: 1000;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .academy-hero h1 {
          margin: 0 0 12px;
          color: #ffffff;
          font-size: clamp(2.45rem, 5vw, 4.4rem);
          line-height: 0.92;
          letter-spacing: -0.06em;
        }

        .academy-hero p {
          max-width: 680px;
          margin: 0 auto;
          color: rgba(248, 250, 252, 0.72);
          font-size: 1rem;
          line-height: 1.58;
          font-weight: 760;
        }

        .academy-tutorials {
          margin-bottom: 26px;
          padding: clamp(18px, 2.4vw, 24px);
          border-radius: 28px;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.07), transparent 34%),
            rgba(2, 6, 23, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .academy-tutorials-head {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(220px, 360px);
          gap: 18px;
          align-items: end;
          margin-bottom: 16px;
        }

        .academy-tutorials-head h2 {
          margin: 8px 0 0;
          color: #ffffff;
          font-size: clamp(1.65rem, 3vw, 2.5rem);
          line-height: 0.96;
          letter-spacing: -0.055em;
        }

        .academy-tutorials-head p {
          margin: 0;
          color: rgba(248, 250, 252, 0.64);
          line-height: 1.5;
          font-weight: 760;
        }

        .academy-card-scroll {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: minmax(220px, 250px);
          gap: 12px;
          overflow-x: auto;
          overscroll-behavior-inline: contain;
          scroll-snap-type: inline mandatory;
          padding: 4px 4px 12px;
          scrollbar-width: thin;
        }

        .academy-subject-card {
          scroll-snap-align: start;
          min-height: 142px;
          display: grid;
          align-content: space-between;
          gap: 12px;
          padding: 18px;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.07), transparent 42%),
            rgba(15, 23, 42, 0.68);
          color: rgba(248, 250, 252, 0.78);
          text-align: left;
          cursor: pointer;
          font-family: inherit;
          box-shadow: 0 16px 42px rgba(0, 0, 0, 0.16);
          transition:
            transform 160ms ease,
            border-color 160ms ease,
            background 160ms ease;
        }

        .academy-subject-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 212, 59, 0.22);
        }

        .academy-subject-card.is-active {
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.22), transparent 42%),
            rgba(255, 212, 59, 0.1);
          border-color: rgba(255, 212, 59, 0.34);
          color: #ffffff;
        }

        .academy-subject-card span {
          width: 38px;
          height: 38px;
          display: inline-grid;
          place-items: center;
          border-radius: 15px;
          background: rgba(255, 212, 59, 0.12);
          border: 1px solid rgba(255, 212, 59, 0.18);
          color: #ffd43b;
          font-weight: 1000;
          font-size: 0.78rem;
        }

        .academy-subject-card.is-active span {
          background: #ffd43b;
          color: #101420;
        }

        .academy-subject-card strong {
          color: #ffffff;
          font-size: 1.08rem;
          line-height: 1.1;
          letter-spacing: -0.04em;
        }

        .academy-subject-card small {
          color: rgba(248, 250, 252, 0.58);
          font-weight: 850;
          line-height: 1.35;
        }

        .academy-lesson-card {
          width: min(100%, 900px);
          margin: 0 auto;
          overflow: hidden;
          border-radius: 30px;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.07), transparent 38%),
            rgba(15, 23, 42, 0.74);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 24px 72px rgba(0, 0, 0, 0.24);
        }

        .academy-lesson-head {
          padding: clamp(24px, 3.2vw, 34px);
          text-align: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.1), transparent 34%),
            rgba(2, 6, 23, 0.2);
        }

        .academy-lesson-meta {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px;
          margin-bottom: 18px;
        }

        .academy-lesson-meta span {
          min-height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 11px;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.1);
          border: 1px solid rgba(255, 212, 59, 0.18);
          color: #ffe58a;
          font-size: 0.72rem;
          font-weight: 1000;
          letter-spacing: 0.07em;
          text-transform: uppercase;
        }

        .academy-lesson-head h2 {
          max-width: 720px;
          margin: 0 auto 12px;
          color: #ffffff;
          font-size: clamp(1.9rem, 3.2vw, 2.9rem);
          line-height: 0.96;
          letter-spacing: -0.055em;
        }

        .academy-lesson-head p {
          max-width: 680px;
          margin: 0 auto;
          color: rgba(248, 250, 252, 0.72);
          line-height: 1.58;
          font-weight: 760;
        }

        .academy-lesson-body {
          display: grid;
          gap: 18px;
          padding: clamp(22px, 3vw, 32px);
        }

        .academy-before-card,
        .academy-steps-card {
          width: min(100%, 720px);
          margin-inline: auto;
          padding: 18px;
          border-radius: 22px;
          background: rgba(2, 6, 23, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .academy-before-card ul {
          margin: 12px 0 0;
          padding-left: 20px;
          color: rgba(248, 250, 252, 0.78);
          line-height: 1.55;
          font-weight: 760;
        }

        .academy-before-card li + li {
          margin-top: 6px;
        }

        .academy-step-list {
          display: grid;
          gap: 10px;
          margin-top: 12px;
        }

        .academy-step-row {
          display: grid;
          grid-template-columns: 38px minmax(0, 1fr);
          gap: 13px;
          align-items: start;
          padding: 14px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.055);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .academy-step-row span {
          width: 32px;
          height: 32px;
          display: inline-grid;
          place-items: center;
          border-radius: 999px;
          background: rgba(61, 220, 151, 0.13);
          border: 1px solid rgba(61, 220, 151, 0.18);
          color: #a7f3d0;
          font-size: 0.8rem;
          font-weight: 1000;
        }

        .academy-step-row p {
          margin: 0;
          color: rgba(248, 250, 252, 0.84);
          line-height: 1.5;
          font-weight: 760;
        }

        .academy-note-grid {
          width: min(100%, 720px);
          margin-inline: auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .academy-note-card {
          padding: 17px;
          border-radius: 20px;
          line-height: 1.55;
        }

        .academy-note-card strong {
          display: block;
          margin-bottom: 7px;
          font-size: 0.76rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-weight: 1000;
        }

        .academy-note-card p {
          margin: 0;
          color: rgba(248, 250, 252, 0.82);
          line-height: 1.55;
          font-weight: 760;
        }

        .academy-note-card.is-tip {
          background: rgba(61, 220, 151, 0.08);
          border: 1px solid rgba(61, 220, 151, 0.14);
        }

        .academy-note-card.is-tip strong {
          color: #a7f3d0;
        }

        .academy-note-card.is-goal {
          background: rgba(255, 212, 59, 0.095);
          border: 1px solid rgba(255, 212, 59, 0.16);
        }

        .academy-note-card.is-goal strong {
          color: #ffd43b;
        }

        @media (max-width: 1100px) {
          .academy-page {
            width: min(100%, calc(100vw - 24px));
          }
        }

        @media (max-width: 760px) {
          .academy-page {
            width: min(100%, calc(100vw - 22px));
          }

          .academy-shell {
            padding: 20px 16px 22px !important;
            border-radius: 28px !important;
          }

          .academy-hero {
            margin-bottom: 24px;
            padding-bottom: 22px;
          }

          .academy-hero h1 {
            font-size: clamp(2.2rem, 11vw, 3.4rem);
          }

          .academy-tutorials {
            padding: 16px;
            border-radius: 24px;
          }

          .academy-tutorials-head {
            grid-template-columns: 1fr;
          }

          .academy-card-scroll {
            grid-auto-columns: minmax(205px, 82vw);
          }

          .academy-lesson-card {
            border-radius: 24px;
          }

          .academy-note-grid {
            grid-template-columns: 1fr;
          }

          .academy-step-row {
            grid-template-columns: 1fr;
            justify-items: center;
            text-align: center;
          }

        }
      `}</style>
    </main>
  );
}
