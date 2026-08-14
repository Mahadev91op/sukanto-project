import mongoose from "mongoose";

const MedicineSchema = new mongoose.Schema({
    name: { type: String, required: [true, "Medicine name is required"], trim: true },
    batch: { type: String, required: [true, "Location is required"], trim: true },
    expiryDate: { type: Date, required: [true, "Expiry date is required"] },
    quantity: { type: Number, required: [true, "Quantity is required"], min: [0, "Quantity cannot be less than 0"] },
    mrp: { type: Number, required: [true, "MRP is required"] },
    distributor: { type: String, required: true, trim: true },

    billNumber: { type: String, required: [true, "Bill number is required"], trim: true },
    purchaseDate: { type: Date, required: [true, "Purchase date is required"] },

    barcodeId: { type: String, unique: true, required: true, trim: true },
}, { 
    timestamps: true, 
    versionKey: false 
});

// 🚀 ENTERPRISE SPEED OPTIMIZATION FOR LAKHS OF DATA
MedicineSchema.index({ name: 1 }); 
MedicineSchema.index({ barcodeId: 1 });
MedicineSchema.index({ distributor: 1 });
MedicineSchema.index({ batch: 1 });
MedicineSchema.index({ quantity: 1 });
MedicineSchema.index({ expiryDate: 1 });
MedicineSchema.index({ createdAt: -1 });

export default mongoose.models.Medicine || mongoose.model("Medicine", MedicineSchema);