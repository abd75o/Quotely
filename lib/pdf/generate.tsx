import { renderToBuffer } from "@react-pdf/renderer";
import {
  QuotePdfDocument,
  type PdfClient,
  type PdfProfile,
  type PdfQuote,
} from "./quote-template";

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
