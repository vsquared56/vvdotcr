import fetch from "node-fetch";

const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY;

export async function validateTurnstileResponse(form) {
  const token = form.get("cf-turnstile-response");

  if (!token) {
    return { success: false, err: "Missing Turnstile token in request" };
  } else {
    const turnstileData = {
      secret: turnstileSecretKey,
      response: token.value.toString()
    }

    const turnstileResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify(turnstileData)
    });

    const outcome = await turnstileResponse.json();
    if (outcome.success) {
      return { success: true }
    } else {
      return { success: false, err: outcome['error-codes'] }
    }
  }
}