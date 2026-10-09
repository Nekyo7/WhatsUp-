"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { 
  Sparkles, Heart, Feather, Leaf, Flower2, Moon, Compass, MapPin, 
  Check, Copy, Shield, BookOpen, Scroll, Award, Clock, ArrowRight, 
  RotateCcw, Sliders, ChevronRight, CheckCircle2, UserCheck, Flame
} from "lucide-react";
import confetti from "canvas-confetti";
import type { Chat, Message, ChatStats, GhostEntry, PromiseItem, ReplyDebtBreakdown } from "@/types";
import { DebtAgingMatrix } from "./DebtAgingMatrix";
import { GhostRadar } from "./GhostRadar";
import { ActivityHeatmap } from "./ActivityHeatmap";

interface RPGGameInterfaceProps {
  chats: Chat[];
  stats: ChatStats[];
  ghosts: GhostEntry[];
  promises: PromiseItem[];
  replyDebt: ReplyDebtBreakdown | null;
  allMessages: Message[];
  activeSelfName: string;
  activeAIEngine: string;
  onSelectChat: (chatId: string) => void;
  onOpenIdentityModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenImporter: () => void;
  onOpenAmendsMode: () => void;
  onMarkItemPaid: (item: { type: "ghost" | "promise"; id: string; chatId: string }) => void;
  onSwitchToClassicView: () => void;
}

type RPGTab = "QUEST" | "SKILLS" | "ITEMS" | "EQUIP" | "STATUS";

interface QuestItem {
  id: string;
  title: string;
  description: string;
  iconType: "flower" | "stone" | "feather" | "herb" | "shrine" | "scroll";
  progress: string;
  isComplete: boolean;
  chatId?: string;
  dueAt?: string | null;
  promiseId?: string;
}

interface SkillItem {
  id: string;
  name: string;
  cost: string;
  type: string;
  effect: string;
  description: string;
  icon: string;
  draftTone: "apologetic" | "casual" | "short";
}

const DEFAULT_SKILLS: SkillItem[] = [
  {
    id: "natures_touch",
    name: "Nature's Touch",
    cost: "MP 12",
    type: "Nature",
    effect: "Heal: 80 HP",
    description: "Restores a moderate amount of HP to one ally. Crafts an honest, apologetic reply explaining recent delays.",
    icon: "leaf",
    draftTone: "apologetic",
  },
  {
    id: "glimmer_spray",
    name: "Glimmer Spray",
    cost: "MP 8",
    type: "Light",
    effect: "Warmth: +45",
    description: "Shoots a burst of soft twinkling stars. Drafts a casual, friendly check-in to rekindle fading connections.",
    icon: "glimmer",
    draftTone: "casual",
  },
  {
    id: "breeze_step",
    name: "Breeze Step",
    cost: "MP 5",
    type: "Wind",
    effect: "Speed: +100%",
    description: "A swift burst of crisp autumn air. Crafts a concise, 1-line direct answer to resolve pending questions.",
    icon: "breeze",
    draftTone: "short",
  },
  {
    id: "calm_heart",
    name: "Calm Heart",
    cost: "MP 15",
    type: "Spirit",
    effect: "Guilt: -50 Pts",
    description: "Soothes the spirit and cleanses conversational debt. Provides deep reconciliation for prolonged silence.",
    icon: "heart",
    draftTone: "apologetic",
  },
];

export const RPGGameInterface: React.FC<RPGGameInterfaceProps> = ({
  chats,
  stats,
  ghosts,
  promises,
  replyDebt,
  allMessages,
  activeSelfName,
  activeAIEngine,
  onSelectChat,
  onOpenIdentityModal,
  onOpenSettingsModal,
  onOpenImporter,
  onOpenAmendsMode,
  onMarkItemPaid,
  onSwitchToClassicView,
}) => {
  const [activeTab, setActiveTab] = useState<RPGTab>("QUEST");
  const [selectedQuestId, setSelectedQuestId] = useState<string>("quest_1");
  const [selectedSkillId, setSelectedSkillId] = useState<string>("natures_touch");
  const [copiedDraft, setCopiedDraft] = useState<string | null>(null);

  // Character status calculations
  const totalMessagesCount = allMessages.length;
  const level = Math.max(1, Math.min(99, Math.floor(Math.sqrt(totalMessagesCount / 20)) + 1));
  const debtScore = replyDebt?.score || 0;
  
  // Health is depleted by Reply Debt
  const maxHp = 248;
  const currentHp = Math.max(20, Math.round(maxHp * (1 - (debtScore / 100) * 0.75)));
  
  // Mana represents AI & Reply capacity
  const maxMp = 86;
  const currentMp = 86;

  // EXP represents kept promises & processed messages
  const currentExp = Math.min(2100, 300 + (totalMessagesCount % 1800));
  const maxExp = 2100;

  // Currencies
  const karmaFlowerPoints = 1280 + totalMessagesCount;
  const guiltCoins = debtScore * 10;
  const keptPromisesCount = promises.filter((p) => p.status === "done").length + 12;

  // Build combined quest list (from real promises & demo quests)
  const quests: QuestItem[] = [];

  // Inject open promises as primary quests
  promises.filter((p) => p.status === "open").slice(0, 4).forEach((p, idx) => {
    const chat = chats.find((c) => c.id === p.chatId);
    quests.push({
      id: `promise_${p.id}`,
      title: `${chat?.title || "Friend"}'s Task`,
      description: p.text,
      iconType: idx % 2 === 0 ? "scroll" : "feather",
      progress: p.dueAt ? "Due Soon" : "Pending",
      isComplete: false,
      chatId: p.chatId,
      dueAt: p.dueAt,
      promiseId: p.id,
    });
  });

  // Inject ghosted contacts needing reply
  ghosts.filter((g) => g.type === "you_ghosted").slice(0, 3).forEach((g, idx) => {
    const chat = chats.find((c) => c.id === g.chatId);
    quests.push({
      id: `ghost_${g.chatId}`,
      title: `Answer ${chat?.title || "Ally"}`,
      description: g.lastMessageText || g.reason,
      iconType: "shrine",
      progress: `${g.daysSilent}d silent`,
      isComplete: false,
      chatId: g.chatId,
    });
  });

  // Default atmospheric storybook quests if list is short
  if (quests.length < 5) {
    quests.push(
      {
        id: "quest_1",
        title: "The Lost Bloom",
        description: "Find the missing flower in Whispering Glen.",
        iconType: "flower",
        progress: "Active",
        isComplete: false,
      },
      {
        id: "quest_2",
        title: "Echoes in Stone",
        description: "Investigate the ancient ruins along the mossy trail.",
        iconType: "stone",
        progress: "Active",
        isComplete: false,
      },
      {
        id: "quest_3",
        title: "Feathered Request",
        description: "Deliver the feather to the little woodland bird.",
        iconType: "feather",
        progress: "Active",
        isComplete: false,
      },
      {
        id: "quest_4",
        title: "Herbal Remedies",
        description: "Gather 3 moon herbs from the glowing grove.",
        progress: "0 / 3",
        iconType: "herb",
        isComplete: false,
      },
      {
        id: "quest_5",
        title: "A Quiet Wish",
        description: "Grant a wish at the enchanted forest shrine.",
        iconType: "shrine",
        progress: "Active",
        isComplete: false,
      }
    );
  }

  const selectedQuest = quests.find((q) => q.id === selectedQuestId) || quests[0];
  const selectedSkill = DEFAULT_SKILLS.find((s) => s.id === selectedSkillId) || DEFAULT_SKILLS[0];

  const handleCompleteQuest = (q: QuestItem) => {
    confetti({
      particleCount: 75,
      spread: 60,
      origin: { y: 0.7 },
      colors: ["#8DA87B", "#F5EEDB", "#D66E5B", "#A393B5"],
    });

    if (q.promiseId) {
      onMarkItemPaid({ type: "promise", id: q.promiseId, chatId: q.chatId || "" });
    } else if (q.chatId) {
      onMarkItemPaid({ type: "ghost", id: q.chatId, chatId: q.chatId });
    }
  };

  const handleCopySkillDraft = () => {
    const draftText = `Hey! So sorry for the delayed reply on this. About "${selectedQuest.description.slice(0, 35)}..." — sending over what you need right now!`;
    navigator.clipboard.writeText(draftText);
    setCopiedDraft(selectedSkill.id);
    setTimeout(() => setCopiedDraft(null), 2000);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-[#2D2115] font-storybook select-none bg-[#13101C]">
      {/* Hand-painted enchanted forest background wallpaper */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/rpg/forest_bg.jpg"
          alt="Enchanted Storybook Forest"
          fill
          priority
          className="object-cover object-center filter brightness-[0.88] contrast-[1.05]"
        />
        {/* Soft vignette & twilight overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0C17]/80 via-transparent to-[#181324]/60 pointer-events-none" />
      </div>

      {/* Main Game Interface Container */}
      <div className="relative z-10 max-w-7xl mx-auto min-h-screen flex flex-col justify-between p-3 sm:p-5 lg:p-8">
        
        {/* Top Floating Controls Bar */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#EFE3CC] border-2 border-[#36291C] text-xs font-fantasy font-black text-[#2D2115] shadow-md flex items-center gap-1.5">
              <span>🌿 WhatsUP? (The Guilt Ledger)</span>
              <span className="text-[10px] text-[#5C4731]">v1.0</span>
            </span>

            <button
              onClick={onOpenIdentityModal}
              className="px-3 py-1 rounded-full bg-[#EFE3CC] hover:bg-[#FAF4E6] border-2 border-[#36291C] text-xs font-fantasy font-bold text-[#2D2115] shadow-md transition-all flex items-center gap-1.5"
              title="Change Player Character Identity"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#5E7E52]" />
              <span>Hero: <strong>{activeSelfName}</strong></span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenImporter}
              className="px-3 py-1 rounded-full bg-[#EFE3CC] hover:bg-[#FAF4E6] border-2 border-[#36291C] text-xs font-fantasy font-bold text-[#2D2115] shadow-md transition-all"
            >
              📜 Ingest Scrolls
            </button>
            <button
              onClick={onOpenSettingsModal}
              className="px-3 py-1 rounded-full bg-[#EFE3CC] hover:bg-[#FAF4E6] border-2 border-[#36291C] text-xs font-fantasy font-bold text-[#2D2115] shadow-md transition-all"
            >
              🔮 Spell Engine ({activeAIEngine})
            </button>
            <button
              onClick={onSwitchToClassicView}
              className="px-3 py-1 rounded-full bg-[#36291C] hover:bg-[#4E3B29] border-2 border-[#EFE3CC] text-xs font-fantasy font-bold text-[#F5EEDB] shadow-md transition-all"
            >
              ⚔️ Classic Ledger View
            </button>
          </div>
        </div>

        {/* Center Stage: Character Visual Anchor (Left) + Parchment Game Panels (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start my-auto">
          
          {/* ========================================================
              LEFT COLUMN: Character Status & Full-Body Illustration
             ======================================================== */}
          <div className="lg:col-span-4 flex flex-col items-center space-y-4">
            
            {/* Character Status Card (HUD) */}
            <div className="w-full max-w-[280px] p-4 rounded-2xl bg-[#EFE3CC] border-2 border-[#36291C] shadow-xl text-left space-y-2 relative">
              <div className="flex items-baseline justify-between border-b border-[#36291C]/20 pb-1.5">
                <h3 className="text-xl font-fantasy font-black text-[#2D2115] uppercase tracking-wider">
                  {activeSelfName || "LUNA"}
                </h3>
                <span className="text-xs font-fantasy font-bold text-[#5C4731]">
                  Lv. {level}
                </span>
              </div>

              {/* HP Bar (Terracotta Coral) */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px] font-fantasy font-bold text-[#5C4731]">
                  <span>HP</span>
                  <span>{currentHp} / {maxHp}</span>
                </div>
                <div className="h-2.5 w-full bg-[#D6C7AC] border border-[#36291C] rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-[#D66E5B] to-[#C25B49] rounded-full transition-all duration-500"
                    style={{ width: `${(currentHp / maxHp) * 100}%` }}
                  />
                </div>
              </div>

              {/* MP Bar (Dusty Lavender) */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px] font-fantasy font-bold text-[#5C4731]">
                  <span>MP</span>
                  <span>{currentMp} / {maxMp}</span>
                </div>
                <div className="h-2.5 w-full bg-[#D6C7AC] border border-[#36291C] rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-[#7A6B8A] to-[#604E72] rounded-full transition-all duration-500"
                    style={{ width: `${(currentMp / maxMp) * 100}%` }}
                  />
                </div>
              </div>

              {/* EXP Bar (Warm Amber) */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-[11px] font-fantasy font-bold text-[#5C4731]">
                  <span>EXP</span>
                  <span>{currentExp} / {maxExp}</span>
                </div>
                <div className="h-2.5 w-full bg-[#D6C7AC] border border-[#36291C] rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-[#D4A359] to-[#BA8838] rounded-full transition-all duration-500"
                    style={{ width: `${(currentExp / maxExp) * 100}%` }}
                  />
                </div>
              </div>

              {/* Small Resource Counters Card */}
              <div className="pt-2 border-t border-[#36291C]/20 flex items-center justify-around text-xs font-fantasy font-bold text-[#2D2115]">
                <div className="flex items-center gap-1" title="Karma Points">
                  <span>🌸</span>
                  <span>{karmaFlowerPoints}</span>
                </div>
                <div className="flex items-center gap-1" title="Guilt Coins">
                  <span>🪙</span>
                  <span>{guiltCoins}</span>
                </div>
                <div className="flex items-center gap-1" title="Kept Vows / Promises">
                  <span>🌿</span>
                  <span>{keptPromisesCount}</span>
                </div>
              </div>
            </div>

            {/* Character Full-Body Standing Portrait */}
            <div className="relative w-[280px] h-[380px] sm:h-[420px] rounded-2xl overflow-hidden border-2 border-[#36291C] shadow-2xl group">
              <Image
                src="/rpg/luna.jpg"
                alt="Adventurer Luna"
                fill
                priority
                className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1C152B]/60 via-transparent to-transparent pointer-events-none" />
              
              {/* Floating Name Badge */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#EFE3CC] border-2 border-[#36291C] text-xs font-fantasy font-black text-[#2D2115] shadow-lg">
                The Wandering Ledger
              </div>
            </div>

            {/* Action prompt: Amends Payoff ritual */}
            {debtScore > 0 && (
              <button
                onClick={onOpenAmendsMode}
                className="w-full max-w-[280px] py-2 px-4 rounded-xl bg-gradient-to-r from-[#D66E5B] to-[#C25B49] hover:brightness-110 text-white font-fantasy font-bold text-xs border-2 border-[#36291C] shadow-lg transition-all flex items-center justify-center gap-2 animate-pulse"
              >
                <span>✨ Pay Off Guilt (Amends Ritual)</span>
              </button>
            )}
          </div>

          {/* ========================================================
              RIGHT COLUMN: Main Storybook Parchment Panels
             ======================================================== */}
          <div className="lg:col-span-8 flex flex-col">
            
            {/* Top Navigation Tabs (Controller/Menu Style) */}
            <div className="flex items-end gap-1.5 px-3 select-none overflow-x-auto">
              <span className="px-2 py-1 rounded bg-[#D6C7AC] border border-[#36291C] text-[10px] font-mono text-[#36291C] font-bold">
                L1
              </span>

              {(["QUEST", "SKILLS", "ITEMS", "EQUIP", "STATUS"] as const).map((tab) => {
                const isActive = activeTab === tab;
                const activeColorClass =
                  tab === "QUEST"
                    ? "rpg-tab-active-green"
                    : tab === "SKILLS"
                    ? "rpg-tab-active-purple"
                    : "bg-[#F4EAD6] text-[#2D2115]";

                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rpg-tab-btn ${
                      isActive ? activeColorClass : "rpg-tab-inactive"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}

              <span className="px-2 py-1 rounded bg-[#D6C7AC] border border-[#36291C] text-[10px] font-mono text-[#36291C] font-bold">
                R1
              </span>
            </div>

            {/* Main Parchment Content Frame */}
            <div className="rpg-parchment-panel p-5 sm:p-6 lg:p-7 min-h-[500px] flex flex-col justify-between">
              
              {/* TAB 1: QUEST (Replicating exact reference screenshot layout) */}
              {activeTab === "QUEST" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-left animate-fadeIn">
                  
                  {/* Left Column: Quest Objectives List */}
                  <div className="md:col-span-7 space-y-3">
                    <div className="rpg-divider pb-1">
                      <span className="font-fantasy font-black text-sm tracking-wider uppercase text-[#2D2115] flex items-center gap-2">
                        <span>🌸</span>
                        <span>Quests ({quests.length})</span>
                        <span>🌸</span>
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                      {quests.map((quest) => {
                        const isSelected = selectedQuest.id === quest.id;
                        return (
                          <div
                            key={quest.id}
                            onClick={() => setSelectedQuestId(quest.id)}
                            className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? "bg-[#8DA87B] border-[#36291C] text-[#1E2B16] shadow-sm font-bold scale-[1.01]"
                                : "bg-[#EFE3CC] border-[#36291C]/40 text-[#382A1C] hover:border-[#36291C] hover:bg-[#F5ECD7]"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-xl flex-shrink-0">
                                {quest.iconType === "flower" && "🌸"}
                                {quest.iconType === "stone" && "🪨"}
                                {quest.iconType === "feather" && "🪶"}
                                {quest.iconType === "herb" && "🌿"}
                                {quest.iconType === "shrine" && "⛩️"}
                                {quest.iconType === "scroll" && "📜"}
                              </span>
                              <div className="min-w-0">
                                <div className="text-sm font-fantasy font-bold truncate">
                                  {quest.title}
                                </div>
                                <div className="text-xs font-storybook text-[#5C4731] line-clamp-1 italic">
                                  {quest.description}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-xs font-mono font-bold">
                                {quest.progress}
                              </span>
                              <span className="text-xs">✧</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Quest Action Trigger */}
                    <div className="pt-2 border-t border-[#36291C]/20 flex items-center justify-between">
                      <button
                        onClick={() => handleCompleteQuest(selectedQuest)}
                        className="px-4 py-2 rounded-xl bg-[#5E7E52] hover:bg-[#4E6E42] text-white font-fantasy font-bold text-xs border border-[#36291C] shadow transition-all flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>Fulfill Quest (Mark Done)</span>
                      </button>

                      {selectedQuest.chatId && (
                        <button
                          onClick={() => onSelectChat(selectedQuest.chatId!)}
                          className="text-xs font-fantasy font-bold text-[#2D2115] hover:underline"
                        >
                          Inspect Transcript &rarr;
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Skills Quick Panel + Area Map */}
                  <div className="md:col-span-5 space-y-4">
                    
                    {/* Skills Quick Bar */}
                    <div className="space-y-2">
                      <div className="rpg-divider pb-1">
                        <span className="font-fantasy font-black text-xs tracking-wider uppercase text-[#2D2115] flex items-center gap-1">
                          <span>🌿</span>
                          <span>Skills</span>
                          <span>🌿</span>
                        </span>
                      </div>

                      {/* 4 Skill Icon Slots */}
                      <div className="grid grid-cols-4 gap-2">
                        {DEFAULT_SKILLS.map((skill) => {
                          const isSkillSelected = selectedSkill.id === skill.id;
                          return (
                            <button
                              key={skill.id}
                              onClick={() => setSelectedSkillId(skill.id)}
                              className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center p-1.5 transition-all ${
                                isSkillSelected
                                  ? "bg-[#252D21] border-[#8DA87B] text-[#8DA87B] shadow-md scale-105"
                                  : "bg-[#1E251B] border-[#3E4D36] text-[#A6BF94] hover:border-[#8DA87B]"
                              }`}
                            >
                              <span className="text-xl">
                                {skill.icon === "leaf" && "🌱"}
                                {skill.icon === "glimmer" && "✨"}
                                {skill.icon === "breeze" && "🍃"}
                                {skill.icon === "heart" && "❤️"}
                              </span>
                              <span className="text-[9px] font-fantasy font-bold truncate max-w-full text-center mt-1">
                                {skill.name.split(" ")[0]}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Selected Skill Details Box */}
                      <div className="p-3 rounded-xl bg-[#EFE3CC] border-2 border-[#36291C]/40 space-y-1.5 text-left">
                        <div className="flex items-center justify-between text-xs font-fantasy font-bold">
                          <span className="flex items-center gap-1">
                            <span>🌱</span>
                            <span>{selectedSkill.name}</span>
                          </span>
                          <span className="text-[#604E72] font-mono">{selectedSkill.cost}</span>
                        </div>
                        <p className="text-[11px] font-storybook text-[#5C4731] leading-relaxed">
                          {selectedSkill.description}
                        </p>
                        <div className="flex items-center justify-between pt-1 border-t border-[#36291C]/20 text-[10px] font-fantasy">
                          <span>{selectedSkill.effect}</span>
                          <button
                            onClick={handleCopySkillDraft}
                            className="px-2 py-0.5 rounded bg-[#8DA87B] hover:bg-[#7D9B6B] border border-[#36291C] text-black font-bold font-mono transition-all"
                          >
                            {copiedDraft === selectedSkill.id ? "Draft Copied!" : "Cast Draft Spell"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Area Mini-Map Frame */}
                    <div className="space-y-2">
                      <div className="rpg-divider pb-1">
                        <span className="font-fantasy font-black text-xs tracking-wider uppercase text-[#2D2115] flex items-center gap-1">
                          <span>🌿</span>
                          <span>Area Map</span>
                          <span>🌿</span>
                        </span>
                      </div>

                      <div className="relative aspect-[4/3] rounded-xl overflow-hidden border-2 border-[#36291C] shadow-md group cursor-pointer">
                        <Image
                          src="/rpg/area_map.jpg"
                          alt="Whispering Forest Map"
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {/* Interactive Pins */}
                        <div className="absolute top-1/3 left-1/4 px-2 py-0.5 rounded-full bg-[#EFE3CC]/90 border border-[#36291C] text-[9px] font-fantasy font-bold shadow animate-bounce">
                          📍 You Are Here
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SKILLS (Full Spellbook / Amends Payoff) */}
              {activeTab === "SKILLS" && (
                <div className="space-y-6 text-left animate-fadeIn">
                  <div className="rpg-divider">
                    <span className="font-fantasy font-black text-sm uppercase text-[#2D2115]">
                      🌿 Spellbook of Conversational Amends 🌿
                    </span>
                  </div>

                  <p className="text-xs font-storybook text-[#5C4731]">
                    Channel restorative spells to clear ghosting guilt, draft warm apologies, and repair communication bonds.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {DEFAULT_SKILLS.map((skill) => (
                      <div
                        key={skill.id}
                        className="p-4 rounded-xl bg-[#EFE3CC] border-2 border-[#36291C] space-y-2 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="font-fantasy font-bold text-sm text-[#2D2115]">
                              {skill.name}
                            </h4>
                            <span className="stamp-badge stamp-emerald text-[10px]">
                              {skill.cost}
                            </span>
                          </div>
                          <p className="text-xs font-storybook text-[#5C4731] mt-1 leading-relaxed">
                            {skill.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-[#36291C]/20 flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold text-[#5E7E52]">
                            {skill.effect}
                          </span>
                          <button
                            onClick={onOpenAmendsMode}
                            className="px-3 py-1 rounded-lg bg-[#5E7E52] hover:bg-[#4E6E42] text-white font-fantasy font-bold text-xs border border-[#36291C] shadow transition-all"
                          >
                            Launch Amends Mode
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: ITEMS (Chat Archives & PII Artifacts) */}
              {activeTab === "ITEMS" && (
                <div className="space-y-5 text-left animate-fadeIn">
                  <div className="rpg-divider">
                    <span className="font-fantasy font-black text-sm uppercase text-[#2D2115]">
                      📜 Satchel of Chat Scrolls & Artifacts 📜
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {chats.map((chat) => (
                      <div
                        key={chat.id}
                        onClick={() => onSelectChat(chat.id)}
                        className="p-3 rounded-xl bg-[#EFE3CC] border-2 border-[#36291C]/50 hover:border-[#36291C] cursor-pointer transition-all space-y-1 group"
                      >
                        <div className="text-2xl group-hover:scale-110 transition-transform">
                          📜
                        </div>
                        <div className="font-fantasy font-bold text-xs text-[#2D2115] truncate">
                          {chat.title}
                        </div>
                        <div className="text-[10px] font-mono text-[#5C4731]">
                          {chat.messageCount} msgs • {chat.platform}
                        </div>
                      </div>
                    ))}

                    {/* Import More Tile */}
                    <div
                      onClick={onOpenImporter}
                      className="p-3 rounded-xl border-2 border-dashed border-[#36291C]/50 hover:border-[#36291C] hover:bg-[#EFE3CC]/50 cursor-pointer transition-all flex flex-col items-center justify-center space-y-1 text-center"
                    >
                      <div className="text-2xl">➕</div>
                      <div className="font-fantasy font-bold text-xs text-[#2D2115]">
                        Ingest New Scroll
                      </div>
                      <div className="text-[10px] text-[#5C4731]">
                        WhatsApp, TG, Discord
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: EQUIP (Identity & Privacy Crystals) */}
              {activeTab === "EQUIP" && (
                <div className="space-y-5 text-left animate-fadeIn">
                  <div className="rpg-divider">
                    <span className="font-fantasy font-black text-sm uppercase text-[#2D2115]">
                      🔮 Equipped Loadout & Charms 🔮
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-[#EFE3CC] border-2 border-[#36291C] space-y-2">
                      <div className="text-2xl">👤</div>
                      <h4 className="font-fantasy font-bold text-xs text-[#2D2115]">Hero Identity</h4>
                      <p className="text-sm font-fantasy font-black text-[#5E7E52]">{activeSelfName}</p>
                      <button
                        onClick={onOpenIdentityModal}
                        className="px-2.5 py-1 rounded bg-[#36291C] text-white text-[10px] font-fantasy font-bold"
                      >
                        Switch Identity
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-[#EFE3CC] border-2 border-[#36291C] space-y-2">
                      <div className="text-2xl">🔮</div>
                      <h4 className="font-fantasy font-bold text-xs text-[#2D2115]">Spell Synthesizer</h4>
                      <p className="text-sm font-fantasy font-black text-[#7A6B8A]">{activeAIEngine}</p>
                      <button
                        onClick={onOpenSettingsModal}
                        className="px-2.5 py-1 rounded bg-[#36291C] text-white text-[10px] font-fantasy font-bold"
                      >
                        Configure API Key
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-[#EFE3CC] border-2 border-[#36291C] space-y-2">
                      <div className="text-2xl">🛡️</div>
                      <h4 className="font-fantasy font-bold text-xs text-[#2D2115]">Aegis of Privacy</h4>
                      <p className="text-xs font-mono text-[#5C4731]">100% Local Heuristics + Client-side Masking</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: STATUS (The Guilt Ledger & Bestiary) */}
              {activeTab === "STATUS" && (
                <div className="space-y-6 text-left animate-fadeIn">
                  <div className="rpg-divider">
                    <span className="font-fantasy font-black text-sm uppercase text-[#2D2115]">
                      ⚔️ The Guilt Ledger & Ghost Radar ⚔️
                    </span>
                  </div>

                  {/* Debt Matrix */}
                  <DebtAgingMatrix
                    ghosts={ghosts}
                    promises={promises}
                    chats={chats}
                    onSelectChat={onSelectChat}
                  />

                  {/* Ghost Radar */}
                  <GhostRadar
                    ghosts={ghosts}
                    chats={chats}
                    onSelectChat={onSelectChat}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Game HUD Footer (Matching Reference Screenshot) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-2 select-none">
          {/* Left Pill: Sort */}
          <div className="rpg-hud-pill px-4 py-1.5 text-xs font-bold flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-[#36291C] text-[#EFE3CC] flex items-center justify-center text-[10px]">
              △
            </span>
            <span>Sort: Newest</span>
          </div>

          {/* Center Pill: Controller Action Prompts */}
          <div className="rpg-hud-pill px-5 py-1.5 text-xs font-bold flex flex-wrap items-center justify-center gap-4">
            <span className="flex items-center gap-1.5 cursor-pointer hover:opacity-80" onClick={() => handleCompleteQuest(selectedQuest)}>
              <span className="w-4 h-4 rounded-full bg-[#36291C] text-[#EFE3CC] flex items-center justify-center text-[10px]">✕</span>
              <span>Confirm</span>
            </span>
            <span className="flex items-center gap-1.5 cursor-pointer hover:opacity-80" onClick={() => setActiveTab("QUEST")}>
              <span className="w-4 h-4 rounded-full bg-[#36291C] text-[#EFE3CC] flex items-center justify-center text-[10px]">○</span>
              <span>Back</span>
            </span>
            <span className="flex items-center gap-1.5 cursor-pointer hover:opacity-80" onClick={() => setActiveTab("STATUS")}>
              <span className="w-4 h-4 rounded-full bg-[#36291C] text-[#EFE3CC] flex items-center justify-center text-[10px]">□</span>
              <span>View Ledger</span>
            </span>
            <span className="flex items-center gap-1.5 cursor-pointer hover:opacity-80" onClick={onOpenSettingsModal}>
              <span>☰ Options</span>
            </span>
          </div>

          {/* Right Pill: Time of Day & Weather */}
          <div className="rpg-hud-pill px-4 py-1.5 text-xs font-bold flex items-center gap-2 bg-[#2B213A] border-[#36291C] text-[#EFE3CC]">
            <span>🌙 Evening</span>
            <span className="font-mono text-[#D4A359]">19:42</span>
            <span>✨</span>
          </div>
        </div>

      </div>
    </div>
  );
};
