import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Medicine from "@/models/Medicine";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(req) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const distributorName = searchParams.get("distributorName");
        const page = parseInt(searchParams.get("page")) || 1;
        const limit = parseInt(searchParams.get("limit")) || 10;
        const skip = (page - 1) * limit;

        if (!distributorName) {
            return NextResponse.json({ success: false, error: "distributorName is required" }, { status: 400 });
        }

        const matchRegex = new RegExp(`^${escapeRegex(distributorName.trim())}$`, "i");

        // 1. Paginated medicine list for this distributor
        const query = { distributor: { $regex: matchRegex } };
        const [medicines, total] = await Promise.all([
            Medicine.find(query).sort({ name: 1 }).skip(skip).limit(limit).lean(),
            Medicine.countDocuments(query)
        ]);

        // 2. Aggregate stats (total quantity and total stock worth) using indexed lookup
        const stats = await Medicine.aggregate([
            { $match: { distributor: { $regex: matchRegex } } },
            { 
                $group: {
                    _id: null,
                    totalQty: { $sum: "$quantity" },
                    totalValue: { $sum: { $multiply: ["$mrp", "$quantity"] } }
                }
            }
        ]);

        const totalQty = stats.length > 0 ? stats[0].totalQty : 0;
        const totalValue = stats.length > 0 ? stats[0].totalValue : 0;

        return NextResponse.json({
            success: true,
            medicines,
            stats: {
                totalTypes: total,
                totalQty,
                totalValue
            },
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

