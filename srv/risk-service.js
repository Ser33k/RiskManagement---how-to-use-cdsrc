// Imports
const proxy = require('@sap/cds-odata-v2-adapter-proxy')
const cds = require('@sap/cds')
require('dotenv').config();

/**
   * The service implementation with all service handlers
   */
module.exports = cds.service.impl(async function () {
   // Define constants for the Risk and BusinessPartners entities from the risk-service.cds file
   const { Risks, BusinessPartners, PurchaseOrders, Mitigations } = this.entities;

   /**
   * Set criticality after a READ operation on /risks
   */
   this.after("READ", Risks, (data) => {
      const risks = Array.isArray(data) ? data : [data];

      risks.forEach((risk) => {
         if (risk.impact >= 100000) {
            risk.criticality = 1;
         } else {
            risk.criticality = 2;
         }
      });
   });

   // connect to remote service
   const BPsrv = await cds.connect.to("API_BUSINESS_PARTNER");

   /**
    * Event-handler for read-events on the BusinessPartners entity.
    * Each request to the API Business Hub requires the apikey in the header.
    */
   this.on("READ", BusinessPartners, async (req) => {
      // The API Sandbox returns alot of business partners with empty names.
      // We don't want them in our application
      req.query.where("LastName <> '' and FirstName <> '' ");

      // console.log("KEYKEY: " + cds.requires.API_BUSINESS_PARTNER.credentials.headers.APIKey);
      // console.log("aaaaaa: " + process.env.apikey);
      return await BPsrv.run(req.query);
      // return await BPsrv.transaction(req).send({
      //    query: req.query,
      //    headers: {
      //       apikey: process.env.apikey,
      //    },
      // });
   });

   const POsrv = await cds.connect.to("API_PURCHASEORDER_PROCESS_SRV");

   this.on("READ", PurchaseOrders, async req => {
      console.log("AAAAAAAAAAAA: " + req);
      return await POsrv.run(req.query);
      // return await POsrv.transaction(req).send({
      //    query: req.query,
      //    headers: {
      //       apikey: process.env.apikeyPOs,
      //    },
      // });
   })

   // this.before("*", Mitigations, async req => {
   //    console.log("Mitigations user: " + JSON.stringify(req.user._roles));
   //    console.log(" Mitigationsis RiskManager: " + req.user.is('RiskManager'));
   //    console.log("Mitigations is authenticated: " + req.user.is('authenticated-user'));

   //    // req.user.is('RiskManager') || req.reject(403);
   // })
   /**
   * Event-handler on risks.
   * Retrieve BusinessPartner data from the external API
   */
   this.on("READ", Risks, async (req, next) => {
      /*
        Check whether the request wants an "expand" of the business partner
        As this is not possible, the risk entity and the business partner entity are in different systems (SAP BTP and S/4 HANA Cloud), 
        if there is such an expand, remove it
      */

      console.log("user: " + JSON.stringify(req.user._roles));
      console.log("is RiskManager: " + req.user.is('risk-management!t84222.RiskManager'));
      console.log("is authenticated: " + req.user.is('authenticated-user'));
      if (!req.query.SELECT.columns) return next();

      const expandIndex = req.query.SELECT.columns.findIndex(
         ({ expand, ref }) => expand && ref[0] === "bp"
      );
      if (expandIndex < 0) return next();

      req.query.SELECT.columns.splice(expandIndex, 1);
      if (
         !req.query.SELECT.columns.find((column) =>
            column.ref.find((ref) => ref == "bp_BusinessPartner")
         )
      ) {
         req.query.SELECT.columns.push({ ref: ["bp_BusinessPartner"] });
      }

      /*
        Instead of carrying out the expand, issue a separate request for each business partner
        This code could be optimized, instead of having n requests for n business partners, just one bulk request could be created
      */
      try {
         res = await next();
         res = Array.isArray(res) ? res : [res];

         await Promise.all(
            res.map(async (risk) => {
               const bp = await BPsrv.transaction(req).send({
                  query: SELECT.one(this.entities.BusinessPartners)
                     .where({ BusinessPartner: risk.bp_BusinessPartner })
                     .columns(["BusinessPartner", "LastName", "FirstName"]),
                  // headers: {
                  //    apikey: process.env.apikey,
                  // },
               });
               risk.bp = bp;
            })
         );
      } catch (error) { }
   });

   // this.before('*', req => {
   // }
   // )

});