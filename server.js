const express = require("express");
const passport = require("passport");
const xsenv = require("@sap/xsenv");
const jwt_decode = require("jwt-decode");
const JWTStrategy = require("@sap/xssec").JWTStrategy;

//configure passport
const xsuaaService = xsenv.getServices({ myXsuaa: { tag: "xsuaa" } });
const xsuaaCredentials = xsuaaService.myXsuaa;
const jwtStrategy = new JWTStrategy(xsuaaCredentials);
passport.use(jwtStrategy);

const app = express();

const jwtLogger = (req, res, next) => {
   console.log("Decoding authorization header...");
   let authHeader = req.headers.authorization;
   if (authHeader) {
      let token = authHeader.substring(7);
      let decoded = jwt_decode(token);

      console.log("Decoded JWT Token: ", decoded);
   }

   next();
};

app.use(jwtLogger);
app.use(passport.initialize());
app.use(passport.authenticate("JWT", { session: false }));

const port = process.env.PORT || 3000;

app.get("/runjob", (req, res) => {
   const MY_SCOPE = xsuaaCredentials.xsappname + ".schedulerscope";
   if (req.authInfo.checkScope(MY_SCOPE)) {
      res.send(
         "The endpoint was properly called, the required scope has been found in JWT token. Finished doing something successfully"
      );
   } else {
      return res.status(403).json({
         error: "Unauthorized",
         message:
            "The endpoint was called by user who does not have the required scope: <scopeformyapp> ",
      });
   }
});

app.listen(port, () => console.log(`listening on port ${port}`));
