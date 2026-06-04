export const paymentSettingsQueryKeys = {
  all: ['payment-settings'],
  detail: () => [...paymentSettingsQueryKeys.all, 'detail'],
};