import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Medicine from "@/models/Medicine";
import Sale from "@/models/Sale";
import Distributor from "@/models/Distributor";
import Settings from "@/models/Settings";
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
        const { backup } = await req.json();

        if (!backup || !backup.medicines || !backup.sales || !backup.distributors) {
            return NextResponse.json({ success: false, error: "Invalid backup file structure!" }, { status: 400 });
        }

        // 1. Drop existing database collections to overwrite
        await Medicine.deleteMany({});
        await Sale.deleteMany({});
        await Distributor.deleteMany({});
        if (backup.settings && backup.settings.length > 0) {
            await Settings.deleteMany({});
        }

        // 2. Perform bulk insertion of backup data arrays
        if (backup.medicines.length > 0) {
            await Medicine.insertMany(backup.medicines);
        }
        if (backup.sales.length > 0) {
            await Sale.insertMany(backup.sales);
        }
        if (backup.distributors.length > 0) {
            await Distributor.insertMany(backup.distributors);
        }
        if (backup.settings && backup.settings.length > 0) {
            await Settings.insertMany(backup.settings);
        }

        return NextResponse.json({ 
            success: true, 
            message: "🎉 System restored 100% successfully!" 
        });

    } catch (error) {
        return NextResponse.json({ 
            success: false, 
            error: "Restore process failed!",
            details: error.message
        }, { status: 500 });
    }
}