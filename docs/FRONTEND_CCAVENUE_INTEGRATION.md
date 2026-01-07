# Frontend CCAvenue Payment Integration Guide

This guide explains how to integrate CCAvenue payment on the frontend (Next.js/React).

## Overview

The integration involves:
1. Adding payment API functions
2. Updating the service request submission flow
3. Creating payment form submission
4. Handling payment callbacks (success/failure pages)

## Step 1: Add Payment API Functions

Add these functions to `nazam/src/app/_common/api.ts`:

```typescript
// Payment API Functions
export interface InitiatePaymentRequest {
  serviceRequestId: string;
}

export interface InitiatePaymentResponse {
  success: boolean;
  exception: string | null;
  description: string;
  content: {
    paymentUrl: string;
    paymentFormData: {
      encRequest: string;
      access_code: string;
    };
    orderId: string;
    amount: number;
    currency: string;
  };
}

export interface PaymentStatusResponse {
  success: boolean;
  exception: string | null;
  description: string;
  content: {
    serviceRequestId: string;
    paymentMethod: string;
    paymentStatus: "Pending" | "Success" | "Failure" | "Cancelled";
    paymentDetails: {
      transactionId?: string;
      orderId?: string;
      amount?: number;
      currency?: string;
      paymentDate?: string;
      failureReason?: string;
      bankReferenceNumber?: string;
    };
    totalPrice: number;
  };
}

// Initiate payment for a service request
export const initiatePayment = async (
  data: InitiatePaymentRequest
): Promise<InitiatePaymentResponse> => {
  const response = await fetch(`${API_BASE_URL}/payments/initiate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.description || errorData.message || "Failed to initiate payment"
    );
  }

  return response.json();
};

// Get payment status for a service request
export const getPaymentStatus = async (
  serviceRequestId: string
): Promise<PaymentStatusResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/payments/status/${serviceRequestId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.description || errorData.message || "Failed to get payment status"
    );
  }

  return response.json();
};
```

## Step 2: Create Payment Form Submission Utility

Create a utility function to submit payment form to CCAvenue:

```typescript
// nazam/src/app/_common/paymentUtils.ts
export interface PaymentFormData {
  encRequest: string;
  access_code: string;
  paymentUrl: string;
}

/**
 * Submit payment form to CCAvenue
 * This creates a hidden form and submits it to redirect user to CCAvenue payment page
 */
export const submitPaymentToCCAvenue = (paymentData: PaymentFormData): void => {
  // Create form element
  const form = document.createElement("form");
  form.method = "POST";
  form.action = paymentData.paymentUrl;
  form.style.display = "none";

  // Add encrypted request field
  const encRequestInput = document.createElement("input");
  encRequestInput.type = "hidden";
  encRequestInput.name = "encRequest";
  encRequestInput.value = paymentData.encRequest;
  form.appendChild(encRequestInput);

  // Add access code field
  const accessCodeInput = document.createElement("input");
  accessCodeInput.type = "hidden";
  accessCodeInput.name = "access_code";
  accessCodeInput.value = paymentData.access_code;
  form.appendChild(accessCodeInput);

  // Append form to body and submit
  document.body.appendChild(form);
  form.submit();
};
```

## Step 3: Update Service Request Submission Flow

Update the `handlePaymentSubmit` function in your service request page:

```typescript
// In nazam/src/app/(dashboard)/services/request/[serviceId]/page.tsx

import { initiatePayment } from "@/app/_common/api";
import { submitPaymentToCCAvenue } from "@/app/_common/paymentUtils";

const handlePaymentSubmit = async () => {
  if (!selectedPaymentMethod) {
    toast.error("Please select a payment method");
    return;
  }

  if (!formValues) {
    toast.error("Form data is missing. Please try again.");
    return;
  }

  setSubmitting(true);

  try {
    // ... existing code to build payload ...

    // Submit service request
    const response = await submitServiceRequest(payload);

    if (response.success) {
      const serviceRequestId = response.content.serviceRequest._id;

      // If payment method is "Online Payment", initiate payment
      if (selectedPaymentMethod === "Online Payment") {
        try {
          // Initiate payment
          const paymentResponse = await initiatePayment({
            serviceRequestId: serviceRequestId,
          });

          if (paymentResponse.success) {
            // Close modal
            setShowPaymentModal(false);
            setSelectedPaymentMethod("");
            setFormValues(null);

            // Show loading message
            toast.loading("Redirecting to payment gateway...", {
              id: "payment-redirect",
            });

            // Submit payment form to CCAvenue
            submitPaymentToCCAvenue({
              encRequest: paymentResponse.content.paymentFormData.encRequest,
              access_code: paymentResponse.content.paymentFormData.access_code,
              paymentUrl: paymentResponse.content.paymentUrl,
            });
          } else {
            throw new Error(
              paymentResponse.description || "Failed to initiate payment"
            );
          }
        } catch (paymentError) {
          console.error("Payment initiation error:", paymentError);
          toast.error(
            paymentError instanceof Error
              ? paymentError.message
              : "Failed to initiate payment. Please try again."
          );
          setSubmitting(false);
        }
      } else {
        // Cash on Delivery - just show success and navigate
        toast.success("Service request submitted successfully!");
        setShowPaymentModal(false);
        setSelectedPaymentMethod("");
        setFormValues(null);

        setTimeout(() => {
          router.push("/");
        }, 1000);
      }
    } else {
      throw new Error(response.message || "Failed to submit service request");
    }
  } catch (error) {
    console.error("Error submitting request:", error);
    toast.error(
      error instanceof Error
        ? error.message
        : "Failed to submit service request"
    );
  } finally {
    setSubmitting(false);
  }
};
```

## Step 4: Create Payment Callback Pages

### Success Page

Create `nazam/src/app/(dashboard)/payment/success/page.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { getPaymentStatus } from "@/app/_common/api";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("orderId");
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      // Check payment status
      getPaymentStatus(orderId)
        .then((response) => {
          if (response.success) {
            setPaymentStatus(response.content.paymentStatus);
          }
        })
        .catch((error) => {
          console.error("Error checking payment status:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mb-6">
          Your payment has been processed successfully. Your service request has
          been confirmed.
        </p>
        {orderId && (
          <p className="text-sm text-gray-500 mb-6">Order ID: {orderId}</p>
        )}
        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
          >
            Go to Home
          </Link>
          <Link
            href="/profile"
            className="block w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
          >
            View Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
```

### Failure Page

Create `nazam/src/app/(dashboard)/payment/failure/page.tsx`:

```typescript
"use client";

import { useSearchParams } from "next/navigation";
import { XCircle } from "lucide-react";
import Link from "next/link";

export default function PaymentFailurePage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const reason = searchParams.get("reason") || "Payment was not completed";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Failed
        </h1>
        <p className="text-gray-600 mb-2">{reason}</p>
        {orderId && (
          <p className="text-sm text-gray-500 mb-6">Order ID: {orderId}</p>
        )}
        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
          >
            Try Again
          </Link>
          <Link
            href="/profile"
            className="block w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
          >
            View Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
```

### Cancelled Page

Create `nazam/src/app/(dashboard)/payment/cancelled/page.tsx`:

```typescript
"use client";

import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function PaymentCancelledPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Cancelled
        </h1>
        <p className="text-gray-600 mb-6">
          Your payment was cancelled. You can complete the payment later from
          your orders.
        </p>
        {orderId && (
          <p className="text-sm text-gray-500 mb-6">Order ID: {orderId}</p>
        )}
        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
          >
            Go to Home
          </Link>
          <Link
            href="/profile"
            className="block w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
          >
            View Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
```

## Step 5: Update Environment Variables

Make sure your frontend has access to the API base URL. In your `.env.local` or environment configuration:

```env
NEXT_PUBLIC_API_URL=https://api.zush.com/api
```

## Complete Integration Example

Here's a complete example of the updated `handlePaymentSubmit` function:

```typescript
const handlePaymentSubmit = async () => {
  if (!selectedPaymentMethod) {
    toast.error("Please select a payment method");
    return;
  }

  if (!formValues) {
    toast.error("Form data is missing. Please try again.");
    return;
  }

  setSubmitting(true);

  try {
    // Build selectedSubServices array if service has subservices
    let selectedSubServices: SelectedSubService[] | undefined = undefined;

    if (
      service?.subServices &&
      service.subServices.length > 0 &&
      formValues.subServiceQuantities
    ) {
      selectedSubServices = service.subServices
        .filter((subService) => {
          const subServiceId = subService._id || "";
          const quantity =
            formValues.subServiceQuantities?.[subServiceId] || 0;
          return quantity > 0;
        })
        .map((subService) => {
          const subServiceId = subService._id || "";
          const quantity =
            formValues.subServiceQuantities?.[subServiceId] || 0;
          return {
            name: subService.name,
            items: subService.items,
            rate: subService.rate,
            quantity: quantity,
          };
        });

      if (selectedSubServices.length === 0) {
        selectedSubServices = undefined;
      }
    }

    const totalPrice = calculateTotalPrice(formValues);
    const usesTimeBasedPricing = serviceHasTimeBasedPricing;

    let selectedTierHours: number | null =
      formValues.timeBasedTierHours ?? null;
    let selectedTierPrice: number | null =
      formValues.timeBasedTierPrice ?? null;

    if (
      usesTimeBasedPricing &&
      formValues.timeBasedTierIndex !== null &&
      formValues.timeBasedTierIndex !== undefined
    ) {
      const tier = service?.timeBasedPricing?.[formValues.timeBasedTierIndex];
      if (tier) {
        selectedTierHours = tier.hours;
        selectedTierPrice = tier.price;
      }
    }

    const derivedNumberOfUnits = usesTimeBasedPricing
      ? selectedTierHours ?? formValues.quantity ?? 1
      : formValues.quantity;
    const finalNumberOfUnits =
      derivedNumberOfUnits && derivedNumberOfUnits > 0
        ? derivedNumberOfUnits
        : 1;

    // Prepare the payload
    const payload: ServiceRequestSubmission = {
      user_name: formValues.user_name.trim(),
      user_phone: `+971${formValues.user_phone.replace(/\D/g, "")}`,
      user_email: formValues.user_email.trim().toLowerCase(),
      address: formValues.address.trim(),
      service_id: formValues.service_id,
      service_name: formValues.service_name,
      category_id: formValues.category_id,
      category_name: formValues.category_name,
      request_type: formValues.request_type,
      requested_date: formValues.requested_date,
      message: formValues.message?.trim() || "",
      number_of_units: finalNumberOfUnits,
      payment_method: selectedPaymentMethod,
      selectedSubServices: selectedSubServices,
    };

    if (service?.unitType) {
      payload.unit_type = service.unitType;
    }

    if (usesTimeBasedPricing) {
      const hours = selectedTierHours ?? finalNumberOfUnits;
      const tierPrice = selectedTierPrice ?? totalPrice;
      payload.unit_type = "per_hour";
      if (hours && hours > 0) {
        payload.time_based_hours = hours;
      }
      if (tierPrice && tierPrice > 0) {
        payload.time_based_price = tierPrice;
      }
      payload.unit_price = hours && hours > 0 ? tierPrice / hours : tierPrice;
      payload.total_price = totalPrice;
    } else {
      if (service?.basePrice) {
        payload.unit_price = service.basePrice;
      }
      if (totalPrice > 0) {
        payload.total_price = totalPrice;
      }
    }

    // Submit service request
    const response = await submitServiceRequest(payload);

    if (response.success) {
      const serviceRequestId = response.content.serviceRequest._id;

      // Handle payment based on selected method
      if (selectedPaymentMethod === "Online Payment") {
        try {
          // Initiate payment
          const paymentResponse = await initiatePayment({
            serviceRequestId: serviceRequestId,
          });

          if (paymentResponse.success) {
            // Close modal
            setShowPaymentModal(false);
            setSelectedPaymentMethod("");
            setFormValues(null);

            // Show loading message
            toast.loading("Redirecting to payment gateway...", {
              id: "payment-redirect",
            });

            // Submit payment form to CCAvenue
            submitPaymentToCCAvenue({
              encRequest: paymentResponse.content.paymentFormData.encRequest,
              access_code: paymentResponse.content.paymentFormData.access_code,
              paymentUrl: paymentResponse.content.paymentUrl,
            });
          } else {
            throw new Error(
              paymentResponse.description || "Failed to initiate payment"
            );
          }
        } catch (paymentError) {
          console.error("Payment initiation error:", paymentError);
          toast.error(
            paymentError instanceof Error
              ? paymentError.message
              : "Failed to initiate payment. Please try again."
          );
          setSubmitting(false);
        }
      } else {
        // Cash on Delivery
        toast.success("Service request submitted successfully!");
        setShowPaymentModal(false);
        setSelectedPaymentMethod("");
        setFormValues(null);

        setTimeout(() => {
          router.push("/");
        }, 1000);
      }
    } else {
      throw new Error(response.message || "Failed to submit service request");
    }
  } catch (error) {
    console.error("Error submitting request:", error);
    toast.error(
      error instanceof Error
        ? error.message
        : "Failed to submit service request"
    );
  } finally {
    setSubmitting(false);
  }
};
```

## Testing

1. **Test Online Payment Flow:**
   - Fill out the service request form
   - Select "Online Payment" as payment method
   - Submit the form
   - You should be redirected to CCAvenue payment page
   - Use test credentials:
     - Card: `5123450000000008`
     - Expiry: `01/39`
     - CVV: `100`
   - Complete payment
   - You should be redirected back to success page

2. **Test Cash on Delivery:**
   - Fill out the service request form
   - Select "Cash On Delivery" as payment method
   - Submit the form
   - You should see success message and be redirected to home

## Notes

- The payment form submission happens automatically via JavaScript
- Users are redirected to CCAvenue payment page
- After payment, CCAvenue redirects back to your callback URL
- The callback URL then redirects to your frontend success/failure pages
- Make sure your backend `FRONTEND_URL` environment variable is set correctly

