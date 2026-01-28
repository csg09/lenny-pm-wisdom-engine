#!/usr/bin/env node
/**
 * PM Wisdom Engine - Contradiction Finder
 * 
 * Identifies where successful product leaders give contradicting advice.
 * This is one of the most valuable features - showing nuance in advice.
 * 
 * Usage: npm run contradictions
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  dataDir: path.join(__dirname, '../data'),
};

// Known tension points where experts often disagree
const CONTRADICTION_THEMES = [
  {
    id: 'delegation',
    topic: 'Delegation vs Staying in Details',
    position_a: {
      stance: 'Delegate and get out of the way',
      patterns: [/delegate|empower|trust.*team|step back|hire.*let them/gi],
      typical_advice: 'Hire great people and get out of their way',
    },
    position_b: {
      stance: 'Stay in the details (Founder Mode)',
      patterns: [/founder mode|stay.*details|review.*personally|know every|in the weeds/gi],
      typical_advice: 'Great leaders stay close to the work and review everything',
    },
  },
  {
    id: 'speed-quality',
    topic: 'Move Fast vs Get It Right',
    position_a: {
      stance: 'Move fast and iterate',
      patterns: [/move fast|ship.*fast|iterate|mvp|done.*perfect|speed/gi],
      typical_advice: 'Ship quickly and learn from users',
    },
    position_b: {
      stance: 'Take time to get it right',
      patterns: [/take.*time|craft|polish|quality|don'?t rush|thoughtful/gi],
      typical_advice: "Spend time on quality - you only get one chance at first impressions",
    },
  },
  {
    id: 'data-intuition',
    topic: 'Data-Driven vs Intuition',
    position_a: {
      stance: 'Be data-driven',
      patterns: [/data.driven|metrics|a\/b test|measure|analytics|evidence/gi],
      typical_advice: "Let data guide decisions, not opinions",
    },
    position_b: {
      stance: 'Trust your intuition',
      patterns: [/intuition|gut|vision|conviction|don'?t.*data|feel|instinct/gi],
      typical_advice: 'Great products come from vision, not A/B tests',
    },
  },
  {
    id: 'specialist-generalist',
    topic: 'Hire Specialists vs Generalists',
    position_a: {
      stance: 'Hire specialists',
      patterns: [/specialist|expert|deep.*knowledge|specific skill|best at/gi],
      typical_advice: 'Hire the best person for each specific role',
    },
    position_b: {
      stance: 'Hire generalists',
      patterns: [/generalist|versatile|wear many hats|adaptable|full.stack/gi],
      typical_advice: 'Hire smart, adaptable people who can do anything',
    },
  },
  {
    id: 'focus-expansion',
    topic: 'Stay Focused vs Expand',
    position_a: {
      stance: 'Focus relentlessly',
      patterns: [/focus|one thing|say no|narrow|do less/gi],
      typical_advice: 'Do one thing incredibly well before expanding',
    },
    position_b: {
      stance: 'Expand and diversify',
      patterns: [/expand|diversif|multiple|platform|adjacent|new market/gi],
      typical_advice: 'Build a platform and expand into adjacent opportunities',
    },
  },
  {
    id: 'users-vision',
    topic: 'Listen to Users vs Follow Your Vision',
    position_a: {
      stance: 'Listen to users',
      patterns: [/listen.*user|customer.*right|user research|feedback|what.*want/gi],
      typical_advice: 'Your users know what they need - listen to them',
    },
    position_b: {
      stance: 'Follow your vision',
      patterns: [/vision|don'?t listen|users don'?t know|faster horse|innovate/gi],
      typical_advice: "Users can't tell you what they need - that's your job",
    },
  },
  {
    id: 'consensus-decisive',
    topic: 'Build Consensus vs Be Decisive',
    position_a: {
      stance: 'Build consensus',
      patterns: [/consensus|alignment|buy.in|stakeholder|collaborate|together/gi],
      typical_advice: 'Get everyone aligned before moving forward',
    },
    position_b: {
      stance: 'Be decisive, move fast',
      patterns: [/decisive|disagree.*commit|don'?t wait|owner|make.*call/gi],
      typical_advice: "Make a decision and move - don't wait for consensus",
    },
  },
  {
    id: 'process-chaos',
    topic: 'Process vs Creative Chaos',
    position_a: {
      stance: 'Implement strong processes',
      patterns: [/process|framework|systematic|structure|standar/gi],
      typical_advice: 'Good processes create consistent outcomes',
    },
    position_b: {
      stance: 'Embrace creative chaos',
      patterns: [/chaos|unstructured|no process|flexible|creative|organic/gi],
      typical_advice: 'Too much process kills creativity',
    },
  },
];

/**
 * Find evidence for a position in an episode
 */
function findEvidence(transcript, patterns, guest) {
  const evidence = [];
  const sentences = transcript.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    for (const pattern of patterns) {
      if (pattern.test(sentence) && sentence.length > 30) {
        evidence.push({
          text: sentence.trim(),
          guest,
        });
        pattern.lastIndex = 0;
        break;
      }
    }
  }
  
  return evidence.slice(0, 5); // Top 5 quotes
}

/**
 * Main contradiction finder
 */
function findContradictions() {
  console.log('⚡ PM Wisdom Engine - Contradiction Finder');
  console.log('==========================================\n');
  
  // Load episodes
  const episodesPath = path.join(CONFIG.dataDir, 'episodes.json');
  if (!fs.existsSync(episodesPath)) {
    console.error('❌ episodes.json not found. Run npm run ingest first.');
    process.exit(1);
  }
  
  const episodes = JSON.parse(fs.readFileSync(episodesPath, 'utf-8'));
  console.log(`📚 Analyzing ${episodes.length} episodes for contradictions...\n`);
  
  const contradictions = [];
  
  for (const theme of CONTRADICTION_THEMES) {
    const positionAEvidence = [];
    const positionBEvidence = [];
    
    for (const episode of episodes) {
      const evidenceA = findEvidence(
        episode.transcript,
        theme.position_a.patterns,
        episode.guest
      );
      const evidenceB = findEvidence(
        episode.transcript,
        theme.position_b.patterns,
        episode.guest
      );
      
      positionAEvidence.push(...evidenceA.map(e => ({
        ...e,
        episode_id: episode.id,
        episode_title: episode.title,
      })));
      
      positionBEvidence.push(...evidenceB.map(e => ({
        ...e,
        episode_id: episode.id,
        episode_title: episode.title,
      })));
    }
    
    // Only include if we have evidence for both sides
    if (positionAEvidence.length > 0 && positionBEvidence.length > 0) {
      // Get unique guests for each position
      const guestsA = [...new Set(positionAEvidence.map(e => e.guest))];
      const guestsB = [...new Set(positionBEvidence.map(e => e.guest))];
      
      // Get best sample quote (shortest, most clear)
      const bestQuoteA = positionAEvidence
        .sort((a, b) => a.context.length - b.context.length)
        .find(e => e.context.length > 30 && e.context.length < 200);
      const bestQuoteB = positionBEvidence
        .sort((a, b) => a.context.length - b.context.length)
        .find(e => e.context.length > 30 && e.context.length < 200);
      
      contradictions.push({
        id: theme.id,
        topic: theme.topic,
        position_a: {
          stance: theme.position_a.stance,
          typical_advice: theme.position_a.typical_advice,
          sample_quote: bestQuoteA?.context || theme.position_a.typical_advice,
          guest_count: guestsA.length,
          quote_count: positionAEvidence.length,
          guests: guestsA.slice(0, 5),
          evidence: positionAEvidence.slice(0, 5),
        },
        position_b: {
          stance: theme.position_b.stance,
          typical_advice: theme.position_b.typical_advice,
          sample_quote: bestQuoteB?.context || theme.position_b.typical_advice,
          guest_count: guestsB.length,
          quote_count: positionBEvidence.length,
          guests: guestsB.slice(0, 5),
          evidence: positionBEvidence.slice(0, 5),
        },
        resolution_hint: generateResolutionHint(theme),
      });
      
      console.log(`✅ ${theme.topic}`);
      console.log(`   Position A: ${guestsA.length} guests, ${positionAEvidence.length} quotes`);
      console.log(`   Position B: ${guestsB.length} guests, ${positionBEvidence.length} quotes\n`);
    }
  }
  
  // Save contradictions
  const contradictionsPath = path.join(CONFIG.dataDir, 'contradictions.json');
  fs.writeFileSync(contradictionsPath, JSON.stringify(contradictions, null, 2));
  console.log(`💾 Saved ${contradictions.length} contradictions to ${contradictionsPath}`);
  
  console.log('\n✨ Contradiction analysis complete!');
  console.log('\n💡 Key insight: Most contradictions resolve by context.');
  console.log('   The "right" answer often depends on company stage, market, and situation.');
}

/**
 * Generate a hint about how to resolve the contradiction
 */
function generateResolutionHint(theme) {
  const hints = {
    'delegation': 'Context matters: early-stage often needs founder involvement, at scale you must delegate. Brian Chesky and Marty Cagan are both right for different stages.',
    'speed-quality': "Depends on what you're building and risk tolerance. Consumer apps iterate fast; B2B enterprise needs more polish upfront.",
    'data-intuition': 'Both are needed. Data for optimization, intuition for innovation. The best PMs know when to use each.',
    'specialist-generalist': 'Stage-dependent. Early stage needs generalists; at scale, specialists create depth. Team composition matters.',
    'focus-expansion': 'Timing is everything. Focus until you have clear PMF, then expand thoughtfully.',
    'users-vision': 'Listen to problems, not solutions. Users know their pain; you know the possibilities.',
    'consensus-decisive': 'Depends on decision reversibility. High-stakes irreversible = build consensus. Low-stakes = just decide.',
    'process-chaos': 'Balance shifts as you scale. Startups need flexibility; larger orgs need some structure.',
  };
  
  return hints[theme.id] || 'Context determines which approach is right.';
}

findContradictions();
