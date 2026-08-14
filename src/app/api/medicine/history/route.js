import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Medicine from "@/models/Medicine";
import Sale from "@/models/Sale";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const medicineId = searchParams.get("medicineId");

    if (!medicineId) {
      return NextResponse.json({ success: false, error: "medicineId is required" }, { status: 400 });
    }

    const medicine = await Medicine.findById(medicineId).lean();
    if (!medicine) {
      return NextResponse.json({ success: false, error: "Medicine not found" }, { status: 404 });
    }

    // Find all sales that include this medicine
    const sales = await Sale.find({ "items.medicineId": medicineId }).sort({ date: -1 }).lean();

    // Filter and map the item details from each sale transaction
    const transactions = sales.map(sale => {
      const item = sale.items.find(i => i.medicineId.toString() === medicineId);
      return {
        saleId: sale._id,
        date: sale.date,
        quantity: item ? item.quantity : 0,
        mrp: item ? item.mrp : 0,
        total: item ? item.total : 0,
        paymentMethod: sale.paymentMethod
      };
    });

    return NextResponse.json({
      success: true,
      medicine,
      transactions
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
