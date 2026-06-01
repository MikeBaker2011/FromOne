"use client";

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
    step: "03A",
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
];

const quickFlow = [
  {
    step: "1",
    title: "Add media",
    text: "Upload a photo, video or flyer from the Dashboard.",
  },
  {
    step: "2",
    title: "Check post",
    text: "Open the post, check the media and read the wording.",
  },
  {
    step: "3",
    title: "Send or schedule",
    text: "Approve the post, then publish, schedule or post manually.",
  },
];

const simpleGroups = ["Start here", "Create posts", "Review", "Publishing"];

const popularHelp = [
  "Create your first posts",
  "Create posts on mobile",
  "Review a post",
  "Schedule a post",
  "Publish now or manually",
  "Connect Facebook and Instagram",
];

export default function FromOneAcademyPage() {
  const [query, setQuery] = useState("");
  const [selectedStep, setSelectedStep] = useState("03");

  const simplifiedLessons = useMemo(() => {
    const importantTitles = new Set([
      "Create your account",
      "Set up your business profile",
      "Create your first posts",
      "Create posts on mobile",
      "Review a post",
      "Edit captions and wording",
      "Schedule a post",
      "Publish now or manually",
      "Connect Facebook and Instagram",
      "Fix publish errors",
    ]);

    return academyLessons.filter((lesson) => importantTitles.has(lesson.title));
  }, []);

  const filteredLessons = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) return simplifiedLessons;

    return academyLessons.filter((lesson) => {
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

      return searchable.includes(cleanQuery);
    });
  }, [query, simplifiedLessons]);

  const selectedLesson =
    filteredLessons.find((lesson) => lesson.step === selectedStep) ||
    academyLessons.find((lesson) => lesson.step === selectedStep) ||
    filteredLessons[0] ||
    academyLessons[2];

  const chooseLesson = (step: string) => {
    setSelectedStep(step);

    window.setTimeout(() => {
      document
        .getElementById("academy-selected-lesson")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const choosePopularLesson = (title: string) => {
    const match = academyLessons.find((lesson) => lesson.title === title);
    if (match) chooseLesson(match.step);
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
        .academy-clean-shell {
          width: 100%;
          padding: clamp(22px, 3.5vw, 38px);
          border-radius: 36px;
          border: 1px solid rgba(255, 212, 59, 0.22);
          background:
            radial-gradient(circle at top, rgba(255, 212, 59, 0.14), transparent 34%),
            linear-gradient(145deg, rgba(255,255,255,0.078), rgba(255,255,255,0.03));
          box-shadow: 0 30px 96px rgba(0, 0, 0, 0.34);
        }

        .academy-clean-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 22px;
          align-items: end;
          margin-bottom: 22px;
        }

        .academy-clean-hero h1 {
          margin: 8px 0 12px;
          font-size: clamp(2.35rem, 5.3vw, 4.7rem);
          line-height: 0.92;
          letter-spacing: -0.065em;
          color: #ffffff;
        }

        .academy-clean-hero p {
          margin: 0;
          max-width: 700px;
          color: rgba(248, 250, 252, 0.7);
          line-height: 1.6;
          font-weight: 760;
        }

        .academy-clean-search {
          width: min(320px, 100%);
          display: grid;
          gap: 8px;
        }

        .academy-clean-search label {
          color: #ffd43b;
          font-size: 0.76rem;
          font-weight: 1000;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .academy-clean-search input {
          width: 100%;
          min-height: 48px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(2, 6, 23, 0.44);
          color: #ffffff;
          padding: 0 17px;
          font-weight: 850;
          outline: none;
        }

        .academy-clean-search input::placeholder {
          color: rgba(248,250,252,0.48);
        }

        .academy-flow-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .academy-flow-card {
          min-height: 132px;
          display: grid;
          align-content: start;
          gap: 9px;
          padding: 18px;
          border-radius: 24px;
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.08), transparent 38%),
            rgba(15, 23, 42, 0.66);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 18px 44px rgba(0, 0, 0, 0.16);
        }

        .academy-flow-card span {
          width: 34px;
          height: 34px;
          display: inline-grid;
          place-items: center;
          border-radius: 13px;
          background: rgba(255, 212, 59, 0.12);
          color: #ffd43b;
          font-size: 0.78rem;
          font-weight: 1000;
        }

        .academy-flow-card strong {
          color: #ffffff;
          font-size: 1.08rem;
          line-height: 1.08;
        }

        .academy-flow-card p {
          margin: 0;
          color: rgba(248, 250, 252, 0.64);
          line-height: 1.42;
          font-size: 0.92rem;
          font-weight: 760;
        }

        .academy-main-layout {
          display: grid;
          grid-template-columns: minmax(260px, 0.85fr) minmax(0, 1.15fr);
          gap: 16px;
          align-items: start;
        }

        .academy-clean-panel {
          border-radius: 28px;
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.09);
          box-shadow: 0 18px 55px rgba(0,0,0,0.16);
          overflow: hidden;
        }

        .academy-clean-panel-head {
          padding: 18px 18px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          background: rgba(2, 6, 23, 0.16);
        }

        .academy-clean-panel-head h2 {
          margin: 7px 0 0;
          color: #ffffff;
          font-size: clamp(1.25rem, 2vw, 1.65rem);
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .academy-popular-list {
          display: grid;
          gap: 9px;
          padding: 14px;
        }

        .academy-popular-button {
          width: 100%;
          min-height: 52px;
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr);
          gap: 10px;
          align-items: center;
          padding: 10px 12px;
          border-radius: 17px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(2, 6, 23, 0.24);
          color: rgba(248,250,252,0.78);
          text-align: left;
          font-weight: 900;
          cursor: pointer;
        }

        .academy-popular-button.is-active {
          background: rgba(255, 212, 59, 0.14);
          border-color: rgba(255, 212, 59, 0.26);
          color: #ffffff;
        }

        .academy-popular-button span {
          width: 32px;
          height: 32px;
          display: inline-grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(255, 212, 59, 0.12);
          color: #ffd43b;
          font-weight: 1000;
        }

        .academy-popular-button.is-active span {
          background: #ffd43b;
          color: #101420;
        }

        .academy-search-results {
          display: grid;
          gap: 9px;
          padding: 0 14px 14px;
        }

        .academy-search-results-title {
          margin: 4px 2px 2px;
          color: rgba(248, 250, 252, 0.58);
          font-size: 0.78rem;
          font-weight: 1000;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .academy-lesson-clean-card {
          scroll-margin-top: 12px;
        }

        .academy-lesson-clean-head {
          padding: clamp(18px, 3vw, 26px);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          background:
            radial-gradient(circle at top right, rgba(255, 212, 59, 0.09), transparent 34%),
            rgba(2, 6, 23, 0.18);
        }

        .academy-lesson-clean-head-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .academy-step-chip {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          min-height: 36px;
          padding: 6px 11px;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.11);
          border: 1px solid rgba(255, 212, 59, 0.2);
          color: #ffe58a;
          font-size: 0.78rem;
          font-weight: 1000;
        }

        .academy-time-chip {
          color: rgba(248,250,252,0.6);
          font-weight: 900;
          font-size: 0.9rem;
        }

        .academy-lesson-clean-head h2 {
          margin: 0;
          color: #ffffff;
          font-size: clamp(1.85rem, 3.4vw, 2.8rem);
          line-height: 0.98;
          letter-spacing: -0.06em;
        }

        .academy-lesson-clean-head p {
          margin: 12px 0 0;
          color: rgba(248,250,252,0.72);
          line-height: 1.55;
          font-weight: 760;
        }

        .academy-lesson-clean-body {
          display: grid;
          gap: 14px;
          padding: clamp(18px, 3vw, 26px);
        }

        .academy-do-this {
          display: grid;
          gap: 10px;
        }

        .academy-do-step {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr);
          gap: 12px;
          align-items: start;
          padding: 13px;
          border-radius: 18px;
          background: rgba(2, 6, 23, 0.32);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .academy-do-step span {
          width: 30px;
          height: 30px;
          display: inline-grid;
          place-items: center;
          border-radius: 999px;
          background: rgba(61, 220, 151, 0.13);
          color: #a7f3d0;
          font-size: 0.8rem;
          font-weight: 1000;
        }

        .academy-do-step p {
          margin: 0;
          color: rgba(248,250,252,0.82);
          line-height: 1.46;
          font-weight: 760;
        }

        .academy-clean-note-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .academy-clean-note {
          padding: 15px;
          border-radius: 20px;
          line-height: 1.52;
          font-weight: 800;
        }

        .academy-clean-note.is-tip {
          background: rgba(61, 220, 151, 0.08);
          border: 1px solid rgba(61, 220, 151, 0.14);
          color: rgba(236, 253, 245, 0.88);
        }

        .academy-clean-note.is-outcome {
          background: rgba(255, 212, 59, 0.095);
          border: 1px solid rgba(255, 212, 59, 0.16);
          color: rgba(255,255,255,0.88);
        }

        .academy-clean-note strong {
          display: block;
          margin-bottom: 5px;
          color: #ffd43b;
          font-size: 0.76rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-weight: 1000;
        }

        .academy-clean-note.is-tip strong {
          color: #a7f3d0;
        }

        .academy-next-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .academy-action-link,
        .academy-action-button {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.075);
          color: #ffffff;
          font-weight: 950;
          text-decoration: none;
          cursor: pointer;
        }

        .academy-action-link.is-primary {
          background: #ffd43b;
          color: #101420;
          border-color: rgba(255,212,59,0.44);
        }

        .academy-mini-faq {
          margin-top: 16px;
          display: grid;
          gap: 9px;
        }

        .academy-mini-faq details {
          border-radius: 18px;
          background: rgba(2, 6, 23, 0.24);
          border: 1px solid rgba(255,255,255,0.08);
          overflow: hidden;
        }

        .academy-mini-faq summary {
          cursor: pointer;
          padding: 14px 15px;
          color: #ffffff;
          font-weight: 950;
        }

        .academy-mini-faq p {
          margin: 0;
          padding: 0 15px 15px;
          color: rgba(248,250,252,0.68);
          line-height: 1.5;
          font-weight: 760;
        }

        @media (max-width: 920px) {
          .fromone-academy-page {
            width: min(100% - 24px, 720px) !important;
          }

          .academy-clean-hero,
          .academy-main-layout,
          .academy-clean-note-grid {
            grid-template-columns: 1fr !important;
          }

          .academy-clean-search {
            width: 100%;
          }

          .academy-flow-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 760px) {
          .fromone-academy-page {
            width: min(100% - 24px, 520px) !important;
            margin-bottom: 42px !important;
          }

          .academy-clean-shell {
            padding: 22px 20px 24px !important;
            border-radius: 30px !important;
          }

          .academy-clean-hero {
            text-align: center;
          }

          .academy-clean-hero .page-eyebrow {
            font-size: 0.72rem !important;
            letter-spacing: 0.13em !important;
          }

          .academy-clean-hero h1 {
            font-size: clamp(2.1rem, 11vw, 3.1rem) !important;
            line-height: 0.92 !important;
            margin: 7px 0 10px !important;
          }

          .academy-clean-hero p {
            font-size: 0.98rem !important;
            line-height: 1.55 !important;
          }

          .academy-popular-button,
          .academy-do-step {
            grid-template-columns: 1fr;
            justify-items: center;
            text-align: center;
          }

          .academy-lesson-clean-head,
          .academy-lesson-clean-body,
          .academy-clean-note {
            text-align: center;
          }

          .academy-lesson-clean-head-row,
          .academy-next-actions {
            justify-content: center;
          }

          .academy-action-link,
          .academy-action-button {
            width: 100%;
          }
        }
      `}</style>

      <section className="premium-card academy-clean-shell">
        <div className="academy-clean-hero">
          <div>
            <div className="page-eyebrow">FromOne Academy</div>
            <h1 className="page-title">
              Learn FromOne
              <br />
              in minutes.
            </h1>
            <p className="page-description">
              Simple help for creating posts, checking the wording and sending or scheduling
              content without overthinking it.
            </p>
          </div>

          <div className="academy-clean-search">
            <label htmlFor="academy-search">Need help?</label>
            <input
              id="academy-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search: schedule, media, Facebook..."
            />
          </div>
        </div>

        <div className="academy-flow-grid" aria-label="Simple FromOne flow">
          {quickFlow.map((item) => (
            <article key={item.step} className="academy-flow-card">
              <span>{item.step}</span>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </article>
          ))}
        </div>

        <div className="academy-main-layout">
          <aside className="academy-clean-panel">
            <div className="academy-clean-panel-head">
              <div className="page-eyebrow">Quick help</div>
              <h2>{query.trim() ? "Search results" : "Most useful guides"}</h2>
            </div>

            {query.trim() ? (
              <div className="academy-search-results">
                <div className="academy-search-results-title">
                  {filteredLessons.length} result{filteredLessons.length === 1 ? "" : "s"}
                </div>

                {filteredLessons.length === 0 ? (
                  <div className="academy-popular-button">
                    <span>?</span>
                    <strong>No matching guide found</strong>
                  </div>
                ) : (
                  filteredLessons.slice(0, 8).map((lesson) => (
                    <button
                      key={lesson.step}
                      type="button"
                      className={
                        lesson.step === selectedLesson.step
                          ? "academy-popular-button is-active"
                          : "academy-popular-button"
                      }
                      onClick={() => chooseLesson(lesson.step)}
                    >
                      <span>{lesson.step}</span>
                      <strong>{lesson.title}</strong>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="academy-popular-list">
                {popularHelp.map((title) => {
                  const lesson = academyLessons.find((item) => item.title === title);

                  return (
                    <button
                      key={title}
                      type="button"
                      className={
                        lesson?.step === selectedLesson.step
                          ? "academy-popular-button is-active"
                          : "academy-popular-button"
                      }
                      onClick={() => choosePopularLesson(title)}
                    >
                      <span>{lesson?.step || "•"}</span>
                      <strong>{title}</strong>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <article
            id="academy-selected-lesson"
            className="academy-clean-panel academy-lesson-clean-card"
            aria-label="Selected Academy guide"
          >
            <div className="academy-lesson-clean-head">
              <div className="academy-lesson-clean-head-row">
                <span className="academy-step-chip">
                  Step {selectedLesson.step} · {selectedLesson.group}
                </span>
                <span className="academy-time-chip">{selectedLesson.time}</span>
              </div>

              <h2>{selectedLesson.title}</h2>
              <p>{selectedLesson.intro}</p>
            </div>

            <div className="academy-lesson-clean-body">
              <div className="academy-do-this">
                {selectedLesson.steps.slice(0, 6).map((item, index) => (
                  <div key={item} className="academy-do-step">
                    <span>{index + 1}</span>
                    <p>{item}</p>
                  </div>
                ))}
              </div>

              <div className="academy-clean-note-grid">
                <div className="academy-clean-note is-tip">
                  <strong>Tip</strong>
                  {selectedLesson.tip}
                </div>

                <div className="academy-clean-note is-outcome">
                  <strong>Goal</strong>
                  {selectedLesson.outcome}
                </div>
              </div>

              <div className="academy-next-actions">
                <a href="/dashboard" className="academy-action-link is-primary">
                  Go to Dashboard
                </a>
                <a href="/posts" className="academy-action-link">
                  View Posts
                </a>
                <a href="/settings" className="academy-action-link">
                  Settings
                </a>
              </div>

              <div className="academy-mini-faq">
                <details>
                  <summary>What should I upload?</summary>
                  <p>
                    Use real photos, videos or flyers from the business. Real media usually creates
                    more specific and useful posts.
                  </p>
                </details>

                <details>
                  <summary>Does anything publish automatically?</summary>
                  <p>
                    No. You check and approve posts first. Publishing options appear after approval.
                  </p>
                </details>

                <details>
                  <summary>What if Facebook or Instagram is not connected?</summary>
                  <p>
                    You can still create content, copy captions and post manually. Connect Meta only
                    if you want supported autopublishing.
                  </p>
                </details>
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
