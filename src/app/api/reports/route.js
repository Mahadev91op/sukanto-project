import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Medicine from "@/models/Medicine";
import Sale from "@/models/Sale";

export const dynamic = 'force-dynamic'; 

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const expiryMonths = parseInt(searchParams.get("expiryMonths")) || 3;
    const lowStockThreshold = parseInt(searchParams.get("lowStockThreshold")) || 10;

    const expiryLimitDate = new Date();
    expiryLimitDate.setMonth(expiryLimitDate.getMonth() + expiryMonths);

    const selectedDateStr = searchParams.get("selectedDate");
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const startOfToday = new Date();
    const endOfToday = new Date();

    if (startDateStr && endDateStr) {
      const pStart = new Date(startDateStr);
      const pEnd = new Date(endDateStr);
      if (!isNaN(pStart.getTime()) && !isNaN(pEnd.getTime())) {
        startOfToday.setTime(pStart.getTime());
        endOfToday.setTime(pEnd.getTime());
      }
    } else if (selectedDateStr) {
      const parsedDate = new Date(selectedDateStr);
      if (!isNaN(parsedDate.getTime())) {
        startOfToday.setTime(parsedDate.getTime());
        endOfToday.setTime(parsedDate.getTime());
      }
    }

    startOfToday.setHours(0, 0, 0, 0);
    endOfToday.setHours(23, 59, 59, 999);

    const [
      expiringSoon,
      lowStock,
      distributorStock,
      distributorPerformance,
      todaysSales
    ] = await Promise.all([
      Medicine.find({
        expiryDate: { $lte: expiryLimitDate },
        quantity: { $gt: 0 } 
      }).sort({ expiryDate: 1 }).lean(), 

      Medicine.find({
        quantity: { $lt: lowStockThreshold, $gt: 0 }
      }).sort({ quantity: 1 }).lean(), 

      Medicine.aggregate([
        {
          $group: {
            _id: "$distributor", 
            totalQuantity: { $sum: "$quantity" },
            totalItems: { $sum: 1 } 
          }
        }
      ]),

      Sale.aggregate([
        { $match: { date: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) } } }, // 🚀 SPEED OPTIMIZATION: Limit to 30 days
        { $unwind: "$items" },
        {
          $lookup: {
            from: "medicines", 
            localField: "items.medicineId",
            foreignField: "_id",
            as: "medicineDetails"
          }
        },
        { $unwind: "$medicineDetails" },
        {
          $group: {
            _id: "$medicineDetails.distributor",
            soldQuantity: { $sum: "$items.quantity" }, 
            revenueGenerated: { $sum: "$items.total" } 
          }
        }
      ]),

      Sale.find({
        date: { $gte: startOfToday, $lte: endOfToday }
      }).lean() 
    ]);

    // Fetch medicine details for sold items to get their distributor & batch (location)
    const medicineIds = [];
    todaysSales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.medicineId) {
          medicineIds.push(item.medicineId);
        }
      });
    });

    const medicineDetailsList = await Medicine.find({ _id: { $in: medicineIds } }).select("distributor batch").lean();
    const medicineDetailsMap = {};
    medicineDetailsList.forEach(m => {
      medicineDetailsMap[m._id.toString()] = m;
    });

    const completeDistributorData = distributorStock.map(stock => {
      const perf = distributorPerformance.find(p => p._id === stock._id);
      return {
        _id: stock._id,
        totalQuantity: stock.totalQuantity,
        totalItems: stock.totalItems,
        soldQuantity: perf ? perf.soldQuantity : 0,
        revenueGenerated: perf ? perf.revenueGenerated : 0
      };
    }).sort((a, b) => b.revenueGenerated - a.revenueGenerated);

    let todayRevenue = 0;
    let todayItemsSold = 0;
    let soldItemsMap = {};
    const transactions = [];

    todaysSales.forEach(sale => {
      todayRevenue += sale.totalAmount;
      sale.items.forEach(item => {
        todayItemsSold += item.quantity;
        
        const medDetail = medicineDetailsMap[item.medicineId?.toString()] || {};

        if (soldItemsMap[item.medicineId]) {
            soldItemsMap[item.medicineId].quantity += item.quantity;
            soldItemsMap[item.medicineId].total += item.total;
        } else {
            soldItemsMap[item.medicineId] = {
                name: item.name,
                quantity: item.quantity,
                total: item.total,
                distributor: medDetail.distributor || "N/A"
            };
        }

        transactions.push({
          name: item.name,
          quantity: item.quantity,
          total: item.total,
          mrp: item.mrp,
          date: sale.date || sale.createdAt,
          paymentMethod: sale.paymentMethod || "Cash",
          billNumber: sale._id ? sale._id.toString().slice(-6).toUpperCase() : "N/A",
          distributor: medDetail.distributor || "N/A",
          batch: medDetail.batch || "N/A"
        });
      });
    });

    // Sort transactions by date descending (latest first)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    const todaySoldItemsList = Object.values(soldItemsMap).sort((a, b) => b.quantity - a.quantity);

    const todayOverview = {
        revenue: todayRevenue,
        itemsSold: todayItemsSold,
        billsGenerated: todaysSales.length,
        soldItems: todaySoldItemsList,
        transactions: transactions
    };

    return NextResponse.json({
      success: true,
      expiringSoon,
      lowStock,
      distributorStock: completeDistributorData,
      todayOverview 
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}