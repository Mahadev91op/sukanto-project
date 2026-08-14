import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Medicine from "@/models/Medicine";
import Sale from "@/models/Sale";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectToDatabase();
    
    let calculatedTotal = 0;
    let newSaleId = null; 

    const { cartItems, paymentMethod = "Cash" } = await req.json();

    // Saari medicines 1 hi baar me le aao
    const itemIds = cartItems.map(item => item._id);
    const medicinesInDb = await Medicine.find({ _id: { $in: itemIds } });

    const medMap = {};
    medicinesInDb.forEach(med => { medMap[med._id.toString()] = med; });

    const saleItems = [];
    const decrementedItems = []; // Track updates to rollback if something fails

    try {
      for (let item of cartItems) {
        const med = medMap[item._id.toString()];
        
        if (!med) throw new Error(`${item.name} database me nahi mili!`);
        if (med.quantity < item.sellQuantity) {
          throw new Error(`${item.name} ka stock kam hai! Available: ${med.quantity}`);
        }

        // Atomic stock update to prevent race conditions
        const res = await Medicine.updateOne(
          { _id: med._id, quantity: { $gte: item.sellQuantity } },
          { $inc: { quantity: -item.sellQuantity } }
        );
        
        if (res.modifiedCount === 0) {
          throw new Error(`${item.name} ka stock kam hai ya update fail ho gaya!`);
        }

        // Track for rollback
        decrementedItems.push({
          medicineId: med._id,
          quantity: item.sellQuantity
        });

        const itemTotal = item.sellQuantity * (item.mrp || 0);
        calculatedTotal += itemTotal;

        saleItems.push({
          medicineId: med._id,
          name: med.name,
          quantity: item.sellQuantity,
          mrp: item.mrp || 0,
          total: itemTotal
        });
      }

      // Save the sale
      const newSale = new Sale({
        items: saleItems,
        totalAmount: calculatedTotal,
        paymentMethod
      });
      
      await newSale.save();
      newSaleId = newSale._id; 

    } catch (innerError) {
      // Rollback any stock that was already decremented
      for (let roll of decrementedItems) {
        try {
          await Medicine.updateOne(
            { _id: roll.medicineId },
            { $inc: { quantity: roll.quantity } }
          );
        } catch (rollbackErr) {
          console.error("Rollback failed for medicine:", roll.medicineId, rollbackErr);
        }
      }
      throw innerError; // Rethrow to outer try-catch block
    }

    return NextResponse.json({ 
      success: true, 
      message: "Sale Complete! Bill saved.", 
      saleId: newSaleId,
      totalAmount: calculatedTotal
    });

  } catch (error) {
    console.error("Sell API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}