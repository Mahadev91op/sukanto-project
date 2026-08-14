import mongoose from "mongoose";

const SaleItemSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  name: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true },
  mrp: { type: Number, required: true },
  total: { type: Number, required: true } 
}, { _id: false }); 

const SaleSchema = new mongoose.Schema({
  items: [SaleItemSchema],
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Card'], default: 'Cash' },
  date: { type: Date, default: Date.now }
}, { 
    timestamps: true, 
    versionKey: false 
});

// 🚀 SPEED OPTIMIZATION FOR REPORTS
SaleSchema.index({ date: -1 });
SaleSchema.index({ "items.medicineId": 1 });

export default mongoose.models.Sale || mongoose.model("Sale", SaleSchema);