const express = require("express");
const app = express();
let speakeasy = require("speakeasy");
let QRCode = require("qrcode");
let htmlEncode = require("htmlencode").htmlEncode;

const port = 8080;
let secretInDB;
let secretBase32;

const getHtmlLayout = content => `
  <html>
    <head></head>
    <body>
      ${content}
    </body>
  </html>
`;

app.use(function(req, res, next) {
  console.log("url", req.url);
  next();
});

app.get("/qr-generate", (req, res) => {
  let secret = speakeasy.generateSecret();
  secretInDB = secret;
  secretBase32 = secret.base32;
  console.log(secret.base32); // Save this value to your DB for the user
  res.write(getHtmlLayout("" + secret.base32));
  res.end(); //end the response
});

app.get("/qr-image", (req, res) => {
  let secret = secretInDB;
  console.log("secret.otpauth_url", secret.otpauth_url);

  QRCode.toDataURL(secret.otpauth_url, function(err, image_data) {
    console.log(image_data); // A data URI for the QR code image
    res.write(getHtmlLayout(`<img src="${image_data}"/>`));
    res.end();
  });
});

app.get("/qr-json", (req, res) => {
  let secret = secretInDB;
  res.write(getHtmlLayout(htmlEncode(JSON.stringify(secret))));
  res.end();
});

app.get("/qr-verify", (req, res) => {
  res.write(
    getHtmlLayout(`
      <form action='/qr-verify-token'>
      <input name="token" autocomplete="false"/>
      <button type="submit">verify code</button>
      </form>
    `)
  );
  res.end();
});

app.get("/qr-verify-token", (req, res) => {
  // This is provided the by the user via form POST
  let userToken = req.param("token");

  // Load the secret.base32 from their user record in database
  let secret = secretInDB;

  // Verify that the user token matches what it should at this moment
  let verified = speakeasy.totp.verify({
    secret: secretBase32,
    encoding: "base32",
    token: userToken
  });

  if (verified) {
    res.write(
      getHtmlLayout(`
          <p> 
            token verified
          </p>
        `)
    );
    res.end();
  } else {
    res.write(
      getHtmlLayout(`
          <p> 
            wrong token
          </p>
        `)
    );
    res.end();
  }
});

app.get("/", (req, res) => {
  res.write(
    getHtmlLayout(`
      <ul>
        <li>
          <a href="/qr-generate">qr generate</a>
        </li>
        <li>
          <a href="/qr-image">qr-image</a>
        </li>
        <li>
          <a href="/qr-json">qr-json</a>
        </li>
        <li>
          <a href="/qr-verify">qr-verify</a>
        </li>
        <li>
          <a href="/qr-verify-token">qr-verify-token</a>
        </li>
      </ul>
  `)
  );
  res.end();
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
