import mongoose from "mongoose";
import dns from "dns";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {
  // Ignore if restricted
}

// Manually parse .env
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf8");
  envConfig.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let val = match[2] || "";
      val = val.replace(/^['"](.*)['"]$/, "$1"); // remove quotes
      process.env[match[1]] = val;
    }
  });
}

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/medicalshop";

// Schemas
const MedicineSchema = new mongoose.Schema({
    name: String,
    batch: String,
    expiryDate: Date,
    quantity: Number,
    mrp: Number,
    distributor: String,
    billNumber: String,
    purchaseDate: Date,
    barcodeId: String,
    createdAt: Date,
    updatedAt: Date
});

const SaleItemSchema = new mongoose.Schema({
  medicineId: mongoose.Schema.Types.ObjectId,
  name: String,
  quantity: Number,
  mrp: Number,
  total: Number 
}, { _id: false }); 

const SaleSchema = new mongoose.Schema({
  items: [SaleItemSchema],
  totalAmount: Number,
  paymentMethod: String,
  date: Date
}, { timestamps: true });

const DistributorSchema = new mongoose.Schema({
    name: { type: String, unique: true, trim: true },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    gstin: { type: String, default: "" },
    contactPerson: { type: String, default: "" }
}, { timestamps: true });

const SettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff' }
}, { timestamps: true });

const Medicine = mongoose.models.Medicine || mongoose.model("Medicine", MedicineSchema);
const Sale = mongoose.models.Sale || mongoose.model("Sale", SaleSchema);
const Distributor = mongoose.models.Distributor || mongoose.model("Distributor", DistributorSchema);
const Settings = mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);
const User = mongoose.models.User || mongoose.model("User", UserSchema);

// Calculate EAN-8 check digit
function calculateEan8CheckDigit(digits7) {
    const weights = [3, 1, 3, 1, 3, 1, 3];
    let sum = 0;
    for (let i = 0; i < 7; i++) {
        sum += parseInt(digits7[i], 10) * weights[i];
    }
    return (10 - (sum % 10)) % 10;
}

const usedBarcodes = new Set();
function generateEan8ForSeed() {
    while (true) {
        let digits7 = Math.floor(1 + Math.random() * 9).toString();
        for (let i = 1; i < 7; i++) {
            digits7 += Math.floor(Math.random() * 10).toString();
        }
        const checkDigit = calculateEan8CheckDigit(digits7);
        const barcodeId = digits7 + checkDigit;
        if (!usedBarcodes.has(barcodeId)) {
            usedBarcodes.add(barcodeId);
            return barcodeId;
        }
    }
}

// 15 Realistic Registered Distributors
const distributorData = [
  { name: "Sun Pharma Agency", phone: "+91 98301 22450", email: "orders@sunpharma-agency.com", address: "Shop 14, Pharma Complex, Kolkata, West Bengal", gstin: "19AAACS1234F1Z5", contactPerson: "Rajesh Mukherjee" },
  { name: "Cipla Healthcare Distribution", phone: "+91 98205 66780", email: "sales@cipla-dist.com", address: "Plot 88, MIDC Andheri East, Mumbai, Maharashtra", gstin: "27AAACC5678G1Z2", contactPerson: "Amitabh Deshmukh" },
  { name: "Abbott India Wholesalers", phone: "+91 98112 33490", email: "care@abbottwholesalers.in", address: "42 Okhla Industrial Area Phase 2, New Delhi", gstin: "07AAACA9012H1Z8", contactPerson: "Sanjay Sharma" },
  { name: "Mankind Pharma Supply Hub", phone: "+91 99099 88123", email: "mankind@pharmahub.in", address: "GIDC Vatva, Ahmedabad, Gujarat", gstin: "24AAACM3456J1Z1", contactPerson: "Bhavin Patel" },
  { name: "Torrent Wholesalers Ltd", phone: "+91 98220 11987", email: "supply@torrent-wholesalers.com", address: "B-12 Hadapsar Industrial Estate, Pune, Maharashtra", gstin: "27AAACT7890K1Z4", contactPerson: "Pooja Kulkarni" },
  { name: "Macleods Pharma Agency", phone: "+91 94310 55432", email: "macleods@patnadist.com", address: "Exhibition Road, Near Gandhi Maidan, Patna, Bihar", gstin: "10AAACM1122L1Z9", contactPerson: "Vikas Kumar Singh" },
  { name: "Lupin Healthcare Agency", phone: "+91 98450 77654", email: "lupin@bangaloredist.com", address: "Peenya Industrial Area 4th Phase, Bangalore, Karnataka", gstin: "29AAACL4455M1Z3", contactPerson: "Kavitha R." },
  { name: "Alkem Laboratories Agency", phone: "+91 98490 22331", email: "alkem@hyderabadhub.in", address: "Sanath Nagar Main Road, Hyderabad, Telangana", gstin: "36AAACA7788N1Z7", contactPerson: "K. Venkatesh" },
  { name: "Dr. Reddy's Supply Agency", phone: "+91 98400 99887", email: "sales@drreddysupply.com", address: "Guindy Industrial Estate, Chennai, Tamil Nadu", gstin: "33AAACD9900P1Z6", contactPerson: "R. Sundaram" },
  { name: "Zydus Cadila Agency", phone: "+91 98290 44556", email: "orders@zydus-jaipur.com", address: "VKIA Road No. 9, Jaipur, Rajasthan", gstin: "08AAACZ2233Q1Z0", contactPerson: "Mahesh Choudhary" },
  { name: "Intas Pharmaceuticals Supply", phone: "+91 94150 88776", email: "intas@lucknowdist.com", address: "Transport Nagar, Phase 1, Lucknow, Uttar Pradesh", gstin: "09AAACI5566R1Z4", contactPerson: "Pradeep Tripathi" },
  { name: "Glenmark Lifesciences Agency", phone: "+91 98260 33221", email: "glenmark@indorehub.in", address: "Sanwer Road Industrial Area, Indore, Madhya Pradesh", gstin: "23AAACG8899S1Z8", contactPerson: "Anil Jain" },
  { name: "Aristo Pharmaceuticals Agency", phone: "+91 94500 12345", email: "aristo@varanasidist.com", address: "Lanka Bypass, Varanasi, Uttar Pradesh", gstin: "09AAACA3344T1Z2", contactPerson: "Subhash Yadav" },
  { name: "Micro Labs Supply Hub", phone: "+91 98640 66554", email: "microlabs@guwahatidist.com", address: "Paltan Bazar Commercial Complex, Guwahati, Assam", gstin: "18AAACM6677U1Z6", contactPerson: "Deben Das" },
  { name: "Pfizer Healthcare Wholesalers", phone: "+91 98720 99112", email: "pfizer@chandigarhdist.com", address: "Industrial Area Phase 1, Chandigarh, Punjab", gstin: "04AAACP9911V1Z1", contactPerson: "Harpreet Singh" }
];

// Rich Medicine Catalog across multiple therapeutic classes
const medicineCatalog = [
  // 1. Painkillers & Fever (Analgesics / Antipyretics)
  { name: "Dolo 650 Tablet", mrp: 34, distributor: "Micro Labs Supply Hub", location: "Rack A-1" },
  { name: "Calpol 500mg Tablet", mrp: 22, distributor: "GlaxoSmithKline Agency", location: "Rack A-1" },
  { name: "Combiflam Tablet", mrp: 45, distributor: "Sun Pharma Agency", location: "Rack A-2" },
  { name: "Crocin Advance 500mg", mrp: 20, distributor: "GlaxoSmithKline Agency", location: "Rack A-2" },
  { name: "Meftal Spas Tablet", mrp: 52, distributor: "Mankind Pharma Supply Hub", location: "Rack A-3" },
  { name: "Zerodol-P Tablet", mrp: 65, distributor: "Cipla Healthcare Distribution", location: "Rack A-3" },
  { name: "Zerodol-SP Tablet", mrp: 110, distributor: "Cipla Healthcare Distribution", location: "Rack A-4" },
  { name: "Voveran 50mg Tablet", mrp: 78, distributor: "Sun Pharma Agency", location: "Rack A-4" },
  { name: "Saridon Headache Relief", mrp: 38, distributor: "Piramal Healthcare", location: "Counter Tray-1" },
  { name: "Ultracet Semi Tablet", mrp: 160, distributor: "Abbott India Wholesalers", location: "Rack A-5" },

  // 2. Antibiotics & Anti-Infectives
  { name: "Azithral 500mg Tablet", mrp: 125, distributor: "Alkem Laboratories Agency", location: "Rack B-1" },
  { name: "Augmentin 625 Duo Tablet", mrp: 210, distributor: "Abbott India Wholesalers", location: "Rack B-1" },
  { name: "Clavam 625 Tablet", mrp: 198, distributor: "Alkem Laboratories Agency", location: "Rack B-2" },
  { name: "Taxim-O 200mg Tablet", mrp: 115, distributor: "Alkem Laboratories Agency", location: "Rack B-2" },
  { name: "Cefix 200mg Tablet", mrp: 108, distributor: "Cipla Healthcare Distribution", location: "Rack B-3" },
  { name: "Cifran 500mg Tablet", mrp: 85, distributor: "Sun Pharma Agency", location: "Rack B-3" },
  { name: "Norflox-TZ Tablet", mrp: 95, distributor: "Cipla Healthcare Distribution", location: "Rack B-4" },
  { name: "Levomac 500mg Tablet", mrp: 112, distributor: "Macleods Pharma Agency", location: "Rack B-4" },
  { name: "Moxikind-CV 625", mrp: 185, distributor: "Mankind Pharma Supply Hub", location: "Rack B-5" },
  { name: "Oflox 200mg Tablet", mrp: 72, distributor: "Cipla Healthcare Distribution", location: "Rack B-5" },

  // 3. Antacids, PPIs & Gastrointestinal
  { name: "Pan 40mg Tablet", mrp: 155, distributor: "Alkem Laboratories Agency", location: "Shelf C-1" },
  { name: "Pan-D Capsule", mrp: 195, distributor: "Alkem Laboratories Agency", location: "Shelf C-1" },
  { name: "Pantocid 40mg Tablet", mrp: 160, distributor: "Sun Pharma Agency", location: "Shelf C-2" },
  { name: "Pantocid DSR Capsule", mrp: 220, distributor: "Sun Pharma Agency", location: "Shelf C-2" },
  { name: "Razo 20mg Tablet", mrp: 175, distributor: "Dr. Reddy's Supply Agency", location: "Shelf C-3" },
  { name: "Razo-D Capsule", mrp: 235, distributor: "Dr. Reddy's Supply Agency", location: "Shelf C-3" },
  { name: "Omez 20mg Capsule", mrp: 62, distributor: "Dr. Reddy's Supply Agency", location: "Shelf C-4" },
  { name: "Aciloc 150mg Tablet", mrp: 42, distributor: "Cadila Pharmaceuticals", location: "Shelf C-4" },
  { name: "Gelusil Antacid Liquid 200ml", mrp: 135, distributor: "Pfizer Healthcare Wholesalers", location: "Shelf C-5" },
  { name: "Digene Gel Mint 200ml", mrp: 140, distributor: "Abbott India Wholesalers", location: "Shelf C-5" },
  { name: "Cremaffin Plus Syrup 225ml", mrp: 275, distributor: "Abbott India Wholesalers", location: "Shelf C-6" },
  { name: "Eldoper Capsule 2mg", mrp: 35, distributor: "Micro Labs Supply Hub", location: "Shelf C-6" },

  // 4. Anti-Allergy, Cold & Cough
  { name: "Allegra 120mg Tablet", mrp: 180, distributor: "Sanofi Healthcare", location: "Rack D-1" },
  { name: "Allegra 180mg Tablet", mrp: 240, distributor: "Sanofi Healthcare", location: "Rack D-1" },
  { name: "Montair-LC Tablet", mrp: 285, distributor: "Cipla Healthcare Distribution", location: "Rack D-2" },
  { name: "Levocet-M Tablet", mrp: 145, distributor: "Hetero Healthcare", location: "Rack D-2" },
  { name: "Cetzine 10mg Tablet", mrp: 25, distributor: "GlaxoSmithKline Agency", location: "Rack D-3" },
  { name: "Cheston Cold Tablet", mrp: 55, distributor: "Cipla Healthcare Distribution", location: "Rack D-3" },
  { name: "Ascoril-D Plus Syrup 100ml", mrp: 125, distributor: "Glenmark Lifesciences Agency", location: "Rack D-4" },
  { name: "Alex Syrup 100ml", mrp: 130, distributor: "Glenmark Lifesciences Agency", location: "Rack D-4" },
  { name: "Benadryl Cough Syrup 100ml", mrp: 120, distributor: "Johnson & Johnson", location: "Rack D-5" },
  { name: "Otrivin Adult Nasal Spray 10ml", mrp: 98, distributor: "GlaxoSmithKline Agency", location: "Counter Tray-1" },
  { name: "Sinarest New Tablet", mrp: 68, distributor: "Centaur Pharmaceuticals", location: "Rack D-5" },

  // 5. Diabetes & Cardiac Care
  { name: "Glycomet GP 1 Tablet", mrp: 110, distributor: "USV Private Limited", location: "Rack E-1" },
  { name: "Glycomet GP 2 Tablet", mrp: 148, distributor: "USV Private Limited", location: "Rack E-1" },
  { name: "Metformin 500mg SR", mrp: 38, distributor: "Torrent Wholesalers Ltd", location: "Rack E-2" },
  { name: "Janumet 50/500mg Tablet", mrp: 460, distributor: "MSD Pharmaceuticals", location: "Rack E-2" },
  { name: "Telma 40mg Tablet", mrp: 185, distributor: "Glenmark Lifesciences Agency", location: "Rack E-3" },
  { name: "Telma-H Tablet", mrp: 295, distributor: "Glenmark Lifesciences Agency", location: "Rack E-3" },
  { name: "Amlong 5mg Tablet", mrp: 65, distributor: "Micro Labs Supply Hub", location: "Rack E-4" },
  { name: "Atorva 10mg Tablet", mrp: 120, distributor: "Zydus Cadila Agency", location: "Rack E-4" },
  { name: "Rosuvas 10mg Tablet", mrp: 215, distributor: "Sun Pharma Agency", location: "Rack E-5" },
  { name: "Concor 5mg Tablet", mrp: 135, distributor: "Merck Healthcare", location: "Rack E-5" },
  { name: "Ecosprin 75mg Tablet", mrp: 12, distributor: "USV Private Limited", location: "Rack E-6" },

  // 6. Vitamins, Minerals & Supplements
  { name: "Becosules Z Capsule", mrp: 48, distributor: "Pfizer Healthcare Wholesalers", location: "Shelf F-1" },
  { name: "Neurobion Forte Tablet", mrp: 42, distributor: "Procter & Gamble Health", location: "Shelf F-1" },
  { name: "Shelcal 500mg Tablet", mrp: 132, distributor: "Torrent Wholesalers Ltd", location: "Shelf F-2" },
  { name: "Zincovit Tablet", mrp: 115, distributor: "Apex Laboratories", location: "Shelf F-2" },
  { name: "Limcee 500mg Chewable", mrp: 28, distributor: "Abbott India Wholesalers", location: "Shelf F-3" },
  { name: "Supradyn Daily Multivitamin", mrp: 55, distributor: "Bayer Pharmaceuticals", location: "Shelf F-3" },
  { name: "Evion 400mg Capsule", mrp: 38, distributor: "Merck Healthcare", location: "Shelf F-4" },
  { name: "Uprise-D3 60K Capsule", mrp: 220, distributor: "Alkem Laboratories Agency", location: "Shelf F-4" },
  { name: "A-Z Multivitamin Drops", mrp: 95, distributor: "Alkem Laboratories Agency", location: "Shelf F-5" },

  // 7. Dermatology, Ointments & Topicals
  { name: "Betadine 10% Ointment 20g", mrp: 125, distributor: "Win-Medicare Agency", location: "Drawer D-1" },
  { name: "Soframycin Skin Cream 30g", mrp: 62, distributor: "Sanofi Healthcare", location: "Drawer D-1" },
  { name: "Volini Pain Relief Gel 30g", mrp: 145, distributor: "Sun Pharma Agency", location: "Counter Tray-2" },
  { name: "Moov Pain Relief Spray 50g", mrp: 170, distributor: "Reckitt Benckiser", location: "Counter Tray-2" },
  { name: "Burnol Antiseptic Cream 20g", mrp: 58, distributor: "Morepen Laboratories", location: "Drawer D-2" },
  { name: "Candid-B Cream 20g", mrp: 165, distributor: "Glenmark Lifesciences Agency", location: "Drawer D-2" },
  { name: "Quadriderm RF Cream 10g", mrp: 98, distributor: "Fulford India", location: "Drawer D-3" },

  // 8. Respiratory, Inhalers & Cold Storage (Fridge)
  { name: "Asthalin 100mcg Inhaler", mrp: 165, distributor: "Cipla Healthcare Distribution", location: "Fridge-1 (2-8°C)" },
  { name: "Budecort 200 Rotacaps", mrp: 210, distributor: "Cipla Healthcare Distribution", location: "Cold-Cabinet" },
  { name: "Foracort 200 Inhaler", mrp: 440, distributor: "Cipla Healthcare Distribution", location: "Cold-Cabinet" },
  { name: "Human Mixtard 30/70 Insulin", mrp: 215, distributor: "Novo Nordisk Agency", location: "Fridge-1 (2-8°C)" },
  { name: "Lantus Solostar Insulin Pen", mrp: 850, distributor: "Sanofi Healthcare", location: "Fridge-1 (2-8°C)" },
  { name: "Novorapid Flexpen", mrp: 690, distributor: "Novo Nordisk Agency", location: "Fridge-1 (2-8°C)" },

  // 9. Eye / Ear Drops & First Aid
  { name: "Ciplox 0.3% Eye Drops", mrp: 20, distributor: "Cipla Healthcare Distribution", location: "Drawer D-3" },
  { name: "Refresh Tears Eye Drops 10ml", mrp: 175, distributor: "Allergan India", location: "Drawer D-3" },
  { name: "Waxolve Ear Drops 10ml", mrp: 95, distributor: "Sun Pharma Agency", location: "Drawer D-4" },
  { name: "Band-Aid Washproof Strips (Pack of 20)", mrp: 60, distributor: "Johnson & Johnson", location: "Counter Tray-1" },
  { name: "Dettol Antiseptic Liquid 250ml", mrp: 145, distributor: "Reckitt Benckiser", location: "Shelf C-5" },
  { name: "Savlon Antiseptic Liquid 200ml", mrp: 110, distributor: "ITC Healthcare", location: "Shelf C-5" }
];

const paymentMethods = ["Cash", "UPI", "Card"];

async function runSeed() {
  console.log("🚀 Starting Comprehensive ERP Demo Seeding Process...");
  console.log("🔗 MongoDB Connection URI:", mongoUri);

  await mongoose.connect(mongoUri);
  console.log("✅ Successfully connected to MongoDB.");

  // Clear previous data
  console.log("\n🗑️ Clearing old medicines, sales, distributors, and test settings...");
  await Medicine.deleteMany({});
  await Sale.deleteMany({});
  await Distributor.deleteMany({});
  await Settings.deleteMany({});
  await User.deleteMany({});

  // 1. Seed Registered Distributors
  console.log(`\n⏳ Seeding ${distributorData.length} Registered Distributors...`);
  for (const dist of distributorData) {
    await Distributor.create(dist);
  }
  console.log("✅ 15 Registered Pharma Distributors Seeded.");

  // 2. Seed Default Printer Settings
  console.log("\n⏳ Initializing Thermal Printer Settings...");
  await Settings.create({
    key: "printer_settings",
    value: {
      layoutType: "1-UP",
      barcodeFormat: "CODE128",
      width: 50,
      height: 25,
      fontSize: 8,
      gap: 2,
      showBillNumber: true,
      showPurchaseDate: true,
      useGuidelines: false,
      quietZone: 15,
      lineThickness: 1.2,
      barcodeHeight: 15
    }
  });
  console.log("✅ Default Printer Settings Initialized.");

  // 3. Seed Demo Staff User
  console.log("\n⏳ Creating Demo Staff User...");
  const salt = await bcrypt.genSalt(10);
  const staffHashedPassword = await bcrypt.hash("staff123", salt);
  await User.create({
    username: "staff",
    password: staffHashedPassword,
    role: "staff"
  });
  console.log("✅ Demo Staff User Created (username: 'staff', password: 'staff123')");

  // 4. Seed Rich Medicine Catalog with diverse scenarios
  console.log(`\n⏳ Seeding ${medicineCatalog.length} Real Medicines with realistic stock & expiry states...`);
  const seededMedicines = [];
  const today = new Date();

  for (let idx = 0; idx < medicineCatalog.length; idx++) {
    const item = medicineCatalog[idx];
    const _id = new mongoose.Types.ObjectId();

    // Distribute stock and expiry across different scenarios:
    let quantity;
    let expiryDate = new Date();
    let purchaseDate = new Date();

    // Scenario 1: Low stock (< 10) (indices 0, 5, 10, 15, 20...)
    if (idx % 12 === 0) {
      quantity = Math.floor(Math.random() * 6) + 2; // 2 - 7 units
      expiryDate.setFullYear(today.getFullYear() + 2);
      purchaseDate.setDate(today.getDate() - 25);
    }
    // Scenario 2: Out of Stock (= 0) (indices 3, 14, 27, 39...)
    else if (idx % 15 === 3) {
      quantity = 0;
      expiryDate.setMonth(today.getMonth() - 2); // expired 2 months ago
      purchaseDate.setDate(today.getDate() - 180);
    }
    // Scenario 3: Near Expiry (within 30 days) (indices 7, 22, 35...)
    else if (idx % 15 === 7) {
      quantity = Math.floor(Math.random() * 25) + 10;
      expiryDate.setDate(today.getDate() + 18); // expires in 18 days
      purchaseDate.setDate(today.getDate() - 120);
    }
    // Scenario 4: Fully Expired (indices 9, 29, 44...)
    else if (idx % 20 === 9) {
      quantity = 0;
      expiryDate.setMonth(today.getMonth() - 8); // expired 8 months ago
      purchaseDate.setDate(today.getDate() - 365);
    }
    // Scenario 5: Normal Fresh High Stock
    else {
      quantity = Math.floor(Math.random() * 120) + 20; // 20 - 140 units
      expiryDate.setFullYear(today.getFullYear() + Math.floor(Math.random() * 2) + 2); // 2028-2029
      purchaseDate.setDate(today.getDate() - Math.floor(Math.random() * 60) - 5);
    }

    const medDoc = {
      _id,
      name: item.name,
      batch: `BAT-${Math.floor(1000 + Math.random() * 9000)} (${item.location})`,
      expiryDate: expiryDate,
      quantity: quantity,
      mrp: item.mrp,
      distributor: item.distributor,
      billNumber: `BILL-${Math.floor(10000 + Math.random() * 90000)}`,
      purchaseDate: purchaseDate,
      barcodeId: generateEan8ForSeed(),
      createdAt: purchaseDate,
      updatedAt: purchaseDate
    };

    seededMedicines.push(medDoc);
  }

  await Medicine.insertMany(seededMedicines);
  console.log(`✅ Seeded ${seededMedicines.length} Medicines with Barcodes, Locations & Stock Levels.`);

  // 5. Seed Realistic Sales Transactions
  console.log("\n⏳ Generating 120 Realistic Sales Transactions over past 90 days...");
  const salesList = [];
  const inStockMedicines = seededMedicines.filter(m => m.quantity > 0);

  for (let s = 0; s < 120; s++) {
    // Generate sale date with distribution (more sales in recent days)
    const saleDate = new Date();
    let daysAgo = 0;
    if (s < 30) {
      // 30 sales for today & yesterday
      daysAgo = s % 2;
      saleDate.setHours(Math.floor(Math.random() * 12) + 9, Math.floor(Math.random() * 60));
    } else if (s < 70) {
      // 40 sales for this past month
      daysAgo = Math.floor(Math.random() * 28) + 2;
    } else {
      // 50 sales spread across last 3 to 6 months
      daysAgo = Math.floor(Math.random() * 150) + 30;
    }
    saleDate.setDate(saleDate.getDate() - daysAgo);

    // Random 1 to 4 items in each sale
    const itemCount = Math.floor(Math.random() * 4) + 1;
    const saleItems = [];
    let totalBill = 0;

    for (let i = 0; i < itemCount; i++) {
      const chosenMed = inStockMedicines[Math.floor(Math.random() * inStockMedicines.length)];
      const qtySold = Math.floor(Math.random() * 3) + 1;
      const itemTotal = qtySold * chosenMed.mrp;
      totalBill += itemTotal;

      saleItems.push({
        medicineId: chosenMed._id,
        name: chosenMed.name,
        quantity: qtySold,
        mrp: chosenMed.mrp,
        total: itemTotal
      });
    }

    salesList.push({
      items: saleItems,
      totalAmount: totalBill,
      paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      date: saleDate,
      createdAt: saleDate,
      updatedAt: saleDate
    });
  }

  await Sale.insertMany(salesList);
  console.log(`✅ Seeded ${salesList.length} Sales Transactions across Cash, UPI & Card.`);

  console.log("\n============================================================");
  console.log("🎉 ALL DEMO DATA GENERATED & READY FOR EXPLORATION!");
  console.log("============================================================");
  console.log("📊 Summary of Seeded Data:");
  console.log(`  • Registered Distributors : ${distributorData.length} Agencies`);
  console.log(`  • Medicine Catalog Items  : ${seededMedicines.length} Medicines`);
  console.log(`  • Sales Transactions      : ${salesList.length} Invoices`);
  console.log(`  • Demo Staff Account      : Username: 'staff' | Password: 'staff123'`);
  console.log("============================================================\n");

  process.exit(0);
}

runSeed().catch(err => {
  console.error("❌ Seeding Error:", err);
  process.exit(1);
});
