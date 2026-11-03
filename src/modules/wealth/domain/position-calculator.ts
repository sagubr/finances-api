import { Decimal } from "decimal.js";

export type PositionOrder = Readonly<{
  side: "BUY" | "SELL";
  quantity: string;
  unitPrice: string;
  fees: string;
}>;
export type Position = Readonly<{
  quantity: string;
  totalCost: string;
  averageCost: string;
  realizedResult: string;
}>;

export const calculatePosition = (orders: readonly PositionOrder[]): Position => {
  let quantity = new Decimal(0);
  let totalCost = new Decimal(0);
  let realizedResult = new Decimal(0);

  for (const order of orders) {
    const orderQuantity = new Decimal(order.quantity);
    const unitPrice = new Decimal(order.unitPrice);
    const fees = new Decimal(order.fees);
    if (!orderQuantity.isPositive() || unitPrice.isNegative() || fees.isNegative())
      throw new RangeError("Invalid order values.");

    if (order.side === "BUY") {
      quantity = quantity.plus(orderQuantity);
      totalCost = totalCost.plus(orderQuantity.times(unitPrice)).plus(fees);
      continue;
    }

    if (orderQuantity.greaterThan(quantity))
      throw new RangeError("Sell quantity exceeds position.");
    const averageCost = quantity.isZero() ? new Decimal(0) : totalCost.dividedBy(quantity);
    const allocatedCost = averageCost.times(orderQuantity);
    realizedResult = realizedResult.plus(
      orderQuantity.times(unitPrice).minus(fees).minus(allocatedCost),
    );
    quantity = quantity.minus(orderQuantity);
    totalCost = totalCost.minus(allocatedCost);
  }

  const averageCost = quantity.isZero() ? new Decimal(0) : totalCost.dividedBy(quantity);
  return {
    quantity: quantity.toFixed(),
    totalCost: totalCost.toFixed(10),
    averageCost: averageCost.toFixed(10),
    realizedResult: realizedResult.toFixed(10),
  };
};
