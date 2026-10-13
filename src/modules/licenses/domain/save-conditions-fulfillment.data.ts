export interface ConditionFulfillmentItem {
  conditionId: string;
  fulfilled: boolean;
}

export interface SaveConditionsFulfillmentData {
  licenseId: string;
  customerId: string;
  items: ConditionFulfillmentItem[];
}
