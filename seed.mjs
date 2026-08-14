import mongoose from "mongoose";
import fs from "fs";
import path from "path";

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
});

const Medicine = mongoose.models.Medicine || mongoose.model("Medicine", MedicineSchema);
const Sale = mongoose.models.Sale || mongoose.model("Sale", SaleSchema);

// Constants
const TARGET_MEDICINES = 2000;
const TARGET_SALES = 500;
const CHUNK_SIZE = 500;

const medNames = ["Paracetamol", "Azithromycin", "Amoxicillin", "Cefixime", "Pantoprazole", "Rabeprazole", "Domperidone", "Diclofenac", "Levocetirizine", "Montelukast", "Telmisartan", "Metformin", "Amlodipine", "Atorvastatin", "Rosuvastatin", "Glimepiride", "Ibuprofen", "Vitamin C", "Zincovit", "Dolo", "Calpol", "Cheston Cold"];
const distributors = ["Cipla", "Sun Pharma", "Mankind", "Macleods", "Lupin", "Alkem", "Intas", "Torrent", "Zydus", "Dr. Reddy's"];
const paymentMethods = ["Cash", "UPI", "Card"];

// Calculate EAN-8 checksum digit
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

async function seed() {
    console.log("🚀 Starting Massive Seeding Process...");
    console.log("🔗 Connecting to MongoDB:", mongoUri);
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB.");

    console.log("🗑️ Deleting existing medicines and sales...");
    await Medicine.deleteMany({});
    await Sale.deleteMany({});
    console.log("✅ Cleared old data.");

    console.log(`\n⏳ Inserting ${TARGET_MEDICINES} Medicines in chunks of ${CHUNK_SIZE}...`);
    let insertedMedsCount = 0;
    
    // We need to keep some generated IDs so we can link sales later
    const sampleMedIds = [];

    for (let i = 0; i < TARGET_MEDICINES; i += CHUNK_SIZE) {
        const chunk = [];
        for (let j = 0; j < CHUNK_SIZE; j++) {
            const index = i + j;
            if (index >= TARGET_MEDICINES) break;

            const randomName = medNames[Math.floor(Math.random() * medNames.length)];
            const mg = [100, 250, 500, 650][Math.floor(Math.random() * 4)];
            const today = new Date();
            const expiry = new Date();
            expiry.setDate(today.getDate() + (Math.floor(Math.random() * 800) - 15)); 
            const purchase = new Date();
            purchase.setDate(today.getDate() - Math.floor(Math.random() * 100));

            const qty = Math.floor(Math.random() * 150); 
            const mrp = Math.floor(Math.random() * 500) + 15;
            
            const _id = new mongoose.Types.ObjectId();
            if (sampleMedIds.length < 5000) {
                sampleMedIds.push({ _id, name: `${randomName} ${mg}mg`, mrp });
            }

            chunk.push({
                _id,
                name: `${randomName} ${mg}mg`,
                batch: `B-${Math.floor(Math.random() * 90000) + 10000}`,
                expiryDate: expiry,
                quantity: qty,
                mrp: mrp,
                distributor: distributors[Math.floor(Math.random() * distributors.length)],
                billNumber: `INV-${Math.floor(Math.random() * 9000) + 1000}`,
                purchaseDate: purchase,
                barcodeId: generateEan8ForSeed(),
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
        await Medicine.insertMany(chunk);
        insertedMedsCount += chunk.length;
        process.stdout.write(`\r✅ Inserted ${insertedMedsCount} / ${TARGET_MEDICINES} medicines`);
    }

    console.log(`\n\n⏳ Inserting ${TARGET_SALES} Sales in chunks of ${CHUNK_SIZE}...`);
    let insertedSalesCount = 0;

    for (let i = 0; i < TARGET_SALES; i += CHUNK_SIZE) {
        const chunk = [];
        for (let j = 0; j < CHUNK_SIZE; j++) {
            const index = i + j;
            if (index >= TARGET_SALES) break;

            const saleItemsCount = Math.floor(Math.random() * 4) + 1;
            const saleItems = [];
            let totalAmount = 0;

            for(let k = 0; k < saleItemsCount; k++) {
                const randomMed = sampleMedIds[Math.floor(Math.random() * sampleMedIds.length)];
                const sellQty = Math.floor(Math.random() * 5) + 1;
                const itemTotal = sellQty * randomMed.mrp;
                totalAmount += itemTotal;

                saleItems.push({
                    medicineId: randomMed._id,
                    name: randomMed.name,
                    quantity: sellQty,
                    mrp: randomMed.mrp,
                    total: itemTotal
                });
            }

            const saleDate = new Date();
            saleDate.setDate(saleDate.getDate() - Math.floor(Math.random() * 90));

            chunk.push({
                items: saleItems,
                totalAmount: totalAmount,
                paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
                date: saleDate
            });
        }
        await Sale.insertMany(chunk);
        insertedSalesCount += chunk.length;
        process.stdout.write(`\r✅ Inserted ${insertedSalesCount} / ${TARGET_SALES} sales`);
    }

    console.log("\n\n🎉 BINGO! Seeding Process Completed Successfully!");
    process.exit(0);
}

seed().catch(err => {
  console.error("❌ Seeding Error:", err);
  process.exit(1);
});
