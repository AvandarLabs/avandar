/**
 * A subset of the Polar Product type that is served to the frontend.
 */
export type AvaPolarProduct = {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  recurringInterval: "day" | "week" | "month" | "year" | null;
  metadata: Record<string, string | number | boolean>;
  prices: Array<
    {
      id: string;
      isArchived: boolean;
    } & (
      | {
          amountType: "free";
        }
      | {
          amountType: "custom";
          priceCurrency: string;
        }
      | {
          amountType: "seat_based";
          priceCurrency: string;
          seatTiers: Array<{
            pricePerSeat: number;
          }>;
        }
    )
  >;
};
