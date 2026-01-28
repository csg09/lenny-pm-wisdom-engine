#!/usr/bin/env node
/**
 * PM Wisdom Engine - Framework Extractor
 * 
 * Extracts named frameworks, mental models, and key insights from transcripts.
 * 
 * Usage: npm run extract
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  dataDir: path.join(__dirname, '../data'),
};

// Known frameworks to look for (with variants)
const FRAMEWORK_PATTERNS = {
  'DHM Framework': {
    patterns: [/dhm/gi, /delight.*hard.to.copy.*margin/gi],
    creator: 'Gibson Biddle',
    description: 'Product strategy framework: Delight customers in Hard-to-copy, Margin-enhancing ways',
  },
  'LNO Framework': {
    patterns: [/lno\s*(framework)?/gi, /leverage.*neutral.*overhead/gi],
    creator: 'Shreyas Doshi',
    description: 'Task prioritization: Leverage (high impact), Neutral (maintenance), Overhead (waste)',
  },
  '11-Star Experience': {
    patterns: [/11.star|eleven.star/gi, /10.star.*11.star/gi],
    creator: 'Brian Chesky',
    description: 'Design exercise: imagine absurdly great experience to find achievable delight',
  },
  'PMF Survey': {
    patterns: [/40\s*%.*disappointed|pmf\s*survey|sean\s*ellis.*survey/gi],
    creator: 'Rahul Vohra / Sean Ellis',
    description: 'Measure product-market fit: 40%+ "very disappointed" = PMF',
  },
  'Founder Mode': {
    patterns: [/founder\s*mode/gi],
    creator: 'Brian Chesky / Paul Graham',
    description: 'Founders stay in details rather than delegating everything',
  },
  'Pre-mortem': {
    patterns: [/pre.?mortem/gi],
    creator: 'Shreyas Doshi / Gary Klein',
    description: 'Imagine project failed, identify reasons before starting',
  },
  'Hook Model': {
    patterns: [/hook\s*model/gi, /trigger.*action.*reward.*investment/gi],
    creator: 'Nir Eyal',
    description: 'Habit formation: Trigger → Action → Variable Reward → Investment',
  },
  'Continuous Discovery': {
    patterns: [/continuous\s*discovery/gi, /opportunity\s*solution\s*tree/gi],
    creator: 'Teresa Torres',
    description: 'Ongoing weekly customer research with structured opportunity trees',
  },
  'JTBD': {
    patterns: [/jobs?.to.be.done|jtbd/gi],
    creator: 'Clayton Christensen',
    description: 'Customers hire products for jobs, not features',
  },
  'OKRs': {
    patterns: [/\bokrs?\b/gi, /objectives?\s*and\s*key\s*results?/gi],
    creator: 'John Doerr / Intel',
    description: 'Goal-setting framework: Objectives with measurable Key Results',
  },
  'ICE Framework': {
    patterns: [/ice\s*(framework|score|priorit)/gi, /impact.*confidence.*ease/gi],
    creator: 'Sean Ellis',
    description: 'Prioritization scoring: Impact × Confidence × Ease',
  },
  'RICE Framework': {
    patterns: [/rice\s*(framework|score|priorit)/gi, /reach.*impact.*confidence.*effort/gi],
    creator: 'Intercom',
    description: 'Prioritization: (Reach × Impact × Confidence) / Effort',
  },
  'North Star Metric': {
    patterns: [/north\s*star\s*(metric)?/gi],
    creator: 'Various',
    description: 'Single metric that best captures core product value',
  },
  'Aha Moment': {
    patterns: [/aha\s*moment/gi, /magic\s*moment/gi],
    creator: 'Chamath Palihapitiya',
    description: 'Moment when user first realizes product value',
  },
};

/**
 * Extract frameworks from episode transcript
 */
function extractFrameworks(episode) {
  const frameworks = [];
  
  for (const [name, config] of Object.entries(FRAMEWORK_PATTERNS)) {
    for (const pattern of config.patterns) {
      const matches = episode.transcript.match(pattern);
      if (matches && matches.length > 0) {
        // Find the surrounding context
        const contexts = findContexts(episode.transcript, pattern);
        
        frameworks.push({
          name,
          creator: config.creator,
          description: config.description,
          mentions: matches.length,
          episode_id: episode.id,
          guest: episode.guest,
          contexts: contexts.slice(0, 3), // Top 3 contexts
        });
        break; // Found it, no need to check other patterns
      }
    }
  }
  
  return frameworks;
}

/**
 * Find context around pattern matches
 */
function findContexts(text, pattern) {
  const contexts = [];
  const sentences = text.split(/[.!?]+/);
  
  for (let i = 0; i < sentences.length; i++) {
    if (pattern.test(sentences[i])) {
      // Get surrounding sentences for context
      const start = Math.max(0, i - 1);
      const end = Math.min(sentences.length - 1, i + 2);
      const context = sentences.slice(start, end + 1).join('. ').trim();
      
      if (context.length > 50) {
        contexts.push(context);
      }
      
      // Reset pattern for next search
      pattern.lastIndex = 0;
    }
  }
  
  return contexts;
}

/**
 * Extract key insights and quotes
 */
function extractInsights(episode) {
  const insights = [];
  
  // Patterns that indicate insights
  const insightPatterns = [
    /the (key|biggest|most important) (thing|insight|lesson|learning) is/gi,
    /what I('ve| have) learned is/gi,
    /my advice (would be|is)/gi,
    /the secret (to|is)/gi,
    /here'?s (the thing|what works)/gi,
    /the truth is/gi,
    /I (always|often) (tell|say to) (people|teams|founders)/gi,
  ];
  
  const sentences = episode.transcript.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    for (const pattern of insightPatterns) {
      if (pattern.test(sentence) && sentence.length > 30 && sentence.length < 500) {
        insights.push({
          text: sentence.trim(),
          episode_id: episode.id,
          guest: episode.guest,
        });
        pattern.lastIndex = 0;
        break;
      }
    }
  }
  
  return insights;
}

/**
 * Main extraction function
 */
function extract() {
  console.log('🔍 PM Wisdom Engine - Framework Extraction');
  console.log('==========================================\n');
  
  // Load episodes
  const episodesPath = path.join(CONFIG.dataDir, 'episodes.json');
  if (!fs.existsSync(episodesPath)) {
    console.error('❌ episodes.json not found. Run npm run ingest first.');
    process.exit(1);
  }
  
  const episodes = JSON.parse(fs.readFileSync(episodesPath, 'utf-8'));
  console.log(`📚 Processing ${episodes.length} episodes...\n`);
  
  // Extract from all episodes
  const allFrameworks = [];
  const allInsights = [];
  
  for (const episode of episodes) {
    const frameworks = extractFrameworks(episode);
    const insights = extractInsights(episode);
    
    allFrameworks.push(...frameworks);
    allInsights.push(...insights);
    
    if (frameworks.length > 0) {
      console.log(`✅ ${episode.guest}: ${frameworks.map(f => f.name).join(', ')}`);
    }
  }
  
  // Dedupe and aggregate frameworks
  const frameworkMap = {};
  for (const fw of allFrameworks) {
    if (!frameworkMap[fw.name]) {
      frameworkMap[fw.name] = {
        ...fw,
        episodes: [],
        total_mentions: 0,
      };
    }
    frameworkMap[fw.name].episodes.push({
      episode_id: fw.episode_id,
      guest: fw.guest,
      mentions: fw.mentions,
      contexts: fw.contexts,
    });
    frameworkMap[fw.name].total_mentions += fw.mentions;
  }
  
  const frameworks = Object.values(frameworkMap)
    .sort((a, b) => b.total_mentions - a.total_mentions);
  
  // Save frameworks
  const frameworksPath = path.join(CONFIG.dataDir, 'frameworks.json');
  fs.writeFileSync(frameworksPath, JSON.stringify(frameworks, null, 2));
  console.log(`\n💾 Saved ${frameworks.length} frameworks to ${frameworksPath}`);
  
  // Save insights
  const insightsPath = path.join(CONFIG.dataDir, 'insights.json');
  fs.writeFileSync(insightsPath, JSON.stringify(allInsights, null, 2));
  console.log(`💾 Saved ${allInsights.length} insights to ${insightsPath}`);
  
  // Print summary
  console.log('\n📊 Framework Summary:');
  frameworks.slice(0, 10).forEach((fw, i) => {
    console.log(`   ${i + 1}. ${fw.name} (${fw.total_mentions} mentions, ${fw.episodes.length} episodes)`);
  });
  
  console.log('\n✨ Extraction complete!');
}

extract();
