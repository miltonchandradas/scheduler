const https = require("https");
const axios = require("axios");
const express = require("express");
const app = express();
app.use(express.json());

const VCAP_SERVICES = JSON.parse(process.env.VCAP_SERVICES);
const JOBSCH_CREDENTIALS = VCAP_SERVICES.jobscheduler[0].credentials;
const JOBSCH_CLIENTID = JOBSCH_CREDENTIALS.uaa.clientid;
const JOBSCH_SECRET = JOBSCH_CREDENTIALS.uaa.clientsecret;
const JOBSCH_URL = JOBSCH_CREDENTIALS.url; //"https://jobscheduler-rest.cfapps.eu10-004.hana.ondemand.com"

/* App server */
app.listen(process.env.PORT, () => {});

/* App endpoints */

app.get("/app", function (req, res) {
   const url = `https://${req.hostname}/createjob`;
   res.send(
      `<h1>Homepage</h1><h4>Products List</h4><p>...</p>Click <a href="${url}">here</a> to update your status.`
   );
});

app.get("/createjob", async function (req, res) {
   const hostname = req.hostname;
   const subdomain = hostname.substring(0, hostname.indexOf("-"));
   const jwtToken = await fetchJWTToken(subdomain);
   const result = await createJob(jwtToken, subdomain);

   res.send(
      `Job created for customer ${subdomain}. Check dashboard/CF logs. Result of job creation: ${JSON.stringify(
         result
      )}`
   );
});

app.get("/action", function (req, res) {
   res.send(
      `"/action" endpoint invoked by jobscheduler. Customer status updated for ${req.hostname}.`
   );
});

/* Multi Tenancy callbacks */

app.get("/handleDependencies", (req, res) => {
   res.status(200).json([{ xsappname: JOBSCH_CREDENTIALS.uaa.xsappname }]);
});

app.put("/handleSubscription/:myConsumer", (req, res) => {
   console.log(
      `==> onSubscription: the TenantID of subscriber: ${req.body.subscribedTenantId}`
   );
   const appHost = req.hostname;
   const subDomain = req.body.subscribedSubdomain;
   res.status(200).send(`https://${subDomain}-${appHost}/app`);
});

app.delete("/handleSubscription/:myConsumer", (req, res) => {
   res.status(200).end("unsubscribed");
});

/* HELPER */

const fetchJWTToken = async (subdomain) => {
   const uaadomain = JOBSCH_CREDENTIALS.uaa.uaadomain;
   const oauthEndpoint = `https://${subdomain}.${uaadomain}`;
   const url = `${oauthEndpoint}/oauth/token?grant_type=client_credentials&response_type=token`;

   console.log("URL to get JWT token: ", url);
   console.log("JOB CLIENT ID: ", JOBSCH_CLIENTID);
   console.log("JOB SECRET: ", JOBSCH_SECRET);

   try {
      let response = await axios.get(url, {
         headers: {
            Authorization:
               "Basic " +
               Buffer.from(JOBSCH_CLIENTID + ":" + JOBSCH_SECRET).toString(
                  "base64"
               ),
         },
      });

      return response.data.access_token;
   } catch (error) {
      console.log("Error: ", error);
      return null;
   }
};

async function fetchJwtToken(subdomain) {
   return new Promise((resolve, reject) => {
      const uaadomain = JOBSCH_CREDENTIALS.uaa.uaadomain;
      const oauthEndpoint = `${subdomain}.${uaadomain}`;
      const options = {
         host: oauthEndpoint,
         path: "/oauth/token?grant_type=client_credentials&response_type=token",
         headers: {
            Authorization:
               "Basic " +
               Buffer.from(JOBSCH_CLIENTID + ":" + JOBSCH_SECRET).toString(
                  "base64"
               ),
         },
      };

      https.get(options, (res) => {
         res.setEncoding("utf8");
         let response = "";
         res.on("data", (chunk) => {
            response += chunk;
         });

         res.on("end", () => {
            try {
               const responseAsJson = JSON.parse(response);
               resolve(responseAsJson.access_token);
            } catch (error) {}
         });
      });
   });
}


const createJob = async (jwtToken, subdomain) => {
   const url = `${JOBSCH_URL}/scheduler/jobs`;
   const payload = JSON.stringify({
      name: `schedulermulti_${new Date().getMilliseconds()}`,
      action: `https://${subdomain}-schedulermulti.cfapps.eu10-004.hana.ondemand.com/action`,
      active: true,
      httpMethod: "GET",
      schedules: [
         {
            time: "now",
            active: "true",
         },
      ],
   });

   try {
      await axios.post(url, payload, {
        headers: {
          Authorization: "Bearer " + jwtToken,
          "Content-Type": "application/json",
        },
      });
  
      return true;
    } catch (error) {
      console.log("Error: ", error);
      return false;
    }
}

// async function createJob(jwtToken, subdomain) {

//    return new Promise((resolve, reject) => {
//       const options = {
//          host: JOBSCH_URL.replace("https://", ""),
//          path: `/scheduler/jobs`,
//          method: "POST",
//          headers: {
//             Authorization: "Bearer " + jwtToken,
//             "Content-type": "application/json",
//          },
//       };

//       const req = https.request(options, (res) => {
//          resolve({
//             status: `Job result: ${res.statusCode} - ${res.statusMessage}`,
//          });
//       });

//       const data = JSON.stringify({
//          name: `schedulermulti_${new Date().getMilliseconds()}`,
//          action: `https://${subdomain}-schedulermulti.cfapps.eu10-004.hana.ondemand.com/action`,
//          active: true,
//          httpMethod: "GET",
//          schedules: [
//             {
//                time: "now",
//                active: "true",
//             },
//          ],
//       });
//       req.write(data);
//       req.end();
//    });
// }
