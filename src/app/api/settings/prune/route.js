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

        if (isNaN(thresholdMonths) || thresholdMonths <= 0) {
            return NextResponse.json({ success: false, error: "Invalid threshold duration!" }, { status: 400 });
        }

        const today = new Date();
        const thresholdDate = new Date();
        thresholdDate.setMonth(today.getMonth() - thresholdMonths);

        let deletedMedicinesCount = 0;
        let deletedSalesCount = 0;

        // 1. Prune Medicines: expired AND out of stock
        if (pruneMedicines) {
            const result = await Medicine.deleteMany({
                quantity: { $lte: 0 },
                expiryDate: { $lt: today }
            });
            deletedMedicinesCount = result.deletedCount;
        }

        // 2. Prune Sales: transactions older than threshold
        if (pruneSales) {
            const result = await Sale.deleteMany({
                date: { $lt: thresholdDate }
            });
            deletedSalesCount = result.deletedCount;
        }

        return NextResponse.json({
            success: true,
            message: `🎉 Clean up complete! Deleted ${deletedMedicinesCount} expired/out-of-stock medicines and ${deletedSalesCount} old sales transactions.`
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: "Cleanup operation failed!",
            details: error.message
        }, { status: 500 });
    }
}
