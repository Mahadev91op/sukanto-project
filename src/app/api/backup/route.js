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

export async function GET() {
    if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    try {
        await connectToDatabase();

        const medicines = await Medicine.find({}).lean();
        const sales = await Sale.find({}).lean();
        const distributors = await Distributor.find({}).lean();
        const settings = await Settings.find({}).lean();

        const backupData = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            medicines,
            sales,
            distributors,
            settings
        };

        return NextResponse.json({ 
            success: true, 
            backup: backupData
        });
    } catch (error) {
        return NextResponse.json({ 
            success: false, 
            error: "Backup creation failed!",
            details: error.message
        }, { status: 500 });
    }
}