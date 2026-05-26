"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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
      "Add photos, videos or flyers if you have them.",
      "Choose the option to create posts.",
      "Wait while FromOne creates the post set.",
      "Open the posts when they are ready.",
      "Review them before publishing anything.",
    ],
    tip:
      "Real photos, videos and flyers usually make the posts more specific and less generic.",
    outcome: "You now have posts ready to check and improve.",
  },
  {
    step: "04",
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
    step: "05",
    title: "Prepare images and media",
    group: "Media prep",
    time: "5 minutes",
    keywords: ["image", "media", "crop", "resize", "rotate", "flip", "instagram", "facebook", "tiktok"],
    intro:
      "Media prep helps your images look better on each platform. You can crop, resize and create a prepared image before publishing.",
    before: [
      "Open a post that has an image.",
      "Use a clear image where possible.",
      "Remember that PDF flyers may need manual posting or conversion for some platforms.",
    ],
    steps: [
      "Open the post review page.",
      "Click Prepare media.",
      "Choose the size or platform format you need.",
      "Position the image so the important part is visible.",
      "Rotate or flip the image if needed.",
      "Create the prepared image.",
      "Download or share the prepared image if you are posting manually.",
    ],
    tip:
      "For Instagram, use a supported image or video. PDF flyers are not direct Instagram posts.",
    outcome: "Your image is prepared and ready to use.",
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
      "Facebook and Instagram need to be connected before FromOne can attempt autopublishing.",
    before: [
      "Make sure you have access to the Facebook Page.",
      "For Instagram, use a professional account linked to the Facebook Page.",
      "Have your Meta login ready.",
    ],
    steps: [
      "Open Settings.",
      "Choose the Meta or Facebook and Instagram connection option.",
      "Follow the Meta authorisation window.",
      "Select the correct Facebook Page if asked.",
      "Return to FromOne and check the connection status.",
      "If FromOne says needs attention, reconnect Meta.",
    ],
    tip:
      "Meta connections can expire. If that happens, reconnecting is normal.",
    outcome: "FromOne can try Facebook and Instagram autopublishing when the connection is ready.",
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
];

const groups = ["All", "Start here", "Create posts", "Review", "Media prep", "Publishing", "Connections", "Troubleshooting", "Account", "Workflow"];

export default function FromOneAcademyPage() {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const [selectedStep, setSelectedStep] = useState("01");

  const filteredLessons = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return academyLessons.filter((lesson) => {
      const matchesGroup = group === "All" || lesson.group === group;
      const searchable = [
        lesson.step,
        lesson.title,
        lesson.group,
        lesson.intro,
        lesson.outcome,
        lesson.tip,
        ...lesson.keywords,
        ...lesson.before,
        ...lesson.steps,
      ]
        .join(" ")
        .toLowerCase();

      return matchesGroup && (!cleanQuery || searchable.includes(cleanQuery));
    });
  }, [group, query]);

  const selectedLesson =
    filteredLessons.find((lesson) => lesson.step === selectedStep) ||
    filteredLessons[0] ||
    academyLessons[0];

  const selectedIndex = academyLessons.findIndex((lesson) => lesson.step === selectedLesson.step);
  const previousLesson = selectedIndex > 0 ? academyLessons[selectedIndex - 1] : null;
  const nextLesson =
    selectedIndex >= 0 && selectedIndex < academyLessons.length - 1
      ? academyLessons[selectedIndex + 1]
      : null;

  const chooseLesson = (step: string) => {
    setSelectedStep(step);

    window.setTimeout(() => {
      document
        .getElementById("academy-selected-lesson")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <main
      className="fromone-academy-page"
      style={{
        width: "min(1120px, calc(100vw - 28px))",
        minHeight: "calc(100vh - 120px)",
        margin: "0 auto 56px",
        padding: "0 0 42px",
      }}
    >
      <style jsx global>{`
        .academy-shell-card {
          width: 100%;
          padding: clamp(22px, 3.5vw, 38px);
          border-radius: 36px;
          border: 1px solid rgba(255, 212, 59, 0.28);
          background:
            radial-gradient(circle at top, rgba(255, 212, 59, 0.16), transparent 34%),
            linear-gradient(145deg, rgba(255,255,255,0.085), rgba(255,255,255,0.032));
          box-shadow: 0 30px 96px rgba(0, 0, 0, 0.34);
        }

        .academy-hero {
          text-align: center;
          max-width: 780px;
          margin: 0 auto 22px;
        }

        .academy-hero h1 {
          margin: 8px 0 12px;
          font-size: clamp(2.25rem, 5.4vw, 4.8rem);
          line-height: 0.92;
          letter-spacing: -0.06em;
          color: #ffffff;
        }

        .academy-hero p {
          margin: 0 auto;
          max-width: 700px;
          color: var(--muted);
          line-height: 1.7;
        }

        .academy-help-row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .academy-help-card {
          padding: 14px 15px;
          border-radius: 20px;
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.08);
          text-align: center;
        }

        .academy-help-card strong {
          display: block;
          color: #ffffff;
          margin-bottom: 5px;
        }

        .academy-help-card span {
          color: var(--muted);
          font-size: 0.9rem;
          line-height: 1.45;
        }

        .academy-search-card {
          display: grid;
          gap: 12px;
          margin-bottom: 18px;
          padding: 14px;
          border-radius: 24px;
          background: rgba(15, 23, 42, 0.56);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .academy-search-input {
          width: 100%;
          min-height: 48px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(2, 6, 23, 0.44);
          color: #ffffff;
          padding: 0 18px;
          font-weight: 850;
          outline: none;
        }

        .academy-search-input::placeholder {
          color: rgba(248,250,252,0.48);
        }

        .academy-filter-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
        }

        .academy-filter-button {
          min-height: 38px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.82);
          padding: 0 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .academy-filter-button.is-active {
          background: #ffd43b;
          color: #101420;
          border-color: rgba(255,212,59,0.42);
        }

        .academy-layout {
          display: grid;
          grid-template-columns: minmax(250px, 310px) minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }

        .academy-sidebar-card,
        .academy-lesson-card {
          border-radius: 28px;
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.09);
          box-shadow: 0 18px 55px rgba(0,0,0,0.16);
        }

        .academy-sidebar-card {
          position: sticky;
          top: 18px;
          padding: 14px;
        }

        .academy-sidebar-card h2 {
          margin: 4px 4px 12px;
          color: #ffffff;
          font-size: 1.08rem;
        }

        .academy-lesson-list {
          display: grid;
          gap: 8px;
        }

        .academy-lesson-button {
          display: grid;
          grid-template-columns: 40px minmax(0, 1fr);
          gap: 10px;
          align-items: center;
          width: 100%;
          padding: 10px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(2, 6, 23, 0.24);
          color: rgba(248,250,252,0.78);
          text-align: left;
          font-weight: 850;
          cursor: pointer;
        }

        .academy-lesson-button.is-active {
          background: rgba(255, 212, 59, 0.14);
          border-color: rgba(255, 212, 59, 0.26);
          color: #ffffff;
        }

        .academy-lesson-button span {
          display: inline-flex;
          width: 36px;
          height: 36px;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: rgba(255, 212, 59, 0.12);
          color: #ffd43b;
          font-weight: 1000;
        }

        .academy-lesson-button.is-active span {
          background: #ffd43b;
          color: #101420;
        }

        .academy-lesson-button small {
          display: block;
          margin-top: 3px;
          color: rgba(248,250,252,0.52);
          font-weight: 800;
        }

        .academy-empty-message {
          padding: 16px;
          border-radius: 18px;
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.08);
          color: var(--muted);
          line-height: 1.5;
        }

        .academy-lesson-card {
          overflow: hidden;
          scroll-margin-top: 12px;
        }

        .academy-lesson-head {
          display: grid;
          grid-template-columns: 64px minmax(0, 1fr) auto;
          gap: 14px;
          align-items: center;
          padding: clamp(18px, 3vw, 26px);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          background: rgba(2, 6, 23, 0.18);
        }

        .academy-step-badge {
          display: inline-flex;
          width: 56px;
          height: 56px;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          background: #ffd43b;
          color: #101420;
          font-weight: 1000;
          box-shadow: 0 16px 36px rgba(255, 212, 59, 0.18);
        }

        .academy-group-pill {
          display: inline-flex;
          width: fit-content;
          margin-bottom: 8px;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.1);
          border: 1px solid rgba(255, 212, 59, 0.2);
          color: #ffe58a;
          font-size: 0.75rem;
          font-weight: 950;
        }

        .academy-lesson-head h2 {
          margin: 0;
          color: #ffffff;
          font-size: clamp(1.32rem, 2.1vw, 1.95rem);
          line-height: 1.15;
        }

        .academy-time {
          color: var(--muted);
          font-weight: 900;
          white-space: nowrap;
        }

        .academy-lesson-body {
          display: grid;
          gap: 18px;
          padding: clamp(18px, 3vw, 26px);
        }

        .academy-intro {
          margin: 0;
          color: rgba(248,250,252,0.76);
          line-height: 1.7;
          font-size: 1.02rem;
        }

        .academy-two-col {
          display: grid;
          grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
          gap: 14px;
        }

        .academy-inner-card {
          padding: 16px;
          border-radius: 22px;
          background: rgba(2, 6, 23, 0.32);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .academy-inner-card h3 {
          margin: 0 0 12px;
          color: #ffffff;
          font-size: 1.05rem;
        }

        .academy-check-list {
          display: grid;
          gap: 10px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .academy-check-list li {
          display: grid;
          grid-template-columns: 28px minmax(0, 1fr);
          gap: 10px;
          align-items: start;
          color: rgba(248,250,252,0.82);
          line-height: 1.5;
          font-weight: 760;
        }

        .academy-check-list span {
          display: inline-flex;
          width: 24px;
          height: 24px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(61, 220, 151, 0.12);
          color: #a7f3d0;
          font-size: 0.78rem;
          font-weight: 1000;
        }

        .academy-check-list.before span {
          background: rgba(255, 212, 59, 0.12);
          color: #ffd43b;
        }

        .academy-bottom-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .academy-tip,
        .academy-outcome {
          padding: 16px;
          border-radius: 22px;
          line-height: 1.58;
          font-weight: 800;
        }

        .academy-tip {
          background: rgba(61, 220, 151, 0.08);
          border: 1px solid rgba(61, 220, 151, 0.14);
          color: rgba(236, 253, 245, 0.88);
        }

        .academy-outcome {
          background: rgba(255, 212, 59, 0.095);
          border: 1px solid rgba(255, 212, 59, 0.16);
          color: rgba(255,255,255,0.88);
        }

        .academy-tip span,
        .academy-outcome span {
          display: block;
          margin-bottom: 6px;
          font-size: 0.76rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-weight: 1000;
        }

        .academy-tip span {
          color: #a7f3d0;
        }

        .academy-outcome span {
          color: #ffd43b;
        }

        .academy-nav-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .academy-nav-button {
          min-height: 44px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 999px;
          background: rgba(255,255,255,0.075);
          color: #ffffff;
          padding: 0 15px;
          font-weight: 950;
          cursor: pointer;
        }

        .academy-nav-button.primary {
          background: #ffd43b;
          color: #101420;
          border-color: rgba(255,212,59,0.44);
        }

        .academy-nav-button:disabled {
          opacity: 0.42;
          cursor: not-allowed;
        }

        @media (max-width: 900px) {
          .fromone-academy-page {
            width: min(100% - 24px, 720px) !important;
          }

          .academy-help-row,
          .academy-layout,
          .academy-two-col,
          .academy-bottom-row {
            grid-template-columns: 1fr !important;
          }

          .academy-sidebar-card {
            position: static;
          }

          .academy-lesson-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .fromone-academy-page {
            width: min(100% - 24px, 520px) !important;
            margin-bottom: 42px !important;
          }

          .academy-shell-card {
            padding: 22px 24px 26px !important;
            border-radius: 30px !important;
          }

          .academy-hero {
            margin-bottom: 16px !important;
          }

          .academy-hero .page-eyebrow {
            font-size: 0.72rem !important;
            letter-spacing: 0.13em !important;
          }

          .academy-hero h1 {
            font-size: clamp(2.1rem, 11vw, 3.1rem) !important;
            line-height: 0.92 !important;
            margin: 7px 0 10px !important;
          }

          .academy-hero p {
            font-size: 0.98rem !important;
            line-height: 1.55 !important;
          }

          .academy-help-row {
            gap: 10px !important;
          }

          .academy-search-card,
          .academy-sidebar-card,
          .academy-lesson-card {
            border-radius: 22px !important;
          }

          .academy-search-input {
            text-align: center;
          }

          .academy-filter-row {
            justify-content: center;
          }

          .academy-lesson-list {
            grid-template-columns: 1fr;
          }

          .academy-lesson-button {
            grid-template-columns: 1fr;
            justify-items: center;
            text-align: center;
          }

          .academy-lesson-head {
            grid-template-columns: 1fr;
            justify-items: center;
            text-align: center;
          }

          .academy-group-pill {
            margin-left: auto;
            margin-right: auto;
          }

          .academy-lesson-body,
          .academy-inner-card,
          .academy-tip,
          .academy-outcome {
            text-align: center;
          }

          .academy-check-list li {
            grid-template-columns: 1fr;
            justify-items: center;
            text-align: center;
          }

          .academy-nav-row {
            display: grid;
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <section className="premium-card academy-shell-card">
        <div className="academy-hero">
          <div className="page-eyebrow">FromOne Academy</div>
          <h1 className="page-title">
            One lesson.
            <br />
            One clear step.
          </h1>
          <p className="page-description">
            Learn FromOne slowly and simply. Choose a lesson, follow the steps, then move to
            the next one when you are ready.
          </p>
        </div>

        <div className="academy-help-row">
          <div className="academy-help-card">
            <strong>Start at step 1</strong>
            <span>Best if you are new to FromOne.</span>
          </div>
          <div className="academy-help-card">
            <strong>Search anytime</strong>
            <span>Find help for media, schedule, Facebook or password.</span>
          </div>
          <div className="academy-help-card">
            <strong>Stay in control</strong>
            <span>Nothing publishes until the post is ready.</span>
          </div>
        </div>

        <div className="academy-search-card">
          <input
            className="academy-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the Academy, for example: schedule, media, Facebook, reset password..."
          />

          <div className="academy-filter-row">
            {groups.map((item) => (
              <button
                key={item}
                type="button"
                className={
                  group === item
                    ? "academy-filter-button is-active"
                    : "academy-filter-button"
                }
                onClick={() => {
                  setGroup(item);
                  const firstMatch = academyLessons.find(
                    (lesson) => item === "All" || lesson.group === item
                  );
                  if (firstMatch) setSelectedStep(firstMatch.step);
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="academy-layout">
          <aside className="academy-sidebar-card">
            <h2>Choose a lesson</h2>

            {filteredLessons.length === 0 ? (
              <div className="academy-empty-message">
                No lessons matched your search. Try another word.
              </div>
            ) : (
              <div className="academy-lesson-list">
                {filteredLessons.map((lesson) => (
                  <button
                    key={lesson.step}
                    type="button"
                    className={
                      lesson.step === selectedLesson.step
                        ? "academy-lesson-button is-active"
                        : "academy-lesson-button"
                    }
                    onClick={() => chooseLesson(lesson.step)}
                  >
                    <span>{lesson.step}</span>
                    <strong>
                      {lesson.title}
                      <small>{lesson.group}</small>
                    </strong>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <article
            id="academy-selected-lesson"
            className="academy-lesson-card"
            aria-label="Selected Academy lesson"
          >
            <div className="academy-lesson-head">
              <span className="academy-step-badge">{selectedLesson.step}</span>

              <div>
                <span className="academy-group-pill">{selectedLesson.group}</span>
                <h2>{selectedLesson.title}</h2>
              </div>

              <span className="academy-time">{selectedLesson.time}</span>
            </div>

            <div className="academy-lesson-body">
              <p className="academy-intro">{selectedLesson.intro}</p>

              <div className="academy-two-col">
                <div className="academy-inner-card">
                  <h3>Before you start</h3>
                  <ul className="academy-check-list before">
                    {selectedLesson.before.map((item, index) => (
                      <li key={item}>
                        <span>{index + 1}</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="academy-inner-card">
                  <h3>Step by step</h3>
                  <ul className="academy-check-list">
                    {selectedLesson.steps.map((item, index) => (
                      <li key={item}>
                        <span>{index + 1}</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="academy-bottom-row">
                <div className="academy-tip">
                  <span>Helpful tip</span>
                  {selectedLesson.tip}
                </div>

                <div className="academy-outcome">
                  <span>Outcome</span>
                  {selectedLesson.outcome}
                </div>
              </div>

              <div className="academy-nav-row">
                <button
                  type="button"
                  className="academy-nav-button"
                  disabled={!previousLesson}
                  onClick={() => previousLesson && chooseLesson(previousLesson.step)}
                >
                  ← Previous lesson
                </button>

                <button
                  type="button"
                  className="academy-nav-button primary"
                  disabled={!nextLesson}
                  onClick={() => nextLesson && chooseLesson(nextLesson.step)}
                >
                  Next lesson →
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
