const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const destinations = require('../data/destinations');
const { computeTopLikedTags } = require('../lib/scoring');

/**
 * POST /api/chatbot/ask
 * Body: { question: string, destination: string, country: string, sessionId?: string }
 * Returns: { answer: string }
 */
router.post('/ask', async (req, res) => {
    try {
        const { question, destination, country, sessionId } = req.body;

        if (!question || !destination) {
            return res.status(400).json({ error: 'question and destination are required' });
        }

        let preferencesText = "Flexible";
        let localDatasetText = "";

        if (sessionId) {
            const session = await Session.findById(sessionId);
            if (session) {
                const topTags = computeTopLikedTags(session, 3);
                preferencesText = `
User Budget: ₹${(session.budget || 300000).toLocaleString()}
Travelers: ${session.travelers || 2}
Vibes: ${topTags.vibes.join(', ') || 'Flexible'}
Activities: ${topTags.activities.join(', ') || 'Flexible'}
Food/Dining: ${topTags.food.join(', ') || 'Flexible'}
Transport: ${topTags.transport || 'Flexible'}`;
            }
        }

        // Get local dataset candidates for this destination
        const destData = destinations.find(d => d.name.toLowerCase() === destination.toLowerCase());
        if (destData && destData.days) {
            const allCandidates = new Set();
            destData.days.forEach(day => {
                if (day.items) {
                    day.items.forEach(item => {
                        if (item.type !== 'travel') {
                            allCandidates.add(`${item.activity} - ${item.description} (approx ₹${item.cost})`);
                        }
                    });
                }
            });
            localDatasetText = `\nAVAILABLE LOCAL PLACES & ACTIVITIES:\n` + Array.from(allCandidates).slice(0, 15).join('\n');
        }

        const systemPrompt = `You are TravelBuddy, an AI Concierge. The user is on a trip to ${destination}, ${country || ''}.

USER PROFILE:${preferencesText}
${localDatasetText}

RULES — follow these strictly:
1. Reason over the user's preferences, budget, and the available local places when giving recommendations.
2. If suggesting places to eat or visit, prioritize items from the AVAILABLE LOCAL PLACES list that match their preferences.
3. Keep answers SHORT — maximum 4-6 bullet points or 2-3 very short sentences.
4. Be specific to ${destination}.
5. Use bullet points with • for lists. Keep each bullet to ONE line.
6. Do NOT use markdown formatting (no **, ##, *, _).
7. Be direct — skip greetings and filler phrases.
8. If the user asks for a recommendation (e.g. "Where should I eat tonight?"), provide options tailored to their profile (e.g. "Since you love Seafood...").

Example of ideal response length:
• Pack layers — weather changes fast
• Comfortable walking shoes are essential`;

        const result = await generateWithRetry('gemini-2.5-flash', [
            { text: systemPrompt },
            { text: question },
        ]);

        const answer = result.response.text().trim();

        console.log(`💬 Chatbot — Q: "${question.substring(0, 50)}..." → ${answer.length} chars`);

        res.json({ answer });
    } catch (err) {
        console.error('Chatbot error:', err);
        res.status(500).json({ error: 'Failed to get answer', details: err.message });
    }
});

module.exports = router;
