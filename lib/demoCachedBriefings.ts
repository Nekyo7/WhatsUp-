import type { Briefing, ReplyDraftOptions } from "@/types";

export const DEMO_PRECACHED_BRIEFINGS: Record<string, Record<"15s" | "2min" | "10min", Briefing>> = {
  // Rohan Sharma
  wa_rohan_sharma: {
    "15s": {
      chatId: "wa_rohan_sharma",
      timeBudget: "15s",
      tldr: [
        "Rohan is panicked about blank pitch deck slides (4 to 8) for the Thursday investor pitch.",
        "You committed to sending market sizing slides and financial Excel by tomorrow evening.",
        "You have been silent for 8 days; Rohan's urgent pre-read request remains unanswered.",
      ],
      topics: [
        {
          title: "Investor Pitch Deck Emergency",
          bullets: ["Deck needs traction & TAM slides", "Pre-read requested by investors"],
          sourceMessageIds: [],
        },
      ],
      decisions: ["Market sizing & financial Excel sheet allocated to you"],
      actionItems: ["Finalize slides 4-8 immediately", "Send Excel model to Rohan"],
      deadlines: [{ title: "Investor Meeting Pre-read", dueAt: "2024-03-14T18:00:00.000Z" }],
      generatedAt: new Date().toISOString(),
      isDemoCached: true,
    },
    "2min": {
      chatId: "wa_rohan_sharma",
      timeBudget: "2min",
      tldr: [
        "Critical investor meeting scheduled for Thursday morning requiring finalized deck.",
        "Commitments made for both presentation slides and financial models with missed deadlines.",
        "Active blocker on fundraising pre-reads due to unresolved deliverables.",
      ],
      topics: [
        {
          title: "Slide Deck Status",
          bullets: [
            "Slides 4 to 8 are currently blank and require immediate content.",
            "TAM, SAM, and traction metrics need backing sources.",
          ],
          sourceMessageIds: [],
        },
        {
          title: "Financial Projections",
          bullets: ["Excel workbook needed for investor data room.", "Rohan pinged twice for status."],
          sourceMessageIds: [],
        },
      ],
      decisions: [
        "Presentation flow confirmed with Thursday deadline.",
        "Financial model to be verified before distribution.",
      ],
      actionItems: [
        "Push updated deck to shared Google Drive.",
        "Call Rohan to align on valuation talking points.",
      ],
      deadlines: [
        { title: "Market Sizing Slides Delivery", dueAt: "2024-03-13T18:00:00.000Z" },
        { title: "Investor Pitch Meeting", dueAt: "2024-03-14T11:30:00.000Z" },
      ],
      generatedAt: new Date().toISOString(),
      isDemoCached: true,
    },
    "10min": {
      chatId: "wa_rohan_sharma",
      timeBudget: "10min",
      tldr: [
        "Comprehensive review of fundraising timeline, pending pitch assets, and operational risk.",
        "High-stakes coordination failure regarding financial workbook deliverables.",
        "Actionable recovery path defined to salvage investor pre-read window.",
      ],
      topics: [
        {
          title: "Fundraising & Pre-Read Urgency",
          bullets: [
            "Early-stage investors require 24-hour pre-read windows before formal Thursday pitches.",
            "Missing traction slides jeopardize partner meeting conviction.",
          ],
          sourceMessageIds: [],
        },
        {
          title: "Commitment Timeline Breakdown",
          bullets: [
            "Initial promise made March 12 for 24-hour turnaround.",
            "Follow-up inquiries sent March 13 and 14 with escalating severity.",
          ],
          sourceMessageIds: [],
        },
      ],
      decisions: ["Prioritize financial slide accuracy over graphic design aesthetic."],
      actionItems: [
        "Export financial projections PDF from Excel.",
        "Send apologetic acknowledgment message with draft attachment.",
      ],
      deadlines: [{ title: "Final Pre-read Transmission", dueAt: "2024-03-14T15:00:00.000Z" }],
      generatedAt: new Date().toISOString(),
      isDemoCached: true,
    },
  },
};

export const DEMO_PRECACHED_REPLY_DRAFTS: Record<string, ReplyDraftOptions> = {
  wa_rohan_sharma: {
    apologetic:
      "Bhai really sorry for going MIA, got swamped with backend bugs. Finishing the market sizing slides right now, sending the deck + Excel in 30 mins!",
    casual:
      "Hey Rohan, my bad on the delay! Polishing the financial Excel sheet right now, uploading the deck link in a bit.",
    short: "On it right now! Sending the finalized deck and Excel in 20 mins.",
  },
  wa_tanvi_designer: {
    apologetic:
      "Hi Tanvi, so sorry for the delay on this! Just reviewed the Figma components—typography and dark mode contrast look super clean. Sign-off approved!",
    casual:
      "Hey Tanvi! Checked out the Figma prototype, looks amazing. All tokens approved for the dev sprint.",
    short: "Reviewed Figma tokens and prototype—looks great, approved for Monday sprint!",
  },
  wa_mom: {
    apologetic:
      "Mummy sorry call nahi kar paya, hackathon me thoda busy tha. Khana kha liya maine, 10 minute me call karta hu.",
    casual:
      "Haan mummy sab theek hai, thoda kaam me busy tha. Abhi free hoke call karta hu!",
    short: "Sab theek hai mummy! 5 min me call karta hu.",
  },
};
