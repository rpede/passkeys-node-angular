const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const SimpleWebAuthnServer = require("@simplewebauthn/server");
const {
  getSavedAuthenticatorData,
  getRegistrationInfo,
} = require("./bufferUtils");

const port = 3000;
const rpId = "localhost";
const expectedOrigin = `http://${rpId}:3000`;

const app = express();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../client/dist/client")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/client/index.html"));
});

let challenges = {};
let users = {};

function getNewChallenge() {
  return Math.random().toString(36).substring(2);
}

function convertChallenge(challenge) {
  return btoa(challenge).replaceAll("=", "");
}

app.post("/api/register/start", (req, res) => {
  let username = req.body.username;
  let challenge = getNewChallenge();
  challenges[username] = convertChallenge(challenge);
  const pubKey = {
    challenge: challenge,
    rp: { id: rpId, name: "webauthn-app" },
    user: { id: username, name: username, displayName: username },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },
      { type: "public-key", alg: -257 },
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred",
      requireResidentKey: false,
    },
  };
  res.json(pubKey);
});

app.post("/api/register/finish", async (req, res) => {
  const username = req.body.username;
  // Verify the attestation response
  let verification;
  try {
    verification = await SimpleWebAuthnServer.verifyRegistrationResponse({
      response: req.body.data,
      expectedChallenge: challenges[username],
      expectedOrigin,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).send({ error: error.message });
  }
  const { verified, registrationInfo } = verification;
  if (verified) {
    users[username] = getRegistrationInfo(registrationInfo);
    return res.status(200).send(true);
  }
  res.status(500).send(false);
});

app.post("/api/login/start", (req, res) => {
  let username = req.body.username;
  if (!users[username]) {
    res.status(404).send(false);
  }
  let challenge = getNewChallenge();
  challenges[username] = convertChallenge(challenge);
  res.json({
    challenge,
    rpId,
    allowCredentials: [
      {
        type: "public-key",
        id: users[username].credentialID,
        transports: ["internal"],
      },
    ],
    userVerification: "discouraged",
  });
});

app.post("/api/login/finish", async (req, res) => {
  let username = req.body.username;
  if (!users[username]) {
    res.status(404).send(false);
  }
  let verification;
  try {
    const user = users[username];
    verification = await SimpleWebAuthnServer.verifyAuthenticationResponse({
      expectedChallenge: challenges[username],
      response: req.body.data,
      authenticator: getSavedAuthenticatorData(user),
      expectedRPID: rpId,
      expectedOrigin,
      advancedFIDOConfig: { userVerification: "discouraged" },
    });
  } catch (error) {
    console.error(error);
    return res.status(400).send({ error: error.message });
  }

  const { verified } = verification;
  if (verified) {
    return res.status(200).send(true);
  }
  return res.status(400).send(false);
});

app.listen(port, () => {
  console.log(`Server is listening on port ${expectedOrigin}`);
});
