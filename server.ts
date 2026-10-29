import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import JSZip from 'jszip';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Support raw zip uploads up to 100MB
app.use(express.raw({ type: 'application/zip', limit: '100mb' }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// -------------------------------------------------------------
// Project Upload & Multi-Project API
// -------------------------------------------------------------
app.post('/api/upload-zip', async (req, res) => {
  try {
    let zipBuffer: Buffer;
    if (Buffer.isBuffer(req.body)) {
      zipBuffer = req.body;
    } else if (req.body && req.body.base64) {
      zipBuffer = Buffer.from(req.body.base64, 'base64');
    } else {
      res.status(400).json({ error: 'No zip data provided. Send raw application/zip or JSON with base64.' });
      return;
    }

    const zip = await JSZip.loadAsync(zipBuffer);
    const customFolder = (req.query.folder as string || 'imported_project_2').replace(/[^a-zA-Z0-9_-]/g, '_');
    const targetDir = path.resolve(__dirname, customFolder);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const savedFiles: { path: string; size: number }[] = [];
    const entries = Object.keys(zip.files);
    const topLevelDirs = new Set(
      entries.map(e => e.split('/')[0]).filter(Boolean)
    );
    const stripPrefix = (topLevelDirs.size === 1 && entries.every(e => e.startsWith(Array.from(topLevelDirs)[0] + '/')))
      ? Array.from(topLevelDirs)[0] + '/'
      : '';

    for (const [relativePath, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      if (relativePath.includes('..') || relativePath.includes('node_modules/') || relativePath.includes('.git/')) {
        continue;
      }

      const cleanRelPath = stripPrefix && relativePath.startsWith(stripPrefix)
        ? relativePath.slice(stripPrefix.length)
        : relativePath;

      const outPath = path.join(targetDir, cleanRelPath);
      const outDir = path.dirname(outPath);

      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      const content = await entry.async('nodebuffer');
      fs.writeFileSync(outPath, content);
      savedFiles.push({ path: cleanRelPath, size: content.length });
    }

    res.json({
      success: true,
      message: `Extracted ${savedFiles.length} files to /${customFolder}`,
      folder: customFolder,
      fileCount: savedFiles.length,
      files: savedFiles.slice(0, 30),
    });
  } catch (error: any) {
    console.error('Error unpacking zip on server:', error);
    res.status(500).json({ error: error.message || 'Failed to unpack zip' });
  }
});

// List all imported projects in workspace
app.get('/api/projects', (req, res) => {
  const allDirs = fs.readdirSync(__dirname, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && (dirent.name.startsWith('imported_project') || dirent.name.startsWith('project_')))
    .map(dirent => {
      const folderPath = path.join(__dirname, dirent.name);
      const files = fs.readdirSync(folderPath);
      return {
        name: dirent.name,
        fileCount: files.length,
        hasIndexHtml: fs.existsSync(path.join(folderPath, 'index.html')) || fs.existsSync(path.join(folderPath, 'templates/index.html')),
      };
    });
  res.json(allDirs);
});

// -------------------------------------------------------------
// Database & Persistent Storage for FoodAI
// (Ported from MySQL / ai_recommendation_system database)
// -------------------------------------------------------------
const DB_FILE = path.resolve(__dirname, 'foodai_db.json');

interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  preferences?: string;
}

interface Business {
  business_id: number;
  name: string;
  category: string;
  location: string;
  rating: number;
  description?: string;
  image?: string;
}

interface Interaction {
  id: number;
  user_id: number;
  business_id: number;
  rating: number;
}

interface MenuItem {
  name: string;
  price: number;
  image: string;
  description?: string;
}

const DEFAULT_BUSINESSES: Business[] = [
  {
    business_id: 1,
    name: "Pizza Palace",
    category: "Pizza",
    location: "Indore",
    rating: 4.6,
    description: "Delicious thick crust and wood-fired pizzas made with love.",
    image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600"
  },
  {
    business_id: 2,
    name: "Cafe Aroma",
    category: "Cafe",
    location: "Indore",
    rating: 4.5,
    description: "A relaxing ambiance with artisan coffee and sweet delicacies.",
    image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600"
  },
  {
    business_id: 3,
    name: "Burger Hub",
    category: "Burger",
    location: "Indore",
    rating: 4.4,
    description: "The best juicy patties, melted cheddar, and crispy fries in town.",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600"
  },
  {
    business_id: 4,
    name: "Pizza Hut",
    category: "Food",
    location: "Indore",
    rating: 4.2,
    description: "Your favorite pan pizzas, stuffed crusts, and buffalo wings.",
    image: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=600"
  },
  {
    business_id: 5,
    name: "Dominos",
    category: "Food",
    location: "Indore",
    rating: 4.1,
    description: "Hot, freshly delivered pizzas with signature Choco Lava Cake.",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600"
  },
  {
    business_id: 6,
    name: "Wok & Roll",
    category: "Chinese",
    location: "Indore",
    rating: 4.3,
    description: "Sizzling Hakka noodles, crispy Manchurian, and fiery momos.",
    image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600"
  },
  {
    business_id: 7,
    name: "Sweet Tooth Desserts",
    category: "Desserts",
    location: "Indore",
    rating: 4.7,
    description: "Artisan pastries, gourmet waffles, and handcrafted gelato.",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600"
  }
];

const DEFAULT_USERS: User[] = [
  { id: 1, name: "Lalit Verma", email: "lalit@foodai.com", password: "password123", preferences: "Pizza, Cafe" },
  { id: 2, name: "Ritesh", email: "ritesh@foodai.com", password: "password123", preferences: "Burger, Pizza" },
  { id: 3, name: "Sourabh", email: "sourabh@foodai.com", password: "password123", preferences: "Cafe, Desserts" },
  { id: 4, name: "Aman", email: "aman@foodai.com", password: "password123", preferences: "Pizza" }
];

const DEFAULT_INTERACTIONS: Interaction[] = [
  { id: 1, user_id: 1, business_id: 1, rating: 5 },
  { id: 2, user_id: 1, business_id: 2, rating: 4 },
  { id: 3, user_id: 1, business_id: 6, rating: 5 },
  { id: 4, user_id: 2, business_id: 1, rating: 5 },
  { id: 5, user_id: 2, business_id: 3, rating: 4 },
  { id: 6, user_id: 2, business_id: 4, rating: 4 },
  { id: 7, user_id: 3, business_id: 2, rating: 5 },
  { id: 8, user_id: 3, business_id: 5, rating: 4 },
  { id: 9, user_id: 3, business_id: 7, rating: 5 },
  { id: 10, user_id: 4, business_id: 1, rating: 4 },
  { id: 11, user_id: 4, business_id: 4, rating: 5 }
];

const RESTAURANT_MENUS: Record<string, MenuItem[]> = {
  "Pizza Palace": [
    { name: "Margherita Pizza", price: 249, image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500", description: "Classic fresh mozzarella, basil, and San Marzano tomato sauce." },
    { name: "Pepperoni Feast", price: 399, image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500", description: "Generous pepperoni slices with extra melted mozzarella cheese." },
    { name: "Cheese Garlic Bread", price: 149, image: "https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=500", description: "Toasted garlic bread infused with herbs and melted cheddar." }
  ],
  "Burger Hub": [
    { name: "Classic Cheeseburger", price: 199, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500", description: "Juicy beef/veg patty with cheddar, lettuce, and secret sauce." },
    { name: "Double Decker Burger", price: 299, image: "https://images.unsplash.com/photo-1594212202875-520e5de95fef?w=500", description: "Two flame-grilled patties loaded with bacon and caramel onions." },
    { name: "Crispy French Fries", price: 99, image: "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500", description: "Golden, hot, salted fries served with spicy mayo dip." }
  ],
  "Cafe Aroma": [
    { name: "Cappuccino", price: 149, image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500", description: "Espresso with silky steamed milk and velvety microfoam." },
    { name: "Chocolate Croissant", price: 120, image: "https://images.unsplash.com/photo-1623366302587-bcaeeaf5ebff?w=500", description: "Flaky French pastry baked with rich Belgian chocolate." },
    { name: "Iced Caramel Macchiato", price: 199, image: "https://images.unsplash.com/photo-1461023058943-07cb1ce8dbb3?w=500", description: "Cold espresso over vanilla milk topped with butter caramel drizzle." }
  ],
  "Pizza Hut": [
    { name: "Supreme Pan Pizza", price: 499, image: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=500", description: "Black olives, mushrooms, bell peppers, and succulent paneer." },
    { name: "BBQ Chicken Pizza", price: 449, image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500", description: "Smoky BBQ glazed chicken tenders on a golden pan crust." },
    { name: "Spicy Buffalo Wings", price: 249, image: "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=500", description: "Crisp glazed wings tossed in tangy hot buffalo sauce." }
  ],
  "Dominos": [
    { name: "ExtravaganZZa Pizza", price: 549, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500", description: "Loaded with all the supreme toppings and herbs." },
    { name: "Farmhouse Veggie", price: 399, image: "https://images.unsplash.com/photo-1541745537411-b8046f4d4362?w=500", description: "Crisp capsicum, juicy tomatoes, mushrooms, and golden corn." },
    { name: "Choco Lava Cake", price: 110, image: "https://images.unsplash.com/photo-1624353365286-cb18d5b40449?w=500", description: "Warm chocolate cake filled with molten chocolate fudge." }
  ]
};

// Database state management
class FoodAIDatabase {
  businesses: Business[] = [];
  users: User[] = [];
  interactions: Interaction[] = [];

  constructor() {
    this.load();
  }

  load() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const data = JSON.parse(raw);
        this.businesses = data.businesses || DEFAULT_BUSINESSES;
        this.users = data.users || DEFAULT_USERS;
        this.interactions = data.interactions || DEFAULT_INTERACTIONS;
        return;
      } catch (e) {
        console.error("Error reading database file, using defaults:", e);
      }
    }
    this.businesses = [...DEFAULT_BUSINESSES];
    this.users = [...DEFAULT_USERS];
    this.interactions = [...DEFAULT_INTERACTIONS];
    this.save();
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify({
        businesses: this.businesses,
        users: this.users,
        interactions: this.interactions,
      }, null, 2));
    } catch (e) {
      console.error("Failed to save database:", e);
    }
  }

  // AI Recommendation Engine: User-based collaborative filtering (Cosine Similarity)
  // Ported directly from ai_engine/recommendation.py
  getRecommendations(userId: number): Business[] {
    const allUsers = Array.from(new Set(this.interactions.map(i => i.user_id)));
    const allBusinesses = Array.from(new Set(this.interactions.map(i => i.business_id)));

    // User ratings map: userId -> { businessId: rating }
    const userRatings: Record<number, Record<number, number>> = {};
    for (const u of allUsers) {
      userRatings[u] = {};
    }
    for (const item of this.interactions) {
      if (!userRatings[item.user_id]) userRatings[item.user_id] = {};
      userRatings[item.user_id][item.business_id] = item.rating;
    }

    const targetRatings = userRatings[userId];
    if (!targetRatings || Object.keys(targetRatings).length === 0) {
      // Fallback: return top rated businesses
      return this.businesses.slice(0, 4);
    }

    // Calculate Cosine Similarity with every other user
    const similarities: { userId: number; similarity: number }[] = [];

    for (const otherId of allUsers) {
      if (otherId === userId) continue;
      const otherRatings = userRatings[otherId];

      let dotProduct = 0;
      let normA = 0;
      let normB = 0;

      for (const bId of allBusinesses) {
        const rA = targetRatings[bId] || 0;
        const rB = otherRatings[bId] || 0;
        dotProduct += rA * rB;
        normA += rA * rA;
        normB += rB * rB;
      }

      const denominator = Math.sqrt(normA) * Math.sqrt(normB);
      const similarity = denominator > 0 ? dotProduct / denominator : 0;
      similarities.push({ userId: otherId, similarity });
    }

    // Sort by similarity descending
    similarities.sort((a, b) => b.similarity - a.similarity);

    const recommendedBusinessIds = new Set<number>();
    const userAlreadyRated = new Set(Object.keys(targetRatings).map(Number));

    // Recommend businesses from top similar users that user hasn't rated
    for (const sim of similarities) {
      if (sim.similarity <= 0) continue;
      const otherRatings = userRatings[sim.userId];
      for (const [bIdStr, rating] of Object.entries(otherRatings)) {
        const bId = Number(bIdStr);
        if (!userAlreadyRated.has(bId) && rating >= 4) {
          recommendedBusinessIds.add(bId);
        }
      }
    }

    // If still empty, add top rated businesses not yet rated
    if (recommendedBusinessIds.size === 0) {
      for (const b of this.businesses) {
        if (!userAlreadyRated.has(b.business_id)) {
          recommendedBusinessIds.add(b.business_id);
          if (recommendedBusinessIds.size >= 3) break;
        }
      }
    }

    return this.businesses.filter(b => recommendedBusinessIds.has(b.business_id));
  }
}

const db = new FoodAIDatabase();

// -------------------------------------------------------------
// REST API Routes (Directly mirroring Flask backend endpoints)
// -------------------------------------------------------------

// Top businesses & all businesses
app.get('/api/businesses', (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const sorted = [...db.businesses].sort((a, b) => b.rating - a.rating);
  res.json(limit ? sorted.slice(0, limit) : sorted);
});

// Search businesses
app.get('/api/search', (req, res) => {
  const query = String(req.query.query || '').toLowerCase().trim();
  if (!query) {
    res.json(db.businesses);
    return;
  }
  const results = db.businesses.filter(b => 
    b.name.toLowerCase().includes(query) || 
    b.category.toLowerCase().includes(query) ||
    b.location.toLowerCase().includes(query)
  );
  res.json(results);
});

// Restaurant Menu Details
app.get('/api/restaurant-menu/:name', (req, res) => {
  const name = req.params.name;
  const restaurant = db.businesses.find(b => b.name.toLowerCase() === name.toLowerCase()) || {
    business_id: 99,
    name: name,
    category: "Food",
    location: "Indore",
    rating: 4.5,
    description: `Welcome to ${name}, serving authentic dishes with great hospitality.`
  };

  const menu = RESTAURANT_MENUS[restaurant.name] || [
    { name: "Chef's Special Combo", price: 299, image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=500", description: "Our most requested chef creation prepared with seasonal ingredients." },
    { name: "Crispy Appetizer Platter", price: 189, image: "https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=500", description: "Assorted savory treats with house special dips." },
    { name: "Refreshing Beverage", price: 99, image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500", description: "Freshly chilled signature mocktail." }
  ];

  res.json({ restaurant, menu });
});

// Rate business
app.post('/api/rate', (req, res) => {
  const userId = Number(req.body.user_id) || 1;
  const businessId = Number(req.body.business_id);
  const rating = Number(req.body.rating);

  if (!businessId || !rating) {
    res.status(400).json({ error: 'Missing business_id or rating' });
    return;
  }

  // Update or insert interaction
  const existingIndex = db.interactions.findIndex(i => i.user_id === userId && i.business_id === businessId);
  if (existingIndex >= 0) {
    db.interactions[existingIndex].rating = rating;
  } else {
    db.interactions.push({
      id: db.interactions.length + 1,
      user_id: userId,
      business_id: businessId,
      rating: rating,
    });
  }

  // Recalculate average rating for business
  const businessRatings = db.interactions.filter(i => i.business_id === businessId).map(i => i.rating);
  const avg = businessRatings.reduce((a, b) => a + b, 0) / businessRatings.length;
  const bIndex = db.businesses.findIndex(b => b.business_id === businessId);
  if (bIndex >= 0) {
    db.businesses[bIndex].rating = Number(avg.toFixed(1));
  }

  db.save();
  res.json({ success: true, message: 'Rating submitted successfully!', newRating: db.businesses[bIndex]?.rating });
});

// Recommendations API
app.get('/api/recommend', (req, res) => {
  const userId = Number(req.query.user_id) || 1;
  const recommendations = db.getRecommendations(userId);
  res.json(recommendations);
});

// AI Chatbot API (Ported from Flask /chatbot route)
app.post('/api/chatbot', (req, res) => {
  const message = String(req.body.message || '').toLowerCase();
  const userName = req.body.user_name || "Foodie";

  let reply = `I'm not sure I understand, ${userName}. You can ask me for 'Top 5 restaurants', 'Recommendations', or 'Pizza'!`;

  // 1. Greetings
  if (["hello", "hi", "hey", "morning", "evening"].some(w => message.includes(w))) {
    reply = `Hello there, ${userName}! I am FoodAI, your smart assistant. How can I help you find delicious food today? 🍕`;
  }
  // 2. How it works
  else if (["how does this", "how it works", "how do you work", "about foodai"].some(w => message.includes(w))) {
    reply = "FoodAI uses your past ratings and likes to find the absolute best restaurants for you using Collaborative Filtering Machine Learning! Try exploring the 'Recommendations' tab.";
  }
  // 3. Creator/Team
  else if (["who built you", "creator", "team", "who made you", "admin", "lead", "developer"].some(w => message.includes(w))) {
    reply = "I was built by an amazing team: Lalit Verma (Backend & AI Lead), Ritesh (Database Lead), and Sourabh (Frontend Developer) for this exciting project!";
  }
  // 4. Specific Rating Checks
  else if (["5 star", "5 rating", "rating 5", "five star"].some(w => message.includes(w))) {
    reply = "Looking for 5-star perfection? 'Pizza Palace' (4.6 ⭐) and 'Cafe Aroma' (4.5 ⭐) are our highest-rated restaurants with outstanding guest reviews!";
  }
  else if (["4 star", "4 rating", "rating 4", "four star"].some(w => message.includes(w))) {
    reply = "We have great 4-star options! 'Burger Hub' (4.4 ⭐) and 'Pizza Hut' (4.2 ⭐) are fantastic choices in the 4-star range.";
  }
  else if (["3 star", "3 rating", "2 star", "1 star"].some(w => message.includes(w))) {
    reply = "We try to only recommend the best! All of our featured restaurants are rated 4.1 stars or higher for superior quality.";
  }
  // 5. Top Rated
  else if (["top rated", "best restaurant", "top 5", "top five", "highest rated", "good food"].some(w => message.includes(w))) {
    reply = "Here are our Top Rated overall: 1. Pizza Palace (4.6 ⭐), 2. Cafe Aroma (4.5 ⭐), 3. Burger Hub (4.4 ⭐), 4. Pizza Hut (4.2 ⭐), 5. Dominos (4.1 ⭐).";
  }
  // 6. Recommendations
  else if (["recommend", "recommendation", "suggest", "what should i eat", "hungry"].some(w => message.includes(w))) {
    reply = `Based on our AI collaborative model, ${userName}: If you love fast food, check out 'Pizza Palace' or 'Burger Hub'. Head to the Recommendations tab to see custom AI suggestions tailored to your ratings!`;
  }
  // 7. Cravings
  else if (message.includes("pizza")) {
    reply = "If you are craving pizza, I highly recommend 'Pizza Palace' or 'Dominos'. Pizza Palace has an amazing Margherita for ₹249!";
  }
  else if (message.includes("burger")) {
    reply = "'Burger Hub' is the place to go! Their Classic Cheeseburger is very popular at ₹199.";
  }
  else if (["coffee", "cafe", "tea", "drink"].some(w => message.includes(w))) {
    reply = "'Cafe Aroma' is perfect for that. Check out their Iced Caramel Macchiato (₹199) and Chocolate Croissant!";
  }
  else if (["dessert", "sweet", "cake"].some(w => message.includes(w))) {
    reply = "'Dominos' has a legendary Choco Lava Cake for just ₹110, or visit 'Sweet Tooth Desserts'!";
  }
  else if (message.includes("chinese")) {
    reply = "Try 'Wok & Roll' for spicy Hakka noodles, crispy Manchurian, and sizzling hot plates!";
  }

  res.json({ reply });
});

// User Auth APIs
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase() && u.password === password);
  if (user) {
    res.json({
      status: 'success',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        preferences: user.preferences
      }
    });
  } else {
    res.status(401).json({ status: 'error', message: 'Invalid email or password.' });
  }
});

app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ status: 'error', message: 'All fields are required.' });
    return;
  }
  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    res.status(400).json({ status: 'error', message: 'Email already registered.' });
    return;
  }
  const newUser: User = {
    id: db.users.length + 1,
    name,
    email,
    password
  };
  db.users.push(newUser);
  db.save();
  res.json({ status: 'success', message: 'User registered successfully!' });
});

// Serve static imported project preview if needed
app.use('/preview-imported', express.static(path.resolve(__dirname, 'imported_project')));

// -------------------------------------------------------------
// Vite Server Integration
// -------------------------------------------------------------
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FoodAI Server listening on port ${PORT}`);
  });
}

startServer();
