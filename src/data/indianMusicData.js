/**
 * Indian Music Hub - Complete Data Layer
 * Covers Tamil, Malayalam, Telugu, Kannada, Hindi, English
 * Spanning 1980 to 2026 with BGM support
 */

// ─── Language Configuration ──────────────────────────────────────
export const ALL_LANGUAGES = [
  { id: 'all', name: 'All Languages', icon: '🌍', color: '#FF6B00' },
  { id: 'tamil', name: 'Tamil', icon: '🎵', color: '#e11d48' },
  { id: 'telugu', name: 'Telugu', icon: '🎸', color: '#d97706' },
  { id: 'malayalam', name: 'Malayalam', icon: '🎶', color: '#10b981' },
  { id: 'kannada', name: 'Kannada', icon: '🥁', color: '#8b5cf6' },
  { id: 'hindi', name: 'Hindi', icon: '🎹', color: '#3b82f6' },
  { id: 'punjabi', name: 'Punjabi', icon: '🎺', color: '#f59e0b' },
  { id: 'bengali', name: 'Bengali', icon: '🪕', color: '#06b6d4' },
  { id: 'marathi', name: 'Marathi', icon: '🪘', color: '#ec4899' },
  { id: 'english', name: 'English', icon: '🎧', color: '#a855f7' }
];

// ─── Decade Filters ──────────────────────────────────────────────
export const DECADE_FILTERS = [
  { id: 'all', label: 'All Eras', range: [1980, 2026] },
  { id: '1980s', label: '1980s', range: [1980, 1989] },
  { id: '1990s', label: '1990s', range: [1990, 1999] },
  { id: '2000s', label: '2000s', range: [2000, 2009] },
  { id: '2010s', label: '2010s', range: [2010, 2019] },
  { id: '2020s', label: '2020s', range: [2020, 2026] }
];

// ─── Category Filters ────────────────────────────────────────────
export const CATEGORY_FILTERS = [
  { id: 'all', label: '🎵 All', color: '#FF6B00' },
  { id: 'songs', label: '🎤 Songs', color: '#3b82f6' },
  { id: 'bgm', label: '🎬 BGMs', color: '#8b5cf6' }
];

// ─── Music Directors - All Languages ─────────────────────────────
export const ALL_DIRECTORS = [
  // ──── TAMIL DIRECTORS ────
  {
    id: "dir-arr", name: "A.R. Rahman", language: "tamil",
    tagline: "Isai Puyal • Oscar & Grammy Winner",
    coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    color: "#e11d48",
    bio: "Oscar, Grammy, and National Award-winning maestro who redefined Indian film music globally."
  },
  {
    id: "dir-anirudh", name: "Anirudh Ravichander", language: "tamil",
    tagline: "Rockstar • Chartbuster Hitmaker",
    coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    color: "#FF6B00",
    bio: "The high-octane rockstar dominating Tamil & Pan-Indian cinema with explosive mass anthems."
  },
  {
    id: "dir-harris", name: "Harris Jayaraj", language: "tamil",
    tagline: "Melody King • Romantic Harmonies",
    coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
    color: "#3b82f6",
    bio: "The king of urban romance, acoustic guitars, and timeless love melodies of the 2000s."
  },
  {
    id: "dir-ilaiyaraaja", name: "Ilaiyaraaja", language: "tamil",
    tagline: "Isaignani • Symphonic Legend",
    coverUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80",
    color: "#d97706",
    bio: "Legendary Maestro with 7,000+ compositions blending Indian folk with Western orchestration since 1976."
  },
  {
    id: "dir-yuvan", name: "Yuvan Shankar Raja", language: "tamil",
    tagline: "U1 • BGM King & Youth Icon",
    coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
    color: "#8b5cf6",
    bio: "Pioneer of Tamil hip-hop, electronic beats, iconic background scores, and cult youth tracks."
  },
  {
    id: "dir-gvp", name: "G.V. Prakash Kumar", language: "tamil",
    tagline: "Acoustic Maestro • Folk & Fusion",
    coverUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80",
    color: "#10b981",
    bio: "Prolific composer-actor delivering raw emotional acoustics, folk rhythms, and power tracks."
  },
  {
    id: "dir-sana", name: "Santhosh Narayanan", language: "tamil",
    tagline: "SaNa • Experimental & Folk Pioneer",
    coverUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80",
    color: "#ec4899",
    bio: "Innovator fusing Gaana, Street Folk, Jazz brass, and basslines into modern masterpieces."
  },
  {
    id: "dir-dimman", name: "D. Imman", language: "tamil",
    tagline: "Folk Fusion • Mass Entertainer",
    coverUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80",
    color: "#f59e0b",
    bio: "National Award winner known for rousing folk compositions and devotional melodies."
  },
  {
    id: "dir-hht", name: "Hiphop Tamizha", language: "tamil",
    tagline: "Independent Music • Youth Anthem",
    coverUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=600&q=80",
    color: "#6366f1",
    bio: "Tamil independent music revolution — hip-hop, folk fusion, and viral youth anthems."
  },
  {
    id: "dir-vidyasagar", name: "Vidyasagar", language: "tamil",
    tagline: "Melody Maestro • Tamil & Malayalam",
    coverUrl: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=600&q=80",
    color: "#0ea5e9",
    bio: "Versatile maestro known for soul-stirring melodies across Tamil and Malayalam cinema."
  },
  {
    id: "dir-deva", name: "Deva", language: "tamil",
    tagline: "Gaana King • Mass Music Icon",
    coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    color: "#ef4444",
    bio: "The undisputed king of Tamil Gaana music and mass kuthu beats of the 90s and 2000s."
  },
  {
    id: "dir-sean", name: "Sean Roldan", language: "tamil",
    tagline: "Indie Fusion • Modern Tamil",
    coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
    color: "#14b8a6",
    bio: "Independent music artist blending Carnatic, Jazz, and contemporary sounds for new-age Tamil cinema."
  },
  {
    id: "dir-ghibran", name: "Ghibran", language: "tamil",
    tagline: "Symphonic Innovator • Vishwaroopam & Ratchasan",
    coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    color: "#0284c7",
    bio: "Renowned composer acclaimed for atmospheric film scoring and orchestral brilliance in Ratchasan, Vishwaroopam II, and Papanasam."
  },

  // ──── MALAYALAM DIRECTORS ────
  {
    id: "dir-sushin", name: "Sushin Shyam", language: "malayalam",
    tagline: "Malayalam New Wave • Aavesham",
    coverUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80",
    color: "#10b981",
    bio: "The trendsetter of Malayalam cinema bringing electronic synthwaves and viral hit tracks."
  },
  {
    id: "dir-mjayachandran", name: "M. Jayachandran", language: "malayalam",
    tagline: "Melody Emperor • Soulful Composer",
    coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    color: "#0ea5e9",
    bio: "The melody emperor of Malayalam cinema with National Award-winning compositions."
  },
  {
    id: "dir-gopisundar", name: "Gopi Sundar", language: "malayalam",
    tagline: "Premam Fame • Romantic Maestro",
    coverUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80",
    color: "#6366f1",
    bio: "Chart-topping Malayalam composer behind Premam, Bangalore Days, and romantic blockbusters."
  },
  {
    id: "dir-ouseppachan", name: "Ouseppachan", language: "malayalam",
    tagline: "90s Legend • Synth Pioneer",
    coverUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80",
    color: "#d97706",
    bio: "Iconic 90s Malayalam composer who pioneered synthesizer-heavy arrangements in Indian cinema."
  },
  {
    id: "dir-mgradhakrishnan", name: "M.G. Radhakrishnan", language: "malayalam",
    tagline: "Classic Maestro • Golden Era",
    coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    color: "#a855f7",
    bio: "Legendary Malayalam music director from the golden era of Kerala cinema."
  },
  {
    id: "dir-bijibal", name: "Bijibal", language: "malayalam",
    tagline: "Indie Spirit • Alternative Sounds",
    coverUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80",
    color: "#f43f5e",
    bio: "Indie music pioneer bringing alternative and experimental sounds to Malayalam cinema."
  },

  // ──── TELUGU DIRECTORS ────
  {
    id: "dir-keeravani", name: "M.M. Keeravani", language: "telugu",
    tagline: "Oscar Winner • RRR & Baahubali",
    coverUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80",
    color: "#d97706",
    bio: "Oscar & Golden Globe winning Telugu maestro behind Naatu Naatu and Baahubali epics."
  },
  {
    id: "dir-dsp", name: "Devi Sri Prasad (DSP)", language: "telugu",
    tagline: "Rockstar • Pushpa & Mass Beats",
    coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
    color: "#FF6B00",
    bio: "High energy music director behind Pushpa, Srimanthudu, and Ringa Ringa."
  },
  {
    id: "dir-thaman", name: "S.S. Thaman", language: "telugu",
    tagline: "Blockbuster King • Ala Vaikunthapurramuloo",
    coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    color: "#3b82f6",
    bio: "Prolific Telugu composer behind mega-blockbuster soundtracks and viral dance numbers."
  },
  {
    id: "dir-mickey", name: "Mickey J Meyer", language: "telugu",
    tagline: "Melody Specialist • Romantic Hits",
    coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
    color: "#8b5cf6",
    bio: "Telugu cinema's go-to melody specialist known for soulful romantic compositions."
  },
  {
    id: "dir-manisharma", name: "Mani Sharma", language: "telugu",
    tagline: "Mass King • 90s-2000s Legend",
    coverUrl: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=600&q=80",
    color: "#ef4444",
    bio: "The mass music king of Telugu cinema with 150+ blockbuster albums spanning two decades."
  },
  {
    id: "dir-anuprubens", name: "Anup Rubens", language: "telugu",
    tagline: "Youth Music • Telugu Pop",
    coverUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=600&q=80",
    color: "#0ea5e9",
    bio: "Known for youthful, peppy compositions that define modern Telugu pop music."
  },

  // ──── KANNADA DIRECTORS ────
  {
    id: "dir-harikrishna", name: "V. Harikrishna", language: "kannada",
    tagline: "Sandalwood Legend • Folk Power",
    coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    color: "#16a34a",
    bio: "Late legendary Kannada composer who revolutionized Sandalwood music with folk-driven scores."
  },
  {
    id: "dir-ravibasrur", name: "Ravi Basrur", language: "kannada",
    tagline: "KGF Fame • Pan-India Sensation",
    coverUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80",
    color: "#ef4444",
    bio: "The man behind KGF's thunderous BGMs and Salaar — redefining Indian film scores globally."
  },
  {
    id: "dir-arjunjanya", name: "Arjun Janya", language: "kannada",
    tagline: "Versatile • Modern Sandalwood",
    coverUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80",
    color: "#8b5cf6",
    bio: "Versatile Kannada composer delivering both mass entertainers and soulful melodies."
  },
  {
    id: "dir-gurukiran", name: "Gurukiran", language: "kannada",
    tagline: "90s Icon • Upendra & Hits",
    coverUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80",
    color: "#f59e0b",
    bio: "Iconic 90s-2000s Kannada composer who delivered cult classics for Upendra and Darshan."
  },
  {
    id: "dir-hamsalekha", name: "Hamsalekha", language: "kannada",
    tagline: "Sandalwood OG • Legendary Pioneer",
    coverUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80",
    color: "#d97706",
    bio: "The godfather of modern Kannada film music with 3,500+ songs and 200+ albums."
  },
  {
    id: "dir-bsajjan", name: "B. Ajaneesh Loknath", language: "kannada",
    tagline: "Kantara Fame • Folk & BGM King",
    coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    color: "#10b981",
    bio: "Composer behind Kantara's viral Varaha Roopam and groundbreaking folk-electronic fusions."
  },

  // ──── HINDI DIRECTORS ────
  {
    id: "dir-pritam", name: "Pritam", language: "hindi",
    tagline: "Bollywood Hit Machine • Melodies",
    coverUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80",
    color: "#e11d48",
    bio: "The king of modern Hindi cinema melodies, chartbusters, and romantic anthems."
  },
  {
    id: "dir-arr-hindi", name: "A.R. Rahman (Hindi)", language: "hindi",
    tagline: "Slumdog Millionaire • Rockstar",
    coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    color: "#FF6B00",
    bio: "Oscar winner's Hindi filmography — from Roja to Rockstar to Dil Se."
  },
  {
    id: "dir-amittrivedi", name: "Amit Trivedi", language: "hindi",
    tagline: "Dev.D • Indie Bollywood Revolution",
    coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    color: "#6366f1",
    bio: "Indie music revolution in Bollywood — from Dev.D to Udta Punjab to Queen."
  },
  {
    id: "dir-sel", name: "Shankar-Ehsaan-Loy", language: "hindi",
    tagline: "Dil Chahta Hai • Trio of Genius",
    coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
    color: "#3b82f6",
    bio: "The iconic trio behind Dil Chahta Hai, Rock On, and Lakshya."
  },
  {
    id: "dir-vishekhar", name: "Vishal-Shekhar", language: "hindi",
    tagline: "Party Anthems • Chennai Express",
    coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
    color: "#ec4899",
    bio: "The dynamic duo of Bollywood party anthems, from Om Shanti Om to War."
  },
  {
    id: "dir-rdburman", name: "R.D. Burman", language: "hindi",
    tagline: "Pancham Da • Timeless Legend",
    coverUrl: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=600&q=80",
    color: "#d97706",
    bio: "The immortal Pancham Da — innovator of Hindi film music from the 60s to 90s."
  },
  {
    id: "dir-lp", name: "Laxmikant-Pyarelal", language: "hindi",
    tagline: "Golden Duo • 80s-90s Icons",
    coverUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80",
    color: "#a855f7",
    bio: "Most prolific Hindi film composer duo with over 700 films spanning 4 decades."
  },
  {
    id: "dir-sachinjigar", name: "Sachin-Jigar", language: "hindi",
    tagline: "Abhi Toh Party • Modern Grooves",
    coverUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=600&q=80",
    color: "#14b8a6",
    bio: "Fresh, groovy Bollywood music from ABCD to Stree — modern India's party composers."
  },

  // ──── PUNJABI DIRECTORS ────
  {
    id: "dir-bpraak", name: "B Praak", language: "punjabi",
    tagline: "Soulful Punjabi • Filhall & Teri Mitti",
    coverUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80",
    color: "#f59e0b",
    bio: "National Award-winning Punjabi composer & singer known for high-emotion ballads like Teri Mitti and Filhall."
  },
  {
    id: "dir-jaani", name: "Jaani", language: "punjabi",
    tagline: "Lyrical Genius • Modern Punjabi Anthems",
    coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
    color: "#d97706",
    bio: "The driving creative force behind 100+ viral Punjabi chartbusters, heart-wrenching melodies, and modern beats."
  },

  // ──── MARATHI DIRECTORS ────
  {
    id: "dir-ajayatul", name: "Ajay-Atul", language: "marathi",
    tagline: "Sairat & Zingaat • Symphonic Masters",
    coverUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80",
    color: "#ec4899",
    bio: "First Indian music directors to record at Sony Pictures Studios in Hollywood; creators of Sairat, Zingaat, and Tanhaji."
  },

  // ──── BENGALI DIRECTORS ────
  {
    id: "dir-jeet", name: "Jeet Gannguli", language: "bengali",
    tagline: "Melody King • Tollywood & Bollywood",
    coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    color: "#06b6d4",
    bio: "Acclaimed Bengali and Bollywood composer behind Aashiqui 2 melodies, paglu, and iconic Bengali romance albums."
  },
  {
    id: "dir-anupam", name: "Anupam Roy", language: "bengali",
    tagline: "Autograph Fame • Piku & Modern Bengali",
    coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    color: "#10b981",
    bio: "National Award-winning singer-lyricist-composer who redefined modern Bengali acoustic and indie film music."
  },

  // ──── ENGLISH ARTISTS ────
  {
    id: "dir-edsheeran", name: "Ed Sheeran", language: "english",
    tagline: "Shape of You • Global Pop Icon",
    coverUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80",
    color: "#ef4444",
    bio: "British singer-songwriter with 150 million records sold worldwide."
  },
  {
    id: "dir-taylor", name: "Taylor Swift", language: "english",
    tagline: "Pop Queen • Eras Tour",
    coverUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80",
    color: "#ec4899",
    bio: "The most powerful woman in pop music history — 14 Grammys and counting."
  },
  {
    id: "dir-weeknd", name: "The Weeknd", language: "english",
    tagline: "Blinding Lights • R&B King",
    coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    color: "#8b5cf6",
    bio: "The defining R&B voice of the 2020s — Blinding Lights, Save Your Tears."
  },
  {
    id: "dir-billie", name: "Billie Eilish", language: "english",
    tagline: "Bad Guy • Gen Z Icon",
    coverUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80",
    color: "#10b981",
    bio: "Gen Z's defining artist — dark pop, whispered vocals, and cultural revolution."
  },
  {
    id: "dir-coldplay", name: "Coldplay", language: "english",
    tagline: "Fix You • Rock Legends",
    coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
    color: "#3b82f6",
    bio: "British rock band with 100M+ records — Fix You, Yellow, Viva La Vida."
  },
  {
    id: "dir-adele", name: "Adele", language: "english",
    tagline: "Rolling in the Deep • Vocal Power",
    coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    color: "#d97706",
    bio: "16 Grammys, powerhouse vocals — the greatest ballad singer of this generation."
  }
];

// ─── Real Vocal Song Audio Pool ─────────────────────────────────
const REAL_VOCAL_AUDIO_POOL = [
  "https://archive.org/download/anirudh-hit-songs-tamil-128k/A-Love-Blossoms-Instrumental.mp3",
  "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aaacha-Paatcha-MassTamilan.com.mp3",
  "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aada%20Sonnaal.mp3",
  "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aadaatha-Manamum-MassTamilan.fm.mp3",
  "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aadi%20Sivan%20Tholil%20Irukkum.mp3",
  "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aadi-Varattum-MassTamilan.com.mp3",
  "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aadi_Pattam.mp3",
  "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aadi_Pizhaithaalum_Paadi_Pizhaithaalum_%5BMassWala.Com%5D.mp3",
  "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aadidu%20Peyygaley.mp3",
  "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aadiyae-Attam-Enna-MassTamilan.fm.mp3"
];

function getAudio(idx) {
  return REAL_VOCAL_AUDIO_POOL[idx % REAL_VOCAL_AUDIO_POOL.length];
}

const COVERS = [
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80"
];

function getCover(idx) {
  return COVERS[idx % COVERS.length];
}

const COLORS = ["#e11d48", "#FF6B00", "#3b82f6", "#8b5cf6", "#d97706", "#10b981", "#ec4899", "#6366f1", "#ef4444", "#14b8a6"];
function getColor(idx) { return COLORS[idx % COLORS.length]; }

// ─── CURATED TRACKS - All Languages & Decades ───────────────────
const RAW_CURATED_TRACKS = [
  // ── Featured Liked Songs (Exact User Screenshot Tracks) ──
  { id: "fav-loki", title: "Lokiverse 2.0", artist: "Anirudh Ravichander", director: "Anirudh Ravichander", album: "Leo (Original Motion Picture Soundtrack)", duration: "2:45", durationSec: 165, audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/60/45/bc/6045bcf3-badc-db56-d044-adf6b14b0816/mzaf_7981634368973271980.plus.aac.p.m4a", coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80", genre: "Tamil Mass", plays: "98,000,000", releaseDate: "2023", color: "#e11d48", language: "tamil", category: "bgm" },
  { id: "fav-thunder", title: "Thunder Song", artist: "Hiphop Tamizha", director: "Hiphop Tamizha", album: "Veeran (Promo) Song", duration: "3:10", durationSec: 190, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910141586967.mp3", coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80", genre: "Tamil Pop", plays: "45,000,000", releaseDate: "2023", color: "#3b82f6", language: "tamil", category: "songs" },
  { id: "fav-vantha", title: "Vantha Edam", artist: "Anirudh Ravichander", director: "Anirudh Ravichander", album: "Jawan (Tamil) Song", duration: "4:12", durationSec: 252, audioUrl: "https://aac.saavncdn.com/081/6196880f980b9239e339b4722f8b9b3d_320.mp4", coverUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=300&q=80", genre: "Tamil Dance", plays: "120,000,000", releaseDate: "2023", color: "#FF6B00", language: "tamil", category: "songs" },
  { id: "fav-arabic", title: "Arabic Kuthu", artist: "Anirudh Ravichander, Jonita Gandhi", director: "Anirudh Ravichander", album: "Beast . Anirudh Ravichander", duration: "4:39", durationSec: 279, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910621473870.mp3", coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=300&q=80", genre: "Tamil Dance", plays: "210,000,000", releaseDate: "2022", color: "#10b981", language: "tamil", category: "songs" },
  { id: "fav-varayoo", title: "Varayoo Varayoo", artist: "Harris Jayaraj, Unnikrishnan, Chinmayi", director: "Harris Jayaraj", album: "Aadhavan . Harris Jeyaraj", duration: "5:20", durationSec: 320, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910080270650.mp3", coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80", genre: "Tamil Melody", plays: "88,000,000", releaseDate: "2009", color: "#8b5cf6", language: "tamil", category: "songs" },
  { id: "fav-ordinary", title: "Ordinary Person", artist: "Anirudh Ravichander, Nikhita Gandhi", director: "Anirudh Ravichander", album: "Leo . Anirudh Ravichander", duration: "2:18", durationSec: 138, audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/60/45/bc/6045bcf3-badc-db56-d044-adf6b14b0816/mzaf_7981634368973271980.plus.aac.p.m4a", coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=300&q=80", genre: "Tamil Lo-Fi", plays: "115,000,000", releaseDate: "2023", color: "#1e3a8a", language: "tamil", category: "songs" },
  { id: "fav-kanukkulle", title: "Kanukkulle", artist: "Vishal Chandrashekhar", director: "Vishal Chandrashekhar", album: "Sita Ramam (Tamil) Song", duration: "3:45", durationSec: 225, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910091842904.mp3", coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80", genre: "Tamil Romance", plays: "78,000,000", releaseDate: "2022", color: "#0ea5e9", language: "tamil", category: "songs" },
  { id: "fav-pathala", title: "Pathala Pathala", artist: "Anirudh Ravichander, Kamal Haasan", director: "Anirudh Ravichander", album: "Vikram . Anirudh Ravichander", duration: "3:31", durationSec: 211, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910141586967.mp3", coverUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=300&q=80", genre: "Tamil Kuthu", plays: "185,000,000", releaseDate: "2022", color: "#f59e0b", language: "tamil", category: "songs" },
  { id: "fav-adheera", title: "Adheera", artist: "A.R. Rahman, Vagu Mazan", director: "A.R. Rahman", album: "Cobra . A.R.Rahman", duration: "4:02", durationSec: 242, audioUrl: "https://aac.saavncdn.com/595/86c6a67ff7120d287cb4484ea020f488_320.mp4", coverUrl: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=300&q=80", genre: "Tamil Mass", plays: "64,000,000", releaseDate: "2022", color: "#ef4444", language: "tamil", category: "songs" },
  { id: "fav-naanpizhai", title: "Naan Pizhai", artist: "Anirudh Ravichander, Shashaa Tirupati", director: "Anirudh Ravichander", album: "KRK . Anirudh Ravichander", duration: "4:01", durationSec: 241, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910140018345.mp3", coverUrl: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=300&q=80", genre: "Tamil Melody", plays: "92,000,000", releaseDate: "2022", color: "#ec4899", language: "tamil", category: "songs" },
  { id: "fav-ennaivittu", title: "Ennai Vittu (YSR) Version", artist: "Yuvan Shankar Raja", director: "Yuvan Shankar Raja", album: "Love Today . Yuvan Shankar Raja", duration: "3:58", durationSec: 238, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910091842904.mp3", coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=300&q=80", genre: "Tamil Soul", plays: "82,000,000", releaseDate: "2022", color: "#8b5cf6", language: "tamil", category: "songs" },
  { id: "fav-nenjamae", title: "Nenjamae", artist: "Anirudh Ravichander", director: "Anirudh Ravichander", album: "Doctor . Anirudh Ravichander", duration: "4:15", durationSec: 255, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910141586967.mp3", coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80", genre: "Tamil Melody", plays: "96,000,000", releaseDate: "2021", color: "#06b6d4", language: "tamil", category: "songs" },
  { id: "fav-pazham", title: "Life Of Pazham", artist: "Anirudh Ravichander", director: "Anirudh Ravichander", album: "Thiruchitrambalam . Anirudh Ravichander", duration: "3:40", durationSec: 220, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910141586967.mp3", coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=300&q=80", genre: "Tamil Folk", plays: "75,000,000", releaseDate: "2022", color: "#10b981", language: "tamil", category: "songs" },
  { id: "fav-kanja", title: "Kanja Poovu Kannala", artist: "Yuvan Shankar Raja, Sid Sriram", director: "Yuvan Shankar Raja", album: "Viruman . Yuvan Shankar Raja", duration: "4:24", durationSec: 264, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910620863586.mp3", coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80", genre: "Tamil Folk", plays: "140,000,000", releaseDate: "2022", color: "#d97706", language: "tamil", category: "songs" },
  { id: "t-80-1", title: "Ilamai Enum Poongatru", artist: "S.P.B, S. Janaki", director: "Ilaiyaraaja", album: "Pagalil Oru Iravu", duration: "5:48", durationSec: 348, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910080274220.mp3", coverUrl: getCover(0), genre: "Tamil Classic", plays: "42,000,000", releaseDate: "1980", color: getColor(0), language: "tamil", category: "songs" },
  { id: "t-80-2", title: "Poo Maalai Vaangi", artist: "S.P.B, P. Susheela", director: "Ilaiyaraaja", album: "Nizhalgal", duration: "4:52", durationSec: 292, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910142348537.mp3", coverUrl: getCover(1), genre: "Tamil Melody", plays: "38,500,000", releaseDate: "1980", color: getColor(1), language: "tamil", category: "songs" },
  { id: "t-80-3", title: "Mandram Vandha", artist: "K.J. Yesudas", director: "Ilaiyaraaja", album: "Mouna Ragam", duration: "5:22", durationSec: 322, audioUrl: getAudio(2), coverUrl: getCover(2), genre: "Tamil Classic", plays: "65,000,000", releaseDate: "1986", color: getColor(2), language: "tamil", category: "songs" },
  { id: "t-80-4", title: "Poongatre Poongatre", artist: "S.P.B, K.S. Chithra", director: "Ilaiyaraaja", album: "Oru Kaidhiyin Diary", duration: "5:10", durationSec: 310, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910400247327.mp3", coverUrl: getCover(3), genre: "Tamil Melody", plays: "31,200,000", releaseDate: "1985", color: getColor(3), language: "tamil", category: "songs" },
  { id: "t-80-5", title: "Raja Raja Cholan", artist: "K.J. Yesudas", director: "Ilaiyaraaja", album: "Rettai Vaal Kuruvi", duration: "4:32", durationSec: 272, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910142044966.mp3", coverUrl: getCover(4), genre: "Tamil Classic", plays: "41,000,000", releaseDate: "1987", color: getColor(4), language: "tamil", category: "songs" },

  // ── Tamil 1990s ──
  { id: "t-90-1", title: "Pudhu Vellai Mazhai", artist: "A.R. Rahman, Unni Menon", director: "A.R. Rahman", album: "Roja", duration: "5:15", durationSec: 315, audioUrl: "https://aac.saavncdn.com/702/a40e5b929e7a35d61fadf1beaa363036_320.mp4", coverUrl: getCover(5), genre: "Tamil Classic", plays: "55,102,000", releaseDate: "1992", color: getColor(5), language: "tamil", category: "songs" },
  { id: "t-90-2", title: "Kanmani Anbodu Kadhalan", artist: "Ilaiyaraaja, Kamal Haasan", director: "Ilaiyaraaja", album: "Gunaa", duration: "5:30", durationSec: 330, audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/1a/ab/bc/1aabbc6a-9513-4799-20be-a2780ec5a6ce/mzaf_14349479505253648692.plus.aac.p.m4a", coverUrl: getCover(6), genre: "Tamil Classic", plays: "89,200,000", releaseDate: "1991", color: getColor(6), language: "tamil", category: "songs" },
  { id: "t-90-3", title: "Muqabala Muqabala", artist: "A.R. Rahman, Mano, Swarnalatha", director: "A.R. Rahman", album: "Kadhalan", duration: "2:24", durationSec: 144, audioUrl: "https://aac.saavncdn.com/081/6196880f980b9239e339b4722f8b9b3d_320.mp4", coverUrl: getCover(7), genre: "Tamil Dance", plays: "72,000,000", releaseDate: "1994", color: getColor(7), language: "tamil", category: "songs" },
  { id: "t-90-4", title: "Uyire Uyire", artist: "A.R. Rahman, Bombay Jayashri", director: "A.R. Rahman", album: "Bombay", duration: "3:26", durationSec: 206, audioUrl: "https://aac.saavncdn.com/435/3270bb5dee6d0b9648b1d5638e9c0750_320.mp4", coverUrl: getCover(8), genre: "Tamil Melody", plays: "61,000,000", releaseDate: "1995", color: getColor(8), language: "tamil", category: "songs" },
  { id: "t-90-5", title: "Telephone Manipol", artist: "A.R. Rahman, Minmini", director: "A.R. Rahman", album: "Jeans", duration: "6:17", durationSec: 377, audioUrl: "https://aac.saavncdn.com/744/208e4b514cadc02ad9e3f8078fdf0a19_320.mp4", coverUrl: getCover(9), genre: "Tamil Pop", plays: "48,000,000", releaseDate: "1998", color: getColor(9), language: "tamil", category: "songs" },
  { id: "t-90-6", title: "Thendral Vandhu Theandum", artist: "Ilaiyaraaja, S.P.B", director: "Ilaiyaraaja", album: "Avatharam", duration: "5:12", durationSec: 312, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010912411341521.mp3", coverUrl: getCover(10), genre: "Tamil Melody", plays: "36,500,000", releaseDate: "1995", color: getColor(10), language: "tamil", category: "songs" },

  // ── Tamil 2000s ──
  { id: "t-00-1", title: "Vaseegara", artist: "Harris Jayaraj, Bombay Jayashri", director: "Harris Jayaraj", album: "Minnale", duration: "5:01", durationSec: 301, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910080270650.mp3", coverUrl: getCover(11), genre: "Tamil Romance", plays: "67,800,000", releaseDate: "2001", color: getColor(0), language: "tamil", category: "songs" },
  { id: "t-00-2", title: "Munbe Vaa", artist: "A.R. Rahman, Naresh Iyer, Shreya Ghoshal", director: "A.R. Rahman", album: "Sillunu Oru Kaadhal", duration: "5:58", durationSec: 358, audioUrl: "https://aac.saavncdn.com/595/86c6a67ff7120d287cb4484ea020f488_320.mp4", coverUrl: getCover(0), genre: "Tamil Melody", plays: "48,219,000", releaseDate: "2006", color: getColor(1), language: "tamil", category: "songs" },
  { id: "t-00-3", title: "Venmathi Venmathiye", artist: "Harris Jayaraj, Roop Kumar Rathod", director: "Harris Jayaraj", album: "Minnale", duration: "5:26", durationSec: 326, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910080284114.mp3", coverUrl: getCover(1), genre: "Tamil Melody", plays: "52,100,000", releaseDate: "2001", color: getColor(2), language: "tamil", category: "songs" },
  { id: "t-00-4", title: "Nenjukkul Peidhidum", artist: "Harris Jayaraj, Karthik", director: "Harris Jayaraj", album: "Vaaranam Aayiram", duration: "5:18", durationSec: 318, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910140018345.mp3", coverUrl: getCover(2), genre: "Tamil Romance", plays: "73,400,000", releaseDate: "2008", color: getColor(3), language: "tamil", category: "songs" },
  { id: "t-00-5", title: "Pogadhey Pogadhey", artist: "Yuvan Shankar Raja", director: "Yuvan Shankar Raja", album: "Deepavali", duration: "5:38", durationSec: 338, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910091842904.mp3", coverUrl: getCover(3), genre: "Tamil Heartbreak", plays: "48,900,000", releaseDate: "2007", color: getColor(4), language: "tamil", category: "songs" },

  // ── Tamil 2010s ──
  { id: "t-10-1", title: "Why This Kolaveri Di", artist: "Anirudh, Dhanush", director: "Anirudh Ravichander", album: "3", duration: "4:05", durationSec: 245, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910140018884.mp3", coverUrl: getCover(4), genre: "Tamil Viral", plays: "300,000,000", releaseDate: "2011", color: getColor(5), language: "tamil", category: "songs" },
  { id: "t-10-2", title: "Rowdy Baby", artist: "Yuvan, Dhanush, Dhee", director: "Yuvan Shankar Raja", album: "Maari 2", duration: "4:42", durationSec: 282, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910620863586.mp3", coverUrl: getCover(5), genre: "Tamil Dance", plays: "1,500,000,000", releaseDate: "2018", color: getColor(6), language: "tamil", category: "songs" },
  { id: "t-10-3", title: "High On Love", artist: "Yuvan, Sid Sriram", director: "Yuvan Shankar Raja", album: "Pyaar Prema Kadhal", duration: "4:00", durationSec: 240, audioUrl: getAudio(6), coverUrl: getCover(6), genre: "Tamil Modern Love", plays: "94,100,000", releaseDate: "2018", color: getColor(7), language: "tamil", category: "songs" },
  { id: "t-10-4", title: "Pookkalae Sattru", artist: "A.R. Rahman, Haricharan", director: "A.R. Rahman", album: "I", duration: "5:08", durationSec: 308, audioUrl: "https://aac.saavncdn.com/590/dc9e41c1e0659a2071ff5eb933524648_320.mp4", coverUrl: getCover(7), genre: "Tamil Romance", plays: "62,400,000", releaseDate: "2015", color: getColor(8), language: "tamil", category: "songs" },
  { id: "t-10-5", title: "Mersalaayitten", artist: "A.R. Rahman, Karthik", director: "A.R. Rahman", album: "I", duration: "4:24", durationSec: 264, audioUrl: "https://aac.saavncdn.com/590/C0eO6PM7CFMvpbuZ1d1REV6yWjSYL8H1rJIz7gyGuOIC_160.mp4", coverUrl: getCover(8), genre: "Tamil Rock", plays: "58,000,000", releaseDate: "2015", color: getColor(9), language: "tamil", category: "songs" },

  // ── Tamil 2020s ──
  { id: "t-20-1", title: "Naa Ready", artist: "Anirudh, Thalapathy Vijay", director: "Anirudh Ravichander", album: "Leo", duration: "4:08", durationSec: 248, audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/60/45/bc/6045bcf3-badc-db56-d044-adf6b14b0816/mzaf_7981634368973271980.plus.aac.p.m4a", coverUrl: getCover(9), genre: "Tamil Mass", plays: "128,400,000", releaseDate: "2023", color: getColor(0), language: "tamil", category: "songs" },
  { id: "t-20-2", title: "Arabic Kuthu", artist: "Anirudh, Jonita Gandhi", director: "Anirudh Ravichander", album: "Beast", duration: "4:39", durationSec: 279, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910621473870.mp3", coverUrl: getCover(10), genre: "Tamil Dance", plays: "210,000,000", releaseDate: "2022", color: getColor(1), language: "tamil", category: "songs" },
  { id: "t-20-3", title: "Enjoy Enjaami", artist: "Santhosh Narayanan, Dhee, Arivu", director: "Santhosh Narayanan", album: "Single", duration: "4:33", durationSec: 273, audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/87/8a/62/878a62f4-048c-d977-2a6f-a7a5b30a608d/mzaf_7142756228278497817.plus.aac.p.m4a", coverUrl: getCover(11), genre: "Tamil Folk Rap", plays: "490,000,000", releaseDate: "2021", color: getColor(2), language: "tamil", category: "songs" },
  { id: "t-20-4", title: "Vaathi Coming", artist: "Anirudh, Gana Balachandar", director: "Anirudh Ravichander", album: "Master", duration: "3:50", durationSec: 230, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910141586967.mp3", coverUrl: getCover(0), genre: "Tamil Kuthu", plays: "198,000,000", releaseDate: "2021", color: getColor(3), language: "tamil", category: "songs" },
  { id: "t-20-5", title: "Hukum Thalaivar Alappara", artist: "Anirudh, Super Subu", director: "Anirudh Ravichander", album: "Jailer", duration: "3:27", durationSec: 207, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910621974742.mp3", coverUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/2c/df/14/2cdf140e-6d11-a98d-bfbf-bc5e30c3c4a1/197189528187.jpg/600x600bb.jpg", genre: "Tamil Mass", plays: "145,000,000", releaseDate: "2023", color: "#FF6B00", language: "tamil", category: "songs" },
  { id: "t-20-6", title: "Veyyon Silli", artist: "G.V. Prakash, Harish", director: "G.V. Prakash Kumar", album: "Soorarai Pottru", duration: "5:04", durationSec: 304, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910141081147.mp3", coverUrl: getCover(2), genre: "Tamil Folk Rock", plays: "76,000,000", releaseDate: "2020", color: getColor(5), language: "tamil", category: "songs" },

  // ═══════════════════════════════════════════════════════════════
  // MALAYALAM SONGS
  // ═══════════════════════════════════════════════════════════════
  { id: "m-80-1", title: "Omanathinkal Kidavo", artist: "K.J. Yesudas", director: "M.G. Radhakrishnan", album: "Thalavattam", duration: "4:55", durationSec: 295, audioUrl: getAudio(3), coverUrl: getCover(3), genre: "Malayalam Classic", plays: "35,000,000", releaseDate: "1986", color: getColor(6), language: "malayalam", category: "songs" },
  { id: "m-80-2", title: "Aayiram Kannumai", artist: "K.J. Yesudas, S. Janaki", director: "M.G. Radhakrishnan", album: "Nokketha Doorathu Kannum Nattu", duration: "5:10", durationSec: 310, audioUrl: getAudio(4), coverUrl: getCover(4), genre: "Malayalam Classic", plays: "28,000,000", releaseDate: "1984", color: getColor(7), language: "malayalam", category: "songs" },
  { id: "m-90-1", title: "Doore Doore", artist: "K.J. Yesudas, K.S. Chithra", director: "Ouseppachan", album: "Aaram Thamburan", duration: "5:35", durationSec: 335, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910400247327.mp3", coverUrl: getCover(5), genre: "Malayalam Melody", plays: "42,000,000", releaseDate: "1997", color: getColor(8), language: "malayalam", category: "songs" },
  { id: "m-90-2", title: "Parayathe Ariyathe", artist: "K.J. Yesudas", director: "Ouseppachan", album: "Udyanapalaka", duration: "4:48", durationSec: 288, audioUrl: getAudio(6), coverUrl: getCover(6), genre: "Malayalam Melody", plays: "31,000,000", releaseDate: "1995", color: getColor(9), language: "malayalam", category: "songs" },
  { id: "m-00-1", title: "Mazhaye Thoovaalapo", artist: "K.S. Harisankar", director: "M. Jayachandran", album: "Ennu Ninte Moideen", duration: "5:22", durationSec: 322, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910092605116.mp3", coverUrl: getCover(7), genre: "Malayalam Romance", plays: "58,000,000", releaseDate: "2005", color: getColor(0), language: "malayalam", category: "songs" },
  { id: "m-10-1", title: "Malare Ninne", artist: "Vijay Yesudas", director: "Gopi Sundar", album: "Premam", duration: "4:18", durationSec: 258, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010912341118247.mp3", coverUrl: getCover(8), genre: "Malayalam Romance", plays: "185,000,000", releaseDate: "2015", color: getColor(1), language: "malayalam", category: "songs" },
  { id: "m-10-2", title: "Jeevamshamayi", artist: "K.S. Harisankar, Shreya Ghoshal", director: "Gopi Sundar", album: "Theevandi", duration: "4:42", durationSec: 282, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910090141868.mp3", coverUrl: getCover(9), genre: "Malayalam Melody", plays: "96,000,000", releaseDate: "2018", color: getColor(2), language: "malayalam", category: "songs" },
  { id: "m-10-3", title: "Lailakame", artist: "Vijay Yesudas, Kavya Ajit", director: "Gopi Sundar", album: "Ezra", duration: "4:55", durationSec: 295, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010912341118237.mp3", coverUrl: getCover(10), genre: "Malayalam Romance", plays: "67,000,000", releaseDate: "2017", color: getColor(3), language: "malayalam", category: "songs" },
  { id: "m-20-1", title: "Illuminati", artist: "Sushin Shyam, Dabzee, Vinayak", director: "Sushin Shyam", album: "Aavesham", duration: "3:28", durationSec: 208, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010911262342749.mp3", coverUrl: getCover(11), genre: "Malayalam Dance", plays: "145,000,000", releaseDate: "2024", color: getColor(4), language: "malayalam", category: "songs" },
  { id: "m-20-2", title: "Pachakkallam", artist: "Sushin Shyam", director: "Sushin Shyam", album: "Aavesham", duration: "3:15", durationSec: 195, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010911262342749.mp3", coverUrl: getCover(0), genre: "Malayalam Dance", plays: "78,000,000", releaseDate: "2024", color: getColor(5), language: "malayalam", category: "songs" },
  { id: "m-20-3", title: "Kaanthaa", artist: "Sushin Shyam, K.S. Harisankar", director: "Sushin Shyam", album: "Bheeshma Parvam", duration: "4:10", durationSec: 250, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910092605116.mp3", coverUrl: getCover(1), genre: "Malayalam Soul", plays: "52,000,000", releaseDate: "2022", color: getColor(6), language: "malayalam", category: "songs" },

  // ═══════════════════════════════════════════════════════════════
  // TELUGU SONGS
  // ═══════════════════════════════════════════════════════════════
  { id: "te-80-1", title: "Aakasam Enatido", artist: "S.P.B, P. Susheela", director: "M.M. Keeravani", album: "Shiva", duration: "5:25", durationSec: 325, audioUrl: "https://aac.saavncdn.com/653/8WJauIunarK9feghYo3e9q4qe8gVF9mef92lKsN0tfm_160.mp4", coverUrl: getCover(2), genre: "Telugu Classic", plays: "38,000,000", releaseDate: "1989", color: getColor(7), language: "telugu", category: "songs" },
  { id: "te-90-1", title: "Pellichoopulu", artist: "S.P.B, Chitra", director: "M.M. Keeravani", album: "Pellichoopulu", duration: "5:12", durationSec: 312, audioUrl: "https://aac.saavncdn.com/653/8WJauIunarK9feghYo3e9q4qe8gVF9mef92lKsN0tfm_160.mp4", coverUrl: getCover(3), genre: "Telugu Melody", plays: "42,000,000", releaseDate: "1997", color: getColor(8), language: "telugu", category: "songs" },
  { id: "te-90-2", title: "Manasu Palike", artist: "S.P.B, Chitra", director: "Mani Sharma", album: "Oka Chinna Maata", duration: "5:18", durationSec: 318, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910400564386.mp3", coverUrl: getCover(4), genre: "Telugu Melody", plays: "35,000,000", releaseDate: "1998", color: getColor(9), language: "telugu", category: "songs" },
  { id: "te-00-1", title: "Sreeja", artist: "S.P.B, Sunitha", director: "Mani Sharma", album: "Varsham", duration: "4:48", durationSec: 288, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910400242381.mp3", coverUrl: getCover(5), genre: "Telugu Romance", plays: "55,000,000", releaseDate: "2004", color: getColor(0), language: "telugu", category: "songs" },
  { id: "te-00-2", title: "Ringa Ringa", artist: "DSP, Priya Hemesh", director: "Devi Sri Prasad (DSP)", album: "Arya 2", duration: "4:12", durationSec: 252, audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/eb/6b/0f/eb6b0f1b-476f-84c8-4d29-ab15138db282/mzaf_4494872200492777745.plus.aac.p.m4a", coverUrl: getCover(6), genre: "Telugu Dance", plays: "95,000,000", releaseDate: "2009", color: getColor(1), language: "telugu", category: "songs" },
  { id: "te-10-1", title: "Naatu Naatu", artist: "M.M. Keeravani, Rahul Sipligunj, Kaala Bhairava", director: "M.M. Keeravani", album: "RRR", duration: "4:15", durationSec: 255, audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/8e/dd/a4/8edda474-3fe1-3fe6-43d3-765db520a29b/mzaf_11740310005222997767.plus.aac.p.m4a", coverUrl: getCover(7), genre: "Telugu Dance", plays: "520,000,000", releaseDate: "2022", color: getColor(2), language: "telugu", category: "songs" },
  { id: "te-10-2", title: "Buttabomma", artist: "S.S. Thaman, Armaan Malik", director: "S.S. Thaman", album: "Ala Vaikunthapurramuloo", duration: "3:55", durationSec: 235, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910401039350.mp3", coverUrl: getCover(8), genre: "Telugu Romance", plays: "680,000,000", releaseDate: "2020", color: getColor(3), language: "telugu", category: "songs" },
  { id: "te-10-3", title: "Butta Bomma", artist: "S.S. Thaman, Armaan Malik", director: "S.S. Thaman", album: "Ala Vaikunthapurramuloo", duration: "4:10", durationSec: 250, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910401039350.mp3", coverUrl: getCover(9), genre: "Telugu Pop", plays: "450,000,000", releaseDate: "2020", color: getColor(4), language: "telugu", category: "songs" },
  { id: "te-20-1", title: "Srivalli", artist: "DSP, Sid Sriram", director: "Devi Sri Prasad (DSP)", album: "Pushpa", duration: "4:22", durationSec: 262, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010912023387375.mp3", coverUrl: getCover(10), genre: "Telugu Folk", plays: "1,200,000,000", releaseDate: "2021", color: getColor(5), language: "telugu", category: "songs" },
  { id: "te-20-2", title: "Oo Antava", artist: "DSP, Indravathi Chauhan", director: "Devi Sri Prasad (DSP)", album: "Pushpa", duration: "3:48", durationSec: 228, audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/59/5d/86/595d8694-c034-2040-9a11-2f117ed32ea4/mzaf_8961189800316643417.plus.aac.p.m4a", coverUrl: getCover(11), genre: "Telugu Dance", plays: "850,000,000", releaseDate: "2021", color: getColor(6), language: "telugu", category: "songs" },
  { id: "te-20-3", title: "Samajavaragamana", artist: "S.S. Thaman, Sid Sriram", director: "S.S. Thaman", album: "Ala Vaikunthapurramuloo", duration: "4:35", durationSec: 275, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910400959278.mp3", coverUrl: getCover(0), genre: "Telugu Melody", plays: "780,000,000", releaseDate: "2020", color: getColor(7), language: "telugu", category: "songs" },

  // ═══════════════════════════════════════════════════════════════
  // KANNADA SONGS
  // ═══════════════════════════════════════════════════════════════
  { id: "k-80-1", title: "Naanu Ninna Preetisuve", artist: "Rajkumar", director: "Hamsalekha", album: "Premaloka", duration: "4:55", durationSec: 295, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910080286564.mp3", coverUrl: getCover(1), genre: "Kannada Classic", plays: "48,000,000", releaseDate: "1987", color: getColor(8), language: "kannada", category: "songs" },
  { id: "k-90-1", title: "Hai Premiye", artist: "Rajesh Krishnan", director: "Gurukiran", album: "Excuse Me", duration: "4:38", durationSec: 278, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010911263752614.mp3", coverUrl: getCover(2), genre: "Kannada Romance", plays: "32,000,000", releaseDate: "2003", color: getColor(9), language: "kannada", category: "songs" },
  { id: "k-90-2", title: "A Maava Ennagona", artist: "Rajesh Krishnan", director: "Hamsalekha", album: "A", duration: "4:25", durationSec: 265, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010911263752614.mp3", coverUrl: getCover(3), genre: "Kannada Pop", plays: "45,000,000", releaseDate: "1998", color: getColor(0), language: "kannada", category: "songs" },
  { id: "k-00-1", title: "Ambari Ambari", artist: "Sonu Nigam", director: "V. Harikrishna", album: "Ambari", duration: "4:48", durationSec: 288, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010911580804546.mp3", coverUrl: getCover(4), genre: "Kannada Romance", plays: "42,000,000", releaseDate: "2009", color: getColor(1), language: "kannada", category: "songs" },
  { id: "k-10-1", title: "Bombe Helutaithe", artist: "Sonu Nigam, Shreya Ghoshal", director: "V. Harikrishna", album: "Raajakumara", duration: "4:32", durationSec: 272, audioUrl: "https://aac.saavncdn.com/964/QVIXqzbKNfrPO6rI2BwmPY2rwormTCyfrELELiF_160.mp4", coverUrl: getCover(5), genre: "Kannada Melody", plays: "68,000,000", releaseDate: "2017", color: getColor(2), language: "kannada", category: "songs" },
  { id: "k-10-2", title: "Yaarivanu", artist: "Vijay Prakash", director: "Arjun Janya", album: "Ugramm", duration: "3:52", durationSec: 232, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010912023202472.mp3", coverUrl: getCover(6), genre: "Kannada Mass", plays: "55,000,000", releaseDate: "2014", color: getColor(3), language: "kannada", category: "songs" },
  { id: "k-20-1", title: "Varaha Roopam", artist: "B. Ajaneesh Loknath", director: "B. Ajaneesh Loknath", album: "Kantara", duration: "4:15", durationSec: 255, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010912023268119.mp3", coverUrl: getCover(7), genre: "Kannada Folk", plays: "380,000,000", releaseDate: "2022", color: getColor(4), language: "kannada", category: "songs" },
  { id: "k-20-2", title: "Toofan", artist: "Ravi Basrur", director: "Ravi Basrur", album: "KGF Chapter 2", duration: "3:35", durationSec: 215, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910091497670.mp3", coverUrl: getCover(8), genre: "Kannada Mass", plays: "290,000,000", releaseDate: "2022", color: getColor(5), language: "kannada", category: "songs" },
  { id: "k-20-3", title: "Salaam Rocky Bhai", artist: "Ravi Basrur, Vijay Prakash", director: "Ravi Basrur", album: "KGF Chapter 1", duration: "4:05", durationSec: 245, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910090870844.mp3", coverUrl: getCover(9), genre: "Kannada Mass", plays: "220,000,000", releaseDate: "2018", color: getColor(6), language: "kannada", category: "songs" },

  // ═══════════════════════════════════════════════════════════════
  // HINDI SONGS
  // ═══════════════════════════════════════════════════════════════
  { id: "h-80-1", title: "Tujhe Dekha Toh", artist: "Kumar Sanu, Lata Mangeshkar", director: "Laxmikant-Pyarelal", album: "DDLJ", duration: "5:42", durationSec: 342, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910080000052.mp3", coverUrl: getCover(10), genre: "Hindi Romance", plays: "280,000,000", releaseDate: "1995", color: getColor(7), language: "hindi", category: "songs" },
  { id: "h-80-2", title: "Ek Ladki Ko Dekha", artist: "Kumar Sanu", director: "R.D. Burman", album: "1942: A Love Story", duration: "5:18", durationSec: 318, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910080036450.mp3", coverUrl: getCover(11), genre: "Hindi Melody", plays: "185,000,000", releaseDate: "1994", color: getColor(8), language: "hindi", category: "songs" },
  { id: "h-80-3", title: "Pehla Nasha", artist: "Udit Narayan, Sadhana Sargam", director: "R.D. Burman", album: "Jo Jeeta Wohi Sikandar", duration: "5:02", durationSec: 302, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910080025328.mp3", coverUrl: getCover(0), genre: "Hindi Romance", plays: "220,000,000", releaseDate: "1992", color: getColor(9), language: "hindi", category: "songs" },
  { id: "h-90-1", title: "Chaiyya Chaiyya", artist: "A.R. Rahman, Sukhwinder Singh", director: "A.R. Rahman", album: "Dil Se", duration: "6:46", durationSec: 406, audioUrl: "https://aac.saavncdn.com/596/4638940380eca6bcbc1e1de0d8e63938_320.mp4", coverUrl: getCover(1), genre: "Hindi Folk Rock", plays: "350,000,000", releaseDate: "1998", color: getColor(0), language: "hindi", category: "songs" },
  { id: "h-00-1", title: "Dil Chahta Hai", artist: "Shankar-Ehsaan-Loy, Shankar Mahadevan", director: "Shankar-Ehsaan-Loy", album: "Dil Chahta Hai", duration: "5:38", durationSec: 338, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910090767420.mp3", coverUrl: getCover(2), genre: "Hindi Pop", plays: "150,000,000", releaseDate: "2001", color: getColor(1), language: "hindi", category: "songs" },
  { id: "h-00-2", title: "Kal Ho Naa Ho", artist: "Shankar-Ehsaan-Loy, Sonu Nigam", director: "Shankar-Ehsaan-Loy", album: "Kal Ho Naa Ho", duration: "5:22", durationSec: 322, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910141355265.mp3", coverUrl: getCover(3), genre: "Hindi Melody", plays: "420,000,000", releaseDate: "2003", color: getColor(2), language: "hindi", category: "songs" },
  { id: "h-00-3", title: "Tum Hi Ho", artist: "Arijit Singh", director: "Mithoon", album: "Aashiqui 2", duration: "4:22", durationSec: 262, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910092419390.mp3", coverUrl: getCover(4), genre: "Hindi Romance", plays: "1,800,000,000", releaseDate: "2013", color: getColor(3), language: "hindi", category: "songs" },
  { id: "h-10-1", title: "Channa Mereya", artist: "Arijit Singh", director: "Pritam", album: "Ae Dil Hai Mushkil", duration: "4:49", durationSec: 289, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910140261264.mp3", coverUrl: getCover(5), genre: "Hindi Heartbreak", plays: "980,000,000", releaseDate: "2016", color: getColor(4), language: "hindi", category: "songs" },
  { id: "h-10-2", title: "Kun Faya Kun", artist: "A.R. Rahman, Javed Ali, Mohit Chauhan", director: "A.R. Rahman", album: "Rockstar", duration: "7:49", durationSec: 469, audioUrl: "https://aac.saavncdn.com/179/53fd6b97b1616b941b115f840e8b1e42_320.mp4", coverUrl: getCover(6), genre: "Hindi Sufi", plays: "650,000,000", releaseDate: "2011", color: getColor(5), language: "hindi", category: "songs" },
  { id: "h-10-3", title: "Ae Dil Hai Mushkil", artist: "Arijit Singh", director: "Pritam", album: "Ae Dil Hai Mushkil", duration: "4:32", durationSec: 272, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910142504969.mp3", coverUrl: getCover(7), genre: "Hindi Romance", plays: "750,000,000", releaseDate: "2016", color: getColor(6), language: "hindi", category: "songs" },
  { id: "h-20-1", title: "Kesariya", artist: "Arijit Singh", director: "Pritam", album: "Brahmastra", duration: "4:28", durationSec: 268, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910141580615.mp3", coverUrl: getCover(8), genre: "Hindi Romance", plays: "1,200,000,000", releaseDate: "2022", color: getColor(7), language: "hindi", category: "songs" },
  { id: "h-20-2", title: "Apna Bana Le", artist: "Arijit Singh", director: "Sachin-Jigar", album: "Bhediya", duration: "4:45", durationSec: 285, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910441686043.mp3", coverUrl: getCover(9), genre: "Hindi Romance", plays: "580,000,000", releaseDate: "2022", color: getColor(8), language: "hindi", category: "songs" },
  { id: "h-20-3", title: "O Bedardeya", artist: "Arijit Singh", director: "Pritam", album: "Tu Jhoothi Main Makkaar", duration: "4:12", durationSec: 252, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910091858172.mp3", coverUrl: getCover(10), genre: "Hindi Romance", plays: "450,000,000", releaseDate: "2023", color: getColor(9), language: "hindi", category: "songs" },

  // ═══════════════════════════════════════════════════════════════
  // ENGLISH SONGS
  // ═══════════════════════════════════════════════════════════════
  { id: "e-80-1", title: "Take On Me", artist: "a-ha", director: "a-ha", album: "Hunting High and Low", duration: "3:48", durationSec: 228, audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f2/03/4f/f2034f41-707f-7111-bc63-e5d3cf7f2240/mzaf_17215043934336702540.plus.aac.p.m4a", coverUrl: getCover(11), genre: "Synth Pop", plays: "1,600,000,000", releaseDate: "1985", color: getColor(0), language: "english", category: "songs" },
  { id: "e-80-2", title: "Sweet Child O Mine", artist: "Guns N Roses", director: "Guns N Roses", album: "Appetite for Destruction", duration: "5:56", durationSec: 356, audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/0d/cb/f3/0dcbf381-7cbf-78b8-7f74-d5789adf65a1/mzaf_17081805577020235844.plus.aac.p.m4a", coverUrl: getCover(0), genre: "Rock", plays: "1,200,000,000", releaseDate: "1987", color: getColor(1), language: "english", category: "songs" },
  { id: "e-90-1", title: "Smells Like Teen Spirit", artist: "Nirvana", director: "Nirvana", album: "Nevermind", duration: "5:01", durationSec: 301, audioUrl: getAudio(1), coverUrl: getCover(1), genre: "Grunge", plays: "1,900,000,000", releaseDate: "1991", color: getColor(2), language: "english", category: "songs" },
  { id: "e-90-2", title: "Wonderwall", artist: "Oasis", director: "Oasis", album: "Morning Glory", duration: "4:18", durationSec: 258, audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/ab/16/93/ab16933c-6203-3db9-9da9-513ff1c8496d/mzaf_16993612140334549994.plus.aac.p.m4a", coverUrl: getCover(2), genre: "Britpop", plays: "2,100,000,000", releaseDate: "1995", color: getColor(3), language: "english", category: "songs" },
  { id: "e-00-1", title: "Fix You", artist: "Coldplay", director: "Coldplay", album: "X&Y", duration: "4:54", durationSec: 294, audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/e5/42/e3/e542e340-a45c-695e-e0b8-6155e222ebc0/mzaf_14955746616030397665.plus.aac.p.m4a", coverUrl: getCover(3), genre: "Alternative Rock", plays: "1,500,000,000", releaseDate: "2005", color: getColor(4), language: "english", category: "songs" },
  { id: "e-00-2", title: "Viva La Vida", artist: "Coldplay", director: "Coldplay", album: "Viva la Vida", duration: "4:02", durationSec: 242, audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/b0/19/60/b0196060-7786-24c0-8c56-8f628fe89f52/mzaf_12479456646715449366.plus.aac.p.m4a", coverUrl: getCover(4), genre: "Alt Rock", plays: "1,700,000,000", releaseDate: "2008", color: getColor(5), language: "english", category: "songs" },
  { id: "e-10-1", title: "Shape of You", artist: "Ed Sheeran", director: "Ed Sheeran", album: "÷", duration: "3:53", durationSec: 233, audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/44/c7/4f/44c74f0d-72dc-6143-d4d0-ba14d661ca0d/mzaf_9566898362556366703.plus.aac.p.m4a", coverUrl: getCover(5), genre: "Pop", plays: "6,200,000,000", releaseDate: "2017", color: getColor(6), language: "english", category: "songs" },
  { id: "e-10-2", title: "Blinding Lights", artist: "The Weeknd", director: "The Weeknd", album: "After Hours", duration: "3:20", durationSec: 200, audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/12/73/ca/1273ca46-233a-5331-189b-25ac1d656533/mzaf_976341070785891411.plus.aac.p.m4a", coverUrl: getCover(6), genre: "Synth Pop", plays: "4,500,000,000", releaseDate: "2019", color: getColor(7), language: "english", category: "songs" },
  { id: "e-10-3", title: "Someone Like You", artist: "Adele", director: "Adele", album: "21", duration: "4:45", durationSec: 285, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010912293013261.mp3", coverUrl: getCover(7), genre: "Pop Ballad", plays: "2,800,000,000", releaseDate: "2011", color: getColor(8), language: "english", category: "songs" },
  { id: "e-20-1", title: "As It Was", artist: "Harry Styles", director: "Harry Styles", album: "Harry's House", duration: "2:47", durationSec: 167, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010912023312676.mp3", coverUrl: getCover(8), genre: "Pop", plays: "3,200,000,000", releaseDate: "2022", color: getColor(9), language: "english", category: "songs" },
  { id: "e-20-2", title: "Anti-Hero", artist: "Taylor Swift", director: "Taylor Swift", album: "Midnights", duration: "3:20", durationSec: 200, audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/1d/56/2a/1d562a07-dc5f-a9c0-1f36-2051a8c14eb7/mzaf_7214829135431340590.plus.aac.p.m4a", coverUrl: getCover(9), genre: "Pop", plays: "2,100,000,000", releaseDate: "2022", color: getColor(0), language: "english", category: "songs" },
  { id: "e-20-3", title: "Flowers", artist: "Miley Cyrus", director: "Miley Cyrus", album: "Endless Summer Vacation", duration: "3:20", durationSec: 200, audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/68/9e/f7/689ef7fe-14fe-a846-c87f-7d3b2d6344b1/mzaf_4167137058064023087.plus.aac.p.m4a", coverUrl: getCover(10), genre: "Pop", plays: "2,700,000,000", releaseDate: "2023", color: getColor(1), language: "english", category: "songs" },

  // ═══════════════════════════════════════════════════════════════
  // BGM / BACKGROUND SCORE TRACKS
  // ═══════════════════════════════════════════════════════════════
  { id: "bgm-1", title: "Vikram BGM - Rolex Entry", artist: "Anirudh Ravichander", director: "Anirudh Ravichander", album: "Vikram", duration: "3:45", durationSec: 225, audioUrl: getAudio(0), coverUrl: getCover(0), genre: "Tamil BGM", plays: "185,000,000", releaseDate: "2022", color: "#FF6B00", language: "tamil", category: "bgm" },
  { id: "bgm-2", title: "KGF Mother Sentiment BGM", artist: "Ravi Basrur", director: "Ravi Basrur", album: "KGF Chapter 1", duration: "4:22", durationSec: 262, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010912113054377.mp3", coverUrl: getCover(1), genre: "Kannada BGM", plays: "320,000,000", releaseDate: "2018", color: "#ef4444", language: "kannada", category: "bgm" },
  { id: "bgm-3", title: "Yuvan Mass BGM Collection", artist: "Yuvan Shankar Raja", director: "Yuvan Shankar Raja", album: "Billa", duration: "5:10", durationSec: 310, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010912023314371.mp3", coverUrl: getCover(2), genre: "Tamil BGM", plays: "92,000,000", releaseDate: "2007", color: "#8b5cf6", language: "tamil", category: "bgm" },
  { id: "bgm-4", title: "Baahubali War BGM", artist: "M.M. Keeravani", director: "M.M. Keeravani", album: "Baahubali", duration: "6:30", durationSec: 390, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910400242290.mp3", coverUrl: getCover(3), genre: "Telugu BGM", plays: "250,000,000", releaseDate: "2015", color: "#d97706", language: "telugu", category: "bgm" },
  { id: "bgm-5", title: "RRR BGM - Komaram Bheem Intro", artist: "M.M. Keeravani", director: "M.M. Keeravani", album: "RRR", duration: "3:55", durationSec: 235, audioUrl: getAudio(4), coverUrl: getCover(4), genre: "Telugu BGM", plays: "180,000,000", releaseDate: "2022", color: "#d97706", language: "telugu", category: "bgm" },
  { id: "bgm-6", title: "Kantara BGM - Panjurli Theme", artist: "B. Ajaneesh Loknath", director: "B. Ajaneesh Loknath", album: "Kantara", duration: "5:15", durationSec: 315, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910083782703.mp3", coverUrl: getCover(5), genre: "Kannada BGM", plays: "210,000,000", releaseDate: "2022", color: "#10b981", language: "kannada", category: "bgm" },
  { id: "bgm-7", title: "Vaaranam Aayiram Father BGM", artist: "Harris Jayaraj", director: "Harris Jayaraj", album: "Vaaranam Aayiram", duration: "4:45", durationSec: 285, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910141988170.mp3", coverUrl: getCover(6), genre: "Tamil BGM", plays: "78,000,000", releaseDate: "2008", color: "#3b82f6", language: "tamil", category: "bgm" },
  { id: "bgm-8", title: "Roja Theme Music", artist: "A.R. Rahman", director: "A.R. Rahman", album: "Roja", duration: "5:40", durationSec: 340, audioUrl: getAudio(7), coverUrl: getCover(7), genre: "Tamil BGM", plays: "65,000,000", releaseDate: "1992", color: "#e11d48", language: "tamil", category: "bgm" },
  { id: "bgm-9", title: "Jailer BGM - Rajinikanth Entry", artist: "Anirudh Ravichander", director: "Anirudh Ravichander", album: "Jailer", duration: "3:30", durationSec: 210, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010912023387375.mp3", coverUrl: getCover(8), genre: "Tamil BGM", plays: "125,000,000", releaseDate: "2023", color: "#FF6B00", language: "tamil", category: "bgm" },
  { id: "bgm-10", title: "Leo BGM - Bloody Sweet", artist: "Anirudh Ravichander", director: "Anirudh Ravichander", album: "Leo", duration: "4:05", durationSec: 245, audioUrl: getAudio(9), coverUrl: getCover(9), genre: "Tamil BGM", plays: "98,000,000", releaseDate: "2023", color: "#FF6B00", language: "tamil", category: "bgm" },
  { id: "bgm-11", title: "Aavesham BGM - Mass Entry", artist: "Sushin Shyam", director: "Sushin Shyam", album: "Aavesham", duration: "3:18", durationSec: 198, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010911262342749.mp3", coverUrl: getCover(10), genre: "Malayalam BGM", plays: "85,000,000", releaseDate: "2024", color: "#10b981", language: "malayalam", category: "bgm" },
  { id: "bgm-12", title: "Kabir Singh BGM - Emotional", artist: "Sachet-Parampara", director: "Sachet-Parampara", album: "Kabir Singh", duration: "4:30", durationSec: 270, audioUrl: getAudio(11), coverUrl: getCover(11), genre: "Hindi BGM", plays: "150,000,000", releaseDate: "2019", color: "#3b82f6", language: "hindi", category: "bgm" },
  { id: "bgm-13", title: "Salaar BGM - Mass Theme", artist: "Ravi Basrur", director: "Ravi Basrur", album: "Salaar", duration: "4:50", durationSec: 290, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010911420893872.mp3", coverUrl: getCover(0), genre: "Kannada BGM", plays: "165,000,000", releaseDate: "2023", color: "#ef4444", language: "kannada", category: "bgm" },
  { id: "bgm-14", title: "Interstellar Theme", artist: "Hans Zimmer", director: "Hans Zimmer", album: "Interstellar", duration: "8:05", durationSec: 485, audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/0e/76/d3/0e76d3f4-0071-b9ef-81d4-76c445ebc69d/mzaf_17653548405030492062.plus.aac.p.m4a", coverUrl: getCover(1), genre: "English BGM", plays: "580,000,000", releaseDate: "2014", color: "#6366f1", language: "english", category: "bgm" },
  { id: "bgm-15", title: "The Dark Knight Theme", artist: "Hans Zimmer", director: "Hans Zimmer", album: "The Dark Knight", duration: "5:35", durationSec: 335, audioUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/b0/f2/2f/b0f22fda-93c1-309c-809e-3167a0ee3cdb/mzaf_16720924445371859241.plus.aac.p.m4a", coverUrl: getCover(2), genre: "English BGM", plays: "420,000,000", releaseDate: "2008", color: "#18181b", language: "english", category: "bgm" },
  { id: "bgm-16", title: "Pushpa BGM - Srivalli Theme", artist: "Devi Sri Prasad", director: "Devi Sri Prasad (DSP)", album: "Pushpa", duration: "3:45", durationSec: 225, audioUrl: "https://jiotunepreview.jio.com/content/Converted/010910092737129.mp3", coverUrl: getCover(3), genre: "Telugu BGM", plays: "195,000,000", releaseDate: "2021", color: "#d97706", language: "telugu", category: "bgm" }
];

export const isAudioPreviewUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('audio-ssl.itunes.apple.com') ||
    lower.includes('jiotunepreview') ||
    lower.includes('audiopreview') ||
    lower.endsWith('.plus.aac.p.m4a') ||
    lower.includes('/preview/') ||
    lower.includes('itunes-assets')
  );
};

export const CURATED_TRACKS = RAW_CURATED_TRACKS.map(t => {
  const isPreview = isAudioPreviewUrl(t.audioUrl);
  return {
    ...t,
    isPreview,
    isFullSong: !isPreview,
    quality: isPreview ? '30s Preview' : 'Full HQ',
    fullSongDuration: t.duration,
    duration: isPreview ? '0:30' : t.duration,
    durationSec: isPreview ? 30 : t.durationSec,
    licenseNotice: isPreview
      ? 'Authorized 30s preview clip. Full commercial track requires licensed streaming subscription.'
      : 'Authorized Full Track'
  };
});

export function filterTracks({ language = 'all', decade = 'all', category = 'all', director = null, searchQuery = '' } = {}) {
  let filtered = [...CURATED_TRACKS];

  // Director filter
  if (director && director !== 'all') {
    const dClean = director.replace(/\(Hindi\)/i, '').toLowerCase().trim();
    filtered = filtered.filter(t => t.director && t.director.toLowerCase().includes(dClean));
  }

  // Language filter
  if (language && language !== 'all') {
    filtered = filtered.filter(t => t.language === language);
  }

  // Decade filter
  if (decade && decade !== 'all') {
    const decadeConfig = DECADE_FILTERS.find(d => d.id === decade);
    if (decadeConfig) {
      const [start, end] = decadeConfig.range;
      filtered = filtered.filter(t => {
        const year = parseInt(t.releaseDate);
        return year >= start && year <= end;
      });
    }
  }

  // Category filter (songs vs bgm)
  if (category && category !== 'all') {
    filtered = filtered.filter(t => t.category === category);
  }

  // Search query
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.director.toLowerCase().includes(q) ||
      t.album.toLowerCase().includes(q) ||
      t.genre.toLowerCase().includes(q)
    );
  }

  return filtered;
}

// ─── Film Actors — language-wise (same card design as directors) ─
export const ALL_ACTORS = [
  // Tamil
  {
    id: 'act-vijay', name: 'Thalapathy Vijay', language: 'tamil',
    tagline: 'Thalapathy • Mass & Melody King',
    searchQuery: 'Thalapathy Vijay hit songs',
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80',
    color: '#e11d48',
  },
  {
    id: 'act-rajini', name: 'Rajinikanth', language: 'tamil',
    tagline: 'Superstar • Style Icon',
    searchQuery: 'Rajinikanth hit songs',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    color: '#f59e0b',
  },
  {
    id: 'act-ajith', name: 'Ajith Kumar', language: 'tamil',
    tagline: 'Thala • Intense Mass Hero',
    searchQuery: 'Ajith Kumar hit songs',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
    color: '#3b82f6',
  },
  {
    id: 'act-kamal', name: 'Kamal Haasan', language: 'tamil',
    tagline: 'Ulaganayagan • Versatile Legend',
    searchQuery: 'Kamal Haasan songs',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
    color: '#8b5cf6',
  },
  {
    id: 'act-suriya', name: 'Suriya', language: 'tamil',
    tagline: 'Rolex • Intense Performer',
    searchQuery: 'Suriya hit songs',
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80',
    color: '#10b981',
  },
  {
    id: 'act-dhanush', name: 'Dhanush', language: 'tamil',
    tagline: 'Asuran • Raw Emotion Star',
    searchQuery: 'Dhanush songs',
    coverUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=600&q=80',
    color: '#ec4899',
  },
  {
    id: 'act-sk', name: 'Sivakarthikeyan', language: 'tamil',
    tagline: 'SK • Family Entertainer',
    searchQuery: 'Sivakarthikeyan songs',
    coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    color: '#06b6d4',
  },
  {
    id: 'act-vikram', name: 'Vikram', language: 'tamil',
    tagline: 'Chiyaan • Method Actor',
    searchQuery: 'Vikram Chiyaan songs',
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80',
    color: '#ef4444',
  },
  {
    id: 'act-karthi', name: 'Karthi', language: 'tamil',
    tagline: 'Kaithi • Natural Performer',
    searchQuery: 'Karthi songs',
    coverUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80',
    color: '#84cc16',
  },
  {
    id: 'act-simbu', name: 'Silambarasan TR', language: 'tamil',
    tagline: 'STR • Youth Icon',
    searchQuery: 'Silambarasan TR songs',
    coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80',
    color: '#a855f7',
  },
  // Telugu
  {
    id: 'act-mahesh', name: 'Mahesh Babu', language: 'telugu',
    tagline: 'Super Star • Prince of Tollywood',
    searchQuery: 'Mahesh Babu hit songs',
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80',
    color: '#d97706',
  },
  {
    id: 'act-ntr', name: 'Jr NTR', language: 'telugu',
    tagline: 'Man of Masses • RRR',
    searchQuery: 'Jr NTR hit songs',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    color: '#e11d48',
  },
  {
    id: 'act-ramcharan', name: 'Ram Charan', language: 'telugu',
    tagline: 'Mega Power Star • RRR',
    searchQuery: 'Ram Charan songs',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
    color: '#f97316',
  },
  {
    id: 'act-prabhas', name: 'Prabhas', language: 'telugu',
    tagline: 'Rebel Star • Baahubali',
    searchQuery: 'Prabhas hit songs',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
    color: '#b45309',
  },
  {
    id: 'act-allu', name: 'Allu Arjun', language: 'telugu',
    tagline: 'Stylish Star • Pushpa',
    searchQuery: 'Allu Arjun Pushpa songs',
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80',
    color: '#16a34a',
  },
  // Malayalam
  {
    id: 'act-mohanlal', name: 'Mohanlal', language: 'malayalam',
    tagline: 'Complete Actor • Malayalam Icon',
    searchQuery: 'Mohanlal hit songs',
    coverUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=600&q=80',
    color: '#0ea5e9',
  },
  {
    id: 'act-mammootty', name: 'Mammootty', language: 'malayalam',
    tagline: 'Megastar • Legendary Presence',
    searchQuery: 'Mammootty songs',
    coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    color: '#6366f1',
  },
  {
    id: 'act-dq', name: 'Dulquer Salmaan', language: 'malayalam',
    tagline: 'DQ • Pan-India Charm',
    searchQuery: 'Dulquer Salmaan songs',
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80',
    color: '#14b8a6',
  },
  // Kannada
  {
    id: 'act-yash', name: 'Yash', language: 'kannada',
    tagline: 'Rocking Star • KGF',
    searchQuery: 'Yash KGF songs',
    coverUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80',
    color: '#dc2626',
  },
  {
    id: 'act-sudeep', name: 'Sudeep', language: 'kannada',
    tagline: 'Kiccha • Sandalwood Power',
    searchQuery: 'Kiccha Sudeep songs',
    coverUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80',
    color: '#ca8a04',
  },
  // Hindi
  {
    id: 'act-srk', name: 'Shah Rukh Khan', language: 'hindi',
    tagline: 'King Khan • Bollywood Romance',
    searchQuery: 'Shah Rukh Khan hit songs',
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80',
    color: '#2563eb',
  },
  {
    id: 'act-salman', name: 'Salman Khan', language: 'hindi',
    tagline: 'Bhai • Mass Entertainer',
    searchQuery: 'Salman Khan hit songs',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    color: '#db2777',
  },
  {
    id: 'act-akshay', name: 'Akshay Kumar', language: 'hindi',
    tagline: 'Khiladi • Action Star',
    searchQuery: 'Akshay Kumar songs',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
    color: '#7c3aed',
  },
  {
    id: 'act-ranbir', name: 'Ranbir Kapoor', language: 'hindi',
    tagline: 'Rockstar • Modern Classic',
    searchQuery: 'Ranbir Kapoor songs',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
    color: '#0891b2',
  },
];

// ─── Helper: Get directors by language ──────────────────────────
export function getDirectorsByLanguage(language = 'all') {
  if (!language || language === 'all') return ALL_DIRECTORS;
  return ALL_DIRECTORS.filter(d => d.language === language);
}

export function getActorsByLanguage(language = 'all') {
  if (!language || language === 'all') return ALL_ACTORS;
  return ALL_ACTORS.filter((a) => a.language === language);
}
