import { IBillingConfigurationData } from '../../models/BillingConfiguration.model'

export function deepMerge(obj1: IBillingConfigurationData, obj2: IBillingConfigurationData): IBillingConfigurationData {
  const output: IBillingConfigurationData = { ...obj1 };

  for (const [key, value] of Object.entries(obj2)) {
    // Here we assure TypeScript that the keys are definitely in IBillingConfigurationData
    if (obj1.hasOwnProperty(key) && typeof value === "object" && !Array.isArray(value) && value !== null) {
      output[key as keyof IBillingConfigurationData] = deepMerge(obj1[key as keyof IBillingConfigurationData], value);
    } else {
      output[key as keyof IBillingConfigurationData] = value;
    }
  }
  
  // Remove specific properties with type assertion
  if (output.pix?.pix_fees) {
    delete (output.pix.pix_fees as any).outgoing_pix_external_service;
    delete (output.pix.pix_fees as any).outgoing_pix_chargeback;
  }
  
  return output;
}