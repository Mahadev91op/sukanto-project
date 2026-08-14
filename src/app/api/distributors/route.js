import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Distributor from "@/models/Distributor";
import Medicine from "@/models/Medicine";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

async function isAdmin() {
    const session = await getServerSession(authOptions);
    return session?.user?.role === "admin";
}

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
        const search = searchParams.get("search") || "";
        const all = searchParams.get("all") === "true";
        const page = parseInt(searchParams.get("page")) || 1;
        const limit = parseInt(searchParams.get("limit")) || 20;
        const skip = (page - 1) * limit;

        // Auto-sync: Ensure all distributor names present in Medicine exist in Distributor collection
        try {
            const registered = await Distributor.find({}, { name: 1 }).lean();
            const registeredNames = new Set(registered.map(d => d.name.trim().toLowerCase()));
            
            const legacyNames = await Medicine.distinct("distributor");
            const newDistributorsToInsert = [];

            for (const name of legacyNames) {
                if (name && name.trim() && !registeredNames.has(name.trim().toLowerCase())) {
                    const normalized = normalizeName(name);
                    newDistributorsToInsert.push({ name: normalized });
                    registeredNames.add(name.trim().toLowerCase());
                }
            }

            if (newDistributorsToInsert.length > 0) {
                await Distributor.insertMany(newDistributorsToInsert, { ordered: false }).catch(() => {});
            }
        } catch (syncErr) {
            console.error("Distributor auto-sync warning:", syncErr.message);
        }

        const query = {};
        if (search) {
            const escaped = escapeRegex(search);
            query.$or = [
                { name: { $regex: escaped, $options: "i" } },
                { phone: { $regex: escaped, $options: "i" } },
                { contactPerson: { $regex: escaped, $options: "i" } },
                { gstin: { $regex: escaped, $options: "i" } }
            ];
        }

        if (all) {
            const distributors = await Distributor.find(query).sort({ name: 1 }).lean();
            return NextResponse.json({ 
                success: true, 
                distributors,
                pagination: {
                    total: distributors.length,
                    page: 1,
                    limit: distributors.length,
                    totalPages: 1
                }
            });
        }

        const [distributors, total] = await Promise.all([
            Distributor.find(query).sort({ name: 1 }).skip(skip).limit(limit).lean(),
            Distributor.countDocuments(query)
        ]);

        return NextResponse.json({ 
            success: true, 
            distributors,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    try {
        await connectToDatabase();
        const { name, phone, email, address, gstin, contactPerson } = await req.json();
        if (!name || name.trim() === "") {
            return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
        }

        const normalized = normalizeName(name);

        // Case-insensitive check
        const existing = await Distributor.findOne({
            name: { $regex: new RegExp(`^${escapeRegex(normalized)}$`, "i") }
        });

        if (existing) {
            return NextResponse.json({ success: false, error: "Distributor already exists" }, { status: 400 });
        }

        const newDistributor = new Distributor({ 
            name: normalized,
            phone: phone || "",
            email: email || "",
            address: address || "",
            gstin: gstin || "",
            contactPerson: contactPerson || ""
        });
        await newDistributor.save();

        return NextResponse.json({ success: true, distributor: newDistributor }, { status: 201 });
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

        await Distributor.findByIdAndDelete(id);
        return NextResponse.json({ success: true, message: "Distributor deleted successfully" });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
