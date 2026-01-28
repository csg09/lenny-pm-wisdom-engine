# 🧠 PM Wisdom Engine

> **Search 300+ Lenny's Podcast episodes for product management wisdom**

An intelligent knowledge base that extracts insights, frameworks, and advice from Lenny's Podcast transcripts. Features a **Decision Simulator** that matches your situation to relevant guest advice, and a **Career Stage Filter** to surface content for your experience level.

![PM Wisdom Engine](https://img.shields.io/badge/Episodes-300+-blue)
![Frameworks](https://img.shields.io/badge/Frameworks-14+-purple)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

### 🎯 Decision Simulator
Describe your situation in plain English and get relevant advice from guests who faced similar challenges.

```
"Our growth has slowed to 5% MoM. Should we expand to new markets or double down on our core?"
```
→ Returns relevant quotes from Elena Verna, Casey Winters, and others who've tackled growth challenges.

### 🌱 Career Stage Filter
Filter all content by your experience level:
- 🌱 **Early PM** (0-2 years) - Fundamentals, first PM job advice
- 🌿 **Mid PM** (2-5 years) - Growth, stakeholder management
- 🌳 **Senior PM** (5+ years) - Strategy, organizational influence
- 👔 **PM Leader** - Team building, hiring, culture
- 🚀 **Founder** - PMF, fundraising, startup tactics

### 🧠 Framework Extraction
Automatically extracts 14+ named frameworks including:
- **11-Star Experience** (Brian Chesky)
- **LNO Framework** (Shreyas Doshi)
- **DHM Framework** (Gibson Biddle)
- **Jobs To Be Done** (Clayton Christensen)
- **Continuous Discovery** (Teresa Torres)
- And more...

### ⚡ Expert Contradictions
See where successful PMs disagree:
- Move Fast vs Get It Right
- Data-Driven vs Intuition
- Hire Specialists vs Generalists
- Delegation vs Staying in Details

Each debate includes a "💡 The Real Answer" explaining when each approach works.

### 🔍 Full-Text Search
Search across 5,000+ transcript segments with timestamp links to exact YouTube moments.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [Git](https://git-scm.com/)

### Installation

```bash
# Clone this repo
git clone https://github.com/YOUR_USERNAME/pm-wisdom-engine.git
cd pm-wisdom-engine

# Install dependencies
npm install

# Run the full pipeline (takes 2-5 minutes)
npm run all

# Open the app
# Windows:
start dist\pm-wisdom-engine.html
# Mac:
open dist/pm-wisdom-engine.html
```

### What `npm run all` does:
1. **Clones** 300+ transcripts from [ChatPRD/lennys-podcast-transcripts](https://github.com/ChatPRD/lennys-podcast-transcripts)
2. **Parses** episodes and extracts metadata
3. **Chunks** transcripts into searchable segments
4. **Extracts** frameworks with context
5. **Finds** contradictions between guests
6. **Builds** the single-file HTML app

---

## 📁 Project Structure

```
pm-wisdom-engine/
├── scripts/
│   ├── ingest.js              # Clone & parse transcripts
│   ├── extract-frameworks.js  # Extract named frameworks
│   ├── find-contradictions.js # Find opposing viewpoints
│   └── build-app.js           # Bundle into single HTML
├── src/
│   └── app.html               # Application template
├── data/                      # Generated JSON files
│   ├── episodes.json
│   ├── segments.json
│   ├── frameworks.json
│   ├── contradictions.json
│   └── insights.json
├── dist/
│   └── pm-wisdom-engine.html  # Final app (open this!)
└── package.json
```

---

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run all` | Run complete pipeline |
| `npm run ingest` | Clone and parse transcripts |
| `npm run extract` | Extract frameworks |
| `npm run contradictions` | Find expert disagreements |
| `npm run build` | Build the HTML app |

---

## 🎮 Using the Decision Simulator

1. Go to **🎯 Decision Simulator** in the sidebar
2. Describe your situation:
   ```
   I'm a PM at a Series B startup. We have traction but growth is slowing.
   Should we expand to new markets or double down on our core product?
   ```
3. Select your **career stage** and **company stage**
4. Click **"🔮 Find Relevant Wisdom"**
5. Get matched advice with relevance scores and YouTube links

### Example Prompts to Try:
- "How should I approach pricing for my SaaS product?"
- "How do I know if we have product-market fit?"
- "Should I hire specialists or generalists for my team?"
- "My CEO keeps overriding my roadmap. How do I push back?"

---

## 📊 Data Sources

- **Transcripts:** [ChatPRD/lennys-podcast-transcripts](https://github.com/ChatPRD/lennys-podcast-transcripts) (300+ episodes)
- **Podcast:** [Lenny's Podcast](https://www.lennyspodcast.com/)

---

## 🙏 Credits

- **[Lenny Rachitsky](https://www.lennysnewsletter.com/)** - For creating an incredible resource for product managers
- **[ChatPRD](https://github.com/ChatPRD)** - For transcribing and open-sourcing the transcripts
- **All the amazing guests** - Whose wisdom makes this project valuable

---

## 📜 License

MIT License - feel free to use, modify, and distribute.

---

## 🤝 Contributing

Contributions welcome! Ideas for improvement:
- [ ] Add more podcast sources
- [ ] Improve framework extraction accuracy
- [ ] Add guest network visualization
- [ ] Create MCP server for Claude/Cursor integration
- [ ] Add spaced repetition for learning

---

## ⭐ Star This Repo!

If you find this useful, please star the repo! It helps others discover it.

---

<p align="center">
  Built with ❤️ for the PM community
</p>
