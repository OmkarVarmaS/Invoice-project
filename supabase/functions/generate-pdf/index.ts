import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  invoice_id: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { invoice_id }: RequestBody = await req.json();

    if (!invoice_id) {
      return new Response(JSON.stringify({ error: "invoice_id parameter is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase Client with caller token (respects RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 1. Fetch Invoice
    const { data: invoice, error: invoiceErr } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();

    if (invoiceErr || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found or access denied" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch Business details
    const { data: business } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", invoice.business_id)
      .single();

    // 3. Fetch Customer details
    const { data: customer } = await supabase
      .from("customers")
      .select("*")
      .eq("id", invoice.customer_id)
      .single();

    // 4. Fetch Invoice Items
    const { data: items } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoice_id)
      .order("created_at", { ascending: true });

    const currency = business?.default_currency || "USD";
    const lineItems = items || [];

    // Helper formatter
    const formatMoney = (amount: number) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
      }).format(amount || 0);
    };

    // Render HTML Template
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; background: #fff; padding: 40px; font-size: 14px; line-height: 1.5; }
    .invoice-container { max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; }
    .logo { max-height: 60px; max-width: 200px; object-fit: contain; margin-bottom: 12px; }
    .business-name { font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .business-meta { color: #64748b; font-size: 13px; white-space: pre-line; }
    .invoice-title { font-size: 32px; font-weight: 800; color: #2563eb; text-align: right; text-transform: uppercase; letter-spacing: 1px; }
    .status-badge { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; display: inline-block; padding: 4px 10px; border-radius: 9999px; margin-top: 4px; }
    .status-draft { background: #f1f5f9; color: #64748b; }
    .status-sent { background: #e0f2fe; color: #0284c7; }
    .status-paid { background: #dcfce7; color: #16a34a; }
    .invoice-details { text-align: right; margin-top: 8px; font-size: 13px; color: #475569; }
    .details-grid { display: flex; justify-content: space-between; margin-bottom: 32px; gap: 24px; }
    .bill-to { flex: 1; background: #f8fafc; padding: 16px; border-radius: 6px; }
    .section-title { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 0.5px; margin-bottom: 8px; }
    .customer-name { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    .items-table th { background: #f1f5f9; color: #475569; font-weight: 700; font-size: 12px; text-transform: uppercase; text-align: left; padding: 12px 16px; }
    .items-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    .items-table .text-right { text-align: right; }
    .totals-container { display: flex; justify-content: flex-end; margin-bottom: 32px; }
    .totals-table { width: 300px; border-collapse: collapse; }
    .totals-table td { padding: 8px 12px; font-size: 14px; }
    .totals-table tr.grand-total td { font-size: 18px; font-weight: 700; color: #0f172a; border-top: 2px solid #cbd5e1; padding-top: 12px; }
    .footer { border-top: 1px solid #e2e8f0; padding-top: 24px; color: #64748b; font-size: 12px; display: flex; justify-content: space-between; gap: 24px; }
    .footer-block { flex: 1; }
    @media print {
      body { padding: 0; }
      .invoice-container { border: none; box-shadow: none; padding: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div>
        ${business?.logo_url ? `<img src="${business.logo_url}" alt="Logo" class="logo" />` : ''}
        <div class="business-name">${business?.name || 'Business Name'}</div>
        <div class="business-meta">
          ${business?.address ? `<div>${business.address}</div>` : ''}
          ${business?.email ? `<div>Email: ${business.email}</div>` : ''}
          ${business?.phone ? `<div>Phone: ${business.phone}</div>` : ''}
          ${business?.gstin ? `<div>GSTIN/Tax ID: ${business.gstin}</div>` : ''}
        </div>
      </div>
      <div>
        <div class="invoice-title">Invoice</div>
        <div style="text-align: right;">
          <span class="status-badge status-${invoice.status || 'draft'}">${invoice.status || 'draft'}</span>
        </div>
        <div class="invoice-details">
          <div><strong>Invoice #:</strong> ${invoice.invoice_number}</div>
          <div><strong>Date:</strong> ${invoice.invoice_date}</div>
          ${invoice.due_date ? `<div><strong>Due Date:</strong> ${invoice.due_date}</div>` : ''}
        </div>
      </div>
    </div>

    <div class="details-grid">
      <div class="bill-to">
        <div class="section-title">Billed To</div>
        <div class="customer-name">${customer?.name || 'Customer Name'}</div>
        ${customer?.billing_address ? `<div>${customer.billing_address}</div>` : ''}
        ${customer?.email ? `<div>Email: ${customer.email}</div>` : ''}
        ${customer?.phone ? `<div>Phone: ${customer.phone}</div>` : ''}
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Tax Rate</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineItems.map(item => `
          <tr>
            <td>${item.description}</td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-right">${formatMoney(item.unit_price)}</td>
            <td class="text-right">${item.tax_rate}%</td>
            <td class="text-right">${formatMoney(item.line_amount)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals-container">
      <table class="totals-table">
        <tr>
          <td>Subtotal:</td>
          <td class="text-right">${formatMoney(invoice.subtotal)}</td>
        </tr>
        ${invoice.tax_amount > 0 ? `
        <tr>
          <td>Tax:</td>
          <td class="text-right">${formatMoney(invoice.tax_amount)}</td>
        </tr>` : ''}
        ${invoice.discount_amount > 0 ? `
        <tr>
          <td>Discount:</td>
          <td class="text-right">-${formatMoney(invoice.discount_amount)}</td>
        </tr>` : ''}
        <tr class="grand-total">
          <td>Grand Total:</td>
          <td class="text-right">${formatMoney(invoice.total_amount)}</td>
        </tr>
      </table>
    </div>

    <div class="footer">
      ${invoice.notes ? `
        <div class="footer-block">
          <div class="section-title">Notes</div>
          <div>${invoice.notes}</div>
        </div>
      ` : ''}
      ${invoice.payment_instructions ? `
        <div class="footer-block">
          <div class="section-title">Payment Instructions</div>
          <div>${invoice.payment_instructions}</div>
        </div>
      ` : ''}
    </div>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
