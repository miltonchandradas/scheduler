const express = require("express");
const app = express();
app.use(express.json());

const VCAP_SERVICES = JSON.parse(process.env.VCAP_SERVICES);
const JOB_CREDENTIALS = VCAP_SERVICES.jobscheduler[0].credentials;

/* Application Server */

app.listen(process.env.PORT, function () {
   console.log("===> Server started");
});

/* Application endpoints */

app.get("/app", (req, res) => {
   res.send(`<h1>Homepage of multitenant app</h1>`);
});

app.get("/action", (req, res) => {
   res.send(`ACTION endpoint for jobscheduler successfully invoked.`);
});

/* Multi Tenancy callbacks */

app.get("/handleDependencies", (req, res) => {
   const dependencies = [{ xsappname: JOB_CREDENTIALS.uaa.xsappname }];
   res.status(200).json(dependencies);
});

app.put("/handleSubscription/:myConsumer", (req, res) => {
   console.log("Handle subscription...");
   const subDomain = req.body.subscribedSubdomain; // e.g. customer1subdomain
   const appHost = req.hostname; //schedulermulti.cfapps.sap.hana.ondemand.com
   const subscriberAppURL = `https://${subDomain}-${appHost}/app`;

   console.log("Subdomain: ", subDomain);
   console.log("Host: ", appHost);
   console.log("Subscriber URL: ", subscriberAppURL);

   res.status(200).send(subscriberAppURL);
});

app.delete("/handleSubscription/:myConsumer", (req, res) => {
   res.status(200).end("unsubscribed");
});
