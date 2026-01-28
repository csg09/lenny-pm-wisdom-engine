#!/usr/bin/env node
/**
 * PM Wisdom Engine - Transcript Ingestion Script
 * 
 * Clones Lenny's Podcast transcripts from GitHub and parses them
 * into structured JSON data for the application.
 * 
 * Usage: npm run ingest
 * 
 * Output:
 *   data/episodes.json - All episode metadata and content
 *   data/segments.json - Chunked segments for search
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const matter = require('gray-matter');
const { glob } = require('glob');

// Configuration
const REPO_URL = 'https://github.com/ChatPRD/lennys-podcast-transcripts.git';
const CONFIG = {
  repoDir: path.join(__dirname, '../lennys-podcast-transcripts'),
  transcriptsDir: path.join(__dirname, '../lennys-podcast-transcripts/episodes'),
  outputDir: path.join(__dirname, '../data'),
  segmentSize: 500,       // Words per segment
  segmentOverlap: 50,     // Overlap words between segments
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

/**
 * Clone or update the transcripts repository
 */
function cloneOrUpdateRepo() {
  console.log('📦 Checking transcripts repository...\n');
  
  if (fs.existsSync(CONFIG.repoDir)) {
    console.log('   Repository exists, pulling latest changes...');
    try {
      execSync('git pull', { cwd: CONFIG.repoDir, stdio: 'inherit' });
      console.log('   ✓ Repository updated\n');
    } catch (error) {
      console.log('   ⚠️ Could not pull updates, using existing data\n');
    }
  } else {
    console.log('   Cloning repository (this may take a minute)...');
    console.log(`   From: ${REPO_URL}\n`);
    try {
      execSync(`git clone ${REPO_URL}`, { cwd: path.dirname(CONFIG.repoDir), stdio: 'inherit' });
      console.log('\n   ✓ Repository cloned successfully\n');
    } catch (error) {
      console.error('   ❌ Failed to clone repository. Make sure git is installed.');
      console.error('   Install git from: https://git-scm.com/download/win');
      process.exit(1);
    }
  }
}

/**
 * Parse a single transcript file
 */
function parseTranscript(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content: transcript } = matter(content);
  
  // Extract guest name from folder path
  const guestFolder = path.basename(path.dirname(filePath));
  
  return {
    id: generateId(guestFolder),
    guest: frontmatter.guest || formatGuestName(guestFolder),
    title: frontmatter.title || '',
    youtube_url: frontmatter.youtube_url || '',
    video_id: frontmatter.video_id || extractVideoId(frontmatter.youtube_url),
    description: frontmatter.description || '',
    duration_seconds: frontmatter.duration_seconds || 0,
    duration: frontmatter.duration || '',
    view_count: frontmatter.view_count || 0,
    channel: frontmatter.channel || 'Lenny\'s Podcast',
    transcript: transcript.trim(),
    folder: guestFolder,
  };
}

/**
 * Generate a unique ID from guest folder name
 */
function generateId(guestFolder) {
  return guestFolder
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Format guest name from folder name
 */
function formatGuestName(folderName) {
  return folderName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Extract YouTube video ID from URL
 */
function extractVideoId(url) {
  if (!url) return '';
  const match = url.match(/(?:v=|youtu\.be\/)([^&?]+)/);
  return match ? match[1] : '';
}

/**
 * Extract timestamps from transcript text
 * Common formats: [00:00:00], (00:00), 00:00:00
 */
function extractTimestamps(text) {
  const patterns = [
    /\[(\d{1,2}):(\d{2}):(\d{2})\]/g,
    /\((\d{1,2}):(\d{2}):(\d{2})\)/g,
    /\[(\d{1,2}):(\d{2})\]/g,
    /^(\d{1,2}):(\d{2}):(\d{2})/gm,
  ];
  
  const timestamps = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const hours = match[3] ? parseInt(match[1]) : 0;
      const minutes = match[3] ? parseInt(match[2]) : parseInt(match[1]);
      const seconds = match[3] ? parseInt(match[3]) : parseInt(match[2]);
      timestamps.push({
        position: match.index,
        seconds: hours * 3600 + minutes * 60 + seconds,
        text: match[0],
      });
    }
  }
  
  return timestamps.sort((a, b) => a.position - b.position);
}

/**
 * Chunk transcript into segments for search
 */
function chunkTranscript(episode) {
  const words = episode.transcript.split(/\s+/);
  const segments = [];
  const timestamps = extractTimestamps(episode.transcript);
  
  let segmentIndex = 0;
  for (let i = 0; i < words.length; i += CONFIG.segmentSize - CONFIG.segmentOverlap) {
    const segmentWords = words.slice(i, i + CONFIG.segmentSize);
    const segmentText = segmentWords.join(' ');
    
    // Find approximate timestamp for this segment
    const charPosition = episode.transcript.indexOf(segmentWords[0]);
    const nearestTimestamp = timestamps.find(ts => ts.position >= charPosition) || timestamps[0];
    
    segments.push({
      id: `${episode.id}-${segmentIndex}`,
      episode_id: episode.id,
      guest: episode.guest,
      title: episode.title,
      text: segmentText,
      start_time: nearestTimestamp ? nearestTimestamp.seconds : 0,
      word_start: i,
      word_end: Math.min(i + CONFIG.segmentSize, words.length),
    });
    
    segmentIndex++;
  }
  
  return segments;
}

/**
 * Extract topics and entities from text
 */
function extractTopics(text) {
  // Common PM/startup topics to look for
  const topicPatterns = {
    'Product Strategy': /product strateg|roadmap|vision|priorit/gi,
    'Growth': /growth|acquisition|retention|activation|viral|plg|product.led/gi,
    'Leadership': /leadership|manag|team|cultur|hiring|firing/gi,
    'Metrics': /metric|kpi|okr|measure|data.driven|analytics/gi,
    'User Research': /user research|customer|interview|discovery|feedback/gi,
    'Product-Market Fit': /product.market fit|pmf|market fit/gi,
    'Pricing': /pricing|monetiz|subscription|freemium/gi,
    'AI': /artificial intelligence|machine learning|llm|gpt|ai\b/gi,
    'Startup': /startup|founder|fundrais|venture|series [abc]/gi,
    'Career': /career|promotion|job|interview|hiring|resume/gi,
    'Frameworks': /framework|model|method|approach|system/gi,
    'Execution': /execution|ship|launch|deliver|sprint|agile/gi,
  };
  
  const topics = [];
  for (const [topic, pattern] of Object.entries(topicPatterns)) {
    const matches = text.match(pattern);
    if (matches && matches.length >= 3) {
      topics.push({
        topic,
        mentions: matches.length,
      });
    }
  }
  
  return topics
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 5)
    .map(t => t.topic);
}

/**
 * Main ingestion function
 */
async function ingest() {
  console.log('🚀 PM Wisdom Engine - Transcript Ingestion');
  console.log('=========================================\n');
  
  // Clone or update the repository first
  cloneOrUpdateRepo();
  
  // Check if transcripts directory exists
  if (!fs.existsSync(CONFIG.transcriptsDir)) {
    console.log('⚠️  Transcripts directory not found:', CONFIG.transcriptsDir);
    console.log('\nThe repository may not have cloned correctly.');
    console.log('Try manually cloning:');
    console.log('   git clone https://github.com/ChatPRD/lennys-podcast-transcripts.git lennys-podcast-transcripts');
    
    // Create sample data for development
    console.log('\n📝 Creating sample data for development...\n');
    createSampleData();
    return;
  }
  
  // Find all transcript files
  const pattern = path.join(CONFIG.transcriptsDir, '*/transcript.md');
  const files = await glob(pattern.replace(/\\/g, '/'));
  
  console.log(`📂 Found ${files.length} transcript files\n`);
  
  if (files.length === 0) {
    console.log('⚠️  No transcripts found. Creating sample data...\n');
    createSampleData();
    return;
  }
  
  // Process all transcripts
  const episodes = [];
  const allSegments = [];
  
  for (const file of files) {
    try {
      const episode = parseTranscript(file);
      episode.topics = extractTopics(episode.transcript);
      episodes.push(episode);
      
      const segments = chunkTranscript(episode);
      allSegments.push(...segments);
      
      console.log(`✅ Processed: ${episode.guest} - ${episode.title.slice(0, 50)}...`);
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }
  
  // Sort episodes by view count (popularity)
  episodes.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
  
  // Save episodes
  const episodesPath = path.join(CONFIG.outputDir, 'episodes.json');
  fs.writeFileSync(episodesPath, JSON.stringify(episodes, null, 2));
  console.log(`\n💾 Saved ${episodes.length} episodes to ${episodesPath}`);
  
  // Save segments
  const segmentsPath = path.join(CONFIG.outputDir, 'segments.json');
  fs.writeFileSync(segmentsPath, JSON.stringify(allSegments, null, 2));
  console.log(`💾 Saved ${allSegments.length} segments to ${segmentsPath}`);
  
  // Generate statistics
  const stats = {
    total_episodes: episodes.length,
    total_segments: allSegments.length,
    total_words: allSegments.reduce((sum, s) => sum + s.text.split(/\s+/).length, 0),
    topics: {},
    guests: episodes.map(e => e.guest),
    processed_at: new Date().toISOString(),
  };
  
  // Count topic frequency
  episodes.forEach(ep => {
    ep.topics.forEach(topic => {
      stats.topics[topic] = (stats.topics[topic] || 0) + 1;
    });
  });
  
  const statsPath = path.join(CONFIG.outputDir, 'stats.json');
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  console.log(`💾 Saved statistics to ${statsPath}`);
  
  console.log('\n✨ Ingestion complete!\n');
  console.log('Next steps:');
  console.log('  npm run extract      - Extract frameworks and insights');
  console.log('  npm run contradictions - Find contradicting advice');
  console.log('  npm run build        - Build the web application');
}

/**
 * Create sample data for development/testing
 */
function createSampleData() {
  const sampleEpisodes = [
    {
      id: 'brian-chesky',
      guest: 'Brian Chesky',
      title: 'The new playbook for building a product company',
      youtube_url: 'https://www.youtube.com/watch?v=4ef0juAMqoE',
      video_id: '4ef0juAMqoE',
      description: 'Brian Chesky shares his contrarian approach to building Airbnb',
      duration_seconds: 4428,
      duration: '1:13:48',
      view_count: 381905,
      channel: "Lenny's Podcast",
      topics: ['Leadership', 'Product Strategy', 'Founder Mode', 'Execution'],
      transcript: `
Lenny: Welcome Brian. You've been running Airbnb for over 15 years now. What's changed in how you think about building products?

Brian Chesky: The biggest thing I've learned is that the best way to build a product company is to be in the details. I call this "founder mode." Most people tell founders to hire great people and get out of the way. I think that's wrong.

When Steve Jobs came back to Apple, he didn't hire a CEO and step aside. He got into every detail. He reviewed every product. He knew every pixel.

I used to think I needed to delegate everything. But the best products come from founders who stay close to the work. Not micromanaging, but being deeply involved in the creative process.

Lenny: How do you balance that with scaling the company?

Brian Chesky: You have to be really intentional about what you stay involved in. For me, it's product. I review every major feature before it ships. I do weekly design reviews.

The key insight is that you can be in the details without being a bottleneck. You create systems - weekly reviews, design principles, clear criteria for what good looks like.

I also do skip-level meetings regularly. I meet with people 2-3 levels down. Not to go around their managers, but to stay connected to what's really happening.

Lenny: What about the "11-star experience" framework you've talked about?

Brian Chesky: Right, so the idea is simple. If you want to build a 5-star experience, first imagine what a 10-star or 11-star experience would be. Make it absurdly great.

For Airbnb, a 5-star experience might be: you book a nice apartment, it's clean, the host is friendly.

An 11-star experience would be: Elon Musk meets you at the airport in a Tesla, takes you to your listing, which is a castle, and there's a private chef waiting.

Now, you can't actually build an 11-star experience - it's too expensive. But by imagining it, you find the 6 or 7-star experience that you CAN build and that delights people.

The exercise forces you to think bigger. Most people optimize a 4-star experience to make it slightly better. We want to reimagine what's possible.

Lenny: That's fascinating. How do you apply this to hiring?

Brian Chesky: I believe in hiring fewer people but paying them more. We probably have half the employees of similar companies, but we pay top of market.

And I interview every designer and senior PM personally. Not to approve them, but because I want to know everyone who's building our product.

The other thing is hiring "doers" early on, not managers. In the first 10 employees, everyone should be building. You don't need managers yet.
      `.trim(),
      folder: 'brian-chesky',
    },
    {
      id: 'shreyas-doshi',
      guest: 'Shreyas Doshi',
      title: 'The LNO framework, pre-mortems, and high-agency execution',
      youtube_url: 'https://www.youtube.com/watch?v=aA9HKslJ0h0',
      video_id: 'aA9HKslJ0h0',
      description: 'Shreyas shares his most impactful frameworks for product management',
      duration_seconds: 5400,
      duration: '1:30:00',
      view_count: 456000,
      channel: "Lenny's Podcast",
      topics: ['Frameworks', 'Prioritization', 'Execution', 'Career'],
      transcript: `
Lenny: You've created so many frameworks that PMs use. Let's start with LNO. Can you explain it?

Shreyas Doshi: LNO stands for Leverage, Neutral, and Overhead. It's a way to categorize your tasks by impact.

Leverage tasks are the 10-20% of things that create disproportionate value. These might be the strategic decisions, the key conversations, the work that moves the needle.

Neutral tasks are the 60-70% - necessary work that maintains the status quo. Status updates, regular meetings, documentation.

Overhead is the 10-20% that's pure waste. Formatting slides, unnecessary meetings, tasks that could be automated or eliminated.

The insight is that most people spend too much time on Neutral and Overhead, and not enough on Leverage. They feel busy but don't move things forward.

Lenny: How do you identify Leverage tasks?

Shreyas Doshi: Ask yourself: if I only had 2 hours today, what would I do? That's probably your highest leverage work.

Another way: what task, if done well, would make other tasks unnecessary? That's Leverage.

The problem is Leverage tasks are often uncomfortable. They require thinking, confrontation, decisions. So we escape into Neutral tasks that feel productive but aren't.

Lenny: Tell me about pre-mortems.

Shreyas Doshi: A pre-mortem is simple but powerful. Before you start a project, imagine it's 6 months later and the project has failed. Now, write down all the reasons why it failed.

It's easier to predict failure in hindsight than to predict success. By imagining the project has failed, you surface risks you wouldn't otherwise think about.

Then you address those risks upfront. Maybe you realize the biggest risk is unclear requirements, so you invest more in discovery. Or the risk is a key dependency, so you de-risk that early.

Lenny: You talk a lot about "high agency." What does that mean?

Shreyas Doshi: High agency means you believe you can affect outcomes regardless of circumstances. You don't wait for permission. You don't blame external factors.

Low agency people say "I couldn't do X because of Y." High agency people say "Despite Y, I found a way to do X."

The best PMs I've worked with are relentlessly high agency. When they hit obstacles, they find creative solutions. They don't accept "that's just how it is."

The good news is agency is learnable. You build it by taking action, seeing results, and expanding your sense of what's possible.

Lenny: How does this relate to being opinionated?

Shreyas Doshi: High agency PMs are opinionated about the product. They have a point of view. They're not just facilitators waiting for consensus.

This doesn't mean being a dictator. You listen, you consider other views, you might be wrong. But you have a perspective and you advocate for it.

Too many PMs are "political" in the wrong way - they figure out what their manager wants and advocate for that. That's low agency. High agency means advocating for what you believe is right.
      `.trim(),
      folder: 'shreyas-doshi',
    },
    {
      id: 'april-dunford',
      guest: 'April Dunford',
      title: 'Positioning: How to make your product stand out',
      youtube_url: 'https://www.youtube.com/watch?v=MHZpLNwj6Gc',
      video_id: 'MHZpLNwj6Gc',
      description: 'April shares her framework for product positioning',
      duration_seconds: 4200,
      duration: '1:10:00',
      view_count: 234000,
      channel: "Lenny's Podcast",
      topics: ['Positioning', 'Marketing', 'Go-to-Market', 'B2B'],
      transcript: `
Lenny: Let's talk about positioning. What exactly is it?

April Dunford: Positioning is context setting. It's how you define what your product is, who it's for, and why they should care.

Think about it like walking into a grocery store. If I hand you a bottle with no label, you don't know if it's water, vodka, or cleaning fluid. The label provides context that shapes your expectations.

Products are the same. Your positioning tells customers how to think about your product. Without good positioning, customers either ignore you or misunderstand you.

Lenny: What's your framework for positioning?

April Dunford: There are 5 components:

First, competitive alternatives. What would customers use if you didn't exist? This isn't always direct competitors - sometimes it's spreadsheets, manual processes, or doing nothing.

Second, unique attributes. What do you have that alternatives don't? Be specific and honest.

Third, value. Why do those unique attributes matter to customers? Connect features to outcomes.

Fourth, target market. Who cares most about your value? Start narrow - the customers who absolutely need what you offer.

Fifth, market category. What type of product are you? This sets expectations and determines who you're compared to.

Lenny: Can you give an example?

April Dunford: Sure. Let's say you have a database product that's really fast for analytics workloads.

Competitive alternative might be traditional databases like PostgreSQL.

Unique attribute: 10x faster for analytics queries.

Value: Get insights faster, make better decisions.

Target market: Data teams at mid-size companies with big analytical workloads.

Market category: This is where it gets interesting. You could position as a "database" and compete with Postgres. Or as an "analytics platform" and compete with Looker. Or as a "data warehouse" and compete with Snowflake.

Each choice changes who you're compared to and what customers expect.

Lenny: How do you know if your positioning is wrong?

April Dunford: The biggest sign is when customers "get it" only after a long explanation. If you have to spend 30 minutes explaining what you do, your positioning isn't working.

Another sign: customers compare you to the wrong things. If they keep saying "oh, you're like X" and X is completely wrong, you have a positioning problem.

The fix is usually to get clearer on who your best customers are. Find the people who love you and understand why. Your positioning should be built around what makes you special to them, not what you think makes you special in general.
      `.trim(),
      folder: 'april-dunford',
    },
    {
      id: 'elena-verna',
      guest: 'Elena Verna',
      title: 'PLG, product-led sales, and growth loops',
      youtube_url: 'https://www.youtube.com/watch?v=utWr9sqNtHU',
      video_id: 'utWr9sqNtHU',
      description: 'Elena shares her expertise on product-led growth',
      duration_seconds: 5400,
      duration: '1:30:00',
      view_count: 267000,
      channel: "Lenny's Podcast",
      topics: ['PLG', 'Growth', 'B2B', 'Freemium'],
      transcript: `
Lenny: Let's start with the basics. What is PLG?

Elena Verna: PLG - Product-Led Growth - is a go-to-market motion where the product is the primary driver of acquisition, conversion, and expansion.

But here's the thing people get wrong: PLG is not a business model. It's a motion. You can be PLG and still have a sales team. You can be PLG and charge money. It's about how you acquire and convert customers, not whether you charge.

Lenny: How is it different from traditional SaaS?

Elena Verna: In traditional SaaS, the sales team is the front door. They reach out, demo, negotiate, close. The product comes after the sale.

In PLG, the product is the front door. Users sign up, try the product, experience value, and then maybe talk to sales for enterprise features.

The key difference is time-to-value. In PLG, users get value before talking to anyone. In sales-led, value is promised but delivered later.

Lenny: What about freemium vs free trial?

Elena Verna: This is a big decision. Free trial gives full access for limited time. Freemium gives limited access for unlimited time.

My general advice: freemium usually wins. Here's why.

With a free trial, you're creating urgency. But urgency only works if users experience value quickly. Most products take time to learn. A 14-day trial isn't enough.

With freemium, users can take their time. They build habits. They integrate you into their workflow. Then they hit a limit and upgrade.

The exception is products with immediate, obvious value. If someone can experience your full value in one session, free trial works.

Lenny: You've talked about product-led sales. What's that?

Elena Verna: Product-led sales is when your sales team focuses on users who've already shown intent through product usage.

Instead of cold outreach, sales sees: "This company has 50 users, they've hit our collaboration limits 3 times, they've viewed our enterprise page." That's a qualified lead.

It's the best of both worlds. Self-serve for smaller customers and those who prefer it. Sales for larger customers and complex deals. But sales is helping convert existing users, not finding new ones.

Lenny: How do you know if PLG is right for your product?

Elena Verna: Ask these questions:

Can users experience meaningful value without help? If your product requires implementation or training, PLG is harder.

Is your target buyer also the user? If you're selling to CIOs who don't use the product themselves, PLG is harder.

Can the product spread virally within an organization? Best PLG products have natural collaboration or sharing.

Not everything should be PLG. Complex enterprise software, high-touch professional services - traditional sales can work better.

But if you CAN be PLG, you probably should. The economics are better. Customer acquisition cost is lower. Customers who convert through product usage retain better.
      `.trim(),
      folder: 'elena-verna',
    },
    {
      id: 'marty-cagan',
      guest: 'Marty Cagan',
      title: 'Empowered product teams vs feature teams',
      youtube_url: 'https://www.youtube.com/watch?v=6brcYFNlS3I',
      video_id: '6brcYFNlS3I',
      description: 'Marty explains what makes great product teams',
      duration_seconds: 4800,
      duration: '1:20:00',
      view_count: 345000,
      channel: "Lenny's Podcast",
      topics: ['Product Teams', 'Empowerment', 'Leadership', 'Discovery'],
      transcript: `
Lenny: You make a strong distinction between product teams and feature teams. What's the difference?

Marty Cagan: A feature team is told what to build. They're given requirements, specs, a roadmap. Their job is to ship features on time.

An empowered product team is given problems to solve. They're given outcomes to achieve. How they achieve those outcomes is up to them.

The difference is profound. Feature teams are executing someone else's ideas. Empowered teams are discovering and delivering solutions.

Lenny: Why does this matter?

Marty Cagan: Because the best ideas rarely come from executives making roadmaps. They come from engineers and designers who are close to the technology and the users.

When you have feature teams, you waste that potential. Smart people are reduced to coding specs they had no input on.

When you have empowered teams, you unlock that potential. Smart people apply their expertise to finding the best solution.

Lenny: How do you empower a team?

Marty Cagan: First, give them a meaningful outcome to own. Not "build feature X" but "improve conversion from trial to paid by 20%."

Second, give them context. They need to understand the strategy, the customers, the constraints. Otherwise they can't make good decisions.

Third, give them trust. Let them fail. Let them explore. Don't second-guess every decision.

Fourth, give them time. Discovery takes time. Innovation takes time. If they're 100% in delivery mode, there's no space for creativity.

Lenny: What about discovery? You've said it's the most important PM skill.

Marty Cagan: Discovery is figuring out what to build. It's answering: is this problem worth solving? Will our solution actually solve it? Can we build it? Will people buy it?

Most teams skip discovery and jump to delivery. They assume the requirements are right. They assume their solution will work.

Then they spend 6 months building something nobody wants. That's the most expensive kind of failure.

Good discovery involves rapid experimentation. Prototypes, user tests, data analysis. You want to learn fast and cheap, before you build slow and expensive.

Lenny: Some teams say they don't have time for discovery.

Marty Cagan: That's backwards. Teams that don't do discovery waste time building the wrong things.

Think about it: if you spend 2 weeks doing discovery and avoid building the wrong feature, you've saved months.

The teams that claim they don't have time are usually the busiest teams, shipping the most features, having the least impact. They're efficient at the wrong things.
      `.trim(),
      folder: 'marty-cagan',
    },
  ];
  
  // Process and save sample data
  const allSegments = [];
  sampleEpisodes.forEach(episode => {
    const segments = chunkTranscript(episode);
    allSegments.push(...segments);
  });
  
  // Save sample episodes
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'episodes.json'),
    JSON.stringify(sampleEpisodes, null, 2)
  );
  
  // Save sample segments
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'segments.json'),
    JSON.stringify(allSegments, null, 2)
  );
  
  // Save stats
  const stats = {
    total_episodes: sampleEpisodes.length,
    total_segments: allSegments.length,
    topics: {},
    guests: sampleEpisodes.map(e => e.guest),
    is_sample_data: true,
    processed_at: new Date().toISOString(),
  };
  
  sampleEpisodes.forEach(ep => {
    ep.topics.forEach(topic => {
      stats.topics[topic] = (stats.topics[topic] || 0) + 1;
    });
  });
  
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'stats.json'),
    JSON.stringify(stats, null, 2)
  );
  
  console.log(`✅ Created sample data with ${sampleEpisodes.length} episodes`);
  console.log(`💾 Saved to ${CONFIG.outputDir}`);
  console.log('\n📋 Sample data includes:');
  sampleEpisodes.forEach(ep => {
    console.log(`   • ${ep.guest}: ${ep.title}`);
  });
}

// Run ingestion
ingest().catch(console.error);
