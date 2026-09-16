"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SwipeCard from "./SwipeCard";
import CardDetail from "./CardDetail";
import ContextualDuel, { CalibrationResult } from "./ContextualDuel";
import ProfileDrawer, { ProfileTags } from "./ProfileDrawer";
import {
  DiscoveryCard,
} from "@/data/mockData";
import {
  getDuelsForPhase,
  getChipsForPhase,
  DuelConfig,
  DUEL_SCORE_MAP,
} from "@/data/calibrationData";
import { Sparkles, Bookmark, Heart, User, Camera } from "lucide-react";
import {
  recordSwipe,
  submitCalibration,
  fetchNextCards,
  removePreferenceTag,
  syncProfileTags,
} from "@/lib/api";
import {
  GOA_VIBE_CARDS,
  GOA_ACTIVITY_CARDS,
  GOA_FOOD_CARDS,
  FOOD_IDS,
} from "@/data/goaCards";
import tagEmbeddingsRaw from "@/data/tagEmbeddings.json";

const TAG_EMBEDDINGS: Record<string, number[]> = tagEmbeddingsRaw as any;
const EMB_KEYS = Object.keys(TAG_EMBEDDINGS);
const EMBEDDING_DIM =
  EMB_KEYS.length > 0 ? TAG_EMBEDDINGS[EMB_KEYS[0]].length : 768;

// Build lowercase lookup for fuzzy matching
const EMB_LOOKUP: Record<string, number[]> = {};
for (const [tag, vec] of Object.entries(TAG_EMBEDDINGS)) {
  EMB_LOOKUP[tag.toLowerCase()] = vec;
}

// ── Dense vector helpers ──
function getTagEmbedding(tag: string): number[] | null {
  if (TAG_EMBEDDINGS[tag]) return TAG_EMBEDDINGS[tag];
  const lower = tag.toLowerCase();
  if (EMB_LOOKUP[lower]) return EMB_LOOKUP[lower];
  if (EMB_LOOKUP[lower + "s"]) return EMB_LOOKUP[lower + "s"];
  if (lower.endsWith("s") && EMB_LOOKUP[lower.slice(0, -1)])
    return EMB_LOOKUP[lower.slice(0, -1)];
  return null;
}

function getCardVector(tags: string[]): number[] {
  const vec = new Float64Array(EMBEDDING_DIM);
  let matched = 0;
  for (const tag of tags) {
    const emb = getTagEmbedding(tag);
    if (emb) {
      for (let i = 0; i < EMBEDDING_DIM; i++) vec[i] += emb[i];
      matched++;
    }
  }
  if (matched > 0) for (let i = 0; i < EMBEDDING_DIM; i++) vec[i] /= matched;
  return Array.from(vec);
}

function cosineSimilarityDense(a: number[], b: number[]): number {
  if (!a.length || !b.length) return 0;
  let dot = 0,
    magA = 0,
    magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

const DECAY_FACTOR = 0.8;

interface VectorUpdateOptions {
  cardIndex?: number;
  totalCards?: number;
  swipeDurationMs?: number;
  detailViewed?: boolean;
}

function updateUserVectorLocal(
  current: number[],
  cardVec: number[],
  direction: "like" | "dislike",
  options: VectorUpdateOptions = {},
): number[] {
  const {
    cardIndex = 0,
    totalCards = 10,
    swipeDurationMs = 1000,
    detailViewed = false,
  } = options;

  const baseWeight = direction === "like" ? 1.0 : -0.5;

  // Engagement weight: detail view = stronger signal
  const Weng = detailViewed ? 1.5 : 1.0;
  // Speed weight: fast swipes = lower confidence
  const Wspeed =
    swipeDurationMs < 400 ? 0.5 : swipeDurationMs < 800 ? 0.75 : 1.0;
  // Positional decay: later cards carry more weight (range 1.0 → 1.5)
  const positionalDecay = 1.0 + 0.5 * (cardIndex / Math.max(1, totalCards));

  const finalWeight = baseWeight * Weng * Wspeed * positionalDecay;

  if (current.length === 0) return cardVec.map((v) => finalWeight * v);
  return current.map(
    (v, i) => DECAY_FACTOR * v + finalWeight * (cardVec[i] || 0),
  );
}

const PHASES = ["vibes", "activities", "food"] as const;
type Phase = (typeof PHASES)[number];

const PHASE_META: Record<
  Phase | "stays",
  { label: string; emoji: string; instruction: string }
> = {
  vibes: {
    label: "Vibes",
    emoji: "",
    instruction: "What kind of trip excites you?",
  },
  activities: {
    label: "Activities",
    emoji: "",
    instruction: "What do you love to do?",
  },
  stays: { label: "Stays", emoji: "", instruction: "How do you like to stay?" },
  food: { label: "Food", emoji: "", instruction: "How do you want to eat?" },
};

// Goa-specific decks. The global VIBE/ACTIVITY/STAY decks are still exported
// from mockData for the worldwide destination flow; this app is Goa-first.
const VEG_EXCLUDED_DIETS = new Set(["nonveg"]);

const PHASE_CARDS: Record<Phase, DiscoveryCard[]> = {
  vibes: GOA_VIBE_CARDS,
  activities: GOA_ACTIVITY_CARDS,
  food: GOA_FOOD_CARDS,
};

// Per-phase quotas matching actual card counts (20 vibes + 28 activities + 18 stays = 66 total)
const PHASE_QUOTAS: Record<string, number> = {
  vibes: GOA_VIBE_CARDS.length,
  activities: GOA_ACTIVITY_CARDS.length,
  food: GOA_FOOD_CARDS.length,
};
// Each phase now holds only seven broad options, and the user asked to be
// shown all of them. Setting these gates above the deck size disables the
// early tag-confidence / vector-convergence auto-advance without having to
// unpick the scoring logic that still feeds the preference vector.
const MIN_SWIPES_FOR_CONFIDENCE = Number.POSITIVE_INFINITY;
const TAG_CONFIDENCE_THRESHOLD = 0.9; // If a single tag has ≥90% of total positive score → auto-advance
const ABSOLUTE_MAX_PER_PHASE = 30; // Never show more than 30 cards in one phase
const VECTOR_CONVERGENCE_THRESHOLD = 0.9; // cosine similarity between old & new user vector
const VECTOR_CONVERGENCE_STREAK = 3; // consecutive stable swipes to trigger auto-advance
const MIN_SWIPES_FOR_CONVERGENCE = Number.POSITIVE_INFINITY;
const CONSECUTIVE_DISLIKES_THRESHOLD = 3; // Show a duel after k dislikes in a row

export default function SwipeEngine({
  onComplete,
  sessionId,
  onProfileOpen,
  onCameraOpen,
  onTagsChange,
  skipPhases = [],
  initialProfileTags,
}: {
  onComplete: (preferences: any) => void;
  sessionId?: string | null;
  onProfileOpen?: () => void;
  onCameraOpen?: () => void;
  onTagsChange?: (tags: {
    vibes: string[];
    activities: string[];
    stays: string[];
  }) => void;
  skipPhases?: string[];
  initialProfileTags?: {
    vibes: string[];
    activities: string[];
    stays: string[];
  };
}) {
  // Compute the first phase that isn't skipped.
  // allSkipped: every phase is covered by photo — onComplete fires immediately via useEffect below.
  const firstPhase = PHASES.find((p) => !skipPhases.includes(p));
  const allSkipped = !firstPhase;
  const [phase, setPhase] = useState<Phase>((firstPhase ?? "vibes") as Phase);
  // Always initialise the card deck to the first *active* phase (not always vibes)
  const [cards, setCards] = useState<DiscoveryCard[]>(
    [...PHASE_CARDS[(firstPhase ?? "vibes") as Phase]],
  );
  const [preferences, setPreferences] = useState({
    likedVibes: [] as string[],
    likedActivities: [] as string[],
    likedStays: [] as string[],
    likedFood: [] as string[],
  });
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [transitioning, setTransitioning] = useState(false);
  const [detailCard, setDetailCard] = useState<DiscoveryCard | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileTags, setProfileTags] = useState<ProfileTags>({
    vibes: [],
    activities: [],
    stays: [],
  });

  // ── Calibration state ──────────────────────────────
  const [showDuel, setShowDuel] = useState(false);
  // ── Convergence confirmation popup ──
  const [showConvergencePopup, setShowConvergencePopup] = useState(false);

  // Keep a ref copy of the deck so swipe handling can read it without making
  // the callback depend on `cards`.
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  // ── Fire onTagsChange whenever profileTags updates ──
  useEffect(() => {
    onTagsChange?.(profileTags);
  }, [profileTags]); // eslint-disable-line react-hooks/exhaustive-deps
  const [activeDuel, setActiveDuel] = useState<DuelConfig | null>(null);
  const usedDuelIdsRef = useRef<string[]>([]);
  // ── Semantic user vector (dense centroid) ──
  const userVectorRef = useRef<number[]>([]);
  // ── Swipe timing + position refs (for ML scoring) ──
  // FIX 6: Lazy-init Date.now() to avoid hydration mismatch
  const swipeStartRef = useRef<number>(0);
  const swipeCountRef = useRef(0);
  const totalCardsInPhaseRef = useRef(15); // set properly per phase in useEffect
  const fetchingRef = useRef(false);
  const totalSwipedRef = useRef(0); // total cards swiped this phase
  const seenCardIdsRef = useRef<Set<string>>(new Set());
  // ── Dynamic quota tracking ──
  const cardsRef = useRef<DiscoveryCard[]>([]);
  const rankCardsByRelevanceRef = useRef<
    ((c: DiscoveryCard[]) => DiscoveryCard[]) | null
  >(null);
  const advancePhaseRef = useRef<(() => void) | null>(null);
  // Assigned once triggerDislikeDuel exists; lets advancePhase reach it.
  const triggerDislikeDuelRef = useRef<(() => void) | null>(null);

  // In the food phase the vegetarian question has to come first, otherwise the
  // filter has nothing left to act on by the time it is answered.
  const pickNext = useCallback(
    (ph: Phase, unseen: DiscoveryCard[]) => {
      if (ph === "food") {
        const gate = unseen.find(
          (c) =>
            c.id === FOOD_IDS.nonVegetarian || c.id === FOOD_IDS.vegetarian,
        );
        if (gate) return [gate];
      }
      return rankCardsByRelevanceRef.current
        ? rankCardsByRelevanceRef.current(unseen).slice(0, 1)
        : unseen.slice(0, 1);
    },
    [],
  );

  // Cards still eligible for a phase, after the dietary rule.
  const poolFor = useCallback(
    (ph: Phase) => {
      const all = PHASE_CARDS[ph];
      if (ph !== "food" || !vegOnlyRef.current) return all;
      return all.filter((c) => !VEG_EXCLUDED_DIETS.has(c.diet ?? "any"));
    },
    [],
  );

  // Dietary state for the food phase: set once the guest has both liked
  // "Pure Vegetarian" and passed on "Non-Vegetarian".
  const vegOnlyRef = useRef(false);
  const likedVegRef = useRef(false);
  const rejectedNonVegRef = useRef(false);
  // Guards the one-off duel we show when somebody rejects an entire phase.
  const emptyPhaseDuelRef = useRef(false);
  const likesThisPhaseRef = useRef(0); // count of likes in this phase
  const dislikesThisPhaseRef = useRef(0); // count of dislikes in this phase
  const maxCardsRef = useRef(15); // dynamic quota - set per phase in useEffect
  const hasShortCircuitedRef = useRef(false); // prevent double-triggering
  const totalDecisionsRef = useRef(0); // count of left/right swipes
  const continuousDislikesRef = useRef(0); // consecutive dislikes in a row
  const detailViewedCardRef = useRef<string | null>(null); // track if detail was opened before swipe
  const lastSwipedRef = useRef<{
    card: DiscoveryCard;
    direction: "left" | "right";
  } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // FIX 3: Buffer for dynamically fetched cards - never injected mid-animation
  const pendingCardsRef = useRef<DiscoveryCard[]>([]);
  // FIX 5: Global guard to prevent all swipe/fetch processing during phase transitions
  const isAdvancingRef = useRef(false);
  // Guard to prevent swipes during card exit animation
  const isAnimatingRef = useRef(false);
  // ── Vector convergence tracking ──
  const stableSwipeCountRef = useRef(0); // consecutive swipes where vector barely moved

  // ── Helper: rank cards by semantic similarity to user vector ──
  const rankCardsByRelevance = useCallback(
    (candidateCards: DiscoveryCard[]): DiscoveryCard[] => {
      const uv = userVectorRef.current;
      if (uv.length === 0) return candidateCards; // no signal yet → keep default order

      return [...candidateCards].sort((a, b) => {
        const vecA = getCardVector(a.tags);
        const vecB = getCardVector(b.tags);
        return (
          cosineSimilarityDense(uv, vecB) - cosineSimilarityDense(uv, vecA)
        );
      });
    },
    [],
  );
  rankCardsByRelevanceRef.current = rankCardsByRelevance;

  // ── Helper: compute tag distribution by projecting user vector onto tag embeddings ──
  const getTagDistribution = useCallback(() => {
    const uv = userVectorRef.current;
    if (uv.length === 0)
      return { entries: [] as [string, number][], totalPositive: 0 };
    // Project user vector onto each tag embedding to get per-tag affinity
    const affinities: [string, number][] = [];
    for (const [tag, emb] of Object.entries(TAG_EMBEDDINGS)) {
      const sim = cosineSimilarityDense(uv, emb);
      if (sim > 0) affinities.push([tag.toLowerCase(), sim]);
    }
    const totalPositive = affinities.reduce((s, [, v]) => s + v, 0);
    if (totalPositive === 0)
      return { entries: [] as [string, number][], totalPositive: 0 };
    const entries: [string, number][] = affinities
      .map(([tag, score]) => [tag, score / totalPositive] as [string, number])
      .sort((a, b) => b[1] - a[1]);
    return { entries, totalPositive };
  }, []);

  // FIX 6: Lazy-init Date.now() on client only
  useEffect(() => {
    swipeStartRef.current = Date.now();
  }, []);

  // Pre-seed user vector and profileTags from photo analysis (if provided)
  useEffect(() => {
    if (!initialProfileTags) return;
    // Seed the profile tags
    setProfileTags((pt) => ({
      vibes: [
        ...pt.vibes,
        ...initialProfileTags.vibes.filter((t) => !pt.vibes.includes(t)),
      ],
      activities: [
        ...pt.activities,
        ...initialProfileTags.activities.filter(
          (t) => !pt.activities.includes(t),
        ),
      ],
      stays: [
        ...pt.stays,
        ...initialProfileTags.stays.filter((t) => !pt.stays.includes(t)),
      ],
    }));
    // Seed the user vector from all photo-extracted tags
    const allTags = [
      ...initialProfileTags.vibes,
      ...initialProfileTags.activities,
      ...initialProfileTags.stays,
    ];
    if (allTags.length > 0) {
      const seedVec = new Array(EMBEDDING_DIM).fill(0);
      let count = 0;
      for (const tag of allTags) {
        const emb = getTagEmbedding(tag);
        if (emb) {
          for (let i = 0; i < EMBEDDING_DIM; i++) seedVec[i] += emb[i];
          count++;
        }
      }
      if (count > 0) {
        for (let i = 0; i < EMBEDDING_DIM; i++) seedVec[i] /= count;
        userVectorRef.current = seedVec;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // If all phases are covered by the photo, skip swipe entirely and fire onComplete immediately.
  useEffect(() => {
    if (!allSkipped) return;
    const tags = initialProfileTags ?? {
      vibes: [],
      activities: [],
      stays: [],
      food: [],
    };
    onComplete({
      likedVibes: [],
      likedActivities: [],
      likedStays: [],
      likedFood: [],
      profileTags: tags,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  useEffect(() => {
    const phaseQuota = PHASE_QUOTAS[phase] || 15;

    // Load a random first card for this phase (follow-ups are fetched dynamically)
    const pool = poolFor(phase);
    const firstCard =
      phase === "food"
        ? pickNext(phase, pool)
        : [pool[Math.floor(Math.random() * pool.length)]];
    setCards(firstCard);
    seenCardIdsRef.current = new Set(firstCard.map((c) => c.id));

    // Reset per-phase counters
    swipeCountRef.current = 0;
    totalSwipedRef.current = 0;
    totalCardsInPhaseRef.current = phaseQuota;
    fetchingRef.current = false;
    likesThisPhaseRef.current = 0;
    dislikesThisPhaseRef.current = 0;
    emptyPhaseDuelRef.current = false;
    maxCardsRef.current = phaseQuota;
    hasShortCircuitedRef.current = false;
    totalDecisionsRef.current = 0;
    pendingCardsRef.current = []; // FIX 3: Clear pending buffer
    isAdvancingRef.current = false; // FIX 5: Reset advance guard
    isAnimatingRef.current = false; // Reset animation guard
    stableSwipeCountRef.current = 0; // Reset convergence counter
    // Note: userVectorRef is NOT reset between phases - cumulative learning

    // If backend session exists, fetch the first ML-curated card from the adaptive card selector.
    if (sessionId) {
      fetchNextCards(sessionId, phase, 1)
        .then((apiCards) => {
          if (isAdvancingRef.current) return; // FIX 5: Don't inject if advancing
          if (apiCards && apiCards.length > 0 && totalSwipedRef.current === 0) {
            setCards(apiCards);
            seenCardIdsRef.current = new Set(apiCards.map((c) => c.id));
          }
        })
        .catch(() => {
          /* keep local cards as fallback */
        });
    }
  }, [phase]); // sessionId deliberately excluded

  // FIX 1: REMOVED the dangerous safety-net useEffect that watched cards.length.
  // That caused double-advance race conditions. Phase advancement is now handled
  // ONLY inside removeCard() and short-circuit logic.

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const addLike = useCallback(
    (card: DiscoveryCard) => {
      // Add card's tags to the appropriate profile section
      const sectionKey =
        phase === "vibes"
          ? "vibes"
          : phase === "activities"
            ? "activities"
            : "food";
      setProfileTags((pt) => {
        const existing = pt[sectionKey] ?? [];
        const newTags = (card.tags || []).filter((t) => !existing.includes(t));
        if (newTags.length === 0) return pt;
        return { ...pt, [sectionKey]: [...existing, ...newTags] };
      });

      setPreferences((p) => {
        if (phase === "vibes")
          return { ...p, likedVibes: [...p.likedVibes, card.id] };
        if (phase === "activities")
          return { ...p, likedActivities: [...p.likedActivities, card.id] };
        return { ...p, likedFood: [...p.likedFood, card.id] };
      });
    },
    [phase],
  );

  const advancePhase = useCallback(() => {
    // FIX 5: Guard against double-advance
    if (isAdvancingRef.current) return;

    // Rejected every option in this phase? We've learnt nothing, so instead of
    // moving on empty-handed, put the two base options of this phase head to
    // head and let them pick one. Only ever once per phase.
    if (likesThisPhaseRef.current === 0 && !emptyPhaseDuelRef.current) {
      emptyPhaseDuelRef.current = true;
      setCards([]);
      triggerDislikeDuelRef.current?.();
      return;
    }

    isAdvancingRef.current = true;
    setTransitioning(true);
    setTimeout(() => {
      const idx = PHASES.indexOf(phase);
      // Find the next non-skipped phase
      let nextIdx = idx + 1;
      while (nextIdx < PHASES.length && skipPhases.includes(PHASES[nextIdx])) {
        nextIdx++;
      }
      if (nextIdx < PHASES.length) {
        if (sessionId) syncProfileTags(sessionId, profileTags);
        setPhase(PHASES[nextIdx]);
      } else {
        if (sessionId) syncProfileTags(sessionId, profileTags);
        onComplete({ ...preferences, profileTags });
      }
      setTransitioning(false);
      // isAdvancingRef is reset in the phase useEffect when phase changes
    }, 800);
  }, [phase, preferences, profileTags, onComplete, sessionId, skipPhases]);
  advancePhaseRef.current = advancePhase;

  const removeCard = useCallback(
    (card: DiscoveryCard) => {
      // FIX 5: If already advancing, ignore all card removals
      if (isAdvancingRef.current) return;

      // Set animation guard - blocks rapid swipes during exit
      isAnimatingRef.current = true;
      setTimeout(() => {
        isAnimatingRef.current = false;
      }, 350);

      totalSwipedRef.current += 1;
      const swiped = totalSwipedRef.current;
      const currentMax = maxCardsRef.current;
      const remaining = currentMax - swiped;

      // ── Hard cap reached → advance phase ──
      if (swiped >= currentMax) {
        setCards([]);
        advancePhase();
        return;
      }

      // FIX 3: Flush any pending cards from the buffer before computing next batch
      const pendingFlush = pendingCardsRef.current.splice(0);

      // Work the next stack out HERE, not inside the setCards updater.
      // React deliberately double-invokes state updaters in StrictMode, and
      // this block marks cards as seen — running it twice burned through two
      // cards per swipe and ended every phase at roughly half the deck.
      let nextStack = cardsRef.current.filter((c) => c.id !== card.id);

      // Append any buffered cards from dynamic fetch
      if (pendingFlush.length > 0) {
        const uniquePending = pendingFlush.filter(
          (c) =>
            !nextStack.some((f) => f.id === c.id) &&
            !seenCardIdsRef.current.has(c.id),
        );
        uniquePending.forEach((c) => seenCardIdsRef.current.add(c.id));
        nextStack = [...nextStack, ...uniquePending];
      }

      if (nextStack.length === 0 && remaining > 0) {
        // Load next single card from local pool, ranked by semantic relevance
        const pool = poolFor(phase);
        const unseen = pool.filter((c) => !seenCardIdsRef.current.has(c.id));
        if (unseen.length > 0) {
          const next = pickNext(phase, unseen);
          next.forEach((c) => seenCardIdsRef.current.add(c.id));
          nextStack = next;
        }
      }
      setCards(nextStack);

      // FIX 1: Check for empty stack and advance AFTER the state update settles.
      // Use a microtask to read the committed state.
      setTimeout(() => {
        if (isAdvancingRef.current) return;
        // Only finish the phase when the pool is drained AND nothing is left on
        // screen. Checking the pool alone skipped the final card, which had
        // just been dealt into the stack and marked seen.
        if (nextStack.length > 0) return;
        const pool = poolFor(phase);
        const unseen = pool.filter((c) => !seenCardIdsRef.current.has(c.id));
        if (unseen.length === 0 && pendingCardsRef.current.length === 0) {
          // All cards exhausted for this phase
          advancePhase();
        }
      }, 50);

      // Adaptive fetch - pre-fetch 1 card into buffer so it's ready on next swipe
      if (remaining > 0 && sessionId && !fetchingRef.current) {
        fetchingRef.current = true;
        fetchNextCards(sessionId, phase, 1)
          .then((newCards) => {
            fetchingRef.current = false;
            if (isAdvancingRef.current) return; // Don't buffer if phase is done
            if (newCards && newCards.length > 0) {
              const unique = newCards.filter(
                (c) => !seenCardIdsRef.current.has(c.id),
              );
              if (unique.length > 0) {
                // FIX 3: Write to buffer, not state. Flushed on next swipe.
                pendingCardsRef.current.push(...unique);
              }
            }
          })
          .catch(() => {
            fetchingRef.current = false;
          });
      }
    },
    [phase, sessionId, advancePhase, rankCardsByRelevance],
  );

  // ── Consecutive-dislike duel trigger ──
  const triggerDislikeDuel = useCallback(() => {
    const duels = getDuelsForPhase(phase);
    // Filter out already-used duels
    const available = duels.filter(d => !usedDuelIdsRef.current.includes(d.id));
    const pool = available.length > 0 ? available : duels; // recycle if all used
    const duel = pool[Math.floor(Math.random() * pool.length)];
    continuousDislikesRef.current = 0;
    setActiveDuel(duel);
    setShowDuel(true);
  }, [phase]);
  triggerDislikeDuelRef.current = triggerDislikeDuel;

  const handleDuelResolve = useCallback(
    (result: CalibrationResult) => {
      setShowDuel(false);
      if (activeDuel) {
        usedDuelIdsRef.current.push(activeDuel.id);
      }
      setActiveDuel(null);
      continuousDislikesRef.current = 0; // Reset dislike streak after duel

      // ── Apply semantic vector update from duel result ──
      if (result.type === "duel") {
        // Negative position = user picked leftTags, positive = rightTags
        const winnerTags =
          result.position < 0 ? result.leftTags : result.rightTags;
        const loserTags =
          result.position < 0 ? result.rightTags : result.leftTags;

        if (result.position !== 0) {
          const strength = Math.abs(result.position); // 1 = slight, 2 = strong
          const winnerVec = getCardVector(winnerTags);
          const loserVec = getCardVector(loserTags);

          // Apply: new_vec = old_vec + m*winnerVec - n*loserVec
          // Where m=1.0/2.0 and n=-0.5/-1.0 (so - n = +0.5/+1.0)
          const m = strength === 1 ? 1.0 : 2.0;
          const n = strength === 1 ? -0.5 : -1.0;

          const current = userVectorRef.current;
          const dim = winnerVec.length || EMBEDDING_DIM;
          const updated = new Array(dim);
          for (let i = 0; i < dim; i++) {
            updated[i] = (current[i] || 0) + m * (winnerVec[i] || 0) - n * (loserVec[i] || 0);
          }
          userVectorRef.current = updated;
        }

        // Re-sort current card stack by updated relevance
        setCards((prev) => rankCardsByRelevance(prev));
      }

      // Send to backend
      if (sessionId) {
        if (result.type === "duel") {
          submitCalibration(sessionId, {
            type: "duel",
            stage: phase,
            duelId: result.duelId,
            position: result.position,
            leftTags: result.leftTags,
            rightTags: result.rightTags,
          });
        } else {
          submitCalibration(sessionId, {
            type: "quicktap",
            stage: phase,
            selectedTags: result.selectedTags,
          });
        }
      }

      setToast(
        result.type === "duel"
          ? "Got it! Adjusting cards..."
          : "Great picks! Adjusting...",
      );

      // This duel was the fallback for a phase the guest rejected outright —
      // the deck behind it is empty, so continue once they've answered.
      if (emptyPhaseDuelRef.current && likesThisPhaseRef.current === 0) {
        setTimeout(() => advancePhaseRef.current?.(), 400);
      }
    },
    [activeDuel, sessionId, phase, rankCardsByRelevance],
  );

  const handleDuelSkip = useCallback(() => {
    setShowDuel(false);
    if (activeDuel) {
      usedDuelIdsRef.current.push(activeDuel.id);
    }
    setActiveDuel(null);
    if (emptyPhaseDuelRef.current && likesThisPhaseRef.current === 0) {
      setTimeout(() => advancePhaseRef.current?.(), 300);
    }
  }, [activeDuel]);

  const handleSwipe = useCallback(
    (direction: "left" | "right" | "up" | "down", card: DiscoveryCard) => {
      // FIX 5: Block all swipes if we're advancing to next phase
      if (isAdvancingRef.current) return;
      // Block if animation from previous swipe still running
      if (
        isAnimatingRef.current &&
        (direction === "left" || direction === "right")
      )
        return;

      const swipeDuration = Date.now() - swipeStartRef.current;
      const cardIdx = swipeCountRef.current;
      const totalC = totalCardsInPhaseRef.current;
      swipeCountRef.current += 1;

      // Snapshot user vector before update for convergence check
      const prevUserVectorSnapshot =
        userVectorRef.current.length > 0 ? [...userVectorRef.current] : null;

      if (direction === "right") {
        if (phase === "food" && card.id === FOOD_IDS.vegetarian) {
          likedVegRef.current = true;
          vegOnlyRef.current = likedVegRef.current && rejectedNonVegRef.current;
        }
        addLike(card);
        removeCard(card);
        likesThisPhaseRef.current += 1;
        continuousDislikesRef.current = 0; // Reset consecutive dislikes on a like
        // Semantic vector update: like
        const wasDetailViewed = detailViewedCardRef.current === card.id;
        const cardVec = getCardVector(card.tags);
        userVectorRef.current = updateUserVectorLocal(
          userVectorRef.current,
          cardVec,
          "like",
          {
            cardIndex: cardIdx,
            totalCards: totalC,
            swipeDurationMs: swipeDuration,
            detailViewed: wasDetailViewed,
          },
        );
        if (sessionId)
          recordSwipe(
            sessionId,
            card.id,
            phase,
            "LIKE",
            cardIdx,
            totalC,
            swipeDuration,
            wasDetailViewed,
          );
        detailViewedCardRef.current = null;
      } else if (direction === "left") {
        if (phase === "food" && card.id === FOOD_IDS.nonVegetarian) {
          rejectedNonVegRef.current = true;
          vegOnlyRef.current = likedVegRef.current && rejectedNonVegRef.current;
        }
        removeCard(card);
        dislikesThisPhaseRef.current += 1;
        continuousDislikesRef.current += 1; // Increment consecutive dislikes
        // Semantic vector update: dislike
        const wasDetailViewed = detailViewedCardRef.current === card.id;
        const cardVec = getCardVector(card.tags);
        userVectorRef.current = updateUserVectorLocal(
          userVectorRef.current,
          cardVec,
          "dislike",
          {
            cardIndex: cardIdx,
            totalCards: totalC,
            swipeDurationMs: swipeDuration,
            detailViewed: wasDetailViewed,
          },
        );
        if (sessionId)
          recordSwipe(
            sessionId,
            card.id,
            phase,
            "DISLIKE",
            cardIdx,
            totalC,
            swipeDuration,
            wasDetailViewed,
          );
        detailViewedCardRef.current = null;
      } else if (direction === "down") {
        setDetailCard(card);
        detailViewedCardRef.current = card.id;
      } else if (direction === "up") {
        if (!wishlist.includes(card.id)) {
          setWishlist((prev) => [...prev, card.id]);
          setToast(`${card.title} saved to wishlist`);
          if (sessionId)
            recordSwipe(
              sessionId,
              card.id,
              phase,
              "SAVE",
              cardIdx,
              totalC,
              swipeDuration,
            );
        } else {
          setWishlist((prev) => prev.filter((id) => id !== card.id));
          setToast(`Removed ${card.title} from wishlist`);
        }
      }

      // ── Adaptive intelligence: runs after each left/right swipe ──
      if (direction === "left" || direction === "right") {
        totalDecisionsRef.current += 1;
        const decisions = totalDecisionsRef.current;

        // FIX 2: 90% Tag Confidence Auto-Advance - use isAdvancingRef, don't corrupt maxCardsRef
        if (
          decisions >= MIN_SWIPES_FOR_CONFIDENCE &&
          !hasShortCircuitedRef.current
        ) {
          const { entries } = getTagDistribution();
          if (entries.length > 0) {
            const [topTag, topShare] = entries[0];
            if (topShare >= TAG_CONFIDENCE_THRESHOLD) {
              hasShortCircuitedRef.current = true;
              // FIX 2: Do NOT set maxCardsRef = totalSwiped (that corrupts quota)
              // Instead just schedule the advance directly
              const displayTag =
                topTag.charAt(0).toUpperCase() + topTag.slice(1);
              setToast(
                `We see you love ${displayTag}! Moving to ${phase === "vibes" ? "activities" : "stays"}...`,
              );
              setTimeout(() => {
                if (!isAdvancingRef.current) advancePhase();
              }, 1200);
              return;
            }
          }
        }

        // ── Vector convergence auto-advance ──
        if (
          decisions >= MIN_SWIPES_FOR_CONVERGENCE &&
          !hasShortCircuitedRef.current
        ) {
          const oldVec = prevUserVectorSnapshot;
          const newVec = userVectorRef.current;
          if (oldVec && oldVec.length > 0 && newVec.length > 0) {
            const sim = cosineSimilarityDense(oldVec, newVec);
            if (sim >= VECTOR_CONVERGENCE_THRESHOLD) {
              stableSwipeCountRef.current += 1;
              if (stableSwipeCountRef.current >= VECTOR_CONVERGENCE_STREAK) {
                setShowConvergencePopup(true);
                return;
              }
            } else {
              stableSwipeCountRef.current = 0; // reset streak
            }
          }
        }

        // ── Consecutive-dislike duel trigger ──
        if (
          direction === "left" &&
          continuousDislikesRef.current >= CONSECUTIVE_DISLIKES_THRESHOLD &&
          !showDuel
        ) {
          triggerDislikeDuel();
        }
      }

      // ── Trigger undo button for left/right swipes ──
      if (direction === "left" || direction === "right") {
        lastSwipedRef.current = { card, direction };
        setShowUndo(true);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => {
          setShowUndo(false);
          lastSwipedRef.current = null;
        }, 3000);
      }

      swipeStartRef.current = Date.now();
    },
    [
      addLike,
      removeCard,
      wishlist,
      sessionId,
      phase,
      advancePhase,
      getTagDistribution,
      triggerDislikeDuel,
    ],
  );

  // ── Undo last swipe ──
  const handleUndo = useCallback(() => {
    const last = lastSwipedRef.current;
    if (!last) return;
    // FIX 5: Don't undo if we're transitioning between phases
    if (isAdvancingRef.current || transitioning) return;

    // FIX 4: Re-insert card at the FRONT (top of stack, since slice(-3) renders last 3)
    setCards((prev) => {
      // Guard: don't add duplicate
      if (prev.some((c) => c.id === last.card.id)) return prev;
      return [...prev, last.card];
    });
    totalSwipedRef.current = Math.max(0, totalSwipedRef.current - 1);

    // Reverse the semantic vector update
    const undoCardVec = getCardVector(last.card.tags);
    if (last.direction === "right") {
      likesThisPhaseRef.current = Math.max(0, likesThisPhaseRef.current - 1);
      // Reverse like: subtract the card vector contribution
      userVectorRef.current = updateUserVectorLocal(
        userVectorRef.current,
        undoCardVec,
        "dislike",
      );
      setPreferences((p) => {
        if (phase === "vibes")
          return {
            ...p,
            likedVibes: p.likedVibes.filter((id) => id !== last.card.id),
          };
        if (phase === "activities")
          return {
            ...p,
            likedActivities: p.likedActivities.filter(
              (id) => id !== last.card.id,
            ),
          };
        return {
          ...p,
          likedStays: p.likedStays.filter((id) => id !== last.card.id),
        };
      });
    } else {
      dislikesThisPhaseRef.current = Math.max(
        0,
        dislikesThisPhaseRef.current - 1,
      );
      // Reverse dislike: add the card vector contribution back
      userVectorRef.current = updateUserVectorLocal(
        userVectorRef.current,
        undoCardVec,
        "like",
      );
    }
    totalDecisionsRef.current = Math.max(0, totalDecisionsRef.current - 1);

    lastSwipedRef.current = null;
    setShowUndo(false);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setToast("Card restored");
  }, [phase, transitioning]);

  const handleDetailSwipe = useCallback(
    (dir: "left" | "right") => {
      if (!detailCard) return;
      const cardIdx = swipeCountRef.current;
      const totalC = totalCardsInPhaseRef.current;
      const swipeDuration = Date.now() - swipeStartRef.current;
      swipeCountRef.current += 1;
      const detailCardVec = getCardVector(detailCard.tags);
      // Snapshot user vector before update for convergence check
      const prevDetailVectorSnapshot =
        userVectorRef.current.length > 0 ? [...userVectorRef.current] : null;
      if (dir === "right") {
        addLike(detailCard);
        likesThisPhaseRef.current += 1;
        // Semantic vector update for detail-view like
        userVectorRef.current = updateUserVectorLocal(
          userVectorRef.current,
          detailCardVec,
          "like",
          {
            cardIndex: cardIdx,
            totalCards: totalC,
            swipeDurationMs: swipeDuration,
            detailViewed: true,
          },
        );
        if (sessionId)
          recordSwipe(
            sessionId,
            detailCard.id,
            phase,
            "LIKE",
            cardIdx,
            totalC,
            swipeDuration,
            true,
          );
      } else {
        dislikesThisPhaseRef.current += 1;
        // Semantic vector update for detail-view dislike
        userVectorRef.current = updateUserVectorLocal(
          userVectorRef.current,
          detailCardVec,
          "dislike",
          {
            cardIndex: cardIdx,
            totalCards: totalC,
            swipeDurationMs: swipeDuration,
            detailViewed: true,
          },
        );
        if (sessionId)
          recordSwipe(
            sessionId,
            detailCard.id,
            phase,
            "DISLIKE",
            cardIdx,
            totalC,
            swipeDuration,
            true,
          );
      }
      totalDecisionsRef.current += 1;
      removeCard(detailCard);
      setDetailCard(null);
      detailViewedCardRef.current = null;
      swipeStartRef.current = Date.now();

      // Check confidence and periodic duel after detail swipe too
      const decisions = totalDecisionsRef.current;
      if (
        decisions >= MIN_SWIPES_FOR_CONFIDENCE &&
        !hasShortCircuitedRef.current
      ) {
        const { entries } = getTagDistribution();
        if (entries.length > 0 && entries[0][1] >= TAG_CONFIDENCE_THRESHOLD) {
          hasShortCircuitedRef.current = true;
          // FIX 2: Don't corrupt maxCardsRef
          const displayTag =
            entries[0][0].charAt(0).toUpperCase() + entries[0][0].slice(1);
          setToast(
            `🚀 We see you love ${displayTag}! Moving to ${phase === "vibes" ? "activities" : "stays"}...`,
          );
          setTimeout(() => {
            if (!isAdvancingRef.current) advancePhase();
          }, 1200);
          return;
        }
      }

      // ── Vector convergence auto-advance (detail swipe) ──
      if (
        decisions >= MIN_SWIPES_FOR_CONVERGENCE &&
        !hasShortCircuitedRef.current
      ) {
        const oldVec = prevDetailVectorSnapshot;
        const newVec = userVectorRef.current;
        if (oldVec && oldVec.length > 0 && newVec.length > 0) {
          const sim = cosineSimilarityDense(oldVec, newVec);
          if (sim >= VECTOR_CONVERGENCE_THRESHOLD) {
            stableSwipeCountRef.current += 1;
            if (stableSwipeCountRef.current >= VECTOR_CONVERGENCE_STREAK) {
              setShowConvergencePopup(true);
              return;
            }
          } else {
            stableSwipeCountRef.current = 0;
          }
        }
      }

      // ── Consecutive-dislike duel trigger (detail swipe) ──
      if (dir === "left") {
        continuousDislikesRef.current += 1;
        if (continuousDislikesRef.current >= CONSECUTIVE_DISLIKES_THRESHOLD && !showDuel) {
          triggerDislikeDuel();
        }
      } else {
        continuousDislikesRef.current = 0;
      }
    },
    [
      detailCard,
      addLike,
      removeCard,
      sessionId,
      phase,
      advancePhase,
      getTagDistribution,
      triggerDislikeDuel,
    ],
  );

  const phaseIndex = PHASES.indexOf(phase);
  const totalPerPhase = PHASE_CARDS[phase].length;
  const swiped = totalSwipedRef.current;
  // Progress across the whole Goa deck, not the global destination decks.
  const overallTotal = PHASES.reduce((n, p) => n + PHASE_CARDS[p].length, 0);
  const overallSwiped =
    PHASES.slice(0, phaseIndex).reduce((n, p) => n + PHASE_CARDS[p].length, 0) +
    swiped;
  const progress = (overallSwiped / overallTotal) * 100;

  // ─── Transition screen ─────────────────────────────
  if (transitioning) {
    const nextPhase = PHASES[phaseIndex + 1];
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-8">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 12 }}
          className="w-20 h-20 rounded-[24px] bg-[#FFD233] flex items-center justify-center mb-6 shadow-[0_4px_20px_rgba(255,210,51,0.4)]"
        >
          <Sparkles className="w-9 h-9 text-[#1A1A1A]" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg font-bold text-[#1A1A1A] text-center"
        >
          {nextPhase
            ? `Great picks! Now choose your ${PHASE_META[nextPhase].label.toLowerCase()}.`
            : "Generating your profile..."}
        </motion.p>
      </div>
    );
  }

  // ─── Main render ───────────────────────────────────
  return (
    <div
      className="min-h-[100dvh] flex flex-col"
      style={{ padding: "24px 20px 16px" }}
    >
      {/* ═══ HEADER - clean & spacious ═══ */}
      <div style={{ marginBottom: "20px" }}>
        {/* Phase chips + wishlist count + profile icon */}
        <div
          className="flex items-center"
          style={{ gap: "8px", marginBottom: "16px" }}
        >
          {PHASES.map((p, i) => {
            const isCurrent = p === phase;
            const isDone = i < phaseIndex;
            return (
              <div
                key={p}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all duration-300 ${
                  isCurrent
                    ? "bg-[#1A1A1A] text-white"
                    : isDone
                      ? "bg-[#FFD233] text-[#1A1A1A]"
                      : "bg-[#F2F2F7] text-[#8E8E93]"
                }`}
              >
                {PHASE_META[p].emoji} {PHASE_META[p].label}
              </div>
            );
          })}

          {/* Camera button */}
          <button
            onClick={() => onCameraOpen?.()}
            className="ml-auto relative w-9 h-9 rounded-full bg-white border border-[#E5E5EA] flex items-center justify-center shadow-sm active:scale-90 transition-transform flex-shrink-0"
          >
            <Camera className="w-4 h-4 text-[#1A1A1A]" strokeWidth={2} />
          </button>

          {/* Profile button */}
          <button
            onClick={() => onProfileOpen?.()}
            className="relative w-9 h-9 rounded-full bg-[#FFD233] flex items-center justify-center shadow-[0_2px_8px_rgba(255,210,51,0.35)] active:scale-90 transition-transform flex-shrink-0"
          >
            <User className="w-4 h-4 text-[#1A1A1A]" strokeWidth={2.5} />
            {/* Tag count badge */}
            {profileTags.vibes.length +
              profileTags.activities.length +
              profileTags.stays.length >
              0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#1A1A1A] text-white text-[9px] font-bold flex items-center justify-center">
                {profileTags.vibes.length +
                  profileTags.activities.length +
                  profileTags.stays.length}
              </span>
            )}
          </button>
        </div>

        {/* Progress bar */}
        <div
          className="h-[3px] bg-[#E5E5EA] rounded-full overflow-hidden"
          style={{ marginBottom: "16px" }}
        >
          <motion.div
            className="h-full bg-[#FFD233] rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {/* Phase title */}
        <h1 className="text-[20px] font-bold text-[#1A1A1A] leading-tight">
          {PHASE_META[phase].instruction}
        </h1>
        <p className="text-[12px] text-[#8E8E93]" style={{ marginTop: "6px" }}>
          {swiped}/{totalPerPhase} swiped
        </p>
      </div>

      {/* ═══ INSTRUCTION ═══ */}
      <div
        className="flex items-center justify-center text-[10px] text-[#B0B0B0] font-medium"
        style={{ gap: "16px", marginBottom: "12px" }}
      >
        <span>← skip</span>
        <span>like →</span>
        <span>↓ details</span>
        <span>↑ save</span>
        {/* Undo button - appears for 3s after each swipe */}
        <AnimatePresence>
          {showUndo && lastSwipedRef.current && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleUndo}
              className="ml-auto px-3 py-1 rounded-full bg-[#FFD233] text-[#1A1A1A] font-bold shadow-sm active:scale-90 transition-transform"
              style={{ fontSize: "10px" }}
            >
              Undo
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ CARD STACK ═══ */}
      <div className="flex-1 relative min-h-0" style={{ minHeight: "380px" }}>
        <AnimatePresence>
          {cards.slice(-3).map((card, idx, arr) => {
            const isTop = idx === arr.length - 1;
            const depth = arr.length - 1 - idx;

            return (
              <motion.div
                key={card.id}
                style={{ zIndex: idx }}
                className="absolute inset-0"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{
                  scale: 1 - depth * 0.035,
                  y: depth * 8,
                  opacity: 1 - depth * 0.25,
                }}
                exit={{ scale: 0.9, opacity: 0, transition: { duration: 0.2 } }}
                transition={{ duration: 0.3 }}
              >
                {isTop ? (
                  <SwipeCard
                    data={card as any}
                    isWishlisted={wishlist.includes(card.id)}
                    onSwipe={(dir) => handleSwipe(dir, card)}
                  />
                ) : (
                  <div className="absolute inset-3 rounded-[32px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden pointer-events-none">
                    <img
                      src={card.image}
                      alt=""
                      className="w-full h-[72%] object-cover opacity-40"
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* ═══ CONTEXTUAL DUEL OVERLAY ═══ */}
        <AnimatePresence>
          {showDuel && activeDuel && (
            <ContextualDuel
              duelConfig={activeDuel}
              quickTapChips={getChipsForPhase(phase)}
              onResolve={handleDuelResolve}
              onSkip={handleDuelSkip}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ═══ CARD DETAIL MODAL ═══ */}
      <AnimatePresence>
        {detailCard && (
          <CardDetail
            card={detailCard}
            onClose={() => setDetailCard(null)}
            onSwipe={handleDetailSwipe}
          />
        )}
      </AnimatePresence>

      {/* ═══ CONVERGENCE CONFIRMATION POPUP ═══ */}
      <AnimatePresence>
        {showConvergencePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="mx-6 w-full max-w-[320px] rounded-[28px] bg-white p-6 shadow-[0_8px_40px_rgba(0,0,0,0.2)] text-center"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#FFD233] flex items-center justify-center shadow-[0_2px_12px_rgba(255,210,51,0.4)]">
                <Sparkles className="w-7 h-7 text-[#1A1A1A]" />
              </div>
              <h3 className="text-[17px] font-bold text-[#1A1A1A] mb-1">
                Preferences converged!
              </h3>
              <p className="text-[13px] text-[#8E8E93] mb-5 leading-snug">
                We&apos;ve got a good read on your{" "}
                {PHASE_META[phase].label.toLowerCase()} taste. Want to keep
                swiping or move on?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConvergencePopup(false);
                    stableSwipeCountRef.current = 0; // reset streak so it can re-trigger later
                  }}
                  className="flex-1 py-2.5 rounded-full border-2 border-[#E5E5EA] text-[#1A1A1A] text-[14px] font-bold active:scale-95 transition-transform"
                >
                  Swipe More
                </button>
                <button
                  onClick={() => {
                    setShowConvergencePopup(false);
                    hasShortCircuitedRef.current = true;
                    setToast(
                      `Moving to ${phase === "vibes" ? "activities" : phase === "activities" ? "stays" : "results"}...`,
                    );
                    setTimeout(() => {
                      if (!isAdvancingRef.current) advancePhase();
                    }, 600);
                  }}
                  className="flex-1 py-2.5 rounded-full bg-[#FFD233] text-[#1A1A1A] text-[14px] font-bold shadow-[0_2px_8px_rgba(255,210,51,0.35)] active:scale-95 transition-transform"
                >
                  Move On
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ TOAST ═══ */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 bg-[#1A1A1A] text-white text-[13px] font-semibold rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.25)] whitespace-nowrap"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ PROFILE DRAWER ═══ */}
      <ProfileDrawer
        tags={profileTags}
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        onRemoveTag={(section, tag) => {
          setProfileTags((pt) => ({
            ...pt,
            [section]: (pt[section] ?? []).filter((t) => t !== tag),
          }));
          // Signal the backend ML model that the user explicitly rejected this tag
          if (sessionId) removePreferenceTag(sessionId, section, tag);
        }}
      />
    </div>
  );
}
