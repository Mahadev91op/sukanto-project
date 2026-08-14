import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Medicine from "@/models/Medicine";

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const barcodeId = searchParams.get("barcode");

    if (!barcodeId || barcodeId.trim() === "") {
        return NextResponse.json({ success: false, error: "Empty Barcode" }, { status: 400 });
    }

    const cleanBarcode = barcodeId.trim();

    // 🚀 SPEED OPTIMIZATION: Exact match for fast B-Tree index lookup (O(1) time)
    const medicine = await Medicine.findOne({ 
        barcodeId: cleanBarcode 
    }).lean();

    if (!medicine) {
        return NextResponse.json({ success: false, error: "Medicine Not Found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, medicine });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}