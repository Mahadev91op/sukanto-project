import mongoose from "mongoose";

const DistributorSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, "Distributor name is required"], 
        unique: true, 
        trim: true 
    },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    gstin: { type: String, trim: true, default: "" },
    contactPerson: { type: String, trim: true, default: "" },
}, { 
    timestamps: true, 
    versionKey: false 
});

export default mongoose.models.Distributor || mongoose.model("Distributor", DistributorSchema);
