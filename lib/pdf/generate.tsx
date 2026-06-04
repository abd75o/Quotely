import { renderToBuffer } from "@react-pdf/renderer";
import {
  QuotePdfDocument,
  type PdfClient,
  type PdfProfile,
  type PdfQuote,
} from "./quote-template";
import {
  InvoicePdfDocument,
  type InvoicePdfData,
} from "./invoice-template";

export async function generateQuotePdfBuffer(opts: {
  quote: PdfQuote;
  profile: PdfProfile;
  client: PdfClient;
}): Promise<Buffer> {
  return await renderToBuffer(
    <QuotePdfDocument
      quote={opts.quote}
      profile={opts.profile}
      client={opts.client}
    />,
  );
}

export async function generateInvoicePdfBuffer(opts: {
  invoice: InvoicePdfData;
  profile: PdfProfile;
  client: PdfClient;
}): Promise<Buffer> {
  return await renderToBuffer(
    <InvoicePdfDocument
      invoice={opts.invoice}
      profile={opts.profile}
      client={opts.client}
    />,
  );
}
