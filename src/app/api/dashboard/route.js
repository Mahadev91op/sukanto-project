import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Medicine from "@/models/Medicine";
import Sale from "@/models/Sale";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();

    const today = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(today.getDate() + 90);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalMedicines,
      stockAggregation,
      lowStockCount,
      expiringCount,
      expiringMedicines,
      rawSalesData,
      todaysSales
    ] = await Promise.all([
      Medicine.countDocuments({ quantity: { $gt: 0 } }),
      
      Medicine.aggregate([
        { $match: { quantity: { $gt: 0 } } },
        { $project: { totalValue: { $multiply: ["$quantity", "$mrp"] }, quantity: 1 } },
        { $group: { _id: null, totalStockValue: { $sum: "$totalValue" }, totalUnits: { $sum: "$quantity" } } }
      ]),
      
      Medicine.countDocuments({ quantity: { $lt: 10, $gt: 0 } }),
      
      Medicine.countDocuments({ expiryDate: { $lte: ninetyDaysFromNow }, quantity: { $gt: 0 } }),
      
      Medicine.find({ expiryDate: { $lte: ninetyDaysFromNow }, quantity: { $gt: 0 } })
              .sort({ expiryDate: 1 })
              .limit(6)
              .lean(), 
              
      Sale.aggregate([
        { $match: { date: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, 
            revenue: { $sum: "$totalAmount" }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      Sale.aggregate([
        { $match: { date: { $gte: startOfToday } } },
        { $group: { _id: null, todayRevenue: { $sum: "$totalAmount" } } }
      ])
    ]);

    const totalStockValue = stockAggregation[0]?.totalStockValue || 0;
    const totalUnits = stockAggregation[0]?.totalUnits || 0;
    const todayRevenue = todaysSales[0]?.todayRevenue || 0;

    // Generate continuous 7-day timeline so graph has no gaps
    const last7DaysMap = new Map();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      last7DaysMap.set(key, { date: label, Revenue: 0 });
    }

    rawSalesData.forEach(item => {
      if (last7DaysMap.has(item._id)) {
        last7DaysMap.get(item._id).Revenue = Math.round(item.revenue || 0);
      }
    });

    const salesData = Array.from(last7DaysMap.values());

    return NextResponse.json({
      success: true,
      stats: { totalMedicines, totalUnits, totalStockValue, lowStockCount, expiringCount, todayRevenue },
      expiringMedicines,
      salesData
    });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}