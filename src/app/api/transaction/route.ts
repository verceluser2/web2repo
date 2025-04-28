import axios from "axios";

export async function POST(request: Request) {
  try {
    const { signedTx, to } = await request.json();
   console.log("signedTx", signedTx)
    console.log("to", to)
    // Gelato relay endpoint
    const gelatoUrl = "https://gelato.network/relay";

    // Forward signed transaction to Gelato
    const response = await axios.post(gelatoUrl, {
      signedTx,
      to,
    });
      console.log(response)
    if (response.status === 200) {
      return Response.json({ success: true, txHash: response.data.txHash });
    } else {
      return Response.json({ success: false, error: "Failed to relay to Gelato" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error relaying transaction:", error);
    return Response.json({ success: false, error: error}, { status: 500 });
  }
}
