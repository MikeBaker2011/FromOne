"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const academyTopics = [
  {
    step: "01",
    title: "Create your account",
    section: "Start here",
    time: "3 minutes",
    keywords: ["signup", "sign up", "login", "password", "account", "demo", "reset"],
    intro:
      "This is the first step. You create your FromOne account, sign in, and reach the place where you can start setting up the app.",
    beforeYouStart: [
      "Have your email address ready.",
      "Choose a password you can remember.",
      "Use a test email if you are recording a guide or demo.",
    ],
    steps: [
      "Go to fromone.co.uk.",
      "Click Start 7-day demo.",
      "Create your account with your email address and password.",
      "If you already have an account, sign in instead.",
      "If you cannot remember your password, use Reset password and check your email.",
      "After signing in, FromOne may take you to Settings first. That is normal.",
    ],
    tip:
      "If the reset email does not appear straight away, check junk or spam before trying again.",
    outcome: "You can now sign in and start setting up FromOne.",
  },
  {
    step: "02",
    title: "Set up your business profile",
    section: "Start here",
    time: "5 minutes",
    keywords: ["settings", "business", "website", "scan", "profile", "tone", "services"],
    intro:
      "FromOne creates better posts when it understands the business. This step tells FromOne what the business does and how it should sound.",
    beforeYouStart: [
      "Have your business website ready if you have one.",
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
      "You do not need perfect wording. Simple details are enough to help FromOne create more relevant posts.",
    outcome: "FromOne now understands the business well enough to create better post ideas.",
  },
  {
    step: "03",
    title: "Create your first posts",
    section: "Create posts",
    time: "5 minutes",
    keywords: ["dashboard", "create", "generate", "weekly posts", "media", "photos", "flyers"],
    intro:
      "This step creates a set of posts for review. Nothing needs to go live yet.",
    beforeYouStart: [
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
    section: "Review",
    time: "3 minutes",
    keywords: ["posts", "review", "caption", "hashtags", "cta", "platform", "planned"],
    intro:
      "Review is where you stay in control. You check the post before it is published, scheduled or copied manually.",
    beforeYouStart: [
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
    section: "Media prep",
    time: "5 minutes",
    keywords: ["image", "media", "crop", "resize", "rotate", "flip", "instagram", "facebook", "tiktok"],
    intro:
      "Media prep helps your images look better on each platform. You can crop, resize and create a prepared image before publishing.",
    beforeYouStart: [
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
    section: "Review",
    time: "4 minutes",
    keywords: ["caption", "cta", "hashtags", "edit", "improve", "tone", "audience"],
    intro:
      "This step helps you make the wording sound right for the business and the customer.",
    beforeYouStart: [
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
    section: "Publishing",
    time: "2 minutes",
    keywords: ["schedule", "scheduled time", "planned", "autopublish", "time", "date"],
    intro:
      "Scheduling lets you choose when the post should go out. FromOne will only try to publish once the scheduled time has arrived.",
    beforeYouStart: [
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
    section: "Publishing",
    time: "4 minutes",
    keywords: ["publish", "autopublish now", "manual", "copy", "share", "download", "posted"],
    intro:
      "FromOne gives you options. You can autopublish where supported, or use manual posting if that is safer or easier.",
    beforeYouStart: [
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
    section: "Connections",
    time: "5 minutes",
    keywords: ["facebook", "instagram", "meta", "connect", "reconnect", "token", "page"],
    intro:
      "Facebook and Instagram need to be connected before FromOne can attempt autopublishing.",
    beforeYouStart: [
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
    section: "Troubleshooting",
    time: "3 minutes",
    keywords: ["error", "failed", "needs attention", "manual fallback", "account not connected"],
    intro:
      "If a post cannot autopublish, FromOne should explain what needs attention. The post is not lost.",
    beforeYouStart: [
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
    section: "Account",
    time: "2 minutes",
    keywords: ["subscription", "demo", "settings", "support", "sign out", "billing"],
    intro:
      "This step shows where to check account details, subscription access and support options.",
    beforeYouStart: [
      "Open FromOne while signed in.",
      "Use the sidebar to move around.",
      "Check the Subscription page if access looks different from expected.",
    ],
    steps: [
      "Open Subscription to check plan or demo access.",
      "Open Settings to update business or connection details.",
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
    section: "Workflow",
    time: "3 minutes",
    keywords: ["weekly", "routine", "process", "business", "posts"],
    intro:
      "This is the simple weekly routine for getting the most from FromOne without overcomplicating social media.",
    beforeYouStart: [
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

const sections = ["All", "Start here", "Create posts", "Review", "Media prep", "Publishing", "Connections", "Troubleshooting", "Account", "Workflow"];

export default function FromOneAcademyPage() {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("All");
  const [selectedStep, setSelectedStep] = useState("01");

  const filteredTopics = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return academyTopics.filter((topic) => {
      const matchesSection = section === "All" || topic.section === section;
      const searchable = [
        topic.step,
        topic.title,
        topic.section,
        topic.intro,
        topic.outcome,
        topic.tip,
        ...topic.keywords,
        ...topic.beforeYouStart,
        ...topic.steps,
      ]
        .join(" ")
        .toLowerCase();

      return matchesSection && (!cleanQuery || searchable.includes(cleanQuery));
    });
  }, [query, section]);

  const selectedTopic =
    filteredTopics.find((topic) => topic.step === selectedStep) ||
    filteredTopics[0] ||
    academyTopics[0];

  const selectedIndex = academyTopics.findIndex((topic) => topic.step === selectedTopic.step);
  const previousTopic = selectedIndex > 0 ? academyTopics[selectedIndex - 1] : null;
  const nextTopic =
    selectedIndex >= 0 && selectedIndex < academyTopics.length - 1
      ? academyTopics[selectedIndex + 1]
      : null;

  const chooseTopic = (step: string) => {
    setSelectedStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="academy-page">
      <style>{`
        .academy-page {
          min-height: 100vh;
          width: 100%;
          padding: clamp(20px, 3vw, 34px);
          color: #ffffff;
        }

        .academy-shell {
          width: 100%;
          max-width: 1380px;
          margin: 0 auto;
        }

        .academy-hero {
          margin-bottom: 18px;
          padding: clamp(28px, 5vw, 52px);
          border-radius: 38px;
          background:
            radial-gradient(circle at 12% 18%, rgba(255, 212, 59, 0.24), transparent 34%),
            radial-gradient(circle at 88% 14%, rgba(61, 220, 151, 0.13), transparent 34%),
            linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.035));
          border: 1px solid rgba(255,255,255,0.11);
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.28);
        }

        .academy-hero-inner {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 24px;
          align-items: end;
        }

        .academy-eyebrow {
          margin: 0 0 10px;
          color: #ffd43b;
          font-size: 0.78rem;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .academy-hero h1 {
          max-width: 880px;
          margin: 0;
          font-size: clamp(2.2rem, 4.7vw, 4.7rem);
          line-height: 1.04;
          letter-spacing: -0.04em;
        }

        .academy-hero p {
          max-width: 850px;
          margin: 16px 0 0;
          color: rgba(248,250,252,0.76);
          font-size: 1.04rem;
          line-height: 1.72;
        }

        .academy-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .academy-button {
          display: inline-flex;
          min-height: 44px;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.13);
          background: rgba(255,255,255,0.075);
          color: #ffffff;
          font-weight: 900;
          text-decoration: none;
          cursor: pointer;
        }

        .academy-button.primary {
          background: #ffd43b;
          color: #101420;
          border-color: rgba(255,212,59,0.48);
          box-shadow: 0 16px 42px rgba(255, 212, 59, 0.16);
        }

        .academy-simple-note {
          margin-top: 24px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .academy-simple-note div {
          padding: 16px;
          border-radius: 22px;
          background: rgba(2, 6, 23, 0.35);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .academy-simple-note strong {
          display: block;
          margin-bottom: 6px;
          color: #ffffff;
        }

        .academy-simple-note span {
          color: rgba(248,250,252,0.68);
          line-height: 1.5;
          font-weight: 750;
        }

        .academy-search-panel {
          display: grid;
          gap: 12px;
          margin-bottom: 18px;
          padding: 16px;
          border-radius: 30px;
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.1);
        }

        .academy-search {
          min-height: 54px;
          width: 100%;
          border: 1px solid rgba(255,255,255,0.13);
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.74);
          color: #ffffff;
          padding: 0 20px;
          font-weight: 850;
          outline: none;
        }

        .academy-search::placeholder {
          color: rgba(248,250,252,0.48);
        }

        .academy-filter-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .academy-filter {
          min-height: 40px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 999px;
          background: rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.82);
          padding: 0 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .academy-filter.is-active {
          background: #ffd43b;
          color: #101420;
          border-color: rgba(255,212,59,0.42);
        }

        .academy-layout {
          display: grid;
          grid-template-columns: 340px minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }

        .academy-index {
          position: sticky;
          top: 18px;
          padding: 18px;
          border-radius: 30px;
          background: linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.035));
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 18px 55px rgba(0,0,0,0.2);
        }

        .academy-index h2 {
          margin: 0 0 12px;
          font-size: 1.08rem;
        }

        .academy-empty {
          padding: 16px;
          border-radius: 18px;
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(248,250,252,0.72);
          line-height: 1.5;
        }

        .academy-topic-list {
          display: grid;
          gap: 8px;
        }

        .academy-topic-button {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr);
          gap: 10px;
          align-items: center;
          width: 100%;
          padding: 10px;
          border-radius: 17px;
          color: rgba(248,250,252,0.78);
          text-align: left;
          background: rgba(255,255,255,0.045);
          border: 1px solid rgba(255,255,255,0.07);
          font-weight: 850;
          line-height: 1.25;
          cursor: pointer;
        }

        .academy-topic-button.is-active {
          background: rgba(255, 212, 59, 0.13);
          border-color: rgba(255, 212, 59, 0.24);
          color: #ffffff;
        }

        .academy-topic-button span {
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

        .academy-topic-button.is-active span {
          background: #ffd43b;
          color: #101420;
        }

        .academy-topic-button small {
          display: block;
          margin-top: 3px;
          color: rgba(248,250,252,0.5);
          font-weight: 800;
        }

        .academy-lesson {
          overflow: hidden;
          border-radius: 34px;
          background: linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.035));
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 18px 55px rgba(0,0,0,0.2);
        }

        .academy-lesson-header {
          display: grid;
          grid-template-columns: 70px minmax(0, 1fr) auto;
          gap: 16px;
          align-items: center;
          padding: clamp(20px, 3vw, 30px);
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .academy-step {
          display: inline-flex;
          width: 60px;
          height: 60px;
          align-items: center;
          justify-content: center;
          border-radius: 21px;
          background: #ffd43b;
          color: #101420;
          font-weight: 1000;
          box-shadow: 0 14px 30px rgba(255, 212, 59, 0.16);
        }

        .academy-section {
          display: inline-flex;
          width: fit-content;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(255, 212, 59, 0.1);
          border: 1px solid rgba(255, 212, 59, 0.2);
          color: #ffe58a;
          font-size: 0.75rem;
          font-weight: 950;
          margin-bottom: 9px;
        }

        .academy-lesson h2 {
          margin: 0;
          font-size: clamp(1.45rem, 2.4vw, 2.25rem);
          line-height: 1.16;
        }

        .academy-time {
          color: rgba(248,250,252,0.62);
          font-weight: 900;
          white-space: nowrap;
        }

        .academy-lesson-body {
          display: grid;
          gap: 20px;
          padding: clamp(20px, 3vw, 30px);
        }

        .academy-intro {
          margin: 0;
          max-width: 920px;
          color: rgba(248,250,252,0.76);
          line-height: 1.72;
          font-size: 1.04rem;
        }

        .academy-columns {
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
          gap: 16px;
          align-items: start;
        }

        .academy-box {
          padding: 18px;
          border-radius: 26px;
          background: rgba(2, 6, 23, 0.34);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .academy-box h3 {
          margin: 0 0 14px;
          color: #ffffff;
          font-size: 1.08rem;
        }

        .academy-list-small,
        .academy-steps {
          display: grid;
          gap: 10px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .academy-list-small li,
        .academy-steps li {
          display: grid;
          grid-template-columns: 30px minmax(0, 1fr);
          gap: 11px;
          align-items: start;
          color: rgba(248,250,252,0.83);
          line-height: 1.52;
          font-weight: 760;
        }

        .academy-list-small span,
        .academy-steps span {
          display: inline-flex;
          width: 26px;
          height: 26px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 1000;
        }

        .academy-list-small span {
          background: rgba(255, 212, 59, 0.12);
          color: #ffd43b;
        }

        .academy-steps span {
          background: rgba(61, 220, 151, 0.12);
          color: #a7f3d0;
        }

        .academy-bottom {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 14px;
        }

        .academy-tip,
        .academy-outcome {
          padding: 17px;
          border-radius: 23px;
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
          padding-top: 2px;
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

        @media (max-width: 1180px) {
          .academy-layout {
            grid-template-columns: 1fr;
          }

          .academy-index {
            position: static;
          }

          .academy-topic-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 900px) {
          .academy-hero-inner,
          .academy-columns,
          .academy-bottom {
            grid-template-columns: 1fr;
          }

          .academy-actions {
            justify-content: flex-start;
          }

          .academy-simple-note {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .academy-page {
            padding: 18px 12px 32px;
          }

          .academy-hero,
          .academy-lesson,
          .academy-index,
          .academy-search-panel {
            border-radius: 24px;
          }

          .academy-topic-list {
            grid-template-columns: 1fr;
          }

          .academy-lesson-header {
            grid-template-columns: 1fr;
            text-align: center;
            justify-items: center;
          }

          .academy-section {
            margin-left: auto;
            margin-right: auto;
          }

          .academy-list-small li,
          .academy-steps li {
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

      <div className="academy-shell">
        <section className="academy-hero">
          <div className="academy-hero-inner">
            <div>
              <p className="academy-eyebrow">FromOne Academy</p>
              <h1>One lesson at a time.</h1>
              <p>
                Follow one simple lesson, finish it, then move to the next. Search for help when you need it, or start at step 1 and work through the full FromOne setup.
              </p>
            </div>

            <div className="academy-actions">
              <Link href="/tutorial" className="academy-button">
                Quick tutorial
              </Link>
              <Link href="/dashboard" className="academy-button primary">
                Back to dashboard
              </Link>
            </div>
          </div>

          <div className="academy-simple-note">
            <div>
              <strong>Less overwhelm</strong>
              <span>Only one full lesson is shown at a time.</span>
            </div>
            <div>
              <strong>Plain English</strong>
              <span>Each lesson explains what to do before, during and after.</span>
            </div>
            <div>
              <strong>Safe publishing</strong>
              <span>Nothing publishes unseen. Manual fallback stays available.</span>
            </div>
          </div>
        </section>

        <section className="academy-search-panel" aria-label="Search FromOne Academy">
          <input
            className="academy-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search topics, for example: schedule, media, Facebook, reset password..."
          />

          <div className="academy-filter-row" aria-label="Filter academy topics">
            {sections.map((item) => (
              <button
                key={item}
                type="button"
                className={section === item ? "academy-filter is-active" : "academy-filter"}
                onClick={() => {
                  setSection(item);
                  const firstMatch = academyTopics.find((topic) => item === "All" || topic.section === item);
                  if (firstMatch) setSelectedStep(firstMatch.step);
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="academy-layout">
          <aside className="academy-index" aria-label="Academy lessons">
            <h2>Choose a lesson</h2>

            {filteredTopics.length === 0 ? (
              <div className="academy-empty">
                No lessons matched your search. Try another word.
              </div>
            ) : (
              <div className="academy-topic-list">
                {filteredTopics.map((topic) => (
                  <button
                    key={topic.step}
                    type="button"
                    className={
                      topic.step === selectedTopic.step
                        ? "academy-topic-button is-active"
                        : "academy-topic-button"
                    }
                    onClick={() => chooseTopic(topic.step)}
                  >
                    <span>{topic.step}</span>
                    <strong>
                      {topic.title}
                      <small>{topic.section}</small>
                    </strong>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <section className="academy-lesson" aria-label="Selected Academy lesson">
            <div className="academy-lesson-header">
              <span className="academy-step">{selectedTopic.step}</span>

              <div>
                <span className="academy-section">{selectedTopic.section}</span>
                <h2>{selectedTopic.title}</h2>
              </div>

              <span className="academy-time">{selectedTopic.time}</span>
            </div>

            <div className="academy-lesson-body">
              <p className="academy-intro">{selectedTopic.intro}</p>

              <div className="academy-columns">
                <div className="academy-box">
                  <h3>Before you start</h3>
                  <ul className="academy-list-small">
                    {selectedTopic.beforeYouStart.map((item, index) => (
                      <li key={item}>
                        <span>{index + 1}</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="academy-box">
                  <h3>Step by step</h3>
                  <ul className="academy-steps">
                    {selectedTopic.steps.map((item, index) => (
                      <li key={item}>
                        <span>{index + 1}</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="academy-bottom">
                <div className="academy-tip">
                  <span>Helpful tip</span>
                  {selectedTopic.tip}
                </div>

                <div className="academy-outcome">
                  <span>Outcome</span>
                  {selectedTopic.outcome}
                </div>
              </div>

              <div className="academy-nav-row">
                <button
                  type="button"
                  className="academy-nav-button"
                  disabled={!previousTopic}
                  onClick={() => previousTopic && chooseTopic(previousTopic.step)}
                >
                  ← Previous lesson
                </button>

                <button
                  type="button"
                  className="academy-nav-button primary"
                  disabled={!nextTopic}
                  onClick={() => nextTopic && chooseTopic(nextTopic.step)}
                >
                  Next lesson →
                </button>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
