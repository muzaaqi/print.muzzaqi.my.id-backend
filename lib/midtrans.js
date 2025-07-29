import midtransClient from "midtrans-client";

export const snap = new midtransClient.Snap({
  isProduction: false, // set true jika sudah production
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY, // untuk frontend
});
