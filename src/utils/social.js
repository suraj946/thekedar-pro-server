import {OAuth2Client} from "google-auth-library";

const client = new OAuth2Client(process.env.WEB_CLIENT_ID);

const verifyGoogleIdToken = async (idToken) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.WEB_CLIENT_ID
    });
    const payload = ticket.getPayload();
    return { success: true, payload };
  } catch (error) {
    console.log(error);
    return { success: false, message: error.message?.split(":")[0] };
  }
}

export { verifyGoogleIdToken }