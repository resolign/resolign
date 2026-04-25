
import fs from 'fs';
import path from 'path';

// Force dotenv to also load .env.local if it exists
try {
  const envLocal = fs.readFileSync(path.resolve(process.cwd(), '.env.local'));
  const envLocalParsed = Object.fromEntries(
    envLocal.toString().split('\n').filter(Boolean).map(l => {
      const parts = l.split('=');
      return [parts[0].trim(), parts.slice(1).join('=').trim()];
    })
  );
  if (envLocalParsed.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = envLocalParsed.GEMINI_API_KEY;
  }
} catch (e) {}

import { GoogleGenAI } from '@google/genai';
import db from './src/lib/db';
import bcrypt from 'bcrypt';

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY 
});

const profiles = [
  // Category 1: Tech / Startups
  { username: 'tech_founder', bio: 'Building the next generation of decentralized AI platforms. Obsessed with scalability, coffee, and late-night coding sessions.' },
  { username: 'hacker_dude19', bio: 'Cybersecurity enthusiast and white-hat hacker. I live in the terminal and dream in bash scripts. Always exploring zero-days.' },
  { username: 'react_ninja', bio: 'Frontend architect specializing in React and Next.js. I care deeply about accessibility, sleek UI animations, and atomic state management.' },
  { username: 'devops_wizard', bio: 'Kubernetes guru. I automate infrastructure and ensure 99.999% uptime. Terraform is my weapon of choice.' },
  { username: 'product_visionary', bio: 'Product Manager who bridges the gap between engineering and user empathy. Believes software should be as intuitive as breathing.' },
  { username: 'data_cruncher', bio: 'Data scientist turning raw noise into actionable insights. Python, Pandas, and Neural Networks form the core of my daily routine.' },
  { username: 'crypto_degenerate', bio: 'Full-time DeFi farmer. Analyzing smart contracts, chasing yield, and building Web3 protocols that disrupt traditional finance.' },
  { username: 'linux_purist', bio: 'Arch Linux user. I compile my own kernel and heavily customize my window manager. The command line is absolute power.' },
  { username: 'open_source_contributor', bio: 'Passionate about free software. I spend my weekends submitting PRs to major repositories and fostering community growth.' },
  { username: 'agile_scrum_master', bio: 'Organizing chaos into sprints. I love Jira, burndown charts, and making engineering teams wildly efficient and happy.' },

  // Category 2: Art / Creatives
  { username: 'oil_painter_77', bio: 'Abstract expressionist painter. I use bold colors and heavy brush strokes to capture raw human emotion.' },
  { username: 'digital_sculptor', bio: '3D artist working in Blender and ZBrush. Creating surreal environments and character models for indie game studios.' },
  { username: 'indie_filmmaker', bio: 'Cinematographer and director chasing the perfect shot. Analog film enthusiast with a deep love for dramatic lighting and visual storytelling.' },
  { username: 'graphic_designer_pro', bio: 'Brand identity designer. I believe in minimalism, perfect kerning, and negative space.' },
  { username: 'music_producer_x', bio: 'Electronic music producer. Synthesizers, drum machines, and heavy sub-bass drive my creative flow.' },
  { username: 'fashion_designer', bio: 'Avant-garde fashion designer. Exploring the intersection of wearable tech and sustainable, biodegradable fabrics.' },
  { username: 'street_photographer', bio: 'Capturing candid moments in urban environments. My camera is an extension of my eye, revealing the hidden beauty in chaos.' },
  { username: 'poetry_soul', bio: 'Spoken word poet and lyricist. Using rhythm and metaphor to heal, challenge norms, and explore modern existentialism.' },
  { username: 'calligraphy_artist', bio: 'Mastering the ancient art of ink and brush. Finding meditation in every perfectly balanced stroke.' },
  { username: 'concept_artist', bio: 'Worldbuilder for sci-fi and fantasy. Painting alien landscapes and futuristic megacities in Photoshop.' },

  // Category 3: Philosophy / Writers / Thinkers
  { username: 'stoic_reader', bio: 'Avid reader of Marcus Aurelius and Seneca. Applying ancient stoic wisdom to navigate the complexities of modern life.' },
  { username: 'existential_dread', bio: 'Navigating the absurd through the lens of Camus and Sartre. Life has no inherent meaning, so we must invent it.' },
  { username: 'history_buff', bio: 'Fascinated by the fall of the Roman Empire and the Industrial Revolution. History doesn\'t repeat, but it rhymes.' },
  { username: 'novel_writer', bio: 'Writing a 100k-word fantasy epic. Worldbuilding, character arcs, and battling writer\'s block daily.' },
  { username: 'ethics_professor', bio: 'Academic exploring the moral implications of Artificial Intelligence and genetic engineering on future society.' },
  { username: 'mindful_meditator', bio: 'Practicing Vipassana meditation. Seeking ego dissolution and deeply present awareness in every breathing moment.' },
  { username: 'sociology_student', bio: 'Analyzing the mechanics of crowd behavior, social media echo chambers, and modern tribalism.' },
  { username: 'astrophysics_nerd', bio: 'Staring into the cosmic microwave background. Fascinated by black holes, string theory, and our tiny place in the universe.' },
  { username: 'political_analyst', bio: 'Studying geopolitical shifts, economic policies, and the complex web of global diplomacy.' },
  { username: 'journalism_hound', bio: 'Investigative reporter unearthing hidden truths. Believes a robust free press is the cornerstone of a functional democracy.' },

  // Category 4: Gaming / Nerds
  { username: 'esports_pro', bio: 'Top 500 competitive FPS player. Reflexes, positioning, and team communication are my entire world.' },
  { username: 'rpg_grinder', bio: 'MMORPG veteran. I min-max my stats, lead 40-man raids, and care way too much about virtual economies.' },
  { username: 'speedrunner', bio: 'Breaking games apart to complete them in record time. Frame-perfect glitches and route optimization are my passion.' },
  { username: 'retro_collector', bio: 'Preserving video game history. Owner of 400+ physical cartridges and original CRT monitors for the authentic experience.' },
  { username: 'tabletop_dm', bio: 'Dungeon Master who spends hours crafting intricate D&D campaigns, painting miniatures, and doing terrible NPC voices.' },
  { username: 'card_game_shark', bio: 'Magic: The Gathering competitive player. I calculate probabilities, track the meta, and love a good control deck.' },
  { username: 'indie_game_dev', bio: 'Solo developer working in Unity. Making quirky, narrative-driven puzzle games with pixel art.' },
  { username: 'lore_master', bio: 'I read every single in-game book and item description. I can explain the entire Dark Souls timeline from memory.' },
  { username: 'fighting_game_god', bio: 'Arcade stick warrior. Analyzing hitboxes, frame data, and executing flawless parries under pressure.' },
  { username: 'cozy_gamer', bio: 'Farming simulators, life builders, and chill puzzle games. Just looking for a relaxing escape from reality.' },

  // Category 5: Fitness / Health / Outdoors
  { username: 'marathon_runner', bio: 'Endurance athlete. Waking up at 4 AM to log 20 miles. Chasing the runner\'s high and pushing past exhaustion.' },
  { username: 'powerlifter_x', bio: 'Chasing the 1000lb club. Squat, bench, deadlift. Form, progressive overload, and a massive caloric surplus.' },
  { username: 'yoga_instructor', bio: 'Vinyasa flow teacher. Aligning breath with movement to cultivate flexibility, strength, and inner peace.' },
  { username: 'rock_climber', bio: 'Bouldering and lead climbing. Solving physical puzzles on the wall and hanging on by my fingertips.' },
  { username: 'nutrition_coach', bio: 'Optimizing human performance through macros, micronutrients, and evidence-based dietary protocols.' },
  { username: 'wild_backpacker', bio: 'Thru-hiking the Appalachian trail. Carrying my entire life on my back and sleeping under the stars.' },
  { username: 'bjj_grappler', bio: 'Brazilian Jiu-Jitsu practitioner. Human chess. Embracing the grind, the tap, and the continuous learning process.' },
  { username: 'calisthenics_beast', bio: 'Street workout enthusiast. Mastering the front lever, muscle-up, and planche using only bodyweight mechanics.' },
  { username: 'surf_bum', bio: 'Chasing the perfect wave. Reading the ocean swells, understanding the tides, and living a minimalist coastal life.' },
  { username: 'cycle_tourist', bio: 'Riding my bicycle across continents. Experiencing the world at 15mph is the only true way to see it.' },
];

async function run() {
  console.log("Starting Dummy Account Seeder...");
  if (!process.env.GEMINI_API_KEY) {
    console.error("ERROR: No GEMINI_API_KEY found in environment.");
    process.exit(1);
  }

  // Pre-hash a default password ("password")
  const defaultPassword = 'password';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  let successCount = 0;

  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];
    
    // Check if user already exists
    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE username = ?',
      args: [profile.username]
    });
    
    if (existing.rows.length > 0) {
      console.log(`[${i+1}/${profiles.length}] Skipping @${profile.username} (Already exists)`);
      continue;
    }

    try {
      console.log(`[${i+1}/${profiles.length}] Generating AI Embedding for @${profile.username}...`);
      
      const response = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: profile.bio,
        config: { outputDimensionality: 256 }
      });
      
      const embeddingStr = JSON.stringify(response.embeddings[0].values);

      await db.execute({
        sql: `INSERT INTO users (username, passwordHash, bio, embedding, want_bio, want_embedding, contact_info, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [
          profile.username, 
          hashedPassword, 
          profile.bio, 
          embeddingStr, 
          null, // want_bio null
          null, // want_embedding null
          'hello@' + profile.username + '.com'
        ]
      });

      console.log(` -> Inserted @${profile.username}`);
      successCount++;
    } catch (e: any) {
      console.error(` -> ERROR on @${profile.username}:`, e.message);
    }
    
    // sleep specifically to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\\nSeeding Complete! Successfully inserted ${successCount} dummy accounts.`);
  
  const total = await db.execute('SELECT count(*) as count FROM users');
  console.log(`Total users in database: ${total.rows[0].count}`);
  process.exit(0);
}

run();
