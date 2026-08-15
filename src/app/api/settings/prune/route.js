import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Medicine from "@/models/Medicine";
import Sale from "@/models/Sale";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

async function isAdmin() {
    const session = await getServerSession(authOptions);
    return session?.user?.role === "admin";
}

export async function POST(req) {
    if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    try {
        await connectToDatabase();
        const { thresholdMonths, pruneMedicines, pruneSales } = await req.json();

        const months = Number(thresholdMonths);
        if (isNaN(months) || months <= 0) {
            return NextResponse.json({ success: false, error: "Invalid threshold duration!" }, { status: 400 });
        }

        const today = new Date();
        const cutoffDate = new Date();
        cutoffDate.setMonth(today.getMonth() - months);

        let deletedMedicinesCount = 0;
        let deletedSalesCount = 0;

        // 1. Prune Medicines: Out of Stock (quantity <= 0) AND older than cutoffDate (Last N months data is KEPT SAFE!)
        if (pruneMedicines) {
            const result = await Medicine.deleteMany({
                quantity: { $lte: 0 },
                $or: [
                    { expiryDate: { $lt: cutoffDate } },
                    { purchaseDate: { $lt: cutoffDate } },
                    { createdAt: { $lt: cutoffDate } }
                ]
            });
            deletedMedicinesCount = result.deletedCount;
        }

        // 2. Prune Sales: Transactions older than cutoffDate (Last N months data is KEPT SAFE!)
        if (pruneSales) {
            const result = await Sale.deleteMany({
                $or: [
                    { date: { $lt: cutoffDate } },
                    { createdAt: { $lt: cutoffDate } }
                ]
            });
            deletedSalesCount = result.deletedCount;
        }

        const durationText = months < 12 ? `${months} months` : `${months / 12} year(s)`;

        return NextResponse.json({
            success: true,
            message: `🎉 Cleanup complete! Last ${durationText} data is kept safe. Deleted ${deletedSalesCount} older sales records and ${deletedMedicinesCount} older out-of-stock medicine batches.`
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: "Cleanup operation failed!",
            details: error.message
        }, { status: 500 });
    }
}
