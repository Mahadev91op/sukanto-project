import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Medicine from "@/models/Medicine";
import Distributor from "@/models/Distributor";

export const dynamic = 'force-dynamic'; 

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

async function isAdmin() {
    const session = await getServerSession(authOptions);
    return session?.user?.role === "admin";
}

const escapeRegex = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

function normalizeName(name) {
    if (!name) return "";
    return name
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export async function GET(req) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);

        if (searchParams.get("getDistributors") === "true") {
            const dbDists = await Distributor.distinct("name");
            const medDists = await Medicine.distinct("distributor");
            const allDistsSet = new Set();
            dbDists.forEach(d => {
                if (d) allDistsSet.add(normalizeName(d));
            });
            medDists.forEach(d => {
                if (d) allDistsSet.add(normalizeName(d));
            });
            const distributors = Array.from(allDistsSet).sort();
            return NextResponse.json({ success: true, distributors });
        }

        const page = parseInt(searchParams.get("page")) || 1;
        const limit = parseInt(searchParams.get("limit")) || 100; 
        const search = searchParams.get("search") || "";
        const includeEmpty = searchParams.get("includeEmpty") === "true";
        const skip = (page - 1) * limit;

        const query = includeEmpty ? {} : { quantity: { $gt: 0 } };
        
        if (search) {
            const escapedSearch = escapeRegex(search);
            query.$or = [
                { name: { $regex: escapedSearch, $options: "i" } },
                { batch: { $regex: escapedSearch, $options: "i" } },
                { barcodeId: { $regex: escapedSearch, $options: "i" } }
            ];
        }

        // 🚀 SPEED OPTIMIZATION: Count queries use active indexes (like quantity & search parameters) for fast lookup
        const [medicines, total] = await Promise.all([
            Medicine.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Medicine.countDocuments(query)
        ]);

        return NextResponse.json({
            success: true,
            medicines,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// Calculate EAN-8 checksum digit
function calculateEan8CheckDigit(digits7) {
    const weights = [3, 1, 3, 1, 3, 1, 3];
    let sum = 0;
    for (let i = 0; i < 7; i++) {
        sum += parseInt(digits7[i], 10) * weights[i];
    }
    return (10 - (sum % 10)) % 10;
}

// Generate unique 8-digit EAN-8 barcode (starts with 1-9 to avoid leading zero issues)
async function generateUniqueEan8() {
    let attempts = 0;
    while (attempts < 50) {
        let digits7 = Math.floor(1 + Math.random() * 9).toString(); // 1-9
        for (let i = 1; i < 7; i++) {
            digits7 += Math.floor(Math.random() * 10).toString(); // 0-9
        }
        const checkDigit = calculateEan8CheckDigit(digits7);
        const barcodeId = digits7 + checkDigit;
        
        const existing = await Medicine.findOne({ barcodeId });
        if (!existing) {
            return barcodeId;
        }
        attempts++;
    }
    throw new Error("Unable to generate a unique EAN-8 barcode");
}

export async function POST(req) {
    if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    try {
        await connectToDatabase();
        const data = await req.json();
        const uniqueBarcode = await generateUniqueEan8();
        
        if (data.distributor) {
            data.distributor = normalizeName(data.distributor);
            // Save to distributor collection if not present
            const existing = await Distributor.findOne({
                name: { $regex: new RegExp(`^${escapeRegex(data.distributor)}$`, "i") }
            });
            if (!existing) {
                const newDist = new Distributor({ name: data.distributor });
                await newDist.save();
            }
        }

        const newMedicine = new Medicine({
            ...data,
            barcodeId: uniqueBarcode,
            quantity: Number(data.quantity),
            mrp: Number(data.mrp)
        });
        await newMedicine.save();
        return NextResponse.json({ success: true, medicine: newMedicine }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(req) {
    if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    try {
        await connectToDatabase();
        const { id, ...updateData } = await req.json();
        
        if (updateData.distributor) {
            updateData.distributor = normalizeName(updateData.distributor);
            const existing = await Distributor.findOne({
                name: { $regex: new RegExp(`^${escapeRegex(updateData.distributor)}$`, "i") }
            });
            if (!existing) {
                const newDist = new Distributor({ name: updateData.distributor });
                await newDist.save();
            }
        }

        const updated = await Medicine.findByIdAndUpdate(id, updateData, { new: true }).lean();
        return NextResponse.json({ success: true, medicine: updated });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) {
            return NextResponse.json({ success: false, error: "ID parameter is required" }, { status: 400 });
        }
        if (id.includes(",")) {
            const ids = id.split(",").filter(Boolean);
            await Medicine.deleteMany({ _id: { $in: ids } });
        } else {
            await Medicine.findByIdAndDelete(id);
        }
        return NextResponse.json({ success: true, message: "Deleted successfully" });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}