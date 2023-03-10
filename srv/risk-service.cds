using {riskmanagement as rm} from '../db/schema';

@path : 'service/risk'
service RiskService {
    // entity Risks            as projection on rm.Risks;
    // @requires: 'authenticated-user'
    // entity Risks as projection on rm.Risks;
    @cds.redirection.target
    entity Risks @(restrict : [
        {
            grant : ['READ'],
            to    : ['authenticated-user']
        },
        {
            grant : ['*'],
            to    : ['RiskManager']
        }
    ])                      as projection on rm.Risks;

    

    // annotate Risks with @odata.draft.enabled;
    // @requires: 'authenticated-user'
    // entity Mitigations      as projection on rm.Mitigations;
    entity Mitigations @(restrict : [
        {
            grant : ['READ'],
            to    : ['RiskViewer']
        },
        {
            grant : ['*'],
            to    : ['RiskManager']
        }
    ])                      as projection on rm.Mitigations;

    // annotate Mitigations with @odata.draft.enabled;

    @readonly
    entity BusinessPartners as projection on rm.BusinessPartners;

    entity PurchaseOrders as projection on rm.PurchaseOrders;
    annotate PurchaseOrders with @odata.draft.enabled;

    entity RisksView ()
        as SELECT  ID,title,owner from rm.Risks;
    
}