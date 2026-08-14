import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Settings from "@/models/Settings";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

async function isAdmin() {
    const session = await getServerSession(authOptions);
    return session?.user?.role === "admin";
}

export async function GET(req) {
    try {
        await connectToDatabase();
        let settings = await Settings.findOne({ key: "printer" }).lean();
        
        // Default printer settings if none are saved in database yet
        if (!settings) {
            settings = {
                key: "printer",
                value: {
                    layoutType: "1-UP",
                    barcodeFormat: "CODE128",
                    width: 50,
                    height: 25,
                    fontSize: 8,
                    gap: 2,
                    showBillNumber: true,
                    showPurchaseDate: true,
                    useGuidelines: false
                }
            };
        }
        
        return NextResponse.json({ success: true, settings: settings.value });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    try {
        await connectToDatabase();
        const payload = await req.json();
        
        const settings = await Settings.findOneAndUpdate(
            { key: "printer" },
            { key: "printer", value: payload },
            { upsert: true, new: true, runValidators: true }
        );

        return NextResponse.json({ success: true, settings: settings.value });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
